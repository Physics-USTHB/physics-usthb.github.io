(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_O01_v2',f0=2.2,betas={1:.12,2:.28,3:.52},DIV_SCALE=1.7;
let s=U.load(K,{version:2,records:{}});
if(s.version!==2)s={version:2,records:{}};
function save(){U.save(K,s)}
function pars(){
  const b=betas[+E('damping').value],w0=2*Math.PI*f0,wd=Math.sqrt(w0*w0-b*b),fd=wd/(2*Math.PI),T=1/fd,A=+E('amp').value;
  return{b,w0,wd,fd,T,A};
}
function xAt(t,p=pars()){return p.A*Math.exp(-p.b*t)*Math.cos(p.wd*t)}
function ampDiv(t,p=pars()){return Math.abs(xAt(t,p))*DIV_SCALE}
function nearestExtremumError(t,T){
  const half=T/2,k=Math.round(t/half),target=k*half;
  return{err:Math.abs(t-target),k,target};
}
function draw(){
  const {x,w,h}=U.canvas(E('scope'));U.grid(x,w,h);const p=pars(),pts=[];
  for(let i=0;i<=1000;i++){const t=5*i/1000,y=xAt(t,p);pts.push({x:w*i/1000,y:h/2-y/1.5*h*.32})}
  x.strokeStyle='#68e4fb';x.lineWidth=2;x.beginPath();pts.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.stroke();
  x.setLineDash([5,4]);
  [['cursor1','#ffd166'],['cursor2','#ff8a7a']].forEach(([id,col])=>{const t=+E(id).value,xx=w*t/5;x.strokeStyle=col;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke()});
  x.setLineDash([]);updateCursorReadouts();
}
function updateCursorReadouts(){
  const p=pars(),t1=+E('cursor1').value,t2=+E('cursor2').value;
  E('t1Read').textContent=t1.toFixed(3)+' s';E('t2Read').textContent=t2.toFixed(3)+' s';
  E('a1Read').textContent=ampDiv(t1,p).toFixed(3);E('a2Read').textContent=ampDiv(t2,p).toFixed(3);
}
function clearEntry(){['studentCycles','studentT','studentDelta','studentQ'].forEach(id=>E(id).value='')}
function validate(){
  const p=pars(),t1=+E('cursor1').value,t2=+E('cursor2').value;
  if(t2<=t1){E('msg').className='notice warn';E('msg').textContent='Cursor t₂ must be later than t₁.';return}
  const e1=nearestExtremumError(t1,p.T),e2=nearestExtremumError(t2,p.T),sameSign=(e1.k-e2.k)%2===0;
  if(e1.err>.045*p.T||e2.err>.045*p.T||!sameSign){E('msg').className='notice warn';E('msg').textContent='Place both cursors on same-sign amplitude extrema before calculating the decrement.';return}
  const N=Math.round((t2-t1)/p.T);
  if(N<3){E('msg').className='notice warn';E('msg').textContent='Use at least three full periods between the cursors to reduce reading error.';return}
  const a1=ampDiv(t1,p),a2=ampDiv(t2,p);
  if(!(a1>a2&&a2>0)){E('msg').className='notice warn';E('msg').textContent='Choose an earlier larger peak for A₁ and a later smaller peak for A₂.';return}
  const raw=['studentCycles','studentT','studentDelta','studentQ'].map(id=>E(id).value.trim());
  if(raw.some(v=>v==='')){E('msg').className='notice warn';E('msg').textContent='Enter N, T, δ and Q before validation.';return}
  const n=+raw[0],T=+raw[1],delta=+raw[2],Q=+raw[3],Tcalc=(t2-t1)/N,dcalc=Math.log(a1/a2)/N,qcalc=Math.PI/dcalc;
  if(!Number.isInteger(n)||n!==N){E('msg').className='notice warn';E('msg').textContent='Recount the number of full periods between the two same-phase extrema.';return}
  if(Math.abs(T-Tcalc)>.006){E('msg').className='notice warn';E('msg').textContent='Recalculate T=(t₂−t₁)/N.';return}
  if(Math.abs(delta-dcalc)>.006){E('msg').className='notice warn';E('msg').textContent='Recalculate δ=(1/N) ln(A₁/A₂) from the cursor amplitudes.';return}
  if(Math.abs(Q-qcalc)>Math.max(.15,.025*qcalc)){E('msg').className='notice warn';E('msg').textContent='Recalculate Q≈π/δ.';return}
  const level=String(E('damping').value);s.records[level]={level:+level,N:n,T,delta,Q,t1,t2,a1,a2};
  E('msg').className='notice ok';E('msg').textContent='Damping-level measurement accepted. Repeat for the other damping settings using several periods.';
  clearEntry();renderResults();save();
}
function renderResults(){
  const level=String(E('damping').value),r=s.records[level]||Object.values(s.records).at(-1);
  E('Tout').textContent=r?r.T.toFixed(4)+' s':'—';E('deltaOut').textContent=r?r.delta.toFixed(4):'—';E('qOut').textContent=r?r.Q.toFixed(2):'—';
  E('setsOut').textContent=Object.keys(s.records).length+' / 3';
  E('dampingBody').innerHTML=[1,2,3].map(k=>{const q=s.records[String(k)];return '<tr><td>'+({1:'weak',2:'medium',3:'strong'}[k])+'</td><td>'+(q?q.N:'—')+'</td><td>'+(q?q.T.toFixed(4):'—')+'</td><td>'+(q?q.delta.toFixed(4):'—')+'</td><td>'+(q?q.Q.toFixed(2):'—')+'</td></tr>'}).join('');
  const pts=[1,2,3].map(k=>s.records[String(k)]?{x:k,y:s.records[String(k)].Q}:null).filter(Boolean);
  if(pts.length)U.plot(E('dampingChart'),[{pts}],{xlabel:'damping setting 1→3',ylabel:'Q',xmin:1,xmax:3,ymin:0});
  else{
    const q=U.canvas(E('dampingChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#6c8090';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Validate damping measurements to build the comparison.',q.w/2,q.h/2);
  }
  const complete=Object.keys(s.records).length===3;E('analysisMessage').className=complete?'notice ok':'notice';
  E('analysisMessage').textContent=complete?'All three damping levels are complete. Verify that increasing damping raises δ and lowers Q, then relate amplitude decay to energy decay.':'Complete all three damping levels and compare δ and Q.';
}
function buildReport(){
  const rows=[1,2,3].map(k=>{const q=s.records[String(k)];return q?({1:'weak',2:'medium',3:'strong'}[k])+': T='+q.T.toFixed(4)+' s, δ='+q.delta.toFixed(4)+', Q='+q.Q.toFixed(2):({1:'weak',2:'medium',3:'strong'}[k])+': incomplete'}).join(' · ');
  return U.report('Laboratory Practical 1 — Free Damped Oscillations','<p><b>Damping measurements:</b> '+rows+'.</p>');
}
U.tabs();
['damping','amp','cursor1','cursor2'].forEach(id=>E(id).addEventListener('input',()=>{draw();renderResults()}));
E('measure').onclick=validate;E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',()=>{draw();renderResults()});
draw();renderResults();save();
})();