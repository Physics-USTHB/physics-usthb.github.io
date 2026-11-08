(()=>{
'use strict';
const U=OpticsUI,$=U.$,E=id=>document.getElementById(id),K='PhysicsUSTHB_G01_v2',OLD='PhysicsUSTHB_G01_v1',DEG=Math.PI/180;
const incs=[0,10,20,30,40,50,60,70,80,85];
const defaults={
  version:2,
  prop:{},
  mirror:{law:false,reverse:false,image:false,field:false,reversed:false},
  ref:{mirror:{},plexi:{}},
  calc:{},
  calcDraft:{},
  analysis:{n:null,critical:null},
  tir:{critical:null},
  n:1.493+Math.random()*.012,
  angleSeed:Math.random()*1000
};
const old=U.load(OLD,null);
const loaded=U.load(K,null)||old||{};
let s={
  ...defaults,
  ...loaded,
  version:2,
  prop:{...defaults.prop,...(loaded.prop||{})},
  mirror:{...defaults.mirror,...(loaded.mirror||{})},
  ref:{mirror:{...(loaded.ref?.mirror||{})},plexi:{...(loaded.ref?.plexi||{})}},
  calc:{...(loaded.calc||{})},
  calcDraft:{...(loaded.calcDraft||loaded.calc||{})},
  analysis:{...defaults.analysis,...(loaded.analysis||{})},
  tir:{...defaults.tir,...(loaded.tir||{})}
};
if(!Number.isFinite(s.angleSeed))s.angleSeed=Math.random()*1000;
if(!Number.isFinite(s.n))s.n=1.498;

function save(){U.save(K,s)}

function eyeY(){return[95,215,345][+E('eyeCase').value]}
function pinTargets(){
  const A={x:70,y:215},O={x:790,y:eyeY()},xs=[230,390,550];
  return{A,O,ys:xs.map(x=>A.y+(O.y-A.y)*(x-A.x)/(O.x-A.x)),xs};
}
function drawPins(){
  const {x,w,h}=U.canvas(E('pinCanvas'));
  x.fillStyle='#fbfcfd';x.fillRect(0,0,w,h);
  const q=pinTargets(),vals=[+E('pinB').value,+E('pinC').value,+E('pinD').value];
  x.strokeStyle='#cbd9e3';x.setLineDash([5,5]);x.beginPath();x.moveTo(q.A.x,q.A.y);x.lineTo(q.O.x,q.O.y);x.stroke();x.setLineDash([]);
  function pin(px,py,label,col){
    x.strokeStyle=col;x.lineWidth=3;x.beginPath();x.moveTo(px,py-28);x.lineTo(px,py+28);x.stroke();
    x.fillStyle=col;x.font='700 12px system-ui';x.fillText(label,px-5,py-35);
  }
  pin(q.A.x,q.A.y,'A','#ad5939');
  q.xs.forEach((xx,i)=>pin(xx,vals[i],['B','C','D'][i],'#177b9a'));
  x.fillStyle='#173e58';x.beginPath();x.arc(q.O.x,q.O.y,9,0,Math.PI*2);x.fill();x.fillText('O',q.O.x-5,q.O.y-15);
}
function renderProp(){
  E('propProgress').innerHTML=[0,1,2].map(i=>'<div class="step '+(s.prop[i]?'done':'')+'"><span class="progress-dot"></span>Eye position O'+(i+1)+(s.prop[i]?' — aligned':' — pending')+'</div>').join('');
}
function checkPins(){
  const q=pinTargets(),v=[+E('pinB').value,+E('pinC').value,+E('pinD').value];
  const err=Math.max(...v.map((y,i)=>Math.abs(y-q.ys[i])));
  if(err<=4){
    s.prop[E('eyeCase').value]=true;
    E('pinMessage').className='notice ok';
    E('pinMessage').textContent='A, B, C, D and the eye are collinear: rectilinear propagation verified for this eye position.';
  }else{
    E('pinMessage').className='notice warn';
    E('pinMessage').textContent='The pins are not yet aligned. Adjust them until each hides the preceding pin from the eye.';
  }
  renderProp();save();
}

function mirrorGeom(){
  const A={x:150,y:225},O={x:160,y:+E('mirrorEye').value},mx=440,P={x:mx,y:+E('mirrorHit').value},Apr={x:730,y:225};
  const vin={x:P.x-A.x,y:P.y-A.y},vout={x:O.x-P.x,y:O.y-P.y};
  const i=Math.atan2(Math.abs(vin.y),Math.abs(vin.x))/DEG;
  const r=Math.atan2(Math.abs(vout.y),Math.abs(vout.x))/DEG;
  return{A,O,P,Apr,mx,i,r};
}
function drawMirror(){
  const {x,w,h}=U.canvas(E('mirrorCanvas')),g=mirrorGeom();
  x.fillStyle='#fbfcfd';x.fillRect(0,0,w,h);
  x.strokeStyle='#526b80';x.lineWidth=5;x.beginPath();x.moveTo(g.mx,50);x.lineTo(g.mx,h-45);x.stroke();
  for(let y=58;y<h-45;y+=16){
    x.strokeStyle='#b2c1cc';x.lineWidth=1;x.beginPath();x.moveTo(g.mx,y);x.lineTo(g.mx+15,y+9);x.stroke();
  }
  U.line(x,g.A,g.P,s.mirror.reversed?'#177d9b':'#bd603d',2);
  U.line(x,g.P,g.O,s.mirror.reversed?'#bd603d':'#177d9b',2);
  x.setLineDash([6,5]);U.line(x,g.P,g.Apr,'#7a91a4',1);x.setLineDash([]);
  const tentative={x:+E('imageX').value,y:+E('imageY').value};
  [g.A,g.O,g.P,tentative].forEach((p,i)=>{
    x.fillStyle=['#bd603d','#173f58','#2b8a67','#7651a0'][i];
    x.beginPath();x.arc(p.x,p.y,6,0,Math.PI*2);x.fill();
    x.font='700 12px system-ui';
    x.fillText([s.mirror.reversed?'O':'A',s.mirror.reversed?'A':'O','P','A′?'][i],p.x+8,p.y-7);
  });
  if(s.mirror.field){
    const fy=+E('fieldEye').value,EyePr={x:2*g.mx-160,y:fy},top={x:g.mx,y:55},bot={x:g.mx,y:h-45};
    x.setLineDash([5,4]);U.line(x,EyePr,top,'#bd7d2a',1);U.line(x,EyePr,bot,'#bd7d2a',1);x.setLineDash([]);
  }
}
function updateMirrorProgress(){
  const a=[['law','Reflection law i=r'],['reverse','Reverse-light principle'],['image','Virtual image A′'],['field','Mirror field limits']];
  E('mirrorProgress').innerHTML=a.map(([k,t])=>'<div class="step '+(s.mirror[k]?'done':'')+'"><span class="progress-dot"></span>'+t+'</div>').join('');
  const g=mirrorGeom(),show=s.mirror.law;
  E('incOut').textContent=show?g.i.toFixed(1)+'°':'—';
  E('refOut').textContent=show?g.r.toFixed(1)+'°':'—';
  E('lawError').textContent=show?Math.abs(g.i-g.r).toFixed(1)+'°':'—';
}
function verifyLaw(){
  const g=mirrorGeom();
  if(Math.abs(g.i-g.r)<1.2){
    s.mirror.law=true;
    E('mirrorMessage').className='notice ok';
    E('mirrorMessage').textContent='Reflection point accepted: the incident and reflected rays make equal angles with the normal.';
  }else{
    E('mirrorMessage').className='notice warn';
    E('mirrorMessage').textContent='Move the reflection point along the mirror until the incident and reflected angles match.';
  }
  render();save();
}
function reverse(){
  if(!s.mirror.law){
    E('mirrorMessage').className='notice warn';
    E('mirrorMessage').textContent='Verify the reflection path first.';
    return;
  }
  s.mirror.reverse=true;s.mirror.reversed=!s.mirror.reversed;
  E('mirrorMessage').className='notice ok';
  E('mirrorMessage').textContent='A and O have been exchanged: the same geometrical ray path is retraced in reverse.';
  render();save();
}
function imageCheck(){
  const target={x:2*440-150,y:225};
  const err=Math.hypot(+E('imageX').value-target.x,+E('imageY').value-target.y);
  if(err<10){
    s.mirror.image=true;
    E('mirrorMessage').className='notice ok';
    E('mirrorMessage').textContent='A′ is the mirror-symmetric point of A and does not depend on eye position.';
  }else{
    E('mirrorMessage').className='notice warn';
    E('mirrorMessage').textContent='Place A′ at the point symmetric to A with respect to the mirror plane.';
  }
  render();save();
}
function constructField(){
  if(!s.mirror.image){
    E('mirrorMessage').className='notice warn';
    E('mirrorMessage').textContent='Locate A′ before constructing the field.';
    return;
  }
  s.mirror.field=true;
  E('mirrorMessage').className='notice ok';
  E('mirrorMessage').textContent='Field limits are now constructed from the virtual eye through the two mirror edges.';
  render();save();
}

function stableNoise(i,mode){
  if(i===0)return 0;
  const z=Math.sin((i+1)*12.9898+s.angleSeed*78.233+(mode==='mirror'?1.17:8.41))*43758.5453;
  return((z-Math.floor(z))-.5)*.24;
}
function diskAngle(mode,i){
  const base=mode==='mirror'?i:Math.asin(Math.sin(i*DEG)/s.n)/DEG;
  return Math.max(0,Math.min(89.9,base+stableNoise(i,mode)));
}
function drawGraduation(ctx,cx,cy,R){
  ctx.strokeStyle='#718b9c';ctx.fillStyle='#526b80';ctx.font='9px system-ui';ctx.textAlign='center';
  for(let d=0;d<=90;d+=5){
    const a=d*DEG,major=d%10===0;
    for(const sign of [-1,1]){
      const sx=sign*Math.sin(a),co=Math.cos(a);
      for(const lower of [false,true]){
        const ysign=lower?1:-1,ro=R+2,ri=R-(major?10:6);
        const x1=cx+sx*ro,y1=cy+ysign*co*ro,x2=cx+sx*ri,y2=cy+ysign*co*ri;
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
        if(major&&sign===1&&d<90){
          const rt=R+16;
          ctx.fillText(String(d),cx+sx*rt,cy+ysign*co*rt+3);
        }
      }
    }
  }
}
function drawDisk(){
  const {x,w,h}=U.canvas(E('diskCanvas')),cx=w/2,cy=h/2,R=Math.min(w,h)*.34;
  const i=+E('incidence').value,mode=E('diskMode').value,out=diskAngle(mode,i);
  x.fillStyle='#fbfcfd';x.fillRect(0,0,w,h);
  x.strokeStyle='#b8c9d5';x.beginPath();x.arc(cx,cy,R,0,Math.PI*2);x.stroke();
  drawGraduation(x,cx,cy,R);
  x.setLineDash([4,4]);x.beginPath();x.moveTo(cx,cy-R-30);x.lineTo(cx,cy+R+30);x.stroke();x.setLineDash([]);
  if(mode==='mirror'){
    x.strokeStyle='#425d70';x.lineWidth=5;x.beginPath();x.moveTo(cx-R,cy);x.lineTo(cx+R,cy);x.stroke();
  }else{
    x.fillStyle='rgba(65,177,201,.18)';x.beginPath();x.arc(cx,cy,R,0,Math.PI);x.closePath();x.fill();
    x.strokeStyle='#4195a9';x.lineWidth=2;x.stroke();
  }
  const len=R*.95,p0={x:cx-len*Math.sin(i*DEG),y:cy-len*Math.cos(i*DEG)},p1={x:cx,y:cy};
  U.line(x,p0,p1,'#c14e3d',2);
  const ang=out*DEG;
  const p2=mode==='mirror'?{x:cx+len*Math.sin(ang),y:cy-len*Math.cos(ang)}:{x:cx+len*Math.sin(ang),y:cy+len*Math.cos(ang)};
  U.line(x,p1,p2,mode==='mirror'?'#2e7fa0':'#2d8968',2);
  x.fillStyle='#173e58';x.font='12px system-ui';x.textAlign='left';x.fillText('i = '+i+'°',20,22);
}
function mirrorDiskVerified(){
  return Object.entries(s.ref.mirror||{}).some(([i,r])=>+i>0&&Math.abs(+r-(+i))<.8);
}

function trueCritical(){return Math.asin(1/s.n)/DEG}
function drawTIR(){
  const c=E('tirCanvas');if(!c)return;
  const {x,w,h}=U.canvas(c),cx=w/2,cy=h*.58,R=Math.min(w,h)*.33,i=+E('tirIncidence').value,ic=trueCritical();
  E('tirReadout').value=i.toFixed(1)+'°';
  x.fillStyle='#fbfcfd';x.fillRect(0,0,w,h);
  x.fillStyle='rgba(65,177,201,.18)';x.beginPath();x.arc(cx,cy,R,Math.PI,0);x.lineTo(cx+R,cy);x.lineTo(cx-R,cy);x.closePath();x.fill();
  x.strokeStyle='#4195a9';x.lineWidth=2;x.beginPath();x.moveTo(cx-R,cy);x.lineTo(cx+R,cy);x.stroke();x.beginPath();x.arc(cx,cy,R,Math.PI,0);x.stroke();
  x.setLineDash([4,4]);x.strokeStyle='#90a5b4';x.beginPath();x.moveTo(cx,cy-R-34);x.lineTo(cx,cy+36);x.stroke();x.setLineDash([]);
  const len=R*.9,a=i*DEG,p0={x:cx-len*Math.sin(a),y:cy+len*Math.cos(a)};
  U.line(x,p0,{x:cx,y:cy},'#c14e3d',2);
  const refl={x:cx+len*Math.sin(a),y:cy+len*Math.cos(a)};U.line(x,{x:cx,y:cy},refl,'#bd7d2a',1.6);
  if(i<ic){
    const r=Math.asin(s.n*Math.sin(a))/DEG,rr=r*DEG,p2={x:cx+len*Math.sin(rr),y:cy-len*Math.cos(rr)};
    U.line(x,{x:cx,y:cy},p2,'#2d8968',2.2);
    x.fillStyle='#2d8968';x.font='700 12px system-ui';x.textAlign='left';x.fillText('refracted ray in air',Math.min(w-145,p2.x+8),Math.max(20,p2.y));
  }else{
    x.fillStyle='#a65f2f';x.font='700 12px system-ui';x.textAlign='center';x.fillText('total internal reflection',cx,28);
  }
  x.fillStyle='#173e58';x.font='12px system-ui';x.textAlign='left';x.fillText('internal i = '+i.toFixed(1)+'°',18,22);
}
function renderTIR(){
  if(!E('tirCanvas'))return;
  drawTIR();
  const exp=s.tir?.critical,calc=s.analysis?.critical;
  E('tirCriticalOut').textContent=exp!=null?Number(exp).toFixed(1)+'°':'—';
  E('tirSnellOut').textContent=calc!=null?Number(calc).toFixed(1)+'°':'—';
  E('tirDifferenceOut').textContent=exp!=null&&calc!=null?Math.abs(exp-calc).toFixed(1)+'°':'—';
}
function recordTIR(){
  if(!mirrorDiskVerified()){
    E('tirMessage').className='notice warn';E('tirMessage').textContent='Verify reflection on the graduated disk first, then reverse the plexiglas half-cylinder.';return;
  }
  const i=+E('tirIncidence').value,ic=trueCritical(),d=i-ic;
  if(d<-.35){E('tirMessage').className='notice warn';E('tirMessage').textContent='A refracted ray is still visible in air. Increase the internal incidence angle toward the transition.';return;}
  if(d>.35){E('tirMessage').className='notice warn';E('tirMessage').textContent='You are already beyond the transition. Reduce the incidence angle until you locate the first disappearance of the refracted ray.';return;}
  s.tir={critical:i};E('tirMessage').className='notice ok';E('tirMessage').textContent='Critical-angle transition recorded. Later compare it with the value calculated from the Snell graph.';renderTIR();save();
}
function measureDiskReading(){
  const mode=E('diskMode').value,i=+E('incidence').value,read=+E('outAngle').value,expected=diskAngle(mode,i);
  if(mode==='plexi'&&!mirrorDiskVerified()){
    E('diskMessage').className='notice warn';
    E('diskMessage').textContent='First take at least one non-zero plane-mirror reading and verify r≈i on the graduated disk.';
    return;
  }
  if(!Number.isFinite(read)){
    E('diskMessage').className='notice warn';
    E('diskMessage').textContent='Read the outgoing ray on the graduated disk and enter the angle before recording.';
    return;
  }
  if(Math.abs(read-expected)>.6){
    E('diskMessage').className='notice warn';
    E('diskMessage').textContent='Re-read the graduated disk. Your entered angle does not match the outgoing ray position.';
    return;
  }
  s.ref[mode][i]=read;
  if(mode==='plexi'){delete s.calc[i];delete s.calcDraft[i];s.analysis={n:null,critical:null};}
  E('outAngle').value='';
  E('diskMessage').className='notice ok';
  E('diskMessage').textContent=mode==='mirror'?'Mirror reading stored. Compare it with the imposed incidence angle to verify r=i.':'Plexiglas reading stored. Continue through all prescribed incidence angles.';
  render();save();
}

function inputCell(i,key,val,step){
  const v=val==null?'':String(val);
  return '<input class="table-calc" type="number" step="'+step+'" data-i="'+i+'" data-key="'+key+'" value="'+v+'">';
}
function renderTable(){
  E('refractionBody').innerHTML=incs.map(i=>{
    const r=s.ref.plexi[i];
    if(r==null)return '<tr><td>'+i+'</td><td colspan="5">—</td></tr>';
    const c=s.calcDraft[i]||s.calc[i]||{};
    return '<tr><td>'+i+'</td><td>'+Number(r).toFixed(1)+'</td><td>'+inputCell(i,'D',c.D,'0.1')+'</td><td>'+inputCell(i,'si',c.si,'0.001')+'</td><td>'+inputCell(i,'sr',c.sr,'0.001')+'</td><td>'+(i===0?'—':inputCell(i,'n',c.n,'0.001'))+'</td></tr>';
  }).join('');
}
function calculationsComplete(){
  return incs.every(i=>s.calc[i]&&Number.isFinite(s.calc[i].D)&&Number.isFinite(s.calc[i].si)&&Number.isFinite(s.calc[i].sr)&&(i===0||Number.isFinite(s.calc[i].n)));
}
function checkCalculations(){
  if(incs.some(i=>s.ref.plexi[i]==null)){
    E('calcMessage').className='notice warn';
    E('calcMessage').textContent='Record all ten plexiglas angles before validating the calculation table.';
    return;
  }
  const next={};
  for(const i of incs){
    const r=+s.ref.plexi[i],expected={D:i-r,si:Math.sin(i*DEG),sr:Math.sin(r*DEG)},row={};
    for(const key of ['D','si','sr']){
      const el=document.querySelector('[data-i="'+i+'"][data-key="'+key+'"]');
      const raw=el?.value?.trim()||'',v=+raw;
      if(raw===''||!Number.isFinite(v)){
        E('calcMessage').className='notice warn';
        E('calcMessage').textContent='Complete every calculation cell before checking.';
        return;
      }
      row[key]=v;
    }
    if(Math.abs(row.D-expected.D)>.18||Math.abs(row.si-expected.si)>.006||Math.abs(row.sr-expected.sr)>.006){
      E('calcMessage').className='notice warn';
      E('calcMessage').textContent='Recheck the row at i='+i+'°: D=i−r′ and the sine values must come from your measured angles.';
      return;
    }
    if(i>0){
      const el=document.querySelector('[data-i="'+i+'"][data-key="n"]');
      const raw=el?.value?.trim()||'',v=+raw,en=expected.si/expected.sr;
      if(raw===''||!Number.isFinite(v)){
        E('calcMessage').className='notice warn';
        E('calcMessage').textContent='Complete the refractive-index ratio for every non-zero incidence angle.';
        return;
      }
      if(Math.abs(v-en)>.018){
        E('calcMessage').className='notice warn';
        E('calcMessage').textContent='Recheck sin i / sin r′ at i='+i+'°.';
        return;
      }
      row.n=v;
    }
    next[i]=row;
  }
  s.calc=next;s.calcDraft=JSON.parse(JSON.stringify(next));s.analysis={n:null,critical:null};
  E('studentN').value='';E('studentCritical').value='';
  E('calcMessage').className='notice ok';
  E('calcMessage').textContent='Calculation table accepted. The graphs are now built from your validated values.';
  render();save();
}
function fitOrigin(ps){
  let a=0,b=0;ps.forEach(p=>{a+=p.x*p.y;b+=p.x*p.x});
  return b?a/b:NaN;
}
function blankGraph(canvas,msg){
  const {x,w,h}=U.canvas(canvas);
  x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#6c8090';x.font='600 13px system-ui';x.textAlign='center';x.fillText(msg,w/2,h/2);
}
function expectedSnell(){
  if(!calculationsComplete())return null;
  const pts=incs.filter(i=>i>0).map(i=>({x:s.calc[i].si,y:s.calc[i].sr}));
  const slope=fitOrigin(pts),n=1/slope;
  return{pts,slope,n,critical:Math.asin(1/n)/DEG};
}
function renderAnalysis(){
  const count=incs.filter(i=>s.ref.plexi[i]!=null).length;
  E('readingsOut').textContent=count+' / 10';
  const fit=expectedSnell();
  if(fit){
    U.plot(E('snellChart'),[{pts:fit.pts}],{xlabel:'sin i',ylabel:'sin r′',xmin:0,ymin:0,xmax:1,ymax:1});
    const q=incs.map(i=>({x:i,r:+s.ref.plexi[i],D:s.calc[i].D}));
    U.plot(E('angleChart'),[
      {pts:q.map(z=>({x:z.x,y:z.r})),color:'#167e9d'},
      {pts:q.map(z=>({x:z.x,y:z.D})),color:'#a65f2f'}
    ],{xlabel:'i (°)',ylabel:'r′ (blue) / D (orange) (°)',xmin:0,ymin:0,xmax:90});
    E('analysisMessage').className=s.analysis.n!=null?'notice ok':'notice';
    E('analysisMessage').textContent=s.analysis.n!=null?'Snell analysis accepted. Compare the fitted index with the row-by-row ratios and discuss the critical angle.':'Graphs unlocked. Read the Snell slope, obtain n as the reciprocal slope, then calculate the critical angle.';
  }else{
    blankGraph(E('snellChart'),'Validate the calculation table to unlock the Snell graph.');
    blankGraph(E('angleChart'),'Validate the calculation table to unlock r′(i) and D(i).');
    E('analysisMessage').className='notice';
    E('analysisMessage').textContent=count<10?'Record all ten plexiglas incidence angles to complete the dataset.':'Validate your calculation table to unlock the graphs.';
  }
  E('nOut').textContent=s.analysis.n!=null?Number(s.analysis.n).toFixed(3):'—';
  E('criticalOut').textContent=s.analysis.critical!=null?Number(s.analysis.critical).toFixed(1)+'°':'—';
}
function checkSnell(){
  const fit=expectedSnell();
  if(!fit){
    E('analysisMessage').className='notice warn';
    E('analysisMessage').textContent='Validate the refraction calculation table first.';
    return;
  }
  const n=+E('studentN').value,critical=+E('studentCritical').value;
  if(!Number.isFinite(n)||!Number.isFinite(critical)){
    E('analysisMessage').className='notice warn';
    E('analysisMessage').textContent='Enter your graph-derived refractive index and calculated critical angle.';
    return;
  }
  if(Math.abs(n-fit.n)>.02){
    E('analysisMessage').className='notice warn';
    E('analysisMessage').textContent='Re-read the Snell graph. Because it plots sin r′ versus sin i, n is the reciprocal of the fitted slope.';
    return;
  }
  if(Math.abs(critical-fit.critical)>.8){
    E('analysisMessage').className='notice warn';
    E('analysisMessage').textContent='Recalculate the plexiglas-to-air critical angle using sin i_c = 1/n.';
    return;
  }
  s.analysis={n,critical};
  E('analysisMessage').className='notice ok';
  E('analysisMessage').textContent='Refractive index and critical-angle analysis accepted.';
  renderAnalysis();save();
}
function render(){
  drawPins();renderProp();drawMirror();updateMirrorProgress();drawDisk();renderTable();renderAnalysis();renderTIR();
}
function buildReport(){
  const summary='<p><b>Propagation:</b> '+Object.keys(s.prop).length+'/3 eye positions. <b>Mirror tasks:</b> '+['law','reverse','image','field'].filter(k=>s.mirror[k]).length+'/4.</p><p><b>Plexiglas readings:</b> '+Object.keys(s.ref.plexi).length+'/10. <b>Calculation table:</b> '+(calculationsComplete()?'validated':'incomplete')+'. <b>Measured n:</b> '+E('nOut').textContent+'. <b>Snell critical angle:</b> '+E('criticalOut').textContent+'. <b>Experimental critical angle:</b> '+E('tirCriticalOut').textContent+'.</p>';
  return U.report('Laboratory Practical 1 — Propagation, Reflection & Refraction',summary);
}

U.tabs();
E('incidence').innerHTML=incs.map(i=>'<option>'+i+'</option>').join('');
['eyeCase','pinB','pinC','pinD','mirrorEye','mirrorHit','imageX','imageY','fieldEye'].forEach(id=>E(id).addEventListener('input',render));
['diskMode','incidence'].forEach(id=>E(id).addEventListener('change',()=>{E('outAngle').value='';render()}));
E('tirIncidence').addEventListener('input',renderTIR);
E('refractionBody').addEventListener('input',e=>{
  const el=e.target;if(!el.matches('.table-calc'))return;
  const i=el.dataset.i,key=el.dataset.key;
  s.calcDraft[i]=s.calcDraft[i]||{};
  s.calcDraft[i][key]=el.value.trim()===''?null:+el.value;
  save();
});
E('checkPins').onclick=checkPins;
E('verifyReflection').onclick=verifyLaw;
E('reversePath').onclick=reverse;
E('verifyImage').onclick=imageCheck;
E('constructField').onclick=constructField;
E('measureDisk').onclick=measureDiskReading;
E('recordCritical').onclick=recordTIR;
E('checkRefractionCalculations').onclick=checkCalculations;
E('checkSnellAnalysis').onclick=checkSnell;
E('buildReport').onclick=buildReport;
E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
if(s.analysis.n!=null){E('studentN').value=s.analysis.n;E('studentCritical').value=s.analysis.critical;}
window.addEventListener('resize',render);
render();save();
})();