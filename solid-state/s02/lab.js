(()=>{'use strict';
const U=SolidUI,E=id=>document.getElementById(id),K='SOLID_S02_v2',TAU=Math.PI*2,INERTIA={A:.0028,B:.0046,AB:.0068};
function makeRun(){return{id:'S02-'+Math.random().toString(36).slice(2,7).toUpperCase(),G:(72+Math.random()*13)*1e9,phase:Math.random()*8}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),geometry:null,st:[],dy:[],pending:null,analysis:null,gResult:null,interpretation:''};s.st=Array.isArray(s.st)?s.st:[];s.dy=Array.isArray(s.dy)?s.dy:[];s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function geom(){return{L:+E('wireL').value,r:+E('wireR').value}}
function sameGeom(a,b){return a&&Math.abs(a.L-b.L)<1e-9&&Math.abs(a.r-b.r)<1e-9}
function ensureGeometry(){
 const g=geom();if(!s.geometry){s.geometry=g;return true}if(!sameGeom(s.geometry,g)){return false}return true
}
function Ctrue(){const g=geom(),r=g.r*1e-3;return Math.PI*s.run.G*r**4/(2*g.L)}
function phiTrue(){return(+E('torque').value*1e-3)/Ctrue()}
function noisyPhi(){return phiTrue()*(1+.0025*Math.sin((+E('torque').value)*.71+s.run.phase))}
function drawT(){
 const q=U.canvas(E('torsionCanvas')),x=q.x,w=q.w,h=q.h,ang=Math.min(.75,noisyPhi());x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.strokeStyle='#8bb0bd';x.lineWidth=5;x.beginPath();x.moveTo(w/2,30);x.lineTo(w/2,h*.58);x.stroke();
 x.save();x.translate(w/2,h*.68);x.rotate(ang);x.fillStyle='#6ee0b0';x.fillRect(-110,-18,220,36);x.restore();
 x.fillStyle='#e6f6ef';x.font='12px system-ui';x.fillText('angular scale readout',w*.08,h*.90);E('phiRead').value=noisyPhi().toFixed(4)+' rad';
}
function recordStatic(){
 if(!ensureGeometry()){E('staticMsg').className='notice warn';E('staticMsg').textContent='Keep the same wire length/radius for the complete static and dynamic dataset, or reload the practical to start a different specimen geometry.';return}
 const tau=+E('torque').value,phi=+E('studentPhi').value,stau=+E('studentTorque').value,truth=noisyPhi();
 if(!Number.isFinite(phi)||!Number.isFinite(stau)||phi<0||stau<0){E('staticMsg').className='notice warn';E('staticMsg').textContent='Read and enter both the angular displacement and applied torque.';return}
 if(Math.abs(stau-tau)>.11){E('staticMsg').className='notice warn';E('staticMsg').textContent='Use the applied-torque setting shown on the apparatus.';return}
 if(Math.abs(phi-truth)>Math.max(.00025,.01*Math.max(truth,.001))){E('staticMsg').className='notice warn';E('staticMsg').textContent='Re-read the angular scale at equilibrium.';return}
 const rec={tau:stau*1e-3,phi},k=s.st.findIndex(q=>Math.abs(q.tau-rec.tau)<1e-12);if(k>=0)s.st[k]=rec;else s.st.push(rec);s.st.sort((a,b)=>a.tau-b.tau);s.analysis=null;s.gResult=null;
 E('studentPhi').value='';E('studentTorque').value='';E('staticMsg').className='notice ok';E('staticMsg').textContent='Static equilibrium reading accepted. Apply another torque within the elastic range.';render();save();
}
function period(I){return TAU*Math.sqrt(I/Ctrue())}
let anim=0;
function drawO(){
 const q=U.canvas(E('oscCanvas')),x=q.x,w=q.w,h=q.h,I=INERTIA[E('disk').value],T=period(I),a=(+E('angle0').value*DEG())*Math.cos(anim),g=geom();x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.strokeStyle='#8bb0bd';x.lineWidth=4;x.beginPath();x.moveTo(w/2,25);x.lineTo(w/2,h*.55);x.stroke();x.save();x.translate(w/2,h*.64);x.rotate(a);x.fillStyle='#6ee0b0';x.fillRect(-100,-16,200,32);x.restore();x.fillStyle='#a9c4cf';x.font='11px system-ui';x.fillText('wire L='+g.L.toFixed(2)+' m · r='+g.r.toFixed(2)+' mm',12,18);anim+=.035;requestAnimationFrame(drawO);
}
function DEG(){return Math.PI/180}
function timeNow(){
 if(!ensureGeometry()){E('dynMsg').className='notice warn';E('dynMsg').textContent='Keep the same wire dimensions used for the static dataset.';return}
 const disk=E('disk').value,I=INERTIA[disk],N=+E('cycles').value,T=period(I),t=N*T*(1+.0018*Math.sin(I*1e5+s.run.phase));s.pending={disk,I,N,t};E('timeOut').value=t.toFixed(3)+' s';['studentTime','studentPeriod','studentI','studentC'].forEach(id=>E(id).value='');E('dynMsg').className='notice ok';E('dynMsg').textContent='Stopwatch run complete. Read the elapsed time and calculate T and C.';save();
}
function recordDynamic(){
 const p=s.pending;if(!p){E('dynMsg').className='notice warn';E('dynMsg').textContent='Perform an N-cycle stopwatch timing first.';return}
 const t=+E('studentTime').value,T=+E('studentPeriod').value,I=+E('studentI').value,C=+E('studentC').value;if([t,T,I,C].some(v=>!Number.isFinite(v))||t<=0||T<=0||I<=0||C<=0){E('dynMsg').className='notice warn';E('dynMsg').textContent='Enter elapsed time, period, calibrated inertia and torsional stiffness.';return}
 if(Math.abs(t-p.t)>.006){E('dynMsg').className='notice warn';E('dynMsg').textContent='Re-read the stopwatch display.';return}
 if(Math.abs(T-t/p.N)>.0005){E('dynMsg').className='notice warn';E('dynMsg').textContent='Recalculate T=t/N.';return}
 if(Math.abs(I-p.I)>.00005){E('dynMsg').className='notice warn';E('dynMsg').textContent='Use the calibrated moment of inertia for the selected disk configuration.';return}
 const eC=4*Math.PI*Math.PI*I/(T*T);if(Math.abs(C-eC)>Math.max(.00008,.012*eC)){E('dynMsg').className='notice warn';E('dynMsg').textContent='Recalculate C=4π²I/T².';return}
 const rec={disk:p.disk,I,N:p.N,t,T,C},k=s.dy.findIndex(q=>q.disk===p.disk);if(k>=0)s.dy[k]=rec;else s.dy.push(rec);s.pending=null;s.analysis=null;s.gResult=null;E('timeOut').value='';['studentTime','studentPeriod','studentI','studentC'].forEach(id=>E(id).value='');E('dynMsg').className='notice ok';E('dynMsg').textContent='Dynamic result accepted. Repeat with the remaining disk configurations.';render();save();
}
function staticFit(){
 if(s.st.length<6||s.st[0].tau>0.004||s.st.at(-1).tau<0.03)return null;const pts=s.st.map(q=>({x:q.phi,y:q.tau})),f=U.fit(pts);return{pts,C:f.b,intercept:f.a}
}
function dynamicStats(){if(new Set(s.dy.map(q=>q.disk)).size<3)return null;const vals=s.dy.map(q=>q.C),mean=vals.reduce((a,b)=>a+b,0)/vals.length;return{mean}}
function checkC(){
 const a=staticFit(),b=dynamicStats();if(!a||!b){E('cMsg').className='notice warn';E('cMsg').textContent='Record at least six static torques spanning the range and all three disk configurations.';return}
 const cs=+E('studentCStatic').value,cd=+E('studentCDyn').value,diff=+E('studentCDiff').value;if([cs,cd,diff].some(v=>!Number.isFinite(v))||cs<=0||cd<=0||diff<0){E('cMsg').className='notice warn';E('cMsg').textContent='Enter static C, mean dynamic C and their percentage difference.';return}
 if(Math.abs(cs-a.C)>Math.max(.00008,.012*a.C)){E('cMsg').className='notice warn';E('cMsg').textContent='Fit torque τ against angular displacement φ and use the slope as C.';return}
 if(Math.abs(cd-b.mean)>Math.max(.00008,.012*b.mean)){E('cMsg').className='notice warn';E('cMsg').textContent='Average the three accepted dynamic C values.';return}
 const ed=100*Math.abs(cs-cd)/((cs+cd)/2);if(Math.abs(diff-ed)>.15){E('cMsg').className='notice warn';E('cMsg').textContent='Recalculate 100|Cstatic−Cdynamic|/[(Cstatic+Cdynamic)/2].';return}
 s.analysis={Cstatic:cs,Cdynamic:cd,diff};s.gResult=null;E('cMsg').className='notice ok';E('cMsg').textContent='Static/dynamic stiffness comparison accepted.';render();save();
}
function checkG(){
 if(!s.analysis||!s.geometry){E('gMsg').className='notice warn';E('gMsg').textContent='Validate the stiffness analysis first.';return}
 const source=E('cSource').value,C=source==='static'?s.analysis.Cstatic:source==='dynamic'?s.analysis.Cdynamic:(s.analysis.Cstatic+s.analysis.Cdynamic)/2,g=s.geometry,r=g.r*1e-3,eG=2*g.L*C/(Math.PI*r**4)/1e9,G=+E('studentG').value;
 if(!Number.isFinite(G)||G<=0){E('gMsg').className='notice warn';E('gMsg').textContent='Enter the shear modulus in GPa.';return}
 if(Math.abs(G-eG)>Math.max(.4,.015*eG)){E('gMsg').className='notice warn';E('gMsg').textContent='Recalculate G=2LC/(πr⁴), converting r from millimetres to metres.';return}
 s.gResult={G,source};E('gMsg').className='notice ok';E('gMsg').textContent='Shear modulus accepted.';render();save();
}
function render(){
 drawT();E('staticBody').innerHTML=s.st.length?s.st.map(q=>'<tr><td>'+(q.tau*1000).toFixed(1)+'</td><td>'+q.phi.toFixed(4)+'</td></tr>').join(''):'<tr><td colspan="2">No static readings yet.</td></tr>';E('staticCount').textContent=s.st.length+' / 6';
 E('dynBody').innerHTML=s.dy.length?s.dy.map(q=>'<tr><td>'+q.disk+'</td><td>'+q.I.toFixed(4)+'</td><td>'+q.N+'</td><td>'+q.t.toFixed(3)+'</td><td>'+q.T.toFixed(4)+'</td><td>'+q.C.toFixed(4)+'</td></tr>').join(''):'<tr><td colspan="6">No validated dynamic timings yet.</td></tr>';E('dynCount').textContent=new Set(s.dy.map(q=>q.disk)).size+' / 3';
 const sf=staticFit();if(sf)U.plot(E('staticChart'),[{pts:sf.pts}],{xlabel:'φ / rad',ylabel:'τ / N·m',xmin:0,ymin:0});else{const q=U.canvas(E('staticChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record a broad static torque–angle dataset.',q.w/2,q.h/2)}
 E('cStatic').textContent=s.analysis?s.analysis.Cstatic.toFixed(4)+' N·m/rad':'—';E('cDyn').textContent=s.analysis?s.analysis.Cdynamic.toFixed(4)+' N·m/rad':'—';E('gOut').textContent=s.gResult?s.gResult.G.toFixed(1)+' GPa':'—';
 const words=s.interpretation.trim().length>=60;E('progress').innerHTML='<div class="item '+(s.analysis?'done':'')+'">'+(s.analysis?'✓':'○')+' static/dynamic stiffness comparison</div><div class="item '+(s.gResult?'done':'')+'">'+(s.gResult?'✓':'○')+' shear modulus</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' uncertainty interpretation</div>';
}
function buildReport(){const summary='<p><b>Static points:</b> '+s.st.length+'; <b>dynamic configurations:</b> '+new Set(s.dy.map(q=>q.disk)).size+'/3.</p><p><b>Stiffness:</b> '+(s.analysis?'Cstatic='+s.analysis.Cstatic.toFixed(4)+', Cdynamic='+s.analysis.Cdynamic.toFixed(4)+' N·m/rad, difference='+s.analysis.diff.toFixed(2)+'%':'not validated')+'. <b>G:</b> '+(s.gResult?s.gResult.G.toFixed(1)+' GPa':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 2 — Isotropic Elasticity: Torsion Pendulum',summary)}
U.tabs();E('interpretation').value=s.interpretation;if(s.geometry){E('wireL').value=s.geometry.L;E('wireR').value=s.geometry.r}if(s.analysis){E('studentCStatic').value=s.analysis.Cstatic;E('studentCDyn').value=s.analysis.Cdynamic;E('studentCDiff').value=s.analysis.diff}if(s.gResult){E('cSource').value=s.gResult.source;E('studentG').value=s.gResult.G}
['wireL','wireR','torque'].forEach(id=>E(id).addEventListener('input',()=>{E('studentPhi').value='';E('studentTorque').value='';drawT()}));E('recordStatic').onclick=recordStatic;E('timeOsc').onclick=timeNow;E('recordDynamic').onclick=recordDynamic;E('checkCAnalysis').onclick=checkC;E('checkG').onclick=checkG;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();drawO();save();
})();