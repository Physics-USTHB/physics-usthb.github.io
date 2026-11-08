# English for Physicists — A2 learning beta

**Version:** A2 beta 0.4 — targeted formative study guidance. A2 beta 0.2 and 0.3 were merged through PRs #3 and #4.

## Working in the beta

- Standalone English development entry point; physics practicums and LaTeX Studio untouched.
- Navigation for all 12 A2 units.
- **A2.01–A2.12: 483 unreviewed, formative text-practice items** with four original reading sources per unit (48 total).
- All twelve units contain original explanatory teaching notes, objectives and pronunciation guidance; original audio recordings are pending.
- The A2.11 and A2.12 virtual-cart graphs include accompanying accessible numeric data tables.
- Optional private microphone recording supports speaking self-review without automatic proficiency grading; discarding an active recording also clears its buffers.
- **24 original guided writing prompts** (two per A2 unit) with local draft autosave, a manual save control, word-count guidance and four self-review checks. Drafts are included in the existing JSON backup and clear-data controls.
- **Optional synthetic read-aloud** for public reading sources using the learner's browser speech service; audio availability and accent vary. No listening grade is inferred.
- Four previous demonstration questions remain archived in browser-history compatibility only. A2.12 now provides separate authored text practice; its full capstone rubric and media are pending.
- Shared versioned JSON schema for active draft units, validated in-browser before activation.
- First-attempt and retry tracking, with draft items explicitly excluded from verified proficiency evidence.
- Deterministic constrained-response grading, conservative weakness hypotheses (not active for drafts), evidence summaries and local practice scheduling.
- **39 original skill-scoped study guides** across the 12 units, selected from the learner's incorrect *first attempts*; each suggests a short explanation and a related question. Retries do not count as independent diagnostic evidence.
- Initial review intervals of 1, 3, 7, 14, 30 and 60 days, subject to future calibration.
- Browser-local IndexedDB progress with localStorage fallback and backup export/import/clear.
- Node regression tests and dedicated English GitHub Actions workflow.

## Audit scope

The authoring packages contain **2,555 draft A2 candidates**. This beta integrates a curated **483-item draft text-only subset** with 48 short source texts, not the full authoring inventory. Original narrated listening/pronunciation audio, expert-reviewed productive-skill scoring rubrics and comprehensive summative testing are still pending. No CEFR A2 level-completion claim is made.

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

**Privacy:** local progress belongs to a browser profile, not a verified individual. Two people sharing a profile can access each other's progress. No new personal data is collected by the targeted practice suggestions.
## Current enhancement release

A2 beta 0.4 adds local, skill-scoped **formative study recommendations** using the existing first-attempt practice history. The recommended next question is unattempted and within the same item family when possible. The engine falls back to an unattempted question in the same skill, and only suggests a retry if no new item is available. Recommendations show a short rule, physics-language example, and optional reading source link.

The recommender explicitly **does not diagnose student weaknesses, assign CEFR mastery, alter scoring, or transmit records to a server**. Source questions and the study guides are drafts pending expert review. Node and browser tests verify first-attempt isolation and recommendation navigation.

The beta is linked from the main site. Existing practicums and LaTeX Studio are unchanged by this release.
