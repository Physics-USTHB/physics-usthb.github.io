# Physics USTHB — Interactive Learning Platform

A GitHub Pages project for rigorous undergraduate physics learning in English.

> **Status:** independent educational project. It is not an official USTHB website unless formally adopted or authorised by the university.

## Live site

- Home: https://physics-usthb.github.io/
- Electricity laboratory: https://physics-usthb.github.io/electricity/
- E03 — Current–Voltage Characteristics: https://physics-usthb.github.io/electricity/e03/

## Fidelity policy

The development priority is now:

1. **Reproduce the USTHB practicum first.** The core mode should preserve the apparatus logic, connection decisions, prescribed measurement sequence, calculations and conclusions of the corresponding USTHB handout as closely as a browser can.
2. **Do not hide laboratory decisions.** Where the physical TP asks students to choose meter ranges, wire instruments, select oscilloscope controls, search for equipotentials or adjust a display, the virtual TP should require the same decision rather than pre-configuring it.
3. **Keep enhancements separate.** Additional uncertainty analysis, regression, numerical field solutions, exponential fitting, diagnostic hints and learning scaffolds are labelled as digital extensions and must not silently replace the official procedure.
4. **Do not claim physical identity.** A browser cannot reproduce cable handling, damaged leads, intermittent contacts, probe pressure, water handling, real parallax, component identification by touch, equipment wear, safety consequences or instructor sign-off. These remain physical-laboratory skills.

### Current fidelity improvements

- **E01:** explicit voltmeter polarity, maximum-range-before-connection rule, A–C/A–B potentiometric wiring, dangerous A–B source connection rejection, and explicit short-/long-derivation meter topology.
- **E02:** equipotentials are no longer mapped on prescribed digital y-lines; students first find the x-axis point and then choose their own constant-y search lines before using symmetry. The y=±5 cm construction is retained only for the M/N field-line task where the handout prescribes it.
- **E03:** explicit generator A–C, utilisation A–B, short-derivation ammeter and voltmeter connections are required before readings; the forbidden generator A–B connection is rejected.
- **E04:** the virtual oscilloscope now exposes consequential front-panel controls for intensity, focus, spot position, XY selection, sweep calibration, trigger source/level, coupling, display mode and CH2 inversion. Figure-5/6 A/B/C probe and common-ground choices are required for the phase/impedance experiments.
- **E05:** the student must build and verify the RC or RL series circuit, choose the step/square excitation, select the correct measured voltage (V_C for RC, V_R for RL) and use the common return before a transient measurement is accepted.

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

## E02 — Rheographic Tank / Electric Potential Mapping

E02 is implemented as a virtual version of the USTHB rheographic-tank practical. The current USTHB course listing identifies it as **TP2 — Cuve rhéographique**.

The virtual laboratory preserves the published task sequence:

- two finite plane electrodes driven by an approximately 11 V AC source;
- electrode-potential measurements and symmetry check V(x,y)=V(x,−y);
- 2 V, 4 V, 6 V and 8 V equipotential mapping;
- upper-half mapping followed by symmetry construction;
- four mean-field estimates on x′Ox from neighbouring equipotentials;
- V₁(x) measurements every 2 cm;
- central and edge field-line tracing;
- insertion of a 6 cm conducting cylinder at the tank centre;
- verification that the conductor is equipotential and that its internal field is approximately zero;
- remapping of the same four equipotentials;
- field-line construction through the prescribed y=+5 cm and y=−5 cm regions;
- V₂(x) measurements every 2 cm and comparison with V₁(x);
- post-lab assessment and English laboratory report.

The browser solves the two-dimensional Laplace equation on a finite-difference grid for each configuration. The tank dimensions and small probe-calibration effects are transparent simulation parameters rather than values claimed by the handout.

Live E02:
https://physics-usthb.github.io/electricity/e02/

## E04 — The Oscilloscope

E04 is implemented from the USTHB L1 ST/SM oscilloscope handout by K. Belhous and A. El-Mehdaoui, corresponding to the current **TP4 — L’oscilloscope** listing.

Core tasks include:

- oscilloscope front-panel control identification;
- calibrated-control requirements (sweep CAL, vertical CAL, X1);
- XY-mode spot motion for sine, triangle and square signals;
- X-only, Y-only and same-signal X+Y observations;
- 0.5 s/div sweep calibration over 10 screen divisions;
- generator signals from 1 to 100 Hz;
- trigger-level and AUTO/CH1 synchronisation;
- period and frequency measurement from divisions × TIME/DIV;
- phase relation φ=2πΔt/T;
- unknown-resistance measurement by decade-box amplitude balance;
- sweep-mode and XY/Lissajous phase verification;
- capacitor-impedance measurement by amplitude balance;
- comparison with Z_C=1/(Cω) and capacitance deduction;
- post-lab assessment and English report.

Live E04:
https://physics-usthb.github.io/electricity/e04/

## E05 — RC & RL Transients

E05 is implemented from the Belhous–El-Mehdaoui RC/RL transient handout corresponding to the current **TP5 — RC–RL** listing.

Core tasks include:

- RC charging/discharging and RL current-establishment/decay theory;
- generator internal resistance r_g = 50 Ω in the circuit model;
- requirement that the transient be essentially complete before the next half-period;
- 6-division / 4-square τ measurement;
- 8-division / 5-square τ measurement;
- display-quality checks for frequency, TIME/DIV and VOLTS/DIV;
- 4.1 known R + known C validation against τ=R_T C;
- 4.2 unknown R_x with known C;
- 4.3 unknown C_x with known R;
- 4.4 unknown L_x with known R and coil resistance;
- optional whole-transient exponential fitting as a clearly labelled extension;
- post-lab assessment and English laboratory report.

Live E05:
https://physics-usthb.github.io/electricity/e05/

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
│   ├── e02/
│   │   ├── index.html
│   │   ├── e02.css
│   │   └── lab.js
│   ├── e04/
│   │   ├── index.html
│   │   ├── e04.css
│   │   └── lab.js
│   ├── e05/
│   │   ├── index.html
│   │   ├── e05.css
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
4. Instructor review of E02 field geometry and measurement workflow.
5. Instructor review of E04 oscilloscope controls and measurement workflow.
6. Instructor review of E05 transient settings and time-constant workflow.
7. English-for-Physicists pathway integrated with laboratory vocabulary and reporting.
