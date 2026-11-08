# English for Physicists — A2 implementation foundation

**Status:** development preview only; not an operational A2 course and not approved for production.

This branch is the first GitHub implementation step following the completion of twelve *draft* A2 authoring packages. The current draft inventory contains 2,555 candidate exercises across A2.01–A2.12. The public site on `main` is intentionally unchanged.

## Implemented in this branch

- Isolated `/english/` preview, with A2.01–A2.12 navigation and planned topic summaries.
- Four illustrative text-only practice questions using fictional simulated cart data.
- Immediate formative feedback, with first-attempt and retry records kept separate.
- Local-first IndexedDB progress, with localStorage fallback and explicit in-memory fallback warning.
- JSON import/export and local deletion controls. Browser profile separation is not individual identity isolation.
- Accessible labels, a semantic data table, keyboard-operable buttons and live feedback status.
- Clear prohibition on assigning CEFR mastery, pronunciation quality, or official certification from sample practice.

## Release blockers

1. **Editorial/physics sign-off:** all 2,555 candidates, answer alternatives, explanations and physics examples remain draft/unreviewed.
2. **Canonical schema:** the earlier units use differing format names (`single_choice` vs `choice`, other authoring fields); migrate carefully before import.
3. **Original audio:** listening and model-pronunciation assessment cannot be activated until reviewed American-English recordings and transcript controls exist.
4. **Accessibility:** create accessible SVG/chart alternatives and verify screen-reader and keyboard workflows.
5. **Adaptive evidence:** mastery, weakness hypotheses, review scheduling and remediation must be tested with independent item families and appropriate false-positive controls.
6. **Privacy and durability:** test IndexedDB/localStorage fallbacks, shared-computer use, migration, export/import and data removal.
7. **Browser QA:** automated cross-browser and accessibility checks are required before merging.
8. **Answer security:** because this is a static website, exam answers are publicly inspectable; do not describe it as a secure accredited examination.

The completed A2 authoring archive is held separately from this repository preview until quality gates pass. Do not link this route from the production homepage or merge this PR before the gates above are resolved.

## Next build slice

Build a canonical schema validator and importer for A2.01–A2.12, validate all draft item references, and then integrate the **reviewed** text-only learning items. Add the audio, writing and speaking layers only when their evidence and privacy contracts can be honored.
