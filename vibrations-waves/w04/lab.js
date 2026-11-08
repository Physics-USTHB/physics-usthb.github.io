(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W04_v3',REF_MU=1.10,TAU=Math.PI*2;
function makeRun(){return{id:'W04-'+Math.random().toString(36).slice(2,7).toUpperCase(),scale:1+(Math.random()-.5)*.006}}
let s=U.load(K,null);
if(!s||s.version!==3)s={version:3,run:makeRun(),records:[],analysis:null};
s.records=Array.isArray(s.records)?s.records:[];
function save(){U.save(K,s)}
function stringFrequency(){
  const L=+E('length').value/100,F=+E('tension').value,mu=+E('mu').value/1000;
  return s.run.scale*(1/(2*L))*Math.sqrt(F/mu);
}
function pulseFrequency(){return 2*stringFrequency()}
function pulsePeriod(){return 1/pulseFrequency()}
function setupCanvas(){const c=E('scope'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function draw(){
  const{x,w,h}=setupCanvas(),align=+E('align').value,L=+E('length').value/100,F=+E('tension').value,mu=+E('mu').value/1000,td=+E('tdiv').value/1000,screenT=10*td,Tp=pulsePeriod();
  x.fillStyle='#08161d';x.fillRect(0,0,w,h);
  x.strokeStyle='rgba(99,232,191,.15)';for(let i=0;i<=10;i++){const xx=w*i/10;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke()}for(let j=0;j<=8;j++){const yy=h*j/8;x.beginPath();x.moveTo(0,yy);x.lineTo(w,yy);x.stroke()}
  const top=h*.22,left=w*.12,right=w*.88;
  x.strokeStyle='#718894';x.lineWidth=2;x.beginPath();x.moveTo(left,top);x.lineTo(right,top);x.stroke();
  const amp=Math.max(6,20-Math.abs(align)*2.2),phase=.7,pts=[];for(let i=0;i<=700;i++){const u=i/700;pts.push({x:left+u*(right-left),y:top+amp*Math.sin(Math.PI*u)*Math.sin(phase)});}
  x.strokeStyle='#d69b25';x.lineWidth=2;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
  const detX=w*.74;x.fillStyle='#6bbad0';x.fillRect(detX-6,top-30+align*3,12,60);x.fillStyle='#c5edf6';x.fillRect(detX-3,top-4+align*3,6,8);
  x.fillStyle='#9bc3d3';x.font='600 11px system-ui';x.fillText('lamp / detector',detX-42,top-38);x.fillText('string',left,top-12);
  const pulseY=h*.70,base=h*.86,gain=Math.max(.12,1-Math.abs(align)/2.2),sigma=Math.max(1.8,w*.004);
  x.strokeStyle='#69e7ff';x.lineWidth=2;x.beginPath();
  for(let i=0;i<=1200;i++){const t=screenT*i/1200;let y=0;const k=Math.round(t/Tp);const dt=t-k*Tp;y=gain*Math.exp(-Math.pow(dt/(Tp*.08),2));const yy=base-y*(base-pulseY);i?x.lineTo(w*i/1200,yy):x.moveTo(0,yy);}x.stroke();
  x.fillStyle='#9bc3d3';x.fillText('detector pulses (2 per string cycle)',12,h*.58);
  x.setLineDash([5,4]);[['cursor1','#fff09a'],['cursor2','#ff9f8a']].forEach(([id,col])=>{const xx=(+E(id).value/10)*w;x.strokeStyle=col;x.beginPath();x.moveTo(xx,h*.54);x.lineTo(xx,h);x.stroke();});x.setLineDash([]);
  E('alignRead').textContent=align.toFixed(1)+' mm';E('lengthRead').textContent=(L*100).toFixed(0)+' cm';E('tensionRead').textContent=F.toFixed(0)+' N';E('cursor1Read').textContent=(+E('cursor1').value).toFixed(2)+' div';E('cursor2Read').textContent=(+E('cursor2').value).toFixed(2)+' div';
  if(Math.abs(align)>.35){E('msg').className='notice warn';E('msg').textContent='Detector alignment is off-centre. Adjust it close to 0 mm so the pulse train is strong and symmetric.';}
}
function clearEntry(){['studentPulses','studentDt','studentPulseF','studentStringF'].forEach(id=>E(id).value='')}
function seriesLabels(L,F,mu){
  const a=[];if(Math.abs(F-25)<1e-9&&Math.abs(mu-REF_MU)<1e-9)a.push('L');if(Math.abs(L-50)<1e-9&&Math.abs(mu-REF_MU)<1e-9)a.push('F');if(Math.abs(L-50)<1e-9&&Math.abs(F-15)<1e-9)a.push('μ');return a;
}
function record(){
  const align=+E('align').value;if(Math.abs(align)>.35){E('msg').className='notice warn';E('msg').textContent='Centre the detector first; the resting string must mask the junction.';return}
  const td=+E('tdiv').value/1000,t1=+E('cursor1').value*td,t2=+E('cursor2').value*td,dt=t2-t1,Tp=pulsePeriod();
  if(dt<=0){E('msg').className='notice warn';E('msg').textContent='Cursor 2 must lie to the right of cursor 1.';return}
  const k1=Math.round(t1/Tp),k2=Math.round(t2/Tp),e1=Math.abs(t1-k1*Tp),e2=Math.abs(t2-k2*Tp),N=k2-k1;
  if(N<3||e1>.055*Tp||e2>.055*Tp){E('msg').className='notice warn';E('msg').textContent='Place both cursors on detector-pulse peaks at least three pulse intervals apart.';return}
  const raw=['studentPulses','studentDt','studentPulseF','studentStringF'].map(id=>E(id).value.trim());if(raw.some(v=>v==='')){E('msg').className='notice warn';E('msg').textContent='Enter N, Δt, pulse frequency and string frequency before validation.';return}
  const [n,dtMs,fp,fs]=raw.map(Number);if(!Number.isInteger(n)||n!==N){E('msg').className='notice warn';E('msg').textContent='Recount the detector-pulse intervals between the two cursors.';return}
  const calcDt=dt*1000;if(Math.abs(dtMs-calcDt)>Math.max(.015,.012*calcDt)){E('msg').className='notice warn';E('msg').textContent='Recalculate Δt from the cursor separation and TIME/DIV.';return}
  const calcFp=n/(dtMs/1000),calcFs=calcFp/2;if(Math.abs(fp-calcFp)>Math.max(.5,.012*calcFp)){E('msg').className='notice warn';E('msg').textContent='Recalculate pulse frequency N/Δt.';return}
  if(Math.abs(fs-calcFs)>Math.max(.3,.012*calcFs)){E('msg').className='notice warn';E('msg').textContent='The detector produces two pulses per mechanical cycle; use fstring=fpulse/2.';return}
  const L=+E('length').value,F=+E('tension').value,mu=+E('mu').value,sets=seriesLabels(L,F,mu);
  if(!sets.length){E('msg').className='notice warn';E('msg').textContent='This setting is useful for exploration but is not one of the prescribed log–log series. Use F=25 N, μ=1.10 for the L series; L=50 cm, μ=1.10 for F; or L=50 cm, F=15 N for μ.';return}
  const rec={L,F,mu,f:fs,sets},key=L+'|'+F+'|'+mu,i=s.records.findIndex(q=>q.L+'|'+q.F+'|'+q.mu===key);if(i>=0)s.records[i]=rec;else s.records.push(rec);s.analysis=null;
  E('msg').className='notice ok';E('msg').textContent='String-frequency measurement accepted for '+sets.join(' & ')+' series.';
  clearEntry();renderAll();save();
}
function points(kind){
  if(kind==='L')return s.records.filter(q=>q.sets.includes('L')).sort((a,b)=>a.L-b.L);
  if(kind==='F')return s.records.filter(q=>q.sets.includes('F')).sort((a,b)=>a.F-b.F);
  return s.records.filter(q=>q.sets.includes('μ')).sort((a,b)=>a.mu-b.mu);
}
function coverage(){
  const l=points('L'),f=points('F'),m=points('μ');
  return{l,f,m,lOK:l.length>=9&&l[0]?.L<=42&&l.at(-1)?.L>=78,fOK:f.length>=9&&f[0]?.F<=11&&f.at(-1)?.F>=29,mOK:new Set(m.map(q=>q.mu)).size===5};
}
function linfit(ps){const n=ps.length,mx=ps.reduce((a,p)=>a+p.x,0)/n,my=ps.reduce((a,p)=>a+p.y,0)/n;let nu=0,de=0;ps.forEach(p=>{nu+=(p.x-mx)*(p.y-my);de+=(p.x-mx)**2});return{a:my-(nu/de)*mx,b:nu/de}}
function fit(kind){
  const a=points(kind);if(a.length<3)return null;const ps=a.map(q=>({x:Math.log(kind==='L'?q.L/100:kind==='F'?q.F:q.mu/1000),y:Math.log(q.f)}));return{ps,...linfit(ps)};
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function charts(){
  for(const [kind,id,label] of [['L','lChart','log L (m)'],['F','fChart','log F (N)'],['μ','mChart','log μ (kg/m)']]){const q=fit(kind);if(q)U.plot(E(id),[{pts:q.ps}],{xlabel:label,ylabel:'log f'});else blank(E(id),'Record the prescribed '+kind+' series.');}
}
function checkExponents(){
  const c=coverage(),fa=fit('L'),fb=fit('F'),fg=fit('μ');if(!(c.lOK&&c.fOK&&c.mOK)){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Complete all three programmes: ≥9 broad L points, ≥9 broad F points, and all five μ strings.';return}
  const a=+E('studentAlpha').value,b=+E('studentBeta').value,g=+E('studentGamma').value;if([a,b,g].some(v=>!Number.isFinite(v))){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter all three log–log slopes.';return}
  if(Math.abs(a-fa.b)>.035){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Re-read the slope of log f versus log L.';return}
  if(Math.abs(b-fb.b)>.035){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Re-read the slope of log f versus log F.';return}
  if(Math.abs(g-fg.b)>.035){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Re-read the slope of log f versus log μ.';return}
  s.analysis={alpha:a,beta:b,gamma:g};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Exponent analysis accepted. Compare α≈−1, β≈+1/2 and γ≈−1/2 with the fundamental string law.';renderAll();save();
}
function table(){
  E('body').innerHTML=s.records.length?s.records.slice().sort((a,b)=>a.L-b.L||a.F-b.F||a.mu-b.mu).map(q=>'<tr><td>'+q.L.toFixed(0)+'</td><td>'+q.F.toFixed(0)+'</td><td>'+q.mu.toFixed(2)+'</td><td>'+q.f.toFixed(1)+'</td><td>'+q.sets.join(', ')+'</td></tr>').join(''):'<tr><td colspan="5">No validated string-frequency measurements yet.</td></tr>';
  const c=coverage();E('lCount').textContent=c.l.length+' / 9';E('fCount').textContent=c.f.length+' / 9';E('mCount').textContent=new Set(c.m.map(q=>q.mu)).size+' / 5';
  E('alphaOut').textContent=s.analysis?s.analysis.alpha.toFixed(3):'—';E('betaOut').textContent=s.analysis?s.analysis.beta.toFixed(3):'—';E('gammaOut').textContent=s.analysis?s.analysis.gamma.toFixed(3):'—';E('lawOut').textContent=s.analysis?'f ∝ L'+(s.analysis.alpha>=0?'+':'')+s.analysis.alpha.toFixed(2)+' F'+(s.analysis.beta>=0?'+':'')+s.analysis.beta.toFixed(2)+' μ'+(s.analysis.gamma>=0?'+':'')+s.analysis.gamma.toFixed(2):'—';
}
function renderAll(){draw();table();charts()}
function buildReport(){
  const c=coverage(),summary='<p><b>Validated series:</b> L '+c.l.length+', F '+c.f.length+', μ strings '+new Set(c.m.map(q=>q.mu)).size+'.</p><p><b>Log–log exponents:</b> '+(s.analysis?'α='+s.analysis.alpha.toFixed(3)+', β='+s.analysis.beta.toFixed(3)+', γ='+s.analysis.gamma.toFixed(3)+'.':'not validated.')+'</p>';
  return U.report('Wave Laboratory Practical IV — Vibrating String',summary);
}
U.tabs();
['align','length','tension','cursor1','cursor2'].forEach(id=>E(id).addEventListener('input',()=>{clearEntry();draw()}));['mu','tdiv'].forEach(id=>E(id).addEventListener('change',()=>{clearEntry();draw()}));
E('record').onclick=record;E('checkExponents').onclick=checkExponents;E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.analysis){E('studentAlpha').value=s.analysis.alpha;E('studentBeta').value=s.analysis.beta;E('studentGamma').value=s.analysis.gamma}
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',renderAll);renderAll();save();
})();