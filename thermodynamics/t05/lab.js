(()=>{'use strict';
const U=ThermoUI,E=id=>document.getElementById(id),K='THERMO_T05_v2',TAU=Math.PI*2;
function q(x,step){return Math.round(x/step)*step}
function makeRun(){return{id:'T05-'+Math.random().toString(36).slice(2,7).toUpperCase(),Rh:4.6+Math.random()*.45,ambient:22.5+Math.random()*2.0,friction:.48+Math.random()*.16,phase:Math.random()*6.28}}
let s=U.load(K,null);
if(!s||s.version!==2)s={version:2,run:makeRun(),points:[],analyses:{},interpretation:''};
s.points=Array.isArray(s.points)?s.points:[];s.analyses=s.analyses||{};s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function pointKey(U,tau){return(+U).toFixed(1)+'|'+(+tau).toFixed(3)}
function model(){
 const U=+E('heaterV').value,tau=+E('torque').value,I=U/s.run.Rh,thermal=U*I,heatFrac=(U-7.5)/4.5,stall=.022+.026*Math.max(0,heatFrac),loadFrac=tau/stall;
 const Th=s.run.ambient+90+155*Math.max(0,heatFrac)-28*Math.max(0,loadFrac),Tc=s.run.ambient+6+14*Math.max(0,heatFrac)+9*Math.max(0,loadFrac);
 let rpm=(430+850*Math.max(0,heatFrac))*Math.max(0,1-Math.pow(Math.max(0,loadFrac),1.28));rpm=Math.max(0,rpm);
 const shaft=TAU*(rpm/60)*tau,indicated=shaft+s.run.friction*(.72+.28*Math.max(0,heatFrac))*(rpm>0?1:.15),work=rpm>5?indicated/(rpm/60):.03;
 const carnot=1-(Tc+273.15)/(Th+273.15),eta=thermal>0?shaft/thermal:0;
 const vamp=5.4e-6,pmean=101300+900*Math.max(0,heatFrac),phi=.58+.10*Math.max(0,loadFrac),pamp=Math.max(1500,work/(Math.PI*vamp*Math.max(.15,Math.sin(phi))));
 const pts=[];for(let i=0;i<=180;i++){const a=TAU*i/180,V=40e-6+vamp*Math.cos(a),P=pmean+pamp*Math.cos(a-phi);pts.push({V,P})}
 return{U:q(U,.01),tau:q(tau,.001),I:q(I,.001),Th:q(Th,.1),Tc:q(Tc,.1),rpm:q(rpm,1),thermal,shaft,indicated,work,carnot,eta,pts,stall};
}
function setupCanvas(){const c=E('engineCanvas'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
let anim=0;
function drawEngine(){
 const{x,w,h}=setupCanvas(),m=model();x.fillStyle='#071713';x.fillRect(0,0,w,h);x.fillStyle='#243b43';x.fillRect(w*.12,h*.65,w*.76,h*.08);
 x.strokeStyle='#a9c2cc';x.lineWidth=6;x.strokeRect(w*.25,h*.27,w*.50,h*.34);x.fillStyle='#d97747';x.fillRect(w*.68,h*.27,w*.07,h*.34);x.fillStyle='#62a9c8';x.fillRect(w*.25,h*.27,w*.07,h*.34);
 const speed=m.rpm/900,ang=anim,xp=w*(.47+.13*Math.sin(ang)),yp=h*.31;x.fillStyle='#cbd8df';x.fillRect(xp,yp,18,h*.26);
 x.strokeStyle='#e4edf0';x.lineWidth=3;x.beginPath();x.arc(w*.50,h*.76,34,0,TAU);x.stroke();x.beginPath();x.moveTo(w*.50,h*.76);x.lineTo(w*.50+31*Math.cos(ang),h*.76+31*Math.sin(ang));x.stroke();
 x.fillStyle='#dcebed';x.font='700 12px system-ui';x.fillText('cold side',w*.24,h*.21);x.fillText('hot side',w*.68,h*.21);x.fillStyle='#9ebac4';x.font='600 12px system-ui';x.fillText('virtual flywheel '+m.rpm.toFixed(0)+' rpm',w*.39,h*.90);
 E('heaterVSet').textContent=(+E('heaterV').value).toFixed(1)+' V';E('torqueSet').textContent=(+E('torque').value).toFixed(3)+' N·m';
 anim+=Math.max(.015,m.rpm/9000);requestAnimationFrame(drawEngine);
}
function clearBenchInputs(){['studentTh','studentTc','studentV','studentI','studentRpm','studentTorque'].forEach(id=>E(id).value='')}
function recordPoint(){
 const m=model();if(m.rpm<80){E('benchMsg').className='notice warn';E('benchMsg').textContent='This brake load stalls the virtual engine. Reduce torque before taking a steady operating point.';return}
 const ids=['studentTh','studentTc','studentV','studentI','studentRpm','studentTorque'],raw=ids.map(id=>E(id).value.trim());if(raw.some(v=>v==='')){E('benchMsg').className='notice warn';E('benchMsg').textContent='Read and enter all six instruments before recording.';return}
 const [Th,Tc,U,I,rpm,tau]=raw.map(Number);if([Th,Tc,U,I,rpm,tau].some(v=>!Number.isFinite(v))||I<=0||rpm<=0||tau<0){E('benchMsg').className='notice warn';E('benchMsg').textContent='Enter valid instrument readings.';return}
 if(Math.abs(Th-m.Th)>.25||Math.abs(Tc-m.Tc)>.25){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the hot- and cold-side thermometers to 0.1°C.';return}
 if(Math.abs(U-m.U)>.03||Math.abs(I-m.I)>.006){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the heater voltmeter and ammeter.';return}
 if(Math.abs(rpm-m.rpm)>4||Math.abs(tau-m.tau)>.0015){E('benchMsg').className='notice warn';E('benchMsg').textContent='Re-read the tachometer and brake-torque scale.';return}
 const rec={key:pointKey(U,tau),Th,Tc,U,I,rpm,tau,work:m.work,pts:m.pts};const k=s.points.findIndex(p=>p.key===rec.key);if(k>=0)s.points[k]=rec;else s.points.push(rec);delete s.analyses[rec.key];
 E('benchMsg').className='notice ok';E('benchMsg').textContent='Steady operating point accepted. Change load and/or heater setting, or analyse this point from its p–V loop.';clearBenchInputs();renderAll();save();
}
function syncAnalysisOptions(){
 const prev=E('analysisPoint').value;E('analysisPoint').innerHTML=s.points.length?s.points.map((p,i)=>'<option value="'+p.key+'">#'+(i+1)+' · U='+p.U.toFixed(1)+' V · τ='+p.tau.toFixed(3)+' N·m · '+p.rpm.toFixed(0)+' rpm</option>').join(''):'<option value="">Record an operating point first</option>';
 if(s.points.some(p=>p.key===prev))E('analysisPoint').value=prev;loadAnalysisFields();
}
function selectedPoint(){return s.points.find(p=>p.key===E('analysisPoint').value)||null}
function expectedFor(p){
 if(!p)return null;const thermal=p.U*p.I,shaft=TAU*(p.rpm/60)*p.tau,ind=p.work*(p.rpm/60),eta=100*shaft/thermal,carnot=100*(1-(p.Tc+273.15)/(p.Th+273.15));return{work:p.work,ind,shaft,thermal,eta,carnot};
}
function drawPV(){
 const p=selectedPoint();if(!p){blank('pvChart','Record an operating point first.');return}U.plot(E('pvChart'),[{pts:p.pts.map(z=>({x:z.V*1e6,y:z.P/1000}))}],{xlabel:'volume / cm³',ylabel:'pressure / kPa'});
}
function blank(id,msg){const q=U.canvas(E(id));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function loadAnalysisFields(){
 const p=selectedPoint(),a=p?s.analyses[p.key]:null,ids=['studentWork','studentIndPower','studentShaftPower','studentThermalPower','studentEta','studentCarnot'];ids.forEach(id=>E(id).value='');if(a)[a.work,a.ind,a.shaft,a.thermal,a.eta,a.carnot].forEach((v,i)=>E(ids[i]).value=v);drawPV();
}
function checkPoint(){
 const p=selectedPoint(),e=expectedFor(p);if(!e){E('pointMsg').className='notice warn';E('pointMsg').textContent='Record an operating point first.';return}
 const ids=['studentWork','studentIndPower','studentShaftPower','studentThermalPower','studentEta','studentCarnot'],v=ids.map(id=>+E(id).value);if(v.some(z=>!Number.isFinite(z))){E('pointMsg').className='notice warn';E('pointMsg').textContent='Enter all p–V, power and efficiency calculations.';return}
 const [work,ind,shaft,thermal,eta,carnot]=v;
 if(Math.abs(work-e.work)>Math.max(.006,.06*e.work)){E('pointMsg').className='notice warn';E('pointMsg').textContent='Re-estimate the area enclosed by the p–V loop; its units convert directly to joules (Pa·m³).';return}
 if(Math.abs(ind-work*(p.rpm/60))>Math.max(.02,.03*Math.max(e.ind,.1))){E('pointMsg').className='notice warn';E('pointMsg').textContent='Recalculate indicated power = Wcycle × N/60.';return}
 if(Math.abs(shaft-TAU*(p.rpm/60)*p.tau)>Math.max(.02,.03*Math.max(e.shaft,.1))){E('pointMsg').className='notice warn';E('pointMsg').textContent='Recalculate shaft power = 2π(N/60)τ.';return}
 if(Math.abs(thermal-p.U*p.I)>Math.max(.05,.02*e.thermal)){E('pointMsg').className='notice warn';E('pointMsg').textContent='Recalculate thermal/electrical heater input as UI.';return}
 if(Math.abs(eta-100*shaft/thermal)>.15){E('pointMsg').className='notice warn';E('pointMsg').textContent='Recalculate ηshaft = Pshaft/Pthermal × 100%.';return}
 const ec=100*(1-(p.Tc+273.15)/(p.Th+273.15));if(Math.abs(carnot-ec)>.15){E('pointMsg').className='notice warn';E('pointMsg').textContent='Recalculate the Carnot bound with both temperatures converted to kelvin.';return}
 if(eta>carnot+.2){E('pointMsg').className='notice warn';E('pointMsg').textContent='A real shaft efficiency cannot exceed the Carnot temperature bound; recheck the calculations.';return}
 s.analyses[p.key]={work,ind,shaft,thermal,eta,carnot};E('pointMsg').className='notice ok';E('pointMsg').textContent='Operating-point analysis accepted.';renderAll();save();
}
function renderTable(){
 E('pointCount').textContent=s.points.length+' / 6';const analysed=Object.keys(s.analyses).length;E('analysisCount').textContent=analysed+' / 5';
 E('dataBody').innerHTML=s.points.length?s.points.map(p=>'<tr><td>'+p.U.toFixed(2)+'</td><td>'+p.tau.toFixed(3)+'</td><td>'+p.rpm.toFixed(0)+'</td><td>'+p.Th.toFixed(1)+'</td><td>'+p.Tc.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="5">No accepted operating points yet.</td></tr>';
}
function renderPerformance(){
 const rows=s.points.map(p=>({p,a:s.analyses[p.key]})).filter(q=>q.a);
 if(rows.length){U.plot(E('powerChart'),[{pts:rows.map(q=>({x:q.p.tau,y:q.a.shaft})),color:'#2baac3'},{pts:rows.map(q=>({x:q.p.tau,y:q.a.ind})),color:'#df8746'}],{xlabel:'brake torque / N·m',ylabel:'power / W',xmin:0,ymin:0});}else blank('powerChart','Analyse operating points to build shaft/indicated-power curves.');
 if(rows.length){const max=rows.reduce((a,b)=>b.a.shaft>a.a.shaft?b:a),best=rows.reduce((a,b)=>b.a.eta>a.a.eta?b:a);E('maxPowerOut').textContent=max.a.shaft.toFixed(2)+' W';E('bestEtaOut').textContent=best.a.eta.toFixed(2)+'%';}else{E('maxPowerOut').textContent='—';E('bestEtaOut').textContent='—'}
 const torques=rows.map(q=>q.p.tau),coverage=rows.length>=5&&Math.min(...torques)<=.005&&Math.max(...torques)>=.025,words=s.interpretation.trim().length>=70;E('performanceMsg').className=coverage?'notice ok':'notice';E('performanceMsg').textContent=coverage?'Load range is broad enough to identify the shaft-power maximum and efficiency trend.':'Analyse at least five points including near-zero load and a brake torque of at least 0.025 N·m.';
 E('progress').innerHTML='<div class="item '+(s.points.length>=6?'done':'')+'">'+(s.points.length>=6?'✓':'○')+' ≥6 steady operating points ('+s.points.length+')</div><div class="item '+(coverage?'done':'')+'">'+(coverage?'✓':'○')+' ≥5 analysed points with broad load coverage</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' loss/efficiency interpretation</div>';
}
function renderAll(){renderTable();syncAnalysisOptions();renderPerformance()}
function newRun(){
 if(s.points.length&&!confirm('Start a new Stirling-engine extension specimen? Existing points will be cleared.'))return;s={version:2,run:makeRun(),points:[],analyses:{},interpretation:''};E('heaterV').value=12;E('torque').value=0;E('interpretation').value='';clearBenchInputs();renderAll();save();
}
function buildReport(){
 const rows=s.points.map(p=>({p,a:s.analyses[p.key]})).filter(q=>q.a),max=rows.length?rows.reduce((a,b)=>b.a.shaft>a.a.shaft?b:a):null,best=rows.length?rows.reduce((a,b)=>b.a.eta>a.a.eta?b:a):null;
 const summary='<p><b>Scope:</b> reviewed digital extension; the official USTHB public manual confirms the Stirling-engine title but its retrievable copy ends before the detailed Practical 5 procedure.</p><p><b>Accepted operating points:</b> '+s.points.length+'; analysed: '+rows.length+'.</p><p><b>Maximum measured shaft power:</b> '+(max?max.a.shaft.toFixed(2)+' W':'not established')+'. <b>Best measured shaft efficiency:</b> '+(best?best.a.eta.toFixed(2)+'% (Carnot bound '+best.a.carnot.toFixed(2)+'%)':'not established')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';
 return U.report('Laboratory Practical 5 — Stirling-Engine Study (reviewed extension)',summary);
}
U.tabs();E('interpretation').value=s.interpretation;['heaterV','torque'].forEach(id=>E(id).addEventListener('input',()=>{clearBenchInputs()}));E('recordPoint').onclick=recordPoint;E('newRun').onclick=newRun;E('analysisPoint').addEventListener('change',loadAnalysisFields);E('checkPoint').onclick=checkPoint;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;renderPerformance();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',()=>{drawPV();renderPerformance()});drawEngine();renderAll();save();
})();