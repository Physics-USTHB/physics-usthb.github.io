(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W02_v2',OLD='VOM_W02_v1';
const f0=.65,w0=2*Math.PI*f0,betas={0:0,1:.08,2:.18,3:.32};
const current=U.load(K,null),old=U.load(OLD,null);
let s=current||{version:2,free:{},forced:{1:[],2:[],3:[]},analysis:{1:null,2:null,3:null},conclusion:''};
if(!current&&old)s={version:2,free:{},forced:{1:[],2:[],3:[]},analysis:{1:null,2:null,3:null},conclusion:''};
s.free=s.free||{};s.forced=s.forced||{1:[],2:[],3:[]};s.analysis=s.analysis||{1:null,2:null,3:null};s.conclusion=s.conclusion||'';
for(const d of [1,2,3]){s.forced[d]=Array.isArray(s.forced[d])?s.forced[d]:[];if(!(d in s.analysis))s.analysis[d]=null}
function save(){U.save(K,s)}
function freePars(level=+E('freeDamping').value){
  const b=betas[level],wd=Math.sqrt(Math.max(1e-12,w0*w0-b*b)),T=2*Math.PI/wd,A=+E('freeAmp').value;
  return{level,b,wd,T,A,delta:b*T,Q:b>0?Math.PI/(b*T):Infinity};
}
function freeX(t,p=freePars()){return p.A*Math.exp(-p.b*t)*Math.cos(p.wd*t)}
function ampDiv(t,p=freePars()){return Math.abs(freeX(t,p))/10}
function drawFree(){
  const {x,w,h}=U.canvas(E('freeCanvas')),p=freePars(),span=12,pts=[];
  x.fillStyle='#eef5f6';x.fillRect(0,0,w,h);
  const cx=w*.18,cy=h*.31,R=Math.min(65,h*.22),ang=.65*Math.cos(p.wd*.55)*Math.exp(-p.b*.55);
  x.strokeStyle='#607583';x.lineWidth=8;x.beginPath();x.arc(cx,cy,R,0,Math.PI*2);x.stroke();x.strokeStyle='#c96a45';x.lineWidth=4;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+R*.8*Math.cos(ang),cy+R*.8*Math.sin(ang));x.stroke();
  const left=w*.32,right=w-18,y0=h*.50,gh=h*.62;
  x.strokeStyle='rgba(42,82,99,.15)';x.lineWidth=1;for(let k=0;k<=8;k++){const xx=left+(right-left)*k/8;x.beginPath();x.moveTo(xx,y0-gh/2);x.lineTo(xx,y0+gh/2);x.stroke();}
  for(let i=0;i<=900;i++){const t=span*i/900,y=freeX(t,p)/Math.max(p.A,1);pts.push({x:left+(right-left)*i/900,y:y0-y*gh*.43})}
  x.strokeStyle='#289db7';x.lineWidth=2;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
  const c1=+E('freeCursor1').value,c2=+E('freeCursor2').value;x.setLineDash([4,3]);
  [[c1,'#7356a7'],[c2,'#d75a4b']].forEach(([t,col])=>{x.strokeStyle=col;const xx=left+(right-left)*t/span;x.beginPath();x.moveTo(xx,y0-gh/2);x.lineTo(xx,y0+gh/2);x.stroke();});x.setLineDash([]);
  E('freeT1').textContent=c1.toFixed(3)+' s';E('freeT2').textContent=c2.toFixed(3)+' s';E('freeA1').textContent=ampDiv(c1,p).toFixed(3);E('freeA2').textContent=ampDiv(c2,p).toFixed(3);
}
function extremumInfo(t,T){const half=T/2,k=Math.round(t/half);return{err:Math.abs(t-k*half),k}}
function validateFree(){
  const p=freePars(),t1=+E('freeCursor1').value,t2=+E('freeCursor2').value;
  if(t2<=t1){E('freeMsg').className='notice warn';E('freeMsg').textContent='Cursor t₂ must be later than t₁.';return}
  const e1=extremumInfo(t1,p.T),e2=extremumInfo(t2,p.T),sameSign=(e2.k-e1.k)%2===0;
  if(e1.err>.05*p.T||e2.err>.05*p.T||!sameSign){E('freeMsg').className='notice warn';E('freeMsg').textContent='Place both cursors on same-sign extrema.';return}
  const raw=[E('freeCycles').value.trim(),E('studentFreeT').value.trim(),E('studentLogdec').value.trim(),E('studentFreeQ').value.trim()];
  if(raw.slice(0,3).some(v=>v==='')){E('freeMsg').className='notice warn';E('freeMsg').textContent='Enter N, T and logarithmic decrement.';return}
  const N=+raw[0],T=+raw[1],delta=+raw[2],A1=ampDiv(t1,p),A2=ampDiv(t2,p),Tc=(t2-t1)/N,dc=p.level===0?0:Math.log(A1/A2)/N;
  if(!Number.isInteger(N)||N<3){E('freeMsg').className='notice warn';E('freeMsg').textContent='Use at least three full periods.';return}
  if(Math.abs((t2-t1)-N*p.T)>Math.max(.04,.04*N*p.T)){E('freeMsg').className='notice warn';E('freeMsg').textContent='Recount the full periods between the cursors.';return}
  if(Math.abs(T-Tc)>.012){E('freeMsg').className='notice warn';E('freeMsg').textContent='Recalculate T=(t₂−t₁)/N.';return}
  if(Math.abs(delta-dc)>.008){E('freeMsg').className='notice warn';E('freeMsg').textContent=p.level===0?'With zero damping, δ should be approximately zero.':'Recalculate δ=(1/N)ln(A₁/A₂).';return}
  let Q=null;
  if(p.level>0){
    if(raw[3]===''){E('freeMsg').className='notice warn';E('freeMsg').textContent='Calculate Q≈π/δ for the damped case.';return}
    Q=+raw[3];const qc=Math.PI/delta;if(!Number.isFinite(Q)||Math.abs(Q-qc)>Math.max(.15,.03*qc)){E('freeMsg').className='notice warn';E('freeMsg').textContent='Recalculate Q≈π/δ.';return}
  }
  s.free[String(p.level)]={level:p.level,N,T,delta,Q,A1,A2};['freeCycles','studentFreeT','studentLogdec','studentFreeQ'].forEach(id=>E(id).value='');
  E('freeMsg').className='notice ok';E('freeMsg').textContent='Free-decay measurement accepted. Repeat for the remaining damping settings.';
  renderAll();save();
}

function forcedResponse(f,d=+E('forcedDamping').value){
  const b=betas[d],w=2*Math.PI*f,den=Math.sqrt((w0*w0-w*w)**2+(2*b*w)**2),A=1/den,phi=-Math.atan2(2*b*w,w0*w0-w*w)*180/Math.PI;
  return{A,phi};
}
function drawForced(){
  const {x,w,h}=U.canvas(E('forcedCanvas')),f=+E('driveF').value,d=+E('forcedDamping').value,r=forcedResponse(f,d);
  x.fillStyle='#eef5f6';x.fillRect(0,0,w,h);
  const cx=w*.27,cy=h*.43,R=Math.min(75,h*.27),driveAng=2*Math.PI*.12,responseAng=driveAng+r.phi*Math.PI/180;
  x.strokeStyle='#5e7280';x.lineWidth=8;x.beginPath();x.arc(cx,cy,R,0,Math.PI*2);x.stroke();
  x.strokeStyle='#d09a2c';x.lineWidth=3;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+R*.86*Math.cos(driveAng),cy+R*.86*Math.sin(driveAng));x.stroke();
  x.strokeStyle='#269bb4';x.lineWidth=4;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+R*.65*Math.cos(responseAng),cy+R*.65*Math.sin(responseAng));x.stroke();
  x.fillStyle='#173e58';x.font='700 12px system-ui';x.fillText('drive',w*.48,h*.32);x.fillStyle='#269bb4';x.fillText('response',w*.48,h*.43);
  E('forcedA').value=r.A.toFixed(3);E('forcedPhi').value=r.phi.toFixed(1);
}
function recordForced(){
  const d=+E('forcedDamping').value,f=+E('driveF').value,r=forcedResponse(f,d),arr=s.forced[d],rec={f,A:r.A,phi:r.phi},i=arr.findIndex(q=>Math.abs(q.f-f)<1e-9);
  if(i>=0)arr[i]=rec;else arr.push(rec);arr.sort((a,b)=>a.f-b.f);s.analysis[d]=null;
  E('forcedMsg').className='notice ok';E('forcedMsg').textContent='Point recorded. Continue across both sides of resonance and add closer points near the peak and half-power crossings.';
  renderAll();save();
}
function modelMetrics(d){
  const pts=[];for(let f=.2;f<=1.2;f+=.0005){const r=forcedResponse(f,d);pts.push({f,A:r.A})}
  let peak=pts[0];for(const p of pts)if(p.A>peak.A)peak=p;
  const target=peak.A/Math.sqrt(2);let f1=null,f2=null;
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i];if(a.f<peak.f&&((a.A-target)*(b.A-target)<=0)){const t=(target-a.A)/(b.A-a.A);f1=a.f+t*(b.f-a.f)}
    if(a.f>peak.f&&f2==null&&((a.A-target)*(b.A-target)<=0)){const t=(target-a.A)/(b.A-a.A);f2=a.f+t*(b.f-a.f)}
  }
  return{fr:peak.f,Amax:peak.A,f1,f2,df:f2-f1,Q:peak.f/(f2-f1)};
}
function coverageOK(d,m){
  const a=s.forced[d];if(a.length<14)return false;
  const min=a[0].f,max=a.at(-1).f,near=x=>a.some(p=>Math.abs(p.f-x)<=.035);
  return min<=Math.max(.2,m.f1-.05)&&max>=Math.min(1.2,m.f2+.05)&&near(m.fr)&&near(m.f1)&&near(m.f2);
}
function checkResonance(){
  const d=+E('analysisDamping').value,m=modelMetrics(d);
  if(!coverageOK(d,m)){E('resAnalysisMessage').className='notice warn';E('resAnalysisMessage').textContent='The selected damping curve is not dense enough. Record at least 14 points and include close points near the peak and both half-power crossings.';return}
  const ids=['studentFr','studentAmax','studentF1','studentF2','studentDf','studentQ'],raw=ids.map(id=>E(id).value.trim());
  if(raw.some(v=>v==='')){E('resAnalysisMessage').className='notice warn';E('resAnalysisMessage').textContent='Enter all resonance metrics.';return}
  const [fr,Amax,f1,f2,df,Q]=raw.map(Number);
  if(Math.abs(fr-m.fr)>.025||Math.abs(Amax-m.Amax)>Math.max(.04,.035*m.Amax)||Math.abs(f1-m.f1)>.03||Math.abs(f2-m.f2)>.03){E('resAnalysisMessage').className='notice warn';E('resAnalysisMessage').textContent='Re-read the resonance peak and the Amax/√2 crossings from your recorded curve.';return}
  if(Math.abs(df-(f2-f1))>.008){E('resAnalysisMessage').className='notice warn';E('resAnalysisMessage').textContent='Recalculate Δf=f₂−f₁.';return}
  if(Math.abs(Q-fr/df)>Math.max(.12,.03*(fr/df))){E('resAnalysisMessage').className='notice warn';E('resAnalysisMessage').textContent='Recalculate Q=fᵣ/Δf.';return}
  s.analysis[d]={fr,Amax,f1,f2,df,Q};E('resAnalysisMessage').className='notice ok';E('resAnalysisMessage').textContent='Resonance analysis accepted. Repeat for the other damping settings.';
  loadAnalysis();renderAll();save();
}
function loadAnalysis(){
  const d=+E('analysisDamping').value,a=s.analysis[d];['studentFr','studentAmax','studentF1','studentF2','studentDf','studentQ'].forEach(id=>E(id).value='');
  if(a){E('studentFr').value=a.fr;E('studentAmax').value=a.Amax;E('studentF1').value=a.f1;E('studentF2').value=a.f2;E('studentDf').value=a.df;E('studentQ').value=a.Q}
}

function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function drawCharts(){
  const colors={1:'#2aaac1',2:'#d09a2c',3:'#d85d4b'},amp=[],ph=[];
  for(const d of [1,2,3])if(s.forced[d].length){amp.push({pts:s.forced[d].map(q=>({x:q.f,y:q.A})),color:colors[d]});ph.push({pts:s.forced[d].map(q=>({x:q.f,y:q.phi})),color:colors[d]})}
  if(amp.length)U.plot(E('resChart'),amp,{xlabel:'drive frequency / Hz',ylabel:'amplitude',xmin:.2,xmax:1.2,ymin:0});else blank(E('resChart'),'Record forced-response sweeps to build resonance curves.');
  if(ph.length)U.plot(E('phaseChart'),ph,{xlabel:'drive frequency / Hz',ylabel:'phase lag / °',xmin:.2,xmax:1.2,ymin:-190,ymax:5});else blank(E('phaseChart'),'Record sweeps to build phase curves.');
}
function renderTables(){
  const last=s.free[String(E('freeDamping').value)]||Object.values(s.free).at(-1);
  E('freeT').textContent=last?last.T.toFixed(4)+' s':'—';E('logdec').textContent=last?last.delta.toFixed(4):'—';E('freeQ').textContent=last?(last.Q==null?'∞':last.Q.toFixed(2)):'—';E('freeLevel').textContent=Object.keys(s.free).length+' / 4';
  E('freeBody').innerHTML=[0,1,2,3].map(d=>{const q=s.free[String(d)];return'<tr><td>'+d+'</td><td>'+(q?q.N:'—')+'</td><td>'+(q?q.T.toFixed(4):'—')+'</td><td>'+(q?q.delta.toFixed(4):'—')+'</td><td>'+(q?(q.Q==null?'∞':q.Q.toFixed(2)):'—')+'</td></tr>'}).join('');
  const all=[1,2,3].flatMap(d=>s.forced[d].map(q=>({...q,d})));E('forcedBody').innerHTML=all.length?all.map(q=>'<tr><td>'+q.d+'</td><td>'+q.f.toFixed(2)+'</td><td>'+q.A.toFixed(3)+'</td><td>'+q.phi.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="4">No forced-response points yet.</td></tr>';
  [1,2,3].forEach(d=>E('forcedCount'+d).textContent=s.forced[d].length);E('forcedAnalysed').textContent=[1,2,3].filter(d=>!!s.analysis[d]).length+' / 3';
  const a=s.analysis[+E('analysisDamping').value];E('frOut').textContent=a?a.fr.toFixed(3)+' Hz':'—';E('amaxOut').textContent=a?a.Amax.toFixed(3):'—';E('halfOut').textContent=a?a.f1.toFixed(3)+' / '+a.f2.toFixed(3)+' Hz':'—';E('qOut').textContent=a?a.Q.toFixed(2):'—';
}
function status(){
  const freeDone=Object.keys(s.free).length===4,forcedDone=[1,2,3].every(d=>!!s.analysis[d]),textDone=s.conclusion.trim().length>=35,done=freeDone&&forcedDone&&textDone;
  E('analysisMessage').className=done?'notice ok':'notice';E('analysisMessage').textContent=done?'Pohl-resonator analysis complete. Compare Q from free decay with Q from resonance bandwidth and explain the damping trend.':'Complete all four free-decay sets and all three forced-resonance analyses.';
}
function renderAll(){drawFree();drawForced();renderTables();drawCharts();status();}
function buildReport(){
  const free=[0,1,2,3].map(d=>{const q=s.free[String(d)];return q?'d='+d+': T='+q.T.toFixed(4)+' s, δ='+q.delta.toFixed(4)+', Q='+(q.Q==null?'∞':q.Q.toFixed(2)):'d='+d+': incomplete'}).join(' · ');
  const forced=[1,2,3].map(d=>{const a=s.analysis[d];return a?'d='+d+': fr='+a.fr.toFixed(3)+' Hz, Δf='+a.df.toFixed(3)+' Hz, Q='+a.Q.toFixed(2):'d='+d+': incomplete'}).join(' · ');
  return U.report('Waves Laboratory Practical 2 — Pohl Torsion Resonator','<p><b>Free decay:</b> '+free+'.</p><p><b>Forced resonance:</b> '+forced+'.</p><p><b>Discussion:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>');
}

U.tabs();
E('pohlConclusion').value=s.conclusion;
['freeDamping','freeAmp','freeCursor1','freeCursor2'].forEach(id=>E(id).addEventListener('input',drawFree));E('recordFree').onclick=validateFree;
['forcedDamping','driveF'].forEach(id=>E(id).addEventListener('input',drawForced));E('recordForced').onclick=recordForced;
E('analysisDamping').addEventListener('change',()=>{loadAnalysis();renderTables();});E('checkResonance').onclick=checkResonance;
E('pohlConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;status();save();});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
loadAnalysis();window.addEventListener('resize',renderAll);renderAll();save();
})();