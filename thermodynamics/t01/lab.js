(()=>{
'use strict';
const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)],K='PhysicsUSTHB_T01_v2',CW=4180;
const rnd=(a,b)=>a+Math.random()*(b-a),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function makeRun(){return{id:'T01-'+Math.random().toString(36).slice(2,7).toUpperCase(),Ccal:rnd(72,88),Lf:rnd(330000,338000),Lv:rnd(2220000,2290000),massScale:rnd(-.0007,.0007),massZero:rnd(-.08,.08),tempZero:rnd(-.12,.12)}}
let state={version:2,run:makeRun(),cal:null,fusion:null,vap:null,accepted:{Ccal:null,Lf:null,Lv:null},text:{analysisNotes:'',discussion:'',conclusion:''}};
try{const q=JSON.parse(localStorage.getItem(K)||'null');if(q?.version===2)state={...state,...q,accepted:{...state.accepted,...q.accepted},text:{...state.text,...q.text}}}catch(_){}
function save(){try{localStorage.setItem(K,JSON.stringify(state))}catch(_){}}
function massRead(g){return Math.round((g*(1+state.run.massScale)+state.run.massZero)*10)/10}
function tempRead(t){return Math.round((t+state.run.tempZero)*10)/10}
function near(a,b,t){return Number.isFinite(a)&&Math.abs(a-b)<=t}
function fmt(v,n=1){return Number.isFinite(v)?Number(v).toFixed(n):'—'}
function drawCal(canvas,{waterTemp=22,hot=false,ice=false,steam=false,label=''}) {
  if(!canvas)return;const dpr=devicePixelRatio||1,w=canvas.clientWidth||700,h=canvas.clientHeight||290;canvas.width=w*dpr;canvas.height=h*dpr;const x=canvas.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);
  x.fillStyle='#eef7f8';x.fillRect(0,0,w,h);const cx=w*.48,top=38,bottom=h-34,bw=Math.min(250,w*.42);
  x.fillStyle='#dbe4e8';x.strokeStyle='#607886';x.lineWidth=3;x.beginPath();x.roundRect(cx-bw/2,top,bw,bottom-top,18);x.fill();x.stroke();
  const level=bottom-16,wh=(bottom-top)*.55;x.fillStyle=hot?'#e8b27d':'#86c8d8';x.fillRect(cx-bw/2+10,level-wh,bw-20,wh);
  if(ice){x.fillStyle='#f7fdff';x.strokeStyle='#7baaba';for(let i=0;i<5;i++){const px=cx-bw*.3+i*bw*.14,py=level-wh*.72-(i%2)*10;x.fillRect(px,py,23,18);x.strokeRect(px,py,23,18)}}
  if(steam){x.strokeStyle='rgba(130,150,160,.55)';x.lineWidth=3;for(let i=0;i<4;i++){x.beginPath();x.moveTo(cx-bw*.25+i*bw*.16,top+15);x.bezierCurveTo(cx-bw*.3+i*bw*.16,top-4,cx-bw*.17+i*bw*.16,top-13,cx-bw*.22+i*bw*.16,top-28);x.stroke()}}
  const tx=cx+bw*.68;x.strokeStyle='#445d6b';x.lineWidth=5;x.beginPath();x.moveTo(tx,top+15);x.lineTo(tx,bottom-30);x.stroke();const frac=clamp((waterTemp-0)/100,0,1);x.strokeStyle='#c94f48';x.lineWidth=3;x.beginPath();x.moveTo(tx,bottom-30);x.lineTo(tx,bottom-30-frac*(bottom-top-55));x.stroke();
  x.fillStyle='#173e58';x.font='700 13px system-ui';x.fillText(label,cx-bw/2,22);x.font='12px system-ui';x.fillText('thermometer',tx-35,bottom-7);x.fillText(fmt(waterTemp,1)+' °C',tx-25,top+12);
}
function tabs(){$$('.tabbtn').forEach(b=>b.addEventListener('click',()=>{$$('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));$$('.panel').forEach(p=>p.classList.toggle('active',p.id===b.dataset.tab));render()}))}
function readCalControls(){return{mc:+$('calMCold').value,Tc:+$('calTCold').value,mh:+$('calMHot').value,Th:+$('calTHot').value}}
function runCalibration(){
  const q=readCalControls(),Tf=(q.mh*CW*q.Th+(q.mc*CW+state.run.Ccal)*q.Tc)/(q.mh*CW+q.mc*CW+state.run.Ccal);
  state.cal={mc:massRead(q.mc),mh:massRead(q.mh),Tc:tempRead(q.Tc),Th:tempRead(q.Th),Tf:tempRead(Tf)};state.accepted.Ccal=null;state.fusion=null;state.vap=null;state.accepted.Lf=null;state.accepted.Lv=null;
  ['calStudentMc','calStudentMh','calStudentTc','calStudentTh','calStudentTf','calStudentC'].forEach(id=>$(id).value='');
  $('calMessage').className='notice ok';$('calMessage').textContent='Equilibrium reached. Read the balance/thermometer values and calculate the calorimeter heat capacity.';
  render();save();
}
function expectedC(){
  const q=state.cal;if(!q)return null;const mc=q.mc/1000,mh=q.mh/1000;
  return CW*(mh*(q.Th-q.Tf)/(q.Tf-q.Tc)-mc);
}
function checkCalibration(){
  const q=state.cal;if(!q){$('calCalcMessage').className='notice warn';$('calCalcMessage').textContent='Run the calibration mixture first.';return}
  const vals=['calStudentMc','calStudentMh','calStudentTc','calStudentTh','calStudentTf','calStudentC'].map(id=>+$(id).value),exp=[q.mc,q.mh,q.Tc,q.Th,q.Tf,expectedC()];
  if(vals.slice(0,5).some((v,i)=>!near(v,exp[i],i<2?.15:.15))){$('calCalcMessage').className='notice warn';$('calCalcMessage').textContent='One or more entered measurements do not match the balance/thermometer readings.';return}
  if(!near(vals[5],exp[5],Math.max(2.5,.035*Math.abs(exp[5])))){$('calCalcMessage').className='notice warn';$('calCalcMessage').textContent='Recheck the calibration energy balance and units.';return}
  state.accepted.Ccal=vals[5];$('calCalcMessage').className='notice ok';$('calCalcMessage').textContent='Calorimeter heat capacity accepted. Use this measured value in both latent-heat experiments.';render();save();
}
function runFusion(){
  if(state.accepted.Ccal==null){$('fusionMessage').className='notice warn';$('fusionMessage').textContent='Validate the calorimeter calibration first.';return}
  const mw=+$('fusionMw').value,Ti=+$('fusionTi').value,mi=+$('fusionMi').value,C=state.run.Ccal,Tf=((mw/1000*CW+C)*Ti-(mi/1000)*state.run.Lf)/((mw+mi)/1000*CW+C);
  if(Tf<=2){$('fusionMessage').className='notice warn';$('fusionMessage').textContent='This combination would leave unmelted ice. Use less ice or warmer water.';return}
  state.fusion={mw:massRead(mw),mi:massRead(mi),Ti:tempRead(Ti),Tf:tempRead(Tf)};state.accepted.Lf=null;['fusionStudentMw','fusionStudentMi','fusionStudentTi','fusionStudentTf','fusionStudentLf'].forEach(id=>$(id).value='');
  $('fusionMessage').className='notice ok';$('fusionMessage').textContent='All ice has melted and thermal equilibrium is stable. Read the measured quantities and determine Lf.';render();save();
}
function expectedLf(){
  const q=state.fusion,C=state.accepted.Ccal;if(!q||C==null)return null;const mw=q.mw/1000,mi=q.mi/1000;
  return(((mw*CW+C)*(q.Ti-q.Tf)-mi*CW*q.Tf)/mi)/1000;
}
function checkFusion(){
  const q=state.fusion;if(!q){$('fusionCalcMessage').className='notice warn';$('fusionCalcMessage').textContent='Run the ice-melting experiment first.';return}
  const vals=['fusionStudentMw','fusionStudentMi','fusionStudentTi','fusionStudentTf','fusionStudentLf'].map(id=>+$(id).value),exp=[q.mw,q.mi,q.Ti,q.Tf,expectedLf()];
  if(vals.slice(0,4).some((v,i)=>!near(v,exp[i],.15))){$('fusionCalcMessage').className='notice warn';$('fusionCalcMessage').textContent='Enter the measured masses and temperatures exactly as read.';return}
  if(!near(vals[4],exp[4],Math.max(4,.035*Math.abs(exp[4])))){$('fusionCalcMessage').className='notice warn';$('fusionCalcMessage').textContent='Recheck the complete fusion balance, including warming the melted ice from 0 °C to Tf.';return}
  state.accepted.Lf=vals[4];$('fusionCalcMessage').className='notice ok';$('fusionCalcMessage').textContent='Latent heat of fusion accepted.';render();save();
}
function runVap(){
  if(state.accepted.Ccal==null){$('vapMessage').className='notice warn';$('vapMessage').textContent='Validate the calorimeter calibration first.';return}
  const mw=+$('vapMw').value,Ti=+$('vapTi').value,ms=+$('vapMs').value,C=state.run.Ccal;
  const Tf=((ms/1000)*state.run.Lv+(ms/1000)*CW*100+(mw/1000*CW+C)*Ti)/(((mw+ms)/1000)*CW+C);
  if(Tf>=90){$('vapMessage').className='notice warn';$('vapMessage').textContent='Use a smaller steam mass so the final equilibrium remains well below boiling.';return}
  state.vap={mw:massRead(mw),ms:massRead(ms),Ti:tempRead(Ti),Tf:tempRead(Tf)};state.accepted.Lv=null;['vapStudentMw','vapStudentMs','vapStudentTi','vapStudentTf','vapStudentLv'].forEach(id=>$(id).value='');
  $('vapMessage').className='notice ok';$('vapMessage').textContent='Steam flow stopped and equilibrium reached. Use the calorimeter mass increase as the condensed-steam mass.';render();save();
}
function expectedLv(){
  const q=state.vap,C=state.accepted.Ccal;if(!q||C==null)return null;const mw=q.mw/1000,ms=q.ms/1000;
  return(((mw*CW+C)*(q.Tf-q.Ti)-ms*CW*(100-q.Tf))/ms)/1000;
}
function checkVap(){
  const q=state.vap;if(!q){$('vapCalcMessage').className='notice warn';$('vapCalcMessage').textContent='Run the steam-condensation experiment first.';return}
  const vals=['vapStudentMw','vapStudentMs','vapStudentTi','vapStudentTf','vapStudentLv'].map(id=>+$(id).value),exp=[q.mw,q.ms,q.Ti,q.Tf,expectedLv()];
  if(vals.slice(0,4).some((v,i)=>!near(v,exp[i],.15))){$('vapCalcMessage').className='notice warn';$('vapCalcMessage').textContent='Enter the measured masses and temperatures exactly as read.';return}
  if(!near(vals[4],exp[4],Math.max(35,.035*Math.abs(exp[4])))){$('vapCalcMessage').className='notice warn';$('vapCalcMessage').textContent='Recheck the steam-condensation balance, including cooling the condensate from 100 °C to Tf.';return}
  state.accepted.Lv=vals[4];$('vapCalcMessage').className='notice ok';$('vapCalcMessage').textContent='Latent heat of vaporisation accepted.';render();save();
}
function render(){
  const cq=readCalControls(),calT=state.cal?.Tf??((cq.Tc+cq.Th)/2);drawCal($('calCanvas'),{waterTemp:calT,hot:true,label:'calibration mixture'});
  const fw=+$('fusionTi').value;drawCal($('fusionCanvas'),{waterTemp:state.fusion?.Tf??fw,ice:!state.fusion,label:'warm water + ice'});
  const vw=+$('vapTi').value;drawCal($('vapCanvas'),{waterTemp:state.vap?.Tf??vw,steam:!state.vap,label:'water + condensing steam'});
  $('calColdRead').textContent=state.cal?state.cal.mc.toFixed(1)+' g · '+state.cal.Tc.toFixed(1)+' °C':'—';$('calHotRead').textContent=state.cal?state.cal.mh.toFixed(1)+' g · '+state.cal.Th.toFixed(1)+' °C':'—';$('calFinalRead').textContent=state.cal?state.cal.Tf.toFixed(1)+' °C':'—';
  $('fusionWaterRead').textContent=state.fusion?state.fusion.mw.toFixed(1)+' g · '+state.fusion.Ti.toFixed(1)+' °C':'—';$('fusionIceRead').textContent=state.fusion?state.fusion.mi.toFixed(1)+' g · 0.0 °C':'—';$('fusionFinalRead').textContent=state.fusion?state.fusion.Tf.toFixed(1)+' °C':'—';
  $('vapWaterRead').textContent=state.vap?state.vap.mw.toFixed(1)+' g · '+state.vap.Ti.toFixed(1)+' °C':'—';$('vapSteamRead').textContent=state.vap?state.vap.ms.toFixed(1)+' g condensed':'—';$('vapFinalRead').textContent=state.vap?state.vap.Tf.toFixed(1)+' °C':'—';
  $('summaryC').textContent=state.accepted.Ccal==null?'—':state.accepted.Ccal.toFixed(1)+' J/K';$('summaryLf').textContent=state.accepted.Lf==null?'—':state.accepted.Lf.toFixed(1)+' kJ/kg';$('summaryLv').textContent=state.accepted.Lv==null?'—':state.accepted.Lv.toFixed(0)+' kJ/kg';
  [['statusCal',state.accepted.Ccal!=null],['statusFusion',state.accepted.Lf!=null],['statusVap',state.accepted.Lv!=null]].forEach(([id,ok])=>{$(id).classList.toggle('done',ok);$(id).textContent=$(id).textContent.replace(/ ✓$/,'')+(ok?' ✓':'')});
  const complete=state.accepted.Ccal!=null&&state.accepted.Lf!=null&&state.accepted.Lv!=null;$('analysisMessage').className=complete?'notice ok':'notice';$('analysisMessage').textContent=complete?'All three calorimetric calculations are validated. Complete the uncertainty discussion and report.':'All three calculations must be validated before the practical is complete.';
}
function esc(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function buildReport(){
  const email=$('studentEmail').value.trim();if(!email||!$('studentEmail').checkValidity()){$('studentEmail').focus();$('reportPreview').innerHTML='<div class="notice warn"><b>Email required.</b> Enter a valid student email before building the report.</div>';return false}
  state.text.analysisNotes=$('analysisNotes').value;state.text.discussion=$('discussion').value;state.text.conclusion=$('conclusion').value;save();
  const html='<h2>Thermodynamics Laboratory Practical 1 — Calorimetry & Latent Heats</h2><p><b>Student:</b> '+esc($('studentName').value||'—')+' &nbsp; <b>Email:</b> '+esc(email)+' &nbsp; <b>Group:</b> '+esc($('studentGroup').value||'—')+' &nbsp; <b>Date:</b> '+esc($('reportDate').value||'—')+'</p><p><b>Calorimeter heat capacity:</b> '+$('summaryC').textContent+'. <b>Latent heat of fusion:</b> '+$('summaryLf').textContent+'. <b>Latent heat of vaporisation:</b> '+$('summaryLv').textContent+'.</p><h3>Uncertainty & limitations</h3><p>'+esc($('analysisNotes').value||'Not completed.').replace(/\n/g,'<br>')+'</p><h3>Discussion</h3><p>'+esc($('discussion').value||'Not completed.').replace(/\n/g,'<br>')+'</p><h3>Conclusion</h3><p>'+esc($('conclusion').value||'Not completed.').replace(/\n/g,'<br>')+'</p><hr><p class="small-note">The virtual calorimeter values are simulation parameters. The experimental sequence, readings and energy-balance calculations remain student-operated.</p>';
  $('reportPreview').innerHTML=html;return true;
}
function bind(){
  ['calMCold','calTCold','calMHot','calTHot','fusionMw','fusionTi','fusionMi','vapMw','vapTi','vapMs'].forEach(id=>$(id).addEventListener('input',render));
  $('runCalibration').onclick=runCalibration;$('checkCalibration').onclick=checkCalibration;$('runFusion').onclick=runFusion;$('checkFusion').onclick=checkFusion;$('runVap').onclick=runVap;$('checkVap').onclick=checkVap;
  ['analysisNotes','discussion','conclusion'].forEach(id=>$(id).addEventListener('input',()=>{state.text[id]=$(id).value;save()}));
  $('buildReport').onclick=buildReport;$('printReport').onclick=()=>{if(buildReport())window.print()};$('clearData').onclick=()=>{if(confirm('Clear all locally saved progress for this practical on this browser?')){localStorage.removeItem(K);location.reload()}};
  window.addEventListener('resize',render);
}
tabs();bind();$('analysisNotes').value=state.text.analysisNotes||'';$('discussion').value=state.text.discussion||'';$('conclusion').value=state.text.conclusion||'';if(!$('reportDate').value)$('reportDate').value=new Date().toISOString().slice(0,10);render();save();
})();