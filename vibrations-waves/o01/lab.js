(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_O01_v3',C_KNOWN=.470e-6,VS=.4,TAU=Math.PI*2;
function makeRun(){
  return{
    id:'O01-'+Math.random().toString(36).slice(2,7).toUpperCase(),
    L:.019+Math.random()*.0025,
    Rr:20+Math.random()*8,
    Rx:12+Math.random()*16,
    Cx:(.62+Math.random()*.12)*1e-6
  };
}
let s=U.load(K,null);
if(!s||s.version!==3)s={version:3,run:makeRun(),critical:null,known:null,knownAnalysis:null,unknown:null,unknownAnalysis:null,criticalAnalysis:null};
function save(){U.save(K,s)}
function criticalExternal(){return 2*Math.sqrt(s.run.L/C_KNOWN)-s.run.Rr}
function circuit(spec=E('spec').value){
  const adjustable=spec==='known'?+E('R').value:0,C=spec==='known'?C_KNOWN:s.run.Cx,Rt=spec==='known'?s.run.Rr+adjustable:s.run.Rr+s.run.Rx;
  const alpha=Rt/(2*s.run.L),w0=1/Math.sqrt(s.run.L*C),disc=alpha*alpha-w0*w0;
  const wd=disc<0?Math.sqrt(-disc):0,Ta=wd?TAU/wd:null,D=wd?alpha*Ta:null;
  return{spec,C,Rt,alpha,w0,disc,wd,Ta,D};
}
function response(t,p=circuit()){
  if(t<=0)return 0;
  const a=p.alpha,w=p.w0;
  if(a<w*(1-1e-6)){
    const wd=Math.sqrt(w*w-a*a);
    return VS*(1-Math.exp(-a*t)*(Math.cos(wd*t)+(a/wd)*Math.sin(wd*t)));
  }
  if(Math.abs(a-w)<=w*1e-6)return VS*(1-Math.exp(-w*t)*(1+w*t));
  const q=Math.sqrt(a*a-w*w),r1=-a+q,r2=-a-q;
  return VS*(1+(r2*Math.exp(r1*t)-r1*Math.exp(r2*t))/(r1-r2));
}
function setupCanvas(){
  const c=E('scope'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;
  c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h};
}
function draw(){
  const{x,w,h}=setupCanvas();U.grid(x,w,h);
  const td=+E('tdiv').value*1e-6,vd=+E('vdiv').value,p=circuit(),base=h*.91,ydiv=h/8,screenT=10*td;
  E('Rread').textContent=(E('spec').value==='unknown'?'removed':(+E('R').value).toFixed(0)+' Ω');
  E('freqRead').textContent=(+E('freq').value).toFixed(0)+' Hz';
  const pts=[];
  for(let k=0;k<=1200;k++){const t=screenT*k/1200,v=response(t,p);pts.push({x:w*k/1200,y:base-v/vd*ydiv});}
  x.strokeStyle='#69e7ff';x.lineWidth=2.2;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
  const yf=base-VS/vd*ydiv;x.save();x.strokeStyle='rgba(255,209,102,.72)';x.setLineDash([7,5]);x.beginPath();x.moveTo(0,yf);x.lineTo(w,yf);x.stroke();x.restore();
  x.fillStyle='#ffd166';x.font='600 11px system-ui';x.fillText('final plateau',8,Math.max(14,yf-6));
  [['cursor1','#ffd166'],['cursor2','#ff8a7a']].forEach(([id,col])=>{const d=+E(id).value,xx=w*d/10;x.strokeStyle=col;x.lineWidth=1.5;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke();});
  updateCursorLabels();
}
function updateCursorLabels(){E('cursor1Read').textContent=(+E('cursor1').value).toFixed(2)+' div';E('cursor2Read').textContent=(+E('cursor2').value).toFixed(2)+' div'}
function clearMeasureInputs(){['studentCycles','studentA1Div','studentA2Div','studentTa','studentD'].forEach(id=>E(id).value='')}
function measurementFromCursors(spec){
  const p=circuit(spec);if(!p.Ta)return{ok:false,reason:'This response is not oscillatory; a pseudo-period cannot be measured.'};
  const td=+E('tdiv').value*1e-6,t1=+E('cursor1').value*td,t2=+E('cursor2').value*td;
  if(t2<=t1)return{ok:false,reason:'Cursor 2 must be later than cursor 1.'};
  const half=p.Ta/2,k1=Math.round(t1/half),k2=Math.round(t2/half),e1=Math.abs(t1-k1*half),e2=Math.abs(t2-k2*half);
  if(e1>.045*p.Ta||e2>.045*p.Ta||(k2-k1)%2!==0)return{ok:false,reason:'Place both cursors on same-sign extrema of the damped oscillation.'};
  const N=(k2-k1)/2;if(N<3)return{ok:false,reason:'Use at least three full pseudo-periods between the two same-sign extrema.'};
  const vdiv=+E('vdiv').value,a1=Math.abs(response(t1,p)-VS)/vdiv,a2=Math.abs(response(t2,p)-VS)/vdiv;
  if(a2<.05)return{ok:false,reason:'The later peak is too small for a reliable graticule reading. Choose an earlier pair or reduce the damping interval.'};
  return{ok:true,p,t1,t2,N,a1,a2,Ta:(t2-t1)/N,D:Math.log(a1/a2)/N};
}
function validateStudentMeasurement(spec){
  const m=measurementFromCursors(spec);if(!m.ok)return m;
  const raw=['studentCycles','studentA1Div','studentA2Div','studentTa','studentD'].map(id=>E(id).value.trim());
  if(raw.some(v=>v===''))return{ok:false,reason:'Enter N, A₁, A₂, Tₐ and D from the oscilloscope graticule before validating.'};
  const N=+raw[0],a1=+raw[1],a2=+raw[2],TaUs=+raw[3],D=+raw[4];
  if(!Number.isInteger(N)||N!==m.N)return{ok:false,reason:'Recount the number of full periods between the two same-sign extrema.'};
  if(!Number.isFinite(a1)||!Number.isFinite(a2)||a1<=a2||a2<=0)return{ok:false,reason:'Enter positive peak deviations with A₁ greater than A₂.'};
  if(Math.abs(a1-m.a1)>.10||Math.abs(a2-m.a2)>.10)return{ok:false,reason:'Re-read the two peak deviations from the final plateau in vertical divisions.'};
  const TaFromCursors=(m.t2-m.t1)/N*1e6;
  if(!Number.isFinite(TaUs)||Math.abs(TaUs-TaFromCursors)>Math.max(4,.025*TaFromCursors))return{ok:false,reason:'Recalculate Tₐ = (t₂−t₁)/N using TIME/DIV.'};
  const DfromStudent=Math.log(a1/a2)/N;
  if(!Number.isFinite(D)||Math.abs(D-DfromStudent)>.025)return{ok:false,reason:'Recalculate D = ln(A₁/A₂)/N from your graticule readings.'};
  return{ok:true,N,a1,a2,Ta:TaUs*1e-6,D,t1:m.t1,t2:m.t2,timeDiv:+E('tdiv').value,vdiv:+E('vdiv').value};
}
function recordCritical(){
  if(E('spec').value!=='known'){E('msg').className='notice warn';E('msg').textContent='Use the known-C circuit for the critical-regime measurement.';return}
  const R=+E('R').value,target=criticalExternal(),err=R-target;
  if(Math.abs(err)>8){
    E('msg').className='notice warn';
    E('msg').textContent=err<0?'The trace still shows an oscillatory overshoot. Increase R toward the boundary.':'The response is already clearly aperiodic. Reduce R toward the boundary.';
    return;
  }
  s.critical={R};s.criticalAnalysis=null;E('studentLcrit').value='';
  E('msg').className='notice ok';E('msg').textContent='Critical boundary recorded. Return R to zero and measure the underdamped pseudo-period and logarithmic decrement.';
  renderResults();save();
}
function measureKnown(){
  if(!s.critical){E('msg').className='notice warn';E('msg').textContent='Record the critical resistance first.';return}
  if(E('spec').value!=='known'||+E('R').value!==0){E('msg').className='notice warn';E('msg').textContent='For the free damped measurement, use the known circuit with adjustable R returned to zero.';return}
  const m=validateStudentMeasurement('known');if(!m.ok){E('msg').className='notice warn';E('msg').textContent=m.reason;return}
  s.known=m;s.knownAnalysis=null;s.unknown=null;s.unknownAnalysis=null;s.criticalAnalysis=null;
  ['studentDelta','studentQ','studentL','studentRr','studentRx','studentCx','studentLcrit'].forEach(id=>E(id).value='');
  E('msg').className='notice ok';E('msg').textContent='Known-circuit Tₐ and D accepted. Calculate δ, Q, L and Rᵣ in the results panel.';
  clearMeasureInputs();renderResults();save();
}
function checkKnownAnalysis(){
  if(!s.known){E('knownAnalysisMessage').className='notice warn';E('knownAnalysisMessage').textContent='Validate the known-circuit Tₐ and D measurement first.';return}
  const delta=+E('studentDelta').value,Q=+E('studentQ').value,LmH=+E('studentL').value,Rr=+E('studentRr').value;
  if([delta,Q,LmH,Rr].some(v=>!Number.isFinite(v)||v<=0)){E('knownAnalysisMessage').className='notice warn';E('knownAnalysisMessage').textContent='Enter δ, Q, L and Rᵣ.';return}
  const Ta=s.known.Ta,D=s.known.D,ed=D/Ta,eQ=Math.PI/D,w02=(4*Math.PI*Math.PI+D*D)/(Ta*Ta),eL=1/(C_KNOWN*w02),eRr=2*eL*ed;
  if(Math.abs(delta-ed)>Math.max(25,.03*ed)){E('knownAnalysisMessage').className='notice warn';E('knownAnalysisMessage').textContent='Recalculate δ=D/Tₐ with Tₐ in seconds.';return}
  if(Math.abs(Q-eQ)>Math.max(.08,.03*eQ)){E('knownAnalysisMessage').className='notice warn';E('knownAnalysisMessage').textContent='Recalculate Q≈π/D.';return}
  if(Math.abs(LmH-eL*1e3)>Math.max(.25,.03*eL*1e3)){E('knownAnalysisMessage').className='notice warn';E('knownAnalysisMessage').textContent='Recalculate ω₀²=(4π²+D²)/Tₐ² and L=1/(Cω₀²).';return}
  if(Math.abs(Rr-eRr)>Math.max(1.5,.04*eRr)){E('knownAnalysisMessage').className='notice warn';E('knownAnalysisMessage').textContent='Recalculate Rᵣ=2Lδ using L in henries.';return}
  s.knownAnalysis={delta,Q,L:LmH/1e3,Rr};s.criticalAnalysis=null;
  E('knownAnalysisMessage').className='notice ok';E('knownAnalysisMessage').textContent='Known-circuit analysis accepted. You may now insert the unknown Rₓ/Cₓ specimen.';
  renderResults();save();
}
function measureUnknown(){
  if(!s.knownAnalysis){E('msg').className='notice warn';E('msg').textContent='Complete the known-circuit analysis before measuring the unknown specimen.';return}
  if(E('spec').value!=='unknown'){E('msg').className='notice warn';E('msg').textContent='Select the unknown Rₓ/Cₓ specimen first.';return}
  const m=validateStudentMeasurement('unknown');if(!m.ok){E('msg').className='notice warn';E('msg').textContent=m.reason;return}
  s.unknown=m;s.unknownAnalysis=null;['studentRx','studentCx'].forEach(id=>E(id).value='');
  E('msg').className='notice ok';E('msg').textContent='Unknown-specimen T′ₐ and D′ accepted. Calculate Rₓ and Cₓ from your measured values.';
  clearMeasureInputs();renderResults();save();
}
function checkUnknownAnalysis(){
  if(!s.unknown||!s.knownAnalysis){E('unknownAnalysisMessage').className='notice warn';E('unknownAnalysisMessage').textContent='Validate the unknown-specimen T′ₐ and D′ measurement first.';return}
  const Rx=+E('studentRx').value,Cx=+E('studentCx').value;
  if(!Number.isFinite(Rx)||!Number.isFinite(Cx)||Rx<=0||Cx<=0){E('unknownAnalysisMessage').className='notice warn';E('unknownAnalysisMessage').textContent='Enter Rₓ and Cₓ.';return}
  const Ta=s.unknown.Ta,D=s.unknown.D,L=s.knownAnalysis.L,Rr=s.knownAnalysis.Rr,delta=D/Ta,w02=(4*Math.PI*Math.PI+D*D)/(Ta*Ta),eRx=2*L*delta-Rr,eCx=1/(L*w02)*1e6;
  if(Math.abs(Rx-eRx)>Math.max(1.2,.05*Math.abs(eRx))){E('unknownAnalysisMessage').className='notice warn';E('unknownAnalysisMessage').textContent='Recalculate Rₓ=2Lδ′−Rᵣ using the known-circuit L and Rᵣ.';return}
  if(Math.abs(Cx-eCx)>Math.max(.008,.04*eCx)){E('unknownAnalysisMessage').className='notice warn';E('unknownAnalysisMessage').textContent='Recalculate Cₓ=1/(Lω′₀²), then convert farads to µF.';return}
  s.unknownAnalysis={Rx,Cx};
  E('unknownAnalysisMessage').className='notice ok';E('unknownAnalysisMessage').textContent='Unknown resistance and capacitance accepted.';
  renderResults();save();
}
function checkCriticalComparison(){
  if(!s.critical||!s.knownAnalysis){E('compare').className='notice warn';E('compare').textContent='Record the critical resistance and complete the damped-response analysis first.';return}
  const v=+E('studentLcrit').value,expected=C_KNOWN*(s.critical.R+s.knownAnalysis.Rr)**2/4*1e3;
  if(!Number.isFinite(v)||v<=0){E('compare').className='notice warn';E('compare').textContent='Enter your critical-regime inductance estimate.';return}
  if(Math.abs(v-expected)>Math.max(.25,.035*expected)){E('compare').className='notice warn';E('compare').textContent='Recalculate Lcritical=C(RC+Rᵣ)²/4 using resistance in ohms and C in farads.';return}
  const damped=s.knownAnalysis.L*1e3,diff=100*Math.abs(v-damped)/damped;s.criticalAnalysis={Lcrit:v,diff};
  E('compare').className='notice ok';E('compare').textContent='Critical-regime cross-check accepted. Discuss the agreement and the sensitivity of the boundary measurement.';
  renderResults();save();
}
function renderResults(){
  E('rcOut').textContent=s.critical?s.critical.R.toFixed(0)+' Ω':'—';
  E('taOut').textContent=s.known?(s.known.Ta*1e6).toFixed(1)+' µs':'—';E('dOut').textContent=s.known?s.known.D.toFixed(3):'—';
  E('qOut').textContent=s.knownAnalysis?s.knownAnalysis.Q.toFixed(2):'—';E('lOut').textContent=s.knownAnalysis?(s.knownAnalysis.L*1e3).toFixed(2)+' mH':'—';E('rrOut').textContent=s.knownAnalysis?s.knownAnalysis.Rr.toFixed(1)+' Ω':'—';
  E('taUnknownOut').textContent=s.unknown?(s.unknown.Ta*1e6).toFixed(1)+' µs':'—';E('dUnknownOut').textContent=s.unknown?s.unknown.D.toFixed(3):'—';
  E('rxOut').textContent=s.unknownAnalysis?s.unknownAnalysis.Rx.toFixed(1)+' Ω':'—';E('cxOut').textContent=s.unknownAnalysis?s.unknownAnalysis.Cx.toFixed(3)+' µF':'—';
  E('lcritOut').textContent=s.criticalAnalysis?s.criticalAnalysis.Lcrit.toFixed(2)+' mH':'—';E('lDiffOut').textContent=s.criticalAnalysis?s.criticalAnalysis.diff.toFixed(1)+'%':'—';
  if(!s.known)E('knownAnalysisMessage').className='notice';
  if(!s.unknown)E('unknownAnalysisMessage').className='notice';
}
function syncSpec(){
  const unknown=E('spec').value==='unknown';E('R').disabled=unknown;if(unknown)E('R').value=0;
  clearMeasureInputs();draw();
}
function newRun(){
  if((s.critical||s.known||s.unknown)&&!confirm('Start a new Practical 1 specimen? Existing measurements will be cleared.'))return;
  s={version:3,run:makeRun(),critical:null,known:null,knownAnalysis:null,unknown:null,unknownAnalysis:null,criticalAnalysis:null};
  E('spec').value='known';E('R').value=0;E('freq').value=50;E('tdiv').value=500;E('vdiv').value=.1;E('cursor1').value=1.2;E('cursor2').value=7;
  ['studentDelta','studentQ','studentL','studentRr','studentRx','studentCx','studentLcrit'].forEach(id=>E(id).value='');clearMeasureInputs();
  E('msg').className='notice';E('msg').textContent='New specimen loaded. Find the critical resistance with the known circuit.';
  syncSpec();renderResults();save();
}
function buildReport(){
  const summary='<p><b>Run:</b> '+U.esc(s.run.id)+'. <b>Critical R:</b> '+(s.critical?s.critical.R.toFixed(0)+' Ω':'not recorded')+'.</p>'+
    '<p><b>Known circuit:</b> '+(s.known?'Tₐ='+(s.known.Ta*1e6).toFixed(1)+' µs, D='+s.known.D.toFixed(3):'measurement incomplete')+
    (s.knownAnalysis?'; δ='+s.knownAnalysis.delta.toFixed(0)+' s⁻¹, Q='+s.knownAnalysis.Q.toFixed(2)+', L='+(s.knownAnalysis.L*1e3).toFixed(2)+' mH, Rᵣ='+s.knownAnalysis.Rr.toFixed(1)+' Ω.':'.')+'</p>'+
    '<p><b>Critical cross-check:</b> '+(s.criticalAnalysis?'Lcritical='+s.criticalAnalysis.Lcrit.toFixed(2)+' mH, difference='+s.criticalAnalysis.diff.toFixed(1)+'%.':'not validated.')+'</p>'+
    '<p><b>Unknown specimen:</b> '+(s.unknown?'T′ₐ='+(s.unknown.Ta*1e6).toFixed(1)+' µs, D′='+s.unknown.D.toFixed(3):'measurement incomplete')+
    (s.unknownAnalysis?'; Rₓ='+s.unknownAnalysis.Rx.toFixed(1)+' Ω, Cₓ='+s.unknownAnalysis.Cx.toFixed(3)+' µF.':'.')+'</p>';
  return U.report('Laboratory Practical 1 — Free Oscillations — 1 Degree of Freedom',summary);
}
U.tabs();
['R','freq','tdiv','vdiv','cursor1','cursor2'].forEach(id=>E(id).addEventListener('input',draw));
E('spec').addEventListener('change',syncSpec);
E('recordCritical').onclick=recordCritical;E('measureDamped').onclick=measureKnown;E('measureUnknown').onclick=measureUnknown;
E('checkKnownAnalysis').onclick=checkKnownAnalysis;E('checkUnknownAnalysis').onclick=checkUnknownAnalysis;E('checkCriticalComparison').onclick=checkCriticalComparison;E('newRun').onclick=newRun;
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',draw);
syncSpec();renderResults();draw();save();
})();