(()=>{'use strict';
const U=SolidUI,E=id=>document.getElementById(id),K='SOLID_S04_v2',EPS0=8.8541878128e-12,Q=1.602176634e-19,ME=9.1093837e-31,KB_EV=8.617333262e-5,AREA=2e-6,GAP=.005,AR=1.2e6;
function makeRun(){return{id:'S04-'+Math.random().toString(36).slice(2,7).toUpperCase(),phi:4.25+Math.random()*.45,scale:.97+Math.random()*.06,phase:Math.random()*9}}
let s=U.load(K,null);if(!s||s.version!==2)s={version:2,run:makeRun(),iv:[],sat:[],child:null,rich:null,interpretation:''};s.iv=Array.isArray(s.iv)?s.iv:[];s.sat=Array.isArray(s.sat)?s.sat:[];s.interpretation=s.interpretation||'';
function save(){U.save(K,s)}
function currents(T=+E('temp').value,V=+E('voltage').value){
 const Jr=AR*T*T*Math.exp(-s.run.phi/(KB_EV*T)),Is=Jr*AREA*s.run.scale,cl=(4/9)*EPS0*Math.sqrt(2*Q/ME)*AREA*Math.pow(Math.max(V,0),1.5)/(GAP*GAP),I=Math.min(Is,cl),noise=I*.004*Math.sin(V*.27+T*.011+s.run.phase);
 return{I:Math.max(0,I+noise),Is,cl};
}
function draw(){
 const q=U.canvas(E('tubeCanvas')),x=q.x,w=q.w,h=q.h,T=+E('temp').value,V=+E('voltage').value,c=currents();x.fillStyle='#06120f';x.fillRect(0,0,w,h);
 x.fillStyle='rgb(255,'+Math.round(75+145*(T-1500)/700)+',65)';x.fillRect(w*.20,h*.30,18,h*.40);x.fillStyle='#8aa8b7';x.fillRect(w*.72,h*.24,18,h*.52);
 x.strokeStyle='#6ee0b0';x.lineWidth=2;const frac=Math.min(1,c.I/Math.max(c.Is,1e-12));for(let i=0;i<14;i++){const f=i/13,xx=w*.24+f*w*.46,yy=h*.5+Math.sin(f*10+i+s.run.phase)*20*(.35+.65*frac);x.beginPath();x.arc(xx,yy,3,0,Math.PI*2);x.stroke()}
 x.fillStyle='#e5f7ef';x.font='12px system-ui';x.fillText('heated cathode',w*.12,h*.80);x.fillText('anode +'+V+' V',w*.66,h*.82);E('currentRead').value=(c.I*1e6).toFixed(2)+' µA';
}
function clearBench(){E('studentCurrent').value='';E('studentTemp').value=''}
function recIV(){
 const T=+E('temp').value,V=+E('voltage').value,c=currents(T,V),Iu=+E('studentCurrent').value,sT=+E('studentTemp').value;if(!Number.isFinite(Iu)||!Number.isFinite(sT)||Iu<0){E('msg').className='notice warn';E('msg').textContent='Read the anode-current meter and cathode temperature.';return}
 if(Math.abs(sT-T)>.6){E('msg').className='notice warn';E('msg').textContent='Use the cathode-temperature setting shown on the instrument.';return}
 if(Math.abs(Iu-c.I*1e6)>Math.max(.04,.012*Math.max(c.I*1e6,.1))){E('msg').className='notice warn';E('msg').textContent='Re-read the anode-current meter.';return}
 const row={T,V,I:Iu*1e-6},k=s.iv.findIndex(q=>q.T===T&&q.V===V);if(k>=0)s.iv[k]=row;else s.iv.push(row);s.iv.sort((a,b)=>a.T-b.T||a.V-b.V);s.sat=s.sat.filter(q=>q.T!==T);if(s.child?.T===T)s.child=null;s.rich=null;clearBench();E('msg').className='notice ok';E('msg').textContent='I–V point accepted. Continue from low voltage into the plateau region.';render();save();
}
function scan(T){return s.iv.filter(q=>q.T===+T).sort((a,b)=>a.V-b.V)}
function completeScan(T){const a=scan(T);return a.length>=8&&a[0]?.V<=10&&a.at(-1)?.V>=130}
function scanTemps(){return [...new Set(s.iv.map(q=>q.T))].sort((a,b)=>a-b)}
function syncTempSelectors(){
 const vals=scanTemps(),prevS=+E('satTemp').value,prevC=+E('childTemp').value,opts=vals.length?vals.map(T=>'<option value="'+T+'">'+T+' K'+(completeScan(T)?' · broad scan':'')+'</option>').join(''):'<option value="">record scans first</option>';E('satTemp').innerHTML=opts;E('childTemp').innerHTML=opts;if(vals.includes(prevS))E('satTemp').value=prevS;if(vals.includes(prevC))E('childTemp').value=prevC;loadChildField();
}
function plateauExpected(T){
 const a=scan(T);if(!completeScan(T))return null;const high=a.filter(q=>q.V>=110);if(high.length<3)return null;const top=[...high].sort((x,y)=>y.V-x.V).slice(0,Math.min(4,high.length)),mean=top.reduce((z,q)=>z+q.I,0)/top.length,spread=(Math.max(...top.map(q=>q.I))-Math.min(...top.map(q=>q.I)))/Math.max(mean,1e-15);if(spread>.10)return null;return{mean};
}
function recSat(){
 const T=+E('satTemp').value,e=plateauExpected(T);if(!e){E('satMsg').className='notice warn';E('satMsg').textContent='This temperature needs a broad I–V scan reaching a sufficiently flat high-voltage plateau.';return}
 const Iu=+E('studentSat').value;if(!Number.isFinite(Iu)||Iu<=0){E('satMsg').className='notice warn';E('satMsg').textContent='Estimate the saturation current from the high-voltage plateau.';return}
 if(Math.abs(Iu-e.mean*1e6)>Math.max(.08,.025*e.mean*1e6)){E('satMsg').className='notice warn';E('satMsg').textContent='Average the high-voltage plateau rather than using a low-voltage point.';return}
 const row={T,Is:Iu*1e-6},k=s.sat.findIndex(q=>q.T===T);if(k>=0)s.sat[k]=row;else s.sat.push(row);s.sat.sort((a,b)=>a.T-b.T);s.rich=null;E('studentSat').value='';E('satMsg').className='notice ok';E('satMsg').textContent='Saturation estimate accepted. Repeat at several well-separated cathode temperatures.';render();save();
}
function childExpected(T){
 const a=scan(T);if(a.length<7)return null;const maxI=Math.max(...a.map(q=>q.I)),low=a.filter(q=>q.V>=5&&q.I>0&&q.I<.58*maxI);if(low.length<4)return null;const pts=low.map(q=>({x:Math.log(q.V),y:Math.log(q.I)})),f=U.fit(pts);return{pts,p:f.b};
}
function loadChildField(){const T=+E('childTemp').value;E('studentChild').value=s.child&&s.child.T===T?s.child.p:''}
function checkChild(){
 const T=+E('childTemp').value,e=childExpected(T);if(!e){E('childMsg').className='notice warn';E('childMsg').textContent='The selected temperature needs several nonzero low-voltage points before the plateau bend.';return}
 const p=+E('studentChild').value;if(!Number.isFinite(p)||p<=0){E('childMsg').className='notice warn';E('childMsg').textContent='Enter the slope of ln I versus ln V.';return}
 if(Math.abs(p-e.p)>.08){E('childMsg').className='notice warn';E('childMsg').textContent='Fit only the space-charge-dominated low-voltage points in log–log coordinates.';return}
 s.child={T,p};E('childMsg').className='notice ok';E('childMsg').textContent='Low-voltage power-law exponent accepted.';render();save();
}
function richExpected(){
 if(s.sat.length<4||s.sat.at(-1).T-s.sat[0].T<350)return null;const pts=s.sat.map(q=>({x:1/q.T,y:Math.log(q.Is/(q.T*q.T))})).sort((a,b)=>a.x-b.x),f=U.fit(pts),phi=-f.b*KB_EV;return{pts,slope:f.b,phi}
}
function checkRich(){
 const e=richExpected();if(!e){E('richMsg').className='notice warn';E('richMsg').textContent='Validate saturation currents at at least four temperatures spanning at least 350 K.';return}
 const slope=+E('studentRichSlope').value,phi=+E('studentPhi').value;if(!Number.isFinite(slope)||!Number.isFinite(phi)||phi<=0){E('richMsg').className='notice warn';E('richMsg').textContent='Enter the Richardson-plot slope and calculated work function.';return}
 if(Math.abs(slope-e.slope)>Math.max(35,.025*Math.abs(e.slope))){E('richMsg').className='notice warn';E('richMsg').textContent='Fit ln(Is/T²) against 1/T and re-read the negative slope.';return}
 const calc=-slope*KB_EV;if(Math.abs(phi-calc)>.04){E('richMsg').className='notice warn';E('richMsg').textContent='Use Φ=−k_B·slope with k_B=8.617×10⁻⁵ eV/K.';return}
 s.rich={slope,phi};E('richMsg').className='notice ok';E('richMsg').textContent='Richardson work-function analysis accepted.';render();save();
}
function drawCharts(){
 const temps=scanTemps();if(s.iv.length>1){const series=temps.map(T=>({pts:scan(T).map(q=>({x:q.V,y:q.I*1e6}))}));U.plot(E('ivChart'),series,{xlabel:'anode voltage / V',ylabel:'anode current / µA',xmin:0,ymin:0})}else blank('ivChart','Record I–V points at several cathode temperatures.');
 const e=richExpected();if(e)U.plot(E('richChart'),[{pts:e.pts}],{xlabel:'1/T / K⁻¹',ylabel:'ln(Is/T²)'});else blank('richChart','Validate saturation currents at several temperatures.');
}
function blank(id,msg){const q=U.canvas(E(id));q.x.fillStyle='#fff';q.x.fillRect(0,0,q.w,q.h);q.x.fillStyle='#687d90';q.x.font='600 13px system-ui';q.x.textAlign='center';q.x.fillText(msg,q.w/2,q.h/2)}
function render(){
 draw();E('ivBody').innerHTML=s.iv.length?s.iv.map(q=>'<tr><td>'+q.T+'</td><td>'+q.V+'</td><td>'+(q.I*1e6).toFixed(2)+'</td></tr>').join(''):'<tr><td colspan="3">No accepted I–V points yet.</td></tr>';const temps=scanTemps(),broad=temps.filter(completeScan);E('tempCount').textContent=broad.length+' / 4';E('pointCount').textContent=s.iv.length;
 E('satBody').innerHTML=s.sat.length?s.sat.map(q=>'<tr><td>'+q.T+'</td><td>'+(q.Is*1e6).toFixed(2)+'</td></tr>').join(''):'<tr><td colspan="2">No accepted saturation estimates yet.</td></tr>';E('satCount').textContent=s.sat.length+' / 4';syncTempSelectors();drawCharts();
 E('childOut').textContent=s.child?s.child.p.toFixed(2):'—';E('phiOut').textContent=s.rich?s.rich.phi.toFixed(2)+' eV':'—';if(s.rich){E('studentRichSlope').value=s.rich.slope;E('studentPhi').value=s.rich.phi}
 const words=s.interpretation.trim().length>=60;E('progress').innerHTML='<div class="item '+(broad.length>=4?'done':'')+'">'+(broad.length>=4?'✓':'○')+' broad I–V scans at ≥4 temperatures</div><div class="item '+(s.child?'done':'')+'">'+(s.child?'✓':'○')+' Child–Langmuir exponent</div><div class="item '+(s.rich?'done':'')+'">'+(s.rich?'✓':'○')+' Richardson work function</div><div class="item '+(words?'done':'')+'">'+(words?'✓':'○')+' regime interpretation</div>';
}
function newSpecimen(){if(s.iv.length&&!confirm('Load a new hidden cathode specimen and clear the current measurements?'))return;s={version:2,run:makeRun(),iv:[],sat:[],child:null,rich:null,interpretation:''};E('interpretation').value='';['studentCurrent','studentTemp','studentSat','studentChild','studentRichSlope','studentPhi'].forEach(id=>E(id).value='');render();save()}
function buildReport(){const summary='<p><b>Run:</b> '+U.esc(s.run.id)+'. <b>I–V points:</b> '+s.iv.length+'; <b>saturation estimates:</b> '+s.sat.length+'.</p><p><b>Child–Langmuir exponent:</b> '+(s.child?s.child.p.toFixed(2):'not validated')+'. <b>Work function:</b> '+(s.rich?s.rich.phi.toFixed(2)+' eV':'not validated')+'.</p><p><b>Interpretation:</b> '+U.esc(s.interpretation||'Not completed.')+'</p>';return U.report('Laboratory Practical 4 — Thermionic Emission',summary)}
U.tabs();E('interpretation').value=s.interpretation;['temp','voltage'].forEach(id=>E(id).addEventListener('input',()=>{clearBench();draw()}));E('recordIV').onclick=recIV;E('recordSat').onclick=recSat;E('newSpecimen').onclick=newSpecimen;E('childTemp').addEventListener('change',loadChildField);E('checkChild').onclick=checkChild;E('checkRichardson').onclick=checkRich;E('interpretation').addEventListener('input',e=>{s.interpretation=e.target.value;render();save()});E('buildReport').onclick=buildReport;E('printReport').onclick=()=>{if(buildReport())window.print()};if(!E('reportDate').value)E('reportDate').value=new Date().toISOString().slice(0,10);window.addEventListener('resize',render);render();save();
})();