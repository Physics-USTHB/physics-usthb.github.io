(()=>{
'use strict';
const U=ThermoUI,E=id=>document.getElementById(id),K='THERMO_T02_v4',V0=325000,D=1.5,AREA=Math.PI*D*D/4,AG=3.3e-6;
const ROD_ACTIONS={
  mountRod:'Place the measured rod on the thermal-expansion support.',
  checkTubes:'Verify that the circulation tubes are correctly connected.',
  checkWater:'Verify that the thermostat reservoir contains water.',
  circulateTen:'Run the pump for 10 seconds to circulate water through the rod, then switch it off.',
  zeroGauge:'Bring the dilatometer into contact, set zero, and secure it without moving the reference.',
  restartPump:'Restart the pump for the heating measurements.'
};
const ROD_FLOW=['mountRod','checkTubes','checkWater','circulateTen','zeroGauge','restartPump'];
const WATER_ACTIONS={
  assemble:'Assemble the water-anomaly measuring apparatus.',
  prepareBath:'Prepare the crushed-ice and table-salt cooling mixture in the plastic bath.',
  placeBath:'Place the plastic bath on the magnetic stirrer.',
  insertApparatus:'Place the measuring apparatus into the cooling bath.',
  startStirrer:'Start the magnetic stirrer at medium speed after the initial h–temperature reading.',
  removeApparatus:'Remove the apparatus from the bath at 0.5°C to prevent the water from freezing.'
};
const WATER_PRE=['assemble','prepareBath','placeBath','insertApparatus'];
const TEMPS=Array.from({length:30},(_,i)=>(i+1)*.5);
function q1(x){return Math.round(x*10)/10}
function makeRun(){
  return{id:'T02-'+Math.random().toString(36).slice(2,7).toUpperCase(),
    rods:{
      Cu:{L0:q1(598+Math.random()*8),T0:q1(20+Math.random()*.6),alpha:(16.3+Math.random()*.5)*1e-6},
      Al:{L0:q1(598+Math.random()*8),T0:q1(20+Math.random()*.6),alpha:(22.7+Math.random()*.7)*1e-6}
    },
    h0:q1(86+Math.random()*8)
  };
}
let s=U.load(K,null);
if(!s||s.version!==4)s={version:4,run:makeRun(),prep:{Cu:null,Al:null},rodProcedure:{Cu:{stage:0},Al:{stage:0}},rodData:{Cu:[],Al:[]},rodAnalysis:{Cu:null,Al:null},water:{},waterProcedure:{setupStage:0,initialRecorded:false,stirStarted:false,removed:false},h0:null,densityDraft:{},densityChecked:false,tmax:null,interpretation:''};
s.prep=s.prep||{Cu:null,Al:null};s.rodProcedure=s.rodProcedure||{Cu:{stage:0},Al:{stage:0}};for(const r of ['Cu','Al'])s.rodProcedure[r]=s.rodProcedure[r]||{stage:0};s.rodData=s.rodData||{Cu:[],Al:[]};s.rodAnalysis=s.rodAnalysis||{Cu:null,Al:null};s.water=s.water||{};s.waterProcedure=s.waterProcedure||{setupStage:0,initialRecorded:false,stirStarted:false,removed:false};s.densityDraft=s.densityDraft||{};s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function rhoWater(T){return 1000*(1-((T+288.9414)/(508929.2*(T+68.12963)))*Math.pow(T-3.9863,2))}
function rod(){return E('rod').value}
function actualRodT(r=rod()){const set=+E('rodTemp').value,base=s.run.rods[r].T0;return q1(base+(set-20)+.08*Math.sin(set*.37+(r==='Cu'?0:1)))}
function rodDL(r=rod()){const rr=s.run.rods[r],dt=actualRodT(r)-rr.T0;return Math.max(0,q1(rr.alpha*rr.L0*1000*dt+.35*Math.sin(dt*.53+(r==='Cu'?.4:1.2))))}
function waterH(T){const rho0=rhoWater(0),ratio=rhoWater(T)/rho0,num=V0+AREA*s.run.h0,den=num/ratio;return q1((den-V0*(1+3*AG*T))/AREA+.18*Math.sin(T*1.31))}
function setupCanvas(id){const c=E(id),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);return{x,w,h}}
function drawRod(){
  const{x,w,h}=setupCanvas('rodCanvas'),r=rod(),rr=s.run.rods[r],T=actualRodT(r),dl=rodDL(r),zero=E('gaugeZero').value==='yes';
  x.fillStyle='#071713';x.fillRect(0,0,w,h);x.fillStyle='#263a42';x.fillRect(w*.08,h*.56,w*.78,h*.10);
  x.strokeStyle=r==='Cu'?'#d9864d':'#b9c5ca';x.lineWidth=12;x.beginPath();x.moveTo(w*.16,h*.51);x.lineTo(w*.73,h*.51);x.stroke();
  x.strokeStyle='#78b9d4';x.lineWidth=5;x.beginPath();x.moveTo(w*.16,h*.43);x.lineTo(w*.73,h*.43);x.stroke();
  x.fillStyle='#dce9ed';x.fillRect(w*.12,h*.34,w*.08,h*.28);x.fillRect(w*.73,h*.34,w*.08,h*.28);
  x.strokeStyle='#dfeaec';x.lineWidth=3;x.beginPath();x.moveTo(w*.78,h*.28);x.lineTo(w*.78,h*.50);x.stroke();x.fillStyle='#edf5f7';x.fillRect(w*.76,h*.24,w*.04,h*.05);
  x.fillStyle='#0d252b';x.fillRect(w*.83,h*.32,w*.12,h*.26);x.strokeStyle='#4d7482';x.strokeRect(w*.83,h*.32,w*.12,h*.26);x.fillStyle='#92f1ca';x.font='700 16px ui-monospace,monospace';x.textAlign='center';x.fillText(zero?dl.toFixed(1)+' µm':'NOT ZERO',w*.89,h*.47);
  x.textAlign='left';x.fillStyle='#d5e4e9';x.font='700 13px system-ui';x.fillText((r==='Cu'?'Copper':'Aluminium')+' rod · L₀ '+rr.L0.toFixed(1)+' mm',18,24);x.fillStyle='#95afba';x.font='600 12px system-ui';x.fillText('thermostat water '+T.toFixed(1)+'°C · '+(E('pump').value==='on'?'pump running':'pump off'),18,44);
  E('rodTempRead').textContent=(+E('rodTemp').value).toFixed(0)+'°C';E('l0Read').textContent=rr.L0.toFixed(1)+' mm';E('tempRead').textContent=T.toFixed(1)+' °C';E('dlRead').textContent=zero?dl.toFixed(1)+' µm':'not zeroed';
}
function drawWater(){
  const{x,w,h}=setupCanvas('waterCanvas'),T=+E('waterTemp').value,hh=waterH(T),scaleMax=220,top=h*.10,bottom=h*.90,capX=w*.55;
  x.fillStyle='#071713';x.fillRect(0,0,w,h);x.fillStyle='#1a313a';x.fillRect(w*.16,h*.62,w*.34,h*.20);x.fillStyle='#b9e2f1';x.globalAlpha=.75;x.fillRect(w*.18,h*.64,w*.30,h*.16);x.globalAlpha=1;
  x.strokeStyle='#d9e8ee';x.lineWidth=10;x.beginPath();x.moveTo(capX,h*.76);x.lineTo(capX,top);x.stroke();
  const Y=v=>bottom-(v/scaleMax)*(bottom-top),y=Y(hh);x.strokeStyle='#3da8d1';x.lineWidth=7;x.beginPath();x.moveTo(capX,bottom);x.lineTo(capX,y);x.stroke();
  x.strokeStyle='#9bb1bc';x.lineWidth=1;x.font='10px ui-monospace,monospace';x.fillStyle='#c3d5dc';x.textAlign='left';
  for(let v=0;v<=220;v+=10){const yy=Y(v),major=v%50===0;x.beginPath();x.moveTo(capX+8,yy);x.lineTo(capX+(major?28:18),yy);x.stroke();if(major)x.fillText(String(v),capX+33,yy+3);}
  x.fillStyle='#d8e7ec';x.font='700 13px system-ui';x.fillText('capillary scale / mm',capX+70,top+15);x.fillText('ice + salt bath',w*.17,h*.59);x.fillStyle='#90acb8';x.font='600 12px system-ui';x.fillText('Read the meniscus against the scale; no numerical h readout is supplied.',18,27);
  E('waterTempRead').textContent=T.toFixed(1)+'°C';
}
function rodProc(r=rod()){return s.rodProcedure[r]}
function rodExpectedAction(r=rod()){const p=rodProc(r);return p.stage<ROD_FLOW.length?ROD_FLOW[p.stage]:null}
function renderRodProcedure(){
  const r=rod(),key=rodExpectedAction(r),box=E('rodProcedureAction');
  E('pump').disabled=true;E('gaugeZero').disabled=true;
  if(!key||s.prep[r]){box.style.display='none';return}
  box.style.display='grid';
  E('rodActionChoice').innerHTML='<option value="">Select the operation you would perform…</option>'+ROD_FLOW.map(k=>'<option value="'+k+'">'+ROD_ACTIONS[k]+'</option>').join('');
  E('rodActionChoice').value='';
}
function performRodAction(){
  const r=rod(),p=rodProc(r),key=rodExpectedAction(r),choice=E('rodActionChoice').value,rr=s.run.rods[r];
  if(!key||s.prep[r])return;
  if(choice!==key){E('rodMsg').className='notice warn';E('rodMsg').textContent='That operation is out of sequence. Follow the published dilatometer procedure.';return}
  if(key==='mountRod'){
    const L=+E('studentL0').value;if(!Number.isFinite(L)||Math.abs(L-rr.L0)>.15){E('rodMsg').className='notice warn';E('rodMsg').textContent='Measure L₀ from the ruler before mounting the rod.';return}
  }
  if(key==='circulateTen'){E('pump').value='off';}
  if(key==='zeroGauge'){if(E('pump').value!=='off'){E('rodMsg').className='notice warn';E('rodMsg').textContent='The 10-second initial circulation must be stopped before zeroing the dilatometer.';return}E('gaugeZero').value='yes';}
  if(key==='restartPump'){
    const T=+E('studentT0').value;if(!Number.isFinite(T)||Math.abs(T-actualRodT(r))>.15){E('rodMsg').className='notice warn';E('rodMsg').textContent='Read and enter the initial water temperature T₀ after the gauge has been zeroed and before restarting the pump.';return}
    E('pump').value='on';
  }
  p.stage++;
  E('rodMsg').className='notice ok';
  E('rodMsg').textContent=p.stage>=ROD_FLOW.length?'Apparatus sequence complete. Validate L₀ and T₀, then begin heating measurements.':'Operation completed. Continue with the next apparatus step.';
  renderRodProcedure();drawRod();save();
}
function syncRod(){
  const r=rod(),p=s.prep[r];E('studentL0').value=p?p.L0:'';E('studentT0').value=p?p.T0:'';E('studentT').value='';E('studentDL').value='';
  if(!p&&rodProc(r).stage===0){E('pump').value='off';E('gaugeZero').value='no';}
  E('rodMsg').className='notice';E('rodMsg').textContent=p?'Setup validated for '+r+'. Keep the pump running, raise the thermostat and record broad ΔT points.':'Measure L₀, then carry out the apparatus operations in the published order.';
  renderRodProcedure();drawRod();renderRodTable();
}
function prepareRod(){
  const r=rod(),rr=s.run.rods[r],L=+E('studentL0').value,T=+E('studentT0').value;
  if(rodProc(r).stage<ROD_FLOW.length){E('rodMsg').className='notice warn';E('rodMsg').textContent='Complete the full apparatus sequence before validating the initial setup.';return}
  if(E('pump').value!=='on'||E('gaugeZero').value!=='yes'){E('rodMsg').className='notice warn';E('rodMsg').textContent='The pump must have been restarted after T₀ was read, with the dilatometer zero reference secured.';return}
  if(+E('rodTemp').value>25){E('rodMsg').className='notice warn';E('rodMsg').textContent='Return the thermostat near the initial room-temperature condition before recording L₀ and T₀.';return}
  if(!Number.isFinite(L)||Math.abs(L-rr.L0)>.15){E('rodMsg').className='notice warn';E('rodMsg').textContent='Re-read L₀ from the ruler to 0.1 mm.';return}
  if(!Number.isFinite(T)||Math.abs(T-actualRodT(r))>.15){E('rodMsg').className='notice warn';E('rodMsg').textContent='Re-read the initial rod temperature to 0.1°C.';return}
  s.prep[r]={L0:L,T0:T};s.rodData[r]=[];s.rodAnalysis[r]=null;E('rodMsg').className='notice ok';E('rodMsg').textContent=r+' initial length/temperature accepted. Increase the thermostat and collect expansion points.';renderAll();save();
}
function recordRod(){
  const r=rod(),p=s.prep[r];if(!p){E('rodMsg').className='notice warn';E('rodMsg').textContent='Validate L₀, T₀ and the zeroed gauge first.';return}
  if(E('pump').value!=='on'||E('gaugeZero').value!=='yes'){E('rodMsg').className='notice warn';E('rodMsg').textContent='Keep the pump running and the dilatometer zero reference unchanged.';return}
  const T=actualRodT(r),dl=rodDL(r),sT=+E('studentT').value,sDL=+E('studentDL').value,dt=T-p.T0;
  if(dt<5){E('rodMsg').className='notice warn';E('rodMsg').textContent='Raise the thermostat enough to produce a measurable ΔT before recording.';return}
  if(!Number.isFinite(sT)||Math.abs(sT-T)>.15){E('rodMsg').className='notice warn';E('rodMsg').textContent='Re-read the thermometer to 0.1°C.';return}
  if(!Number.isFinite(sDL)||Math.abs(sDL-dl)>.75){E('rodMsg').className='notice warn';E('rodMsg').textContent='Re-read the dilatometer displacement in µm.';return}
  const rec={T:sT,dt:sT-p.T0,dl:sDL},arr=s.rodData[r],i=arr.findIndex(q=>Math.abs(q.T-sT)<.2);if(i>=0)arr[i]=rec;else arr.push(rec);arr.sort((a,b)=>a.dt-b.dt);s.rodAnalysis[r]=null;
  E('studentT').value='';E('studentDL').value='';E('rodMsg').className='notice ok';E('rodMsg').textContent='Expansion point accepted for '+r+'. Continue across a broad temperature range.';renderAll();save();
}
function rodCoverage(r){const a=s.rodData[r];return a.length>=6&&a[0]?.dt<=12&&a.at(-1)?.dt>=45}
function rodFit(r){
  if(!rodCoverage(r)||!s.prep[r])return null;const a=s.rodData[r],ssx=a.reduce((z,q)=>z+q.dt*q.dt,0),sxy=a.reduce((z,q)=>z+q.dt*q.dl,0),m=sxy/ssx,res=a.map(q=>q.dl-m*q.dt),sse=res.reduce((z,e)=>z+e*e,0),se=Math.sqrt((sse/Math.max(1,a.length-1))/ssx),L0=s.prep[r].L0;
  return{slope:m,uSlope:se,alpha:m/L0*1000,uAlpha:se/L0*1000};
}
function checkRodFit(){
  const r=E('analysisRod').value,f=rodFit(r);if(!f){E('fitMsg').className='notice warn';E('fitMsg').textContent='Complete at least six '+r+' points spanning from about ΔT≤12°C to ΔT≥45°C.';return}
  const m=+E('studentSlope').value,a=+E('studentAlpha').value,u=+E('studentUAlpha').value;if([m,a,u].some(v=>!Number.isFinite(v))||m<=0||a<=0||u<0){E('fitMsg').className='notice warn';E('fitMsg').textContent='Enter the least-squares slope, α and its absolute fit error.';return}
  if(Math.abs(m-f.slope)>Math.max(.03,.012*f.slope)){E('fitMsg').className='notice warn';E('fitMsg').textContent='Refit ΔL versus ΔT through the origin and re-read the slope.';return}
  if(Math.abs(a-f.alpha)>Math.max(.06,.012*f.alpha)){E('fitMsg').className='notice warn';E('fitMsg').textContent='Use α=slope/L₀ with consistent length units.';return}
  if(Math.abs(u-f.uAlpha)>Math.max(.02,.20*Math.max(f.uAlpha,.01))){E('fitMsg').className='notice warn';E('fitMsg').textContent='Recalculate the standard error of the fitted slope and propagate it through α=slope/L₀.';return}
  s.rodAnalysis[r]={slope:m,alpha:a,uAlpha:u};E('fitMsg').className='notice ok';E('fitMsg').textContent=r+' linear-expansion fit accepted.';renderAll();save();
}
function waterExpectedAction(){
  const p=s.waterProcedure;
  if(p.setupStage<WATER_PRE.length)return WATER_PRE[p.setupStage];
  if(!p.initialRecorded)return null;
  if(!p.stirStarted)return'startStirrer';
  if(waterComplete()&&!p.removed)return'removeApparatus';
  return null;
}
function renderWaterProcedure(){
  const key=waterExpectedAction(),box=E('waterProcedureAction');
  E('stirrer').disabled=true;
  if(!key){box.style.display='none';return}
  box.style.display='grid';
  const keys=[...WATER_PRE,'startStirrer','removeApparatus'];
  E('waterActionChoice').innerHTML='<option value="">Select the operation you would perform…</option>'+keys.map(k=>'<option value="'+k+'">'+WATER_ACTIONS[k]+'</option>').join('');
  E('waterActionChoice').value='';
}
function performWaterAction(){
  const key=waterExpectedAction(),choice=E('waterActionChoice').value,p=s.waterProcedure;if(!key)return;
  if(choice!==key){E('waterMsg').className='notice warn';E('waterMsg').textContent='That operation is out of sequence. Follow the published water-anomaly procedure.';return}
  if(WATER_PRE.includes(key))p.setupStage++;
  else if(key==='startStirrer'){p.stirStarted=true;E('stirrer').value='on';}
  else if(key==='removeApparatus'){p.removed=true;E('stirrer').value='off';}
  E('waterMsg').className='notice ok';
  if(p.setupStage===WATER_PRE.length&&!p.initialRecorded)E('waterMsg').textContent='Apparatus prepared. With the stirrer still off, record the initial water level and temperature near 15°C.';
  else if(key==='startStirrer')E('waterMsg').textContent='Stirrer set to medium speed. Cool and record h every 0.5°C.';
  else if(key==='removeApparatus')E('waterMsg').textContent='Apparatus removed at the low-temperature limit. The height dataset is ready for analysis.';
  else E('waterMsg').textContent='Operation completed. Continue with the next setup step.';
  renderWaterProcedure();drawWater();save();
}
function expectedWaterTemp(){
  const n=Object.keys(s.water).length;return Math.max(.5,15-.5*n);
}
function recordWater(){
  const p=s.waterProcedure;if(p.setupStage<WATER_PRE.length){E('waterMsg').className='notice warn';E('waterMsg').textContent='Complete the apparatus assembly and ice–salt bath setup before taking readings.';return}
  if(p.removed){E('waterMsg').className='notice warn';E('waterMsg').textContent='The apparatus has been removed from the bath; the low-temperature run is complete.';return}
  const T=+E('waterTemp').value,h=waterH(T),v=+E('studentH').value;if(!Number.isFinite(v)){E('waterMsg').className='notice warn';E('waterMsg').textContent='Read h from the capillary scale and enter it in millimetres.';return}
  if(!p.initialRecorded){
    if(Math.abs(T-15)>.01){E('waterMsg').className='notice warn';E('waterMsg').textContent='Take the initial h–temperature reading near 15.0°C before starting the magnetic stirrer.';return}
    if(E('stirrer').value!=='off'){E('waterMsg').className='notice warn';E('waterMsg').textContent='The initial reading is taken before the magnetic stirrer is started.';return}
  }else{
    if(!p.stirStarted||E('stirrer').value!=='on'){E('waterMsg').className='notice warn';E('waterMsg').textContent='Start the magnetic stirrer at medium speed before continuing the cooling series.';return}
    const expectedT=expectedWaterTemp();if(Math.abs(T-expectedT)>.01){E('waterMsg').className='notice warn';E('waterMsg').textContent='Continue cooling sequentially in 0.5°C steps. The next reading should be at '+expectedT.toFixed(1)+'°C.';return}
  }
  if(Math.abs(v-h)>.75){E('waterMsg').className='notice warn';E('waterMsg').textContent='Re-read the meniscus against the 10 mm scale subdivisions.';return}
  s.water[T.toFixed(1)]=v;if(!p.initialRecorded)p.initialRecorded=true;s.h0=null;s.densityDraft={};s.densityChecked=false;s.tmax=null;E('studentH').value='';E('studentH0').value='';E('studentTmax').value='';
  E('waterMsg').className='notice ok';
  if(!p.stirStarted)E('waterMsg').textContent='Initial reading accepted. Now start the magnetic stirrer at medium speed.';
  else if(waterComplete())E('waterMsg').textContent='0.5°C reading accepted. Remove the apparatus from the cooling bath to prevent freezing.';
  else E('waterMsg').textContent='h('+T.toFixed(1)+'°C) accepted. Continue cooling by 0.5°C.';
  renderAll();save();
}
function waterComplete(){return TEMPS.every(T=>s.water[T.toFixed(1)]!=null)}
function checkH0(){
  if(!s.waterProcedure.removed){E('waterMsg').className='notice warn';E('waterMsg').textContent='Complete the 0.5°C reading and remove the apparatus from the bath before extrapolating h(0°C).';return}
  if(!waterComplete()){E('waterMsg').className='notice warn';E('waterMsg').textContent='Complete all 30 height readings from 15.0°C down to 0.5°C before extrapolating h(0°C).';return}
  const v=+E('studentH0').value;if(!Number.isFinite(v)||v<=0){E('waterMsg').className='notice warn';E('waterMsg').textContent='Enter your extrapolated capillary height at 0°C.';return}
  if(Math.abs(v-s.run.h0)>1.1){E('waterMsg').className='notice warn';E('waterMsg').textContent='Extrapolate the low-temperature h(θ) trend to θ=0°C and re-read the intercept.';return}
  s.h0=v;s.densityDraft={};s.densityChecked=false;s.tmax=null;E('waterMsg').className='notice ok';E('waterMsg').textContent='h(0°C) accepted. Calculate ρ(θ)/ρ(0) for every recorded temperature.';renderAll();save();
}
function densityRatio(T){
  if(s.h0==null)return null;const h=s.water[T.toFixed(1)];if(h==null)return null;return(V0+AREA*s.h0)/(V0*(1+3*AG*T)+AREA*h);
}
function bindDensityInputs(){
  document.querySelectorAll('[data-rho-temp]').forEach(el=>el.addEventListener('input',()=>{s.densityDraft[el.dataset.rhoTemp]=el.value;save()}));
}
function renderWaterTable(){
  E('waterBody').innerHTML=TEMPS.slice().reverse().map(T=>{const k=T.toFixed(1),h=s.water[k],v=s.densityDraft[k]??'';return'<tr><td>'+k+'</td><td>'+(h==null?'—':Number(h).toFixed(1))+'</td><td>'+(h==null?'—':'<input data-rho-temp="'+k+'" type="number" step="0.000001" value="'+U.esc(v)+'">')+'</td></tr>'}).join('');bindDensityInputs();
  E('waterCount').textContent=Object.keys(s.water).length+' / 30';E('densityStatus').textContent=s.densityChecked?'validated':'not checked';
}
function checkDensityTable(){
  if(!waterComplete()||s.h0==null){E('densityMsg').className='notice warn';E('densityMsg').textContent='Complete the height table and validate h(0°C) first.';return}
  for(const T of TEMPS){const k=T.toFixed(1),raw=String(s.densityDraft[k]??'').trim(),v=+raw,e=densityRatio(T);if(!raw||!Number.isFinite(v)||Math.abs(v-e)>0.000008){E('densityMsg').className='notice warn';E('densityMsg').textContent='Recheck ρ(θ)/ρ(0) at θ='+k+'°C using V₀=325 mL, d=1.5 mm and glass expansion 3αgθ.';return}}
  s.densityChecked=true;E('densityMsg').className='notice ok';E('densityMsg').textContent='Complete density table accepted. Locate the maximum density from the curve.';renderAll();save();
}
function maxDensityTemp(){
  if(!s.densityChecked)return null;let best=null;for(const T of TEMPS){const v=+s.densityDraft[T.toFixed(1)];if(!best||v>best.v)best={T,v};}return best;
}
function checkTmax(){
  const m=maxDensityTemp();if(!m){E('densityMsg').className='notice warn';E('densityMsg').textContent='Validate the complete density table first.';return}
  const v=+E('studentTmax').value;if(!Number.isFinite(v)){E('densityMsg').className='notice warn';E('densityMsg').textContent='Enter the temperature at which your density curve is maximal.';return}
  if(Math.abs(v-m.T)>.3){E('densityMsg').className='notice warn';E('densityMsg').textContent='Re-read the peak of ρ(θ)/ρ(0) from the validated density curve.';return}
  s.tmax=v;E('densityMsg').className='notice ok';E('densityMsg').textContent='Water density maximum accepted. Explain the anomalous 0–4°C behaviour in your interpretation.';renderAll();save();
}
function blank(id,msg){const q=setupCanvas(id);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function drawCharts(){
  const series=[];for(const r of ['Cu','Al'])if(s.rodData[r].length)series.push({pts:s.rodData[r].map(q=>({x:q.dt,y:q.dl})),color:r==='Cu'?'#c66e38':'#4c8ea8'});if(series.length)U.plot(E('rodChart'),series,{xlabel:'ΔT / °C',ylabel:'ΔL / µm',xmin:0,ymin:0});else blank('rodChart','Record copper and aluminium expansion points.');
  if(s.densityChecked)U.plot(E('densityChart'),[{pts:TEMPS.map(T=>({x:T,y:+s.densityDraft[T.toFixed(1)]}))}],{xlabel:'temperature / °C',ylabel:'ρ(θ)/ρ(0)',xmin:0,xmax:15,ymin:.999});else blank('densityChart','Validate the density table to reveal the experimental curve.');
}
function renderRodTable(){
  const rows=[];for(const r of ['Cu','Al'])for(const q of s.rodData[r])rows.push({r,...q});rows.sort((a,b)=>a.r.localeCompare(b.r)||a.dt-b.dt);E('rodBody').innerHTML=rows.length?rows.map(q=>'<tr><td>'+q.r+'</td><td>'+q.dt.toFixed(1)+'</td><td>'+q.dl.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="3">No expansion points yet.</td></tr>';
  E('cuCount').textContent=s.rodData.Cu.length+' / 6';E('alCount').textContent=s.rodData.Al.length+' / 6';
}
function renderAnalysis(){
  E('alphaCuOut').textContent=s.rodAnalysis.Cu?s.rodAnalysis.Cu.alpha.toFixed(2)+'×10⁻⁶ K⁻¹':'—';E('alphaAlOut').textContent=s.rodAnalysis.Al?s.rodAnalysis.Al.alpha.toFixed(2)+'×10⁻⁶ K⁻¹':'—';E('tmaxOut').textContent=s.tmax!=null?Number(s.tmax).toFixed(1)+'°C':'—';
  const words=s.interpretation.trim().length>=70;E('progress').innerHTML='<div class="item '+(s.rodAnalysis.Cu?'done':'')+'">'+(s.rodAnalysis.Cu?'✓':'○')+' copper fit</div><div class="item '+(s.rodAnalysis.Al?'done':'')+'">'+(s.rodAnalysis.Al?'✓':'○')+' aluminium fit</div><div class="item '+(s.tmax!=null?'done':'')+'">'+(s.tmax!=null?'✓':'○')+' water-density maximum</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' physical interpretation</div>';
}
function loadFitFields(){const a=s.rodAnalysis[E('analysisRod').value];E('studentSlope').value=a?a.slope:'';E('studentAlpha').value=a?a.alpha:'';E('studentUAlpha').value=a?a.uAlpha:''}
function renderAll(){drawRod();drawWater();renderRodProcedure();renderWaterProcedure();renderRodTable();renderWaterTable();drawCharts();renderAnalysis()}
function buildReport(){
  const c=s.rodAnalysis.Cu,a=s.rodAnalysis.Al,summary='<p><b>Copper:</b> '+(c?'α='+c.alpha.toFixed(2)+' ± '+c.uAlpha.toFixed(2)+' ×10⁻⁶ K⁻¹':'fit incomplete')+'. <b>Aluminium:</b> '+(a?'α='+a.alpha.toFixed(2)+' ± '+a.uAlpha.toFixed(2)+' ×10⁻⁶ K⁻¹':'fit incomplete')+'.</p><p><b>Water anomaly:</b> '+(s.tmax!=null?'density maximum at '+Number(s.tmax).toFixed(1)+'°C; 30 height/density points validated.':'analysis incomplete')+'</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';
  return U.report('Laboratory Practical 2 — Thermal Expansion & the Water-Density Anomaly',summary);
}
U.tabs();E('interpretation').value=s.interpretation;
E('rod').addEventListener('change',syncRod);['rodTemp'].forEach(id=>E(id).addEventListener('input',drawRod));E('performRodAction').onclick=performRodAction;E('prepareRod').onclick=prepareRod;E('recordRod').onclick=recordRod;
E('waterTemp').addEventListener('input',drawWater);E('performWaterAction').onclick=performWaterAction;E('recordWater').onclick=recordWater;E('checkH0').onclick=checkH0;E('checkDensityTable').onclick=checkDensityTable;E('checkTmax').onclick=checkTmax;
E('analysisRod').addEventListener('change',()=>{loadFitFields();renderAnalysis()});E('checkRodFit').onclick=checkRodFit;
E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;renderAnalysis();save()});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.h0!=null)E('studentH0').value=s.h0;if(s.tmax!=null)E('studentTmax').value=s.tmax;
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',()=>{drawRod();drawWater();drawCharts()});syncRod();loadFitFields();renderAll();save();
})();