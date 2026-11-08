(()=>{'use strict';
const U=SolidUI,E=id=>document.getElementById(id),K='SOLID_S01_v2',LAM=1.5406;
const PROPS={sc:{atoms:1,coord:6,pack:.524,rule:'all'},bcc:{atoms:2,coord:8,pack:.680,rule:'evenSum'},fcc:{atoms:4,coord:12,pack:.740,rule:'sameParity'}};
const RULE_LABEL={all:'all hkl',evenSum:'h+k+l even',sameParity:'h,k,l all odd or all even'};
function makeRun(){return{id:'S01-'+Math.random().toString(36).slice(2,7).toUpperCase(),lat:Math.random()<.5?'bcc':'fcc',a:3.45+Math.random()*1.05,phase:Math.random()*10}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),cells:{},peaks:[],analysis:null,interpretation:''};s.cells=s.cells||{};s.peaks=Array.isArray(s.peaks)?s.peaks:[];s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function allowed(lat,h,k,l){if(lat==='bcc')return(h+k+l)%2===0;return(h%2===k%2)&&(k%2===l%2)}
function representativeHKLs(lat){
 const map=new Map();
 for(let h=0;h<=6;h++)for(let k=0;k<=h;k++)for(let l=0;l<=k;l++){if(h===0&&k===0&&l===0)continue;if(!allowed(lat,h,k,l))continue;const N=h*h+k*k+l*l;if(!map.has(N))map.set(N,{h,k,l,N});}
 return [...map.values()].sort((a,b)=>a.N-b.N);
}
function powderPeaks(){
 const out=[];for(const q of representativeHKLs(s.run.lat)){const d=s.run.a/Math.sqrt(q.N),v=LAM/(2*d);if(v>=1)continue;let tt=2*Math.asin(v)*180/Math.PI;if(tt<20||tt>110)continue;const noise=.035*Math.sin(q.N*1.71+s.run.phase);tt+=noise;out.push({...q,d,tt});if(out.length>=8)break}return out;
}
function setupCell(){
 const q=U.canvas(E('cellCanvas')),x=q.x,w=q.w,h=q.h,ang=+E('rot').value*Math.PI/180,cx=w/2,cy=h/2,sz=Math.min(w,h)*.27;
 function P(X,Y,Z){const xr=(X-.5)*Math.cos(ang)-(Z-.5)*Math.sin(ang),zr=(X-.5)*Math.sin(ang)+(Z-.5)*Math.cos(ang);return{x:cx+xr*sz*1.8,y:cy+(Y-.5)*sz*1.45-zr*sz*.55}}
 const corners=[];for(const X of [0,1])for(const Y of [0,1])for(const Z of [0,1])corners.push([X,Y,Z]);
 x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.strokeStyle='#6a8895';x.lineWidth=2;
 for(const c of corners)for(const v of [[1,0,0],[0,1,0],[0,0,1]]){const d=[c[0]+v[0],c[1]+v[1],c[2]+v[2]];if(d.every(z=>z<=1)){const a=P(...c),b=P(...d);x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()}}
 let atoms=[...corners];if(E('lattice').value==='bcc')atoms.push([.5,.5,.5]);if(E('lattice').value==='fcc')atoms.push([.5,.5,0],[.5,.5,1],[.5,0,.5],[.5,1,.5],[0,.5,.5],[1,.5,.5]);
 for(const a of atoms){const p=P(...a);x.fillStyle='#6ee0b0';x.beginPath();x.arc(p.x,p.y,8,0,Math.PI*2);x.fill()}
 const [hh,kk,ll]=E('plane').value.split('').map(Number),pts=[];if(hh>0)pts.push(P(1/hh,0,0));if(kk>0)pts.push(P(0,1/kk,0));if(ll>0)pts.push(P(0,0,1/ll));
 if(pts.length>=2){x.fillStyle='rgba(226,167,72,.28)';x.strokeStyle='#e2a748';x.lineWidth=2;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p.x,p.y):x.moveTo(p.x,p.y));if(pts.length===3)x.closePath();x.fill();x.stroke()}
}
function clearCellInputs(){['studentAtoms','studentCoord','studentPack'].forEach(id=>E(id).value='');E('studentRule').value=''}
function checkCell(){
 const lat=E('lattice').value,e=PROPS[lat],atoms=+E('studentAtoms').value,coord=+E('studentCoord').value,pack=+E('studentPack').value,rule=E('studentRule').value;
 if(!Number.isInteger(atoms)||!Number.isInteger(coord)||!Number.isFinite(pack)||!rule){E('cellMsg').className='notice warn';E('cellMsg').textContent='Enter atom count, coordination number, packing fraction and reflection rule.';return}
 if(atoms!==e.atoms){E('cellMsg').className='notice warn';E('cellMsg').textContent='Recount the fractional corner/face/body atom contributions to the conventional cell.';return}
 if(coord!==e.coord){E('cellMsg').className='notice warn';E('cellMsg').textContent='Recheck the number of nearest neighbours for this lattice.';return}
 if(Math.abs(pack-e.pack)>.004){E('cellMsg').className='notice warn';E('cellMsg').textContent='Recalculate or recall the atomic packing fraction for the selected cubic lattice.';return}
 if(rule!==e.rule){E('cellMsg').className='notice warn';E('cellMsg').textContent='Recheck the systematic reflection condition for this lattice centring.';return}
 s.cells[lat]={...e};E('cellMsg').className='notice ok';E('cellMsg').textContent='Cell analysis accepted for '+lat.toUpperCase()+'. Compare it with the other cubic lattices.';renderCellResult();save();
}
function renderCellResult(){
 const lat=E('lattice').value,a=s.cells[lat];E('atomsOut').textContent=a?a.atoms:'—';E('coordOut').textContent=a?a.coord:'—';E('packOut').textContent=a?a.pack.toFixed(3):'—';E('ruleOut').textContent=a?RULE_LABEL[a.rule]:'—';
 const n=['sc','bcc','fcc'].filter(k=>s.cells[k]).length;E('cellProgress').innerHTML='<div class="item '+(n===3?'done':'')+'">'+(n===3?'✓':'○')+' cubic-cell analyses '+n+'/3</div>';
}
function drawXrd(){
 const q=U.canvas(E('xrdCanvas')),x=q.x,w=q.w,h=q.h,ps=powderPeaks();x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.strokeStyle='rgba(130,180,175,.16)';for(let k=0;k<=9;k++){const xx=w*k/9;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke()}
 ps.forEach((p,i)=>{const xx=(p.tt-20)/90*w,amp=h*(.68-.052*i);x.strokeStyle='#6ee0b0';x.lineWidth=3;x.beginPath();x.moveTo(xx,h*.86);x.lineTo(xx,h*.86-amp);x.stroke()});
 const cx=(+E('twoTheta').value-20)/90*w;x.strokeStyle='#ff6c78';x.lineWidth=2;x.beginPath();x.moveTo(cx,0);x.lineTo(cx,h);x.stroke();x.fillStyle='#b8d0d7';x.font='700 11px system-ui';x.fillText('unknown cubic powder · Cu Kα',12,18);
}
function clearPeakInputs(){['studentH','studentK','studentL','studentD','studentA'].forEach(id=>E(id).value='')}
function recordPeak(){
 const ps=powderPeaks(),cur=+E('twoTheta').value,p=ps.reduce((a,b)=>Math.abs(a.tt-cur)<Math.abs(b.tt-cur)?a:b);if(Math.abs(p.tt-cur)>.16){E('xrdMsg').className='notice warn';E('xrdMsg').textContent='Centre the 2θ cursor more precisely on a diffraction maximum.';return}
 const h=+E('studentH').value,k=+E('studentK').value,l=+E('studentL').value,d=+E('studentD').value,a=+E('studentA').value;
 if([h,k,l].some(v=>!Number.isInteger(v)||v<0)||!Number.isFinite(d)||!Number.isFinite(a)||d<=0||a<=0){E('xrdMsg').className='notice warn';E('xrdMsg').textContent='Enter integer Miller indices and your calculated d and lattice parameter.';return}
 const N=h*h+k*k+l*l;if(N!==p.N){E('xrdMsg').className='notice warn';E('xrdMsg').textContent='The assigned hkl does not match this peak position in the cubic reflection sequence.';return}
 if(!allowed(s.run.lat,h,k,l)){E('xrdMsg').className='notice warn';E('xrdMsg').textContent='That reflection is systematically absent for the specimen structure.';return}
 const theta=cur/2*Math.PI/180,ed=LAM/(2*Math.sin(theta)),ea=ed*Math.sqrt(N);
 if(Math.abs(d-ed)>.006){E('xrdMsg').className='notice warn';E('xrdMsg').textContent='Recalculate d=λ/(2 sinθ) using θ=(2θ)/2.';return}
 if(Math.abs(a-ea)>.012){E('xrdMsg').className='notice warn';E('xrdMsg').textContent='Recalculate a=d√(h²+k²+l²).';return}
 const row={tt:cur,h,k,l,N,d,a},idx=s.peaks.findIndex(q=>q.N===N);if(idx>=0)s.peaks[idx]=row;else s.peaks.push(row);s.peaks.sort((x,y)=>x.tt-y.tt);s.analysis=null;clearPeakInputs();E('xrdMsg').className='notice ok';E('xrdMsg').textContent='Peak indexed and calculation accepted. Continue through several successive reflections.';renderXrdResults();save();
}
function stats(){if(s.peaks.length<5)return null;const vals=s.peaks.map(q=>q.a),mean=vals.reduce((a,b)=>a+b,0)/vals.length,spread=100*(Math.max(...vals)-Math.min(...vals))/mean;return{mean,spread}}
function checkXrd(){
 const e=stats();if(!e){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Index at least five distinct diffraction peaks first.';return}
 const lat=E('studentStructure').value,mean=+E('studentMeanA').value,spread=+E('studentSpread').value;if(!lat||!Number.isFinite(mean)||!Number.isFinite(spread)||mean<=0||spread<0){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter the structure, mean lattice parameter and relative spread.';return}
 if(lat!==s.run.lat){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Re-examine the allowed N=h²+k²+l² sequence and its systematic absences before choosing BCC/FCC.';return}
 if(Math.abs(mean-e.mean)>.004||Math.abs(spread-e.spread)>.08){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Average the accepted lattice parameters and calculate 100(amax−amin)/mean a.';return}
 s.analysis={lat,mean,spread};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Unknown cubic structure and lattice parameter accepted.';renderXrdResults();save();
}
function renderXrdResults(){
 E('peakBody').innerHTML=s.peaks.length?s.peaks.map(q=>'<tr><td>'+q.tt.toFixed(2)+'</td><td>('+q.h+q.k+q.l+')</td><td>'+q.d.toFixed(3)+'</td><td>'+q.a.toFixed(3)+'</td></tr>').join(''):'<tr><td colspan="4">No indexed peaks yet.</td></tr>';
 E('peakCount').textContent=s.peaks.length+' / 5';E('structureOut').textContent=s.analysis?s.analysis.lat.toUpperCase():'—';E('meanA').textContent=s.analysis?s.analysis.mean.toFixed(3)+' Å':'—';E('spreadOut').textContent=s.analysis?s.analysis.spread.toFixed(2)+'%':'—';
 const cells=['sc','bcc','fcc'].filter(k=>s.cells[k]).length,words=s.interpretation.trim().length>=60;E('overallProgress').innerHTML='<div class="item '+(cells===3?'done':'')+'">'+(cells===3?'✓':'○')+' SC/BCC/FCC cell comparisons</div><div class="item '+(s.analysis?'done':'')+'">'+(s.analysis?'✓':'○')+' unknown powder structure + lattice parameter</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' selection-rule interpretation</div>';
}
function newSpecimen(){if(s.peaks.length&&!confirm('Load a new hidden XRD specimen and clear the current peak analysis?'))return;s.run=makeRun();s.peaks=[];s.analysis=null;['studentStructure','studentMeanA','studentSpread'].forEach(id=>E(id).value='');clearPeakInputs();E('xrdMsg').className='notice';E('xrdMsg').textContent='New unknown cubic powder loaded. Centre the cursor on the first peak and begin indexing.';render();save()}
function buildReport(){const a=s.analysis,summary='<p><b>Cell comparisons validated:</b> '+['sc','bcc','fcc'].filter(k=>s.cells[k]).length+'/3. <b>Indexed peaks:</b> '+s.peaks.length+'.</p><p><b>Unknown specimen:</b> '+(a?a.lat.toUpperCase()+', a='+a.mean.toFixed(3)+' Å, spread='+a.spread.toFixed(2)+'%':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 1 — Crystallography',summary)}
function render(){setupCell();drawXrd();renderCellResult();renderXrdResults()}
U.tabs();E('interpretation').value=s.interpretation;if(s.analysis){E('studentStructure').value=s.analysis.lat;E('studentMeanA').value=s.analysis.mean;E('studentSpread').value=s.analysis.spread}
['lattice','plane','rot'].forEach(id=>E(id).addEventListener('input',()=>{if(id==='lattice')clearCellInputs();setupCell();renderCellResult()}));E('checkCell').onclick=checkCell;E('twoTheta').addEventListener('input',drawXrd);E('recordPeak').onclick=recordPeak;E('newSpecimen').onclick=newSpecimen;E('checkXrdAnalysis').onclick=checkXrd;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;renderXrdResults();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();