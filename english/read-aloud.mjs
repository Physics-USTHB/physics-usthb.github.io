// Optional pronunciation/listening support through the browser's built-in synthetic voice.
// Public course readings only. This is NOT reviewed narration or listening assessment.
export function createReadingAloud({onStart=()=>{}}={}){
 const canSpeak=typeof window!=="undefined" && "speechSynthesis" in window &&
   "SpeechSynthesisUtterance" in window;
 let current=null,controls=null;
 function stop(){
  if(canSpeak)window.speechSynthesis.cancel();
  current=null;
  if(controls){
   controls.play.disabled=false;
   controls.stop.disabled=true;
   controls.status.textContent="Playback stopped. Original recorded audio is still pending.";
  }
  controls=null;
 }
 if(canSpeak)window.addEventListener("pagehide",stop,{once:true});
 function attach(sourceContainer,paragraphs,title){
  const section=document.createElement("div");section.className="muted minor";
  const explanation=document.createElement("p");
  explanation.textContent="Optional listening aid: synthetic browser voice (quality/accent depend on your device). Not a recorded General American model, and not scored.";
  section.append(explanation);
  const play=document.createElement("button");play.className="btn light";play.type="button";
  play.textContent="Hear reading";
  const halt=document.createElement("button");halt.className="btn light";halt.type="button";
  halt.textContent="Stop audio";halt.disabled=true;
  const rateLabel=document.createElement("label");rateLabel.textContent="Speech pace ";
  const rate=document.createElement("select");
  for(const [value,label] of [["0.85","Slower"],["1","Normal"],["1.15","Faster"]]){
   const option=document.createElement("option");option.value=value;option.textContent=label;rate.append(option);
  }
  rate.value="0.85";rateLabel.append(rate);
  const status=document.createElement("span");status.setAttribute("role","status");
  status.style.display="block";
  if(!canSpeak){play.disabled=true;status.textContent="Synthetic read-aloud is unavailable in this browser.";}
  play.onclick=()=>{
   if(!canSpeak)return;
   onStart();
   stop();
   const text=paragraphs.filter(p=>typeof p==="string").join(" ").replace(/[|*#]/g," ");
   if(!text.trim()){status.textContent="No text available to read.";return;}
   const utterance=new SpeechSynthesisUtterance(text.slice(0,4500));
   utterance.lang="en-US";utterance.rate=Number(rate.value);
   const available=window.speechSynthesis.getVoices();
   const voice=available.find(v=>v.lang==="en-US")||available.find(v=>v.lang.startsWith("en"));
   if(voice)utterance.voice=voice;
   current=utterance;controls={play,stop:halt,status};
   play.disabled=true;halt.disabled=false;
   status.textContent="Playing a synthetic browser voice: "+title+".";
   utterance.onend=()=>{
    if(current!==utterance)return;
    current=null;play.disabled=false;halt.disabled=true;
    status.textContent="Read-aloud finished. Listening was not automatically scored.";
    controls=null;
   };
   utterance.onerror=()=>{
    if(current!==utterance)return;
    current=null;play.disabled=false;halt.disabled=true;
    status.textContent="Synthetic speech could not play on this device.";
    controls=null;
   };
   try{window.speechSynthesis.speak(utterance);}
   catch(_){status.textContent="Synthetic speech is unavailable.";stop();}
  };
  halt.onclick=stop;
  section.append(play,halt,rateLabel,status);
  sourceContainer.append(section);
 }
 return {attach,stop};
}
