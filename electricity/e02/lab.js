(() => {
'use strict';

const NX=101, NY=121;
const XMIN=-10, XMAX=10, YMIN=-12, YMAX=12;
const DX=(XMAX-XMIN)/(NX-1), DY=(YMAX-YMIN)/(NY-1);
const ELEC_HALF=8, CYL_R=3;
const TARGETS=[2,4,6,8], REQUIRED_MAP_POINTS=4, AXIS_X=[-10,-8,-6,-4,-2,0,2,4,6,8,10];
const STORAGE='PhysicsUSTHB_E02_v2';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const idx=(i,j)=>j*NX+i;

let state={
  version:2,mode:'learn',run:null,
  plane:{connected:false,x:0,y:0,va:null,vb:null,sym:{plus:null,minus:null}},
  mapA:{target:2,y:0,x:0,points:{},mirrored:false,lines:{central:false,edge:false}},
  axisA:{records:{}},
  cyl:{x:0,y:0,inside:null,surface:null,vc:null},
  mapB:{target:2,y:0,points:{},lines:{M:false,N:false}},
  axisB:{records:{}},
  assessment:null,text:{},report:{}
};
let fields={A:null,B:null};

function makeRun(){
  return{
    id:'E02-'+Math.random().toString(36).slice(2,7).toUpperCase(),
    VB:10.75+Math.random()*0.35,
    scale:(Math.random()-.5)*0.003,
    zero:(Math.random()-.5)*0.018,
    seed:Math.random()*1000
  };
}
function save(){
  state.text=collectText();state.report=collectReport();
  try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(_){}
}
function load(){
  try{const s=JSON.parse(localStorage.getItem(STORAGE)||'null');if(s?.version===2)state={...state,...s};}catch(_){}
}
function collectText(){
  const ids=['fieldConclusionA','uniformConclusion','chargeDistribution','distortionConclusion','compareConclusion'];
  const o={};ids.forEach(id=>{const el=document.getElementById(id);if(el)o[id]=el.value;});return o;
}
function collectReport(){
  const ids=['reportDate','reportDiscussion','reportConclusion'];
  const o={};ids.forEach(id=>{const el=document.getElementById(id);if(el)o[id]=el.value;});return o;
}
function restoreFields(){
  Object.entries(state.text||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});
  Object.entries(state.report||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});
  if(!$('#reportDate').value)$('#reportDate').value=new Date().toISOString().slice(0,10);
}

function xAt(i){return XMIN+i*DX}
function yAt(j){return YMIN+j*DY}
function insideCylinder(x,y){return x*x+y*y<=CYL_R*CYL_R}
function solveField(withCylinder){
  const V=new Float64Array(NX*NY),fixed=new Uint8Array(NX*NY);
  const vb=state.run.VB,vc=vb/2;
  for(let j=0;j<NY;j++)for(let i=0;i<NX;i++)V[idx(i,j)]=vb*i/(NX-1);
  for(let j=0;j<NY;j++){
    const y=yAt(j);
    if(Math.abs(y)<=ELEC_HALF+1e-9){fixed[idx(0,j)]=1;V[idx(0,j)]=0;fixed[idx(NX-1,j)]=1;V[idx(NX-1,j)]=vb;}
  }
  if(withCylinder){
    for(let j=1;j<NY-1;j++)for(let i=1;i<NX-1;i++){const x=xAt(i),y=yAt(j);if(insideCylinder(x,y)){fixed[idx(i,j)]=1;V[idx(i,j)]=vc;}}
  }
  const omega=1.84;
  for(let it=0;it<2200;it++){
    for(let i=0;i<NX;i++){if(!fixed[idx(i,0)])V[idx(i,0)]=V[idx(i,1)];if(!fixed[idx(i,NY-1)])V[idx(i,NY-1)]=V[idx(i,NY-2)];}
    for(let j=0;j<NY;j++){if(!fixed[idx(0,j)])V[idx(0,j)]=V[idx(1,j)];if(!fixed[idx(NX-1,j)])V[idx(NX-1,j)]=V[idx(NX-2,j)];}
    let md=0;
    for(let j=1;j<NY-1;j++){
      for(let i=1;i<NX-1;i++){
        const k=idx(i,j);if(fixed[k])continue;
        const nv=.25*(V[idx(i-1,j)]+V[idx(i+1,j)]+V[idx(i,j-1)]+V[idx(i,j+1)]);
        const d=omega*(nv-V[k]);V[k]+=d;if(Math.abs(d)>md)md=Math.abs(d);
      }
    }
    if(it>120&&md<1e-5)break;
  }
  return{V,fixed,withCylinder,VB:vb,VC:vc};
}
function recomputeFields(){fields.A=solveField(false);fields.B=solveField(true);}

function sample(field,x,y){
  x=clamp(x,XMIN,XMAX);y=clamp(y,YMIN,YMAX);
  if(field.withCylinder&&insideCylinder(x,y))return field.VC;
  const gx=(x-XMIN)/DX,gy=(y-YMIN)/DY,i=Math.min(NX-2,Math.max(0,Math.floor(gx))),j=Math.min(NY-2,Math.max(0,Math.floor(gy))),tx=gx-i,ty=gy-j;
  const v00=field.V[idx(i,j)],v10=field.V[idx(i+1,j)],v01=field.V[idx(i,j+1)],v11=field.V[idx(i+1,j+1)];
  return(1-tx)*(1-ty)*v00+tx*(1-ty)*v10+(1-tx)*ty*v01+tx*ty*v11;
}
function fieldVec(field,x,y){
  if(field.withCylinder&&insideCylinder(x,y))return{ex:0,ey:0,mag:0};
  const h=.18;
  const ex=-(sample(field,x+h,y)-sample(field,x-h,y))/(2*h);
  const ey=-(sample(field,x,y+h)-sample(field,x,y-h))/(2*h);
  return{ex,ey,mag:Math.hypot(ex,ey)*100};
}
function deterministicNoise(x,y){
  const q=Math.sin(12.9898*x+78.233*y+state.run.seed)*43758.5453;
  return (q-Math.floor(q)-.5)*.025;
}
function readPotential(field,x,y){
  let v=sample(field,x,y)*(1+state.run.scale)+state.run.zero+deterministicNoise(x,y);
  if(Math.abs(v)<.015)v=0;
  return Math.round(v*100)/100;
}

function applyMode(mode){
  state.mode=mode==='lab'?'lab':'learn';document.body.classList.toggle('mode-lab',state.mode==='lab');document.body.classList.toggle('mode-learn',state.mode==='learn');
  $$('.modebtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
  $('#modeDescription').textContent=state.mode==='learn'?'Protocol guidance and interpretation prompts are visible.':'Minimal guidance; follow the mapping protocol independently.';
  $('#reportMode').value=state.mode==='learn'?'Learn mode':'Lab mode';save();
}
function targetPoints(map,t){return Object.values(map.points?.[t]||{}).sort((a,b)=>a.y-b.y)}
function targetComplete(map,t){const pts=targetPoints(map,t);return pts.some(p=>Math.abs(p.y)<.01)&&pts.filter(p=>p.y>0).length>=REQUIRED_MAP_POINTS-1}
function pointCount(map){return TARGETS.reduce((n,t)=>n+Math.min(REQUIRED_MAP_POINTS,targetPoints(map,t).length),0)}
function mapComplete(map){return TARGETS.every(t=>targetComplete(map,t))}
function axisComplete(axis){return AXIS_X.every(x=>axis.records?.[x])}
function progress(){
  const setup=state.plane.va!=null&&state.plane.vb!=null&&state.plane.sym.plus&&state.plane.sym.minus;
  const a=mapComplete(state.mapA)&&axisComplete(state.axisA)&&state.mapA.lines.central&&state.mapA.lines.edge;
  const b=state.cyl.vc!=null&&mapComplete(state.mapB)&&axisComplete(state.axisB)&&state.mapB.lines.M&&state.mapB.lines.N;
  const assess=!!state.assessment;
  const items=[
    ['A.2','Plane setup',setup,setup?'Complete':'Electrodes + symmetry'],
    ['A.3–7','Plane mapping',a,`${pointCount(state.mapA)}/16 map · ${Object.keys(state.axisA.records||{}).length}/11 scan · lines ${state.mapA.lines.central&&state.mapA.lines.edge?'✓':'…'}`],
    ['B.1–5','Cylinder mapping',b,`${pointCount(state.mapB)}/16 map · ${Object.keys(state.axisB.records||{}).length}/11 scan · lines ${state.mapB.lines.M&&state.mapB.lines.N?'✓':'…'}`],
    ['POST','Assessment',assess,assess?`${state.assessment.score}/6`:'Not submitted']
  ];
  const active=items.findIndex(x=>!x[2]);
  $('#progressBoard').innerHTML=items.map((x,i)=>`<div class="e02-step ${x[2]?'done':''} ${i===active?'active':''}"><b>${x[0]}</b><strong>${x[1]}</strong><small>${x[2]?'Complete':x[3]}</small></div>`).join('');
}

function canvasCoords(canvas,x,y){
  const p=34,w=canvas.clientWidth||900,h=canvas.clientHeight||620;
  return{px:p+(x-XMIN)/(XMAX-XMIN)*(w-2*p),py:h-p-(y-YMIN)/(YMAX-YMIN)*(h-2*p),p,w,h};
}
function drawTank(canvas,field,probe,map,lines=[]){
  if(!canvas||!field)return;
  const dpr=window.devicePixelRatio||1,w=canvas.clientWidth||900,h=canvas.clientHeight||620;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  const p=34,px=x=>p+(x-XMIN)/(XMAX-XMIN)*(w-2*p),py=y=>h-p-(y-YMIN)/(YMAX-YMIN)*(h-2*p);
  const g=ctx.createLinearGradient(px(XMIN),0,px(XMAX),0);g.addColorStop(0,'#d4eef2');g.addColorStop(.5,'#eaf8f7');g.addColorStop(1,'#cceaf0');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(39,93,108,.14)';ctx.lineWidth=1;ctx.font='11px system-ui';ctx.fillStyle='#547681';
  for(let x=-10;x<=10;x+=2){ctx.beginPath();ctx.moveTo(px(x),py(YMIN));ctx.lineTo(px(x),py(YMAX));ctx.stroke();ctx.fillText(x,px(x)-6,h-9);}
  for(let y=-12;y<=12;y+=2){ctx.beginPath();ctx.moveTo(px(XMIN),py(y));ctx.lineTo(px(XMAX),py(y));ctx.stroke();}
  ctx.strokeStyle='#1c5e72';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(px(-10),py(-8));ctx.lineTo(px(-10),py(8));ctx.stroke();ctx.strokeStyle='#bc5b39';ctx.beginPath();ctx.moveTo(px(10),py(-8));ctx.lineTo(px(10),py(8));ctx.stroke();
  ctx.fillStyle='#154f62';ctx.font='700 13px system-ui';ctx.fillText('A · 0 V',px(-10)+10,py(8)-9);ctx.fillStyle='#9b3d26';ctx.fillText('B · high V',px(10)-75,py(8)-9);
  if(field.withCylinder){ctx.fillStyle='rgba(70,83,98,.82)';ctx.strokeStyle='#263746';ctx.lineWidth=2;ctx.beginPath();ctx.arc(px(0),py(0),Math.abs(px(CYL_R)-px(0)),0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText('C',px(0),py(0)+4);ctx.textAlign='left';}
  const colors={2:'#246fb5',4:'#168b78',6:'#a16a16',8:'#a34472'};
  if(map?.points){
    for(const t of TARGETS){
      const pts=[];for(const q of targetPoints(map,t)){pts.push(q);if((map.mirrored||field.withCylinder)&&q.y>0)pts.push({...q,y:-q.y});}
      pts.sort((a,b)=>a.y-b.y);if(pts.length){ctx.strokeStyle=colors[t];ctx.lineWidth=2;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(px(q.x),py(q.y)):ctx.moveTo(px(q.x),py(q.y)));ctx.stroke();ctx.fillStyle=colors[t];pts.forEach(q=>{ctx.beginPath();ctx.arc(px(q.x),py(q.y),4,0,Math.PI*2);ctx.fill();});}
    }
  }
  lines.forEach((line,li)=>{if(!line?.length)return;ctx.strokeStyle=li===0?'#2c7f97':li===1?'#b86c22':'#7a3db8';ctx.lineWidth=2;ctx.beginPath();line.forEach((q,i)=>i?ctx.lineTo(px(q.x),py(q.y)):ctx.moveTo(px(q.x),py(q.y)));ctx.stroke();});
  if(probe){ctx.strokeStyle='#c4384d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px(probe.x)-9,py(probe.y));ctx.lineTo(px(probe.x)+9,py(probe.y));ctx.moveTo(px(probe.x),py(probe.y)-9);ctx.lineTo(px(probe.x),py(probe.y)+9);ctx.stroke();ctx.fillStyle='#c4384d';ctx.beginPath();ctx.arc(px(probe.x),py(probe.y),4,0,Math.PI*2);ctx.fill();}
}
function eventPoint(canvas,e){
  const r=canvas.getBoundingClientRect(),p=34,w=r.width,h=r.height;
  const x=XMIN+(e.clientX-r.left-p)/(w-2*p)*(XMAX-XMIN);
  const y=YMAX-(e.clientY-r.top-p)/(h-2*p)*(YMAX-YMIN);
  return{x:clamp(x,XMIN,XMAX),y:clamp(y,YMIN,YMAX)};
}

function updatePlane(){
  const x=state.plane.x,y=state.plane.y,v=state.plane.connected?readPotential(fields.A,x,y):NaN,e=fieldVec(fields.A,x,y);
  $('#planeX').textContent=`${x.toFixed(1)} cm`;$('#planeY').textContent=`${y.toFixed(1)} cm`;$('#planeV').textContent=state.plane.connected?`${v.toFixed(2)} V`:'— V';$('#planeE').textContent=state.mode==='learn'&&axisComplete(state.axisA)?`${e.mag.toFixed(1)} V/m`:'hidden';
  $('#planeXSlider').value=x;$('#planeYSlider').value=y;$('#measurePlaneProbe').disabled=!state.plane.connected;
  $('#planeState').textContent=state.plane.connected?'Source connected':'Source disconnected';$('#planeState').classList.toggle('ok',state.plane.connected);
  drawPlaneCanvases();
}
function connectPlane(){
  state.plane.connected=true;$('#planeMessage').className='notice ok';$('#planeMessage').textContent='Source connected. Measure both electrode surfaces and perform the symmetry check.';updatePlane();save();
}
function measurePlane(){
  if(!state.plane.connected)return;const x=state.plane.x,y=state.plane.y,v=readPotential(fields.A,x,y);
  if(x<=-9.7&&Math.abs(y)<=8.2){state.plane.va=v;$('#planeMessage').className='notice ok';$('#planeMessage').textContent='Electrode A potential recorded.';}
  else if(x>=9.7&&Math.abs(y)<=8.2){state.plane.vb=v;$('#planeMessage').className='notice ok';$('#planeMessage').textContent='Electrode B potential recorded.';}
  else{$('#planeMessage').className='notice';$('#planeMessage').textContent=`Probe reading at (${x.toFixed(1)}, ${y.toFixed(1)}) cm: ${v.toFixed(2)} V.`;}
  renderPlaneResults();progress();save();
}
function recordSym(){
  if(!state.plane.connected)return;const x=state.plane.x,y=state.plane.y,v=readPotential(fields.A,x,y);
  if(Math.abs(Math.abs(y)-5)>.15){$('#symmetryStatus').textContent='Use y=+5 cm or y=−5 cm for the symmetry pair.';return;}
  if(y>0){state.plane.sym.plus={x,y:5,v};$('#symmetryStatus').textContent='Positive-y point stored. Move to y=−5 cm at the same x.';}
  else{
    if(state.plane.sym.plus&&Math.abs(state.plane.sym.plus.x-x)>.15){$('#symmetryStatus').textContent=`Use the same x=${state.plane.sym.plus.x.toFixed(1)} cm as the +5 cm point.`;return;}
    state.plane.sym.minus={x,y:-5,v};
  }
  renderPlaneResults();progress();save();
}
function renderPlaneResults(){
  $('#vaResult').textContent=state.plane.va==null?'—':`${state.plane.va.toFixed(2)} V`;$('#vbResult').textContent=state.plane.vb==null?'—':`${state.plane.vb.toFixed(2)} V`;
  if(state.plane.sym.plus&&state.plane.sym.minus){const d=Math.abs(state.plane.sym.plus.v-state.plane.sym.minus.v);$('#symResult').textContent=`${d.toFixed(2)} V`;$('#symmetryStatus').textContent=`V(x,+5)=${state.plane.sym.plus.v.toFixed(2)} V, V(x,−5)=${state.plane.sym.minus.v.toFixed(2)} V; difference ${d.toFixed(2)} V.`;}
  else $('#symResult').textContent='—';
}

function setupTargetButtons(container,map,key){
  const el=$(container);el.innerHTML='';
  TARGETS.forEach(t=>{const b=document.createElement('button');b.className='target-btn';b.type='button';b.textContent=`${t} V`;if(map.target===t)b.classList.add('active');if(targetComplete(map,t))b.classList.add('done');b.addEventListener('click',()=>{map.target=t;if(key==='A')updateMapA();else{$('#targetBSelect').value=t;updateMapBControls();}save();});el.appendChild(b);});
}
function yProgress(container,map){
  const pts=targetPoints(map,map.target),ys=pts.map(p=>p.y);
  const axis=ys.some(y=>Math.abs(y)<.01),positive=ys.filter(y=>y>0);
  const chips=[`<span class="y-chip ${axis?'done':''}">x-axis ${axis?'✓':'required'}</span>`,...positive.map(y=>`<span class="y-chip done">y=+${y.toFixed(1)} cm</span>`)];
  while(chips.length<REQUIRED_MAP_POINTS)chips.push('<span class="y-chip">choose y &gt; 0</span>');
  $(container).innerHTML=chips.join('');
}
function mapPointStore(map,t,y,p){if(!map.points[t])map.points[t]={};map.points[t][Number(y).toFixed(1)]=p;}
function mapAProbe(){
  const x=state.mapA.x,y=state.mapA.y,v=readPotential(fields.A,x,y);return{x,y,v,error:v-state.mapA.target};
}
function updateMapA(){
  state.mapA.y=+$('#mapAYSelect').value;$('#mapAXSlider').value=state.mapA.x;$('#mapAYLineLabel').textContent=`${state.mapA.y.toFixed(1)} cm`;
  const q=mapAProbe();$('#mapAX').textContent=`${q.x.toFixed(2)} cm`;$('#mapAY').textContent=`${q.y.toFixed(1)} cm`;$('#mapAV').textContent=`${q.v.toFixed(2)} V`;$('#mapAError').textContent=`${q.error>=0?'+':''}${q.error.toFixed(2)} V`;$('#targetOverlay').textContent=`Target: ${state.mapA.target} V`;
  setupTargetButtons('#targetsA',state.mapA,'A');yProgress('#yProgressA',state.mapA);renderEquipATable();drawPlaneCanvases();updateFieldsA();
}
function markA(){
  if(!state.plane.connected){$('#mapAMessage').className='notice warn';$('#mapAMessage').textContent='Connect the plane-electrode configuration first.';return;}
  const t=state.mapA.target,y=state.mapA.y,pts=targetPoints(state.mapA,t);
  if(!pts.some(p=>Math.abs(p.y)<.01)&&Math.abs(y)>.01){$('#mapAMessage').className='notice warn';$('#mapAMessage').textContent='As in the handout, locate the equipotential on x′Ox (y=0) first.';return;}
  if(y>0&&pts.some(p=>Math.abs(p.y-y)<.25)){$('#mapAMessage').className='notice warn';$('#mapAMessage').textContent='Choose a different positive constant-y line for the next point.';return;}
  const q=mapAProbe();if(Math.abs(q.error)>.10){$('#mapAMessage').className='notice warn';$('#mapAMessage').textContent=state.mode==='learn'?`Reading is ${Math.abs(q.error).toFixed(2)} V from target. ${q.error<0?'Move toward electrode B (right).':'Move toward electrode A (left).'}`:'Current reading is outside the ±0.10 V acceptance band.';return;}
  mapPointStore(state.mapA,t,y,{x:q.x,y:q.y,v:q.v});$('#mapAMessage').className='notice ok';$('#mapAMessage').textContent=`${t} V point stored at y=${y.toFixed(1)} cm. ${targetComplete(state.mapA,t)?'This equipotential has enough upper-half points.':'Choose another positive constant-y line.'}`;
  if(targetComplete(state.mapA,t)){const nt=TARGETS.find(v=>!targetComplete(state.mapA,v));if(nt!==undefined){state.mapA.target=nt;state.mapA.y=0;$('#mapAYSelect').value=0;}}
  updateMapA();progress();save();
}
function mirrorA(){
  if(!mapComplete(state.mapA)){ $('#mapAMessage').className='notice warn';$('#mapAMessage').textContent='Complete all upper-half mapping points before applying symmetry.';return;}
  state.mapA.mirrored=true;$('#mapAMessage').className='notice ok';$('#mapAMessage').textContent='Negative-y points have been reproduced by symmetry, as prescribed in the handout.';drawPlaneCanvases();save();
}
function renderEquipATable(){
  const body=$('#equipABody');body.innerHTML='';
  TARGETS.forEach(t=>{const pts=targetPoints(state.mapA,t);if(!pts.length){const tr=document.createElement('tr');tr.innerHTML=`<td>${t} V</td><td>—</td><td>—</td><td>—</td>`;body.appendChild(tr);return;}pts.forEach(d=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${t} V</td><td>${d.y>=0?'+':''}${d.y.toFixed(1)}</td><td>${d.x.toFixed(2)}</td><td>${d.v.toFixed(2)}</td>`;body.appendChild(tr);});});
}

function axisPoint(map,t){return targetPoints(map,t).find(p=>Math.abs(p.y)<.01)}
function fieldMetricsA(){
  const xs=TARGETS.map(t=>axisPoint(state.mapA,t)?.x);
  if(xs.some(x=>x==null))return null;
  const points=[-10,...xs],out=[];
  for(let i=0;i<4;i++){const dxm=(points[i+1]-points[i])/100;out.push(2/Math.abs(dxm));}
  return out;
}
function updateFieldsA(){
  const e=fieldMetricsA();['#eA1','#eA2','#eA3','#eA4'].forEach((id,i)=>$(id).textContent=e?`${e[i].toFixed(1)} V/m`:'— V/m');renderAxisProgress('A');drawAxisChart();
}
function nextAxis(axis){return AXIS_X.find(x=>!axis.records?.[x]);}
function renderAxisProgress(which){
  const axis=which==='A'?state.axisA:state.axisB,el=$(which==='A'?'#axisProgressA':'#axisProgressB'),next=nextAxis(axis);
  el.innerHTML=AXIS_X.map(x=>`<span class="axis-chip ${axis.records?.[x]?'done':''} ${x===next?'next':''}">${x}</span>`).join('');
}
function recordAxis(which){
  const axis=which==='A'?state.axisA:state.axisB,field=which==='A'?fields.A:fields.B;
  if(which==='A'&&!mapComplete(state.mapA)){ $('#axisMessageA').className='notice warn';$('#axisMessageA').textContent='Complete the four equipotential maps first.';return;}
  if(which==='B'&&!mapComplete(state.mapB)){ $('#axisMessageB').className='notice warn';$('#axisMessageB').textContent='Complete the cylinder equipotential map first.';return;}
  const x=nextAxis(axis);if(x===undefined)return;
  if(which==='A'){state.plane.x=x;state.plane.y=0;updatePlane();}else{state.cyl.x=x;state.cyl.y=0;updateCylinder();}
  axis.records[x]={x,v:readPotential(field,x,0)};
  const nxt=nextAxis(axis),id=which==='A'?'#axisMessageA':'#axisMessageB';$(id).className=nxt===undefined?'notice ok':'notice';$(id).textContent=nxt===undefined?'Axial scan complete.':`Recorded x=${x} cm. Next required position: x=${nxt} cm.`;
  renderAxisProgress(which);drawAxisChart();drawCompare();progress();save();
}
function traceLine(field,x0,y0){
  const one=(sign)=>{
    const arr=[];let x=x0,y=y0;for(let k=0;k<500;k++){arr.push({x,y});const f=fieldVec(field,x,y),m=Math.hypot(f.ex,f.ey);if(m<1e-8)break;const step=.12;x+=sign*f.ex/m*step;y+=sign*f.ey/m*step;if(x<=XMIN+.05||x>=XMAX-.05||y<=YMIN+.05||y>=YMAX-.05)break;if(field.withCylinder&&insideCylinder(x,y))break;}return arr;
  };
  const back=one(-1).reverse(),forward=one(1);return[...back.slice(0,-1),...forward];
}
function planeLines(){
  const out=[];if(state.mapA.lines.central)out.push(traceLine(fields.A,9.6,0));if(state.mapA.lines.edge)out.push(traceLine(fields.A,9.6,7.3));return out;
}
function drawPlaneCanvases(){
  drawTank($('#planeCanvas'),fields.A,{x:state.plane.x,y:state.plane.y},state.mapA,planeLines());
  drawTank($('#mapACanvas'),fields.A,{x:state.mapA.x,y:state.mapA.y},state.mapA,planeLines());
  const fa=$('#fieldCanvasA');if(fa)drawTank(fa,fields.A,null,state.mapA,planeLines());
}
function drawAxisChart(){
  const c=$('#axisChart');if(!c)return;const dpr=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0),p={l:58,r:22,t:25,b:48},X=x=>p.l+(x+10)/20*(w-p.l-p.r),Y=v=>h-p.b-v/12*(h-p.t-p.b);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#dce5ee';for(let k=0;k<=5;k++){const xx=p.l+(w-p.l-p.r)*k/5,yy=p.t+(h-p.t-p.b)*k/5;ctx.beginPath();ctx.moveTo(xx,p.t);ctx.lineTo(xx,h-p.b);ctx.stroke();ctx.beginPath();ctx.moveTo(p.l,yy);ctx.lineTo(w-p.r,yy);ctx.stroke();}ctx.strokeStyle='#173b63';ctx.beginPath();ctx.moveTo(p.l,p.t);ctx.lineTo(p.l,h-p.b);ctx.lineTo(w-p.r,h-p.b);ctx.stroke();
  ctx.fillStyle='#52657f';ctx.font='12px system-ui';ctx.textAlign='center';AXIS_X.filter((_,i)=>i%2===0).forEach(x=>ctx.fillText(x,X(x),h-20));ctx.fillText('x (cm)',(p.l+w-p.r)/2,h-5);ctx.save();ctx.translate(15,h/2);ctx.rotate(-Math.PI/2);ctx.fillText('Potential (V)',0,0);ctx.restore();
  const pts=AXIS_X.map(x=>state.axisA.records?.[x]).filter(Boolean);if(pts.length){ctx.strokeStyle='#1f6fb8';ctx.lineWidth=2;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(X(q.x),Y(q.v)):ctx.moveTo(X(q.x),Y(q.v)));ctx.stroke();ctx.fillStyle='#1f6fb8';pts.forEach(q=>{ctx.beginPath();ctx.arc(X(q.x),Y(q.v),4,0,Math.PI*2);ctx.fill();});}
}

function updateCylinder(){
  const x=state.cyl.x,y=state.cyl.y,v=readPotential(fields.B,x,y),f=fieldVec(fields.B,x,y);$('#cylX').textContent=`${x.toFixed(1)} cm`;$('#cylY').textContent=`${y.toFixed(1)} cm`;$('#cylV').textContent=`${v.toFixed(2)} V`;$('#cylE').textContent=`${f.mag.toFixed(1)} V/m`;$('#cylXSlider').value=x;$('#cylYSlider').value=y;$('#cylPotentialOverlay').textContent=`VC ≈ ${fields.B.VC.toFixed(2)} V`;drawCylinderCanvases();
}
function recordCylinder(){
  const x=state.cyl.x,y=state.cyl.y,r=Math.hypot(x,y),v=readPotential(fields.B,x,y);
  if(r<2.5){
    state.cyl.inside={x,y,v,e:fieldVec(fields.B,x,y).mag};
    $('#cylMessage').className='notice ok';$('#cylMessage').textContent='Interior conductor reading stored. Move the probe to the cylinder surface (r ≈ 3 cm) and record again.';
  }else if(Math.abs(r-CYL_R)<=0.35){
    state.cyl.surface={x,y,v,e:fieldVec(fields.B,x,y).mag};
    $('#cylMessage').className='notice ok';$('#cylMessage').textContent='Surface conductor reading stored. Compare it with the interior value.';
  }else{
    $('#cylMessage').className='notice warn';$('#cylMessage').textContent='Record one point clearly inside the conductor and one point on its surface (radius 3 cm).';return;
  }
  if(state.cyl.inside&&state.cyl.surface)state.cyl.vc=(state.cyl.inside.v+state.cyl.surface.v)/2;
  renderCylinderResults();progress();save();
}
function renderCylinderResults(){
  $('#vcResult').textContent=state.cyl.vc==null?'—':`${state.cyl.vc.toFixed(2)} V`;
  $('#ecResult').textContent=state.cyl.inside?`${state.cyl.inside.e.toFixed(1)} V/m`:'—';
  $('#compareVC').textContent=state.cyl.vc==null?'— V':`${state.cyl.vc.toFixed(2)} V`;
}
function updateMapBControls(){
  state.mapB.target=+$('#targetBSelect').value;state.mapB.y=+$('#mapBYSelect').value;state.cyl.y=state.mapB.y;$('#cylYSlider').value=state.cyl.y;$('#mapBYLineLabel').textContent=`${state.mapB.y.toFixed(1)} cm`;setupTargetButtons('#targetsB',state.mapB,'B');yProgress('#yProgressB',state.mapB);updateCylinder();
}
function markB(){
  if(!axisComplete(state.axisA)){ $('#cylMessage').className='notice warn';$('#cylMessage').textContent='Complete Configuration A, including the axial scan, before mapping Configuration B.';return;}
  if(state.cyl.vc==null){$('#cylMessage').className='notice warn';$('#cylMessage').textContent='Record the conductor potential first.';return;}
  const t=+$('#targetBSelect').value,y=+$('#mapBYSelect').value,pts=targetPoints(state.mapB,t);
  if(!pts.some(p=>Math.abs(p.y)<.01)&&Math.abs(y)>.01){$('#cylMessage').className='notice warn';$('#cylMessage').textContent='Locate this equipotential on x′Ox (y=0) first.';return;}
  if(y>0&&pts.some(p=>Math.abs(p.y-y)<.25)){$('#cylMessage').className='notice warn';$('#cylMessage').textContent='Choose a different positive constant-y line, unless you are deliberately adding the y=5 cm point required for B.4.';return;}
  const x=state.cyl.x,v=readPotential(fields.B,x,y),err=v-t;if(Math.abs(err)>.10){$('#cylMessage').className='notice warn';$('#cylMessage').textContent=state.mode==='learn'?`Reading differs from target by ${Math.abs(err).toFixed(2)} V. ${err<0?'Move right toward B.':'Move left toward A.'}`:'Current point is outside the ±0.10 V target band.';return;}
  mapPointStore(state.mapB,t,y,{x,y,v});$('#cylMessage').className='notice ok';$('#cylMessage').textContent=`${t} V point stored at y=${y.toFixed(1)} cm. ${targetComplete(state.mapB,t)?'Core mapping complete for this equipotential.':'Choose another positive constant-y line.'}`;setupTargetButtons('#targetsB',state.mapB,'B');yProgress('#yProgressB',state.mapB);updateFieldM();drawCylinderCanvases();progress();save();
}
function pointAtY(map,t,y){return targetPoints(map,t).find(p=>Math.abs(p.y-y)<.1)}
function seedM(){
  const a=pointAtY(state.mapB,6,5),b=pointAtY(state.mapB,8,5);return a&&b?{x:(a.x+b.x)/2,y:5}:null;
}
function seedN(){
  const a=pointAtY(state.mapB,2,5),b=pointAtY(state.mapB,4,5);return a&&b?{x:(a.x+b.x)/2,y:-5}:null;
}
function updateFieldM(){
  const a=pointAtY(state.mapB,6,5),b=pointAtY(state.mapB,8,5);if(a&&b){const E=2/(Math.abs(b.x-a.x)/100);$('#fieldM').textContent=`${E.toFixed(1)} V/m`;}else $('#fieldM').textContent='record Eq3 & Eq4 at y=5 cm';
}
function cylLines(){
  const lines=[];if(state.mapB.lines.M&&seedM())lines.push(traceLine(fields.B,seedM().x,seedM().y));if(state.mapB.lines.N&&seedN())lines.push(traceLine(fields.B,seedN().x,seedN().y));return lines;
}
function drawCylinderCanvases(){
  drawTank($('#cylCanvas'),fields.B,{x:state.cyl.x,y:state.cyl.y},state.mapB,cylLines());
  const fb=$('#fieldCanvasB');if(fb)drawTank(fb,fields.B,null,state.mapB,cylLines());
}
function drawCompare(){
  const c=$('#compareChart');if(!c)return;const dpr=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0),p={l:58,r:22,t:25,b:48},X=x=>p.l+(x+10)/20*(w-p.l-p.r),Y=v=>h-p.b-v/12*(h-p.t-p.b);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#dce5ee';for(let k=0;k<=5;k++){const xx=p.l+(w-p.l-p.r)*k/5,yy=p.t+(h-p.t-p.b)*k/5;ctx.beginPath();ctx.moveTo(xx,p.t);ctx.lineTo(xx,h-p.b);ctx.stroke();ctx.beginPath();ctx.moveTo(p.l,yy);ctx.lineTo(w-p.r,yy);ctx.stroke();}ctx.strokeStyle='#173b63';ctx.beginPath();ctx.moveTo(p.l,p.t);ctx.lineTo(p.l,h-p.b);ctx.lineTo(w-p.r,h-p.b);ctx.stroke();
  ctx.fillStyle='#52657f';ctx.font='12px system-ui';ctx.textAlign='center';AXIS_X.filter((_,i)=>i%2===0).forEach(x=>ctx.fillText(x,X(x),h-20));ctx.fillText('x (cm)',(p.l+w-p.r)/2,h-5);
  const draw=(axis,color)=>{const pts=AXIS_X.map(x=>axis.records?.[x]).filter(Boolean);if(!pts.length)return;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(X(q.x),Y(q.v)):ctx.moveTo(X(q.x),Y(q.v)));ctx.stroke();ctx.fillStyle=color;pts.forEach(q=>{ctx.beginPath();ctx.arc(X(q.x),Y(q.v),4,0,Math.PI*2);ctx.fill();});};
  draw(state.axisA,'#1f6fb8');draw(state.axisB,'#a34472');ctx.textAlign='left';ctx.fillStyle='#1f6fb8';ctx.fillText('● V₁(x)',w-150,24);ctx.fillStyle='#a34472';ctx.fillText('● V₂(x)',w-80,24);
}

function renderAxisAll(){renderAxisProgress('A');renderAxisProgress('B');drawAxisChart();drawCompare();}
function setupQuiz(){
  $('#quiz').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),ans={q1:'a',q2:'a',q3:'a',q4:'a',q5:'a',q6:'a'},missing=Object.keys(ans).filter(q=>!fd.get(q));if(missing.length){$('#quizResult').className='notice warn';$('#quizResult').textContent='Answer all six questions before submitting.';return;}let score=0,breakdown=[];Object.entries(ans).forEach(([q,a],i)=>{const ok=fd.get(q)===a;if(ok)score++;breakdown.push({q:i+1,ok});});state.assessment={score,total:6,breakdown,ts:new Date().toISOString()};const box=$('#quizResult');box.className=score>=5?'notice ok':score>=3?'notice warn':'notice bad';box.innerHTML=`<strong>${score}/6 correct.</strong>`+(state.mode==='learn'?`<ul>${breakdown.map(x=>`<li>Question ${x.q}: ${x.ok?'correct':'review needed'}</li>`).join('')}</ul>`:'');progress();save();});
}
function restoreAssessment(){if(!state.assessment)return;$('#quizResult').className=state.assessment.score>=5?'notice ok':state.assessment.score>=3?'notice warn':'notice bad';$('#quizResult').innerHTML=`<strong>Saved assessment: ${state.assessment.score}/${state.assessment.total}.</strong>`;}

function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function prose(s){return escapeHtml(s||'').replace(/\n/g,'<br>')||'<em>Not completed.</em>';}
function equipSummary(map){
  return `<table class="equip-table"><thead><tr><th>Eq</th><th>y / cm</th><th>x / cm</th><th>V / V</th></tr></thead><tbody>${TARGETS.flatMap(t=>{const pts=targetPoints(map,t);return pts.length?pts.map(d=>`<tr><td>${t}</td><td>${d.y>=0?'+':''}${d.y.toFixed(1)}</td><td>${d.x.toFixed(2)}</td><td>${d.v.toFixed(2)}</td></tr>`):[`<tr><td>${t}</td><td>—</td><td>—</td><td>—</td></tr>`];}).join('')}</tbody></table>`;
}
function axisSummary(axis){return `<table class="equip-table"><thead><tr><th>x / cm</th><th>V / V</th></tr></thead><tbody>${AXIS_X.map(x=>axis.records?.[x]?`<tr><td>${x}</td><td>${axis.records[x].v.toFixed(2)}</td></tr>`:`<tr><td>${x}</td><td>—</td></tr>`).join('')}</tbody></table>`;}
function buildReport(){
  drawPlaneCanvases();drawCylinderCanvases();drawAxisChart();drawCompare();state.report=collectReport();state.text=collectText();const e=fieldMetricsA(),mapAimg=$('#mapACanvas').toDataURL(),mapBimg=$('#cylCanvas').toDataURL(),axisImg=$('#compareChart').toDataURL();
  const html=`<h2>Laboratory Report — E02</h2><p><strong>Rheographic Tank — Electric Potential & Field Mapping</strong></p>
  <p><strong>Student:</strong> ${escapeHtml(state.report.studentName||'—')} &nbsp; <strong>Group:</strong> ${escapeHtml(state.report.studentGroup||'—')} &nbsp; <strong>Date:</strong> ${escapeHtml(state.report.reportDate||'—')} &nbsp; <strong>Run:</strong> ${escapeHtml(state.run.id)}</p>
  <h3>A — Two plane electrodes</h3><p>V_A=${state.plane.va==null?'—':state.plane.va.toFixed(2)} V; V_B=${state.plane.vb==null?'—':state.plane.vb.toFixed(2)} V. Symmetry difference: ${state.plane.sym.plus&&state.plane.sym.minus?Math.abs(state.plane.sym.plus.v-state.plane.sym.minus.v).toFixed(2)+' V':'—'}.</p>
  <h4>Equipotential map</h4>${equipSummary(state.mapA)}<img src="${mapAimg}" style="max-width:100%" alt="Plane-electrode equipotential map">
  <h4>Mean fields</h4><p>${e?e.map((v,i)=>`E${i+1}=${v.toFixed(1)} V/m`).join('; '):'Not determined'}.</p><p>${prose(state.text.fieldConclusionA)}</p>
  <h4>Axial scan V₁(x)</h4>${axisSummary(state.axisA)}<p>${prose(state.text.uniformConclusion)}</p>
  <h3>B — Central conducting cylinder</h3><p>V_C=${state.cyl.vc==null?'—':state.cyl.vc.toFixed(2)+' V'}; internal field ≈ 0 V/m.</p><p>${prose(state.text.chargeDistribution)}</p>
  <h4>Equipotential map with conductor</h4>${equipSummary(state.mapB)}<img src="${mapBimg}" style="max-width:100%" alt="Equipotential map with conducting cylinder"><p>${prose(state.text.distortionConclusion)}</p>
  <h4>V₁(x) and V₂(x)</h4>${axisSummary(state.axisB)}<img src="${axisImg}" style="max-width:100%" alt="Axial potential comparison"><p>${prose(state.text.compareConclusion)}</p>
  <h3>Discussion</h3><p>${prose(state.report.reportDiscussion)}</p><h3>Conclusion</h3><p>${prose(state.report.reportConclusion)}</p><p><strong>Assessment:</strong> ${state.assessment?state.assessment.score+'/'+state.assessment.total:'not submitted'}.</p>
  <hr><p class="mini">The core task sequence follows the USTHB rheographic-tank practical. The numerical finite-difference geometry and probe noise are transparent virtual-laboratory modelling choices.</p>`;
  $('#reportPreview').innerHTML=html;$('#printOnlyPreview').innerHTML=html;save();
}
function newTank(){
  if((pointCount(state.mapA)||pointCount(state.mapB)||Object.keys(state.axisA.records).length)&&!confirm('Start a new virtual tank? Existing E02 measurements will be cleared.'))return;
  const mode=state.mode,text=state.text,report=state.report;state={version:2,mode,run:makeRun(),plane:{connected:false,x:0,y:0,va:null,vb:null,sym:{plus:null,minus:null}},mapA:{target:2,y:0,x:0,points:{},mirrored:false,lines:{central:false,edge:false}},axisA:{records:{}},cyl:{x:0,y:0,inside:null,surface:null,vc:null},mapB:{target:2,y:0,points:{},lines:{M:false,N:false}},axisB:{records:{}},assessment:null,text,report};recomputeFields();renderAll();save();
}
function setupTabs(){
  $$('.tabbtn').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.tab;$$('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));$$('.tabpanel').forEach(p=>p.classList.toggle('active',p.id===id));drawPlaneCanvases();drawCylinderCanvases();drawAxisChart();drawCompare();}));
}
function renderAll(){
  renderPlaneResults();updatePlane();setupTargetButtons('#targetsA',state.mapA,'A');yProgress('#yProgressA',state.mapA);renderEquipATable();updateMapA();updateFieldsA();renderAxisAll();renderCylinderResults();setupTargetButtons('#targetsB',state.mapB,'B');$('#targetBSelect').value=state.mapB.target;$('#mapBYSelect').value=state.mapB.y;updateMapBControls();updateFieldM();restoreAssessment();progress();
}
function init(){
  load();if(state.report){delete state.report.studentName;delete state.report.studentGroup;try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(_){}}if(!state.run)state.run=makeRun();recomputeFields();restoreFields();setupTabs();setupQuiz();applyMode(state.mode);
  const planeCanvas=$('#planeCanvas'),mapCanvas=$('#mapACanvas'),cylCanvas=$('#cylCanvas');
  const planeMove=e=>{if(!state.plane.connected)return;const p=eventPoint(planeCanvas,e);state.plane.x=p.x;state.plane.y=p.y;updatePlane();};
  planeCanvas.addEventListener('pointerdown',planeMove);
  mapCanvas.addEventListener('pointerdown',e=>{const p=eventPoint(mapCanvas,e);state.mapA.x=p.x;state.mapA.y=+$('#mapAYSelect').value;$('#mapAXSlider').value=state.mapA.x;updateMapA();});
  cylCanvas.addEventListener('pointerdown',e=>{const p=eventPoint(cylCanvas,e);state.cyl.x=p.x;state.cyl.y=p.y;$('#cylXSlider').value=p.x;$('#cylYSlider').value=p.y;updateCylinder();});
  $('#planeXSlider').addEventListener('input',e=>{state.plane.x=+e.target.value;updatePlane();});$('#planeYSlider').addEventListener('input',e=>{state.plane.y=+e.target.value;updatePlane();});$('#connectPlane').addEventListener('click',connectPlane);$('#measurePlaneProbe').addEventListener('click',measurePlane);$('#recordSymmetry').addEventListener('click',recordSym);$('#newTank').addEventListener('click',newTank);
  $('#mapAXSlider').addEventListener('input',e=>{state.mapA.x=+e.target.value;updateMapA();});$('#mapAYSelect').addEventListener('change',e=>{state.mapA.y=+e.target.value;updateMapA();});$('#markEquipA').addEventListener('click',markA);$('#mirrorEquipA').addEventListener('click',mirrorA);
  $('#recordAxisA').addEventListener('click',()=>recordAxis('A'));$('#traceCentralA').addEventListener('click',()=>{state.mapA.lines.central=true;drawPlaneCanvases();progress();save();});$('#traceEdgeA').addEventListener('click',()=>{state.mapA.lines.edge=true;drawPlaneCanvases();progress();save();});
  $('#cylXSlider').addEventListener('input',e=>{state.cyl.x=+e.target.value;updateCylinder();});$('#cylYSlider').addEventListener('input',e=>{state.cyl.y=+e.target.value;updateCylinder();});$('#measureCylinder').addEventListener('click',updateCylinder);$('#recordCylinderPotential').addEventListener('click',recordCylinder);
  $('#targetBSelect').addEventListener('change',updateMapBControls);$('#mapBYSelect').addEventListener('change',updateMapBControls);$('#markEquipB').addEventListener('click',markB);$('#traceM').addEventListener('click',()=>{if(!seedM())return;state.mapB.lines.M=true;drawCylinderCanvases();progress();save();});$('#traceN').addEventListener('click',()=>{if(!seedN())return;state.mapB.lines.N=true;drawCylinderCanvases();progress();save();});$('#recordAxisB').addEventListener('click',()=>recordAxis('B'));
  $('#buildReport').addEventListener('click',buildReport);$('#clearLocalProgress')?.addEventListener('click',()=>{if(confirm('Clear all locally saved progress for this practical on this browser?')){try{localStorage.removeItem(STORAGE);}catch(_){}location.reload();}});$('#printReport').addEventListener('click',()=>{buildReport();window.print();});$$('.modebtn').forEach(b=>b.addEventListener('click',()=>applyMode(b.dataset.mode)));
  ['fieldConclusionA','uniformConclusion','chargeDistribution','distortionConclusion','compareConclusion','reportDate','reportDiscussion','reportConclusion'].forEach(id=>document.getElementById(id)?.addEventListener('input',save));
  window.addEventListener('resize',()=>{drawPlaneCanvases();drawCylinderCanvases();drawAxisChart();drawCompare();});window.addEventListener('beforeunload',save);renderAll();
}
init();
})();