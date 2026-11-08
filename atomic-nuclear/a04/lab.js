(()=>{'use strict';
const U=AtomicUI,E=id=>document.getElementById(id),K='ATOMIC_A04_v2',MATS=['Al','Cu','Pb'];
function makeRun(){return{id:'A04-'+Math.random().toString(36).slice(2,7).toUpperCase(),bg:15+Math.random()*7,I0:1550+Math.random()*450,mu:{Al:.13+Math.random()*.04,Cu:.38+Math.random()*.09,Pb:.78+Math.random()*.14}}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),raw:[],pending:null,draft:{Al:{},Cu:{},Pb:{}},validated:{},fits:{},interpretation:''};s.raw=Array.isArray(s.raw)?s.raw:[];s.draft=s.draft||{Al:{},Cu:{},Pb:{}};for(const m of MATS)s.draft[m]=s.draft[m]||{};s.validated=s.validated||{};s.fits=s.fits||{};s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function bgRows(){return s.raw.filter(q=>q.mode==='background')}
function srcRows(mat){return s.raw.filter(q=>q.mode==='source'&&q.mat===mat).sort((a,b)=>a.x-b.x)}
function bgRate(){const a=bgRows();if(!a.length)return null;return a.reduce((z,q)=>z+q.N,0)/a.reduce((z,q)=>z+q.t,0)}
function expectedRate(mode,mat,x){return mode==='background'?s.run.bg:s.run.bg+s.run.I0*Math.exp(-s.run.mu[mat]*(x/10))}
function draw(){
 const q=U.canvas(E('gammaCanvas')),x=q.x,w=q.w,h=q.h,mode=E('countMode').value,mat=E('material').value,th=+E('thickness').value;x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.fillStyle='#d9b15d';x.beginPath();x.arc(w*.14,h*.5,22,0,Math.PI*2);x.fill();x.fillStyle='#8eb4c4';x.fillRect(w*.76,h*.36,w*.12,h*.28);
 if(mode==='source'){const max=30,frac=th/max;x.fillStyle=mat==='Pb'?'#89949a':mat==='Cu'?'#b66d3d':'#c7ced0';x.fillRect(w*.45-frac*w*.08,h*.30,Math.max(4,frac*w*.16),h*.40);x.strokeStyle='#ffd166';x.lineWidth=3;x.beginPath();x.moveTo(w*.17,h*.5);x.lineTo(w*.76,h*.5);x.stroke()}
 x.fillStyle='#dcebed';x.font='700 12px system-ui';x.fillText(mode==='background'?'source removed':('source · '+mat+' '+th+' mm'),w*.35,h*.18);E('material').disabled=mode==='background';E('thickness').disabled=mode==='background';
}
function performCount(){
 if(E('countMode').value==='source'&&!bgRows().length){E('msg').className='notice warn';E('msg').textContent='Measure at least one background interval with the source removed before source/absorber counts.';return}
 const mode=E('countMode').value,mat=E('material').value,x=mode==='background'?0:+E('thickness').value,t=+E('countTime').value,mean=expectedRate(mode,mat,x)*t,N=U.poisson(mean);s.pending={mode,mat,x,t,N};E('counterRead').value=N+' counts in '+t+' s';E('studentCounts').value='';E('msg').className='notice ok';E('msg').textContent='Counting interval finished. Read the integer counter display and record it.';save();
}
function invalidate(mat=null){
 if(mat){delete s.validated[mat];delete s.fits[mat];s.draft[mat]={};}else{for(const m of MATS){delete s.validated[m];delete s.fits[m];s.draft[m]={};}}
}
function recordCount(){
 const p=s.pending;if(!p){E('msg').className='notice warn';E('msg').textContent='Start a counting interval first.';return}
 const N=+E('studentCounts').value;if(!Number.isInteger(N)||N<0){E('msg').className='notice warn';E('msg').textContent='Enter the integer count shown by the counter.';return}
 if(N!==p.N){E('msg').className='notice warn';E('msg').textContent='Re-read the raw counter display; do not enter a count rate here.';return}
 if(p.mode==='background'){s.raw.push({mode:'background',mat:'—',x:0,t:p.t,N});invalidate();}
 else{const row={mode:'source',mat:p.mat,x:p.x,t:p.t,N},i=s.raw.findIndex(q=>q.mode==='source'&&q.mat===row.mat&&q.x===row.x);if(i>=0)s.raw[i]=row;else s.raw.push(row);invalidate(row.mat)}
 s.pending=null;E('counterRead').value='—';E('studentCounts').value='';E('msg').className='notice ok';E('msg').textContent='Raw count accepted. Continue the thickness series.';render();save();
}
function enough(mat){const a=srcRows(mat);return a.length>=6&&a.some(q=>q.x===0)&&Math.max(...a.map(q=>q.x))>=20}
function calcExpected(mat){
 const b=bgRate(),a=srcRows(mat);if(b==null||!enough(mat))return null;const zero=a.find(q=>q.x===0),I0=zero.N/zero.t-b;if(I0<=0)return null;return a.map(q=>{const gross=q.N/q.t,net=gross-b;return{x:q.x/10,gross,net,ln:net>0?Math.log(net/I0):NaN}})
}
function renderCalc(){
 const mat=E('analysisMaterial').value,e=calcExpected(mat),draft=s.draft[mat]||{};E('calcBody').innerHTML=e?e.map(q=>{const d=draft[String(q.x)]||{};return'<tr><td>'+q.x.toFixed(2)+'</td><td>'+q.gross.toFixed(2)+'</td><td><input class="att-calc" data-x="'+q.x+'" data-key="net" type="number" step=".01" value="'+(d.net??'')+'"></td><td><input class="att-calc" data-x="'+q.x+'" data-key="ln" type="number" step=".001" value="'+(d.ln??'')+'"></td></tr>'}).join(''):'<tr><td colspan="4">Measure background and ≥6 points including x=0 and ≥20 mm for '+mat+'.</td></tr>';
 document.querySelectorAll('.att-calc').forEach(el=>el.addEventListener('input',()=>{const k=String(el.dataset.x);s.draft[mat][k]=s.draft[mat][k]||{};s.draft[mat][k][el.dataset.key]=el.value.trim()===''?null:+el.value;delete s.validated[mat];delete s.fits[mat];save()}));
}
function checkCalc(){
 const mat=E('analysisMaterial').value,e=calcExpected(mat);if(!e){E('calcMsg').className='notice warn';E('calcMsg').textContent='Complete the required raw-count dataset first.';return}
 for(const q of e){const d=s.draft[mat][String(q.x)]||{},net=+d.net,ln=+d.ln;if(!Number.isFinite(net)||!Number.isFinite(ln)){E('calcMsg').className='notice warn';E('calcMsg').textContent='Complete net rate and ln(I/I0) for every row.';return}
  if(Math.abs(net-q.net)>Math.max(.2,.004*Math.abs(q.net))){E('calcMsg').className='notice warn';E('calcMsg').textContent='Recalculate net count rate at x='+q.x.toFixed(2)+' cm by subtracting the measured background rate.';return}
  if(Math.abs(ln-q.ln)>.008){E('calcMsg').className='notice warn';E('calcMsg').textContent='Recalculate ln(I/I0) using the background-corrected x=0 rate.';return}
 }
 s.validated[mat]=e.map(q=>({x:q.x,net:q.net,ln:q.ln}));delete s.fits[mat];E('calcMsg').className='notice ok';E('calcMsg').textContent='Corrected attenuation table accepted. The log-linear graph is unlocked.';renderAnalysis();save();
}
function fitExpected(mat){
 const a=s.validated[mat];if(!a||a.length<3)return null;const pts=a.map(q=>({x:q.x,y:q.ln})),f=U.fit(pts),mx=pts.reduce((z,p)=>z+p.x,0)/pts.length,sxx=pts.reduce((z,p)=>z+(p.x-mx)**2,0),sse=pts.reduce((z,p)=>z+(p.y-(f.a+f.b*p.x))**2,0),se=Math.sqrt((sse/Math.max(1,pts.length-2))/sxx),mu=-f.b,hvl=Math.log(2)/mu;return{pts,slope:f.b,mu,se,hvl};
}
function checkFit(){
 const mat=E('analysisMaterial').value,e=fitExpected(mat);if(!e){E('fitMsg').className='notice warn';E('fitMsg').textContent='Validate the corrected table first.';return}
 const slope=+E('studentSlope').value,mu=+E('studentMu').value,u=+E('studentMuUnc').value,hvl=+E('studentHvl').value;if([slope,mu,u,hvl].some(v=>!Number.isFinite(v))||mu<=0||u<0||hvl<=0){E('fitMsg').className='notice warn';E('fitMsg').textContent='Enter slope, μ, u(μ) and HVL.';return}
 if(Math.abs(slope-e.slope)>Math.max(.004,.015*Math.abs(e.slope))){E('fitMsg').className='notice warn';E('fitMsg').textContent='Fit ln(I/I0) versus thickness x in cm.';return}
 if(Math.abs(mu+slope)>.004){E('fitMsg').className='notice warn';E('fitMsg').textContent='For ln(I/I0)=−μx, μ is the negative fitted slope.';return}
 if(Math.abs(u-e.se)>Math.max(.003,.12*Math.max(e.se,.001))){E('fitMsg').className='notice warn';E('fitMsg').textContent='Use the standard error of the fitted slope as u(μ).';return}
 const eh=Math.log(2)/mu;if(Math.abs(hvl-eh)>.012){E('fitMsg').className='notice warn';E('fitMsg').textContent='Recalculate HVL=ln2/μ.';return}
 s.fits[mat]={slope,mu,u,hvl};E('fitMsg').className='notice ok';E('fitMsg').textContent=mat+' attenuation fit accepted.';renderAnalysis();save();
}
function renderAnalysis(){
 renderCalc();const mat=E('analysisMaterial').value,e=fitExpected(mat);if(e)U.plot(E('chart'),[{pts:e.pts}],{xlabel:'absorber thickness / cm',ylabel:'ln(I/I0)',xmax:3});else blank();
 const a=s.fits[mat];E('muOut').textContent=a?a.mu.toFixed(3)+' cm⁻¹':'—';E('muUncOut').textContent=a?a.u.toFixed(3)+' cm⁻¹':'—';E('hvlOut').textContent=a?a.hvl.toFixed(3)+' cm':'—';['studentSlope','studentMu','studentMuUnc','studentHvl'].forEach(id=>E(id).value='');if(a){E('studentSlope').value=a.slope;E('studentMu').value=a.mu;E('studentMuUnc').value=a.u;E('studentHvl').value=a.hvl}
}
function blank(){const q=U.canvas(E('chart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Validate the background-corrected table to unlock the fit.',q.w/2,q.h/2)}
function render(){
 draw();E('rawBody').innerHTML=s.raw.length?s.raw.map(q=>'<tr><td>'+q.mode+'</td><td>'+q.mat+'</td><td>'+q.x+'</td><td>'+q.t+'</td><td>'+q.N+'</td></tr>').join(''):'<tr><td colspan="5">No raw counts yet.</td></tr>';E('bgCount').textContent=bgRows().length;E('alCount').textContent=srcRows('Al').length+' / 6';E('cuCount').textContent=srcRows('Cu').length+' / 6';E('pbCount').textContent=srcRows('Pb').length+' / 6';renderAnalysis();
 const fitted=MATS.filter(m=>s.fits[m]).length,words=s.interpretation.trim().length>=60;E('progress').innerHTML='<div class="item '+(bgRows().length?'done':'')+'">'+(bgRows().length?'✓':'○')+' measured background</div><div class="item '+(fitted===3?'done':'')+'">'+(fitted===3?'✓':'○')+' Al/Cu/Pb attenuation fits '+fitted+'/3</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' material/statistics interpretation</div>';
}
function buildReport(){const fs=MATS.map(m=>s.fits[m]?m+': μ='+s.fits[m].mu.toFixed(3)+' ± '+s.fits[m].u.toFixed(3)+' cm⁻¹, HVL='+s.fits[m].hvl.toFixed(3)+' cm':m+': incomplete').join(' · ');const summary='<p><b>Background intervals:</b> '+bgRows().length+'. <b>Raw source points:</b> '+s.raw.filter(q=>q.mode==='source').length+'.</p><p>'+fs+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 4 — Gamma-Ray Absorption',summary)}
U.tabs();E('interpretation').value=s.interpretation;['countMode','material','thickness'].forEach(id=>E(id).addEventListener('input',()=>{s.pending=null;E('counterRead').value='—';E('studentCounts').value='';draw()}));E('performCount').onclick=performCount;E('recordCount').onclick=recordCount;E('analysisMaterial').addEventListener('change',renderAnalysis);E('checkCalcTable').onclick=checkCalc;E('checkFit').onclick=checkFit;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();