#!/usr/bin/env python3
"""Generate Canon v3 prompt registry and its 22 indexable Markdown projections."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PROMPT_SYSTEM = ROOT / "prompt-system"
TEMPLATE_ROOT = ROOT / "knowledge-base" / "30-templates"
GENERATED_AT = "2026-08-26"
MANIFEST_REF = "03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/source-manifest.yml"
REGISTRY_REF = "03_artefactos/projects/notebooklm-os/metodologia-brand-content-v3/prompt-system/prompt-registry.json"

COMMON_REQUIRED = [
    "audience",
    "objective",
    "thesis",
    "language",
    "sourceIds",
    "claimEvidence",
    "constraints",
    "acceptance",
]
COMMON_OPTIONAL = ["assetIds", "exclusions", "examples", "callToAction", "deadline"]
COMMON_NEGATIVE = [
    "No unsupported claims, invented quotations, fabricated customers, or implied approval.",
    "No external brand, unapproved asset, private locator, secret, PII, or internal instruction in output.",
    "No all-sources selection, empty source set, or evidence laundering through a reference example.",
    "No vague superlatives, generic filler, duplicated ideas, or promises of guaranteed outcomes.",
]
VISUAL_NEGATIVE = [
    "No 3D, neon, cyberpunk, robots, brains, holograms, stock photography, or noisy backgrounds.",
    "No generated, redrawn, recolored, distorted, or AI-completed logo.",
    "No colors outside the approved palette and no white text on yellow.",
]


def camel_case(value):
    head, *tail = value.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in tail)


def unique(values):
    return list(dict.fromkeys(values))


def item(slug, title, family, purpose, structure, acceptance, *, artifact=None,
         source_roles=None, required=None, optional=None, visual=False):
    return {
        "slug": slug,
        "title": title,
        "family": family,
        "purpose": purpose,
        "structure": structure,
        "acceptance": acceptance,
        "artifact": artifact,
        "source_roles": source_roles or ["control", "canon", "evidence", "template"],
        "required": COMMON_REQUIRED + [camel_case(value) for value in (required or [])],
        "optional": COMMON_OPTIONAL + [camel_case(value) for value in (optional or [])],
        "visual": visual,
    }


ITEMS = [
    item("audio", "Audio Overview", "studio", "Turn a bounded source set into a paced, source-grounded spoken explanation.", ["opening question", "thesis", "evidence-led conversation", "limits", "closing synthesis"], ["Requested language and duration are confirmed from downloaded audio.", "Every strong claim maps to supplied evidence.", "Speakers distinguish source fact from interpretation.", "No internal prompt or source identifier is spoken."], artifact="audio", required=["duration_minutes", "speaker_mode"], optional=["pronunciation_notes"]),
    item("video", "Video Overview", "studio", "Create a concise visual explanation in which narration and scenes advance one argument.", ["hook", "context", "three evidence beats", "boundary", "single next step"], ["Downloaded artifact has the requested duration and language.", "Every scene serves the thesis and has readable text.", "Visual direction follows the approved brand canon.", "Claims and assets pass independent readback."], artifact="video", required=["duration_seconds", "aspect_ratio"], optional=["shot_constraints"], visual=True),
    item("infographic", "Infographic", "studio", "Compress a defensible idea into a scan-friendly explanatory visual.", ["conclusion title", "orientation cue", "three to five evidence blocks", "limit", "source footer"], ["Reading order is unambiguous at target size.", "Visible text is concise and factually supported.", "Contrast and hierarchy pass accessibility review.", "Downloaded bytes match the requested visual type."], artifact="infographic", required=["canvas_ratio", "reading_context"], visual=True),
    item("slide-deck", "Slide Deck", "studio", "Build a narrative sequence for a live or asynchronous decision-making presentation.", ["tension", "thesis", "evidence arc", "decision", "next step"], ["Slide count and ratio match the brief exactly.", "Each slide has one conclusion and no unsupported claim.", "Speaker notes retain evidence and conditions.", "Rasterized output is labeled STUDIO_RAW until editable postproduction."], artifact="slide-deck", required=["slide_count", "aspect_ratio", "delivery_minutes"], visual=True),
    item("report", "Report", "studio", "Synthesize evidence into a structured decision document with explicit uncertainty.", ["executive conclusion", "scope and method", "findings", "trade-offs", "recommendations", "gaps"], ["Scope, cutoff date, evidence, and uncertainty are explicit.", "Recommendations are conditioned by the findings.", "Citations resolve to selected sources.", "Downloaded document is reread before verification."], artifact="report", required=["decision_question", "cutoff_date"], optional=["appendix_requirements"]),
    item("flashcards", "Flashcards", "studio", "Create retrieval-practice cards that test one meaningful concept at a time.", ["prompt side", "answer side", "why it matters", "misconception cue"], ["Each card tests one concept rather than recognition alone.", "Answers are brief, accurate, and source-grounded.", "Distracting trivia and duplicate cards are absent.", "Coverage matches the declared learning objectives."], artifact="flashcards", required=["card_count", "learning_objectives"], source_roles=["control", "canon", "evidence", "pedagogy", "template"]),
    item("quiz", "Quiz", "studio", "Assess understanding and transfer with answerable, discriminating questions.", ["instructions", "questions", "answer key", "rationales", "scoring guidance"], ["Every item maps to a learning objective and selected source.", "Distractors are plausible but not deceptive.", "Answers and rationales are unambiguous.", "Passing threshold is declared before generation."], artifact="quiz", required=["question_count", "learning_objectives", "passing_threshold"], source_roles=["control", "canon", "evidence", "pedagogy", "template"]),
    item("data-table", "Data Table", "studio", "Normalize source-grounded facts into a comparison-ready table without false precision.", ["field definitions", "rows", "source and date columns", "missing-value legend", "limitations"], ["Every row has provenance or an explicit N/E marker.", "Units and dates are normalized.", "Missing data is not inferred.", "Exported columns match the declared schema."], artifact="data-table", required=["row_unit", "column_schema", "missing_value_policy"]),
    item("mind-map", "Mind Map", "studio", "Expose relationships, hierarchy, and open questions around a bounded topic.", ["central thesis", "primary branches", "supporting nodes", "cross-links", "gaps"], ["Hierarchy is readable and non-redundant.", "Relationships reflect selected sources rather than association alone.", "Unknowns are visibly separated from claims.", "The artifact remains legible at normal zoom."], artifact="mind-map", required=["central_question", "depth_limit"], visual=True),
    item("linkedin-post", "LinkedIn Post", "channel", "Publish a focused professional insight that earns attention without clickbait.", ["one or two-line hook", "situation", "thesis", "up to three supports", "limit", "one-move CTA"], ["The first lines state a true tension.", "The post contains one thesis and no generic hashtags.", "Claims are traceable and conditions remain visible.", "CTA asks for one proportionate action."], required=["length_range"]),
    item("linkedin-carousel", "LinkedIn Carousel", "channel", "Translate one argument into a swipeable sequence with a deliberate information rhythm.", ["cover conclusion", "problem", "reframe", "evidence sequence", "application", "closing CTA"], ["Card count matches the brief.", "Each card carries one idea and readable copy.", "Narrative works without speaker notes.", "Visual system and safe zones are consistent."], required=["card_count", "canvas_ratio"], visual=True),
    item("one-pager", "One-pager", "channel", "Help a time-constrained reader understand a proposition and choose a next step.", ["decision headline", "audience and problem", "method", "evidence", "limits", "next step"], ["The decision is understandable in under two minutes.", "Benefits are evidence-bound rather than promised.", "Sections are scannable and non-repetitive.", "A single accountable next step is present."], required=["page_size", "reader_decision"], visual=True),
    item("executive-deck", "Executive Deck", "channel", "Support an executive decision with a compact claim-evidence narrative.", ["decision", "stakes", "evidence", "options", "trade-offs", "recommendation", "next gate"], ["Requested slide count and meeting objective align.", "Every strong claim has a source and condition.", "Options and recommendation are visibly distinct.", "Speaker notes preserve provenance."], required=["slide_count", "meeting_decision", "delivery_minutes"], visual=True),
    item("commercial-proposal-deck", "Commercial Proposal Deck", "channel", "Frame a bounded offer around client context, value mechanism, delivery, and decisions.", ["client situation", "outcomes", "approach", "scope", "evidence", "risks", "commercial boundary", "next step"], ["No client fact, ROI, case, or commitment is invented.", "Scope and exclusions are explicit.", "Value claims describe mechanisms and evidence.", "Commercial approval remains a separate gate."], required=["client_context", "offer_scope", "commercial_status"], visual=True),
    item("learning-deck", "Learning Deck", "channel", "Guide a learner from a meaningful question through explanation, practice, and transfer.", ["learning question", "prior knowledge", "concept model", "worked example", "practice", "feedback", "transfer"], ["Objectives are observable and age-appropriate.", "Practice aligns with instruction and acceptance.", "Cognitive load is controlled per slide.", "Claims separate pedagogy, evidence, and metaphor."], required=["learner_profile", "learning_objectives", "slide_count"], source_roles=["control", "canon", "evidence", "pedagogy", "template"], visual=True),
    item("podcast-script", "Podcast Script", "channel", "Develop a listenable, evidence-led conversation or monologue with editorial pacing.", ["cold open", "promise", "segments", "examples", "counterpoint", "synthesis", "CTA"], ["Runtime estimate fits the word count.", "Spoken language sounds natural in the target locale.", "Attributions and uncertainty are audible.", "No visual-only information is required to follow the argument."], required=["duration_minutes", "speaker_mode"], optional=["pronunciation_notes"]),
    item("short-video-script", "Short Video Script", "channel", "Deliver one useful shift in a short, production-ready audiovisual script.", ["first-second hook", "problem", "reframe", "proof", "punchline", "CTA"], ["Timing fits the requested duration.", "Voiceover, on-screen text, and visual action are separable.", "Hook is accurate rather than sensational.", "The closing line resolves the opening tension."], required=["duration_seconds", "platform", "aspect_ratio"], visual=True),
    item("newsletter-article", "Newsletter or Article", "channel", "Explain a consequential idea with enough depth for reflection and action.", ["title", "abstract", "opening tension", "argument", "evidence", "counterpoint", "application", "close"], ["Title and abstract accurately represent the argument.", "Sections add distinct value without repetition.", "Sources, assumptions, and limits are distinguishable.", "Reader leaves with a practical decision or experiment."], required=["length_range", "publication_context"]),
    item("email", "Email", "channel", "Move one relationship or decision forward with concise, respectful context.", ["subject", "opening context", "single ask or update", "necessary evidence", "next step", "sign-off"], ["Purpose is clear in the first paragraph.", "The email makes one primary request.", "Tone matches the relationship and language.", "No sensitive data or unapproved commitment appears."], required=["recipient_role", "relationship_context", "email_intent"]),
    item("landing-page", "Landing Page", "channel", "Help a defined audience evaluate an offer without inflated promises or hidden ambiguity.", ["hero thesis", "audience problem", "value mechanism", "how it works", "evidence", "fit and non-fit", "FAQ", "CTA"], ["Visitor can identify fit, mechanism, and next step.", "Claims and proof remain paired.", "Accessibility and mobile scan order are specified.", "No dark pattern, fake urgency, or invented social proof appears."], required=["offer", "conversion_action", "page_context"], visual=True),
    item("case-study", "Case Study", "channel", "Turn approved evidence into a credible narrative of context, intervention, and observed change.", ["context", "constraint", "approach", "implementation", "observed result", "limits", "transferable lesson"], ["Consent and publication rights are confirmed.", "Observed outcomes are not converted into causal guarantees.", "Numbers retain units, period, and provenance.", "Anonymization does not create misleading specificity."], required=["case_evidence", "rights_status", "measurement_period"]),
    item("branded-static-visual", "Branded Static Visual", "channel", "Create a single branded visual that communicates one conclusion at a glance.", ["headline", "one explanatory visual", "supporting line", "source or qualifier", "reserved logo zone"], ["Message is legible at target display size.", "One conclusion dominates the composition.", "Logo uses an approved master in postproduction.", "Palette, typography, contrast, and safe zones pass review."], required=["canvas_ratio", "display_context"], visual=True),
]


def slug_title(slug: str) -> str:
    return slug.replace("-", " ").title()


def q(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def yaml_list(values):
    return "[" + ", ".join(q(value) for value in values) + "]"


def format_with_prettier(content: str, target: Path) -> str:
    """Apply the repository-pinned formatter so generation matches CI exactly."""
    prettier = next(
        (parent / "node_modules" / ".bin" / "prettier"
         for parent in Path(__file__).resolve().parents
         if (parent / "node_modules" / ".bin" / "prettier").exists()),
        None,
    )
    if prettier is None:
        raise RuntimeError("Pinned Prettier is required to generate Canon v3 prompt projections.")
    result = subprocess.run(
        [str(prettier), "--stdin-filepath", str(target)],
        input=content,
        text=True,
        capture_output=True,
        check=True,
    )
    return result.stdout


SPECIAL = {
    "audio": ("Favor conversational clarity over exhaustive coverage; listeners cannot scan backward like report readers.", "Audio cannot carry a visual-only comparison or an unverifiable speaker persona.", "If a name or acronym lacks pronunciation guidance, flag it before recording.", "Example brief: explain one operating decision in eight minutes with two speakers, three cited claims, and a spoken limitation."),
    "video": ("Use fewer scenes with causal continuity instead of many disconnected visual ideas.", "A video overview is not a cinematic advertisement and cannot imply evidence through spectacle.", "When required copy is too dense for the duration, shorten the argument rather than accelerate unreadable screens.", "Example brief: show how a governed source becomes a verified artifact in six scenes and sixty seconds."),
    "infographic": ("Trade completeness for scanability while retaining every qualifier that changes the conclusion.", "An infographic cannot represent uncertainty only through tiny footnotes or color alone.", "If categories overlap, state the organizing rule or switch from comparison to a process diagram.", "Example brief: compare three source roles in a vertical canvas using five evidence blocks and one explicit gap."),
    "slide-deck": ("Narrative progression outranks fitting every source fact onto a slide.", "Studio output cannot satisfy editability or accessibility merely because its PDF looks correct.", "If the requested count cannot hold the argument, surface the conflict before generation; never add hidden slides.", "Example brief: build twelve 16:9 slides that move executives from problem to decision in fifteen minutes."),
    "report": ("Preserve decision-relevant nuance even when it makes the recommendation conditional.", "A report cannot transform missing evaluation, correlation, or vendor language into demonstrated fact.", "When sources use incompatible dates or definitions, compare them in separate frames and document the mismatch.", "Example brief: answer one investment question with a dated evidence table, two options, and unresolved gaps."),
    "flashcards": ("Prefer effortful retrieval and useful discrimination over a large count of easy definitions.", "Flashcards cannot substitute for practice that requires synthesis, judgment, or production.", "If one prompt admits several defensible answers, constrain the context or convert it into a discussion task.", "Example brief: produce eighteen cards that alternate concept recall, example selection, and misconception repair."),
    "quiz": ("Measure transfer rather than rewarding superficial phrase matching.", "A quiz score is not proof of durable learning, real-world performance, or instructional quality.", "If evidence supports more than one answer, rewrite the item instead of choosing an arbitrary key.", "Example brief: create ten scenario questions with rationales and an eighty-percent passing threshold."),
    "data-table": ("Prefer comparable fields and visible missingness over a dense table with false precision.", "The table cannot infer absent values or normalize incompatible units without documenting a method.", "When a row belongs to multiple categories, use explicit multi-value fields instead of silently choosing one.", "Example brief: normalize five tools across six dated criteria, with source and N/E columns on every row."),
    "mind-map": ("Reveal a useful hierarchy without pretending every relationship is causal.", "A mind map cannot replace a sequence diagram when timing, direction, or state transition is decisive.", "If a node belongs under several branches, use a labeled cross-link and avoid duplicating its claim.", "Example brief: map one central question into four branches, two levels, and a visible cluster of unknowns."),
    "linkedin-post": ("Earn attention through a true tension, not through inflated certainty or manufactured controversy.", "A post cannot compress away the condition that makes its main claim accurate.", "If the hook promises a result the body cannot establish, rewrite the hook rather than stretch the evidence.", "Example brief: write 180 words for operators, opening with a workflow tension and closing with one diagnostic question."),
    "linkedin-carousel": ("Use card-to-card progression instead of splitting a long paragraph into decorative panels.", "A carousel cannot rely on captions to repair an incomplete narrative or inaccessible card design.", "If one card needs two conclusions, divide or remove content while preserving the fixed card count.", "Example brief: create eight cards that move from a mistaken assumption to a practical three-step method."),
    "one-pager": ("Optimize for a two-minute decision, not for comprehensive organizational documentation.", "A one-pager cannot hide exclusions, decision ownership, or material evidence in unreadable fine print.", "If two audiences need different decisions, create separate successors instead of averaging their needs.", "Example brief: explain an internal pilot to a sponsor with scope, evidence, risks, and one approval request."),
    "executive-deck": ("Make options and trade-offs visible even when a single recommendation is preferred.", "An executive deck cannot present a weighted judgment as a scientific ranking without a validated method.", "If the meeting decision changes, invalidate the old idempotency key and compile a successor brief.", "Example brief: prepare ten slides for a steering committee choosing between pilot, defer, and reject."),
    "commercial-proposal-deck": ("Connect value to a delivery mechanism while keeping commercial commitments explicitly bounded.", "A proposal cannot invent client pain, internal capability, case evidence, ROI, price, or delivery authority.", "If commercial approval is pending, mark figures and commitments as controlled placeholders, not final terms.", "Example brief: frame a discovery engagement with outcomes, work packages, exclusions, dependencies, and next gate."),
    "learning-deck": ("Allocate visual attention to explanation and practice rather than maximizing content coverage.", "A learning deck cannot claim mastery from exposure, completion, satisfaction, or one quiz score.", "When prior knowledge is unknown, include a diagnostic entry task and branch the facilitator guidance.", "Example brief: teach source precedence in fourteen slides with a worked example, practice, feedback, and transfer."),
    "podcast-script": ("Preserve authentic spoken rhythm without relaxing attribution or evidence conditions.", "A script cannot imply a guest, endorsement, interview, or lived experience that was not approved and recorded.", "If a technical fact requires a visual, restate it as an audible comparison or move it to companion notes.", "Example brief: script a twelve-minute solo episode that challenges one misconception and proposes one experiment."),
    "short-video-script": ("Choose one memorable shift instead of compressing a complete tutorial into seconds.", "A short script cannot use urgency, fear, or impossible speed to conceal a weak proposition.", "If the punchline introduces a new claim, move that claim earlier and support it before the close.", "Example brief: write a forty-five-second vertical script with separate voiceover, screen copy, and visual action."),
    "newsletter-article": ("Use enough depth to change a reader's model while removing branches that do not affect action.", "An article cannot turn a personal analogy into scientific or universal evidence.", "When a counterexample changes the thesis, revise the thesis rather than confining the exception to a footnote.", "Example brief: develop a 1,200-word argument with an abstract, three claims, one counterpoint, and a field exercise."),
    "email": ("Preserve necessary context while making one primary request easy to answer.", "An email cannot disclose restricted evidence or make commitments beyond the sender's authority.", "If information and approval are both needed, state the approval as the primary ask and list information as support.", "Example brief: ask a reviewer to approve one exact artifact version, naming evidence, deadline, and next gate."),
    "landing-page": ("Clarify fit and mechanism before optimizing persuasion or conversion language.", "A landing page cannot use fake scarcity, invented testimonials, dark patterns, or unsupported outcome guarantees.", "If an audience is explicitly not a fit, say so near qualification criteria instead of burying the boundary.", "Example brief: present a workshop with audience, value mechanism, agenda, evidence, non-fit, FAQ, and one CTA."),
    "case-study": ("Favor credible context and observed change over a simplified hero narrative.", "A case study cannot convert one observation into causation or expose a participant through indirect identifiers.", "If consent allows internal but not public use, produce a restricted learning note rather than publishable copy.", "Example brief: describe an approved pilot with baseline, intervention, observed result, limitations, and transferable lesson."),
    "branded-static-visual": ("Let one conclusion dominate; secondary decoration must never compete with meaning.", "A static visual cannot embed an invented logo, unapproved portrait, illegible source, or off-palette effect.", "If the message requires a sequence, route to carousel or infographic rather than crowding one canvas.", "Example brief: design a square visual around one method principle, one diagram, one qualifier, and a reserved logo zone."),
}


def markdown(template, index):
    family_dir = "studio" if template["family"] == "studio" else "channels"
    document_id = f"PROMPT-{template['family'].upper()}-{template['slug'].upper()}-V1"
    registry_pointer = f"/templates/{index}"
    source_min = 4 if template["family"] == "studio" else 3
    source_max = 12 if template["family"] == "studio" else 8
    route = "R70-STUDIO" if template["family"] == "studio" else "R40-CREATE"
    gate_sentence = (
        "`NLM_STUDIO_GENERATION_APPROVED` governs generation."
        if template["family"] == "studio"
        else "Draft compilation requires no external mutation gate; `HUMAN_APPROVED` and publication remain separate promotions."
    )
    evidence_control = "CTRL-AUTHORITY-ROUTER-V3"
    source_refs = ["CTRL-SYSTEM-PROMPT-V3", evidence_control, "prompt.registry.v1"]
    tradeoff, limit, edge, example = SPECIAL[template["slug"]]
    specific_required = template["required"][len(COMMON_REQUIRED):]
    lines = [
        "---",
        'schema: "knowledge-document-metadata-v1"',
        f'document_id: "{document_id}"',
        f'title: {q(template["title"] + " Prompt Template")}',
        'version: "1.0"',
        'status: "ACTIVE"',
        'authority: "TEMPLATE"',
        'layer: "30 Templates"',
        'language: "en"',
        'response_locales: ["en", "es-419"]',
        f'routes: ["{route}"]',
        f'tasks: ["create", "brief", "verify", "{template["slug"]}"]',
        'audiences: ["content strategist", "editor", "producer", "verifier"]',
        f'tags: ["notebooklm-os", "canon-v3", "prompt-template", "{template["family"]}", "{template["slug"]}"]',
        f'keywords: {yaml_list([template["slug"], template["title"], "source selection", "idempotency", "acceptance"])}',
        f'aliases: {yaml_list(unique([template["title"], slug_title(template["slug"])]))}',
        f'source_refs: {yaml_list(source_refs)}',
        'rights: "APPROVED"',
        f'validity: {{valid_from: "{GENERATED_AT}", valid_until: null}}',
        'supersedes: []',
        f'related_ids: {yaml_list(["CTRL-KNOWLEDGE-MAP-V3", "CTRL-KB-STANDARD-V3"])}',
        f'manifest_ref: "{MANIFEST_REF}"',
        f'json_registry_ref: "{REGISTRY_REF}#{registry_pointer}"',
        f'json_pointer: "{registry_pointer}"',
        "---",
        "",
        "<kb_document>",
        "<abstract>",
        f"# Abstract\n\n{template['purpose']}",
        "</abstract>",
        "<navigation>",
        f"# Index\n\n1. {template['title']} route\n2. {', '.join(specific_required)}\n3. {template['structure'][0]} to {template['structure'][-1]}\n4. Format boundary and verification",
        "</navigation>",
        "<routing>",
        f"# {template['title']} route\n\n`{route}` selects {source_min}-{source_max} source IDs for {template['slug']}. {gate_sentence} Invalid breadth returns `BLOCKED_ALL_SOURCES`. Spanish output uses `es-419` without voseo.",
        "</routing>",
        "<knowledge>",
        f"# {template['title']} contract\n\nRegistry location: `{registry_pointer}`.\n\n## Distinct inputs\n\n" + "\n".join(f"- `{field}`" for field in specific_required) + "\n\n## Artifact sequence\n\n" + "\n".join(f"{number}. {part}." for number, part in enumerate(template["structure"], 1)) + f"\n\n## Example\n\n{example}",
        "</knowledge>",
        "<evidence>",
        f"# {template['title']} evidence\n\n[METODOLOGIA][source_ref:{evidence_control}] Evidence test: {template['acceptance'][1]}",
        "</evidence>",
        "<decisions>",
        f"# {template['title']} trade-off\n\n{tradeoff}",
        "</decisions>",
        "<assumptions>",
        f"# {template['title']} assumption\n\n[SUPUESTO] `{specific_required[-1]}` and the evidence needed for {template['structure'][0]} are confirmed before compilation.",
        "</assumptions>",
        "<limits>",
        f"# {template['title']} boundary\n\n{limit} Negative rules resolve at `{registry_pointer}/negativePrompt`; authority remains in `CTRL-AUTHORITY-ROUTER-V3`.",
        "</limits>",
        "<edge_cases>",
        f"# {template['title']} edge case\n\n{edge} Shared stop codes resolve through `CTRL-SYSTEM-PROMPT-V3`.",
        "</edge_cases>",
        "<acceptance>",
        f"# {template['title']} acceptance\n\n" + "\n".join(f"- {criterion}" for criterion in template["acceptance"]),
        "</acceptance>",
        "<related_documents>",
        f"# Dependencies\n\n`CTRL-KNOWLEDGE-MAP-V3`; `CTRL-SYSTEM-PROMPT-V3`; `prompt.registry.v1{registry_pointer}`.",
        "</related_documents>",
        "<change_log>",
        f"# Change log\n\n- `{GENERATED_AT}` — {template['title']} v1.0 added to Canon v3.",
        "</change_log>",
        "</kb_document>",
        "",
    ]
    path = TEMPLATE_ROOT / family_dir / f"30-template--{template['slug']}--v1.0.md"
    return path, format_with_prettier("\n".join(lines), path)


def registry_entry(template, index):
    family_dir = "studio" if template["family"] == "studio" else "channels"
    source_min = 4 if template["family"] == "studio" else 3
    source_max = 12 if template["family"] == "studio" else 8
    negative = COMMON_NEGATIVE + (VISUAL_NEGATIVE if template["visual"] else [])
    return {
        "templateId": f"prompt.{template['family']}.{template['slug']}.v1",
        "version": "1.0",
        "family": template["family"],
        "title": template["title"],
        "markdownRef": f"../knowledge-base/30-templates/{family_dir}/30-template--{template['slug']}--v1.0.md",
        "jsonPointer": f"/templates/{index}",
        "inputs": {"required": template["required"], "optional": template["optional"]},
        "sourceRoles": template["source_roles"],
        "outputContract": {
            "format": template["artifact"] or template["slug"],
            "structure": template["structure"],
            "state": "DRAFT",
            "languagePolicy": "user-language-with-es-419-default",
        },
        "studioConfig": {
            "enabled": template["family"] == "studio",
            "artifactType": template["artifact"],
            "sourcePolicy": {"min": source_min, "max": source_max, "rejectEmpty": True, "rejectAllSources": True},
            "requiresGenerationGate": template["family"] == "studio",
        },
        "executionGate": "NLM_STUDIO_GENERATION_APPROVED" if template["family"] == "studio" else None,
        "negativePrompt": negative,
        "acceptance": template["acceptance"],
        "idempotency": {
            "algorithm": "sha256-canonical-json",
            "fields": ["templateId", "inputs", "sourceSetSha256", "assetIds", "language"],
            "onDuplicate": "RETURN_EXISTING_ACTIVE_OR_VERIFIED_ARTIFACT",
        },
    }


def main():
    assert len(ITEMS) == 22
    assert sum(item["family"] == "studio" for item in ITEMS) == 9
    assert sum(item["family"] == "channel" for item in ITEMS) == 13
    registry = {
        "$schema": "./prompt-registry.schema.json",
        "schema": "PromptRegistryV1",
        "registryId": "prompt.registry.v1",
        "version": "1.0",
        "status": "ACTIVE_PRIVATE_DRAFT",
        "languagePolicy": "user-language-with-es-419-default",
        "sourcePolicies": {
            "chat": {"min": 3, "max": 8, "rejectEmpty": True, "rejectAllSources": True},
            "studio": {"min": 4, "max": 12, "rejectEmpty": True, "rejectAllSources": True},
            "audit": {"min": 1, "max": 20, "rejectEmpty": True, "rejectAllSources": True},
        },
        "templates": [registry_entry(template, index) for index, template in enumerate(ITEMS)],
    }
    PROMPT_SYSTEM.mkdir(parents=True, exist_ok=True)
    registry_path = PROMPT_SYSTEM / "prompt-registry.json"
    registry_text = json.dumps(registry, indent=2, ensure_ascii=False) + "\n"
    registry_path.write_text(format_with_prettier(registry_text, registry_path), encoding="utf-8")
    expected = set()
    for index, template in enumerate(ITEMS):
        path, content = markdown(template, index)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        expected.add(path.resolve())
    for family in ("studio", "channels"):
        directory = TEMPLATE_ROOT / family
        for path in directory.glob("30-template--*--v1.0.md"):
            if path.resolve() not in expected:
                path.unlink()
    print(f"generated templates={len(ITEMS)} studio=9 channels=13")


if __name__ == "__main__":
    main()
