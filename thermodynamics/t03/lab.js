(()=>{
'use strict';
const U=ThermoUI,E=id=>document.getElementById(id),K='THERMO_T03_v3',CP=4180,TAU_HEAT=600;

function q(x,step){return Math.round(x/step)*step}
function makeRun(){
  const Mcal=q(104+Math.random()*22,.1),mw=q(175+Math.random()*40,.1),W=q(18+Math.random()*13,.1);
  const Ta=q(22.5+Math.random()*2.2,.1),R=q(7.4+Math.random()*1.8,.01),U=q(11.6+Math.random()*1.0,.01);
  const k=0.42+Math.random()*.24,T0=Ta-(.7+Math.random()*.7);
  return{id:'T03-'+Math.random().toString(36).slice(2,7).toUpperCase(),Mcal,Mfilled:q(Mcal+mw,.1),mw,W,Ta,R,U,k,T0,temps:null};
}
function generateTemps(run){
  const C=(run.mw+run.W)/1000*CP,P=run.U*run.U/run.R,vals=[];
  let T=run.T0;
  for(let sec=0;sec<=40*60;sec++){
    if(sec%60===0){
      const m=sec/60,noise=.025*Math.sin(m*1.73+run.Mcal*.07)+.012*Math.sin(m*.51+run.R);
      vals[m]=q(T+noise,.1);
    }
    if(sec===40*60)break;
    const min=sec/60,heater=(min>=15&&min<25),power=heater?P:0;
    T+=(power-run.k*(T-run.Ta))/C;
  }
  return vals;
}
let s=U.load(K,null);
if(!s||s.version!==3){
  const run=makeRun();run.temps=generateTemps(run);
  s={version:3,run,prepared:false,minute:0,recordings:{},analysis:null,sources:''};
}
if(!Array.isArray(s.run?.temps))s.run.temps=generateTemps(s.run);
s.recordings=s.recordings||{};s.sources=s.sources||'';

function save(){U.save(K,s)}
function expectedHeater(min=s.minute){return min>=15&&min<25?'on':'off'}
function stage(min=s.minute){return min<15?'pre-heating':min<25?'Joule heating':'post-heating'}
function allTemps(){return Array.from({length:41},(_,i)=>s.recordings[i]).every(v=>v!=null)}

function setupCanvas(){
  const c=E('benchCanvas'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;
  c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);return{x,w,h};
}
function drawBench(){
  const{x,w,h}=setupCanvas(),on=E('heater').value==='on',T=s.run.temps[s.minute];
  x.fillStyle='#071713';x.fillRect(0,0,w,h);
  x.fillStyle='#273c43';x.fillRect(w*.11,h*.68,w*.78,h*.08);
  x.fillStyle='#a9bac0';x.fillRect(w*.34,h*.29,w*.32,h*.38);
  x.fillStyle='#c7d6da';x.fillRect(w*.37,h*.32,w*.26,h*.31);
  const frac=Math.max(.12,Math.min(.92,(T-s.run.Ta+4)/17));
  x.fillStyle='rgba(79,174,210,.75)';x.fillRect(w*.39,h*(.60-.22*frac),w*.22,h*.22*frac);
  x.strokeStyle=on?'#ff9a58':'#6f8790';x.lineWidth=6;x.beginPath();x.moveTo(w*.43,h*.56);x.lineTo(w*.57,h*.56);x.stroke();
  x.fillStyle=on?'#ff9a58':'#8da0a8';x.font='700 11px system-ui';x.fillText(on?'HEATER ON':'HEATER OFF',w*.445,h*.64);
  x.strokeStyle='#e5eef1';x.lineWidth=4;x.beginPath();x.moveTo(w*.59,h*.20);x.lineTo(w*.59,h*.51);x.stroke();
  x.fillStyle='#eef6f8';x.fillRect(w*.57,h*.16,w*.04,h*.06);
  x.fillStyle='#10272e';x.fillRect(w*.70,h*.28,w*.19,h*.30);x.strokeStyle='#507481';x.lineWidth=2;x.strokeRect(w*.70,h*.28,w*.19,h*.30);
  x.fillStyle='#91efc9';x.font='700 18px ui-monospace,monospace';x.textAlign='center';x.fillText(T.toFixed(1)+' °C',w*.795,h*.43);
  x.fillStyle='#a9c2cc';x.font='600 11px system-ui';x.fillText('THERMOMETER',w*.795,h*.50);
  x.textAlign='left';x.fillStyle='#d9e7eb';x.font='700 13px system-ui';x.fillText('Electrical calorimeter · minute '+s.minute,18,25);
  x.fillStyle='#91aeb8';x.font='600 12px system-ui';x.fillText(stage()+' · expected switch: '+expectedHeater().toUpperCase(),18,46);
}
function renderPrep(){
  E('mcalRead').textContent=s.run.Mcal.toFixed(1)+' g';E('mfilledRead').textContent=s.run.Mfilled.toFixed(1)+' g';E('taRead').textContent=s.run.Ta.toFixed(1)+' °C';E('rRead').textContent=s.run.R.toFixed(2)+' Ω';E('uRead').textContent=s.run.U.toFixed(2)+' V';
}
function renderClock(){
  E('clockRead').value=s.minute+' min';E('thermoRead').value=s.run.temps[s.minute].toFixed(1)+' °C';E('stageOut').textContent=stage();
  const done=s.recordings[s.minute]!=null;E('recordTemp').disabled=!s.prepared||done;E('advance').disabled=!s.prepared||!done||s.minute>=40;E('heater').disabled=!s.prepared;
}
function renderTable(){
  const rows=Object.keys(s.recordings).map(Number).sort((a,b)=>a-b);
  E('tempBody').innerHTML=rows.length?rows.map(m=>'<tr><td>'+m+'</td><td>'+expectedHeater(m)+'</td><td>'+Number(s.recordings[m]).toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="3">No accepted temperature readings yet.</td></tr>';
  E('tempCount').textContent=rows.length+' / 41';
}
function prepare(){
  const vals=[+E('studentMcal').value,+E('studentMfilled').value,+E('studentTa').value,+E('studentR').value,+E('studentU').value];
  if(vals.some(v=>!Number.isFinite(v))){E('benchMsg').className='notice warn';E('benchMsg').textContent='Enter all five preparation measurements.';return}
  const [mc,mf,ta,r,u]=vals;
  if(Math.abs(mc-s.run.Mcal)>.11){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the empty-calorimeter mass to 0.1 g.';return}
  if(Math.abs(mf-s.run.Mfilled)>.11){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the filled-calorimeter mass to 0.1 g.';return}
  if(Math.abs(ta-s.run.Ta)>.11){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read room temperature to 0.1°C.';return}
  if(Math.abs(r-s.run.R)>.015){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the heater resistance to 0.01 Ω.';return}
  if(Math.abs(u-s.run.U)>.015){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the heater voltage to 0.01 V.';return}
  s.prepared=true;s.minute=0;s.recordings={};s.analysis=null;E('heater').value='off';E('studentTemp').value='';
  E('benchMsg').className='notice ok';E('benchMsg').textContent='Preparation accepted. Keep the heater OFF and record the temperature at minute 0.';
  renderAll();save();
}
function recordTemp(){
  if(!s.prepared)return;
  const required=expectedHeater(),actual=E('heater').value;
  if(actual!==required){E('benchMsg').className='notice warn';E('benchMsg').textContent='At minute '+s.minute+' the heater must be '+required.toUpperCase()+'. Set the switch correctly before recording.';return}
  const v=+E('studentTemp').value,e=s.run.temps[s.minute];
  if(!Number.isFinite(v)){E('benchMsg').className='notice warn';E('benchMsg').textContent='Read the thermometer and enter the current temperature.';return}
  if(Math.abs(v-e)>.11){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the thermometer to 0.1°C.';return}
  s.recordings[s.minute]=v;s.analysis=null;E('studentTemp').value='';
  if(s.minute===40){E('benchMsg').className='notice ok';E('benchMsg').textContent='All 41 temperatures are recorded. Proceed to the corrected-rise analysis.';}
  else if(s.minute===14){E('benchMsg').className='notice ok';E('benchMsg').textContent='Pre-heating record complete. Advance to minute 15 and switch the heater ON before recording.';}
  else if(s.minute===24){E('benchMsg').className='notice ok';E('benchMsg').textContent='Ten-minute heating interval complete. Advance to minute 25 and switch the heater OFF before recording.';}
  else{E('benchMsg').className='notice ok';E('benchMsg').textContent='Temperature accepted. Advance one minute and continue.';}
  renderAll();save();
}
function advance(){
  if(s.recordings[s.minute]==null){E('benchMsg').className='notice warn';E('benchMsg').textContent='Record the current minute before advancing the clock.';return}
  if(s.minute>=40)return;s.minute++;E('studentTemp').value='';
  if(s.minute===15)E('heater').value='on';if(s.minute===25)E('heater').value='off';
  E('benchMsg').className='notice';E('benchMsg').textContent='Minute '+s.minute+': verify the heater is '+expectedHeater().toUpperCase()+', then read the thermometer.';
  renderAll();save();
}
function restart(){
  if((s.prepared||Object.keys(s.recordings).length)&&!confirm('Start a new Practical 3 specimen? Existing temperature data and analysis will be cleared.'))return;
  const run=makeRun();run.temps=generateTemps(run);s={version:3,run,prepared:false,minute:0,recordings:{},analysis:null,sources:''};
  ['studentMcal','studentMfilled','studentTa','studentR','studentU','studentTemp','studentPreMid','studentPostMid','studentDelta','studentWaterMass','studentW','studentUW'].forEach(id=>E(id).value='');
  E('sources').value='';E('heater').value='off';E('benchMsg').className='notice';E('benchMsg').textContent='New specimen loaded. Measure and validate the five preparation quantities first.';renderAll();save();
}
function linearFit(points){
  const n=points.length,mx=points.reduce((a,p)=>a+p.x,0)/n,my=points.reduce((a,p)=>a+p.y,0)/n;
  let Sxx=0,Sxy=0;for(const p of points){Sxx+=(p.x-mx)*(p.x-mx);Sxy+=(p.x-mx)*(p.y-my)}
  const b=Sxy/Sxx,a=my-b*mx,res=points.map(p=>p.y-(a+b*p.x)),sse=res.reduce((z,e)=>z+e*e,0),sy=Math.sqrt(sse/Math.max(1,n-2));
  return{a,b,n,mx,Sxx,sy,predict(x){return a+b*x},uMean(x){return sy*Math.sqrt(1/n+(x-mx)*(x-mx)/Sxx)}};
}
function analysisExpected(){
  if(!allTemps())return null;
  const pre=[],post=[];for(let m=0;m<=14;m++)pre.push({x:m,y:+s.recordings[m]});for(let m=26;m<=40;m++)post.push({x:m,y:+s.recordings[m]});
  const fp=linearFit(pre),fq=linearFit(post),pre20=fp.predict(20),post20=fq.predict(20),delta=post20-pre20,m=(s.run.Mfilled-s.run.Mcal)/1000,EJ=s.run.U*s.run.U*TAU_HEAT/s.run.R,W=EJ/(CP*delta)-m;
  const uU=.01/Math.sqrt(3),uR=.01/Math.sqrt(3),uMass=Math.sqrt(2)*.1/Math.sqrt(3)/1000,uTherm=.1/Math.sqrt(3);
  const uPre=Math.sqrt(fp.uMean(20)**2+uTherm*uTherm),uPost=Math.sqrt(fq.uMean(20)**2+uTherm*uTherm),uDelta=Math.sqrt(uPre*uPre+uPost*uPost),uE=EJ*Math.sqrt(Math.pow(2*uU/s.run.U,2)+Math.pow(uR/s.run.R,2));
  const uW=Math.sqrt(Math.pow(uE/(CP*delta),2)+Math.pow(EJ*uDelta/(CP*delta*delta),2)+uMass*uMass);
  return{pre20,post20,delta,m:m*1000,W:W*1000,uW:uW*1000,fp,fq,EJ,uDelta};
}
function checkAnalysis(){
  const e=analysisExpected();if(!e){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Complete all 41 temperature readings first.';return}
  const vals=['studentPreMid','studentPostMid','studentDelta','studentWaterMass','studentW','studentUW'].map(id=>+E(id).value);
  if(vals.some(v=>!Number.isFinite(v))){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter both extrapolated midpoint temperatures, corrected rise, water mass, W and u(W).';return}
  const [p,q,d,m,W,uW]=vals;
  if(Math.abs(p-e.pre20)>.08){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Refit the 0–14 min pre-heating data and extrapolate its straight line to tM=20 min.';return}
  if(Math.abs(q-e.post20)>.08){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Refit the 26–40 min cooling data and extrapolate its straight line backward to tM=20 min.';return}
  if(Math.abs(d-(q-p))>.04){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate ΔTcorr = Tpost(tM) − Tpre(tM).';return}
  if(Math.abs(m-(s.run.Mfilled-s.run.Mcal))>.21){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate the water mass as Mfilled−Mcal.';return}
  const calcW=s.run.U*s.run.U*TAU_HEAT/(s.run.R*CP*d)-m/1000;
  if(Math.abs(W-calcW*1000)>Math.max(.8,.035*Math.abs(calcW*1000))){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate W=U²τ/(R c ΔTcorr)−m, using τ=600 s and mass in kg.';return}
  if(Math.abs(uW-e.uW)>Math.max(.6,.22*Math.max(e.uW,.5))){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate u(W) from voltage, resistance, mass and extrapolated-temperature uncertainties.';return}
  s.analysis={pre20:p,post20:q,delta:d,m,W,uW};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Corrected temperature rise, water equivalent and uncertainty accepted.';renderAll();save();
}
function blankChart(){
  const q=U.canvas(E('tempChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record temperatures to build T(t).',q.w/2,q.h/2);
}
function drawChart(){
  const rows=Object.keys(s.recordings).map(Number).sort((a,b)=>a-b);if(!rows.length){blankChart();return}
  const series=[{pts:rows.map(m=>({x:m,y:+s.recordings[m]})),color:'#2baac3'}];
  if(allTemps()){
    const e=analysisExpected(),xs=[0,40];series.push({pts:xs.map(x=>({x,y:e.fp.predict(x)})),color:'#9b6ac4'});series.push({pts:xs.map(x=>({x,y:e.fq.predict(x)})),color:'#df8746'});
  }
  U.plot(E('tempChart'),series,{xlabel:'time / min',ylabel:'temperature / °C',xmin:0,xmax:40});
}
function renderAnalysis(){
  const a=s.analysis;E('deltaOut').textContent=a?a.delta.toFixed(3)+' K':'—';E('wOut').textContent=a?a.W.toFixed(1)+' g':'—';E('uwOut').textContent=a?a.uW.toFixed(1)+' g':'—';
  const words=s.sources.trim().length>=55;E('progress').innerHTML='<div class="item '+(allTemps()?'done':'')+'">'+(allTemps()?'✓':'○')+' 41-point temperature record</div><div class="item '+(a?'done':'')+'">'+(a?'✓':'○')+' corrected water-equivalent calculation</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' error analysis</div>';
}
function renderAll(){renderPrep();drawBench();renderClock();renderTable();drawChart();renderAnalysis()}
function buildReport(){
  const a=s.analysis,summary='<p><b>Run:</b> '+U.esc(s.run.id)+'. <b>Electrical settings:</b> U='+s.run.U.toFixed(2)+' V, R='+s.run.R.toFixed(2)+' Ω, heating time=600 s.</p><p><b>Water mass:</b> '+(a?a.m.toFixed(1)+' g':'not validated')+'. <b>Corrected rise:</b> '+(a?a.delta.toFixed(3)+' K':'not validated')+'. <b>Water equivalent:</b> '+(a?a.W.toFixed(1)+' ± '+a.uW.toFixed(1)+' g':'not validated')+'.</p><p><b>Thermal-loss/error discussion:</b> '+U.esc(s.sources||'Not completed.')+'</p>';
  return U.report('Laboratory Practical 3 — Water Equivalent of a Calorimeter',summary);
}

U.tabs();E('sources').value=s.sources;
E('prepare').onclick=prepare;E('recordTemp').onclick=recordTemp;E('advance').onclick=advance;E('restart').onclick=restart;E('checkAnalysis').onclick=checkAnalysis;
E('heater').addEventListener('change',drawBench);E('sources').addEventListener('input',e=>{s.sources=e.target.value;renderAnalysis();save()});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.analysis){E('studentPreMid').value=s.analysis.pre20;E('studentPostMid').value=s.analysis.post20;E('studentDelta').value=s.analysis.delta;E('studentWaterMass').value=s.analysis.m;E('studentW').value=s.analysis.W;E('studentUW').value=s.analysis.uW}
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',()=>{drawBench();drawChart()});renderAll();save();
})();