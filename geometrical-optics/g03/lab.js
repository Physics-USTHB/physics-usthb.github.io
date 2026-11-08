(()=>{
'use strict';
const U=OpticsUI,E=id=>document.getElementById(id),K='PhysicsUSTHB_G03_v2',OLD='PhysicsUSTHB_G03_v1',F=15,D=80;
const lensPositions=[25,30,35,40,45];
const current=U.load(K,null),old=U.load(OLD,null),migrating=!current&&!!old,loaded=current||old||{};
const oldPairs=loaded.pairs||{};
const migratedPairs={};
for(const [key,q] of Object.entries(oldPairs)){
  if(q&&Number.isFinite(+q.meas))migratedPairs[key]={label:q.label||pairLabelFromKey(key),meas:+q.meas};
}
let s={
  version:2,
  conj:{...(loaded.conj||{})},
  conjCalc:{...(loaded.conjCalc||{})},
  conjDraft:{...(loaded.conjDraft||loaded.conjCalc||{})},
  graphF:loaded.graphF??null,
  bessel:Array.isArray(loaded.bessel)?loaded.bessel.map(Number):[],
  besselCalc:loaded.besselCalc||null,
  silber:typeof loaded.silber==='number'?{D0:+loaded.silber,lens:+loaded.silber/2}:(loaded.silber||null),
  silberCalc:loaded.silberCalc||null,
  auto:loaded.auto??null,
  pairs:current?{...(loaded.pairs||{})}:migratedPairs,
  pairCalcs:{...(loaded.pairCalcs||{})},
  pairDraft:{...(loaded.pairDraft||{})},
  comparison:loaded.comparison||null
};
if(migrating){
  s.conjCalc={};s.conjDraft={};s.graphF=null;s.besselCalc=null;s.silberCalc=null;s.pairCalcs={};s.pairDraft={};
}
function save(){U.save(K,s)}
function pairLabelFromKey(key){
  if(key==='20,10')return '+200 mm + +100 mm';
  if(key==='20,5')return '+200 mm + +50 mm';
  return '+100 mm + divergent lens X';
}
function imageDist(u,Focal=F){return Focal*u/(u-Focal)}
function focusErr(lens,screen,Focal=F){const p=imageDist(lens,Focal);return Math.abs(screen-(lens+p))}
function drawBench(canvas,lens,screen,Focal=F,mirror=false){
  const{x,w,h}=U.canvas(canvas),pad=35,base=h*.58,scale=(w-2*pad)/120,X=v=>pad+v*scale;
  x.fillStyle='#fbfcfd';x.fillRect(0,0,w,h);
  x.strokeStyle='#5c7181';x.lineWidth=4;x.beginPath();x.moveTo(pad,base);x.lineTo(w-pad,base);x.stroke();
  x.fillStyle='#bd5d3d';x.fillRect(X(0)-4,base-70,8,70);x.fillStyle='#173f58';x.font='11px system-ui';x.fillText('object',X(0)-15,base+24);
  x.strokeStyle='#2c8aa2';x.lineWidth=4;x.beginPath();x.moveTo(X(lens),base-90);x.lineTo(X(lens),base+70);x.stroke();x.fillText('lens',X(lens)-12,base+24);
  if(screen!=null){x.strokeStyle='#72569d';x.lineWidth=5;x.beginPath();x.moveTo(X(screen),base-100);x.lineTo(X(screen),base+75);x.stroke();x.fillText('screen',X(screen)-15,base+24)}
  if(mirror){x.strokeStyle='#566a79';x.lineWidth=5;x.beginPath();x.moveTo(X(95),base-100);x.lineTo(X(95),base+75);x.stroke();x.fillText('mirror',X(95)-13,base+24)}
  x.strokeStyle='#c2603f';x.lineWidth=1.5;x.setLineDash([5,4]);
  x.beginPath();x.moveTo(X(0),base-70);x.lineTo(X(lens),base-32);x.stroke();
  x.beginPath();x.moveTo(X(0),base-70);x.lineTo(X(lens),base-66);x.stroke();
  if(screen!=null){
    const spread=Math.min(52,12+focusErr(lens,screen,Focal)*2);
    x.beginPath();x.moveTo(X(lens),base-32);x.lineTo(X(screen),base-spread);x.stroke();
    x.beginPath();x.moveTo(X(lens),base-66);x.lineTo(X(screen),base+spread/2);x.stroke();
  }
  x.setLineDash([]);
}
function calcInput(O,key,val){
  return '<input class="table-calc conj-calc" type="number" step="0.0001" data-o="'+O+'" data-key="'+key+'" value="'+(val==null?'':val)+'">';
}
function allConjRecorded(){return lensPositions.every(O=>!!s.conj[String(O)])}
function allConjCalculated(){return lensPositions.every(O=>{const q=s.conjCalc[String(O)];return q&&Number.isFinite(+q.invP)&&Number.isFinite(+q.invPP)})}
function renderConj(){
  const l=+E('lensPos').value,sc=+E('screenPos').value,e=focusErr(l,sc);
  E('sharpness').value=e<.25?'SHARP':e<1?'near focus':'blurred';drawBench(E('conjCanvas'),l,sc);
  E('conjBody').innerHTML=lensPositions.map(O=>{
    const q=s.conj[String(O)];
    if(!q)return '<tr><td>'+O.toFixed(1)+'</td><td colspan="6">—</td></tr>';
    const d=s.conjDraft[String(O)]||s.conjCalc[String(O)]||{};
    return '<tr><td>'+q.O.toFixed(1)+'</td><td>'+q.p.toFixed(1)+'</td><td>'+q.pp.toFixed(1)+'</td><td>'+calcInput(O,'invP',d.invP)+'</td><td>'+calcInput(O,'invPP',d.invPP)+'</td><td>0.1</td><td>0.2</td></tr>';
  }).join('');
}
function recordConj(){
  const l=+E('lensPos').value,sc=+E('screenPos').value,e=focusErr(l,sc);
  if(e>.3){E('conjMessage').className='notice warn';E('conjMessage').textContent='The screen image is not sharp enough. Move the screen to the conjugate plane.';return}
  s.conj[String(l)]={O:l,p:-l,pp:sc-l};delete s.conjCalc[String(l)];delete s.conjDraft[String(l)];s.graphF=null;E('studentGraphF').value='';
  E('conjMessage').className='notice ok';E('conjMessage').textContent='Sharp conjugate pair recorded. Move the lens to another prescribed position and refocus the screen.';
  render();save();
}
function checkConjCalculations(){
  if(!allConjRecorded()){E('conjCalcMessage').className='notice warn';E('conjCalcMessage').textContent='Record sharp images at all five prescribed lens positions first.';return}
  const next={};
  for(const O of lensPositions){
    const q=s.conj[String(O)],d=s.conjDraft[String(O)]||{},invP=+d.invP,invPP=+d.invPP,ep=1/q.p,epp=1/q.pp;
    if(d.invP==null||d.invPP==null||!Number.isFinite(invP)||!Number.isFinite(invPP)){E('conjCalcMessage').className='notice warn';E('conjCalcMessage').textContent='Complete both reciprocal columns for every row.';return}
    if(Math.abs(invP-ep)>.0003||Math.abs(invPP-epp)>.0003){E('conjCalcMessage').className='notice warn';E('conjCalcMessage').textContent='Recheck the reciprocal calculation at O = '+O+' cm, including the sign of p.';return}
    next[String(O)]={invP,invPP};
  }
  s.conjCalc=next;s.conjDraft=JSON.parse(JSON.stringify(next));s.graphF=null;E('studentGraphF').value='';
  E('conjCalcMessage').className='notice ok';E('conjCalcMessage').textContent='Reciprocal table accepted. The conjugate-points graph is now built from your validated values.';
  render();save();
}
function linfit(ps){
  const n=ps.length,mx=ps.reduce((a,p)=>a+p.x,0)/n,my=ps.reduce((a,p)=>a+p.y,0)/n;
  let nu=0,de=0;ps.forEach(p=>{nu+=(p.x-mx)*(p.y-my);de+=(p.x-mx)**2});
  const b=nu/de,a=my-b*mx;return{a,b};
}
function graphFit(){
  if(!allConjCalculated())return null;
  const ps=lensPositions.map(O=>({x:+s.conjCalc[String(O)].invP,y:+s.conjCalc[String(O)].invPP})).sort((a,b)=>a.x-b.x);
  const fit=linfit(ps);return{ps,fit,f:1/fit.a};
}
function renderConjAnalysis(){
  const g=graphFit();
  if(g)U.plot(E('conjChart'),[{pts:g.ps}],{xlabel:'1/p (cm⁻¹)',ylabel:'1/p′ (cm⁻¹)'});
  else{
    const q=U.canvas(E('conjChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#6b8090';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Validate the reciprocal table to unlock the graph.',q.w/2,q.h/2);
  }
  E('fGraph').textContent=s.graphF!=null?Number(s.graphF).toFixed(2)+' cm':'—';
}
function checkGraphF(){
  const g=graphFit(),v=+E('studentGraphF').value;
  if(!g){E('graphCalcMessage').className='notice warn';E('graphCalcMessage').textContent='Validate the reciprocal table first.';return}
  if(!Number.isFinite(v)||v<=0){E('graphCalcMessage').className='notice warn';E('graphCalcMessage').textContent='Enter the focal length obtained from the graph intercept.';return}
  if(Math.abs(v-g.f)>.35){E('graphCalcMessage').className='notice warn';E('graphCalcMessage').textContent='Re-read the vertical intercept: 1/f′ is the intercept of 1/p′ versus 1/p.';return}
  s.graphF=v;E('graphCalcMessage').className='notice ok';E('graphCalcMessage').textContent='Graph focal length accepted.';analysis();save();
}

function besselRoots(){
  const disc=Math.sqrt(D*D-4*F*D);return[(D-disc)/2,(D+disc)/2];
}
function renderBessel(){
  const l=+E('besselLens').value,roots=besselRoots(),err=Math.min(...roots.map(r=>Math.abs(l-r)));
  E('besselSharp').value=err<.2?'SHARP':err<1?'near focus':'blurred';drawBench(E('besselCanvas'),l,D);
  const vals=[...s.bessel].sort((a,b)=>a-b);E('o1Out').textContent=vals[0]!=null?vals[0].toFixed(1)+' cm':'—';E('o2Out').textContent=vals[1]!=null?vals[1].toFixed(1)+' cm':'—';
  const c=s.besselCalc;E('dOut').textContent=c?c.d.toFixed(1)+' cm':'—';E('fBessel').textContent=c?c.f.toFixed(2)+' cm':'—';E('fBessel2').textContent=c?c.f.toFixed(2)+' cm':'—';E('gamma1').textContent=c?c.g1.toFixed(2):'—';E('gamma2').textContent=c?c.g2.toFixed(2):'—';
}
function recordBessel(){
  const l=+E('besselLens').value,roots=besselRoots(),near=roots.reduce((a,b)=>Math.abs(l-a)<Math.abs(l-b)?a:b);
  if(Math.abs(l-near)>.25){E('besselMessage').className='notice warn';E('besselMessage').textContent='The projected image is not sharp. Continue moving the lens.';return}
  if(!s.bessel.some(v=>Math.abs(v-near)<1))s.bessel.push(Math.round(l*10)/10);
  s.bessel.sort((a,b)=>a-b);s.besselCalc=null;['studentBesselD','studentBesselF','studentGamma1','studentGamma2'].forEach(id=>E(id).value='');
  E('besselMessage').className='notice ok';E('besselMessage').textContent=s.bessel.length===2?'Both Bessel positions recorded. Calculate d, f′ and the two magnifications.':'First sharp position recorded; find the second position on the other side.';
  render();save();
}
function checkBesselCalc(){
  if(s.bessel.length!==2){E('besselCalcMessage').className='notice warn';E('besselCalcMessage').textContent='Record both Bessel lens positions first.';return}
  const a=[...s.bessel].sort((x,y)=>x-y),d=a[1]-a[0],fb=(D*D-d*d)/(4*D),g1=(D-a[0])/a[0],g2=(D-a[1])/a[1];
  const sd=+E('studentBesselD').value,sf=+E('studentBesselF').value,sg1=+E('studentGamma1').value,sg2=+E('studentGamma2').value;
  if([sd,sf,sg1,sg2].some(v=>!Number.isFinite(v))){E('besselCalcMessage').className='notice warn';E('besselCalcMessage').textContent='Enter d, f′, |γ₁| and |γ₂|.';return}
  if(Math.abs(sd-d)>.15||Math.abs(sf-fb)>.15||Math.abs(sg1-g1)>.05||Math.abs(sg2-g2)>.05){E('besselCalcMessage').className='notice warn';E('besselCalcMessage').textContent='Recheck d=|O₂−O₁|, the Bessel focal-length formula and |γ|=p′/|p|.';return}
  s.besselCalc={d:sd,f:sf,g1:sg1,g2:sg2};E('besselCalcMessage').className='notice ok';E('besselCalcMessage').textContent='Bessel calculations accepted.';render();save();
}

function silberRoots(dd){
  if(dd<4*F)return[];
  const disc=Math.sqrt(Math.max(0,dd*dd-4*F*dd));return[(dd-disc)/2,(dd+disc)/2];
}
function renderSilber(){
  const dd=+E('silberD').value,l=+E('silberLens').value,roots=silberRoots(dd);
  drawBench(E('silberCanvas'),l,dd);
  let err=Infinity,status='no real image pair';
  if(roots.length){err=Math.min(...roots.map(r=>Math.abs(l-r)));const sep=roots[1]-roots[0];status=sep<.8?'positions merging':'two sharp positions';}
  E('silberSharp').value=err<.2?'SHARP':err<1?'near focus':'blurred';E('silberSep').value=status;
  E('fSilber').textContent=s.silberCalc?Number(s.silberCalc.f).toFixed(2)+' cm':'—';
}
function recordSilber(){
  const dd=+E('silberD').value,l=+E('silberLens').value,roots=silberRoots(dd),err=roots.length?Math.min(...roots.map(r=>Math.abs(l-r))):Infinity;
  if(Math.abs(dd-4*F)>.35||Math.abs(l-dd/2)>.35||err>.3){
    E('silberMessage').className='notice warn';
    E('silberMessage').textContent=dd>4*F?'The two sharp positions have not yet coalesced. Reduce D and search again.':dd<4*F?'D is below the coalescence condition; increase it slightly.':'Move the lens to the single sharp midpoint position.';
    return;
  }
  s.silber={D0:dd,lens:l};s.silberCalc=null;E('studentSilberF').value='';
  E('silberMessage').className='notice ok';E('silberMessage').textContent='Coalesced sharp position recorded. Calculate f′=D₀/4.';render();save();
}
function checkSilberCalc(){
  if(!s.silber){E('silberMessage').className='notice warn';E('silberMessage').textContent='Record the coalescence condition first.';return}
  const v=+E('studentSilberF').value,expected=s.silber.D0/4;
  if(!Number.isFinite(v)||v<=0){E('silberMessage').className='notice warn';E('silberMessage').textContent='Enter your Silbermann focal length.';return}
  if(Math.abs(v-expected)>.12){E('silberMessage').className='notice warn';E('silberMessage').textContent='Recalculate f′=D₀/4 from your measured coalescence distance.';return}
  s.silberCalc={f:v};E('silberMessage').className='notice ok';E('silberMessage').textContent='Silbermann focal length accepted.';render();save();
}

function renderAuto(){
  const l=+E('autoLens').value,e=Math.abs(l-F);E('autoSharp').value=e<.2?'image coincident':e<1?'near':'separate';drawBench(E('autoCanvas'),l,null,F,true);
  E('fAuto').textContent=s.auto!=null?Number(s.auto).toFixed(2)+' cm':'—';
}
function recordAuto(){
  const l=+E('autoLens').value;
  if(Math.abs(l-F)>.25){E('autoMessage').className='notice warn';E('autoMessage').textContent='The reflected image is not coincident with the object/hole plane.';return}
  s.auto=l;E('autoMessage').className='notice ok';E('autoMessage').textContent='Autocollimation coincidence recorded: the object–lens distance is the measured focal length.';render();save();
}

function pairVals(){
  const [a,b]=E('pairSelect').value.split(',').map(Number),fe=1/(1/a+1/b);return{a,b,fe};
}
function pairPrompt(){
  const q=pairVals();
  E('pairCalcPrompt').firstChild.nodeValue=q.b<0?'Inferred f_X / cm':'Theoretical fₑ / cm';
  const key=E('pairSelect').value,d=s.pairDraft[key]??s.pairCalcs[key]?.value??'';
  E('pairCalcValue').value=d;
}
function renderPair(){
  const q=pairVals(),m=+E('pairLens').value,e=Math.abs(m-q.fe);E('pairSharp').value=e<.2?'coincident':e<.8?'near':'separate';drawBench(E('assocCanvas'),m,null,q.fe,true);
  E('pairBody').innerHTML=['20,10','20,5','10,-20'].map(key=>{
    const r=s.pairs[key],c=s.pairCalcs[key];return '<tr><td>'+pairLabelFromKey(key)+'</td><td>'+(r?Number(r.meas).toFixed(2):'—')+'</td><td>'+(c?(c.type==='inferred'?'f_X = ':'fₑ,theory = ')+Number(c.value).toFixed(2)+' cm':'—')+'</td></tr>';
  }).join('');
  pairPrompt();
}
function recordPair(){
  const q=pairVals(),m=+E('pairLens').value,key=E('pairSelect').value;
  if(Math.abs(m-q.fe)>.25){E('pairMessage').className='notice warn';E('pairMessage').textContent='Autocollimation has not yet returned the image to the object plane.';return}
  s.pairs[key]={label:pairLabelFromKey(key),meas:m};delete s.pairCalcs[key];delete s.pairDraft[key];E('pairCalcValue').value='';
  E('pairMessage').className='notice ok';E('pairMessage').textContent=q.b<0?'Equivalent focal length recorded. Infer the unknown divergent focal length from the vergence law.':'Equivalent focal length recorded. Calculate the theoretical attached-lens focal length.';
  render();save();
}
function checkPairCalc(){
  const q=pairVals(),key=E('pairSelect').value,r=s.pairs[key],v=+E('pairCalcValue').value;
  if(!r){E('pairCalcMessage').className='notice warn';E('pairCalcMessage').textContent='Record the equivalent focal length of the selected pair first.';return}
  if(!Number.isFinite(v)){E('pairCalcMessage').className='notice warn';E('pairCalcMessage').textContent='Enter the requested focal-length calculation.';return}
  const expected=q.b<0?1/(1/r.meas-1/q.a):q.fe;
  if(Math.abs(v-expected)>.25){E('pairCalcMessage').className='notice warn';E('pairCalcMessage').textContent=q.b<0?'Rearrange 1/fₑ=1/f₁+1/f_X using your measured fₑ.':'Recalculate the theoretical equivalent focal length from the two known vergences.';return}
  s.pairCalcs[key]={type:q.b<0?'inferred':'theory',value:v};s.pairDraft[key]=v;E('pairCalcMessage').className='notice ok';E('pairCalcMessage').textContent=q.b<0?'Divergent-lens focal length accepted.':'Attached-lens theoretical value accepted.';render();save();
}

function methodStats(){
  const vals=[s.graphF,s.besselCalc?.f,s.silberCalc?.f,s.auto].filter(v=>Number.isFinite(+v)).map(Number);
  if(vals.length<3)return null;
  return{vals,mean:vals.reduce((a,b)=>a+b,0)/vals.length,spread:Math.max(...vals)-Math.min(...vals)};
}
function analysis(){
  renderConjAnalysis();
  const st=methodStats();
  if(s.comparison&&st&&(Math.abs(+s.comparison.mean-st.mean)>.08||Math.abs(+s.comparison.spread-st.spread)>.08))s.comparison=null;
  E('meanFOut').textContent=s.comparison?Number(s.comparison.mean).toFixed(2)+' cm':'—';
  E('spreadFOut').textContent=s.comparison?Number(s.comparison.spread).toFixed(2)+' cm':'—';
  if(!st){
    E('comparisonMessage').className='notice';E('comparisonMessage').textContent='Complete and validate at least three methods.';
  }else if(!s.comparison){
    E('comparisonMessage').className='notice';E('comparisonMessage').textContent='At least three methods are complete. Calculate their mean focal length and the max–min method spread.';
  }else{
    E('comparisonMessage').className='notice ok';E('comparisonMessage').textContent='Method comparison accepted. Discuss which positioning condition was easiest to identify precisely and which method appears most sensitive to reading uncertainty.';
  }
}
function checkMethodComparison(){
  const st=methodStats();if(!st){E('comparisonMessage').className='notice warn';E('comparisonMessage').textContent='Complete and validate at least three independent focal-length methods first.';return}
  const mean=+E('studentMeanF').value,spread=+E('studentSpreadF').value;
  if(!Number.isFinite(mean)||!Number.isFinite(spread)||mean<=0||spread<0){E('comparisonMessage').className='notice warn';E('comparisonMessage').textContent='Enter your calculated mean focal length and max–min spread.';return}
  if(Math.abs(mean-st.mean)>.08){E('comparisonMessage').className='notice warn';E('comparisonMessage').textContent='Recalculate the mean using only the completed validated focal-length methods shown on this page.';return}
  if(Math.abs(spread-st.spread)>.08){E('comparisonMessage').className='notice warn';E('comparisonMessage').textContent='Recalculate the method spread as maximum f minus minimum f.';return}
  s.comparison={mean,spread};analysis();save();
}
function render(){
  renderConj();renderBessel();renderSilber();renderAuto();renderPair();analysis();
}
function buildReport(){
  const pairDone=Object.keys(s.pairCalcs).length;
  const summary='<p><b>Conjugate pairs:</b> '+Object.keys(s.conj).length+'/5; reciprocal table '+(allConjCalculated()?'validated':'incomplete')+'; <b>f graph:</b> '+E('fGraph').textContent+'.</p><p><b>Bessel:</b> '+E('fBessel2').textContent+' · <b>Silbermann:</b> '+E('fSilber').textContent+' · <b>Autocollimation:</b> '+E('fAuto').textContent+'.</p><p><b>Method comparison:</b> '+(s.comparison?'mean f='+Number(s.comparison.mean).toFixed(2)+' cm, spread='+Number(s.comparison.spread).toFixed(2)+' cm':'not validated')+'. <b>Lens associations:</b> '+pairDone+'/3 calculations validated.</p>';
  return U.report('Laboratory Practical 3 — Focometry',summary);
}

U.tabs();
if(s.graphF!=null)E('studentGraphF').value=s.graphF;
if(s.besselCalc){E('studentBesselD').value=s.besselCalc.d;E('studentBesselF').value=s.besselCalc.f;E('studentGamma1').value=s.besselCalc.g1;E('studentGamma2').value=s.besselCalc.g2}
if(s.silberCalc)E('studentSilberF').value=s.silberCalc.f;
if(s.comparison){E('studentMeanF').value=s.comparison.mean;E('studentSpreadF').value=s.comparison.spread;}
['lensPos','screenPos','besselLens','silberD','silberLens','autoLens','pairLens'].forEach(id=>E(id).addEventListener('input',render));
E('pairSelect').addEventListener('change',render);
E('conjBody').addEventListener('input',e=>{
  if(!e.target.matches('.conj-calc'))return;
  const O=e.target.dataset.o,key=e.target.dataset.key;s.conjDraft[O]=s.conjDraft[O]||{};
  s.conjDraft[O][key]=e.target.value.trim()===''?null:+e.target.value;save();
});
E('pairCalcValue').addEventListener('input',e=>{s.pairDraft[E('pairSelect').value]=e.target.value.trim()===''?null:+e.target.value;save()});
E('recordConj').onclick=recordConj;E('checkConjCalculations').onclick=checkConjCalculations;E('checkGraphF').onclick=checkGraphF;
E('recordBessel').onclick=recordBessel;E('checkBesselCalc').onclick=checkBesselCalc;
E('recordSilber').onclick=recordSilber;E('checkSilberCalc').onclick=checkSilberCalc;
E('recordAuto').onclick=recordAuto;E('recordPair').onclick=recordPair;E('checkPairCalc').onclick=checkPairCalc;E('checkMethodComparison').onclick=checkMethodComparison;
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',render);
render();save();
})();