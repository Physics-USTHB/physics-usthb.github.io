(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_V00_v2';
let s=U.load(K,{version:2,records:[],xyObserved:false,xyPhase:null});
if(s.version!==2)s={version:2,records:[],xyObserved:false,xyPhase:null};
function save(){U.save(K,s)}
function wf(t,type){
  if(type==='square')return Math.sin(t)>=0?1:-1;
  if(type==='triangle')return 2/Math.PI*Math.asin(Math.sin(t));
  return Math.sin(t);
}
function stable(){
  return E('displayMode').value==='sweep'&&E('coupling1').value!=='gnd'&&E('trigger').value==='ch1'&&Math.abs(+E('level').value)<+E('amp').value;
}
function calReady(){return E('timeFine').value==='cal'&&E('voltFine').value==='cal'}
function draw(){
  const {x,w,h}=U.canvas(E('scope'));U.grid(x,w,h);
  const mode=E('displayMode').value,f=+E('freq').value,A=+E('amp').value,phase=+E('phase').value*Math.PI/180;
  const td=(+E('tdiv').value/1000)*(E('timeFine').value==='cal'?1:1.17);
  const vd=(+E('vdiv').value)*(E('voltFine').value==='cal'?1:1.13);
  const ch1On=E('coupling1').value!=='gnd',ch2On=E('coupling2').value!=='gnd';
  if(mode==='xy'){
    const pts=[];
    for(let i=0;i<=1000;i++){
      const t=2*Math.PI*i/1000,y1=ch1On?A*wf(t,E('wave').value):0,y2=ch2On?A*wf(t+phase,E('wave').value):0;
      pts.push({x:w/2+y1/vd*w/10,y:h/2-y2/vd*h/8});
    }
    x.strokeStyle='#69e7ff';x.lineWidth=2;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
    return;
  }
  const Tview=10*td,offs=stable()?[0]:[0,.55,1.15];
  offs.forEach(off=>{
    const a=[],b=[];
    for(let i=0;i<=900;i++){
      const t=Tview*i/900,xx=w*i/900,y1=ch1On?A*wf(2*Math.PI*f*t+off,E('wave').value):0,y2=ch2On?A*wf(2*Math.PI*f*t+phase+off,E('wave').value):0;
      a.push({x:xx,y:h/2-y1/vd*h/8});b.push({x:xx,y:h/2-y2/vd*h/8});
    }
    x.strokeStyle='#ffd166';x.lineWidth=2;x.beginPath();a.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
    x.strokeStyle='#69e7ff';x.beginPath();b.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
  });
}
function expected(){
  const f=+E('freq').value,A=+E('amp').value,T=1/f,td=+E('tdiv').value/1000,vd=+E('vdiv').value,phi=+E('phase').value,dt=(phi/360)*T;
  return{f,A,T,td,vd,phi,dt,vppDiv:2*A/vd,periodDiv:T/td,dtDiv:dt/td};
}
function validDisplay(q){
  const ampHalf=q.A/q.vd;
  return ampHalf>=1&&ampHalf<=3.8&&q.periodDiv>=1&&q.periodDiv<=8;
}
function clearInputs(){
  ['studentVppDiv','studentPeriodDiv','studentDtDiv','studentVpp','studentPeriod','studentFreq','studentPhi'].forEach(id=>E(id).value='');
}
function take(){
  const q=expected();
  if(E('displayMode').value!=='sweep'){E('msg').className='notice warn';E('msg').textContent='Return to Y–t sweep mode for quantitative amplitude, period and phase measurement.';return}
  if(!calReady()){E('msg').className='notice warn';E('msg').textContent='Lock both the TIME and vertical fine controls in CAL before using the graticule quantitatively.';return}
  if(E('coupling1').value==='gnd'||E('coupling2').value==='gnd'){E('msg').className='notice warn';E('msg').textContent='Both signals must be connected rather than grounded for this two-channel measurement.';return}
  if(!stable()){E('msg').className='notice warn';E('msg').textContent='Trace is not synchronised. Select CH1 AUTO and keep trigger LEVEL inside the CH1 waveform.';return}
  if(!validDisplay(q)){E('msg').className='notice warn';E('msg').textContent='Improve VOLT/DIV and TIME/DIV so the waveform amplitude and one period are clearly readable.';return}
  const vals={
    vppDiv:+E('studentVppDiv').value,periodDiv:+E('studentPeriodDiv').value,dtDiv:+E('studentDtDiv').value,
    vpp:+E('studentVpp').value,Tms:+E('studentPeriod').value,f:+E('studentFreq').value,phi:+E('studentPhi').value
  };
  if(Object.values(vals).some(v=>!Number.isFinite(v))||vals.vppDiv<=0||vals.periodDiv<=0||vals.vpp<=0||vals.Tms<=0||vals.f<=0){
    E('msg').className='notice warn';E('msg').textContent='Enter all cursor readings and calculated values before validation.';return;
  }
  if(Math.abs(vals.vppDiv-q.vppDiv)>.10){E('msg').className='notice warn';E('msg').textContent='Re-read the CH1 peak-to-peak height in vertical divisions.';return}
  if(Math.abs(vals.periodDiv-q.periodDiv)>.10){E('msg').className='notice warn';E('msg').textContent='Re-read one complete period in horizontal divisions.';return}
  if(Math.abs(vals.dtDiv-q.dtDiv)>.10){E('msg').className='notice warn';E('msg').textContent='Re-read the signed horizontal displacement Δt between corresponding CH1 and CH2 points.';return}
  const vppFromDiv=vals.vppDiv*q.vd,TmsFromDiv=vals.periodDiv*(q.td*1000),dtms=vals.dtDiv*(q.td*1000),fFromT=1000/vals.Tms,phiFrom=360*dtms/vals.Tms;
  if(Math.abs(vals.vpp-vppFromDiv)>.03){E('msg').className='notice warn';E('msg').textContent='Recalculate Vpp = vertical divisions × VOLT/DIV.';return}
  if(Math.abs(vals.Tms-TmsFromDiv)>Math.max(.003,.025*TmsFromDiv)){E('msg').className='notice warn';E('msg').textContent='Recalculate T = horizontal divisions × TIME/DIV.';return}
  if(Math.abs(vals.f-fFromT)>Math.max(.5,.025*fFromT)){E('msg').className='notice warn';E('msg').textContent='Recalculate f = 1/T, converting milliseconds to seconds.';return}
  if(Math.abs(vals.phi-phiFrom)>3){E('msg').className='notice warn';E('msg').textContent='Recalculate φ = 360° Δt/T using the signed Δt.';return}
  const rec={key:[E('wave').value,q.f,q.phi].join('|'),wave:E('wave').value,generatorF:q.f,generatorPhi:q.phi,vpp:vals.vpp,Tms:vals.Tms,f:vals.f,dtms,phi:vals.phi,tdiv:q.td*1000,vdiv:q.vd};
  const k=s.records.findIndex(r=>r.key===rec.key);if(k>=0)s.records[k]=rec;else s.records.push(rec);
  if(s.records.length>8)s.records=s.records.slice(-8);
  E('msg').className='notice ok';E('msg').textContent='Sweep measurement validated. Change frequency and/or phase and repeat with a clearly readable display.';
  clearInputs();renderResults();save();
}
function recordXY(){
  if(E('displayMode').value!=='xy'){E('msg').className='notice warn';E('msg').textContent='Select XY composition mode first.';return}
  if(E('voltFine').value!=='cal'){E('msg').className='notice warn';E('msg').textContent='Keep the vertical gain calibrated before interpreting the XY trace.';return}
  if(E('coupling1').value==='gnd'||E('coupling2').value==='gnd'){E('msg').className='notice warn';E('msg').textContent='Both channels must carry signals for an XY composition.';return}
  s.xyObserved=true;s.xyPhase=+E('phase').value;
  E('msg').className='notice ok';E('msg').textContent='XY composition recorded. Describe the line/ellipse/circle shape and relate it to the phase shift in your discussion.';
  renderResults();save();
}
function renderResults(){
  const r=s.records.at(-1);
  E('vpp').textContent=r?r.vpp.toFixed(3)+' V':'—';
  E('period').textContent=r?r.Tms.toFixed(3)+' ms':'—';
  E('fout').textContent=r?r.f.toFixed(1)+' Hz':'—';
  E('dtout').textContent=r?(r.dtms>=0?'+':'')+r.dtms.toFixed(3)+' ms':'—';
  E('phiout').textContent=r?(r.phi>=0?'+':'')+r.phi.toFixed(1)+'°':'—';
  E('measurementBody').innerHTML=s.records.length?s.records.map((q,i)=>'<tr><td>'+(i+1)+'</td><td>'+q.generatorF.toFixed(0)+'</td><td>'+q.vpp.toFixed(3)+'</td><td>'+q.Tms.toFixed(3)+'</td><td>'+q.f.toFixed(1)+'</td><td>'+q.dtms.toFixed(3)+'</td><td>'+q.phi.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="7">No validated sweep measurements yet.</td></tr>';
  const distinct=new Set(s.records.map(q=>q.key)).size,repeat=distinct>=2;
  E('progress').innerHTML='<div class="item '+(s.records.length?'done':'')+'">'+(s.records.length?'✓':'○')+' amplitude / period / frequency</div><div class="item '+(s.records.length?'done':'')+'">'+(s.records.length?'✓':'○')+' two-channel phase</div><div class="item '+(repeat?'done':'')+'">'+(repeat?'✓':'○')+' repeat at another frequency/phase</div><div class="item '+(s.xyObserved?'done':'')+'">'+(s.xyObserved?'✓':'○')+' XY composition</div>';
  if(s.records.length)U.plot(E('freqChart'),[{pts:s.records.map(q=>({x:q.generatorF,y:q.f}))}],{xlabel:'generator setting / Hz',ylabel:'measured f / Hz'});
  else{
    const q=U.canvas(E('freqChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Validate sweep measurements to build the frequency check.',q.w/2,q.h/2);
  }
  const complete=repeat&&s.xyObserved;
  E('analysisMessage').className=complete?'notice ok':'notice';
  E('analysisMessage').textContent=complete?'Instrumentation session complete: compare measured and generator frequencies and discuss the XY trace.':'Two distinct validated sweep measurements plus one XY observation are required.';
}
function buildReport(){
  const summary='<p><b>Validated sweep sets:</b> '+s.records.length+'. <b>Distinct settings:</b> '+new Set(s.records.map(q=>q.key)).size+'. <b>XY observation:</b> '+(s.xyObserved?'completed at CH2 phase '+s.xyPhase+'°':'not completed')+'.</p>'+(s.records.length?'<p><b>Last validated set:</b> Vpp='+s.records.at(-1).vpp.toFixed(3)+' V, T='+s.records.at(-1).Tms.toFixed(3)+' ms, f='+s.records.at(-1).f.toFixed(1)+' Hz, φ='+s.records.at(-1).phi.toFixed(1)+'°.</p>':'');
  return U.report('Introductory Instrumentation Session — Oscilloscope & Function Generator',summary);
}
U.tabs();
['displayMode','wave','freq','amp','phase','tdiv','vdiv','timeFine','voltFine','coupling1','coupling2','trigger','level'].forEach(id=>E(id).addEventListener('input',draw));
E('measure').onclick=take;E('recordXY').onclick=recordXY;E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',()=>{draw();renderResults()});
draw();renderResults();save();
})();