(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W03_v3',RHO_W=997,RHO_S=2700,TAU=Math.PI*2,CELL=.04,SOLID_D=.03;
function makeRun(){return{id:'W03-'+Math.random().toString(36).slice(2,7).toUpperCase(),waterBias:(Math.random()-.5)*2.5,fluidV:1260+Math.random()*45,VL:5750+Math.random()*180,VT:3050+Math.random()*140}}
let s=U.load(K,null);
if(!s||s.version!==3)s={version:3,run:makeRun(),water:[],fluid:null,solidL:null,solidT:null,temps:[],analysis:{water:null,young:null}};
s.water=Array.isArray(s.water)?s.water:[];s.temps=Array.isArray(s.temps)?s.temps:[];s.analysis=s.analysis||{water:null,young:null};
s.montage=s.montage||{medium:'',incidence:'',receiver:'',verifiedFor:null};
function save(){U.save(K,s)}
function requiredMontage(task=E('task').value){if(task==='fluid')return{medium:'fluid',incidence:'normal'};if(task==='solidL')return{medium:'solid',incidence:'normal'};if(task==='solidT')return{medium:'solid',incidence:'angled'};return{medium:'water',incidence:'normal'}}
function montageOK(task=E('task').value){const r=requiredMontage(task),m=s.montage;return m.medium===r.medium&&m.incidence===r.incidence&&m.receiver==='aligned'&&m.verifiedFor===task}
function renderMontage(){E('setupMedium').value=s.montage.medium||'';E('setupIncidence').value=s.montage.incidence||'';E('setupReceiver').value=s.montage.receiver||'';const task=E('task').value,ok=montageOK(task);E('montageMsg').className=ok?'notice ok':'notice';E('montageMsg').textContent=ok?'Arrangement verified for '+task+'. Proceed with the pulse measurement.':'Configure the material and incidence for the selected ultrasound task before recording a transit time.'}
function verifyMontage(){const task=E('task').value,r=requiredMontage(task);s.montage={medium:E('setupMedium').value,incidence:E('setupIncidence').value,receiver:E('setupReceiver').value,verifiedFor:null};if(s.montage.medium!==r.medium||s.montage.incidence!==r.incidence||s.montage.receiver!=='aligned'){E('montageMsg').className='notice warn';E('montageMsg').textContent=task==='solidT'?'For transverse-wave work, immerse the solid in the water path and use adjustable oblique incidence with aligned transducers.':'Recheck the selected material, incidence and transmitter/receiver alignment for this task.';save();return}s.montage.verifiedFor=task;renderMontage();save()}
function waterSpeed(T=25){return 1402.388+5.0383*T-.058109*T*T+.000334*T*T*T+s.run.waterBias}
function expected(task=E('task').value){
  const x=+E('xpos').value/100,T=+E('temp').value,ang=+E('angle').value,waterV=waterSpeed(T);
  if(task==='water'){const dt=x/waterSpeed(25);return{t1:5e-6,t2:5e-6+dt,dt,v:waterSpeed(25),label:x*100+' cm'};}
  if(task==='temp'){const dt=.20/waterV;return{t1:5e-6,t2:5e-6+dt,dt,v:waterV,label:T+' °C'};}
  if(task==='fluid'){const vw=s.analysis.water?.v||waterSpeed(25),tref=.20/vw,ttest=.16/vw+CELL/s.run.fluidV;return{t1:tref,t2:ttest,dt:ttest-tref,v:s.run.fluidV,label:'4 cm cell'};}
  if(task==='solidL'){const dt=SOLID_D/s.run.VL;return{t1:2e-6,t2:2e-6+dt,dt,v:s.run.VL,label:'3 cm solid'};}
  const vw=s.analysis.water?.v||waterSpeed(25),crit=Math.asin(Math.min(.999,vw/s.run.VT))*180/Math.PI,amp=Math.max(0,1-ang/crit);return{crit,v:s.run.VT,amp,label:ang.toFixed(1)+'°'};
}
function setupCanvas(){const c=E('scope'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function pulse(x,cx,cy,amp,col){x.strokeStyle=col;x.lineWidth=2.4;x.beginPath();for(let i=-45;i<=45;i++){const xx=cx+i,y=cy-amp*75*Math.exp(-i*i/120)*Math.cos(i*.55);i===-45?x.moveTo(xx,y):x.lineTo(xx,y)}x.stroke()}
function draw(){
  const{x,w,h}=setupCanvas(),task=E('task').value,p=expected(task);x.fillStyle='#08161d';x.fillRect(0,0,w,h);
  x.strokeStyle='rgba(99,232,191,.16)';for(let i=0;i<=10;i++){const xx=w*i/10;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke()}for(let j=0;j<=8;j++){const yy=h*j/8;x.beginPath();x.moveTo(0,yy);x.lineTo(w,yy);x.stroke()}
  let maxUs=250;
  if(task==='solidL')maxUs=20;
  if(task==='solidT'){
    maxUs=60;pulse(x,w*.48,h*.52,p.amp,'#69e7ff');x.fillStyle='#9bc3d3';x.font='600 13px system-ui';x.fillText('transverse received pulse',w*.36,h*.25);x.fillText('increase incidence angle toward disappearance',w*.30,h*.78);
  }else{
    const X=t=>Math.max(8,Math.min(w-8,t*1e6/maxUs*w));pulse(x,X(p.t1),h*.52,1,'#ffd166');pulse(x,X(p.t2),h*.52,.88,'#69e7ff');
    x.fillStyle='#9bc3d3';x.font='600 12px system-ui';x.fillText(task==='fluid'?'water reference':'reference / transmit',Math.max(8,X(p.t1)-45),h*.25);x.fillText(task==='fluid'?'test-cell pulse':'received pulse',Math.max(8,X(p.t2)-35),h*.76);
    E('cursor1').max=maxUs;E('cursor2').max=maxUs;for(const id of ['cursor1','cursor2'])if(+E(id).value>maxUs)E(id).value=maxUs;
    x.setLineDash([5,4]);[['cursor1','#fff09a'],['cursor2','#ff9f8a']].forEach(([id,col])=>{const xx=+E(id).value/maxUs*w;x.strokeStyle=col;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke()});x.setLineDash([]);
  }
  E('xRead').textContent=E('xpos').value+' cm';E('tempRead').textContent=E('temp').value+' °C';E('angleRead').textContent=(+E('angle').value).toFixed(1)+'°';E('cursor1Read').textContent=(+E('cursor1').value).toFixed(1)+' µs';E('cursor2Read').textContent=(+E('cursor2').value).toFixed(1)+' µs';
}
function clearEntry(){['studentTime','studentSpeed','studentCritical'].forEach(id=>E(id).value='')}
function syncTask(){
  const task=E('task').value,solidT=task==='solidT';s.montage.verifiedFor=null;renderMontage();E('xpos').disabled=task!=='water';E('temp').disabled=task!=='temp';E('angle').disabled=!solidT;E('cursor1').disabled=solidT;E('cursor2').disabled=solidT;E('studentTime').disabled=solidT;E('studentCritical').disabled=!solidT;E('studentSpeed').disabled=task==='water';
  if(task==='fluid'||task==='solidT'){if(!s.analysis.water){E('msg').className='notice warn';E('msg').textContent='Complete the water x–t analysis first; this task uses the measured water speed as its reference.';}}
  else E('msg').className='notice';
  clearEntry();draw();
}
function validateTime(p){
  const t1=+E('cursor1').value,t2=+E('cursor2').value,dt=(t2-t1)*1e-6,student=+E('studentTime').value;
  if(t2<=t1||!Number.isFinite(student)||student<=0)return{ok:false,msg:'Place cursor 2 after cursor 1 and enter the measured Δt.'};
  if(Math.abs(t1*1e-6-p.t1)>Math.max(.2e-6,.025*Math.max(p.t1,1e-6))||Math.abs(t2*1e-6-p.t2)>Math.max(.2e-6,.025*p.t2))return{ok:false,msg:'Place the time cursors on the relevant pulse peaks.'};
  const us=dt*1e6;if(Math.abs(student-us)>.25)return{ok:false,msg:'Recalculate Δt from the two cursor readings.'};return{ok:true,dt,us};
}
function record(){
  const task=E('task').value,p=expected(task);
  if(!montageOK(task)){E('msg').className='notice warn';E('msg').textContent='Verify the ultrasound propagation arrangement for the selected task before recording.';return}
  if((task==='fluid'||task==='solidT')&&!s.analysis.water){E('msg').className='notice warn';E('msg').textContent='Complete and validate the water x–t analysis first.';return}
  if(task==='solidT'){
    const ang=+E('angle').value,sc=+E('studentCritical').value,v=+E('studentSpeed').value;
    if(Math.abs(ang-p.crit)>.35){E('msg').className='notice warn';E('msg').textContent=ang<p.crit?'A transverse pulse is still visible. Increase the incidence angle toward its disappearance.':'You are beyond the disappearance point. Reduce the angle to locate the critical transition.';return}
    if(!Number.isFinite(sc)||Math.abs(sc-ang)>.15){E('msg').className='notice warn';E('msg').textContent='Enter the critical angle you read from the angular control.';return}
    const ev=s.analysis.water.v/Math.sin(sc*Math.PI/180);if(!Number.isFinite(v)||Math.abs(v-ev)>Math.max(20,.015*ev)){E('msg').className='notice warn';E('msg').textContent='Use Snell’s critical-angle relation VT=Vwater/sin(ic).';return}
    s.solidT={angle:sc,v};s.analysis.young=null;E('msg').className='notice ok';E('msg').textContent='Transverse critical-angle speed accepted.';clearEntry();renderAll();save();return;
  }
  const tm=validateTime(p);if(!tm.ok){E('msg').className='notice warn';E('msg').textContent=tm.msg;return}
  if(task==='water'){
    const x=+E('xpos').value/100,rec={x,t:tm.dt},i=s.water.findIndex(q=>q.x===x);if(i>=0)s.water[i]=rec;else s.water.push(rec);s.water.sort((a,b)=>a.x-b.x);s.analysis.water=null;s.fluid=null;s.solidT=null;s.analysis.young=null;
    E('msg').className='notice ok';E('msg').textContent='Water transit-time point accepted. Move the receiver and repeat across the full range.';
  }else if(task==='temp'){
    const v=+E('studentSpeed').value,ev=.20/tm.dt;if(!Number.isFinite(v)||Math.abs(v-ev)>Math.max(2,.012*ev)){E('msg').className='notice warn';E('msg').textContent='Recalculate v=0.20 m/Δt for this temperature.';return}
    const T=+E('temp').value,rec={T,t:tm.dt,v},i=s.temps.findIndex(q=>q.T===T);if(i>=0)s.temps[i]=rec;else s.temps.push(rec);s.temps.sort((a,b)=>a.T-b.T);E('msg').className='notice ok';E('msg').textContent='Temperature point accepted. Repeat every 5°C from 25 to 70°C.';
  }else if(task==='fluid'){
    const v=+E('studentSpeed').value,vw=s.analysis.water.v,ev=1/(1/vw+tm.dt/CELL);if(!Number.isFinite(v)||Math.abs(v-ev)>Math.max(5,.015*ev)){E('msg').className='notice warn';E('msg').textContent='Use Δt=h(1/Vfluid−1/Vwater) with h=4.0 cm.';return}
    s.fluid={dt:tm.dt,v};E('msg').className='notice ok';E('msg').textContent='Unknown-fluid speed accepted.';
  }else{
    const v=+E('studentSpeed').value,ev=SOLID_D/tm.dt;if(!Number.isFinite(v)||Math.abs(v-ev)>Math.max(20,.012*ev)){E('msg').className='notice warn';E('msg').textContent='Recalculate VL=0.030 m/Δt.';return}
    s.solidL={dt:tm.dt,v};s.analysis.young=null;E('msg').className='notice ok';E('msg').textContent='Longitudinal solid-wave speed accepted.';
  }
  clearEntry();renderAll();save();
}
function waterFit(){
  if(s.water.length<8||s.water[0]?.x>.06||s.water.at(-1)?.x<.29)return null;let tt=0,tx=0;s.water.forEach(q=>{tt+=q.t*q.t;tx+=q.t*q.x});return{v:tx/tt}
}
function checkWater(){
  const fit=waterFit();if(!fit){E('waterMsg').className='notice warn';E('waterMsg').textContent='Record at least eight receiver positions spanning approximately 5–30 cm.';return}
  const v=+E('studentWaterV').value,B=+E('studentBulk').value;if(!Number.isFinite(v)||!Number.isFinite(B)||v<=0||B<=0){E('waterMsg').className='notice warn';E('waterMsg').textContent='Enter the x(t) slope and bulk modulus.';return}
  if(Math.abs(v-fit.v)>Math.max(3,.012*fit.v)){E('waterMsg').className='notice warn';E('waterMsg').textContent='Fit x(m) versus t(s) through the origin and re-read the slope.';return}
  const eB=RHO_W*v*v/1e9;if(Math.abs(B-eB)>.015){E('waterMsg').className='notice warn';E('waterMsg').textContent='Recalculate B=ρv² with ρwater=997 kg/m³ and report GPa.';return}
  s.analysis.water={v,B};E('waterMsg').className='notice ok';E('waterMsg').textContent='Water speed and bulk modulus accepted. Fluid comparison and transverse critical-angle tasks are now unlocked.';renderAll();save();
}
function checkYoung(){
  if(!s.solidL||!s.solidT){E('youngMsg').className='notice warn';E('youngMsg').textContent='Validate both VL and VT first.';return}
  const vl=s.solidL.v,vt=s.solidT.v,e=RHO_S*vt*vt*(3*vl*vl-4*vt*vt)/(vl*vl-vt*vt)/1e9,v=+E('studentYoung').value;
  if(!Number.isFinite(v)||v<=0){E('youngMsg').className='notice warn';E('youngMsg').textContent='Enter Young’s modulus in GPa.';return}
  if(Math.abs(v-e)>Math.max(.7,.02*e)){E('youngMsg').className='notice warn';E('youngMsg').textContent='Recalculate the isotropic-solid Young-modulus relation using ρ=2700 kg/m³.';return}
  s.analysis.young={E:v};E('youngMsg').className='notice ok';E('youngMsg').textContent='Young modulus accepted.';renderAll();save();
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function charts(){
  if(s.water.length)U.plot(E('waterChart'),[{pts:s.water.map(q=>({x:q.t*1e6,y:q.x*100}))}],{xlabel:'Δt / µs',ylabel:'x / cm',xmin:0,ymin:0});else blank(E('waterChart'),'Record water transit times at several positions.');
  if(s.temps.length)U.plot(E('tempChart'),[{pts:s.temps.map(q=>({x:q.T,y:q.v}))}],{xlabel:'temperature / °C',ylabel:'water speed / m·s⁻¹',xmin:25,xmax:70,ymin:1450});else blank(E('tempChart'),'Record water speed from 25 to 70°C.');
}
function table(){
  const rows=[...s.water.map(q=>({task:'water',x:(q.x*100).toFixed(0)+' cm',t:q.t*1e6,v:null})),...s.temps.map(q=>({task:'temp',x:q.T+' °C',t:q.t*1e6,v:q.v}))];
  if(s.fluid)rows.push({task:'fluid',x:'4 cm cell',t:s.fluid.dt*1e6,v:s.fluid.v});if(s.solidL)rows.push({task:'solid L',x:'3 cm',t:s.solidL.dt*1e6,v:s.solidL.v});if(s.solidT)rows.push({task:'solid T',x:s.solidT.angle.toFixed(1)+'°',t:null,v:s.solidT.v});
  E('body').innerHTML=rows.length?rows.map(q=>'<tr><td>'+q.task+'</td><td>'+q.x+'</td><td>'+(q.t==null?'—':q.t.toFixed(1))+'</td><td>'+(q.v==null?'—':q.v.toFixed(0))+'</td></tr>').join(''):'<tr><td colspan="4">No accepted measurements yet.</td></tr>';
  E('waterCount').textContent=s.water.length;E('tempCount').textContent=s.temps.length+' / 10';E('fluidOut').textContent=s.fluid?s.fluid.v.toFixed(0)+' m/s':'—';E('vlOut').textContent=s.solidL?s.solidL.v.toFixed(0)+' m/s':'—';E('vtOut').textContent=s.solidT?s.solidT.v.toFixed(0)+' m/s':'—';
  E('waterV').textContent=s.analysis.water?s.analysis.water.v.toFixed(1)+' m/s':'—';E('bulkOut').textContent=s.analysis.water?s.analysis.water.B.toFixed(3)+' GPa':'—';E('youngOut').textContent=s.analysis.young?s.analysis.young.E.toFixed(1)+' GPa':'—';
}
function renderAll(){draw();table();charts()}
function buildReport(){
  const w=s.analysis.water,y=s.analysis.young,summary='<p><b>Last verified propagation arrangement:</b> '+U.esc(s.montage.verifiedFor||'none')+'.</p>'+'<p><b>Water:</b> '+(w?'v='+w.v.toFixed(1)+' m/s, B='+w.B.toFixed(3)+' GPa':'analysis incomplete')+'. <b>Temperature points:</b> '+s.temps.length+'/10.</p><p><b>Unknown fluid:</b> '+(s.fluid?s.fluid.v.toFixed(0)+' m/s':'not validated')+'. <b>Solid:</b> '+(s.solidL&&s.solidT?'VL='+s.solidL.v.toFixed(0)+' m/s, VT='+s.solidT.v.toFixed(0)+' m/s':'incomplete')+(y?', E='+y.E.toFixed(1)+' GPa.':'.')+'</p>';
  return U.report('Wave Laboratory Practical III — Ultrasound in Fluids & Solids',summary);
}
U.tabs();renderMontage();E('verifyMontage').onclick=verifyMontage;['setupMedium','setupIncidence','setupReceiver'].forEach(id=>E(id).addEventListener('change',e=>{const map={setupMedium:'medium',setupIncidence:'incidence',setupReceiver:'receiver'};s.montage[map[id]]=e.target.value;s.montage.verifiedFor=null;renderMontage();save()}));E('task').addEventListener('change',syncTask);['xpos','temp','angle','cursor1','cursor2'].forEach(id=>E(id).addEventListener('input',draw));E('record').onclick=record;E('checkWater').onclick=checkWater;E('checkYoung').onclick=checkYoung;
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.analysis.water){E('studentWaterV').value=s.analysis.water.v;E('studentBulk').value=s.analysis.water.B}if(s.analysis.young)E('studentYoung').value=s.analysis.young.E;
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',renderAll);syncTask();renderAll();save();
})();