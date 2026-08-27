#!/usr/bin/env python3
"""Deterministic, dependency-free validation for the Canon v3 prompt system."""

from __future__ import annotations

import importlib.util
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PROMPT_SYSTEM = ROOT / "prompt-system"
CONTROL_ROOT = ROOT / "knowledge-base" / "00-control"
TEMPLATE_ROOT = ROOT / "knowledge-base" / "30-templates"
REQUIRED_SECTIONS = [
    "abstract", "navigation", "routing", "knowledge", "evidence", "decisions",
    "assumptions", "limits", "edge_cases", "acceptance", "related_documents", "change_log",
]
REQUIRED_FRONTMATTER = [
    "schema", "document_id", "title", "version", "status", "authority", "layer", "language",
    "response_locales", "routes", "tasks", "audiences", "tags", "keywords", "aliases",
    "source_refs", "rights", "validity", "supersedes", "related_ids", "manifest_ref",
]
ID_PATTERN = re.compile(r"^[A-Za-z0-9-]+$")
VOSEO = re.compile(r"\b(vos|sos|tenés|podés|querés|hacé|decime|mirá|elegí|utilizá|aplicá)\b", re.I)


def load_generator():
    path = Path(__file__).with_name("generate_prompt_library.py")
    spec = importlib.util.spec_from_file_location("canon_v3_prompt_generator", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(module)
    return module


def frontmatter_and_xml(path: Path):
    text = path.read_text(encoding="utf-8")
    parts = text.split("---", 2)
    if len(parts) != 3 or parts[0] != "":
        raise AssertionError(f"{path}: invalid front matter delimiters")
    yaml_text = parts[1]
    body = parts[2].strip()
    keys = re.findall(r"^([a-z_]+):", yaml_text, re.M)
    missing = set(REQUIRED_FRONTMATTER) - set(keys)
    if missing:
        raise AssertionError(f"{path}: missing front matter {sorted(missing)}")
    values = {key: re.search(rf"^{re.escape(key)}:\s*(.+)$", yaml_text, re.M).group(1).strip() for key in keys}
    unquote = lambda value: value.strip("'\"")
    if unquote(values["schema"]) != "knowledge-document-metadata-v1":
        raise AssertionError(f"{path}: invalid schema")
    if unquote(values["status"]) != "ACTIVE" or unquote(values["rights"]) != "APPROVED":
        raise AssertionError(f"{path}: active status or rights mismatch")
    if values["response_locales"].replace('"', "").replace("'", "") != "[en, es-419]":
        raise AssertionError(f"{path}: response_locales must be [en, es-419]")
    if "valid_from" not in values["validity"] or "valid_until: null" not in values["validity"]:
        raise AssertionError(f"{path}: invalid validity")
    manifest = unquote(values["manifest_ref"])
    expected_manifest = "03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml"
    if manifest != expected_manifest:
        raise AssertionError(f"{path}: manifest_ref mismatch")
    document_id = unquote(values["document_id"])
    if not ID_PATTERN.fullmatch(document_id):
        raise AssertionError(f"{path}: invalid document_id {document_id}")
    for array_key in ("routes", "tasks", "tags"):
        tokens = re.findall(r'"([^"\n]+)"|([A-Za-z0-9-]+)', values[array_key])
        normalized = [a or b for a, b in tokens]
        if not normalized or any(not ID_PATTERN.fullmatch(token) for token in normalized):
            raise AssertionError(f"{path}: invalid {array_key}")
    root = ET.fromstring(body)
    if root.tag != "kb_document":
        raise AssertionError(f"{path}: root must be kb_document")
    sections = [child.tag for child in root]
    if sections != REQUIRED_SECTIONS:
        raise AssertionError(f"{path}: sections {sections}")
    for child in root:
        if not "".join(child.itertext()).strip():
            raise AssertionError(f"{path}: empty {child.tag}")
    if VOSEO.search(text):
        raise AssertionError(f"{path}: voseo token detected")
    return text, values, body


def main():
    errors = []
    try:
        registry = json.loads((PROMPT_SYSTEM / "prompt-registry.json").read_text(encoding="utf-8"))
        template_schema = json.loads((PROMPT_SYSTEM / "prompt-template.schema.json").read_text(encoding="utf-8"))
        registry_schema = json.loads((PROMPT_SYSTEM / "prompt-registry.schema.json").read_text(encoding="utf-8"))
        assert template_schema["title"] == "PromptTemplateV1"
        assert registry_schema["title"] == "PromptRegistryV1"
        templates = registry["templates"]
        assert len(templates) == 22
        assert sum(t["family"] == "studio" for t in templates) == 9
        assert sum(t["family"] == "channel" for t in templates) == 13
        assert len({t["templateId"] for t in templates}) == 22
        assert registry["sourcePolicies"] == {
            "chat": {"min": 3, "max": 8, "rejectEmpty": True, "rejectAllSources": True},
            "studio": {"min": 4, "max": 12, "rejectEmpty": True, "rejectAllSources": True},
            "audit": {"min": 1, "max": 20, "rejectEmpty": True, "rejectAllSources": True},
        }
        generator = load_generator()
        expected_registry = [generator.registry_entry(item, index) for index, item in enumerate(generator.ITEMS)]
        assert templates == expected_registry, "registry drift from generator"
        markdown_files = sorted(TEMPLATE_ROOT.rglob("*.md"))
        assert len(markdown_files) == 22
        for index, (entry, item) in enumerate(zip(templates, generator.ITEMS)):
            assert entry["jsonPointer"] == f"/templates/{index}"
            assert entry["studioConfig"]["sourcePolicy"] == ({"min": 4, "max": 12, "rejectEmpty": True, "rejectAllSources": True} if entry["family"] == "studio" else {"min": 3, "max": 8, "rejectEmpty": True, "rejectAllSources": True})
            path = (PROMPT_SYSTEM / entry["markdownRef"]).resolve()
            generated_path, generated_text = generator.markdown(item, index)
            assert path == generated_path.resolve()
            assert path.read_text(encoding="utf-8") == generated_text
            text, values, _ = frontmatter_and_xml(path)
            assert values["json_pointer"].strip("'\"") == entry["jsonPointer"]
            registry_ref = values["json_registry_ref"].strip("'\"")
            assert registry_ref.endswith(f"prompt-system/prompt-registry.json#{entry['jsonPointer']}")
        controls = sorted(CONTROL_ROOT.glob("*.md"))
        assert len(controls) == 5
        for path in controls:
            frontmatter_and_xml(path)
        bootstrap = (CONTROL_ROOT / "00-control--notebook-bootstrap--v3.0.md").read_text(encoding="utf-8")
        start = bootstrap.index('<notebook_bootstrap version="3.0"')
        end = bootstrap.index("</notebook_bootstrap>") + len("</notebook_bootstrap>")
        assert end - start <= 9500
        print(f"PASS controls={len(controls)} templates={len(templates)} studio=9 channels=13 bootstrap_chars={end-start}")
    except Exception as exc:
        errors.append(str(exc))
    if errors:
        for error in errors:
            print(f"FAIL {error}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
