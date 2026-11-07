(() => {
'use strict';

const RAC=11;
const BOX_REL=0.01;
const METER_CLASS=1.5;
const DN=0.5;
const V_SENS=20_000;
const A_BURDEN_FS=0.10;
const V_RANGES=[
  {cal:0.3,N:30,label:'0.3 V'},{cal:1,N:100,label:'1 V'},{cal:3,N:30,label:'3 V'},
  {cal:10,N:100,label:'10 V'},{cal:30,N:30,label:'30 V'},{cal:100,N:100,label:'100 V'},{cal:300,N:30,label:'300 V'}
];
const I_RANGES=[
  {cal:0.003,N:30,label:'3 mA'},{cal:0.01,N:100,label:'10 mA'},{cal:0.03,N:30,label:'30 mA'},
  {cal:0.1,N:100,label:'100 mA'},{cal:0.3,N:30,label:'300 mA'}
];
const STORAGE='PhysicsUSTHB_E01_v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:NaN;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

let state={
  version:2,mode:'learn',run:null,
  emf:{connected:false,maxSeen:false,range:300,best:null,high:null,wiring:{vplus:'',com:''}},
  pot:{verified:false,selector:0,range:300,records:{},wiring:{gplus:'',gminus:'',vplus:'',vcom:''}},
  rx:{method:'short',verified:false,vRange:300,iRange:0.3,records:{},wiring:{ammeter:'',voltmeter:''}},
  exactShown:false,assessment:null,text:{},report:{}
};

function makeRun(){
  const low=Math.random()<0.5;
  return{
    id:'E01-'+Math.random().toString(36).slice(2,7).toUpperCase(),
    E:11.85+Math.random()*0.30,
    rg:0.28+Math.random()*0.16,
    rx:low?(720+Math.random()*320):(3300+Math.random()*1300),
    vScale:(Math.random()-.5)*0.005,
    vZero:(Math.random()-.5)*0.0008,
    iScale:(Math.random()-.5)*0.006,
    iZero:(Math.random()-.5)*0.0005,
    vParallax:(Math.random()-.5)*0.36,
    iParallax:(Math.random()-.5)*0.36
  };
}
function save(){
  state.text=collectText();state.report=collectReport();
  try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(_){}
}
function load(){
  try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');if(x?.version===1)state={...state,...x};}catch(_){}
}
function collectText(){
  const ids=['emfConclusion','methodJustification'];
  const out={};ids.forEach(id=>{const el=document.getElementById(id);if(el)out[id]=el.value;});return out;
}
function collectReport(){
  const ids=['studentName','studentGroup','reportDate','reportDiscussion','reportConclusion'];
  const out={};ids.forEach(id=>{const el=document.getElementById(id);if(el)out[id]=el.value;});return out;
}
function restoreFields(){
  Object.entries(state.text||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});
  Object.entries(state.report||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});
  if(!$('#reportDate').value)$('#reportDate').value=new Date().toISOString().slice(0,10);
}

function rangeByCal(ranges,cal){return ranges.find(r=>Math.abs(r.cal-cal)<1e-12)||ranges.at(-1);}
function appropriateRange(ranges,value){return ranges.find(r=>value<=r.cal+1e-12)||ranges.at(-1);}
function nextRange(ranges,r){const i=ranges.indexOf(r);return ranges[Math.min(i+1,ranges.length-1)];}
function voltmeterR(range){return V_SENS*range.cal;}
function ammeterR(range){return A_BURDEN_FS/range.cal;}
function unc(range){return range.cal*METER_CLASS/100+range.cal*DN/range.N;}
function analogRead(trueValue,range,type){
  const overloaded=trueValue>range.cal*(1+1e-10);
  if(overloaded)return{overloaded:true,value:NaN,n:NaN,N:range.N,delta:unc(range)};
  const scale=type==='v'?state.run.vScale:state.run.iScale;
  const zero=type==='v'?state.run.vZero*range.cal:state.run.iZero*range.cal;
  const parallax=type==='v'?state.run.vParallax:state.run.iParallax;
  let indicated=trueValue*(1+scale)+zero;
  let n=indicated/range.cal*range.N+parallax;
  n=clamp(n,0,range.N);
  n=Math.round(n*10)/10;
  const value=n/range.N*range.cal;
  return{overloaded:false,value,n,N:range.N,delta:unc(range)};
}
function fillRanges(){
  const opts=(ranges,unitScale=1)=>ranges.map(r=>`<option value="${r.cal}">${r.label} · ${r.N} divisions</option>`).join('');
  $('#emfRange').innerHTML=opts(V_RANGES);$('#potRange').innerHTML=opts(V_RANGES);$('#rxVRange').innerHTML=opts(V_RANGES);$('#rxIRange').innerHTML=opts(I_RANGES);
  $('#emfRange').value=state.emf.range;$('#potRange').value=state.pot.range;$('#rxVRange').value=state.rx.vRange;$('#rxIRange').value=state.rx.iRange;
  $('#potSelectorSelect').innerHTML=Array.from({length:12},(_,i)=>`<option value="${i}">${i}</option>`).join('');
  $('#potSelectorSelect').value=state.pot.selector;
}


function updateEmfWiring(){
  state.emf.wiring={vplus:$('#emfVPlus').value,com:$('#emfCOM').value};const w=state.emf.wiring,el=$('#emfWiringStatus');
  if(!w.vplus||!w.com){el.className='wiring-status';el.textContent='No complete voltmeter connection yet.';return false;}
  if(w.vplus===w.com){el.className='wiring-status bad';el.textContent='Both voltmeter leads cannot be connected to the same generator terminal.';return false;}
  if(w.vplus==='gminus'&&w.com==='gplus'){el.className='wiring-status bad';el.textContent='Polarity reversed: the analog pointer would try to deflect in the wrong direction.';return false;}
  const ok=w.vplus==='gplus'&&w.com==='gminus';el.className=ok?'wiring-status ok':'wiring-status bad';el.textContent=ok?'Correct: V/+ to generator + and COM to generator −.':'Respect the voltmeter polarity shown in the handout.';return ok;
}
function updatePotWiring(){
  state.pot.wiring={gplus:$('#potGenPlus').value,gminus:$('#potGenMinus').value,vplus:$('#potVPlus').value,vcom:$('#potVCom').value};const w=state.pot.wiring,el=$('#potWiringStatus');
  state.pot.verified=false;
  if(!w.gplus||!w.gminus||!w.vplus||!w.vcom){el.className='wiring-status';el.textContent='Complete all four connections before verification.';return false;}
  const genPair=new Set([w.gplus,w.gminus]);
  if(genPair.has('A')&&genPair.has('B')){el.className='wiring-status bad';el.textContent='DANGEROUS: generator across A–B can drive excessive current through the low-resistance box. Disconnect it.';return false;}
  if(w.gplus===w.gminus||w.vplus===w.vcom){el.className='wiring-status bad';el.textContent='A source or voltmeter cannot have both leads on the same terminal.';return false;}
  const ok=w.gplus==='A'&&w.gminus==='C'&&w.vplus==='A'&&w.vcom==='B';el.className=ok?'wiring-status ok':'wiring-status bad';el.textContent=ok?'Correct potentiometric wiring: generator A–C, voltmeter A–B.':'The TP requires generator +→A, generator −→C, V/+→A and COM→B.';return ok;
}
function updateRxWiring(){
  state.rx.wiring={ammeter:$('#rxAmmeterPlacement').value,voltmeter:$('#rxVoltmeterSpan').value};state.rx.verified=false;const w=state.rx.wiring,short=state.rx.method==='short',ok=short?(w.ammeter==='total'&&w.voltmeter==='rx'):(w.ammeter==='rx'&&w.voltmeter==='a_rx'),el=$('#rxWiringStatus');
  if(!w.ammeter||!w.voltmeter){el.className='wiring-status';el.textContent='Select the ammeter and voltmeter positions for this topology.';return false;}
  el.className=ok?'wiring-status ok':'wiring-status bad';el.textContent=ok?(short?'Correct short derivation: ammeter reads I_Rx + I_V and voltmeter spans R_x.':'Correct long derivation: ammeter reads I_Rx and voltmeter spans ammeter + R_x.'):(short?'This does not reproduce Figure 1 (short derivation).':'This does not reproduce Figure 2 (long derivation).');return ok;
}
function emfWiringOK(){return state.emf.wiring?.vplus==='gplus'&&state.emf.wiring?.com==='gminus'}
function potWiringOK(){const w=state.pot.wiring||{};return w.gplus==='A'&&w.gminus==='C'&&w.vplus==='A'&&w.vcom==='B'}
function rxWiringOK(){const w=state.rx.wiring||{};return state.rx.method==='short'?(w.ammeter==='total'&&w.voltmeter==='rx'):(w.ammeter==='rx'&&w.voltmeter==='a_rx')}

function applyMode(mode){
  state.mode=mode==='lab'?'lab':'learn';document.body.classList.toggle('mode-lab',state.mode==='lab');document.body.classList.toggle('mode-learn',state.mode==='learn');
  $$('.modebtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
  $('#modeDescription').textContent=state.mode==='learn'?'Protocol guidance and interpretation prompts are visible.':'Minimal guidance; follow the prescribed sequence independently.';
  $('#reportMode').value=state.mode==='learn'?'Learn mode':'Lab mode';save();
}
function progress(){
  const emfDone=!!state.emf.best&&!!state.emf.high;
  const potDone=Object.keys(state.pot.records||{}).length===12;
  const rxDone=!!state.rx.records.short&&!!state.rx.records.long;
  const assessDone=!!state.assessment;
  const items=[
    ['7.1','Generator emf',emfDone,state.emf.best?(state.emf.high?'2 / 2':'1 / 2'):'0 / 2'],
    ['7.2','Potentiometric source',potDone,`${Object.keys(state.pot.records||{}).length} / 12`],
    ['7.3','Unknown resistance',rxDone,`${Object.keys(state.rx.records||{}).length} / 2`],
    ['POST','Assessment',assessDone,assessDone?`${state.assessment.score}/6`:'Not submitted']
  ];
  const firstIncomplete=items.findIndex(x=>!x[2]);
  $('#progressBoard').innerHTML=items.map((x,i)=>`<div class="e01-step ${x[2]?'done':''} ${i===firstIncomplete?'active':''}"><b>${x[0]}</b><strong>${x[1]}</strong><small>${x[2]?'Complete':x[3]}</small></div>`).join('');
}

function emfTrue(){
  const range=rangeByCal(V_RANGES,+$('#emfRange').value);
  const rv=voltmeterR(range);
  return state.run.E*rv/(state.run.rg+rv);
}

function renderAnalogScale(range){
  const svg=$('#emfScaleSvg');if(!svg)return;const cx=200,cy=188,r1=145,r2=range.N===30?132:135,labels=range.N===30?5:20;let out='';
  for(let n=0;n<=range.N;n++){
    const a=(-150+120*n/range.N)*Math.PI/180,major=n%labels===0,mid=!major&&(n%(range.N===30?1:5)===0),ro=r1,ri=major?119:mid?127:r2;
    const x1=cx+ro*Math.cos(a),y1=cy+ro*Math.sin(a),x2=cx+ri*Math.cos(a),y2=cy+ri*Math.sin(a);
    out+=`<line class="${major?'major':''}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"></line>`;
    if(major){const rt=105,xt=cx+rt*Math.cos(a),yt=cy+rt*Math.sin(a)+4;out+=`<text x="${xt.toFixed(1)}" y="${yt.toFixed(1)}">${n}</text>`;}
  }
  out+=`<text class="unit" x="200" y="84">divisions</text>`;svg.innerHTML=out;
}

function updateEmf(){
  state.emf.range=+$('#emfRange').value;const r=rangeByCal(V_RANGES,state.emf.range);
  if(r.cal===V_RANGES.at(-1).cal)state.emf.maxSeen=true;
  const trueV=emfTrue(),m=analogRead(trueV,r,'v');
  $('#emfScaleText').textContent=`0–${r.N} scale · ${r.label} range`;renderAnalogScale(r);
  if(m.overloaded){$('#emfReading').textContent='OVER RANGE';$('#emfDivisionReading').textContent='Increase the selected range.';$('#emfNeedle').style.transform='rotate(-25deg)';}
  else{
    $('#emfReading').textContent='READ SCALE';$('#emfDivisionReading').textContent=`Use the 0–${r.N} scale and calculate X=(n/N)·CAL.`;
    const frac=m.n/m.N;$('#emfNeedle').style.transform=`rotate(${-150+120*frac}deg)`;
  }
  $('#recordEmf').disabled=!state.emf.connected||m.overloaded;
}
function connectEmf(){
  if(!updateEmfWiring()){$('#emfMessage').className='notice warn';$('#emfMessage').textContent='Wire the voltmeter correctly before connecting it.';return;}
  if(+$('#emfRange').value!==300){$('#emfMessage').className='notice warn';$('#emfMessage').textContent='The handout requires the maximum voltmeter range before connecting an unknown voltage. Set 300 V first.';return;}
  state.emf.connected=true;state.emf.maxSeen=true;state.emf.range=300;
  $('#emfState').textContent='Voltmeter connected';$('#emfState').classList.add('ok');$('#emfMessage').className='notice ok';$('#emfMessage').textContent='Correct polarity and maximum range established. Reduce the range carefully until the largest non-overloading deflection is obtained.';updateEmf();save();
}
function recordEmf(){
  if(!state.emf.connected)return;
  const r=rangeByCal(V_RANGES,+$('#emfRange').value),trueV=emfTrue(),m=analogRead(trueV,r,'v');
  if(m.overloaded)return;
  const sn=+$('#emfStudentN').value,sv=+$('#emfStudentValue').value,su=+$('#emfStudentUnc').value;
  if(!Number.isFinite(sn)||!Number.isFinite(sv)||!Number.isFinite(su)){$('#emfMessage').className='notice warn';$('#emfMessage').textContent='Read the pointer and enter n, the calculated voltage, and ΔE before submitting.';return;}
  if(Math.abs(sn-m.n)>.6){$('#emfMessage').className='notice warn';$('#emfMessage').textContent=state.mode==='learn'?'Your division reading is not consistent with the pointer position. Re-read the analog scale; ±0.5 division is the intended reading estimate.':'Scale reading rejected: re-read the pointer.';return;}
  const fromN=sn/r.N*r.cal;
  if(Math.abs(sv-fromN)>Math.max(.015,r.cal/r.N*.15)){$('#emfMessage').className='notice warn';$('#emfMessage').textContent='Recalculate the voltage using X=(n/N)·CAL with the selected scale and range.';return;}
  if(Math.abs(su-m.delta)>Math.max(.015,.08*m.delta)){$('#emfMessage').className='notice warn';$('#emfMessage').textContent='Recalculate ΔE = ΔE_class + ΔE_read using class 1.5 and Δn=0.5 division.';return;}
  const best=appropriateRange(V_RANGES,state.run.E),higher=nextRange(V_RANGES,best);
  const rec={range:r.cal,label:r.label,value:sv,n:sn,N:m.N,delta:su,rv:voltmeterR(r)};
  if(Math.abs(r.cal-best.cal)<1e-12){
    state.emf.best=rec;$('#emfMessage').className='notice ok';$('#emfMessage').textContent=`Appropriate-range measurement stored. Now repeat using the immediately higher range (${higher.label}).`;
  }else if(Math.abs(r.cal-higher.cal)<1e-12){
    if(!state.emf.best){$('#emfMessage').className='notice warn';$('#emfMessage').textContent=`First store the appropriate-range result (${best.label}); the TP then asks for the immediately higher range.`;return;}
    state.emf.high=rec;$('#emfMessage').className='notice ok';$('#emfMessage').textContent='Higher-range measurement stored. Compare the two uncertainty intervals.';
  }else{
    $('#emfMessage').className='notice warn';$('#emfMessage').textContent=`This is a valid reading, but the TP requires ${best.label} and then ${higher.label}. It was not stored as one of the two required results.`;return;
  }
  $('#emfStudentN').value='';$('#emfStudentValue').value='';$('#emfStudentUnc').value='';renderEmfResults();progress();summary();save();
}
function renderEmfResults(){
  const put=(rec,prefix)=>{
    $(`#${prefix}Range`).textContent=rec?rec.label:'—';$(`#${prefix}Value`).textContent=rec?`${rec.value.toFixed(2)} V`:'—';$(`#${prefix}Unc`).textContent=rec?`± ${rec.delta.toFixed(2)} V`:'—';
  };
  put(state.emf.best,'emfBest');put(state.emf.high,'emfHigh');drawIntervals();
  if(state.emf.best&&state.emf.high){$('#emfConclusionHint').className='notice ok';$('#emfConclusionHint').textContent=`The ${state.emf.best.label} result has the smaller absolute uncertainty and should normally be retained: E = ${state.emf.best.value.toFixed(2)} ± ${state.emf.best.delta.toFixed(2)} V.`;}
}
function drawIntervals(){
  const box=$('#emfIntervals');box.innerHTML='';
  const recs=[state.emf.best,state.emf.high].filter(Boolean);if(!recs.length){box.innerHTML='<span class="interval-caption" style="top:15px">Record the two required measurements to compare uncertainty intervals.</span>';return;}
  const lo=Math.min(...recs.map(r=>r.value-r.delta))-1,hi=Math.max(...recs.map(r=>r.value+r.delta))+1,span=hi-lo||1;
  const x=v=>10+(v-lo)/span*84;
  const axis=document.createElement('div');axis.className='interval-axis';box.appendChild(axis);
  for(let k=0;k<=4;k++){const v=lo+span*k/4,t=document.createElement('div'),l=document.createElement('div');t.className='interval-tick';t.style.left=`${x(v)}%`;l.className='interval-label';l.style.left=`${x(v)}%`;l.textContent=v.toFixed(1);box.append(t,l);}
  recs.forEach((r,i)=>{const y=48+i*55,bar=document.createElement('div'),pt=document.createElement('div'),cap=document.createElement('div');bar.className='interval-bar';bar.style.left=`${x(r.value-r.delta)}%`;bar.style.width=`${x(r.value+r.delta)-x(r.value-r.delta)}%`;bar.style.top=`${y}px`;bar.style.background=i?'#b26b16':'#1f6fb8';pt.className='interval-point';pt.style.left=`${x(r.value)}%`;pt.style.top=`${y}px`;pt.style.background=i?'#b26b16':'#1f6fb8';cap.className='interval-caption';cap.style.top=`${y-21}px`;cap.textContent=r.label;box.append(bar,pt,cap);});
}

function potVth(n){return state.run.E*n/(RAC+state.run.rg);}
function potRth(n){return n<=0?0:n*(RAC-n+state.run.rg)/(RAC+state.run.rg);}
function potTrue(n,range){
  const rv=voltmeterR(range),vth=potVth(n),rth=potRth(n);return vth*rv/(rv+rth);
}
function renderPotSelectors(){
  const row=$('#potSelectorRow');row.innerHTML='';
  for(let n=0;n<=11;n++){
    const b=document.createElement('button');b.type='button';b.className='selector-e01';b.textContent=n;if(state.pot.records[n])b.classList.add('done');if(n===state.pot.selector)b.classList.add('selected');
    b.addEventListener('click',()=>{state.pot.selector=n;$('#potSelectorSelect').value=n;updatePot();save();});row.appendChild(b);
  }
}
function updatePot(){
  state.pot.range=+$('#potRange').value;state.pot.selector=+$('#potSelectorSelect').value;renderPotSelectors();
  const r=rangeByCal(V_RANGES,state.pot.range),tv=potTrue(state.pot.selector,r),m=analogRead(tv,r,'v');
  $('#potRab').textContent=`${state.pot.selector} Ω`;$('#potRangeLabel').textContent=r.label;$('#potVm').textContent=m.overloaded?'OVERLOAD':`${m.value.toFixed(2)} V`;
  $('#potState').textContent=state.pot.verified?'Wiring verified':'Wiring not verified';$('#potState').classList.toggle('ok',state.pot.verified);
  $('#recordPot').disabled=!state.pot.verified||!potWiringOK()||m.overloaded||!(state.emf.best&&state.emf.high);
  if(!(state.emf.best&&state.emf.high)){$('#potMessage').className='notice warn';$('#potMessage').textContent='Complete the generator-emf measurements before building the potentiometric circuit.';}
  else if(!state.pot.verified){$('#potMessage').className='notice';$('#potMessage').textContent='Verify the generator across A–C and the voltmeter across A–B before recording.';}
  else if(m.overloaded){$('#potMessage').className='notice bad';$('#potMessage').textContent='Voltmeter overload. Increase the range.';}
  else{$('#potMessage').className=appropriateRange(V_RANGES,tv).cal===r.cal?'notice ok':'notice warn';$('#potMessage').textContent=appropriateRange(V_RANGES,tv).cal===r.cal?'Ready: this is the appropriate range for the present voltage.':'Valid but non-optimal range: the reading can be recorded, although its uncertainty will be larger.';}
}
function verifyPot(){
  if(!(state.emf.best&&state.emf.high)){updatePot();return;}
  if(!updatePotWiring()){updatePot();return;}
  if(+$('#potRange').value!==300){$('#potMessage').className='notice warn';$('#potMessage').textContent='Put the voltmeter on its maximum range before the circuit is energised.';return;}
  state.pot.verified=true;state.pot.range=300;$('#potState').textContent='Wiring verified';$('#potState').classList.add('ok');updatePot();save();
}
function recordPot(){
  if(!state.pot.verified)return;
  const n=state.pot.selector,r=rangeByCal(V_RANGES,+$('#potRange').value),tv=potTrue(n,r),m=analogRead(tv,r,'v');if(m.overloaded)return;
  state.pot.records[n]={n,range:r.cal,label:r.label,N:r.N,div:m.n,v:m.value,deltaV:m.delta,rv:voltmeterR(r)};
  renderPotTable();drawPot();progress();summary();
  const missing=Array.from({length:12},(_,i)=>i).find(i=>!state.pot.records[i]);if(missing!==undefined){state.pot.selector=missing;$('#potSelectorSelect').value=missing;}updatePot();save();
}
function renderPotTable(){
  const body=$('#potBody');body.innerHTML='';
  for(let n=0;n<=11;n++){const d=state.pot.records[n],tr=document.createElement('tr');tr.innerHTML=d?`<td>${n}</td><td>${d.label}</td><td>${d.div.toFixed(1)} / ${d.N}</td><td>${d.v.toFixed(3)}</td><td>${d.deltaV.toFixed(3)}</td>`:`<td>${n}</td><td>—</td><td>—</td><td>—</td><td>—</td>`;body.appendChild(tr);}
}
function linearFitXY(xs,ys){
  if(xs.length<2)return null;const n=xs.length,sx=xs.reduce((a,b)=>a+b,0),sy=ys.reduce((a,b)=>a+b,0),sxx=xs.reduce((a,b)=>a+b*b,0),sxy=xs.reduce((a,b,i)=>a+b*ys[i],0),den=n*sxx-sx*sx;if(!den)return null;
  const m=(n*sxy-sx*sy)/den,b=(sy*sxx-sx*sxy)/den,ybar=mean(ys),ssTot=ys.reduce((a,y)=>a+(y-ybar)**2,0),ssRes=ys.reduce((a,y,i)=>a+(y-(m*xs[i]+b))**2,0);return{m,b,r2:ssTot?1-ssRes/ssTot:1};
}
function potFit(){
  const rec=Object.values(state.pot.records||{}).sort((a,b)=>a.n-b.n);return rec.length===12?linearFitXY(rec.map(d=>d.n),rec.map(d=>d.v)):null;
}
function canvas(c,hFallback=400){
  const dpr=window.devicePixelRatio||1,w=c.clientWidth||850,h=c.clientHeight||hFallback;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return{ctx,w,h};
}
function drawPot(){
  const c=$('#potChart');if(!c)return;const{ctx,w,h}=canvas(c),p={l:62,r:22,t:25,b:50},rec=Object.values(state.pot.records||{}).sort((a,b)=>a.n-b.n),maxV=Math.max(12.5,...rec.map(d=>d.v+d.deltaV)),X=x=>p.l+x/11*(w-p.l-p.r),Y=y=>h-p.b-y/maxV*(h-p.t-p.b);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#dce5ee';for(let k=0;k<=5;k++){let xx=p.l+(w-p.l-p.r)*k/5,yy=p.t+(h-p.t-p.b)*k/5;ctx.beginPath();ctx.moveTo(xx,p.t);ctx.lineTo(xx,h-p.b);ctx.stroke();ctx.beginPath();ctx.moveTo(p.l,yy);ctx.lineTo(w-p.r,yy);ctx.stroke();}
  ctx.strokeStyle='#173b63';ctx.beginPath();ctx.moveTo(p.l,p.t);ctx.lineTo(p.l,h-p.b);ctx.lineTo(w-p.r,h-p.b);ctx.stroke();ctx.fillStyle='#52657f';ctx.font='12px system-ui';ctx.textAlign='center';for(let k=0;k<=11;k+=2)ctx.fillText(k,X(k),h-22);ctx.fillText('R_AB (Ω)',(p.l+w-p.r)/2,h-6);ctx.save();ctx.translate(15,h/2);ctx.rotate(-Math.PI/2);ctx.fillText('V_AB (V)',0,0);ctx.restore();
  if(rec.length){ctx.strokeStyle='#1f6fb8';ctx.lineWidth=2;ctx.beginPath();rec.forEach((d,i)=>i?ctx.lineTo(X(d.n),Y(d.v)):ctx.moveTo(X(d.n),Y(d.v)));ctx.stroke();rec.forEach(d=>{ctx.strokeStyle='#1f6fb8';const dy=Math.abs(Y(d.v+d.deltaV)-Y(d.v));ctx.beginPath();ctx.moveTo(X(d.n),Y(d.v)-dy);ctx.lineTo(X(d.n),Y(d.v)+dy);ctx.stroke();ctx.fillStyle='#1f6fb8';ctx.beginPath();ctx.arc(X(d.n),Y(d.v),4.5,0,Math.PI*2);ctx.fill();});}
  const f=potFit();if(f){$('#potSlope').textContent=`${f.m.toFixed(4)} A`;$('#potR2').textContent=f.r2.toFixed(5);const d10=state.pot.records[10],rel=d10?(d10.deltaV/Math.max(d10.v,1e-12)+BOX_REL):NaN,di=rel*f.m;$('#potIUnc').textContent=Number.isFinite(di)?`± ${di.toFixed(4)} A`:'— A';}
  else{$('#potSlope').textContent='— A';$('#potIUnc').textContent='— A';$('#potR2').textContent='—';}
}

function rxSource(){
  const n=5;return{vth:potVth(n),rth:potRth(n)};
}
function rxTrue(method,vRange,iRange){
  const {vth,rth}=rxSource(),rv=voltmeterR(vRange),ra=ammeterR(iRange),rx=state.run.rx;
  if(method==='short'){
    const rp=1/(1/rx+1/rv),im=vth/(rth+ra+rp),vm=im*rp;return{vm,im,rv,ra};
  }
  const branch=ra+rx,req=1/(1/branch+1/rv),vm=vth*req/(rth+req),im=vm/branch;return{vm,im,rv,ra};
}
function rxRead(){
  const vr=rangeByCal(V_RANGES,+$('#rxVRange').value),ir=rangeByCal(I_RANGES,+$('#rxIRange').value),t=rxTrue(state.rx.method,vr,ir),vm=analogRead(t.vm,vr,'v'),im=analogRead(t.im,ir,'i');return{vr,ir,t,vm,im};
}
function updateRx(){
  state.rx.vRange=+$('#rxVRange').value;state.rx.iRange=+$('#rxIRange').value;const x=rxRead();
  $('#rxVm').textContent=x.vm.overloaded?'OVERLOAD':`${x.vm.value.toFixed(2)} V`;$('#rxIm').textContent=x.im.overloaded?'OVERLOAD':`${(x.im.value*1000).toFixed(2)} mA`;
  $('#recordRx').disabled=!state.rx.verified||!rxWiringOK()||x.vm.overloaded||x.im.overloaded||Object.keys(state.pot.records||{}).length<12;
  if(Object.keys(state.pot.records||{}).length<12){$('#rxMessage').className='notice warn';$('#rxMessage').textContent='Complete all twelve potentiometric-divider readings first.';}
  else if(!state.rx.verified){$('#rxMessage').className='notice';$('#rxMessage').textContent='Verify the selected topology before connecting the potentiometric source.';}
  else if(x.vm.overloaded||x.im.overloaded){$('#rxMessage').className='notice bad';$('#rxMessage').textContent='Instrument overload. Increase the affected range.';}
  else{
    const vBest=appropriateRange(V_RANGES,x.t.vm),iBest=appropriateRange(I_RANGES,x.t.im),optimal=vBest.cal===x.vr.cal&&iBest.cal===x.ir.cal;
    $('#rxMessage').className=optimal?'notice ok':'notice warn';$('#rxMessage').textContent=optimal?'Both instruments are on appropriate ranges. Ready to record.':`Valid measurement, but more appropriate ranges are approximately ${vBest.label} and ${iBest.label}.`;
  }
}
function setMethod(method){
  state.rx.method=method;state.rx.verified=false;state.rx.wiring={ammeter:'',voltmeter:''};$('#rxAmmeterPlacement').value='';$('#rxVoltmeterSpan').value='';updateRxWiring();$('.method-btn').forEach(b=>b.classList.toggle('active',b.dataset.method===method));
  const short=method==='short';$('#voltBranch').setAttribute('d',short?'M500 82V150H605V82':'M344 82V150H605V82');$('#voltCircle').setAttribute('cx',short?'552':'474');$('#voltText').setAttribute('x',short?'552':'474');
  $('#rxVRange').value=300;$('#rxIRange').value=.3;state.rx.vRange=300;state.rx.iRange=.3;updateRx();save();
}
function verifyRx(){
  if(Object.keys(state.pot.records||{}).length<12){updateRx();return;}
  if(!updateRxWiring()){updateRx();return;}
  if(+$('#rxVRange').value!==300||+$('#rxIRange').value!==.3){$('#rxMessage').className='notice warn';$('#rxMessage').textContent='Before energising a new circuit, put both analog instruments on their maximum ranges.';return;}
  state.rx.verified=true;state.rx.vRange=300;state.rx.iRange=.3;updateRx();save();
}
function recordRx(){
  if(!state.rx.verified)return;const x=rxRead();if(x.vm.overloaded||x.im.overloaded)return;
  const V=x.vm.value,I=x.im.value;if(!(V>0&&I>0))return;const rca=V/I,dV=x.vm.delta,dI=x.im.delta,dR=rca*(dV/V+dI/I);
  const correction=state.rx.method==='short'?rca*rca/x.t.rv:-x.t.ra,corrected=rca+correction;
  state.rx.records[state.rx.method]={method:state.rx.method,V,I,dV,dI,rca,dR,correction,corrected,rv:x.t.rv,ra:x.t.ra,vRange:x.vr.label,iRange:x.ir.label};
  state.exactShown=false;renderRx();progress();summary();save();
}
function renderRx(){
  const body=$('#rxBody');body.innerHTML='';
  ['short','long'].forEach(m=>{const d=state.rx.records[m],tr=document.createElement('tr');tr.innerHTML=d?`<td>${m==='short'?'Short':'Long'}</td><td>${d.V.toFixed(2)} V</td><td>${(d.I*1000).toFixed(2)} mA</td><td>${d.rca.toFixed(1)} Ω</td><td>${d.correction>=0?'+':''}${d.correction.toFixed(1)} Ω</td><td>± ${d.dR.toFixed(1)} Ω</td><td>${d.corrected.toFixed(1)} ± ${d.dR.toFixed(1)} Ω</td>`:`<td>${m==='short'?'Short':'Long'}</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td>`;body.appendChild(tr);});
  const n=Object.keys(state.rx.records||{}).length;$('#rxBadge').textContent=`${n} / 2`;$('#rxBadge').classList.toggle('done',n===2);methodDecision();
}
function methodDecision(){
  const s=state.rx.records.short,l=state.rx.records.long;if(!s||!l){$('#methodDecision').innerHTML='Complete both methods first. Then compare R<sub>Ca</sub> with R<sub>0</sub>.';return;}
  const r0=Math.sqrt(s.rv*l.ra),estimate=(s.rca+l.rca)/2,preferred=estimate<r0?'short':'long',corrS=Math.abs(s.correction),corrL=Math.abs(l.correction);
  $('#methodDecision').innerHTML=`Using R<sub>V</sub>=${(s.rv/1000).toFixed(0)} kΩ and R<sub>A</sub>=${l.ra.toFixed(2)} Ω gives R<sub>0</sub>=${r0.toFixed(0)} Ω. Your resistance estimate is ${estimate.toFixed(0)} Ω, so the criterion favours <strong>${preferred} derivation</strong>. The correction magnitudes are ${corrS.toFixed(1)} Ω (short) and ${corrL.toFixed(1)} Ω (long).`;
}
function preferredRx(){
  const s=state.rx.records.short,l=state.rx.records.long;if(!s||!l)return null;const r0=Math.sqrt(s.rv*l.ra),estimate=(s.rca+l.rca)/2;return estimate<r0?s:l;
}

function summary(){
  const e=state.emf.best,p=potFit(),pr=preferredRx();$('#summaryE').textContent=e?`${e.value.toFixed(2)} ± ${e.delta.toFixed(2)} V`:'—';$('#summaryIa').textContent=p?`${p.m.toFixed(4)} A`:'—';$('#summaryRx').textContent=pr?`${pr.corrected.toFixed(0)} ± ${pr.dR.toFixed(0)} Ω`:'—';
  const bits=[];if(e)bits.push(`The retained emf uses the ${e.label} range because it is the smallest range that does not overload.`);if(p)bits.push(`The divider graph is highly linear (R²=${p.r2.toFixed(5)}), and its slope is the measured divider current.`);if(pr)bits.push(`The preferred resistance result is from ${pr.method} derivation after applying the systematic correction.`);$('#summaryText').innerHTML=bits.length?bits.map(x=>`<p>${x}</p>`).join(''):'<p>Complete the experimental blocks to populate this synthesis.</p>';
}
function revealExact(){
  const s=state.rx.records.short,l=state.rx.records.long;if(!s||!l){$('#exactNotice').className='notice warn';$('#exactNotice').textContent='Complete both resistance-measurement topologies first.';return;}
  state.exactShown=true;const pr=preferredRx(),err=100*(pr.corrected-state.run.rx)/state.run.rx;
  $('#exactNotice').className='notice ok';$('#exactNotice').textContent='Exact simulator specimen revealed for post-analysis comparison.';
  $('#exactText').innerHTML=`<p>The hidden specimen is R<sub>X,true</sub>=${state.run.rx.toFixed(1)} Ω. The preferred corrected result is ${pr.corrected.toFixed(1)} ± ${pr.dR.toFixed(1)} Ω, a signed deviation of ${err.toFixed(2)}%.</p><p>The short-derivation correction R<sub>Ca</sub>²/R<sub>V</sub> is an approximation valid when R<sub>Ca</sub>≪R<sub>V</sub>; the long-derivation correction −R<sub>A</sub> is exact for the idealised topology. This comparison is an extension beyond the core TP calculation.</p>`;save();
}

function setupQuiz(){
  $('#quiz').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),ans={q1:'a',q2:'a',q3:'a',q4:'a',q5:'a',q6:'a'},missing=Object.keys(ans).filter(q=>!fd.get(q));if(missing.length){$('#quizResult').className='notice warn';$('#quizResult').textContent='Answer all six questions before submitting.';return;}let score=0,breakdown=[];Object.entries(ans).forEach(([q,a],i)=>{const ok=fd.get(q)===a;if(ok)score++;breakdown.push({q:i+1,ok});});state.assessment={score,total:6,breakdown,ts:new Date().toISOString()};const box=$('#quizResult');box.className=score>=5?'notice ok':score>=3?'notice warn':'notice bad';box.innerHTML=`<strong>${score}/6 correct.</strong>`+(state.mode==='learn'?`<ul>${breakdown.map(x=>`<li>Question ${x.q}: ${x.ok?'correct':'review needed'}</li>`).join('')}</ul>`:'');progress();save();});
}
function restoreAssessment(){if(!state.assessment)return;$('#quizResult').className=state.assessment.score>=5?'notice ok':state.assessment.score>=3?'notice warn':'notice bad';$('#quizResult').innerHTML=`<strong>Saved assessment: ${state.assessment.score}/${state.assessment.total}.</strong>`;}

function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function prose(s){return escapeHtml(s||'').replace(/\n/g,'<br>')||'<em>Not completed.</em>';}
function potTableHtml(){
  return `<table class="e01-table"><thead><tr><th>RAB / Ω</th><th>Range</th><th>VAB / V</th><th>ΔV / V</th></tr></thead><tbody>${Array.from({length:12},(_,n)=>{const d=state.pot.records[n];return d?`<tr><td>${n}</td><td>${d.label}</td><td>${d.v.toFixed(3)}</td><td>${d.deltaV.toFixed(3)}</td></tr>`:`<tr><td>${n}</td><td>—</td><td>—</td><td>—</td></tr>`;}).join('')}</tbody></table>`;
}
function rxTableHtml(){
  return `<table class="e01-table"><thead><tr><th>Method</th><th>RCa</th><th>Correction</th><th>ΔRCa</th><th>Corrected RX</th></tr></thead><tbody>${['short','long'].map(m=>{const d=state.rx.records[m];return d?`<tr><td>${m}</td><td>${d.rca.toFixed(1)} Ω</td><td>${d.correction.toFixed(1)} Ω</td><td>${d.dR.toFixed(1)} Ω</td><td>${d.corrected.toFixed(1)} Ω</td></tr>`:`<tr><td>${m}</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`;}).join('')}</tbody></table>`;
}
function buildReport(){
  drawPot();state.report=collectReport();state.text=collectText();const e=state.emf.best,h=state.emf.high,p=potFit(),pr=preferredRx(),img=$('#potChart').toDataURL('image/png');
  const d10=state.pot.records[10],di=p&&d10?p.m*(d10.deltaV/Math.max(d10.v,1e-12)+BOX_REL):NaN;
  const html=`<h2>Laboratory Report — E01</h2><p><strong>Electrical Measurements & Resistance</strong></p>
  <p><strong>Student:</strong> ${escapeHtml(state.report.studentName||'—')} &nbsp; <strong>Group:</strong> ${escapeHtml(state.report.studentGroup||'—')} &nbsp; <strong>Date:</strong> ${escapeHtml(state.report.reportDate||'—')} &nbsp; <strong>Run:</strong> ${escapeHtml(state.run.id)}</p>
  <h3>7.1 — Generator emf</h3><p>Appropriate range: ${e?e.label+', E = '+e.value.toFixed(2)+' ± '+e.delta.toFixed(2)+' V':'not completed'}. Immediately higher range: ${h?h.label+', E′ = '+h.value.toFixed(2)+' ± '+h.delta.toFixed(2)+' V':'not completed'}.</p><p>${prose(state.text.emfConclusion)}</p>
  <h3>7.2 — Potentiometric source</h3>${potTableHtml()}<p>Slope-derived current: <strong>${p?p.m.toFixed(4)+' A':'not determined'}</strong>${Number.isFinite(di)?', ΔI ≈ '+di.toFixed(4)+' A':''}; R² = ${p?p.r2.toFixed(5):'—'}.</p><img src="${img}" style="max-width:100%" alt="VAB versus RAB graph">
  <h3>7.3 — Unknown resistance</h3>${rxTableHtml()}<p>Preferred method: <strong>${pr?pr.method+' derivation':'not determined'}</strong>. Preferred result: ${pr?pr.corrected.toFixed(1)+' ± '+pr.dR.toFixed(1)+' Ω':'—'}.</p><p>${prose(state.text.methodJustification)}</p>
  <h3>Discussion</h3><p>${prose(state.report.reportDiscussion)}</p><h3>Conclusion</h3><p>${prose(state.report.reportConclusion)}</p><p><strong>Assessment:</strong> ${state.assessment?state.assessment.score+'/'+state.assessment.total:'not submitted'}.</p>
  <hr><p class="mini">Core calculations follow the USTHB resistance-measurement practical. Numerical meter specifications and hidden component values are virtual simulation parameters.</p>`;
  $('#reportPreview').innerHTML=html;$('#printOnlyPreview').innerHTML=html;save();
}

function setupTabs(){
  $$('.tabbtn').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.tab;$$('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));$$('.tabpanel').forEach(p=>p.classList.toggle('active',p.id===id));if(id==='potentiometer')drawPot();}));
}
function newSpecimen(){
  if((state.emf.best||Object.keys(state.pot.records).length||Object.keys(state.rx.records).length)&&!confirm('Start a new E01 specimen? Existing measurements and analysis will be cleared.'))return;
  state.run=makeRun();state.emf={connected:false,maxSeen:false,range:300,best:null,high:null};state.pot={verified:false,selector:0,range:300,records:{}};state.rx={method:'short',verified:false,vRange:300,iRange:.3,records:{}};state.exactShown=false;state.assessment=null;fillRanges();renderAll();save();
}
function renderAll(){
  renderEmfResults();updateEmf();renderPotTable();drawPot();updatePot();renderRx();updateRx();restoreAssessment();progress();summary();
  if(state.exactShown)revealExact();
}
function init(){
  load();if(!state.run)state.run=makeRun();fillRanges();restoreFields();setupTabs();setupQuiz();applyMode(state.mode);
  ['emfVPlus','emfCOM'].forEach(id=>$('#'+id).addEventListener('change',()=>{state.emf.connected=false;updateEmfWiring();updateEmf();save();}));$('#emfRange').addEventListener('change',()=>{$('#emfStudentN').value='';$('#emfStudentValue').value='';$('#emfStudentUnc').value='';updateEmf();});$('#connectEmf').addEventListener('click',connectEmf);$('#recordEmf').addEventListener('click',recordEmf);$('#newSpecimen').addEventListener('click',newSpecimen);
  ['potGenPlus','potGenMinus','potVPlus','potVCom'].forEach(id=>$('#'+id).addEventListener('change',()=>{updatePotWiring();updatePot();save();}));$('#potRange').addEventListener('change',updatePot);$('#potSelectorSelect').addEventListener('change',e=>{state.pot.selector=+e.target.value;updatePot();save();});$('#verifyPot').addEventListener('click',verifyPot);$('#recordPot').addEventListener('click',recordPot);
  $('.method-btn').forEach(b=>b.addEventListener('click',()=>setMethod(b.dataset.method)));['rxAmmeterPlacement','rxVoltmeterSpan'].forEach(id=>$('#'+id).addEventListener('change',()=>{updateRxWiring();updateRx();save();}));$('#rxVRange').addEventListener('change',updateRx);$('#rxIRange').addEventListener('change',updateRx);$('#verifyRx').addEventListener('click',verifyRx);$('#recordRx').addEventListener('click',recordRx);
  $('#revealExact').addEventListener('click',revealExact);$('#buildReport').addEventListener('click',buildReport);$('#printReport').addEventListener('click',()=>{buildReport();window.print();});$$('.modebtn').forEach(b=>b.addEventListener('click',()=>applyMode(b.dataset.mode)));
  ['emfConclusion','methodJustification','studentName','studentGroup','reportDate','reportDiscussion','reportConclusion'].forEach(id=>document.getElementById(id)?.addEventListener('input',save));
  window.addEventListener('resize',drawPot);window.addEventListener('beforeunload',save);renderAll();
}
init();
})();