(()=>{
'use strict';
const U=VOMUI,E=id=>document.getElementById(id),K='VOM_W02_v3',TAU=Math.PI*2;
function makeRun(){return{id:'W02-'+Math.random().toString(36).slice(2,7).toUpperCase(),v:341+Math.random()*4,d0:.25+Math.random()*.55}}
let s=U.load(K,null);
if(!s||s.version!==3)s={version:3,run:makeRun(),scanF:null,scan:[],spacing:[],pending:null,analysis:{scan:null,fit:null}};
s.scan=Array.isArray(s.scan)?s.scan:[];s.spacing=Array.isArray(s.spacing)?s.spacing:[];s.analysis=s.analysis||{scan:null,fit:null};
function save(){U.save(K,s)}
function Dcm(f=+E('freq').value){return s.run.v/f*100/2}
function amplitude(d=+E('dd').value,f=+E('freq').value){return .05+.95*(.5+.5*Math.cos(TAU*(d-s.run.d0)/Dcm(f)))}
function setupCanvas(){const c=E('tubeCanvas'),d=window.devicePixelRatio||1,w=c.clientWidth||900,h=c.clientHeight||390;c.width=w*d;c.height=h*d;const x=c.getContext('2d');x.setTransform(d,0,0,d,0,0);return{x,w,h}}
function draw(){
  const{x,w,h}=setupCanvas(),d=+E('dd').value,f=+E('freq').value,A=amplitude(d,f);x.fillStyle='#eef5f6';x.fillRect(0,0,w,h);
  const left=w*.14,right=w*.82,y1=h*.30,y2=h*.55,slide=Math.min(w*.16,d/40*w*.16);
  x.strokeStyle='#4f6b7a';x.lineWidth=12;x.lineCap='round';x.beginPath();x.moveTo(left,y1);x.lineTo(right-slide,y1);x.quadraticCurveTo(right+30-slide,h*.42,right-slide,y2);x.lineTo(left,y2);x.stroke();
  x.strokeStyle='#2598b1';x.lineWidth=3;x.beginPath();x.moveTo(left,y1);x.lineTo(right-slide,y1);x.stroke();x.strokeStyle='#d69a2d';x.beginPath();x.moveTo(left,y2);x.lineTo(right-slide,y2);x.stroke();
  x.fillStyle='#173e58';x.font='700 12px system-ui';x.fillText('source',left-18,y1-18);x.fillText('receiver',left-22,y2+28);x.fillText('sliding path',right-slide-35,h*.72);
  const gx=w*.20,gy=h*.84,gw=w*.60;x.strokeStyle='#cbd8e0';x.lineWidth=1;x.beginPath();x.moveTo(gx,gy);x.lineTo(gx+gw,gy);x.stroke();x.fillStyle='#2a8a65';x.fillRect(gx,gy-18,gw*A,12);x.fillStyle='#5f7587';x.font='11px system-ui';x.fillText('receiver amplitude',gx,gy-25);
  E('freqRead').textContent=f.toFixed(0)+' Hz';E('ddRead').textContent=d.toFixed(1)+' cm';E('ampRead').value=A.toFixed(3);
}
function syncMode(){
  const spacing=E('mode').value==='spacing';
  E('dd').max=spacing?40:15;E('dd').step=spacing?.1:.5;if(+E('dd').value>+E('dd').max)E('dd').value=0;
  s.pending=null;renderAll();save();
}
function record(){
  const mode=E('mode').value,f=+E('freq').value,d=+E('dd').value,A=amplitude(d,f);
  if(mode==='scan'){
    if(f<4500||f>5500){E('msg').className='notice warn';E('msg').textContent='For the fixed-frequency scan choose f between 4.5 and 5.5 kHz.';return}
    if(s.scanF==null)s.scanF=f;
    if(f!==s.scanF){E('msg').className='notice warn';E('msg').textContent='Keep the first-part frequency fixed at '+s.scanF.toFixed(0)+' Hz for the entire displacement scan.';return}
    const rec={d,A},i=s.scan.findIndex(q=>Math.abs(q.d-d)<1e-9);if(i>=0)s.scan[i]=rec;else s.scan.push(rec);s.scan.sort((a,b)=>a.d-b.d);s.analysis.scan=null;
    E('msg').className='notice ok';E('msg').textContent='Scan point stored. Continue in 0.5 cm steps to approximately 15 cm.';
  }else{
    if(A<.965){E('msg').className='notice warn';E('msg').textContent='The receiver is not at an interference maximum. Move Δd until the amplitude reaches a local maximum before marking it.';return}
    if(!s.pending||s.pending.f!==f){s.pending={f,d};E('msg').className='notice ok';E('msg').textContent='First maximum marked at '+d.toFixed(1)+' cm. Move to the next consecutive maximum at the same frequency.';}
    else{
      const D=d-s.pending.d,expected=Dcm(f);
      if(D<=0){E('msg').className='notice warn';E('msg').textContent='The second maximum must be at a larger slider displacement.';return}
      if(Math.abs(D-expected)>.28){E('msg').className='notice warn';E('msg').textContent=D>expected?'This appears to skip a maximum. Return to the immediately adjacent maximum.':'The two marks are not successive maxima; continue searching.';
        return}
      const q={f,D,d1:s.pending.d,d2:d},i=s.spacing.findIndex(x=>x.f===f);if(i>=0)s.spacing[i]=q;else s.spacing.push(q);s.spacing.sort((a,b)=>a.f-b.f);s.pending=null;s.analysis.fit=null;
      E('msg').className='notice ok';E('msg').textContent='Consecutive-maxima spacing accepted. Change frequency and repeat.';
    }
  }
  renderAll();save();
}
function scanPeriod(){
  if(s.scan.length<25||s.scan[0]?.d>.1||s.scan.at(-1)?.d<14.9)return null;
  const peaks=[];for(let i=1;i<s.scan.length-1;i++){const a=s.scan[i-1],b=s.scan[i],c=s.scan[i+1];if(b.A>=a.A&&b.A>=c.A&&b.A>.8)peaks.push(b.d)}
  if(peaks.length<3)return null;const ds=[];for(let i=1;i<peaks.length;i++)ds.push(peaks[i]-peaks[i-1]);return ds.reduce((a,b)=>a+b,0)/ds.length;
}
function checkScan(){
  const eD=scanPeriod();if(eD==null||s.scanF==null){E('scanMsg').className='notice warn';E('scanMsg').textContent='Complete the 0–15 cm fixed-frequency scan with enough points to identify several maxima.';return}
  const D=+E('studentScanD').value,v=+E('studentV1').value;if(!Number.isFinite(D)||!Number.isFinite(v)||D<=0||v<=0){E('scanMsg').className='notice warn';E('scanMsg').textContent='Enter the displacement period and calculated sound speed.';return}
  if(Math.abs(D-eD)>.22){E('scanMsg').className='notice warn';E('scanMsg').textContent='Re-read the average spacing of adjacent maxima from yR(Δd).';return}
  const ev=2*s.scanF*(D/100);if(Math.abs(v-ev)>Math.max(1.5,.012*ev)){E('scanMsg').className='notice warn';E('scanMsg').textContent='Recalculate v=2fD with D converted from centimetres to metres.';return}
  s.analysis.scan={D,v};E('scanMsg').className='notice ok';E('scanMsg').textContent='Fixed-frequency sound-speed result accepted.';renderAll();save();
}
function fitSpacing(){
  if(s.spacing.length<6||s.spacing[0]?.f>1200||s.spacing.at(-1)?.f<5800)return null;
  const pts=s.spacing.map(q=>({x:1/q.f,y:q.D/100})),sxx=pts.reduce((a,p)=>a+p.x*p.x,0),sxy=pts.reduce((a,p)=>a+p.x*p.y,0),slope=sxy/sxx,res=pts.map(p=>p.y-slope*p.x),ss=res.reduce((a,r)=>a+r*r,0),variance=ss/Math.max(1,pts.length-1),se=Math.sqrt(variance/sxx);
  return{slope,se,v:2*slope,u:2*se,pts};
}
function checkFit(){
  const fit=fitSpacing();if(!fit){E('fitMsg').className='notice warn';E('fitMsg').textContent='Measure D at at least six frequencies spanning approximately 1–6 kHz.';return}
  const slope=+E('studentSlope').value,v=+E('studentV2').value,u=+E('studentUV2').value;if([slope,v,u].some(x=>!Number.isFinite(x))||slope<=0||v<=0||u<0){E('fitMsg').className='notice warn';E('fitMsg').textContent='Enter the fitted slope, v and its standard uncertainty.';return}
  if(Math.abs(slope-fit.slope)>Math.max(.8,.012*fit.slope)){E('fitMsg').className='notice warn';E('fitMsg').textContent='Refit D(m) versus 1/f(s) through the origin and re-read the slope.';return}
  if(Math.abs(v-2*slope)>Math.max(1,.01*v)){E('fitMsg').className='notice warn';E('fitMsg').textContent='Recalculate v=2×slope.';return}
  if(Math.abs(u-fit.u)>Math.max(.4,.18*Math.max(fit.u,.1))){E('fitMsg').className='notice warn';E('fitMsg').textContent='Recalculate the slope standard error from the residual scatter, then use u(v)=2u(slope).';return}
  s.analysis.fit={slope,v,u};E('fitMsg').className='notice ok';E('fitMsg').textContent='D(1/f) sound-speed fit accepted.';renderAll();save();
}
function blank(c,msg){const q=U.canvas(c);q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function charts(){
  if(s.scan.length)U.plot(E('scanChart'),[{pts:s.scan.map(q=>({x:q.d,y:q.A}))}],{xlabel:'Δd / cm',ylabel:'receiver amplitude',xmin:0,xmax:15,ymin:0,ymax:1.05});else blank(E('scanChart'),'Record the fixed-frequency displacement scan.');
  if(s.spacing.length)U.plot(E('spacingChart'),[{pts:s.spacing.map(q=>({x:1/q.f,y:q.D/100}))}],{xlabel:'1/f / s',ylabel:'D / m',xmin:0,ymin:0});else blank(E('spacingChart'),'Measure consecutive-maxima spacings at several frequencies.');
}
function table(){
  const rows=[...s.scan.map(q=>({mode:'scan',f:s.scanF,d:q.d,A:q.A})),...s.spacing.map(q=>({mode:'spacing',f:q.f,d:q.D,A:null}))];
  E('body').innerHTML=rows.length?rows.map(q=>'<tr><td>'+q.mode+'</td><td>'+q.f.toFixed(0)+'</td><td>'+q.d.toFixed(2)+'</td><td>'+(q.A==null?'—':q.A.toFixed(3))+'</td></tr>').join(''):'<tr><td colspan="4">No measurements yet.</td></tr>';
  E('scanCount').textContent=s.scan.length;E('spacingCount').textContent=s.spacing.length;E('scanFOut').textContent=s.scanF?s.scanF.toFixed(0)+' Hz':'—';E('firstMaxOut').textContent=s.pending?s.pending.d.toFixed(1)+' cm':'—';
  E('scanDOut').textContent=s.analysis.scan?s.analysis.scan.D.toFixed(2)+' cm':'—';E('v1Out').textContent=s.analysis.scan?s.analysis.scan.v.toFixed(1)+' m/s':'—';
  E('slopeOut').textContent=s.analysis.fit?s.analysis.fit.slope.toFixed(1)+' m/s':'—';E('v2Out').textContent=s.analysis.fit?s.analysis.fit.v.toFixed(1)+' m/s':'—';E('uv2Out').textContent=s.analysis.fit?s.analysis.fit.u.toFixed(1)+' m/s':'—';
}
function renderAll(){draw();table();charts()}
function newRun(){
  if((s.scan.length||s.spacing.length)&&!confirm('Start a new acoustic-interference specimen? Existing measurements will be cleared.'))return;
  s={version:3,run:makeRun(),scanF:null,scan:[],spacing:[],pending:null,analysis:{scan:null,fit:null}};E('mode').value='scan';E('freq').value=5000;E('dd').value=0;['studentScanD','studentV1','studentSlope','studentV2','studentUV2'].forEach(id=>E(id).value='');syncMode();renderAll();save();
}
function buildReport(){
  const a=s.analysis.scan,b=s.analysis.fit,summary='<p><b>Fixed-frequency scan:</b> '+(a?'D='+a.D.toFixed(2)+' cm, v='+a.v.toFixed(1)+' m/s':'not validated')+'.</p><p><b>D(1/f) method:</b> '+(b?'slope='+b.slope.toFixed(1)+' m/s, v='+b.v.toFixed(1)+' ± '+b.u.toFixed(1)+' m/s':'not validated')+'.</p><p><b>Spacing measurements:</b> '+s.spacing.length+'.</p>';
  return U.report('Wave Laboratory Practical II — Koenig Trombone / Quincke Tube',summary);
}
U.tabs();
E('mode').addEventListener('change',syncMode);E('freq').addEventListener('input',()=>{s.pending=null;draw();table();save()});E('dd').addEventListener('input',draw);
E('record').onclick=record;E('newRun').onclick=newRun;E('checkScanAnalysis').onclick=checkScan;E('checkFit').onclick=checkFit;
E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};
if(s.analysis.scan){E('studentScanD').value=s.analysis.scan.D;E('studentV1').value=s.analysis.scan.v}
if(s.analysis.fit){E('studentSlope').value=s.analysis.fit.slope;E('studentV2').value=s.analysis.fit.v;E('studentUV2').value=s.analysis.fit.u}
if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);
window.addEventListener('resize',renderAll);syncMode();renderAll();save();
})();