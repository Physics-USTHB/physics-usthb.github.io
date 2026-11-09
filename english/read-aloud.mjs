// Optional browser read-aloud, using the selected voice and the complete source text.
// Original recorded General American narration is not yet available or assessed.
import {speechChunks} from "./speech-chunks.mjs";
import {prepareCourseSpeech} from "./science-speech.mjs";
export function createReadingAloud({onStart=()=>{},getVoice=()=>null}={}){
 const supported=typeof window!=="undefined"&&"speechSynthesis" in window &&
   "SpeechSynthesisUtterance" in window;
 let playback=null;
 function clearControls(session,message){
  session.play.disabled=!supported;session.halt.disabled=true;
  if(message)session.status.textContent=message;
 }
 function stop(){
  const session=playback;playback=null;
  if(!session)return;
  try{window.speechSynthesis.cancel();}catch(_){}
  clearControls(session,"Playback stopped. Original recorded audio is still pending.");
 }
 if(supported)window.addEventListener("pagehide",stop,{once:true});
 function attach(sourceContainer,paragraphs,title){
  const section=document.createElement("div");section.className="muted minor";
  const info=document.createElement("p");
  info.textContent="Optional synthetic read-aloud in your chosen voice. Quality depends on your device; this is not reviewed American-English narration or a listening grade.";
  const play=document.createElement("button");play.className="btn light";play.type="button";
  play.textContent="Hear reading";
  const halt=document.createElement("button");halt.className="btn light";halt.type="button";
  halt.textContent="Stop audio";halt.disabled=true;
  const rateLabel=document.createElement("label");rateLabel.textContent="Speech pace ";
  const rate=document.createElement("select");rate.setAttribute("aria-label","Reading speed for "+title);
  for(const [value,label] of [["0.9","Slower"],["1","Natural"],["1.1","Faster"]]){
   const option=document.createElement("option");option.value=value;option.textContent=label;rate.append(option);
  }
  rate.value="1";rateLabel.append(rate);
  const status=document.createElement("span");status.setAttribute("role","status");
  status.style.display="block";
  if(!supported){play.disabled=true;status.textContent="Speech synthesis is unavailable here; the full text is still readable.";}
  play.onclick=()=>{
   if(!supported)return;
   onStart();
   stop();
   const text=(Array.isArray(paragraphs)?paragraphs:[]).filter(p=>typeof p==="string").map(prepareCourseSpeech).join(" ");
   const chunks=speechChunks(text);
   if(!chunks.length){status.textContent="No text is available to read.";return;}
   const session={chunks,index:0,play,halt,status};
   playback=session;
   play.disabled=true;halt.disabled=false;
   status.textContent="Playing "+title+" in the selected browser voice.";
   function next(){
    if(playback!==session)return;
    if(session.index>=session.chunks.length){
     playback=null;clearControls(session,"Read-aloud finished. It was not automatically scored.");return;
    }
    const u=new SpeechSynthesisUtterance(session.chunks[session.index++]);
    u.lang="en-US";u.rate=Number(rate.value);u.pitch=1;u.volume=1;
    const voice=getVoice();if(voice)u.voice=voice;
    u.onend=()=>{if(playback===session)next();};
    u.onerror=()=>{
     if(playback!==session)return;
     playback=null;
     clearControls(session,"The browser could not play this passage. You can still read the full text.");
    };
    try{window.speechSynthesis.speak(u);}
    catch(_){if(playback===session){playback=null;clearControls(session,"Speech playback was unavailable.");}}
   }
   next();
  };
  halt.onclick=stop;
  section.append(info,play,halt,rateLabel,status);
  sourceContainer.append(section);
 }
 return {attach,stop};
}
