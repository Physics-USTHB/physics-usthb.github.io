(()=>{'use strict';
const U=AtomicUI,E=id=>document.getElementById(id),K='ATOMIC_A02_v2',HC=1.239841984,KA=.15406,KB=.13922;
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,rows:[],analyses:{},interpretation:''};s.rows=Array.isArray(s.rows)?s.rows:[];s.analyses=s.analyses||{};s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
const rad=d=>d*Math.PI/180,gauss=(x,m,w)=>Math.exp(-.5*((x-m)/w)**2);
function settings(){return{U:+E('kv').value,ma:+E('ma').value,d:+E('crystal').value,th:+E('theta').value}}
function lambda(th,d){return 2*d*Math.sin(rad(th))}
function cutoff(U){return HC/U}
function peakAngle(lam,d){const v=lam/(2*d);return v<1?Math.asin(v)*180/Math.PI:null}
function rateFor(U,ma,d,th){
 const lam=lambda(th,d),cut=cutoff(U),bg=24,cont=lam>cut?310*ma*(lam-cut)*Math.exp(-(lam-cut)/.11):0,peaks=1250*ma*gauss(lam,KA,.0026)+760*ma*gauss(lam,KB,.0023),raw=bg+cont+peaks,noise=7*Math.sin(th*2.17+U*.71+d*19.3+ma*4.2);return Math.max(0,Math.round(raw+noise));
}
function draw(){
 const q=U.canvas(E('xrayCanvas')),x=q.x,w=q.w,h=q.h,z=settings(),r=rateFor(z.U,z.ma,z.d,z.th);x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.strokeStyle='#8faeb9';x.lineWidth=3;x.beginPath();x.moveTo(w*.20,h*.70);x.lineTo(w*.50,h*.50);x.lineTo(w*.82,h*.25);x.stroke();x.fillStyle='#6ee0b0';x.font='700 12px system-ui';x.fillText('X-ray tube',w*.08,h*.78);x.fillText('crystal',w*.46,h*.57);x.fillText('counter',w*.78,h*.18);x.strokeStyle='#ffcb6a';x.lineWidth=4;x.beginPath();x.moveTo(w*.50,h*.50);x.lineTo(w*.50+Math.cos(rad(z.th))*w*.27,h*.50-Math.sin(rad(z.th))*h*.32);x.stroke();E('rateRead').value=r+' s⁻¹';
}
function clearBench(){E('studentRate').value=''}
function keyOf(q){return q.U+'|'+q.ma.toFixed(1)+'|'+q.d.toFixed(3)}
function record(){
 const z=settings(),truth=rateFor(z.U,z.ma,z.d,z.th),v=+E('studentRate').value;if(!Number.isFinite(v)||v<0){E('msg').className='notice warn';E('msg').textContent='Read the detector counter and enter the count rate.';return}
 if(Math.abs(v-truth)>1.1){E('msg').className='notice warn';E('msg').textContent='Re-read the displayed count rate.';return}
 const row={U:z.U,ma:z.ma,d:z.d,th:z.th,rate:v},k=s.rows.findIndex(q=>keyOf(q)===keyOf(row)&&Math.abs(q.th-row.th)<1e-9);if(k>=0)s.rows[k]=row;else s.rows.push(row);delete s.analyses[keyOf(row)];clearBench();E('msg').className='notice ok';E('msg').textContent='Angular count accepted. Continue the scan; use closer angle spacing near changes in count rate.';render();save();
}
function datasetKeys(){return [...new Set(s.rows.map(keyOf))]}
function rowsFor(key){return s.rows.filter(q=>keyOf(q)===key).sort((a,b)=>a.th-b.th)}
function parseKey(key){const [U,ma,d]=String(key).split('|').map(Number);return{U,ma,d}}
function targetInfo(key){const z=parseKey(key),ka=peakAngle(KA,z.d),kb=peakAngle(KB,z.d),cutTh=peakAngle(cutoff(z.U),z.d);return{...z,ka,kb,cutTh}}
function complete(key){
 const a=rowsFor(key),t=targetInfo(key);if(a.length<18)return false;if(a[0]?.th>Math.max(5,t.cutTh-.5)||a.at(-1)?.th<Math.max(t.ka,t.kb)+2)return false;
 const near=(v,tol)=>a.some(q=>Math.abs(q.th-v)<=tol);return near(t.ka,.25)&&near(t.kb,.25)&&near(t.cutTh,.22);
}
function syncDatasets(){
 const keys=datasetKeys(),prev=E('analysisDataset').value;E('analysisDataset').innerHTML=keys.length?keys.map(k=>{const z=parseKey(k);return'<option value="'+k+'">U='+z.U+' kV · I='+z.ma.toFixed(1)+' mA · d='+z.d.toFixed(3)+' nm'+(complete(k)?' · complete':'')+'</option>'}).join(''):'<option value="">record a scan first</option>';if(keys.includes(prev))E('analysisDataset').value=prev;loadFields();
}
function nearest(a,target){return a.reduce((x,y)=>Math.abs(x.th-target)<Math.abs(y.th-target)?x:y)}
function expected(key){
 if(!complete(key))return null;const a=rowsFor(key),t=targetInfo(key),rka=nearest(a,t.ka),rkb=nearest(a,t.kb),rc=nearest(a,t.cutTh),kaLam=lambda(rka.th,t.d),kbLam=lambda(rkb.th,t.d),cutLam=lambda(rc.th,t.d);return{t,rka,rkb,rc,kaLam,kbLam,cutLam,theory:cutoff(t.U)};
}
function loadFields(){
 const key=E('analysisDataset').value,a=s.analyses[key],ids=['studentKbTheta','studentKbLambda','studentKaTheta','studentKaLambda','studentCutTheta','studentCutLambda','studentCutTheory'];ids.forEach(id=>E(id).value='');if(a)[a.kbTheta,a.kbLambda,a.kaTheta,a.kaLambda,a.cutTheta,a.cutLambda,a.cutTheory].forEach((v,i)=>E(ids[i]).value=v);drawChart();renderOutputs();
}
function checkSpectrum(){
 const key=E('analysisDataset').value,e=expected(key);if(!e){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='The selected dataset needs ≥18 points and close measurements around Kβ, Kα and the short-wavelength onset.';return}
 const ids=['studentKbTheta','studentKbLambda','studentKaTheta','studentKaLambda','studentCutTheta','studentCutLambda','studentCutTheory'],v=ids.map(id=>+E(id).value);if(v.some(x=>!Number.isFinite(x))){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter all peak/cutoff angles and wavelengths.';return}
 const [kbT,kbL,kaT,kaL,cT,cL,cTheory]=v;
 if(Math.abs(kbT-e.rkb.th)>.13||Math.abs(kaT-e.rka.th)>.13){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Re-read the two characteristic-peak angles from your measured spectrum.';return}
 const kbCalc=2*e.t.d*Math.sin(rad(kbT)),kaCalc=2*e.t.d*Math.sin(rad(kaT));if(Math.abs(kbL-kbCalc)>.001||Math.abs(kaL-kaCalc)>.001){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Use λ=2d sinθ for each characteristic peak.';return}
 if(Math.abs(cT-e.t.cutTh)>.25){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Locate the low-angle onset where the bremsstrahlung count rises above background.';return}
 const cCalc=2*e.t.d*Math.sin(rad(cT));if(Math.abs(cL-cCalc)>.0012){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Convert the experimental cutoff angle to wavelength with Bragg’s law.';return}
 if(Math.abs(cTheory-e.theory)>.0008){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate λmin=hc/(eU); with U in kV, hc/e=1.23984 keV·nm.';return}
 s.analyses[key]={kbTheta:kbT,kbLambda:kbL,kaTheta:kaT,kaLambda:kaL,cutTheta:cT,cutLambda:cL,cutTheory:cTheory};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Spectrum analysis accepted for this tube voltage/crystal setting.';render();save();
}
function drawChart(){
 const key=E('analysisDataset').value,a=rowsFor(key);if(a.length>=2)U.plot(E('chart'),[{pts:a.map(q=>({x:q.th,y:q.rate}))}],{xlabel:'Bragg angle θ / °',ylabel:'count rate / s⁻¹',ymin:0});else{const q=U.canvas(E('chart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record an angular count-rate scan.',q.w/2,q.h/2)}
}
function renderOutputs(){
 const a=s.analyses[E('analysisDataset').value];E('kaOut').textContent=a?a.kaLambda.toFixed(4)+' nm':'—';E('kbOut').textContent=a?a.kbLambda.toFixed(4)+' nm':'—';E('cutOut').textContent=a?a.cutLambda.toFixed(4)+' nm':'—';
}
function render(){
 draw();E('body').innerHTML=s.rows.length?s.rows.map(q=>'<tr><td>'+q.U+'</td><td>'+q.d.toFixed(3)+'</td><td>'+q.th.toFixed(2)+'</td><td>'+q.rate.toFixed(0)+'</td></tr>').join(''):'<tr><td colspan="4">No accepted detector readings yet.</td></tr>';E('pointCount').textContent=s.rows.length;const volts=new Set(s.rows.map(q=>q.U));E('voltageCount').textContent=volts.size+' / 2';const current=rowsFor(keyOf(settings())),span=current.length?(current[0].th.toFixed(1)+'–'+current.at(-1).th.toFixed(1)+'°'):'—';E('scanSpan').textContent=span;syncDatasets();
 const analyses=Object.keys(s.analyses).length,words=s.interpretation.trim().length>=65;E('progress').innerHTML='<div class="item '+(volts.size>=2?'done':'')+'">'+(volts.size>=2?'✓':'○')+' ≥2 tube voltages represented</div><div class="item '+(analyses>=2?'done':'')+'">'+(analyses>=2?'✓':'○')+' ≥2 complete spectrum analyses</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' voltage/current interpretation</div>';
}
function buildReport(){const as=Object.entries(s.analyses).map(([k,a])=>{const z=parseKey(k);return'U='+z.U+' kV: Kβ='+a.kbLambda.toFixed(4)+' nm, Kα='+a.kaLambda.toFixed(4)+' nm, cutoff='+a.cutLambda.toFixed(4)+' nm (theory '+a.cutTheory.toFixed(4)+' nm)'}).join(' · ');const summary='<p><b>Accepted scan points:</b> '+s.rows.length+'. <b>Analysed spectra:</b> '+Object.keys(s.analyses).length+'.</p><p>'+U.esc(as||'No validated spectrum analysis.')+'</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 2 — X-Ray Spectrum & Bragg Diffraction',summary)}
U.tabs();E('interpretation').value=s.interpretation;['kv','ma','crystal','theta'].forEach(id=>E(id).addEventListener('input',()=>{clearBench();draw();if(id!=='theta')render()}));E('record').onclick=record;E('analysisDataset').addEventListener('change',loadFields);E('checkSpectrum').onclick=checkSpectrum;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();