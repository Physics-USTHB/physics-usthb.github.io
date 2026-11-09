// A2 browser speech preferences. Select from the real voices available on this device.
// No keys, remote TTS service, user text upload, network call, or proficiency grading.
export const VOICE_PREF_KEY="physics-usthb-english-voice-v1";
const QUALITY=/\b(neural|natural|premium|enhanced|high.quality|studio)\b/i;
const US=/^en[-_]us$/i;
export function voiceKey(v){
 if(!v || typeof v.name!=="string" || typeof v.lang!=="string")return "";
 return [v.lang.toLowerCase(),v.name,String(v.voiceURI||""),String(v.localService===true)].join("::");
}
export function scoreVoice(v){
 if(!v || !/^en(?:[-_]|$)/i.test(String(v.lang||"")))return -1000;
 const name=String(v.name||"");
 return (US.test(v.lang)?75:30) +
  (QUALITY.test(name)?100:0) +
  (/microsoft.*(?:aria|jenny|guy|andrew|emma|ava|brian)/i.test(name)?55:0) +
  (/google.*english/i.test(name)?25:0) +
  (/samantha|alex|allison|serena/i.test(name)?18:0) +
  (v.default?5:0) +
  (v.localService===true?3:0);
}
export function englishVoices(all){
 return (Array.isArray(all)?all:[])
  .filter(v=>v && typeof v.name==="string" && /^en(?:[-_]|$)/i.test(String(v.lang||"")))
  .sort((a,b)=>scoreVoice(b)-scoreVoice(a)||
   a.name.localeCompare(b.name,"en"));
}
export function pickVoice(voices,preferredKey="auto"){
 const listed=englishVoices(voices);
 if(preferredKey && preferredKey!=="auto"){
  const match=listed.find(v=>voiceKey(v)===preferredKey);
  if(match)return match;
 }
 return listed[0]||null;
}
export function voiceServiceLabel(v){
 if(!v)return "Default device voice; location of synthesis is unknown";
 if(v.localService===true)return "On-device voice";
 if(v.localService===false)return "Online/service voice — public course text may be processed by its provider";
 return "Voice location unknown — browser/provider may use a service";
}

export function mountVoicePreferences(container,{onBeforePreview=()=>{}}={}){
 if(!container)throw Error("Voice settings need a container");
 const supported=typeof window!=="undefined" &&
  "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
 const root=document.createElement("section");
 root.className="card voice-settings";root.id="voice-settings";root.setAttribute("aria-label","American English voice preferences");
 root.style.marginTop="20px";
 const heading=document.createElement("h2");heading.textContent="Choose a smoother English voice";
 const help=document.createElement("p");help.className="muted";
 help.textContent="Select and preview the English voices available on your device. We suggest a natural or enhanced US English voice when available. The quality still depends on your browser and installed voices.";
 const label=document.createElement("label");label.htmlFor="voice-choice";label.textContent="Voice";
 const select=document.createElement("select");select.id="voice-choice";
 const preview=document.createElement("button");preview.type="button";preview.className="btn";
 preview.textContent="Preview voice";
 const stopButton=document.createElement("button");stopButton.type="button";stopButton.className="btn light";
 stopButton.textContent="Stop preview";stopButton.disabled=true;
 const reset=document.createElement("button");reset.type="button";reset.className="btn light";
 reset.textContent="Reset voice preference";
 const summary=document.createElement("p");summary.className="muted minor";summary.id="voice-note";
 summary.setAttribute("role","status");
 const note=document.createElement("p");note.className="muted minor";
 note.textContent="Some browsers offer only basic voices. Enhanced/neural voices may need to be installed or enabled in your device's accessibility or speech settings. Online voices may contact their own provider, so preview only public course text. Student answers and microphone recordings are not sent by this feature.";
 root.append(heading,help,label,select,preview,stopButton,reset,summary,note);
 container.append(root);
 let preferred="auto",currentPreview=null,voices=[],disposed=false;
 try{
  const prior=window.localStorage.getItem(VOICE_PREF_KEY);
  if(prior==="auto" || (prior && prior.length<=500))preferred=prior;
 }catch(_){/* A private/session-only preference still works. */}
 function savePref(){
  try{window.localStorage.setItem(VOICE_PREF_KEY,preferred);}catch(_){}
 }
 function selectedVoice(){return pickVoice(voices,preferred);}
 function describe(){
  if(!supported){summary.textContent="Speech synthesis is unavailable here. Reading transcripts remain available.";return;}
  const v=selectedVoice();
  if(!voices.length){
   summary.textContent="Voice list is still loading or unavailable. Your browser's default English voice can be previewed.";
   return;
  }
  summary.textContent=(preferred==="auto"?"Suggested voice: ":"Selected voice: ")+
    (v?v.name+" ("+v.lang+"). "+voiceServiceLabel(v):"Browser default voice.")+
    (preferred!=="auto" && !voices.some(x=>voiceKey(x)===preferred)?" Saved voice unavailable; using suggested voice.":"");
 }
 function refresh(){
  if(!supported||disposed)return;
  let available=[];
  try{available=window.speechSynthesis.getVoices()||[];}catch(_){}
  voices=englishVoices(available);
  select.replaceChildren();
  const auto=document.createElement("option");auto.value="auto";auto.textContent="Suggested natural US English (automatic)";
  select.append(auto);
  for(const voice of voices){
   const opt=document.createElement("option");opt.value=voiceKey(voice);
   opt.textContent=voice.name+" · "+voice.lang+" · "+voiceServiceLabel(voice);
   select.append(opt);
  }
  select.value=preferred==="auto"||voices.some(v=>voiceKey(v)===preferred)?preferred:"auto";
  describe();
 }
 function stopPreview(){
  if(!currentPreview)return;
  currentPreview=null;
  try{window.speechSynthesis.cancel();}catch(_){}
  preview.disabled=!supported;stopButton.disabled=true;
  summary.textContent="Voice preview stopped.";
 }
 select.onchange=()=>{
  stopPreview();
  preferred=select.value;savePref();describe();
 };
 preview.onclick=()=>{
  if(!supported)return;
  onBeforePreview();
  stopPreview();
  const voice=selectedVoice();
  const u=new SpeechSynthesisUtterance("Welcome to English for Physicists. The simulated cart moves smoothly. Position is measured in meters.");
  u.lang="en-US";u.rate=1.0;u.pitch=1.0;u.volume=1;
  if(voice)u.voice=voice;
  currentPreview=u;preview.disabled=true;stopButton.disabled=false;
  summary.textContent="Previewing "+(voice?.name||"browser default voice")+". "+voiceServiceLabel(voice);
  function end(error=false){
   if(currentPreview!==u)return;
   currentPreview=null;preview.disabled=false;stopButton.disabled=true;
   summary.textContent=error?"Voice preview failed on this device. Try another voice.":"Preview complete. Choose whichever voice sounds best to you.";
  }
  u.onend=()=>end(false);u.onerror=()=>end(true);
  try{window.speechSynthesis.speak(u);}
  catch(_){end(true);}
 };
 stopButton.onclick=stopPreview;
 reset.onclick=()=>{
  stopPreview();preferred="auto";
  try{window.localStorage.removeItem(VOICE_PREF_KEY);}catch(_){}
  refresh();
 };
 if(!supported){select.disabled=true;preview.disabled=true;reset.disabled=true;}
 else{
  refresh();
  if(typeof window.speechSynthesis.addEventListener==="function")
   window.speechSynthesis.addEventListener("voiceschanged",refresh);
 }
 if(supported)window.addEventListener("pagehide",stopPreview,{once:true});
 return {
  getVoice:selectedVoice,
  getDialogueVoice(turnIndex){
   const base=selectedVoice();
   if(turnIndex%2===0||preferred!=="auto")return base;
   return voices.find(v=>voiceKey(v)!==voiceKey(base) &&
    v.lang?.toLowerCase()==="en-us" && scoreVoice(v)>=scoreVoice(base)-75)||base;
  },
  getSelectedKey:()=>preferred,
  stopPreview,
  reset:()=>reset.click(),
  refresh,
  dispose(){
   disposed=true;stopPreview();root.remove();
   if(supported&&typeof window.speechSynthesis.removeEventListener==="function")
    window.speechSynthesis.removeEventListener("voiceschanged",refresh);
  }
 };
}
