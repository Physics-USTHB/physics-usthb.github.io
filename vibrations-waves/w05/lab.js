(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W05_v3',RS=50,VS=2,CAIR=343,TAU=Math.PI*2;
function makeRun(){return{id:'W05-'+Math.random().toString(36).slice(2,7).toUpperCase(),f0:690+Math.random()*100,Rcoil:6.3+Math.random()*.6,Rm:26+Math.random()*4,Qm:4.7+Math.random()*.7,Le:(70+Math.random()*20)*1e-6}}
let s=U.load(K,null);
if(!s||s.version!==3)s={version:3,run:makeRun(),free:[],markers:[],loaded:null,analysis:{free:null,sound:null}};
s.free=Array.isArray(s.free)?s.free:[];s.markers=Array.isArray(s.markers)?s.markers:[];s.analysis=s.analysis||{free:null,sound:null};
s.montage=s.montage||{drive:'',scope:'',source:'',receiver:'',verifiedFor:null};
function save(){U.save(K,s)}
function montageOK(mode=E('mode').value){const m=s.montage,free=mode==='free';return m.drive==='series'&&m.scope==='correct'&&m.source===(free?'free':'tube')&&m.receiver===(free?'none':'tube')&&m.verifiedFor===mode}
function renderMontage(){E('setupDrive').value=s.montage.drive||'';E('setupScope').value=s.montage.scope||'';E('setupSource').value=s.montage.source||'';E('setupReceiver').value=s.montage.receiver||'';const mode=E('mode').value,ok=montageOK(mode);E('montageMsg').className=ok?'notice ok':'notice';E('montageMsg').textContent=ok?(mode==='free'?'Free-field electrical montage verified.':'Tube source/receiver montage verified.'):'Wire the free-field arrangement first; after f₀ is found, rebuild it as the source/receiver tube arrangement.'}
function verifyMontage(){const mode=E('mode').value,free=mode==='free';s.montage={drive:E('setupDrive').value,scope:E('setupScope').value,source:E('setupSource').value,receiver:E('setupReceiver').value,verifiedFor:null};if(s.montage.drive!=='series'||s.montage.scope!=='correct'||s.montage.source!==(free?'free':'tube')||s.montage.receiver!==(free?'none':'tube')){E('montageMsg').className='notice warn';E('montageMsg').textContent=free?'Free field: GBF → 50 Ω → loudspeaker; CH1 total, CH2 loudspeaker; source on table, no receiver required.':'Tube: keep the electrical drive/scope wiring, place the source at one tube end and the receiver on the small tube from the opposite end.';save();return}s.montage.verifiedFor=mode;renderMontage();save()}
function cadd(a,b){return{re:a.re+b.re,im:a.im+b.im}}
function speakerZ(f,loaded=false,dcm=+E('dist').value){
  const x=f/s.run.f0,q=s.run.Qm*(x-1/x),den=1+q*q,zm={re:s.run.Rm/den,im:-s.run.Rm*q/den};
  let z={re:s.run.Rcoil+zm.re,im:TAU*f*s.run.Le+zm.im};
  if(loaded){const kd=TAU*(dcm/100)/(CAIR/f);z=cadd(z,{re:2.2+.9*Math.cos(2*kd),im:4.8*Math.sin(kd)});}
  return z;
}
function electrical(f=+E('freq').value,loaded=E('mode').value==='tube',d=+E('dist').value){
  const z=speakerZ(f,loaded,d),Zmag=Math.hypot(z.re,z.im),total={re:RS+z.re,im:z.im},It=VS/Math.hypot(total.re,total.im),Vhp=It*Zmag,Vr=It*RS,phi=Math.atan2(z.im,z.re)*180/Math.PI;
  return{z,Zmag,It,Vhp,Vr,phi};
}
function acousticPhase(f=+E('freq').value,dcm=+E('dist').value){let p=(-360*(dcm/100)/(CAIR/f))%360;if(p>180)p-=360;if(p<=-180)p+=360;return p}
function acousticClass(phi){
  if(Math.abs(phi)<=8)return'in';
  if(Math.abs(Math.abs(phi)-180)<=8)return'opp';
  if(Math.abs(Math.abs(phi)-90)<=8)return'quad';
  return null;
}
function setupCanvas(){const c=E('scope'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function drawTrace(x,w,h,amp,phase,col,td,f){
  const pts=[],vd=+E('vdiv').value;
  for(let i=0;i<=1000;i++){const t=10*td*i/1000,y=amp*Math.sin(TAU*f*t+phase*Math.PI/180);pts.push({x:w*i/1000,y:h/2-y/vd*(h/8)});}
  x.strokeStyle=col;x.lineWidth=2;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
}
function draw(){
  const{x,w,h}=setupCanvas(),f=+E('freq').value,d=+E('dist').value,td=+E('tdiv').value/1000,mode=E('mode').value,math=E('math').value;
  x.fillStyle='#08161d';x.fillRect(0,0,w,h);x.strokeStyle='rgba(99,232,191,.15)';for(let i=0;i<=10;i++){const xx=w*i/10;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke()}for(let j=0;j<=8;j++){const yy=h*j/8;x.beginPath();x.moveTo(0,yy);x.lineTo(w,yy);x.stroke()}
  if(mode==='tube'&&math==='raw'){
    const ph=acousticPhase(f,d);drawTrace(x,w,h,1.2*+E('vdiv').value,0,'#ffd166',td,f);drawTrace(x,w,h,1.2*+E('vdiv').value,ph,'#69e7ff',td,f);
    x.fillStyle='#ffd166';x.font='600 11px system-ui';x.fillText('source acoustic reference',10,18);x.fillStyle='#69e7ff';x.fillText('receiver',10,34);
  }else{
    const e=electrical(f,mode==='tube',d);
    if(math==='subtract'){drawTrace(x,w,h,e.Vr,0,'#ffd166',td,f);drawTrace(x,w,h,e.Vhp,e.phi,'#69e7ff',td,f);x.fillStyle='#ffd166';x.font='600 11px system-ui';x.fillText("MATH R′i",10,18);x.fillStyle='#69e7ff';x.fillText('CH2 Vhp',10,34);}
    else{drawTrace(x,w,h,VS,0,'#ffd166',td,f);drawTrace(x,w,h,e.Vhp,e.phi,'#69e7ff',td,f);x.fillStyle='#ffd166';x.font='600 11px system-ui';x.fillText('CH1 total',10,18);x.fillStyle='#69e7ff';x.fillText('CH2 Vhp',10,34);}
  }
  E('freqRead').textContent=f.toFixed(0)+' Hz';E('distRead').textContent=d.toFixed(1)+' cm';
}
function clearElectrical(){['studentVhpDiv','studentVrDiv','studentPeriodDiv','studentDtDiv','studentVhp','studentVr','studentZ','studentPhi'].forEach(id=>E(id).value='')}
function validateElectrical(){
  const f=+E('freq').value,loaded=E('mode').value==='tube',d=+E('dist').value,e=electrical(f,loaded,d),vd=+E('vdiv').value,td=+E('tdiv').value/1000,pd=(1/f)/td,a1=e.Vhp/vd,a2=e.Vr/vd,dd=e.phi/360*pd;
  if(E('math').value!=='subtract')return{ok:false,msg:"Select MATH CH1−CH2 so the R′i trace is available."};
  if(pd<1||pd>8||a1<.3||a1>3.7||a2<.3||a2>3.7)return{ok:false,msg:'Choose TIME/DIV and VOLT/DIV values that make one period and both amplitudes clearly readable.'};
  const raw=['studentVhpDiv','studentVrDiv','studentPeriodDiv','studentDtDiv','studentVhp','studentVr','studentZ','studentPhi'].map(id=>E(id).value.trim());
  if(raw.some(v=>v===''))return{ok:false,msg:'Enter the two amplitudes, period, signed time shift, voltages, impedance magnitude and electrical phase.'};
  const [vhpd,vrd,spd,sdd,Vhp,Vr,Z,phi]=raw.map(Number);if([vhpd,vrd,spd,sdd,Vhp,Vr,Z,phi].some(v=>!Number.isFinite(v))||vhpd<=0||vrd<=0||spd<=0||Vhp<=0||Vr<=0||Z<=0)return{ok:false,msg:'Enter valid graticule readings and calculations.'};
  if(Math.abs(vhpd-a1)>.09||Math.abs(vrd-a2)>.09)return{ok:false,msg:'Re-read the Vhp and R′i amplitudes in vertical divisions.'};
  if(Math.abs(spd-pd)>.10||Math.abs(sdd-dd)>.10)return{ok:false,msg:'Re-read the waveform period and signed horizontal shift in divisions.'};
  if(Math.abs(Vhp-vhpd*vd)>Math.max(.005,.02*Vhp)||Math.abs(Vr-vrd*vd)>Math.max(.005,.02*Vr))return{ok:false,msg:'Recalculate each voltage as divisions × VOLT/DIV.'};
  const zc=RS*Vhp/Vr,phic=360*sdd/spd;if(Math.abs(Z-zc)>Math.max(.25,.025*zc))return{ok:false,msg:"Recalculate |Zhp|=R′Vhp/VR′."};
  if(Math.abs(phi-phic)>2.2)return{ok:false,msg:'Recalculate the electrical phase from 360°Δt/T with the measured sign.'};
  return{ok:true,rec:{f,d,Z,phi,Vhp,Vr}};
}
function record(){
  const loaded=E('mode').value==='tube';
  if(!montageOK(E('mode').value)){E('msg').className='notice warn';E('msg').textContent='Verify the loudspeaker montage for the current mode before measuring impedance.';return}
  if(loaded){
    if(!s.analysis.sound){E('msg').className='notice warn';E('msg').textContent='Complete the acoustic wavelength/sound-speed analysis before the loaded-impedance measurement.';return}
    const f0=s.analysis.free?.f0;if(!f0||Math.abs(+E('freq').value-f0)>25){E('msg').className='notice warn';E('msg').textContent='Keep the tube experiment at the accepted free-field resonance frequency f₀.';return}
    const d=+E('dist').value,quad=s.markers.find(q=>q.type==='quad'&&Math.abs(q.d-d)<=.6);if(!quad){E('msg').className='notice warn';E('msg').textContent='Move to a previously marked acoustic quadrature position before measuring the loaded impedance.';return}
  }
  const v=validateElectrical();if(!v.ok){E('msg').className='notice warn';E('msg').textContent=v.msg;return}
  if(!loaded){const i=s.free.findIndex(q=>q.f===v.rec.f);if(i>=0)s.free[i]=v.rec;else s.free.push(v.rec);s.free.sort((a,b)=>a.f-b.f);s.analysis.free=null;s.analysis.sound=null;s.markers=[];s.loaded=null;}
  else{s.loaded=v.rec;}
  E('msg').className='notice ok';E('msg').textContent=loaded?'Loaded loudspeaker impedance accepted at the acoustic quadrature position.':'Free-field impedance point accepted. Continue across the full frequency range and add close points around the resonance peak.';
  clearElectrical();renderAll();save();
}
function freeMetrics(){
  if(s.free.length<14||s.free[0]?.f>200||s.free.at(-1)?.f<9000)return null;let p=s.free[0];for(const q of s.free)if(q.Z>p.Z)p=q;
  if(s.free.filter(q=>Math.abs(q.f-p.f)<=160).length<4)return null;const low=s.free.filter(q=>q.f<=220);if(!low.length)return null;
  const Rlow=low.reduce((a,q)=>a+q.Z,0)/low.length;return{f0:p.f,Zmax:p.Z,Rlow};
}
function checkFreeAnalysis(){
  const m=freeMetrics();if(!m){E('freeMsg').className='notice warn';E('freeMsg').textContent='Record at least 14 free-field points, cover ≤200 Hz to ≥9 kHz, and add several close points around the impedance peak.';return}
  const f0=+E('studentF0').value,R=+E('studentRlow').value;if(!Number.isFinite(f0)||!Number.isFinite(R)||f0<=0||R<=0){E('freeMsg').className='notice warn';E('freeMsg').textContent='Enter the resonance frequency and low-frequency impedance/resistance estimate.';return}
  if(Math.abs(f0-m.f0)>30){E('freeMsg').className='notice warn';E('freeMsg').textContent='Re-read the frequency of the |Zhp| maximum from your measured curve.';return}
  if(Math.abs(R-m.Rlow)>Math.max(.3,.04*m.Rlow)){E('freeMsg').className='notice warn';E('freeMsg').textContent='Average the accepted low-frequency |Z| points near 100–200 Hz.';return}
  s.analysis.free={f0,Rlow:R};s.analysis.sound=null;s.markers=[];s.loaded=null;E('freeMsg').className='notice ok';E('freeMsg').textContent='Free-field resonance and low-frequency resistance accepted. Set the generator to f₀ and begin the tube phase-position measurements.';renderAll();save();
}
function lockRes(){
  if(!s.analysis.free){E('msg').className='notice warn';E('msg').textContent='Validate the free-field resonance first.';return}
  E('mode').value='tube';s.montage.verifiedFor=null;renderMontage();E('freq').value=Math.round(s.analysis.free.f0/20)*20;E('math').value='raw';clearElectrical();E('msg').className='notice ok';E('msg').textContent='Tube mode set to f₀. Move the receiver and classify the acoustic phase relation.';renderAll();
}
function markPhase(){
  if(!montageOK('tube')){E('msg').className='notice warn';E('msg').textContent='Verify the source/receiver tube montage before marking acoustic phase positions.';return}
  if(E('mode').value!=='tube'||E('math').value!=='raw'){E('msg').className='notice warn';E('msg').textContent='Use tube mode with raw acoustic traces to mark phase positions.';return}
  if(!s.analysis.free){E('msg').className='notice warn';E('msg').textContent='Validate f₀ first.';return}
  const f0=s.analysis.free.f0;if(Math.abs(+E('freq').value-f0)>25){E('msg').className='notice warn';E('msg').textContent='Keep the generator at f₀ while locating acoustic phase positions.';return}
  const d=+E('dist').value,p=acousticPhase(+E('freq').value,d),actual=acousticClass(p),chosen=E('phaseState').value;if(!chosen){E('msg').className='notice warn';E('msg').textContent='Observe the two acoustic traces and classify their phase relation.';return}
  if(!actual){E('msg').className='notice warn';E('msg').textContent='This receiver position is between the canonical phase states. Move until the traces are clearly in phase, opposed or in quadrature.';return}
  if(chosen!==actual){E('msg').className='notice warn';E('msg').textContent='Re-examine the two acoustic traces; the selected phase classification does not match the observed relation.';return}
  if(s.markers.some(q=>Math.abs(q.d-d)<.3)){E('msg').className='notice warn';E('msg').textContent='This acoustic position has already been marked.';return}
  s.markers.push({d,type:chosen});s.markers.sort((a,b)=>a.d-b.d);s.analysis.sound=null;s.loaded=null;E('phaseState').value='';E('msg').className='notice ok';E('msg').textContent='Acoustic '+(chosen==='in'?'in-phase':chosen==='opp'?'opposition':'quadrature')+' position accepted at '+d.toFixed(1)+' cm.';renderAll();save();
}
function soundExpected(){
  const ins=s.markers.filter(q=>q.type==='in').sort((a,b)=>a.d-b.d),opps=s.markers.filter(q=>q.type==='opp');if(ins.length<2||!opps.length)return null;
  let gap=Infinity;for(let i=1;i<ins.length;i++)gap=Math.min(gap,ins[i].d-ins[i-1].d);const theory=CAIR/s.analysis.free.f0*100;
  if(gap>1.35*theory)return{skip:true,gap,theory};return{gap,theory};
}
function checkSound(){
  if(!s.analysis.free){E('soundMsg').className='notice warn';E('soundMsg').textContent='Validate the free-field resonance first.';return}
  const q=soundExpected();if(!q){E('soundMsg').className='notice warn';E('soundMsg').textContent='Mark at least two in-phase positions and one opposition position at f₀.';return}
  if(q.skip){E('soundMsg').className='notice warn';E('soundMsg').textContent='The in-phase markers skip at least one full wavelength. Mark two consecutive in-phase positions.';return}
  const lam=+E('studentLambda').value,v=+E('studentSoundV').value;if(!Number.isFinite(lam)||!Number.isFinite(v)||lam<=0||v<=0){E('soundMsg').className='notice warn';E('soundMsg').textContent='Enter λ and the calculated sound speed.';return}
  const eLam=q.gap/100;if(Math.abs(lam-eLam)>.008){E('soundMsg').className='notice warn';E('soundMsg').textContent='Use the separation of two consecutive in-phase receiver positions as one wavelength.';return}
  const ev=s.analysis.free.f0*lam;if(Math.abs(v-ev)>Math.max(3,.015*ev)){E('soundMsg').className='notice warn';E('soundMsg').textContent='Recalculate v=f₀λ.';return}
  s.analysis.sound={lambda:lam,v};E('soundMsg').className='notice ok';E('soundMsg').textContent='Acoustic wavelength and sound speed accepted. Mark a quadrature position for the loaded-impedance measurement.';renderAll();save();
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function chart(){if(s.free.length)U.plot(E('zChart'),[{pts:s.free.map(q=>({x:q.f,y:q.Z}))}],{xlabel:'frequency / Hz',ylabel:'|Zhp| / Ω',xmin:100,xmax:10000,ymin:0});else blank(E('zChart'),'Validate free-field impedance points to build |Zhp|(f).')}
function table(){
  const rows=[...s.free.map(q=>({mode:'free',...q}))];if(s.loaded)rows.push({mode:'tube',...s.loaded});
  E('body').innerHTML=rows.length?rows.map(q=>'<tr><td>'+q.mode+'</td><td>'+q.f.toFixed(0)+'</td><td>'+(q.mode==='tube'?q.d.toFixed(1):'—')+'</td><td>'+q.Z.toFixed(1)+'</td><td>'+q.phi.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="5">No validated impedance points yet.</td></tr>';
  E('freeCount').textContent=s.free.length;E('markerCount').textContent=s.markers.length;E('loadedOut').textContent=s.loaded?s.loaded.Z.toFixed(1)+' Ω':'—';
  E('phaseBody').innerHTML=s.markers.length?s.markers.map(q=>'<tr><td>'+q.d.toFixed(1)+'</td><td>'+(q.type==='in'?'in phase':q.type==='opp'?'opposition':'quadrature')+'</td></tr>').join(''):'<tr><td colspan="2">No acoustic phase positions marked yet.</td></tr>';
  E('f0Out').textContent=s.analysis.free?s.analysis.free.f0.toFixed(0)+' Hz':'—';E('rOut').textContent=s.analysis.free?s.analysis.free.Rlow.toFixed(1)+' Ω':'—';
  E('lambdaOut').textContent=s.analysis.sound?s.analysis.sound.lambda.toFixed(3)+' m':'—';E('vOut').textContent=s.analysis.sound?s.analysis.sound.v.toFixed(1)+' m/s':'—';
  E('loadedZOut').textContent=s.loaded?s.loaded.Z.toFixed(1)+' Ω':'—';E('phaseOut').textContent=s.loaded?s.loaded.phi.toFixed(1)+'°':'—';const q=s.markers.find(x=>x.type==='quad');E('quadOut').textContent=q?q.d.toFixed(1)+' cm':'—';
  E('loadedMsg').className=s.loaded?'notice ok':'notice';E('loadedMsg').textContent=s.loaded?'Loaded impedance measurement complete at acoustic quadrature.':'Mark a quadrature acoustic position, then select MATH subtraction there and validate one loaded impedance measurement.';
}
function renderAll(){draw();table();chart()}
function buildReport(){
  const a=s.analysis.free,b=s.analysis.sound,summary='<p><b>Last verified montage:</b> '+U.esc(s.montage.verifiedFor||'none')+'.</p>'+'<p><b>Free field:</b> '+(a?'f₀='+a.f0.toFixed(0)+' Hz, low-frequency R≈'+a.Rlow.toFixed(1)+' Ω':'analysis incomplete')+'.</p><p><b>Tube propagation:</b> '+(b?'λ='+b.lambda.toFixed(3)+' m, v='+b.v.toFixed(1)+' m/s':'analysis incomplete')+'; acoustic markers='+s.markers.length+'.</p><p><b>Loaded loudspeaker:</b> '+(s.loaded?'|Z|='+s.loaded.Z.toFixed(1)+' Ω, electrical phase='+s.loaded.phi.toFixed(1)+'° at d='+s.loaded.d.toFixed(1)+' cm':'not measured')+'.</p>';
  return U.report('Wave Laboratory Practical V — Loudspeaker & Sound Propagation in Air',summary);
}
U.tabs();renderMontage();E('verifyMontage').onclick=verifyMontage;['setupDrive','setupScope','setupSource','setupReceiver'].forEach(id=>E(id).addEventListener('change',e=>{const map={setupDrive:'drive',setupScope:'scope',setupSource:'source',setupReceiver:'receiver'};s.montage[map[id]]=e.target.value;s.montage.verifiedFor=null;renderMontage();save()}));
['freq','dist','tdiv','vdiv'].forEach(id=>E(id).addEventListener('input',()=>{clearElectrical();draw()}));['mode','math'].forEach(id=>E(id).addEventListener('change',()=>{if(id==='mode'){s.montage.verifiedFor=null;renderMontage();save()}clearElectrical();draw()}));
E('record').onclick=record;E('markPhase').onclick=markPhase;E('lockRes').onclick=lockRes;E('checkFreeAnalysis').onclick=checkFreeAnalysis;E('checkSound').onclick=checkSound;
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.analysis.free){E('studentF0').value=s.analysis.free.f0;E('studentRlow').value=s.analysis.free.Rlow}if(s.analysis.sound){E('studentLambda').value=s.analysis.sound.lambda;E('studentSoundV').value=s.analysis.sound.v}
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',renderAll);renderAll();save();
})();