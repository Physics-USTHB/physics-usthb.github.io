(()=>{
'use strict';
const U=OpticsUI,E=id=>document.getElementById(id),K='PhysicsUSTHB_G02_v2',OLD='PhysicsUSTHB_G02_v1',DEG=Math.PI/180;
const lines=[
  ['violet intense',404.7,'#6e44d2'],['violet weak',407.8,'#8051d4'],['blue-indigo',435.8,'#3d5cd4'],['blue-green',491.6,'#2da4be'],
  ['green',546.1,'#35a862'],['yellow doublet',578.0,'#d2a826'],['red intense',623.7,'#d8583d'],['red',690.7,'#b83b35']
];
function wrap(a){a%=360;return a<0?a+360:a}
function adiff(a,b){let d=Math.abs(wrap(a)-wrap(b));return Math.min(d,360-d)}
function dmFor(lambda,A,n0,B){const n=n0+B/((lambda/1000)**2);return 2*Math.asin(n*Math.sin(A*DEG/2))/DEG-A}
function prismD(i,lambda,A,n0,B){
  const n=n0+B/((lambda/1000)**2),r=Math.asin(Math.sin(i*DEG)/n)/DEG,r2=A-r,sinOut=n*Math.sin(r2*DEG);
  if(sinOut>1||sinOut<-1)return null;
  return i+Math.asin(sinOut)/DEG-A;
}
function makeRun(){
  const A=59.9+Math.random()*.25,n0=1.586+Math.random()*.008,B=.0092+Math.random()*.001,theta0=18+Math.random()*18,theta1=116+Math.random()*28,theta2=wrap(theta1+2*A);
  return{A,n0,B,theta0,theta1,theta2,unknown:[435.8+Math.random()*4,546.1+Math.random()*3,650+Math.random()*20]};
}
const current=U.load(K,null),old=U.load(OLD,null),migrating=!current&&!!old,loaded=current||old||{};
let s={
  version:2,
  run:loaded.run||makeRun(),
  zero:loaded.zero??null,
  faces:{...(loaded.faces||{})},
  prismCalc:{A:loaded.prismCalc?.A??null},
  di:Array.isArray(loaded.di)?loaded.di.map(q=>({i:+q.i,theta:q.theta??null,D:+q.D})):[],
  hg:{...(loaded.hg||{})},
  hgDraft:{...(loaded.hgDraft||{})},
  unknown:{...(loaded.unknown||{})},
  unknownDraft:{...(loaded.unknownDraft||{})},
  analysis:{
    green:loaded.analysis?.green||null,
    cauchy:loaded.analysis?.cauchy||null,
    unknown:loaded.analysis?.unknown||null
  }
};
for(const q of Object.values(s.hg)){if(q&&q.n!=null&&!Number.isFinite(+q.n))q.n=null}
if(migrating){
  s.di=[];s.hg={};s.hgDraft={};s.unknown={};s.unknownDraft={};s.analysis={green:null,cauchy:null,unknown:null};
}
function save(){U.save(K,s)}
function fmt(a){a=wrap(a);let d=Math.floor(a),m=Math.round((a-d)*60);if(m===60){d=(d+1)%360;m=0}return d+'°'+String(m).padStart(2,'0')+'′'}
function roundMin(a){return Math.round(a*60)/60}

function slitGood(){return +E('slit').value<=30}
function focusGood(){return +E('focus').value>=78}
function scopeScore(a,t){return adiff(a,t)}
function signedOffset(target,angle){
  let d=wrap(target)-wrap(angle);
  if(d>180)d-=360;if(d<-180)d+=360;
  return d;
}
function drawScope(canvas,target,angle,color='#65dfe8'){
  const{x,w,h}=U.canvas(canvas);x.fillStyle='#09151e';x.fillRect(0,0,w,h);
  const d=scopeScore(angle,target),off=Math.max(-w*.35,Math.min(w*.35,signedOffset(target,angle)*12)),blur=focusGood()?3:10,width=slitGood()?5:18;
  x.fillStyle=color;x.globalAlpha=d<5?Math.max(.15,1-d/5):.08;x.filter='blur('+blur+'px)';x.fillRect(w/2+off-width/2,h*.18,width,h*.64);x.filter='none';x.globalAlpha=1;
}

function drawGoniometer(){
  const c=E('goniometerCanvas');if(!c)return;
  const{x,w,h}=U.canvas(c),cx=w/2,cy=h/2,R=Math.min(w,h)*.31,a=(+E('scopeAngle').value-90)*DEG;
  x.fillStyle='#f8fafc';x.fillRect(0,0,w,h);
  x.strokeStyle='#8da2b2';x.lineWidth=2;x.beginPath();x.arc(cx,cy,R,0,Math.PI*2);x.stroke();
  for(let d=0;d<360;d+=10){const q=(d-90)*DEG,maj=d%30===0,r1=R-(maj?12:6);x.strokeStyle=maj?'#5c7385':'#aebdca';x.lineWidth=maj?1.6:1;x.beginPath();x.moveTo(cx+r1*Math.cos(q),cy+r1*Math.sin(q));x.lineTo(cx+R*Math.cos(q),cy+R*Math.sin(q));x.stroke();}
  x.fillStyle='rgba(71,121,214,.12)';x.beginPath();x.arc(cx,cy,R*.28,0,Math.PI*2);x.fill();x.strokeStyle='#4779d6';x.stroke();
  x.save();x.translate(cx,cy);x.rotate(-Math.PI/6);x.fillStyle='rgba(220,185,90,.4)';x.strokeStyle='#a77a20';x.lineWidth=2;x.beginPath();x.moveTo(-34,28);x.lineTo(34,28);x.lineTo(0,-32);x.closePath();x.fill();x.stroke();x.restore();
  const colA=-Math.PI/2,colEnd={x:cx+R*.95*Math.cos(colA),y:cy+R*.95*Math.sin(colA)};
  U.line(x,{x:cx,y:cy},colEnd,'#2a8a65',7);
  x.fillStyle='#2a8a65';x.font='700 12px system-ui';x.textAlign='center';x.fillText('collimator / slit',colEnd.x,colEnd.y-10);
  const telEnd={x:cx+R*.95*Math.cos(a),y:cy+R*.95*Math.sin(a)};
  U.line(x,{x:cx,y:cy},telEnd,'#173c58',8);
  x.fillStyle='#173c58';x.fillText('telescope',telEnd.x,telEnd.y-10);
  x.fillStyle='#596f82';x.font='11px system-ui';x.fillText('prism table',cx,cy+R*.42);
  x.textAlign='left';x.fillText('θ = '+fmt(+E('scopeAngle').value),18,22);
}
function renderAdjust(){
  const a=+E('scopeAngle').value,d=scopeScore(a,s.run.theta0);
  E('thetaRead').textContent=fmt(a);E('slitRead').textContent=slitGood()?'fine':'too wide';E('focusRead').textContent=focusGood()?'sharp':'blurred';E('alignRead').textContent=d<.05?'centred':d<1?'near':'search';
  drawScope(E('scopeCanvas'),s.run.theta0,a);drawGoniometer();
  E('adjustProgress').innerHTML=[['Fine slit',slitGood()],['Sharp reticle/slit image',focusGood()],['θ₀ recorded',s.zero!=null]].map(q=>'<div class="step '+(q[1]?'done':'')+'"><span class="progress-dot"></span>'+q[0]+'</div>').join('');
}
function recordZero(){
  const a=+E('scopeAngle').value;
  if(!slitGood()||!focusGood()||scopeScore(a,s.run.theta0)>.05){
    E('adjustMessage').className='notice warn';E('adjustMessage').textContent='The slit must be fine and sharp and centred on the reticle before θ₀ is read.';return;
  }
  s.zero=roundMin(a);s.faces={};s.prismCalc={A:null};s.di=[];s.hg={};s.hgDraft={};s.unknown={};s.unknownDraft={};s.analysis={green:null,cauchy:null,unknown:null};
  E('adjustMessage').className='notice ok';E('adjustMessage').textContent='θ₀ = '+fmt(s.zero)+' recorded. Do not move the lamp or collimator from now on.';
  render();save();
}

function faceTarget(){return E('reflectionFace').value==='1'?s.run.theta1:s.run.theta2}
function measuredA(){if(s.faces[1]==null||s.faces[2]==null)return null;return adiff(s.faces[1],s.faces[2])/2}
function renderPrism(){
  const a=+E('prismScope').value,t=faceTarget();E('prismRead').value=fmt(a);drawScope(E('prismCanvas'),t,a,'#f0e5ba');
  E('theta1Out').textContent=s.faces[1]!=null?fmt(s.faces[1]):'—';E('theta2Out').textContent=s.faces[2]!=null?fmt(s.faces[2]):'—';
  E('prismAOut').textContent=s.prismCalc.A!=null?Number(s.prismCalc.A).toFixed(2)+'°':'—';
  E('Aanalysis').textContent=s.prismCalc.A!=null?Number(s.prismCalc.A).toFixed(2)+'°':'—';
}
function recordFace(){
  if(s.zero==null){E('prismMessage').className='notice warn';E('prismMessage').textContent='Complete θ₀ adjustment first.';return}
  const a=+E('prismScope').value,t=faceTarget();
  if(scopeScore(a,t)>.05){E('prismMessage').className='notice warn';E('prismMessage').textContent='Centre the reflected slit on the reticle before reading the angle.';return}
  s.faces[E('reflectionFace').value]=roundMin(a);s.prismCalc={A:null};s.di=[];s.hg={};s.hgDraft={};s.unknown={};s.unknownDraft={};s.analysis={green:null,cauchy:null,unknown:null};
  E('studentPrismA').value='';
  E('prismMessage').className='notice ok';E('prismMessage').textContent='Reflection reading θ'+E('reflectionFace').value+' stored. Record the other face, then calculate A.';
  render();save();
}
function checkPrismA(){
  const A=measuredA(),v=+E('studentPrismA').value;
  if(A==null){E('prismCalcMessage').className='notice warn';E('prismCalcMessage').textContent='Record θ₁ and θ₂ first.';return}
  if(!Number.isFinite(v)||v<=0){E('prismCalcMessage').className='notice warn';E('prismCalcMessage').textContent='Enter A = |θ₂−θ₁|/2.';return}
  if(Math.abs(v-A)>.04){E('prismCalcMessage').className='notice warn';E('prismCalcMessage').textContent='Recalculate the half-difference of the two reflected-slit readings.';return}
  s.prismCalc.A=v;s.di=[];s.hg={};s.hgDraft={};s.unknown={};s.unknownDraft={};s.analysis={green:null,cauchy:null,unknown:null};
  E('prismCalcMessage').className='notice ok';E('prismCalcMessage').textContent='Prism-angle calculation accepted. You may now begin deviation measurements.';
  render();save();
}

function lineOptions(){
  const mode=E('devMode').value;
  if(mode==='green')return[['green',546.1,'#35a862']];
  if(mode==='hg')return lines;
  return s.run.unknown.map((lambda,i)=>['unknown '+(i+1),lambda,['#4779d6','#38a663','#d54b3b'][i]]);
}
function syncLineOptions(){
  const prev=+E('lineSelect').value||0,opts=lineOptions();
  E('lineSelect').innerHTML=opts.map((q,i)=>'<option value="'+i+'">'+q[0]+'</option>').join('');
  E('lineSelect').value=String(Math.min(prev,opts.length-1));
}
function currentLine(){return lineOptions()[+E('lineSelect').value||0]}
function activeA(){return s.prismCalc.A??measuredA()??s.run.A}
function currentExpected(){
  const A=activeA(),l=currentLine()[1],i=+E('prismInc').value,D=prismD(i,l,A,s.run.n0,s.run.B);
  return D==null?null:wrap((s.zero??s.run.theta0)+D);
}
function trueMinimum(lambda){
  const A=activeA(),D=dmFor(lambda,A,s.run.n0,s.run.B),n=s.run.n0+s.run.B/((lambda/1000)**2),im=(A+D)/2;
  return{A,D,n,im};
}
function drawSpectrum(){
  const a=+E('devScope').value,mode=E('devMode').value;
  E('devThetaRead').textContent=fmt(a);E('incRead').textContent=(+E('prismInc').value).toFixed(1)+'°';E('currentD').textContent='student';
  if(mode==='unknown'&&!s.analysis.cauchy){
    E('signalRead').textContent='calibration required';const q=U.canvas(E('spectrumCanvas'));q.x.fillStyle='#09151e';q.x.fillRect(0,0,q.w,q.h);return;
  }
  const t=currentExpected(),col=currentLine()?.[2]||'#fff';
  if(t==null){
    E('signalRead').textContent='no emergence';const q=U.canvas(E('spectrumCanvas'));q.x.fillStyle='#09151e';q.x.fillRect(0,0,q.w,q.h);return;
  }
  const d=scopeScore(a,t);E('signalRead').textContent=d<.05?'centred':d<.8?'near':'search';drawScope(E('spectrumCanvas'),t,a,col);
}
function invalidateAfterHg(){
  s.analysis.cauchy=null;s.analysis.unknown=null;s.unknown={};s.unknownDraft={};
  E('studentN0').value='';E('studentB').value='';
}
function recordDeviation(){
  if(s.zero==null||s.prismCalc.A==null){E('devMessage').className='notice warn';E('devMessage').textContent='Complete θ₀, both prism-face readings and your prism-angle calculation first.';return}
  const mode=E('devMode').value,line=currentLine(),i=+E('prismInc').value,t=currentExpected(),a=+E('devScope').value;
  if(mode==='unknown'&&!s.analysis.cauchy){E('devMessage').className='notice warn';E('devMessage').textContent='Validate the Hg refractive indices and Cauchy fit before measuring the unknown lamp.';return}
  if(t==null){E('devMessage').className='notice warn';E('devMessage').textContent='At this incidence the selected ray does not emerge from the prism.';return}
  if(scopeScore(a,t)>.05){E('devMessage').className='notice warn';E('devMessage').textContent='Centre the spectral slit on the telescope reticle before taking the reading.';return}
  const raw=E('devStudentD').value.trim(),D=+raw,expectedD=adiff(a,s.zero);
  if(raw===''||!Number.isFinite(D)){E('devMessage').className='notice warn';E('devMessage').textContent='Calculate D = |θ−θ₀| from the telescope reading and enter it before recording.';return}
  if(Math.abs(D-expectedD)>.04){E('devMessage').className='notice warn';E('devMessage').textContent='Recalculate the deviation from your telescope reading and θ₀.';return}
  const theta=roundMin(a);
  if(mode==='green'){
    const k=s.di.findIndex(q=>Math.abs(q.i-i)<.08),p={i,theta,D};
    if(k>=0)s.di[k]=p;else s.di.push(p);s.di.sort((a,b)=>a.i-b.i);s.analysis.green=null;
    E('studentI0').value='';E('studentDmGreen').value='';
    E('devMessage').className='notice ok';E('devMessage').textContent='Green-line point stored. Continue scanning from the emergence limit through and beyond the minimum.';
  }else{
    const min=trueMinimum(line[1]);
    if(Math.abs(i-min.im)>.18){E('devMessage').className='notice warn';E('devMessage').textContent='This is not yet the turning point. Follow the spectral line while rotating the prism on both sides and locate minimum deviation.';return}
    const key=mode==='hg'?String(line[1]):String(+E('lineSelect').value);
    if(mode==='hg'){
      s.hg[key]={name:line[0],lambda:line[1],theta,D,n:null};delete s.hgDraft[key];invalidateAfterHg();
      E('devMessage').className='notice ok';E('devMessage').textContent='Hg minimum-deviation reading stored. Calculate n(λ) in the table.';
    }else{
      s.unknown[key]={name:line[0],theta,D};delete s.unknownDraft[key];s.analysis.unknown=null;
      E('devMessage').className='notice ok';E('devMessage').textContent='Unknown-line minimum-deviation reading stored. Use the Hg calibration to estimate its wavelength.';
    }
  }
  E('devStudentD').value='';render();save();
}

function hgInput(key,val){
  const v=val==null?'':String(val);
  return '<input class="table-calc hg-n-input" type="number" step="0.0001" data-key="'+key+'" value="'+v+'">';
}
function renderTables(){
  E('diBody').innerHTML=s.di.length?s.di.map(q=>'<tr><td>'+q.i.toFixed(2)+'</td><td>'+fmt(q.theta)+'</td><td>'+q.D.toFixed(2)+'</td></tr>').join(''):'<tr><td colspan="3">No green-line readings yet.</td></tr>';
  E('hgBody').innerHTML=lines.map(l=>{
    const key=String(l[1]),q=s.hg[key],draft=s.hgDraft[key]??q?.n??null;
    return '<tr><td>'+l[0]+'</td><td>'+l[1].toFixed(1)+'</td><td>'+(q?fmt(q.theta):'—')+'</td><td>'+(q?q.D.toFixed(2)+'°':'—')+'</td><td>'+(q?hgInput(key,draft):'—')+'</td></tr>';
  }).join('');
}
function allHgRecorded(){return lines.every(l=>!!s.hg[String(l[1])])}
function allHgValidated(){return lines.every(l=>{const q=s.hg[String(l[1])];return q?.n!=null&&Number.isFinite(+q.n)})}
function checkHgCalculations(){
  if(s.prismCalc.A==null){E('hgCalcMessage').className='notice warn';E('hgCalcMessage').textContent='Validate the prism angle first.';return}
  if(!allHgRecorded()){E('hgCalcMessage').className='notice warn';E('hgCalcMessage').textContent='Record the minimum deviation of all eight Hg lines first.';return}
  const A=s.prismCalc.A;
  for(const l of lines){
    const key=String(l[1]),q=s.hg[key],raw=String(s.hgDraft[key]??'').trim(),v=+raw,expected=Math.sin((A+q.D)*DEG/2)/Math.sin(A*DEG/2);
    if(raw===''||!Number.isFinite(v)){E('hgCalcMessage').className='notice warn';E('hgCalcMessage').textContent='Enter n for every Hg line before checking.';return}
    if(Math.abs(v-expected)>.0025){E('hgCalcMessage').className='notice warn';E('hgCalcMessage').textContent='Recheck n(λ) for '+q.name+' using your A and Dₘ values.';return}
  }
  for(const l of lines){const key=String(l[1]);s.hg[key].n=+s.hgDraft[key]}
  s.analysis.cauchy=null;s.analysis.unknown=null;E('studentN0').value='';E('studentB').value='';
  E('hgCalcMessage').className='notice ok';E('hgCalcMessage').textContent='All eight refractive-index calculations are accepted. Use them to construct the Cauchy graph.';
  render();save();
}

function linfit(ps){
  const n=ps.length,mx=ps.reduce((a,p)=>a+p.x,0)/n,my=ps.reduce((a,p)=>a+p.y,0)/n;
  let nu=0,de=0;ps.forEach(p=>{nu+=(p.x-mx)*(p.y-my);de+=(p.x-mx)**2});
  return{a:my-(nu/de)*mx,b:nu/de};
}
function emergenceAngle(lambda){
  for(let i=0;i<=90;i+=.01)if(prismD(i,lambda,activeA(),s.run.n0,s.run.B)!=null)return i;
  return null;
}
function greenExpected(){
  const min=trueMinimum(546.1);
  return{i0:emergenceAngle(546.1),Dm:min.D,im:min.im};
}
function renderGreenAnalysis(){
  if(s.di.length>1)U.plot(E('diChart'),[{pts:s.di.map(q=>({x:q.i,y:q.D}))}],{xlabel:'i (°)',ylabel:'D (°)',xmin:0,xmax:90,ymin:0});
  else{
    const q=U.canvas(E('diChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#6b8090';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record several green-line D(i) points.',q.w/2,q.h/2);
  }
  E('i0Out').textContent=s.analysis.green?Number(s.analysis.green.i0).toFixed(2)+'°':'—';
  E('dmGreenOut').textContent=s.analysis.green?Number(s.analysis.green.Dm).toFixed(2)+'°':'—';
}
function checkGreenAnalysis(){
  if(s.prismCalc.A==null){E('greenAnalysisMessage').className='notice warn';E('greenAnalysisMessage').textContent='Validate the prism angle first.';return}
  const ex=greenExpected(),i0=+E('studentI0').value,Dm=+E('studentDmGreen').value;
  if(s.di.length<6){E('greenAnalysisMessage').className='notice warn';E('greenAnalysisMessage').textContent='Record at least six green-line points, including the emergence limit and both sides of the minimum.';return}
  const minI=Math.min(...s.di.map(q=>q.i)),maxI=Math.max(...s.di.map(q=>q.i)),nearMin=s.di.some(q=>Math.abs(q.i-ex.im)<.35);
  if(minI>ex.i0+1.0||!nearMin||maxI<ex.im+2){E('greenAnalysisMessage').className='notice warn';E('greenAnalysisMessage').textContent='Expand the scan: approach the emergence limit and record points through and beyond the turning point.';return}
  if(!Number.isFinite(i0)||!Number.isFinite(Dm)){E('greenAnalysisMessage').className='notice warn';E('greenAnalysisMessage').textContent='Enter the limiting incidence and green minimum deviation read from your scan.';return}
  if(Math.abs(i0-ex.i0)>.5){E('greenAnalysisMessage').className='notice warn';E('greenAnalysisMessage').textContent='Recheck the incidence where the green ray first becomes able to emerge from the second prism face.';return}
  if(Math.abs(Dm-ex.Dm)>.15){E('greenAnalysisMessage').className='notice warn';E('greenAnalysisMessage').textContent='Re-read the minimum of your D(i) curve.';return}
  s.analysis.green={i0,Dm};E('greenAnalysisMessage').className='notice ok';E('greenAnalysisMessage').textContent='Green D(i) analysis accepted.';render();save();
}

function cauchyFit(){
  if(!allHgValidated())return null;
  const ps=lines.map(l=>{const q=s.hg[String(l[1])];return{x:1/((q.lambda/1000)**2),y:+q.n}});
  return{ps,f:linfit(ps)};
}
function renderCauchy(){
  const fit=cauchyFit();E('hgCount').textContent=Object.keys(s.hg).length+' / 8';
  if(fit)U.plot(E('cauchyChart'),[{pts:[...fit.ps].sort((a,b)=>a.x-b.x)}],{xlabel:'1/λ² (µm⁻²)',ylabel:'n',ymin:1.55});
  else{
    const q=U.canvas(E('cauchyChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#6b8090';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Validate all eight n(λ) values to unlock the Cauchy graph.',q.w/2,q.h/2);
  }
  E('n0Out').textContent=s.analysis.cauchy?Number(s.analysis.cauchy.n0).toFixed(4):'—';
  E('bOut').textContent=s.analysis.cauchy?Number(s.analysis.cauchy.B).toFixed(5):'—';
}
function checkCauchy(){
  const fit=cauchyFit(),n0=+E('studentN0').value,B=+E('studentB').value;
  if(!fit){E('unknownResult').className='notice warn';E('unknownResult').textContent='Validate all eight Hg refractive indices first.';return}
  if(!Number.isFinite(n0)||!Number.isFinite(B)){E('unknownResult').className='notice warn';E('unknownResult').textContent='Enter n₀ and B from your straight-line Cauchy graph.';return}
  if(Math.abs(n0-fit.f.a)>.003){E('unknownResult').className='notice warn';E('unknownResult').textContent='Re-read the intercept n₀ of n versus 1/λ².';return}
  if(Math.abs(B-fit.f.b)>.0007){E('unknownResult').className='notice warn';E('unknownResult').textContent='Re-read the Cauchy slope B, with λ expressed in µm.';return}
  s.analysis.cauchy={n0,B};s.analysis.unknown=null;E('unknownResult').className='notice ok';E('unknownResult').textContent='Cauchy coefficients accepted. Switch to Unknown lamp and record each minimum-deviation line.';
  render();save();
}
function lambdaFromCalibration(D){
  const pts=Object.values(s.hg).filter(q=>q?.n!=null&&Number.isFinite(+q.n)).map(q=>({D:+q.D,lambda:+q.lambda})).sort((a,b)=>a.D-b.D);
  if(pts.length<2)return null;
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i];
    if(D>=a.D&&D<=b.D){const t=(D-a.D)/(b.D-a.D);return a.lambda+t*(b.lambda-a.lambda)}
  }
  return null;
}
function renderUnknownWork(){
  const keys=Object.keys(s.unknown).sort((a,b)=>+a-+b);
  if(!keys.length){E('unknownWork').innerHTML='<p class="small-note">No unknown-lamp minimum-deviation readings recorded yet.</p>';return}
  E('unknownWork').innerHTML=keys.map(k=>{
    const q=s.unknown[k],draft=s.unknownDraft[k]??s.analysis.unknown?.[k]??'';
    return '<div class="unknown-row"><span>'+q.name+'</span><strong>Dₘ = '+q.D.toFixed(2)+'°</strong><label>estimated λ / nm<input class="unknown-lambda" data-key="'+k+'" type="number" min="350" max="750" step="0.1" value="'+draft+'"></label></div>';
  }).join('');
}
function checkUnknownCalibration(){
  if(!s.analysis.cauchy){E('unknownResult').className='notice warn';E('unknownResult').textContent='Validate the Cauchy fit first.';return}
  const keys=Object.keys(s.unknown).sort((a,b)=>+a-+b);
  if(keys.length<s.run.unknown.length){E('unknownResult').className='notice warn';E('unknownResult').textContent='Record all unknown-lamp minimum-deviation lines first.';return}
  const accepted={};
  for(const k of keys){
    const q=s.unknown[k],expected=lambdaFromCalibration(q.D),raw=String(s.unknownDraft[k]??'').trim(),v=+raw;
    if(raw===''||!Number.isFinite(v)){E('unknownResult').className='notice warn';E('unknownResult').textContent='Enter an estimated wavelength for every unknown line.';return}
    if(expected==null){E('unknownResult').className='notice warn';E('unknownResult').textContent=q.name+' lies outside the experimental Hg calibration interval.';return}
    if(Math.abs(v-expected)>5){E('unknownResult').className='notice warn';E('unknownResult').textContent='Re-read the Dₘ(λ) calibration for '+q.name+'.';return}
    accepted[k]=v;
  }
  s.analysis.unknown=accepted;
  E('unknownResult').className='notice ok';
  E('unknownResult').innerHTML='<b>Unknown calibration accepted:</b> '+keys.map(k=>s.unknown[k].name+' ≈ '+Number(accepted[k]).toFixed(1)+' nm').join(' · ');
  save();
}

function render(){
  renderAdjust();renderPrism();syncLineOptions();drawSpectrum();renderTables();renderGreenAnalysis();renderCauchy();renderUnknownWork();
  if(s.analysis.cauchy&&!s.analysis.unknown&&Object.keys(s.unknown).length===0){E('unknownResult').className='notice ok';E('unknownResult').textContent='Cauchy coefficients accepted. Switch to Unknown lamp and record each minimum-deviation line.'}
  if(s.analysis.unknown){
    const keys=Object.keys(s.analysis.unknown).sort((a,b)=>+a-+b);
    E('unknownResult').className='notice ok';
    E('unknownResult').innerHTML='<b>Unknown calibration accepted:</b> '+keys.map(k=>s.unknown[k].name+' ≈ '+Number(s.analysis.unknown[k]).toFixed(1)+' nm').join(' · ');
  }
}
function buildReport(){
  const unknown=s.analysis.unknown?Object.keys(s.analysis.unknown).sort((a,b)=>+a-+b).map(k=>s.unknown[k].name+' ≈ '+Number(s.analysis.unknown[k]).toFixed(1)+' nm').join(', '):'not validated';
  const summary='<p><b>θ₀:</b> '+(s.zero!=null?fmt(s.zero):'pending')+'. <b>Prism angle A:</b> '+(s.prismCalc.A!=null?Number(s.prismCalc.A).toFixed(2)+'°':'not validated')+'.</p><p><b>Green D(i):</b> '+(s.analysis.green?'i₀='+Number(s.analysis.green.i0).toFixed(2)+'°, Dₘ='+Number(s.analysis.green.Dm).toFixed(2)+'°':'not validated')+'. <b>Hg minima:</b> '+Object.keys(s.hg).length+'/8; n(λ) '+(allHgValidated()?'validated':'incomplete')+'.</p><p><b>Cauchy:</b> '+(s.analysis.cauchy?'n₀='+Number(s.analysis.cauchy.n0).toFixed(4)+', B='+Number(s.analysis.cauchy.B).toFixed(5)+' µm²':'not validated')+'. <b>Unknown lamp:</b> '+unknown+'.</p>';
  return U.report('Laboratory Practical 2 — Goniometer & Dispersion',summary);
}

U.tabs();
if(s.prismCalc.A!=null)E('studentPrismA').value=s.prismCalc.A;
if(s.analysis.green){E('studentI0').value=s.analysis.green.i0;E('studentDmGreen').value=s.analysis.green.Dm}
if(s.analysis.cauchy){E('studentN0').value=s.analysis.cauchy.n0;E('studentB').value=s.analysis.cauchy.B}
['slit','focus','scopeAngle','reflectionFace','prismScope','prismInc','devScope'].forEach(id=>E(id).addEventListener('input',render));
E('devMode').addEventListener('change',()=>{E('lineSelect').value='0';E('devStudentD').value='';syncLineOptions();render()});
E('lineSelect').addEventListener('change',()=>{E('devStudentD').value='';render()});
E('recordZero').onclick=recordZero;
E('recordFace').onclick=recordFace;
E('checkPrismA').onclick=checkPrismA;
E('recordDeviation').onclick=recordDeviation;
E('checkHgCalculations').onclick=checkHgCalculations;
E('checkGreenAnalysis').onclick=checkGreenAnalysis;
E('checkCauchy').onclick=checkCauchy;
E('checkUnknownCalibration').onclick=checkUnknownCalibration;
E('hgBody').addEventListener('input',e=>{
  if(!e.target.matches('.hg-n-input'))return;
  s.hgDraft[e.target.dataset.key]=e.target.value.trim()===''?null:+e.target.value;save();
});
E('unknownWork').addEventListener('input',e=>{
  if(!e.target.matches('.unknown-lambda'))return;
  s.unknownDraft[e.target.dataset.key]=e.target.value.trim()===''?null:+e.target.value;save();
});
E('buildReport').onclick=buildReport;
E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
E('prismScope').value=s.zero??0;
E('devScope').value=s.zero??0;
window.addEventListener('resize',render);
render();save();
})();