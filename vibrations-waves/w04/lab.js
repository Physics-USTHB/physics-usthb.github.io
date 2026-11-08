(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W04_v2',OLD='VOM_W04_v1',END_CORR=.006;
const current=U.load(K,null),old=U.load(OLD,null);
let s=current||{version:2,records:[],analysis:null,conclusion:''};
if(!current&&old)s={version:2,records:[],analysis:null,conclusion:''};
s.records=Array.isArray(s.records)?s.records:[];s.conclusion=s.conclusion||'';
function save(){U.save(K,s)}
function speed(temp){return 331+.6*temp}
function model(){
  const f=+E('freq').value,temp=+E('temp').value,n=+E('order').value,L=+E('tubeLength').value/100,c=speed(temp),lambda=c/f,target=n*lambda/4-END_CORR,err=Math.abs(L-target);
  return{f,temp,n,L,c,lambda,target,err,resonant:err<.006};
}
function draw(){
  const {x,w,h}=U.canvas(E('tubeCanvas')),m=model(),pad=35,y=h*.52,Lpx=Math.max(20,Math.min(w-2*pad,(m.L/1.5)*(w-2*pad)));
  x.fillStyle='#eef5f6';x.fillRect(0,0,w,h);
  x.strokeStyle='#476371';x.lineWidth=5;x.beginPath();x.moveTo(pad,y-45);x.lineTo(pad+Lpx,y-45);x.lineTo(pad+Lpx,y+45);x.lineTo(pad,y+45);x.stroke();
  x.fillStyle='#c76a47';x.fillRect(pad+Lpx-7,y-45,12,90);x.fillStyle='#173e58';x.font='700 11px system-ui';x.fillText('speaker / open end',pad-8,y+72);x.fillText('piston',pad+Lpx-19,y+72);
  const gain=Math.exp(-Math.pow(m.err/.022,2)),loops=Math.max(1,m.n),amp=gain*34;
  x.strokeStyle=m.resonant?'#27a7bd':'#7c929d';x.lineWidth=2;x.beginPath();
  for(let i=0;i<=700;i++){const u=i/700,xx=pad+u*Lpx,yy=y-amp*Math.sin(loops*Math.PI*u);i?x.lineTo(xx,yy):x.moveTo(xx,yy)}x.stroke();
  E('soundAmp').textContent=(gain*100).toFixed(0)+'%';E('resState').textContent=m.resonant?'acoustic maximum':'search';E('lengthOut').textContent=(m.L*100).toFixed(1)+' cm';E('orderOut').textContent='n = '+m.n;
}
function sameSet(a,b){return a.f===b.f&&a.temp===b.temp}
function previousResonance(m){
  const q=s.records.filter(r=>r.f===m.f&&r.temp===m.temp&&r.n<m.n).sort((a,b)=>b.n-a.n);
  return q[0]||null;
}
function record(){
  const m=model();if(!m.resonant){E('msg').className='notice warn';E('msg').textContent='Tune the piston until the selected odd mode reaches a clear acoustic maximum.';return;}
  const prev=previousResonance(m),rawDL=E('studentDL').value.trim(),rawC=E('studentC').value.trim();
  let pair=null;
  if(prev){
    if(rawDL===''||rawC===''){E('msg').className='notice warn';E('msg').textContent='Use the previous resonance at the same f and temperature to calculate ΔL and c.';return;}
    const dL=Math.abs(m.L-prev.L),dn=Math.abs(m.n-prev.n),lambda=4*dL/dn,c=m.f*lambda,studentDL=+rawDL,studentC=+rawC;
    if(Math.abs(studentDL-dL)>.004){E('msg').className='notice warn';E('msg').textContent='Recalculate ΔL from the two piston positions.';return;}
    if(Math.abs(studentC-c)>2.5){E('msg').className='notice warn';E('msg').textContent='Recalculate λ=4ΔL/Δn and c=fλ.';return;}
    pair={prevN:prev.n,dL,lambda,c};
  }else if(rawDL!==''||rawC!==''){
    E('msg').className='notice warn';E('msg').textContent='This is the first resonance of this frequency/temperature set; record it as the reference before calculating a spacing.';return;
  }
  const rec={f:m.f,temp:m.temp,n:m.n,L:m.L,pair},key=[m.f,m.temp,m.n].join('|'),i=s.records.findIndex(r=>[r.f,r.temp,r.n].join('|')===key);
  if(i>=0)s.records[i]=rec;else s.records.push(rec);s.analysis=null;E('studentDL').value='';E('studentC').value='';
  E('msg').className='notice ok';E('msg').textContent=prev?'Resonance and spacing calculation accepted. Continue with another odd mode or a new frequency/temperature.':'Reference resonance stored. Select the next odd mode at the same frequency/temperature and tune again.';
  renderAll();save();
}
function groups(){
  const map={};for(const r of s.records){const k=r.f+'|'+r.temp;(map[k]||(map[k]=[])).push(r)}
  return Object.entries(map).map(([k,rows])=>({k,rows:rows.sort((a,b)=>a.n-b.n),f:rows[0].f,temp:rows[0].temp})).sort((a,b)=>b.rows.length-a.rows.length);
}
function fitGroup(){
  const g=groups().find(q=>q.rows.length>=3);if(!g)return null;
  const ps=g.rows.map(r=>({x:r.n,y:r.L})),n=ps.length,mx=ps.reduce((a,p)=>a+p.x,0)/n,my=ps.reduce((a,p)=>a+p.y,0)/n;let nu=0,de=0;ps.forEach(p=>{nu+=(p.x-mx)*(p.y-my);de+=(p.x-mx)**2});const slope=nu/de,intercept=my-slope*mx;
  return{...g,ps,slope,intercept,c:4*g.f*slope,end:-intercept,theory:speed(g.temp)};
}
function checkAnalysis(){
  const q=fitGroup();if(!q){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Record at least three odd resonances at one common frequency and temperature.';return;}
  const slope=+E('studentSlope').value,c=+E('studentFitC').value,end=+E('studentEnd').value;
  if(!Number.isFinite(slope)||!Number.isFinite(c)||!Number.isFinite(end)){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Enter slope, fitted sound speed and end correction.';return;}
  if(Math.abs(slope-q.slope)>.004){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Re-read the slope dL/dn of the Lₙ versus odd-order graph.';return;}
  if(Math.abs(c-4*q.f*slope)>2.5){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate c=4f(dL/dn).';return;}
  if(Math.abs(end+q.intercept)>.004){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='The line is Lₙ=(λ/4)n−e; therefore e is minus the intercept.';return;}
  s.analysis={f:q.f,temp:q.temp,slope,c,end};E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Regression analysis accepted for '+q.f+' Hz at '+q.temp+' °C. Compare c with the temperature model and repeat other conditions if desired.';
  renderAll();save();
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function chart(){
  const q=fitGroup();if(q)U.plot(E('lengthChart'),[{pts:q.ps}],{xlabel:'odd mode order n',ylabel:'resonant length L / m',xmin:0,ymin:0});else blank(E('lengthChart'),'Record ≥3 resonances at one f and temperature.');
}
function renderTable(){
  E('body').innerHTML=s.records.length?s.records.map(r=>'<tr><td>'+r.f.toFixed(0)+'</td><td>'+r.temp.toFixed(0)+'</td><td>'+r.n+'</td><td>'+(r.L*100).toFixed(1)+'</td><td>'+(r.pair?r.pair.lambda.toFixed(3):'—')+'</td><td>'+(r.pair?r.pair.c.toFixed(1):'—')+'</td></tr>').join(''):'<tr><td colspan="6">No validated resonances yet.</td></tr>';
  const q=fitGroup();E('fitC').textContent=s.analysis?s.analysis.c.toFixed(1)+' m/s':'—';E('endOut').textContent=s.analysis?s.analysis.end.toFixed(4)+' m':'—';E('theoryC').textContent=q?q.theory.toFixed(1)+' m/s':'—';
}
function status(){
  const done=!!s.analysis&&s.conclusion.trim().length>=30;if(done){E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Air-resonator analysis complete. Discuss odd-harmonic spacing, end correction and temperature dependence.';}
}
function renderAll(){draw();renderTable();chart();status();}
function buildReport(){
  const summary='<p><b>Validated resonances:</b> '+s.records.length+'. '+(s.analysis?'<b>Fit:</b> f='+s.analysis.f+' Hz, T='+s.analysis.temp+' °C, c='+s.analysis.c.toFixed(1)+' m/s, e='+s.analysis.end.toFixed(4)+' m.':'Regression not validated.')+'</p><p><b>Interpretation:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>';
  return U.report('Waves Laboratory Practical 4 — Air Resonator',summary);
}
U.tabs();E('airConclusion').value=s.conclusion;
['freq','temp','order','tubeLength'].forEach(id=>E(id).addEventListener('input',draw));E('record').onclick=record;E('checkAnalysis').onclick=checkAnalysis;
E('airConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;status();save();});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
if(s.analysis){E('studentSlope').value=s.analysis.slope;E('studentFitC').value=s.analysis.c;E('studentEnd').value=s.analysis.end;}
window.addEventListener('resize',renderAll);renderAll();save();
})();