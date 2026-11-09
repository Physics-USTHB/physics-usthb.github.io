(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W01_v4',G=9.81,LP=1.00,TAU=Math.PI*2,APOS=[10,15,20,25,30,35,40,45,50,55,60,65,70,75,80];
let s=U.load(K,null);
if(!s||s.version!==4)s={version:4,simple:null,simpleTheory:null,records:{},conclusion:''};
s.records=s.records||{};s.conclusion=s.conclusion||'';
function save(){U.save(K,s)}
function T0(){return TAU*Math.sqrt(LP/G)}
function model(a){
  // The in-phase mode leaves the coupling spring unextended: ω1²=g/L.
  // The anti-phase mode adds spring restoring torque ∝a²: ω2²=ω1²+2κ(a)ω1².
  const kappa=(.28/(1-.28))*(a/80)**2,w0=TAU/T0(),w1=w0,w2=w0*Math.sqrt(1+2*kappa);
  const Kc=kappa/(1+kappa),f1=w1/TAU,f2=w2/TAU;
  // Consecutive maxima of the energy/amplitude-magnitude envelope are 1/|f2−f1| apart.
  return{K:Kc,w1,w2,f1,f2,T1:1/f1,T2:1/f2,Tosc:2/(f1+f2),Tbeat:1/Math.abs(f2-f1)};
}
function rec(a){return s.records[String(a)]||(s.records[String(a)]={a,m1:null,m2:null,fast:null,beat:null,K:null,beatCheck:null})}
function signal(t,mode,a){
  const m=model(a);
  if(mode==='simple'){const q=Math.cos(TAU*t/T0());return{q1:q,q2:0};}
  if(mode==='m1'){const q=Math.cos(m.w1*t);return{q1:q,q2:q};}
  if(mode==='m2'){const q=Math.cos(m.w2*t);return{q1:q,q2:-q};}
  return{q1:.5*(Math.cos(m.w1*t)-Math.cos(m.w2*t)),q2:.5*(Math.cos(m.w1*t)+Math.cos(m.w2*t))};
}
function spanFor(){
  const mode=E('mode').value,a=+E('aPos').value,target=E('timingTarget').value;
  if(mode==='simple')return 110;
  if(mode==='beats'&&target==='beat')return Math.min(300,Math.max(35,model(a).Tbeat*1.35));
  return 30;
}
function setupCanvas(){const c=E('pendCanvas'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function draw(){
  const{x,w,h}=setupCanvas(),mode=E('mode').value,a=+E('aPos').value,span=spanFor(),m=model(a),top=24,cx1=w*.35,cx2=w*.65,len=Math.min(120,h*.28);
  x.fillStyle='#eef5f6';x.fillRect(0,0,w,h);
  const sample=signal(span*.11,mode,a),ang1=.34*sample.q1,ang2=.34*sample.q2;
  const pend=(cx,ang,label)=>{const bx=cx+len*Math.sin(ang),by=top+len*Math.cos(ang);x.strokeStyle='#486270';x.lineWidth=4;x.beginPath();x.moveTo(cx,top);x.lineTo(bx,by);x.stroke();x.fillStyle='#c36543';x.beginPath();x.arc(bx,by,13,0,TAU);x.fill();x.fillStyle='#173e58';x.font='700 11px system-ui';x.fillText(label,cx-5,top-7)};
  pend(cx1,ang1,'1');if(mode!=='simple')pend(cx2,ang2,'2');
  if(mode!=='simple'){const y=top+Math.max(15,a/80*len);x.strokeStyle='#7da44c';x.lineWidth=3;x.beginPath();x.moveTo(cx1,y);x.lineTo(cx2,y);x.stroke();}
  const y0=h*.73,gh=h*.22,left=25,right=w-20,X=t=>left+t/span*(right-left),p1=[],p2=[];
  for(let i=0;i<=1200;i++){const t=span*i/1200,q=signal(t,mode,a);p1.push({x:X(t),y:y0-q.q1*gh*.42});p2.push({x:X(t),y:y0-q.q2*gh*.42});}
  x.strokeStyle='#d69b25';x.lineWidth=1.6;x.beginPath();p1.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
  if(mode!=='simple'){x.strokeStyle='#2697b0';x.beginPath();p2.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();}
  E('cursor1').max=span;E('cursor2').max=span;for(const id of ['cursor1','cursor2'])if(+E(id).value>span)E(id).value=span;
  x.setLineDash([5,4]);[['cursor1','#7658a8'],['cursor2','#d8584b']].forEach(([id,col])=>{x.strokeStyle=col;const xx=X(+E(id).value);x.beginPath();x.moveTo(xx,y0-gh/2);x.lineTo(xx,y0+gh/2);x.stroke();});x.setLineDash([]);
  E('aRead').textContent=a+' cm';E('t1Out').textContent=(+E('cursor1').value).toFixed(2)+' s';E('t2Out').textContent=(+E('cursor2').value).toFixed(2)+' s';
  E('timingTarget').disabled=mode!=='beats';
}
function clearTiming(){['studentCycles','studentPeriod'].forEach(id=>E(id).value='')}
function validateTiming(){
  const mode=E('mode').value,a=+E('aPos').value,target=E('timingTarget').value,dt=Math.abs(+E('cursor2').value-(+E('cursor1').value)),raw=[E('studentCycles').value.trim(),E('studentPeriod').value.trim()];
  if(raw.some(v=>v==='')){E('msg').className='notice warn';E('msg').textContent='Enter the counted number of periods and T=Δt/N.';return}
  const N=+raw[0],T=+raw[1];if(!Number.isInteger(N)||N<1||!Number.isFinite(T)||T<=0){E('msg').className='notice warn';E('msg').textContent='Enter an integer cycle count and a positive period.';return}
  let trueT,minN,label;
  if(mode==='simple'){trueT=T0();minN=45;label='uncoupled period';}
  else if(mode==='m1'){trueT=model(a).T1;minN=10;label='mode-1 period';}
  else if(mode==='m2'){trueT=model(a).T2;minN=10;label='mode-2 period';}
  else if(target==='fast'){trueT=model(a).Tosc;minN=5;label='fast beat oscillation';}
  else{if(a<40){E('msg').className='notice warn';E('msg').textContent='For a reliable envelope timing in this virtual bench, choose a ≥ 40 cm; weaker coupling gives an impractically long beat period.';return}trueT=model(a).Tbeat;minN=1;label='beat envelope';}
  if(N<minN){E('msg').className='notice warn';E('msg').textContent='Use at least '+minN+' complete '+label+' cycles.';return}
  if(Math.abs(dt-N*trueT)>Math.max(.08,.025*N*trueT)){E('msg').className='notice warn';E('msg').textContent='Move the cursors to equivalent phases and recount the selected periods.';return}
  const calc=dt/N;if(Math.abs(T-calc)>Math.max(.01,.015*calc)){E('msg').className='notice warn';E('msg').textContent='Recalculate T=(t₂−t₁)/N.';return}
  if(mode==='simple'){s.simple={N,T};s.simpleTheory=null;E('studentTheoryT').value='';E('msg').className='notice ok';E('msg').textContent='Uncoupled timing accepted. Attach the spring and measure both normal modes at many positions.';}
  else{const r=rec(a);if(mode==='m1')r.m1={N,T};else if(mode==='m2')r.m2={N,T};else if(target==='fast')r.fast={N,T};else r.beat={N,T};r.K=null;r.beatCheck=null;E('studentK').value='';E('studentToscPred').value='';E('studentTbeatPred').value='';E('msg').className='notice ok';E('msg').textContent=label+' timing accepted at a='+a+' cm.';}
  clearTiming();renderAll();save();
}
function checkTheory(){
  if(!s.simple){E('simpleMsg').className='notice warn';E('simpleMsg').textContent='Measure the uncoupled period first.';return}
  const v=+E('studentTheoryT').value,e=T0();if(!Number.isFinite(v)||v<=0){E('simpleMsg').className='notice warn';E('simpleMsg').textContent='Enter the theoretical period.';return}
  if(Math.abs(v-e)>.015){E('simpleMsg').className='notice warn';E('simpleMsg').textContent='Recalculate T₀=2π√(L/g) with L=1.00 m.';return}
  s.simpleTheory=v;E('simpleMsg').className='notice ok';E('simpleMsg').textContent='Theoretical period accepted. Compare it with the 50-period timing result.';renderAll();save();
}
function availableA(){return APOS.filter(a=>{const r=s.records[String(a)];return r?.m1&&r?.m2})}
function syncAnalysisA(){
  const vals=availableA(),prev=+E('analysisA').value;E('analysisA').innerHTML=vals.length?vals.map(a=>'<option value="'+a+'">a = '+a+' cm</option>').join(''):'<option value="">Measure both modes first</option>';
  if(vals.includes(prev))E('analysisA').value=prev;else if(vals.length)E('analysisA').value=vals[0];
  loadAnalysis();
}
function loadAnalysis(){
  const a=+E('analysisA').value,r=s.records[String(a)];E('studentK').value=r?.K??'';E('studentToscPred').value=r?.beatCheck?.Tosc??'';E('studentTbeatPred').value=r?.beatCheck?.Tbeat??'';
}
function checkK(){
  const a=+E('analysisA').value,r=s.records[String(a)];if(!r?.m1||!r?.m2){E('kMsg').className='notice warn';E('kMsg').textContent='Measure both normal modes at the selected spring position first.';return}
  const f1=1/r.m1.T,f2=1/r.m2.T,e=(f2*f2-f1*f1)/(f2*f2+f1*f1),v=+E('studentK').value;
  if(!Number.isFinite(v)||v<=0){E('kMsg').className='notice warn';E('kMsg').textContent='Enter K from the two measured mode frequencies.';return}
  if(Math.abs(v-e)>.006){E('kMsg').className='notice warn';E('kMsg').textContent='Recalculate K=(ω₂²−ω₁²)/(ω₂²+ω₁²).';return}
  r.K=v;E('kMsg').className='notice ok';E('kMsg').textContent='Coupling coefficient accepted for a='+a+' cm.';renderAll();save();
}
function checkBeat(){
  const a=+E('analysisA').value,r=s.records[String(a)];if(!r?.m1||!r?.m2||!r?.fast||!r?.beat){E('beatMsg').className='notice warn';E('beatMsg').textContent='Select a position with both normal modes and both direct beat timings.';return}
  const f1=1/r.m1.T,f2=1/r.m2.T,eFast=2/(f1+f2),eBeat=1/Math.abs(f2-f1),vf=+E('studentToscPred').value,vb=+E('studentTbeatPred').value;
  if(!Number.isFinite(vf)||!Number.isFinite(vb)||vf<=0||vb<=0){E('beatMsg').className='notice warn';E('beatMsg').textContent='Enter both reconstructed periods.';return}
  if(Math.abs(vf-eFast)>Math.max(.015,.025*eFast)||Math.abs(vb-eBeat)>Math.max(.12,.03*eBeat)){E('beatMsg').className='notice warn';E('beatMsg').textContent='Recalculate Tosc=2/(f₁+f₂) and the successive beat-envelope maxima period Tbeat=1/|f₂−f₁|.';return}
  r.beatCheck={Tosc:vf,Tbeat:vb,fastErr:100*(r.fast.T-vf)/vf,beatErr:100*(r.beat.T-vb)/vb};E('beatMsg').className='notice ok';E('beatMsg').textContent='Beat reconstruction accepted. Compare direct and reconstructed timings in your discussion.';renderAll();save();
}
function drawChart(){
  const rows=APOS.map(a=>s.records[String(a)]).filter(r=>r?.K&&r.m1&&r.m2),a1=rows.map(r=>({x:r.K,y:r.m1.T})),a2=rows.map(r=>({x:r.K,y:r.m2.T}));
  if(rows.length)U.plot(E('chart'),[{pts:a1,color:'#2baac3'},{pts:a2,color:'#df8746'}],{xlabel:'accepted K',ylabel:'period / s',xmin:0,xmax:.32,ymin:1.5,ymax:2.5});
  else{const q=U.canvas(E('chart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Validate K values to build T₁(K) and T₂(K).',q.w/2,q.h/2);}
}
function renderTable(){
  E('simpleOut').textContent=s.simple?s.simple.T.toFixed(3)+' s':'—';E('tSimple').textContent=E('simpleOut').textContent;E('tTheory').textContent=s.simpleTheory?s.simpleTheory.toFixed(3)+' s':'—';
  E('body').innerHTML=APOS.map(a=>{const r=s.records[String(a)];return'<tr><td>'+a+'</td><td>'+(r?.K?r.K.toFixed(3):'—')+'</td><td>'+(r?.m1?r.m1.T.toFixed(3):'—')+'</td><td>'+(r?.m2?r.m2.T.toFixed(3):'—')+'</td><td>'+(r?.fast?r.fast.T.toFixed(3):'—')+'</td><td>'+(r?.beat?r.beat.T.toFixed(2):'—')+'</td></tr>'}).join('');
  const nm=APOS.filter(a=>s.records[String(a)]?.K).length,nb=APOS.filter(a=>s.records[String(a)]?.fast&&s.records[String(a)]?.beat).length,nc=APOS.filter(a=>s.records[String(a)]?.beatCheck).length,words=s.conclusion.trim().length>=30;
  E('modeCount').textContent=nm+' / 10';E('beatCount').textContent=nb+' / 5';
  E('progress').innerHTML='<div class="item '+(s.simple&&s.simpleTheory?'done':'')+'">'+(s.simple&&s.simpleTheory?'✓':'○')+' simple-pendulum baseline</div><div class="item '+(nm>=10?'done':'')+'">'+(nm>=10?'✓':'○')+' ≥10 normal-mode/K positions ('+nm+')</div><div class="item '+(nb>=5?'done':'')+'">'+(nb>=5?'✓':'○')+' ≥5 direct beat positions ('+nb+')</div><div class="item '+(nc>=1?'done':'')+'">'+(nc>=1?'✓':'○')+' beat consistency check</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' interpretation</div>';
}
function renderAll(){draw();renderTable();syncAnalysisA();drawChart()}
function buildReport(){
  const nm=APOS.filter(a=>s.records[String(a)]?.K),nb=APOS.filter(a=>s.records[String(a)]?.fast&&s.records[String(a)]?.beat);
  const summary='<p><b>Simple pendulum:</b> '+(s.simple?'T='+s.simple.T.toFixed(3)+' s':'not measured')+(s.simpleTheory?', theory='+s.simpleTheory.toFixed(3)+' s.':'.')+'</p><p><b>Normal-mode/K positions:</b> '+nm.length+'. <b>Beat positions:</b> '+nb.length+'.</p><p><b>Interpretation:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>';
  return U.report('Wave Laboratory Practical I — Two Coupled Pendulums',summary);
}
U.tabs();E('modeConclusion').value=s.conclusion;
['aPos','cursor1','cursor2'].forEach(id=>E(id).addEventListener('input',draw));E('mode').addEventListener('change',()=>{clearTiming();if(E('mode').value!=='beats')E('timingTarget').value='fast';draw()});E('timingTarget').addEventListener('change',()=>{clearTiming();draw()});
E('measure').onclick=validateTiming;E('checkSimpleTheory').onclick=checkTheory;E('analysisA').addEventListener('change',loadAnalysis);E('checkK').onclick=checkK;E('checkBeat').onclick=checkBeat;
E('modeConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;renderTable();save()});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.simpleTheory)E('studentTheoryT').value=s.simpleTheory;
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',renderAll);renderAll();save();
})();