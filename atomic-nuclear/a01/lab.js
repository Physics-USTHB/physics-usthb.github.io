(()=>{'use strict';
const U=AtomicUI,E=id=>document.getElementById(id),K='ATOMIC_A01_v2';
function makeRun(){return{id:'A01-'+Math.random().toString(36).slice(2,7).toUpperCase(),axis:20+Math.random()*140,P0:1.65+Math.random()*.35,Pmin:.025+Math.random()*.025,phase:Math.random()*8}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),rows:[],analysis:null,interpretation:''};s.rows=Array.isArray(s.rows)?s.rows:[];s.interpretation=s.interpretation||'';
const rad=d=>d*Math.PI/180;
function power(){
 const a=+E('angle').value,r=s.run,stable=E('laserState').value==='warm'?1:.82,zero=E('meterZero').value==='yes'?0:.045,base=stable*(r.Pmin+r.P0*Math.cos(rad(a-r.axis))**2)+zero,noise=.004*Math.sin(a*.43+r.phase);return Math.max(0,base+noise);
}
function draw(){
 const q=U.canvas(E('laserCanvas')),x=q.x,w=q.w,h=q.h,P=power();x.fillStyle='#080f12';x.fillRect(0,0,w,h);x.strokeStyle='#ff584d';x.lineWidth=6;x.beginPath();x.moveTo(35,h/2);x.lineTo(w-55,h/2);x.stroke();x.save();x.translate(w*.55,h/2);x.rotate(rad(+E('angle').value));x.strokeStyle='#dce7ed';x.lineWidth=4;x.beginPath();x.moveTo(0,-75);x.lineTo(0,75);x.stroke();x.restore();x.fillStyle='rgba(255,210,110,'+Math.min(1,.15+P/2)+')';x.beginPath();x.arc(w*.86,h/2,25+35*Math.min(1,P/2),0,Math.PI*2);x.fill();E('powerRead').value=P.toFixed(3)+' mW';
}
function clearEntry(){E('studentPower').value='';E('studentAngle').value=''}
function rec(){
 if(E('laserState').value!=='warm'||E('meterZero').value!=='yes'){E('msg').className='notice warn';E('msg').textContent='Warm the laser and zero the power meter before recording.';return}
 const a=+E('angle').value,P=+E('studentPower').value,sa=+E('studentAngle').value,truth=power();if(!Number.isFinite(P)||!Number.isFinite(sa)||P<0){E('msg').className='notice warn';E('msg').textContent='Read and enter the analyser angle and power-meter value.';return}
 if(Math.abs(sa-a)>.11){E('msg').className='notice warn';E('msg').textContent='Use the analyser angular scale reading.';return}
 if(Math.abs(P-truth)>.009){E('msg').className='notice warn';E('msg').textContent='Re-read the power meter to the displayed resolution.';return}
 const row={a:sa,P},i=s.rows.findIndex(q=>q.a===row.a);if(i>=0)s.rows[i]=row;else s.rows.push(row);s.rows.sort((a,b)=>a.a-b.a);s.analysis=null;clearEntry();E('msg').className='notice ok';E('msg').textContent='Power reading accepted. Continue the 0–180° analyser scan.';render();save();
}
function coverage(){return s.rows.length>=13&&s.rows[0]?.a<=10&&s.rows.at(-1)?.a>=170}
function fitAt(axis){
 const pts=s.rows.map(q=>({x:Math.cos(rad(q.a-axis))**2,y:q.P})),f=U.fit(pts);let sse=0;for(const p of pts)sse+=(p.y-(f.a+f.b*p.x))**2;return{axis,a:f.a,b:f.b,sse}
}
function expected(){
 if(!coverage())return null;let best=null;for(let a=0;a<180;a+=.2){const q=fitAt(a);if(!best||q.sse<best.sse)best=q}const pmin=best.a,pmax=best.a+best.b,dolp=(pmax-pmin)/(pmax+pmin);return{axis:best.axis,pmin,pmax,dolp}
}
function angleDiff(a,b){let d=Math.abs(a-b)%180;return Math.min(d,180-d)}
function checkAnalysis(){
 const e=expected();if(!e){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Record at least 13 angles spanning nearly the full 0–180° range first.';return}
 const axis=+E('studentAxis').value,pmax=+E('studentPmax').value,pmin=+E('studentPmin').value,dolp=+E('studentDolp').value;if([axis,pmax,pmin,dolp].some(v=>!Number.isFinite(v))||pmax<=0||pmin<0||dolp<0||dolp>1){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter θ₀, Pmax, Pmin and degree of linear polarisation.';return}
 if(angleDiff(axis,e.axis)>2.5){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Fit the Malus curve or locate its symmetry axis more carefully.';return}
 if(Math.abs(pmax-e.pmax)>.018||Math.abs(pmin-e.pmin)>.012){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Use the fitted Malus maximum and finite extinction floor, not just an arbitrary single point.';return}
 const ed=(pmax-pmin)/(pmax+pmin);if(Math.abs(dolp-ed)>.008){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate DoLP=(Pmax−Pmin)/(Pmax+Pmin).';return}
 s.analysis={axis,pmax,pmin,dolp};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Power–polarisation correlation accepted.';render();save();
}
function render(){
 draw();E('body').innerHTML=s.rows.length?s.rows.map(q=>'<tr><td>'+q.a.toFixed(1)+'</td><td>'+q.P.toFixed(3)+'</td></tr>').join(''):'<tr><td colspan="2">No accepted power readings yet.</td></tr>';E('pointCount').textContent=s.rows.length+' / 13';E('angleSpan').textContent=s.rows.length?(s.rows[0].a.toFixed(0)+'–'+s.rows.at(-1).a.toFixed(0)+'°'):'—';
 if(s.rows.length>=2)U.plot(E('chart'),[{pts:s.rows.map(q=>({x:q.a,y:q.P}))}],{xlabel:'analyser angle / °',ylabel:'power / mW',xmin:0,xmax:180,ymin:0});else{const q=U.canvas(E('chart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record a broad analyser scan.',q.w/2,q.h/2)}
 E('axisOut').textContent=s.analysis?s.analysis.axis.toFixed(1)+'°':'—';E('pmaxOut').textContent=s.analysis?s.analysis.pmax.toFixed(3)+' mW':'—';E('pminOut').textContent=s.analysis?s.analysis.pmin.toFixed(3)+' mW':'—';E('dolpOut').textContent=s.analysis?s.analysis.dolp.toFixed(3):'—';
 const words=s.interpretation.trim().length>=50;E('progress').innerHTML='<div class="item '+(s.analysis?'done':'')+'">'+(s.analysis?'✓':'○')+' Malus power–polarisation analysis</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' physical interpretation</div>';
}
function buildReport(){const a=s.analysis,summary='<p><b>Accepted power points:</b> '+s.rows.length+'.</p><p><b>Polarisation result:</b> '+(a?'θ₀='+a.axis.toFixed(1)+'°, Pmax='+a.pmax.toFixed(3)+' mW, Pmin='+a.pmin.toFixed(3)+' mW, DoLP='+a.dolp.toFixed(3):'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 1 — He–Ne Laser: Power & Polarisation',summary)}
U.tabs();E('interpretation').value=s.interpretation;if(s.analysis){E('studentAxis').value=s.analysis.axis;E('studentPmax').value=s.analysis.pmax;E('studentPmin').value=s.analysis.pmin;E('studentDolp').value=s.analysis.dolp}['angle','laserState','meterZero'].forEach(el=>E(el).addEventListener('input',()=>{clearEntry();draw()}));E('record').onclick=rec;E('checkAnalysis').onclick=checkAnalysis;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();