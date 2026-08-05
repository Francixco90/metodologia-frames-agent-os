"""Tests for lsp.py. Run from this directory: python -m unittest test_lsp -v"""
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

import lsp


class TestHelpers(unittest.TestCase):
    def test_parse_location_simple(self):
        self.assertEqual(lsp.parse_location("src/app.py:10:5"), ("src/app.py", 10, 5))

    def test_parse_location_windows_drive(self):
        # The drive colon must not be mistaken for a position separator.
        path, line, col = lsp.parse_location(r"C:\proj\src\app.ts:3:7")
        self.assertEqual((path, line, col), (r"C:\proj\src\app.ts", 3, 7))

    def test_parse_location_rejects_missing_parts(self):
        with self.assertRaises(ValueError):
            lsp.parse_location("src/app.py:10")

    def test_parse_location_rejects_zero(self):
        with self.assertRaises(ValueError):
            lsp.parse_location("src/app.py:0:1")

    def test_uri_roundtrip(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "a b" / "f.py"
            p.parent.mkdir()
            p.write_text("x = 1\n", encoding="utf-8")
            uri = lsp.path_to_uri(p)
            self.assertTrue(uri.startswith("file:///"))
            self.assertNotIn(" ", uri)  # space must be percent-encoded
            self.assertEqual(Path(lsp.uri_to_path(uri)), p.resolve())

    def test_language_id(self):
        self.assertEqual(lsp.LANGUAGE_IDS[".py"], "python")
        self.assertEqual(lsp.LANGUAGE_IDS[".tsx"], "typescriptreact")
        self.assertEqual(lsp.LANGUAGE_IDS[".rs"], "rust")
        self.assertEqual(lsp.LANGUAGE_IDS[".dart"], "dart")

    def test_detect_server_typescript_wins_over_python(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "package.json").write_text("{}", encoding="utf-8")
            (Path(tmp) / "pyproject.toml").write_text("", encoding="utf-8")
            stack, cmd, hint = lsp.detect_server(tmp)
            self.assertEqual(stack, "typescript")
            self.assertEqual(cmd[0], "typescript-language-server")

    def test_detect_server_rust(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "Cargo.toml").write_text("", encoding="utf-8")
            stack, cmd, hint = lsp.detect_server(tmp)
            self.assertEqual(stack, "rust")

    def test_detect_server_none(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIsNone(lsp.detect_server(tmp))

    def test_split_command_strips_quotes(self):
        parts = lsp.split_command('"/usr/bin/python3" "/tmp/fake server.py" --stdio')
        self.assertEqual(parts[-1], "--stdio")
        self.assertEqual(len(parts), 3)
        for part in parts:
            self.assertFalse(part.startswith('"'))


import io


class TestFraming(unittest.TestCase):
    def test_write_then_read_roundtrip(self):
        buf = io.BytesIO()
        lsp.write_message(buf, {"jsonrpc": "2.0", "id": 1, "method": "x"})
        buf.seek(0)
        msg = lsp.read_message(buf)
        self.assertEqual(msg, {"jsonrpc": "2.0", "id": 1, "method": "x"})

    def test_read_handles_extra_headers(self):
        body = json.dumps({"ok": True}).encode()
        raw = (b"Content-Type: application/vscode-jsonrpc; charset=utf-8\r\n"
               b"Content-Length: " + str(len(body)).encode() + b"\r\n\r\n" + body)
        msg = lsp.read_message(io.BytesIO(raw))
        self.assertEqual(msg, {"ok": True})

    def test_read_eof_returns_none(self):
        self.assertIsNone(lsp.read_message(io.BytesIO(b"")))

    def test_write_counts_utf8_bytes_not_chars(self):
        buf = io.BytesIO()
        lsp.write_message(buf, {"name": "héllo"})
        buf.seek(0)
        self.assertEqual(lsp.read_message(buf), {"name": "héllo"})


FAKE_SERVER = [sys.executable, str(Path(__file__).resolve().parent / "fake_lsp_server.py")]


def make_project(tmp):
    """A two-line file: 'foo = 1\\nbar = foo\\n'."""
    p = Path(tmp) / "sample.py"
    p.write_text("foo = 1\nbar = foo\n", encoding="utf-8")
    return p


class TestClient(unittest.TestCase):
    def _client(self, root):
        c = lsp.LspClient(FAKE_SERVER, root, timeout=10.0)
        c.start()
        self.addCleanup(c.stop)
        return c

    def test_initialize_and_definition(self):
        # stop() inside the with-block: on Windows the temp dir can't be
        # removed while the server child still has it as its cwd.
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            c = self._client(tmp)
            try:
                c.open_file(p)
                result = c.request("textDocument/definition", {
                    "textDocument": {"uri": lsp.path_to_uri(p)},
                    "position": {"line": 1, "character": 6}})
                self.assertEqual(result[0]["range"]["start"],
                                 {"line": 0, "character": 0})
            finally:
                c.stop()

    def test_diagnostics_push_collected(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            c = self._client(tmp)
            try:
                c.open_file(p)
                uri = lsp.path_to_uri(p)
                by_uri = c.wait_diagnostics([uri], wait_secs=10.0)
                self.assertEqual(by_uri[uri][0]["message"], "fake warning")
            finally:
                c.stop()

    def test_request_timeout(self):
        with tempfile.TemporaryDirectory() as tmp:
            c = self._client(tmp)
            try:
                c.timeout = 0.5
                with self.assertRaises(TimeoutError):
                    # the fake server deliberately never answers $/test/noreply
                    c.request("$/test/noreply", {})
            finally:
                c.stop()


class TestQueryRetry(unittest.TestCase):
    def test_retries_empty_then_returns(self):
        calls = []

        class Stub:
            def request(self, method, params):
                calls.append(method)
                return [] if len(calls) < 2 else ["hit"]

        result = lsp.query_with_retry(Stub(), "m", {}, retry_secs=5.0)
        self.assertEqual(result, ["hit"])
        self.assertEqual(len(calls), 2)

    def test_gives_up_after_window(self):
        class Stub:
            def request(self, method, params):
                return None

        result = lsp.query_with_retry(Stub(), "m", {}, retry_secs=0.0)
        self.assertIsNone(result)


class TestFormatting(unittest.TestCase):
    def test_locations_from_result_location_and_link(self):
        loc = {"uri": "file:///tmp/a.py",
               "range": {"start": {"line": 4, "character": 2},
                         "end": {"line": 4, "character": 5}}}
        link = {"targetUri": "file:///tmp/b.py",
                "targetRange": {"start": {"line": 0, "character": 0},
                                "end": {"line": 9, "character": 0}},
                "targetSelectionRange": {"start": {"line": 1, "character": 3},
                                         "end": {"line": 1, "character": 6}}}
        locs = lsp.locations_from_result([loc, link])
        self.assertEqual(locs[0][1:], (5, 3))   # 1-based
        self.assertEqual(locs[1][1:], (2, 4))   # uses targetSelectionRange

    def test_locations_from_result_single_and_none(self):
        self.assertEqual(lsp.locations_from_result(None), [])
        loc = {"uri": "file:///tmp/a.py",
               "range": {"start": {"line": 0, "character": 0},
                         "end": {"line": 0, "character": 1}}}
        self.assertEqual(len(lsp.locations_from_result(loc)), 1)

    def test_format_locations_includes_snippet(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            out = lsp.format_locations([(str(p), 2, 7)])
            self.assertIn(f"{p}:2:7", out)
            self.assertIn("bar = foo", out)

    def test_format_hover_dict_contents(self):
        out = lsp.format_hover({"contents": {"kind": "markdown", "value": "foo: int"}})
        self.assertEqual(out, "foo: int")
        self.assertEqual(lsp.format_hover(None), "(no hover info)")

    def test_format_hover_list_contents(self):
        out = lsp.format_hover({"contents": ["sig", {"value": "doc"}]})
        self.assertEqual(out, "sig\ndoc")

    def test_format_symbols_hierarchical(self):
        result = [{"name": "Cls", "kind": 5,
                   "range": {"start": {"line": 0, "character": 0},
                             "end": {"line": 5, "character": 0}},
                   "selectionRange": {"start": {"line": 0, "character": 6},
                                      "end": {"line": 0, "character": 9}},
                   "children": [{"name": "meth", "kind": 6,
                                 "range": {"start": {"line": 1, "character": 2},
                                           "end": {"line": 2, "character": 0}},
                                 "selectionRange": {"start": {"line": 1, "character": 6},
                                                    "end": {"line": 1, "character": 10}},
                                 "children": []}]}]
        out = lsp.format_symbols(result, "x.py")
        self.assertIn("class Cls — x.py:1:7", out)
        self.assertIn("  method meth — x.py:2:7", out)

    def test_format_symbols_flat_symbol_information(self):
        result = [{"name": "foo", "kind": 13,
                   "location": {"uri": "file:///tmp/a.py",
                                "range": {"start": {"line": 0, "character": 0},
                                          "end": {"line": 0, "character": 3}}}}]
        out = lsp.format_symbols(result, None)
        self.assertIn("variable foo", out)
        self.assertIn(":1:1", out)

    def test_format_diagnostics(self):
        by_uri = {"file:///tmp/a.py": [
            {"range": {"start": {"line": 2, "character": 4},
                       "end": {"line": 2, "character": 9}},
             "severity": 1, "message": "name 'x' is not defined"}]}
        out = lsp.format_diagnostics(by_uri)
        self.assertIn(":3:5 error: name 'x' is not defined", out)
        self.assertEqual(lsp.format_diagnostics({"u": []}), "(no diagnostics)")


class TestRename(unittest.TestCase):
    def _edit(self, sl, sc, el, ec, new):
        return ({"start": {"line": sl, "character": sc},
                 "end": {"line": el, "character": ec}}, new)

    def test_apply_edits_reverse_order(self):
        text = "foo = 1\nbar = foo\n"
        edits = [self._edit(0, 0, 0, 3, "qux"), self._edit(1, 6, 1, 9, "qux")]
        self.assertEqual(lsp.apply_edits_to_text(text, edits), "qux = 1\nbar = qux\n")

    def test_apply_edits_given_in_any_order(self):
        text = "foo = 1\nbar = foo\n"
        edits = [self._edit(1, 6, 1, 9, "qux"), self._edit(0, 0, 0, 3, "qux")]
        self.assertEqual(lsp.apply_edits_to_text(text, edits), "qux = 1\nbar = qux\n")

    def test_utf16_to_index_astral(self):
        # '🎉' is two UTF-16 code units but one Python char.
        self.assertEqual(lsp.utf16_to_index("a🎉b foo", 5), 4)
        self.assertEqual(lsp.utf16_to_index("abc", 99), 3)

    def test_apply_edit_after_emoji(self):
        text = "x = '🎉'; foo = 1\n"
        # UTF-16 col of 'foo': x,space,=,space,',🎉(2),',;,space = 10 units
        edits = [self._edit(0, 10, 0, 13, "qux")]
        self.assertEqual(lsp.apply_edits_to_text(text, edits), "x = '🎉'; qux = 1\n")

    def test_collect_edits_changes_form(self):
        we = {"changes": {"file:///tmp/a.py": [
            {"range": {"start": {"line": 0, "character": 0},
                       "end": {"line": 0, "character": 3}}, "newText": "qux"}]}}
        edits = lsp.collect_edits(we)
        self.assertEqual(len(edits), 1)
        (path, pairs), = edits.items()
        self.assertEqual(pairs[0][1], "qux")

    def test_collect_edits_document_changes_form(self):
        we = {"documentChanges": [{"textDocument": {"uri": "file:///tmp/a.py", "version": 1},
                                   "edits": [{"range": {"start": {"line": 1, "character": 6},
                                                        "end": {"line": 1, "character": 9}},
                                              "newText": "qux"}]}]}
        edits = lsp.collect_edits(we)
        self.assertEqual(sum(len(v) for v in edits.values()), 1)

    def test_collect_edits_rejects_file_operations(self):
        we = {"documentChanges": [{"kind": "rename", "oldUri": "a", "newUri": "b"}]}
        with self.assertRaises(RuntimeError):
            lsp.collect_edits(we)

    def test_format_edit_summary_dry_run(self):
        edits = {"a.py": [({"start": {"line": 0, "character": 0},
                            "end": {"line": 0, "character": 3}}, "qux")]}
        out = lsp.format_edit_summary(edits)
        self.assertIn("a.py (1 edit", out)
        self.assertIn("1:1 -> 'qux'", out)
        self.assertIn("dry run", out)

    def test_apply_workspace_edits_writes_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            edits = {str(p): [({"start": {"line": 0, "character": 0},
                                "end": {"line": 0, "character": 3}}, "qux"),
                              ({"start": {"line": 1, "character": 6},
                                "end": {"line": 1, "character": 9}}, "qux")]}
            out = lsp.apply_workspace_edits(edits)
            self.assertEqual(p.read_text(encoding="utf-8"), "qux = 1\nbar = qux\n")
            self.assertIn("applied 2 edits in 1 file", out)


import subprocess

SCRIPTS_DIR = Path(__file__).resolve().parent
FAKE_SERVER_ARG = f'"{sys.executable}" "{SCRIPTS_DIR / "fake_lsp_server.py"}"'


def run_cli(tmp, *argv, stdin=None):
    cmd = [sys.executable, str(SCRIPTS_DIR / "lsp.py"),
           "--server", FAKE_SERVER_ARG, "--root", tmp, "--retry", "0"] + list(argv)
    return subprocess.run(cmd, capture_output=True, text=True,
                          input=stdin, timeout=60, encoding="utf-8")


class TestCli(unittest.TestCase):
    def test_definition_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            r = run_cli(tmp, "definition", f"{p}:2:7")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn(":1:1 — foo = 1", r.stdout)

    def test_references_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            r = run_cli(tmp, "references", f"{p}:1:1")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn(":1:1", r.stdout)
            self.assertIn(":2:7", r.stdout)

    def test_rename_dry_run_does_not_write(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            r = run_cli(tmp, "rename", f"{p}:1:1", "qux")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("dry run", r.stdout)
            self.assertEqual(p.read_text(encoding="utf-8"), "foo = 1\nbar = foo\n")

    def test_rename_apply_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            r = run_cli(tmp, "--apply", "rename", f"{p}:1:1", "qux")
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertEqual(p.read_text(encoding="utf-8"), "qux = 1\nbar = qux\n")

    def test_diagnostics_end_to_end(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            r = run_cli(tmp, "diagnostics", str(p))
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("warning: fake warning", r.stdout)

    def test_batch_runs_multiple_queries(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            stdin = f"definition {p}:2:7\nhover {p}:1:1\n"
            r = run_cli(tmp, "batch", stdin=stdin)
            self.assertEqual(r.returncode, 0, r.stderr)
            self.assertIn("## definition", r.stdout)
            self.assertIn("## hover", r.stdout)
            self.assertIn("(variable) foo: int", r.stdout)

    def test_missing_server_binary_exits_with_hint(self):
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "Cargo.toml").write_text("", encoding="utf-8")
            env = dict(os.environ, PATH="")
            cmd = [sys.executable, str(SCRIPTS_DIR / "lsp.py"), "--root", tmp,
                   "definition", "x.rs:1:1"]
            r = subprocess.run(cmd, capture_output=True, text=True, env=env,
                               timeout=60, encoding="utf-8")
            self.assertNotEqual(r.returncode, 0)
            self.assertIn("rustup component add rust-analyzer", r.stderr)

    def test_json_flag_emits_raw_response(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = make_project(tmp)
            r = run_cli(tmp, "--json", "definition", f"{p}:2:7")
            self.assertEqual(r.returncode, 0, r.stderr)
            parsed = json.loads(r.stdout)
            self.assertEqual(parsed[0]["range"]["start"]["line"], 0)


if __name__ == "__main__":
    unittest.main()
