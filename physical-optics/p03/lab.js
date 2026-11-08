(()=>{'use strict';
const U=PhysOptUI,E=id=>document.getElementById(id),K='PHYSOPT_P03_v2',LAM=632.8e-9;
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,verified:{plate:false,wedge:false},pending:null,runs:[],analysis:null,interpretation:''};s.verified=s.verified||{plate:false,wedge:false};s.runs=Array.isArray(s.runs)?s.runs:[];s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function good(){const c=E('config').value,loc=E('projection').value,t=+E('tilt').value;return c==='plate'?loc==='focal'&&t<.35:loc==='mirrors'&&t>.5}
function draw(){
 const q=U.canvas(E('michCanvas')),x=q.x,w=q.w,h=q.h;x.fillStyle='#050a12';x.fillRect(0,0,w,h);
 const c=E('config').value,loc=E('projection').value,correct=c==='plate'?loc==='focal':loc==='mirrors';
 if(!correct){x.fillStyle='#6c7582';x.font='700 18px system-ui';x.textAlign='center';x.fillText('Fringes blurred / wrong localisation plane',w/2,h/2);return}
 if(c==='plate'){
  const cx=w/2,cy=h/2,e=+E('offset').value*1e-6;for(let r=10;r<Math.min(w,h)*.48;r+=7){const ph=4*Math.PI*e/LAM+2*Math.PI*r*r/(Math.min(w,h)*170),I=.12+.88*(1+Math.cos(ph))/2;x.strokeStyle='rgba(255,90,70,'+I+')';x.lineWidth=3;x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.stroke()}
 }else{
  const a=+E('tilt').value*1e-3,period=LAM/(2*Math.max(a,1e-6)),pix=period/.0005*38;for(let xx=0;xx<w;xx++){const I=.1+.9*(1+Math.cos(2*Math.PI*xx/pix))/2,r=Math.round(255*I),g=Math.round(62*I),b=Math.round(52*I);x.fillStyle='rgb('+r+','+g+','+b+')';x.fillRect(xx,0,1,h)}
 }
}
function renderChecks(){
 E('progress').innerHTML='<div class="item '+(s.verified.plate?'done':'')+'">'+(s.verified.plate?'✓':'○')+' air-plate geometry + focal-plane localisation</div><div class="item '+(s.verified.wedge?'done':'')+'">'+(s.verified.wedge?'✓':'○')+' air-wedge geometry + near-mirror localisation</div>';
 E('plateOut').textContent=s.verified.plate?'verified':'pending';E('wedgeOut').textContent=s.verified.wedge?'verified':'pending';
}
function verifyNow(){
 const c=E('config').value,ok=good();s.verified[c]=ok;E('msg').className='notice '+(ok?'ok':'warn');E('msg').textContent=ok?(c==='plate'?'Air-plate condition accepted: circular equal-inclination fringes in the lens focal plane.':'Air-wedge condition accepted: straight equal-thickness fringes localised near the effective mirrors.'):'Selected mirror tilt/localisation is inconsistent with the chosen Michelson configuration.';renderChecks();save();
}
function shiftNow(){
 if(!(s.verified.plate&&s.verified.wedge)){E('measureMsg').className='notice warn';E('measureMsg').textContent='Verify both the air-plate and air-wedge configurations first.';return}
 const de=+E('move').value*1e-6,N=Math.round(2*de/LAM);s.pending={de,N};E('moveOut').textContent=(de*1e6).toFixed(0)+' µm';E('countInput').value='';E('studentLambda').value='';E('nHint').textContent='hidden until accepted';E('measureMsg').className='notice ok';E('measureMsg').textContent='Mirror translation performed. Count the fringe crossings at the reference point and calculate λ=2Δe/N.';save();
}
function submit(){
 if(!s.pending){E('measureMsg').className='notice warn';E('measureMsg').textContent='Perform a mirror translation first.';return}
 const n=+E('countInput').value,l=+E('studentLambda').value;if(!Number.isInteger(n)||n<=0||!Number.isFinite(l)||l<=0){E('measureMsg').className='notice warn';E('measureMsg').textContent='Enter an integer fringe count and your calculated wavelength.';return}
 if(Math.abs(n-s.pending.N)>1){E('measureMsg').className='notice warn';E('measureMsg').textContent='The submitted fringe count is inconsistent with the observed number of crossings.';return}
 const calc=2*s.pending.de/n*1e9;if(Math.abs(l-calc)>.8){E('measureMsg').className='notice warn';E('measureMsg').textContent='Recalculate λ=2Δe/N with Δe converted from micrometres.';return}
 const de=s.pending.de*1e6,key=de.toFixed(0),rec={de,N:n,lambda:l},k=s.runs.findIndex(q=>q.de.toFixed(0)===key);if(k>=0)s.runs[k]=rec;else s.runs.push(rec);s.runs.sort((a,b)=>a.de-b.de);s.analysis=null;E('nHint').textContent=n+' fringes';s.pending=null;E('measureMsg').className='notice ok';E('measureMsg').textContent='Fringe count and wavelength accepted. Repeat with a different mirror translation.';renderResults();save();
}
function expectedAnalysis(){
 if(s.runs.length<3||new Set(s.runs.map(q=>q.de.toFixed(0))).size<3)return null;const vals=s.runs.map(q=>q.lambda),mean=vals.reduce((a,b)=>a+b,0)/vals.length,spread=100*(Math.max(...vals)-Math.min(...vals))/mean;return{mean,spread}
}
function checkAnalysis(){
 const e=expectedAnalysis();if(!e){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Validate at least three different mirror translations first.';return}
 const mean=+E('studentMean').value,spread=+E('studentSpread').value;if(!Number.isFinite(mean)||!Number.isFinite(spread)||mean<=0||spread<0){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter the mean wavelength and relative max–min spread.';return}
 if(Math.abs(mean-e.mean)>.25||Math.abs(spread-e.spread)>.08){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate the mean wavelength and 100(λmax−λmin)/mean λ.';return}
 s.analysis={mean,spread};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Michelson wavelength repeatability analysis accepted.';renderResults();save();
}
function renderResults(){
 E('runCount').textContent=s.runs.length+' / 3';E('measureBody').innerHTML=s.runs.length?s.runs.map(q=>'<tr><td>'+q.de.toFixed(0)+'</td><td>'+q.N+'</td><td>'+q.lambda.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="3">No accepted mirror-translation measurements yet.</td></tr>';
 E('lambdaOut').textContent=s.analysis?s.analysis.mean.toFixed(1)+' nm':'—';E('spreadOut').textContent=s.analysis?s.analysis.spread.toFixed(2)+'%':'—';
}
function buildReport(){const summary='<p><b>Air plate:</b> '+(s.verified.plate?'verified':'pending')+' · <b>air wedge:</b> '+(s.verified.wedge?'verified':'pending')+'.</p><p><b>Mirror-translation runs:</b> '+s.runs.length+'. <b>Wavelength:</b> '+(s.analysis?s.analysis.mean.toFixed(1)+' nm; spread '+s.analysis.spread.toFixed(2)+'%':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 3 — Michelson Interferometer',summary)}
function render(){draw();renderChecks();renderResults()}
U.tabs();E('interpretation').value=s.interpretation;if(s.analysis){E('studentMean').value=s.analysis.mean;E('studentSpread').value=s.analysis.spread}['config','tilt','offset','projection'].forEach(id=>E(id).addEventListener('input',draw));E('verify').onclick=verifyNow;E('shift').onclick=shiftNow;E('submitCount').onclick=submit;E('checkWavelengthAnalysis').onclick=checkAnalysis;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();