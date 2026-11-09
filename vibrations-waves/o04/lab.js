(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_O04_v4',C=68e-9,L=8.4e-3,E0=.40,QMODE=11,TAU=Math.PI*2,C0S=[33,47,68,100,150,220];
function blankRecords(){return Object.fromEntries(C0S.map(c=>[String(c),[]]))}
let s=U.load(K,null);
if(!s||s.version!==4)s={version:4,records:blankRecords(),analyses:{},conclusion:''};
for(const c of C0S)s.records[String(c)]=Array.isArray(s.records[String(c)])?s.records[String(c)]:[];
s.analyses=s.analyses||{};s.conclusion=s.conclusion||'';
function save(){U.save(K,s)}
function modes(c0n){
  const k=C/(C+c0n*1e-9),w=1/Math.sqrt(L*C),w1=w,w2=w*Math.sqrt(1+2*C/(c0n*1e-9));
  return{k,w,w1,w2,f0:w/TAU,f1:w1/TAU,f2:w2/TAU};
}
function cinv(re,im){const d=re*re+im*im;return{re:re/d,im:-im/d}}
function cadd(a,b){return{re:a.re+b.re,im:a.im+b.im}}
function csub(a,b){return{re:a.re-b.re,im:a.im-b.im}}
function response(c0n,f){
  const m=modes(c0n),d=(fj)=>{const x=f/fj;return cinv(1-x*x,x/QMODE)},a=d(m.f1),b=d(m.f2),h1=cadd(a,b),h2=csub(a,b);
  h1.re*=.5;h1.im*=.5;h2.re*=.5;h2.im*=.5;
  return{...m,V1:E0*Math.hypot(h1.re,h1.im),V2:E0*Math.hypot(h2.re,h2.im),p1:Math.atan2(h1.im,h1.re),p2:Math.atan2(h2.im,h2.re)};
}
function setupCanvas(){const c=E('scope'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function drawScope(){
  const{x,w,h}=setupCanvas();U.grid(x,w,h);const c0=+E('c0').value,f=+E('freq').value,r=response(c0,f),td=+E('tdiv').value*1e-6,v1=+E('vdiv1').value,v2=+E('vdiv2').value,Tview=10*td;
  E('freqRead').textContent=f.toFixed(0)+' Hz';
  const p1=[],p2=[];for(let i=0;i<=1000;i++){const t=Tview*i/1000,a=TAU*f*t;p1.push({x:w*i/1000,y:h/2-r.V1*Math.sin(a+r.p1)/v1*(h/8)});p2.push({x:w*i/1000,y:h/2-r.V2*Math.sin(a+r.p2)/v2*(h/8)});}
  x.strokeStyle='#ffd166';x.lineWidth=2;x.beginPath();p1.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
  x.strokeStyle='#69e7ff';x.beginPath();p2.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
}
function clearEntry(){['studentV1Div','studentV1','studentV2Div','studentV2'].forEach(id=>E(id).value='')}
function recordPoint(){
  const c0=+E('c0').value,f=+E('freq').value,r=response(c0,f),v1=+E('vdiv1').value,v2=+E('vdiv2').value,a1=r.V1/v1,a2=r.V2/v2;
  if(a1<.35||a1>3.7||a2<.35||a2>3.7){E('msg').className='notice warn';E('msg').textContent='Adjust the two vertical sensitivities independently so both V₁ and V₂ amplitudes are readable on the graticule.';return}
  const raw=['studentV1Div','studentV1','studentV2Div','studentV2'].map(id=>E(id).value.trim());if(raw.some(v=>v==='')){E('msg').className='notice warn';E('msg').textContent='Read both amplitudes in divisions and calculate V₀₁ and V₀₂ before validation.';return}
  const [d1,V1,d2,V2]=raw.map(Number);if([d1,V1,d2,V2].some(v=>!Number.isFinite(v)||v<=0)){E('msg').className='notice warn';E('msg').textContent='Enter positive amplitude readings and calculated voltages.';return}
  if(Math.abs(d1-a1)>.09||Math.abs(d2-a2)>.09){E('msg').className='notice warn';E('msg').textContent='Re-read the V₁ and V₂ peak amplitudes from their graticule scales.';return}
  if(Math.abs(V1-d1*v1)>Math.max(.004,.025*d1*v1)||Math.abs(V2-d2*v2)>Math.max(.004,.025*d2*v2)){E('msg').className='notice warn';E('msg').textContent='Recalculate each amplitude as divisions × its channel VOLT/DIV.';return}
  const arr=s.records[String(c0)],rec={f,V1,V2},i=arr.findIndex(q=>q.f===f);if(i>=0)arr[i]=rec;else arr.push(rec);arr.sort((a,b)=>a.f-b.f);delete s.analyses[String(c0)];
  E('msg').className='notice ok';E('msg').textContent='Amplitude point accepted. Continue across the full range and add 50–100 Hz spacing around both peaks and the antiresonance.';
  clearEntry();renderAll();save();
}
function density(arr,f){return arr.filter(q=>Math.abs(q.f-f)<=250).length}
function extremaFromData(c0){
  const a=s.records[String(c0)];if(a.length<18||a[0]?.f>1500||a.at(-1)?.f<17000)return null;
  const fbase=modes(c0).f0,lo=a.filter(q=>q.f<fbase),hi=a.filter(q=>q.f>fbase);if(lo.length<3||hi.length<3)return null;
  const p1=lo.reduce((m,q)=>q.V1>m.V1?q:m,lo[0]),p2=hi.reduce((m,q)=>q.V1>m.V1?q:m,hi[0]);
  if(p1.f>=p2.f)return null;
  const mid=a.filter(q=>q.f>p1.f&&q.f<p2.f);if(!mid.length)return null;
  const mn=mid.reduce((m,q)=>q.V1<m.V1?q:m,mid[0]);
  if(density(a,p1.f)<3||density(a,p2.f)<3||density(a,mn.f)<3)return null;
  return{f1:p1.f,fmin:mn.f,f2:p2.f,K:(p2.f*p2.f-p1.f*p1.f)/(p2.f*p2.f+p1.f*p1.f)};
}
function loadAnalysis(){
  const c0=E('analysisC0').value,a=s.analyses[c0];['studentF1','studentFmin','studentF2','studentK'].forEach(id=>E(id).value='');
  if(a){E('studentF1').value=a.f1;E('studentFmin').value=a.fmin;E('studentF2').value=a.f2;E('studentK').value=a.K}
  renderAnalysisMetrics();drawResponseChart();
}
function checkExtrema(){
  const c0=+E('analysisC0').value,m=extremaFromData(c0);
  if(!m){E('extremaMsg').className='notice warn';E('extremaMsg').textContent='The selected scan needs at least 18 points, broad 1–18 kHz coverage, and several close points around each peak and the intervening V₁ minimum.';return}
  const f1=+E('studentF1').value,fm=+E('studentFmin').value,f2=+E('studentF2').value,Kv=+E('studentK').value;
  if([f1,fm,f2,Kv].some(v=>!Number.isFinite(v))||f1<=0||fm<=0||f2<=0||Kv<=0){E('extremaMsg').className='notice warn';E('extremaMsg').textContent='Enter f₁, fmin, f₂ and K.';return}
  if(Math.abs(f1-m.f1)>60||Math.abs(fm-m.fmin)>60||Math.abs(f2-m.f2)>60){E('extremaMsg').className='notice warn';E('extremaMsg').textContent='Re-read both V₁ resonance peaks and the antiresonance minimum from your measured curve.';return}
  const calcK=(f2*f2-f1*f1)/(f2*f2+f1*f1);if(Math.abs(Kv-calcK)>.008){E('extremaMsg').className='notice warn';E('extremaMsg').textContent='Recalculate K=(f₂²−f₁²)/(f₂²+f₁²).';return}
  s.analyses[String(c0)]={f1,fmin:fm,f2,K:Kv};E('extremaMsg').className='notice ok';E('extremaMsg').textContent='Resonances, antiresonance and coupling accepted. Repeat the scan for another C₀.';
  renderAll();save();
}
function drawResponseChart(){
  const c0=+E('analysisC0').value,a=s.records[String(c0)];
  if(a.length)U.plot(E('chart'),[{pts:a.map(q=>({x:q.f,y:q.V1})),color:'#d79a38'},{pts:a.map(q=>({x:q.f,y:q.V2})),color:'#2baac3'}],{xlabel:'frequency / Hz',ylabel:'measured amplitude / V',xmin:1000,xmax:15000,ymin:0});
  else blank(E('chart'),'Record V₀₁ and V₀₂ points for this C₀.');
}
function drawCouplingChart(){
  const a=C0S.map(c0=>s.analyses[String(c0)]).filter(Boolean),s1=[],s2=[];a.forEach(q=>{s1.push({x:q.K,y:(TAU*q.f1)**2/1e9});s2.push({x:q.K,y:(TAU*q.f2)**2/1e9});});
  if(a.length)U.plot(E('kChart'),[{pts:s1,color:'#2baac3'},{pts:s2,color:'#df8746'}],{xlabel:'accepted K',ylabel:'ω² / 10⁹ s⁻²',xmin:0,xmax:.75,ymin:0});
  else blank(E('kChart'),'Validate coupling sets to build ω₁²(K) and ω₂²(K).');
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function renderTable(){
  const c0=+E('c0').value,a=s.records[String(c0)];E('pointCount').textContent=a.length;E('rangeOut').textContent=a.length?(a[0].f.toFixed(0)+'–'+a.at(-1).f.toFixed(0)+' Hz'):'—';
  E('body').innerHTML=a.length?a.map(q=>'<tr><td>'+q.f.toFixed(0)+'</td><td>'+q.V1.toFixed(3)+'</td><td>'+q.V2.toFixed(3)+'</td></tr>').join(''):'<tr><td colspan="3">No validated points for this C₀ yet.</td></tr>';
}
function renderAnalysisMetrics(){
  const a=s.analyses[E('analysisC0').value];E('f1Out').textContent=a?a.f1.toFixed(0)+' Hz':'—';E('fmOut').textContent=a?a.fmin.toFixed(0)+' Hz':'—';E('f2Out').textContent=a?a.f2.toFixed(0)+' Hz':'—';E('kOut').textContent=a?a.K.toFixed(3):'—';
  const n=C0S.filter(c=>s.analyses[String(c)]).length,words=s.conclusion.trim().length>=35;
  E('analysisMsg').className=n>=3?'notice ok':'notice';E('analysisMsg').textContent=n>=3?'At least three coupling settings are validated; use the graph to compare the two ω² branches.':'Validate at least three C₀ settings to build ω₁²(K) and ω₂²(K).';
  E('progress').innerHTML='<div class="item '+(n>=3?'done':'')+'">'+(n>=3?'✓':'○')+' ≥3 coupling scans analysed ('+n+')</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' antiresonance/coupling interpretation</div>';
}
function renderAll(){drawScope();renderTable();drawResponseChart();drawCouplingChart();renderAnalysisMetrics()}
function syncC0(){clearEntry();renderAll()}
function clearSelected(){
  const c0=String(+E('c0').value);if(s.records[c0].length&&!confirm('Clear the frequency scan for C₀ = '+c0+' nF?'))return;s.records[c0]=[];delete s.analyses[c0];clearEntry();renderAll();save();
}
function buildReport(){
  const sets=C0S.filter(c=>s.analyses[String(c)]).map(c=>{const a=s.analyses[String(c)];return'C₀='+c+' nF: f₁='+a.f1.toFixed(0)+' Hz, fmin='+a.fmin.toFixed(0)+' Hz, f₂='+a.f2.toFixed(0)+' Hz, K='+a.K.toFixed(3)}).join(' · ');
  const summary='<p><b>Validated coupling sets:</b> '+(sets||'none yet')+'.</p><p><b>Interpretation:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>';
  return U.report('Laboratory Practical 4 — Forced Oscillations — 2 Degrees of Freedom',summary);
}
U.tabs();E('couplingConclusion').value=s.conclusion;
['freq','tdiv','vdiv1','vdiv2'].forEach(id=>E(id).addEventListener('input',()=>{clearEntry();drawScope()}));E('c0').addEventListener('change',syncC0);
E('record').onclick=recordPoint;E('newRun').onclick=clearSelected;E('analysisC0').addEventListener('change',loadAnalysis);E('checkExtrema').onclick=checkExtrema;
E('couplingConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;renderAnalysisMetrics();save()});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',renderAll);loadAnalysis();renderAll();save();
})();