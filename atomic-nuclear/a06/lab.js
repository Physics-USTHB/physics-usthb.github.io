(()=>{'use strict';
const U=AtomicUI,E=id=>document.getElementById(id),K='ATOMIC_A06_v2',KNOWN=[['Pu-239',5.157],['Am-241',5.486],['Cm-244',5.805]];
function makeRun(){const choices=[4.784,5.304,6.002];return{id:'A06-'+Math.random().toString(36).slice(2,7).toUpperCase(),offset:28+Math.random()*24,scale:.992+Math.random()*.016,unknown:choices[Math.floor(Math.random()*choices.length)],sigma:5.5+Math.random()*2.0}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),gainLock:null,spectrum:null,peaks:[],cal:null,resolution:null,unknownPeak:null,unknownResult:null,interpretation:''};s.peaks=Array.isArray(s.peaks)?s.peaks:[];s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function center(en,g=s.gainLock??+E('gain').value,p=.03){const loss=p<=.1?0:p<20?18*Math.log10(p/.03):9999;return s.run.offset+g*s.run.scale*en-loss}
function lines(src=E('source').value){return src==='unknown'?[s.run.unknown]:KNOWN.map(q=>q[1])}
function makeSpectrum(src,g,t,p){
 const hist=[],ls=lines(src),high=p<=.1,rough=p>0.1&&p<20;
 for(let ch=0;ch<2048;ch++){let mu=1.2+6*Math.exp(-ch/700);if(high||rough){for(const en of ls){const c=center(en,g,p),sig=s.run.sigma*(high?1:3.2),amp=(high?520:95)*(t/60)*(5.5/en);mu+=amp*Math.exp(-.5*((ch-c)/sig)**2)}}hist.push(U.poisson(Math.max(0,mu)))}return hist;
}
function setup(){const c=E('alphaCanvas'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function draw(){
 const{x,w,h}=setup();x.fillStyle='#06120f';x.fillRect(0,0,w,h);if(s.spectrum){const hist=s.spectrum.hist,max=Math.max(...hist,1);x.strokeStyle='#6ee0b0';x.lineWidth=1.4;x.beginPath();hist.forEach((v,ch)=>{const xx=ch/2047*w,yy=h*.80-v/max*h*.68;ch?x.lineTo(xx,yy):x.moveTo(xx,yy)});x.stroke()}
 const y=h*.84;x.strokeStyle='#a9c5cf';x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke();x.fillStyle='#a9c5cf';x.font='9px ui-monospace,monospace';x.textAlign='center';for(let ch=0;ch<=2000;ch+=250){const xx=ch/2047*w;x.beginPath();x.moveTo(xx,y);x.lineTo(xx,y+7);x.stroke();x.fillText(String(ch),xx,y+18)}
 const ch=+E('cursor').value,xx=ch/2047*w;x.strokeStyle='#ff7180';x.lineWidth=2;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h*.82);x.stroke();E('channelRead').value=String(ch);E('countRead').value=s.spectrum?String(s.spectrum.hist[ch]||0):'—';E('vacuumOut').textContent=+E('pressure').value<=.1?'high vacuum':'not ready';
}
function syncLines(){
 if(E('source').value==='unknown')E('lineSelect').innerHTML='<option value="unknown">unknown alpha peak</option>';else E('lineSelect').innerHTML=KNOWN.map(q=>'<option value="'+q[1]+'">'+q[0]+' · '+q[1].toFixed(3)+' MeV</option>').join('');E('studentPeakCh').value='';draw();
}
function acquire(){
 const src=E('source').value,p=+E('pressure').value,g=+E('gain').value,t=+E('acqTime').value;if(src==='unknown'&&(!s.cal||!s.resolution)){E('msg').className='notice warn';E('msg').textContent='Complete the mixed-source calibration and detector-resolution analysis before the unknown source.';return}
 if(s.gainLock==null&&p<=.1&&src==='mixed')s.gainLock=g;if(s.gainLock!=null&&Math.abs(g-s.gainLock)>1e-9){E('msg').className='notice warn';E('msg').textContent='Return the MCA gain to the locked calibration value '+s.gainLock.toFixed(0)+' channel/MeV.';return}
 s.spectrum={source:src,pressure:p,gain:g,time:t,hist:makeSpectrum(src,g,t,p)};E('msg').className=p<=.1?'notice ok':'notice warn';E('msg').textContent=p<=.1?'Spectrum acquired at high vacuum. Locate the selected alpha photopeak.':p<20?'A broadened, energy-degraded spectrum is visible at rough vacuum. Pump to high vacuum for calibration.':'At atmospheric pressure the alphas do not reach the detector with useful energy. Pump down the chamber.';draw();save();
}
function selectedEnergy(){return E('source').value==='unknown'?s.run.unknown:+E('lineSelect').value}
function recPeak(){
 if(!s.spectrum||s.spectrum.source!==E('source').value){E('msg').className='notice warn';E('msg').textContent='Acquire the selected source first.';return}if(s.spectrum.pressure>.1){E('msg').className='notice warn';E('msg').textContent='Calibration/unknown peak positions must be recorded at high vacuum.';return}
 const ch=+E('cursor').value,st=+E('studentPeakCh').value;if(!Number.isInteger(st)||st!==ch){E('msg').className='notice warn';E('msg').textContent='Enter the integer channel currently indicated by the MCA cursor.';return}
 const en=selectedEnergy(),target=center(en,s.gainLock,.03);if(Math.abs(ch-target)>5){E('msg').className='notice warn';E('msg').textContent='Centre the cursor on the selected full-energy alpha peak.';return}
 if(E('source').value==='unknown'){s.unknownPeak={ch};s.unknownResult=null;E('msg').textContent='Unknown alpha peak channel accepted. Calculate its energy from the calibration.';}
 else{const line=KNOWN.find(q=>Math.abs(q[1]-en)<.001),row={name:line[0],E:en,ch},i=s.peaks.findIndex(q=>q.name===row.name);if(i>=0)s.peaks[i]=row;else s.peaks.push(row);s.peaks.sort((a,b)=>a.E-b.E);s.cal=null;s.resolution=null;s.unknownPeak=null;s.unknownResult=null;E('msg').textContent='Calibration peak accepted. Record the remaining mixed-source peaks.';}
 E('msg').className='notice ok';E('studentPeakCh').value='';render();save();
}
function calExpected(){if(s.peaks.length<3)return null;const pts=s.peaks.map(q=>({x:q.ch,y:q.E})),f=U.fit(pts);return{pts,slope:f.b,intercept:f.a}}
function checkCal(){
 const e=calExpected();if(!e){E('calMsg').className='notice warn';E('calMsg').textContent='Record Pu-239, Am-241 and Cm-244 peaks first.';return}
 const a=+E('studentSlope').value,b=+E('studentIntercept').value;if(!Number.isFinite(a)||!Number.isFinite(b)||a<=0){E('calMsg').className='notice warn';E('calMsg').textContent='Enter the E(channel) slope and intercept.';return}
 if(Math.abs(a-e.slope)>.00003||Math.abs(b-e.intercept)>.006){E('calMsg').className='notice warn';E('calMsg').textContent='Fit known alpha energy (MeV) versus measured MCA channel.';return}
 s.cal={slope:a,intercept:b};s.resolution=null;s.unknownPeak=null;s.unknownResult=null;E('calMsg').className='notice ok';E('calMsg').textContent='Alpha energy calibration accepted. Measure the Am-241 peak width next.';render();save();
}
function checkResolution(){
 if(!s.cal){E('resolutionMsg').className='notice warn';E('resolutionMsg').textContent='Validate the energy calibration first.';return}
 const fch=+E('studentFwhmCh').value,fe=+E('studentFwhmE').value,res=+E('studentResolution').value,expectedCh=2.35482*s.run.sigma;if(!Number.isFinite(fch)||!Number.isFinite(fe)||!Number.isFinite(res)||fch<=0||fe<=0||res<=0){E('resolutionMsg').className='notice warn';E('resolutionMsg').textContent='Enter the measured FWHM in channels, converted energy width and percent resolution.';return}
 if(Math.abs(fch-expectedCh)>1.8){E('resolutionMsg').className='notice warn';E('resolutionMsg').textContent='Re-read the Am-241 peak width between its half-maximum channel positions.';return}
 const ekev=s.cal.slope*fch*1000;if(Math.abs(fe-ekev)>1.2){E('resolutionMsg').className='notice warn';E('resolutionMsg').textContent='Convert channel FWHM to energy using the accepted calibration slope.';return}
 const er=100*(fe/1000)/5.486;if(Math.abs(res-er)>.08){E('resolutionMsg').className='notice warn';E('resolutionMsg').textContent='Recalculate resolution=100·FWHM_E/5.486 MeV.';return}
 s.resolution={fwhmCh:fch,fwhmKeV:fe,res};E('resolutionMsg').className='notice ok';E('resolutionMsg').textContent='Detector resolution accepted. You may now acquire the unknown alpha source.';render();save();
}
function checkUnknown(){
 if(!s.cal||!s.resolution||!s.unknownPeak){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Complete calibration/resolution, then acquire and record the unknown peak channel.';return}
 const ch=+E('studentUnknownCh').value,en=+E('studentUnknownE').value;if(!Number.isInteger(ch)||!Number.isFinite(en)||en<=0){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Enter the accepted unknown channel and calibrated energy.';return}
 if(ch!==s.unknownPeak.ch){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Use the accepted unknown alpha-peak channel.';return}
 const calc=s.cal.slope*ch+s.cal.intercept;if(Math.abs(en-calc)>.006){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Apply E=a·channel+b using your alpha calibration.';return}
 s.unknownResult={ch,E:en};E('unknownMsg').className='notice ok';E('unknownMsg').textContent='Unknown alpha energy accepted.';render();save();
}
function drawCal(){const e=calExpected();if(e)U.plot(E('calChart'),[{pts:e.pts}],{xlabel:'MCA channel',ylabel:'alpha energy / MeV',xmin:0,ymin:0});else{const q=U.canvas(E('calChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record the three mixed-source peaks.',q.w/2,q.h/2)}}
function render(){
 draw();E('peakBody').innerHTML=s.peaks.length?s.peaks.map(q=>'<tr><td>'+q.name+'</td><td>'+q.E.toFixed(3)+'</td><td>'+q.ch+'</td></tr>').join(''):'<tr><td colspan="3">No calibration peaks yet.</td></tr>';E('peakCount').textContent=s.peaks.length+' / 3';E('gainOut').textContent=s.gainLock!=null?s.gainLock.toFixed(0):'—';drawCal();
 E('calOut').textContent=s.cal?(s.cal.slope.toFixed(6)+' MeV/ch'):'—';E('fwhmOut').textContent=s.resolution?s.resolution.fwhmKeV.toFixed(1)+' keV':'—';E('resolutionOut').textContent=s.resolution?s.resolution.res.toFixed(2)+'%':'—';E('unknownOut').textContent=s.unknownResult?s.unknownResult.E.toFixed(3)+' MeV':'—';if(s.cal){E('studentSlope').value=s.cal.slope;E('studentIntercept').value=s.cal.intercept}if(s.resolution){E('studentFwhmCh').value=s.resolution.fwhmCh;E('studentFwhmE').value=s.resolution.fwhmKeV;E('studentResolution').value=s.resolution.res}if(s.unknownResult){E('studentUnknownCh').value=s.unknownResult.ch;E('studentUnknownE').value=s.unknownResult.E}
 const words=s.interpretation.trim().length>=60;E('progress').innerHTML='<div class="item '+(s.peaks.length===3?'done':'')+'">'+(s.peaks.length===3?'✓':'○')+' three mixed-source peaks</div><div class="item '+(s.cal?'done':'')+'">'+(s.cal?'✓':'○')+' energy calibration</div><div class="item '+(s.resolution?'done':'')+'">'+(s.resolution?'✓':'○')+' detector resolution</div><div class="item '+(s.unknownResult?'done':'')+'">'+(s.unknownResult?'✓':'○')+' unknown alpha energy</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' vacuum/resolution interpretation</div>';
}
function buildReport(){const summary='<p><b>High-vacuum calibration peaks:</b> '+s.peaks.length+'/3. <b>Calibration:</b> '+(s.cal?'E='+s.cal.slope.toFixed(6)+'·channel '+(s.cal.intercept>=0?'+ ':'− ')+Math.abs(s.cal.intercept).toFixed(3)+' MeV':'not validated')+'.</p><p><b>Resolution:</b> '+(s.resolution?s.resolution.fwhmKeV.toFixed(1)+' keV ('+s.resolution.res.toFixed(2)+'%)':'not validated')+'. <b>Unknown alpha:</b> '+(s.unknownResult?s.unknownResult.E.toFixed(3)+' MeV':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 6 — Alpha-Particle Spectroscopy',summary)}
U.tabs();E('interpretation').value=s.interpretation;E('source').addEventListener('change',()=>{s.spectrum=null;syncLines();draw()});E('pressure').addEventListener('change',()=>{s.spectrum=null;draw()});E('gain').addEventListener('input',draw);E('cursor').addEventListener('input',draw);E('acquire').onclick=acquire;E('recordPeak').onclick=recPeak;E('checkCalibration').onclick=checkCal;E('checkResolution').onclick=checkResolution;E('checkUnknown').onclick=checkUnknown;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);syncLines();window.addEventListener('resize',render);render();save();
})();