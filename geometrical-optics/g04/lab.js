(()=>{
'use strict';
const U=OpticsUI,E=id=>document.getElementById(id),K='PhysicsUSTHB_G04_v2',OLD='PhysicsUSTHB_G04_v1';
const AB=1,deltaTrue=25,fEyeRest=10,retina=10,fLoupe=20,fObj=10,Delta=80,targetP1=fObj+Delta;
const current=U.load(K,null),old=U.load(OLD,null),migrating=!current&&!!old,loaded=current||old||{};
let s={
  version:2,
  eye:loaded.eye?{delta:+loaded.eye.delta}:null,
  eyeCalc:loaded.eyeCalc||null,
  loupe:loaded.loupe?{d:+loaded.loupe.d}:null,
  loupeCalc:loaded.loupeCalc||null,
  objective:loaded.objective?{u:+loaded.objective.u}:null,
  objectiveCalc:loaded.objectiveCalc||null,
  micro:loaded.micro&&loaded.micro.u!=null?{u:+loaded.micro.u,ocular:+loaded.micro.ocular}:null,
  microCalc:loaded.microCalc||null
};
if(migrating){s.eyeCalc=null;s.loupeCalc=null;s.objectiveCalc=null;s.micro=null;s.microCalc=null}
function save(){U.save(K,s)}
function lensF(u,v){return 1/(1/u+1/v)}
const fEyeMax=lensF(deltaTrue,retina);
function drawTrain(canvas,parts){
  const{x,w,h}=U.canvas(canvas),pad=35,base=h*.58,max=Math.max(100,...parts.map(p=>p.x||0))+20,X=v=>pad+v/max*(w-2*pad);
  x.fillStyle='#fbfcfd';x.fillRect(0,0,w,h);x.strokeStyle='#6b7e8d';x.lineWidth=2;x.beginPath();x.moveTo(pad,base);x.lineTo(w-pad,base);x.stroke();
  parts.forEach(p=>{
    const xx=X(p.x);
    if(p.type==='object'){x.strokeStyle='#bd603e';x.lineWidth=4;x.beginPath();x.moveTo(xx,base);x.lineTo(xx,base-65);x.stroke()}
    else if(p.type==='lens'){x.strokeStyle=p.color||'#2586a0';x.lineWidth=4;x.beginPath();x.moveTo(xx,base-85);x.lineTo(xx,base+75);x.stroke();x.beginPath();x.moveTo(xx,base-85);x.lineTo(xx-7,base-73);x.moveTo(xx,base-85);x.lineTo(xx+7,base-73);x.stroke()}
    else if(p.type==='screen'){x.strokeStyle='#76549d';x.lineWidth=5;x.beginPath();x.moveTo(xx,base-95);x.lineTo(xx,base+80);x.stroke()}
    x.fillStyle='#173f58';x.font='11px system-ui';x.fillText(p.label||'',xx-12,base+25);
  });
}
function angleDeg(rad){return rad*180/Math.PI}

function renderEye(){
  const d=+E('eyeDistance').value,pp=1/(1/fEyeMax-1/d),err=Math.abs(pp-retina);
  E('eyeSharp').value=err<.12?'SHARP':err<.6?'near focus':'blurred';
  drawTrain(E('eyeCanvas'),[{x:0,type:'object',label:'AB'},{x:d,type:'lens',label:'eye lens'},{x:d+retina,type:'screen',label:'retina'}]);
  E('deltaOut').textContent=s.eye?Number(s.eye.delta).toFixed(1)+' cm':'—';
  E('alphaOut').textContent=s.eyeCalc?Number(s.eyeCalc.alphaDeg).toFixed(2)+'°':'—';
  E('alphaAnalysis').textContent=E('alphaOut').textContent;
}
function recordEye(){
  const d=+E('eyeDistance').value,pp=1/(1/fEyeMax-1/d);
  if(Math.abs(pp-retina)>.15){E('eyeMessage').className='notice warn';E('eyeMessage').textContent='The image is not on the retina. Move the model eye until maximum accommodation gives a sharp image.';return}
  s.eye={delta:d};s.eyeCalc=null;s.loupeCalc=null;s.micro=null;s.microCalc=null;
  E('studentAlpha').value='';['studentAlphaPrime','studentLoupeG','studentPower','studentEpsilon','studentMicroG','studentProduct'].forEach(id=>E(id).value='');
  E('eyeMessage').className='notice ok';E('eyeMessage').textContent='Nearest sharp naked-eye position recorded. Calculate the reference angular size α.';
  render();save();
}
function checkEyeCalc(){
  if(!s.eye){E('eyeCalcMessage').className='notice warn';E('eyeCalcMessage').textContent='Record the nearest sharp eye position first.';return}
  const v=+E('studentAlpha').value,rad=Math.atan(AB/s.eye.delta),expected=angleDeg(rad);
  if(!Number.isFinite(v)||v<=0){E('eyeCalcMessage').className='notice warn';E('eyeCalcMessage').textContent='Enter α in degrees.';return}
  if(Math.abs(v-expected)>.08){E('eyeCalcMessage').className='notice warn';E('eyeCalcMessage').textContent='Recalculate α = arctan(AB/δ′), using consistent length units.';return}
  s.eyeCalc={alphaRad:rad,alphaDeg:v};s.loupeCalc=null;s.micro=null;s.microCalc=null;
  E('eyeCalcMessage').className='notice ok';E('eyeCalcMessage').textContent='Naked-eye angular size accepted.';render();save();
}

function renderLoupe(){
  const d=+E('loupeDistance').value,err=Math.abs(d-fLoupe);
  E('loupeSharp').value=err<.12?'SHARP · parallel output':err<.7?'near':'blurred';
  drawTrain(E('loupeCanvas'),[{x:0,type:'object',label:'AB'},{x:d,type:'lens',label:'loupe'},{x:d+18,type:'lens',label:'relaxed eye'},{x:d+28,type:'screen',label:'retina'}]);
  E('loupeDOut').textContent=s.loupe?Number(s.loupe.d).toFixed(1)+' cm':'—';
  E('alphaPrimeOut').textContent=s.loupeCalc?Number(s.loupeCalc.alphaPDeg).toFixed(2)+'°':'—';
  E('loupeGOut').textContent=s.loupeCalc?Number(s.loupeCalc.G).toFixed(2):'—';
  E('powerOut').textContent=s.loupeCalc?Number(s.loupeCalc.P).toFixed(2)+' D':'—';
  E('loupeAnalysis').textContent=s.loupeCalc?Number(s.loupeCalc.G).toFixed(2):'—';
}
function recordLoupe(){
  if(!s.eyeCalc){E('loupeMessage').className='notice warn';E('loupeMessage').textContent='Measure and calculate the naked-eye reference angle α first.';return}
  const d=+E('loupeDistance').value;
  if(Math.abs(d-fLoupe)>.15){E('loupeMessage').className='notice warn';E('loupeMessage').textContent='The relaxed eye is not focused. Place the object in the magnifier focal plane.';return}
  s.loupe={d};s.loupeCalc=null;s.micro=null;s.microCalc=null;
  ['studentAlphaPrime','studentLoupeG','studentPower','studentEpsilon','studentMicroG','studentProduct'].forEach(id=>E(id).value='');
  E('loupeMessage').className='notice ok';E('loupeMessage').textContent='Focused magnifier position recorded. Calculate α′, Gocu and power.';
  render();save();
}
function checkLoupeCalc(){
  if(!s.loupe||!s.eyeCalc){E('loupeCalcMessage').className='notice warn';E('loupeCalcMessage').textContent='Complete the eye reference and focused magnifier measurement first.';return}
  const alphaPRad=Math.atan(AB/fLoupe),alphaPDeg=angleDeg(alphaPRad),G=alphaPRad/s.eyeCalc.alphaRad,P=alphaPRad/(AB/100);
  const a=+E('studentAlphaPrime').value,g=+E('studentLoupeG').value,p=+E('studentPower').value;
  if([a,g,p].some(v=>!Number.isFinite(v)||v<=0)){E('loupeCalcMessage').className='notice warn';E('loupeCalcMessage').textContent='Enter α′, Gocu and P.';return}
  if(Math.abs(a-alphaPDeg)>.08||Math.abs(g-G)>.04||Math.abs(p-P)>.08){E('loupeCalcMessage').className='notice warn';E('loupeCalcMessage').textContent='Recheck α′ = arctan(AB/f₂), Gocu=α′/α and P=α′/AB with α′ in radians and AB in metres for diopters.';return}
  s.loupeCalc={alphaPRad,alphaPDeg:a,G:g,P:p};s.micro=null;s.microCalc=null;
  E('loupeCalcMessage').className='notice ok';E('loupeCalcMessage').textContent='Magnifier calculations accepted.';render();save();
}

function objectiveImage(u){return fObj*u/(u-fObj)}
function renderMicro(){
  const u=+E('objDistance').value,pp=objectiveImage(u),ocular=+E('ocularPosition').value,objErr=Math.abs(pp-targetP1),ocularTarget=targetP1+fLoupe,ocularErr=Math.abs(ocular-ocularTarget);
  E('microObjectiveSharp').value=objErr<.35?'SHARP':objErr<1.2?'near focus':'blurred';
  drawTrain(E('microCanvas'),[
    {x:0,type:'object',label:'AB'},
    {x:u,type:'lens',label:'L1 objective'},
    {x:u+targetP1,type:'screen',label:'fixed A1B1 screen'},
    {x:u+ocular,type:'lens',label:'L2 ocular'},
    {x:u+ocular+15,type:'lens',label:'eye'},
    {x:u+ocular+25,type:'screen',label:'retina'}
  ]);
  if(objErr>=.5){E('microMessage').className='notice';E('microMessage').textContent='Move the object/objective spacing until the intermediate image is sharp on the fixed screen.'}
  else if(ocularErr>=.5){E('microMessage').className='notice';E('microMessage').textContent='The objective image is sharp. Adjust the objective–ocular spacing so that the intermediate image lies in the ocular front focal plane.'}
  else{E('microMessage').className='notice ok';E('microMessage').textContent='Objective and ocular geometry are ready for measurement.'}
  E('p1Out').textContent=s.objectiveCalc?Number(s.objectiveCalc.pp).toFixed(1)+' cm':'—';
  E('gammaObjOut').textContent=s.objectiveCalc?Number(s.objectiveCalc.gamma).toFixed(2):'—';
  E('epsilonOut').textContent=s.microCalc?Number(s.microCalc.epsilonDeg).toFixed(2)+'°':'—';
  E('microGOut').textContent=s.microCalc?Number(s.microCalc.G).toFixed(2):'—';
  E('productOut').textContent=s.microCalc?Number(s.microCalc.product).toFixed(2):'—';
  E('microAnalysis').textContent=s.microCalc?Number(s.microCalc.G).toFixed(2):'—';
}
function measureObjective(){
  const u=+E('objDistance').value,pp=objectiveImage(u);
  if(Math.abs(pp-targetP1)>.5){E('microMessage').className='notice warn';E('microMessage').textContent='The intermediate image is not sharp on the fixed screen. Refocus the objective first.';return}
  s.objective={u};s.objectiveCalc=null;s.micro=null;s.microCalc=null;
  ['studentP1','studentGammaObj','studentEpsilon','studentMicroG','studentProduct'].forEach(id=>E(id).value='');
  E('microMessage').className='notice ok';E('microMessage').textContent='Sharp intermediate image recorded with the screen inserted. Calculate p′₁ and |γobj| before removing the screen.';
  render();save();
}
function checkObjectiveCalc(){
  if(!s.objective){E('objectiveCalcMessage').className='notice warn';E('objectiveCalcMessage').textContent='Record a sharp intermediate objective image first.';return}
  const pp=+E('studentP1').value,g=+E('studentGammaObj').value,expectedPP=targetP1,expectedG=expectedPP/s.objective.u;
  if(!Number.isFinite(pp)||!Number.isFinite(g)||pp<=0||g<=0){E('objectiveCalcMessage').className='notice warn';E('objectiveCalcMessage').textContent='Enter p′₁ and |γobj|.';return}
  if(Math.abs(pp-expectedPP)>.3||Math.abs(g-expectedG)>.06){E('objectiveCalcMessage').className='notice warn';E('objectiveCalcMessage').textContent='Recheck p′₁=f₁+Δ and |γobj|=p′₁/|p₁| using your measured object–objective distance.';return}
  s.objectiveCalc={pp,gamma:g};s.micro=null;s.microCalc=null;
  E('objectiveCalcMessage').className='notice ok';E('objectiveCalcMessage').textContent='Objective calculation accepted. Remove the intermediate screen and finish the microscope alignment.';
  render();save();
}
function assembleMicroscope(){
  if(!s.eyeCalc||!s.loupeCalc||!s.objectiveCalc){E('microMessage').className='notice warn';E('microMessage').textContent='Complete the eye, magnifier and objective calculations first.';return}
  const u=+E('objDistance').value,pp=objectiveImage(u),ocular=+E('ocularPosition').value,target=targetP1+fLoupe;
  if(Math.abs(pp-targetP1)>.5||Math.abs(ocular-target)>.5){E('microMessage').className='notice warn';E('microMessage').textContent='The optical train is not aligned: refocus the intermediate image and place it in the ocular front focal plane.';return}
  s.micro={u,ocular};s.microCalc=null;['studentEpsilon','studentMicroG','studentProduct'].forEach(id=>E(id).value='');
  E('microMessage').className='notice ok';E('microMessage').textContent='Microscope focused for relaxed-eye observation. Calculate ε, Gc and |γobj|×Gocu.';
  render();save();
}
function checkMicroCalc(){
  if(!s.micro||!s.eyeCalc||!s.loupeCalc||!s.objectiveCalc){E('microCalcMessage').className='notice warn';E('microCalcMessage').textContent='Assemble the aligned microscope after completing the prerequisite calculations.';return}
  const imageSize=AB*s.objectiveCalc.gamma,epsilonRad=imageSize/fLoupe,epsilonDeg=angleDeg(epsilonRad),G=epsilonRad/s.eyeCalc.alphaRad,product=s.objectiveCalc.gamma*s.loupeCalc.G;
  const e=+E('studentEpsilon').value,g=+E('studentMicroG').value,p=+E('studentProduct').value;
  if([e,g,p].some(v=>!Number.isFinite(v)||v<=0)){E('microCalcMessage').className='notice warn';E('microCalcMessage').textContent='Enter ε, Gc and |γobj|×Gocu.';return}
  if(Math.abs(e-epsilonDeg)>.15||Math.abs(g-G)>.12||Math.abs(p-product)>.12){E('microCalcMessage').className='notice warn';E('microCalcMessage').textContent='Recheck ε≈A₁B₁/f₂, Gc=ε/α and the product |γobj|×Gocu.';return}
  s.microCalc={epsilonRad,epsilonDeg:e,G:g,product:p};E('microCalcMessage').className='notice ok';E('microCalcMessage').textContent='Microscope calculations accepted. Compare the two total-magnification routes in your discussion.';
  render();save();
}

function analysis(){
  if(s.eyeCalc&&s.loupeCalc&&s.microCalc){
    const diff=100*Math.abs(s.microCalc.G-s.microCalc.product)/((s.microCalc.G+s.microCalc.product)/2);
    E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Sequence complete. The two microscope grossissement routes differ by '+diff.toFixed(1)+'% in this paraxial model; discuss the approximations used.';
  }else{
    E('analysisMessage').className='notice';E('analysisMessage').textContent='Complete and validate the eye, magnifier and microscope sequence.';
  }
}
function render(){renderEye();renderLoupe();renderMicro();analysis()}
function buildReport(){
  const summary='<p><b>Near point δ′:</b> '+E('deltaOut').textContent+' · <b>accepted α:</b> '+E('alphaOut').textContent+'.</p><p><b>Magnifier:</b> α′='+E('alphaPrimeOut').textContent+', Gocu='+E('loupeGOut').textContent+', P='+E('powerOut').textContent+'.</p><p><b>Objective:</b> p′₁='+E('p1Out').textContent+', |γobj|='+E('gammaObjOut').textContent+'. <b>Microscope:</b> Gc='+E('microGOut').textContent+', |γobj|×Gocu='+E('productOut').textContent+'.</p>';
  return U.report('Laboratory Practical 4 — Eye, Magnifier & Microscope',summary);
}

U.tabs();
if(s.eye)E('eyeDistance').value=s.eye.delta;
if(s.loupe)E('loupeDistance').value=s.loupe.d;
if(s.objective)E('objDistance').value=s.objective.u;
if(s.micro)E('ocularPosition').value=s.micro.ocular;
if(s.eyeCalc)E('studentAlpha').value=s.eyeCalc.alphaDeg;
if(s.loupeCalc){E('studentAlphaPrime').value=s.loupeCalc.alphaPDeg;E('studentLoupeG').value=s.loupeCalc.G;E('studentPower').value=s.loupeCalc.P}
if(s.objectiveCalc){E('studentP1').value=s.objectiveCalc.pp;E('studentGammaObj').value=s.objectiveCalc.gamma}
if(s.microCalc){E('studentEpsilon').value=s.microCalc.epsilonDeg;E('studentMicroG').value=s.microCalc.G;E('studentProduct').value=s.microCalc.product}
['eyeDistance','loupeDistance','objDistance','ocularPosition'].forEach(id=>E(id).addEventListener('input',render));
E('recordNear').onclick=recordEye;E('checkEyeCalc').onclick=checkEyeCalc;
E('recordLoupe').onclick=recordLoupe;E('checkLoupeCalc').onclick=checkLoupeCalc;
E('measureObjective').onclick=measureObjective;E('checkObjectiveCalc').onclick=checkObjectiveCalc;
E('assembleMicroscope').onclick=assembleMicroscope;E('checkMicroCalc').onclick=checkMicroCalc;
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',render);
render();save();
})();