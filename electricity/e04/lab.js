(() => {
'use strict';

const STORAGE='PhysicsUSTHB_E04_v2';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TAU=2*Math.PI;

let state={
  version:2,mode:'learn',run:null,
  xy:{observed:{},centered:false,intensity:.35,focus:.9,xPos:0,yPos:0,mode:'xy'},
  sweep:{cal:true,ch1Cal:true,xMag:false,calChecked:false,measurement:null},
  resistor:{xy:false,xyVerified:false,balance:null,analysis:null},
  capacitor:{xy:false,xyVerified:false,balance:null,analysis:null},
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
function persistState(){
  try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(_){}
}
function save(){
  state.report=collectReport();
  persistState()
}
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');if(x?.version===2)state={...state,...x};}catch(_){}}
function collectReport(){
  const ids=['reportDate','reportDiscussion','reportConclusion'];
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
  const rr=!!state.resistor.balance&&!!state.resistor.analysis&&!!state.resistor.xyVerified,cc=!!state.capacitor.balance&&!!state.capacitor.analysis&&!!state.capacitor.xyVerified;
  const items=[
    ['3','XY mode',xy,`${Object.keys(state.xy.observed||{}).length}/9 observations`],
    ['4','Sweep & trigger',sw,`${state.sweep.calChecked?'cal ✓':'cal …'} · ${state.sweep.measurement?'f ✓':'f …'}`],
    ['5.1','Unknown resistance',rr,rr?'complete':state.resistor.balance?(state.resistor.analysis?'XY check pending':'calculation pending'):'balance pending'],
    ['5.2','Capacitor',cc,cc?'complete':state.capacitor.balance?(state.capacitor.analysis?'XY check pending':'calculation pending'):'balance pending']
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

function xySetupOK(){
  return state.xy.mode==='xy'&&state.xy.intensity>=.15&&state.xy.intensity<=.55&&state.xy.focus>=.75&&Math.abs(state.xy.xPos)<=.15&&Math.abs(state.xy.yPos)<=.15;
}
function updateXYSetup(){
  state.xy.intensity=+$('#xyIntensity').value;state.xy.focus=+$('#xyFocus').value;state.xy.xPos=+$('#xyXPos').value;state.xy.yPos=+$('#xyYPos').value;state.xy.mode=$('#xyModeControl').value;
  state.xy.centered=Math.abs(state.xy.xPos)<=.15&&Math.abs(state.xy.yPos)<=.15;
  $('#xyIntensityLabel').textContent=`${Math.round(state.xy.intensity*100)}%`;$('#xyFocusLabel').textContent=state.xy.focus>=.75?'fine':'blurred';$('#xyXPosLabel').textContent=`${state.xy.xPos.toFixed(1)} div`;$('#xyYPosLabel').textContent=`${state.xy.yPos.toFixed(1)} div`;
  const items=[
    ['Command (12) set to XY',state.xy.mode==='xy'],
    ['Spot intensity low, not excessive',state.xy.intensity>=.15&&state.xy.intensity<=.55],
    ['Focus adjusted to a fine spot',state.xy.focus>=.75],
    ['Horizontal position centred',Math.abs(state.xy.xPos)<=.15],
    ['Vertical position (6B) centred',Math.abs(state.xy.yPos)<=.15]
  ];
  $('#xySetupChecklist').innerHTML=items.map(([t,ok])=>`<div class="setup-item ${ok?'ok':'warn'}"><i></i><span>${t}</span></div>`).join('');
  $('#xyState').textContent=xySetupOK()?'XY setup ready':'Front panel not ready';$('#xyState').classList.toggle('ok',xySetupOK());
}
function drawXY(){
  const c=$('#xyCanvas');if(!c)return;updateXYSetup();const{ctx,w,h}=setupCanvas(c),g=scopeGrid(ctx,w,h);
  const type=$('#xyWave').value,route=$('#xyRoute').value,amp=+$('#xyAmp').value,v1=+$('#xyVdiv1').value,v2=+$('#xyVdiv2').value;
  $('#xyAmpLabel').textContent=`${amp.toFixed(1)} V peak`;
  const x0=g.cx+state.xy.xPos*g.xdiv,y0=g.cy-state.xy.yPos*g.ydiv,alpha=.18+.8*state.xy.intensity,width=.8+(1-state.xy.focus)*5;
  const pts=[];
  if(state.xy.mode!=='xy'){
    for(let k=0;k<=600;k++){const ph=TAU*k/600,s=waveform(type,ph),yd=(route==='x'?amp*s/v1:route==='y'?amp*s/v2:amp*s/v2);pts.push({x:g.l+g.gw*k/600,y:y0-yd*g.ydiv});}
    drawPath(ctx,pts,'#79ffc1',width,alpha);
  }else{
    for(let k=0;k<=600;k++){const ph=TAU*k/600,s=waveform(type,ph),xd=route==='y'?0:amp*s/v1,yd=route==='x'?0:amp*s/v2;pts.push({x:x0+xd*g.xdiv,y:y0-yd*g.ydiv});}
    drawPath(ctx,pts,'#79ffc1',width,alpha);
    ctx.fillStyle='#a6ffd7';ctx.globalAlpha=alpha;
    for(let m=0;m<24;m++){const p=pts[Math.round(m*600/24)];ctx.beginPath();ctx.arc(p.x,p.y,type==='square'?4.2:2.8,0,TAU);ctx.fill();}
    ctx.globalAlpha=1;
  }
  $('#xyCH1Label').textContent=route==='y'?'CH1/X disconnected':`CH1/X · ${v1} V/div`;
  $('#xyCH2Label').textContent=route==='x'?'CH2/Y disconnected':`CH2/Y · ${v2} V/div`;
}
function xyKey(){return `${$('#xyWave').value}-${$('#xyRoute').value}`;}
function renderXYObs(){
  const waves=['sine','triangle','square'],routes=['x','y','both'];$('#xyObservations').innerHTML=waves.flatMap(w=>routes.map(r=>{const key=`${w}-${r}`,done=state.xy.observed?.[key];return `<div class="obs-card"><h4>${w[0].toUpperCase()+w.slice(1)} · ${r==='both'?'X+Y':r.toUpperCase()}</h4><p>${r==='x'?'Horizontal spot motion':r==='y'?'Vertical spot motion':'Same signal on both axes'}</p><span class="status ${done?'live':''}">${done?'Recorded':'Pending'}</span></div>`;})).join('');
}
function recordXY(){
  if(!xySetupOK()){$('#xyMessage').className='notice warn';$('#xyMessage').textContent='Complete the front-panel setup required by the handout before recording an XY observation.';return;}
  const key=xyKey();state.xy.observed[key]={wave:$('#xyWave').value,route:$('#xyRoute').value,v1:+$('#xyVdiv1').value,v2:+$('#xyVdiv2').value,amp:+$('#xyAmp').value};
  const n=Object.keys(state.xy.observed).length;$('#xyMessage').className=n===9?'notice ok':'notice';$('#xyMessage').textContent=n===9?'All nine required XY observations have been recorded.':`Observation stored (${n}/9). Repeat for every waveform in X, Y and both channels.`;renderXYObs();progress();save();
}

function effectiveTimeDiv(){let t=+$('#timeDiv').value;if(!state.sweep.cal)t*=1.17;if(state.sweep.xMag)t/=10;return t;}
function sweepStable(){
  const amp=2,level=+$('#triggerLevel').value;
  return $('#triggerMode').value==='auto'&&$('#triggerSource').value==='ch1'&&Math.abs(level)<amp*.98;
}
function drawSweep(){
  const c=$('#sweepCanvas');if(!c)return;const{ctx,w,h}=setupCanvas(c),g=scopeGrid(ctx,w,h);
  const type=$('#sweepWave').value,f=+$('#sweepFreq').value,vdiv=+$('#sweepVdiv').value,tdiv=effectiveTimeDiv(),amp=2*(state.sweep.ch1Cal?1:1.22),screenT=tdiv*10,stable=sweepStable(),coupling=$('#sweepCoupling').value,display=$('#sweepDisplayMode').value;
  $('#sweepFreqLabel').textContent=`${f} Hz`;$('#triggerLevelLabel').textContent=`${(+$('#triggerLevel').value).toFixed(1)} V`;$('#timeScaleLabel').textContent=`${formatTime(+$('#timeDiv').value)}/div`;$('#verticalScaleLabel').textContent=`${vdiv} V/div`;$('#triggerLabel').textContent=stable?'trigger CH1 locked':`trigger ${$('#triggerSource').value.toUpperCase()} free-run`;
  const phaseOffsets=stable?[0]:[0,.55,1.2,1.8];
  if(coupling==='gnd'||display==='ch2'){drawPath(ctx,[{x:g.l,y:g.cy},{x:w-g.r,y:g.cy}],'#74ffc0',1.8,.8);}
  else phaseOffsets.forEach((off)=>{const pts=[];for(let k=0;k<=800;k++){const t=screenT*k/800,vd=amp*waveform(type,TAU*f*t+off)/vdiv;pts.push({x:g.l+g.gw*k/800,y:g.cy-vd*g.ydiv});}drawPath(ctx,pts,'#74ffc0',stable?2.2:1.2,stable?.95:.22);});
  if(display==='dual'){drawPath(ctx,[{x:g.l,y:g.cy+1.5*g.ydiv},{x:w-g.r,y:g.cy+1.5*g.ydiv}],'#69e7ff',1.2,.55);}
  const selected=+$('#timeDiv').value,screen=effectiveTimeDiv()*10;$('#screenTime').textContent=`${formatTime(screen)}`;
  $('#sweepCalLabel').textContent=state.sweep.cal?'CAL':'VAR';$('#ch1CalLabel').textContent=state.sweep.ch1Cal?'CAL':'VAR';$('#xMagLabel').textContent=state.sweep.xMag?'×10':'×1';
  const calOK=Math.abs(selected-.5)<1e-9&&state.sweep.cal&&!state.sweep.xMag;$('#calStatus').textContent=calOK?'5.0 s ✓':'not calibrated';
  $('#freqGenerator').textContent=`${f} Hz`;
  if(state.sweep.measurement){$('#periodDivs').textContent=`${state.sweep.measurement.periodDiv.toFixed(2)} div`;$('#periodMeasured').textContent=formatTime(state.sweep.measurement.T);$('#freqMeasured').textContent=`${state.sweep.measurement.f.toFixed(1)} Hz`;}else{$('#periodDivs').textContent='—';$('#periodMeasured').textContent='—';$('#freqMeasured').textContent='—';}
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
  if($('#sweepCoupling').value==='gnd'||$('#sweepDisplayMode').value!=='ch1'){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='For the frequency measurement, display CH1 with the signal connected rather than GND.';return;}
  if(!sweepStable()){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='The trace is not synchronised. Select AUTO triggering from CH1 and set LEVEL within the waveform amplitude.';return;}
  if(pd<1||pd>8){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='Choose a TIME/DIV value that displays roughly one to several periods clearly.';return;}
  const sd=+$('#sweepStudentDivs').value,sT=+$('#sweepStudentT').value,sF=+$('#sweepStudentF').value,tdShown=+$('#timeDiv').value;
  if(!Number.isFinite(sd)||!Number.isFinite(sT)||!Number.isFinite(sF)||sd<=0||sT<=0||sF<=0){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='Read the period in divisions and enter your calculated T and f before recording.';return;}
  if(Math.abs(sd-pd)>Math.max(.15,.05*pd)){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='Re-read the horizontal distance occupied by one period on the graticule.';return;}
  const fromDiv=sd*tdShown;
  if(Math.abs(sT-fromDiv)>Math.max(.000002,.04*fromDiv)){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='Recalculate T = (period divisions) × TIME/DIV.';return;}
  const fromT=1/sT;
  if(Math.abs(sF-fromT)>Math.max(.2,.04*fromT)){$('#sweepMessage').className='notice warn';$('#sweepMessage').textContent='Recalculate f = 1/T from your measured period.';return;}
  state.sweep.measurement={generator:f,periodDiv:sd,T:sT,f:sF,timeDiv:tdShown,wave:$('#sweepWave').value};
  $('#sweepMessage').className='notice ok';$('#sweepMessage').textContent=`Measurement accepted: one period = ${sd.toFixed(2)} divisions, T=${formatTime(sT)}, f=${sF.toFixed(1)} Hz.`;drawSweep();progress();save();
}


function cmul(a,s){return{re:a.re*s,im:a.im*s}}
function csub(a,b){return{re:a.re-b.re,im:a.im-b.im}}
function camp(a){return Math.hypot(a.re,a.im)}
function cphase(a){return Math.atan2(a.im,a.re)}
function phaseSetup(kind){
  const p=kind==='r'?'r':'c';
  return $('#'+p+'CH1Point').value==='A'&&$('#'+p+'CH2Point').value==='C'&&$('#'+p+'GroundPoint').value==='B'&&$('#'+p+'Coupling1').value==='ac'&&$('#'+p+'Coupling2').value==='ac'&&$('#'+p+'Fine1').value==='cal'&&$('#'+p+'Fine2').value==='cal'&&$('#'+p+'Invert2').value==='invert';
}
function updatePhaseConnection(kind){
  const p=kind==='r'?'r':'c',ok=phaseSetup(kind),el=$('#'+p+'ConnectionStatus');
  if(ok){el.className='connection-status';el.textContent=`Figure ${kind==='r'?'5':'6'} connection ready: CH1→A, CH2→C, ground→B, AC/AC, both fine gains CAL, CH2 inverted.`;}
  else{
    el.className='connection-status bad';
    if($('#'+p+'GroundPoint').value!=='B')el.textContent='Invalid common-ground point. The USTHB circuit requires the oscilloscope mass at B.';
    else if($('#'+p+'Fine1').value!=='cal'||$('#'+p+'Fine2').value!=='cal')el.textContent='Both vertical fine-gain controls must be locked in CAL for quantitative amplitude and phase work.';
    else el.textContent=`Connection differs from Figure ${kind==='r'?'5':'6'}. Check CH1=A, CH2=C, AC coupling on both channels and CH2 INVERT.`;
  }
}
function scopedChannels(kind,core){
  const p=kind==='r'?'r':'c';
  if($('#'+p+'GroundPoint').value!=='B')return{safe:false,a1:0,a2:0,p1:0,p2:0};
  let nodes;
  if(kind==='r')nodes={A:{re:core.a1,im:0},B:{re:0,im:0},C:{re:-core.a2,im:0}};
  else nodes={A:{re:core.a1,im:0},B:{re:0,im:0},C:{re:0,im:core.a2}};
  const g=nodes.B;
  let z1=csub(nodes[$('#'+p+'CH1Point').value],g),z2=csub(nodes[$('#'+p+'CH2Point').value],g);
  if($('#'+p+'Coupling1').value==='gnd')z1={re:0,im:0};
  if($('#'+p+'Coupling2').value==='gnd')z2={re:0,im:0};
  if($('#'+p+'Invert2').value==='invert')z2=cmul(z2,-1);
  return{safe:true,a1:camp(z1),a2:camp(z2),p1:cphase(z1),p2:cphase(z2)};
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
  const isR=kind==='r',x=isR?circuitResistor():circuitCap(),ch=scopedChannels(kind,x),f=+(isR?$('#rFreq').value:$('#cFreq').value),vdiv=+(isR?$('#rVdiv').value:$('#cVdiv').value),tdiv=+(isR?$('#rTimeDiv').value:$('#cTimeDiv').value),xy=isR?state.resistor.xy:state.capacitor.xy;
  updatePhaseConnection(kind);
  if(!ch.safe){ctx.fillStyle='#ff9daf';ctx.font='700 16px system-ui';ctx.textAlign='center';ctx.fillText('Unsafe/incorrect common-ground connection',w/2,h/2);return{...x,...ch};}
  if(xy){
    const pts=[];for(let k=0;k<=700;k++){const ph=TAU*k/700,xx=ch.a1*Math.sin(ph+ch.p1)/vdiv,yy=ch.a2*Math.sin(ph+ch.p2)/vdiv;pts.push({x:g.cx+xx*g.xdiv,y:g.cy-yy*g.ydiv});}drawPath(ctx,pts,'#7dffc2',2.3,.95);
  }else{
    const screenT=10*tdiv,p1=[],p2=[];for(let k=0;k<=900;k++){const t=screenT*k/900,ph=TAU*f*t;p1.push({x:g.l+g.gw*k/900,y:g.cy-ch.a1*Math.sin(ph+ch.p1)/vdiv*g.ydiv});p2.push({x:g.l+g.gw*k/900,y:g.cy-ch.a2*Math.sin(ph+ch.p2)/vdiv*g.ydiv});}drawPath(ctx,p1,'#ffd166',2.2,.92);drawPath(ctx,p2,'#69e7ff',2.2,.92);
  }
  return{...x,...ch};
}
function updateResistor(){
  const x=drawDual('#resistorCanvas','r'),ratio=x.safe&&x.a1>0?x.a2/x.a1:NaN,a=state.resistor.analysis;$('#rDecadeLabel').textContent=`${x.rd.toFixed(0)} Ω`;$('#rAmp1').textContent=`${x.a1.toFixed(2)} V`;$('#rAmp2').textContent=`${x.a2.toFixed(2)} V`;$('#rRatio').textContent=Number.isFinite(ratio)?ratio.toFixed(3):'—';
  if(a){$('#rxResult').textContent=`${a.rx.toFixed(0)} Ω`;$('#rDt').textContent=`${a.dtDiv.toFixed(2)} div`;$('#rT').textContent=formatTime(a.T);$('#rPhiSweep').textContent=`${a.phi.toFixed(1)}°`;$('#rPhiXY').textContent=state.resistor.xyVerified?`${a.phi.toFixed(1)}°`:'—°';}
  else{$('#rxResult').textContent='— Ω';$('#rDt').textContent='—';$('#rT').textContent='—';$('#rPhiSweep').textContent='—°';$('#rPhiXY').textContent='—°';}
  if(!phaseSetup('r')){$('#resistorMessage').className='notice warn';$('#resistorMessage').textContent='Reproduce Figure 5 first: CH1→A, CH2→C, common ground→B, AC on both channels, CH2 inverted.';}
  else if(!state.resistor.balance){$('#resistorMessage').className=Math.abs(ratio-1)<.03?'notice ok':'notice';$('#resistorMessage').textContent=Math.abs(ratio-1)<.03?'Amplitudes are balanced within 3%. Record the condition.':state.mode==='learn'?(ratio>1?'CH2 is larger: increase the decade resistance.':'CH1 is larger: decrease the decade resistance.'):'Adjust until the two amplitudes are equal.';}
  else if(!a){$('#resistorMessage').className='notice';$('#resistorMessage').textContent='Balance stored. Read Δt from the sweep and calculate Rx and φ, then check your calculation.';}
  else{$('#resistorMessage').className='notice ok';$('#resistorMessage').textContent=state.resistor.xyVerified?'Resistance/phase calculation and XY check are complete.':'Calculation accepted. Switch to XY mode to verify the straight-line in-phase trace.';}
}
function recordRBalance(){
  if(!phaseSetup('r')){updateResistor();return;}const x=circuitResistor(),ratio=x.a2/x.a1;if(Math.abs(ratio-1)>=.03){updateResistor();return;}const f=+$('#rFreq').value,T=1/f;state.resistor.balance={rd:x.rd,ratio,T,frequency:f,timeDiv:+$('#rTimeDiv').value};state.resistor.analysis=null;state.resistor.xyVerified=false;$('#resistorMessage').className='notice ok';$('#resistorMessage').textContent='Balanced condition stored. Read the sweep separation and calculate Rx and φ before the XY check.';updateResistor();progress();save();
}
function checkResistorAnalysis(){
  const b=state.resistor.balance;if(!b){$('#resistorMessage').className='notice warn';$('#resistorMessage').textContent='Record the balanced condition first.';return;}
  const rx=+$('#rStudentRx').value,dtDiv=+$('#rStudentDtDiv').value,phi=+$('#rStudentPhi').value;
  if(!Number.isFinite(rx)||!Number.isFinite(dtDiv)||!Number.isFinite(phi)||rx<=0||dtDiv<0){$('#resistorMessage').className='notice warn';$('#resistorMessage').textContent='Enter Rx, Δt in divisions, and the phase you calculated.';return;}
  if(Math.abs(rx-b.rd)>Math.max(20,.03*b.rd)){$('#resistorMessage').className='notice warn';$('#resistorMessage').textContent='At amplitude balance, reapply the relation Rx ≈ Rd.';return;}
  if(dtDiv>.20){$('#resistorMessage').className='notice warn';$('#resistorMessage').textContent='The two resistor voltages are essentially in phase. Re-read the horizontal separation; it should be near zero divisions.';return;}
  if(Math.abs(phi)>5){$('#resistorMessage').className='notice warn';$('#resistorMessage').textContent='Recalculate φ = 360°·Δt/T. The balanced resistor signals should be nearly in phase.';return;}
  state.resistor.analysis={rx,dtDiv,phi,T:b.T};$('#resistorMessage').className='notice ok';$('#resistorMessage').textContent='Resistance and phase calculation accepted. Now use XY mode as the independent phase check.';updateResistor();progress();save();
}
function updateCap(){
  const x=drawDual('#capacitorCanvas','c'),ratio=x.safe&&x.a1>0?x.a2/x.a1:NaN,a=state.capacitor.analysis;$('#cDecadeLabel').textContent=`${x.rd.toFixed(0)} Ω`;
  if(a){$('#zcResult').textContent=`${a.zc.toFixed(0)} Ω`;$('#cPhiSweep').textContent=`${a.phi.toFixed(1)}°`;$('#cPhiXY').textContent=state.capacitor.xyVerified?`${a.phi.toFixed(1)}°`:'—°';$('#cResult').textContent=`${a.C.toFixed(3)} µF`;}
  else{$('#zcResult').textContent='— Ω';$('#cPhiSweep').textContent='—°';$('#cPhiXY').textContent='—°';$('#cResult').textContent='— µF';}
  if(!phaseSetup('c')){$('#capMessage').className='notice warn';$('#capMessage').textContent='Reproduce Figure 6 first: CH1→A, CH2→C, common ground→B, AC on both channels, CH2 inverted.';}
  else if(!state.capacitor.balance){$('#capMessage').className=Math.abs(ratio-1)<.03?'notice ok':'notice';$('#capMessage').textContent=Math.abs(ratio-1)<.03?'Voltage amplitudes are balanced within 3%. Record the condition.':state.mode==='learn'?(ratio>1?'Capacitor voltage is larger: increase decade resistance.':'Resistor voltage is larger: decrease decade resistance.'):'Adjust the decade resistance until the two amplitudes are equal.';}
  else if(!a){$('#capMessage').className='notice';$('#capMessage').textContent='Balance stored. Read Δt from the sweep and calculate Zc, φ and C.';}
  else{$('#capMessage').className='notice ok';$('#capMessage').textContent=state.capacitor.xyVerified?'Impedance/capacitance calculation and XY check are complete.':'Calculation accepted. Switch to XY mode to verify the quadrature Lissajous figure.';}
}
function recordCBalance(){
  if(!phaseSetup('c')){updateCap();return;}const x=circuitCap(),ratio=x.a2/x.a1;if(Math.abs(ratio-1)>=.03){updateCap();return;}const f=+$('#cFreq').value,T=1/f;state.capacitor.balance={rd:x.rd,ratio,T,frequency:f,timeDiv:+$('#cTimeDiv').value};state.capacitor.analysis=null;state.capacitor.xyVerified=false;$('#capMessage').className='notice ok';$('#capMessage').textContent='Balanced impedance condition stored. Read the sweep separation and calculate Zc, φ and C before the XY check.';updateCap();progress();save();
}
function checkCapAnalysis(){
  const b=state.capacitor.balance;if(!b){$('#capMessage').className='notice warn';$('#capMessage').textContent='Record the balanced impedance condition first.';return;}
  const zc=+$('#cStudentZ').value,dtDiv=+$('#cStudentDtDiv').value,phi=+$('#cStudentPhi').value,C=+$('#cStudentC').value,expectedDt=(b.T/4)/(+$('#cTimeDiv').value),expectedC=1/(TAU*b.frequency*b.rd)*1e6;
  if(!Number.isFinite(zc)||!Number.isFinite(dtDiv)||!Number.isFinite(phi)||!Number.isFinite(C)||zc<=0||dtDiv<=0||C<=0){$('#capMessage').className='notice warn';$('#capMessage').textContent='Enter Zc, Δt in divisions, φ and C before checking.';return;}
  if(Math.abs(zc-b.rd)>Math.max(20,.03*b.rd)){$('#capMessage').className='notice warn';$('#capMessage').textContent='At amplitude balance, reapply the relation |Zc| ≈ Rd.';return;}
  if(Math.abs(dtDiv-expectedDt)>Math.max(.15,.05*expectedDt)){$('#capMessage').className='notice warn';$('#capMessage').textContent='Re-read the horizontal separation between the resistor and capacitor waveforms.';return;}
  if(Math.abs(phi-90)>6){$('#capMessage').className='notice warn';$('#capMessage').textContent='Recalculate φ = 360°·Δt/T; an ideal capacitor should be close to 90° in magnitude.';return;}
  if(Math.abs(C-expectedC)>Math.max(.01,.06*expectedC)){$('#capMessage').className='notice warn';$('#capMessage').textContent='Recalculate C = 1/(2πf|Zc|), with capacitance reported in µF.';return;}
  state.capacitor.analysis={zc,dtDiv,phi,C,T:b.T};$('#capMessage').className='notice ok';$('#capMessage').textContent='Impedance, phase and capacitance calculation accepted. Now use XY mode as an independent phase check.';updateCap();progress();save();
}

function setupQuiz(){
  $('#quiz').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),ans={q1:'a',q2:'a',q3:'a',q4:'a',q5:'a',q6:'a'},miss=Object.keys(ans).filter(q=>!fd.get(q));if(miss.length){$('#quizResult').className='notice warn';$('#quizResult').textContent='Answer all six questions before submitting.';return;}let score=0,breakdown=[];Object.entries(ans).forEach(([q,a],i)=>{const ok=fd.get(q)===a;if(ok)score++;breakdown.push({q:i+1,ok});});state.assessment={score,total:6,breakdown};const box=$('#quizResult');box.className=score>=5?'notice ok':score>=3?'notice warn':'notice bad';box.innerHTML=`<strong>${score}/6 correct.</strong>`+(state.mode==='learn'?`<ul>${breakdown.map(x=>`<li>Question ${x.q}: ${x.ok?'correct':'review needed'}</li>`).join('')}</ul>`:'');save();});
}
function restoreAssessment(){if(!state.assessment)return;$('#quizResult').className=state.assessment.score>=5?'notice ok':state.assessment.score>=3?'notice warn':'notice bad';$('#quizResult').innerHTML=`<strong>Saved assessment: ${state.assessment.score}/${state.assessment.total}.</strong>`;}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function prose(s){return escapeHtml(s||'').replace(/\n/g,'<br>')||'<em>Not completed.</em>';}
function buildReport(){
  const emailEl=$('#studentEmail'),email=(emailEl?.value||'').trim();if(!emailEl||!email||!emailEl.checkValidity()){if(emailEl)emailEl.focus();$('#reportPreview').innerHTML='<div class="notice warn"><strong>Email required.</strong> Enter a valid student email before building the report.</div>';return false;}
  drawXY();drawSweep();updateResistor();updateCap();state.report=collectReport();
  const r=state.resistor.analysis,c=state.capacitor.analysis,s=state.sweep.measurement,xyImg=$('#xyCanvas').toDataURL(),swImg=$('#sweepCanvas').toDataURL(),rImg=$('#resistorCanvas').toDataURL(),cImg=$('#capacitorCanvas').toDataURL();
  const html=`<h2>Laboratory Practical 4 Report — E04</h2><p><strong>The Oscilloscope</strong></p><p><strong>Student:</strong> ${escapeHtml($('#studentName')?.value||'—')} &nbsp; <strong>Email:</strong> ${escapeHtml(email)} &nbsp; <strong>Group:</strong> ${escapeHtml($('#studentGroup')?.value||'—')} &nbsp; <strong>Date:</strong> ${escapeHtml(state.report.reportDate||'—')} &nbsp; <strong>Run:</strong> ${escapeHtml(state.run.id)}</p>
  <h3>3 — XY mode</h3><p>Recorded observation combinations: ${Object.keys(state.xy.observed||{}).length}/9.</p><img src="${xyImg}" style="max-width:100%" alt="XY-mode oscilloscope trace">
  <h3>4 — Sweep & synchronisation</h3><p>Sweep calibration: ${state.sweep.calChecked?'verified at 0.5 s/div (10 div = 5 s)':'not completed'}. Student frequency measurement: ${s?`${s.periodDiv.toFixed(2)} div, T=${formatTime(s.T)}, f=${s.f.toFixed(1)} Hz; generator setting=${s.generator} Hz`:'not completed'}.</p><img src="${swImg}" style="max-width:100%" alt="Sweep-mode waveform">
  <h3>5.1 — Unknown resistance</h3><p>${r?`Student result: R_x≈${r.rx.toFixed(0)} Ω; Δt=${r.dtDiv.toFixed(2)} div; phase=${r.phi.toFixed(1)}°. XY verification: ${state.resistor.xyVerified?'completed':'not completed'}.`:'Student calculation not validated.'}</p><img src="${rImg}" style="max-width:100%" alt="Unknown resistance oscilloscope trace">
  <h3>5.2 — Capacitor</h3><p>${c?`Student result: |Z_C|≈${c.zc.toFixed(0)} Ω; phase magnitude≈${c.phi.toFixed(1)}°; C≈${c.C.toFixed(3)} µF. XY verification: ${state.capacitor.xyVerified?'completed':'not completed'}.`:'Student calculation not validated.'}</p><img src="${cImg}" style="max-width:100%" alt="Capacitor oscilloscope trace">
  <h3>Discussion</h3><p>${prose(state.report.reportDiscussion)}</p><h3>Conclusion</h3><p>${prose(state.report.reportConclusion)}</p><p><strong>Assessment:</strong> ${state.assessment?state.assessment.score+'/'+state.assessment.total:'not submitted'}.</p>
  <hr><p class="mini">The core task sequence follows the USTHB oscilloscope practical. Hidden component values, trace-reading bias and source amplitude are virtual-laboratory parameters.</p>`;
  $('#reportPreview').innerHTML=html;$('#printOnlyPreview').innerHTML=html;save();return true;
}

function setupTabs(){
  $$('.tabbtn').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.tab;$$('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));$$('.tabpanel').forEach(p=>p.classList.toggle('active',p.id===id));drawXY();drawSweep();updateResistor();updateCap();}));
}
function bindPersistentFields(){
  const bind=(id,bucket)=>{
    const el=document.getElementById(id);if(!el)return;
    el.addEventListener('input',()=>{
      state[bucket]=state[bucket]||{};
      state[bucket][id]=el.value;
      persistState();
    });
  };
  [].forEach(id=>bind(id,'text'));
  ["reportDate","reportDiscussion","reportConclusion"].forEach(id=>bind(id,'report'));
}
function init(){
  load();bindPersistentFields();if(state.report){delete state.report.studentName;delete state.report.studentGroup;delete state.report.studentEmail;persistState()}if(!state.run)state.run=makeRun();state.resistor=state.resistor||{xy:false,xyVerified:false,balance:null,analysis:null};state.capacitor=state.capacitor||{xy:false,xyVerified:false,balance:null,analysis:null};if(!('analysis' in state.resistor))state.resistor.analysis=null;if(!('analysis' in state.capacitor))state.capacitor.analysis=null;restoreReport();setupTabs();setupQuiz();applyMode(state.mode);renderXYObs();progress();restoreAssessment();
  if(state.sweep.measurement){$('#sweepStudentDivs').value=state.sweep.measurement.periodDiv;$('#sweepStudentT').value=state.sweep.measurement.T;$('#sweepStudentF').value=state.sweep.measurement.f;}
  if(state.resistor.analysis){$('#rStudentRx').value=state.resistor.analysis.rx;$('#rStudentDtDiv').value=state.resistor.analysis.dtDiv;$('#rStudentPhi').value=state.resistor.analysis.phi;}
  if(state.capacitor.analysis){$('#cStudentZ').value=state.capacitor.analysis.zc;$('#cStudentDtDiv').value=state.capacitor.analysis.dtDiv;$('#cStudentPhi').value=state.capacitor.analysis.phi;$('#cStudentC').value=state.capacitor.analysis.C;}
  ['xyWave','xyFreq','xyRoute','xyVdiv1','xyVdiv2','xyAmp','xyIntensity','xyFocus','xyXPos','xyYPos','xyModeControl'].forEach(id=>$('#'+id).addEventListener('input',()=>{drawXY();save();}));$('#recordXYObservation').addEventListener('click',recordXY);$('#centerSpot').addEventListener('click',()=>{state.xy.xPos=0;state.xy.yPos=0;$('#xyXPos').value=0;$('#xyYPos').value=0;drawXY();$('#xyMessage').className='notice ok';$('#xyMessage').textContent='Spot centred using commands (8) and (6B).';save();});
  ['sweepWave','sweepFreq','timeDiv','sweepVdiv','triggerLevel','triggerMode','triggerSource','sweepCoupling','sweepDisplayMode'].forEach(id=>$('#'+id).addEventListener('input',()=>{if(state.sweep.measurement){state.sweep.measurement=null;$('#sweepStudentDivs').value='';$('#sweepStudentT').value='';$('#sweepStudentF').value='';progress();}drawSweep();save();}));$('#toggleSweepCal').addEventListener('click',()=>{state.sweep.cal=!state.sweep.cal;drawSweep();save();});$('#toggleCh1Cal').addEventListener('click',()=>{state.sweep.ch1Cal=!state.sweep.ch1Cal;drawSweep();save();});$('#toggleXMag').addEventListener('click',()=>{state.sweep.xMag=!state.sweep.xMag;drawSweep();save();});$('#recordSweep').addEventListener('click',recordSweep);
  ['rFreq','rDecade','rCH1Point','rCH2Point','rGroundPoint','rCoupling1','rCoupling2','rFine1','rFine2','rInvert2'].forEach(id=>$('#'+id).addEventListener('input',()=>{state.resistor.balance=null;state.resistor.analysis=null;state.resistor.xyVerified=false;$('#rStudentRx').value='';$('#rStudentDtDiv').value='';$('#rStudentPhi').value='';updateResistor();progress();save();}));
  ['rVdiv','rTimeDiv'].forEach(id=>$('#'+id).addEventListener('input',()=>{state.resistor.analysis=null;state.resistor.xyVerified=false;$('#rStudentDtDiv').value='';$('#rStudentPhi').value='';updateResistor();progress();save();}));
  $('#recordResistorBalance').addEventListener('click',recordRBalance);$('#checkResistorAnalysis').addEventListener('click',checkResistorAnalysis);$('#switchResistorXY').addEventListener('click',()=>{state.resistor.xy=!state.resistor.xy;if(state.resistor.xy&&state.resistor.balance&&state.resistor.analysis&&phaseSetup('r'))state.resistor.xyVerified=true;updateResistor();progress();save();});
  ['cFreq','cDecade','cCH1Point','cCH2Point','cGroundPoint','cCoupling1','cCoupling2','cFine1','cFine2','cInvert2'].forEach(id=>$('#'+id).addEventListener('input',()=>{state.capacitor.balance=null;state.capacitor.analysis=null;state.capacitor.xyVerified=false;$('#cStudentZ').value='';$('#cStudentDtDiv').value='';$('#cStudentPhi').value='';$('#cStudentC').value='';updateCap();progress();save();}));
  ['cVdiv','cTimeDiv'].forEach(id=>$('#'+id).addEventListener('input',()=>{state.capacitor.analysis=null;state.capacitor.xyVerified=false;$('#cStudentDtDiv').value='';$('#cStudentPhi').value='';$('#cStudentC').value='';updateCap();progress();save();}));
  $('#recordCapBalance').addEventListener('click',recordCBalance);$('#checkCapAnalysis').addEventListener('click',checkCapAnalysis);$('#switchCapXY').addEventListener('click',()=>{state.capacitor.xy=!state.capacitor.xy;if(state.capacitor.xy&&state.capacitor.balance&&state.capacitor.analysis&&phaseSetup('c'))state.capacitor.xyVerified=true;updateCap();progress();save();});
  $('#buildReport').addEventListener('click',buildReport);$('#clearLocalProgress')?.addEventListener('click',()=>{if(confirm('Clear all locally saved progress for this practical on this browser?')){try{localStorage.removeItem(STORAGE);}catch(_){}location.reload();}});$('#printReport').addEventListener('click',()=>{if(buildReport())window.print();});$$('.modebtn').forEach(b=>b.addEventListener('click',()=>applyMode(b.dataset.mode)));
  ['reportDate','reportDiscussion','reportConclusion'].forEach(id=>$('#'+id).addEventListener('input',save));
  window.addEventListener('resize',()=>{drawXY();drawSweep();updateResistor();updateCap();});window.addEventListener('beforeunload',save);
  $('#xyIntensity').value=state.xy.intensity;$('#xyFocus').value=state.xy.focus;$('#xyXPos').value=state.xy.xPos;$('#xyYPos').value=state.xy.yPos;$('#xyModeControl').value=state.xy.mode;
  drawXY();drawSweep();updateResistor();updateCap();
}
init();
})();