(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_O04_v2',OLD='VOM_O04_v1';
const f0=1.7,w0=2*Math.PI*f0,ALPHAS=['.002','.006'];

const current=U.load(K,null),old=U.load(OLD,null);
let s=current||{
  version:2,
  free:{'.002':[],'.006':[]},
  forced:{'.002':{up:[],down:[],started:{up:false,down:false},last:{up:null,down:null}},'.006':{up:[],down:[],started:{up:false,down:false},last:{up:null,down:null}}},
  analysis:{'.002':{free:null,forced:null},'.006':{free:null,forced:null}},
  conclusion:''
};
if(!current&&old)s={version:2,free:{'.002':[],'.006':[]},forced:{'.002':{up:[],down:[],started:{up:false,down:false},last:{up:null,down:null}},'.006':{up:[],down:[],started:{up:false,down:false},last:{up:null,down:null}}},analysis:{'.002':{free:null,forced:null},'.006':{free:null,forced:null}},conclusion:''};
s.free=s.free||{'.002':[],'.006':[]};s.forced=s.forced||{};s.analysis=s.analysis||{};
for(const a of ALPHAS){
  s.free[a]=Array.isArray(s.free[a])?s.free[a]:[];
  s.forced[a]=s.forced[a]||{up:[],down:[],started:{up:false,down:false},last:{up:null,down:null}};
  s.forced[a].started=s.forced[a].started||{up:false,down:false};s.forced[a].last=s.forced[a].last||{up:null,down:null};
  s.analysis[a]=s.analysis[a]||{free:null,forced:null};
}
function save(){U.save(K,s)}
function alphaKey(){return String(+E('nonlin').value).replace(/^0/,'')||'.002'}
function alphaVal(){return +E('nonlin').value}
function freeFreq(A,alpha=alphaVal()){return Math.sqrt(w0*w0+.75*alpha*A*A)/(2*Math.PI)}
function freePeriod(A,alpha=alphaVal()){return 1/freeFreq(A,alpha)}

function drawFree(){
  const {x,w,h}=U.canvas(E('scope'));U.grid(x,w,h);
  const A=+E('amp').value,T=freePeriod(A),windowT=8,pts=[];
  for(let i=0;i<=1000;i++){const t=windowT*i/1000,y=Math.cos(2*Math.PI*t/T);pts.push({x:w*i/1000,y:h/2-y*h*.27});}
  x.strokeStyle='#69e7ff';x.lineWidth=2;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
  x.setLineDash([5,4]);[['freeCursor1','#fff09a'],['freeCursor2','#ff9f8a']].forEach(([id,col])=>{const xx=(+E(id).value/windowT)*w;x.strokeStyle=col;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke();});x.setLineDash([]);
  const t1=+E('freeCursor1').value,t2=+E('freeCursor2').value;E('freeT1').textContent=t1.toFixed(3)+' s';E('freeT2').textContent=t2.toFixed(3)+' s';E('freeDt').textContent=Math.abs(t2-t1).toFixed(3)+' s';
}
function validateFree(){
  const A=+E('amp').value,T0=freePeriod(A),dt=Math.abs(+E('freeCursor2').value-(+E('freeCursor1').value));
  const raw=[E('studentCycles').value.trim(),E('studentT').value.trim(),E('studentF').value.trim()];
  if(raw.some(v=>v==='')){E('msg').className='notice warn';E('msg').textContent='Enter N, T and f from the two cursor readings.';return;}
  const [N,T,f]=raw.map(Number);
  if(!Number.isInteger(N)||N<3||!Number.isFinite(T)||T<=0||!Number.isFinite(f)||f<=0){E('msg').className='notice warn';E('msg').textContent='Use at least three full cycles and positive T and f values.';return;}
  if(Math.abs(dt-N*T0)>Math.max(.025,.035*N*T0)){E('msg').className='notice warn';E('msg').textContent='Move the cursors to equivalent waveform phases several cycles apart and recount N.';return;}
  const calcT=dt/N;if(Math.abs(T-calcT)>.008){E('msg').className='notice warn';E('msg').textContent='Recalculate T=(t₂−t₁)/N.';return;}
  if(Math.abs(f-1/T)>Math.max(.008,.02/T)){E('msg').className='notice warn';E('msg').textContent='Recalculate f=1/T.';return;}
  const key=alphaKey(),arr=s.free[key],rec={A,N,T,f},i=arr.findIndex(q=>q.A===A);if(i>=0)arr[i]=rec;else arr.push(rec);arr.sort((a,b)=>a.A-b.A);
  s.analysis[key].free=null;['studentCycles','studentT','studentF','studentSlope','studentAlpha'].forEach(id=>E(id).value='');
  E('msg').className='notice ok';E('msg').textContent='Free-period measurement accepted. Repeat at other amplitudes, including small and large amplitudes.';
  renderAll();save();
}

function forcedParams(alpha=alphaVal()){
  const strong=alpha>.004;
  return{jumpUp:strong?2.48:2.18,jumpDown:strong?1.82:1.98,fcHigh:strong?2.25:2.05,widthHigh:strong?.34:.40,peakHigh:strong?3.2:2.5};
}
function lorentz(f,fc,w,peak,base=.15){return base+peak/Math.sqrt(1+((f-fc)/w)**2)}
function forcedAmp(f,dir,alpha=alphaVal()){
  const p=forcedParams(alpha),high=lorentz(f,p.fcHigh,p.widthHigh,p.peakHigh,.15),low=lorentz(f,f0,.48,1.25,.12);
  return dir==='up'?(f<=p.jumpUp?high:low):(f>=p.jumpDown?low:high);
}
function forcedStore(){return s.forced[alphaKey()]}
function updateForcedReadout(){
  const dir=E('direction').value,f=+E('driveF').value,st=forcedStore(),a=forcedAmp(f,dir);
  E('forcedAmp').value=a.toFixed(3);
  E('sweepState').value=st.started[dir]?(st.last[dir]==null?'started · no point yet':'last '+st.last[dir].toFixed(2)+' Hz'):'not started';
}
function startSweep(){
  const st=forcedStore(),dir=E('direction').value;st[dir]=[];st.started[dir]=true;st.last[dir]=null;s.analysis[alphaKey()].forced=null;
  E('driveF').value=dir==='up'?.5:4;E('forcedMsg').className='notice ok';E('forcedMsg').textContent=(dir==='up'?'Up':'Down')+' sweep reset. Move monotonically and record successive points; use finer steps near the jump.';
  renderAll();save();
}
function recordForced(){
  const st=forcedStore(),dir=E('direction').value,f=+E('driveF').value;
  if(!st.started[dir]){E('forcedMsg').className='notice warn';E('forcedMsg').textContent='Start/reset the selected sweep before recording points.';return;}
  const last=st.last[dir];
  if(last!=null){
    if(dir==='up'&&f<=last){E('forcedMsg').className='notice warn';E('forcedMsg').textContent='Up-sweep frequency must increase monotonically. Reset if you need to restart.';return;}
    if(dir==='down'&&f>=last){E('forcedMsg').className='notice warn';E('forcedMsg').textContent='Down-sweep frequency must decrease monotonically. Reset if you need to restart.';return;}
    if(Math.abs(f-last)>.30){E('forcedMsg').className='notice warn';E('forcedMsg').textContent='Frequency step is too large. Use ≤0.30 Hz, and finer steps near the jump.';return;}
  }else{
    const start=dir==='up'?.5:4;if(Math.abs(f-start)>.06){E('forcedMsg').className='notice warn';E('forcedMsg').textContent='Begin the '+dir+' sweep at '+start.toFixed(1)+' Hz.';return;}
  }
  st[dir].push({f,A:forcedAmp(f,dir)});st.last[dir]=f;s.analysis[alphaKey()].forced=null;
  ['studentJumpUp','studentJumpDown','studentHyst'].forEach(id=>E(id).value='');
  E('forcedMsg').className='notice ok';E('forcedMsg').textContent='Point recorded. Continue monotonically through the full frequency range.';
  renderAll();save();
}
function sweepComplete(arr,dir){
  if(arr.length<14)return false;
  const fs=arr.map(q=>q.f),min=Math.min(...fs),max=Math.max(...fs);
  if(min>.56||max<3.94)return false;
  const j=deriveJump(arr);return j&&arr.some(q=>Math.abs(q.f-j.f)<.12);
}
function deriveJump(arr){
  if(arr.length<2)return null;let best=null;
  for(let i=1;i<arr.length;i++){const d=Math.abs(arr[i].A-arr[i-1].A);if(!best||d>best.d)best={d,f:(arr[i].f+arr[i-1].f)/2};}
  return best;
}

function linfit(ps){
  const n=ps.length,mx=ps.reduce((a,p)=>a+p.x,0)/n,my=ps.reduce((a,p)=>a+p.y,0)/n;let nu=0,de=0;ps.forEach(p=>{nu+=(p.x-mx)*(p.y-my);de+=(p.x-mx)**2});return{a:my-(nu/de)*mx,b:nu/de};
}
function freeFit(){
  const arr=s.free[alphaKey()];if(arr.length<5)return null;
  const ps=arr.map(q=>({x:q.A*q.A,y:q.f/f0})),fit=linfit(ps),alpha=8*w0*w0*fit.b/3;
  return{ps,fit,alpha};
}
function freeCoverage(){
  const arr=s.free[alphaKey()];return arr.length>=5&&Math.min(...arr.map(q=>q.A))<=5&&Math.max(...arr.map(q=>q.A))>=18;
}
function checkFreeAnalysis(){
  const fit=freeFit();if(!fit||!freeCoverage()){E('freeAnalysisMessage').className='notice warn';E('freeAnalysisMessage').textContent='Record at least five amplitudes spanning the small-amplitude region to at least 18°.';return;}
  const slope=+E('studentSlope').value,alpha=+E('studentAlpha').value;
  if(!Number.isFinite(slope)||!Number.isFinite(alpha)){E('freeAnalysisMessage').className='notice warn';E('freeAnalysisMessage').textContent='Enter the fitted slope and derived α.';return;}
  if(Math.abs(slope-fit.fit.b)>Math.max(.00002,.05*Math.abs(fit.fit.b))){E('freeAnalysisMessage').className='notice warn';E('freeAnalysisMessage').textContent='Re-read the slope of f/f₀ versus A².';return;}
  if(Math.abs(alpha-fit.alpha)>Math.max(.0003,.07*Math.abs(fit.alpha))){E('freeAnalysisMessage').className='notice warn';E('freeAnalysisMessage').textContent='Recalculate α=(8ω₀²/3)×slope.';return;}
  s.analysis[alphaKey()].free={slope,alpha};E('freeAnalysisMessage').className='notice ok';E('freeAnalysisMessage').textContent='Free-oscillation non-linearity analysis accepted.';
  renderAll();save();
}
function checkForcedAnalysis(){
  const st=forcedStore();
  if(!sweepComplete(st.up,'up')||!sweepComplete(st.down,'down')){E('forcedAnalysisMessage').className='notice warn';E('forcedAnalysisMessage').textContent='Complete full disciplined up and down sweeps with enough points around the jump.';return;}
  const ju=deriveJump(st.up).f,jd=deriveJump(st.down).f,u=+E('studentJumpUp').value,d=+E('studentJumpDown').value,h=+E('studentHyst').value;
  if(!Number.isFinite(u)||!Number.isFinite(d)||!Number.isFinite(h)){E('forcedAnalysisMessage').className='notice warn';E('forcedAnalysisMessage').textContent='Enter both jump frequencies and the hysteresis width.';return;}
  if(Math.abs(u-ju)>.13||Math.abs(d-jd)>.13){E('forcedAnalysisMessage').className='notice warn';E('forcedAnalysisMessage').textContent='Re-read the largest branch jump in each recorded sweep.';return;}
  if(Math.abs(h-Math.abs(u-d))>.04){E('forcedAnalysisMessage').className='notice warn';E('forcedAnalysisMessage').textContent='Recalculate the hysteresis width as |f_jump,up−f_jump,down|.';return;}
  s.analysis[alphaKey()].forced={jumpUp:u,jumpDown:d,width:h};E('forcedAnalysisMessage').className='notice ok';E('forcedAnalysisMessage').textContent='Forced-response hysteresis analysis accepted.';
  renderAll();save();
}

function drawFreeChart(){
  const arr=s.free[alphaKey()];
  if(arr.length)U.plot(E('freeChart'),[{pts:arr.map(q=>({x:q.A*q.A,y:q.f/f0}))}],{xlabel:'A² (deg²)',ylabel:'f/f₀',xmin:0,ymin:.95});
  else blank(E('freeChart'),'Validate free-period measurements to build f/f₀ versus A².');
}
function drawForcedChart(){
  const st=forcedStore(),series=[];
  if(st.up.length)series.push({pts:st.up.map(q=>({x:q.f,y:q.A})),color:'#29aec2'});
  if(st.down.length)series.push({pts:st.down.slice().sort((a,b)=>a.f-b.f).map(q=>({x:q.f,y:q.A})),color:'#df8746'});
  if(series.length)U.plot(E('forcedChart'),series,{xlabel:'drive frequency / Hz',ylabel:'response amplitude',xmin:.5,xmax:4,ymin:0});
  else blank(E('forcedChart'),'Record up/down forced sweeps to build the hysteresis graph.');
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}

function renderFreeData(){
  const arr=s.free[alphaKey()],r=arr.at(-1);
  E('Tout').textContent=r?r.T.toFixed(4)+' s':'—';E('fOut').textContent=r?r.f.toFixed(3)+' Hz':'—';E('aOut').textContent=r?r.A.toFixed(0)+'°':'—';E('nOut').textContent=arr.length;
  E('freeBody').innerHTML=arr.length?arr.map(q=>'<tr><td>'+q.A.toFixed(0)+'</td><td>'+q.N+'</td><td>'+q.T.toFixed(4)+'</td><td>'+q.f.toFixed(3)+'</td></tr>').join(''):'<tr><td colspan="4">No validated free-period measurements yet.</td></tr>';
}
function renderForcedData(){
  const st=forcedStore(),all=[...st.up.map(q=>({...q,dir:'up'})),...st.down.map(q=>({...q,dir:'down'}))];
  E('forcedBody').innerHTML=all.length?all.map(q=>'<tr><td>'+q.dir+'</td><td>'+q.f.toFixed(2)+'</td><td>'+q.A.toFixed(3)+'</td></tr>').join(''):'<tr><td colspan="3">No forced-response points yet.</td></tr>';
  const up=sweepComplete(st.up,'up'),down=sweepComplete(st.down,'down'),ana=!!s.analysis[alphaKey()].forced;
  E('forcedProgress').innerHTML='<div class="item '+(up?'done':'')+'">'+(up?'✓':'○')+' complete upward sweep</div><div class="item '+(down?'done':'')+'">'+(down?'✓':'○')+' complete downward sweep</div><div class="item '+(ana?'done':'')+'">'+(ana?'✓':'○')+' jump/hysteresis analysis</div>';
}
function restoreAnalysis(){
  const a=s.analysis[alphaKey()];
  E('studentSlope').value=a.free?.slope??'';E('studentAlpha').value=a.free?.alpha??'';
  E('studentJumpUp').value=a.forced?.jumpUp??'';E('studentJumpDown').value=a.forced?.jumpDown??'';E('studentHyst').value=a.forced?.width??'';
}
function overallStatus(){
  const a=s.analysis[alphaKey()],done=!!a.free&&!!a.forced&&s.conclusion.trim().length>=35;
  E('analysisMessage').className=done?'notice ok':'notice';
  E('analysisMessage').textContent=done?'Non-linear oscillation analysis complete. Relate the amplitude-dependent free frequency to the shifted, multivalued forced response.':'Both quantitative analyses and a written interpretation are required.';
}
function renderAll(){
  drawFree();updateForcedReadout();renderFreeData();renderForcedData();drawFreeChart();drawForcedChart();overallStatus();
}
function buildReport(){
  const a=s.analysis[alphaKey()],arr=s.free[alphaKey()],st=forcedStore();
  const summary='<p><b>Non-linearity setting:</b> α selector '+alphaVal()+'. <b>Free points:</b> '+arr.length+'. '+(a.free?'<b>free-fit slope:</b> '+a.free.slope.toFixed(5)+', <b>derived α:</b> '+a.free.alpha.toFixed(4)+'.':'Free analysis incomplete.')+'</p><p>'+(a.forced?'<b>Forced hysteresis:</b> up jump '+a.forced.jumpUp.toFixed(2)+' Hz, down jump '+a.forced.jumpDown.toFixed(2)+' Hz, width '+a.forced.width.toFixed(2)+' Hz.':'Forced analysis incomplete.')+'</p><p><b>Interpretation:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>';
  return U.report('Laboratory Practical 4 — Non-linear Oscillations',summary);
}

U.tabs();
E('nonlinearConclusion').value=s.conclusion;
['amp','freeCursor1','freeCursor2'].forEach(id=>E(id).addEventListener('input',drawFree));
E('nonlin').addEventListener('change',()=>{['studentCycles','studentT','studentF'].forEach(id=>E(id).value='');restoreAnalysis();renderAll();});
E('record').onclick=validateFree;
['direction','driveF'].forEach(id=>E(id).addEventListener('input',updateForcedReadout));
E('direction').addEventListener('change',updateForcedReadout);E('startSweep').onclick=startSweep;E('recordForced').onclick=recordForced;
E('checkFreeAnalysis').onclick=checkFreeAnalysis;E('checkForcedAnalysis').onclick=checkForcedAnalysis;
E('nonlinearConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;overallStatus();save();});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
restoreAnalysis();window.addEventListener('resize',renderAll);renderAll();save();
})();