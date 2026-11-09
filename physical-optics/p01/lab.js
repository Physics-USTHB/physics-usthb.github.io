(()=>{'use strict';
const U=PhysOptUI,E=id=>document.getElementById(id),K='PHYSOPT_P01_v2',DEG=Math.PI/180;
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,rows:[],analysis:{malus:null,state:null},interpretation:''};s.rows=Array.isArray(s.rows)?s.rows:[];s.analysis=s.analysis||{malus:null,state:null};s.interpretation=s.interpretation||'';s.montage=s.montage||{beam:'',pol:'',detector:'',meter:'',verified:false};
function save(){U.save(K,s)}
function montageOK(){const m=s.montage;return m.beam==='sdl'&&m.pol==='pa'&&m.detector==='after'&&m.meter==='meter'}
function renderMontage(){E('setupBeam').value=s.montage.beam||'';E('setupPol').value=s.montage.pol||'';E('setupDetector').value=s.montage.detector||'';E('setupMeter').value=s.montage.meter||'';const ok=s.montage.verified&&montageOK();E('montageMsg').className=ok?'notice ok':'notice';E('montageMsg').textContent=ok?'Optical montage verified. The λ/4 plate can later be inserted between P and A.':'Assemble the source–optics–detector chain before recording detector values.'}
function verifyMontage(){s.montage={beam:E('setupBeam').value,pol:E('setupPol').value,detector:E('setupDetector').value,meter:E('setupMeter').value,verified:false};if(!montageOK()){E('montageMsg').className='notice warn';E('montageMsg').textContent='Recheck the USTHB beam path: source → diaphragm → converging lens → polariser → analyser → photodetector, with the detector connected to the readout.';save();return}s.montage.verified=true;renderMontage();save()}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function stableNoise(){
 const z=Math.sin((+E('ana').value+1)*12.9898+(+E('pol').value+3)*7.312+(+E('plateAngle').value+5)*2.173+(E('plate').value==='in'?9.17:1.3))*43758.5453;return((z-Math.floor(z))-.5)*.008;
}
function idealIntensity(){
 const a=+E('ana').value*DEG,p=+E('pol').value*DEG,bg=.02,scale=.98;if(E('plate').value==='out')return bg+scale*Math.cos(a-p)**2;
 const q=+E('plateAngle').value*DEG,d=p-q,ar=a-q,Ex=Math.cos(d),Ey=Math.sin(d);return bg+scale*((Ex*Math.cos(ar))**2+(Ey*Math.sin(ar))**2);
}
function measuredIntensity(){return clamp(idealIntensity()+stableNoise(),0,1.02)}
function relLinearAngle(row){let d=Math.abs(((row.ana-row.pol)%180+180)%180);return Math.min(d,180-d)}
function qwpFortyFive(row){let d=Math.abs(((row.pol-row.pa)%180+180)%180);d=Math.min(d,180-d);return Math.abs(d-45)<=5}
function draw(){
 const q=U.canvas(E('polCanvas')),x=q.x,w=q.w,h=q.h,I=measuredIntensity();x.fillStyle='#050a12';x.fillRect(0,0,w,h);
 x.strokeStyle='#8d7cff';x.lineWidth=6;x.beginPath();x.moveTo(38,h*.42);x.lineTo(w*.72,h*.42);x.stroke();
 const es=[[w*.22,'P',+E('pol').value],[w*.43,'λ/4',+E('plateAngle').value],[w*.62,'A',+E('ana').value]];es.forEach((e,i)=>{if(i===1&&E('plate').value==='out')return;x.save();x.translate(e[0],h*.42);x.rotate(e[2]*DEG);x.strokeStyle='#d9e3ee';x.lineWidth=4;x.beginPath();x.moveTo(0,-64);x.lineTo(0,64);x.stroke();x.restore();x.fillStyle='#d9e3ee';x.font='12px system-ui';x.fillText(e[1],e[0]-12,h*.68)});
 x.fillStyle='rgba(255,80,70,'+Math.min(1,.13+I)+')';x.beginPath();x.arc(w*.72,h*.42,20+28*I,0,Math.PI*2);x.fill();
 const mx=w*.82,my=h*.28,mw=w*.12,mh=h*.52;x.fillStyle='#eef1e8';x.fillRect(mx,my,mw,mh);x.strokeStyle='#62737b';x.lineWidth=2;x.strokeRect(mx,my,mw,mh);
 x.strokeStyle='#32454e';x.fillStyle='#32454e';x.font='9px ui-monospace,monospace';x.textAlign='right';for(let k=0;k<=10;k++){const yy=my+mh*(1-k/10),major=k%2===0;x.beginPath();x.moveTo(mx+mw-(major?18:10),yy);x.lineTo(mx+mw-3,yy);x.stroke();if(major)x.fillText((k/10).toFixed(1),mx+mw-22,yy+3)}
 const ny=my+mh*(1-I);x.strokeStyle='#b83949';x.lineWidth=3;x.beginPath();x.moveTo(mx+7,ny);x.lineTo(mx+mw-4,ny);x.stroke();x.textAlign='left';x.fillStyle='#9eb8c5';x.font='700 10px system-ui';x.fillText('DETECTOR',mx,my-9);
 drawState();
}
function drawState(){
 const c=E('stateCanvas');if(!c)return;const q=U.canvas(c),x=q.x,w=q.w,h=q.h;x.fillStyle='#fff';x.fillRect(0,0,w,h);const p=+E('pol').value*DEG,qa=+E('plateAngle').value*DEG,d=p-qa,A=Math.abs(Math.cos(d)),B=E('plate').value==='in'?Math.abs(Math.sin(d)):0;
 x.strokeStyle='#6c59be';x.lineWidth=2;x.beginPath();for(let i=0;i<=360;i++){const t=i*DEG,xx=w/2+A*Math.cos(t)*w*.30,yy=h/2-B*Math.sin(t)*h*.30;i?x.lineTo(xx,yy):x.moveTo(xx,yy)}x.stroke();x.fillStyle='#667787';x.font='11px system-ui';x.textAlign='center';x.fillText(E('plate').value==='out'?'linear state':Math.abs(A-B)<.08?'near-circular state':'elliptical state',w/2,h-12);
}
function coverageMalus(){
 const r=s.rows.filter(q=>q.plate==='out'),rels=r.map(relLinearAngle),unique=new Set(r.map(q=>q.ana+'|'+q.pol)).size;return{rows:r,ok:unique>=10&&rels.some(a=>a<=10)&&rels.some(a=>a>=80)};
}
function qwpRows(){return s.rows.filter(q=>q.plate==='in'&&qwpFortyFive(q))}
function record(){
 if(!s.montage.verified||!montageOK()){E('msg').className='notice warn';E('msg').textContent='Verify the optical montage before recording detector readings.';return}
 const v=+E('studentIntensity').value,truth=measuredIntensity();if(!Number.isFinite(v)){E('msg').className='notice warn';E('msg').textContent='Read the detector needle on the 0–1 scale and enter the intensity.';return}
 if(Math.abs(v-truth)>.018){E('msg').className='notice warn';E('msg').textContent='Re-read the analogue detector scale; the needle position does not match the entered value.';return}
 const row={plate:E('plate').value,pol:+E('pol').value,pa:+E('plateAngle').value,ana:+E('ana').value,I:v},k=s.rows.findIndex(q=>q.plate===row.plate&&q.pol===row.pol&&q.pa===row.pa&&q.ana===row.ana);if(k>=0)s.rows[k]=row;else s.rows.push(row);
 if(row.plate==='out')s.analysis.malus=null;if(row.plate==='in'&&qwpFortyFive(row))s.analysis.state=null;E('studentIntensity').value='';E('msg').className='notice ok';E('msg').textContent=row.plate==='out'?'Detector reading stored. Continue the analyser scan through the extinction region and toward 180°.':'λ/4 reading stored. Continue the analyser scan to test modulation.';render();save();
}
function malusExpected(){
 const c=coverageMalus();if(!c.ok)return null;const pts=c.rows.map(q=>({x:Math.cos((q.ana-q.pol)*DEG)**2,y:q.I})),f=U.fit(pts),mx=Math.max(...c.rows.map(q=>q.I)),mn=Math.min(...c.rows.map(q=>q.I));return{pts,slope:f.b,bg:f.a,ext:mx/mn};
}
function checkMalus(){
 const e=malusExpected();if(!e){E('malusMsg').className='notice warn';E('malusMsg').textContent='Build at least ten plate-out readings spanning a transmission maximum, the crossed-polariser extinction region and the return toward a maximum.';return}
 const i0=+E('studentI0').value,bg=+E('studentBg').value,ext=+E('studentExt').value;if([i0,bg,ext].some(v=>!Number.isFinite(v))||i0<=0||bg<0||ext<=1){E('malusMsg').className='notice warn';E('malusMsg').textContent='Enter the fitted slope, intercept and measured extinction ratio.';return}
 if(Math.abs(i0-e.slope)>.018){E('malusMsg').className='notice warn';E('malusMsg').textContent='Fit I against cos²θ and re-read the slope I₀.';return}
 if(Math.abs(bg-e.bg)>.012){E('malusMsg').className='notice warn';E('malusMsg').textContent='Re-read the non-zero intercept of the experimental Malus line.';return}
 if(Math.abs(ext-e.ext)>Math.max(.8,.05*e.ext)){E('malusMsg').className='notice warn';E('malusMsg').textContent='Use the maximum and minimum recorded detector readings to calculate Imax/Imin.';return}
 s.analysis.malus={i0,bg,ext};E('malusMsg').className='notice ok';E('malusMsg').textContent='Malus-law fit accepted. Insert the quarter-wave plate and test the 45° condition.';render();save();
}
function stateExpected(){
 const r=qwpRows();if(r.length<8)return null;const angles=new Set(r.map(q=>q.ana)).size;if(angles<8)return null;const mx=Math.max(...r.map(q=>q.I)),mn=Math.min(...r.map(q=>q.I)),mod=100*(mx-mn)/((mx+mn)/2),state=mod<8?'circular':mod>75?'linear':'elliptical';return{mod,state};
}
function checkState(){
 if(!s.analysis.malus){E('stateMsg').className='notice warn';E('stateMsg').textContent='Validate the Malus-law measurement first.';return}
 const e=stateExpected();if(!e){E('stateMsg').className='notice warn';E('stateMsg').textContent='With the λ/4 plate inserted at 45° to the polariser, record at least eight distinct analyser angles across 0–180°.';return}
 const st=E('studentState').value,mod=+E('studentModulation').value;if(!st||!Number.isFinite(mod)||mod<0){E('stateMsg').className='notice warn';E('stateMsg').textContent='Classify the state and calculate analyser modulation depth.';return}
 if(st!==e.state){E('stateMsg').className='notice warn';E('stateMsg').textContent='Use the observed analyser modulation: near-circular light remains almost angle-independent.';return}
 if(Math.abs(mod-e.mod)>.7){E('stateMsg').className='notice warn';E('stateMsg').textContent='Recalculate modulation depth = 100(Imax−Imin)/[(Imax+Imin)/2].';return}
 s.analysis.state={state:st,mod};E('stateMsg').className='notice ok';E('stateMsg').textContent='Quarter-wave-plate polarisation analysis accepted.';render();save();
}
function render(){
 draw();E('body').innerHTML=s.rows.length?s.rows.map(q=>'<tr><td>'+q.plate+'</td><td>'+q.pol.toFixed(0)+'</td><td>'+(q.plate==='in'?q.pa.toFixed(0):'—')+'</td><td>'+q.ana.toFixed(0)+'</td><td>'+q.I.toFixed(3)+'</td></tr>').join(''):'<tr><td colspan="5">No detector readings yet.</td></tr>';
 const lin=s.rows.filter(q=>q.plate==='out').length,qr=qwpRows().length;E('linearCount').textContent=lin;E('qwpCount').textContent=qr;
 const m=malusExpected();if(m)U.plot(E('malusChart'),[{pts:m.pts}],{xlabel:'cos²θ',ylabel:'measured intensity / a.u.',xmin:0,ymin:0,xmax:1,ymax:1.05});else blankMalus();
 E('i0Out').textContent=s.analysis.malus?s.analysis.malus.i0.toFixed(3):'—';E('bgOut').textContent=s.analysis.malus?s.analysis.malus.bg.toFixed(3):'—';E('extOut').textContent=s.analysis.malus?s.analysis.malus.ext.toFixed(1)+':1':'—';
 E('stateOut').textContent=s.analysis.state?s.analysis.state.state:'—';E('modOut').textContent=s.analysis.state?s.analysis.state.mod.toFixed(1)+'%':'—';
 const words=s.interpretation.trim().length>=55;E('progress').innerHTML='<div class="item '+(s.analysis.malus?'done':'')+'">'+(s.analysis.malus?'✓':'○')+' Malus-law scan and fit</div><div class="item '+(s.analysis.state?'done':'')+'">'+(s.analysis.state?'✓':'○')+' quarter-wave-plate state</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' physical interpretation</div>';
}
function blankMalus(){const q=U.canvas(E('malusChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record a broad plate-out analyser scan to build I versus cos²θ.',q.w/2,q.h/2)}
function buildReport(){
 const a=s.analysis.malus,b=s.analysis.state,summary='<p><b>Optical montage:</b> '+(s.montage.verified&&montageOK()?'verified':'not verified')+'.</p>'+'<p><b>Recorded detector points:</b> '+s.rows.length+'.</p><p><b>Malus analysis:</b> '+(a?'I₀='+a.i0.toFixed(3)+', Ibg='+a.bg.toFixed(3)+', extinction='+a.ext.toFixed(1)+':1':'not validated')+'. <b>λ/4 analysis:</b> '+(b?b.state+', modulation='+b.mod.toFixed(1)+'%':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 1 — Polarisation of Light',summary);
}
U.tabs();renderMontage();E('verifyMontage').onclick=verifyMontage;['setupBeam','setupPol','setupDetector','setupMeter'].forEach(id=>E(id).addEventListener('change',e=>{const map={setupBeam:'beam',setupPol:'pol',setupDetector:'detector',setupMeter:'meter'};s.montage[map[id]]=e.target.value;s.montage.verified=false;renderMontage();save()}));E('interpretation').value=s.interpretation;if(s.analysis.malus){E('studentI0').value=s.analysis.malus.i0;E('studentBg').value=s.analysis.malus.bg;E('studentExt').value=s.analysis.malus.ext}if(s.analysis.state){E('studentState').value=s.analysis.state.state;E('studentModulation').value=s.analysis.state.mod}
['pol','plateAngle','ana'].forEach(id=>E(id).addEventListener('input',()=>{E('studentIntensity').value='';draw()}));E('plate').addEventListener('change',()=>{E('studentIntensity').value='';draw()});E('record').onclick=record;E('checkMalus').onclick=checkMalus;E('checkState').onclick=checkState;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();