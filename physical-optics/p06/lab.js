(()=>{'use strict';
const U=PhysOptUI,E=id=>document.getElementById(id),K='PHYSOPT_P06_v2',KNOWN=[['blue',435.8,'#4b73e8'],['green',546.1,'#59d66f'],['yellow',589.3,'#f0cd4d']];
function makeRun(){const dens=[500,600][Math.floor(Math.random()*2)],unknown=[486.1,623.8][Math.floor(Math.random()*2)];return{id:'P06-'+Math.random().toString(36).slice(2,7).toUpperCase(),density:dens,unknown}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),pending:{},ready:null,rows:[],densityAnalysis:null,unknownAnalysis:null,interpretation:''};s.rows=Array.isArray(s.rows)?s.rows:[];s.pending=s.pending||{};s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function lambdaNm(){return E('mode').value==='unknownlambda'?s.run.unknown:+E('line').value}
function thetaDeg(){const d=1/(s.run.density*1000),v=(+E('order').value)*lambdaNm()*1e-9/d;return v<1?Math.asin(v)*180/Math.PI:null}
function currentColor(){if(E('mode').value==='unknownlambda')return s.run.unknown<550?'#5da4ff':'#e66d4d';return KNOWN.find(q=>String(q[1])===E('line').value)?.[2]||'#fff'}
function draw(){
 const q=U.canvas(E('gratingCanvas')),x=q.x,w=q.w,h=q.h,t=thetaDeg();x.fillStyle='#050a12';x.fillRect(0,0,w,h);x.strokeStyle='#d8e4ef';x.lineWidth=3;x.beginPath();x.moveTo(w/2,30);x.lineTo(w/2,h-30);x.stroke();
 if(t!=null){[-1,1].forEach(sg=>{const xx=w/2+sg*t/75*w*.44;x.strokeStyle=currentColor();x.lineWidth=5;x.beginPath();x.moveTo(w/2,h*.78);x.lineTo(xx,h*.24);x.stroke()})}
 const telx=w/2+(+E('angle').value/75)*w*.44;x.strokeStyle='#ff6a78';x.lineWidth=2;x.beginPath();x.moveTo(telx,20);x.lineTo(telx,h-20);x.stroke();
 x.fillStyle='#c8dbe5';x.font='700 12px system-ui';x.fillText('order m='+E('order').value+(t==null?' · unavailable':' · symmetric maxima'),14,20);
}
function syncMode(){
 const unknown=E('mode').value==='unknownlambda';if(unknown){E('line').innerHTML='<option value="unknown">unknown source line</option>';E('resultLabel').firstChild.nodeValue='Your wavelength λ / nm';}
 else{E('line').innerHTML=KNOWN.map(q=>'<option value="'+q[1]+'">'+q[0]+' '+q[1].toFixed(1)+' nm</option>').join('');E('resultLabel').firstChild.nodeValue='Your grating density / lines·mm⁻¹';}
 s.ready=null;E('studentTheta').value='';E('studentResult').value='';E('msg').className='notice';E('msg').textContent=unknown?(s.densityAnalysis?'Use the calibrated grating and measure the unknown line in multiple orders.':'Calibrate the grating with known wavelengths before switching to the unknown line.'):'Centre the telescope on matching left/right known-line maxima, then calculate θ and the grating density.';draw();
}
function rec(side){
 if(s.ready){E('msg').className='notice warn';E('msg').textContent='Finish the current symmetric-pair calculation before starting another pair.';return}
 if(E('mode').value==='unknownlambda'&&!s.densityAnalysis){E('msg').className='notice warn';E('msg').textContent='Validate the grating-density calibration first.';return}
 const t=thetaDeg();if(t==null){E('msg').className='notice warn';E('msg').textContent='This diffraction order is not physically available for the selected wavelength/grating.';return}
 const target=side==='L'?-t:t;if(Math.abs(+E('angle').value-target)>.10){E('msg').className='notice warn';E('msg').textContent='Telescope is not centred on the '+(side==='L'?'left':'right')+' spectral maximum.';return}
 const key=E('mode').value+'|'+E('order').value+'|'+E('line').value,p=s.pending[key]||(s.pending[key]={mode:E('mode').value,m:+E('order').value,line:E('line').value});p[side]=+E('angle').value;
 if(p.L!=null&&p.R!=null){s.ready={...p,key};delete s.pending[key];E('studentTheta').value='';E('studentResult').value='';E('msg').className='notice ok';E('msg').textContent='Symmetric angular pair recorded. Calculate θ=|θR−θL|/2 and the requested grating/wavelength result.';}
 else{E('msg').className='notice ok';E('msg').textContent=(side==='L'?'Left':'Right')+' reading stored. Centre the same order on the opposite side.'}save();render();
}
function finalize(){
 const p=s.ready;if(!p){E('msg').className='notice warn';E('msg').textContent='Record both sides of one spectral order first.';return}
 const th=+E('studentTheta').value,res=+E('studentResult').value,eTh=Math.abs(p.R-p.L)/2;if(!Number.isFinite(th)||!Number.isFinite(res)||th<=0||res<=0){E('msg').className='notice warn';E('msg').textContent='Enter the symmetric angle and requested calculated result.';return}
 if(Math.abs(th-eTh)>.025){E('msg').className='notice warn';E('msg').textContent='Recalculate θ=|θR−θL|/2 from your two telescope readings.';return}
 let expected;
 if(p.mode==='knownlambda'){const lam=+p.line*1e-9;expected=Math.sin(th*Math.PI/180)/(p.m*lam)/1000;if(Math.abs(res-expected)>Math.max(.8,.004*expected)){E('msg').className='notice warn';E('msg').textContent='Use d sinθ=mλ, then convert 1/d from lines/m to lines/mm.';return}}
 else{const dens=s.densityAnalysis.mean,d=1/(dens*1000);expected=d*Math.sin(th*Math.PI/180)/p.m*1e9;if(Math.abs(res-expected)>1.0){E('msg').className='notice warn';E('msg').textContent='Use your accepted grating density to calculate λ=d sinθ/m.';return}}
 const row={mode:p.mode,m:p.m,line:p.line,L:p.L,R:p.R,theta:th,result:res},key=p.mode+'|'+p.m+'|'+p.line,k=s.rows.findIndex(q=>q.key===key);row.key=key;if(k>=0)s.rows[k]=row;else s.rows.push(row);
 if(p.mode==='knownlambda'){s.densityAnalysis=null;s.unknownAnalysis=null;s.rows=s.rows.filter(q=>q.mode!=='unknownlambda');}else s.unknownAnalysis=null;s.ready=null;E('studentTheta').value='';E('studentResult').value='';E('msg').className='notice ok';E('msg').textContent='Symmetric-pair calculation accepted.';render();save();
}
function knownRows(){return s.rows.filter(q=>q.mode==='knownlambda')}
function unknownRows(){return s.rows.filter(q=>q.mode==='unknownlambda')}
function calcStats(vals){const mean=vals.reduce((a,b)=>a+b,0)/vals.length,spread=100*(Math.max(...vals)-Math.min(...vals))/mean;return{mean,spread}}
function checkDensity(){
 const r=knownRows(),diverse=new Set(r.map(q=>q.m+'|'+q.line)).size;if(r.length<3||diverse<3||new Set(r.map(q=>q.m)).size<2){E('densityMsg').className='notice warn';E('densityMsg').textContent='Record at least three known-line/order pairs spanning at least two diffraction orders.';return}
 const e=calcStats(r.map(q=>q.result)),mean=+E('studentDensityMean').value,spread=+E('studentDensitySpread').value;if(!Number.isFinite(mean)||!Number.isFinite(spread)||mean<=0||spread<0){E('densityMsg').className='notice warn';E('densityMsg').textContent='Enter mean grating density and relative spread.';return}
 if(Math.abs(mean-e.mean)>.25||Math.abs(spread-e.spread)>.08){E('densityMsg').className='notice warn';E('densityMsg').textContent='Average the accepted density values and calculate 100(max−min)/mean.';return}
 s.densityAnalysis={mean,spread};s.rows=s.rows.filter(q=>q.mode!=='unknownlambda');s.unknownAnalysis=null;E('densityMsg').className='notice ok';E('densityMsg').textContent='Grating calibration accepted. You may now determine the unknown wavelength.';render();save();
}
function checkUnknown(){
 if(!s.densityAnalysis){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Validate the grating calibration first.';return}
 const r=unknownRows();if(r.length<2||new Set(r.map(q=>q.m)).size<2){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Measure the unknown spectral line in at least two physically available orders.';return}
 const e=calcStats(r.map(q=>q.result)),mean=+E('studentUnknownMean').value,spread=+E('studentUnknownSpread').value;if(!Number.isFinite(mean)||!Number.isFinite(spread)||mean<=0||spread<0){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Enter mean unknown wavelength and relative spread.';return}
 if(Math.abs(mean-e.mean)>.25||Math.abs(spread-e.spread)>.08){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Average the accepted unknown-wavelength values and calculate their relative spread.';return}
 s.unknownAnalysis={mean,spread};E('unknownMsg').className='notice ok';E('unknownMsg').textContent='Unknown wavelength determination accepted.';render();save();
}
function render(){
 draw();const kr=knownRows(),ur=unknownRows();E('knownCount').textContent=kr.length+' / 3';E('unknownCount').textContent=ur.length+' / 2';
 E('body').innerHTML=s.rows.length?s.rows.map(q=>'<tr><td>'+(q.mode==='knownlambda'?'calibration':'unknown λ')+'</td><td>'+q.m+'</td><td>'+(q.mode==='knownlambda'?Number(q.line).toFixed(1)+' nm':'unknown')+'</td><td>'+q.L.toFixed(2)+'</td><td>'+q.R.toFixed(2)+'</td><td>'+q.theta.toFixed(2)+'</td><td>'+q.result.toFixed(1)+' '+(q.mode==='knownlambda'?'lines/mm':'nm')+'</td></tr>').join(''):'<tr><td colspan="7">No completed symmetric pairs yet.</td></tr>';
 E('densityOut').textContent=s.densityAnalysis?s.densityAnalysis.mean.toFixed(1)+' lines/mm':'—';E('densitySpreadOut').textContent=s.densityAnalysis?s.densityAnalysis.spread.toFixed(2)+'%':'—';E('lambdaOut').textContent=s.unknownAnalysis?s.unknownAnalysis.mean.toFixed(1)+' nm':'—';E('lambdaSpreadOut').textContent=s.unknownAnalysis?s.unknownAnalysis.spread.toFixed(2)+'%':'—';
 const words=s.interpretation.trim().length>=60;E('progress').innerHTML='<div class="item '+(s.densityAnalysis?'done':'')+'">'+(s.densityAnalysis?'✓':'○')+' grating calibration</div><div class="item '+(s.unknownAnalysis?'done':'')+'">'+(s.unknownAnalysis?'✓':'○')+' unknown wavelength</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' angular/order interpretation</div>';
}
function buildReport(){const summary='<p><b>Run:</b> '+U.esc(s.run.id)+'. <b>Known-line pairs:</b> '+knownRows().length+'; <b>unknown-line pairs:</b> '+unknownRows().length+'.</p><p><b>Grating density:</b> '+(s.densityAnalysis?s.densityAnalysis.mean.toFixed(1)+' lines/mm; spread '+s.densityAnalysis.spread.toFixed(2)+'%':'not validated')+'. <b>Unknown wavelength:</b> '+(s.unknownAnalysis?s.unknownAnalysis.mean.toFixed(1)+' nm; spread '+s.unknownAnalysis.spread.toFixed(2)+'%':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 6 — Diffraction Gratings',summary)}
function loadAnalysisFields(){if(s.densityAnalysis){E('studentDensityMean').value=s.densityAnalysis.mean;E('studentDensitySpread').value=s.densityAnalysis.spread}if(s.unknownAnalysis){E('studentUnknownMean').value=s.unknownAnalysis.mean;E('studentUnknownSpread').value=s.unknownAnalysis.spread}}
U.tabs();E('interpretation').value=s.interpretation;E('mode').addEventListener('change',()=>{syncMode();render()});['order','angle','line'].forEach(id=>E(id).addEventListener('input',draw));E('recordLeft').onclick=()=>rec('L');E('recordRight').onclick=()=>rec('R');E('finalizePair').onclick=finalize;E('checkDensity').onclick=checkDensity;E('checkUnknown').onclick=checkUnknown;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);loadAnalysisFields();syncMode();window.addEventListener('resize',render);render();save();
})();