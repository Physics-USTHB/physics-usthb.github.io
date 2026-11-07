(() => {
'use strict';

const RAC = 11;
const E = 12.0;
const RG = 0.35;
const RV = 10_000_000;
const RA = 0.55;
const STORAGE = 'PhysicsUSTHB_E03_official_v5';
const REQUIRED = {
  resistor:[1,3,5,7,9,11],
  lamp:[0,1,2,3,4,5,6,7,8,9,10,11],
  series:[5,9],
  parallel:[5,9]
};
const META = {
  resistor:{title:'IV.1 — Resistor characteristic',instruction:'Record V_Rx and I_m at selector positions 1, 3, 5, 7, 9 and 11.',load:'Rₓ'},
  lamp:{title:'IV.2 — Lamp characteristic',instruction:'Replace the resistor by the lamp and record V_L and I_m at every selector position from 0 through 11.',load:'Lamp'},
  series:{title:'IV.3a — Series association',instruction:'Connect the resistor and lamp in series. Verify the graphical sum experimentally at selector positions 5 and 9.',load:'Rₓ + Lamp'},
  parallel:{title:'IV.3b — Parallel association',instruction:'Connect the resistor and lamp in parallel. Verify the graphical sum experimentally at selector positions 5 and 9.',load:'Rₓ ∥ Lamp'}
};
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const mean = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : NaN;
const quantize = (x,step) => Math.round(x/step)*step;

let state = {
  version:5, mode:'learn', selector:1, task:'resistor', verified:false,
  wiring:{source:'',use:'',ammeter:'',voltmeter:''},
  construction:{series:[],parallel:[]},
  data:{resistor:{},lamp:{},series:{},parallel:{}},
  run:null, advanced:null, assessment:null,
  text:{}, report:{}
};

function gaussian(){
  let u=0,v=0; while(!u)u=Math.random(); while(!v)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function newRunObject(){
  return {
    id:'TP3-'+Math.random().toString(36).slice(2,7).toUpperCase(),
    resistorR:98+Math.random()*5,
    lampR0:11.1+Math.random()*1.5,
    lampAlpha:0.00415+Math.random()*0.00028,
    lampH:0.00028+Math.random()*0.00008,
    lampK:(0.72+Math.random()*0.28)*1e-13,
    vScale:(Math.random()-.5)*0.003,
    iScale:(Math.random()-.5)*0.004,
    vZero:(Math.random()-.5)*0.005,
    iZero:(Math.random()-.5)*0.00004
  };
}
function save(){
  state.text = collectText();
  state.report = collectReport();
  try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(_){}
}
function load(){
  try{
    const s=JSON.parse(localStorage.getItem(STORAGE)||'null');
    if(s?.version===4) state={...state,...s};
  }catch(_){}
}
function collectText(){
  const ids=['shortJustification','resistorInterpretation','lampInterpretation','seriesJustification','parallelJustification'];
  const o={}; ids.forEach(id=>{const el=document.getElementById(id);if(el)o[id]=el.value;}); return o;
}
function collectReport(){
  const ids=['reportDate','reportDiscussion','reportConclusion'];
  const o={}; ids.forEach(id=>{const el=document.getElementById(id);if(el)o[id]=el.value;}); return o;
}
function restoreFields(){
  Object.entries(state.text||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});
  Object.entries(state.report||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});
  if(!$('#reportDate').value) $('#reportDate').value=new Date().toISOString().slice(0,10);
}

function lampR(T){return state.run.lampR0*(1+state.run.lampAlpha*Math.max(0,T-293.15));}
function lampLoss(T){const T0=293.15;return state.run.lampH*(T-T0)+state.run.lampK*(T**4-T0**4);}
function lampCurrent(v){
  if(v<=0)return 0;
  let lo=293.15,hi=3500;
  const bal=T=>v*v/lampR(T)-lampLoss(T);
  for(let i=0;i<90;i++){const m=(lo+hi)/2;if(bal(m)>0)lo=m;else hi=m;}
  const T=(lo+hi)/2; return v/lampR(T);
}
function lampVoltageForCurrent(i){
  if(i<=0)return 0;
  let lo=0,hi=15;
  for(let k=0;k<80;k++){const m=(lo+hi)/2;if(lampCurrent(m)<i)lo=m;else hi=m;}
  return (lo+hi)/2;
}
function seriesCurrent(v){
  if(v<=0)return 0;
  let lo=0,hi=0.3;
  for(let k=0;k<80;k++){
    const i=(lo+hi)/2;
    const vv=i*state.run.resistorR+lampVoltageForCurrent(i);
    if(vv<v)lo=i;else hi=i;
  }
  return (lo+hi)/2;
}
function branchCurrent(v,task){
  if(task==='resistor')return v/state.run.resistorR;
  if(task==='lamp')return lampCurrent(v);
  if(task==='series')return seriesCurrent(v);
  if(task==='parallel')return v/state.run.resistorR+lampCurrent(v);
  return 0;
}
function vth(n){return E*n/(RAC+RG);}
function rth(n){return n<=0?0:(n*(RAC-n+RG))/(RAC+RG);}
function solveCircuit(n,task){
  const vt=vth(n);
  if(n===0||vt<=0)return{vth:vt,rth:rth(n),v:0,branch:0,iv:0,im:0};
  let lo=0,hi=vt;
  for(let k=0;k<90;k++){
    const v=(lo+hi)/2;
    const branch=branchCurrent(v,task);
    const iv=v/RV;
    const f=v+(rth(n)+RA)*(branch+iv)-vt;
    if(f>0)hi=v;else lo=v;
  }
  const v=(lo+hi)/2,branch=branchCurrent(v,task),iv=v/RV;
  return{vth:vt,rth:rth(n),v,branch,iv,im:branch+iv};
}
function meterUnc(vm,im){
  const vLimit=.005*Math.abs(vm)+.02;
  const iLimit=.008*Math.abs(im)+.0002;
  return{uV:vLimit/Math.sqrt(3),uIm:iLimit/Math.sqrt(3)};
}
function measure(n,task){
  const x=solveCircuit(n,task);
  let vm=x.v*(1+state.run.vScale)+state.run.vZero+gaussian()*(.0012+.0004*x.v);
  let im=x.im*(1+state.run.iScale)+state.run.iZero+gaussian()*(.000008+.0005*x.im);
  vm=quantize(Math.max(0,vm),.01); im=quantize(Math.max(0,im),.0001);
  if(n===0){vm=0;im=0;}
  const {uV,uIm}=meterUnc(vm,im);
  const iv=vm/RV, id=Math.max(0,im-iv);
  const uRV=RV*.01/Math.sqrt(3);
  const uId=Math.sqrt(uIm*uIm+(uV/RV)**2+(vm*uRV/(RV*RV))**2);
  return{selector:n,task,vm,im,iv,id,uV,uIm,uId,ts:new Date().toISOString()};
}

function taskComplete(task){return REQUIRED[task].every(n=>state.data[task]?.[n]);}
function constructionReady(task){return (state.construction?.[task]||[]).length>=4}
function prereq(task){
  if(task==='resistor')return true;
  if(task==='lamp')return taskComplete('resistor');
  if(task==='series')return taskComplete('resistor')&&taskComplete('lamp')&&constructionReady('series');
  if(task==='parallel')return taskComplete('resistor')&&taskComplete('lamp')&&constructionReady('parallel');
  return false;
}
function nextMissing(task){return REQUIRED[task].find(n=>!state.data[task]?.[n]);}

function applyMode(mode){
  state.mode=mode==='lab'?'lab':'learn';
  document.body.classList.toggle('mode-lab',state.mode==='lab');
  document.body.classList.toggle('mode-learn',state.mode==='learn');
  $$('.modebtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
  $('#modeDescription').textContent=state.mode==='learn'?'Protocol guidance and interpretation prompts are visible.':'Minimal guidance; follow the prescribed protocol independently.';
  $('#reportMode').value=state.mode==='learn'?'Learn mode':'Lab mode';
  save();
}
function updateProgress(){
  const items=[
    ['resistor','IV.1','Resistor','6 readings'],
    ['lamp','IV.2','Lamp','12 readings'],
    ['series','IV.3a','Series','2 checks'],
    ['parallel','IV.3b','Parallel','2 checks']
  ];
  $('#progressBoard').innerHTML=items.map(([key,code,title,total])=>{
    const done=taskComplete(key),active=state.task===key;
    const count=Object.keys(state.data[key]||{}).length;
    return `<div class="progress-step ${done?'done':''} ${active?'active':''}"><b>${code}</b><strong>${title}</strong><small>${done?'Complete':count+' / '+REQUIRED[key].length+' · '+total}</small></div>`;
  }).join('');
}
function renderSelector(){
  const row=$('#selectorRow'); row.innerHTML='';
  const req=REQUIRED[state.task];
  for(let n=0;n<=11;n++){
    const b=document.createElement('button'); b.type='button'; b.className='selector-btn';
    b.textContent=n; b.dataset.n=n;
    if(req.includes(n))b.classList.add('required'); else b.classList.add('invalid');
    if(state.data[state.task]?.[n])b.classList.add('done');
    if(n===state.selector)b.classList.add('selected');
    b.addEventListener('click',()=>{state.selector=n;renderAllBench();save();});
    row.appendChild(b);
  }
}
function renderRequired(){
  $('#requiredList').innerHTML=REQUIRED[state.task].map(n=>{
    const done=!!state.data[state.task]?.[n];
    const cur=n===state.selector;
    return `<span class="req-chip ${done?'done':''} ${cur?'current':''}">${n}</span>`;
  }).join('');
}
function setTaskInfo(){
  const m=META[state.task];
  $('#taskTitle').textContent=m.title; $('#taskInstruction').innerHTML=m.instruction;
  $('#svgLoad').textContent=m.load;
  const summaries={
    resistor:'Positions 1, 3, 5, 7, 9, 11 · plot V_Rx = f(I_m)',
    lamp:'Positions 0–11 · plot V_L = g(I_m) on the same graph',
    series:'Positions 5 and 9 · verify the graphical voltage sum',
    parallel:'Positions 5 and 9 · verify the graphical current sum'
  };
  $('#taskSummary').innerHTML=`<option>${summaries[state.task]}</option>`;
}
function updateTapGraphic(){
  const x=72+(650-72)*state.selector/11;
  $('#tapGroup').setAttribute('transform',`translate(${x-330} 0)`);
  $('#tapLabel').setAttribute('x',x); $('#tapLabel').textContent=`B / ${state.selector}`;
}
function updateLiveMeters(){
  const x=solveCircuit(state.selector,state.task);
  $('#selectorStatus').textContent=`B → ${state.selector}`;
  $('#rabReadout').textContent=`${state.selector} Ω`;
  $('#vabReadout').textContent=`${x.vth.toFixed(2)} V`;
  $('#vmeter').textContent=`${x.v.toFixed(2)} V`;
  $('#imeter').textContent=`${(x.im*1000).toFixed(1)} mA`;
}

function e03WiringOK(){const w=state.wiring||{};return w.source==='AC'&&w.use==='AB'&&w.ammeter==='total'&&w.voltmeter==='load'}
function updateE03Wiring(){
  state.wiring={source:$('#e03SourcePair').value,use:$('#e03UsePair').value,ammeter:$('#e03AmmeterTopo').value,voltmeter:$('#e03VoltmeterTopo').value};
  state.verified=false;const w=state.wiring,el=$('#e03WiringStatus');
  if(!w.source||!w.use||!w.ammeter||!w.voltmeter){el.className='e03-wiring-status';el.textContent='Complete all four wiring choices before verification.';return false;}
  if(w.source==='AB'){el.className='e03-wiring-status bad';el.textContent='DANGEROUS: the official sheet explicitly forbids connecting the generator across A–B of the low-resistance box.';return false;}
  const ok=e03WiringOK();el.className=ok?'e03-wiring-status ok':'e03-wiring-status bad';el.textContent=ok?'Correct TP3 wiring: generator A–C, utilisation A–B, ammeter reads I_m, voltmeter across the tested dipole/network.':'This connection does not reproduce the official TP3 topology.';return ok;
}

function updateWiring(){
  const s=$('#wiringState');
  s.textContent=state.verified?'Wiring verified':'Wiring not verified';
  s.classList.toggle('ok',state.verified);
  $('#recordReading').disabled=!state.verified||!e03WiringOK()||!prereq(state.task)||!REQUIRED[state.task].includes(state.selector);
}
function updateBenchMessage(){
  const msg=$('#benchMessage');
  if(!prereq(state.task)){
    msg.className='notice warn protocol-message';
    if(state.task==='lamp')msg.textContent='Complete the six prescribed resistor readings before replacing the resistor by the lamp.';
    else if((state.task==='series'||state.task==='parallel')&&!(taskComplete('resistor')&&taskComplete('lamp')))msg.textContent='Complete both resistor and lamp characteristics before constructing their association.';
    else if(state.task==='series')msg.textContent='Construct at least four series-addition points graphically before the experimental checks at positions 5 and 9.';
    else if(state.task==='parallel')msg.textContent='Construct at least four parallel-addition points graphically before the experimental checks at positions 5 and 9.';
    return;
  }
  if(!state.verified){
    msg.className='notice protocol-message'; msg.textContent='Verify the wiring before taking a measurement.'; return;
  }
  if(!REQUIRED[state.task].includes(state.selector)){
    msg.className='notice warn protocol-message'; msg.textContent=`Selector position ${state.selector} is not prescribed for this part of TP3.`; return;
  }
  const exists=state.data[state.task]?.[state.selector];
  msg.className='notice '+(exists?'ok':'');
  msg.textContent=exists?`A reading is already stored at position ${state.selector}. Recording again will replace it.`:`Ready to record the prescribed reading at selector position ${state.selector}.`;
}
function updateHint(){
  if(state.mode!=='learn')return;
  const missing=nextMissing(state.task);
  let t='The official graph uses the measured ammeter current I_m.';
  if(!prereq(state.task))t='Follow the official sequence: complete the preceding characteristic before rewiring the next configuration.';
  else if(missing!==undefined)t=`The next missing prescribed position for this configuration is ${missing}.`;
  else if(state.task==='resistor')t='The resistor set is complete. Inspect V_Rx=f(I_m), estimate the slope, then replace the resistor by the lamp.';
  else if(state.task==='lamp')t='The lamp set is complete. Compare its curved characteristic with the resistor on the same axes.';
  else if(state.task==='series')t='Compare the two measured series points with the graphical voltage-sum curve.';
  else t='Compare the two measured parallel points with the graphical current-sum curve.';
  $('#protocolHint').textContent=t;
}
function renderAllBench(){
  renderSelector();renderRequired();setTaskInfo();updateTapGraphic();updateLiveMeters();updateWiring();updateBenchMessage();updateHint();updateProgress();
}

function verifyWiring(){
  if(!prereq(state.task)){updateBenchMessage();return;}
  if(!updateE03Wiring()){updateWiring();updateBenchMessage();return;}
  state.verified=true;updateWiring();updateBenchMessage();save();
}
function changeTask(task){
  state.task=task;state.verified=false;
  const miss=nextMissing(task);state.selector=miss===undefined?REQUIRED[task][0]:miss;
  renderAllBench();save();
}
function recordReading(){
  if(!state.verified||!prereq(state.task)||!REQUIRED[state.task].includes(state.selector))return;
  state.data[state.task][state.selector]=measure(state.selector,state.task);
  state.advanced=null; state.assessment=null;
  state.verified=true;
  renderEverything();
  const next=nextMissing(state.task);
  if(next!==undefined)state.selector=next;
  renderAllBench();
  save();
}
function newSpecimen(){
  if(totalReadings()&& !confirm('Start a new specimen? All measurements and analysis for this run will be cleared.'))return;
  state.run=newRunObject();state.selector=1;state.task='resistor';state.verified=false;state.wiring={source:'',use:'',ammeter:'',voltmeter:''};state.construction={series:[],parallel:[]};
  state.data={resistor:{},lamp:{},series:{},parallel:{}};state.advanced=null;state.assessment=null;
  renderEverything();renderAllBench();save();
}
function totalReadings(){return Object.values(state.data).reduce((n,o)=>n+Object.keys(o||{}).length,0);}

function rows(task){return REQUIRED[task].map(n=>state.data[task]?.[n]).filter(Boolean);}
function renderCoreTables(){
  const make=(task,bodyId)=>{
    const body=$(bodyId);body.innerHTML='';
    REQUIRED[task].forEach(n=>{
      const d=state.data[task]?.[n],tr=document.createElement('tr');
      tr.innerHTML=d?`<td>${n}</td><td>${d.vm.toFixed(2)}</td><td>${(d.im*1000).toFixed(1)}</td>`:`<td>${n}</td><td>—</td><td>—</td>`;
      body.appendChild(tr);
    });
  };
  make('resistor','#resistorBody');make('lamp','#lampBody');
  badge('#resistorBadge','resistor');badge('#lampBadge','lamp');
}
function badge(sel,task){
  const el=$(sel),n=Object.keys(state.data[task]||{}).length,N=REQUIRED[task].length;
  el.textContent=`${n} / ${N}`;el.classList.toggle('done',n===N);
}
function linearFit(data,xKey='im',yKey='vm'){
  if(data.length<2)return null;
  const xs=data.map(d=>d[xKey]),ys=data.map(d=>d[yKey]),n=data.length;
  const sx=xs.reduce((a,b)=>a+b,0),sy=ys.reduce((a,b)=>a+b,0),sxx=xs.reduce((a,b)=>a+b*b,0),sxy=xs.reduce((a,b,i)=>a+b*ys[i],0);
  const den=n*sxx-sx*sx;if(Math.abs(den)<1e-20)return null;
  const m=(n*sxy-sx*sy)/den,b=(sy*sxx-sx*sxy)/den;
  const ybar=mean(ys),ssTot=ys.reduce((a,y)=>a+(y-ybar)**2,0),ssRes=ys.reduce((a,y,i)=>a+(y-(m*xs[i]+b))**2,0);
  return{m,b,r2:ssTot?1-ssRes/ssTot:1};
}
function officialFit(){
  return taskComplete('resistor')?linearFit(rows('resistor')):null;
}
function interp(series,x){
  if(!series.length||x<series[0].x||x>series[series.length-1].x)return NaN;
  for(let i=0;i<series.length-1;i++){
    const a=series[i],b=series[i+1];
    if(x>=a.x&&x<=b.x){const t=(x-a.x)/(b.x-a.x||1);return a.y+t*(b.y-a.y);}
  } return series[series.length-1].y;
}
function lampAt6(){
  if(!taskComplete('lamp'))return null;
  const s=rows('lamp').map(d=>({x:d.vm,y:d.im})).sort((a,b)=>a.x-b.x);
  const i=interp(s,6); if(!Number.isFinite(i)||i<=0)return null;
  return{current:i,R:6/i};
}
function updateInterpretationMetrics(){
  const f=officialFit();$('#officialR').textContent=f?`${f.m.toFixed(2)} Ω`:'— Ω';$('#officialR2').textContent=f?f.r2.toFixed(5):'—';
  const l=lampAt6();$('#lampR').textContent=l?`${l.R.toFixed(1)} Ω`:'— Ω';
  if(l){
    const diff=100*(l.R-60)/60;
    $('#lampCompare').textContent=`At 6.0 V, interpolation of your measured characteristic gives I ≈ ${(l.current*1000).toFixed(1)} mA and V/I ≈ ${l.R.toFixed(1)} Ω. This differs from the 60 Ω nominal hot resistance by ${Math.abs(diff).toFixed(1)}%.`;
  }else $('#lampCompare').textContent='Complete the lamp readings to compare the graph with the 6 V / 0.10 A virtual manufacturer label.';
}

function canvasSetup(c,hFallback=420){
  const dpr=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||hFallback;
  c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return{ctx,w,h};
}
function axes(ctx,w,h,maxI,maxV){
  const p={l:65,r:24,t:28,b:54},X=i=>p.l+i/maxI*(w-p.l-p.r),Y=v=>h-p.b-v/maxV*(h-p.t-p.b);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#dce5ee';ctx.lineWidth=1;
  for(let k=0;k<=5;k++){let xx=p.l+(w-p.l-p.r)*k/5,yy=p.t+(h-p.t-p.b)*k/5;ctx.beginPath();ctx.moveTo(xx,p.t);ctx.lineTo(xx,h-p.b);ctx.stroke();ctx.beginPath();ctx.moveTo(p.l,yy);ctx.lineTo(w-p.r,yy);ctx.stroke();}
  ctx.strokeStyle='#173b63';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.l,p.t);ctx.lineTo(p.l,h-p.b);ctx.lineTo(w-p.r,h-p.b);ctx.stroke();
  ctx.fillStyle='#52657f';ctx.font='12px system-ui';ctx.textAlign='center';
  for(let k=0;k<=5;k++)ctx.fillText((maxI*1000*k/5).toFixed(0),X(maxI*k/5),h-23);
  ctx.fillText('Measured current I_m (mA)',(p.l+w-p.r)/2,h-6);
  ctx.save();ctx.translate(16,h/2);ctx.rotate(-Math.PI/2);ctx.fillText('Voltage V (V)',0,0);ctx.restore();
  ctx.textAlign='right';for(let k=0;k<=5;k++)ctx.fillText((maxV*k/5).toFixed(1),p.l-8,Y(maxV*k/5)+4);
  return{X,Y};
}
function plotSeries(ctx,pts,X,Y,color,line=true,shape='circle'){
  const s=[...pts].sort((a,b)=>a.im-b.im);
  if(line&&s.length){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();s.forEach((d,i)=>i?ctx.lineTo(X(d.im),Y(d.vm)):ctx.moveTo(X(d.im),Y(d.vm)));ctx.stroke();}
  ctx.fillStyle=color;ctx.strokeStyle=color;s.forEach(d=>{const x=X(d.im),y=Y(d.vm);if(shape==='square'){ctx.fillRect(x-4,y-4,8,8);}else if(shape==='open'){ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.stroke();}else{ctx.beginPath();ctx.arc(x,y,4.5,0,Math.PI*2);ctx.fill();}});
}
function drawCore(){
  const c=$('#coreChart');if(!c)return;const{ctx,w,h}=canvasSetup(c);
  const all=[...rows('resistor'),...rows('lamp')];const maxI=Math.max(.12,...all.map(d=>d.im))*1.08,maxV=Math.max(10,...all.map(d=>d.vm))*1.05;const{X,Y}=axes(ctx,w,h,maxI,maxV);
  plotSeries(ctx,rows('resistor'),X,Y,'#1f6fb8');plotSeries(ctx,rows('lamp'),X,Y,'#b26b16');
  ctx.font='12px system-ui';ctx.textAlign='left';ctx.fillStyle='#1f6fb8';ctx.fillText('● Resistor',w-185,25);ctx.fillStyle='#b26b16';ctx.fillText('● Lamp',w-95,25);
}

function componentVoltageAtCurrent(task,im){
  const s=rows(task).map(d=>({x:d.im,y:d.vm})).sort((a,b)=>a.x-b.x);return interp(s,im);
}
function componentCurrentAtVoltage(task,v){
  const s=rows(task).map(d=>({x:d.vm,y:d.im})).sort((a,b)=>a.x-b.x);return interp(s,v);
}
function addSeriesConstruction(){
  if(!(taskComplete('resistor')&&taskComplete('lamp'))){$('#seriesConstructStatus').className='notice warn';$('#seriesConstructStatus').textContent='Complete the separate resistor and lamp characteristics first.';return;}
  const im=+$('#seriesConstructI').value/1000,vr=+$('#seriesConstructVR').value,vl=+$('#seriesConstructVL').value;
  if(!(im>0&&Number.isFinite(vr)&&Number.isFinite(vl))){$('#seriesConstructStatus').className='notice warn';$('#seriesConstructStatus').textContent='Enter a common current and the two voltages read from your graph.';return;}
  const er=componentVoltageAtCurrent('resistor',im),el=componentVoltageAtCurrent('lamp',im);
  if(!Number.isFinite(er)||!Number.isFinite(el)){$('#seriesConstructStatus').className='notice warn';$('#seriesConstructStatus').textContent='Choose a current inside the overlapping measured-current range of both component curves.';return;}
  const tolR=Math.max(.18,.04*er),tolL=Math.max(.18,.04*el);
  if(Math.abs(vr-er)>tolR||Math.abs(vl-el)>tolL){$('#seriesConstructStatus').className='notice warn';$('#seriesConstructStatus').textContent=state.mode==='learn'?'At least one graph reading is inconsistent with the measured component curves. Re-read V_Rx and V_L at the same current.':'Construction point rejected: graph readings are not consistent with the measured curves.';return;}
  const p={im,vr,vl,vm:vr+vl};const arr=state.construction.series;const k=arr.findIndex(q=>Math.abs(q.im-im)<.0005);if(k>=0)arr[k]=p;else arr.push(p);arr.sort((a,b)=>a.im-b.im);
  $('#seriesConstructStatus').className=constructionReady('series')?'notice ok':'notice';$('#seriesConstructStatus').textContent=constructionReady('series')?'Series graphical construction ready for experimental verification.':`Construction point stored (${arr.length}/4 minimum).`;renderConstruction();renderAssociationTables();drawSum();renderAllBench();save();
}
function addParallelConstruction(){
  if(!(taskComplete('resistor')&&taskComplete('lamp'))){$('#parallelConstructStatus').className='notice warn';$('#parallelConstructStatus').textContent='Complete the separate resistor and lamp characteristics first.';return;}
  const v=+$('#parallelConstructV').value,ir=+$('#parallelConstructIR').value/1000,il=+$('#parallelConstructIL').value/1000;
  if(!(v>0&&Number.isFinite(ir)&&Number.isFinite(il)&&ir>=0&&il>=0)){$('#parallelConstructStatus').className='notice warn';$('#parallelConstructStatus').textContent='Enter a common voltage and the two currents read from your graph.';return;}
  const er=componentCurrentAtVoltage('resistor',v),el=componentCurrentAtVoltage('lamp',v);
  if(!Number.isFinite(er)||!Number.isFinite(el)){$('#parallelConstructStatus').className='notice warn';$('#parallelConstructStatus').textContent='Choose a voltage inside the overlapping measured-voltage range of both component curves.';return;}
  const tolR=Math.max(.0015,.05*er),tolL=Math.max(.0015,.05*el);
  if(Math.abs(ir-er)>tolR||Math.abs(il-el)>tolL){$('#parallelConstructStatus').className='notice warn';$('#parallelConstructStatus').textContent=state.mode==='learn'?'At least one graph reading is inconsistent with the measured curves. Re-read I_Rx and I_L at the same voltage.':'Construction point rejected: graph readings are not consistent with the measured curves.';return;}
  const p={vm:v,ir,il,im:ir+il};const arr=state.construction.parallel;const k=arr.findIndex(q=>Math.abs(q.vm-v)<.05);if(k>=0)arr[k]=p;else arr.push(p);arr.sort((a,b)=>a.vm-b.vm);
  $('#parallelConstructStatus').className=constructionReady('parallel')?'notice ok':'notice';$('#parallelConstructStatus').textContent=constructionReady('parallel')?'Parallel graphical construction ready for experimental verification.':`Construction point stored (${arr.length}/4 minimum).`;renderConstruction();renderAssociationTables();drawSum();renderAllBench();save();
}
function renderConstruction(){
  const sb=$('#seriesConstructBody');sb.innerHTML='';(state.construction?.series||[]).forEach(p=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${(p.im*1000).toFixed(1)}</td><td>${p.vr.toFixed(2)}</td><td>${p.vl.toFixed(2)}</td><td>${p.vm.toFixed(2)}</td>`;sb.appendChild(tr);});
  const pb=$('#parallelConstructBody');pb.innerHTML='';(state.construction?.parallel||[]).forEach(p=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${p.vm.toFixed(2)}</td><td>${(p.ir*1000).toFixed(1)}</td><td>${(p.il*1000).toFixed(1)}</td><td>${(p.im*1000).toFixed(1)}</td>`;pb.appendChild(tr);});
  const sn=(state.construction?.series||[]).length,pn=(state.construction?.parallel||[]).length;
  $('#seriesConstructStatus').className=sn>=4?'notice ok':'notice';$('#seriesConstructStatus').textContent=sn>=4?'Series graphical construction ready for experimental verification.':`Build at least four points from the measured component graph before experimental verification (${sn}/4).`;
  $('#parallelConstructStatus').className=pn>=4?'notice ok':'notice';$('#parallelConstructStatus').textContent=pn>=4?'Parallel graphical construction ready for experimental verification.':`Build at least four points from the measured component graph before experimental verification (${pn}/4).`;
}

function componentSeries(){
  const r=rows('resistor').map(d=>({x:d.im,y:d.vm})).sort((a,b)=>a.x-b.x);
  const l=rows('lamp').map(d=>({x:d.im,y:d.vm})).sort((a,b)=>a.x-b.x);
  if(!r.length||!l.length)return[];
  const lo=Math.max(r[0].x,l[0].x),hi=Math.min(r.at(-1).x,l.at(-1).x),out=[];
  if(!(hi>lo))return out;
  for(let k=0;k<=40;k++){const I=lo+(hi-lo)*k/40;out.push({im:I,vm:interp(r,I)+interp(l,I)});}
  return out;
}
function componentParallel(){
  const r=rows('resistor').map(d=>({x:d.vm,y:d.im})).sort((a,b)=>a.x-b.x);
  const l=rows('lamp').map(d=>({x:d.vm,y:d.im})).sort((a,b)=>a.x-b.x);
  if(!r.length||!l.length)return[];
  const lo=Math.max(r[0].x,l[0].x),hi=Math.min(r.at(-1).x,l.at(-1).x),out=[];
  if(!(hi>lo))return out;
  for(let k=0;k<=40;k++){const V=lo+(hi-lo)*k/40;out.push({vm:V,im:interp(r,V)+interp(l,V)});}
  return out;
}
function predictedSeriesV(im){const s=(state.construction?.series||[]).map(d=>({x:d.im,y:d.vm})).sort((a,b)=>a.x-b.x);return interp(s,im);}
function predictedParallelI(v){const s=(state.construction?.parallel||[]).map(d=>({x:d.vm,y:d.im})).sort((a,b)=>a.x-b.x);return interp(s,v);}
function renderAssociationTables(){
  const sb=$('#seriesBody');sb.innerHTML='';REQUIRED.series.forEach(n=>{const d=state.data.series[n],pred=d?predictedSeriesV(d.im):NaN,tr=document.createElement('tr');tr.innerHTML=d?`<td>${n}</td><td>${d.vm.toFixed(2)}</td><td>${(d.im*1000).toFixed(1)}</td><td>${Number.isFinite(pred)?pred.toFixed(2):'—'}</td><td>${Number.isFinite(pred)?(d.vm-pred).toFixed(2):'—'}</td>`:`<td>${n}</td><td>—</td><td>—</td><td>—</td><td>—</td>`;sb.appendChild(tr);});
  const pb=$('#parallelBody');pb.innerHTML='';REQUIRED.parallel.forEach(n=>{const d=state.data.parallel[n],pred=d?predictedParallelI(d.vm):NaN,tr=document.createElement('tr');tr.innerHTML=d?`<td>${n}</td><td>${d.vm.toFixed(2)}</td><td>${(d.im*1000).toFixed(1)}</td><td>${Number.isFinite(pred)?(pred*1000).toFixed(1):'—'}</td><td>${Number.isFinite(pred)?((d.im-pred)*1000).toFixed(1):'—'}</td>`:`<td>${n}</td><td>—</td><td>—</td><td>—</td><td>—</td>`;pb.appendChild(tr);});
  badge('#seriesBadge','series');badge('#parallelBadge','parallel');
}
function drawSum(){
  const c=$('#sumChart');if(!c)return;const{ctx,w,h}=canvasSetup(c);const series=state.construction?.series||[],parallel=state.construction?.parallel||[],ver=[...rows('series'),...rows('parallel')],all=[...series,...parallel,...ver];const maxI=Math.max(.22,...all.map(d=>d.im))*1.08,maxV=Math.max(12,...all.map(d=>d.vm))*1.05;const{X,Y}=axes(ctx,w,h,maxI,maxV);
  if(series.length){ctx.strokeStyle='#7a3db8';ctx.lineWidth=2.3;ctx.beginPath();series.forEach((d,i)=>i?ctx.lineTo(X(d.im),Y(d.vm)):ctx.moveTo(X(d.im),Y(d.vm)));ctx.stroke();}
  if(parallel.length){ctx.strokeStyle='#168b78';ctx.lineWidth=2.3;ctx.beginPath();parallel.forEach((d,i)=>i?ctx.lineTo(X(d.im),Y(d.vm)):ctx.moveTo(X(d.im),Y(d.vm)));ctx.stroke();}
  plotSeries(ctx,rows('series'),X,Y,'#7a3db8',false,'open');plotSeries(ctx,rows('parallel'),X,Y,'#168b78',false,'square');
  ctx.font='12px system-ui';ctx.textAlign='left';ctx.fillStyle='#7a3db8';ctx.fillText('Series sum + ○ verification',w-265,23);ctx.fillStyle='#168b78';ctx.fillText('Parallel sum + ■ verification',w-265,41);
}

function renderAdvancedTable(){
  const body=$('#advancedBody');body.innerHTML='';rows('resistor').forEach(d=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${d.selector}</td><td>${(d.im*1000).toFixed(1)}</td><td>${(d.iv*1e6).toFixed(2)}</td><td>${(d.id*1000).toFixed(3)}</td><td>${d.uV.toFixed(3)}</td><td>${(d.uId*1000).toFixed(3)}</td>`;body.appendChild(tr);});
}
function weightedFit(data){
  if(data.length<3)return null;
  const initial=linearFit(data,'id','vm');if(!initial)return null;let m=initial.m,b=initial.b,w=[];
  for(let it=0;it<20;it++){
    w=data.map(d=>1/Math.max(1e-16,d.uV*d.uV+(m*d.uId)**2));
    const S=w.reduce((a,x)=>a+x,0),Sx=w.reduce((a,x,i)=>a+x*data[i].id,0),Sy=w.reduce((a,x,i)=>a+x*data[i].vm,0),Sxx=w.reduce((a,x,i)=>a+x*data[i].id*data[i].id,0),Sxy=w.reduce((a,x,i)=>a+x*data[i].id*data[i].vm,0),D=S*Sxx-Sx*Sx;
    const nm=(S*Sxy-Sx*Sy)/D,nb=(Sxx*Sy-Sx*Sxy)/D;if(Math.abs(nm-m)<1e-10*Math.max(1,Math.abs(m))){m=nm;b=nb;break;}m=nm;b=nb;
  }
  w=data.map(d=>1/Math.max(1e-16,d.uV*d.uV+(m*d.uId)**2));
  const S=w.reduce((a,x)=>a+x,0),Sx=w.reduce((a,x,i)=>a+x*data[i].id,0),Sxx=w.reduce((a,x,i)=>a+x*data[i].id*data[i].id,0),D=S*Sxx-Sx*Sx;
  const sm=Math.sqrt(S/D),sb=Math.sqrt(Sxx/D),res=data.map((d,i)=>({x:d.id,r:d.vm-(m*d.id+b),sigma:Math.sqrt(1/w[i])})),chi=res.reduce((a,x)=>a+(x.r/x.sigma)**2,0),dof=Math.max(1,data.length-2);
  return{m,b,sm,sb,redChi:chi/dof,dof,res};
}
function runAdvanced(){
  if(!taskComplete('resistor')){$('#advancedNotice').className='notice warn';$('#advancedNotice').textContent='Complete all six prescribed resistor readings first.';return;}
  state.advanced=weightedFit(rows('resistor'));const a=state.advanced,o=officialFit();
  $('#advancedR').textContent=`${a.m.toFixed(2)} ± ${a.sm.toFixed(2)} Ω`;$('#advancedB').textContent=`${a.b.toFixed(3)} ± ${a.sb.toFixed(3)} V`;$('#advancedChi').textContent=a.redChi.toFixed(2);$('#advancedDelta').textContent=o?`${(a.m-o.m).toFixed(3)} Ω`:'—';
  $('#advancedNotice').className='notice ok';$('#advancedNotice').textContent='Corrected-current effective-variance fit completed.';
  $('#advancedText').innerHTML=`<p>The official graph uses I<sub>m</sub>; the advanced fit instead uses I<sub>D</sub>=I<sub>m</sub>−V/R<sub>V</sub>. The fitted resistance changes by ${o?Math.abs(a.m-o.m).toFixed(3):'—'} Ω in this run. Reduced χ² = ${a.redChi.toFixed(2)} for ${a.dof} degrees of freedom.</p>`;
  drawResidual();save();
}
function restoreAdvanced(){
  if(!state.advanced)return;const a=state.advanced,o=officialFit();
  $('#advancedR').textContent=`${a.m.toFixed(2)} ± ${a.sm.toFixed(2)} Ω`;$('#advancedB').textContent=`${a.b.toFixed(3)} ± ${a.sb.toFixed(3)} V`;$('#advancedChi').textContent=a.redChi.toFixed(2);$('#advancedDelta').textContent=o?`${(a.m-o.m).toFixed(3)} Ω`:'—';$('#advancedNotice').className='notice ok';$('#advancedNotice').textContent='Saved corrected-current fit restored.';
}
function drawResidual(){
  const c=$('#residualChart');if(!c)return;const{ctx,w,h}=canvasSetup(c,330),res=state.advanced?.res||[],p={l:65,r:24,t:24,b:50};ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);
  const maxX=Math.max(.1,...res.map(x=>x.x))*1.08,maxR=Math.max(.05,...res.map(x=>Math.abs(x.r)+x.sigma))*1.25,X=x=>p.l+x/maxX*(w-p.l-p.r),Y=r=>p.t+(maxR-r)/(2*maxR)*(h-p.t-p.b);
  ctx.strokeStyle='#dce5ee';for(let k=0;k<=5;k++){const x=p.l+(w-p.l-p.r)*k/5;ctx.beginPath();ctx.moveTo(x,p.t);ctx.lineTo(x,h-p.b);ctx.stroke();}
  ctx.strokeStyle='#173b63';ctx.beginPath();ctx.moveTo(p.l,Y(0));ctx.lineTo(w-p.r,Y(0));ctx.stroke();
  ctx.fillStyle='#52657f';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText('Corrected current I_D (mA)',(p.l+w-p.r)/2,h-8);
  if(!res.length){ctx.fillText('Run the advanced fit to display residuals.',w/2,h/2);return;}
  res.forEach(x=>{const xx=X(x.x),yy=Y(x.r),dy=Math.abs(Y(x.r+x.sigma)-Y(x.r));ctx.strokeStyle='#1f6fb8';ctx.beginPath();ctx.moveTo(xx,yy-dy);ctx.lineTo(xx,yy+dy);ctx.stroke();ctx.fillStyle='#1f6fb8';ctx.beginPath();ctx.arc(xx,yy,4,0,Math.PI*2);ctx.fill();});
}

function setupQuiz(){
  $('#quiz').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),ans={q1:'b',q2:'a',q3:'a',q4:'b',q5:'a',q6:'a'};const miss=Object.keys(ans).filter(q=>!fd.get(q));if(miss.length){$('#quizResult').className='notice warn';$('#quizResult').textContent='Answer all six questions before submitting.';return;}let score=0,breakdown=[];Object.entries(ans).forEach(([q,a],i)=>{const ok=fd.get(q)===a;if(ok)score++;breakdown.push({q:i+1,ok});});state.assessment={score,total:6,breakdown,ts:new Date().toISOString()};const box=$('#quizResult');box.className=score>=5?'notice ok':score>=3?'notice warn':'notice bad';box.innerHTML=`<strong>${score}/6 correct.</strong>`+(state.mode==='learn'?`<ul>${breakdown.map(x=>`<li>Question ${x.q}: ${x.ok?'correct':'review needed'}</li>`).join('')}</ul>`:'');save();});
}
function restoreAssessment(){if(!state.assessment)return;$('#quizResult').className=state.assessment.score>=5?'notice ok':state.assessment.score>=3?'notice warn':'notice bad';$('#quizResult').innerHTML=`<strong>Saved assessment: ${state.assessment.score}/${state.assessment.total}.</strong>`;}

function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function prose(s){return escapeHtml(s||'').replace(/\n/g,'<br>')||'<em>Not completed.</em>';}
function tableHtml(task,extra=false){
  const rr=REQUIRED[task].map(n=>state.data[task]?.[n]).filter(Boolean);
  if(!rr.length)return'<p><em>No readings recorded.</em></p>';
  return `<table class="core-table"><thead><tr><th>Selector</th><th>V / V</th><th>I_m / mA</th>${extra?'<th>I_D / mA</th>':''}</tr></thead><tbody>${rr.map(d=>`<tr><td>${d.selector}</td><td>${d.vm.toFixed(2)}</td><td>${(d.im*1000).toFixed(1)}</td>${extra?`<td>${(d.id*1000).toFixed(3)}</td>`:''}</tr>`).join('')}</tbody></table>`;
}
function buildReport(){
  drawCore();drawSum();drawResidual();state.report=collectReport();state.text=collectText();const r=state.report,o=officialFit(),lamp=lampAt6(),coreImg=$('#coreChart').toDataURL(),sumImg=$('#sumChart').toDataURL(),resImg=state.advanced?$('#residualChart').toDataURL():null;
  const advanced=state.advanced?`<p>Corrected-current effective-variance fit: R = ${state.advanced.m.toFixed(2)} ± ${state.advanced.sm.toFixed(2)} Ω; intercept = ${state.advanced.b.toFixed(3)} ± ${state.advanced.sb.toFixed(3)} V; reduced χ² = ${state.advanced.redChi.toFixed(2)}.</p>${resImg?`<img src="${resImg}" style="max-width:100%" alt="Advanced-fit residuals">`:''}`:'<p><em>Advanced extension not completed.</em></p>';
  const html=`<h2>Laboratory Report — E03</h2>
  <p><strong>Current–Voltage Characteristics of Electrical Dipoles</strong></p>
  <p><strong>Student:</strong> ${escapeHtml($('#studentName')?.value||'—')} &nbsp; <strong>Group:</strong> ${escapeHtml($('#studentGroup')?.value||'—')} &nbsp; <strong>Date:</strong> ${escapeHtml(r.reportDate||'—')} &nbsp; <strong>Run:</strong> ${escapeHtml(state.run.id)}</p>
  <h3>Part A — USTHB TP3 core protocol</h3>
  <h4>Short-derivation justification</h4><p>${prose(state.text.shortJustification)}</p>
  <h4>Resistor measurements</h4>${tableHtml('resistor')}<p><strong>Resistance from official V=f(I_m) graph:</strong> ${o?o.m.toFixed(2)+' Ω':'not determined'}.</p>
  <h4>Lamp measurements</h4>${tableHtml('lamp')}<p><strong>Operating resistance near 6 V:</strong> ${lamp?lamp.R.toFixed(1)+' Ω':'not determined'}; virtual manufacturer label implies 60 Ω.</p>
  <img src="${coreImg}" style="max-width:100%" alt="Resistor and lamp official characteristic graph">
  <h4>Interpretation</h4><p>${prose(state.text.resistorInterpretation)}</p><p>${prose(state.text.lampInterpretation)}</p>
  <h4>Series verification</h4>${tableHtml('series')}<p>${prose(state.text.seriesJustification)}</p>
  <h4>Parallel verification</h4>${tableHtml('parallel')}<p>${prose(state.text.parallelJustification)}</p>
  <img src="${sumImg}" style="max-width:100%" alt="Series and parallel graphical additions">
  <h3>Part B — Advanced analysis extension</h3>${advanced}
  <h3>Discussion</h3><p>${prose(r.reportDiscussion)}</p><h3>Conclusion</h3><p>${prose(r.reportConclusion)}</p>
  <p><strong>Assessment:</strong> ${state.assessment?state.assessment.score+'/'+state.assessment.total:'not submitted'}.</p>
  <hr><p class="mini">Part A follows the published USTHB TP3 sequence. Part B is an additional digital extension for uncertainty-aware analysis.</p>`;
  $('#reportPreview').innerHTML=html;$('#printOnlyPreview').innerHTML=html;save();
}

function renderEverything(){
  renderCoreTables();updateInterpretationMetrics();renderConstruction();renderAssociationTables();renderAdvancedTable();drawCore();drawSum();drawResidual();updateProgress();
}
function setupTabs(){
  $$('.tabbtn').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.tab;$$('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));$$('.tabpanel').forEach(p=>p.classList.toggle('active',p.id===id));if(id==='characteristics')drawCore();if(id==='associations')drawSum();if(id==='advanced')drawResidual();}));
}
function init(){
  load();if(state.report){delete state.report.studentName;delete state.report.studentGroup;try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(_){}}if(!state.run)state.run=newRunObject();restoreFields();setupTabs();setupQuiz();applyMode(state.mode);
  $('#taskSelect').value=state.task;$('#e03SourcePair').value=state.wiring?.source||'';$('#e03UsePair').value=state.wiring?.use||'';$('#e03AmmeterTopo').value=state.wiring?.ammeter||'';$('#e03VoltmeterTopo').value=state.wiring?.voltmeter||'';updateE03Wiring();
  $('#taskSelect').addEventListener('change',e=>changeTask(e.target.value));['e03SourcePair','e03UsePair','e03AmmeterTopo','e03VoltmeterTopo'].forEach(id=>$('#'+id).addEventListener('change',()=>{updateE03Wiring();renderAllBench();save();}));
  $('#verifyWiring').addEventListener('click',verifyWiring);$('#recordReading').addEventListener('click',recordReading);$('#newRun').addEventListener('click',newSpecimen);
  $('#addSeriesConstruct').addEventListener('click',addSeriesConstruction);$('#addParallelConstruct').addEventListener('click',addParallelConstruction);$('#runAdvancedFit').addEventListener('click',runAdvanced);$('#buildReport').addEventListener('click',buildReport);$('#clearLocalProgress')?.addEventListener('click',()=>{if(confirm('Clear all locally saved progress for this practical on this browser?')){try{localStorage.removeItem(STORAGE);}catch(_){}location.reload();}});$('#printReport').addEventListener('click',()=>{buildReport();window.print();});
  $$('.modebtn').forEach(b=>b.addEventListener('click',()=>applyMode(b.dataset.mode)));
  ['shortJustification','resistorInterpretation','lampInterpretation','seriesJustification','parallelJustification','reportDate','reportDiscussion','reportConclusion'].forEach(id=>document.getElementById(id)?.addEventListener('input',save));
  restoreAdvanced();restoreAssessment();renderEverything();renderAllBench();
  window.addEventListener('resize',()=>{drawCore();drawSum();drawResidual();});window.addEventListener('beforeunload',save);
}
init();
})();