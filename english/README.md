# English for Physicists — A2 development branch

**Version:** implementation slice 0.2 (draft, unmerged PR #3). **Do not merge to production yet.**

## Working in the feature branch

- Standalone English development entry point; physics practicums and LaTeX Studio untouched.
- Navigation for all 12 A2 units.
- **A2.01: 34 unreviewed text-only formative exercises** for basic grammar, vocabulary and reading, supported by four original sources.
- **A2.02: 34 unreviewed text-only formative exercises** for scientific numbers, grammar, SI units and reading, supported by four original sources.
- Four additional simulation-based sample questions under A2.12, not a complete capstone.
- Shared versioned JSON schema for active draft units, validated in-browser before activation.
- First-attempt and retry tracking, with draft items explicitly excluded from verified proficiency evidence.
- Deterministic constrained-response grading, conservative weakness hypotheses, evidence summaries and local practice scheduling.
- Initial review intervals of 1, 3, 7, 14, 30 and 60 days, subject to future calibration.
- Browser-local IndexedDB progress with localStorage fallback and backup export/import/clear.
- Node regression tests and dedicated English GitHub Actions workflow.

## Audit scope

The **2,555 A2 candidates** in 12 previous authoring packages are **not fully implemented** in this branch. Only 68 unreviewed text practice questions are integrated (plus 4 demonstrations). A2.03–A2.11 remain authoring-only; A2.12 remains a demonstration.

The adaptive engine does **not** assign CEFR proficiency, speaking or writing grades, or verified mastery using draft content. It does not intentionally transmit exercise responses to an application server.

## Canonical item schema v1

Each unit contains schemaVersion, id, title, sources and items. Each item has a stable ID, tagged skill, item family, draft/reviewed status, modality, prompt, accepted answers, feedback and optional sourceId. Only single_choice and short_answer are currently rendered. The remaining exercise types must receive tested renderers.

Static answer keys are inspectable, so this is **not a secure high-stakes examination system**.

## Release blockers

1. Independent linguistic, physics, pedagogy and answer-key review.
2. Safe normalization of all remaining draft questions, without silent semantic changes.
3. Original American-English audio, aligned transcripts and accessible listening controls.
4. Speaking/writing/mediation rubrics and trustworthy self/human assessment.
5. Human-labeled evaluation of misconception detection, including false positives.
6. Automated browser/keyboard/screen-reader/storage/privacy regression testing.
7. Held-out independent item banks and CEFR descriptor-traceability review.
8. Student/instructor pilot before asserting efficacy or awarding proficiency certificates.

## Testing

From repository root: node --test english/test/*.test.mjs

GitHub Actions runs the same command for changes in the English directory.

**Privacy:** local progress belongs to a browser profile, not a verified individual. Two people sharing a profile can access each other's progress. The live site and production homepage are unchanged by this draft PR.