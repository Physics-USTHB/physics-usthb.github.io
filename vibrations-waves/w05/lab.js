(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W05_v2',OLD='VOM_W05_v1',C0=120,FC=1200;
const current=U.load(K,null),old=U.load(OLD,null);
let s=current||{version:2,records:[],nodes:{f:null,positions:[]},analysis:null,conclusion:''};
if(!current&&old)s={version:2,records:[],nodes:{f:null,positions:[]},analysis:null,conclusion:''};
s.records=Array.isArray(s.records)?s.records:[];s.nodes=s.nodes||{f:null,positions:[]};s.conclusion=s.conclusion||'';
function save(){U.save(K,s)}
function model(){
  const f=+E('freq').value*1000,x=+E('probe').value/100,ratio=Math.sqrt(1-(FC/f)**2),vp=C0/ratio,vg=C0*ratio,lambda=vp/f,k=2*Math.PI/lambda,V=Math.abs(Math.sin(k*x));
  return{f,x,ratio,vp,vg,lambda,k,V,nodeSep:lambda/2};
}
function syncNodeFrequency(){
  const f=+E('freq').value*1000;
  if(s.nodes.f!==f){s.nodes={f,positions:[]};clearPointInputs();}
}
function draw(){
  syncNodeFrequency();const {x,w,h}=U.canvas(E('waveCanvas')),m=model(),pad=30,mid=h*.52;
  x.fillStyle='#eef5f6';x.fillRect(0,0,w,h);
  x.strokeStyle='rgba(42,81,99,.16)';x.lineWidth=1;for(let k=0;k<=10;k++){const xx=pad+(w-2*pad)*k/10;x.beginPath();x.moveTo(xx,20);x.lineTo(xx,h-25);x.stroke();}
  const pts=[];for(let i=0;i<=900;i++){const xxm=i/900,yy=Math.sin(m.k*xxm);pts.push({x:pad+xxm*(w-2*pad),y:mid-yy*h*.28});}
  x.strokeStyle='#27a6bd';x.lineWidth=2;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));x.stroke();
  for(const pos of s.nodes.positions){const xx=pad+pos*(w-2*pad);x.strokeStyle='#d46a48';x.lineWidth=2;x.beginPath();x.moveTo(xx,20);x.lineTo(xx,h-25);x.stroke();}
  const px=pad+m.x*(w-2*pad);x.strokeStyle='#6c50a3';x.lineWidth=3;x.beginPath();x.moveTo(px,15);x.lineTo(px,h-20);x.stroke();
  E('probeV').textContent=m.V.toFixed(3);E('nodeCount').textContent=s.nodes.positions.length;E('nodePositions').textContent=s.nodes.positions.length?s.nodes.positions.map(v=>(v*100).toFixed(1)).join(', ')+' cm':'—';E('freqRead').textContent=(m.f/1000).toFixed(2)+' kHz';
}
function markNode(){
  syncNodeFrequency();const m=model();
  if(m.V>.12){E('msg').className='notice warn';E('msg').textContent='The probe is not close enough to a voltage minimum. Move it until |V| is near zero.';return;}
  if(s.nodes.positions.some(p=>Math.abs(p-m.x)<.003)){E('msg').className='notice warn';E('msg').textContent='This node has already been marked.';return;}
  s.nodes.positions.push(m.x);s.nodes.positions.sort((a,b)=>a-b);
  E('msg').className='notice ok';E('msg').textContent='Node marked. Locate the next consecutive minimum; three or more marks improve the mean spacing.';
  draw();save();
}
function clearNodes(){s.nodes.positions=[];clearPointInputs();draw();save()}
function clearPointInputs(){['studentDx','studentLambda','studentVp','studentVg'].forEach(id=>E(id).value='')}
function nodeSpacing(){
  const p=s.nodes.positions;if(p.length<2)return null;
  const gaps=[];for(let i=1;i<p.length;i++)gaps.push(p[i]-p[i-1]);
  const mean=gaps.reduce((a,b)=>a+b,0)/gaps.length;
  return{mean,gaps};
}
function record(){
  const m=model(),sp=nodeSpacing();
  if(!sp){E('msg').className='notice warn';E('msg').textContent='Mark at least two consecutive nodes first.';return;}
  if(sp.gaps.some(g=>Math.abs(g-m.nodeSep)>.22*m.nodeSep)){E('msg').className='notice warn';E('msg').textContent='The marked minima are not consecutive nodes. Clear the marks and repeat without skipping a node.';return;}
  const raw=['studentDx','studentLambda','studentVp','studentVg'].map(id=>E(id).value.trim());if(raw.some(v=>v==='')){E('msg').className='notice warn';E('msg').textContent='Calculate Δx, λ, phase velocity and group velocity.';return;}
  const [dx,lambda,vp,vg]=raw.map(Number),lc=2*sp.mean,vpc=m.f*lc,vgc=C0*C0/vpc;
  if(Math.abs(dx-sp.mean)>.0015){E('msg').className='notice warn';E('msg').textContent='Recalculate the mean spacing between consecutive marked nodes.';return;}
  if(Math.abs(lambda-lc)>.003){E('msg').className='notice warn';E('msg').textContent='Recalculate λ=2Δx.';return;}
  if(Math.abs(vp-vpc)>2){E('msg').className='notice warn';E('msg').textContent='Recalculate vφ=fλ, converting kHz to Hz.';return;}
  if(Math.abs(vg-vgc)>2){E('msg').className='notice warn';E('msg').textContent='Using the calibrated limiting speed c₀=120 m/s, recalculate vg=c₀²/vφ.';return;}
  const rec={f:m.f,dx,lambda,vp,vg,nodes:s.nodes.positions.length},i=s.records.findIndex(q=>q.f===m.f);
  if(i>=0)s.records[i]=rec;else s.records.push(rec);s.records.sort((a,b)=>a.f-b.f);s.analysis=null;s.nodes={f:m.f,positions:[]};clearPointInputs();
  E('msg').className='notice ok';E('msg').textContent='Dispersion point accepted. Change frequency and repeat the node-spacing measurement.';
  renderAll();save();
}
function coverage(){return s.records.length>=6&&Math.min(...s.records.map(q=>q.f))<=2500&&Math.max(...s.records.map(q=>q.f))>=7500}
function cutoffEstimates(){
  return s.records.map(q=>q.f*Math.sqrt(Math.max(0,1-(C0/q.vp)**2))).filter(Number.isFinite);
}
function checkAnalysis(){
  if(!coverage()){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Record at least six frequencies spanning roughly 2–8 kHz.';return;}
  const est=cutoffEstimates(),fc=est.reduce((a,b)=>a+b,0)/est.length,c0=+E('studentC0').value,studentFc=+E('studentFc').value;
  if(!Number.isFinite(studentFc)||!Number.isFinite(c0)||studentFc<=0||c0<=0){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Enter the cutoff frequency and high-frequency limiting speed read from your dispersion analysis.';return;}
  if(Math.abs(studentFc-fc)>100){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Recalculate f_c from the measured phase-velocity relation or re-read the dispersion fit.';return;}
  if(Math.abs(c0-C0)>4){E('analysisMessage').className='notice warn';E('analysisMessage').textContent='Re-read the high-frequency limiting speed approached by the phase/group velocity curves.';return;}
  s.analysis={fc:studentFc,c0};E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Dispersion analysis accepted. Explain why vφ decreases toward c₀ while vg increases toward c₀ as frequency rises.';
  renderAll();save();
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function charts(){
  if(s.records.length){
    U.plot(E('velocityChart'),[{pts:s.records.map(q=>({x:q.f/1000,y:q.vp})),color:'#28a8bd'},{pts:s.records.map(q=>({x:q.f/1000,y:q.vg})),color:'#d48c32'}],{xlabel:'frequency / kHz',ylabel:'velocity / m·s⁻¹',xmin:1.8,xmax:8.2,ymin:0});
    U.plot(E('dispChart'),[{pts:s.records.map(q=>({x:1/(q.f*q.f)*1e6,y:1/(q.vp*q.vp)*1e4}))}],{xlabel:'10⁶/f² / Hz⁻²',ylabel:'10⁴/vφ² / s²·m⁻²',xmin:0,ymin:0});
  }else{blank(E('velocityChart'),'Validate wavelength points to build velocity curves.');blank(E('dispChart'),'Validate points to build the dispersion transform.');}
}
function renderTable(){
  E('body').innerHTML=s.records.length?s.records.map(q=>'<tr><td>'+(q.f/1000).toFixed(2)+'</td><td>'+q.dx.toFixed(4)+'</td><td>'+q.lambda.toFixed(4)+'</td><td>'+q.vp.toFixed(1)+'</td><td>'+q.vg.toFixed(1)+'</td><td>'+(q.vp*q.vg).toFixed(0)+'</td></tr>').join(''):'<tr><td colspan="6">No validated measurements yet.</td></tr>';
  E('countOut').textContent=s.records.length;const mean=s.records.length?s.records.reduce((a,q)=>a+q.vp*q.vg,0)/s.records.length:NaN;E('productOut').textContent=Number.isFinite(mean)?mean.toFixed(0)+' m²/s²':'—';
  E('fcOut').textContent=s.analysis?s.analysis.fc.toFixed(0)+' Hz':'—';E('c0Out').textContent=s.analysis?s.analysis.c0.toFixed(1)+' m/s':'—';
}
function status(){
  const done=!!s.analysis&&s.conclusion.trim().length>=30;if(done){E('analysisMessage').className='notice ok';E('analysisMessage').textContent='Dispersive-line analysis complete. Discuss the different meanings of phase and group velocity and the cutoff behaviour.';}
}
function renderAll(){draw();renderTable();charts();status();}
function buildReport(){
  const summary='<p><b>Validated frequencies:</b> '+s.records.length+'. <b>Mean vφvg:</b> '+(s.records.length?(s.records.reduce((a,q)=>a+q.vp*q.vg,0)/s.records.length).toFixed(0)+' m²/s²':'—')+'. '+(s.analysis?'<b>f_c:</b> '+s.analysis.fc.toFixed(0)+' Hz; <b>c₀:</b> '+s.analysis.c0.toFixed(1)+' m/s.':'Analysis incomplete.')+'</p><p><b>Interpretation:</b> '+U.esc(s.conclusion||'Not completed.')+'</p>';
  return U.report('Waves Laboratory Practical 5 — Dispersive Line',summary);
}
U.tabs();E('dispConclusion').value=s.conclusion;
['freq','probe'].forEach(id=>E(id).addEventListener('input',draw));E('freq').addEventListener('change',()=>{syncNodeFrequency();draw();save();});
E('markNode').onclick=markNode;E('clearNodes').onclick=clearNodes;E('record').onclick=record;E('checkAnalysis').onclick=checkAnalysis;
E('dispConclusion').addEventListener('input',e=>{s.conclusion=e.target.value;status();save();});
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
if(s.analysis){E('studentFc').value=s.analysis.fc;E('studentC0').value=s.analysis.c0;}
window.addEventListener('resize',renderAll);renderAll();save();
})();