(() => {
"use strict";
const data=window.OPTICS_TUTORIAL_DATA||{series:[],questions:[]};
const series=data.series, questions=data.questions, KEY="physics-usthb.optics-tutorials.v1";
const $=s=>document.querySelector(s);
let state=load(), currentId=(location.hash||"").slice(1);
if(!questions.some(q=>q.id===currentId)) currentId=questions.length?questions[0].id:"";

const figures={
refraction:'<svg viewBox="0 0 560 230" role="img" aria-label="Refraction at a plane interface"><line x1="0" y1="115" x2="560" y2="115" stroke="#88a7b8" stroke-width="2"/><line x1="280" y1="15" x2="280" y2="215" stroke="#b9cbd5" stroke-dasharray="7 6"/><path d="M120 25 L280 115 L380 205" fill="none" stroke="#1f91a5" stroke-width="4"/><text x="130" y="55" fill="#557286" font-size="14">air n1</text><text x="390" y="185" fill="#557286" font-size="14">glass n2</text><text x="220" y="75" fill="#173e58" font-size="14">i</text><text x="302" y="154" fill="#173e58" font-size="14">r</text></svg>',
prism:'<svg viewBox="0 0 560 240" role="img" aria-label="Ray through a prism"><path d="M280 25 L120 210 L440 210 Z" fill="#edf7fa" stroke="#55798e" stroke-width="3"/><path d="M25 125 L175 125 L360 175 L530 120" fill="none" stroke="#1f91a5" stroke-width="4"/><text x="272" y="55" fill="#173e58" font-size="14">A</text><text x="40" y="110" fill="#557286" font-size="13">incident</text><text x="455" y="105" fill="#557286" font-size="13">emergent</text></svg>',
mirror:'<svg viewBox="0 0 560 230" role="img" aria-label="Concave mirror ray diagram"><line x1="0" y1="130" x2="560" y2="130" stroke="#93aebd"/><path d="M470 35 Q410 130 470 225" fill="none" stroke="#31566d" stroke-width="5"/><line x1="105" y1="70" x2="105" y2="130" stroke="#1f91a5" stroke-width="5"/><path d="M105 70 L430 70 L250 130" fill="none" stroke="#e4a12e" stroke-width="3"/><path d="M105 70 L430 130 L250 130" fill="none" stroke="#1f91a5" stroke-width="3"/><text x="242" y="150" fill="#557286" font-size="13">F</text></svg>',
diopter:'<svg viewBox="0 0 560 230" role="img" aria-label="Spherical diopter"><line x1="0" y1="120" x2="560" y2="120" stroke="#9ab1bf"/><path d="M340 20 Q250 120 340 220" fill="#edf7fa" fill-opacity=".7" stroke="#426a81" stroke-width="4"/><circle cx="470" cy="120" r="4" fill="#173e58"/><text x="445" y="145" fill="#557286" font-size="13">C</text><text x="285" y="110" fill="#557286" font-size="13">S</text><text x="90" y="95" fill="#557286" font-size="13">n</text><text x="410" y="95" fill="#557286" font-size="13">n prime</text></svg>',
lens:'<svg viewBox="0 0 560 230" role="img" aria-label="Converging thin lens ray diagram"><line x1="0" y1="125" x2="560" y2="125" stroke="#99afbc"/><path d="M285 25 Q245 125 285 225 Q325 125 285 25" fill="#e6f6fa" stroke="#2b7388" stroke-width="3"/><line x1="95" y1="65" x2="95" y2="125" stroke="#1f91a5" stroke-width="5"/><path d="M95 65 L285 65 L420 125" fill="none" stroke="#d79c2d" stroke-width="3"/><path d="M95 65 L285 125 L420 168" fill="none" stroke="#1f91a5" stroke-width="3"/><line x1="420" y1="125" x2="420" y2="168" stroke="#b04f5f" stroke-width="5"/></svg>',
microscope:'<svg viewBox="0 0 600 230" role="img" aria-label="Compound microscope layout"><line x1="0" y1="125" x2="600" y2="125" stroke="#9cb2bf"/><path d="M215 35 Q185 125 215 215 Q245 125 215 35" fill="#e7f6fa" stroke="#2e7186" stroke-width="3"/><path d="M455 45 Q425 125 455 205 Q485 125 455 45" fill="#e7f6fa" stroke="#2e7186" stroke-width="3"/><line x1="105" y1="85" x2="105" y2="125" stroke="#1f91a5" stroke-width="5"/><line x1="365" y1="125" x2="365" y2="190" stroke="#b14d60" stroke-width="5"/><text x="175" y="28" fill="#557286" font-size="13">objective</text><text x="425" y="30" fill="#557286" font-size="13">eyepiece</text></svg>'
};
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return {}}}
function persist(){localStorage.setItem(KEY,JSON.stringify(state));updateProgress()}
function st(id){if(!state[id])state[id]={notes:"",final:"",choice:"",hints:0,solution:false,status:"new"};return state[id]}
function mastered(list){return list.filter(q=>st(q.id).status==="mastered").length}
function updateProgress(){
 const d=mastered(questions), total=questions.length, pct=total?Math.round(100*d/total):0;
 $("#masteryPercent").textContent=pct+"%";$("#masteryBar").style.width=pct+"%";$("#masteryText").textContent=d+" of "+total+" exercises mastered";$("#questionCountBadge").textContent=total+" guided exercises";
}
function renderNav(){
 const nav=$("#seriesNav");nav.innerHTML="";
 series.forEach(s=>{
   const list=questions.filter(q=>q.series===s.id),d=mastered(list),pct=list.length?Math.round(100*d/list.length):0;
   const b=document.createElement("button");b.className="series-button"+((questions.find(q=>q.id===currentId)||{}).series===s.id?" active":"");
   b.innerHTML="<strong>"+esc(s.code)+" · "+esc(s.title)+"</strong><span>"+d+"/"+list.length+" mastered</span><div class=\"series-progress\"><i style=\"width:"+pct+"%\"></i></div>";
   b.addEventListener("click",()=>renderSeries(s.id));nav.appendChild(b);
 });
}
function renderSeries(id){
 const s=series.find(x=>x.id===id),list=questions.filter(q=>q.series===id);if(!s)return;
 $("#crumbline").textContent=s.code.toUpperCase()+" / OVERVIEW";
 let rows="";
 list.forEach((q,i)=>{const x=st(q.id);rows+='<button class="question-row" data-q="'+q.id+'"><span class="qnum">'+String(i+1).padStart(2,"0")+'</span><span><strong>'+esc(q.title)+'</strong><span>Level '+q.level+' · '+(q.kind==="manual"?"derivation / reasoning":q.kind==="mcq"?"concept check":"calculation")+'</span></span><i class="state-dot '+x.status+'"></i></button>'});
 $("#questionView").innerHTML='<article class="welcome-card"><div class="welcome-body"><span class="micro">'+esc(s.code.toUpperCase())+'</span><h2>'+esc(s.title)+'</h2><p>'+esc(s.summary)+'</p><div class="objective-list">'+s.topics.map(t=>'<span class="objective">'+esc(t)+'</span>').join("")+'</div><h3 style="margin-top:24px">Exercises</h3><div class="series-overview">'+rows+'</div></div></article>';
 document.querySelectorAll("[data-q]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.q)));
 closeSidebar();$("#questionView").focus();
}
function renderQuestion(id){
 const q=questions.find(x=>x.id===id);if(!q)return;currentId=id;if(location.hash!=="#"+id)history.replaceState(null,"","#"+id);
 const s=series.find(x=>x.id===q.series),x=st(id),idx=questions.indexOf(q),sl=questions.filter(y=>y.series===q.series),li=sl.indexOf(q);
 $("#crumbline").textContent=s.code.toUpperCase()+" / EXERCISE "+(li+1)+" OF "+sl.length;
 let check="";
 if(q.kind==="numeric")check='<div class="answer-check"><input id="finalAnswer" inputmode="decimal" placeholder="Final numerical value" aria-label="Final numerical answer"><button class="primary-btn" id="checkAnswer">Check result</button></div><div id="feedback"></div>';
 if(q.kind==="mcq")check='<div class="answer-check"><select id="choiceAnswer" aria-label="Choose an answer"><option value="">Choose…</option>'+q.options.map((o,i)=>'<option value="'+i+'">'+esc(o)+'</option>').join("")+'</select><button class="primary-btn" id="checkAnswer">Check choice</button></div><div id="feedback"></div>';
 if(q.kind==="manual")check='<div class="feedback">This is a derivation/reasoning exercise. Write your work first, then reveal the worked solution and self-assess it.</div>';
 let hints=x.hints?'<section class="hint-box"><h3>Progressive hints</h3>'+q.hints.slice(0,x.hints).map((h,i)=>'<p><strong>Hint '+(i+1)+'.</strong> '+esc(h)+'</p>').join("")+'</section>':"";
 let sol=x.solution?'<section class="solution-box"><h3>Worked solution</h3><div class="solution-steps">'+q.solution.map((z,i)=>'<div class="solution-step"><strong>'+(i+1)+'.</strong> '+esc(z)+'</div>').join("")+'</div></section>':"";
 let status=x.status==="mastered"?'<span class="pill mastered">MASTERED</span>':x.status==="attempted"?'<span class="pill">ATTEMPTED</span>':"";
 let fig=q.figure&&figures[q.figure]?'<div class="figure">'+figures[q.figure]+'</div>':"";
 $("#questionView").innerHTML='<article class="exercise-card"><header class="exercise-top"><div class="exercise-meta"><span class="pill">'+esc(s.code.toUpperCase())+'</span><span class="pill level-'+q.level+'">LEVEL '+q.level+'</span>'+status+'</div><h2>'+(li+1)+'. '+esc(q.title)+'</h2><div class="objective-list">'+q.objectives.map(o=>'<span class="objective">'+esc(o)+'</span>').join("")+'</div></header><div class="exercise-body"><p class="prompt">'+esc(q.prompt)+'</p>'+fig+'<section class="work-area"><h3>Your working</h3><textarea id="notes" placeholder="Write your derivation, diagram notes, assumptions and intermediate calculations here…"></textarea>'+check+'<div class="exercise-controls"><button class="secondary-btn" id="hintButton">'+(x.hints>=q.hints.length?"All hints shown":"Show hint "+(x.hints+1))+'</button><button class="secondary-btn" id="solutionButton">'+(x.solution?"Hide worked solution":"Reveal worked solution")+'</button><button class="success-btn" id="masterButton">'+(x.status==="mastered"?"Mark not yet mastered":"Mark mastered")+'</button></div>'+hints+sol+'</section></div><div class="completion-strip"><span>Attempt → hints if needed → check → compare solution → mastery.</span><span>Exercise '+(idx+1)+' / '+questions.length+'</span></div></article>';
 const notes=$("#notes");notes.value=x.notes||"";notes.addEventListener("input",()=>{x.notes=notes.value;if(x.status==="new")x.status="attempted";persist();renderNav()});
 if(q.kind==="numeric"){const input=$("#finalAnswer");input.value=x.final||"";input.addEventListener("input",()=>{x.final=input.value;if(x.status==="new")x.status="attempted";persist()});$("#checkAnswer").addEventListener("click",()=>checkNumber(q))}
 if(q.kind==="mcq"){const select=$("#choiceAnswer");select.value=x.choice==null?"":x.choice;select.addEventListener("change",()=>{x.choice=select.value;if(x.status==="new")x.status="attempted";persist()});$("#checkAnswer").addEventListener("click",()=>checkChoice(q))}
 $("#hintButton").addEventListener("click",()=>{if(x.hints<q.hints.length){x.hints++;if(x.status==="new")x.status="attempted";persist();renderQuestion(id)}});
 $("#solutionButton").addEventListener("click",()=>{x.solution=!x.solution;if(x.status==="new")x.status="attempted";persist();renderQuestion(id)});
 $("#masterButton").addEventListener("click",()=>{x.status=x.status==="mastered"?"attempted":"mastered";persist();renderQuestion(id)});
 $("#prevQuestion").disabled=idx===0;$("#nextQuestion").disabled=idx===questions.length-1;
 $("#prevQuestion").onclick=()=>idx>0&&go(questions[idx-1].id);$("#nextQuestion").onclick=()=>idx<questions.length-1&&go(questions[idx+1].id);
 renderNav();updateProgress();closeSidebar();$("#questionView").focus();
}
function checkNumber(q){
 const input=$("#finalAnswer"),box=$("#feedback"),v=Number(String(input.value).trim().replace(",",".")),x=st(q.id);x.final=input.value;x.status="attempted";
 if(!Number.isFinite(v)){box.className="feedback warn";box.textContent="Enter a numerical value before checking.";persist();return}
 if(Math.abs(v-q.answer)<=q.tol){x.status="mastered";box.className="feedback ok";box.textContent="Correct within tolerance. Expected about "+q.answer+" "+(q.unit||"")+". Marked mastered."}
 else{box.className="feedback warn";box.textContent="Not within tolerance yet. Check signs, units and the last algebraic step; use a progressive hint if needed."}
 persist();renderNav();
}
function checkChoice(q){
 const select=$("#choiceAnswer"),box=$("#feedback"),x=st(q.id);if(select.value===""){box.className="feedback warn";box.textContent="Choose an option first.";return}
 const v=Number(select.value);x.choice=select.value;x.status="attempted";
 if(v===q.correct){x.status="mastered";box.className="feedback ok";box.textContent="Correct. Marked mastered."}else{box.className="feedback warn";box.textContent="Not quite. Re-read the physical criterion and try a hint before revealing the solution."}
 persist();renderNav();
}
function go(id){currentId=id;renderQuestion(id)}
function coverage(){
 let cards="";series.forEach(s=>{cards+='<div class="coverage-item"><strong>'+esc(s.code)+' · '+esc(s.title)+'</strong><span>'+s.topics.map(esc).join(" · ")+'</span></div>'});
 $("#coverageBody").innerHTML='<p>This map is deliberately broader than one worksheet. It covers every major Geometrical Optics learning block verified in the USTHB L2/S3 material currently available to this project.</p><div class="coverage-grid">'+cards+'</div><div class="source-box"><strong>Coverage basis.</strong> Faculty of Physics L2 timetable evidence places Optics with tutorial sessions in L2; the public 2024–2025 TD Series No. 1 covers reflection/refraction; the 2021–2022 L2/S3 Geometrical Optics course/series by A. Touat supplies the broader mirrors, diopters, lenses and instruments structure. USTHB L1/SNV optics corrections are used only as a supplementary cross-check, not as a substitute for the L2 Physics syllabus.<br><br><strong>Editorial rule.</strong> Exercise wording here is original and self-study oriented. It maps to verified USTHB objectives and question types rather than reproducing third-party scans verbatim. Literal every-sheet-ever-issued completeness is only claimed when the Faculty complete source bank is available and verified.</div>';
 $("#coverageModal").hidden=false;
}
function exportProgress(){
 const payload={course:"Geometrical Optics L2/S3",exportedAt:new Date().toISOString(),mastered:mastered(questions),total:questions.length,progress:state};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="geometrical-optics-tutorial-progress.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function closeSidebar(){$(".study-sidebar").classList.remove("open")}
$("#coverageButton").addEventListener("click",coverage);$("#exportButton").addEventListener("click",exportProgress);
$("#resetProgress").addEventListener("click",()=>{if(confirm("Reset all locally saved Geometrical Optics tutorial progress on this browser?")){state={};persist();renderQuestion(questions[0].id)}});
$("#mobileSeries").addEventListener("click",()=>$(".study-sidebar").classList.toggle("open"));
document.querySelectorAll("[data-close-modal]").forEach(b=>b.addEventListener("click",()=>$("#coverageModal").hidden=true));
$("#coverageModal").addEventListener("click",e=>{if(e.target===$("#coverageModal"))$("#coverageModal").hidden=true});
window.addEventListener("hashchange",()=>{const id=location.hash.slice(1);if(questions.some(q=>q.id===id)&&id!==currentId)renderQuestion(id)});
if(questions.length)renderQuestion(currentId);else $("#questionView").innerHTML='<div class="empty">Exercise bank unavailable.</div>';
})();