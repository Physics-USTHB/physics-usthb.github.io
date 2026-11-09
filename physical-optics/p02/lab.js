(()=>{'use strict';
const U=PhysOptUI,E=id=>document.getElementById(id),K='PHYSOPT_P02_v2',LAMBDA=632.8e-9;
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,rows:[],analyses:{young:null,mirrors:null,biprism:null},overall:null,interpretation:''};s.rows=Array.isArray(s.rows)?s.rows:[];s.analyses=s.analyses||{young:null,mirrors:null,biprism:null};s.interpretation=s.interpretation||'';s.montage=s.montage||{device:'',source:'',screen:'',verifiedFor:null};
function save(){U.save(K,s)}
function montageOK(){return s.montage.device===E('device').value&&s.montage.source==='aligned'&&s.montage.screen==='after'&&s.montage.verifiedFor===E('device').value}
function renderMontage(){E('setupDevice').value=s.montage.device||'';E('setupSource').value=s.montage.source||'';E('setupScreen').value=s.montage.screen||'';const ok=montageOK();E('montageMsg').className=ok?'notice ok':'notice';E('montageMsg').textContent=ok?deviceName(E('device').value)+' montage verified; now refine optical alignment.':'Build the montage for the currently selected Young/Fresnel device before aligning its fringes.'}
function verifyMontage(){s.montage.device=E('setupDevice').value;s.montage.source=E('setupSource').value;s.montage.screen=E('setupScreen').value;s.montage.verifiedFor=null;if(s.montage.device!==E('device').value||s.montage.source!=='aligned'||s.montage.screen!=='after'){E('montageMsg').className='notice warn';E('montageMsg').textContent='The mounted device must match the selected method, be illuminated by the source, and have the observation screen after it.';save();return}s.montage.verifiedFor=E('device').value;renderMontage();save()}
function spacingMM(){return LAMBDA*(+E('D').value)/(+E('sep').value*1e-3)*1000}
function shiftMM(){return +E('align').value*3.5}
function deviceName(k){return k==='young'?'Young apertures':k==='mirrors'?'Fresnel mirrors':'Fresnel biprism'}
function draw(){
 const q=U.canvas(E('fringeCanvas')),x=q.x,w=q.w,h=q.h,i=spacingMM(),shift=shiftMM(),X=mm=>w/2+mm/120*w*.90;
 x.fillStyle='#050a12';x.fillRect(0,0,w,h);
 for(let px=0;px<w;px++){const mm=(px-w/2)/(w*.90)*120,ph=2*Math.PI*(mm-shift)/i,envelope=Math.exp(-Math.pow((mm-shift)/52,6)),I=.05+.95*(1+Math.cos(ph))/2*envelope,r=Math.round(255*I),g=Math.round(58*I),b=Math.round(52*I);x.fillStyle='rgb('+r+','+g+','+b+')';x.fillRect(px,0,1,h*.78)}
 const y0=h*.84;x.strokeStyle='#d7e2e8';x.lineWidth=1;x.beginPath();x.moveTo(X(-60),y0);x.lineTo(X(60),y0);x.stroke();x.fillStyle='#d7e2e8';x.font='9px ui-monospace,monospace';x.textAlign='center';
 for(let mm=-60;mm<=60;mm+=2){const xx=X(mm),maj=mm%10===0;x.beginPath();x.moveTo(xx,y0);x.lineTo(xx,y0+(maj?13:7));x.stroke();if(maj)x.fillText(String(mm),xx,y0+25)}
 x.fillText('screen scale / mm',w/2,h-5);
 for(const [id,col] of [['cursor1','#8ff2ff'],['cursor2','#ffd166']]){const xx=X(+E(id).value);x.strokeStyle=col;x.lineWidth=2;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h*.78);x.stroke()}
 x.textAlign='left';x.fillStyle='#fff';x.font='700 12px system-ui';x.fillText(deviceName(E('device').value)+' · D='+Number(E('D').value).toFixed(1)+' m · a='+Number(E('sep').value).toFixed(2)+' mm',14,20);
}
function record(){
 if(!montageOK()){E('msg').className='notice warn';E('msg').textContent='Verify the selected interference montage before measuring fringes.';return}
 if(Math.abs(+E('align').value)>.6){E('msg').className='notice warn';E('msg').textContent='The coherent beams are not centred well enough. Reduce the alignment error before measuring.';return}
 const i=spacingMM(),shift=shiftMM(),x1=+E('cursor1').value,x2=+E('cursor2').value;if(x2<=x1){E('msg').className='notice warn';E('msg').textContent='Place cursor 2 to the right of cursor 1.';return}
 const n1=Math.round((x1-shift)/i),n2=Math.round((x2-shift)/i),b1=shift+n1*i,b2=shift+n2*i,tol=Math.max(.08,Math.min(.18,i*.05));
 if(Math.abs(x1-b1)>tol||Math.abs(x2-b2)>tol){E('msg').className='notice warn';E('msg').textContent='Place each cursor on the centre of a bright fringe before reading the scale.';return}
 if(n2-n1!==10){E('msg').className='notice warn';E('msg').textContent='The two selected bright fringes must be exactly ten interfringes apart.';return}
 const span=x2-x1,sSpan=+E('studentTen').value,sLam=+E('studentLambda').value;if(!Number.isFinite(sSpan)||!Number.isFinite(sLam)||sSpan<=0||sLam<=0){E('msg').className='notice warn';E('msg').textContent='Enter your ten-fringe span and calculated wavelength.';return}
 if(Math.abs(sSpan-span)>.035){E('msg').className='notice warn';E('msg').textContent='Subtract the two screen-cursor readings to obtain 10i.';return}
 const lam=(sSpan/1000/10)*(+E('sep').value*1e-3)/(+E('D').value)*1e9;if(Math.abs(sLam-lam)>.8){E('msg').className='notice warn';E('msg').textContent='Recalculate λ=(10i/10)·a/D with all lengths converted consistently.';return}
 const row={dev:E('device').value,D:+E('D').value,a:+E('sep').value,x1,x2,ten:sSpan,lam:sLam},key=row.dev+'|'+row.D.toFixed(1)+'|'+row.a.toFixed(2),k=s.rows.findIndex(q=>q.key===key);row.key=key;if(k>=0)s.rows[k]=row;else s.rows.push(row);s.analyses[row.dev]=null;s.overall=null;
 E('studentTen').value='';E('studentLambda').value='';E('msg').className='notice ok';E('msg').textContent='Ten-fringe measurement accepted. Change D or effective separation before repeating this device, then complete all three methods.';render();save();
}
function rowsFor(dev){return s.rows.filter(q=>q.dev===dev)}
function enough(dev){const a=rowsFor(dev);return a.length>=2&&new Set(a.map(q=>q.D.toFixed(1)+'|'+q.a.toFixed(2))).size>=2}
function expectedDevice(dev){const a=rowsFor(dev);if(!enough(dev))return null;const vals=a.map(q=>q.lam),mean=vals.reduce((x,y)=>x+y,0)/vals.length,spread=(Math.max(...vals)-Math.min(...vals))/mean*100;return{mean,spread}}
function loadDeviceFields(){const a=s.analyses[E('analysisDevice').value];E('studentMean').value=a?a.mean:'';E('studentSpread').value=a?a.spread:''}
function checkDevice(){
 const dev=E('analysisDevice').value,e=expectedDevice(dev);if(!e){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Record at least two distinct D/a geometries for '+deviceName(dev)+' first.';return}
 const mean=+E('studentMean').value,spread=+E('studentSpread').value;if(!Number.isFinite(mean)||!Number.isFinite(spread)||mean<=0||spread<0){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Enter the mean wavelength and relative max–min spread.';return}
 if(Math.abs(mean-e.mean)>.25){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Average the accepted wavelength values for the selected device.';return}
 if(Math.abs(spread-e.spread)>.08){E('analysisMsg').className='notice warn';E('analysisMsg').textContent='Recalculate 100(λmax−λmin)/mean λ.';return}
 s.analyses[dev]={mean,spread};s.overall=null;E('analysisMsg').className='notice ok';E('analysisMsg').textContent=deviceName(dev)+' analysis accepted.';render();save();
}
function checkOverall(){
 const vals=['young','mirrors','biprism'].map(k=>s.analyses[k]?.mean);if(vals.some(v=>!Number.isFinite(v))){E('overallMsg').className='notice warn';E('overallMsg').textContent='Validate the mean wavelength for all three devices first.';return}
 const eMean=vals.reduce((a,b)=>a+b,0)/3,eDiff=Math.max(...vals)-Math.min(...vals),mean=+E('studentOverall').value,diff=+E('studentDeviceDiff').value;if(!Number.isFinite(mean)||!Number.isFinite(diff)||mean<=0||diff<0){E('overallMsg').className='notice warn';E('overallMsg').textContent='Enter the overall mean and maximum difference among the three device means.';return}
 if(Math.abs(mean-eMean)>.25||Math.abs(diff-eDiff)>.25){E('overallMsg').className='notice warn';E('overallMsg').textContent='Recalculate the mean of the three device means and their max–min difference.';return}
 s.overall={mean,diff};E('overallMsg').className='notice ok';E('overallMsg').textContent='Three-method wavelength comparison accepted.';render();save();
}
function render(){
 draw();E('body').innerHTML=s.rows.length?s.rows.map(q=>'<tr><td>'+deviceName(q.dev)+'</td><td>'+q.D.toFixed(1)+'</td><td>'+q.a.toFixed(2)+'</td><td>'+q.x1.toFixed(2)+'</td><td>'+q.x2.toFixed(2)+'</td><td>'+q.ten.toFixed(2)+'</td><td>'+q.lam.toFixed(1)+'</td></tr>').join(''):'<tr><td colspan="7">No validated ten-fringe measurements yet.</td></tr>';
 for(const [dev,id] of [['young','youngCount'],['mirrors','mirrorCount'],['biprism','biprismCount']])E(id).textContent=rowsFor(dev).length+' / 2';
 E('youngOut').textContent=s.analyses.young?s.analyses.young.mean.toFixed(1)+' nm':'—';E('mirrorOut').textContent=s.analyses.mirrors?s.analyses.mirrors.mean.toFixed(1)+' nm':'—';E('biprismOut').textContent=s.analyses.biprism?s.analyses.biprism.mean.toFixed(1)+' nm':'—';E('overallOut').textContent=s.overall?s.overall.mean.toFixed(1)+' nm':'—';E('deviceDiffOut').textContent=s.overall?s.overall.diff.toFixed(1)+' nm':'—';
 const n=Object.values(s.analyses).filter(Boolean).length,words=s.interpretation.trim().length>=60;E('progress').innerHTML='<div class="item '+(n===3?'done':'')+'">'+(n===3?'✓':'○')+' three device analyses ('+n+'/3)</div><div class="item '+(s.overall?'done':'')+'">'+(s.overall?'✓':'○')+' cross-method comparison</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' uncertainty interpretation</div>';
}
function buildReport(){const a=s.analyses,summary='<p><b>Montage status:</b> '+(s.montage.verifiedFor?deviceName(s.montage.verifiedFor)+' last verified':'none verified')+'.</p>'+'<p><b>Validated measurements:</b> '+s.rows.length+'.</p><p><b>Young:</b> '+(a.young?a.young.mean.toFixed(1)+' nm':'pending')+' · <b>Fresnel mirrors:</b> '+(a.mirrors?a.mirrors.mean.toFixed(1)+' nm':'pending')+' · <b>Biprism:</b> '+(a.biprism?a.biprism.mean.toFixed(1)+' nm':'pending')+'.</p><p><b>Overall:</b> '+(s.overall?s.overall.mean.toFixed(1)+' nm; device max–min='+s.overall.diff.toFixed(1)+' nm':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 2 — Young & Fresnel Interference',summary)}
U.tabs();renderMontage();E('verifyMontage').onclick=verifyMontage;['setupDevice','setupSource','setupScreen'].forEach(id=>E(id).addEventListener('change',e=>{const map={setupDevice:'device',setupSource:'source',setupScreen:'screen'};s.montage[map[id]]=e.target.value;s.montage.verifiedFor=null;renderMontage();save()}));E('interpretation').value=s.interpretation;if(s.overall){E('studentOverall').value=s.overall.mean;E('studentDeviceDiff').value=s.overall.diff}['device','D','sep','align','cursor1','cursor2'].forEach(id=>E(id).addEventListener('input',()=>{E('studentTen').value='';E('studentLambda').value='';if(id==='device'){s.montage.verifiedFor=null;renderMontage();save()}draw()}));E('measure').onclick=record;E('analysisDevice').addEventListener('change',loadDeviceFields);E('checkDeviceAnalysis').onclick=checkDevice;E('checkOverall').onclick=checkOverall;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);loadDeviceFields();window.addEventListener('resize',render);render();save();
})();