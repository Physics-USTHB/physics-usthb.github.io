(() => {
"use strict";
const data=window.OPTICS_TUTORIAL_DATA||{series:[],questions:[],theories:{}};
const audit=window.OPTICS_TUTORIAL_AUDIT||{sources:[],exactQuestionSources:{},chapterSources:{},unresolved:[],visuals:{}};
const visuals=window.OPTICS_VISUALS||null;
const series=data.series||[], questions=data.questions||[], theories=data.theories||{}, conventions=data.conventions||{}, KEY="physics-usthb.optics-tutorials.v4";
const $=s=>document.querySelector(s);
let state=load(), currentId=(location.hash||"").slice(1), assessmentTimer=null;
for(const q of questions){
  if(q.kind==="manual"&&state[q.id]?.status==="mastered"){
    const r=Array.isArray(state[q.id].rubric)?state[q.id].rubric:[];
    if(!q.solution.every((_,i)=>r[i]===true)) state[q.id].status="attempted";
  }
}
localStorage.setItem(KEY,JSON.stringify(state));
if(!questions.some(q=>q.id===currentId)) currentId=questions.length?questions[0].id:"";

const fallbackFigures={
refraction:'<svg viewBox="0 0 560 230" role="img" aria-label="Refraction at a plane interface"><line x1="0" y1="115" x2="560" y2="115" stroke="#88a7b8" stroke-width="2"/><line x1="280" y1="15" x2="280" y2="215" stroke="#b9cbd5" stroke-dasharray="7 6"/><path d="M120 25 L280 115 L380 205" fill="none" stroke="#1f91a5" stroke-width="4"/></svg>',
prism:'<svg viewBox="0 0 560 240" role="img" aria-label="Ray through a prism"><path d="M280 25 L120 210 L440 210 Z" fill="#edf7fa" stroke="#55798e" stroke-width="3"/><path d="M25 125 L175 125 L360 175 L530 120" fill="none" stroke="#1f91a5" stroke-width="4"/></svg>',
mirror:'<svg viewBox="0 0 560 230" role="img" aria-label="Concave mirror ray diagram"><line x1="0" y1="130" x2="560" y2="130" stroke="#93aebd"/><path d="M470 35 Q410 130 470 225" fill="none" stroke="#31566d" stroke-width="5"/><line x1="105" y1="70" x2="105" y2="130" stroke="#1f91a5" stroke-width="5"/></svg>',
diopter:'<svg viewBox="0 0 560 230" role="img" aria-label="Spherical diopter"><line x1="0" y1="120" x2="560" y2="120" stroke="#9ab1bf"/><path d="M340 20 Q250 120 340 220" fill="#edf7fa" fill-opacity=".7" stroke="#426a81" stroke-width="4"/></svg>',
lens:'<svg viewBox="0 0 560 230" role="img" aria-label="Converging thin lens ray diagram"><line x1="0" y1="125" x2="560" y2="125" stroke="#99afbc"/><path d="M285 25 Q245 125 285 225 Q325 125 285 25" fill="#e6f6fa" stroke="#2b7388" stroke-width="3"/></svg>',
microscope:'<svg viewBox="0 0 600 230" role="img" aria-label="Compound microscope layout"><line x1="0" y1="125" x2="600" y2="125" stroke="#9cb2bf"/><path d="M215 35 Q185 125 215 215 Q245 125 215 35" fill="#e7f6fa" stroke="#2e7186" stroke-width="3"/><path d="M455 45 Q425 125 455 205 Q485 125 455 45" fill="#e7f6fa" stroke="#2e7186" stroke-width="3"/></svg>'
};

function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function load(){
  try{
    const current=JSON.parse(localStorage.getItem(KEY)); if(current)return current;
    const v3=JSON.parse(localStorage.getItem("physics-usthb.optics-tutorials.v3")); if(v3)return v3;
    const v2=JSON.parse(localStorage.getItem("physics-usthb.optics-tutorials.v2")); if(v2)return v2;
    const v1=JSON.parse(localStorage.getItem("physics-usthb.optics-tutorials.v1")); return v1||{};
  }catch(e){return {}}
}
function persist(){localStorage.setItem(KEY,JSON.stringify(state));updateProgress()}
function st(id){
  if(!state[id])state[id]={notes:"",final:"",choice:"",multi:[],solution:false,status:"new",rubric:[]};
  if(!Array.isArray(state[id].rubric))state[id].rubric=[];
  if(!Array.isArray(state[id].multi))state[id].multi=[];
  return state[id];
}
function mastered(list){return list.filter(q=>st(q.id).status==="mastered").length}
function sourceById(id){return (audit.sources||[]).find(s=>s.id===id)}
function exactSources(qid){return (audit.exactQuestionSources||{})[qid]||[]}
function hasLiveVisual(qid){return String((audit.visuals||{})[qid]||"").endsWith("-live")}
function updateProgress(){
  const done=mastered(questions),total=questions.length,pct=total?Math.round(100*done/total):0;
  $("#masteryPercent").textContent=pct+"%";
  $("#masteryBar").style.width=pct+"%";
  $("#masteryText").textContent=done+" of "+total+" exercises mastered";
  $("#questionCountBadge").textContent=total+" exercises";
}
function sourcePills(q){
  const refs=exactSources(q.id);
  if(!refs.length)return '<span class="pill provenance general">USTHB syllabus / course family</span>';
  return refs.map(([sid,label])=>{
    const s=sourceById(sid);
    return '<span class="pill provenance verified">'+esc((s?.kind==="TD"?"USTHB TD ":"USTHB source ")+(s?.year||"")+(label?" · "+label:""))+'</span>';
  }).join("");
}
function renderNav(){
  const nav=$("#seriesNav");nav.innerHTML="";
  series.forEach(s=>{
    const list=questions.filter(q=>q.series===s.id),done=mastered(list),pct=list.length?Math.round(100*done/list.length):0;
    const b=document.createElement("button");
    b.className="series-button"+((questions.find(q=>q.id===currentId)||{}).series===s.id?" active":"");
    b.innerHTML="<strong>"+esc(s.code)+" · "+esc(s.title)+"</strong><span>"+done+"/"+list.length+" mastered</span><div class=\"series-progress\"><i style=\"width:"+pct+"%\"></i></div>";
    b.addEventListener("click",()=>renderSeries(s.id));nav.appendChild(b);
  });
}
function renderSeries(id){
  const s=series.find(x=>x.id===id),list=questions.filter(q=>q.series===id);if(!s)return;
  if(list.length)currentId=list[0].id;renderNav();
  $("#crumbline").textContent=s.code.toUpperCase()+" / OVERVIEW";
  const rows=list.map((q,i)=>{
    const x=st(q.id),type=q.kind==="manual"?"derivation / reasoning":q.kind==="mcq"?"single-choice concept check":q.kind==="multi"?"multiple-selection concept check":"calculation";
    const tags=(exactSources(q.id).length?'<span class="row-tag source">source</span>':'')+((audit.visuals||{})[q.id]?'<span class="row-tag visual">visual</span>':'');
    return '<button class="question-row" data-q="'+q.id+'"><span class="qnum">'+String(i+1).padStart(2,"0")+'</span><span><strong>'+esc(q.title)+'</strong><span>Level '+q.level+' · '+type+' '+tags+'</span></span><i class="state-dot '+x.status+'"></i></button>';
  }).join("");
  $("#questionView").innerHTML='<article class="welcome-card"><div class="welcome-body"><span class="micro">'+esc(s.code.toUpperCase())+'</span><h2>'+esc(s.title)+'</h2><p>'+esc(s.summary)+'</p><div class="objective-list">'+s.topics.map(t=>'<span class="objective">'+esc(t)+'</span>').join("")+'</div>'+(conventions[s.id]?'<section class="convention-box"><div class="theory-label">USTHB SIGN / ANGLE CONVENTION</div><p>'+esc(conventions[s.id])+'</p></section>':'')+'<div class="chapter-study-note"><strong>Study route:</strong> read the convention and theory → solve without the solution → use the visual only when needed → check/self-assess → repeat until mastered.</div><h3 style="margin-top:24px">Exercises</h3><div class="series-overview">'+rows+'</div></div></article>';
  document.querySelectorAll("[data-q]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.q)));
  closeSidebar();$("#questionView").focus();
}
function theoryMarkup(q){
  const t=theories[q.theory];if(!t)return "";
  const convention=conventions[q.series]?'<section class="convention-box"><div class="theory-label">USTHB SIGN / ANGLE CONVENTION</div><p>'+esc(conventions[q.series])+'</p></section>':'';
  return convention+'<section class="theory-box"><div class="theory-label">THEORY BUILD-UP</div><h3>'+esc(t.title)+'</h3><ol>'+t.points.map(p=>'<li>'+esc(p)+'</li>').join("")+'</ol></section>';
}
function sourceMarkup(q){
  const refs=exactSources(q.id);
  const mapped=refs.length?'<div class="question-source-note"><strong>Recovered-source mapping:</strong> '+refs.map(([sid,label])=>{const s=sourceById(sid);return '<a href="'+esc(s?.url||"#")+'" target="_blank" rel="noopener">'+esc(s?.label||sid)+(label?" — "+esc(label):"")+'</a>'}).join(" · ")+'</div>':'';
  const warning=q.sourceWarning?'<div class="source-warning"><strong>Source audit note:</strong> '+esc(q.sourceWarning)+'</div>':'';
  return mapped+warning;
}
function visualMarkup(q){
  const key=(audit.visuals||{})[q.id];
  if(key){
    if(String(key).endsWith("-live"))return '<details class="interactive-details"><summary>Interactive model — open after your first attempt</summary><div class="student-visual" id="questionVisual"></div></details>';
    return '<div class="student-visual static-visual" id="questionVisual"></div>';
  }
  return q.figure&&fallbackFigures[q.figure]?'<div class="figure">'+fallbackFigures[q.figure]+'</div>':"";
}
function rubricMarkup(q,x){
  if(q.kind!=="manual"||!x.solution)return "";
  const checks=q.solution.map((step,i)=>'<label class="rubric-item"><input type="checkbox" data-rubric="'+i+'" '+(x.rubric[i]?"checked":"")+'><span><strong>Criterion '+(i+1)+'.</strong> My work contains this essential step/idea: '+esc(step)+'</span></label>').join("");
  const complete=q.solution.every((_,i)=>x.rubric[i]);
  return '<section class="rubric-box"><div class="theory-label">SELF-EVALUATION RUBRIC</div><h3>Check your derivation against the required steps</h3><p>Only tick a criterion if your own written solution included it before you compared with the worked solution.</p><div class="rubric-list">'+checks+'</div><div class="rubric-result '+(complete?"ok":"")+'">'+(complete?"All essential criteria are met. This exercise is mastered.":"Complete all criteria honestly to mark this derivation mastered.")+'</div></section>';
}
function renderQuestion(id){
  const q=questions.find(x=>x.id===id);if(!q)return;
  currentId=id;if(location.hash!=="#"+id)history.replaceState(null,"","#"+id);
  const s=series.find(x=>x.id===q.series),x=st(id),idx=questions.indexOf(q),chapterQuestions=questions.filter(y=>y.series===q.series),localIndex=chapterQuestions.indexOf(q);
  $("#crumbline").textContent=s.code.toUpperCase()+" / EXERCISE "+(localIndex+1)+" OF "+chapterQuestions.length;

  let checker="";
  if(q.kind==="numeric")checker='<div class="answer-check"><input id="finalAnswer" inputmode="decimal" placeholder="Final numerical value" aria-label="Final numerical answer"><button class="primary-btn" id="checkAnswer">Check result</button></div><div id="feedback"></div>';
  if(q.kind==="mcq")checker='<div class="answer-check"><select id="choiceAnswer" aria-label="Choose an answer"><option value="">Choose…</option>'+q.options.map((o,i)=>'<option value="'+i+'">'+esc(o)+'</option>').join("")+'</select><button class="primary-btn" id="checkAnswer">Check choice</button></div><div id="feedback"></div>';
  if(q.kind==="multi")checker='<div class="multi-check"><p>Select every answer that applies.</p>'+q.options.map((o,i)=>'<label><input type="checkbox" data-multi="'+i+'"> <span>'+esc(o)+'</span></label>').join("")+'<button class="primary-btn" id="checkAnswer">Check selections</button></div><div id="feedback"></div>';
  if(q.kind==="manual")checker='<div class="feedback">Write the derivation/reasoning in your own words first. After revealing the solution, a required-step rubric will evaluate your work.</div>';

  const solution=x.solution?'<section class="solution-box"><h3>Worked solution</h3><div class="solution-steps">'+q.solution.map((z,i)=>'<div class="solution-step"><strong>'+(i+1)+'.</strong> '+esc(z)+'</div>').join("")+'</div></section>':"";
  const status=x.status==="mastered"?'<span class="pill mastered">MASTERED</span>':x.status==="attempted"?'<span class="pill">ATTEMPTED</span>':"";
  const practiceAgain=x.status==="mastered"&&q.kind!=="manual"?'<button class="secondary-btn" id="practiceAgain">Practice again</button>':"";

  $("#questionView").innerHTML='<article class="exercise-card"><header class="exercise-top"><div class="exercise-meta"><span class="pill">'+esc(s.code.toUpperCase())+'</span><span class="pill level-'+q.level+'">LEVEL '+q.level+'</span>'+status+sourcePills(q)+'</div><h2>'+(localIndex+1)+'. '+esc(q.title)+'</h2><div class="objective-list">'+q.objectives.map(o=>'<span class="objective">'+esc(o)+'</span>').join("")+'</div></header><div class="exercise-body">'+theoryMarkup(q)+'<section class="problem-box"><div class="theory-label">EXERCISE</div><p class="prompt">'+esc(q.prompt)+'</p>'+sourceMarkup(q)+visualMarkup(q)+'</section><section class="work-area"><h3>Your working</h3><textarea id="notes" placeholder="Write your derivation, diagram notes, assumptions and intermediate calculations here…"></textarea>'+checker+'<div class="exercise-controls"><button class="secondary-btn" id="solutionButton">'+(x.solution?"Hide worked solution":"Reveal worked solution")+'</button>'+practiceAgain+'</div>'+solution+rubricMarkup(q,x)+'</section></div><div class="completion-strip"><span>Theory → independent attempt → visual if needed → check/rubric → mastery.</span><span>Exercise '+(idx+1)+' / '+questions.length+'</span></div></article>';

  const notes=$("#notes");notes.value=x.notes||"";
  notes.addEventListener("input",()=>{x.notes=notes.value;if(x.status==="new")x.status="attempted";persist();renderNav()});

  if(q.kind==="numeric"){
    const input=$("#finalAnswer");input.value=x.final||"";
    input.addEventListener("input",()=>{x.final=input.value;if(x.status==="new")x.status="attempted";persist()});
    $("#checkAnswer").addEventListener("click",()=>checkNumber(q));
  }
  if(q.kind==="mcq"){
    const select=$("#choiceAnswer");select.value=x.choice==null?"":x.choice;
    select.addEventListener("change",()=>{x.choice=select.value;if(x.status==="new")x.status="attempted";persist()});
    $("#checkAnswer").addEventListener("click",()=>checkChoice(q));
  }
  if(q.kind==="multi"){
    document.querySelectorAll("[data-multi]").forEach(cb=>{
      cb.checked=x.multi.includes(Number(cb.dataset.multi));
      cb.addEventListener("change",()=>{
        const n=Number(cb.dataset.multi);
        x.multi=cb.checked?[...new Set([...x.multi,n])]:x.multi.filter(v=>v!==n);
        if(x.status==="new")x.status="attempted";persist();
      });
    });
    $("#checkAnswer").addEventListener("click",()=>checkMulti(q));
  }
  $("#solutionButton").addEventListener("click",()=>{
    if(!x.solution){
      const attempted=(x.notes||"").trim().length>=12 ||
        (q.kind==="numeric"&&String(x.final||"").trim()!=="") ||
        (q.kind==="mcq"&&String(x.choice??"")!=="") ||
        (q.kind==="multi"&&x.multi.length>0);
      if(!attempted){
        alert("Make a genuine attempt first: write at least one step in Your working, enter a numerical result, or choose an answer. Then the worked solution can be revealed.");
        return;
      }
    }
    x.solution=!x.solution;if(x.status==="new")x.status="attempted";persist();renderQuestion(id);
  });
  if($("#practiceAgain"))$("#practiceAgain").addEventListener("click",()=>{x.status="attempted";x.final="";x.choice="";x.multi=[];x.solution=false;persist();renderQuestion(id)});
  document.querySelectorAll("[data-rubric]").forEach(cb=>cb.addEventListener("change",()=>{
    const n=Number(cb.dataset.rubric);x.rubric[n]=cb.checked;
    x.status=q.solution.every((_,i)=>x.rubric[i])?"mastered":"attempted";
    persist();renderQuestion(id);
  }));

  const visualKey=(audit.visuals||{})[q.id],host=$("#questionVisual");
  if(visualKey&&host&&visuals?.mount)visuals.mount(visualKey,host);

  $("#prevQuestion").disabled=idx===0;$("#nextQuestion").disabled=idx===questions.length-1;
  $("#prevQuestion").onclick=()=>idx>0&&go(questions[idx-1].id);
  $("#nextQuestion").onclick=()=>idx<questions.length-1&&go(questions[idx+1].id);
  renderNav();updateProgress();closeSidebar();$("#questionView").focus();
}
function checkNumber(q){
  const input=$("#finalAnswer"),box=$("#feedback"),v=Number(String(input.value).trim().replace(",",".")),x=st(q.id);
  x.final=input.value;x.status="attempted";
  if(!Number.isFinite(v)){box.className="feedback warn";box.textContent="Enter a numerical value before checking.";persist();return}
  if(Math.abs(v-q.answer)<=q.tol){x.status="mastered";box.className="feedback ok";box.textContent="Correct within tolerance. Marked mastered."}
  else{box.className="feedback warn";box.textContent="Not within tolerance yet. Re-check signs, units and algebra. The worked solution remains optional."}
  persist();renderNav();updateProgress();
}
function checkChoice(q){
  const select=$("#choiceAnswer"),box=$("#feedback"),x=st(q.id);
  if(select.value===""){box.className="feedback warn";box.textContent="Choose an option first.";return}
  const v=Number(select.value);x.choice=select.value;x.status="attempted";
  if(v===q.correct){x.status="mastered";box.className="feedback ok";box.textContent="Correct. Marked mastered."}
  else{box.className="feedback warn";box.textContent="Not correct yet. Re-use the theory and physical constraints before revealing the solution."}
  persist();renderNav();updateProgress();
}
function checkMulti(q){
  const box=$("#feedback"),x=st(q.id),got=[...x.multi].sort((a,b)=>a-b),expected=[...q.correct].sort((a,b)=>a-b);
  x.status="attempted";
  const ok=got.length===expected.length&&got.every((v,i)=>v===expected[i]);
  if(ok){x.status="mastered";box.className="feedback ok";box.textContent="All required selections are correct. Marked mastered."}
  else{box.className="feedback warn";box.textContent="Not correct yet. Check both the selected and unselected cases against the physical criterion."}
  persist();renderNav();updateProgress();
}
function go(id){currentId=id;renderQuestion(id)}
function coverage(){
  const cards=series.map(s=>'<div class="coverage-item"><strong>'+esc(s.code)+' · '+esc(s.title)+'</strong><span>'+s.topics.map(esc).join(" · ")+'</span><small>'+questions.filter(q=>q.series===s.id).length+' exercises</small></div>').join("");
  $("#coverageBody").innerHTML='<p><strong>Current audited bank:</strong> '+questions.length+' student-facing exercises across the six USTHB L2/S3 Geometrical Optics blocks. A question count is not used as a completeness claim: the Source sheets panel tracks the original sheets exercise-by-exercise.</p><div class="coverage-grid">'+cards+'</div><div class="source-box"><strong>Status rule:</strong> a sheet is only marked covered when every recoverable exercise is explicitly mapped. Missing or ambiguous statements remain visible as unresolved.</div>';
  openModal("coverageModal");
}
function sourcesPanel(){
  const src=(audit.sources||[]).map(s=>'<article class="source-card '+esc(s.status)+'"><div><span class="source-kind">'+esc(s.kind)+'</span><h3>'+esc(s.label)+'</h3><p>'+esc(s.year)+' · '+esc(s.note)+'</p></div><div class="source-actions"><span class="source-status">'+esc(s.status.replaceAll("-"," "))+'</span><a href="'+esc(s.url)+'" target="_blank" rel="noopener">Open source ↗</a>'+(s.localHref?'<a href="'+esc(s.localHref)+'">Open local lab coverage →</a>':'')+'</div></article>').join("");
  const unresolved=(audit.unresolved||[]).map(x=>'<li><strong>'+esc(x.label)+':</strong> '+esc(x.reason)+'</li>').join("");
  $("#sourcesBody").innerHTML='<p>This audit separates verified USTHB material from supplementary or inaccessible material. Exact source badges appear on mapped exercises.</p><div class="source-list">'+src+'</div><section class="unresolved-box"><h3>Not claimed as recovered</h3><ul>'+unresolved+'</ul></section>';
  openModal("sourcesModal");
}
function sourceSheetsPanel(){
  const statusLabel=s=>String(s||"").replaceAll("-"," ");
  const html=(audit.sheets||[]).map(sheet=>{
    const src=sourceById(sheet.sourceId);
    const rows=(sheet.exercises||[]).map(ex=>{
      const qlinks=(ex.q||[]).map(id=>{
        const q=questions.find(x=>x.id===id);
        return q?'<a href="#'+esc(id)+'" data-sheet-q="'+esc(id)+'">'+esc(id)+' · '+esc(q.title)+'</a>':'<span class="missing-map">'+esc(id)+'</span>';
      }).join("");
      const local=ex.localHref?'<a href="'+esc(ex.localHref)+'">Open laboratory coverage →</a>':'';
      return '<div class="sheet-exercise '+esc(ex.status)+'"><div class="sheet-ex-number">Ex. '+esc(ex.n)+'</div><div><span class="sheet-status">'+esc(statusLabel(ex.status))+'</span>'+(qlinks?'<div class="sheet-links">'+qlinks+'</div>':'')+(local?'<div class="sheet-links">'+local+'</div>':'')+(ex.note?'<p>'+esc(ex.note)+'</p>':'')+'</div></div>';
    }).join("");
    return '<section class="sheet-card"><header><div><span class="source-kind">'+esc(src?.year||"")+'</span><h3>'+esc(sheet.label)+'</h3></div><span class="sheet-overall '+esc(sheet.status)+'">'+esc(statusLabel(sheet.status))+'</span></header><div class="sheet-exercises">'+rows+'</div></section>';
  }).join("");
  $("#sourceSheetsBody").innerHTML='<p>This is the completeness ledger. It follows the recovered USTHB sheets themselves, not only the syllabus topics.</p>'+html;
  document.querySelectorAll("[data-sheet-q]").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();closeModal("sourceSheetsModal");go(a.dataset.sheetQ)}));
  openModal("sourceSheetsModal");
}
function shuffled(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function chooseAssessment(sourceOnly=false){
  const exact=new Set(Object.keys(audit.exactQuestionSources||{})),chosen=[];
  series.forEach(s=>{
    const pool=questions.filter(q=>q.series===s.id&&(q.kind==="numeric"||q.kind==="mcq")&&(sourceOnly?exact.has(q.id):!hasLiveVisual(q.id)));
    chosen.push(...shuffled(pool).slice(0,2));
  });
  return shuffled(chosen);
}
function startAssessment(sourceOnly=false){
  clearInterval(assessmentTimer);
  const chosen=chooseAssessment(sourceOnly),start=Date.now(),mode=sourceOnly?"USTHB source-only":"balanced mastery";
  state.__activeAssessment={ids:chosen.map(q=>q.id),start,answers:{},mode};persist();
  renderAssessment(chosen,start,mode);
}
function assessmentInput(q){
  if(q.kind==="numeric")return '<input class="assessment-input" data-assess="'+q.id+'" inputmode="decimal" placeholder="Numerical answer">';
  return '<select class="assessment-input" data-assess="'+q.id+'"><option value="">Choose…</option>'+q.options.map((o,i)=>'<option value="'+i+'">'+esc(o)+'</option>').join("")+'</select>';
}
function renderAssessment(chosen,start,mode="balanced mastery"){
  $("#assessmentBody").innerHTML='<div class="assessment-intro"><div><strong>12 questions · 2 per chapter · closed book · '+esc(mode)+'</strong><p>Theory reminders, interactives and worked solutions are hidden here. Numerical units are stated in each question. Submit once when finished.</p></div><div class="assessment-clock"><span>Elapsed</span><strong id="assessmentClock">00:00</strong></div></div><div class="assessment-questions">'+chosen.map((q,i)=>'<section class="assessment-q"><span class="qnum">'+(i+1)+'</span><div><span class="micro">'+esc(series.find(s=>s.id===q.series)?.title||"")+'</span><h3>'+esc(q.title)+'</h3><p>'+esc(q.prompt)+'</p>'+assessmentInput(q)+'</div></section>').join("")+'</div><div class="assessment-submit"><button class="primary-btn" id="submitAssessment">Submit assessment</button><button class="secondary-btn" id="cancelAssessment">Cancel</button></div>';
  const tick=()=>{const sec=Math.floor((Date.now()-start)/1000),m=String(Math.floor(sec/60)).padStart(2,"0"),s=String(sec%60).padStart(2,"0");if($("#assessmentClock"))$("#assessmentClock").textContent=m+":"+s};
  tick();assessmentTimer=setInterval(tick,1000);
  document.querySelectorAll("[data-assess]").forEach(el=>el.addEventListener("change",()=>{state.__activeAssessment.answers[el.dataset.assess]=el.value;persist()}));
  $("#submitAssessment").onclick=()=>gradeAssessment(chosen,start,mode);
  $("#cancelAssessment").onclick=()=>{clearInterval(assessmentTimer);delete state.__activeAssessment;persist();closeModal("assessmentModal")};
}
function gradeAssessment(chosen,start,mode="balanced mastery"){
  clearInterval(assessmentTimer);
  const answers=state.__activeAssessment?.answers||{},results=[],by={};
  chosen.forEach(q=>{
    const raw=answers[q.id]??"",value=q.kind==="numeric"?Number(String(raw).replace(",",".")):Number(raw);
    const ok=q.kind==="numeric"?Number.isFinite(value)&&Math.abs(value-q.answer)<=q.tol:String(raw)!==""&&value===q.correct;
    results.push({q,ok,raw});by[q.series]??={correct:0,total:0};by[q.series].total++;if(ok)by[q.series].correct++;
  });
  const correct=results.filter(r=>r.ok).length,total=results.length,score=20*correct/total,elapsed=Math.round((Date.now()-start)/1000);
  state.__assessments??=[];state.__assessments.unshift({date:new Date().toISOString(),mode,correct,total,score:Number(score.toFixed(2)),elapsed,ids:chosen.map(q=>q.id),by});state.__assessments=state.__assessments.slice(0,20);delete state.__activeAssessment;persist();
  const bands=series.map(s=>{const b=by[s.id]||{correct:0,total:0};return '<div class="assessment-band"><span>'+esc(s.title)+'</span><strong>'+b.correct+'/'+b.total+'</strong></div>'}).join("");
  const review=results.filter(r=>!r.ok).map(r=>'<li><a href="#'+r.q.id+'" data-review="'+r.q.id+'">'+esc(r.q.title)+'</a> — expected '+esc(r.q.kind==="numeric"?r.q.answer+" "+(r.q.unit||""):r.q.options[r.q.correct])+'</li>').join("");
  $("#assessmentBody").innerHTML='<section class="assessment-result"><span class="micro">RESULT</span><strong class="big-score">'+score.toFixed(1)+'/20</strong><p>'+correct+' of '+total+' correct · '+Math.floor(elapsed/60)+'m '+(elapsed%60)+'s</p><div class="assessment-bands">'+bands+'</div>'+(review?'<div class="review-box"><h3>Review these exercises</h3><ul>'+review+'</ul></div>':'<div class="feedback ok">Excellent: every assessed answer was correct.</div>')+'<button class="primary-btn" id="newAssessment">New assessment</button></section>';
  document.querySelectorAll("[data-review]").forEach(a=>a.addEventListener("click",()=>{closeModal("assessmentModal");go(a.dataset.review)}));
  $("#newAssessment").onclick=()=>startAssessment(mode==="USTHB source-only");
}
function assessmentPanel(){
  const history=(state.__assessments||[]).slice(0,5);
  $("#assessmentBody").innerHTML='<div class="assessment-start"><h3>Closed-book mastery checks</h3><p>Both modes draw two automatically gradable questions from every chapter and hide theory, visuals and solutions.</p><div class="assessment-mode-grid"><button class="primary-btn" id="startAssessment">Balanced mastery test</button><button class="secondary-btn" id="startSourceAssessment">Recovered USTHB source-only test</button></div></div>'+(history.length?'<h3>Recent attempts</h3><div class="assessment-history">'+history.map(a=>'<div><span>'+esc(a.mode||"balanced mastery")+' · '+new Date(a.date).toLocaleString()+'</span><strong>'+Number(a.score).toFixed(1)+'/20</strong></div>').join("")+'</div>':"");
  $("#startAssessment").onclick=()=>startAssessment(false);$("#startSourceAssessment").onclick=()=>startAssessment(true);openModal("assessmentModal");
}
function exportProgress(){
  const payload={course:"Geometrical Optics L2/S3",auditDate:audit.auditedAt||null,exportedAt:new Date().toISOString(),mastered:mastered(questions),total:questions.length,assessmentHistory:state.__assessments||[],progress:Object.fromEntries(Object.entries(state).filter(([k])=>!k.startsWith("__")))};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="geometrical-optics-learning-record.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function openModal(id){$("#"+id).hidden=false}
function closeModal(id){$("#"+id).hidden=true}
function closeSidebar(){$(".study-sidebar").classList.remove("open")}
$("#coverageButton").addEventListener("click",coverage);
$("#sourcesButton").addEventListener("click",sourcesPanel);
$("#sourceSheetsButton").addEventListener("click",sourceSheetsPanel);
$("#assessmentButton").addEventListener("click",assessmentPanel);
$("#exportButton").addEventListener("click",exportProgress);
$("#resetProgress").addEventListener("click",()=>{if(confirm("Reset all locally saved Geometrical Optics progress and assessment history on this browser?")){state={};persist();renderQuestion(questions[0].id)}});
$("#mobileSeries").addEventListener("click",()=>$(".study-sidebar").classList.toggle("open"));
document.querySelectorAll("[data-close-modal]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.closeModal||b.closest(".modal-backdrop").id)));
document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
window.addEventListener("hashchange",()=>{const id=location.hash.slice(1);if(questions.some(q=>q.id===id)&&id!==currentId)renderQuestion(id)});
if(questions.length)renderQuestion(currentId);else $("#questionView").innerHTML='<div class="empty">Exercise bank unavailable.</div>';
})();