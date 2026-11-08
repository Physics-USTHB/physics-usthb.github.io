(()=>{
'use strict';
const U=ThermoUI,E=id=>document.getElementById(id),K='THERMO_T01_v3',CP=4180,LV_REF=2260,LF_REF=334;
const STEPS=[
  {key:'Ta',label:'Ambient temperature Tₐ',instrument:'Room thermometer',unit:'°C',kind:'T'},
  {key:'Mcal',label:'Empty calorimeter mass Mcal',instrument:'Digital balance',unit:'g',kind:'M'},
  {key:'Mfilled',label:'Calorimeter + initial water mass',instrument:'Digital balance',unit:'g',kind:'M'},
  {key:'Ti',label:'Initial water temperature Tᵢ',instrument:'Calorimeter thermometer',unit:'°C',kind:'T'},
  {key:'Tf',label:'Equilibrium temperature Tƒ',instrument:'Calorimeter thermometer',unit:'°C',kind:'T'},
  {key:'Mf',label:'Final calorimeter mass Mƒ',instrument:'Digital balance',unit:'g',kind:'M'}
];
function q1(x){return Math.round(x*10)/10}
function makeRun(){
  const Ta=q1(22.5+Math.random()*2.5),Mcal=q1(108+Math.random()*18),mwS=(145+Math.random()*28)/1000,TiS=Ta-(9+Math.random()*2),Lv=LV_REF*1000*(.982+Math.random()*.036),TfS=Ta+(.15+Math.random()*.55);
  const mc=mwS*CP*(TfS-TiS)/(Lv+CP*(100-TfS));
  const mwI=(145+Math.random()*30)/1000,TiI=Ta+(14+Math.random()*2),Lf=LF_REF*1000*(.982+Math.random()*.036),TfI=Math.max(5,Ta-(13+Math.random()*2));
  const mg=mwI*CP*(TiI-TfI)/(Lf+CP*TfI);
  return{
    id:'T01-'+Math.random().toString(36).slice(2,7).toUpperCase(),
    steam:{Ta:q1(Ta),Mcal:q1(Mcal),Mfilled:q1(Mcal+mwS*1000),Ti:q1(TiS),Tf:q1(TfS),Mf:q1(Mcal+(mwS+mc)*1000)},
    ice:{Ta:q1(Ta),Mcal:q1(Mcal),Mfilled:q1(Mcal+mwI*1000),Ti:q1(TiI),Tf:q1(TfI),Mf:q1(Mcal+(mwI+mg)*1000)}
  };
}
let s=U.load(K,null);
if(!s||s.version!==3)s={version:3,run:makeRun(),parts:{steam:{step:0,readings:{}},ice:{step:0,readings:{}}},analysis:{steam:null,ice:null},sources:''};
s.parts=s.parts||{steam:{step:0,readings:{}},ice:{step:0,readings:{}}};for(const p of ['steam','ice'])s.parts[p]=s.parts[p]||{step:0,readings:{}};s.analysis=s.analysis||{steam:null,ice:null};s.sources=s.sources||'';
function save(){U.save(K,s)}
function part(){return E('part').value}
function pstate(p=part()){return s.parts[p]}
function trueValue(p,key){return s.run[p][key]}
function fmtReading(step,v){return step.kind==='M'?v.toFixed(1)+' g':v.toFixed(1)+' °C'}
function currentStep(p=part()){return STEPS[Math.min(pstate(p).step,STEPS.length-1)]}
function drawBench(){
  const c=E('benchCanvas'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);
  const p=part(),st=pstate(p),step=currentStep(p),done=st.step>=STEPS.length;
  x.fillStyle='#071713';x.fillRect(0,0,w,h);
  x.fillStyle='#132a31';x.fillRect(w*.08,h*.72,w*.84,h*.08);
  x.fillStyle='#9bb5c1';x.fillRect(w*.54,h*.40,w*.22,h*.31);x.fillStyle='#c8d7dd';x.fillRect(w*.56,h*.43,w*.18,h*.25);
  x.fillStyle=p==='steam'?'#ef8f5f':'#8dc9e8';x.globalAlpha=.65;x.fillRect(w*.575,h*.50,w*.15,h*.16);x.globalAlpha=1;
  x.strokeStyle='#e7eef2';x.lineWidth=4;x.beginPath();x.moveTo(w*.72,h*.30);x.lineTo(w*.72,h*.58);x.stroke();x.fillStyle='#eff7fa';x.fillRect(w*.695,h*.27,w*.05,h*.05);
  if(p==='steam'){
    x.fillStyle='#b9c6ca';x.fillRect(w*.15,h*.42,w*.18,h*.28);x.fillStyle='#e18a4b';x.fillRect(w*.13,h*.69,w*.22,h*.04);
    x.strokeStyle='#c5d5dc';x.lineWidth=7;x.beginPath();x.moveTo(w*.33,h*.50);x.bezierCurveTo(w*.41,h*.45,w*.42,h*.38,w*.56,h*.49);x.stroke();
    for(let i=0;i<4;i++){x.strokeStyle='rgba(230,245,250,.55)';x.lineWidth=2;x.beginPath();x.arc(w*(.19+.025*i),h*(.37-.02*(i%2)),12,Math.PI,0);x.stroke();}
    x.fillStyle='#d6e2e7';x.font='700 12px system-ui';x.fillText('steam generator',w*.13,h*.37);
  }else{
    x.fillStyle='#dfeef5';x.fillRect(w*.14,h*.45,w*.19,h*.24);for(let i=0;i<5;i++){x.fillStyle='#bce7f8';x.fillRect(w*(.16+.03*(i%3)),h*(.48+.05*Math.floor(i/3)),22,22);}
    x.fillStyle='#d6e2e7';x.font='700 12px system-ui';x.fillText('dry ice cubes',w*.14,h*.40);
  }
  x.fillStyle='#10232b';x.strokeStyle='#4b6d7c';x.lineWidth=2;x.fillRect(w*.79,h*.46,w*.14,h*.22);x.strokeRect(w*.79,h*.46,w*.14,h*.22);
  x.fillStyle='#8ff0c8';x.font='700 16px ui-monospace,monospace';x.textAlign='center';
  const shown=done?'DONE':fmtReading(step,trueValue(p,step.key));x.fillText(shown,w*.86,h*.575);
  x.fillStyle='#a9c2cd';x.font='600 11px system-ui';x.fillText(step.kind==='M'?'BALANCE':'THERMOMETER',w*.86,h*.63);
  x.textAlign='left';x.fillStyle='#d8e8ef';x.font='700 13px system-ui';x.fillText(p==='steam'?'Part 1 — steam condensation':'Part 2 — ice fusion',18,25);
  x.font='600 12px system-ui';x.fillStyle='#92afbd';x.fillText(done?'All required readings accepted':step.label,18,45);
}
function renderInstrument(){
  const p=part(),st=pstate(p),done=st.step>=STEPS.length,step=currentStep(p);
  E('instrumentName').value=done?'Completed':step.instrument;E('readingUnit').value=done?'—':step.unit;
  E('instrumentValue').value=done?'—':fmtReading(step,trueValue(p,step.key));E('studentReading').disabled=done;E('recordReading').disabled=done;
}
function renderProgress(){
  const p=part(),st=pstate(p);
  E('procedureProgress').innerHTML=STEPS.map((q,i)=>'<div class="item '+(i<st.step?'done':'')+'">'+(i<st.step?'✓':'○')+' '+q.label+'</div>').join('');
  const rows=STEPS.map(q=>{const a=s.parts.steam.readings[q.key],b=s.parts.ice.readings[q.key];return'<tr><td>'+q.label+'</td><td>'+(a==null?'—':fmtReading(q,a))+'</td><td>'+(b==null?'—':fmtReading(q,b))+'</td></tr>'}).join('');
  E('readingBody').innerHTML=rows;
}
function recordReading(){
  const p=part(),st=pstate(p);if(st.step>=STEPS.length)return;const step=STEPS[st.step],v=+E('studentReading').value,truth=trueValue(p,step.key);
  if(!Number.isFinite(v)){E('benchMsg').className='notice warn';E('benchMsg').textContent='Enter the reading shown by the '+step.instrument.toLowerCase()+'.';return}
  if(Math.abs(v-truth)>.11){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the instrument to the stated 0.1 '+(step.kind==='M'?'g':'°C')+' resolution.';return}
  st.readings[step.key]=v;st.step++;s.analysis[p]=null;E('studentReading').value='';
  if(st.step>=STEPS.length){E('benchMsg').className='notice ok';E('benchMsg').textContent=(p==='steam'?'Steam-condensation':'Ice-fusion')+' measurement sequence complete. Calculate the masses and latent heat in Energy Balances.';}
  else{const nx=STEPS[st.step];E('benchMsg').className='notice ok';E('benchMsg').textContent='Reading accepted. Next: '+nx.label+'.';}
  renderAll();save();
}
function restartPart(){
  const p=part();if(Object.keys(s.parts[p].readings).length&&!confirm('Restart the selected experiment and clear its accepted readings/calculation?'))return;
  s.parts[p]={step:0,readings:{}};s.analysis[p]=null;E('studentReading').value='';clearAnalysisFields(p);E('benchMsg').className='notice';E('benchMsg').textContent='Selected experiment restarted. Begin with ambient temperature.';renderAll();save();
}
function calcPart(p){
  const r=s.parts[p].readings;if(STEPS.some(q=>r[q.key]==null))return null;
  const mw=(r.Mfilled-r.Mcal)/1000,added=(r.Mf-r.Mfilled)/1000;
  if(mw<=0||added<=0)return null;
  let L;if(p==='steam')L=(mw*CP*(r.Tf-r.Ti)-added*CP*(100-r.Tf))/added/1000;
  else L=(mw*CP*(r.Ti-r.Tf)-added*CP*r.Tf)/added/1000;
  const ref=p==='steam'?LV_REF:LF_REF,err=Math.abs(L-ref)/ref*100;
  return{mw:mw*1000,added:added*1000,L,err};
}
function clearAnalysisFields(p){
  const ids=p==='steam'?['steamMw','steamAdded','steamL','steamErr']:['iceMw','iceAdded','iceL','iceErr'];ids.forEach(id=>E(id).value='');
}
function checkAnalysis(p){
  const calc=calcPart(p),msg=E(p+'Msg');if(!calc){msg.className='notice warn';msg.textContent='Complete all six '+p+'-part readings before calculating the energy balance.';return}
  const ids=p==='steam'?['steamMw','steamAdded','steamL','steamErr']:['iceMw','iceAdded','iceL','iceErr'],raw=ids.map(id=>E(id).value.trim());
  if(raw.some(v=>v==='')){msg.className='notice warn';msg.textContent='Enter the two derived masses, latent heat and relative discrepancy.';return}
  const [mw,added,L,err]=raw.map(Number);if([mw,added,L,err].some(v=>!Number.isFinite(v))||mw<=0||added<=0||L<=0||err<0){msg.className='notice warn';msg.textContent='Enter valid positive calculated values.';return}
  if(Math.abs(mw-calc.mw)>.21){msg.className='notice warn';msg.textContent='Recalculate initial water mass from M(cal+water)−Mcal.';return}
  if(Math.abs(added-calc.added)>.21){msg.className='notice warn';msg.textContent=p==='steam'?'Recalculate condensed-steam mass from Mf−M(cal+water).':'Recalculate ice mass from Mf−M(cal+water).';return}
  if(Math.abs(L-calc.L)>Math.max(2,.012*calc.L)){msg.className='notice warn';msg.textContent=p==='steam'?'Reapply the steam condensation/cooling energy balance with masses in kg.':'Reapply the warm-water/ice fusion-and-warming energy balance with masses in kg.';return}
  if(Math.abs(err-calc.err)>.25){msg.className='notice warn';msg.textContent='Recalculate 100×|Lexperimental−Lreference|/Lreference.';return}
  s.analysis[p]={mw,added,L,err};msg.className='notice ok';msg.textContent=(p==='steam'?'Steam/vaporization':'Ice/fusion')+' latent-heat balance accepted.';renderAll();save();
}
function renderResults(){
  const a=s.analysis.steam,b=s.analysis.ice;
  E('steamMwOut').textContent=a?a.mw.toFixed(1)+' g':'—';E('steamAddedOut').textContent=a?a.added.toFixed(1)+' g':'—';E('steamLOut').textContent=a?a.L.toFixed(1)+' kJ/kg':'—';
  E('iceMwOut').textContent=b?b.mw.toFixed(1)+' g':'—';E('iceAddedOut').textContent=b?b.added.toFixed(1)+' g':'—';E('iceLOut').textContent=b?b.L.toFixed(1)+' kJ/kg':'—';
  const words=s.sources.trim().length>=55;E('progress').innerHTML='<div class="item '+(a?'done':'')+'">'+(a?'✓':'○')+' steam-condensation balance</div><div class="item '+(b?'done':'')+'">'+(b?'✓':'○')+' ice-fusion balance</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' experimental-error discussion</div>';
}
function renderAll(){drawBench();renderInstrument();renderProgress();renderResults()}
function syncPart(){E('studentReading').value='';E('benchMsg').className='notice';const st=pstate();E('benchMsg').textContent=st.step>=STEPS.length?'Selected experiment is complete. Use the Energy Balances tab.':'Read the '+currentStep().instrument.toLowerCase()+' and enter the displayed value.';renderAll()}
function buildReport(){
  const a=s.analysis.steam,b=s.analysis.ice;
  const summary='<p><b>Run:</b> '+U.esc(s.run.id)+'.</p><p><b>Steam condensation:</b> '+(a?'mwater='+a.mw.toFixed(1)+' g, mcondensed='+a.added.toFixed(1)+' g, Lv='+a.L.toFixed(1)+' kJ/kg, discrepancy='+a.err.toFixed(1)+'%.':'not validated.')+'</p><p><b>Ice fusion:</b> '+(b?'mwater='+b.mw.toFixed(1)+' g, mice='+b.added.toFixed(1)+' g, Lf='+b.L.toFixed(1)+' kJ/kg, discrepancy='+b.err.toFixed(1)+'%.':'not validated.')+'</p><p><b>Experimental-error analysis:</b> '+U.esc(s.sources||'Not completed.')+'</p>';
  return U.report('Laboratory Practical 1 — Latent Heats of Water Phase Changes',summary);
}
U.tabs();E('sources').value=s.sources;
E('part').addEventListener('change',syncPart);E('recordReading').onclick=recordReading;E('restartPart').onclick=restartPart;E('checkSteam').onclick=()=>checkAnalysis('steam');E('checkIce').onclick=()=>checkAnalysis('ice');
E('sources').addEventListener('input',e=>{s.sources=e.target.value;renderResults();save()});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.analysis.steam){E('steamMw').value=s.analysis.steam.mw;E('steamAdded').value=s.analysis.steam.added;E('steamL').value=s.analysis.steam.L;E('steamErr').value=s.analysis.steam.err}
if(s.analysis.ice){E('iceMw').value=s.analysis.ice.mw;E('iceAdded').value=s.analysis.ice.added;E('iceL').value=s.analysis.ice.L;E('iceErr').value=s.analysis.ice.err}
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',drawBench);renderAll();save();
})();