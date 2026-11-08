(()=>{'use strict';
const U=PhysOptUI,E=id=>document.getElementById(id),K='PHYSOPT_P04_v2',LAM=589.3e-9,R=1;
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,rings:{},tableChecked:false,analysis:null};s.rings=s.rings||{};
function save(){U.save(K,s)}
function radius(m){return Math.sqrt(m*LAM*R)*1000}
function draw(){
 const q=U.canvas(E('ringsCanvas')),x=q.x,w=q.w,h=q.h,blur=Math.abs(+E('focus').value),scale=Math.min(w,h)/18;x.fillStyle='#050a12';x.fillRect(0,0,w,h);
 for(let m=1;m<=12;m++){const rr=radius(m)*scale,I=Math.max(.12,1-blur*.14);x.strokeStyle='rgba(255,210,70,'+I+')';x.lineWidth=2+Math.min(6,blur);x.beginPath();x.arc(w/2,h/2,rr,0,Math.PI*2);x.stroke()}
 const cx=w/2+(+E('cross').value)*scale;x.strokeStyle='#ff6a78';x.lineWidth=1;x.beginPath();x.moveTo(cx,20);x.lineTo(cx,h-20);x.stroke();x.beginPath();x.moveTo(cx-10,h/2);x.lineTo(cx+10,h/2);x.stroke();
}
function target(side){const m=+E('order').value,r=radius(m);return side==='L'?-r:r}
function record(side){
 if(Math.abs(+E('focus').value)>.5){E('msg').className='notice warn';E('msg').textContent='Microscope is not focused on the ring plane.';return}
 const t=target(side),xv=+E('cross').value;if(Math.abs(xv-t)>.08){E('msg').className='notice warn';E('msg').textContent='Crosshair is not on the selected '+(side==='L'?'left':'right')+' dark-ring edge.';return}
 const key=E('order').value,r=s.rings[key]||(s.rings[key]={m:+key,draft:{}});r[side]=xv;r.draft={};r.valid=false;s.tableChecked=false;s.analysis=null;
 E('msg').className='notice ok';E('msg').textContent=r.L!=null&&r.R!=null?'Both edge readings stored. Calculate D and D² in the table.':(side==='L'?'Left':'Right')+' edge stored. Measure the opposite edge.';render();save();
}
function calcInput(q,key){const v=q.draft?.[key]??'';return'<input class="ring-calc" data-m="'+q.m+'" data-key="'+key+'" type="number" step="'+(key==='D'?'.001':'.001')+'" value="'+v+'">'}
function measuredRings(){return Object.values(s.rings).filter(q=>q.L!=null&&q.R!=null).sort((a,b)=>a.m-b.m)}
function renderTable(){
 const all=Object.values(s.rings).sort((a,b)=>a.m-b.m);E('body').innerHTML=all.length?all.map(q=>'<tr><td>'+q.m+'</td><td>'+(q.L!=null?q.L.toFixed(3):'—')+'</td><td>'+(q.R!=null?q.R.toFixed(3):'—')+'</td><td>'+(q.L!=null&&q.R!=null?calcInput(q,'D'):'—')+'</td><td>'+(q.L!=null&&q.R!=null?calcInput(q,'D2'):'—')+'</td></tr>').join(''):'<tr><td colspan="5">No ring-edge measurements yet.</td></tr>';
 document.querySelectorAll('.ring-calc').forEach(el=>el.addEventListener('input',()=>{const q=s.rings[el.dataset.m];q.draft=q.draft||{};q.draft[el.dataset.key]=el.value.trim()===''?null:+el.value;q.valid=false;s.tableChecked=false;s.analysis=null;save()}));
}
function checkTable(){
 const arr=measuredRings();if(arr.length<6||Math.min(...arr.map(q=>q.m))>2||Math.max(...arr.map(q=>q.m))<10){E('tableMsg').className='notice warn';E('tableMsg').textContent='Measure both sides for at least six ring orders spanning approximately m=1–12.';return}
 for(const q of arr){const D=+q.draft?.D,D2=+q.draft?.D2,eD=q.R-q.L,eD2=eD*eD;if(!Number.isFinite(D)||!Number.isFinite(D2)||D<=0||D2<=0){E('tableMsg').className='notice warn';E('tableMsg').textContent='Complete D and D² for every measured ring.';return}
  if(Math.abs(D-eD)>.004){E('tableMsg').className='notice warn';E('tableMsg').textContent='Recalculate D=xR−xL for ring m='+q.m+'.';return}
  if(Math.abs(D2-D*D)>.008){E('tableMsg').className='notice warn';E('tableMsg').textContent='Recalculate D² from your diameter for ring m='+q.m+'.';return}
 }
 arr.forEach(q=>{q.valid=true;q.D=+q.draft.D;q.D2=+q.draft.D2});s.tableChecked=true;s.analysis=null;E('tableMsg').className='notice ok';E('tableMsg').textContent='Diameter table accepted. Build D² versus ring order and determine the slope.';render();save();
}
function fitExpected(){
 if(!s.tableChecked)return null;const arr=measuredRings().filter(q=>q.valid),pts=arr.map(q=>({x:q.m,y:q.D2})),f=U.fit(pts),lambda=f.b*1e-6/(4*R)*1e9;return{pts,slope:f.b,lambda};
}
function checkAnalysis(){
 const e=fitExpected();if(!e){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Validate the diameter table first.';return}
 const slope=+E('studentSlope').value,lambda=+E('studentLambda').value;if(!Number.isFinite(slope)||!Number.isFinite(lambda)||slope<=0||lambda<=0){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter the graph slope and wavelength.';return}
 if(Math.abs(slope-e.slope)>.015){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Fit D² (mm²) against ring order and re-read the slope.';return}
 const calc=slope*1e-6/(4*R)*1e9;if(Math.abs(lambda-calc)>.8){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Use slope=4λR and convert mm² to m² before reporting λ in nm.';return}
 s.analysis={slope,lambda};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Newton-ring graph analysis accepted.';render();save();
}
function render(){
 draw();renderTable();const e=fitExpected();if(e)U.plot(E('ringChart'),[{pts:e.pts}],{xlabel:'ring order m',ylabel:'D² / mm²',xmin:0,ymin:0});else{const q=U.canvas(E('ringChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Validate the diameter table to unlock D² versus order.',q.w/2,q.h/2)}
 E('slopeOut').textContent=s.analysis?s.analysis.slope.toFixed(3)+' mm²/order':'—';E('lambdaOut').textContent=s.analysis?s.analysis.lambda.toFixed(1)+' nm':'—';
}
function buildReport(){const summary='<p><b>Measured ring orders:</b> '+measuredRings().length+'. <b>Diameter table:</b> '+(s.tableChecked?'validated':'incomplete')+'.</p><p><b>Graph result:</b> '+(s.analysis?'slope='+s.analysis.slope.toFixed(3)+' mm²/order, λ='+s.analysis.lambda.toFixed(1)+' nm':'not validated')+'.</p>';return U.report('Laboratory Practical 4 — Newton Rings',summary)}
U.tabs();E('order').innerHTML=Array.from({length:12},(_,i)=>'<option>'+(i+1)+'</option>').join('');if(s.analysis){E('studentSlope').value=s.analysis.slope;E('studentLambda').value=s.analysis.lambda}['focus','order','cross'].forEach(id=>E(id).addEventListener('input',draw));E('recordLeft').onclick=()=>record('L');E('recordRight').onclick=()=>record('R');E('checkRingTable').onclick=checkTable;E('checkRingAnalysis').onclick=checkAnalysis;E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();