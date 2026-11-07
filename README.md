# Physics USTHB — Interactive Learning Platform

A GitHub Pages project for rigorous undergraduate physics learning in English.

> **Status:** independent educational prototype. It is not an official USTHB website unless formally adopted or authorised by the university.

## Current prototype — E03 v0.3 (visual-design pass)

The repository currently includes a designed main landing page, a designed Electricity & Circuits laboratory catalogue, and a substantial implementation of **E03 — Current–Voltage Characteristics of Electrical Dipoles**. The v0.3 pass introduces a coherent responsive visual system across all three surfaces while preserving the scientific/interactive functionality.

### E03 features

- Learn Mode and Lab Mode.
- Ohmic resistor and a steady-state electro-thermal filament-lamp model.
- Non-ideal voltmeter, ammeter and DC-source models.
- Voltmeter loading correction:
  - `I_D = I_m - V/R_V`.
- Standard-uncertainty estimates from stated instrument accuracy limits.
- Propagation of uncertainty into corrected dipole current.
- Persistent experiment state using browser `localStorage`.
- Measurement table with raw and corrected quantities.
- CSV export.
- I–V plotting with horizontal and vertical uncertainty bars.
- Iterative effective-variance weighted linear regression for the resistor:
  - `sigma_eff^2 = u(V)^2 + [m u(I)]^2`.
- Slope/intercept uncertainties, R² and reduced chi-square.
- Residual plot for model checking.
- Static and approximate local differential resistance for the nonlinear lamp.
- Series and parallel characteristic construction from measured data only, using interpolation without extrapolation.
- Six-question conceptual/quantitative assessment.
- Report builder that inserts:
  - student metadata;
  - the full measurement table;
  - experimental graph;
  - regression results;
  - residual graph;
  - synthesized series/parallel graph when available;
  - assessment result.
- Print / Save-as-PDF workflow from the browser.

## Important academic note

The virtual lab is designed to develop quantitative reasoning, data analysis, model validation and scientific communication. It does **not** reproduce every physical skill of a real laboratory, such as wiring faults, contact resistance, probe handling, equipment alignment, component damage, thermal time response, or safe operation of real instruments.

The filament model is deliberately pedagogical. It captures electro-thermal feedback through temperature-dependent resistance plus convective/conductive and radiative losses, but is not a calibrated model of a specific commercial lamp.

## Repository structure

```text
physics-usthb.github.io/
├── index.html
├── assets/
│   └── styles.css
├── electricity/
│   ├── index.html
│   └── e03/
│       ├── index.html
│       └── lab.js
├── .nojekyll
└── README.md
```

## Deploy on GitHub Pages

The repository is owned by the GitHub account `Physics-USTHB` and named `physics-usthb.github.io`, so the public site address is:

`https://physics-usthb.github.io/`

GitHub Pages should publish from the `main` branch at `/ (root)`.

## Validation performed for v0.3

- `node --check` passes for `electricity/e03/lab.js`.
- Direct DOM ID references in the JavaScript have matching elements in the E03 HTML.
- No duplicate IDs were found in the E03 page.
- Local CSS/JS/navigation paths referenced by E03 resolve in the project tree.
- Representative numerical checks keep the virtual lamp below the 200 mA ammeter range over the 0–10 V source range.
- Desktop and 390 px mobile layouts were rendered in Chromium for visual inspection.
- A browser interaction check acquired six resistor measurements and successfully completed the uncertainty-aware fit without page errors.

A complete automated browser interaction suite and formal accessibility audit are **not yet included**. These should be added before treating the project as production instructional software.

## Next development sequence

1. Instructor review of E03 scientific assumptions, wording and expected student workflow.
2. Align E03 core protocol exactly with the official USTHB TP3 sequence and apparatus.
3. Automated browser tests and accessibility audit.
4. E01 — Electrical Measurements & Resistance.
5. E02 — Electric Potential Mapping / Rheographic Tank.
6. E04 — Oscilloscope.
7. E05 — RC and RL Transients.
8. English-for-Physicists pathway integrated with the laboratory vocabulary and reporting tasks.
