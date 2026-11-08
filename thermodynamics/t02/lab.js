(()=>{
'use strict';
const $=id=>document.getElementById(id),$$=q=>[...document.querySelectorAll(q)],K='PhysicsUSTHB_T02_v2',L0=600;
function makeRun(){return{id:'T02-'+Math.random().toString(36).slice(2,7).toUpperCase(),alpha:{A:23.1e-6,B:16.8e-6,C:11.9e-6},tempOffset:(Math.random()-.5)*.18,dialScale:1+(Math.random()-.5)*.004,zeroOffset:(Math.random()-.5)*.0015}}
let state={version:2,run:makeRun(),material:'A',zero:{},current:null,records:{A:[],B:[],C:[]},analysis:{A:null,B:null,C:null},text:{analysisNotes:'',discussion:'',conclusion:''}};
try{const q=JSON.parse(localStorage.getItem(K)||'null');if(q?.version===2)state={...state,...q,zero:{...q.zero},records:{A:[],B:[],C:[],...q.records},analysis:{A:null,B:null,C:null,...q.analysis},text:{...state.text,...q.text}}}catch(_){}
function save(){try{localStorage.setItem(K,JSON.stringify(state))}catch(_){}}
function tabs(){$$('.tabbtn').forEach(b=>b.onclick=()=>{$$('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(p=>p.classList.toggle('active',p.id===b.dataset.tab));render()})}
function mat(){return $('material').value}
function measuredT(set){return Math.round((set+state.run.tempOffset)*10)/10}
function settle(){
  const m=mat(),set=+$('tempSet').value,T=measuredT(set),z=state.zero[m],alpha=state.run.alpha[m],direction=$('direction').value;
  let dl=null,div=null;
  if(z){
    const trueDL=alpha*(L0/1000)*(set-z.trueT)*1000;
    const backlash=(direction==='cool'?-0.004:0.004),measDL=(trueDL*state.run.dialScale+state.run.zeroOffset+backlash);
    div=Math.round((measDL/.01)*10)/10;dl=div*.01;
  }
  state.current={material:m,set,trueT:set,T,dl,div,direction,settled:true};
  $('benchMessage').className='notice ok';$('benchMessage').textContent=z?'Thermal equilibrium reached. Read the thermometer and dial pointer.':'Equilibrium reached. Zero the dial gauge at this reference temperature before heating.';
  render();save();
}
function zeroGauge(){
  const m=mat(),c=state.current;
  if(!c||c.material!==m||!c.settled){$('benchMessage').className='notice warn';$('benchMessage').textContent='First settle the selected rod at a near-ambient temperature.';return}
  if(c.trueT>26){$('benchMessage').className='notice warn';$('benchMessage').textContent='Return the rod close to ambient temperature before zeroing the gauge.';return}
  state.zero[m]={T0:c.T,trueT:c.trueT};state.current={...c,dl:0,div:0};state.records[m]=[];state.analysis[m]=null;
  $('benchMessage').className='notice ok';$('benchMessage').textContent='Dial gauge zeroed. Raise the temperature and wait for equilibrium before each reading.';render();save();
}
function changeMaterial(){
  state.material=mat();state.current=null;$('tempSet').value=20;$('studentDiv').value='';$('studentDL').value='';$('studentT').value='';render();save();
}
function drawApp(){
  const c=$('apparatusCanvas');if(!c)return;const dpr=devicePixelRatio||1,w=c.clientWidth||800,h=c.clientHeight||330;c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.fillStyle='#edf6f7';x.fillRect(0,0,w,h);
  const y=h*.50,left=55,right=w*.68,T=state.current?.T??measuredT(+$('tempSet').value),frac=(T-20)/75;
  x.strokeStyle='#587484';x.lineWidth=10;x.beginPath();x.moveTo(left,y);x.lineTo(right,y);x.stroke();x.strokeStyle='rgba(212,87,53,.75)';x.lineWidth=6;x.beginPath();x.moveTo(left,y);x.lineTo(left+(right-left)*Math.max(0,Math.min(1,frac)),y);x.stroke();
  x.fillStyle='#173e58';x.font='700 12px system-ui';x.fillText('600.0 mm rod '+mat(),left,y-25);x.fillText(T.toFixed(1)+' °C',left,y+34);
  const cx=w*.83,cy=h*.49,R=Math.min(72,h*.23);x.fillStyle='#fff';x.strokeStyle='#536f80';x.lineWidth=4;x.beginPath();x.arc(cx,cy,R,0,Math.PI*2);x.fill();x.stroke();
  for(let n=0;n<100;n+=5){const a=(-140+280*n/100)*Math.PI/180,ri=R-10,ro=R-2;x.strokeStyle='#607888';x.lineWidth=n%10===0?2:1;x.beginPath();x.moveTo(cx+ri*Math.cos(a),cy+ri*Math.sin(a));x.lineTo(cx+ro*Math.cos(a),cy+ro*Math.sin(a));x.stroke();}
  const div=state.current?.div??0,a=(-140+280*((((div%100)+100)%100)/100))*Math.PI/180;x.strokeStyle='#c54a43';x.lineWidth=3;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+(R-15)*Math.cos(a),cy+(R-15)*Math.sin(a));x.stroke();x.fillStyle='#173e58';x.fillText('0.01 mm/div',cx-35,cy+R+20);
}
function recordPoint(){
  const m=mat(),z=state.zero[m],c=state.current;if(!z){$('recordMessage').className='notice warn';$('recordMessage').textContent='Zero the gauge for this rod first.';return}
  if(!c||c.material!==m||!c.settled||c.dl==null){$('recordMessage').className='notice warn';$('recordMessage').textContent='Heat/cool the rod and wait for a stable reading first.';return}
  if(Math.abs(c.trueT-z.trueT)<4){$('recordMessage').className='notice warn';$('recordMessage').textContent='Use a temperature at least 4 K from the zero reference for expansion data.';return}
  const div=+$('studentDiv').value,dl=+$('studentDL').value,T=+$('studentT').value;
  if(!Number.isFinite(div)||!Number.isFinite(dl)||!Number.isFinite(T)){$('recordMessage').className='notice warn';$('recordMessage').textContent='Enter the dial divisions, converted elongation and thermometer reading.';return}
  if(Math.abs(div-c.div)>.6){$('recordMessage').className='notice warn';$('recordMessage').textContent='Re-read the analog dial pointer.';return}
  if(Math.abs(dl-div*.01)>.003){$('recordMessage').className='notice warn';$('recordMessage').textContent='Convert dial divisions using 0.01 mm/div.';return}
  if(Math.abs(T-c.T)>.15){$('recordMessage').className='notice warn';$('recordMessage').textContent='Enter the measured thermometer value.';return}
  const dT=T-z.T0,rec={T,dT,div,dl,direction:c.direction},arr=state.records[m],i=arr.findIndex(q=>Math.abs(q.T-T)<.2&&q.direction===c.direction);if(i>=0)arr[i]=rec;else arr.push(rec);arr.sort((a,b)=>a.dT-b.dT);state.analysis[m]=null;
  ['studentDiv','studentDL','studentT'].forEach(id=>$(id).value='');$('recordMessage').className='notice ok';$('recordMessage').textContent='Expansion point accepted. Continue through a broad temperature range.';render();save();
}
function fit(m){
  const a=state.records[m];if(a.length<2)return null;const n=a.length,mx=a.reduce((s,p)=>s+p.dT,0)/n,my=a.reduce((s,p)=>s+p.dl,0)/n;let nu=0,de=0;a.forEach(p=>{nu+=(p.dT-mx)*(p.dl-my);de+=(p.dT-mx)**2});const slope=nu/de,b=my-slope*mx;return{slope,b,alphaMicro:slope/L0*1e6};
}
function coverage(m){const a=state.records[m];if(a.length<6)return false;const ds=a.map(q=>q.dT);return Math.max(...ds)-Math.min(...ds)>=50}
function checkAnalysis(){
  const m=$('analysisMaterial').value;if(!coverage(m)){$('analysisMessage').className='notice warn';$('analysisMessage').textContent='Record at least six stable points for rod '+m+' spanning at least 50 K.';return}
  const q=fit(m),slope=+$('studentSlope').value,alpha=+$('studentAlpha').value;if(!Number.isFinite(slope)||!Number.isFinite(alpha)||slope<=0||alpha<=0){$('analysisMessage').className='notice warn';$('analysisMessage').textContent='Enter the fitted slope and calculated expansion coefficient.';return}
  if(Math.abs(slope-q.slope)>Math.max(.0004,.05*q.slope)){$('analysisMessage').className='notice warn';$('analysisMessage').textContent='Re-read the slope of the ΔL versus ΔT data.';return}
  if(Math.abs(alpha-slope/L0*1e6)>1.0){$('analysisMessage').className='notice warn';$('analysisMessage').textContent='Recalculate α = slope/L₀ using L₀ = 600.0 mm.';return}
  state.analysis[m]={slope,alpha};$('analysisMessage').className='notice ok';$('analysisMessage').textContent='Rod '+m+' analysis accepted. Repeat for the other rods.';render();save();
}
function plot(){
  const c=$('expansionChart');if(!c)return;const dpr=devicePixelRatio||1,w=c.clientWidth||800,h=c.clientHeight||350;c.width=w*dpr;c.height=h*dpr;const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0),p={l:58,r:20,t:24,b:46},all=['A','B','C'].flatMap(m=>state.records[m].map(q=>({...q,m}))),maxX=Math.max(60,...all.map(q=>q.dT)),maxY=Math.max(1,...all.map(q=>q.dl)),X=v=>p.l+v/maxX*(w-p.l-p.r),Y=v=>h-p.b-v/maxY*(h-p.t-p.b);
  x.fillStyle='#fff';x.fillRect(0,0,w,h);x.strokeStyle='#dce5eb';for(let k=0;k<=5;k++){const xx=p.l+(w-p.l-p.r)*k/5,yy=p.t+(h-p.t-p.b)*k/5;x.beginPath();x.moveTo(xx,p.t);x.lineTo(xx,h-p.b);x.stroke();x.beginPath();x.moveTo(p.l,yy);x.lineTo(w-p.r,yy);x.stroke()}x.strokeStyle='#31566f';x.beginPath();x.moveTo(p.l,p.t);x.lineTo(p.l,h-p.b);x.lineTo(w-p.r,h-p.b);x.stroke();
  const cols={A:'#278da8',B:'#d18c35',C:'#8a62a8'};for(const m of ['A','B','C']){const arr=state.records[m];x.strokeStyle=cols[m];x.fillStyle=cols[m];if(arr.length){x.beginPath();arr.forEach((q,i)=>i?x.lineTo(X(q.dT),Y(q.dl)):x.moveTo(X(q.dT),Y(q.dl)));x.stroke();arr.forEach(q=>{x.beginPath();x.arc(X(q.dT),Y(q.dl),4,0,Math.PI*2);x.fill()})}}
  x.fillStyle='#587184';x.font='11px system-ui';x.textAlign='center';x.fillText('ΔT / K',(p.l+w-p.r)/2,h-8);x.save();x.translate(15,h/2);x.rotate(-Math.PI/2);x.fillText('ΔL / mm',0,0);x.restore();
}
function render(){
  drawApp();const m=mat(),z=state.zero[m];$('zeroState').textContent=z?'zeroed at '+z.T0.toFixed(1)+' °C':'not set';$('eqState').textContent=state.current?.material===m&&state.current?.settled?'stable':'not settled';$('tempRead').textContent=state.current?.material===m?state.current.T.toFixed(1)+' °C':'—';
  $('dataBody').innerHTML=['A','B','C'].flatMap(mm=>state.records[mm].map(q=>'<tr><td>'+mm+'</td><td>'+q.T.toFixed(1)+'</td><td>'+q.dT.toFixed(1)+'</td><td>'+q.div.toFixed(1)+'</td><td>'+q.dl.toFixed(3)+'</td><td>'+q.direction+'</td></tr>')).join('')||'<tr><td colspan="6">No validated expansion readings yet.</td></tr>';
  plot();const am=$('analysisMaterial').value,a=state.analysis[am];$('slopeOut').textContent=a?a.slope.toFixed(4)+' mm/K':'—';$('alphaOut').textContent=a?a.alpha.toFixed(1)+' ×10⁻⁶/K':'—';$('analysedOut').textContent=['A','B','C'].filter(mm=>state.analysis[mm]).length+' / 3';
  const complete=['A','B','C'].every(mm=>state.analysis[mm]);if(complete){$('analysisMessage').className='notice ok';$('analysisMessage').textContent='All three rods are analysed. Compare the coefficients and discuss measurement limitations.'}
}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function buildReport(){
  const email=$('studentEmail').value.trim();if(!email||!$('studentEmail').checkValidity()){$('studentEmail').focus();$('reportPreview').innerHTML='<div class="notice warn"><b>Email required.</b> Enter a valid student email.</div>';return false}
  state.text.analysisNotes=$('analysisNotes').value;state.text.discussion=$('discussion').value;state.text.conclusion=$('conclusion').value;save();
  const results=['A','B','C'].map(m=>state.analysis[m]?'Rod '+m+': α='+state.analysis[m].alpha.toFixed(1)+'×10⁻⁶ K⁻¹':'Rod '+m+': incomplete').join(' · ');
  $('reportPreview').innerHTML='<h2>Thermodynamics Laboratory Practical 2 — Linear Thermal Expansion</h2><p><b>Student:</b> '+esc($('studentName').value||'—')+' &nbsp; <b>Email:</b> '+esc(email)+' &nbsp; <b>Group:</b> '+esc($('studentGroup').value||'—')+' &nbsp; <b>Date:</b> '+esc($('reportDate').value||'—')+'</p><p><b>Results:</b> '+results+'.</p><h3>Analysis notes</h3><p>'+esc($('analysisNotes').value||'Not completed.').replace(/\n/g,'<br>')+'</p><h3>Discussion</h3><p>'+esc($('discussion').value||'Not completed.').replace(/\n/g,'<br>')+'</p><h3>Conclusion</h3><p>'+esc($('conclusion').value||'Not completed.').replace(/\n/g,'<br>')+'</p>';return true;
}
tabs();$('material').value=state.material;['analysisNotes','discussion','conclusion'].forEach(id=>{$(id).value=state.text[id]||'';$(id).addEventListener('input',()=>{state.text[id]=$(id).value;save()})});
$('material').onchange=changeMaterial;$('tempSet').oninput=render;$('direction').onchange=()=>{state.current=null;render()};$('settle').onclick=settle;$('zeroGauge').onclick=zeroGauge;$('recordPoint').onclick=recordPoint;$('analysisMaterial').onchange=render;$('checkAnalysis').onclick=checkAnalysis;$('buildReport').onclick=buildReport;$('printReport').onclick=()=>{if(buildReport())window.print()};$('clearData').onclick=()=>{if(confirm('Clear all locally saved progress for this practical on this browser?')){localStorage.removeItem(K);location.reload()}};
if(!$('reportDate').value)$('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();