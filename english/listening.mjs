// Optional synthetic dialogue practice and pronunciation self-review.
// Never represents recorded American-English audio, a listening diagnosis or CEFR mastery.
import {normalizeAnswer,shuffledOptions} from "./assessment.mjs";
import {prepareCourseSpeech} from "./science-speech.mjs";

export function validateListeningCatalog(catalog){
 const errors=[];
 if(!catalog || catalog.schemaVersion!==1 || catalog.language!=="en-US" ||
    catalog.contentStatus!=="draft" ||
    catalog.audioStatus!=="synthetic_browser_voice_only" ||
    catalog.assessmentStatus!=="formative_not_CEFR" || !catalog.units)
   return ["Invalid listening package header"];
 const ids=new Set();
 for(let n=1;n<=12;n++){
  const unit="A2."+String(n).padStart(2,"0"),scenes=catalog.units[unit];
  if(!Array.isArray(scenes)||scenes.length!==2){errors.push(unit+": expected two dialogues");continue;}
  for(let k=0;k<2;k++){
   const expected=unit+".L"+String(k+1).padStart(2,"0"),scene=scenes[k];
   if(!scene||scene.id!==expected||ids.has(scene.id)){errors.push(expected+": invalid dialogue ID");continue;}
   ids.add(scene.id);
   if(typeof scene.title!=="string"||scene.title.length<8 ||
      !Array.isArray(scene.turns)||scene.turns.length<2 ||
      scene.turns.some(t=>typeof t.speaker!=="string"||!t.speaker.trim()||
         typeof t.text!=="string"||t.text.length<8))errors.push(expected+": incomplete spoken script");
   const text=(scene.turns||[]).map(t=>t.text||"").join(" ");
   if(text.length<120)errors.push(expected+": dialogue too short");
   const p=scene.pronunciation;
   if(!p||p.assessment!=="self_review_only"||typeof p.phrase!=="string"||
      p.phrase.length<20||!text.includes(p.phrase)||
      typeof p.focus!=="string"||p.focus.length<24)
     errors.push(expected+": pronunciation target is not grounded in the spoken source");
   if(!Array.isArray(scene.questions)||scene.questions.length!==2){
    errors.push(expected+": expected two questions");continue;
   }
   for(let j=0;j<2;j++){
    const q=scene.questions[j],expectedQ=expected+".Q"+String(j+1).padStart(2,"0");
    if(!q||q.id!==expectedQ||ids.has(expectedQ)){errors.push(expectedQ+": duplicate or incorrect ID");continue;}
    ids.add(q.id);
    if(typeof q.prompt!=="string"||q.prompt.length<16 ||
       !Array.isArray(q.options)||q.options.length!==3||
       new Set(q.options.map(normalizeAnswer)).size!==3 ||
       !Array.isArray(q.accepted)||q.accepted.length!==1||
       !q.options.some(x=>normalizeAnswer(x)===normalizeAnswer(q.accepted[0])) ||
       typeof q.feedback!=="string"||q.feedback.length<25 ||
       q.status!=="draft"||q.media!=="synthetic_speech_or_transcript"||
       q.diagnosticEligible!==false)errors.push(expectedQ+": invalid or non-formative question");
   }
  }
 }
 if(ids.size!==72)errors.push("Expected 24 dialogues and 48 distinct question IDs");
 return errors;
}

export function listeningQuestionIds(catalog){
 if(validateListeningCatalog(catalog).length)throw Error("Invalid listening material");
 return new Set(Object.values(catalog.units).flatMap(scene=>scene.flatMap(s=>s.questions.map(q=>q.id))));
}

export function mountListeningPractice(container,{catalog,getAttempts,onAttempt,onStartAudio=()=>{},getVoice=()=>null,getDialogueVoice=()=>null}){
 if(!container||typeof getAttempts!=="function"||typeof onAttempt!=="function")
   throw Error("Missing listening practice dependencies");
 const errors=validateListeningCatalog(catalog);
 if(errors.length)throw Error(errors.slice(0,3).join("; "));
 const root=document.createElement("section");root.className="card listening-workshop";
 root.id="listening-workshop";root.style.marginTop="20px";
 container.append(root);
 let unit=null,playing=null,playButton=null,stopButton=null,playStatus=null;
 const canSpeak=("speechSynthesis" in window)&&("SpeechSynthesisUtterance" in window);
 function stop(){
  const old=playing;playing=null;
  if(canSpeak)window.speechSynthesis.cancel();
  if(playButton)playButton.disabled=false;
  if(stopButton)stopButton.disabled=true;
  if(playStatus&&old)playStatus.textContent="Playback stopped. Synthetic speech is practice support only.";
  playButton=null;stopButton=null;playStatus=null;
 }
 function play(content,speed,button,halt,status){
  if(!canSpeak)return;
  stop();
  onStartAudio();
  const turns=Array.isArray(content)?content.map((t,i)=>({
   text:prepareCourseSpeech(String(t.text||"").trim()),
   speaker:String(t.speaker||""),
   voice:getDialogueVoice(i)||getVoice()
  })): [{text:prepareCourseSpeech(String(content||"").trim()),speaker:"",voice:getVoice()}];
  if(!turns.some(t=>t.text)){status.textContent="No text available for speech playback.";return;}
  // Each character speaks their own complete turn; no robotic "Maya says" narration.
  // Chosen voices come from the student's own browser/device speech service.
  const session={index:0,turns,button,halt,status};
  playing=session;playButton=button;stopButton=halt;playStatus=status;
  button.disabled=true;halt.disabled=false;
  function next(){
   if(playing!==session)return;
   if(session.index>=session.turns.length){
    playing=null;button.disabled=false;halt.disabled=true;
    status.textContent="Playback complete. This was not a certified listening test.";
    playButton=null;stopButton=null;playStatus=null;
    return;
   }
   const turn=session.turns[session.index++];
   if(!turn.text){next();return;}
   const utterance=new SpeechSynthesisUtterance(turn.text);
   utterance.lang="en-US";utterance.rate=speed;utterance.pitch=1;utterance.volume=1;
   if(turn.voice)utterance.voice=turn.voice;
   status.textContent=(turn.speaker?turn.speaker+" speaking. ":"")+
     "Synthetic voice, not a reviewed American-English recording.";
   utterance.onend=()=>{if(playing===session)next();};
   utterance.onerror=()=>{
    if(playing!==session)return;
    playing=null;button.disabled=false;halt.disabled=true;
    playButton=null;stopButton=null;playStatus=null;
    status.textContent="Speech playback was interrupted. Use the written transcript instead.";
   };
   try{window.speechSynthesis.speak(utterance);}
   catch(_){
    playing=null;button.disabled=false;halt.disabled=true;
    playButton=null;stopButton=null;playStatus=null;
    status.textContent="Speech synthesis is unavailable. Use the transcript instead.";
   }
  }
  next();
 }
 function render(unitId){
  stop();root.replaceChildren();unit=unitId;
  const scenes=catalog.units[unitId];
  if(!scenes){root.hidden=true;return;}
  root.hidden=false;
  const heading=document.createElement("h2");heading.textContent="Listening and pronunciation workshop";
  const intro=document.createElement("p");intro.className="muted";
  intro.textContent="Two original dialogues and four comprehension questions. Audio is synthesized by your browser, not a reviewed American-English recording. You can always read the transcript. Answers are formative text comprehension practice, NOT a certified listening score.";
  root.append(heading,intro);
  for(const scene of scenes){
   const section=document.createElement("section");section.className="listening-scene";section.id="dialogue-"+scene.id;
   const title=document.createElement("h3");title.textContent=scene.title;
   const mode=document.createElement("p");mode.className="muted minor";
   mode.textContent="Fictional classroom dialogue · separate speaker turns · optional synthetic audio · full transcript available";
   section.append(title,mode);
   const controls=document.createElement("div");
   const hear=document.createElement("button");hear.type="button";hear.className="btn";
   hear.textContent="Hear dialogue";
   const halt=document.createElement("button");halt.type="button";halt.className="btn light";
   halt.textContent="Stop playback";halt.disabled=true;
   const paceLabel=document.createElement("label");paceLabel.textContent="Speech speed ";
   const pace=document.createElement("select");pace.setAttribute("aria-label","Synthetic speech speed for "+scene.title);
   for(const [val,label] of [["0.9","Slower"],["1","Natural"],["1.1","Faster"]]){
    const option=document.createElement("option");option.value=val;option.textContent=label;pace.append(option);
   }
   pace.value="1";paceLabel.append(pace);
   const status=document.createElement("p");status.className="muted minor";status.setAttribute("role","status");
   if(!canSpeak){hear.disabled=true;status.textContent="This browser has no speech synthesizer. Use the transcript for accessible reading practice.";}
   hear.onclick=()=>play(scene.turns,Number(pace.value),hear,halt,status);
   halt.onclick=stop;
   controls.append(hear,halt,paceLabel);section.append(controls,status);
   const transcript=document.createElement("details");
   const transcriptId="transcript-"+scene.id;transcript.id=transcriptId;
   const summary=document.createElement("summary");summary.textContent="Read full transcript (optional)";
   transcript.append(summary);
   for(const turn of scene.turns){
    const p=document.createElement("p"),speaker=document.createElement("strong");
    speaker.textContent=turn.speaker+": ";p.append(speaker,document.createTextNode(turn.text));
    transcript.append(p);
   }
   let transcriptUsed=false;
   transcript.addEventListener("toggle",()=>{if(transcript.open)transcriptUsed=true;});
   section.append(transcript);
   const instructions=document.createElement("p");instructions.className="muted minor";
   instructions.textContent="Use the audio, the transcript, or both. Revealing the transcript marks this attempt as assisted, but neither kind is scored as verified listening proficiency.";
   section.append(instructions);
   for(const q of scene.questions){
    const form=document.createElement("form");form.id="listen-"+q.id;
    const fieldset=document.createElement("fieldset"),legend=document.createElement("legend");
    legend.textContent=q.prompt;fieldset.append(legend);
    for(const option of shuffledOptions(q.options)){
     const label=document.createElement("label");label.className="option";
     const radio=document.createElement("input");
     radio.type="radio";radio.name=q.id;radio.value=option;radio.required=true;
     label.append(radio,document.createTextNode(" "+option));fieldset.append(label);
    }
    const submit=document.createElement("button");submit.className="btn";submit.type="submit";
    submit.textContent="Check comprehension";
    const feedback=document.createElement("p");feedback.className="feedback";feedback.setAttribute("role","status");
    form.append(fieldset,submit,feedback);
    form.onsubmit=async event=>{
     event.preventDefault();
     const answer=form.querySelector("input:checked")?.value;
     if(!answer)return;
     const attempts=getAttempts();
     const first=!attempts.some(a=>a.id===q.id);
     const correct=q.accepted.some(a=>normalizeAnswer(a)===normalizeAnswer(answer));
     const attempt={
      id:q.id,at:new Date().toISOString(),answer,first,correct,
      independent:false,hintsUsed:(transcriptUsed||transcript.open)?1:0,activityMode:"synthetic_or_transcript_comprehension"
     };
     const saved=await onAttempt(attempt);
     feedback.className="feedback "+(correct?"good":"bad");
     feedback.textContent=(correct?"Correct. ":"Not yet. ")+q.feedback+
       (transcriptUsed?" The transcript was opened in this session.":"")+
       " This exercise cannot certify listening proficiency."+(saved===false?" Progress could not be stored; export if needed.":"");
    };
    section.append(form);
   }
   const pronounce=document.createElement("section");pronounce.className="pronunciation-focus";
   const ptitle=document.createElement("h4");ptitle.textContent="Listen, repeat and self-review";
   const quote=document.createElement("blockquote");quote.textContent=scene.pronunciation.phrase;
   const focus=document.createElement("p");focus.className="muted minor";focus.textContent=scene.pronunciation.focus;
   const listenPhrase=document.createElement("button");listenPhrase.type="button";listenPhrase.className="btn light";
   listenPhrase.textContent="Hear example phrase";
   const stopPhrase=document.createElement("button");stopPhrase.type="button";stopPhrase.className="btn light";stopPhrase.textContent="Stop phrase";stopPhrase.disabled=true;
   const phraseStatus=document.createElement("p");phraseStatus.className="muted minor";phraseStatus.setAttribute("role","status");
   if(!canSpeak){listenPhrase.disabled=true;phraseStatus.textContent="Use the written phrase and the optional private recording tool to practise without synthetic audio.";}
   listenPhrase.onclick=()=>play(scene.pronunciation.phrase,1.0,listenPhrase,stopPhrase,phraseStatus);
   stopPhrase.onclick=stop;
   const note=document.createElement("p");note.className="muted minor";
   note.textContent="Repeat it aloud. You may record yourself using the private Speaking practice section below; no automatic accent or pronunciation grade is given.";
   pronounce.append(ptitle,quote,focus,listenPhrase,stopPhrase,phraseStatus,note);
   section.append(pronounce);root.append(section);
  }
 }
 window.addEventListener("pagehide",stop,{once:true});
 return {setUnit(id){if(id!==unit)render(id);},stop,getQuestionIds:()=>listeningQuestionIds(catalog)};
}
