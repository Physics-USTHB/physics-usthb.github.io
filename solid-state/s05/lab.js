(()=>{'use strict';
const U=SolidUI,E=id=>document.getElementById(id),K='SOLID_S05_v2',KB=8.617333262e-5,L=.010,A=4e-6,ACELL=.0100;
function makeRun(){
 const material=Math.random()<.5?'ge':'si',Eg=(material==='ge'?.66:1.10)+Math.random()*.04,sigma300=material==='ge'?(6+Math.random()*5):(.5+Math.random()*.8),solarScale=.96+Math.random()*.08,phase=Math.random()*9;
 return{id:'S05-'+Math.random().toString(36).slice(2,7).toUpperCase(),material,Eg,sigma300,solarScale,phase};
}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),semi:[],semiAnalysis:null,solar:[],solarAnalyses:{},interpretation:''};s.semi=Array.isArray(s.semi)?s.semi:[];s.solar=Array.isArray(s.solar)?s.solar:[];s.solarAnalyses=s.solarAnalyses||{};s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function sigmaT(T=+E('temperature').value){const r=s.run;return r.sigma300*Math.exp(-r.Eg/(2*KB)*(1/T-1/300))}
function semiValue(){const T=+E('temperature').value,V=+E('bias').value,sigma=sigmaT(T),I=sigma*A/L*V,noise=I*.003*Math.sin(T*.071+V*2.3+s.run.phase);return{T,V,sigma,I:Math.max(0,I+noise)}}
function drawCond(){
 const q=U.canvas(E('condCanvas')),x=q.x,w=q.w,h=q.h,z=semiValue(),hot=(z.T-250)/180;x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.fillStyle='rgb('+Math.round(75+175*hot)+','+Math.round(155-65*hot)+',90)';x.fillRect(w*.25,h*.38,w*.5,h*.25);x.strokeStyle='#dcecf1';x.lineWidth=4;x.beginPath();x.moveTo(w*.08,h*.5);x.lineTo(w*.25,h*.5);x.moveTo(w*.75,h*.5);x.lineTo(w*.92,h*.5);x.stroke();x.fillStyle='#e5f7ef';x.font='12px system-ui';x.fillText('unknown semiconductor · '+z.T+' K',w*.34,h*.30);E('semiCurrent').value=(z.I*1000).toFixed(3)+' mA';
}
function clearSemiInputs(){['studentSemiI','studentSemiV','studentSigmaPoint'].forEach(id=>E(id).value='')}
function recSemi(){
 const z=semiValue(),ImA=+E('studentSemiI').value,V=+E('studentSemiV').value,sigma=+E('studentSigmaPoint').value;if([ImA,V,sigma].some(v=>!Number.isFinite(v))||ImA<0||V<=0||sigma<=0){E('semiMsg').className='notice warn';E('semiMsg').textContent='Read I and V, then calculate the conductivity.';return}
 if(Math.abs(ImA-z.I*1000)>Math.max(.004,.012*Math.max(z.I*1000,.02))){E('semiMsg').className='notice warn';E('semiMsg').textContent='Re-read the current meter after thermal equilibrium.';return}
 if(Math.abs(V-z.V)>.011){E('semiMsg').className='notice warn';E('semiMsg').textContent='Use the applied bias voltage shown on the bench.';return}
 const es=(ImA/1000)*L/(V*A);if(Math.abs(sigma-es)>Math.max(.003,.012*es)){E('semiMsg').className='notice warn';E('semiMsg').textContent='Recalculate σ=IL/(VA) using L=0.010 m and A=4.00×10⁻⁶ m².';return}
 const row={T:z.T,V,I:ImA/1000,sigma},k=s.semi.findIndex(q=>q.T===z.T);if(k>=0)s.semi[k]=row;else s.semi.push(row);s.semi.sort((a,b)=>a.T-b.T);s.semiAnalysis=null;clearSemiInputs();E('semiMsg').className='notice ok';E('semiMsg').textContent='Conductivity point accepted. Continue through a broad temperature range.';render();save();
}
function semiExpected(){
 if(s.semi.length<8||s.semi[0]?.T>260||s.semi.at(-1)?.T<420)return null;const pts=s.semi.map(q=>({x:1/q.T,y:Math.log(q.sigma)})).sort((a,b)=>a.x-b.x),f=U.fit(pts),Eg=-2*KB*f.b,material=Math.abs(Eg-.67)<Math.abs(Eg-1.12)?'ge':'si';return{pts,slope:f.b,Eg,material};
}
function checkSemi(){
 const e=semiExpected();if(!e){E('semiAnalysisMsg').className='notice warn';E('semiAnalysisMsg').textContent='Record at least eight conductivity points spanning approximately 250–430 K.';return}
 const slope=+E('studentArrSlope').value,Eg=+E('studentEg').value,mat=E('studentMaterial').value;if(!Number.isFinite(slope)||!Number.isFinite(Eg)||!mat||Eg<=0){E('semiAnalysisMsg').className='notice warn';E('semiAnalysisMsg').textContent='Enter the Arrhenius slope, band gap and material classification.';return}
 if(Math.abs(slope-e.slope)>Math.max(25,.02*Math.abs(e.slope))){E('semiAnalysisMsg').className='notice warn';E('semiAnalysisMsg').textContent='Fit lnσ against 1/T and re-read the negative slope.';return}
 const calc=-2*KB*slope;if(Math.abs(Eg-calc)>.02){E('semiAnalysisMsg').className='notice warn';E('semiAnalysisMsg').textContent='Use E_g=−2k_B·slope with k_B=8.617×10⁻⁵ eV/K.';return}
 if(mat!==(Eg<.9?'ge':'si')){E('semiAnalysisMsg').className='notice warn';E('semiAnalysisMsg').textContent='Compare the measured gap with typical Ge-like (~0.67 eV) and Si-like (~1.1 eV) values.';return}
 s.semiAnalysis={slope,Eg,material:mat};E('semiAnalysisMsg').className='notice ok';E('semiAnalysisMsg').textContent='Arrhenius band-gap analysis accepted.';render();save();
}
function solarPars(G=+E('irr').value){
 const T=300,nf=1.35,Vt=KB*T*nf,Isc=3.15*(G/1000)*s.run.solarScale,Voc=.590+Vt*Math.log(Math.max(G,20)/1000+1.0),I0=Isc/(Math.exp(Voc/Vt)-1);return{G,Vt,Isc,Voc,I0};
}
function solarI(V=+E('cellV').value,G=+E('irr').value){const p=solarPars(G);return Math.max(0,p.Isc-p.I0*(Math.exp(V/p.Vt)-1))}
function drawSolar(){
 const q=U.canvas(E('solarCanvas')),x=q.x,w=q.w,h=q.h,V=+E('cellV').value,I=solarI(V);x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.fillStyle='#2c6f94';x.fillRect(w*.28,h*.28,w*.44,h*.38);x.strokeStyle='#6ee0b0';x.lineWidth=2;for(let i=1;i<5;i++){x.beginPath();x.moveTo(w*(.28+i*.088),h*.28);x.lineTo(w*(.28+i*.088),h*.66);x.stroke()}for(let j=1;j<4;j++){x.beginPath();x.moveTo(w*.28,h*(.28+j*.095));x.lineTo(w*.72,h*(.28+j*.095));x.stroke()}x.fillStyle='#d7e8ec';x.font='700 12px system-ui';x.fillText(E('irr').value+' W/m²',w*.42,h*.22);E('cellI').value=I.toFixed(3)+' A';
}
function clearSolarInputs(){['studentCellV','studentCellI','studentCellP'].forEach(id=>E(id).value='')}
function recSolar(){
 const G=+E('irr').value,V=+E('cellV').value,eI=solarI(V,G),sV=+E('studentCellV').value,I=+E('studentCellI').value,P=+E('studentCellP').value;if([sV,I,P].some(v=>!Number.isFinite(v))||sV<0||I<0||P<0){E('solarMsg').className='notice warn';E('solarMsg').textContent='Read V and I and calculate P=VI.';return}
 if(Math.abs(sV-V)>.006){E('solarMsg').className='notice warn';E('solarMsg').textContent='Use the cell-voltage setting shown on the load control.';return}
 if(Math.abs(I-eI)>Math.max(.006,.006*Math.max(eI,.1))){E('solarMsg').className='notice warn';E('solarMsg').textContent='Re-read the solar-cell ammeter.';return}
 if(Math.abs(P-sV*I)>Math.max(.004,.006*Math.max(sV*I,.05))){E('solarMsg').className='notice warn';E('solarMsg').textContent='Recalculate electrical power P=VI.';return}
 const row={G,V:sV,I,P},k=s.solar.findIndex(q=>q.G===G&&Math.abs(q.V-V)<1e-9);if(k>=0)s.solar[k]=row;else s.solar.push(row);s.solar.sort((a,b)=>a.G-b.G||a.V-b.V);delete s.solarAnalyses[String(G)];clearSolarInputs();E('solarMsg').className='notice ok';E('solarMsg').textContent='Solar I–V point accepted. Continue toward open circuit and add close points around the knee.';render();save();
}
function solarRows(G){return s.solar.filter(q=>q.G===+G).sort((a,b)=>a.V-b.V)}
function completeSolar(G){
 const a=solarRows(G),p=solarPars(G);if(a.length<12)return false;if(!a.some(q=>Math.abs(q.V)<1e-9))return false;
 const nearBelow=a.some(q=>q.V>=p.Voc-.045&&q.V<p.Voc&&q.I>0),nearAbove=a.some(q=>q.V>=p.Voc&&q.V<=p.Voc+.035&&q.I<=.01),knee=a.filter(q=>q.V>=p.Voc*.65&&q.V<=p.Voc*.92).length>=4;return nearBelow&&nearAbove&&knee;
}
function solarGValues(){return [...new Set(s.solar.map(q=>q.G))].sort((a,b)=>a-b)}
function syncIrrOptions(){
 const vals=solarGValues(),prev=+E('analysisIrr').value;E('analysisIrr').innerHTML=vals.length?vals.map(G=>'<option value="'+G+'">'+G+' W/m²'+(completeSolar(G)?' · complete':'')+'</option>').join(''):'<option value="">record solar data first</option>';if(vals.includes(prev))E('analysisIrr').value=String(prev);else if(vals.length)E('analysisIrr').value=String(vals[0]);loadSolarFields();
}
function solarExpected(G){
 const a=solarRows(G);if(!completeSolar(G))return null;const p=solarPars(G),zero=a.find(q=>Math.abs(q.V)<1e-9),pk=a.reduce((x,y)=>y.P>x.P?y:x),Isc=zero.I,Voc=p.Voc,ff=pk.P/(Isc*Voc),eta=100*pk.P/(G*ACELL);return{rows:a,Isc,Voc,Vmpp:pk.V,Impp:pk.I,Pmax:pk.P,ff,eta};
}
function loadSolarFields(){
 const G=+E('analysisIrr').value,a=s.solarAnalyses[String(G)],ids=['studentIsc','studentVoc','studentVmpp','studentImpp','studentPmax','studentFF','studentEta'];ids.forEach(id=>E(id).value='');if(a)[a.Isc,a.Voc,a.Vmpp,a.Impp,a.Pmax,a.ff,a.eta].forEach((v,i)=>E(ids[i]).value=v);drawSolarChart();
}
function checkSolar(){
 const G=+E('analysisIrr').value,e=solarExpected(G);if(!e){E('solarAnalysisMsg').className='notice warn';E('solarAnalysisMsg').textContent='The selected irradiance needs ≥12 manual points including V=0, a bracket around Voc and several close points around the I–V knee.';return}
 const ids=['studentIsc','studentVoc','studentVmpp','studentImpp','studentPmax','studentFF','studentEta'],v=ids.map(id=>+E(id).value);if(v.some(z=>!Number.isFinite(z))||v.some((z,i)=>i!==1&&z<0)){E('solarAnalysisMsg').className='notice warn';E('solarAnalysisMsg').textContent='Enter all solar-cell performance quantities.';return}
 const [Isc,Voc,Vmpp,Impp,Pmax,ff,eta]=v;
 if(Math.abs(Isc-e.Isc)>.012){E('solarAnalysisMsg').className='notice warn';E('solarAnalysisMsg').textContent='Use the measured current at V=0 for I_sc.';return}
 if(Math.abs(Voc-e.Voc)>.018){E('solarAnalysisMsg').className='notice warn';E('solarAnalysisMsg').textContent='Interpolate the voltage where the measured I–V curve reaches I≈0.';return}
 if(Math.abs(Vmpp-e.Vmpp)>.012||Math.abs(Impp-e.Impp)>.012||Math.abs(Pmax-e.Pmax)>Math.max(.006,.012*e.Pmax)){E('solarAnalysisMsg').className='notice warn';E('solarAnalysisMsg').textContent='Locate the maximum of your measured P=VI values and report its V, I and P.';return}
 const eff=100*Pmax/(G*ACELL),effFF=Pmax/(Isc*Voc);if(Math.abs(ff-effFF)>.008){E('solarAnalysisMsg').className='notice warn';E('solarAnalysisMsg').textContent='Recalculate FF=Pmax/(Voc·Isc).';return}
 if(Math.abs(eta-eff)>.15){E('solarAnalysisMsg').className='notice warn';E('solarAnalysisMsg').textContent='Recalculate η=100Pmax/(G·Acell), with Acell=0.0100 m².';return}
 s.solarAnalyses[String(G)]={Isc,Voc,Vmpp,Impp,Pmax,ff,eta};E('solarAnalysisMsg').className='notice ok';E('solarAnalysisMsg').textContent='Solar-cell performance analysis accepted for '+G+' W/m².';render();save();
}
function drawSolarChart(){
 const G=+E('analysisIrr').value,a=solarRows(G);if(a.length>=2)U.plot(E('solarChart'),[{pts:a.map(q=>({x:q.V,y:q.I}))},{pts:a.map(q=>({x:q.V,y:q.P})),color:'#b06336'}],{xlabel:'cell voltage / V',ylabel:'I / A (blue) · P / W (orange)',xmin:0,ymin:0});else blank('solarChart','Record manual I–V points at an irradiance.');
}
function blank(id,msg){const q=U.canvas(E(id));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function render(){
 drawCond();drawSolar();E('semiBody').innerHTML=s.semi.length?s.semi.map(q=>'<tr><td>'+q.T+'</td><td>'+q.V.toFixed(2)+'</td><td>'+(q.I*1000).toFixed(3)+'</td><td>'+q.sigma.toExponential(3)+'</td></tr>').join(''):'<tr><td colspan="4">No accepted conductivity points yet.</td></tr>';E('semiCount').textContent=s.semi.length+' / 8';E('semiSpan').textContent=s.semi.length?(s.semi[0].T+'–'+s.semi.at(-1).T+' K'):'—';
 const se=semiExpected();if(se)U.plot(E('arrChart'),[{pts:se.pts}],{xlabel:'1/T / K⁻¹',ylabel:'ln σ'});else blank('arrChart','Record a broad conductivity-temperature series.');E('egOut').textContent=s.semiAnalysis?s.semiAnalysis.Eg.toFixed(2)+' eV':'—';E('materialOut').textContent=s.semiAnalysis?(s.semiAnalysis.material==='ge'?'Ge-like':'Si-like'):'—';if(s.semiAnalysis){E('studentArrSlope').value=s.semiAnalysis.slope;E('studentEg').value=s.semiAnalysis.Eg;E('studentMaterial').value=s.semiAnalysis.material}
 E('solarBody').innerHTML=s.solar.length?s.solar.map(q=>'<tr><td>'+q.G+'</td><td>'+q.V.toFixed(2)+'</td><td>'+q.I.toFixed(3)+'</td><td>'+q.P.toFixed(3)+'</td></tr>').join(''):'<tr><td colspan="4">No accepted solar-cell points yet.</td></tr>';const completeG=solarGValues().filter(completeSolar);E('solarDatasets').textContent=completeG.length+' / 2';E('solarCount').textContent=solarRows(+E('irr').value).length+' / 12';syncIrrOptions();
 const G=+E('analysisIrr').value,a=s.solarAnalyses[String(G)];E('iscOut').textContent=a?a.Isc.toFixed(3)+' A':'—';E('vocOut').textContent=a?a.Voc.toFixed(3)+' V':'—';E('pmaxOut').textContent=a?a.Pmax.toFixed(3)+' W':'—';E('ffOut').textContent=a?a.ff.toFixed(3):'—';E('etaOut').textContent=a?a.eta.toFixed(1)+'%':'—';
 const solarAnalysed=Object.keys(s.solarAnalyses).length,words=s.interpretation.trim().length>=65;E('progress').innerHTML='<div class="item '+(s.semiAnalysis?'done':'')+'">'+(s.semiAnalysis?'✓':'○')+' semiconductor Arrhenius gap</div><div class="item '+(completeG.length>=2?'done':'')+'">'+(completeG.length>=2?'✓':'○')+' ≥2 complete manual solar I–V datasets</div><div class="item '+(solarAnalysed>=2?'done':'')+'">'+(solarAnalysed>=2?'✓':'○')+' ≥2 photovoltaic performance analyses</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' temperature/irradiance interpretation</div>';
}
function newSpecimen(){if((s.semi.length||s.solar.length)&&!confirm('Load a new semiconductor/solar specimen and clear all current measurements?'))return;s={version:2,run:makeRun(),semi:[],semiAnalysis:null,solar:[],solarAnalyses:{},interpretation:''};E('interpretation').value='';['studentArrSlope','studentEg'].forEach(id=>E(id).value='');E('studentMaterial').value='';clearSemiInputs();clearSolarInputs();render();save()}
function buildReport(){
 const sol=Object.entries(s.solarAnalyses).map(([G,a])=>G+' W/m²: Isc='+a.Isc.toFixed(3)+' A, Voc='+a.Voc.toFixed(3)+' V, Pmax='+a.Pmax.toFixed(3)+' W, FF='+a.ff.toFixed(3)+', η='+a.eta.toFixed(1)+'%').join(' · ');
 const summary='<p><b>Run:</b> '+U.esc(s.run.id)+'. <b>Semiconductor points:</b> '+s.semi.length+'. <b>Band gap:</b> '+(s.semiAnalysis?s.semiAnalysis.Eg.toFixed(2)+' eV ('+(s.semiAnalysis.material==='ge'?'Ge-like':'Si-like')+')':'not validated')+'.</p><p><b>Solar analyses:</b> '+(sol||'none validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 5 — Semiconductor Conduction & Solar Cell',summary);
}
U.tabs();E('interpretation').value=s.interpretation;['temperature','bias'].forEach(id=>E(id).addEventListener('input',()=>{clearSemiInputs();drawCond()}));['irr','cellV'].forEach(id=>E(id).addEventListener('input',()=>{clearSolarInputs();drawSolar();if(id==='irr')render()}));E('recordSemi').onclick=recSemi;E('newSpecimen').onclick=newSpecimen;E('recordSolar').onclick=recSolar;E('checkSemiAnalysis').onclick=checkSemi;E('analysisIrr').addEventListener('change',loadSolarFields);E('checkSolarAnalysis').onclick=checkSolar;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();