(()=>{'use strict';
const U=AtomicUI,E=id=>document.getElementById(id),K='ATOMIC_A05_v2',LINES={Cs137:[661.7],Co60:[1173.2,1332.5],Na22:[511.0,1274.5]};
function makeRun(){const choices=[846.8,1115.5,1460.8];return{id:'A05-'+Math.random().toString(36).slice(2,7).toUpperCase(),offset:18+Math.random()*20,scale:.985+Math.random()*.03,unknown:choices[Math.floor(Math.random()*choices.length)],phase:Math.random()*9}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),gainLock:null,spectrum:null,peaks:[],cal:null,unknownPeak:null,unknownResult:null,interpretation:''};s.peaks=Array.isArray(s.peaks)?s.peaks:[];s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function center(EkeV,g=s.gainLock??+E('gain').value){return s.run.offset+g*s.run.scale*EkeV}
function sourceLines(src=E('source').value){return src==='unknown'?[s.run.unknown]:(LINES[src]||[])}
function makeSpectrum(src,g,t){
 const lines=sourceLines(src),hist=[];for(let ch=0;ch<2048;ch++){let mu=2.5+(18+10*t/60)*Math.exp(-ch/650);for(const en of lines){const c=center(en,g),sig=7+0.006*en,amp=(260+180*t/60)*(700/Math.max(400,en));mu+=amp*Math.exp(-.5*((ch-c)/sig)**2);const edge=c*.76;mu+=22*Math.exp(-.5*((ch-edge)/(45+en*.02))**2)}hist.push(U.poisson(Math.max(0,mu)))}return hist;
}
function setupCanvas(){const c=E('mcaCanvas'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function draw(){
 const{x,w,h}=setupCanvas();x.fillStyle='#06120f';x.fillRect(0,0,w,h);if(s.spectrum){const hist=s.spectrum.hist,max=Math.max(...hist,1);x.strokeStyle='#6ee0b0';x.lineWidth=1.3;x.beginPath();hist.forEach((v,ch)=>{const xx=ch/2047*w,yy=h*.88-v/max*h*.76;ch?x.lineTo(xx,yy):x.moveTo(xx,yy)});x.stroke()}
 const ch=+E('cursor').value,xx=ch/2047*w;x.strokeStyle='#ff7180';x.lineWidth=2;x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke();E('channelRead').value=String(ch);E('countRead').value=s.spectrum?String(s.spectrum.hist[ch]||0):'—';
}
function syncLines(){
 const src=E('source').value,lines=sourceLines(src);E('lineSelect').innerHTML=src==='unknown'?'<option value="unknown">unknown photopeak</option>':lines.map(en=>'<option value="'+en+'">'+en.toFixed(1)+' keV</option>').join('');E('lineEnergyRead').value=src==='unknown'?'unknown · calculate after calibration':(lines[0]?.toFixed(1)+' keV');E('studentPeakCh').value='';draw();
}
function acquire(){
 const src=E('source').value,g=+E('gain').value,t=+E('acqTime').value;if(src==='unknown'&&!s.cal){E('msg').className='notice warn';E('msg').textContent='Complete the known-source energy calibration before acquiring the unknown line.';return}
 if(s.gainLock==null)s.gainLock=g;if(Math.abs(g-s.gainLock)>1e-9){E('msg').className='notice warn';E('msg').textContent='Return the MCA gain to the locked calibration value '+s.gainLock.toFixed(2)+' channel/keV before acquiring.';return}
 s.spectrum={source:src,gain:g,time:t,hist:makeSpectrum(src,g,t)};E('msg').className='notice ok';E('msg').textContent='Spectrum acquired. Move the channel cursor to the selected full-energy photopeak and record its channel.';draw();save();
}
function selectedEnergy(){return E('source').value==='unknown'?s.run.unknown:+E('lineSelect').value}
function recordPeak(){
 if(!s.spectrum||s.spectrum.source!==E('source').value){E('msg').className='notice warn';E('msg').textContent='Acquire the currently selected source first.';return}
 const ch=+E('cursor').value,student=+E('studentPeakCh').value;if(!Number.isInteger(student)||student<0||student>2047){E('msg').className='notice warn';E('msg').textContent='Read and enter the integer MCA channel at the photopeak centre.';return}
 if(student!==ch){E('msg').className='notice warn';E('msg').textContent='Enter the channel currently indicated by the cursor.';return}
 const en=selectedEnergy(),target=center(en,s.gainLock);if(Math.abs(ch-target)>6){E('msg').className='notice warn';E('msg').textContent='The cursor is not centred on the selected full-energy photopeak. Distinguish it from the Compton continuum/edge.';return}
 if(E('source').value==='unknown'){s.unknownPeak={ch};s.unknownResult=null;E('msg').className='notice ok';E('msg').textContent='Unknown photopeak channel accepted. Calculate its energy from your calibration.';}
 else{const src=E('source').value,row={src,E:en,ch},i=s.peaks.findIndex(q=>q.src===src&&Math.abs(q.E-en)<.01);if(i>=0)s.peaks[i]=row;else s.peaks.push(row);s.peaks.sort((a,b)=>a.E-b.E);s.cal=null;s.unknownPeak=null;s.unknownResult=null;E('msg').className='notice ok';E('msg').textContent='Known calibration photopeak accepted. Acquire the remaining calibration lines without changing gain.';}
 E('studentPeakCh').value='';render();save();
}
function calExpected(){
 if(s.peaks.length<5)return null;const expected=[511,661.7,1173.2,1274.5,1332.5];if(expected.some(en=>!s.peaks.some(q=>Math.abs(q.E-en)<.2)))return null;const pts=s.peaks.map(q=>({x:q.ch,y:q.E})),f=U.fit(pts),res=pts.map(p=>Math.abs(p.y-(f.a+f.b*p.x))),maxResidual=Math.max(...res);return{pts,slope:f.b,intercept:f.a,maxResidual};
}
function checkCalibration(){
 const e=calExpected();if(!e){E('calMsg').className='notice warn';E('calMsg').textContent='Record all five known photopeaks: Na-22 (511,1274.5), Cs-137 (661.7), Co-60 (1173.2,1332.5 keV).';return}
 const slope=+E('studentSlope').value,b=+E('studentIntercept').value,r=+E('studentResidual').value;if(!Number.isFinite(slope)||!Number.isFinite(b)||!Number.isFinite(r)||slope<=0||r<0){E('calMsg').className='notice warn';E('calMsg').textContent='Enter the linear calibration slope, intercept and maximum absolute residual.';return}
 if(Math.abs(slope-e.slope)>.0012){E('calMsg').className='notice warn';E('calMsg').textContent='Fit known gamma energy E against your measured peak channel.';return}
 if(Math.abs(b-e.intercept)>2.0){E('calMsg').className='notice warn';E('calMsg').textContent='Re-read the intercept of the E(channel) calibration.';return}
 if(Math.abs(r-e.maxResidual)>.7){E('calMsg').className='notice warn';E('calMsg').textContent='Calculate the largest |Eknown−Efit| residual among the five calibration peaks.';return}
 s.cal={slope,intercept:b,maxResidual:r};s.unknownPeak=null;s.unknownResult=null;E('calMsg').className='notice ok';E('calMsg').textContent='Energy calibration accepted. Acquire the unknown source at the same gain.';render();save();
}
function checkUnknown(){
 if(!s.cal||!s.unknownPeak){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Validate the calibration, acquire the unknown source and record its photopeak channel first.';return}
 const ch=+E('studentUnknownCh').value,en=+E('studentUnknownE').value;if(!Number.isInteger(ch)||!Number.isFinite(en)||en<=0){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Enter the unknown peak channel and calibrated energy.';return}
 if(ch!==s.unknownPeak.ch){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Use the accepted unknown photopeak channel.';return}
 const calc=s.cal.slope*ch+s.cal.intercept;if(Math.abs(en-calc)>1.0){E('unknownMsg').className='notice warn';E('unknownMsg').textContent='Apply E=a·channel+b using your accepted calibration coefficients.';return}
 s.unknownResult={ch,E:en};E('unknownMsg').className='notice ok';E('unknownMsg').textContent='Unknown gamma-line energy accepted.';render();save();
}
function drawCal(){
 const e=calExpected();if(e)U.plot(E('calChart'),[{pts:e.pts}],{xlabel:'MCA channel',ylabel:'known energy / keV',xmin:0,ymin:0});else{const q=U.canvas(E('calChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record all five known photopeaks to build the calibration.',q.w/2,q.h/2)}
}
function render(){
 draw();E('peakBody').innerHTML=s.peaks.length?s.peaks.map(q=>'<tr><td>'+q.src+'</td><td>'+q.E.toFixed(1)+'</td><td>'+q.ch+'</td></tr>').join(''):'<tr><td colspan="3">No calibration peaks yet.</td></tr>';E('peakCount').textContent=s.peaks.length+' / 5';E('gainOut').textContent=s.gainLock!=null?s.gainLock.toFixed(2):'—';drawCal();
 E('slopeOut').textContent=s.cal?s.cal.slope.toFixed(4)+' keV/ch':'—';E('interceptOut').textContent=s.cal?s.cal.intercept.toFixed(1)+' keV':'—';E('residualOut').textContent=s.cal?s.cal.maxResidual.toFixed(1)+' keV':'—';E('unknownOut').textContent=s.unknownResult?s.unknownResult.E.toFixed(1)+' keV':'—';if(s.cal){E('studentSlope').value=s.cal.slope;E('studentIntercept').value=s.cal.intercept;E('studentResidual').value=s.cal.maxResidual}if(s.unknownResult){E('studentUnknownCh').value=s.unknownResult.ch;E('studentUnknownE').value=s.unknownResult.E}
 const words=s.interpretation.trim().length>=60;E('progress').innerHTML='<div class="item '+(s.peaks.length>=5?'done':'')+'">'+(s.peaks.length>=5?'✓':'○')+' five known photopeaks</div><div class="item '+(s.cal?'done':'')+'">'+(s.cal?'✓':'○')+' linear energy calibration</div><div class="item '+(s.unknownResult?'done':'')+'">'+(s.unknownResult?'✓':'○')+' unknown gamma line</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' spectrum/calibration interpretation</div>';
}
function buildReport(){const summary='<p><b>Gain:</b> '+(s.gainLock!=null?s.gainLock.toFixed(2)+' channel/keV':'not locked')+'. <b>Calibration peaks:</b> '+s.peaks.length+'/5.</p><p><b>Calibration:</b> '+(s.cal?'E='+s.cal.slope.toFixed(4)+'·channel '+(s.cal.intercept>=0?'+ ':'− ')+Math.abs(s.cal.intercept).toFixed(1)+' keV; max residual '+s.cal.maxResidual.toFixed(1)+' keV':'not validated')+'. <b>Unknown:</b> '+(s.unknownResult?s.unknownResult.E.toFixed(1)+' keV':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 5 — Gamma-Ray Spectroscopy & Energy Calibration',summary)}
U.tabs();E('interpretation').value=s.interpretation;E('source').addEventListener('change',()=>{s.spectrum=null;syncLines();draw()});E('lineSelect').addEventListener('change',()=>{E('lineEnergyRead').value=E('source').value==='unknown'?'unknown · calculate after calibration':Number(E('lineSelect').value).toFixed(1)+' keV';E('studentPeakCh').value=''});E('gain').addEventListener('input',draw);E('cursor').addEventListener('input',draw);E('acquire').onclick=acquire;E('recordPeak').onclick=recordPeak;E('checkCalibration').onclick=checkCalibration;E('checkUnknown').onclick=checkUnknown;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);syncLines();window.addEventListener('resize',render);render();save();
})();