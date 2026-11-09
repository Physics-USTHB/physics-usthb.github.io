(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W06_v3',X=200,RA=100,VS=2,TAU=Math.PI*2;
function makeRun(){
  const v=(1.98+Math.random()*.06)*1e8,Zc=48+Math.random()*4,alpha=.00038+Math.random()*.00012;
  const d1=55+Math.random()*18,d2=135+Math.random()*20;
  return{id:'W06-'+Math.random().toString(36).slice(2,7).toUpperCase(),v,Zc,alpha,A0:1.6,defects:[{x:d1,type:'open'},{x:d2,type:'short'}]};
}
let s=U.load(K,null);
if(!s||s.version!==3)s={version:3,run:makeRun(),pulseSpeed:null,attenuation:[],reflections:[],pulseAnalysis:null,delays:[],modes:{short:[],open:[]},sinAnalysis:null,zin:{short:null,open:null,zc:null},faults:{A:null,B:null}};
s.attenuation=Array.isArray(s.attenuation)?s.attenuation:[];s.reflections=Array.isArray(s.reflections)?s.reflections:[];s.delays=Array.isArray(s.delays)?s.delays:[];s.modes=s.modes||{short:[],open:[]};s.zin=s.zin||{short:null,open:null,zc:null};s.faults=s.faults||{A:null,B:null};
s.montage=s.montage||{pulse:{input:'',load:'',coils:'',verifiedFor:null},sin:{ch1:'',ch2:'',load:'',verifiedFor:null},zin:{r:'',scope:'',load:'',verifiedFor:null}};
function save(){U.save(K,s)}
function pulseMontageOK(){const m=s.montage.pulse,l=E('pulseLoad').value;return m.input==='A'&&m.coils==='series'&&m.load===l&&m.verifiedFor===l}
function sinMontageOK(){const m=s.montage.sin,l=E('sinTerm').value,ch2=l==='matched'?'D':'BC';return m.ch1==='A'&&m.ch2===ch2&&m.load===l&&m.verifiedFor===l}
function zMontageOK(){const m=s.montage.zin,l=E('zTerm').value;return m.r==='100'&&m.scope==='vgve'&&m.load===l&&m.verifiedFor===l}
function renderMontages(){
  const p=s.montage.pulse;E('pulseSetupInput').value=p.input||'';E('pulseSetupLoad').value=p.load||'';E('pulseSetupCoils').value=p.coils||'';E('pulseMontageMsg').className=pulseMontageOK()?'notice ok':'notice';E('pulseMontageMsg').textContent=pulseMontageOK()?'Pulse montage verified for '+E('pulseLoad').value+' termination.':'Connect the two coils into the 200 m line, feed/observe it at A, and install the selected termination at D.';
  const n=s.montage.sin;E('sinSetupCh1').value=n.ch1||'';E('sinSetupCh2').value=n.ch2||'';E('sinSetupLoad').value=n.load||'';E('sinMontageMsg').className=sinMontageOK()?'notice ok':'notice';E('sinMontageMsg').textContent=sinMontageOK()?'Sinusoidal montage verified for '+E('sinTerm').value+'.':'Make the connections appropriate to the currently selected termination.';
  const z=s.montage.zin;E('zSetupR').value=z.r||'';E('zSetupScope').value=z.scope||'';E('zSetupLoad').value=z.load||'';E('zMontageMsg').className=zMontageOK()?'notice ok':'notice';E('zMontageMsg').textContent=zMontageOK()?'Input-impedance montage verified for '+E('zTerm').value+'.':'Install RA and the selected open/short termination before measuring the input impedance.';
}
function verifyPulseMontage(){const l=E('pulseLoad').value;s.montage.pulse={input:E('pulseSetupInput').value,load:E('pulseSetupLoad').value,coils:E('pulseSetupCoils').value,verifiedFor:null};if(s.montage.pulse.input!=='A'||s.montage.pulse.coils!=='series'||s.montage.pulse.load!==l){E('pulseMontageMsg').className='notice warn';E('pulseMontageMsg').textContent='Feed and observe the line at A, connect B–C to make 200 m, and install the same termination selected for the measurement at D.';save();return}s.montage.pulse.verifiedFor=l;renderMontages();save()}
function verifySinMontage(){const l=E('sinTerm').value,ch2=l==='matched'?'D':'BC';s.montage.sin={ch1:E('sinSetupCh1').value,ch2:E('sinSetupCh2').value,load:E('sinSetupLoad').value,verifiedFor:null};if(s.montage.sin.ch1!=='A'||s.montage.sin.ch2!==ch2||s.montage.sin.load!==l){E('sinMontageMsg').className='notice warn';E('sinMontageMsg').textContent=l==='matched'?'Matched propagation: CH1=A, CH2=D, matched Zc at D.':'Mode search: CH1=A, move CH2 to B–C, and install the selected '+l+' termination at D.';save();return}s.montage.sin.verifiedFor=l;renderMontages();save()}
function verifyZMontage(){const l=E('zTerm').value;s.montage.zin={r:E('zSetupR').value,scope:E('zSetupScope').value,load:E('zSetupLoad').value,verifiedFor:null};if(s.montage.zin.r!=='100'||s.montage.zin.scope!=='vgve'||s.montage.zin.load!==l){E('zMontageMsg').className='notice warn';E('zMontageMsg').textContent='Use RA=100 Ω in series, measure Vg and Ve (VR=Vg−Ve), and install the selected '+l+' termination.';save();return}s.montage.zin.verifiedFor=l;renderMontages();save()}
function gamma(load=E('pulseLoad').value){
  if(load==='open')return 1;if(load==='short')return-1;if(load==='matched')return 0;const R=+E('rv').value;return(R-s.run.Zc)/(R+s.run.Zc);
}
function gaussian(t,t0,w){return Math.exp(-Math.pow((t-t0)/w,2))}
function setupCanvas(id){const c=E(id),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function scopeGrid(x,w,h){
  x.fillStyle='#08161d';x.fillRect(0,0,w,h);x.strokeStyle='rgba(99,232,191,.15)';x.lineWidth=1;
  for(let i=0;i<=10;i++){const xx=w*i/10;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke()}
  for(let j=0;j<=8;j++){const yy=h*j/8;x.beginPath();x.moveTo(0,yy);x.lineTo(w,yy);x.stroke()}
}
function pulseTrace(x,w,h,tdUs,vdiv){
  const screenT=10*tdUs*1e-6,t0=.55e-6,tr=t0+2*X/s.run.v,g=gamma(),Ar=s.run.A0*Math.exp(-2*s.run.alpha*X)*g,base=h*.46,ydiv=h/8,pts=[];
  for(let i=0;i<=1400;i++){const t=screenT*i/1400,V=s.run.A0*gaussian(t,t0,.055e-6)+Ar*gaussian(t,tr,.065e-6);pts.push({x:w*i/1400,y:base-V/vdiv*ydiv});}
  x.strokeStyle='#69e7ff';x.lineWidth=2.2;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
  const pd=+E('pathDistance').value,Apath=s.run.A0*Math.exp(-s.run.alpha*pd),bx=w*.70,by=h*.78,hh=Apath/vdiv*ydiv;
  x.strokeStyle='#ffd166';x.lineWidth=2;x.beginPath();x.moveTo(bx-35,by);x.lineTo(bx-10,by);x.quadraticCurveTo(bx,by-hh,bx+10,by);x.lineTo(bx+35,by);x.stroke();
  x.fillStyle='#ffd166';x.font='600 11px system-ui';x.fillText('selected path '+pd+' m',bx-50,h*.90);
  const Xpx=t=>t/screenT*w;x.setLineDash([5,4]);[['pulseC1','#fff09a'],['pulseC2','#ff9f8a']].forEach(([id,col])=>{const xx=+E(id).value/10*w;x.strokeStyle=col;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h*.62);x.stroke()});x.setLineDash([]);
  x.fillStyle='#9bc3d3';x.font='600 11px system-ui';x.fillText('incident',Math.max(5,Xpx(t0)-25),18);if(Math.abs(g)>.02)x.fillText(g>0?'reflected (+)':'reflected (−)',Math.max(5,Xpx(tr)-35),34);
}
function drawPulse(){
  const q=setupCanvas('pulseCanvas');scopeGrid(q.x,q.w,q.h);pulseTrace(q.x,q.w,q.h,+E('pulseTdiv').value,+E('pulseVdiv').value);
  E('rvRead').textContent=E('rv').value+' Ω';E('pulseC1Read').textContent=(+E('pulseC1').value).toFixed(2)+' div';E('pulseC2Read').textContent=(+E('pulseC2').value).toFixed(2)+' div';E('rv').disabled=E('pulseLoad').value!=='variable';
}
function pulseExpectedDelay(){return 2*X/s.run.v}
function checkPulseSpeed(){
  if(!pulseMontageOK()){E('pulseMsg').className='notice warn';E('pulseMsg').textContent='Verify the pulse-regime wiring for the selected termination first.';return}
  const load=E('pulseLoad').value;if(load!=='open'&&load!=='short'){E('pulseMsg').className='notice warn';E('pulseMsg').textContent='Use an open or short termination so the returned pulse is clearly visible.';return}
  const td=+E('pulseTdiv').value*1e-6,t1=+E('pulseC1').value*td,t2=+E('pulseC2').value*td,expected=pulseExpectedDelay(),c1=.55e-6,c2=c1+expected;
  if(Math.abs(t1-c1)>.07e-6||Math.abs(t2-c2)>.07e-6){E('pulseMsg').className='notice warn';E('pulseMsg').textContent='Place the two vertical cursors on the incident and reflected pulse peaks.';return}
  const dt=+E('studentPulseDt').value,v=+E('studentPulseV').value,u=+E('studentPulseU').value;if(!Number.isFinite(dt)||!Number.isFinite(v)||!Number.isFinite(u)||dt<=0||v<=0||u<=0){E('pulseMsg').className='notice warn';E('pulseMsg').textContent='Enter Δt, v and u(v).';return}
  const calcDt=(t2-t1)*1e6;if(Math.abs(dt-calcDt)>.025){E('pulseMsg').className='notice warn';E('pulseMsg').textContent='Recalculate Δt from the cursor separation and TIME/DIV.';return}
  const calcV=2*X/(dt*1e-6)/1e8;if(Math.abs(v-calcV)>.012){E('pulseMsg').className='notice warn';E('pulseMsg').textContent='Recalculate v=2X/Δt with X=200 m.';return}
  const uT=+E('pulseTdiv').value*.02*Math.sqrt(2),calcU=calcV*(uT/dt);if(Math.abs(u-calcU)>Math.max(.003,.22*calcU)){E('pulseMsg').className='notice warn';E('pulseMsg').textContent='Estimate timing uncertainty from about 0.02 division per cursor and propagate it to v.';return}
  s.pulseSpeed={dt:dt*1e-6,v:v*1e8,u:u*1e8};E('pulseMsg').className='notice ok';E('pulseMsg').textContent='Pulse round-trip speed accepted. Continue with attenuation and variable-load reflection measurements.';renderAll();save();
}
function recordAttenuation(){
  if(!pulseMontageOK()){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Verify the pulse-regime wiring before recording attenuation.';return}
  const x=+E('pathDistance').value,vd=+E('pulseVdiv').value,trueA=s.run.A0*Math.exp(-s.run.alpha*x),div=trueA/vd,sd=+E('studentPathAmpDiv').value;
  if(!Number.isFinite(sd)||sd<=0){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Read the selected-path pulse amplitude in vertical divisions.';return}
  if(Math.abs(sd-div)>.10){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Re-read the selected-path pulse amplitude using the displayed VOLT/DIV.';return}
  const rec={x,A:sd*vd},i=s.attenuation.findIndex(q=>q.x===x);if(i>=0)s.attenuation[i]=rec;else s.attenuation.push(rec);s.attenuation.sort((a,b)=>a.x-b.x);s.pulseAnalysis=null;E('studentPathAmpDiv').value='';E('pulseAnalysisMsg').className='notice ok';E('pulseAnalysisMsg').textContent='Attenuation amplitude stored at '+x+' m.';renderAll();save();
}
function attenuationFit(){
  if(new Set(s.attenuation.map(q=>q.x)).size<5)return null;const pts=s.attenuation.map(q=>({x:q.x,y:Math.log(q.A)})),n=pts.length,mx=pts.reduce((a,p)=>a+p.x,0)/n,my=pts.reduce((a,p)=>a+p.y,0)/n;let nu=0,de=0;pts.forEach(p=>{nu+=(p.x-mx)*(p.y-my);de+=(p.x-mx)**2});const b=nu/de,a=my-b*mx;return{alpha:-b,a};
}
function recordReflection(){
  if(!pulseMontageOK()){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Verify the variable-load pulse wiring before recording reflection.';return}
  if(E('pulseLoad').value!=='variable'){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Select the variable terminal resistor Rv for the reflection sweep.';return}
  const fit=attenuationFit();if(!fit){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Record amplitudes at all five path lengths first so the round-trip attenuation correction is known.';return}
  const enteredAlpha=+E('studentAlpha').value;if(!Number.isFinite(enteredAlpha)||Math.abs(enteredAlpha-fit.alpha)>Math.max(.000015,.05*fit.alpha)){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='First determine α from the slope of ln(amplitude) versus travelled distance.';return}
  const vd=+E('pulseVdiv').value,G=Math.abs(gamma('variable')),vi=s.run.A0,vr=vi*Math.exp(-2*s.run.alpha*X)*G,viDiv=vi/vd,vrDiv=vr/vd;
  const sVi=+E('studentViDiv').value,sVr=+E('studentVrDiv').value,sG=+E('studentGamma').value;if(!Number.isFinite(sVi)||!Number.isFinite(sVr)||!Number.isFinite(sG)||sVi<=0||sVr<0||sG<0){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Enter incident/reflected amplitudes and corrected |Γ|.';return}
  if(Math.abs(sVi-viDiv)>.10||Math.abs(sVr-vrDiv)>.10){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Re-read incident and reflected pulse amplitudes in divisions.';return}
  const calcG=(sVr/sVi)*Math.exp(2*enteredAlpha*X);if(Math.abs(sG-calcG)>.025){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Correct the measured reflected/incident amplitude ratio for the 400 m round-trip attenuation.';return}
  const R=+E('rv').value,rec={R,G:sG},i=s.reflections.findIndex(q=>q.R===R);if(i>=0)s.reflections[i]=rec;else s.reflections.push(rec);s.reflections.sort((a,b)=>a.R-b.R);s.pulseAnalysis=null;
  ['studentViDiv','studentVrDiv','studentGamma'].forEach(id=>E(id).value='');E('pulseAnalysisMsg').className='notice ok';E('pulseAnalysisMsg').textContent='Reflection-coefficient point accepted at Rv='+R+' Ω.';renderAll();save();
}
function reflectionMetrics(){
  if(s.reflections.length<7||s.reflections[0]?.R>20||s.reflections.at(-1)?.R<140)return null;let m=s.reflections[0];for(const q of s.reflections)if(q.G<m.G)m=q;if(Math.abs(m.R-s.run.Zc)>8)return null;return{Zc:m.R};
}
function checkPulseAnalysis(){
  const fit=attenuationFit(),rm=reflectionMetrics();if(!s.pulseSpeed||!fit||!rm){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Complete the pulse speed, all five attenuation points and a broad ≥7-point reflection sweep including the |Γ| minimum.';return}
  const alpha=+E('studentAlpha').value,Zc=+E('studentZcPulse').value,r=+E('studentRperM').value,L=+E('studentLperM').value,C=+E('studentCperM').value;
  if([alpha,Zc,r,L,C].some(v=>!Number.isFinite(v)||v<=0)){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Enter α, Zc, r, L′ and C′.';return}
  if(Math.abs(alpha-fit.alpha)>Math.max(.000015,.05*fit.alpha)){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Re-fit ln A versus travelled distance; α is the negative slope.';return}
  if(Math.abs(Zc-rm.Zc)>5){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Use the Rv value where measured |Γ| is minimal as the pulse-regime estimate of Zc.';return}
  const ev=s.pulseSpeed.v,er=2*alpha*Zc,eL=Zc/ev*1e6,eC=1/(Zc*ev)*1e12;
  if(Math.abs(r-er)>Math.max(.002,.06*er)){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Use the low-loss approximation r≈2αZc.';return}
  if(Math.abs(L-eL)>Math.max(.006,.04*eL)){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Recalculate L′=Zc/v and convert H/m to µH/m.';return}
  if(Math.abs(C-eC)>Math.max(2,.04*eC)){E('pulseAnalysisMsg').className='notice warn';E('pulseAnalysisMsg').textContent='Recalculate C′=1/(Zc v) and convert F/m to pF/m.';return}
  s.pulseAnalysis={alpha,Zc,r,L,C};E('pulseAnalysisMsg').className='notice ok';E('pulseAnalysisMsg').textContent='Pulse-regime line parameters accepted.';renderAll();save();
}
function inputAmplitude(term,fHz){
  const beta=TAU*fHz/s.run.v,theta=beta*X,eps=.055,Zc=s.run.Zc;let x;
  if(term==='short')x=Zc*Math.sqrt(eps*eps+Math.tan(theta)**2);
  else{x=Zc/Math.sqrt(eps*eps+Math.tan(theta)**2)}
  x=Math.min(2500,x);return VS*x/Math.sqrt((50+x)**2);
}
function drawSin(){
  const q=setupCanvas('sinCanvas');scopeGrid(q.x,q.w,q.h);const f=+E('sinFreq').value*1e6,td=+E('sinTdiv').value*1e-6,term=E('sinTerm').value,screen=10*td,delay=X/s.run.v;
  if(term==='matched'){
    const phase=-TAU*f*delay,amp=1.15,pts1=[],pts2=[];for(let i=0;i<=1000;i++){const t=screen*i/1000;pts1.push({x:q.w*i/1000,y:q.h/2-amp*Math.sin(TAU*f*t)*q.h/8});pts2.push({x:q.w*i/1000,y:q.h/2-amp*.88*Math.sin(TAU*f*t+phase)*q.h/8});}
    for(const [pts,col] of [[pts1,'#ffd166'],[pts2,'#69e7ff']]){q.x.strokeStyle=col;q.x.lineWidth=2;q.x.beginPath();pts.forEach((p,i)=>i?q.x.lineTo(p.x,p.y):q.x.moveTo(p.x,p.y));q.x.stroke()}
    q.x.fillStyle='#ffd166';q.x.font='600 11px system-ui';q.x.fillText('CH1 input A',10,18);q.x.fillStyle='#69e7ff';q.x.fillText('CH2 output D',10,34);
  }else{
    const A=inputAmplitude(term,f),amp=A/.5,pts=[];for(let i=0;i<=1000;i++){const t=screen*i/1000;pts.push({x:q.w*i/1000,y:q.h/2-amp*Math.sin(TAU*f*t)*q.h/8});}q.x.strokeStyle='#69e7ff';q.x.lineWidth=2;q.x.beginPath();pts.forEach((p,i)=>i?q.x.lineTo(p.x,p.y):q.x.moveTo(p.x,p.y));q.x.stroke();q.x.fillStyle='#9bc3d3';q.x.font='600 11px system-ui';q.x.fillText((term==='short'?'shorted':'open')+' line · input amplitude',10,18);
  }
  E('sinFreqRead').textContent=(f/1e6).toFixed(3)+' MHz';
}
function recordSinDelay(){
  if(!sinMontageOK()){E('sinMsg').className='notice warn';E('sinMsg').textContent='Verify the matched sinusoidal wiring before recording delay.';return}
  if(E('sinTerm').value!=='matched'){E('sinMsg').className='notice warn';E('sinMsg').textContent='Use the matched termination for the input/output propagation-delay measurement.';return}
  const f=+E('sinFreq').value*1e6,delay=X/s.run.v,cycles=f*delay,N=Math.floor(cycles),frac=cycles-N,phase=frac*360;
  const n=+E('studentDelayCycles').value,p=+E('studentResidualPhase').value,dt=+E('studentSinDelay').value,v=+E('studentSinV').value;
  if(!Number.isInteger(n)||!Number.isFinite(p)||!Number.isFinite(dt)||!Number.isFinite(v)||n<0||p<0||p>=360||dt<=0||v<=0){E('sinMsg').className='notice warn';E('sinMsg').textContent='Enter whole-cycle count, residual phase, total delay and speed.';return}
  if(n!==N||Math.abs(p-phase)>4){E('sinMsg').className='notice warn';E('sinMsg').textContent='Account for the whole periods in the cable delay, then read the residual phase shift of the traces.';return}
  const calcDt=(n+p/360)/f*1e6;if(Math.abs(dt-calcDt)>.025){E('sinMsg').className='notice warn';E('sinMsg').textContent='Recalculate total delay = (N+phase/360)/f.';return}
  const calcV=X/(dt*1e-6)/1e8;if(Math.abs(v-calcV)>.012){E('sinMsg').className='notice warn';E('sinMsg').textContent='Recalculate v=X/Δt for the 200 m line.';return}
  const rec={f,dt:dt*1e-6,v:v*1e8},i=s.delays.findIndex(q=>q.f===f);if(i>=0)s.delays[i]=rec;else s.delays.push(rec);s.delays.sort((a,b)=>a.f-b.f);s.sinAnalysis=null;E('sinMsg').className='notice ok';E('sinMsg').textContent='Matched-line propagation-delay point accepted.';renderAll();save();
}
function nearestMode(term,f){
  if(term==='short'){const n=Math.max(1,Math.round(2*X*f/s.run.v)),target=n*s.run.v/(2*X),lambda=2*X/n;return{n,target,lambda}}
  const n=Math.max(0,Math.round((4*X*f/s.run.v-1)/2)),target=(2*n+1)*s.run.v/(4*X),lambda=4*X/(2*n+1);return{n,target,lambda};
}
function recordMode(){
  if(!sinMontageOK()){E('sinMsg').className='notice warn';E('sinMsg').textContent='Verify the rewired open/short sinusoidal montage before marking a mode.';return}
  const term=E('sinTerm').value;if(term!=='short'&&term!=='open'){E('sinMsg').className='notice warn';E('sinMsg').textContent='Select short or open termination for normal-mode minima.';return}
  const f=+E('sinFreq').value*1e6,m=nearestMode(term,f),A=inputAmplitude(term,f);
  if(Math.abs(f-m.target)>14000||A>.18){E('sinMsg').className='notice warn';E('sinMsg').textContent='Tune the generator to a clear input-amplitude minimum before marking the mode.';return}
  const n=+E('studentModeOrder').value,lam=+E('studentModeLambda').value;if(!Number.isInteger(n)||n!==m.n||!Number.isFinite(lam)||lam<=0){E('sinMsg').className='notice warn';E('sinMsg').textContent='Enter the correct mode order and the wavelength inferred from the line length.';return}
  if(Math.abs(lam-m.lambda)>Math.max(1,.015*m.lambda)){E('sinMsg').className='notice warn';E('sinMsg').textContent=term==='short'?'For a shorted-line minimum use λ=2X/n.':'For an open-line minimum use λ=4X/(2n+1).';return}
  const rec={n,f,lambda:lam},arr=s.modes[term],i=arr.findIndex(q=>q.n===n);if(i>=0)arr[i]=rec;else arr.push(rec);arr.sort((a,b)=>a.f-b.f);s.sinAnalysis=null;E('studentModeOrder').value='';E('studentModeLambda').value='';E('sinMsg').className='notice ok';E('sinMsg').textContent=(term==='short'?'Shorted':'Open')+'-line mode accepted.';renderAll();save();
}
function mean(a){return a.reduce((x,y)=>x+y,0)/a.length}
function checkSinAnalysis(){
  if(s.delays.length<5||s.delays[0]?.f>4e5||s.delays.at(-1)?.f<4e6||s.modes.short.length<4||s.modes.open.length<4){E('sinAnalysisMsg').className='notice warn';E('sinAnalysisMsg').textContent='Collect ≥5 matched-delay points spanning the frequency range and at least four minima for each short/open termination.';return}
  const vm=+E('studentMatchedV').value,vs=+E('studentShortV').value,vo=+E('studentOpenV').value;if([vm,vs,vo].some(v=>!Number.isFinite(v)||v<=0)){E('sinAnalysisMsg').className='notice warn';E('sinAnalysisMsg').textContent='Enter all three speed estimates.';return}
  const em=mean(s.delays.map(q=>q.v))/1e8,es=mean(s.modes.short.map(q=>q.f*q.lambda))/1e8,eo=mean(s.modes.open.map(q=>q.f*q.lambda))/1e8;
  if(Math.abs(vm-em)>.015||Math.abs(vs-es)>.015||Math.abs(vo-eo)>.015){E('sinAnalysisMsg').className='notice warn';E('sinAnalysisMsg').textContent='Recalculate each mean propagation speed from its accepted delay or λ–f dataset.';return}
  s.sinAnalysis={matched:vm*1e8,short:vs*1e8,open:vo*1e8};E('sinAnalysisMsg').className='notice ok';E('sinAnalysisMsg').textContent='Sinusoidal propagation-speed comparison accepted.';renderAll();save();
}
function zinTrue(term){const k=.22;return term==='short'?s.run.Zc*k:s.run.Zc/k}
function drawZ(){
  const q=setupCanvas('zCanvas');scopeGrid(q.x,q.w,q.h);const Ze=zinTrue(E('zTerm').value),Vg=VS,Ve=Vg*Ze/(RA+Ze),Vr=Vg-Ve,vd=.5,amps=[{a:Vg,col:'#ffd166',label:'Vg'},{a:Ve,col:'#69e7ff',label:'Ve'},{a:Vr,col:'#ff8a7a',label:'VR'}];
  amps.forEach((z,k)=>{const pts=[];for(let i=0;i<=1000;i++){const t=i/1000*5e-6;pts.push({x:q.w*i/1000,y:q.h/2-z.a/vd*Math.sin(TAU*1e6*t)*q.h/8});}q.x.strokeStyle=z.col;q.x.lineWidth=1.8;q.x.beginPath();pts.forEach((p,i)=>i?q.x.lineTo(p.x,p.y):q.x.moveTo(p.x,p.y));q.x.stroke();q.x.fillStyle=z.col;q.x.font='600 11px system-ui';q.x.fillText(z.label,10,18+14*k);});
  q.x.fillStyle='#9bc3d3';q.x.fillText('all traces: 0.50 V/div',q.w-140,18);
}
function clearZ(){['studentVgDiv','studentVeDiv','studentVRDiv','studentVg','studentVe','studentVR','studentZe'].forEach(id=>E(id).value='')}
function recordZin(){
  if(!zMontageOK()){E('zMsg').className='notice warn';E('zMsg').textContent='Verify the input-impedance circuit for the selected termination first.';return}
  const term=E('zTerm').value,Ze=zinTrue(term),Vg=VS,Ve=Vg*Ze/(RA+Ze),Vr=Vg-Ve,vd=.5,raw=['studentVgDiv','studentVeDiv','studentVRDiv','studentVg','studentVe','studentVR','studentZe'].map(id=>E(id).value.trim());if(raw.some(v=>v==='')){E('zMsg').className='notice warn';E('zMsg').textContent='Enter all three amplitude readings, voltages and |Ze|.';return}
  const [dg,de,dr,sg,se,sr,sz]=raw.map(Number);if(Math.abs(dg-Vg/vd)>.09||Math.abs(de-Ve/vd)>.09||Math.abs(dr-Vr/vd)>.09){E('zMsg').className='notice warn';E('zMsg').textContent='Re-read Vg, Ve and VR amplitudes from the fixed 0.50 V/div traces.';return}
  if(Math.abs(sg-dg*vd)>.015||Math.abs(se-de*vd)>.015||Math.abs(sr-dr*vd)>.015){E('zMsg').className='notice warn';E('zMsg').textContent='Convert each amplitude from divisions to volts.';return}
  const ez=RA*se/sr;if(Math.abs(sz-ez)>Math.max(.4,.025*ez)){E('zMsg').className='notice warn';E('zMsg').textContent='Recalculate |Ze|=RA Ve/VR.';return}
  s.zin[term]={Ze:sz};s.zin.zc=null;E('zMsg').className='notice ok';E('zMsg').textContent=(term==='short'?'Short-circuit':'Open-circuit')+' input impedance accepted.';clearZ();renderAll();save();
}
function checkZcSin(){
  if(!s.zin.short||!s.zin.open){E('zMsg').className='notice warn';E('zMsg').textContent='Measure both short and open input impedances first.';return}
  const v=+E('studentZcSin').value,e=Math.sqrt(s.zin.short.Ze*s.zin.open.Ze);if(!Number.isFinite(v)||v<=0){E('zMsg').className='notice warn';E('zMsg').textContent='Enter the characteristic impedance.';return}
  if(Math.abs(v-e)>Math.max(.8,.025*e)){E('zMsg').className='notice warn';E('zMsg').textContent='Use Zc=√(Ze,open × Ze,short).';return}
  s.zin.zc=v;E('zMsg').className='notice ok';E('zMsg').textContent='Sinusoidal characteristic impedance accepted; compare it with the pulse/reflection result.';renderAll();save();
}
function drawFault(){
  const q=setupCanvas('faultCanvas');scopeGrid(q.x,q.w,q.h);const end=E('faultEnd').value,base=q.h*.63,scale=.25e-6,span=10*scale,origin=.25e-6,defs=s.run.defects.map(z=>({type:z.type,d:end==='A'?z.x:X-z.x})).sort((a,b)=>a.d-b.d),events=[{t:origin,a:1,type:'incident'},...defs.map(z=>({t:origin+2*z.d/s.run.v,a:(z.type==='open'?1:-1)*.58*Math.exp(-2*s.run.alpha*z.d),type:z.type}))];
  q.x.strokeStyle='#69e7ff';q.x.lineWidth=2;q.x.beginPath();for(let i=0;i<=1400;i++){const t=span*i/1400;let V=0;for(const z of events)V+=z.a*gaussian(t,z.t,.035e-6);const y=base-V*q.h*.22;i?q.x.lineTo(q.w*i/1400,y):q.x.moveTo(0,y);}q.x.stroke();
  q.x.fillStyle='#9bc3d3';q.x.font='600 11px system-ui';q.x.fillText('TIME/DIV = 0.25 µs · positive reflection → higher impedance; negative → lower',10,18);
}
function faultExpected(end){
  return s.run.defects.map(z=>({type:z.type,d:end==='A'?z.x:X-z.x})).sort((a,b)=>a.d-b.d);
}
function clearFault(){['faultType1','faultType2'].forEach(id=>E(id).value='');['faultDist1','faultDist2'].forEach(id=>E(id).value='')}
function checkFaults(){
  if(!s.pulseSpeed){E('faultMsg').className='notice warn';E('faultMsg').textContent='Accept the pulse-regime propagation speed before locating defects.';return}
  const end=E('faultEnd').value,e=faultExpected(end),t1=E('faultType1').value,t2=E('faultType2').value,d1=+E('faultDist1').value,d2=+E('faultDist2').value;
  if(!t1||!t2||!Number.isFinite(d1)||!Number.isFinite(d2)||d1<=0||d2<=0){E('faultMsg').className='notice warn';E('faultMsg').textContent='Identify both reflection polarities and calculate both distances.';return}
  if(t1!==e[0].type||t2!==e[1].type){E('faultMsg').className='notice warn';E('faultMsg').textContent='Use the reflected-pulse polarity: same sign indicates a higher/open-type discontinuity, opposite sign a lower/short-type discontinuity.';return}
  if(Math.abs(d1-e[0].d)>3||Math.abs(d2-e[1].d)>3){E('faultMsg').className='notice warn';E('faultMsg').textContent='Recalculate defect distance d=vΔt/2 from the reflected-pulse delays.';return}
  s.faults[end]={near:{type:t1,d:d1},far:{type:t2,d:d2}};E('faultMsg').className='notice ok';E('faultMsg').textContent='Fault interpretation from end '+end+' accepted. Repeat from the opposite end as required by the practical.';renderAll();save();
}
function blank(c,msg){const q=setupCanvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function drawCharts(){
  if(s.attenuation.length)U.plot(E('attChart'),[{pts:s.attenuation.map(q=>({x:q.x,y:q.A}))}],{xlabel:'travelled distance / m',ylabel:'pulse amplitude / V',xmin:0,xmax:400,ymin:0});else blank('attChart','Record amplitudes at 0–400 m.');
  if(s.reflections.length){const theo=[];for(let R=10;R<=150;R+=2)theo.push({x:R,y:Math.abs((R-s.run.Zc)/(R+s.run.Zc))});U.plot(E('refChart'),[{pts:s.reflections.map(q=>({x:q.R,y:q.G})),color:'#2baac3'},{pts:theo,color:'#df8746'}],{xlabel:'Rv / Ω',ylabel:'|Γ|',xmin:0,xmax:160,ymin:0,ymax:1});}else blank('refChart','Record corrected |Γ| versus Rv.');
  const pts=[...s.modes.short.map(q=>({x:1e6/q.f,y:q.lambda,type:'short'})),...s.modes.open.map(q=>({x:1e6/q.f,y:q.lambda,type:'open'}))];if(pts.length){U.plot(E('modeChart'),[{pts:pts.filter(q=>q.type==='short'),color:'#2baac3'},{pts:pts.filter(q=>q.type==='open'),color:'#df8746'}],{xlabel:'1/f / µs',ylabel:'λ / m',xmin:0,ymin:0});}else blank('modeChart','Mark short/open amplitude minima and calculate λ.');
}
function renderMetrics(){
  E('pulseVOut').textContent=s.pulseSpeed?(s.pulseSpeed.v/1e8).toFixed(3)+'×10⁸ m/s':'—';E('attCount').textContent=new Set(s.attenuation.map(q=>q.x)).size+' / 5';E('refCount').textContent=s.reflections.length;
  const p=s.pulseAnalysis;E('alphaOut').textContent=p?p.alpha.toFixed(6)+' m⁻¹':'—';E('zcPulseOut').textContent=p?p.Zc.toFixed(1)+' Ω':'—';E('rPerMOut').textContent=p?p.r.toFixed(4)+' Ω/m':'—';E('lPerMOut').textContent=p?p.L.toFixed(3)+' µH/m':'—';E('cPerMOut').textContent=p?p.C.toFixed(1)+' pF/m':'—';
  E('delayCount').textContent=s.delays.length+' / 5';E('shortCount').textContent=s.modes.short.length;E('openCount').textContent=s.modes.open.length;const a=s.sinAnalysis;E('matchedVOut').textContent=a?(a.matched/1e8).toFixed(3)+'×10⁸':'—';E('shortVOut').textContent=a?(a.short/1e8).toFixed(3)+'×10⁸':'—';E('openVOut').textContent=a?(a.open/1e8).toFixed(3)+'×10⁸':'—';
  E('zeShortOut').textContent=s.zin.short?s.zin.short.Ze.toFixed(1)+' Ω':'—';E('zeOpenOut').textContent=s.zin.open?s.zin.open.Ze.toFixed(1)+' Ω':'—';E('zcSinOut').textContent=s.zin.zc?s.zin.zc.toFixed(1)+' Ω':'—';E('faultAOut').textContent=s.faults.A?'accepted':'—';E('faultBOut').textContent=s.faults.B?'accepted':'—';
}
function renderAll(){drawPulse();drawSin();drawZ();drawFault();drawCharts();renderMetrics()}
function buildReport(){
  const p=s.pulseAnalysis,a=s.sinAnalysis,summary='<p><b>Connection work:</b> pulse '+U.esc(s.montage.pulse.verifiedFor||'pending')+', sinusoidal '+U.esc(s.montage.sin.verifiedFor||'pending')+', impedance '+U.esc(s.montage.zin.verifiedFor||'pending')+'.</p>'+'<p><b>Pulse regime:</b> '+(s.pulseSpeed?'v='+(s.pulseSpeed.v/1e8).toFixed(3)+'×10⁸ m/s':'speed incomplete')+(p?', α='+p.alpha.toFixed(6)+' m⁻¹, Zc='+p.Zc.toFixed(1)+' Ω, r='+p.r.toFixed(4)+' Ω/m, L′='+p.L.toFixed(3)+' µH/m, C′='+p.C.toFixed(1)+' pF/m.':'.')+'</p><p><b>Sinusoidal regime:</b> '+(a?'vmatched='+(a.matched/1e8).toFixed(3)+', vshort='+(a.short/1e8).toFixed(3)+', vopen='+(a.open/1e8).toFixed(3)+' ×10⁸ m/s.':'analysis incomplete.')+'</p><p><b>Characteristic impedance from open/short input impedances:</b> '+(s.zin.zc?s.zin.zc.toFixed(1)+' Ω':'not completed')+'. <b>Fault analyses:</b> AX '+(s.faults.A?'accepted':'pending')+', BX '+(s.faults.B?'accepted':'pending')+'.</p>';
  return U.report('Wave Laboratory Practical VI — Waves Along a Coaxial Line',summary);
}
U.tabs();renderMontages();E('verifyPulseMontage').onclick=verifyPulseMontage;E('verifySinMontage').onclick=verifySinMontage;E('verifyZMontage').onclick=verifyZMontage;
[['pulseSetupInput','pulse','input'],['pulseSetupLoad','pulse','load'],['pulseSetupCoils','pulse','coils'],['sinSetupCh1','sin','ch1'],['sinSetupCh2','sin','ch2'],['sinSetupLoad','sin','load'],['zSetupR','zin','r'],['zSetupScope','zin','scope'],['zSetupLoad','zin','load']].forEach(([id,k,f])=>E(id).addEventListener('change',e=>{s.montage[k][f]=e.target.value;s.montage[k].verifiedFor=null;renderMontages();save()}));
['pulseC1','pulseC2','rv'].forEach(id=>E(id).addEventListener('input',drawPulse));['pulseLoad','pulseTdiv','pulseVdiv','pathDistance'].forEach(id=>E(id).addEventListener('change',()=>{if(id==='pulseLoad'){s.montage.pulse.verifiedFor=null;renderMontages();save()}drawPulse()}));
E('checkPulseSpeed').onclick=checkPulseSpeed;E('recordAttenuation').onclick=recordAttenuation;E('recordReflection').onclick=recordReflection;E('checkPulseAnalysis').onclick=checkPulseAnalysis;
['sinFreq'].forEach(id=>E(id).addEventListener('input',drawSin));['sinTerm','sinTdiv'].forEach(id=>E(id).addEventListener('change',()=>{if(id==='sinTerm'){s.montage.sin.verifiedFor=null;renderMontages();save()}drawSin()}));E('recordSinDelay').onclick=recordSinDelay;E('recordMode').onclick=recordMode;E('checkSinAnalysis').onclick=checkSinAnalysis;
E('zTerm').addEventListener('change',()=>{s.montage.zin.verifiedFor=null;renderMontages();save();clearZ();drawZ()});E('recordZin').onclick=recordZin;E('checkZcSin').onclick=checkZcSin;
E('faultEnd').addEventListener('change',()=>{clearFault();drawFault()});E('checkFaults').onclick=checkFaults;
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.pulseSpeed){E('studentPulseDt').value=s.pulseSpeed.dt*1e6;E('studentPulseV').value=s.pulseSpeed.v/1e8;E('studentPulseU').value=s.pulseSpeed.u/1e8}
if(s.pulseAnalysis){E('studentAlpha').value=s.pulseAnalysis.alpha;E('studentZcPulse').value=s.pulseAnalysis.Zc;E('studentRperM').value=s.pulseAnalysis.r;E('studentLperM').value=s.pulseAnalysis.L;E('studentCperM').value=s.pulseAnalysis.C}
if(s.sinAnalysis){E('studentMatchedV').value=s.sinAnalysis.matched/1e8;E('studentShortV').value=s.sinAnalysis.short/1e8;E('studentOpenV').value=s.sinAnalysis.open/1e8}
if(s.zin.zc)E('studentZcSin').value=s.zin.zc;
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',renderAll);renderAll();save();
})();