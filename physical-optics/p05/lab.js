(()=>{'use strict';
const U=PhysOptUI,E=id=>document.getElementById(id),K='PHYSOPT_P05_v2',LAM=632.8e-9;
function makeRun(){return{id:'P05-'+Math.random().toString(36).slice(2,7).toUpperCase(),aSingle:.14+Math.random()*.08,aDouble:.12+Math.random()*.08,d:.45+Math.random()*.20}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),rows:[],analysis:null,interpretation:''};s.rows=Array.isArray(s.rows)?s.rows:[];s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function sinc(z){return Math.abs(z)<1e-9?1:Math.sin(z)/z}
function params(){return E('aperture').value==='single'?{a:s.run.aSingle,d:null}:{a:s.run.aDouble,d:s.run.d}}
function intensityMM(mm){
 const p=params(),xm=mm/1000,th=Math.atan(xm/(+E('D').value)),beta=Math.PI*(p.a*1e-3)*Math.sin(th)/LAM,env=sinc(beta)**2;if(E('aperture').value==='single')return env;const phi=Math.PI*(p.d*1e-3)*Math.sin(th)/LAM;return env*Math.cos(phi)**2;
}
function firstMinMM(){return LAM*(+E('D').value)/(params().a*1e-3)*1000}
function fringeMM(){return E('aperture').value==='double'?LAM*(+E('D').value)/(params().d*1e-3)*1000:null}
function draw(){
 const q=U.canvas(E('diffCanvas')),x=q.x,w=q.w,h=q.h,X=mm=>w/2+mm/120*w*.90;x.fillStyle='#050a12';x.fillRect(0,0,w,h);
 for(let px=0;px<w;px++){const mm=(px-w/2)/(w*.90)*120,val=intensityMM(mm),r=Math.round(255*Math.min(1,.05+val)),g=Math.round(58*Math.min(1,.05+val)),b=Math.round(50*Math.min(1,.05+val));x.fillStyle='rgb('+r+','+g+','+b+')';x.fillRect(px,0,1,h*.77)}
 const y=h*.83;x.strokeStyle='#d9e2e8';x.beginPath();x.moveTo(X(-60),y);x.lineTo(X(60),y);x.stroke();x.fillStyle='#d9e2e8';x.font='9px ui-monospace,monospace';x.textAlign='center';
 for(let mm=-60;mm<=60;mm+=2){const xx=X(mm),maj=mm%10===0;x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+(maj?13:7));x.stroke();if(maj)x.fillText(String(mm),xx,y+24)}x.fillText('screen / mm',w/2,h-5);
 for(const [id,col] of [['cursor1','#6ff0ff'],['cursor2','#ffd166']]){const xx=X(+E(id).value);x.strokeStyle=col;x.lineWidth=2;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h*.77);x.stroke()}
 x.textAlign='left';x.fillStyle='#fff';x.font='700 12px system-ui';x.fillText((E('aperture').value==='single'?'unknown single slit':'unknown double slit')+' · D='+Number(E('D').value).toFixed(1)+' m',14,20);
}
function rowFor(ap,D){return s.rows.find(q=>q.ap===ap&&Math.abs(q.D-D)<1e-9)}
function ensureRow(ap,D){let r=rowFor(ap,D);if(!r){r={ap,D,x1:null,ten:null,a:null,d:null};s.rows.push(r)}return r}
function recordMin(){
 const target=firstMinMM(),x=Math.abs(+E('cursor1').value);if(Math.abs(x-target)>.16){E('msg').className='notice warn';E('msg').textContent='Cursor x₁ is not on the first dark minimum of the diffraction envelope.';return}
 const sx=+E('studentMin').value,sa=+E('studentA').value;if(!Number.isFinite(sx)||!Number.isFinite(sa)||sx<=0||sa<=0){E('msg').className='notice warn';E('msg').textContent='Read |x₁| from the screen scale and calculate the slit width.';return}
 if(Math.abs(sx-x)>.035){E('msg').className='notice warn';E('msg').textContent='Re-read the first-minimum distance from the centre of the pattern.';return}
 const calc=LAM*(+E('D').value)/(sx/1000)*1000;if(Math.abs(sa-calc)>.004){E('msg').className='notice warn';E('msg').textContent='Recalculate a=λD/x₁, converting metres and millimetres consistently.';return}
 const r=ensureRow(E('aperture').value,+E('D').value);r.x1=sx;r.a=sa;s.analysis=null;E('studentMin').value='';E('studentA').value='';E('msg').className='notice ok';E('msg').textContent='First-minimum measurement accepted. Repeat at a different D; in double-slit mode also measure ten fine fringes.';render();save();
}
function recordFringe(){
 if(E('aperture').value!=='double'){E('msg').className='notice warn';E('msg').textContent='Switch to the unknown double slit for an interference-spacing measurement.';return}
 const i=fringeMM(),x1=+E('cursor1').value,x2=+E('cursor2').value;if(x2<=x1){E('msg').className='notice warn';E('msg').textContent='Place cursor 2 to the right of cursor 1.';return}
 const n1=Math.round(x1/i),n2=Math.round(x2/i),b1=n1*i,b2=n2*i,tol=Math.max(.06,Math.min(.14,i*.05));
 if(Math.abs(x1-b1)>tol||Math.abs(x2-b2)>tol){E('msg').className='notice warn';E('msg').textContent='Place both cursors on centres of bright interference fringes.';return}
 if(n2-n1!==10){E('msg').className='notice warn';E('msg').textContent='Use bright fringes exactly ten fine spacings apart.';return}
 const span=x2-x1,ss=+E('studentTenFringe').value,sd=+E('studentDsep').value;if(!Number.isFinite(ss)||!Number.isFinite(sd)||ss<=0||sd<=0){E('msg').className='notice warn';E('msg').textContent='Enter the ten-fringe span and calculated slit separation.';return}
 if(Math.abs(ss-span)>.035){E('msg').className='notice warn';E('msg').textContent='Subtract the two cursor readings to obtain 10i.';return}
 const calc=LAM*(+E('D').value)/((ss/10)/1000)*1000;if(Math.abs(sd-calc)>.006){E('msg').className='notice warn';E('msg').textContent='Recalculate d=λD/i using i=(10i)/10.';return}
 const r=ensureRow('double',+E('D').value);r.ten=ss;r.d=sd;s.analysis=null;E('studentTenFringe').value='';E('studentDsep').value='';E('msg').className='notice ok';E('msg').textContent='Double-slit fine-fringe spacing accepted.';render();save();
}
function subsets(){return{singleA:s.rows.filter(q=>q.ap==='single'&&q.a!=null),doubleA:s.rows.filter(q=>q.ap==='double'&&q.a!=null),doubleD:s.rows.filter(q=>q.ap==='double'&&q.d!=null)}}
function meansExpected(){const z=subsets();if(z.singleA.length<2||z.doubleA.length<2||z.doubleD.length<2)return null;const mean=a=>a.reduce((s,q)=>s+q,0)/a.length;return{aS:mean(z.singleA.map(q=>q.a)),aD:mean(z.doubleA.map(q=>q.a)),d:mean(z.doubleD.map(q=>q.d))}}
function checkDimensions(){
 const e=meansExpected();if(!e){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Obtain at least two distinct-D measurements for single-slit width, double-slit width and double-slit separation.';return}
 const aS=+E('meanSingleA').value,aD=+E('meanDoubleA').value,d=+E('meanDoubleD').value;if([aS,aD,d].some(v=>!Number.isFinite(v)||v<=0)){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter the three mean recovered dimensions.';return}
 if(Math.abs(aS-e.aS)>.002||Math.abs(aD-e.aD)>.002||Math.abs(d-e.d)>.003){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Average the accepted dimension determinations for each aperture quantity.';return}
 s.analysis={aSingle:aS,aDouble:aD,d};E('analysisMsg').className='notice ok';E('analysisMsg').textContent='Recovered aperture dimensions accepted.';render();save();
}
function render(){
 draw();const z=subsets();E('singleCount').textContent=z.singleA.length+' / 2';E('doubleWidthCount').textContent=z.doubleA.length+' / 2';E('doubleSepCount').textContent=z.doubleD.length+' / 2';
 E('body').innerHTML=s.rows.length?s.rows.sort((a,b)=>a.D-b.D).map(q=>'<tr><td>'+q.ap+'</td><td>'+q.D.toFixed(1)+'</td><td>'+(q.x1!=null?q.x1.toFixed(2):'—')+'</td><td>'+(q.ten!=null?q.ten.toFixed(2):'—')+'</td><td>'+(q.a!=null?q.a.toFixed(3):'—')+'</td><td>'+(q.d!=null?q.d.toFixed(3):'—')+'</td></tr>').join(''):'<tr><td colspan="6">No accepted diffraction measurements yet.</td></tr>';
 E('aSingleOut').textContent=s.analysis?s.analysis.aSingle.toFixed(3)+' mm':'—';E('aDoubleOut').textContent=s.analysis?s.analysis.aDouble.toFixed(3)+' mm':'—';E('dOut').textContent=s.analysis?s.analysis.d.toFixed(3)+' mm':'—';
 const words=s.interpretation.trim().length>=55;E('progress').innerHTML='<div class="item '+(s.analysis?'done':'')+'">'+(s.analysis?'✓':'○')+' repeated aperture-dimension analysis</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' envelope/fringe interpretation</div>';
}
function newSpecimen(){
 if(s.rows.length&&!confirm('Load a new unknown slit specimen and clear the current measurements?'))return;s={version:2,run:makeRun(),rows:[],analysis:null,interpretation:''};E('interpretation').value='';['studentMin','studentA','studentTenFringe','studentDsep','meanSingleA','meanDoubleA','meanDoubleD'].forEach(id=>E(id).value='');render();save();
}
function buildReport(){const a=s.analysis,summary='<p><b>Run:</b> '+U.esc(s.run.id)+'. <b>Accepted measurement rows:</b> '+s.rows.length+'.</p><p><b>Recovered dimensions:</b> '+(a?'single a='+a.aSingle.toFixed(3)+' mm; double a='+a.aDouble.toFixed(3)+' mm; double d='+a.d.toFixed(3)+' mm':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 5 — Diffraction by Slits',summary)}
U.tabs();E('interpretation').value=s.interpretation;if(s.analysis){E('meanSingleA').value=s.analysis.aSingle;E('meanDoubleA').value=s.analysis.aDouble;E('meanDoubleD').value=s.analysis.d}['aperture','D','cursor1','cursor2'].forEach(id=>E(id).addEventListener('input',()=>{['studentMin','studentA','studentTenFringe','studentDsep'].forEach(k=>E(k).value='');draw()}));E('recordMin').onclick=recordMin;E('recordFringe').onclick=recordFringe;E('newSpecimen').onclick=newSpecimen;E('checkDimensions').onclick=checkDimensions;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();