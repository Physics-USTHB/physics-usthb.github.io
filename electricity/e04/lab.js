(() => {
'use strict';

const STORAGE='PhysicsUSTHB_E04_v1';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TAU=2*Math.PI;

let state={
  version:1,mode:'learn',run:null,
  xy:{observed:{},centered:true},
  sweep:{cal:true,ch1Cal:true,xMag:false,calChecked:false,measurement:null},
  resistor:{xy:false,xyVerified:false,balance:null},
  capacitor:{xy:false,xyVerified:false,balance:null},
  assessment:null,report:{}
};

function makeRun(){
  return{
    id:'E04-'+Math.random().toString(36).slice(2,7).toUpperCase(),
    rx:1080+Math.round(Math.random()*170)*10,
    C:(0.195+Math.random()*0.055)*1e-6,
    sourceAmp:4.2+Math.random()*.35,
    readingBias:(Math.random()-.5)*.006
  };
}
function save(){
  state.report=collectReport();
  try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(_){}
}
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');if(x?.version===1)state={...state,...x};}catch(_){}}
function collectReport(){
  const ids=['studentName','studentGroup','reportDate','reportDiscussion','reportConclusion'];
  const o={};ids.forEach(id=>{const el=document.getElementById(id);if(el)o[id]=el.value;});return o;
}
function restoreReport(){
  Object.entries(state.report||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||'';});
  if(!$('#reportDate').value)$('#reportDate').value=new Date().toISOString().slice(0,10);
}
function applyMode(mode){
  state.mode=mode==='lab'?'lab':'learn';
  document.body.classList.toggle('mode-lab',state.mode==='lab');
  document.body.classList.toggle('mode-learn',state.mode==='learn');
  $$('.modebtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
  $('#modeDescription').textContent=state.mode==='learn'?'Protocol guidance and diagnostic hints are visible.':'Minimal guidance; operate and interpret the instrument independently.';
  $('#reportMode').value=state.mode==='learn'?'Learn mode':'Lab mode';save();
}
function progress(){
  const xy=Object.keys(state.xy.observed||{}).length===9;
  const sw=state.sweep.calChecked&&!!state.sweep.measurement;
  const rr=!!state.resistor.balance&&!!state.resistor.xyVerified,cc=!!state.capacitor.balance&&!!state.capacitor.xyVerified;
  const items=[
    ['3','XY mode',xy,`${Object.keys(state.xy.observed||{}).length}/9 observations`],
    ['4','Sweep & trigger',sw,`${state.sweep.calChecked?'cal ✓':'cal …'} · ${state.sweep.measurement?'f ✓':'f …'}`],
    ['5.1','Unknown resistance',rr,rr?'balanced':'balance pending'],
    ['5.2','Capacitor',cc,cc?'balanced':'balance pending']
  ];
  const active=items.findIndex(x=>!x[2]);
  $('#progressBoard').innerHTML=items.map((x,i)=>`<div class="osc-step ${x[2]?'done':''} ${i===active?'active':''}"><b>${x[0]}</b><strong>${x[1]}</strong><small>${x[2]?'Complete':x[3]}</small></div>`).join('');
}

function setupCanvas(c,fallbackH=520){
  const dpr=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||fallbackH;
  c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);
  const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return{ctx,w,h};
}
function scopeGrid(ctx,w,h){
  ctx.fillStyle='#03130f';ctx.fillRect(0,0,w,h);
  const l=22,r=22,t=22,b=22,gw=w-l-r,gh=h-t-b;
  ctx.strokeStyle='rgba(93,255,184,.17)';ctx.lineWidth=1;
  for(let i=0;i<=10;i++){const x=l+gw*i/10;ctx.beginPath();ctx.moveTo(x,t);ctx.lineTo(x,h-b);ctx.stroke();}
  for(let j=0;j<=8;j++){const y=t+gh*j/8;ctx.beginPath();ctx.moveTo(l,y);ctx.lineTo(w-r,y);ctx.stroke();}
  ctx.strokeStyle='rgba(117,255,195,.32)';
  ctx.beginPath();ctx.moveTo(l+gw/2,t);ctx.lineTo(l+gw/2,h-b);ctx.moveTo(l,t+gh/2);ctx.lineTo(w-r,t+gh/2);ctx.stroke();
  return{l,r,t,b,gw,gh,cx:l+gw/2,cy:t+gh/2,xdiv:gw/10,ydiv:gh/8};
}
function waveform(type,phase){
  const s=Math.sin(phase);
  if(type==='sine')return s;
  if(type==='triangle')return 2/Math.PI*Math.asin(s);
  return s>=0?1:-1;
}
function drawPath(ctx,pts,color,width=2,alpha=1){
  if(!pts.length)return;ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.restore();
}

function drawXY(){
  const c=$('#xyCanvas');if(!c)return;const{ctx,w,h}=setupCanvas(c),g=scopeGrid(ctx,w,h);
  const type=$('#xyWave').value,route=$('#xyRoute').value,amp=+$('#xyAmp').value,v1=+$('#xyVdiv1').value,v2=+$('#xyVdiv2').value;
  $('#xyAmpLabel').textContent=`${amp.toFixed(1)} V peak`;
  const pts=[];for(let k=0;k<=600;k++){const ph=TAU*k/600,s=waveform(type,ph),xd=route==='y'?0:amp*s/v1,yd=route==='x'?0:amp*s/v2;pts.push({x:g.cx+xd*g.xdiv,y:g.cy-yd*g.ydiv});}
  drawPath(ctx,pts,'#79ffc1',2.1,.48);
  ctx.fillStyle='#a6ffd7';
  for(let m=0;m<24;m++){const p=pts[Math.round(m*600/24)];ctx.beginPath();ctx.arc(p.x,p.y,type==='square'?4.2:2.8,0,TAU);ctx.fill();}
  if(type==='square'){ctx.fillStyle='#e5fff3';for(const p of [pts[75],pts[225],pts[375],pts[525]]){ctx.beginPath();ctx.arc(p.x,p.y,4.8,0,TAU);ctx.fill();}}
  $('#xyCH1Label').textContent=route==='y'?'CH1/X disconnected':`CH1/X · ${v1} V/div`;
  $('#xyCH2Label').textContent=route==='x'?'CH2/Y disconnected':`CH2/Y · ${v2} V/div`;
}
function xyKey(){return `${$('#xyWave').value}-${$('#xyRoute').value}`;}
function renderXYObs(){
  const waves=['sine','triangle','square'],routes=['x','y','both'];$('#xyObservations').innerHTML=waves.flatMap(w=>routes.map(r=>{const key=`${w}-${r}`,done=state.xy.observed?.[key];return `<div class="obs-card"><h4>${w[0].toUpperCase()+w.slice(1)} · ${r==='both'?'X+Y':r.toUpperCase()}</h4><p>${r==='x'?'Horizontal spot motion':r==='y'?'Vertical spot motion':'Same signal on both axes'}</p><span class="status ${done?'live':''}">${done?'Recorded':'Pending'}</span></div>`;})).join('');
}
function recordXY(){
  const key=xyKey();state.xy.observed[key]={wave:$('#xyWave').value,route:$('#xyRoute').value,v1:+$('#xyVdiv1').value,v2:+$('#xyVdiv2').value,amp:+$('#xyAmp').value};
  const n=Object.keys(state.xy.observed).length;$('#xyMessage').className=n===9?'notice ok':'notice';$('#xyMessage').textContent=n===9?'All nine required XY observations have been recorded.':`Observation stored (${n}/9). Repeat for every waveform in X, Y and both channels.`;renderXYObs();progress();save();
}

function effectiveTimeDiv(){let t=+$('#timeDiv').value;if(!state.sweep.cal)t*=1.17;if(state.sweep.xMag)t/=10;return t;}
function sweepStable(){
  const amp=2,level=+$('#triggerLevel').value;
  return $('#triggerMode').value==='auto'&&Math.abs(level)<amp*.98;
}
function drawSweep(){
  const c=$('#sweepCanvas');if(!c)return;const{ctx,w,h}=setupCanvas(c),g=scopeGrid(ctx,w,h);
  const type=$('#sweepWave').value,f=+$('#sweepFreq').value,vdiv=+$('#sweepVdiv').value,tdiv=effectiveTimeDiv(),amp=2*(state.sweep.ch1Cal?1:1.22),screenT=tdiv*10,stable=sweepStable();
  $('#sweepFreqLabel').textContent=`${f} Hz`;$('#triggerLevelLabel').textContent=`${(+$('#triggerLevel').value).toFixed(1)} V`;$('#timeScaleLabel').textContent=`${formatTime(+$('#timeDiv').value)}/div`;$('#verticalScaleLabel').textContent=`${vdiv} V/div`;$('#triggerLabel').textContent=stable?'trigger locked':'trigger free-run';
  const phaseOffsets=stable?[0]:[0,.55,1.2,1.8];
  phaseOffsets.forEach((off,oi)=>{const pts=[];for(let k=0;k<=800;k++){const t=screenT*k/800,vd=amp*waveform(type,TAU*f*t+off)/vdiv;pts.push({x:g.l+g.gw*k/800,y:g.cy-vd*g.ydiv});}drawPath(ctx,pts,'#74ffc0',stable?2.2:1.2,stable?.95:.22);});
  const selected=+$('#timeDiv').value,screen=effectiveTimeDiv()*10;$('#screenTime').textContent=`${formatTime(screen)}`;
  $('#sweepCalLabel').textContent=state.sweep.cal?'CAL':'VAR';$('#ch1CalLabel').textContent=state.sweep.ch1Cal?'CAL':'VAR';$('#xMagLabel').textContent=state.sweep.xMag?'×10':'×1';
  const calOK=Math.abs(selected-.5)<1e-9&&state.sweep.cal&&!state.sweep.xMag;$('#calStatus').textContent=calOK?'5.0 s ✓':'not calibrated';
  const pd=(1/f)/effectiveTimeDiv();$('#periodDivs').textContent=`${pd.toFixed(2)} div`;$('#freqGenerator').textContent=`${f} Hz`;
  if(state.sweep.measurement){$('#periodMeasured').textContent=formatTime(state.sweep.measurement.T);$('#freqMeasured').textContent=`${state.sweep.measurement.f.toFixed(1)} Hz`;}else{$('#periodMeasured').textContent='—';$('#freqMeasured').textContent='—';}
}
function formatTime(t){if(t>=1)return`${t.toFixed(t<10?2:1)} s`;if(t>=.001)return`${(t*1000).toFixed(t<.01?1:0)} ms`;return`${(t*1e6).toFixed(0)} µs`;}
function recordSweep(){
  const td=+$('#timeDiv').value;
  if(!state.sweep.calChecked){
    if(Math.abs(td-.5)>1e-9||!state.sweep.cal||state.sweep.xMag){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='For the required calibration check, use 0.5 s/div, sweep CAL and X1.';return;}
    state.sweep.calChecked=true;$('#sweepMessage').className='notice ok';$('#sweepMessage').textContent='Sweep calibration verified: 10 divisions × 0.5 s/div = 5.0 s. Now measure a generator frequency with a stable trace.';progress();save();return;
  }
  const f=+$('#sweepFreq').value,pd=(1/f)/effectiveTimeDiv();
  if(!state.sweep.cal||!state.sweep.ch1Cal||state.sweep.xMag){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='Return sweep and CH1 fine controls to CAL and X magnifier to X1 before making a quantitative measurement.';return;}
  if(!sweepStable()){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='The trace is not synchronised. Select AUTO/CH1 rising and set the trigger level within the waveform amplitude.';return;}
  if(pd<1||pd>8){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='Choose a TIME/DIV value that displays roughly one to several periods clearly.';return;}
  const readDiv=pd*(1+state.run.readingBias),T=readDiv*(+$('#timeDiv').value);state.sweep.measurement={generator:f,periodDiv:readDiv,T,f:1/T,timeDiv:+$('#timeDiv').value,wave:$('#sweepWave').value};
  $('#sweepMessage').className='notice ok';$('#sweepMessage').textContent=`Measurement stored: one period spans approximately ${readDiv.toFixed(2)} divisions.`;drawSweep();progress();save();
}

function circuitResistor(){
  const rd=+$('#rDecade').value,rx=state.run.rx,vs=state.run.sourceAmp,den=rd+rx;
  return{rd,rx,a1:vs*rd/den,a2:vs*rx/den,phi:0};
}
function circuitCap(){
  const rd=+$('#cDecade').value,f=+$('#cFreq').value,C=state.run.C,zc=1/(TAU*f*C),vs=state.run.sourceAmp,Z=Math.hypot(rd,zc),I=vs/Z;
  return{rd,zc,C,a1:I*rd,a2:I*zc,phi:-Math.PI/2};
}
function drawDual(canvasId,kind){
  const c=$(canvasId);if(!c)return;const{ctx,w,h}=setupCanvas(c),g=scopeGrid(ctx,w,h);
  const isR=kind==='r',x=isR?circuitResistor():circuitCap(),f=+(isR?$('#rFreq').value:$('#cFreq').value),vdiv=+(isR?$('#rVdiv').value:$('#cVdiv').value),tdiv=+(isR?$('#rTimeDiv').value:$('#cTimeDiv').value),xy=isR?state.resistor.xy:state.capacitor.xy;
  if(xy){
    const pts=[];for(let k=0;k<=700;k++){const ph=TAU*k/700,xx=x.a1*Math.sin(ph)/vdiv,yy=x.a2*Math.sin(ph+x.phi)/vdiv;pts.push({x:g.cx+xx*g.xdiv,y:g.cy-yy*g.ydiv});}drawPath(ctx,pts,'#7dffc2',2.3,.95);
  }else{
    const screenT=10*tdiv,p1=[],p2=[];for(let k=0;k<=900;k++){const t=screenT*k/900,ph=TAU*f*t;p1.push({x:g.l+g.gw*k/900,y:g.cy-x.a1*Math.sin(ph)/vdiv*g.ydiv});p2.push({x:g.l+g.gw*k/900,y:g.cy-x.a2*Math.sin(ph+x.phi)/vdiv*g.ydiv});}drawPath(ctx,p1,'#ffd166',2.2,.92);drawPath(ctx,p2,'#69e7ff',2.2,.92);
  }
  return x;
}
function updateResistor(){
  const x=drawDual('#resistorCanvas','r'),ratio=x.a2/x.a1;$('#rDecadeLabel').textContent=`${x.rd.toFixed(0)} Ω`;$('#rAmp1').textContent=`${x.a1.toFixed(2)} V`;$('#rAmp2').textContent=`${x.a2.toFixed(2)} V`;$('#rRatio').textContent=ratio.toFixed(3);
  if(state.resistor.balance){const b=state.resistor.balance;$('#rxResult').textContent=`${b.rd.toFixed(0)} Ω`;$('#rDt').textContent=formatTime(b.dt);$('#rT').textContent=formatTime(b.T);$('#rPhiSweep').textContent=`${b.phiSweep.toFixed(1)}°`;$('#rPhiXY').textContent=state.resistor.xyVerified?`${b.phiXY.toFixed(1)}°`:'—°';}
  else{$('#rxResult').textContent='— Ω';$('#rDt').textContent='—';$('#rT').textContent='—';$('#rPhiSweep').textContent='—°';$('#rPhiXY').textContent='—°';}
  $('#resistorMessage').className=Math.abs(ratio-1)<.03?'notice ok':'notice';$('#resistorMessage').textContent=Math.abs(ratio-1)<.03?'Amplitudes are balanced within 3%. You may record the condition.':state.mode==='learn'?(ratio>1?'CH2 is larger: increase the decade resistance.':'CH1 is larger: decrease the decade resistance.'):'Adjust until the two amplitudes are equal.';
}
function recordRBalance(){
  const x=circuitResistor(),ratio=x.a2/x.a1;if(Math.abs(ratio-1)>=.03){updateResistor();return;}const f=+$('#rFreq').value,T=1/f,dt=0;state.resistor.balance={rd:x.rd,ratio,T,dt,phiSweep:0,phiXY:0,frequency:f,trueRx:state.run.rx};state.resistor.xyVerified=false;$('#resistorMessage').className='notice ok';$('#resistorMessage').textContent='Balanced condition stored. Now switch to XY mode and verify the straight-line Lissajous trace.';updateResistor();progress();save();
}
function updateCap(){
  const x=drawDual('#capacitorCanvas','c'),ratio=x.a2/x.a1;$('#cDecadeLabel').textContent=`${x.rd.toFixed(0)} Ω`;
  if(state.capacitor.balance){const b=state.capacitor.balance;$('#zcResult').textContent=`${b.rd.toFixed(0)} Ω`;$('#cPhiSweep').textContent=`${b.phiSweep.toFixed(1)}°`;$('#cPhiXY').textContent=state.capacitor.xyVerified?`${b.phiXY.toFixed(1)}°`:'—°';$('#cResult').textContent=`${(b.Cderived*1e6).toFixed(3)} µF`;}
  else{$('#zcResult').textContent='— Ω';$('#cPhiSweep').textContent='—°';$('#cPhiXY').textContent='—°';$('#cResult').textContent='— µF';}
  $('#capMessage').className=Math.abs(ratio-1)<.03?'notice ok':'notice';$('#capMessage').textContent=Math.abs(ratio-1)<.03?'Voltage amplitudes are balanced within 3%. Record the condition.':state.mode==='learn'?(ratio>1?'Capacitor voltage is larger: increase decade resistance.':'Resistor voltage is larger: decrease decade resistance.'):'Adjust the decade resistance until the two amplitudes are equal.';
}
function recordCBalance(){
  const x=circuitCap(),ratio=x.a2/x.a1;if(Math.abs(ratio-1)>=.03){updateCap();return;}const f=+$('#cFreq').value,T=1/f,dt=T/4,Cderived=1/(TAU*f*x.rd);state.capacitor.balance={rd:x.rd,zcTrue:x.zc,ratio,T,dt,phiSweep:90,phiXY:90,Cderived,trueC:state.run.C,frequency:f};state.capacitor.xyVerified=false;$('#capMessage').className='notice ok';$('#capMessage').textContent='Balanced impedance condition stored. Now switch to XY mode and verify the near-circular Lissajous figure.';updateCap();progress();save();
}

function setupQuiz(){
  $('#quiz').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),ans={q1:'a',q2:'a',q3:'a',q4:'a',q5:'a',q6:'a'},miss=Object.keys(ans).filter(q=>!fd.get(q));if(miss.length){$('#quizResult').className='notice warn';$('#quizResult').textContent='Answer all six questions before submitting.';return;}let score=0,breakdown=[];Object.entries(ans).forEach(([q,a],i)=>{const ok=fd.get(q)===a;if(ok)score++;breakdown.push({q:i+1,ok});});state.assessment={score,total:6,breakdown};const box=$('#quizResult');box.className=score>=5?'notice ok':score>=3?'notice warn':'notice bad';box.innerHTML=`<strong>${score}/6 correct.</strong>`+(state.mode==='learn'?`<ul>${breakdown.map(x=>`<li>Question ${x.q}: ${x.ok?'correct':'review needed'}</li>`).join('')}</ul>`:'');save();});
}
function restoreAssessment(){if(!state.assessment)return;$('#quizResult').className=state.assessment.score>=5?'notice ok':state.assessment.score>=3?'notice warn':'notice bad';$('#quizResult').innerHTML=`<strong>Saved assessment: ${state.assessment.score}/${state.assessment.total}.</strong>`;}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function prose(s){return escapeHtml(s||'').replace(/\n/g,'<br>')||'<em>Not completed.</em>';}
function buildReport(){
  drawXY();drawSweep();updateResistor();updateCap();state.report=collectReport();
  const r=state.resistor.balance,c=state.capacitor.balance,s=state.sweep.measurement,xyImg=$('#xyCanvas').toDataURL(),swImg=$('#sweepCanvas').toDataURL(),rImg=$('#resistorCanvas').toDataURL(),cImg=$('#capacitorCanvas').toDataURL();
  const html=`<h2>Laboratory Report — E04</h2><p><strong>The Oscilloscope</strong></p><p><strong>Student:</strong> ${escapeHtml(state.report.studentName||'—')} &nbsp; <strong>Group:</strong> ${escapeHtml(state.report.studentGroup||'—')} &nbsp; <strong>Date:</strong> ${escapeHtml(state.report.reportDate||'—')} &nbsp; <strong>Run:</strong> ${escapeHtml(state.run.id)}</p>
  <h3>3 — XY mode</h3><p>Recorded observation combinations: ${Object.keys(state.xy.observed||{}).length}/9.</p><img src="${xyImg}" style="max-width:100%" alt="XY-mode oscilloscope trace">
  <h3>4 — Sweep & synchronisation</h3><p>Sweep calibration: ${state.sweep.calChecked?'verified at 0.5 s/div (10 div = 5 s)':'not completed'}. Frequency measurement: ${s?`T=${formatTime(s.T)}, f=${s.f.toFixed(1)} Hz; generator=${s.generator} Hz`:'not completed'}.</p><img src="${swImg}" style="max-width:100%" alt="Sweep-mode waveform">
  <h3>5.1 — Unknown resistance</h3><p>${r?`Balanced decade resistance R_d=${r.rd.toFixed(0)} Ω; therefore R_x≈${r.rd.toFixed(0)} Ω. Phase: ${r.phiSweep.toFixed(1)}° by sweep and ${r.phiXY.toFixed(1)}° by XY.`:'Not completed.'}</p><img src="${rImg}" style="max-width:100%" alt="Unknown resistance oscilloscope trace">
  <h3>5.2 — Capacitor</h3><p>${c?`Balanced Z_C≈${c.rd.toFixed(0)} Ω at ${c.frequency} Hz; C≈${(c.Cderived*1e6).toFixed(3)} µF. Phase magnitude ≈${c.phiSweep.toFixed(1)}° by sweep and ${c.phiXY.toFixed(1)}° by XY.`:'Not completed.'}</p><img src="${cImg}" style="max-width:100%" alt="Capacitor oscilloscope trace">
  <h3>Discussion</h3><p>${prose(state.report.reportDiscussion)}</p><h3>Conclusion</h3><p>${prose(state.report.reportConclusion)}</p><p><strong>Assessment:</strong> ${state.assessment?state.assessment.score+'/'+state.assessment.total:'not submitted'}.</p>
  <hr><p class="mini">The core task sequence follows the USTHB oscilloscope practical. Hidden component values, trace-reading bias and source amplitude are virtual-laboratory parameters.</p>`;
  $('#reportPreview').innerHTML=html;$('#printOnlyPreview').innerHTML=html;save();
}

function setupTabs(){
  $$('.tabbtn').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.tab;$$('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));$$('.tabpanel').forEach(p=>p.classList.toggle('active',p.id===id));drawXY();drawSweep();updateResistor();updateCap();}));
}
function init(){
  load();if(!state.run)state.run=makeRun();restoreReport();setupTabs();setupQuiz();applyMode(state.mode);renderXYObs();progress();restoreAssessment();
  ['xyWave','xyFreq','xyRoute','xyVdiv1','xyVdiv2','xyAmp'].forEach(id=>$('#'+id).addEventListener('input',drawXY));$('#recordXYObservation').addEventListener('click',recordXY);$('#centerSpot').addEventListener('click',()=>{state.xy.centered=true;$('#xyMessage').className='notice ok';$('#xyMessage').textContent='Spot centred at the screen origin.';save();});
  ['sweepWave','sweepFreq','timeDiv','sweepVdiv','triggerLevel','triggerMode'].forEach(id=>$('#'+id).addEventListener('input',drawSweep));$('#toggleSweepCal').addEventListener('click',()=>{state.sweep.cal=!state.sweep.cal;drawSweep();save();});$('#toggleCh1Cal').addEventListener('click',()=>{state.sweep.ch1Cal=!state.sweep.ch1Cal;drawSweep();save();});$('#toggleXMag').addEventListener('click',()=>{state.sweep.xMag=!state.sweep.xMag;drawSweep();save();});$('#recordSweep').addEventListener('click',recordSweep);
  ['rFreq','rVdiv','rTimeDiv','rDecade'].forEach(id=>$('#'+id).addEventListener('input',updateResistor));$('#recordResistorBalance').addEventListener('click',recordRBalance);$('#switchResistorXY').addEventListener('click',()=>{state.resistor.xy=!state.resistor.xy;if(state.resistor.xy&&state.resistor.balance)state.resistor.xyVerified=true;updateResistor();progress();save();});
  ['cFreq','cVdiv','cTimeDiv','cDecade'].forEach(id=>$('#'+id).addEventListener('input',updateCap));$('#recordCapBalance').addEventListener('click',recordCBalance);$('#switchCapXY').addEventListener('click',()=>{state.capacitor.xy=!state.capacitor.xy;if(state.capacitor.xy&&state.capacitor.balance)state.capacitor.xyVerified=true;updateCap();progress();save();});
  $('#buildReport').addEventListener('click',buildReport);$('#printReport').addEventListener('click',()=>{buildReport();window.print();});$$('.modebtn').forEach(b=>b.addEventListener('click',()=>applyMode(b.dataset.mode)));
  ['studentName','studentGroup','reportDate','reportDiscussion','reportConclusion'].forEach(id=>$('#'+id).addEventListener('input',save));
  window.addEventListener('resize',()=>{drawXY();drawSweep();updateResistor();updateCap();});window.addEventListener('beforeunload',save);
  drawXY();drawSweep();updateResistor();updateCap();
}
init();
})();