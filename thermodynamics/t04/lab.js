(()=>{
'use strict';
const U=ThermoUI,E=id=>document.getElementById(id),K='THERMO_T04_v3';

function q(x,step){return Math.round(x/step)*step}
function makeRun(){
  const pvT=q(22.5+Math.random()*2.5,.1),pvK=3980+Math.random()*150,ptScale=(100.5+Math.random()*2)/298.15;
  return{id:'T04-'+Math.random().toString(36).slice(2,7).toUpperCase(),pvT,pvK,ptScale,phase:Math.random()*6.28};
}
let s=U.load(K,null);
if(!s||s.version!==3)s={version:3,run:makeRun(),pv:[],pt:[],analysis:{pv:null,pt:null},interpretation:''};
s.pv=Array.isArray(s.pv)?s.pv:[];s.pt=Array.isArray(s.pt)?s.pt:[];s.analysis=s.analysis||{pv:null,pt:null};s.interpretation=s.interpretation||'';

function save(){U.save(K,s)}
function mode(){return E('mode').value}
function currentTemp(){return mode()==='pv'?s.run.pvT:+E('bathTemp').value}
function pressure(){
  if(mode()==='pv'){
    const V=+E('volume').value,nonideal=1+.0025*(40-V)/40,raw=s.run.pvK/V*nonideal+.22*Math.sin(V*.31+s.run.phase);
    return q(raw,.5);
  }
  const T=+E('bathTemp').value,weak=1+0.000035*(T-50),raw=s.run.ptScale*(T+273.15)*weak+.18*Math.sin(T*.27+s.run.phase*.8);
  return q(raw,.5);
}
function setupCanvas(){
  const c=E('gasCanvas'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;
  c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);return{x,w,h};
}
function drawGauge(x,cx,cy,r,P){
  x.save();x.fillStyle='#edf1ea';x.beginPath();x.arc(cx,cy,r,0,Math.PI*2);x.fill();x.strokeStyle='#50636c';x.lineWidth=3;x.stroke();
  for(let k=0;k<=25;k++){const val=k*10,a=(-140+280*val/250)*Math.PI/180,major=k%5===0,rin=r-(major?18:11),rout=r-5;x.strokeStyle='#273e48';x.lineWidth=major?2:1;x.beginPath();x.moveTo(cx+rin*Math.cos(a),cy+rin*Math.sin(a));x.lineTo(cx+rout*Math.cos(a),cy+rout*Math.sin(a));x.stroke();if(major){x.fillStyle='#273e48';x.font='700 10px ui-monospace,monospace';x.textAlign='center';x.textBaseline='middle';x.fillText(String(val),cx+(r-31)*Math.cos(a),cy+(r-31)*Math.sin(a));}}
  const ap=(-140+280*Math.max(0,Math.min(250,P))/250)*Math.PI/180;x.strokeStyle='#bb3f4e';x.lineWidth=3;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+(r-24)*Math.cos(ap),cy+(r-24)*Math.sin(ap));x.stroke();x.fillStyle='#263d47';x.beginPath();x.arc(cx,cy,7,0,Math.PI*2);x.fill();x.fillStyle='#536a75';x.font='700 10px system-ui';x.textAlign='center';x.fillText('kPa absolute',cx,cy+r*.52);x.restore();
}
function draw(){
  const{x,w,h}=setupCanvas(),m=mode(),P=pressure(),T=currentTemp();
  x.fillStyle='#071713';x.fillRect(0,0,w,h);
  if(m==='pv'){
    const V=+E('volume').value,frac=(V-20)/40,left=w*.09,top=h*.24,sw=w*.43,sh=h*.42,piston=left+sw*(.30+.55*frac);
    x.fillStyle='#dfe9eb';x.fillRect(left,top,sw,sh);x.strokeStyle='#56727d';x.lineWidth=3;x.strokeRect(left,top,sw,sh);
    x.fillStyle='rgba(87,180,212,.45)';x.fillRect(left+4,top+4,piston-left-4,sh-8);
    x.fillStyle='#9aaeb5';x.fillRect(piston,top-10,10,sh+20);x.fillStyle='#d4e1e5';x.fillRect(piston+10,top+sh*.43,sw*.28,12);
    x.fillStyle='#a7c0ca';x.font='700 12px system-ui';x.fillText('sealed gas syringe',left,top-17);
    x.font='600 11px system-ui';x.fillText('volume read from barrel scale',left,top+sh+24);
  }else{
    const left=w*.10,top=h*.22,bw=w*.39,bh=h*.48;
    x.fillStyle='#203a43';x.fillRect(left,top,bw,bh);x.fillStyle='rgba(96,185,215,.52)';x.fillRect(left+8,top+8,bw-16,bh-16);
    x.fillStyle='#cedadd';x.beginPath();x.arc(left+bw*.52,top+bh*.51,48,0,Math.PI*2);x.fill();x.strokeStyle='#556f79';x.lineWidth=4;x.stroke();x.fillStyle='rgba(114,190,214,.35)';x.beginPath();x.arc(left+bw*.52,top+bh*.51,38,0,Math.PI*2);x.fill();
    x.fillStyle='#b9cbd2';x.font='700 12px system-ui';x.fillText('sealed fixed-volume bulb',left+22,top-14);x.fillText('thermostatic bath',left+22,top+bh+23);
  }
  drawGauge(x,w*.76,h*.48,Math.min(105,h*.30),P);
  x.fillStyle='#d5e5e9';x.font='700 13px system-ui';x.fillText((m==='pv'?'isothermal P–V':'isochoric P–T')+' · '+T.toFixed(1)+'°C',18,27);
  E('volumeRead').textContent=(+E('volume').value).toFixed(0)+' mL';E('bathTempRead').textContent=(+E('bathTemp').value).toFixed(0)+'°C';E('gasTempRead').textContent=T.toFixed(1)+' °C';
}
function resetEquilibrium(){
  E('equilibrated').value='no';E('studentPressure').value='';E('benchMsg').className='notice';E('benchMsg').textContent='Allow the gas to settle, then set Equilibration to stable and read the pressure dial.';draw();
}
function syncMode(){
  const pv=mode()==='pv';E('volume').disabled=!pv;E('bathTemp').disabled=pv;
  E('benchMsg').className='notice';E('benchMsg').textContent=pv?'Boyle–Mariotte mode: vary volume from 20 to 60 mL at constant temperature.':'Constant-volume mode: keep the bulb sealed and vary bath temperature from 20 to 80°C.';
  resetEquilibrium();renderAll();
}
function recordPoint(){
  if(E('equilibrated').value!=='yes'){E('benchMsg').className='notice warn';E('benchMsg').textContent='Wait for pressure/temperature equilibrium and mark the state as stable before recording.';return}
  const p=pressure(),v=+E('studentPressure').value;if(!Number.isFinite(v)||v<=0){E('benchMsg').className='notice warn';E('benchMsg').textContent='Read the absolute-pressure gauge and enter its value in kPa.';return}
  if(Math.abs(v-p)>1.25){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the pressure needle against the 10 kPa dial subdivisions.';return}
  if(mode()==='pv'){
    const V=+E('volume').value,rec={V,T:s.run.pvT,P:v},i=s.pv.findIndex(q=>q.V===V);if(i>=0)s.pv[i]=rec;else s.pv.push(rec);s.pv.sort((a,b)=>a.V-b.V);s.analysis.pv=null;
    E('benchMsg').className='notice ok';E('benchMsg').textContent='P–V point accepted. Change the volume, re-equilibrate and continue.';
  }else{
    const T=+E('bathTemp').value,rec={V:50,T,P:v},i=s.pt.findIndex(q=>q.T===T);if(i>=0)s.pt[i]=rec;else s.pt.push(rec);s.pt.sort((a,b)=>a.T-b.T);s.analysis.pt=null;
    E('benchMsg').className='notice ok';E('benchMsg').textContent='P–T point accepted. Change the bath temperature, re-equilibrate and continue.';
  }
  E('studentPressure').value='';E('equilibrated').value='no';renderAll();save();
}
function coverage(){
  return{pv:s.pv.length>=9&&s.pv[0]?.V<=20&&s.pv.at(-1)?.V>=60,pt:s.pt.length>=9&&s.pt[0]?.T<=20&&s.pt.at(-1)?.T>=80};
}
function linfit(points){
  const n=points.length,mx=points.reduce((a,p)=>a+p.x,0)/n,my=points.reduce((a,p)=>a+p.y,0)/n;let Sxx=0,Sxy=0;
  for(const p of points){Sxx+=(p.x-mx)**2;Sxy+=(p.x-mx)*(p.y-my)}
  const b=Sxy/Sxx,a=my-b*mx,res=points.map(p=>p.y-(a+b*p.x)),SSE=res.reduce((z,e)=>z+e*e,0),sy=Math.sqrt(SSE/Math.max(1,n-2));
  const sEff=Math.sqrt(sy*sy+Math.pow(.5/Math.sqrt(3),2)),varB=sEff*sEff/Sxx,varA=sEff*sEff*(1/n+mx*mx/Sxx),cov=-mx*sEff*sEff/Sxx;
  return{a,b,n,mx,Sxx,sy,sEff,varA,varB,cov};
}
function pvExpected(){
  if(!coverage().pv)return null;const fit=linfit(s.pv.map(q=>({x:1/q.V,y:q.P}))),pv=s.pv.map(q=>q.P*q.V),mean=pv.reduce((a,b)=>a+b,0)/pv.length,spread=(Math.max(...pv)-Math.min(...pv))/mean*100;
  return{fit,mean,spread};
}
function ptExpected(){
  if(!coverage().pt)return null;const fit=linfit(s.pt.map(q=>({x:q.T,y:q.P}))),T0=-fit.a/fit.b,da=-1/fit.b,db=fit.a/(fit.b*fit.b),varT=da*da*fit.varA+db*db*fit.varB+2*da*db*fit.cov,u=Math.sqrt(Math.max(0,varT));
  return{fit,T0,u};
}
function checkPv(){
  const e=pvExpected();if(!e){E('pvMsg').className='notice warn';E('pvMsg').textContent='Record all nine prescribed volumes from 20 to 60 mL before analysing.';return}
  const b=+E('studentPvSlope').value,m=+E('studentPvMean').value,sp=+E('studentPvSpread').value;if([b,m,sp].some(v=>!Number.isFinite(v))||b<=0||m<=0||sp<0){E('pvMsg').className='notice warn';E('pvMsg').textContent='Enter the linear-fit slope, mean PV and relative PV spread.';return}
  if(Math.abs(b-e.fit.b)>Math.max(15,.012*e.fit.b)){E('pvMsg').className='notice warn';E('pvMsg').textContent='Fit P against 1/V and re-read the slope in kPa·mL.';return}
  if(Math.abs(m-e.mean)>Math.max(12,.008*e.mean)){E('pvMsg').className='notice warn';E('pvMsg').textContent='Recalculate the mean of the nine PV products.';return}
  if(Math.abs(sp-e.spread)>.12){E('pvMsg').className='notice warn';E('pvMsg').textContent='Recalculate 100(PVmax−PVmin)/mean(PV).';return}
  s.analysis.pv={slope:b,mean:m,spread:sp,intercept:e.fit.a};E('pvMsg').className='notice ok';E('pvMsg').textContent='Boyle–Mariotte analysis accepted.';renderAll();save();
}
function checkPt(){
  const e=ptExpected();if(!e){E('ptMsg').className='notice warn';E('ptMsg').textContent='Record at least nine temperatures spanning 20–80°C before fitting.';return}
  const b=+E('studentPtSlope').value,a=+E('studentPtIntercept').value,z=+E('studentAbsZero').value,u=+E('studentAbsU').value;if([b,a,z,u].some(v=>!Number.isFinite(v))||b<=0||a<=0||u<0){E('ptMsg').className='notice warn';E('ptMsg').textContent='Enter slope, intercept, extrapolated absolute zero and its uncertainty.';return}
  if(Math.abs(b-e.fit.b)>Math.max(.003,.012*e.fit.b)){E('ptMsg').className='notice warn';E('ptMsg').textContent='Refit P=a+bT and re-read b.';return}
  if(Math.abs(a-e.fit.a)>Math.max(.8,.012*e.fit.a)){E('ptMsg').className='notice warn';E('ptMsg').textContent='Re-read the fitted pressure intercept a.';return}
  const calc=-a/b;if(Math.abs(z-calc)>.8){E('ptMsg').className='notice warn';E('ptMsg').textContent='Recalculate T₀=−a/b from your fitted line.';return}
  if(Math.abs(u-e.u)>Math.max(.35,.22*Math.max(e.u,.2))){E('ptMsg').className='notice warn';E('ptMsg').textContent='Propagate the fitted slope/intercept covariance to the x-intercept uncertainty.';return}
  s.analysis.pt={slope:b,intercept:a,T0:z,u};E('ptMsg').className='notice ok';E('ptMsg').textContent='Absolute-zero extrapolation accepted. Compare it with −273.15°C in your discussion.';renderAll();save();
}
function blank(id,msg){const q=U.canvas(E(id));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function charts(){
  if(s.pv.length)U.plot(E('pvChart'),[{pts:s.pv.map(q=>({x:1/q.V,y:q.P}))}],{xlabel:'1/V / mL⁻¹',ylabel:'P / kPa',xmin:0,ymin:0});else blank('pvChart','Record P–V points to build P(1/V).');
  if(s.pt.length)U.plot(E('ptChart'),[{pts:s.pt.map(q=>({x:q.T,y:q.P}))}],{xlabel:'temperature / °C',ylabel:'P / kPa',xmin:0,ymin:0});else blank('ptChart','Record constant-volume P–T points.');
}
function table(){
  const rows=[...s.pv.map(q=>({kind:'P–V',...q})),...s.pt.map(q=>({kind:'P–T',...q}))];
  E('dataBody').innerHTML=rows.length?rows.map(q=>'<tr><td>'+q.kind+'</td><td>'+q.V.toFixed(0)+'</td><td>'+q.T.toFixed(1)+'</td><td>'+q.P.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="4">No accepted gas-law points yet.</td></tr>';
  E('pvCount').textContent=s.pv.length+' / 9';E('ptCount').textContent=s.pt.length+' / 9';
  const a=s.analysis.pv,b=s.analysis.pt;E('pvSlopeOut').textContent=a?a.slope.toFixed(1)+' kPa·mL':'—';E('pvMeanOut').textContent=a?a.mean.toFixed(1)+' kPa·mL':'—';E('pvSpreadOut').textContent=a?a.spread.toFixed(2)+'%':'—';
  E('ptSlopeOut').textContent=b?b.slope.toFixed(4)+' kPa/°C':'—';E('absZeroOut').textContent=b?b.T0.toFixed(2)+'°C':'—';E('absUOut').textContent=b?b.u.toFixed(2)+'°C':'—';
  const words=s.interpretation.trim().length>=65;E('progress').innerHTML='<div class="item '+(a?'done':'')+'">'+(a?'✓':'○')+' Boyle–Mariotte analysis</div><div class="item '+(b?'done':'')+'">'+(b?'✓':'○')+' absolute-zero extrapolation</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' physical interpretation</div>';
}
function renderAll(){draw();table();charts()}
function buildReport(){
  const a=s.analysis.pv,b=s.analysis.pt,summary='<p><b>Boyle–Mariotte:</b> '+(a?'slope='+a.slope.toFixed(1)+' kPa·mL, mean(PV)='+a.mean.toFixed(1)+' kPa·mL, spread='+a.spread.toFixed(2)+'%':'analysis incomplete')+'.</p><p><b>Constant-volume pressure thermometer:</b> '+(b?'P=('+b.intercept.toFixed(2)+')+('+b.slope.toFixed(4)+')T kPa; T₀='+b.T0.toFixed(2)+' ± '+b.u.toFixed(2)+'°C':'analysis incomplete')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';
  return U.report('Laboratory Practical 4 — Ideal-Gas Laws & Absolute Zero',summary);
}

U.tabs();E('interpretation').value=s.interpretation;
E('mode').addEventListener('change',syncMode);['volume','bathTemp'].forEach(id=>E(id).addEventListener('input',resetEquilibrium));E('recordPoint').onclick=recordPoint;
E('checkPv').onclick=checkPv;E('checkPt').onclick=checkPt;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;table();save()});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.analysis.pv){E('studentPvSlope').value=s.analysis.pv.slope;E('studentPvMean').value=s.analysis.pv.mean;E('studentPvSpread').value=s.analysis.pv.spread}
if(s.analysis.pt){E('studentPtSlope').value=s.analysis.pt.slope;E('studentPtIntercept').value=s.analysis.pt.intercept;E('studentAbsZero').value=s.analysis.pt.T0;E('studentAbsU').value=s.analysis.pt.u}
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',()=>{draw();charts()});syncMode();renderAll();save();
})();