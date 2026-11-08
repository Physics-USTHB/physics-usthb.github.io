(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_O02_v3',E0=.40,C_KNOWN=.470e-6,TAU=Math.PI*2;
function priorState(){return U.load('VOM_O01_v3',null)}
function makeRun(){
  const p=priorState();
  if(p?.run&&Number.isFinite(+p.run.L)&&Number.isFinite(+p.run.Rr))return{id:'O02-'+(p.run.id||'LINKED'),L:+p.run.L,Rr:+p.run.Rr,Rx:+p.run.Rx,Cx:+p.run.Cx,linked:true};
  return{id:'O02-'+Math.random().toString(36).slice(2,7).toUpperCase(),L:.019+Math.random()*.0025,Rr:20+Math.random()*8,Rx:12+Math.random()*16,Cx:(.62+Math.random()*.12)*1e-6,linked:false};
}
let s=U.load(K,null);
if(!s||s.version!==3)s={version:3,run:makeRun(),records:{r0:[],r100:[],unknown:[]},analysis:{r0:null,r100:null,unknown:null}};
s.records=s.records||{r0:[],r100:[],unknown:[]};s.analysis=s.analysis||{r0:null,r100:null,unknown:null};
function save(){U.save(K,s)}
function keyForCurrent(){if(E('spec').value==='unknown')return'unknown';return +E('R').value===100?'r100':'r0'}
function params(){
  const unknown=E('spec').value==='unknown',C=unknown?s.run.Cx:C_KNOWN,Rt=unknown?s.run.Rr+s.run.Rx:s.run.Rr+(+E('R').value),f=+E('freq').value,w=TAU*f;
  const re=1-s.run.L*C*w*w,im=Rt*C*w,den=Math.hypot(re,im),V0=E0/den,phi=-Math.atan2(im,re)*180/Math.PI;
  return{unknown,C,Rt,f,w,V0,phi};
}
function setupCanvas(){const c=E('scope'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function drawScope(){
  const{x,w,h}=setupCanvas();U.grid(x,w,h);const p=params(),td=+E('tdiv').value*1e-6,v1=+E('vdiv1').value,v2=+E('vdiv2').value,Tview=10*td;
  E('freqRead').textContent=p.f.toFixed(0)+' Hz';
  const ch1=[],ch2=[];
  for(let i=0;i<=1000;i++){const t=Tview*i/1000,ang=TAU*p.f*t;ch1.push({x:w*i/1000,y:h/2-E0*Math.sin(ang)/v1*(h/8)});ch2.push({x:w*i/1000,y:h/2-p.V0*Math.sin(ang+p.phi*Math.PI/180)/v2*(h/8)});}
  x.strokeStyle='#ffd166';x.lineWidth=2;x.beginPath();ch1.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
  x.strokeStyle='#69e7ff';x.beginPath();ch2.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
}
function clearMeasure(){['studentAmpDiv','studentPeriodDiv','studentDtDiv','studentV0','studentPhi'].forEach(id=>E(id).value='')}
function recordPoint(){
  const key=keyForCurrent(),p=params();
  if(key==='unknown'&&!priorState()?.knownAnalysis){E('msg').className='notice warn';E('msg').textContent='Complete Practical 1’s accepted L and Rᵣ analysis in this browser before measuring the linked unknown specimen.';return}
  const td=+E('tdiv').value*1e-6,v2=+E('vdiv2').value,ampDiv=p.V0/v2,periodDiv=(1/p.f)/td,dtDiv=(p.phi/360)*periodDiv;
  if(ampDiv<.4||ampDiv>3.7||periodDiv<1||periodDiv>8){E('msg').className='notice warn';E('msg').textContent='Adjust CH2 VOLT/DIV and TIME/DIV so the response amplitude and one full period are clearly readable.';return}
  const ids=['studentAmpDiv','studentPeriodDiv','studentDtDiv','studentV0','studentPhi'],raw=ids.map(id=>E(id).value.trim());
  if(raw.some(v=>v==='')){E('msg').className='notice warn';E('msg').textContent='Enter the CH2 amplitude, period, signed Δt, calculated V₀ and phase before validation.';return}
  const [a,pd,dd,V0,phi]=raw.map(Number);
  if([a,pd,dd,V0,phi].some(v=>!Number.isFinite(v))||a<=0||pd<=0||V0<=0){E('msg').className='notice warn';E('msg').textContent='Enter valid graticule readings and calculations.';return}
  if(Math.abs(a-ampDiv)>.09){E('msg').className='notice warn';E('msg').textContent='Re-read the CH2 peak amplitude in vertical divisions.';return}
  if(Math.abs(pd-periodDiv)>.10){E('msg').className='notice warn';E('msg').textContent='Re-read one full period in horizontal divisions.';return}
  if(Math.abs(dd-dtDiv)>.10){E('msg').className='notice warn';E('msg').textContent='Re-read the signed horizontal displacement between corresponding CH1 and CH2 points.';return}
  const vcalc=a*v2,phicalc=360*dd/pd;
  if(Math.abs(V0-vcalc)>Math.max(.008,.025*vcalc)){E('msg').className='notice warn';E('msg').textContent='Recalculate V₀ = CH2 divisions × CH2 VOLT/DIV.';return}
  if(Math.abs(phi-phicalc)>2.5){E('msg').className='notice warn';E('msg').textContent='Recalculate φ = 360° Δt/T using the signed graticule displacement.';return}
  const rec={f:p.f,V0,phi,R:key==='r100'?100:key==='r0'?0:null};
  const arr=s.records[key],i=arr.findIndex(q=>q.f===rec.f);if(i>=0)arr[i]=rec;else arr.push(rec);arr.sort((a,b)=>a.f-b.f);s.analysis[key]=null;
  E('msg').className='notice ok';E('msg').textContent='Frequency point accepted. Continue the scan and add closer points near resonance or the −90° crossing.';
  clearMeasure();renderAll();save();
}
function interpolateCross(a,b,target,key){
  const ya=a[key],yb=b[key];if((ya-target)*(yb-target)>0||yb===ya)return null;const t=(target-ya)/(yb-ya);return a.f+t*(b.f-a.f);
}
function knownMetrics(key){
  const a=s.records[key];if(a.length<12)return null;
  let imax=0;for(let i=1;i<a.length;i++)if(a[i].V0>a[imax].V0)imax=i;
  if(imax===0||imax===a.length-1)return null;
  const peak=a[imax],target=peak.V0/Math.sqrt(2);let f1=null,f2=null;
  for(let i=1;i<=imax;i++){const q=interpolateCross(a[i-1],a[i],target,'V0');if(q!=null)f1=q}
  for(let i=imax+1;i<a.length;i++){const q=interpolateCross(a[i-1],a[i],target,'V0');if(q!=null){f2=q;break}}
  if(f1==null||f2==null)return null;
  const min=a[0].f,max=a.at(-1).f;if(min>1200||max<10000)return null;
  const bw=f2-f1;if(!(bw>0))return null;
  return{fr:peak.f,Vmax:peak.V0,f1,f2,bw,Qb:peak.f/bw,Qa:peak.V0/E0,target};
}
function loadKnownFields(){
  const a=s.analysis[E('analysisR').value];['studentFr','studentVmax','studentF1','studentF2','studentBw','studentQb','studentQa'].forEach(id=>E(id).value='');
  if(a){E('studentFr').value=a.fr;E('studentVmax').value=a.Vmax;E('studentF1').value=a.f1;E('studentF2').value=a.f2;E('studentBw').value=a.bw;E('studentQb').value=a.Qb;E('studentQa').value=a.Qa}
}
function checkKnownAnalysis(){
  const key=E('analysisR').value,m=knownMetrics(key);
  if(!m){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='The selected scan is not complete enough. Record at least 12 points, include the low/high ends of the range, and cross Vmax/√2 on both sides of the peak.';return}
  const ids=['studentFr','studentVmax','studentF1','studentF2','studentBw','studentQb','studentQa'],raw=ids.map(id=>E(id).value.trim());
  if(raw.some(v=>v==='')){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter fᵣ, Vmax, f₁, f₂, Δf and both Q estimates.';return}
  const [fr,Vmax,f1,f2,bw,Qb,Qa]=raw.map(Number);
  if(Math.abs(fr-m.fr)>55||Math.abs(Vmax-m.Vmax)>Math.max(.015,.03*m.Vmax)||Math.abs(f1-m.f1)>70||Math.abs(f2-m.f2)>70){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Re-read the peak and Vmax/√2 crossings from your measured response curve.';return}
  if(Math.abs(bw-(f2-f1))>25){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate Δf=f₂−f₁.';return}
  if(Math.abs(Qb-fr/bw)>Math.max(.08,.035*fr/bw)){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate Q=fᵣ/Δf.';return}
  if(Math.abs(Qa-Vmax/E0)>Math.max(.08,.035*Vmax/E0)){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate the amplitude estimate Q≈Vmax/e₀ with e₀=0.40 V.';return}
  s.analysis[key]={fr,Vmax,f1,f2,bw,Qb,Qa};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Resonance analysis accepted. Repeat for the other resistance and compare peak height, bandwidth and Q.';
  renderAnalysis();save();
}
function unknownCrossing(){
  const a=s.records.unknown;if(a.length<6)return null;
  for(let i=1;i<a.length;i++){
    const x=a[i-1],y=a[i];if((x.phi+90)*(y.phi+90)<=0&&y.phi!==x.phi){
      const t=(-90-x.phi)/(y.phi-x.phi),f0=x.f+t*(y.f-x.f),V0=x.V0+t*(y.V0-x.V0);return{f0,V0};
    }
  }
  return null;
}
function checkUnknownAnalysis(){
  const prior=priorState()?.knownAnalysis,cross=unknownCrossing();
  if(!prior){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Complete Practical 1’s accepted L and Rᵣ analysis in this browser first.';return}
  if(!cross){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Record at least six unknown-specimen points spanning the −90° phase crossing.';return}
  const LmH=+E('studentPriorL').value,Rr=+E('studentPriorRr').value,f0=+E('studentUnknownF0').value,V0=+E('studentUnknownV0').value,Rx=+E('studentUnknownRx').value,Cx=+E('studentUnknownCx').value;
  if([LmH,Rr,f0,V0,Rx,Cx].some(v=>!Number.isFinite(v)||v<=0)){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Enter the Practical 1 values, f₀, V₀ at f₀, Rₓ and Cₓ.';return}
  if(Math.abs(LmH-prior.L*1e3)>Math.max(.15,.015*prior.L*1e3)||Math.abs(Rr-prior.Rr)>Math.max(.8,.025*prior.Rr)){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Use your accepted L and Rᵣ values from Practical 1.';return}
  if(Math.abs(f0-cross.f0)>75||Math.abs(V0-cross.V0)>Math.max(.012,.04*cross.V0)){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Interpolate f₀ and V₀ where your measured phase curve crosses −90°.';return}
  const L=LmH/1e3,w=TAU*f0,eCx=1/(L*w*w)*1e6,eRt=E0*w*L/V0,eRx=eRt-Rr;
  if(Math.abs(Rx-eRx)>Math.max(1.5,.05*Math.abs(eRx))){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='At f₀, use Rₜ=e₀ω₀L/V₀ and subtract Rᵣ to obtain Rₓ.';return}
  if(Math.abs(Cx-eCx)>Math.max(.008,.04*eCx)){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Recalculate Cₓ=1/(Lω₀²) and convert the result to µF.';return}
  s.analysis.unknown={L:LmH/1e3,Rr,f0,V0,Rx,Cx};E('unknownMsg').className='notice ok';E('unknownMsg').textContent='Unknown-specimen determination accepted.';
  renderAnalysis();save();
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function drawCharts(){
  const defs=[['r0','#27abc0'],['r100','#df8d47'],['unknown','#7551a1']],amp=[],phase=[];
  defs.forEach(([k,col])=>{if(s.records[k].length){amp.push({pts:s.records[k].map(q=>({x:q.f,y:q.V0})),color:col});phase.push({pts:s.records[k].map(q=>({x:q.f,y:q.phi})),color:col});}});
  if(amp.length)U.plot(E('ampChart'),amp,{xlabel:'drive frequency / Hz',ylabel:'V₀ / V',xmin:1000,xmax:12000,ymin:0});else blank(E('ampChart'),'Validate frequency points to build V₀(f).');
  if(phase.length)U.plot(E('phaseChart'),phase,{xlabel:'drive frequency / Hz',ylabel:'phase lag / °',xmin:1000,xmax:12000,ymin:-190,ymax:5});else blank(E('phaseChart'),'Validate frequency points to build φ(f).');
}
function renderTable(){
  const rows=[];for(const k of ['r0','r100','unknown'])for(const q of s.records[k])rows.push({k,...q});rows.sort((a,b)=>a.f-b.f);
  E('body').innerHTML=rows.length?rows.map(q=>'<tr><td>'+(q.k==='unknown'?'unknown':'known')+'</td><td>'+(q.R==null?'—':q.R)+'</td><td>'+q.f.toFixed(0)+'</td><td>'+q.V0.toFixed(3)+'</td><td>'+q.phi.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="5">No validated frequency points yet.</td></tr>';
  E('r0Count').textContent=s.records.r0.length;E('r100Count').textContent=s.records.r100.length;E('unknownCount').textContent=s.records.unknown.length;
}
function renderAnalysis(){
  const a=s.analysis[E('analysisR').value];E('frOut').textContent=a?a.fr.toFixed(0)+' Hz':'—';E('bwOut').textContent=a?a.bw.toFixed(0)+' Hz':'—';E('qbOut').textContent=a?a.Qb.toFixed(2):'—';E('qaOut').textContent=a?a.Qa.toFixed(2):'—';
  const u=s.analysis.unknown;E('unknownF0Out').textContent=u?u.f0.toFixed(0)+' Hz':'—';E('unknownRxOut').textContent=u?u.Rx.toFixed(1)+' Ω':'—';E('unknownCxOut').textContent=u?u.Cx.toFixed(3)+' µF':'—';
}
function renderAll(){drawScope();renderTable();drawCharts();renderAnalysis()}
function syncSpec(){
  const unknown=E('spec').value==='unknown';E('R').disabled=unknown;if(unknown)E('R').value=0;clearMeasure();
  if(unknown&&!priorState()?.knownAnalysis){E('msg').className='notice warn';E('msg').textContent='The unknown specimen uses your Practical 1 L and Rᵣ. Complete that analysis first.';}
  else{E('msg').className='notice';E('msg').textContent='Choose scales that make one period and the CH2 amplitude readable, then measure V₀ and signed Δt.';}
  drawScope();
}
function newRun(){
  if((s.records.r0.length||s.records.r100.length||s.records.unknown.length)&&!confirm('Start a new Practical 2 dataset? Existing resonance scans will be cleared.'))return;
  s={version:3,run:makeRun(),records:{r0:[],r100:[],unknown:[]},analysis:{r0:null,r100:null,unknown:null}};
  E('spec').value='known';E('R').value=0;E('freq').value=2000;E('tdiv').value=100;E('vdiv1').value=.2;E('vdiv2').value=.5;
  ['studentFr','studentVmax','studentF1','studentF2','studentBw','studentQb','studentQa','studentPriorL','studentPriorRr','studentUnknownF0','studentUnknownV0','studentUnknownRx','studentUnknownCx'].forEach(id=>E(id).value='');clearMeasure();loadKnownFields();syncSpec();renderAll();save();
}
function buildReport(){
  const fmt=k=>{const a=s.analysis[k];return a?((k==='r0'?'R=0':'R=100')+': fr='+a.fr.toFixed(0)+' Hz, Δf='+a.bw.toFixed(0)+' Hz, Qbw='+a.Qb.toFixed(2)+', Qamp='+a.Qa.toFixed(2)):((k==='r0'?'R=0':'R=100')+': not validated')};
  const u=s.analysis.unknown;
  const summary='<p><b>Validated scan points:</b> R=0: '+s.records.r0.length+', R=100: '+s.records.r100.length+', unknown: '+s.records.unknown.length+'.</p><p><b>Known-circuit analyses:</b> '+fmt('r0')+' · '+fmt('r100')+'.</p><p><b>Unknown specimen:</b> '+(u?'f₀='+u.f0.toFixed(0)+' Hz, V₀='+u.V0.toFixed(3)+' V, Rₓ='+u.Rx.toFixed(1)+' Ω, Cₓ='+u.Cx.toFixed(3)+' µF.':'not validated.')+'</p>';
  return U.report('Laboratory Practical 2 — Forced Oscillations — 1 Degree of Freedom',summary);
}
U.tabs();
['freq','tdiv','vdiv1','vdiv2'].forEach(id=>E(id).addEventListener('input',()=>{clearMeasure();drawScope()}));
E('R').addEventListener('change',()=>{clearMeasure();drawScope()});E('spec').addEventListener('change',syncSpec);
E('record').onclick=recordPoint;E('checkKnownAnalysis').onclick=checkKnownAnalysis;E('checkUnknownAnalysis').onclick=checkUnknownAnalysis;E('newRun').onclick=newRun;
E('analysisR').addEventListener('change',()=>{loadKnownFields();renderAnalysis()});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.analysis.unknown){const u=s.analysis.unknown;E('studentPriorL').value=u.L*1e3;E('studentPriorRr').value=u.Rr;E('studentUnknownF0').value=u.f0;E('studentUnknownV0').value=u.V0;E('studentUnknownRx').value=u.Rx;E('studentUnknownCx').value=u.Cx}
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
loadKnownFields();syncSpec();window.addEventListener('resize',renderAll);renderAll();save();
})();