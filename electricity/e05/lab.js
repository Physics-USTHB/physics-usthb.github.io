(() => {
'use strict';

const RG=50, RB=20;
const STORAGE='PhysicsUSTHB_E05_v2';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const TIME_OPTIONS=[1e-5,2e-5,5e-5,1e-4,2e-4,5e-4,1e-3,2e-3];
const FREQ_OPTIONS=[100,200,500,1000,2000,5000];
const VDIV_OPTIONS=[.25,.5,.75,1,1.5,2];

let state={
  version:2,mode:'learn',run:null,task:'knownRC',method:'5',
  wiring:{circuit:'',probe:'',source:'',ground:'',verified:false},
  settings:{frequency:500,sourceAmp:8,timeDiv:5e-5,voltsDiv:1,cursor:0},
  results:{},fits:{},assessment:null,report:{}
};

function makeRun(){
  return{
    id:'E05-'+Math.random().toString(36).slice(2,7).toUpperCase(),
    rx:260+Math.random()*420,
    cx:(.28+Math.random()*.50)*1e-6,
    lx:.035+Math.random()*.055,
    scopeBias:(Math.random()-.5)*.005
  };
}
function save(){state.report=collectReport();try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(_){}}
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');if(x?.version===2)state={...state,...x};}catch(_){}}
function collectReport(){const ids=['reportDate','reportDiscussion','reportConclusion'],o={};ids.forEach(id=>{const el=document.getElementById(id);if(el)o[id]=el.value;});return o}
function restoreReport(){Object.entries(state.report||{}).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v||''});if(!$('#reportDate').value)$('#reportDate').value=new Date().toISOString().slice(0,10)}
function applyMode(mode){
  state.mode=mode==='lab'?'lab':'learn';document.body.classList.toggle('mode-lab',state.mode==='lab');document.body.classList.toggle('mode-learn',state.mode==='learn');
  $$('.modebtn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
  $('#modeDescription').textContent=state.mode==='learn'?'Protocol guidance and measurement diagnostics are visible.':'Minimal guidance; choose the measurement settings independently.';
  $('#reportMode').value=state.mode==='learn'?'Learn mode':'Lab mode';save();
}

function requiredWiring(){
  const info=taskInfo();
  return{circuit:info.kind,probe:info.kind==='RC'?'C':'R',source:'step',ground:'return'};
}
function wiringOK(){
  const r=requiredWiring(),w=state.wiring||{};
  return w.circuit===r.circuit&&w.probe===r.probe&&w.source===r.source&&w.ground===r.ground;
}
function updateWiring(){
  state.wiring.circuit=$('#e05CircuitType').value;state.wiring.probe=$('#e05ProbeAcross').value;state.wiring.source=$('#e05SourceWave').value;state.wiring.ground=$('#e05Ground').value;
  state.wiring.verified=false;
  const info=taskInfo(),r=requiredWiring(),w=state.wiring,el=$('#e05WiringStatus');
  if(!w.circuit||!w.probe||!w.source||!w.ground){el.className='transient-wiring-status';el.textContent='Complete the four circuit choices, then verify the circuit.';return false;}
  if(w.ground==='middle'){el.className='transient-wiring-status bad';el.textContent='Incorrect oscilloscope common: use the circuit return / generator common. Grounding the intermediate node changes the intended circuit.';return false;}
  if(w.source!=='step'){el.className='transient-wiring-status bad';el.textContent='The transient practical requires a step/square excitation, not a sinusoidal steady-state signal.';return false;}
  if(w.circuit!==r.circuit){el.className='transient-wiring-status bad';el.textContent=`${info.code} requires an ${r.circuit} series circuit.`;return false;}
  if(w.probe!==r.probe){el.className='transient-wiring-status bad';el.textContent=info.kind==='RC'?'For the RC transient, observe V_C(t) across the capacitor.':'For the RL transient, observe V_R(t), which is proportional to the circuit current.';return false;}
  el.className='transient-wiring-status ok';el.textContent=info.kind==='RC'?'Correct RC circuit: square-step source, R and C in series, oscilloscope across C, common at return.':'Correct RL circuit: square-step source, R and coil in series, oscilloscope across R, common at return.';return true;
}
function verifyWiring(){
  if(!updateWiring())return;
  state.wiring.verified=true;$('#e05WiringStatus').className='transient-wiring-status ok';$('#e05WiringStatus').textContent='Circuit verified. The generator may now be energised and the transient measured.';syncUI();save();
}

function taskInfo(task=state.task){
  if(task==='knownRC')return{code:'4.1 — Known R, known C',title:'Validate the RC time constant',kind:'RC',R:50,C:.5e-6,L:null,Rb:0,unknown:null,hint:'Adjust the trace for a complete RC charge and measure τ. Compare it with (R + r_g)C.'};
  if(task==='unknownR')return{code:'4.2 — Unknown R, known C',title:'Determine an unknown resistance',kind:'RC',R:state.run.rx,C:.5e-6,L:null,Rb:0,unknown:'R',hint:'Measure τ with the known 0.50 µF capacitor, then use R_x = τ/C − r_g.'};
  if(task==='unknownC')return{code:'4.3 — Known R, unknown C',title:'Determine an unknown capacitance',kind:'RC',R:150,C:state.run.cx,L:null,Rb:0,unknown:'C',hint:'Measure τ with R = 150 Ω, then use C_x = τ/(R + r_g).'};
  return{code:'4.4 — Known R, unknown L',title:'Determine an unknown inductance',kind:'RL',R:150,C:null,L:state.run.lx,Rb:RB,unknown:'L',hint:'Observe the resistor voltage proportional to current, measure τ, then use L_x = τ(R + r_g + R_b).'};
}
function trueTau(info=taskInfo()){return info.kind==='RC'?(info.R+RG)*info.C:info.L/(info.R+RG+info.Rb)}
function finalResponse(info=taskInfo(),E=state.settings.sourceAmp){return info.kind==='RC'?E:E*info.R/(info.R+RG+info.Rb)}
function fmtTime(t){if(t>=1)return`${t.toFixed(2)} s`;if(t>=1e-3)return`${(t*1e3).toFixed(t<.01?2:1)} ms`;return`${(t*1e6).toFixed(t<1e-4?1:0)} µs`}
function fmtCap(c){return`${(c*1e6).toFixed(3)} µF`}
function fmtInd(l){return`${(l*1e3).toFixed(1)} mH`}

function progress(){
  const items=[
    ['4.1','Known R,C','knownRC'],['4.2','Unknown R','unknownR'],['4.3','Unknown C','unknownC'],['4.4','Unknown L','unknownL']
  ];
  const active=items.findIndex(x=>!state.results[x[2]]);
  $('#progressBoard').innerHTML=items.map((x,i)=>`<div class="transient-step ${state.results[x[2]]?'done':''} ${i===active?'active':''}"><b>${x[0]}</b><strong>${x[1]}</strong><small>${state.results[x[2]]?'Complete':'τ pending'}</small></div>`).join('');
}

function periodicParams(info=taskInfo()){
  const tau=trueTau(info),f=state.settings.frequency,h=1/(2*f),fin=finalResponse(info),a=Math.exp(-h/tau),ymin=fin*a/(1+a),ymax=fin/(1+a);
  return{tau,f,h,T:1/f,fin,a,ymin,ymax};
}
function responseAt(t,info=taskInfo()){
  const p=periodicParams(info),u=((t%p.T)+p.T)%p.T;
  if(u<p.h)return p.fin-(p.fin-p.ymin)*Math.exp(-u/p.tau);
  return p.ymax*Math.exp(-(u-p.h)/p.tau);
}
function responseCharge(t,info=taskInfo()){
  const p=periodicParams(info);return p.fin-(p.fin-p.ymin)*Math.exp(-t/p.tau)
}
function methodFrac(){return state.method==='5'?5/8:4/6}
function targetDivMax(){return state.method==='5'?8:6}
function quality(){
  const info=taskInfo(),p=periodicParams(info),td=state.settings.timeDiv,vd=state.settings.voltsDiv,fin=p.fin;
  const complete=p.h/p.tau>=5;
  const tauDiv=p.tau/td;
  const horizontal=tauDiv>=.7&&tauDiv<=4;
  const ampDiv=fin/vd,target=targetDivMax();
  const vertical=Math.abs(ampDiv-target)<=.35;
  return{complete,horizontal,vertical,tauDiv,ampDiv,target,halfTau:p.h/p.tau};
}

function setupCanvas(c){
  const dpr=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||560;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return{ctx,w,h}
}
function grid(ctx,w,h){
  ctx.fillStyle='#03130f';ctx.fillRect(0,0,w,h);const l=22,r=22,t=22,b=22,gw=w-l-r,gh=h-t-b;
  ctx.strokeStyle='rgba(93,255,184,.16)';for(let i=0;i<=10;i++){const x=l+gw*i/10;ctx.beginPath();ctx.moveTo(x,t);ctx.lineTo(x,h-b);ctx.stroke()}for(let j=0;j<=8;j++){const y=t+gh*j/8;ctx.beginPath();ctx.moveTo(l,y);ctx.lineTo(w-r,y);ctx.stroke()}
  ctx.strokeStyle='rgba(117,255,195,.30)';ctx.beginPath();ctx.moveTo(l,t+gh/2);ctx.lineTo(w-r,t+gh/2);ctx.moveTo(l+gw/2,t);ctx.lineTo(l+gw/2,h-b);ctx.stroke();
  return{l,r,t,b,gw,gh,xdiv:gw/10,ydiv:gh/8,cy:t+gh*.84}
}
function draw(){
  const c=$('#transientCanvas');if(!c)return;const{ctx,w,h}=setupCanvas(c),g=grid(ctx,w,h),info=taskInfo(),td=state.settings.timeDiv,vd=state.settings.voltsDiv,screenT=10*td,p=periodicParams(info);
  if(!state.wiring.verified||!wiringOK()){ctx.fillStyle='#ffb4c1';ctx.font='700 16px system-ui';ctx.textAlign='center';ctx.fillText('Verify the correct RC/RL circuit before energising the source',w/2,h/2);$('#timeDivLabel').textContent=`${fmtTime(td)}/div`;$('#voltsDivLabel').textContent=`${vd} V/div`;$('#methodLabel').textContent=state.method==='5'?'5-square method':'4-square method';return;}
  const src=[],sig=[];for(let k=0;k<=1000;k++){const t=screenT*k/1000,phase=((t%p.T)+p.T)%p.T,s=phase<p.h?state.settings.sourceAmp:0,y=responseAt(t,info);src.push({x:g.l+g.gw*k/1000,y:g.cy-s/vd*g.ydiv});sig.push({x:g.l+g.gw*k/1000,y:g.cy-y/vd*g.ydiv})}
  const path=(pts,color,width,alpha)=>{ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.globalAlpha=alpha;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.stroke();ctx.restore()};
  path(src,'#6ca8ff',1.2,.45);path(sig,'#7dffc2',2.4,.95);
  const frac=methodFrac(),target=frac*p.fin,cursor=state.settings.cursor,ycur=responseCharge(cursor,info),xcur=g.l+cursor/td*g.xdiv,yTarget=g.cy-target/vd*g.ydiv,yCur=g.cy-ycur/vd*g.ydiv;
  ctx.strokeStyle='#ffd166';ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(g.l,yTarget);ctx.lineTo(w-g.r,yTarget);ctx.stroke();ctx.setLineDash([]);
  if(cursor<=screenT){ctx.strokeStyle='#ff718b';ctx.beginPath();ctx.moveTo(xcur,g.t);ctx.lineTo(xcur,h-g.b);ctx.stroke();ctx.fillStyle='#ff718b';ctx.beginPath();ctx.arc(xcur,yCur,5,0,Math.PI*2);ctx.fill()}
  $('#timeDivLabel').textContent=`${fmtTime(td)}/div`;$('#voltsDivLabel').textContent=`${vd} V/div`;$('#methodLabel').textContent=state.method==='5'?'5-square method':'4-square method';
}
function syncUI(){
  $('#taskSelect').value=state.task;$('#frequency').value=state.settings.frequency;$('#sourceAmp').value=state.settings.sourceAmp;$('#timeDiv').value=state.settings.timeDiv;$('#voltsDiv').value=state.settings.voltsDiv;$('#tauMethod').value=state.method;
  $('#sourceAmpLabel').textContent=`${state.settings.sourceAmp.toFixed(1)} V`;const info=taskInfo(),p=periodicParams(info);
  $('#taskCode').textContent=info.code;$('#taskTitle').textContent=info.title;$('#taskHint').textContent=info.hint;
  $('#compR').textContent=info.unknown==='R'?'Rₓ unknown':`${info.R.toFixed(0)} Ω`;$('#compC').textContent=info.kind==='RL'?'—':info.unknown==='C'?'Cₓ unknown':fmtCap(info.C);$('#compL').textContent=info.kind==='RL'?`Lₓ unknown / Rb=${info.Rb} Ω`:'—';
  const h=p.h;$('#cursorTime').max=h;$('#cursorTime').step=Math.max(h/2000,1e-7);state.settings.cursor=clamp(state.settings.cursor,0,h);$('#cursorTime').value=state.settings.cursor;updateCursor();updateQuality();draw()
}
function updateCursor(){
  const info=taskInfo(),p=periodicParams(info),t=state.settings.cursor,y=responseCharge(t,info),target=methodFrac()*p.fin,err=(y-target)/state.settings.voltsDiv;
  $('#cursorTimeLabel').textContent=fmtTime(t);$('#cursorValue').textContent=`${y.toFixed(3)} V`;$('#targetValue').textContent=`${target.toFixed(3)} V`;$('#targetError').textContent=`${err>=0?'+':''}${err.toFixed(2)} div`;draw()
}
function updateQuality(){
  const q=quality(),set=(id,ok,text,warn=false)=>{const el=$(id);el.textContent=text;el.className=ok?'good':warn?'warn-text':'bad-text'};
  set('#qualityComplete',q.complete,q.complete?'complete':`${q.halfTau.toFixed(1)} τ/half`,q.halfTau>=3);
  set('#qualityHorizontal',q.horizontal,`${q.tauDiv.toFixed(2)} div/τ`,q.tauDiv>=.4&&q.tauDiv<=6);
  set('#qualityVertical',q.vertical,`${q.ampDiv.toFixed(2)} div (target ${q.target})`,Math.abs(q.ampDiv-q.target)<1);
  const good=state.wiring.verified&&wiringOK()&&q.complete&&q.horizontal&&q.vertical;$('#benchState').textContent=!state.wiring.verified?'Verify circuit':good?'Display ready':'Adjust settings';$('#benchState').classList.toggle('ok',good);
  if(state.mode==='learn'){
    const hints=[];if(!state.wiring.verified||!wiringOK())hints.push('build and verify the correct circuit first');if(!q.complete)hints.push('lower the generator frequency so T/2 ≥ 5τ');if(!q.horizontal)hints.push(q.tauDiv<.7?'use a faster TIME/DIV so τ spans more divisions':'use a slower TIME/DIV so τ fits comfortably');if(!q.vertical)hints.push(`adjust source level or VOLTS/DIV so the final response spans ${q.target} divisions`);
    $('#benchMessage').className=good?'notice ok':'notice '+(hints.length>1?'warn':'');$('#benchMessage').textContent=good?'The display meets the handout criteria. Move the cursor to the target level and record τ.':`Improve the display: ${hints.join('; ')}.`;
  }else{$('#benchMessage').className=good?'notice ok':'notice';$('#benchMessage').textContent=good?'Display conditions acceptable.':'Display conditions not yet acceptable.'}
}
function recommended(){
  const info=taskInfo(),tau=trueTau(info),target=targetDivMax();
  const maxF=1/(10*tau);let f=FREQ_OPTIONS.filter(x=>x<=maxF).at(-1)||FREQ_OPTIONS[0];if(f>1000)f=1000;state.settings.frequency=f;
  let td=TIME_OPTIONS.reduce((best,x)=>Math.abs(x-tau/2)<Math.abs(best-tau/2)?x:best,TIME_OPTIONS[0]);state.settings.timeDiv=td;
  let chosen=null;for(const vd of VDIV_OPTIONS){const factor=info.kind==='RL'?info.R/(info.R+RG+info.Rb):1,need=target*vd/factor;if(need>=2&&need<=10){chosen={vd,E:need};break}}
  if(!chosen)chosen={vd:1,E:clamp(target/(info.kind==='RL'?info.R/(info.R+RG+info.Rb):1),2,10)};
  state.settings.voltsDiv=chosen.vd;state.settings.sourceAmp=Math.round(chosen.E*10)/10;state.settings.cursor=Math.min(periodicParams(info).h*.12,tau*.3);syncUI();save()
}
function recordTau(){
  if(!state.wiring.verified||!wiringOK()){$('#benchMessage').className='notice warn';$('#benchMessage').textContent='Verify the correct USTHB circuit and oscilloscope connection before measuring τ.';return}
  const q=quality(),info=taskInfo(),p=periodicParams(info),target=methodFrac()*p.fin,y=responseCharge(state.settings.cursor,info),errDiv=Math.abs(y-target)/state.settings.voltsDiv;
  if(!(q.complete&&q.horizontal&&q.vertical)){$('#benchMessage').className='notice warn';$('#benchMessage').textContent='The handout measurement conditions are not yet satisfied.';return}
  if(errDiv>.10){$('#benchMessage').className='notice warn';$('#benchMessage').textContent=`Move the time cursor closer to the target level. Current error: ${errDiv.toFixed(2)} division.`;return}
  const tau=state.settings.cursor,rec={tau,method:state.method,frequency:state.settings.frequency,sourceAmp:state.settings.sourceAmp,timeDiv:state.settings.timeDiv,voltsDiv:state.settings.voltsDiv,trueTau:p.tau};
  if(state.task==='knownRC'){rec.theory=(info.R+RG)*info.C;rec.derived=null}
  if(state.task==='unknownR')rec.derived=tau/info.C-RG;
  if(state.task==='unknownC')rec.derived=tau/(info.R+RG);
  if(state.task==='unknownL')rec.derived=tau*(info.R+RG+info.Rb);
  state.results[state.task]=rec;delete state.fits[state.task];$('#benchMessage').className='notice ok';$('#benchMessage').textContent=`τ recorded: ${fmtTime(tau)}. Result stored for ${info.code}.`;renderResults();progress();drawSummary();save()
}
function taskChanged(){
  state.task=$('#taskSelect').value;state.settings.cursor=0;state.wiring={circuit:'',probe:'',source:'',ground:'',verified:false};$('#e05CircuitType').value='';$('#e05ProbeAcross').value='';$('#e05SourceWave').value='';$('#e05Ground').value='';updateWiring();recommended()
}

function renderResults(){
  const k=state.results.knownRC,r=state.results.unknownR,c=state.results.unknownC,l=state.results.unknownL;
  $('#knownTau').textContent=k?fmtTime(k.tau):'—';$('#knownTheory').textContent=fmtTime((50+RG)*.5e-6);$('#knownError').textContent=k?`${(100*(k.tau-k.theory)/k.theory).toFixed(1)}%`:'—';$('#knownMethod').textContent=k?(k.method==='5'?'5-square':'4-square'):'—';
  $('#rTau').textContent=r?fmtTime(r.tau):'—';$('#rDerived').textContent=r?`${r.derived.toFixed(0)} Ω`:'— Ω';$('#rMethod').textContent=r?(r.method==='5'?'5-square':'4-square'):'—';
  $('#cTau').textContent=c?fmtTime(c.tau):'—';$('#cDerived').textContent=c?fmtCap(c.derived):'— µF';$('#cMethod').textContent=c?(c.method==='5'?'5-square':'4-square'):'—';
  $('#lTau').textContent=l?fmtTime(l.tau):'—';$('#lDerived').textContent=l?fmtInd(l.derived):'— mH';$('#lMethod').textContent=l?(l.method==='5'?'5-square':'4-square'):'—';
}
function fitCurrent(){
  const rec=state.results[state.task];if(!rec){$('#fitMessage').className='notice warn';$('#fitMessage').textContent='Complete the selected task first.';return}
  const info=taskInfo(),p=periodicParams(info),n=45,x=[],z=[];const y0=p.ymin,fin=p.fin;
  for(let i=1;i<=n;i++){const t=Math.min(4*p.tau,p.h*.85)*i/n;let y=fin-(fin-y0)*Math.exp(-t/p.tau);y+=fin*.0018*Math.sin(i*2.17+state.run.scopeBias*100);const ratio=(fin-y)/(fin-y0);if(ratio>.015){x.push(t);z.push(Math.log(ratio));}}
  const mx=x.reduce((a,b)=>a+b,0)/x.length,mz=z.reduce((a,b)=>a+b,0)/z.length;let num=0,den=0;for(let i=0;i<x.length;i++){num+=(x[i]-mx)*(z[i]-mz);den+=(x[i]-mx)**2}const slope=num/den,tau=-1/slope;const pred=x.map(t=>mz+slope*(t-mx)),ssr=z.reduce((a,v,i)=>a+(v-pred[i])**2,0),sst=z.reduce((a,v)=>a+(v-mz)**2,0),r2=1-ssr/sst;
  state.fits[state.task]={tau,r2};$('#fitMessage').className='notice ok';$('#fitMessage').textContent='Whole-transient logarithmic fit completed as an extension beyond the handout method.';renderFit();drawSummary();save()
}
function renderFit(){
  const rec=state.results[state.task],fit=state.fits[state.task];$('#fitGraphical').textContent=rec?fmtTime(rec.tau):'—';$('#fitTau').textContent=fit?fmtTime(fit.tau):'—';$('#fitDiff').textContent=rec&&fit?`${(100*(rec.tau-fit.tau)/fit.tau).toFixed(1)}%`:'—';$('#fitR2').textContent=fit?fit.r2.toFixed(5):'—'
}
function drawSummary(){
  const c=$('#summaryChart');if(!c)return;const{ctx,w,h}=setupCanvas(c),tasks=['knownRC','unknownR','unknownC','unknownL'],labels=['4.1 RC','4.2 Rx','4.3 Cx','4.4 Lx'],vals=tasks.map(t=>state.results[t]?.tau||0),fits=tasks.map(t=>state.fits[t]?.tau||0),max=Math.max(1e-6,...vals,...fits)*1.25,p={l:60,r:22,t:28,b:55},Y=v=>h-p.b-v/max*(h-p.t-p.b);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#dce5ee';for(let k=0;k<=5;k++){const y=p.t+(h-p.t-p.b)*k/5;ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.stroke()}ctx.strokeStyle='#173b63';ctx.beginPath();ctx.moveTo(p.l,p.t);ctx.lineTo(p.l,h-p.b);ctx.lineTo(w-p.r,h-p.b);ctx.stroke();
  const slot=(w-p.l-p.r)/4;ctx.font='12px system-ui';ctx.textAlign='center';tasks.forEach((t,i)=>{const x=p.l+slot*(i+.5);if(vals[i]){const bw=slot*.23;ctx.fillStyle='#2f7df4';ctx.fillRect(x-bw,Y(vals[i]),bw,h-p.b-Y(vals[i]));if(fits[i]){ctx.fillStyle='#32a67d';ctx.fillRect(x,Y(fits[i]),bw,h-p.b-Y(fits[i]));}}ctx.fillStyle='#52657f';ctx.fillText(labels[i],x,h-25)});ctx.fillStyle='#2f7df4';ctx.fillText('■ graphical',w-160,20);ctx.fillStyle='#24835f';ctx.fillText('■ fit',w-65,20);
}
function setupQuiz(){
  $('#quiz').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),ans={q1:'a',q2:'a',q3:'a',q4:'a',q5:'a',q6:'a'},miss=Object.keys(ans).filter(q=>!fd.get(q));if(miss.length){$('#quizResult').className='notice warn';$('#quizResult').textContent='Answer all six questions before submitting.';return}let score=0,breakdown=[];Object.entries(ans).forEach(([q,a],i)=>{const ok=fd.get(q)===a;if(ok)score++;breakdown.push({q:i+1,ok})});state.assessment={score,total:6,breakdown};const box=$('#quizResult');box.className=score>=5?'notice ok':score>=3?'notice warn':'notice bad';box.innerHTML=`<strong>${score}/6 correct.</strong>`+(state.mode==='learn'?`<ul>${breakdown.map(x=>`<li>Question ${x.q}: ${x.ok?'correct':'review needed'}</li>`).join('')}</ul>`:'');save()})
}
function restoreAssessment(){if(!state.assessment)return;$('#quizResult').className=state.assessment.score>=5?'notice ok':state.assessment.score>=3?'notice warn':'notice bad';$('#quizResult').innerHTML=`<strong>Saved assessment: ${state.assessment.score}/${state.assessment.total}.</strong>`}
function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function prose(s){return escapeHtml(s||'').replace(/\n/g,'<br>')||'<em>Not completed.</em>'}
function resultText(task){
  const r=state.results[task];if(!r)return'Not completed.';
  if(task==='knownRC')return`τ=${fmtTime(r.tau)}; theory=${fmtTime(r.theory)}; difference=${(100*(r.tau-r.theory)/r.theory).toFixed(1)}%; ${r.method==='5'?'5-square':'4-square'} method.`;
  if(task==='unknownR')return`τ=${fmtTime(r.tau)}; R_x=${r.derived.toFixed(0)} Ω.`;
  if(task==='unknownC')return`τ=${fmtTime(r.tau)}; C_x=${fmtCap(r.derived)}.`;
  return`τ=${fmtTime(r.tau)}; L_x=${fmtInd(r.derived)}.`;
}
function buildReport(){
  draw();drawSummary();state.report=collectReport();const wave=$('#transientCanvas').toDataURL(),sum=$('#summaryChart').toDataURL();
  const html=`<h2>Laboratory Report — E05</h2><p><strong>RC & RL Circuits in the Transient Regime</strong></p><p><strong>Student:</strong> ${escapeHtml($('#studentName')?.value||'—')} &nbsp; <strong>Group:</strong> ${escapeHtml($('#studentGroup')?.value||'—')} &nbsp; <strong>Date:</strong> ${escapeHtml(state.report.reportDate||'—')} &nbsp; <strong>Run:</strong> ${escapeHtml(state.run.id)}</p>
  <h3>4.1 — Known R, known C</h3><p>${resultText('knownRC')}</p><h3>4.2 — Unknown resistance</h3><p>${resultText('unknownR')}</p><h3>4.3 — Unknown capacitance</h3><p>${resultText('unknownC')}</p><h3>4.4 — Unknown inductance</h3><p>${resultText('unknownL')}</p>
  <h3>Representative transient</h3><img src="${wave}" style="max-width:100%" alt="Transient oscilloscope trace"><h3>Time-constant comparison</h3><img src="${sum}" style="max-width:100%" alt="Measured time constants">
  <h3>Discussion</h3><p>${prose(state.report.reportDiscussion)}</p><h3>Conclusion</h3><p>${prose(state.report.reportConclusion)}</p><p><strong>Assessment:</strong> ${state.assessment?state.assessment.score+'/'+state.assessment.total:'not submitted'}.</p><hr><p class="mini">The core sequence follows the USTHB RC–RL transient practical. Hidden component values and small display noise are virtual-laboratory parameters.</p>`;
  $('#reportPreview').innerHTML=html;$('#printOnlyPreview').innerHTML=html;save()
}
function newRun(){
  if(Object.keys(state.results).length&&!confirm('Start a new E05 specimen? Existing measurements will be cleared.'))return;
  const mode=state.mode,report=state.report;state={version:2,mode,run:makeRun(),task:'knownRC',method:'5',wiring:{circuit:'',probe:'',source:'',ground:'',verified:false},settings:{frequency:500,sourceAmp:8,timeDiv:5e-5,voltsDiv:1,cursor:0},results:{},fits:{},assessment:null,report};syncUI();renderResults();renderFit();progress();drawSummary();save()
}
function setupTabs(){
  $$('.tabbtn').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.tab;$$('.tabbtn').forEach(x=>x.classList.toggle('active',x===b));$$('.tabpanel').forEach(p=>p.classList.toggle('active',p.id===id));draw();drawSummary()}))
}
function init(){
  load();if(state.report){delete state.report.studentName;delete state.report.studentGroup;try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch(_){}}if(!state.run)state.run=makeRun();restoreReport();setupTabs();setupQuiz();applyMode(state.mode);renderResults();renderFit();progress();drawSummary();restoreAssessment();
  $('#e05CircuitType').value=state.wiring?.circuit||'';$('#e05ProbeAcross').value=state.wiring?.probe||'';$('#e05SourceWave').value=state.wiring?.source||'';$('#e05Ground').value=state.wiring?.ground||'';updateWiring();if(state.wiring?.verified&&wiringOK()){state.wiring.verified=true;$('#e05WiringStatus').className='transient-wiring-status ok';$('#e05WiringStatus').textContent='Saved circuit verification restored.';}
  ['e05CircuitType','e05ProbeAcross','e05SourceWave','e05Ground'].forEach(id=>$('#'+id).addEventListener('change',()=>{updateWiring();syncUI();save()}));$('#e05VerifyWiring').addEventListener('click',verifyWiring);
  $('#taskSelect').addEventListener('change',taskChanged);$('#frequency').addEventListener('change',e=>{state.settings.frequency=+e.target.value;syncUI();save()});$('#sourceAmp').addEventListener('input',e=>{state.settings.sourceAmp=+e.target.value;syncUI();save()});$('#timeDiv').addEventListener('change',e=>{state.settings.timeDiv=+e.target.value;syncUI();save()});$('#voltsDiv').addEventListener('change',e=>{state.settings.voltsDiv=+e.target.value;syncUI();save()});$('#tauMethod').addEventListener('change',e=>{state.method=e.target.value;syncUI();save()});$('#cursorTime').addEventListener('input',e=>{state.settings.cursor=+e.target.value;updateCursor();save()});
  $('#recordTau').addEventListener('click',recordTau);$('#autoCentre').addEventListener('click',recommended);$('#newRun').addEventListener('click',newRun);$('#runFit').addEventListener('click',fitCurrent);
  $('#buildReport').addEventListener('click',buildReport);$('#clearLocalProgress')?.addEventListener('click',()=>{if(confirm('Clear all locally saved progress for this practical on this browser?')){try{localStorage.removeItem(STORAGE);}catch(_){}location.reload();}});$('#printReport').addEventListener('click',()=>{buildReport();window.print()});$$('.modebtn').forEach(b=>b.addEventListener('click',()=>applyMode(b.dataset.mode)));
  ['reportDate','reportDiscussion','reportConclusion'].forEach(id=>$('#'+id).addEventListener('input',save));window.addEventListener('resize',()=>{draw();drawSummary()});window.addEventListener('beforeunload',save);syncUI()
}
init();
})();