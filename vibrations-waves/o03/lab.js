(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_O03_v3',OLD='VOM_O03_v2';
const C=68e-9,L=8.4e-3,C0S=[33,47,68,100,150,220];

const current=U.load(K,null),old=U.load(OLD,null),loaded=current||{};
let s={
  version:3,
  records:{...(loaded.records||{})},
  analyses:{...(loaded.analyses||{})},
  conclusion:loaded.conclusion||''
};
if(!current&&old){s={version:3,records:{},analyses:{},conclusion:''};}
function save(){U.save(K,s)}

function model(c0n){
  const c0=c0n*1e-9,k=C/(C+c0),w=1/Math.sqrt(L*C);
  // Symmetric capacitive coupling: Ω1²=1/(LC), Ω2²=(1+2C/C0)/(LC).
  const w1=w,w2=w*Math.sqrt(1+2*C/c0);
  const f1=w1/(2*Math.PI),f2=w2/(2*Math.PI);
  return{k,w1,w2,f1,f2,T1:1/f1,T2:1/f2,Tosc:2/(f1+f2),Tbeat:2/Math.abs(f2-f1)};
}
function recFor(c0){return s.records[String(c0)]||(s.records[String(c0)]={c0,beats:{},m1:null,m2:null});}
function completeMeasurement(r){return !!r?.beats?.fast&&!!r?.beats?.beat&&!!r?.m1&&!!r?.m2}
function acceptedSet(c0){const r=s.records[String(c0)];return completeMeasurement(r)&&!!s.analyses[String(c0)]?.coupling&&!!s.analyses[String(c0)]?.beat}

function qSignals(t,c0,mode){
  const m=model(c0);
  if(mode==='m1'){const q=Math.cos(m.w1*t);return{q1:q,q2:q};}
  if(mode==='m2'){const q=Math.cos(m.w2*t);return{q1:q,q2:-q};}
  return{q1:.5*(Math.cos(m.w1*t)-Math.cos(m.w2*t)),q2:.5*(Math.cos(m.w1*t)+Math.cos(m.w2*t))};
}
function viewValue(sig,view){if(view==='sum')return sig.q1+sig.q2;if(view==='diff')return sig.q1-sig.q2;return null}

function draw(){
  const {x,w,h}=U.canvas(E('scope'));U.grid(x,w,h);
  const c0=+E('c0').value,mode=E('mode').value,view=E('view').value,td=+E('tdiv').value*1e-6,windowT=10*td;
  const pts1=[],pts2=[],ptsView=[];
  for(let i=0;i<=1000;i++){
    const t=windowT*i/1000,sig=qSignals(t,c0,mode),xx=w*i/1000;
    pts1.push({x:xx,y:h/2-sig.q1*h*.24});pts2.push({x:xx,y:h/2-sig.q2*h*.24});
    if(view!=='v')ptsView.push({x:xx,y:h/2-viewValue(sig,view)*h*.19});
  }
  if(view==='v'){
    x.strokeStyle='#ffd166';x.lineWidth=2;x.beginPath();pts1.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
    x.strokeStyle='#69e7ff';x.beginPath();pts2.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
  }else{
    x.strokeStyle=view==='sum'?'#67e6ab':'#ff8f70';x.lineWidth=2;x.beginPath();ptsView.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
  }
  const maxUs=windowT*1e6;E('cursor1').max=maxUs;E('cursor2').max=maxUs;
  const c1=Math.min(+E('cursor1').value,maxUs),c2=Math.min(+E('cursor2').value,maxUs);
  if(+E('cursor1').value!==c1)E('cursor1').value=c1;if(+E('cursor2').value!==c2)E('cursor2').value=c2;
  x.setLineDash([5,4]);[['cursor1','#fff09a'],['cursor2','#ff9f8a']].forEach(([id,col])=>{const xx=(+E(id).value/maxUs)*w;x.strokeStyle=col;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke();});x.setLineDash([]);
  updateReadouts();
}
function updateReadouts(){
  const t1=+E('cursor1').value,t2=+E('cursor2').value,mode=E('mode').value,target=E('timingTarget').value;
  E('t1Out').textContent=t1.toFixed(0)+' µs';E('t2Out').textContent=t2.toFixed(0)+' µs';E('dtOut').textContent=Math.abs(t2-t1).toFixed(0)+' µs';
  E('taskOut').textContent=mode==='beats'?(target==='beat'?'beat envelope':'fast beat oscillation'):(mode==='m1'?'mode 1':'mode 2');
  const beatMode=mode==='beats';E('timingTarget').disabled=!beatMode;if(!beatMode)E('timingTarget').value='fast';
  E('studentBeatCycles').disabled=!(beatMode&&E('timingTarget').value==='beat');
  E('studentBeatPeriod').disabled=!(beatMode&&E('timingTarget').value==='beat');
  E('studentCycles').disabled=beatMode&&E('timingTarget').value==='beat';
  E('studentPeriod').disabled=beatMode&&E('timingTarget').value==='beat';
  E('cyclesLabel').style.opacity=E('studentCycles').disabled?.5:1;E('periodLabel').style.opacity=E('studentPeriod').disabled?.5:1;
  E('beatLabel').style.opacity=E('studentBeatCycles').disabled?.5:1;E('beatPeriodLabel').style.opacity=E('studentBeatPeriod').disabled?.5:1;
}
function clearTiming(){
  ['studentCycles','studentPeriod','studentBeatCycles','studentBeatPeriod'].forEach(id=>E(id).value='');
}
function requiredView(mode){
  if(mode==='m1')return'sum';if(mode==='m2')return'diff';return'v';
}
function validateTiming(){
  const c0=+E('c0').value,mode=E('mode').value,target=E('timingTarget').value,m=model(c0),dtUs=Math.abs(+E('cursor2').value-(+E('cursor1').value)),dt=dtUs*1e-6;
  if(dtUs<1){E('msg').className='notice warn';E('msg').textContent='Separate the two time cursors before measuring.';return;}
  const needView=requiredView(mode);
  if(E('view').value!==needView){E('msg').className='notice warn';E('msg').textContent=mode==='m1'?'Use V₁+V₂ to isolate the symmetric normal mode.':mode==='m2'?'Use V₁−V₂ to isolate the antisymmetric normal mode.':'Use the V₁/V₂ display to observe beats directly.';return;}
  const r=recFor(c0);
  if(mode==='beats'&&target==='beat'){
    const rawN=E('studentBeatCycles').value.trim(),rawT=E('studentBeatPeriod').value.trim();
    if(rawN===''||rawT===''){E('msg').className='notice warn';E('msg').textContent='Count the beat-envelope periods between the cursors and calculate Tbeat.';return;}
    const n=+rawN,Tus=+rawT;if(!Number.isInteger(n)||n<1||!Number.isFinite(Tus)||Tus<=0){E('msg').className='notice warn';E('msg').textContent='Enter a positive integer number of beat periods and a positive Tbeat.';return;}
    const expectedDt=n*m.Tbeat;
    if(Math.abs(dt-expectedDt)>Math.max(18e-6,.06*expectedDt)){E('msg').className='notice warn';E('msg').textContent='Move the cursors between equivalent beat-envelope states and recount the envelope periods.';return;}
    const calc=dtUs/n;if(Math.abs(Tus-calc)>Math.max(3,.025*calc)){E('msg').className='notice warn';E('msg').textContent='Recalculate Tbeat=(t₂−t₁)/M.';return;}
    r.beats.beat={M:n,T:Tus};E('msg').className='notice ok';E('msg').textContent='Beat-envelope period accepted. Now time the fast oscillation within the beat signal.';
  }else{
    const rawN=E('studentCycles').value.trim(),rawT=E('studentPeriod').value.trim();
    if(rawN===''||rawT===''){E('msg').className='notice warn';E('msg').textContent='Count several oscillation periods between the cursors and calculate the period.';return;}
    const n=+rawN,Tus=+rawT;if(!Number.isInteger(n)||n<3||!Number.isFinite(Tus)||Tus<=0){E('msg').className='notice warn';E('msg').textContent='Use at least three full oscillation periods and enter a positive period.';return;}
    const trueT=mode==='m1'?m.T1:mode==='m2'?m.T2:m.Tosc,expectedDt=n*trueT;
    if(Math.abs(dt-expectedDt)>Math.max(8e-6,.04*expectedDt)){E('msg').className='notice warn';E('msg').textContent='Place the cursors on equivalent waveform phases several cycles apart and recount the periods.';return;}
    const calc=dtUs/n;if(Math.abs(Tus-calc)>Math.max(1.5,.02*calc)){E('msg').className='notice warn';E('msg').textContent='Recalculate T=(t₂−t₁)/N.';return;}
    if(mode==='beats')r.beats.fast={N:n,T:Tus};
    else r[mode]={N:n,T:Tus,f:1e6/Tus};
    E('msg').className='notice ok';E('msg').textContent=mode==='beats'?'Fast beat-oscillation period accepted. Also measure the envelope period.':(mode==='m1'?'Mode-1 period accepted. Repeat with the antisymmetric mode and V₁−V₂.':'Mode-2 period accepted.');
  }
  delete s.analyses[String(c0)];clearTiming();renderAll();save();
}

function measuredRow(c0){
  const r=s.records[String(c0)],a=s.analyses[String(c0)];
  if(!r)return{c0};
  return{c0,r,a,complete:completeMeasurement(r)};
}
function renderTable(){
  E('body').innerHTML=C0S.map(c0=>{
    const q=measuredRow(c0),r=q.r,a=q.a;
    const k=a?.coupling?((a.coupling.Kc+a.coupling.Kt)/2).toFixed(3):'—';
    const fast=r?.beats?.fast?.T,beat=r?.beats?.beat?.T,t1=r?.m1?.T,t2=r?.m2?.T;
    const status=a?.beat?'analysed':q.complete?'measurements complete':'in progress';
    return'<tr><td>'+c0+'</td><td>'+k+'</td><td>'+(fast?fast.toFixed(1):'—')+'</td><td>'+(beat?beat.toFixed(1):'—')+'</td><td>'+(t1?t1.toFixed(1):'—')+'</td><td>'+(t2?t2.toFixed(1):'—')+'</td><td>'+status+'</td></tr>';
  }).join('');
  const measured=C0S.filter(c0=>completeMeasurement(s.records[String(c0)])).length,analysed=C0S.filter(c0=>acceptedSet(c0)).length;
  E('progress').innerHTML='<div class="item '+(measured>=3?'done':'')+'">'+(measured>=3?'✓':'○')+' ≥3 complete coupling measurements ('+measured+')</div><div class="item '+(analysed>=3?'done':'')+'">'+(analysed>=3?'✓':'○')+' ≥3 coupling/beat analyses ('+analysed+')</div><div class="item '+(s.conclusion.trim().length>=30?'done':'')+'">'+(s.conclusion.trim().length>=30?'✓':'○')+' mode/beat interpretation</div>';
}
function completeSets(){return C0S.filter(c0=>completeMeasurement(s.records[String(c0)]));}
function syncAnalysisSet(){
  const sets=completeSets(),prev=+E('analysisSet').value;
  E('analysisSet').innerHTML=sets.length?sets.map(c0=>'<option value="'+c0+'">C₀ = '+c0+' nF</option>').join(''):'<option value="">Complete a set first</option>';
  if(sets.includes(prev))E('analysisSet').value=String(prev);
  else if(sets.length)E('analysisSet').value=String(sets[0]);
  loadAnalysisFields();
}
function measuredModeValues(c0){
  const r=s.records[String(c0)];if(!completeMeasurement(r))return null;
  const f1=1e6/r.m1.T,f2=1e6/r.m2.T,w1=2*Math.PI*f1,w2=2*Math.PI*f2;
  return{r,f1,f2,Kt:(w2*w2-w1*w1)/(w2*w2+w1*w1),ToscPred:2e6/(f1+f2),TbeatPred:2e6/Math.abs(f2-f1)};
}
function loadAnalysisFields(){
  const c0=+E('analysisSet').value,a=s.analyses[String(c0)];
  ['studentKc','studentKt','studentToscPred','studentTbeatPred'].forEach(id=>E(id).value='');
  if(a?.coupling){E('studentKc').value=a.coupling.Kc;E('studentKt').value=a.coupling.Kt;}
  if(a?.beat){E('studentToscPred').value=a.beat.Tosc;E('studentTbeatPred').value=a.beat.Tbeat;}
  renderAnalysisMetrics();
}
function checkCoupling(){
  const c0=+E('analysisSet').value,v=measuredModeValues(c0);
  if(!v){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Complete beats and both normal modes for the selected C₀ first.';return;}
  const Kc=+E('studentKc').value,Kt=+E('studentKt').value,expectedKc=C/(C+c0*1e-9);
  if(!Number.isFinite(Kc)||!Number.isFinite(Kt)){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Enter both coupling coefficients.';return;}
  if(Math.abs(Kc-expectedKc)>.006){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate K=C/(C+C₀), with C=68 nF.';return;}
  if(Math.abs(Kt-v.Kt)>.015){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate K from the measured normal-mode angular frequencies.';return;}
  s.analyses[String(c0)]=s.analyses[String(c0)]||{};s.analyses[String(c0)].coupling={Kc,Kt};
  E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Coupling calculation accepted. Now reconstruct the beat and fast-oscillation periods from T₁ and T₂.';
  renderAll();save();
}
function checkBeatConsistency(){
  const c0=+E('analysisSet').value,v=measuredModeValues(c0),a=s.analyses[String(c0)];
  if(!v||!a?.coupling){E('beatMessage').className='notice warn';E('beatMessage').textContent='Validate the selected coupling coefficient first.';return;}
  const Tosc=+E('studentToscPred').value,Tbeat=+E('studentTbeatPred').value;
  if(!Number.isFinite(Tosc)||!Number.isFinite(Tbeat)||Tosc<=0||Tbeat<=0){E('beatMessage').className='notice warn';E('beatMessage').textContent='Enter both reconstructed periods in microseconds.';return;}
  if(Math.abs(Tosc-v.ToscPred)>Math.max(3,.025*v.ToscPred)){E('beatMessage').className='notice warn';E('beatMessage').textContent='Recalculate Tosc=2/(f₁+f₂), converting seconds to microseconds.';return;}
  if(Math.abs(Tbeat-v.TbeatPred)>Math.max(12,.035*v.TbeatPred)){E('beatMessage').className='notice warn';E('beatMessage').textContent='Recalculate Tbeat=2/|f₂−f₁|.';return;}
  const direct=v.r.beats;
  const fastErr=100*(direct.fast.T-Tosc)/Tosc,beatErr=100*(direct.beat.T-Tbeat)/Tbeat;
  a.beat={Tosc,Tbeat,fastErr,beatErr};
  E('beatMessage').className='notice ok';E('beatMessage').textContent='Beat consistency accepted. Direct vs reconstructed differences: fast '+fastErr.toFixed(1)+'%, envelope '+beatErr.toFixed(1)+'%.';
  renderAll();save();
}

function renderAnalysisMetrics(){
  const c0=+E('analysisSet').value,v=measuredModeValues(c0),a=s.analyses[String(c0)];
  const K=a?.coupling?(a.coupling.Kc+a.coupling.Kt)/2:null;
  E('kOut').textContent=K!=null?K.toFixed(3):'—';
  E('f1Out').textContent=v?v.f1.toFixed(1)+' Hz':'—';E('f2Out').textContent=v?v.f2.toFixed(1)+' Hz':'—';
}
function drawChart(){
  const pts1=[],pts2=[];
  C0S.forEach(c0=>{
    const v=measuredModeValues(c0),a=s.analyses[String(c0)];
    if(v&&a?.coupling){const k=(a.coupling.Kc+a.coupling.Kt)/2;pts1.push({x:k,y:v.r.m1.T});pts2.push({x:k,y:v.r.m2.T});}
  });
  if(pts1.length)U.plot(E('chart'),[{pts:pts1,color:'#2aaac1'},{pts:pts2,color:'#df8746'}],{xlabel:'accepted K',ylabel:'proper period / µs',xmin:0,xmax:.75,ymin:0});
  else{const q=U.canvas(E('chart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Validate coupling sets to build T₁(K) and T₂(K).',q.w/2,q.h/2);}
}
function updateMessages(){
  const analysed=C0S.filter(c0=>acceptedSet(c0)).length,complete=completeSets().length,concl=s.conclusion.trim().length>=30;
  if(analysed>=3&&concl){E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Practical analysis complete. Compare how stronger coupling separates the two proper periods and shortens the beat envelope.';}
  else if(complete<3){E('analysisMessage').className='notice';E('analysisMessage').textContent='Complete beats and both normal modes for at least three coupling capacitors.';}
}
function renderAll(){draw();renderTable();syncAnalysisSet();drawChart();renderAnalysisMetrics();updateMessages();}

function buildReport(){
  const rows=C0S.filter(c0=>acceptedSet(c0)).map(c0=>{
    const r=s.records[String(c0)],a=s.analyses[String(c0)],K=(a.coupling.Kc+a.coupling.Kt)/2;
    return'C₀='+c0+' nF: K='+K.toFixed(3)+', T₁='+r.m1.T.toFixed(1)+' µs, T₂='+r.m2.T.toFixed(1)+' µs, Tosc='+r.beats.fast.T.toFixed(1)+' µs, Tbeat='+r.beats.beat.T.toFixed(1)+' µs';
  }).join(' · ');
  const summary='<p><b>Validated coupling sets:</b> '+(rows||'none yet')+'.</p><p><b>Interpretation:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>';
  return U.report('Laboratory Practical 3 — Free Oscillations, Two Degrees of Freedom',summary);
}

U.tabs();
E('modeConclusion').value=s.conclusion;
['c0','mode','tdiv','view','timingTarget','cursor1','cursor2'].forEach(id=>E(id).addEventListener('input',()=>{draw();}));
E('mode').addEventListener('change',()=>{if(E('mode').value!=='beats')E('timingTarget').value='fast';clearTiming();draw();});
E('timingTarget').addEventListener('change',()=>{clearTiming();draw();});
E('measure').onclick=validateTiming;
E('analysisSet').addEventListener('change',()=>{loadAnalysisFields();drawChart();});
E('checkCoupling').onclick=checkCoupling;E('checkBeatConsistency').onclick=checkBeatConsistency;
E('modeConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;renderTable();updateMessages();save();});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',renderAll);
renderAll();save();
})();