#!/usr/bin/env python3
"""One-shot LSP client: semantic code navigation from the command line.

Speaks JSON-RPC over stdio to a language server, runs one or more queries,
then shuts the server down. No daemon, no state between invocations.
Stdlib only — no pip installs.

Positions on the CLI are 1-based FILE:LINE:COL; LSP's 0-based positions are
an internal detail. Known limitation: LSP positions count UTF-16 code units;
this client converts correctly when applying rename edits, but column numbers
printed for lines containing astral-plane characters may differ from what
your editor shows.
"""
import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

# --------------------------------------------------------------- constants

# (stack, project markers checked in --root, server command, install hint)
SERVERS = [
    ("typescript", ("tsconfig.json", "package.json"),
     ["typescript-language-server", "--stdio"],
     "npm i -g typescript-language-server typescript"),
    ("python", ("pyproject.toml", "setup.py", "requirements.txt"),
     ["pyright-langserver", "--stdio"],
     "npm i -g pyright"),
    ("dart", ("pubspec.yaml",),
     ["dart", "language-server", "--protocol=lsp"],
     "install the Dart SDK (https://dart.dev/get-dart)"),
    ("rust", ("Cargo.toml",),
     ["rust-analyzer"],
     "rustup component add rust-analyzer"),
]

LANGUAGE_IDS = {
    ".ts": "typescript", ".tsx": "typescriptreact",
    ".mts": "typescript", ".cts": "typescript",
    ".js": "javascript", ".jsx": "javascriptreact",
    ".py": "python", ".pyi": "python",
    ".dart": "dart",
    ".rs": "rust",
}

SYMBOL_KINDS = {
    1: "file", 2: "module", 3: "namespace", 4: "package", 5: "class",
    6: "method", 7: "property", 8: "field", 9: "constructor", 10: "enum",
    11: "interface", 12: "function", 13: "variable", 14: "constant",
    15: "string", 16: "number", 17: "boolean", 18: "array", 19: "object",
    20: "key", 21: "null", 22: "enum-member", 23: "struct", 24: "event",
    25: "operator", 26: "type-parameter",
}

SEVERITIES = {1: "error", 2: "warning", 3: "info", 4: "hint"}

# ----------------------------------------------------------------- helpers


def parse_location(spec):
    """'FILE:LINE:COL' (1-based) -> (path, line, col). Windows-drive safe."""
    parts = spec.rsplit(":", 2)
    if len(parts) != 3:
        raise ValueError(f"expected FILE:LINE:COL, got {spec!r}")
    try:
        line, col = int(parts[1]), int(parts[2])
    except ValueError:
        raise ValueError(f"expected FILE:LINE:COL, got {spec!r}")
    if line < 1 or col < 1:
        raise ValueError("line and column are 1-based (must be >= 1)")
    return parts[0], line, col


def path_to_uri(path):
    s = str(Path(path).resolve()).replace("\\", "/")
    if not s.startswith("/"):
        s = "/" + s  # Windows drive paths: /C:/...
    return "file://" + quote(s, safe="/:")


def uri_to_path(uri):
    path = unquote(urlparse(uri).path)
    if re.match(r"^/[A-Za-z]:", path):
        path = path[1:]
    return str(Path(path))


def detect_server(root):
    """Return (stack, command, install_hint) from project markers, else None."""
    root = Path(root)
    for stack, markers, cmd, hint in SERVERS:
        if any((root / m).exists() for m in markers):
            return stack, list(cmd), hint
    return None


def split_command(value):
    """Split a --server string into argv. Windows-safe (keeps backslashes)."""
    if os.name == "nt":
        return [t.strip('"') for t in shlex.split(value, posix=False)]
    return shlex.split(value)


# ----------------------------------------------------------- JSON-RPC framing


def write_message(stream, payload):
    body = json.dumps(payload).encode("utf-8")
    stream.write(b"Content-Length: " + str(len(body)).encode("ascii") + b"\r\n\r\n")
    stream.write(body)
    stream.flush()


def read_message(stream):
    """Read one framed message. Returns the parsed dict, or None on EOF."""
    length = None
    while True:
        line = stream.readline()
        if not line:
            return None
        line = line.strip()
        if not line:
            break  # end of headers
        if line.lower().startswith(b"content-length:"):
            length = int(line.split(b":", 1)[1])
    if length is None:
        return None
    body = stream.read(length)
    if body is None or len(body) < length:
        return None
    return json.loads(body.decode("utf-8"))


# ------------------------------------------------------------------ client


class LspClient:
    """Drives one language-server process for the lifetime of one invocation."""

    def __init__(self, cmd, root, timeout=30.0):
        self.cmd = cmd
        self.root = Path(root).resolve()
        self.timeout = timeout
        self.proc = None
        self.diagnostics = {}  # uri -> list of Diagnostic
        self._next_id = 0
        self._responses = {}
        self._cond = threading.Condition()
        self._reader = None

    def start(self):
        self.proc = subprocess.Popen(
            self.cmd, cwd=str(self.root),
            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL)
        self._reader = threading.Thread(target=self._read_loop, daemon=True)
        self._reader.start()
        root_uri = path_to_uri(self.root)
        self.request("initialize", {
            "processId": os.getpid(),
            "rootUri": root_uri,
            "workspaceFolders": [{"uri": root_uri, "name": self.root.name}],
            "capabilities": {
                "textDocument": {
                    "synchronization": {},
                    "definition": {},
                    "references": {},
                    "hover": {"contentFormat": ["plaintext", "markdown"]},
                    "documentSymbol": {"hierarchicalDocumentSymbolSupport": True},
                    "rename": {},
                    "publishDiagnostics": {},
                },
                "workspace": {"symbol": {}, "workspaceEdit": {"documentChanges": True}},
            },
        })
        self.notify("initialized", {})

    def _read_loop(self):
        while True:
            try:
                msg = read_message(self.proc.stdout)
            except Exception:
                break
            if msg is None:
                break
            if "id" in msg and ("result" in msg or "error" in msg):
                with self._cond:
                    self._responses[msg["id"]] = msg
                    self._cond.notify_all()
            elif msg.get("method") == "textDocument/publishDiagnostics":
                params = msg.get("params") or {}
                with self._cond:
                    self.diagnostics[params.get("uri")] = params.get("diagnostics", [])
                    self._cond.notify_all()
            elif "id" in msg and "method" in msg:
                # Server-to-client request (config, registration…): answer null
                # so the server doesn't stall waiting on us.
                try:
                    write_message(self.proc.stdin,
                                  {"jsonrpc": "2.0", "id": msg["id"], "result": None})
                except Exception:
                    break

    def request(self, method, params):
        self._next_id += 1
        rid = self._next_id
        write_message(self.proc.stdin,
                      {"jsonrpc": "2.0", "id": rid, "method": method, "params": params})
        deadline = time.monotonic() + self.timeout
        with self._cond:
            while rid not in self._responses:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError(f"no response to {method} within {self.timeout}s")
                self._cond.wait(remaining)
            msg = self._responses.pop(rid)
        if "error" in msg:
            raise RuntimeError(f"{method} failed: {msg['error'].get('message')}")
        return msg.get("result")

    def notify(self, method, params):
        write_message(self.proc.stdin,
                      {"jsonrpc": "2.0", "method": method, "params": params})

    def open_file(self, path):
        p = Path(path).resolve()
        self.notify("textDocument/didOpen", {"textDocument": {
            "uri": path_to_uri(p),
            "languageId": LANGUAGE_IDS.get(p.suffix, "plaintext"),
            "version": 1,
            "text": p.read_text(encoding="utf-8", errors="replace"),
        }})

    def wait_diagnostics(self, uris, wait_secs):
        """Wait until the server has pushed diagnostics for every uri (or timeout)."""
        deadline = time.monotonic() + wait_secs
        with self._cond:
            while not all(u in self.diagnostics for u in uris):
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                self._cond.wait(remaining)
            return {u: self.diagnostics.get(u, []) for u in uris}

    def stop(self):
        if self.proc is None:
            return
        try:
            if self.proc.poll() is None:
                try:
                    saved, self.timeout = self.timeout, 3.0
                    self.request("shutdown", None)
                    self.timeout = saved
                except Exception:
                    pass
                self.notify("exit", {})
                self.proc.wait(timeout=5)
        except Exception:
            pass
        finally:
            if self.proc.poll() is None:
                self.proc.kill()
                self.proc.wait()
            for stream in (self.proc.stdin, self.proc.stdout, self.proc.stderr):
                if stream is not None:
                    try:
                        stream.close()
                    except Exception:
                        pass


def query_with_retry(client, method, params, retry_secs):
    """Re-issue a query that returns None/[] (server may still be indexing)."""
    deadline = time.monotonic() + retry_secs
    while True:
        result = client.request(method, params)
        if result not in (None, []):
            return result
        if time.monotonic() >= deadline:
            return result
        time.sleep(1.0)


# ------------------------------------------------------- results & formatting


def text_document_position(spec):
    """FILE:LINE:COL -> (path, params dict with 0-based position)."""
    path, line, col = parse_location(spec)
    return path, {
        "textDocument": {"uri": path_to_uri(path)},
        "position": {"line": line - 1, "character": col - 1},
    }


def locations_from_result(result):
    """Normalize Location | Location[] | LocationLink[] | None to
    a list of (path, line, col), 1-based."""
    if result is None:
        return []
    if isinstance(result, dict):
        result = [result]
    locs = []
    for item in result:
        if "targetUri" in item:  # LocationLink
            uri, rng = item["targetUri"], item["targetSelectionRange"]
        else:
            uri, rng = item["uri"], item["range"]
        locs.append((uri_to_path(uri),
                     rng["start"]["line"] + 1,
                     rng["start"]["character"] + 1))
    return locs


def snippet(path, line):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for i, text in enumerate(f, 1):
                if i == line:
                    return text.strip()
    except OSError:
        pass
    return ""


def format_locations(locs):
    if not locs:
        return "(no results)"
    return "\n".join(f"{p}:{l}:{c} — {snippet(p, l)}" for p, l, c in locs)


def format_hover(result):
    if not result:
        return "(no hover info)"
    contents = result.get("contents")
    parts = contents if isinstance(contents, list) else [contents]
    out = []
    for part in parts:
        if isinstance(part, dict):
            out.append(part.get("value", ""))
        elif part:
            out.append(str(part))
    return "\n".join(x for x in out if x) or "(no hover info)"


def format_symbols(result, path):
    """Handles both DocumentSymbol[] (hierarchical) and SymbolInformation[]."""
    lines = []

    def walk(sym, depth):
        kind = SYMBOL_KINDS.get(sym.get("kind"), str(sym.get("kind")))
        if "selectionRange" in sym:  # DocumentSymbol
            pos = sym["selectionRange"]["start"]
            lines.append(f"{'  ' * depth}{kind} {sym['name']} — "
                         f"{path}:{pos['line'] + 1}:{pos['character'] + 1}")
            for child in sym.get("children") or []:
                walk(child, depth + 1)
        else:  # SymbolInformation
            loc = sym["location"]
            pos = loc["range"]["start"]
            lines.append(f"{kind} {sym['name']} — "
                         f"{uri_to_path(loc['uri'])}:{pos['line'] + 1}:{pos['character'] + 1}")

    for sym in result or []:
        walk(sym, 0)
    return "\n".join(lines) or "(no symbols)"


def format_diagnostics(by_uri):
    lines = []
    for uri, diags in by_uri.items():
        path = uri_to_path(uri)
        for d in diags:
            pos = d["range"]["start"]
            sev = SEVERITIES.get(d.get("severity"), "info")
            lines.append(f"{path}:{pos['line'] + 1}:{pos['character'] + 1} "
                         f"{sev}: {d.get('message', '').strip()}")
    return "\n".join(lines) or "(no diagnostics)"


# ------------------------------------------------------------------- rename


def utf16_to_index(line_text, units):
    """Convert a UTF-16 code-unit column (LSP) to a Python string index."""
    count = 0
    for i, ch in enumerate(line_text):
        if count >= units:
            return i
        count += 2 if ord(ch) > 0xFFFF else 1
    return len(line_text)


def apply_edits_to_text(text, edits):
    """Apply [(range, newText)] to a document string, last-to-first so earlier
    offsets stay valid. LSP ranges are 0-based, UTF-16 columns."""
    lines = text.splitlines(keepends=True)
    starts = [0]
    for ln in lines:
        starts.append(starts[-1] + len(ln))

    def to_offset(pos):
        line = pos["line"]
        if line >= len(lines):
            return len(text)
        return starts[line] + utf16_to_index(lines[line], pos["character"])

    spans = sorted(((to_offset(rng["start"]), to_offset(rng["end"]), new)
                    for rng, new in edits), reverse=True)
    for start, end, new in spans:
        text = text[:start] + new + text[end:]
    return text


def collect_edits(workspace_edit):
    """Normalize a WorkspaceEdit to {path: [(range, newText), ...]}.
    Raises on file create/rename/delete operations — those must not be
    half-applied silently."""
    out = {}
    for uri, edits in (workspace_edit.get("changes") or {}).items():
        out.setdefault(uri_to_path(uri), []).extend(
            (e["range"], e["newText"]) for e in edits)
    for change in (workspace_edit.get("documentChanges") or []):
        if "textDocument" in change:
            path = uri_to_path(change["textDocument"]["uri"])
            out.setdefault(path, []).extend(
                (e["range"], e["newText"]) for e in change["edits"])
        elif change.get("kind") in ("create", "rename", "delete"):
            raise RuntimeError(
                "rename produced file create/rename/delete operations; "
                "this client only applies text edits — do the file ops manually")
    return out


def format_edit_summary(edits_by_path):
    lines, total = [], 0
    for path in sorted(edits_by_path):
        pairs = edits_by_path[path]
        total += len(pairs)
        lines.append(f"{path} ({len(pairs)} edit{'s' if len(pairs) != 1 else ''})")
        for rng, new in sorted(pairs, key=lambda e: (e[0]["start"]["line"],
                                                     e[0]["start"]["character"])):
            s = rng["start"]
            lines.append(f"  {s['line'] + 1}:{s['character'] + 1} -> {new!r}")
    lines.append(f"{total} edits in {len(edits_by_path)} files "
                 f"(dry run — pass --apply to write)")
    return "\n".join(lines)


def apply_workspace_edits(edits_by_path):
    for path, pairs in edits_by_path.items():
        p = Path(path)
        p.write_text(apply_edits_to_text(p.read_text(encoding="utf-8"), pairs),
                     encoding="utf-8")
    total = sum(len(v) for v in edits_by_path.values())
    return (f"applied {total} edits in {len(edits_by_path)} "
            f"file{'s' if len(edits_by_path) != 1 else ''}")


# --------------------------------------------------------------------- CLI

COMMANDS = ("definition", "references", "hover", "symbols",
            "workspace-symbols", "diagnostics", "rename", "batch")


def run_command(client, name, args, ns):
    """Execute one query against a started client; return printable output."""
    if name in ("definition", "references", "hover"):
        if len(args) != 1:
            raise ValueError(f"{name} takes exactly one FILE:LINE:COL argument")
        path, params = text_document_position(args[0])
        client.open_file(path)
        method = {"definition": "textDocument/definition",
                  "references": "textDocument/references",
                  "hover": "textDocument/hover"}[name]
        if name == "references":
            params["context"] = {"includeDeclaration": True}
        result = query_with_retry(client, method, params, ns.retry)
        if ns.json:
            return json.dumps(result, indent=2)
        if name == "hover":
            return format_hover(result)
        return format_locations(locations_from_result(result))

    if name == "symbols":
        if len(args) != 1:
            raise ValueError("symbols takes exactly one FILE argument")
        path = args[0]
        client.open_file(path)
        result = query_with_retry(client, "textDocument/documentSymbol",
                                  {"textDocument": {"uri": path_to_uri(path)}},
                                  ns.retry)
        return json.dumps(result, indent=2) if ns.json else format_symbols(result, path)

    if name == "workspace-symbols":
        if len(args) != 1:
            raise ValueError("workspace-symbols takes exactly one QUERY argument")
        result = query_with_retry(client, "workspace/symbol",
                                  {"query": args[0]}, ns.retry)
        return json.dumps(result, indent=2) if ns.json else format_symbols(result, None)

    if name == "diagnostics":
        if not args:
            raise ValueError("diagnostics takes one or more FILE arguments")
        uris = []
        for path in args:
            client.open_file(path)
            uris.append(path_to_uri(path))
        by_uri = client.wait_diagnostics(uris, ns.timeout)
        return json.dumps(by_uri, indent=2) if ns.json else format_diagnostics(by_uri)

    if name == "rename":
        if len(args) != 2:
            raise ValueError("rename takes FILE:LINE:COL NEW_NAME")
        path, params = text_document_position(args[0])
        client.open_file(path)
        params["newName"] = args[1]
        result = query_with_retry(client, "textDocument/rename", params, ns.retry)
        if not result:
            return "(server returned no edits)"
        if ns.json:
            return json.dumps(result, indent=2)
        edits = collect_edits(result)
        if ns.apply:
            return apply_workspace_edits(edits)
        return format_edit_summary(edits)

    raise ValueError(f"unknown command {name!r}")


def main(argv=None):
    # Pipes on Windows default to the legacy codepage; query output (snippets,
    # hover docs) is arbitrary unicode.
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(
        prog="lsp.py",
        description="One-shot LSP client for semantic code navigation.")
    parser.add_argument("--server",
                        help="server command, e.g. 'pyright-langserver --stdio' "
                             "(default: auto-detect from --root project markers)")
    parser.add_argument("--root", default=".", help="project root (default: cwd)")
    parser.add_argument("--json", action="store_true", help="raw LSP JSON output")
    parser.add_argument("--timeout", type=float, default=30.0,
                        help="per-request timeout in seconds (default 30)")
    parser.add_argument("--retry", type=float, default=5.0,
                        help="seconds to retry empty results while the server "
                             "indexes (default 5; raise for rust-analyzer)")
    parser.add_argument("--apply", action="store_true",
                        help="rename only: write the edits to disk "
                             "(default is a dry run)")
    parser.add_argument("command", choices=COMMANDS)
    parser.add_argument("args", nargs="*")
    ns = parser.parse_args(argv)

    root = Path(ns.root).resolve()
    if ns.server:
        cmd = split_command(ns.server)
        hint = None
    else:
        detected = detect_server(root)
        if detected is None:
            sys.exit(f"no project markers found in {root} "
                     f"(looked for tsconfig.json/package.json, pyproject.toml, "
                     f"pubspec.yaml, Cargo.toml) — pass --server explicitly")
        _stack, cmd, hint = detected
    if shutil.which(cmd[0]) is None:
        msg = f"language server {cmd[0]!r} not found on PATH"
        if hint:
            msg += f" — install with: {hint}"
        sys.exit(msg)

    client = LspClient(cmd, root, timeout=ns.timeout)
    try:
        client.start()
        if ns.command == "batch":
            for line in sys.stdin.read().splitlines():
                line = line.strip()
                if not line:
                    continue
                parts = split_command(line)
                print(f"## {line}")
                print(run_command(client, parts[0], parts[1:], ns))
                print()
        else:
            print(run_command(client, ns.command, ns.args, ns))
    except (TimeoutError, RuntimeError, ValueError, OSError) as exc:
        sys.exit(f"lsp.py: {exc}")
    finally:
        client.stop()


if __name__ == "__main__":
    main()
