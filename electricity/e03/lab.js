(() => {
  'use strict';

  const RV = 10_000_000;
  const RV_REL_TOL = 0.01;
  const RA = 0.60;
  const RS = 0.35;
  const T0 = 293.15;
  const STORAGE_KEY = 'PhysicsUSTHB_E03_v02';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const quantize = (x, step) => Math.round(x / step) * step;
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;

  let state = {
    version: 2,
    mode: 'learn',
    data: [],
    run: null,
    fit: null,
    synthesis: null,
    assessment: null,
    report: {}
  };

  function gaussian() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function saveState() {
    try {
      state.report = collectReportFields();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.version === 2) state = {...state, ...saved};
    } catch (_) {}
  }

  function makeRun() {
    return {
      id: `E03-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      resistorR: 96 + Math.random() * 10,
      lampR0: 11.5 + Math.random() * 4.0,
      lampAlpha: 0.0041 + Math.random() * 0.0005,
      lampH: 0.00026 + Math.random() * 0.00016,
      lampKrad: (0.65 + Math.random() * 0.55) * 1e-13,
      vScaleBias: (Math.random() - 0.5) * 0.004,
      iScaleBias: (Math.random() - 0.5) * 0.006,
      vZero: (Math.random() - 0.5) * 0.006,
      iZero: (Math.random() - 0.5) * 0.00006,
      sourceScaleBias: (Math.random() - 0.5) * 0.003
    };
  }

  function newRun(userInitiated = true) {
    if (userInitiated && state.data.length) {
      const ok = confirm('Start a new experimental run? Existing measurements, fit results, synthesis and assessment will be cleared.');
      if (!ok) return;
    }
    state.run = makeRun();
    state.data = [];
    state.fit = null;
    state.synthesis = null;
    state.assessment = null;
    $('#source').value = 0;
    resetAnalysisUI();
    renderData();
    drawChart();
    drawResidualChart();
    drawSynthesisChart();
    updateMeters();
    updateRunBadge();
    updateHint();
    $('#benchNotice').className = 'notice';
    $('#benchNotice').textContent = 'New hidden specimen and calibration state generated. True parameters remain undisclosed.';
    saveState();
  }

  function lampResistance(T) {
    const dT = Math.max(0, T - T0);
    return state.run.lampR0 * (1 + state.run.lampAlpha * dT);
  }

  function lampHeatLoss(T) {
    return state.run.lampH * (T - T0) + state.run.lampKrad * (Math.pow(T, 4) - Math.pow(T0, 4));
  }

  function lampCurrent(v) {
    if (v <= 0) return 0;
    let lo = T0, hi = 3200;
    const balance = T => (v * v / lampResistance(T)) - lampHeatLoss(T);
    if (balance(hi) > 0) hi = 4200;
    for (let n = 0; n < 90; n++) {
      const mid = (lo + hi) / 2;
      if (balance(mid) > 0) lo = mid; else hi = mid;
    }
    const T = (lo + hi) / 2;
    return v / lampResistance(T);
  }

  function dipoleCurrent(v, type) {
    return type === 'resistor' ? v / state.run.resistorR : lampCurrent(v);
  }

  function solveCircuit(vSet, type) {
    const vs = Math.max(0, vSet * (1 + state.run.sourceScaleBias));
    let lo = 0, hi = Math.max(0, vs);
    for (let n = 0; n < 90; n++) {
      const v = (lo + hi) / 2;
      const id = dipoleCurrent(v, type);
      const iv = v / RV;
      const im = id + iv;
      const f = v + im * (RA + RS) - vs;
      if (f > 0) hi = v; else lo = v;
    }
    const v = (lo + hi) / 2;
    const id = dipoleCurrent(v, type);
    const iv = v / RV;
    const im = id + iv;
    return {vs, v, id, iv, im};
  }

  function meterUncertainty(vm, im) {
    const vLimit = 0.005 * Math.abs(vm) + 2 * 0.01;
    const iLimit = 0.008 * Math.abs(im) + 2 * 0.0001;
    return {uV: vLimit / Math.sqrt(3), uIm: iLimit / Math.sqrt(3)};
  }

  function meterReadings() {
    const type = $('#dipole').value;
    const vSet = +$('#source').value;
    const x = solveCircuit(vSet, type);

    const vNoise = gaussian() * (0.0015 + 0.0006 * x.v);
    const iNoise = gaussian() * (0.000012 + 0.0008 * x.im);
    const vm = quantize(Math.max(0, x.v * (1 + state.run.vScaleBias) + state.run.vZero + vNoise), 0.01);
    const imMeasured = quantize(Math.max(0, x.im * (1 + state.run.iScaleBias) + state.run.iZero + iNoise), 0.0001);
    const {uV, uIm} = meterUncertainty(vm, imMeasured);
    const ivMeasured = vm / RV;
    const idMeasured = Math.max(0, imMeasured - ivMeasured);
    const uRV = RV_REL_TOL * RV / Math.sqrt(3);
    const uId = Math.sqrt(
      uIm * uIm +
      Math.pow(uV / RV, 2) +
      Math.pow(vm * uRV / (RV * RV), 2)
    );

    return {...x, vm, imMeasured, idMeasured, ivMeasured, uV, uIm, uId, type, vSet};
  }

  function updateMeters() {
    if (!state.run) return;
    const type = $('#dipole').value;
    const vSet = +$('#source').value;
    const x = solveCircuit(vSet, type);
    $('#sourceReadout').textContent = `${vSet.toFixed(1)} V`;
    $('#svgSource').textContent = `${vSet.toFixed(2)} V`;
    $('#dipoleLabel').textContent = type === 'resistor' ? 'Ohmic resistor' : 'Tungsten-filament lamp';
    $('#svgDipole').textContent = type === 'resistor' ? 'Rₓ' : 'Lamp';
    $('#voltmeter').textContent = `${x.v.toFixed(2)} V`;
    $('#ammeter').textContent = `${(1000 * x.im).toFixed(1)} mA`;
  }

  function updateRunBadge() {
    $('#runBadge').textContent = `Run ${state.run?.id || '—'}`;
  }

  function takeReading() {
    const r = meterReadings();
    state.data.push({
      id: uid(), type: r.type, vSet: r.vSet, v: r.vm, im: r.imMeasured,
      iv: r.ivMeasured, idip: r.idMeasured, uv: r.uV, uim: r.uIm, ui: r.uId,
      timestamp: new Date().toISOString()
    });
    state.fit = null;
    state.synthesis = null;
    state.assessment = null;
    renderData();
    drawChart();
    drawResidualChart();
    drawSynthesisChart();
    const rows = state.data.filter(d => d.type === r.type);
    const n = rows.length;
    const spread = rows.length > 1 ? Math.max(...rows.map(d => d.v)) - Math.min(...rows.map(d => d.v)) : 0;
    $('#benchNotice').className = n >= 6 && spread >= 6 ? 'notice ok' : 'notice';
    $('#benchNotice').textContent = `Reading stored (${n} ${r.type} point${n === 1 ? '' : 's'}). ${n < 6 ? 'Collect more points.' : spread < 6 ? 'Improve the voltage-range coverage.' : 'Dataset has useful size and span for analysis.'}`;
    updateHint();
    saveState();
  }

  function renderData() {
    const body = $('#dataBody');
    body.innerHTML = '';
    $('#dataEmpty').style.display = state.data.length ? 'none' : 'block';
    state.data.forEach((d, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${i + 1}</td><td>${d.type === 'resistor' ? 'Resistor' : 'Lamp'}</td><td>${d.vSet.toFixed(1)}</td><td>${d.v.toFixed(2)}</td><td>${(d.im * 1000).toFixed(1)}</td><td>${(d.iv * 1e6).toFixed(2)}</td><td>${(d.idip * 1000).toFixed(2)}</td><td>${d.uv.toFixed(3)}</td><td>${(d.ui * 1000).toFixed(3)}</td><td><button class="btn danger" style="padding:5px 8px" data-del="${d.id}" aria-label="Delete row ${i + 1}">×</button></td>`;
      body.appendChild(tr);
    });
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      state.data = state.data.filter(d => d.id !== b.dataset.del);
      state.fit = null;
      state.synthesis = null;
      state.assessment = null;
      renderData();
      drawChart();
      drawResidualChart();
      drawSynthesisChart();
      updateHint();
      saveState();
    }));
  }

  function ordinaryFit(rows) {
    const n = rows.length;
    const x = rows.map(d => d.idip), y = rows.map(d => d.v);
    const sx = x.reduce((a, b) => a + b, 0), sy = y.reduce((a, b) => a + b, 0);
    const sxx = x.reduce((a, b) => a + b * b, 0), sxy = x.reduce((a, b, i) => a + b * y[i], 0);
    const den = n * sxx - sx * sx;
    if (!den) return null;
    return {m: (n * sxy - sx * sy) / den, b: (sy * sxx - sx * sxy) / den};
  }

  function weightedLine(rows, slopeGuess) {
    let m = slopeGuess;
    let b = 0;
    let weights = [];
    for (let iter = 0; iter < 20; iter++) {
      weights = rows.map(d => 1 / Math.max(1e-16, d.uv * d.uv + Math.pow(m * d.ui, 2)));
      const S = weights.reduce((a, x) => a + x, 0);
      const Sx = weights.reduce((a, w, i) => a + w * rows[i].idip, 0);
      const Sy = weights.reduce((a, w, i) => a + w * rows[i].v, 0);
      const Sxx = weights.reduce((a, w, i) => a + w * rows[i].idip * rows[i].idip, 0);
      const Sxy = weights.reduce((a, w, i) => a + w * rows[i].idip * rows[i].v, 0);
      const D = S * Sxx - Sx * Sx;
      if (D <= 0) return null;
      const nextM = (S * Sxy - Sx * Sy) / D;
      const nextB = (Sxx * Sy - Sx * Sxy) / D;
      if (Math.abs(nextM - m) < 1e-10 * Math.max(1, Math.abs(m))) { m = nextM; b = nextB; break; }
      m = nextM; b = nextB;
    }

    weights = rows.map(d => 1 / Math.max(1e-16, d.uv * d.uv + Math.pow(m * d.ui, 2)));
    const S = weights.reduce((a, x) => a + x, 0);
    const Sx = weights.reduce((a, w, i) => a + w * rows[i].idip, 0);
    const Sxx = weights.reduce((a, w, i) => a + w * rows[i].idip * rows[i].idip, 0);
    const D = S * Sxx - Sx * Sx;
    const sm = Math.sqrt(S / D);
    const sb = Math.sqrt(Sxx / D);
    const residuals = rows.map((d, i) => {
      const r = d.v - (m * d.idip + b);
      const sigmaEff = Math.sqrt(1 / weights[i]);
      return {id: d.id, x: d.idip, residual: r, sigmaEff, standardized: r / sigmaEff};
    });
    const chi2 = residuals.reduce((a, r) => a + r.standardized * r.standardized, 0);
    const dof = Math.max(1, rows.length - 2);
    const redChi2 = chi2 / dof;
    const ybar = mean(rows.map(d => d.v));
    const ssTot = rows.reduce((a, d) => a + Math.pow(d.v - ybar, 2), 0);
    const ssRes = residuals.reduce((a, r) => a + r.residual * r.residual, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 1;
    return {m, b, sm, sb, chi2, redChi2, dof, r2, n: rows.length, residuals, method: 'effective-variance WLS'};
  }

  function effectiveVarianceFit(rows) {
    const initial = ordinaryFit(rows);
    if (!initial) return null;
    return weightedLine(rows, initial.m);
  }

  function staticResistance(row) {
    return row.idip > 0 ? row.v / row.idip : NaN;
  }

  function localDifferentialResistance(rows, index) {
    const sorted = [...rows].sort((a, b) => a.idip - b.idip);
    if (sorted.length < 3) return NaN;
    index = clamp(index, 1, sorted.length - 2);
    const a = sorted[index - 1], b = sorted[index + 1];
    return (b.v - a.v) / (b.idip - a.idip);
  }

  function runAnalysis() {
    const type = $('#analysisDipole').value;
    const rows = state.data.filter(d => d.type === type).sort((a, b) => a.idip - b.idip);
    $('#pointsMetric').textContent = rows.length;
    if (rows.length < 6) {
      $('#fitNotice').className = 'notice warn';
      $('#fitNotice').textContent = 'Collect at least six points before quantitative analysis.';
      return;
    }

    const span = Math.max(...rows.map(d => d.v)) - Math.min(...rows.map(d => d.v));
    if (span < 5) {
      $('#fitNotice').className = 'notice warn';
      $('#fitNotice').textContent = 'The dataset is too narrowly clustered in voltage. Improve the experimental span before fitting.';
      return;
    }

    if (type === 'resistor') {
      const fit = effectiveVarianceFit(rows);
      state.fit = fit;
      $('#slopeMetric').textContent = `${fit.m.toFixed(2)} Ω`;
      $('#interceptMetric').textContent = `${fit.b.toFixed(3)} V`;
      $('#chiMetric').textContent = fit.redChi2.toFixed(2);
      $('#fitNotice').className = 'notice ok';
      $('#fitNotice').textContent = 'Effective-variance weighted linear fit completed. Inspect both fit statistics and residuals.';
      const interceptSigma = fit.sb > 0 ? Math.abs(fit.b / fit.sb) : NaN;
      const chiInterpretation = fit.redChi2 < 0.35 ? 'The reduced χ² is well below unity; the uncertainty model may be conservative or the data unusually quiet.' : fit.redChi2 > 2.5 ? 'The reduced χ² is appreciably above unity; consider underestimated uncertainty, an outlier, or model inadequacy.' : 'The reduced χ² is of order unity, broadly consistent with the stated uncertainty model.';
      $('#analysisText').innerHTML = `<p><strong>Fit:</strong> V = (${fit.m.toFixed(2)} ± ${fit.sm.toFixed(2)}) I + (${fit.b.toFixed(3)} ± ${fit.sb.toFixed(3)}) V, where uncertainties are 1σ estimates from the weighting model.</p><p><strong>R² = ${fit.r2.toFixed(5)}</strong>; reduced χ² = ${fit.redChi2.toFixed(2)} for ${fit.dof} degrees of freedom. ${chiInterpretation}</p><p>The fitted intercept is ${Number.isFinite(interceptSigma) ? interceptSigma.toFixed(2) : '—'} standard uncertainties from zero. Do not use R² alone to decide whether the resistor is ohmic.</p>`;
    } else {
      const positive = rows.filter(d => d.idip > 0.001);
      const low = positive[Math.min(1, positive.length - 1)] || rows[0];
      const high = positive[positive.length - 1] || rows[rows.length - 1];
      const midIndex = Math.floor(rows.length / 2);
      const rsLow = staticResistance(low), rsHigh = staticResistance(high), rdMid = localDifferentialResistance(rows, midIndex);
      $('#slopeMetric').textContent = 'nonlinear';
      $('#interceptMetric').textContent = '—';
      $('#chiMetric').textContent = '—';
      $('#fitNotice').className = 'notice ok';
      $('#fitNotice').textContent = 'Nonlinear device: analyse resistance as an operating-point quantity rather than forcing one straight-line resistance.';
      $('#analysisText').innerHTML = `<p><strong>Static resistance:</strong> approximately ${Number.isFinite(rsLow) ? rsLow.toFixed(1) : '—'} Ω at a low-current point and ${Number.isFinite(rsHigh) ? rsHigh.toFixed(1) : '—'} Ω at the highest measured operating point.</p><p><strong>Local differential resistance:</strong> approximately ${Number.isFinite(rdMid) ? rdMid.toFixed(1) : '—'} Ω near the middle of the measured range, estimated from neighbouring points.</p><p>The increase in V/I with operating point is consistent with electro-thermal heating of the filament.</p>`;
    }
    drawChart();
    drawResidualChart();
    updateHint();
    saveState();
  }

  function canvasSetup(canvas, fallbackW = 800, fallbackH = 380) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || fallbackW;
    const h = canvas.clientHeight || fallbackH;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return {ctx, w, h};
  }

  function drawAxes(ctx, w, h, maxI, maxV, pad) {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d8e3f1'; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const yy = pad.t + (h - pad.t - pad.b) * i / 5;
      ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(w - pad.r, yy); ctx.stroke();
      const xx = pad.l + (w - pad.l - pad.r) * i / 5;
      ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, h - pad.b); ctx.stroke();
    }
    const X = i => pad.l + i / maxI * (w - pad.l - pad.r);
    const Y = v => h - pad.b - v / maxV * (h - pad.t - pad.b);
    ctx.strokeStyle = '#173b63'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
    ctx.fillStyle = '#52657f'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) { const val = maxI * i / 5; ctx.fillText((val * 1000).toFixed(0), X(val), h - 24); }
    ctx.save(); ctx.translate(17, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Voltage V (V)', 0, 0); ctx.restore();
    ctx.fillText('Corrected current I_D (mA)', (pad.l + w - pad.r) / 2, h - 6);
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) { const val = maxV * i / 5; ctx.fillText(val.toFixed(1), pad.l - 8, Y(val) + 4); }
    return {X, Y};
  }

  function drawErrorBar(ctx, x, y, uxPx, uyPx, color) {
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - uxPx, y); ctx.lineTo(x + uxPx, y); ctx.moveTo(x - uxPx, y - 3); ctx.lineTo(x - uxPx, y + 3); ctx.moveTo(x + uxPx, y - 3); ctx.lineTo(x + uxPx, y + 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - uyPx); ctx.lineTo(x, y + uyPx); ctx.moveTo(x - 3, y - uyPx); ctx.lineTo(x + 3, y - uyPx); ctx.moveTo(x - 3, y + uyPx); ctx.lineTo(x + 3, y + uyPx); ctx.stroke();
  }

  function drawChart() {
    const c = $('#chart'); if (!c) return;
    const {ctx, w, h} = canvasSetup(c, 800, 380);
    const pad = {l: 66, r: 24, t: 28, b: 54};
    const rows = state.data;
    const maxI = Math.max(0.12, ...rows.map(d => d.idip + d.ui)) * 1.08;
    const maxV = Math.max(10, ...rows.map(d => d.v + d.uv)) * 1.05;
    const {X, Y} = drawAxes(ctx, w, h, maxI, maxV, pad);
    const colors = {resistor: '#1f6fb8', lamp: '#b26b16'};
    for (const type of ['resistor', 'lamp']) {
      const pts = rows.filter(d => d.type === type);
      pts.forEach(d => {
        const x = X(d.idip), y = Y(d.v);
        const ux = Math.abs(X(d.idip + d.ui) - X(d.idip));
        const uy = Math.abs(Y(d.v + d.uv) - Y(d.v));
        drawErrorBar(ctx, x, y, ux, uy, colors[type]);
        ctx.fillStyle = colors[type]; ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
      });
    }
    if (state.fit && rows.filter(d => d.type === 'resistor').length >= 6) {
      const f = state.fit;
      ctx.strokeStyle = '#1f6fb8'; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
      ctx.beginPath(); ctx.moveTo(X(0), Y(f.b)); ctx.lineTo(X(maxI), Y(f.m * maxI + f.b)); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.textAlign = 'left'; ctx.font = '12px system-ui';
    ctx.fillStyle = '#1f6fb8'; ctx.fillRect(Math.max(10, w - 205), 22, 12, 12); ctx.fillStyle = '#334d6b'; ctx.fillText('Resistor', Math.max(29, w - 186), 33);
    ctx.fillStyle = '#b26b16'; ctx.fillRect(Math.max(95, w - 112), 22, 12, 12); ctx.fillStyle = '#334d6b'; ctx.fillText('Lamp', Math.max(114, w - 93), 33);
  }

  function drawResidualChart() {
    const c = $('#residualChart'); if (!c) return;
    const {ctx, w, h} = canvasSetup(c, 800, 260);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    const pad = {l: 66, r: 24, t: 24, b: 48};
    const residuals = state.fit?.residuals || [];
    const maxI = Math.max(0.1, ...residuals.map(r => r.x)) * 1.08;
    const maxAbs = Math.max(0.05, ...residuals.map(r => Math.abs(r.residual) + r.sigmaEff)) * 1.25;
    const X = x => pad.l + x / maxI * (w - pad.l - pad.r);
    const Y = r => pad.t + (maxAbs - r) / (2 * maxAbs) * (h - pad.t - pad.b);
    ctx.strokeStyle = '#d8e3f1'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const x = pad.l + (w - pad.l - pad.r) * i / 4; ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke(); }
    ctx.strokeStyle = '#173b63'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(w - pad.r, Y(0)); ctx.stroke();
    ctx.fillStyle = '#52657f'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    for (let i = 0; i <= 4; i++) { const val = maxI * i / 4; ctx.fillText((val * 1000).toFixed(0), X(val), h - 20); }
    ctx.fillText('Corrected current I_D (mA)', (pad.l + w - pad.r) / 2, h - 5);
    ctx.save(); ctx.translate(16, h / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Residual (V)', 0, 0); ctx.restore();
    ctx.textAlign = 'right';
    [-maxAbs, 0, maxAbs].forEach(v => ctx.fillText(v.toFixed(2), pad.l - 8, Y(v) + 4));
    residuals.forEach(r => {
      const x = X(r.x), y = Y(r.residual), uy = Math.abs(Y(r.residual + r.sigmaEff) - Y(r.residual));
      ctx.strokeStyle = '#1f6fb8'; ctx.beginPath(); ctx.moveTo(x, y - uy); ctx.lineTo(x, y + uy); ctx.stroke();
      ctx.fillStyle = '#1f6fb8'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    });
    if (!residuals.length) { ctx.fillStyle = '#52657f'; ctx.textAlign = 'center'; ctx.fillText('Run the resistor analysis to display residuals.', w / 2, h / 2); }
  }

  function prepareSeries(xs, ys) {
    const pairs = xs.map((x, i) => ({x, y: ys[i]})).sort((a, b) => a.x - b.x);
    const out = [];
    for (const p of pairs) {
      const last = out[out.length - 1];
      if (last && Math.abs(last.x - p.x) < 1e-12) last.y = (last.y + p.y) / 2;
      else out.push({...p});
    }
    return out;
  }

  function interpolate(series, x) {
    if (!series.length || x < series[0].x || x > series[series.length - 1].x) return NaN;
    for (let i = 0; i < series.length - 1; i++) {
      const a = series[i], b = series[i + 1];
      if (x >= a.x && x <= b.x) {
        const t = (x - a.x) / Math.max(1e-15, b.x - a.x);
        return a.y + t * (b.y - a.y);
      }
    }
    return series[series.length - 1].y;
  }

  function buildSynthesis() {
    const r = state.data.filter(d => d.type === 'resistor');
    const l = state.data.filter(d => d.type === 'lamp');
    if (r.length < 6 || l.length < 6) {
      $('#synthesisNotice').className = 'notice warn';
      $('#synthesisNotice').textContent = 'Acquire at least six points for both the resistor and lamp before constructing a combined characteristic.';
      return;
    }
    const type = $('#networkType').value;
    const points = [];
    const n = 31;
    if (type === 'series') {
      const rs = prepareSeries(r.map(d => d.idip), r.map(d => d.v));
      const ls = prepareSeries(l.map(d => d.idip), l.map(d => d.v));
      const lo = Math.max(rs[0].x, ls[0].x), hi = Math.min(rs.at(-1).x, ls.at(-1).x);
      if (!(hi > lo)) return synthesisFailure('The measured current ranges do not overlap sufficiently.');
      for (let i = 0; i < n; i++) { const I = lo + (hi - lo) * i / (n - 1); points.push({i: I, v: interpolate(rs, I) + interpolate(ls, I)}); }
      $('#synthesisEquations').innerHTML = '<p><strong>Series rule:</strong> the current is common to both dipoles, so V<sub>series</sub>(I)=V<sub>R</sub>(I)+V<sub>L</sub>(I).</p><p>The curve below is constructed by piecewise-linear interpolation of your measured component characteristics.</p>';
      $('#synthesisCaption').textContent = 'Series characteristic synthesized only over the experimentally overlapping current range.';
    } else {
      const rs = prepareSeries(r.map(d => d.v), r.map(d => d.idip));
      const ls = prepareSeries(l.map(d => d.v), l.map(d => d.idip));
      const lo = Math.max(rs[0].x, ls[0].x), hi = Math.min(rs.at(-1).x, ls.at(-1).x);
      if (!(hi > lo)) return synthesisFailure('The measured voltage ranges do not overlap sufficiently.');
      for (let i = 0; i < n; i++) { const V = lo + (hi - lo) * i / (n - 1); points.push({i: interpolate(rs, V) + interpolate(ls, V), v: V}); }
      $('#synthesisEquations').innerHTML = '<p><strong>Parallel rule:</strong> the voltage is common to both dipoles, so I<sub>parallel</sub>(V)=I<sub>R</sub>(V)+I<sub>L</sub>(V).</p><p>The curve below is constructed by piecewise-linear interpolation of your measured component characteristics.</p>';
      $('#synthesisCaption').textContent = 'Parallel characteristic synthesized only over the experimentally overlapping voltage range.';
    }
    state.synthesis = {type, points};
    $('#synthesisNotice').className = 'notice ok';
    $('#synthesisNotice').textContent = `${type === 'series' ? 'Series' : 'Parallel'} characteristic constructed from ${r.length + l.length} measured component points without extrapolation.`;
    drawSynthesisChart();
    saveState();
  }

  function synthesisFailure(message) {
    $('#synthesisNotice').className = 'notice warn';
    $('#synthesisNotice').textContent = message;
    state.synthesis = null;
    drawSynthesisChart();
  }

  function drawSynthesisChart() {
    const c = $('#synthesisChart'); if (!c) return;
    const {ctx, w, h} = canvasSetup(c, 800, 380);
    const pts = state.synthesis?.points || [];
    const maxI = Math.max(0.12, ...pts.map(p => p.i)) * 1.08;
    const maxV = Math.max(10, ...pts.map(p => p.v)) * 1.05;
    const pad = {l: 66, r: 24, t: 28, b: 54};
    const {X, Y} = drawAxes(ctx, w, h, maxI, maxV, pad);
    if (!pts.length) { ctx.fillStyle = '#52657f'; ctx.textAlign = 'center'; ctx.fillText('Construct a series or parallel characteristic to display it here.', w / 2, h / 2); return; }
    ctx.strokeStyle = '#7a3db8'; ctx.lineWidth = 2.5; ctx.beginPath();
    pts.forEach((p, i) => { if (i === 0) ctx.moveTo(X(p.i), Y(p.v)); else ctx.lineTo(X(p.i), Y(p.v)); }); ctx.stroke();
    ctx.fillStyle = '#7a3db8'; pts.filter((_, i) => i % 3 === 0 || i === pts.length - 1).forEach(p => { ctx.beginPath(); ctx.arc(X(p.i), Y(p.v), 3.6, 0, Math.PI * 2); ctx.fill(); });
  }

  function downloadCsv() {
    if (!state.data.length) return;
    let csv = 'index,dipole,source_setting_V,voltage_V,ammeter_A,voltmeter_current_A,corrected_dipole_current_A,u_voltage_V,u_corrected_current_A,timestamp\n';
    state.data.forEach((d, i) => csv += `${i + 1},${d.type},${d.vSet},${d.v},${d.im},${d.iv},${d.idip},${d.uv},${d.ui},${d.timestamp || ''}\n`);
    const a = document.createElement('a');
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv'}));
    a.href = url; a.download = `Physics-USTHB_E03_${state.run.id}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function applyMode(mode) {
    state.mode = mode === 'lab' ? 'lab' : 'learn';
    document.body.classList.toggle('mode-lab', state.mode === 'lab');
    $$('.modebtn').forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
    $('#modeDescription').textContent = state.mode === 'learn' ? 'Guidance and diagnostic hints are available.' : 'Minimal guidance; interpret the evidence independently.';
    $('#reportMode').value = state.mode === 'learn' ? 'Learn mode' : 'Lab mode';
    saveState();
  }

  function updateHint() {
    if (state.mode !== 'learn') return;
    const type = $('#dipole').value;
    const rows = state.data.filter(d => d.type === type);
    let text = '';
    if (!rows.length) text = `Begin with the ${type === 'resistor' ? 'resistor' : 'lamp'} near 0 V and spread measurements across the range.`;
    else if (rows.length < 6) text = `You have ${rows.length} point${rows.length === 1 ? '' : 's'}. Increase the number of independent operating points rather than repeatedly measuring one setting.`;
    else {
      const span = Math.max(...rows.map(d => d.v)) - Math.min(...rows.map(d => d.v));
      if (span < 6) text = 'Your dataset is clustered. Good regression requires leverage: include points across a wider voltage span.';
      else if (type === 'resistor' && !state.fit) text = 'Your resistor dataset is ready. Run the uncertainty-aware analysis and inspect the residuals.';
      else if (state.data.filter(d => d.type === 'lamp').length < 6) text = 'The resistor dataset is established. Repeat the acquisition for the filament lamp.';
      else if (!state.synthesis) text = 'Both component characteristics are available. Try constructing series and parallel combinations from measured data.';
      else text = 'You now have enough evidence for the assessment and lab report. Base conclusions on the data and fit diagnostics.';
    }
    $('#hintText').textContent = text;
  }

  function resetAnalysisUI() {
    $('#slopeMetric').textContent = '—';
    $('#interceptMetric').textContent = '—';
    $('#chiMetric').textContent = '—';
    $('#pointsMetric').textContent = '0';
    $('#analysisText').innerHTML = '';
    $('#fitNotice').className = 'notice';
    $('#fitNotice').textContent = 'For the resistor, collect at least six points spanning most of the available range.';
    $('#synthesisNotice').className = 'notice';
    $('#synthesisNotice').textContent = 'Acquire at least six resistor points and six lamp points first.';
    $('#synthesisEquations').innerHTML = '';
    $('#synthesisCaption').textContent = 'No synthesized characteristic yet.';
  }

  function setupTabs() {
    $$('.tabbtn').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.tab;
      $$('.tabbtn').forEach(x => x.classList.toggle('active', x === b));
      $$('.tabpanel').forEach(p => p.classList.toggle('active', p.id === id));
      if (id === 'analysis') { drawChart(); drawResidualChart(); }
      if (id === 'synthesis') drawSynthesisChart();
    }));
  }

  function setupQuiz() {
    $('#quiz').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const correct = {q1: 'b', q2: 'a', q3: 'a', q4: 'b', q5: 'b'};
      const unanswered = Object.keys(correct).filter(q => !fd.get(q));
      if (unanswered.length) {
        $('#quizResult').className = 'notice warn';
        $('#quizResult').textContent = 'Answer questions 1–5 before submitting.';
        return;
      }
      if (!state.fit) {
        $('#quizResult').className = 'notice warn';
        $('#quizResult').textContent = 'Run the resistor analysis before answering the quantitative fit question.';
        return;
      }
      const q6raw = fd.get('q6');
      if (q6raw === null || q6raw === '') {
        $('#quizResult').className = 'notice warn';
        $('#quizResult').textContent = 'Enter your fitted resistance for question 6.';
        return;
      }
      let score = 0;
      const breakdown = [];
      Object.entries(correct).forEach(([q, a], idx) => {
        const ok = fd.get(q) === a;
        if (ok) score++;
        breakdown.push({q: idx + 1, ok});
      });
      const q6 = Number(q6raw);
      const tol = Math.max(0.5, 2 * state.fit.sm);
      const q6ok = Number.isFinite(q6) && Math.abs(q6 - state.fit.m) <= tol;
      if (q6ok) score++;
      breakdown.push({q: 6, ok: q6ok});
      state.assessment = {score, total: 6, breakdown, submittedAt: new Date().toISOString()};
      const box = $('#quizResult');
      box.className = score >= 5 ? 'notice ok' : score >= 3 ? 'notice warn' : 'notice bad';
      const detail = state.mode === 'learn' ? `<ul class="assessment-breakdown">${breakdown.map(x => `<li>Question ${x.q}: ${x.ok ? 'correct' : 'review needed'}</li>`).join('')}</ul>` : '';
      box.innerHTML = `<strong>${score}/6 correct.</strong> ${score === 6 ? 'Excellent. Your conceptual and quantitative interpretation is internally consistent.' : score >= 5 ? 'Strong result. Review the remaining item before writing the report.' : 'Revisit the measurements, uncertainty treatment and characteristic rules before finalising the report.'}${detail}`;
      saveState();
    });
  }

  function collectReportFields() {
    const ids = ['studentName', 'studentGroup', 'reportDate', 'reportObjective', 'reportMethod', 'reportDiscussion', 'reportUncertainty', 'reportConclusion'];
    const out = {};
    ids.forEach(id => { const el = document.getElementById(id); if (el) out[id] = el.value; });
    return out;
  }

  function restoreReportFields() {
    const r = state.report || {};
    Object.entries(r).forEach(([id, value]) => { const el = document.getElementById(id); if (el && value != null) el.value = value; });
    if (!$('#reportDate').value) $('#reportDate').value = new Date().toISOString().slice(0, 10);
    $('#reportMode').value = state.mode === 'learn' ? 'Learn mode' : 'Lab mode';
  }

  function escapeHtml(s = '') {
    return String(s).replace(/[&<>'"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[c]));
  }

  function prose(s) {
    return escapeHtml(s).replace(/\n/g, '<br>') || '<em>Not completed.</em>';
  }

  function reportTableHtml() {
    if (!state.data.length) return '<p><em>No measurements recorded.</em></p>';
    const rows = state.data.map((d, i) => `<tr><td>${i + 1}</td><td>${d.type === 'resistor' ? 'Resistor' : 'Lamp'}</td><td>${d.vSet.toFixed(1)}</td><td>${d.v.toFixed(2)}</td><td>${(d.im * 1000).toFixed(1)}</td><td>${(d.idip * 1000).toFixed(2)}</td><td>${d.uv.toFixed(3)}</td><td>${(d.ui * 1000).toFixed(3)}</td></tr>`).join('');
    return `<table class="report-data-table"><thead><tr><th>#</th><th>Dipole</th><th>Source / V</th><th>V / V</th><th>I<sub>m</sub> / mA</th><th>I<sub>D</sub> / mA</th><th>u(V) / V</th><th>u(I<sub>D</sub>) / mA</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function buildReport() {
    drawChart();
    drawResidualChart();
    if (state.synthesis) drawSynthesisChart();
    state.report = collectReportFields();
    const r = state.report;
    const fit = state.fit;
    const assessment = state.assessment;
    const chartImg = $('#chart').toDataURL('image/png');
    const residualImg = fit ? $('#residualChart').toDataURL('image/png') : null;
    const synthesisImg = state.synthesis ? $('#synthesisChart').toDataURL('image/png') : null;
    const fitHtml = fit ? `<div class="report-summary"><div><strong>Resistance</strong>${fit.m.toFixed(2)} ± ${fit.sm.toFixed(2)} Ω</div><div><strong>Intercept</strong>${fit.b.toFixed(3)} ± ${fit.sb.toFixed(3)} V</div><div><strong>Reduced χ²</strong>${fit.redChi2.toFixed(2)} (ν=${fit.dof})</div></div><p>Effective-variance weighted fit: V = (${fit.m.toFixed(2)} ± ${fit.sm.toFixed(2)})I + (${fit.b.toFixed(3)} ± ${fit.sb.toFixed(3)}) V; R² = ${fit.r2.toFixed(5)}.</p>` : '<p><em>No resistor fit has been completed.</em></p>';
    const assessmentHtml = assessment ? `<p>Assessment: <strong>${assessment.score}/${assessment.total}</strong>.</p>` : '<p><em>Assessment not yet submitted.</em></p>';
    const html = `<h2>Laboratory Report — E03</h2>
      <p><strong>Current–Voltage Characteristics of Electrical Dipoles</strong></p>
      <div class="report-meta"><div><strong>Student:</strong> ${escapeHtml(r.studentName || '—')}</div><div><strong>Group:</strong> ${escapeHtml(r.studentGroup || '—')}</div><div><strong>Date:</strong> ${escapeHtml(r.reportDate || '—')}</div><div><strong>Run:</strong> ${escapeHtml(state.run.id)} • ${state.mode === 'learn' ? 'Learn mode' : 'Lab mode'}</div></div>
      <h3>1. Objective</h3><p>${prose(r.reportObjective)}</p>
      <h3>2. Method</h3><p>${prose(r.reportMethod)}</p>
      <h3>3. Measurements</h3>${reportTableHtml()}
      <div class="report-figure"><h3>4. Experimental I–V characteristics</h3><img src="${chartImg}" alt="Experimental current-voltage graph with uncertainty bars"></div>
      <h3>5. Quantitative analysis</h3>${fitHtml}
      ${residualImg ? `<div class="report-figure"><h3>6. Residual analysis</h3><img src="${residualImg}" alt="Residual plot for resistor fit"></div>` : '<h3>6. Residual analysis</h3><p><em>No residual plot available.</em></p>'}
      ${synthesisImg ? `<div class="report-figure"><h3>7. ${state.synthesis.type === 'series' ? 'Series' : 'Parallel'} characteristic synthesized from measured data</h3><img src="${synthesisImg}" alt="Synthesized combined current-voltage characteristic"></div>` : '<h3>7. Series / parallel synthesis</h3><p><em>No combined characteristic constructed.</em></p>'}
      <h3>8. Discussion</h3><p>${prose(r.reportDiscussion)}</p>
      <h3>9. Sources of uncertainty and limitations</h3><p>${prose(r.reportUncertainty)}</p>
      <h3>10. Conclusion</h3><p>${prose(r.reportConclusion)}</p>
      <h3>Assessment record</h3>${assessmentHtml}
      <hr><p class="mini">Generated by the Physics USTHB E03 virtual laboratory. Automated insertion of data and fit results does not replace the student’s responsibility for scientific reasoning, interpretation and authorship.</p>`;
    $('#reportPreview').innerHTML = html;
    $('#printOnlyPreview').innerHTML = html;
    saveState();
  }

  function restoreAnalysisUI() {
    if (!state.fit) return;
    const f = state.fit;
    $('#slopeMetric').textContent = `${f.m.toFixed(2)} Ω`;
    $('#interceptMetric').textContent = `${f.b.toFixed(3)} V`;
    $('#chiMetric').textContent = f.redChi2.toFixed(2);
    $('#pointsMetric').textContent = f.n;
    $('#fitNotice').className = 'notice ok';
    $('#fitNotice').textContent = 'Saved resistor fit restored. Re-run analysis after changing the dataset.';
    $('#analysisText').innerHTML = `<p><strong>Saved fit:</strong> V = (${f.m.toFixed(2)} ± ${f.sm.toFixed(2)})I + (${f.b.toFixed(3)} ± ${f.sb.toFixed(3)}) V; reduced χ² = ${f.redChi2.toFixed(2)}, R² = ${f.r2.toFixed(5)}.</p>`;
  }

  function restoreSynthesisUI() {
    if (!state.synthesis) return;
    $('#networkType').value = state.synthesis.type;
    $('#synthesisNotice').className = 'notice ok';
    $('#synthesisNotice').textContent = `Saved ${state.synthesis.type} characteristic restored from this run.`;
    if (state.synthesis.type === 'series') {
      $('#synthesisEquations').innerHTML = '<p><strong>Series rule:</strong> V<sub>series</sub>(I)=V<sub>R</sub>(I)+V<sub>L</sub>(I) at common current.</p>';
      $('#synthesisCaption').textContent = 'Saved series characteristic synthesized over the experimentally overlapping current range.';
    } else {
      $('#synthesisEquations').innerHTML = '<p><strong>Parallel rule:</strong> I<sub>parallel</sub>(V)=I<sub>R</sub>(V)+I<sub>L</sub>(V) at common voltage.</p>';
      $('#synthesisCaption').textContent = 'Saved parallel characteristic synthesized over the experimentally overlapping voltage range.';
    }
  }

  function restoreAssessmentUI() {
    if (!state.assessment) return;
    const box = $('#quizResult');
    box.className = state.assessment.score >= 5 ? 'notice ok' : state.assessment.score >= 3 ? 'notice warn' : 'notice bad';
    box.innerHTML = `<strong>Saved assessment: ${state.assessment.score}/${state.assessment.total}.</strong> You may submit again after further analysis.`;
  }

  function init() {
    loadState();
    setupTabs();
    setupQuiz();
    restoreReportFields();
    if (!state.run) state.run = makeRun();
    applyMode(state.mode);
    updateRunBadge();
    renderData();
    restoreAnalysisUI();
    restoreSynthesisUI();
    restoreAssessmentUI();
    updateMeters();
    drawChart();
    drawResidualChart();
    drawSynthesisChart();
    updateHint();

    $('#source').addEventListener('input', updateMeters);
    $('#dipole').addEventListener('change', () => { updateMeters(); updateHint(); });
    $('#takeReading').addEventListener('click', takeReading);
    $('#zeroSource').addEventListener('click', () => { $('#source').value = 0; updateMeters(); });
    $('#newRun').addEventListener('click', () => newRun(true));
    $('#clearData').addEventListener('click', () => {
      if (state.data.length && !confirm('Clear all measurements from this run?')) return;
      state.data = []; state.fit = null; state.synthesis = null; state.assessment = null;
      resetAnalysisUI(); renderData(); drawChart(); drawResidualChart(); drawSynthesisChart(); updateHint(); saveState();
    });
    $('#downloadCsv').addEventListener('click', downloadCsv);
    $('#runFit').addEventListener('click', runAnalysis);
    $('#buildSynthesis').addEventListener('click', buildSynthesis);
    $('#networkType').addEventListener('change', () => { state.synthesis = null; drawSynthesisChart(); $('#synthesisCaption').textContent = 'Construct the selected connection from your measured data.'; saveState(); });
    $('#buildReport').addEventListener('click', buildReport);
    $('#printReport').addEventListener('click', () => { buildReport(); window.print(); });
    $$('.modebtn').forEach(b => b.addEventListener('click', () => applyMode(b.dataset.mode)));
    ['studentName','studentGroup','reportDate','reportObjective','reportMethod','reportDiscussion','reportUncertainty','reportConclusion'].forEach(id => document.getElementById(id)?.addEventListener('input', saveState));
    window.addEventListener('resize', () => { drawChart(); drawResidualChart(); drawSynthesisChart(); });
    window.addEventListener('beforeunload', saveState);
  }

  init();
})();
