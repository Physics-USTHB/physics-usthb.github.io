# Physics USTHB — Interactive Learning Platform

A GitHub Pages project for rigorous undergraduate physics learning in English.

> **Status:** independent educational project. It is not an official USTHB website unless formally adopted or authorised by the university.

## Live site

- Home: https://physics-usthb.github.io/
- Electricity laboratory: https://physics-usthb.github.io/electricity/
- E03 — Current–Voltage Characteristics: https://physics-usthb.github.io/electricity/e03/

## E01 — Electrical Measurements & Resistance

E01 is now implemented as an English-language virtual version of the USTHB resistance-measurement practical. The current USTHB Faculty of Physics course listing identifies this experiment as **TP1 — Mesure de résistances**.

The core sequence includes:

- analogue voltmeter and ammeter range selection;
- 0–30 and 0–100 scale reading;
- meter class uncertainty and reading uncertainty;
- generator-emf measurement on the appropriate voltmeter range and the immediately higher range;
- uncertainty-interval comparison and selection of the retained emf;
- the 11 Ω potentiometric resistance box;
- V_AB measurements at selector positions 0–11;
- V_AB=f(R_AB) plotting and slope-derived divider current;
- uncertainty on the divider current using the handout's additive relative-uncertainty convention;
- unknown-resistance measurement at selector position 5;
- short-derivation and long-derivation circuits;
- systematic corrections CCD≈R_Ca²/R_V and CLD=−R_A;
- corrected resistance and propagated worst-case uncertainty;
- appropriate-topology criterion R_0=√(R_V R_A);
- post-lab assessment and English laboratory report;
- optional comparison with the simulator's exact finite-meter-resistance model.

Virtual analogue meter specifications and hidden component values are explicit simulation parameters rather than values claimed by the USTHB handout.

Live E01:
https://physics-usthb.github.io/electricity/e01/

## E03 — current status

E03 now has two explicitly separated layers.

### Part A — USTHB TP3 core protocol

The core sequence is aligned with the published USTHB Faculty of Physics TP3 handout, translated into English and implemented as an interactive virtual experiment:

- potentiometric resistance box with eleven 1 Ω sections between A and C;
- generator connected across A–C and the utilisation circuit across A–B;
- selector positions 0 through 11;
- short-derivation voltmeter/ammeter topology;
- resistor measurements at positions **1, 3, 5, 7, 9, 11**;
- official graph **V_Rx = f(I_m)**;
- lamp measurements at **all selector positions 0–11**;
- lamp graph **V_L = g(I_m)** on the same axes;
- graphical series construction using **V_S(I)=V_R(I)+V_L(I)**;
- experimental series checks at selector positions **5 and 9**;
- graphical parallel construction using **I_P(V)=I_R(V)+I_L(V)**;
- experimental parallel checks at selector positions **5 and 9**;
- laboratory safety/connection rules and a wiring-verification step before measurements;
- student written justification for the short-derivation connection and for series/parallel addition;
- English-language laboratory report.

Official source:
https://fphy.usthb.dz/wp-content/uploads/2023/02/tp3_caracteristiques.pdf

### Part B — advanced analysis extension

This is deliberately labelled as an extension beyond the official handout:

- voltmeter-loading correction: `I_D = I_m - V/R_V`;
- standard-uncertainty estimates from instrument specifications;
- propagated uncertainty in corrected current;
- iterative effective-variance weighted fit;
- fitted resistance and intercept uncertainties;
- reduced chi-square;
- residual plot;
- comparison between the official `V=f(I_m)` slope and the loading-corrected fit.

## Virtual apparatus model

The digital bench uses a 12 V virtual DC generator and a realistic Thevenin model of the selected potentiometer tap. The physical sequence matches the USTHB handout, while the exact numerical generator/meter/specimen parameters are simulation parameters rather than values claimed by the handout.

The lamp is a pedagogical electro-thermal model with a virtual manufacturer label of **6.0 V, 0.10 A, 0.60 W**. This supports the handout's requirement that students compare graph-derived operating resistance with manufacturer indications.

## Repository structure

```text
physics-usthb.github.io/
├── index.html
├── assets/
│   └── styles.css
├── electricity/
│   ├── index.html
│   ├── e01/
│   │   ├── index.html
│   │   ├── e01.css
│   │   └── lab.js
│   └── e03/
│       ├── index.html
│       ├── official.css
│       └── official.js
├── .nojekyll
└── README.md
```

## Validation completed

- JavaScript syntax validation passed.
- All JavaScript DOM ID references were checked against the E03 HTML.
- No duplicate E03 HTML IDs were found.
- Numerical range checks keep every prescribed measurement within the selected virtual instrument ranges; the largest prescribed current is the parallel verification near selector position 9 and remains below the 300 mA range.
- GitHub Pages deploys from the `main` branch.

Before using the project for formally assessed coursework, it should still undergo instructor review, a complete cross-browser interaction test suite, and an accessibility audit.

## Next development sequence

1. Instructor/pedagogical review of the revised USTHB-aligned E03.
2. Complete automated browser interaction tests and accessibility audit.
3. Instructor review of E01 and E03.
4. E02 — Rheographic Tank / Electric Potential Mapping, aligned with TP2.
5. E04 — Oscilloscope, aligned with TP4.
6. E05 — RC–RL Transients, aligned with TP5.
7. English-for-Physicists pathway integrated with laboratory vocabulary and reporting.
