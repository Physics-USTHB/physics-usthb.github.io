(()=>{'use strict';
const U=AtomicUI,E=id=>document.getElementById(id),K='ATOMIC_A03_v2',HC=1239.841984;
function makeRun(){return{id:'A03-'+Math.random().toString(36).slice(2,7).toUpperCase(),exc:4.86+Math.random()*.09,contact:.65+Math.random()*.7,phase:Math.random()*8}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,rows:[],analyses:{},interpretation:''};s.rows=Array.isArray(s.rows)?s.rows:[];s.analyses=s.analyses||{};s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function settings(){return{oven:+E('oven').value,R:+E('retarding').value,U:+E('accelerating').value}}
function offset(z){return s.run.contact+.62*z.R}
function current(z=settings()){
 const x=z.U-offset(z),tempFactor=Math.exp(-Math.pow((z.oven-175)/33,2));if(x<=0)return Math.max(0,.08+.02*Math.sin(z.U+s.run.phase));
 const envelope=1-Math.exp(-x/5.5),mod=1.05+.48*tempFactor*Math.cos(2*Math.PI*x/s.run.exc),base=4.5+1.8*Math.sqrt(x),noise=.10*Math.sin(z.U*1.73+z.R*2.1+s.run.phase);return Math.max(0,base*envelope*mod+noise);
}
function draw(){
 const q=U.canvas(E('fhCanvas')),x=q.x,w=q.w,h=q.h,z=settings(),I=current(z);x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.fillStyle='#aabcc5';x.fillRect(w*.17,h*.28,w*.66,h*.40);x.fillStyle='#d26b47';x.fillRect(w*.22,h*.40,15,h*.16);x.fillStyle='#7fb4ca';x.fillRect(w*.72,h*.35,12,h*.26);
 x.strokeStyle='#ffbd67';x.lineWidth=2;const n=Math.min(22,Math.max(2,Math.round(z.U/3)));for(let i=0;i<n;i++){const xx=w*(.27+.40*(i/(n-1||1))),yy=h*(.48+.08*Math.sin(i*2.1+s.run.phase));x.beginPath();x.arc(xx,yy,2.5,0,Math.PI*2);x.stroke()}
 x.fillStyle='#dcebed';x.font='700 12px system-ui';x.fillText('Hg vapour · oven '+z.oven+'°C',w*.31,h*.21);E('currentRead').value=I.toFixed(2)+' nA';
}
function clearEntry(){E('studentU').value='';E('studentI').value=''}
function keyOf(q){return q.oven+'|'+q.R.toFixed(1)}
function record(){
 const z=settings(),I=+E('studentI').value,U=+E('studentU').value,truth=current(z);if(!Number.isFinite(I)||!Number.isFinite(U)||I<0||U<0){E('msg').className='notice warn';E('msg').textContent='Read and enter the accelerating voltage and collector current.';return}
 if(Math.abs(U-z.U)>.11){E('msg').className='notice warn';E('msg').textContent='Use the accelerating-voltage reading shown on the supply.';return}
 if(Math.abs(I-truth)>.06){E('msg').className='notice warn';E('msg').textContent='Re-read the collector-current meter.';return}
 const row={oven:z.oven,R:z.R,U,I},k=s.rows.findIndex(q=>keyOf(q)===keyOf(row)&&q.U===row.U);if(k>=0)s.rows[k]=row;else s.rows.push(row);s.rows.sort((a,b)=>a.oven-b.oven||a.R-b.R||a.U-b.U);delete s.analyses[keyOf(row)];clearEntry();E('msg').className='notice ok';E('msg').textContent='Current point accepted. Continue the scan with closer spacing around visible extrema.';render();save();
}
function keys(){return [...new Set(s.rows.map(keyOf))]}
function rowsFor(k){return s.rows.filter(q=>keyOf(q)===k).sort((a,b)=>a.U-b.U)}
function parseKey(k){const [oven,R]=String(k).split('|').map(Number);return{oven,R}}
function targets(k){const z=parseKey(k),o=s.run.contact+.62*z.R;return Array.from({length:8},(_,i)=>o+(i+1)*s.run.exc).filter(U=>U<=60)}
function complete(k){
 const a=rowsFor(k),ts=targets(k);if(a.length<35||a[0]?.U>3||a.at(-1)?.U<55||ts.length<5)return false;return ts.slice(0,5).every(t=>a.some(q=>Math.abs(q.U-t)<=.32));
}
function syncDatasets(){
 const ks=keys(),prev=E('analysisDataset').value;E('analysisDataset').innerHTML=ks.length?ks.map(k=>{const z=parseKey(k);return'<option value="'+k+'">T='+z.oven+'°C · U_R='+z.R.toFixed(1)+' V'+(complete(k)?' · complete':'')+'</option>'}).join(''):'<option value="">record a scan first</option>';if(ks.includes(prev))E('analysisDataset').value=prev;loadFields();
}
function nearest(a,t){return a.reduce((x,y)=>Math.abs(x.U-t)<Math.abs(y.U-t)?x:y)}
function expected(k){
 if(!complete(k))return null;const a=rowsFor(k),ts=targets(k).slice(0,5),max=ts.map(t=>nearest(a,t).U),pts=max.map((U,i)=>({x:i+1,y:U})),f=Ufit(pts),delta=f.b,contact=f.a,exc=delta,lam=HC/exc;return{max,delta,contact,exc,lam}
}
function Ufit(pts){return U.fit(pts)}
function loadFields(){
 const k=E('analysisDataset').value,a=s.analyses[k],ids=['max1','max2','max3','max4','max5','studentDelta','studentContact','studentExcitation','studentLambda'];ids.forEach(id=>E(id).value='');if(a)[...a.max,a.delta,a.contact,a.exc,a.lam].forEach((v,i)=>E(ids[i]).value=v);drawChart();renderOutputs();
}
function checkAnalysis(){
 const k=E('analysisDataset').value,e=expected(k);if(!e){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='The selected dataset needs ≥35 points spanning approximately 0–60 V and close measurements around at least five successive maxima.';return}
 const vals=['max1','max2','max3','max4','max5','studentDelta','studentContact','studentExcitation','studentLambda'].map(id=>+E(id).value);if(vals.some(v=>!Number.isFinite(v))){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter five maximum positions and all derived quantities.';return}
 const max=vals.slice(0,5),delta=vals[5],contact=vals[6],exc=vals[7],lam=vals[8];
 for(let i=0;i<5;i++)if(Math.abs(max[i]-e.max[i])>.26){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Re-read the successive current maxima from your measured curve.';return}
 const f=U.fit(max.map((v,i)=>({x:i+1,y:v})));if(Math.abs(delta-f.b)>.06){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Use the slope of U_max versus successive maximum number, or average the adjacent spacings.';return}
 if(Math.abs(contact-f.a)>.12){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Use the intercept of the linear maximum-position sequence as the effective contact/retarding offset.';return}
 if(Math.abs(exc-delta)>.03){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='For a single electron charge, the excitation energy in eV is numerically the peak spacing in volts.';return}
 const el=HC/exc;if(Math.abs(lam-el)>.8){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate λ=hc/E using hc=1239.84 eV·nm.';return}
 s.analyses[k]={max,delta,contact,exc,lam};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Franck–Hertz excitation analysis accepted for this retarding-potential dataset.';render();save();
}
function drawChart(){
 const a=rowsFor(E('analysisDataset').value);if(a.length>=2)U.plot(E('chart'),[{pts:a.map(q=>({x:q.U,y:q.I}))}],{xlabel:'accelerating voltage / V',ylabel:'collector current / nA',xmin:0,ymin:0});else blank();
}
function blank(){const q=U.canvas(E('chart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record a manual accelerating-voltage scan.',q.w/2,q.h/2)}
function renderOutputs(){const a=s.analyses[E('analysisDataset').value];E('deltaOut').textContent=a?a.delta.toFixed(2)+' V':'—';E('excOut').textContent=a?a.exc.toFixed(2)+' eV':'—';E('lambdaOut').textContent=a?a.lam.toFixed(1)+' nm':'—'}
function render(){
 draw();E('body').innerHTML=s.rows.length?s.rows.map(q=>'<tr><td>'+q.oven+'</td><td>'+q.R.toFixed(1)+'</td><td>'+q.U.toFixed(1)+'</td><td>'+q.I.toFixed(2)+'</td></tr>').join(''):'<tr><td colspan="4">No accepted current points yet.</td></tr>';E('pointCount').textContent=s.rows.length;const completeKeys=keys().filter(complete);E('datasetCount').textContent=completeKeys.length+' / 2';syncDatasets();
 const n=Object.keys(s.analyses).length,words=s.interpretation.trim().length>=60;E('progress').innerHTML='<div class="item '+(completeKeys.length>=2?'done':'')+'">'+(completeKeys.length>=2?'✓':'○')+' ≥2 complete retarding-potential scans</div><div class="item '+(n>=2?'done':'')+'">'+(n>=2?'✓':'○')+' ≥2 accepted excitation analyses</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' collision/retarding interpretation</div>';
}
function buildReport(){const a=Object.entries(s.analyses).map(([k,q])=>{const z=parseKey(k);return'U_R='+z.R.toFixed(1)+' V: ΔU='+q.delta.toFixed(2)+' V, E='+q.exc.toFixed(2)+' eV, λ='+q.lam.toFixed(1)+' nm'}).join(' · ');const summary='<p><b>Accepted current points:</b> '+s.rows.length+'. <b>Analysed scans:</b> '+Object.keys(s.analyses).length+'.</p><p>'+U.esc(a||'No validated scan.')+'</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 3 — Franck–Hertz Experiment',summary)}
U.tabs();E('interpretation').value=s.interpretation;['oven','retarding','accelerating'].forEach(id=>E(id).addEventListener('input',()=>{clearEntry();draw();if(id!=='accelerating')render()}));E('record').onclick=record;E('analysisDataset').addEventListener('change',loadFields);E('checkAnalysis').onclick=checkAnalysis;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();