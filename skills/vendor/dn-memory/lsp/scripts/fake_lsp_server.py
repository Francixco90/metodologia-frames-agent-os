#!/usr/bin/env python3
"""Minimal fake LSP server with canned responses. Used only by test_lsp.py."""
import json
import sys


def read_message(stream):
    length = None
    while True:
        line = stream.readline()
        if not line:
            return None
        line = line.strip()
        if not line:
            break
        if line.lower().startswith(b"content-length:"):
            length = int(line.split(b":", 1)[1])
    if length is None:
        return None
    body = stream.read(length)
    return json.loads(body.decode("utf-8")) if body and len(body) == length else None


def write_message(stream, payload):
    body = json.dumps(payload).encode("utf-8")
    stream.write(b"Content-Length: " + str(len(body)).encode("ascii") + b"\r\n\r\n")
    stream.write(body)
    stream.flush()


def rng(sl, sc, el, ec):
    return {"start": {"line": sl, "character": sc}, "end": {"line": el, "character": ec}}


def main():
    stdin, stdout = sys.stdin.buffer, sys.stdout.buffer
    while True:
        msg = read_message(stdin)
        if msg is None:
            return
        method, mid = msg.get("method"), msg.get("id")
        params = msg.get("params") or {}
        if method == "initialize":
            write_message(stdout, {"jsonrpc": "2.0", "id": mid,
                                   "result": {"capabilities": {}}})
        elif method == "textDocument/didOpen":
            uri = params["textDocument"]["uri"]
            write_message(stdout, {"jsonrpc": "2.0",
                                   "method": "textDocument/publishDiagnostics",
                                   "params": {"uri": uri, "diagnostics": [
                                       {"range": rng(0, 0, 0, 3), "severity": 2,
                                        "message": "fake warning"}]}})
        elif method == "textDocument/definition":
            uri = params["textDocument"]["uri"]
            write_message(stdout, {"jsonrpc": "2.0", "id": mid,
                                   "result": [{"uri": uri, "range": rng(0, 0, 0, 3)}]})
        elif method == "textDocument/references":
            uri = params["textDocument"]["uri"]
            write_message(stdout, {"jsonrpc": "2.0", "id": mid,
                                   "result": [{"uri": uri, "range": rng(0, 0, 0, 3)},
                                              {"uri": uri, "range": rng(1, 6, 1, 9)}]})
        elif method == "textDocument/hover":
            write_message(stdout, {"jsonrpc": "2.0", "id": mid,
                                   "result": {"contents": {"kind": "markdown",
                                                           "value": "(variable) foo: int"}}})
        elif method == "textDocument/documentSymbol":
            write_message(stdout, {"jsonrpc": "2.0", "id": mid, "result": [
                {"name": "foo", "kind": 13, "range": rng(0, 0, 0, 7),
                 "selectionRange": rng(0, 0, 0, 3), "children": []}]})
        elif method == "workspace/symbol":
            write_message(stdout, {"jsonrpc": "2.0", "id": mid, "result": [
                {"name": "foo", "kind": 13,
                 "location": {"uri": params.get("_uri", "file:///tmp/x.py"),
                              "range": rng(0, 0, 0, 3)}}]})
        elif method == "textDocument/rename":
            uri = params["textDocument"]["uri"]
            new = params["newName"]
            write_message(stdout, {"jsonrpc": "2.0", "id": mid, "result": {
                "changes": {uri: [{"range": rng(0, 0, 0, 3), "newText": new},
                                  {"range": rng(1, 6, 1, 9), "newText": new}]}}})
        elif method == "$/test/noreply":
            pass  # deliberately never answer — lets tests exercise the timeout path
        elif method == "shutdown":
            write_message(stdout, {"jsonrpc": "2.0", "id": mid, "result": None})
        elif method == "exit":
            return
        elif mid is not None:
            write_message(stdout, {"jsonrpc": "2.0", "id": mid, "result": None})


if __name__ == "__main__":
    main()
