(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W06_v2',OLD='VOM_W06_v1',FREQ=40000,C_SOUND=343.2,LAMBDA=C_SOUND/FREQ;
const current=U.load(K,null),old=U.load(OLD,null);
let s=current||{version:2,readings:{},analysis:null,conclusion:'',seed:Math.random()*1000};
if(!current&&old)s={version:2,readings:{},analysis:null,conclusion:'',seed:Math.random()*1000};
s.readings=s.readings||{};s.conclusion=s.conclusion||'';if(!Number.isFinite(s.seed))s.seed=Math.random()*1000;
function save(){U.save(K,s)}
function key(d,m){return d+'|'+m}
function targetAngle(dmm,m){
  const q=m*LAMBDA/(dmm/1000);if(q>=1)return null;
  const a=Math.asin(q)*180/Math.PI;return a<=50?a:null;
}
function pulseStable(){return E('trigger').value==='tx'&&+E('pulsePeriod').value>=10&&+E('pulsePeriod').value<=25}
function noise(angle,d){
  const z=Math.sin((angle*17.13+d*3.71+s.seed)*12.9898)*43758.5453;
  return((z-Math.floor(z))-.5)*.018;
}
function signal(angle,dmm){
  let a=Math.exp(-.5*(angle/1.0)**2);
  for(let m=1;m<=6;m++){
    const t=targetAngle(dmm,m);if(t==null)continue;
    const h=.82/Math.sqrt(m),w=.72+.08*m;
    a+=h*Math.exp(-.5*((angle-t)/w)**2)+h*Math.exp(-.5*((angle+t)/w)**2);
  }
  return Math.max(0,a+noise(angle,dmm));
}
function selectedTarget(){
  const d=+E('spacing').value,m=+E('order').value,t=targetAngle(d,m);
  if(t==null)return null;return E('side').value==='plus'?t:-t;
}
function draw(){
  const {x,w,h}=U.canvas(E('diffCanvas')),d=+E('spacing').value,a=+E('angle').value*Math.PI/180,amp=signal(+E('angle').value,d),cx=w*.48,cy=h*.55,R=Math.min(w*.36,h*.38);
  x.fillStyle='#eef5f6';x.fillRect(0,0,w,h);
  x.strokeStyle='#5d7381';x.lineWidth=5;x.beginPath();x.moveTo(cx,cy-R*.7);x.lineTo(cx,cy+R*.7);x.stroke();
  for(let y=cy-R*.65;y<=cy+R*.65;y+=12){x.strokeStyle='#9fb0ba';x.lineWidth=1;x.beginPath();x.moveTo(cx-7,y);x.lineTo(cx+7,y);x.stroke();}
  const tx={x:50,y:cy},rx={x:cx+R*Math.cos(a),y:cy-R*Math.sin(a)};
  x.fillStyle='#c76a47';x.fillRect(tx.x-18,tx.y-18,30,36);x.fillStyle='#173e58';x.font='700 11px system-ui';x.fillText('40 kHz TX',tx.x-25,tx.y+34);
  x.strokeStyle='#d3912e';x.lineWidth=2;x.beginPath();x.moveTo(tx.x+12,tx.y);x.lineTo(cx,cy);x.stroke();
  x.strokeStyle='#279db6';x.lineWidth=2.5;x.beginPath();x.moveTo(cx,cy);x.lineTo(rx.x,rx.y);x.stroke();
  x.save();x.translate(rx.x,rx.y);x.rotate(-a);x.fillStyle='#315d72';x.fillRect(-11,-15,22,30);x.restore();
  x.strokeStyle='rgba(37,88,107,.25)';x.lineWidth=1;x.beginPath();x.arc(cx,cy,R,-50*Math.PI/180,50*Math.PI/180);x.stroke();
  for(let deg=-50;deg<=50;deg+=10){const aa=deg*Math.PI/180,px=cx+(R+14)*Math.cos(aa),py=cy-(R+14)*Math.sin(aa);x.fillStyle='#54717e';x.font='10px system-ui';x.fillText(deg+'°',px-8,py+3);}
  const barW=Math.min(170,w*.22),bx=w-barW-22,by=24;x.fillStyle='#d9e4e9';x.fillRect(bx,by,barW,12);x.fillStyle='#27a5bd';x.fillRect(bx,by,barW*Math.min(1,amp),12);x.fillStyle='#173e58';x.fillText('receiver amplitude',bx,by+29);
  E('angleOut').textContent=(+E('angle').value).toFixed(1)+'°';E('ampOut').textContent=amp.toFixed(3);E('pulseState').textContent=pulseStable()?'synchronised':'unstable';E('orderOut').textContent='m='+E('order').value+' '+(E('side').value==='plus'?'+':'−');
}
function reading(d,m){return s.readings[key(d,m)]||(s.readings[key(d,m)]={d,m,plus:null,minus:null,calc:null})}
function markPeak(){
  if(!pulseStable()){E('scanMessage').className='notice warn';E('scanMessage').textContent='Use transmitter synchronisation and a 10–25 ms pulse period before centring a diffraction maximum.';return}
  const d=+E('spacing').value,m=+E('order').value,t=selectedTarget(),a=+E('angle').value;
  if(t==null){E('scanMessage').className='notice warn';E('scanMessage').textContent='This order does not produce an observable maximum inside the available ±50° scan. Choose a lower order or larger grating spacing.';return}
  if(Math.abs(a-t)>.42){E('scanMessage').className='notice warn';E('scanMessage').textContent='The receiver is not centred on the selected diffraction maximum. Scan through the peak and centre the amplitude maximum.';return}
  const r=reading(d,m),side=E('side').value;r[side]=Math.round(a*10)/10;r.calc=null;s.analysis=null;
  E('scanMessage').className='notice ok';E('scanMessage').textContent=(side==='plus'?'+':'−')+m+' peak recorded at '+r[side].toFixed(1)+'°. Record the opposite side before calculating λ.';
  renderAll();save();
}
function pairComplete(r){return Number.isFinite(r?.plus)&&Number.isFinite(r?.minus)}
function pairOptions(){
  const pairs=Object.values(s.readings).filter(pairComplete).sort((a,b)=>a.d-b.d||a.m-b.m),prev=E('pairSelect').value;
  E('pairSelect').innerHTML=pairs.length?pairs.map(r=>'<option value="'+key(r.d,r.m)+'">d='+r.d+' mm · m='+r.m+'</option>').join(''):'<option value="">Record a ± pair first</option>';
  if(pairs.some(r=>key(r.d,r.m)===prev))E('pairSelect').value=prev;
  loadPairCalc();
}
function loadPairCalc(){
  const r=s.readings[E('pairSelect').value];['studentTheta','studentLambda','studentC'].forEach(id=>E(id).value='');
  if(r?.calc){E('studentTheta').value=r.calc.theta;E('studentLambda').value=r.calc.lambda;E('studentC').value=r.calc.c;}
}
function checkPair(){
  const r=s.readings[E('pairSelect').value];if(!pairComplete(r)){E('pairMessage').className='notice warn';E('pairMessage').textContent='Record both +m and −m angular maxima first.';return}
  const theta=(Math.abs(r.plus)+Math.abs(r.minus))/2,lambda=(r.d/1000)*Math.sin(theta*Math.PI/180)/r.m,c=FREQ*lambda;
  const raw=['studentTheta','studentLambda','studentC'].map(id=>E(id).value.trim());if(raw.some(v=>v==='')){E('pairMessage').className='notice warn';E('pairMessage').textContent='Enter mean |θm|, λ and c.';return}
  const [st,sl,sc]=raw.map(Number);
  if(Math.abs(st-theta)>.08){E('pairMessage').className='notice warn';E('pairMessage').textContent='Recalculate the mean magnitude of the +m and −m angles.';return}
  if(Math.abs(sl-lambda)>.00008){E('pairMessage').className='notice warn';E('pairMessage').textContent='Recalculate λ=d sinθm/m with d in metres.';return}
  if(Math.abs(sc-c)>4){E('pairMessage').className='notice warn';E('pairMessage').textContent='Recalculate c=fλ using f=40.0 kHz.';return}
  r.calc={theta:st,lambda:sl,c:sc};s.analysis=null;E('pairMessage').className='notice ok';E('pairMessage').textContent='Diffraction calculation accepted. Repeat with other orders and grating spacings.';
  renderAll();save();
}
function validated(){return Object.values(s.readings).filter(r=>r.calc)}
function coverage(){
  const v=validated(),ds=new Set(v.map(r=>r.d)),ms=new Set(v.map(r=>r.m));
  return v.length>=6&&ds.size>=2&&ms.size>=2;
}
function originSlope(ps){let xy=0,xx=0;ps.forEach(p=>{xy+=p.x*p.y;xx+=p.x*p.x});return xx?xy/xx:NaN}
function fit(){
  if(!coverage())return null;
  const ps=validated().map(r=>({x:r.m/(r.d/1000),y:Math.sin(r.calc.theta*Math.PI/180)})),slope=originSlope(ps);
  return{ps,lambda:slope,c:FREQ*slope};
}
function checkAnalysis(){
  const q=fit();if(!q){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Validate at least six diffraction pairs spanning at least two spacings and two orders.';return}
  const l=+E('studentFitLambda').value,c=+E('studentFitC').value;
  if(!Number.isFinite(l)||!Number.isFinite(c)||l<=0||c<=0){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Enter the grating-law slope λ and the corresponding sound speed.';return}
  if(Math.abs(l-q.lambda)>.00008){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Re-read the origin-constrained slope of sinθm versus m/d.';return}
  if(Math.abs(c-FREQ*l)>4){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate c=fλ from your fitted wavelength.';return}
  s.analysis={lambda:l,c};E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Ultrasonic grating-law fit accepted. Discuss symmetry, finite peak width and angular centring uncertainty.';
  renderAll();save();
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function chart(){
  const q=fit();if(q)U.plot(E('gratingChart'),[{pts:q.ps}],{xlabel:'m/d (m⁻¹)',ylabel:'sin θm',xmin:0,ymin:0});else blank(E('gratingChart'),'Validate ≥6 symmetric diffraction pairs to build the grating-law graph.');
}
function renderTable(){
  const rows=Object.values(s.readings).filter(r=>r.plus!=null||r.minus!=null).sort((a,b)=>a.d-b.d||a.m-b.m);
  E('angleBody').innerHTML=rows.length?rows.map(r=>'<tr><td>'+r.d+'</td><td>'+r.m+'</td><td>'+(r.minus!=null?r.minus.toFixed(1):'—')+'</td><td>'+(r.plus!=null?r.plus.toFixed(1):'—')+'</td><td>'+(r.calc?'validated':pairComplete(r)?'calculate λ':'need opposite side')+'</td></tr>').join(''):'<tr><td colspan="5">No diffraction peaks recorded yet.</td></tr>';
  const v=validated(),pairs=Object.values(s.readings).filter(pairComplete),ds=new Set(v.map(r=>r.d)).size,ms=new Set(v.map(r=>r.m)).size;
  E('scanProgress').innerHTML='<div class="item '+(pairs.length>=6?'done':'')+'">'+(pairs.length>=6?'✓':'○')+' ≥6 symmetric angular pairs ('+pairs.length+')</div><div class="item '+(v.length>=6?'done':'')+'">'+(v.length>=6?'✓':'○')+' ≥6 validated λ results ('+v.length+')</div><div class="item '+(ds>=2?'done':'')+'">'+(ds>=2?'✓':'○')+' ≥2 grating spacings</div><div class="item '+(ms>=2?'done':'')+'">'+(ms>=2?'✓':'○')+' ≥2 diffraction orders</div>';
  E('countOut').textContent=v.length;E('lambdaOut').textContent=s.analysis?s.analysis.lambda.toFixed(6)+' m':'—';E('cOut').textContent=s.analysis?s.analysis.c.toFixed(1)+' m/s':'—';
  E('meanCOut').textContent=v.length?(v.reduce((a,r)=>a+r.calc.c,0)/v.length).toFixed(1)+' m/s':'—';
}
function status(){
  const done=!!s.analysis&&s.conclusion.trim().length>=30;if(done){E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Ultrasonic diffraction analysis complete. The final report should compare the pairwise and fitted wavelength/sound-speed estimates.';}
}
function renderAll(){draw();renderTable();pairOptions();chart();status();}
function buildReport(){
  const v=validated(),summary='<p><b>Validated diffraction pairs:</b> '+v.length+'. '+(s.analysis?'<b>Fitted λ:</b> '+s.analysis.lambda.toFixed(6)+' m; <b>sound speed:</b> '+s.analysis.c.toFixed(1)+' m/s.':'Final fit incomplete.')+'</p><p><b>Interpretation:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>';
  return U.report('Waves Laboratory Practical 6 — Ultrasonic Diffraction',summary);
}
U.tabs();E('diffConclusion').value=s.conclusion;
['spacing','angle','pulsePeriod','trigger','order','side'].forEach(id=>E(id).addEventListener('input',draw));E('markPeak').onclick=markPeak;
E('pairSelect').addEventListener('change',loadPairCalc);E('checkPair').onclick=checkPair;E('checkAnalysis').onclick=checkAnalysis;
E('diffConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;status();save();});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
if(s.analysis){E('studentFitLambda').value=s.analysis.lambda;E('studentFitC').value=s.analysis.c;}
window.addEventListener('resize',renderAll);renderAll();save();
})();