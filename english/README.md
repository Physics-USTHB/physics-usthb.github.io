# English for Physicists — A2 development branch

**Version:** implementation slice 0.2 (draft, unmerged PR #3). **Do not merge to production yet.**

## Working in the feature branch

- Standalone English development entry point; physics practicums and LaTeX Studio untouched.
- Navigation for all 12 A2 units.
- **A2.01–A2.12: 483 unreviewed, formative text-practice items** with four original reading sources per unit (48 total).
- All twelve units contain original explanatory teaching notes, objectives and pronunciation guidance; original audio recordings are pending.
- The A2.11 and A2.12 virtual-cart graphs include accompanying accessible numeric data tables.
- Optional private microphone recording supports speaking self-review without automatic proficiency grading.
- Four previous demonstration questions remain archived in browser-history compatibility only. A2.12 now provides separate authored text practice; its full capstone rubric and media are pending.
- Shared versioned JSON schema for active draft units, validated in-browser before activation.
- First-attempt and retry tracking, with draft items explicitly excluded from verified proficiency evidence.
- Deterministic constrained-response grading, conservative weakness hypotheses, evidence summaries and local practice scheduling.
- Initial review intervals of 1, 3, 7, 14, 30 and 60 days, subject to future calibration.
- Browser-local IndexedDB progress with localStorage fallback and backup export/import/clear.
- Node regression tests and dedicated English GitHub Actions workflow.

## Audit scope

The authoring packages contain **2,555 draft A2 candidates**. This beta integrates a curated **483-item draft text-only subset** with 48 short source texts, not the full authoring inventory. Listening/pronunciation audio, productive-skill rubrics and comprehensive summative testing are still pending. No CEFR A2 level-completion claim is made.

The adaptive engine does **not** assign CEFR proficiency, speaking or writing grades, or verified mastery using draft content. It tracks formative first attempts and review intervals. A separate on-device speaking recorder holds audio in memory for local replay/download only. Exercise responses and recordings are not intentionally sent to an application server.

## Canonical item schema v1

Each unit contains schemaVersion, id, title, sources and items. Each item has a stable ID, tagged skill, item family, draft/reviewed status, modality, prompt, accepted answers, feedback and optional sourceId. Only single_choice and short_answer are currently rendered. The remaining exercise types require tested renderers and appropriate assessment contracts.

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