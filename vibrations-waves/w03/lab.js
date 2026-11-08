(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W03_v2',OLD='VOM_W03_v1',g=9.81,MU=.00125;
const current=U.load(K,null),old=U.load(OLD,null);
let s=current||{version:2,mu:null,records:[],analysis:null,conclusion:''};
if(!current&&old)s={version:2,mu:null,records:[],analysis:null,conclusion:''};
s.records=Array.isArray(s.records)?s.records:[];s.conclusion=s.conclusion||'';
function save(){U.save(K,s)}
function model(){
  const mass=+E('mass').value/1000,F=mass*g,f=+E('freq').value,L=+E('length').value/100,v=Math.sqrt(F/MU);
  let n=Math.round(2*L*f/v);n=Math.max(1,Math.min(8,n));
  const Lres=n*v/(2*f),err=Math.abs(L-Lres);
  return{mass,F,f,L,v,n,Lres,err,resonant:err<.008};
}
function draw(){
  const {x,w,h}=U.canvas(E('stringCanvas')),m=model(),pad=35,base=h*.50;
  x.fillStyle='#eef5f6';x.fillRect(0,0,w,h);
  x.strokeStyle='#607583';x.lineWidth=4;x.beginPath();x.moveTo(pad,base);x.lineTo(w-pad,base);x.stroke();
  const amp=m.resonant?h*.25:Math.max(h*.025,h*.18*(1-m.err/.08)),pts=[];
  for(let i=0;i<=900;i++){const u=i/900,y=base-amp*Math.sin(m.n*Math.PI*u);pts.push({x:pad+u*(w-2*pad),y});}
  x.strokeStyle=m.resonant?'#27a5be':'#718996';x.lineWidth=m.resonant?3:2;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
  for(let k=0;k<=m.n;k++){const xx=pad+(w-2*pad)*k/m.n;x.fillStyle='#c76947';x.beginPath();x.arc(xx,base,4,0,Math.PI*2);x.fill();}
  x.fillStyle='#173e58';x.font='700 12px system-ui';x.fillText('driver',pad-10,base+28);x.fillText('pulley / mass',w-pad-75,base+28);
  E('massRead').textContent=(m.mass*1000).toFixed(0)+' g';E('lengthRead').textContent=(m.L*100).toFixed(1)+' cm';E('resonance').textContent=m.resonant?'stable standing wave':'search';
  E('nodeRead').textContent=m.resonant?'count the visible half-waves':'—';
}
function checkMu(){
  const raw=E('studentMu').value.trim(),v=+raw;if(raw===''||!Number.isFinite(v)||v<=0){E('muStatus').textContent='enter μ';return;}
  if(Math.abs(v-MU)>.00003){E('muStatus').textContent='recheck mass / length';return;}
  s.mu=v;E('muStatus').textContent='validated: '+v.toFixed(5)+' kg·m⁻¹';save();
}
function clearPointInputs(){['studentF','studentLambda','studentV','studentVTheory'].forEach(id=>E(id).value='')}
function record(){
  const m=model();
  if(s.mu==null){E('msg').className='notice warn';E('msg').textContent='Validate the string linear density first.';return;}
  if(!m.resonant){E('msg').className='notice warn';E('msg').textContent='Tune the string length until a stable standing-wave pattern is visible.';return;}
  const n=+E('mode').value;if(n!==m.n){E('msg').className='notice warn';E('msg').textContent='Recount the visible half-waves; the selected n does not match the standing-wave pattern.';return;}
  const raw=['studentF','studentLambda','studentV','studentVTheory'].map(id=>E(id).value.trim());if(raw.some(v=>v==='')){E('msg').className='notice warn';E('msg').textContent='Calculate F, λ, measured v and theoretical v before validation.';return;}
  const [F,lambda,v,vth]=raw.map(Number),Fc=m.mass*g,lc=2*m.L/n,vc=m.f*lc,vtheory=Math.sqrt(Fc/s.mu);
  if(Math.abs(F-Fc)>.015){E('msg').className='notice warn';E('msg').textContent='Recalculate the tension F=mg.';return;}
  if(Math.abs(lambda-lc)>.006){E('msg').className='notice warn';E('msg').textContent='Recalculate λ=2L/n from the resonant length and counted half-waves.';return;}
  if(Math.abs(v-vc)>.5){E('msg').className='notice warn';E('msg').textContent='Recalculate v=fλ.';return;}
  if(Math.abs(vth-vtheory)>.5){E('msg').className='notice warn';E('msg').textContent='Recalculate v=√(F/μ) with your validated μ.';return;}
  const rec={mass:m.mass,F,f:m.f,n,L:m.L,lambda,v,vtheory},key=[m.mass,m.f,n].join('|'),i=s.records.findIndex(q=>[q.mass,q.f,q.n].join('|')===key);
  if(i>=0)s.records[i]=rec;else s.records.push(rec);s.analysis=null;clearPointInputs();
  E('msg').className='notice ok';E('msg').textContent='Resonant point accepted. Change tension and/or frequency and repeat with a new standing-wave condition.';
  renderAll();save();
}
function coverage(){
  const masses=new Set(s.records.map(q=>q.mass.toFixed(4))),freqs=new Set(s.records.map(q=>q.f.toFixed(1)));
  return s.records.length>=6&&masses.size>=3&&freqs.size>=2;
}
function originSlope(ps){let xy=0,xx=0;ps.forEach(p=>{xy+=p.x*p.y;xx+=p.x*p.x});return xx?xy/xx:NaN}
function fit(){
  if(!coverage())return null;const ps=s.records.map(q=>({x:q.F,y:q.v*q.v})),slope=originSlope(ps);return{ps,slope,mu:1/slope};
}
function checkAnalysis(){
  const q=fit();if(!q){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Record at least six resonances spanning at least three tensions and two frequencies.';return;}
  const slope=+E('studentSlope').value,mu=+E('studentMuFit').value;
  if(!Number.isFinite(slope)||!Number.isFinite(mu)||slope<=0||mu<=0){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Enter the fitted slope and μ from its reciprocal.';return;}
  if(Math.abs(slope-q.slope)>Math.max(8,.035*q.slope)){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Re-read the origin-constrained slope of v² versus F.';return;}
  if(Math.abs(mu-1/slope)>.00003){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate μ=1/slope.';return;}
  s.analysis={slope,mu};E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Graph analysis accepted. Compare this μ with the direct sample calibration and discuss experimental scatter.';
  renderAll();save();
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function charts(){
  if(s.records.length){
    const sorted=s.records.slice().sort((a,b)=>a.F-b.F);U.plot(E('speedChart'),[{pts:sorted.map(q=>({x:q.F,y:q.v})),color:'#28a8bd'},{pts:sorted.map(q=>({x:q.F,y:q.vtheory})),color:'#d18d32'}],{xlabel:'tension F / N',ylabel:'wave speed / m·s⁻¹',xmin:0,ymin:0});
    U.plot(E('forceChart'),[{pts:sorted.map(q=>({x:q.F,y:q.v*q.v}))}],{xlabel:'tension F / N',ylabel:'v² / m²·s⁻²',xmin:0,ymin:0});
  }else{blank(E('speedChart'),'Validate resonances to build the speed graph.');blank(E('forceChart'),'Validate resonances to build v²(F).');}
}
function renderTable(){
  E('body').innerHTML=s.records.length?s.records.map(q=>'<tr><td>'+(q.mass*1000).toFixed(0)+'</td><td>'+q.F.toFixed(3)+'</td><td>'+q.f.toFixed(0)+'</td><td>'+q.n+'</td><td>'+(q.L*100).toFixed(1)+'</td><td>'+q.lambda.toFixed(3)+'</td><td>'+q.v.toFixed(2)+'</td><td>'+q.vtheory.toFixed(2)+'</td></tr>').join(''):'<tr><td colspan="8">No validated resonances yet.</td></tr>';
  const masses=new Set(s.records.map(q=>q.mass.toFixed(4))).size,freqs=new Set(s.records.map(q=>q.f.toFixed(1))).size;
  E('progress').innerHTML='<div class="item '+(s.mu!=null?'done':'')+'">'+(s.mu!=null?'✓':'○')+' μ calibration</div><div class="item '+(s.records.length>=6?'done':'')+'">'+(s.records.length>=6?'✓':'○')+' ≥6 resonances ('+s.records.length+')</div><div class="item '+(masses>=3?'done':'')+'">'+(masses>=3?'✓':'○')+' ≥3 tensions</div><div class="item '+(freqs>=2?'done':'')+'">'+(freqs>=2?'✓':'○')+' ≥2 frequencies</div>';
  E('countOut').textContent=s.records.length;E('muFitOut').textContent=s.analysis?s.analysis.mu.toFixed(5)+' kg/m':'—';
  if(s.records.length){const err=s.records.reduce((a,q)=>a+Math.abs(q.v-q.vtheory)/q.vtheory,0)/s.records.length*100;E('errOut').textContent=err.toFixed(1)+'%';}else E('errOut').textContent='—';
}
function status(){
  const done=!!s.analysis&&s.conclusion.trim().length>=30;if(done){E('analysisMessage').className='notice ok';E('analysisMessage').textContent='String-wave analysis complete. Compare μ from the graph with the direct mass/length calibration and discuss resonance uncertainty.';}
}
function renderAll(){draw();renderTable();charts();status();}
function buildReport(){
  const summary='<p><b>Linear density:</b> direct '+(s.mu!=null?s.mu.toFixed(5)+' kg/m':'not validated')+'; graph '+(s.analysis?s.analysis.mu.toFixed(5)+' kg/m':'not validated')+'. <b>Validated resonances:</b> '+s.records.length+'.</p><p><b>Interpretation:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>';
  return U.report('Waves Laboratory Practical 3 — Waves on a String',summary);
}
U.tabs();E('stringConclusion').value=s.conclusion;
['mass','freq','length','mode'].forEach(id=>E(id).addEventListener('input',draw));E('checkMu').onclick=checkMu;E('record').onclick=record;E('checkAnalysis').onclick=checkAnalysis;
E('stringConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;status();save();});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
if(s.mu!=null){E('studentMu').value=s.mu;E('muStatus').textContent='validated: '+s.mu.toFixed(5)+' kg·m⁻¹';}
if(s.analysis){E('studentSlope').value=s.analysis.slope;E('studentMuFit').value=s.analysis.mu;}
window.addEventListener('resize',renderAll);renderAll();save();
})();