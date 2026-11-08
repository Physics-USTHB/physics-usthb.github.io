(()=>{'use strict';
const U=SolidUI,E=id=>document.getElementById(id),K='SOLID_S03_v2',Q=1.602176634e-19,T=.0005,W=.010,L=.020;
function makeRun(){
 const type=Math.random()<.5?'n':'p',RH=(type==='n'?-1:1)*(3.4e-4+Math.random()*2.0e-4),sigma=28+Math.random()*45,offset=(Math.random()-.5)*.00016,phase=Math.random()*10;
 return{id:'S03-'+Math.random().toString(36).slice(2,7).toUpperCase(),type,RH,sigma,offset,phase};
}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),rows:[],hall:null,mobility:null,interpretation:''};s.rows=Array.isArray(s.rows)?s.rows:[];s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function values(){
 const I=+E('current').value/1000,B=+E('field').value,R=L/(s.run.sigma*W*T),vx=Math.abs(I)*R*(1+.003*B*B),noise=.000004*Math.sin(B*8.3+I*190+s.run.phase),vh=s.run.RH*I*B/T+s.run.offset+noise;
 return{I,B,vh,vx};
}
function draw(){
 const q=U.canvas(E('hallCanvas')),x=q.x,w=q.w,h=q.h,z=values();x.fillStyle='#06120f';x.fillRect(0,0,w,h);x.fillStyle='#527f96';x.fillRect(w*.24,h*.35,w*.52,h*.30);
 x.strokeStyle=z.I>=0?'#ffcc66':'#ff8c7d';x.lineWidth=5;x.beginPath();x.moveTo(w*.08,h*.50);x.lineTo(w*.92,h*.50);x.stroke();x.fillStyle=x.strokeStyle;x.font='700 11px system-ui';x.fillText(z.I>=0?'I →':'← I',w*.46,h*.46);
 const B=z.B;x.strokeStyle=B>=0?'#65e1b3':'#f27979';x.fillStyle=x.strokeStyle;x.lineWidth=2;for(let i=0;i<7;i++){const xx=w*(.31+i*.063),yy=h*.20;if(B>=0){x.beginPath();x.arc(xx,yy,7,0,Math.PI*2);x.stroke();x.beginPath();x.moveTo(xx-5,yy-5);x.lineTo(xx+5,yy+5);x.moveTo(xx+5,yy-5);x.lineTo(xx-5,yy+5);x.stroke()}else{x.beginPath();x.arc(xx,yy,3,0,Math.PI*2);x.fill()}}
 x.fillStyle='#c8dbe3';x.font='700 11px system-ui';x.fillText('unknown semiconductor specimen',w*.34,h*.78);
 E('vhRead').value=(z.vh*1000).toFixed(3)+' mV';E('vxRead').value=z.vx.toFixed(3)+' V';
}
function clearBench(){E('studentVH').value='';E('studentVX').value=''}
function record(){
 const z=values(),vh=+E('studentVH').value,vx=+E('studentVX').value;if(!Number.isFinite(vh)||!Number.isFinite(vx)||vx<0){E('msg').className='notice warn';E('msg').textContent='Read both voltmeters and enter V_H in mV and |V_x| in V.';return}
 if(Math.abs(vh-z.vh*1000)>.012){E('msg').className='notice warn';E('msg').textContent='Re-read the Hall voltmeter, including the sign.';return}
 if(Math.abs(vx-z.vx)>.006){E('msg').className='notice warn';E('msg').textContent='Re-read the longitudinal voltmeter.';return}
 const row={I:z.I*1000,B:z.B,VH:vh/1000,VX:vx},k=s.rows.findIndex(q=>q.I===row.I&&Math.abs(q.B-row.B)<1e-9);if(k>=0)s.rows[k]=row;else s.rows.push(row);s.rows.sort((a,b)=>a.I-b.I||a.B-b.B);s.hall=null;s.mobility=null;clearBench();E('msg').className='notice ok';E('msg').textContent='Hall/longitudinal reading accepted. Continue the field scan and include reversals of B and I.';render();save();
}
function currentDatasets(){return [...new Set(s.rows.filter(q=>q.I!==0).map(q=>q.I))].sort((a,b)=>a-b)}
function syncCurrentOptions(){
 const vals=currentDatasets(),prev=+E('analysisCurrent').value;E('analysisCurrent').innerHTML=vals.length?vals.map(v=>'<option value="'+v+'">I = '+v.toFixed(0)+' mA</option>').join(''):'<option value="">record data first</option>';if(vals.includes(prev))E('analysisCurrent').value=String(prev);else if(vals.length)E('analysisCurrent').value=String(vals[0]);loadHallFields();
}
function selectedRows(){const I=+E('analysisCurrent').value;return s.rows.filter(q=>q.I===I).sort((a,b)=>a.B-b.B)}
function fitExpected(){
 const I=+E('analysisCurrent').value,a=selectedRows();if(!I||a.length<7||a[0].B>-.6||a.at(-1).B<.6)return null;
 const pts=a.map(q=>({x:q.B,y:q.VH})),f=U.fit(pts),RH=f.b*T/(I/1000),n=1/(Q*Math.abs(RH));return{pts,slopeV:f.b,slopeMv:f.b*1000,RH,n,carrier:RH<0?'n':'p'};
}
function polarityReady(){const fs=new Set(s.rows.filter(q=>q.B!==0).map(q=>Math.sign(q.B))),is=new Set(s.rows.filter(q=>q.I!==0).map(q=>Math.sign(q.I)));return{fs,is,ok:fs.size===2&&is.size===2}}
function checkHall(){
 const e=fitExpected(),pol=polarityReady();if(!e){E('hallAnalysisMsg').className='notice warn';E('hallAnalysisMsg').textContent='For the selected nonzero current, record at least seven field values spanning at least −0.6 to +0.6 T.';return}
 if(!pol.ok){E('hallAnalysisMsg').className='notice warn';E('hallAnalysisMsg').textContent='Also reverse both field and current somewhere in the dataset before accepting the Hall analysis.';return}
 const slope=+E('studentSlope').value,RH=+E('studentRH').value,carrier=E('studentCarrier').value,n=+E('studentN').value;if(!Number.isFinite(slope)||!Number.isFinite(RH)||!carrier||!Number.isFinite(n)||n<=0){E('hallAnalysisMsg').className='notice warn';E('hallAnalysisMsg').textContent='Enter slope, Hall coefficient, carrier type and concentration.';return}
 if(Math.abs(slope-e.slopeMv)>Math.max(.015,.012*Math.abs(e.slopeMv))){E('hallAnalysisMsg').className='notice warn';E('hallAnalysisMsg').textContent='Fit measured V_H (mV) versus B (T) at the selected fixed current.';return}
 const calcRH=(slope/1000)*T/(+E('analysisCurrent').value/1000);if(Math.abs(RH-calcRH)>Math.max(3e-6,.015*Math.abs(calcRH))){E('hallAnalysisMsg').className='notice warn';E('hallAnalysisMsg').textContent='Use R_H=(dV_H/dB)t/I with volts, metres and amperes.';return}
 if(carrier!==(RH<0?'n':'p')){E('hallAnalysisMsg').className='notice warn';E('hallAnalysisMsg').textContent='Use the sign of R_H to identify the dominant carrier sign.';return}
 const en=1/(Q*Math.abs(RH));if(Math.abs(n-en)>Math.max(2e19,.02*en)){E('hallAnalysisMsg').className='notice warn';E('hallAnalysisMsg').textContent='Recalculate n=1/(|qR_H|).';return}
 s.hall={I:+E('analysisCurrent').value,slope,RH,carrier,n};s.mobility=null;E('hallAnalysisMsg').className='notice ok';E('hallAnalysisMsg').textContent='Hall coefficient, carrier sign and concentration accepted.';render();save();
}
function mobilityExpected(){
 if(!s.hall)return null;const Iabs=Math.abs(s.hall.I),a=s.rows.filter(q=>Math.abs(q.I)===Iabs);if(a.length<2)return null;const vx=a.reduce((z,q)=>z+q.VX,0)/a.length,sigma=(Iabs/1000)*L/(vx*W*T),mu=Math.abs(s.hall.RH)*sigma*1e4;return{vx,sigma,mu};
}
function checkMobility(){
 const e=mobilityExpected();if(!e){E('mobilityMsg').className='notice warn';E('mobilityMsg').textContent='Validate the Hall coefficient and retain longitudinal-voltage readings at the same |I|.';return}
 const vx=+E('studentVxMean').value,sigma=+E('studentSigma').value,mu=+E('studentMu').value;if([vx,sigma,mu].some(v=>!Number.isFinite(v))||vx<=0||sigma<=0||mu<=0){E('mobilityMsg').className='notice warn';E('mobilityMsg').textContent='Enter mean |V_x|, conductivity and mobility.';return}
 if(Math.abs(vx-e.vx)>.003){E('mobilityMsg').className='notice warn';E('mobilityMsg').textContent='Average the accepted longitudinal-voltage magnitudes at the selected |I|.';return}
 const es=(Math.abs(s.hall.I)/1000)*L/(vx*W*T);if(Math.abs(sigma-es)>Math.max(.5,.02*es)){E('mobilityMsg').className='notice warn';E('mobilityMsg').textContent='Recalculate σ=IL/(V_xwt) using SI units.';return}
 const em=Math.abs(s.hall.RH)*sigma*1e4;if(Math.abs(mu-em)>Math.max(3,.02*em)){E('mobilityMsg').className='notice warn';E('mobilityMsg').textContent='Recalculate μ=|R_H|σ and convert m²/V·s to cm²/V·s.';return}
 s.mobility={vx,sigma,mu};E('mobilityMsg').className='notice ok';E('mobilityMsg').textContent='Conductivity and Hall mobility accepted.';render();save();
}
function loadHallFields(){
 ['studentSlope','studentRH','studentN'].forEach(id=>E(id).value='');E('studentCarrier').value='';if(s.hall&&s.hall.I===+E('analysisCurrent').value){E('studentSlope').value=s.hall.slope;E('studentRH').value=s.hall.RH;E('studentCarrier').value=s.hall.carrier;E('studentN').value=s.hall.n}
 drawChart();
}
function drawChart(){
 const e=fitExpected();if(e)U.plot(E('hallChart'),[{pts:e.pts}],{xlabel:'B / T',ylabel:'V_H / V'});else{const q=U.canvas(E('hallChart'));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText('Record a broad fixed-current field scan.',q.w/2,q.h/2)}
}
function render(){
 draw();E('body').innerHTML=s.rows.length?s.rows.map(q=>'<tr><td>'+q.I.toFixed(0)+'</td><td>'+q.B.toFixed(2)+'</td><td>'+(q.VH*1000).toFixed(3)+'</td><td>'+q.VX.toFixed(3)+'</td></tr>').join(''):'<tr><td colspan="4">No accepted measurements yet.</td></tr>';E('rowCount').textContent=s.rows.length;
 const p=polarityReady();E('fieldSigns').textContent=p.fs.size+' / 2';E('currentSigns').textContent=p.is.size+' / 2';syncCurrentOptions();
 E('rhOut').textContent=s.hall?s.hall.RH.toExponential(3)+' m³/C':'—';E('carrierOut').textContent=s.hall?(s.hall.carrier==='n'?'electrons · n-type':'holes · p-type'):'—';E('nOut').textContent=s.hall?s.hall.n.toExponential(3)+' m⁻³':'—';E('sigmaOut').textContent=s.mobility?s.mobility.sigma.toFixed(1)+' S/m':'—';E('muOut').textContent=s.mobility?s.mobility.mu.toFixed(0)+' cm²/V·s':'—';
 if(s.mobility){E('studentVxMean').value=s.mobility.vx;E('studentSigma').value=s.mobility.sigma;E('studentMu').value=s.mobility.mu}
 const words=s.interpretation.trim().length>=55;E('progress').innerHTML='<div class="item '+(p.ok?'done':'')+'">'+(p.ok?'✓':'○')+' field/current polarity reversals</div><div class="item '+(s.hall?'done':'')+'">'+(s.hall?'✓':'○')+' Hall coefficient + carrier concentration</div><div class="item '+(s.mobility?'done':'')+'">'+(s.mobility?'✓':'○')+' conductivity + mobility</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' offset/reversal interpretation</div>';
}
function newSpecimen(){if(s.rows.length&&!confirm('Load a new hidden Hall specimen and clear the current measurements?'))return;s={version:2,run:makeRun(),rows:[],hall:null,mobility:null,interpretation:''};E('interpretation').value='';['studentSlope','studentRH','studentN','studentVxMean','studentSigma','studentMu'].forEach(id=>E(id).value='');E('studentCarrier').value='';clearBench();render();save()}
function buildReport(){const summary='<p><b>Run:</b> '+U.esc(s.run.id)+'. <b>Accepted rows:</b> '+s.rows.length+'.</p><p><b>Hall result:</b> '+(s.hall?'R_H='+s.hall.RH.toExponential(3)+' m³/C, '+(s.hall.carrier==='n'?'n-type':'p-type')+', n='+s.hall.n.toExponential(3)+' m⁻³':'not validated')+'. <b>Transport:</b> '+(s.mobility?'σ='+s.mobility.sigma.toFixed(1)+' S/m, μ='+s.mobility.mu.toFixed(0)+' cm²/V·s':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 3 — Hall Effect',summary)}
U.tabs();E('interpretation').value=s.interpretation;['current','field'].forEach(id=>E(id).addEventListener('input',()=>{clearBench();draw()}));E('record').onclick=record;E('newSpecimen').onclick=newSpecimen;E('analysisCurrent').addEventListener('change',loadHallFields);E('checkHallAnalysis').onclick=checkHall;E('checkMobility').onclick=checkMobility;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();