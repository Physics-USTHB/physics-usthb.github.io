(()=>{ 'use strict';
const U=ThermoUI,E=id=>document.getElementById(id),K='THERMO_T03_v4',CP=4180;
const MIX_READINGS={
  Mcal:{label:'Empty calorimeter mass Mcal',instrument:'Digital balance',unit:'g',kind:'M'},
  Mcold:{label:'Calorimeter + cold water mass',instrument:'Digital balance',unit:'g',kind:'M'},
  Mhot:{label:'Calorimeter + hot water mass',instrument:'Digital balance',unit:'g',kind:'M'},
  Tcold:{label:'Cold-water temperature',instrument:'Thermometer',unit:'°C',kind:'T'},
  Thot:{label:'Hot-water temperature',instrument:'Thermometer',unit:'°C',kind:'T'},
  Tfinal:{label:'Equilibrium temperature',instrument:'Thermometer',unit:'°C',kind:'T'},
  Mfinal:{label:'Final calorimeter + mixture mass',instrument:'Digital balance',unit:'g',kind:'M'}
};
const MIX_ACTIONS={
  fillCold:'Fill one calorimeter to about one third with cold water.',
  fillHot:'Fill the second calorimeter to about one third with hot water about 20°C above room temperature.',
  hotToCold:'Immediately add the hot water to the cold water.',
  coldToHot:'Immediately add the cold water to the hot water.',
  stir:'Stir the mixture continuously with the thermometer until equilibrium.'
};
const METAL_READINGS={
  M:{label:'Metal-sample mass M',instrument:'Digital balance',unit:'g',kind:'M'},
  P:{label:'Atmospheric pressure P',instrument:'Barometer',unit:'hPa',kind:'P'},
  m:{label:'Water mass m in calorimeter',instrument:'Digital balance',unit:'g',kind:'M'},
  Ti:{label:'Initial water temperature Ti',instrument:'Thermometer',unit:'°C',kind:'T'},
  Tf:{label:'Equilibrium temperature Tf',instrument:'Thermometer',unit:'°C',kind:'T'}
};
const METAL_ACTIONS={
  beads:'Fill the beaker bottom with about 3 cm of glass beads.',
  boil:'Place the metal in boiling water without letting it touch the beaker bottom.',
  wait:'Wait about 10 minutes for the metal to reach the boiling-water temperature.',
  water:'Put a measured mass of water into the calorimeter.',
  transfer:'Transfer the hot metal into the calorimeter water.',
  stir:'Stir until thermal equilibrium is reached.'
};
function q(x,step=.1){return Math.round(x/step)*step}
function boilT(P){const d=P-1013;return 100+0.276*d-17e-6*d*d}
function makeTrial(i){
  const Ta=22.5+Math.random()*2,Mcal=q(105+Math.random()*18),mc=q(75+Math.random()*50),mh=q(75+Math.random()*50);
  const Tcold=q(14+Math.random()*6),Thot=q(Ta+18+Math.random()*5),ideal=(mc*Tcold+mh*Thot)/(mc+mh);
  const Tfinal=q(ideal+(Ta-ideal)*(0.01+Math.random()*.025));
  const spill=q(.1+Math.random()*.4);
  return{Mcal,Mcold:q(Mcal+mc),Mhot:q(Mcal+mh),Tcold,Thot,Tfinal,Mfinal:q(Mcal+mc+mh-spill),direction:i===0?'hotToCold':'coldToHot'};
}
function makeMetal(){
  const cps=[385,450,900],cTrue=cps[Math.floor(Math.random()*cps.length)]*(.985+Math.random()*.03),M=q(45+Math.random()*35),P=q(985+Math.random()*45,.1),T0=boilT(P),m=q(120+Math.random()*60),Ti=q(18+Math.random()*6);
  const ideal=(M/1000*cTrue*T0+m/1000*CP*Ti)/(M/1000*cTrue+m/1000*CP),Ta=23.5,Tf=q(ideal+(Ta-ideal)*(0.01+Math.random()*.02));
  return{M,P,T0,m,Ti,Tf,cTrue};
}
function makeRun(){return{id:'T03-'+Math.random().toString(36).slice(2,7).toUpperCase(),trials:[0,1,2].map(makeTrial),metal:makeMetal()}}
function mixFlow(i){
  const dir=i===0?'hotToCold':'coldToHot';
  return[
    {type:'reading',key:'Mcal',...MIX_READINGS.Mcal},
    {type:'action',key:'fillCold',label:MIX_ACTIONS.fillCold},
    {type:'reading',key:'Mcold',...MIX_READINGS.Mcold},
    {type:'action',key:'fillHot',label:MIX_ACTIONS.fillHot},
    {type:'reading',key:'Mhot',...MIX_READINGS.Mhot},
    {type:'reading',key:'Tcold',...MIX_READINGS.Tcold},
    {type:'reading',key:'Thot',...MIX_READINGS.Thot},
    {type:'action',key:dir,label:MIX_ACTIONS[dir]},
    {type:'action',key:'stir',label:MIX_ACTIONS.stir},
    {type:'reading',key:'Tfinal',...MIX_READINGS.Tfinal},
    {type:'reading',key:'Mfinal',...MIX_READINGS.Mfinal}
  ];
}
function metalFlow(){return[
  {type:'reading',key:'M',...METAL_READINGS.M},
  {type:'action',key:'beads',label:METAL_ACTIONS.beads},
  {type:'action',key:'boil',label:METAL_ACTIONS.boil},
  {type:'action',key:'wait',label:METAL_ACTIONS.wait},
  {type:'reading',key:'P',...METAL_READINGS.P},
  {type:'action',key:'water',label:METAL_ACTIONS.water},
  {type:'reading',key:'m',...METAL_READINGS.m},
  {type:'reading',key:'Ti',...METAL_READINGS.Ti},
  {type:'action',key:'transfer',label:METAL_ACTIONS.transfer},
  {type:'action',key:'stir',label:METAL_ACTIONS.stir},
  {type:'reading',key:'Tf',...METAL_READINGS.Tf}
]}
let s=U.load(K,null);
if(!s||s.version!==4)s={version:4,run:makeRun(),mix:[0,1,2].map(()=>({step:0,readings:{},analysis:null})),metal:{step:0,readings:{},analysis:null},hypT:null,energyComment:'',metalComment:''};
function save(){U.save(K,s)}
function trialIndex(){return +E('trialSelect').value}
function fmt(step,v){return step.kind==='M'?v.toFixed(1)+' g':step.kind==='P'?v.toFixed(1)+' hPa':v.toFixed(1)+' °C'}
function mixCurrent(){const i=trialIndex(),flow=mixFlow(i),st=s.mix[i];return{i,flow,st,step:flow[Math.min(st.step,flow.length-1)],done:st.step>=flow.length}}
function metalCurrent(){const flow=metalFlow(),st=s.metal;return{flow,st,step:flow[Math.min(st.step,flow.length-1)],done:st.step>=flow.length}}
function canvas(id){const c=E(id),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||360;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);return{x,w,h}}
function drawMix(){
  const{x,w,h}=canvas('mixCanvas'),i=trialIndex(),t=s.run.trials[i],st=s.mix[i];x.fillStyle='#071713';x.fillRect(0,0,w,h);
  x.fillStyle='#aebdc4';x.fillRect(w*.16,h*.44,w*.20,h*.28);x.fillRect(w*.64,h*.44,w*.20,h*.28);
  x.fillStyle='#65a8d2';x.globalAlpha=.75;x.fillRect(w*.18,h*.55,w*.16,h*.14);x.fillStyle='#df8a52';x.fillRect(w*.66,h*.55,w*.16,h*.14);x.globalAlpha=1;
  x.fillStyle='#dce8ec';x.font='700 12px system-ui';x.fillText('cold-water calorimeter',w*.14,h*.39);x.fillText('hot-water calorimeter',w*.62,h*.39);
  x.fillStyle='#9ec0ca';x.font='600 12px system-ui';x.fillText('Trial '+(i+1)+' · '+(i===0?'hot water is poured into cold water':'cold water is poured into hot water'),18,25);
  if(st.step>=7){x.strokeStyle='#f0c36f';x.lineWidth=4;x.beginPath();x.moveTo(i===0?w*.68:w*.30,h*.52);x.lineTo(i===0?w*.36:w*.64,h*.52);x.stroke();}
  if(st.step>=8){x.fillStyle='#f0d18b';x.font='700 12px system-ui';x.fillText('stirring',w*.47,h*.80);}
}
function drawMetal(){
  const{x,w,h}=canvas('metalCanvas'),st=s.metal;x.fillStyle='#071713';x.fillRect(0,0,w,h);
  x.fillStyle='#b8c6ca';x.fillRect(w*.12,h*.43,w*.24,h*.31);x.fillStyle='#ef9a5e';x.globalAlpha=.72;x.fillRect(w*.14,h*.54,w*.20,h*.17);x.globalAlpha=1;
  for(let k=0;k<6;k++){x.fillStyle='#8ea1a8';x.beginPath();x.arc(w*(.15+.035*k),h*.68,7,0,Math.PI*2);x.fill();}
  x.fillStyle='#dbe7ea';x.font='700 12px system-ui';x.fillText('boiling-water beaker + glass beads',w*.10,h*.38);
  x.fillStyle='#aebdc4';x.fillRect(w*.64,h*.43,w*.20,h*.30);x.fillStyle='#6aa7cc';x.globalAlpha=.72;x.fillRect(w*.66,h*.55,w*.16,h*.14);x.globalAlpha=1;x.fillStyle='#dbe7ea';x.fillText('calorimeter water',w*.66,h*.38);
  if(st.step>=8){x.strokeStyle='#d58a50';x.lineWidth=6;x.beginPath();x.moveTo(w*.30,h*.42);x.lineTo(w*.70,h*.52);x.stroke();x.fillStyle='#f0c16d';x.fillText('hot metal transferred',w*.41,h*.34);}
}
function renderMix(){
  const q=mixCurrent(),truth=s.run.trials[q.i];E('mixStepName').value=q.done?'Completed':q.step.label;
  const action=!q.done&&q.step.type==='action';E('mixInstrument').value=q.done?'—':action?'procedure':fmt(q.step,truth[q.step.key]);E('mixUnit').value=q.done||action?'—':q.step.unit;E('mixStudentReading').disabled=q.done||action;E('mixRecord').disabled=q.done||action;
  E('mixActionBox').style.display=action?'grid':'none';E('mixPerformAction').disabled=!action;
  if(action){const keys=['fillCold','fillHot',q.i===0?'hotToCold':'coldToHot','stir'];E('mixActionChoice').innerHTML='<option value="">Select the operation you would perform…</option>'+keys.map(k=>'<option value="'+k+'">'+MIX_ACTIONS[k]+'</option>').join('');E('mixActionChoice').value='';}
  E('mixProgress').innerHTML=q.flow.map((z,k)=>'<div class="item '+(k<q.st.step?'done':'')+'">'+(k<q.st.step?'✓':'○')+' '+z.label+'</div>').join('');
  const keys=['Mcal','Mcold','Mhot','Tcold','Thot','Tfinal','Mfinal'];E('mixReadingsBody').innerHTML=keys.map(k=>'<tr><td>'+MIX_READINGS[k].label+'</td>'+[0,1,2].map(i=>{const v=s.mix[i].readings[k];return'<td>'+(v==null?'—':fmt(MIX_READINGS[k],+v))+'</td>'}).join('')+'</tr>').join('');
  loadMixAnalysisFields();drawMix();
}
function recordMix(){
  const q=mixCurrent();if(q.done||q.step.type!=='reading')return;const raw=E('mixStudentReading').value.trim(),v=+raw,truth=s.run.trials[q.i][q.step.key];if(raw===''||!Number.isFinite(v)){E('mixMsg').className='notice warn';E('mixMsg').textContent='Enter the displayed instrument reading.';return}
  const tol=q.step.kind==='M'?.11:q.step.kind==='P'?.11:.11;if(Math.abs(v-truth)>tol){E('mixMsg').className='notice warn';E('mixMsg').textContent='Re-read the '+q.step.instrument.toLowerCase()+' at the stated resolution.';return}
  q.st.readings[q.step.key]=v;q.st.step++;q.st.analysis=null;E('mixStudentReading').value='';E('mixMsg').className='notice ok';E('mixMsg').textContent=q.st.step>=q.flow.length?'Trial complete. Calculate the water masses and heat exchanges.':'Reading accepted. Continue with the next step.';renderMix();renderAnalysis();save();
}
function performMixAction(){
  const q=mixCurrent();if(q.done||q.step.type!=='action')return;const c=E('mixActionChoice').value;if(c!==q.step.key){E('mixMsg').className='notice warn';E('mixMsg').textContent='That operation is out of sequence for this trial.';return}
  q.st.step++;q.st.analysis=null;E('mixMsg').className='notice ok';E('mixMsg').textContent='Operation completed. Continue immediately with the next measurement/procedure step.';renderMix();renderAnalysis();save();
}
function restartMix(){
  const i=trialIndex();if((s.mix[i].step||Object.keys(s.mix[i].readings).length)&&!confirm('Restart Trial '+(i+1)+' and clear its readings/calculations?'))return;s.mix[i]={step:0,readings:{},analysis:null};E('mixStudentReading').value='';E('mixMsg').className='notice';E('mixMsg').textContent='Trial restarted. Begin by weighing the empty calorimeter.';renderMix();renderAnalysis();save();
}
function mixExpected(i){
  const r=s.mix[i].readings;if(['Mcal','Mcold','Mhot','Tcold','Thot','Tfinal','Mfinal'].some(k=>r[k]==null))return null;
  const mc=r.Mcold-r.Mcal,mh=r.Mhot-r.Mcal,dC=r.Tfinal-r.Tcold,dH=r.Tfinal-r.Thot,Qc=mc/1000*CP*dC,Qh=mh/1000*CP*dH,res=100*Math.abs(Qc+Qh)/((Math.abs(Qc)+Math.abs(Qh))/2);
  return{mc,mh,dC,dH,Qc,Qh,res};
}
function loadMixAnalysisFields(){
  const a=s.mix[trialIndex()].analysis,ids=['mixColdMass','mixHotMass','mixDeltaCold','mixDeltaHot','mixQCold','mixQHot','mixResidual'];ids.forEach(id=>E(id).value='');if(!a)return;[a.mc,a.mh,a.dC,a.dH,a.Qc,a.Qh,a.res].forEach((v,k)=>E(ids[k]).value=v);
}
function checkMix(){
  const i=trialIndex(),e=mixExpected(i);if(!e){E('mixAnalysisMsg').className='notice warn';E('mixAnalysisMsg').textContent='Complete the selected trial first.';return}
  const ids=['mixColdMass','mixHotMass','mixDeltaCold','mixDeltaHot','mixQCold','mixQHot','mixResidual'],v=ids.map(id=>+E(id).value);if(v.some(x=>!Number.isFinite(x))){E('mixAnalysisMsg').className='notice warn';E('mixAnalysisMsg').textContent='Enter all seven calculated quantities.';return}
  const [mc,mh,dC,dH,Qc,Qh,res]=v;
  if(Math.abs(mc-e.mc)>.21||Math.abs(mh-e.mh)>.21){E('mixAnalysisMsg').className='notice warn';E('mixAnalysisMsg').textContent='Recalculate each water mass by subtracting the empty-calorimeter mass.';return}
  if(Math.abs(dC-e.dC)>.12||Math.abs(dH-e.dH)>.12){E('mixAnalysisMsg').className='notice warn';E('mixAnalysisMsg').textContent='Use ΔT = Tfinal − Tinitial, keeping the hot-water temperature change negative.';return}
  if(Math.abs(Qc-e.Qc)>Math.max(8,.018*Math.abs(e.Qc))||Math.abs(Qh-e.Qh)>Math.max(8,.018*Math.abs(e.Qh))){E('mixAnalysisMsg').className='notice warn';E('mixAnalysisMsg').textContent='Recalculate ΔQ = m c ΔT with masses in kilograms.';return}
  if(Math.abs(res-e.res)>.35){E('mixAnalysisMsg').className='notice warn';E('mixAnalysisMsg').textContent='Recalculate the energy residual from |Qcold+Qhot| relative to the mean heat magnitude.';return}
  s.mix[i].analysis={mc,mh,dC,dH,Qc,Qh,res};E('mixAnalysisMsg').className='notice ok';E('mixAnalysisMsg').textContent='Trial analysis accepted. Repeat until all three trials are complete.';renderAnalysis();save();
}
function renderMetal(){
  const q=metalCurrent(),truth=s.run.metal;E('metalStepName').value=q.done?'Completed':q.step.label;const action=!q.done&&q.step.type==='action';E('metalInstrument').value=q.done?'—':action?'procedure':fmt(q.step,truth[q.step.key]);E('metalUnit').value=q.done||action?'—':q.step.unit;E('metalStudentReading').disabled=q.done||action;E('metalRecord').disabled=q.done||action;E('metalActionBox').style.display=action?'grid':'none';E('metalPerformAction').disabled=!action;
  if(action){const keys=['beads','boil','wait','water','transfer','stir'];E('metalActionChoice').innerHTML='<option value="">Select the operation you would perform…</option>'+keys.map(k=>'<option value="'+k+'">'+METAL_ACTIONS[k]+'</option>').join('');E('metalActionChoice').value='';}
  E('metalProgress').innerHTML=q.flow.map((z,k)=>'<div class="item '+(k<q.st.step?'done':'')+'">'+(k<q.st.step?'✓':'○')+' '+z.label+'</div>').join('');
  const keys=['M','P','m','Ti','Tf'];E('metalReadingsBody').innerHTML=keys.map(k=>{const v=s.metal.readings[k];return'<tr><th>'+METAL_READINGS[k].label+'</th><td>'+(v==null?'—':fmt(METAL_READINGS[k],+v))+'</td></tr>'}).join('');
  const a=s.metal.analysis;E('boilTOut').textContent=a?a.T0.toFixed(2)+'°C':'—';E('metalCOut').textContent=a?a.c.toFixed(0)+' J·kg⁻¹·K⁻¹':'—';E('metalUOut').textContent=a?a.u.toFixed(0)+' J·kg⁻¹·K⁻¹':'—';drawMetal();
}
function recordMetal(){
  const q=metalCurrent();if(q.done||q.step.type!=='reading')return;const raw=E('metalStudentReading').value.trim(),v=+raw,truth=s.run.metal[q.step.key];if(raw===''||!Number.isFinite(v)){E('metalMsg').className='notice warn';E('metalMsg').textContent='Enter the displayed reading.';return}
  const tol=q.step.kind==='P'?.11:.11;if(Math.abs(v-truth)>tol){E('metalMsg').className='notice warn';E('metalMsg').textContent='Re-read the '+q.step.instrument.toLowerCase()+' at the stated resolution.';return}
  q.st.readings[q.step.key]=v;q.st.step++;q.st.analysis=null;E('metalStudentReading').value='';E('metalMsg').className='notice ok';E('metalMsg').textContent=q.st.step>=q.flow.length?'Metal experiment complete. Calculate T₀ and c′.':'Reading accepted. Continue with the next procedure step.';renderMetal();renderAnalysis();save();
}
function performMetalAction(){
  const q=metalCurrent();if(q.done||q.step.type!=='action')return;const c=E('metalActionChoice').value;if(c!==q.step.key){E('metalMsg').className='notice warn';E('metalMsg').textContent='That operation is out of sequence.';return}
  q.st.step++;q.st.analysis=null;E('metalMsg').className='notice ok';E('metalMsg').textContent=q.step.key==='wait'?'Ten-minute heating period completed. Measure atmospheric pressure for the boiling-point correction.':'Operation completed. Continue with the next step.';renderMetal();renderAnalysis();save();
}
function restartMetal(){if((s.metal.step||Object.keys(s.metal.readings).length)&&!confirm('Restart the metal experiment?'))return;s.metal={step:0,readings:{},analysis:null};['studentBoilT','studentMetalC','studentMetalU'].forEach(id=>E(id).value='');E('metalMsg').className='notice';E('metalMsg').textContent='Metal experiment restarted. Begin by weighing the sample.';renderMetal();renderAnalysis();save()}
function metalExpected(){
  const r=s.metal.readings;if(['M','P','m','Ti','Tf'].some(k=>r[k]==null))return null;const T0=boilT(r.P),M=r.M/1000,m=r.m/1000,c=m*CP*(r.Tf-r.Ti)/(M*(T0-r.Tf));
  const res={M:.1,P:.1,m:.1,Ti:.1,Tf:.1};let u=0;
  for(const key of Object.keys(res)){const rp={...r,[key]:r[key]+res[key]},rm={...r,[key]:r[key]-res[key]},calc=z=>{const bt=boilT(z.P),MM=z.M/1000,mm=z.m/1000;return mm*CP*(z.Tf-z.Ti)/(MM*(bt-z.Tf))};u+=Math.abs(calc(rp)-calc(rm))/2}
  return{T0,c,u};
}
function checkMetal(){
  const e=metalExpected();if(!e){E('metalAnalysisMsg').className='notice warn';E('metalAnalysisMsg').textContent='Complete the metal experiment first.';return}
  const T0=+E('studentBoilT').value,c=+E('studentMetalC').value,u=+E('studentMetalU').value;if([T0,c,u].some(v=>!Number.isFinite(v))||c<=0||u<=0){E('metalAnalysisMsg').className='notice warn';E('metalAnalysisMsg').textContent='Enter T₀, c′ and its estimated uncertainty.';return}
  if(Math.abs(T0-e.T0)>.08){E('metalAnalysisMsg').className='notice warn';E('metalAnalysisMsg').textContent='Recalculate the boiling temperature from atmospheric pressure using the handout correction.';return}
  if(Math.abs(c-e.c)>Math.max(8,.025*e.c)){E('metalAnalysisMsg').className='notice warn';E('metalAnalysisMsg').textContent='Rearrange Qmetal+Qwater=0 to solve for c′.';return}
  if(Math.abs(u-e.u)>Math.max(2,.10*e.u)){E('metalAnalysisMsg').className='notice warn';E('metalAnalysisMsg').textContent='Propagate the ±0.1 g, ±0.1 hPa and ±0.1°C direct-reading resolutions through c′.';return}
  s.metal.analysis={T0,c,u};E('metalAnalysisMsg').className='notice ok';E('metalAnalysisMsg').textContent='Metal specific heat accepted. Compare it with likely material values in your interpretation.';renderMetal();renderAnalysis();save();
}
function checkHyp(){const v=+E('studentHypT').value,e=(200*85+150*15)/350;if(!Number.isFinite(v)){E('hypMsg').className='notice warn';E('hypMsg').textContent='Enter the calculated equilibrium temperature.';return}if(Math.abs(v-e)>.11){E('hypMsg').className='notice warn';E('hypMsg').textContent='Apply m₁c(T−T₁)+m₂c(T−T₂)=0.';return}s.hypT=v;E('hypMsg').className='notice ok';E('hypMsg').textContent='Equilibrium-temperature calculation accepted.';renderAnalysis();save()}
function renderAnalysis(){
  E('summaryBody').innerHTML=[0,1,2].map(i=>{const a=s.mix[i].analysis;return'<tr><td>'+(i+1)+'</td><td>'+(a?a.Qc.toFixed(0):'—')+'</td><td>'+(a?a.Qh.toFixed(0):'—')+'</td><td>'+(a?a.res.toFixed(1):'—')+'</td></tr>'}).join('');
  E('hypTOut').textContent=s.hypT!=null?Number(s.hypT).toFixed(1)+'°C':'—';
  const doneMix=s.mix.filter(q=>q.analysis).length,comments=s.energyComment.trim().length>=60&&s.metalComment.trim().length>=60;E('overallProgress').innerHTML='<div class="item '+(doneMix===3?'done':'')+'">'+(doneMix===3?'✓':'○')+' three water-mixing analyses ('+doneMix+'/3)</div><div class="item '+(s.hypT!=null?'done':'')+'">'+(s.hypT!=null?'✓':'○')+' handout equilibrium-temperature question</div><div class="item '+(s.metal.analysis?'done':'')+'">'+(s.metal.analysis?'✓':'○')+' metal specific heat</div><div class="item '+(comments?'done':'')+'">'+(comments?'✓':'○')+' interpretation of energy residuals and metal result</div>';
}
function buildReport(){
  const mix=s.mix.map((q,i)=>q.analysis?'Trial '+(i+1)+': Qcold='+q.analysis.Qc.toFixed(0)+' J, Qhot='+q.analysis.Qh.toFixed(0)+' J, residual='+q.analysis.res.toFixed(1)+'%':'Trial '+(i+1)+': incomplete').join(' · '),m=s.metal.analysis;
  const summary='<p><b>Run:</b> '+U.esc(s.run.id)+'.</p><p><b>Water mixing:</b> '+mix+'.</p><p><b>Handout equilibrium question:</b> '+(s.hypT!=null?Number(s.hypT).toFixed(1)+'°C':'not completed')+'.</p><p><b>Metal:</b> '+(m?'T₀='+m.T0.toFixed(2)+'°C, c′='+m.c.toFixed(0)+' ± '+m.u.toFixed(0)+' J·kg⁻¹·K⁻¹':'not validated')+'.</p><p><b>Energy-conservation comment:</b> '+U.esc(s.energyComment||'Not completed.')+'</p><p><b>Metal interpretation:</b> '+U.esc(s.metalComment||'Not completed.')+'</p>';
  return U.report('Laboratory Practical 3 — Calorimetry',summary);
}
function renderAll(){renderMix();renderMetal();renderAnalysis()}
U.tabs();E('energyComment').value=s.energyComment;E('metalComment').value=s.metalComment;if(s.hypT!=null)E('studentHypT').value=s.hypT;if(s.metal.analysis){E('studentBoilT').value=s.metal.analysis.T0;E('studentMetalC').value=s.metal.analysis.c;E('studentMetalU').value=s.metal.analysis.u}
E('trialSelect').addEventListener('change',()=>{E('mixStudentReading').value='';renderMix()});E('mixRecord').onclick=recordMix;E('mixPerformAction').onclick=performMixAction;E('mixRestart').onclick=restartMix;E('mixCheck').onclick=checkMix;
E('metalRecord').onclick=recordMetal;E('metalPerformAction').onclick=performMetalAction;E('metalRestart').onclick=restartMetal;E('checkMetal').onclick=checkMetal;E('checkHypT').onclick=checkHyp;
E('energyComment').addEventListener('input',e=>{s.energyComment=e.target.value;renderAnalysis();save()});E('metalComment').addEventListener('input',e=>{s.metalComment=e.target.value;renderAnalysis();save()});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',()=>{drawMix();drawMetal()});renderAll();save();
})();