(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_O02_v2',f0=2.5,beta={low:.14,high:.42};
const old=U.load('VOM_O02_v1',null);
let s=U.load(K,null)||{version:2,low:Array.isArray(old?.low)?old.low:[],high:Array.isArray(old?.high)?old.high:[],analysis:{low:null,high:null},phaseConclusion:''};
if(s.version!==2)s={version:2,low:[],high:[],analysis:{low:null,high:null},phaseConclusion:''};
s.analysis=s.analysis||{low:null,high:null};s.phaseConclusion=s.phaseConclusion||'';
function save(){U.save(K,s)}
function responseAmp(f,d){const b=beta[d],num=f0*f0,den=Math.sqrt((f0*f0-f*f)**2+(2*b*f)**2);return num/den}
function responsePhase(f,d){return-Math.atan2(2*beta[d]*f,f0*f0-f*f)}
function drawScope(){
  const {x,w,h}=U.canvas(E('responseScope'));U.grid(x,w,h);
  const f=+E('freq').value,d=E('damping').value,A=responseAmp(f,d),phi=responsePhase(f,d),cycles=3,T=1/f;
  const drive=[],resp=[];
  for(let i=0;i<=900;i++){
    const t=cycles*T*i/900,xx=w*i/900,yd=Math.sin(2*Math.PI*f*t),yr=Math.sin(2*Math.PI*f*t+phi);
    drive.push({x:xx,y:h/2-yd*h*.25});resp.push({x:xx,y:h/2-yr*h*.25});
  }
  x.strokeStyle='#ffd166';x.lineWidth=2;x.beginPath();drive.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
  x.strokeStyle='#69e7ff';x.beginPath();resp.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
  E('ampRead').value=A.toFixed(3);E('phaseRead').value=(phi*180/Math.PI).toFixed(1);E('currentF').textContent=f.toFixed(2)+' Hz';
}
function record(){
  const d=E('damping').value,f=+E('freq').value,q={f,A:responseAmp(f,d),phi:responsePhase(f,d)*180/Math.PI};
  const arr=s[d],i=arr.findIndex(p=>Math.abs(p.f-f)<1e-9);if(i>=0)arr[i]=q;else arr.push(q);arr.sort((a,b)=>a.f-b.f);
  s.analysis[d]=null;
  E('msg').className='notice ok';E('msg').textContent='Point recorded. Continue across both sides of resonance and add closer points near the peak and half-power crossings.';
  render();save();
}
function modelMetrics(d){
  const pts=[];for(let f=.5;f<=4.5;f+=.001)pts.push({f,A:responseAmp(f,d)});
  let peak=pts[0];for(const p of pts)if(p.A>peak.A)peak=p;
  const target=peak.A/Math.sqrt(2);
  let f1=null,f2=null;
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i];
    if(a.f<peak.f&&((a.A-target)*(b.A-target)<=0)){const t=(target-a.A)/(b.A-a.A);f1=a.f+t*(b.f-a.f)}
    if(a.f>peak.f&&f2==null&&((a.A-target)*(b.A-target)<=0)){const t=(target-a.A)/(b.A-a.A);f2=a.f+t*(b.f-a.f)}
  }
  const df=f2-f1;return{fr:peak.f,Amax:peak.A,f1,f2,df,Q:peak.f/df,target};
}
function coverageOK(d,m){
  const a=s[d];if(a.length<12)return false;
  const min=a[0].f,max=a.at(-1).f,near=x=>a.some(p=>Math.abs(p.f-x)<=.12);
  return min<=m.f1-.1&&max>=m.f2+.1&&near(m.fr)&&near(m.f1)&&near(m.f2);
}
function checkAnalysis(){
  const d=E('analysisDamping').value,m=modelMetrics(d);
  if(!coverageOK(d,m)){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='The '+d+'-damping scan is not dense enough. Record at least 12 points with coverage below/above resonance and points near fᵣ, f₁ and f₂.';return}
  const ids=['studentFr','studentAmax','studentF1','studentF2','studentDf','studentQ'],raw=ids.map(id=>E(id).value.trim());
  if(raw.some(v=>v==='')){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Enter fᵣ, Amax, f₁, f₂, Δf and Q.';return}
  const [fr,Amax,f1,f2,df,Q]=raw.map(Number);
  if(Math.abs(fr-m.fr)>.08||Math.abs(Amax-m.Amax)>Math.max(.08,.035*m.Amax)||Math.abs(f1-m.f1)>.09||Math.abs(f2-m.f2)>.09){
    E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Re-read the resonance peak and the Amax/√2 crossings from your recorded curve.';return;
  }
  if(Math.abs(df-(f2-f1))>.025){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate Δf=f₂−f₁ from your own crossing frequencies.';return}
  if(Math.abs(Q-fr/df)>Math.max(.08,.025*(fr/df))){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate Q=fᵣ/Δf.';return}
  s.analysis[d]={fr,Amax,f1,f2,df,Q};E('analysisMessage').className='notice ok';E('analysisMessage').textContent=d+'-damping resonance analysis accepted. Repeat for the other damping level.';
  loadAnalysisFields();render();save();
}
function loadAnalysisFields(){
  const d=E('analysisDamping').value,a=s.analysis[d];['studentFr','studentAmax','studentF1','studentF2','studentDf','studentQ'].forEach(id=>E(id).value='');
  if(a){E('studentFr').value=a.fr;E('studentAmax').value=a.Amax;E('studentF1').value=a.f1;E('studentF2').value=a.f2;E('studentDf').value=a.df;E('studentQ').value=a.Q}
}
function drawCurves(){
  const colors={low:'#27abc0',high:'#df8d47'};
  const series=['low','high'].filter(d=>s[d].length).map(d=>({pts:s[d].map(p=>({x:p.f,y:p.A})),color:colors[d]}));
  if(series.length)U.plot(E('curveChart'),series,{xlabel:'drive frequency / Hz',ylabel:'response amplitude',xmin:.5,xmax:4.5,ymin:0});
  else blank(E('curveChart'),'Record resonance points to build A(f).');
  const ps=['low','high'].filter(d=>s[d].length).map(d=>({pts:s[d].map(p=>({x:p.f,y:p.phi})),color:colors[d]}));
  if(ps.length)U.plot(E('phaseChart'),ps,{xlabel:'drive frequency / Hz',ylabel:'phase lag / °',xmin:.5,xmax:4.5,ymin:-190,ymax:5});
  else blank(E('phaseChart'),'Record points to build φ(f).');
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function render(){
  drawScope();drawCurves();
  E('lowCount').textContent=s.low.length;E('highCount').textContent=s.high.length;E('analysisCount').textContent=(s.analysis.low?1:0)+(s.analysis.high?1:0)+' / 2';
  const a=s.analysis[E('analysisDamping').value];E('frOut').textContent=a?a.fr.toFixed(2)+' Hz':'—';E('bandOut').textContent=a?a.f1.toFixed(2)+' / '+a.f2.toFixed(2)+' Hz':'—';E('dfOut').textContent=a?a.df.toFixed(2)+' Hz':'—';E('qOut').textContent=a?a.Q.toFixed(2):'—';
  const lowReady=s.low.length>=12,highReady=s.high.length>=12,both=!!s.analysis.low&&!!s.analysis.high,phase=s.phaseConclusion.trim().length>=25;
  E('progress').innerHTML='<div class="item '+(lowReady?'done':'')+'">'+(lowReady?'✓':'○')+' low-damping scan</div><div class="item '+(highReady?'done':'')+'">'+(highReady?'✓':'○')+' high-damping scan</div><div class="item '+(both?'done':'')+'">'+(both?'✓':'○')+' bandwidth/Q analyses</div><div class="item '+(phase?'done':'')+'">'+(phase?'✓':'○')+' phase interpretation</div>';
  if(both&&phase){E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Both resonance analyses and the phase interpretation are complete. Compare how damping changes peak height, bandwidth and Q.'}
}
function buildReport(){
  const fmtA=d=>{const a=s.analysis[d];return a?d+': fr='+a.fr.toFixed(2)+' Hz, f1='+a.f1.toFixed(2)+' Hz, f2='+a.f2.toFixed(2)+' Hz, Δf='+a.df.toFixed(2)+' Hz, Q='+a.Q.toFixed(2):d+': incomplete'};
  const summary='<p><b>Resonance analyses:</b> '+fmtA('low')+' · '+fmtA('high')+'.</p><p><b>Phase interpretation:</b> '+U.esc(s.phaseConclusion||'Not completed.')+'</p>';
  return U.report('Laboratory Practical 2 — Forced Oscillations',summary);
}
U.tabs();
['damping','freq'].forEach(id=>E(id).addEventListener('input',drawScope));
E('record').onclick=record;E('checkAnalysis').onclick=checkAnalysis;
E('analysisDamping').addEventListener('change',()=>{loadAnalysisFields();render()});
E('phaseConclusion').value=s.phaseConclusion;E('phaseConclusion').addEventListener('input',e=>{s.phaseConclusion=e.target.value;render();save()});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
loadAnalysisFields();window.addEventListener('resize',render);render();save();
})();