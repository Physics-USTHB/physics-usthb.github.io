(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W01_v2',OLD='VOM_W01_v1',g=9.81;
const current=U.load(K,null),old=U.load(OLD,null);
let s=current||{version:2,inertia:null,coupled:{kap:null,fast:null,beat:null,m1:null,m2:null,analysis:null},conclusion:''};
if(!current&&old)s={version:2,inertia:null,coupled:{kap:null,fast:null,beat:null,m1:null,m2:null,analysis:null},conclusion:''};
s.coupled=s.coupled||{kap:null,fast:null,beat:null,m1:null,m2:null,analysis:null};s.conclusion=s.conclusion||'';
function save(){U.save(K,s)}

function inertiaModel(){
  const extra=+E('extraMass').value/1000,m=.12+extra,r1=+E('m1pos').value/100,r2=+E('m2pos').value/100;
  const J=.045+m*r1*r1+m*r2*r2,torque=m*g*(r1+r2),w=Math.sqrt(torque/J),T=2*Math.PI/w;
  return{extra,m,r1,r2,J,torque,w,T};
}
function couplingModel(){
  const i=inertiaModel(),kap=+E('coupling').value,w1=i.w,w2=Math.sqrt(w1*w1+2*kap/i.J),f1=w1/(2*Math.PI),f2=w2/(2*Math.PI);
  return{...i,kap,w1,w2,f1,f2,T1:1/f1,T2:1/f2,Tosc:2/(f1+f2),Tbeat:2/Math.abs(f2-f1)};
}
function resetInertia(){
  s.inertia=null;s.coupled={kap:null,fast:null,beat:null,m1:null,m2:null,analysis:null};
  ['studentT0','studentJ','studentBeatPeriod','studentModeT','studentModeF','studentKappa','studentBeatPred'].forEach(id=>E(id).value='');
}
function resetCoupled(){
  s.coupled={kap:+E('coupling').value,fast:null,beat:null,m1:null,m2:null,analysis:null};
  ['studentBeatPeriod','studentModeT','studentModeF','studentKappa','studentBeatPred'].forEach(id=>E(id).value='');
}
function sameCoupling(){return s.coupled.kap!=null&&Math.abs(s.coupled.kap-(+E('coupling').value))<1e-12}

function drawPend(canvas,kind){
  const {x,w,h}=U.canvas(canvas);x.fillStyle='#eef5f6';x.fillRect(0,0,w,h);
  const topH=h*.54,baseY=25,Lpx=Math.min(120,topH*.7),cx1=w*.34,cx2=w*.66;
  let span=16,signal=t=>({q1:Math.cos(inertiaModel().w*t),q2:0});
  if(kind==='beats'){
    const p=couplingModel();span=Math.min(200,Math.max(35,p.Tbeat*1.18));signal=t=>({q1:.5*(Math.cos(p.w1*t)-Math.cos(p.w2*t)),q2:.5*(Math.cos(p.w1*t)+Math.cos(p.w2*t))});
  }else if(kind==='mode'){
    const p=couplingModel(),anti=E('modeSelect').value==='anti',ww=anti?p.w2:p.w1;span=16;signal=t=>({q1:Math.cos(ww*t),q2:(anti?-1:1)*Math.cos(ww*t)});
  }
  const sample=signal(span*.11),ang1=.36*sample.q1,ang2=.36*sample.q2;
  function pend(cx,a,label){
    const bx=cx+Lpx*Math.sin(a),by=baseY+Lpx*Math.cos(a);x.strokeStyle='#466171';x.lineWidth=4;x.beginPath();x.moveTo(cx,baseY);x.lineTo(bx,by);x.stroke();x.fillStyle='#c26443';x.beginPath();x.arc(bx,by,13,0,Math.PI*2);x.fill();x.fillStyle='#173e58';x.font='700 11px system-ui';x.fillText(label,cx-7,baseY-7);
  }
  pend(cx1,ang1,'1');if(kind!=='inertia')pend(cx2,ang2,'2');
  if(kind!=='inertia'){x.strokeStyle='#82a94d';x.lineWidth=3;x.beginPath();x.moveTo(cx1,baseY+20);x.lineTo(cx2,baseY+20);x.stroke();}
  const y0=h*.70,gh=h*.24,left=28,right=w-18,X=t=>left+t/span*(right-left);
  x.strokeStyle='rgba(46,84,102,.18)';x.lineWidth=1;for(let k=0;k<=10;k++){const xx=left+(right-left)*k/10;x.beginPath();x.moveTo(xx,y0-gh/2);x.lineTo(xx,y0+gh/2);x.stroke();}
  const a=[],b=[];for(let i=0;i<=900;i++){const t=span*i/900,q=signal(t);a.push({x:X(t),y:y0-q.q1*gh*.42});b.push({x:X(t),y:y0-q.q2*gh*.42});}
  x.strokeStyle='#d69b25';x.lineWidth=1.7;x.beginPath();a.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
  if(kind!=='inertia'){x.strokeStyle='#2697b0';x.beginPath();b.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();}
  const pair=kind==='inertia'?['inertiaCursor1','inertiaCursor2']:kind==='beats'?['beatCursor1','beatCursor2']:['modeCursor1','modeCursor2'];
  pair.forEach(id=>{E(id).max=span;const v=Math.min(+E(id).value,span);if(v!==+E(id).value)E(id).value=v;});
  x.setLineDash([4,3]);pair.forEach((id,i)=>{x.strokeStyle=i?'#d8584b':'#7658a8';const xx=X(+E(id).value);x.beginPath();x.moveTo(xx,y0-gh/2);x.lineTo(xx,y0+gh/2);x.stroke();});x.setLineDash([]);
  if(kind==='inertia')updateInertiaCursor();else if(kind==='beats')updateBeatCursor();
}
function updateInertiaCursor(){
  const a=+E('inertiaCursor1').value,b=+E('inertiaCursor2').value;E('inertiaT1').textContent=a.toFixed(2)+' s';E('inertiaT2').textContent=b.toFixed(2)+' s';E('inertiaDt').textContent=Math.abs(b-a).toFixed(2)+' s';
}
function updateBeatCursor(){}

function validateInertia(){
  const p=inertiaModel(),dt=Math.abs(+E('inertiaCursor2').value-(+E('inertiaCursor1').value)),raw=[E('inertiaCycles').value.trim(),E('studentT0').value.trim(),E('studentJ').value.trim()];
  if(raw.some(v=>v==='')){E('inertiaMsg').className='notice warn';E('inertiaMsg').textContent='Enter N, T and J.';return;}
  const [N,T,J]=raw.map(Number);if(!Number.isInteger(N)||N<3||T<=0||J<=0){E('inertiaMsg').className='notice warn';E('inertiaMsg').textContent='Time at least three full periods and enter positive T and J.';return;}
  if(Math.abs(dt-N*p.T)>Math.max(.06,.035*N*p.T)){E('inertiaMsg').className='notice warn';E('inertiaMsg').textContent='Place the cursors on equivalent phases several periods apart and recount N.';return;}
  const Tc=dt/N,Jc=(Tc/(2*Math.PI))**2*p.torque;
  if(Math.abs(T-Tc)>.02){E('inertiaMsg').className='notice warn';E('inertiaMsg').textContent='Recalculate T=(t₂−t₁)/N.';return;}
  if(Math.abs(J-Jc)>Math.max(.0003,.025*Jc)){E('inertiaMsg').className='notice warn';E('inertiaMsg').textContent='Recalculate J=(T/2π)²Mg(r₁+r₂) using the current mass positions.';return;}
  s.inertia={T,J,m:p.m,r1:p.r1,r2:p.r2,extra:p.extra};s.coupled={kap:+E('coupling').value,fast:null,beat:null,m1:null,m2:null,analysis:null};
  E('inertiaMsg').className='notice ok';E('inertiaMsg').textContent='Uncoupled period and moment of inertia accepted. Keep these mass settings for the coupled measurements.';
  renderAll();save();
}

function currentModelFromMeasuredJ(){
  if(!s.inertia)return null;
  const kap=+E('coupling').value,torque=s.inertia.m*g*(s.inertia.r1+s.inertia.r2),w1=Math.sqrt(torque/s.inertia.J),w2=Math.sqrt(w1*w1+2*kap/s.inertia.J),f1=w1/(2*Math.PI),f2=w2/(2*Math.PI);
  return{kap,w1,w2,f1,f2,T1:1/f1,T2:1/f2,Tosc:2/(f1+f2),Tbeat:2/Math.abs(f2-f1)};
}
function validateBeat(){
  if(!s.inertia){E('beatMsg').className='notice warn';E('beatMsg').textContent='Validate the uncoupled inertia first.';return;}
  if(!sameCoupling())resetCoupled();
  const p=currentModelFromMeasuredJ(),target=E('beatTarget').value,dt=Math.abs(+E('beatCursor2').value-(+E('beatCursor1').value)),raw=[E('beatCycles').value.trim(),E('studentBeatPeriod').value.trim()];
  if(raw.some(v=>v==='')){E('beatMsg').className='notice warn';E('beatMsg').textContent='Enter the number of selected periods and the calculated period.';return;}
  const N=+raw[0],T=+raw[1],trueT=target==='beat'?p.Tbeat:p.Tosc,minN=target==='beat'?1:3;
  if(!Number.isInteger(N)||N<minN||T<=0){E('beatMsg').className='notice warn';E('beatMsg').textContent='Use '+minN+' or more complete '+(target==='beat'?'beat-envelope':'oscillation')+' periods.';return;}
  if(Math.abs(dt-N*trueT)>Math.max(.08,.045*N*trueT)){E('beatMsg').className='notice warn';E('beatMsg').textContent='Move the cursors to equivalent '+(target==='beat'?'envelope':'fast-oscillation')+' phases and recount.';return;}
  const Tc=dt/N;if(Math.abs(T-Tc)>Math.max(.02,.025*Tc)){E('beatMsg').className='notice warn';E('beatMsg').textContent='Recalculate the selected period from Δt/N.';return;}
  s.coupled[target==='beat'?'beat':'fast']={N,T};
  E('beatCycles').value='';E('studentBeatPeriod').value='';E('beatMsg').className='notice ok';E('beatMsg').textContent=(target==='beat'?'Beat-envelope':'Fast oscillation')+' period accepted. Measure the other scale as well.';
  renderAll();save();
}
function validateMode(){
  if(!s.inertia){E('modeMsg').className='notice warn';E('modeMsg').textContent='Validate the uncoupled inertia first.';return;}
  if(!sameCoupling())resetCoupled();
  const p=currentModelFromMeasuredJ(),mode=E('modeSelect').value,dt=Math.abs(+E('modeCursor2').value-(+E('modeCursor1').value)),raw=[E('modeCycles').value.trim(),E('studentModeT').value.trim(),E('studentModeF').value.trim()],trueT=mode==='sym'?p.T1:p.T2;
  if(raw.some(v=>v==='')){E('modeMsg').className='notice warn';E('modeMsg').textContent='Enter N, T and f.';return;}
  const [N,T,f]=raw.map(Number);if(!Number.isInteger(N)||N<3||T<=0||f<=0){E('modeMsg').className='notice warn';E('modeMsg').textContent='Time at least three complete normal-mode cycles.';return;}
  if(Math.abs(dt-N*trueT)>Math.max(.06,.035*N*trueT)){E('modeMsg').className='notice warn';E('modeMsg').textContent='Place cursors on equivalent normal-mode phases and recount N.';return;}
  const Tc=dt/N;if(Math.abs(T-Tc)>.02){E('modeMsg').className='notice warn';E('modeMsg').textContent='Recalculate T=Δt/N.';return;}
  if(Math.abs(f-1/T)>Math.max(.003,.02/T)){E('modeMsg').className='notice warn';E('modeMsg').textContent='Recalculate f=1/T.';return;}
  s.coupled[mode==='sym'?'m1':'m2']={N,T,f};s.coupled.analysis=null;
  ['modeCycles','studentModeT','studentModeF','studentKappa','studentBeatPred'].forEach(id=>E(id).value='');
  E('modeMsg').className='notice ok';E('modeMsg').textContent=(mode==='sym'?'Symmetric':'Antisymmetric')+' normal-mode timing accepted. Measure the other mode separately.';
  renderAll();save();
}

function checkAnalysis(){
  const c=s.coupled;if(!s.inertia||!c.fast||!c.beat||!c.m1||!c.m2){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Validate inertia, both beat scales and both normal modes first.';return;}
  const kappa=+E('studentKappa').value,tb=+E('studentBeatPred').value,w1=2*Math.PI/c.m1.f,w2=2*Math.PI/c.m2.f,kc=s.inertia.J*(w2*w2-w1*w1)/2,tbc=2/Math.abs(c.m2.f-c.m1.f);
  if(!Number.isFinite(kappa)||!Number.isFinite(tb)||kappa<=0||tb<=0){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Enter κ and the reconstructed beat period.';return;}
  if(Math.abs(kappa-kc)>Math.max(.001,.04*kc)){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate κ = J(ω₂²−ω₁²)/2 from your measured normal-mode frequencies.';return;}
  if(Math.abs(tb-tbc)>Math.max(.25,.04*tbc)){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate the beat period from 2/|f₂−f₁|.';return;}
  const beatErr=100*(c.beat.T-tb)/tb,fastPred=2/(c.m1.f+c.m2.f),fastErr=100*(c.fast.T-fastPred)/fastPred;
  c.analysis={kappa,beatPred:tb,beatErr,fastPred,fastErr};
  E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Coupling analysis accepted. Direct/reconstructed differences: beat '+beatErr.toFixed(1)+'%, fast '+fastErr.toFixed(1)+'%.';
  renderAll();save();
}

function renderOutputs(){
  E('t0Out').textContent=s.inertia?s.inertia.T.toFixed(3)+' s':'—';E('jOut').textContent=s.inertia?s.inertia.J.toFixed(5)+' kg·m²':'—';E('rOut').textContent=s.inertia?((s.inertia.r1*100).toFixed(0)+' / '+(s.inertia.r2*100).toFixed(0)+' cm'):'—';
  const c=s.coupled;E('tOscOut').textContent=c.fast?c.fast.T.toFixed(3)+' s':'—';E('tBeatOut').textContent=c.beat?c.beat.T.toFixed(3)+' s':'—';E('kOut').textContent=c.analysis?c.analysis.kappa.toFixed(4):'—';
  E('t1Out').textContent=c.m1?c.m1.T.toFixed(3)+' s':'—';E('t2Out').textContent=c.m2?c.m2.T.toFixed(3)+' s':'—';E('freqOut').textContent=c.m1&&c.m2?c.m1.f.toFixed(3)+' / '+c.m2.f.toFixed(3)+' Hz':'—';
  E('summaryJ').textContent=E('jOut').textContent;E('summaryT1').textContent=E('t1Out').textContent;E('summaryT2').textContent=E('t2Out').textContent;E('summaryTb').textContent=E('tBeatOut').textContent;
}
function overall(){
  const complete=!!s.coupled.analysis&&s.conclusion.trim().length>=30;
  if(complete){E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Coupled-pendulum analysis complete. Relate mode splitting to the observed energy-transfer beats.';}
}
function renderAll(){
  drawPend(E('uncoupledCanvas'),'inertia');drawPend(E('coupledCanvas'),'beats');drawPend(E('modeCanvas'),'mode');renderOutputs();overall();
}
function buildReport(){
  const c=s.coupled,summary='<p><b>Uncoupled:</b> '+(s.inertia?'T='+s.inertia.T.toFixed(3)+' s, J='+s.inertia.J.toFixed(5)+' kg·m²':'incomplete')+'.</p><p><b>Coupled:</b> '+(c.m1&&c.m2?'T₁='+c.m1.T.toFixed(3)+' s, T₂='+c.m2.T.toFixed(3)+' s':'modes incomplete')+'; '+(c.fast&&c.beat?'Tosc='+c.fast.T.toFixed(3)+' s, Tbeat='+c.beat.T.toFixed(3)+' s':'beats incomplete')+'; '+(c.analysis?'κ='+c.analysis.kappa.toFixed(4):'κ incomplete')+'.</p><p><b>Interpretation:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>';
  return U.report('Waves Laboratory Practical 1 — Coupled Pendulums',summary);
}

U.tabs();
E('modeConclusion').value=s.conclusion;
['extraMass','m1pos','m2pos'].forEach(id=>E(id).addEventListener('input',()=>{resetInertia();renderAll();save();}));
['inertiaCursor1','inertiaCursor2'].forEach(id=>E(id).addEventListener('input',()=>drawPend(E('uncoupledCanvas'),'inertia')));
E('recordInertia').onclick=validateInertia;
E('coupling').addEventListener('change',()=>{resetCoupled();renderAll();save();});
['initial','beatCursor1','beatCursor2','beatTarget'].forEach(id=>E(id).addEventListener('input',()=>drawPend(E('coupledCanvas'),'beats')));
E('recordBeat').onclick=validateBeat;
['modeSelect','channel','modeCursor1','modeCursor2'].forEach(id=>E(id).addEventListener('input',()=>drawPend(E('modeCanvas'),'mode')));
E('recordMode').onclick=validateMode;E('checkAnalysis').onclick=checkAnalysis;
E('modeConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;overall();save();});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
if(s.coupled.analysis){E('studentKappa').value=s.coupled.analysis.kappa;E('studentBeatPred').value=s.coupled.analysis.beatPred;}
window.addEventListener('resize',renderAll);renderAll();save();
})();