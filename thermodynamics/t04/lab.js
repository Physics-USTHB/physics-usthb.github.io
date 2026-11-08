(()=>{'use strict';
const U=ThermoUI,E=id=>document.getElementById(id),K='THERMO_T04_v4',R=8.314462618,VSPHERE_ML=100,VS_M3=VSPHERE_ML*1e-6;
const SERIES_V=[60,55,50,45,40,35,30,25,22],ZERO_T=[80,70,60,50,40,30,20,10];
const COMBO_ORDERS=[['cold','room','hot'],['room','hot','cold'],['hot','cold','room']],BATH_T={cold:10,room:24,hot:80};
const RAPID_ACTIONS={
 startSoftware:'Start the acquisition software.',
 set20Hz:'Set the measurement frequency to 20 Hz.',
 showGraphs:'Display temperature-versus-time and pressure-versus-time graphs.',
 disconnectPressure:'Disconnect the pressure sensor from the syringe.',
 pushMinimum:'Push the syringe piston completely to its minimum volume (about 22 cc).',
 set40Reconnect:'Set the piston to 40 cc and reconnect the pressure sensor.',
 startAcquire:'Start acquisition.',
 rapidCompress:'Rapidly compress the piston to the initial/minimum position.',
 holdStable:'Hold the piston until pressure and temperature become stable.',
 releaseNote:'Release the piston and note the volume reached.',
 stopSave:'Stop acquisition and save the two graphs.'
};
const RAPID_FLOW=Object.keys(RAPID_ACTIONS);
const ZERO_ACTIONS={connect:'Connect pressure and temperature sensors.',set10:'Set acquisition frequency to 10 Hz.',immerse:'Immerse the sphere fully in the hottest bath and start acquisition simultaneously.'};
function q(x,step=.1){return Math.round(x/step)*step}
function makeRun(){
  const Troom=q(22.5+Math.random()*2,.1),p1=q(100.2+Math.random()*2,.1),v0=q(3.8+Math.random()*1.7,.1),v2=q(21.5+Math.random()*1.1,.1),gamma=1.38+Math.random()*.03;
  const ratio=(40+v0)/(v2+v0),p2=q(p1*ratio,.1),pmax=q(p1*Math.pow(ratio,gamma),.1),tmax=q((Troom+273.15)*Math.pow(ratio,gamma-1)-273.15,.1),releaseV=q(38.8+Math.random()*1.0,.1);
  const nSeries=(p1*1000)*((60+v0)*1e-6)/(R*(Troom+273.15));
  const nZero=(101.3e3*VS_M3)/(R*(25+273.15));
  const comboN=COMBO_ORDERS.map((ord,i)=>101.3e3*VS_M3/(R*(BATH_T[ord[0]]+273.15))*(1+[.012,-.008,.018][i]));
  return{id:'T04-'+Math.random().toString(36).slice(2,7).toUpperCase(),Troom,p1,v0,v2,p2,pmax,tmax,releaseV,nSeries,nZero,comboN,phase:Math.random()*6.28};
}
let s=U.load(K,null);
if(!s||s.version!==4)s={version:4,run:makeRun(),rapid:{stage:0,iso:null,pvt:null},series:{points:[],draft:{},tableChecked:false,fit:null},zero:{stage:0,points:[],fit:null},combos:[0,1,2].map(()=>({placed:false,connected:false,points:[],complete:false,fit:null})),closest:null};
function save(){U.save(K,s)}
function linfit(ps){
 const n=ps.length,mx=ps.reduce((a,p)=>a+p.x,0)/n,my=ps.reduce((a,p)=>a+p.y,0)/n;let sxx=0,sxy=0;
 for(const p of ps){sxx+=(p.x-mx)*(p.x-mx);sxy+=(p.x-mx)*(p.y-my)}const b=sxy/sxx,a=my-b*mx;return{a,b};
}
function setupCanvas(id){const c=E(id),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);return{x,w,h}}
function blank(id,msg){const q=setupCanvas(id);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function rapidState(t){
 const r=s.run,T0=r.Troom,P0=r.p1;
 if(t<5)return{P:P0,T:T0};
 if(t<5.35){const u=(t-5)/.35;return{P:P0+(r.pmax-P0)*u,T:T0+(r.tmax-T0)*u}}
 if(t<20){const u=Math.exp(-(t-5.35)/2.8);return{P:r.p2+(r.pmax-r.p2)*u,T:T0+(r.tmax-T0)*u}}
 if(t<20.4){const u=(t-20)/.4;return{P:r.p2+(P0-r.p2)*u,T:T0-4*Math.sin(Math.PI*u)}}
 return{P:P0+.12*Math.exp(-(t-20.4)/2),T:T0-.8*Math.exp(-(t-20.4)/2.3)}
}
function drawRapid(){
 const q=setupCanvas('rapidCanvas'),{x,w,h}=q;x.fillStyle='#08161d';x.fillRect(0,0,w,h);
 for(let i=0;i<=10;i++){x.strokeStyle='rgba(100,230,190,.13)';x.beginPath();x.moveTo(w*i/10,0);x.lineTo(w*i/10,h);x.stroke()}
 for(let j=0;j<=8;j++){x.beginPath();x.moveTo(0,h*j/8);x.lineTo(w,h*j/8);x.stroke()}
 if(s.rapid.stage<RAPID_FLOW.length){x.fillStyle='#a9c2cc';x.font='700 14px system-ui';x.textAlign='center';x.fillText('Complete the acquisition procedure to unlock the saved traces',w/2,h/2);E('rapidPressureRead').value='locked';E('rapidTempRead').value='locked';return}
 const pPts=[],tPts=[];for(let k=0;k<=1200;k++){const t=30*k/1200,z=rapidState(t);pPts.push({x:w*k/1200,y:h*.76-(z.P-90)/130*h*.58});tPts.push({x:w*k/1200,y:h*.76-(z.T-10)/90*h*.58})}
 for(const [pts,col] of [[pPts,'#69e7ff'],[tPts,'#ffd166']]){x.strokeStyle=col;x.lineWidth=2;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke()}
 const ct=+E('rapidCursor').value,z=rapidState(ct),cx=w*ct/30;x.strokeStyle='#f6f2a3';x.setLineDash([5,4]);x.beginPath();x.moveTo(cx,0);x.lineTo(cx,h);x.stroke();x.setLineDash([]);
 x.fillStyle='#69e7ff';x.font='700 11px system-ui';x.fillText('pressure trace',10,18);x.fillStyle='#ffd166';x.fillText('temperature trace',10,34);
 E('rapidPressureRead').value=z.P.toFixed(1)+' kPa';E('rapidTempRead').value=z.T.toFixed(1)+' °C';
}
function renderRapidProcedure(){
 const st=s.rapid.stage,key=RAPID_FLOW[st],done=st>=RAPID_FLOW.length;E('rapidActionBox').style.display=done?'none':'grid';E('rapidStageOut').textContent=done?'saved traces':'step '+(st+1)+' / '+RAPID_FLOW.length;
 E('rapidV2Read').textContent=st>=8?s.run.v2.toFixed(1)+' cc':'read barrel';E('releaseVRead').textContent=st>=10?s.run.releaseV.toFixed(1)+' cc':'—';
 if(!done){E('rapidActionChoice').innerHTML='<option value="">Select the operation you would perform…</option>'+RAPID_FLOW.map(k=>'<option value="'+k+'">'+RAPID_ACTIONS[k]+'</option>').join('');E('rapidActionChoice').value=''}
 drawRapid();
}
function performRapid(){
 const key=RAPID_FLOW[s.rapid.stage],choice=E('rapidActionChoice').value;if(!key)return;
 if(choice!==key){E('rapidMsg').className='notice warn';E('rapidMsg').textContent='That operation is out of sequence. Follow the published manipulation.';return}
 s.rapid.stage++;E('rapidMsg').className='notice ok';E('rapidMsg').textContent=s.rapid.stage>=RAPID_FLOW.length?'Acquisition saved. Use the graph cursor to read the initial plateau, compression maximum and stable compressed plateau.':'Operation completed. Continue with the next published step.';renderRapidProcedure();save();
}
function isoExpected(){
 if(s.rapid.stage<RAPID_FLOW.length)return null;const r=s.run,V1=40,V2=r.v2,P1=r.p1,P2=r.p2,pv1=P1*V1,pv2=P2*V2,V0=(P1*V1-P2*V2)/(P2-P1);return{V2,P1,P2,pv1,pv2,V0};
}
function checkRapidIso(){
 const e=isoExpected();if(!e){E('rapidIsoMsg').className='notice warn';E('rapidIsoMsg').textContent='Complete and save the acquisition first.';return}
 const ids=['rapidV2','rapidP1','rapidP2','rapidPV1','rapidPV2','rapidV0'],v=ids.map(id=>+E(id).value);if(v.some(z=>!Number.isFinite(z))){E('rapidIsoMsg').className='notice warn';E('rapidIsoMsg').textContent='Enter all six readings/calculations.';return}
 const [V2,P1,P2,pv1,pv2,V0]=v;
 if(Math.abs(V2-e.V2)>.15){E('rapidIsoMsg').className='notice warn';E('rapidIsoMsg').textContent='Re-read the compressed syringe volume from the barrel.';return}
 if(Math.abs(P1-e.P1)>.35||Math.abs(P2-e.P2)>.45){E('rapidIsoMsg').className='notice warn';E('rapidIsoMsg').textContent='Use the pressure trace plateaus before compression and after thermal relaxation, not the rapid pressure maximum.';return}
 if(Math.abs(pv1-P1*40)>3||Math.abs(pv2-P2*V2)>3){E('rapidIsoMsg').className='notice warn';E('rapidIsoMsg').textContent='Recalculate the uncorrected products P₁V₁ and P₂V₂.';return}
 const calc=(P1*40-P2*V2)/(P2-P1);if(Math.abs(V0-calc)>.08){E('rapidIsoMsg').className='notice warn';E('rapidIsoMsg').textContent='Solve P₁(40+V₀)=P₂(V₂+V₀) for the dead volume.';return}
 s.rapid.iso={V2,P1,P2,pv1,pv2,V0};s.rapid.pvt=null;E('rapidIsoMsg').className='notice ok';E('rapidIsoMsg').textContent='Isothermal/dead-volume analysis accepted. Now compare the initial and rapid-compression PVT states.';renderRapidResults();save();
}
function checkRapidPvt(){
 const a=s.rapid.iso;if(!a){E('rapidPvtMsg').className='notice warn';E('rapidPvtMsg').textContent='Validate the dead-volume correction first.';return}
 const ids=['rapidT1','rapidPmax','rapidTmax','rapidRatio1','rapidRatio2','rapidRatioDiff'],v=ids.map(id=>+E(id).value);if(v.some(z=>!Number.isFinite(z))){E('rapidPvtMsg').className='notice warn';E('rapidPvtMsg').textContent='Enter all rapid-state readings and calculations.';return}
 const [T1,Pmax,Tmax,r1,r2,diff]=v;
 if(Math.abs(T1-s.run.Troom)>.25||Math.abs(Pmax-s.run.pmax)>.6||Math.abs(Tmax-s.run.tmax)>.35){E('rapidPvtMsg').className='notice warn';E('rapidPvtMsg').textContent='Use the saved traces to read the initial temperature and the simultaneous rapid-compression pressure/temperature maxima.';return}
 const e1=a.P1*(40+a.V0)/(T1+273.15),e2=Pmax*(a.V2+a.V0)/(Tmax+273.15),ed=100*Math.abs(e1-e2)/((e1+e2)/2);
 if(Math.abs(r1-e1)>.04||Math.abs(r2-e2)>.04){E('rapidPvtMsg').className='notice warn';E('rapidPvtMsg').textContent='Recalculate P(V+V₀)/T with temperature in kelvin.';return}
 if(Math.abs(diff-ed)>.08){E('rapidPvtMsg').className='notice warn';E('rapidPvtMsg').textContent='Recalculate the relative difference between the two P(V+V₀)/T values.';return}
 s.rapid.pvt={T1,Pmax,Tmax,r1,r2,diff};E('rapidPvtMsg').className='notice ok';E('rapidPvtMsg').textContent='Rapid-state PVT comparison accepted.';renderRapidResults();save();
}
function renderRapidResults(){E('rapidV0Out').textContent=s.rapid.iso?s.rapid.iso.V0.toFixed(2)+' cc':'—';E('rapidDiffOut').textContent=s.rapid.pvt?s.rapid.pvt.diff.toFixed(2)+'%':'—'}
function seriesTruth(V){
 const i=SERIES_V.indexOf(+V),T=q(s.run.Troom+.16*Math.sin(i*1.17+s.run.phase),.1),P=q(s.run.nSeries*R*(T+273.15)/((+V+s.run.v0)*1e-6)/1000,.1);return{V:+V,T,P};
}
function drawSeries(){
 const q=setupCanvas('seriesCanvas'),{x,w,h}=q,V=+E('seriesVolume').value,z=seriesTruth(V);x.fillStyle='#071713';x.fillRect(0,0,w,h);
 const left=w*.12,top=h*.28,sw=w*.55,sh=h*.40,frac=(V-22)/(60-22),piston=left+sw*(.22+.62*frac);x.fillStyle='#dfe9eb';x.fillRect(left,top,sw,sh);x.fillStyle='rgba(87,180,212,.45)';x.fillRect(left+4,top+4,piston-left-4,sh-8);x.fillStyle='#98aeb6';x.fillRect(piston,top-9,10,sh+18);
 x.fillStyle='#d6e6ea';x.font='700 13px system-ui';x.fillText('syringe reading '+V+' cc',left,top-18);x.fillStyle='#9bc3d0';x.fillText(E('seriesStable').value==='yes'?'equilibrium sensor data ready':'allow gas to equilibrate',left,top+sh+27);
 E('seriesSensor').value=E('seriesStable').value==='yes'?('T='+z.T.toFixed(1)+' °C · P='+z.P.toFixed(1)+' kPa'):'stabilising…';
}
function recordSeries(){
 const idx=s.series.points.length,expected=SERIES_V[idx];if(expected==null){E('seriesMsg').className='notice ok';E('seriesMsg').textContent='All prescribed equilibrium volumes are recorded.';return}
 const V=+E('seriesVolume').value;if(V!==expected){E('seriesMsg').className='notice warn';E('seriesMsg').textContent='Follow the prescribed sequence. The next syringe setting is '+expected+' cc.';return}
 if(E('seriesStable').value!=='yes'){E('seriesMsg').className='notice warn';E('seriesMsg').textContent='Wait until pressure and temperature are stable before recording.';return}
 const e=seriesTruth(V),T=+E('seriesStudentT').value,P=+E('seriesStudentP').value;if(!Number.isFinite(T)||!Number.isFinite(P)){E('seriesMsg').className='notice warn';E('seriesMsg').textContent='Read and enter both sensor values.';return}
 if(Math.abs(T-e.T)>.15||Math.abs(P-e.P)>.25){E('seriesMsg').className='notice warn';E('seriesMsg').textContent='Re-read the stable temperature and absolute pressure from the sensor display.';return}
 s.series.points.push({V,T,P});s.series.draft={};s.series.tableChecked=false;s.series.fit=null;E('seriesStudentT').value='';E('seriesStudentP').value='';E('seriesStable').value='no';if(SERIES_V[idx+1]!=null)E('seriesVolume').value=String(SERIES_V[idx+1]);
 E('seriesMsg').className='notice ok';E('seriesMsg').textContent=SERIES_V[idx+1]!=null?'Point accepted. Compress to '+SERIES_V[idx+1]+' cc and wait for equilibrium.':'Volume series complete. Fill T(K) and T/P in the table.';renderSeries();save();
}
function renderSeries(){
 drawSeries();const byV=Object.fromEntries(s.series.points.map(q=>[q.V,q]));E('seriesBody').innerHTML=SERIES_V.map(V=>{const p=byV[V],d=s.series.draft[V]||{};return'<tr><td>'+V+'</td><td>'+(p?p.T.toFixed(1):'—')+'</td><td>'+(p?p.P.toFixed(1):'—')+'</td><td>'+(p?'<input class="series-calc" data-v="'+V+'" data-key="K" type="number" step=".01" value="'+(d.K??'')+'">':'—')+'</td><td>'+(p?'<input class="series-calc" data-v="'+V+'" data-key="TP" type="number" step=".0001" value="'+(d.TP??'')+'">':'—')+'</td></tr>'}).join('');
 document.querySelectorAll('.series-calc').forEach(el=>el.addEventListener('input',()=>{const V=el.dataset.v;s.series.draft[V]=s.series.draft[V]||{};s.series.draft[V][el.dataset.key]=el.value.trim()===''?null:+el.value;save()}));
 if(s.series.tableChecked){const pts=s.series.points.map(p=>({x:(p.T+273.15)/p.P,y:p.V}));U.plot(E('seriesChart'),[{pts}],{xlabel:'T/P / K·kPa⁻¹',ylabel:'syringe volume / cc',ymin:0});}else blank('seriesChart','Validate the T(K) and T/P table to unlock V versus T/P.');
 E('seriesMolesOut').textContent=s.series.fit?s.series.fit.n.toFixed(6)+' mol':'—';E('seriesV0Out').textContent=s.series.fit?s.series.fit.V0.toFixed(2)+' cc':'—';
}
function checkSeriesTable(){
 if(s.series.points.length!==SERIES_V.length){E('seriesTableMsg').className='notice warn';E('seriesTableMsg').textContent='Record all prescribed equilibrium volumes first.';return}
 for(const p of s.series.points){const d=s.series.draft[p.V]||{},K=+d.K,TP=+d.TP,eK=p.T+273.15,eTP=eK/p.P;if(!Number.isFinite(K)||!Number.isFinite(TP)){E('seriesTableMsg').className='notice warn';E('seriesTableMsg').textContent='Complete both calculated columns for every row.';return}if(Math.abs(K-eK)>.08||Math.abs(TP-eTP)>.0015){E('seriesTableMsg').className='notice warn';E('seriesTableMsg').textContent='Recheck the row at V='+p.V+' cc: T(K)=θ+273.15 and T/P uses absolute pressure.';return}}
 s.series.tableChecked=true;s.series.fit=null;E('seriesTableMsg').className='notice ok';E('seriesTableMsg').textContent='Calculation table accepted. Fit V against T/P.';renderSeries();save();
}
function seriesFitExpected(){
 if(!s.series.tableChecked)return null;const ps=s.series.points.map(p=>({x:(p.T+273.15)/p.P,y:p.V})),f=linfit(ps);return{slope:f.b,intercept:f.a,n:f.b/(1000*R),V0:-f.a};
}
function checkSeriesFit(){
 const e=seriesFitExpected();if(!e){E('seriesTableMsg').className='notice warn';E('seriesTableMsg').textContent='Validate the table first.';return}
 const slope=+E('seriesSlope').value,int=+E('seriesIntercept').value,n=+E('seriesMoles').value,V0=+E('seriesV0').value;if([slope,int,n,V0].some(v=>!Number.isFinite(v))||slope<=0||n<=0||V0<=0){E('seriesTableMsg').className='notice warn';E('seriesTableMsg').textContent='Enter slope, intercept, n and V₀.';return}
 if(Math.abs(slope-e.slope)>Math.max(.5,.012*e.slope)||Math.abs(int-e.intercept)>.25){E('seriesTableMsg').className='notice warn';E('seriesTableMsg').textContent='Refit V against T/P and re-read slope and intercept.';return}
 if(Math.abs(n-slope/(1000*R))>0.000003){E('seriesTableMsg').className='notice warn';E('seriesTableMsg').textContent='Use slope=1000 nR for V in cc and P in kPa.';return}
 if(Math.abs(V0+int)>.08){E('seriesTableMsg').className='notice warn';E('seriesTableMsg').textContent='The x-axis form is V=slope(T/P)−V₀, so V₀=−intercept.';return}
 s.series.fit={slope,intercept:int,n,V0};E('seriesTableMsg').className='notice ok';E('seriesTableMsg').textContent='Volume-series fit accepted. Compare this V₀ with the rapid-compression result.';renderSeries();save();
}
function zeroPressure(T){
 const base=s.run.nZero*R*(T+273.15)/VS_M3/1000,bias=.12*Math.sin(T*.13+s.run.phase);return q(base+bias,.1);
}
function drawZero(){
 const q=setupCanvas('zeroCanvas'),{x,w,h}=q,T=+E('zeroBath').value,P=zeroPressure(T);x.fillStyle='#071713';x.fillRect(0,0,w,h);x.fillStyle='#25505e';x.fillRect(w*.12,h*.30,w*.42,h*.48);x.fillStyle='rgba(91,174,208,.55)';x.fillRect(w*.14,h*.34,w*.38,h*.40);x.fillStyle='#d4dfe2';x.beginPath();x.arc(w*.34,h*.52,53,0,Math.PI*2);x.fill();x.strokeStyle='#607983';x.lineWidth=4;x.stroke();
 x.fillStyle='#d7e8ec';x.font='700 13px system-ui';x.fillText('sealed sphere · '+T+'°C bath',w*.12,h*.23);x.fillStyle='#9ec3cf';x.font='600 12px system-ui';x.fillText(E('zeroStable').value==='yes'?'sensor: T='+T.toFixed(1)+'°C, P='+P.toFixed(1)+' kPa':'waiting for thermal equilibrium',w*.12,h*.84);
 E('zeroSensor').value=E('zeroStable').value==='yes'?('T='+T.toFixed(1)+' °C · P='+P.toFixed(1)+' kPa'):'stabilising…';
}
function renderZeroProcedure(){
 const key=['connect','set10','immerse'][s.zero.stage],done=s.zero.stage>=3;E('zeroActionBox').style.display=done?'none':'grid';
 if(!done){E('zeroActionChoice').innerHTML='<option value="">Select the operation you would perform…</option>'+Object.keys(ZERO_ACTIONS).map(k=>'<option value="'+k+'">'+ZERO_ACTIONS[k]+'</option>').join('');E('zeroActionChoice').value=''}drawZero();
}
function performZeroAction(){
 const key=['connect','set10','immerse'][s.zero.stage],choice=E('zeroActionChoice').value;if(!key)return;if(choice!==key){E('zeroMsg').className='notice warn';E('zeroMsg').textContent='That operation is out of sequence.';return}
 s.zero.stage++;E('zeroMsg').className='notice ok';E('zeroMsg').textContent=s.zero.stage>=3?'Acquisition started in the hot bath. Record the stable 80°C point, then cool in 10°C steps.':'Operation completed. Continue with the next setup step.';renderZero();save();
}
function recordZeroPoint(){
 if(s.zero.stage<3){E('zeroMsg').className='notice warn';E('zeroMsg').textContent='Complete sensor connection, 10 Hz setup and hot-bath immersion first.';return}
 const idx=s.zero.points.length,expected=ZERO_T[idx];if(expected==null)return;const T=+E('zeroBath').value;if(T!==expected){E('zeroMsg').className='notice warn';E('zeroMsg').textContent='The next bath should be '+expected+'°C.';return}
 if(E('zeroStable').value!=='yes'){E('zeroMsg').className='notice warn';E('zeroMsg').textContent='Wait until the sphere and bath are stable.';return}
 const P=zeroPressure(T),sT=+E('zeroStudentT').value,sP=+E('zeroStudentP').value;if(!Number.isFinite(sT)||!Number.isFinite(sP)||Math.abs(sT-T)>.12||Math.abs(sP-P)>.25){E('zeroMsg').className='notice warn';E('zeroMsg').textContent='Re-read the stable temperature and pressure sensors.';return}
 s.zero.points.push({T:sT,P:sP});s.zero.fit=null;E('zeroStudentT').value='';E('zeroStudentP').value='';E('zeroStable').value='no';if(ZERO_T[idx+1]!=null)E('zeroBath').value=String(ZERO_T[idx+1]);E('zeroMsg').className='notice ok';E('zeroMsg').textContent=ZERO_T[idx+1]!=null?'Point accepted. Add ice to reach '+ZERO_T[idx+1]+'°C and wait for equilibrium.':'Constant-mole cooling series complete. Fit T versus P.';renderZero();save();
}
function zeroFitExpected(){if(s.zero.points.length!==ZERO_T.length)return null;const f=linfit(s.zero.points.map(q=>({x:q.P,y:q.T})));return{slope:f.b,intercept:f.a}}
function checkZeroFit(){
 const e=zeroFitExpected();if(!e){E('zeroFitMsg').className='notice warn';E('zeroFitMsg').textContent='Complete the 80→10°C cooling series first.';return}
 const a=+E('zeroSlope').value,b=+E('zeroIntercept').value,z=+E('zeroAbs').value;if([a,b,z].some(v=>!Number.isFinite(v))||a<=0){E('zeroFitMsg').className='notice warn';E('zeroFitMsg').textContent='Enter the fitted slope and pressure-zero intercept.';return}
 if(Math.abs(a-e.slope)>.015||Math.abs(b-e.intercept)>.7){E('zeroFitMsg').className='notice warn';E('zeroFitMsg').textContent='Fit temperature (°C) against absolute pressure (kPa) and extrapolate to P=0.';return}
 if(Math.abs(z-b)>.15){E('zeroFitMsg').className='notice warn';E('zeroFitMsg').textContent='For T=aP+b, the absolute-zero estimate is the intercept b at P=0.';return}
 s.zero.fit={slope:a,T0:z};E('zeroFitMsg').className='notice ok';E('zeroFitMsg').textContent='Constant-mole absolute-zero extrapolation accepted.';renderZero();save();
}
function renderZero(){
 renderZeroProcedure();E('zeroBody').innerHTML=s.zero.points.length?s.zero.points.map(q=>'<tr><td>'+q.T.toFixed(1)+'</td><td>'+q.P.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="2">No stable points yet.</td></tr>';
 if(s.zero.points.length)U.plot(E('zeroChart'),[{pts:s.zero.points.map(q=>({x:q.P,y:q.T}))}],{xlabel:'absolute pressure / kPa',ylabel:'temperature / °C'});else blank('zeroChart','Record stable bath points to build T(P).');
 E('zeroAbsOut').textContent=s.zero.fit?s.zero.fit.T0.toFixed(2)+'°C':'—';
}
function comboAllowed(i){return i===0||s.combos[i-1].complete}
function comboExpectedAction(i){
 const c=s.combos[i],ord=COMBO_ORDERS[i];if(c.complete)return null;if(c.points.length===0&&!c.placed)return'place';if(c.placed&&!c.connected)return'connect';if(c.points.length===3&&c.connected)return'disconnect';return null;
}
function comboActionLabel(i,key){const first=COMBO_ORDERS[i][0];if(key==='place')return'Place the sphere in the '+first+' bath before connecting sensors.';if(key==='connect')return'Reconnect both sensors while the sphere remains in the first bath.';return'Disconnect both pressure and temperature sensors before the next combination.'}
function comboTruth(i,bath){
 const T=BATH_T[bath],n=s.run.comboN[i],biasP=[.18,-.10,.27][i],biasT=[.06,-.04,.09][i],P=n*R*(T+273.15)/VS_M3/1000+biasP+.04*Math.sin(T*.2+i);return{T:q(T+biasT,.1),P:q(P,.1)};
}
function renderCombo(){
 const i=+E('comboSelect').value,c=s.combos[i],ord=COMBO_ORDERS[i],key=comboExpectedAction(i),box=E('comboActionBox');
 if(!comboAllowed(i)){box.style.display='none';E('comboMsg').className='notice warn';E('comboMsg').textContent='Complete and disconnect the sensors for the preceding combination first.'}
 else if(key){box.style.display='grid';E('comboActionChoice').innerHTML='<option value="">Select the operation you would perform…</option><option value="'+key+'">'+comboActionLabel(i,key)+'</option>';E('comboActionChoice').value=''}
 else box.style.display='none';
 const nextBath=ord[Math.min(c.points.length,2)];if(c.points.length<3)E('comboBath').value=nextBath;
 const z=comboTruth(i,E('comboBath').value),ready=c.connected&&c.points.length<3;E('comboSensorT').value=ready&&E('comboStable').value==='yes'?z.T.toFixed(1)+' °C':'—';E('comboSensorP').value=ready&&E('comboStable').value==='yes'?z.P.toFixed(1)+' kPa':'—';
 E('comboBody').innerHTML=s.combos.flatMap((cc,j)=>cc.points.map(p=>'<tr><td>'+(j+1)+'</td><td>'+p.bath+'</td><td>'+p.T.toFixed(1)+'</td><td>'+p.P.toFixed(1)+'</td></tr>')).join('')||'<tr><td colspan="4">No variable-mole points yet.</td></tr>';
 for(let j=0;j<3;j++)E('combo'+j+'Out').textContent=s.combos[j].fit?s.combos[j].fit.T0.toFixed(2)+'°C':'—';E('closestOut').textContent=s.closest!=null?'Combination '+(s.closest+1):'—';
 loadComboFields();
}
function performComboAction(){
 const i=+E('comboSelect').value;if(!comboAllowed(i)){E('comboMsg').className='notice warn';E('comboMsg').textContent='Complete the preceding combination first.';return}
 const c=s.combos[i],key=comboExpectedAction(i),choice=E('comboActionChoice').value;if(!key)return;if(choice!==key){E('comboMsg').className='notice warn';E('comboMsg').textContent='Follow the required connect/disconnect sequence.';return}
 if(key==='place'){c.placed=true;E('comboBath').value=COMBO_ORDERS[i][0];E('comboMsg').textContent='Sphere placed in the first bath. Reconnect both sensors now.'}
 else if(key==='connect'){c.connected=true;E('comboMsg').textContent='Sensors connected. Wait for equilibrium and record the first bath.'}
 else{c.connected=false;c.complete=true;E('comboMsg').textContent='Sensors disconnected. This combination is complete.'}
 E('comboMsg').className='notice ok';renderCombo();save();
}
function recordComboPoint(){
 const i=+E('comboSelect').value,c=s.combos[i],ord=COMBO_ORDERS[i];if(!comboAllowed(i)||!c.connected||c.points.length>=3){E('comboMsg').className='notice warn';E('comboMsg').textContent='Complete the required placement/connection step before recording.';return}
 const expected=ord[c.points.length],bath=E('comboBath').value;if(bath!==expected){E('comboMsg').className='notice warn';E('comboMsg').textContent='Follow the published order. The next bath is '+expected+'.';return}
 if(E('comboStable').value!=='yes'){E('comboMsg').className='notice warn';E('comboMsg').textContent='Wait for thermal equilibrium before recording.';return}
 const z=comboTruth(i,bath),T=+E('comboStudentT').value,P=+E('comboStudentP').value;if(!Number.isFinite(T)||!Number.isFinite(P)||Math.abs(T-z.T)>.15||Math.abs(P-z.P)>.25){E('comboMsg').className='notice warn';E('comboMsg').textContent='Re-read both stable sensors.';return}
 c.points.push({bath,T,P});c.fit=null;E('comboStudentT').value='';E('comboStudentP').value='';E('comboStable').value='no';E('comboMsg').className='notice ok';E('comboMsg').textContent=c.points.length<3?'Point accepted. Move the sphere to the next bath in this combination.':'Third point accepted. Disconnect both sensors before starting the next combination.';renderCombo();save();
}
function comboFitExpected(i){const c=s.combos[i];if(!c.complete||c.points.length!==3)return null;const f=linfit(c.points.map(q=>({x:q.P,y:q.T}))),n=VS_M3*1000/(R*f.b);return{slope:f.b,T0:f.a,n}}
function loadComboFields(){const a=s.combos[+E('comboAnalysisSelect').value].fit;E('comboSlope').value=a?a.slope:'';E('comboAbs').value=a?a.T0:'';E('comboMoles').value=a?a.n:''}
function checkComboFit(){
 const i=+E('comboAnalysisSelect').value,e=comboFitExpected(i);if(!e){E('comboFitMsg').className='notice warn';E('comboFitMsg').textContent='Complete all three baths and disconnect sensors for the selected combination first.';return}
 const slope=+E('comboSlope').value,T0=+E('comboAbs').value,n=+E('comboMoles').value;if([slope,T0,n].some(v=>!Number.isFinite(v))||slope<=0||n<=0){E('comboFitMsg').className='notice warn';E('comboFitMsg').textContent='Enter slope, absolute-zero intercept and mole amount.';return}
 if(Math.abs(slope-e.slope)>.02||Math.abs(T0-e.T0)>.8){E('comboFitMsg').className='notice warn';E('comboFitMsg').textContent='Fit T(°C) versus P(kPa) for this combination.';return}
 const en=VS_M3*1000/(R*slope);if(Math.abs(n-en)>0.000005){E('comboFitMsg').className='notice warn';E('comboFitMsg').textContent='With the 100.0 mL virtual sphere, use n=V·1000/(R·dT/dP) for P in kPa.';return}
 s.combos[i].fit={slope,T0,n};s.closest=null;E('closestCombo').value='';E('comboFitMsg').className='notice ok';E('comboFitMsg').textContent='Selected variable-mole fit accepted.';renderCombo();save();
}
function checkClosest(){
 if(s.combos.some(c=>!c.fit)){E('comboFitMsg').className='notice warn';E('comboFitMsg').textContent='Validate all three combination fits first.';return}
 const expected=s.combos.map((c,i)=>({i,d:Math.abs(c.fit.T0+273.15)})).sort((a,b)=>a.d-b.d)[0].i,v=+E('closestCombo').value;if(!E('closestCombo').value){E('comboFitMsg').className='notice warn';E('comboFitMsg').textContent='Choose the combination closest to −273.15°C.';return}
 if(v!==expected){E('comboFitMsg').className='notice warn';E('comboFitMsg').textContent='Compare the three extrapolated pressure-zero intercepts numerically.';return}
 s.closest=v;E('comboFitMsg').className='notice ok';E('comboFitMsg').textContent='Comparison accepted.';renderCombo();save();
}
function buildReport(){
 const r=s.rapid,p=s.series,z=s.zero,cs=s.combos,summary='<p><b>Run:</b> '+U.esc(s.run.id)+'.</p><p><b>Rapid compression:</b> '+(r.iso?'V₀='+r.iso.V0.toFixed(2)+' cc':'dead-volume analysis incomplete')+(r.pvt?', PVT difference='+r.pvt.diff.toFixed(2)+'%.':'.')+'</p><p><b>Stepped series:</b> '+(p.fit?'n='+p.fit.n.toFixed(6)+' mol, V₀='+p.fit.V0.toFixed(2)+' cc.':'analysis incomplete.')+'</p><p><b>Constant-mole absolute zero:</b> '+(z.fit?z.fit.T0.toFixed(2)+'°C':'not validated')+'. <b>Variable-mole combinations:</b> '+cs.map((c,i)=>c.fit?'#'+(i+1)+' '+c.fit.T0.toFixed(2)+'°C, n='+c.fit.n.toFixed(6):'#'+(i+1)+' incomplete').join(' · ')+'. <b>Closest:</b> '+(s.closest!=null?'combination '+(s.closest+1):'not selected')+'.</p>';
 return U.report('Laboratory Practical 4 — Ideal-Gas Laws & Absolute Zero',summary);
}
function renderAll(){renderRapidProcedure();renderRapidResults();renderSeries();renderZero();renderCombo()}
U.tabs();E('sphereVolumeBrief').textContent=VSPHERE_ML.toFixed(1)+' mL';
E('rapidPerformAction').onclick=performRapid;E('rapidCursor').addEventListener('input',drawRapid);E('checkRapidIso').onclick=checkRapidIso;E('checkRapidPvt').onclick=checkRapidPvt;
['seriesVolume','seriesStable'].forEach(id=>E(id).addEventListener('change',drawSeries));E('recordSeries').onclick=recordSeries;E('checkSeriesTable').onclick=checkSeriesTable;E('checkSeriesFit').onclick=checkSeriesFit;
E('zeroPerformAction').onclick=performZeroAction;['zeroBath','zeroStable'].forEach(id=>E(id).addEventListener('change',drawZero));E('recordZeroPoint').onclick=recordZeroPoint;E('checkZeroFit').onclick=checkZeroFit;
E('comboSelect').addEventListener('change',()=>{E('comboStable').value='no';renderCombo()});E('comboBath').addEventListener('change',renderCombo);E('comboStable').addEventListener('change',renderCombo);E('comboPerformAction').onclick=performComboAction;E('recordComboPoint').onclick=recordComboPoint;E('comboAnalysisSelect').addEventListener('change',loadComboFields);E('checkComboFit').onclick=checkComboFit;E('checkClosest').onclick=checkClosest;
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
if(s.rapid.iso){E('rapidV2').value=s.rapid.iso.V2;E('rapidP1').value=s.rapid.iso.P1;E('rapidP2').value=s.rapid.iso.P2;E('rapidPV1').value=s.rapid.iso.pv1;E('rapidPV2').value=s.rapid.iso.pv2;E('rapidV0').value=s.rapid.iso.V0}if(s.rapid.pvt){E('rapidT1').value=s.rapid.pvt.T1;E('rapidPmax').value=s.rapid.pvt.Pmax;E('rapidTmax').value=s.rapid.pvt.Tmax;E('rapidRatio1').value=s.rapid.pvt.r1;E('rapidRatio2').value=s.rapid.pvt.r2;E('rapidRatioDiff').value=s.rapid.pvt.diff}
if(s.series.fit){E('seriesSlope').value=s.series.fit.slope;E('seriesIntercept').value=s.series.fit.intercept;E('seriesMoles').value=s.series.fit.n;E('seriesV0').value=s.series.fit.V0}
if(s.zero.fit){E('zeroSlope').value=s.zero.fit.slope;E('zeroIntercept').value=s.zero.fit.T0;E('zeroAbs').value=s.zero.fit.T0}
window.addEventListener('resize',()=>{drawRapid();drawSeries();drawZero();renderCombo()});renderAll();save();
})();