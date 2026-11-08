// Optional local recording for learner self-review. No network upload, transcript or automatic score.
export function mountSpeaking(container,{onStartRecording=()=>{}}={}){
 if(!container)throw Error("Missing speaking container");
 const root=document.createElement("section");root.className="card";root.style.marginTop="20px";
 const heading=document.createElement("h2");heading.textContent="Speaking practice — private self-review";
 const description=document.createElement("p");
 description.textContent="Describe a physics example aloud. The microphone is activated only when you press Start. Audio remains in this browser session and is never submitted or automatically graded.";
 const task=document.createElement("p");task.className="muted";
 task.textContent="Choose a unit, then explain one of its examples in your own words.";
 const controls=document.createElement("div");
 const start=document.createElement("button");start.className="btn";start.type="button";start.textContent="Start recording";
 const stop=document.createElement("button");stop.className="btn light";stop.type="button";stop.textContent="Stop recording";stop.disabled=true;
 const discard=document.createElement("button");discard.className="btn light warn";discard.type="button";discard.textContent="Discard recording";discard.disabled=true;
 const download=document.createElement("button");download.className="btn light";download.type="button";download.textContent="Save recording to my device";download.disabled=true;
 const player=document.createElement("audio");player.controls=true;player.hidden=true;
 player.setAttribute("aria-label","Listen to your local speaking practice recording");
 const status=document.createElement("p");status.className="muted minor";status.setAttribute("role","status");
 const prompt=document.createElement("p");prompt.className="muted minor";
 prompt.textContent="Self-review: Can you be understood? Are your numbers and units clear? Are you describing only evidence from the source?";
 controls.append(start,stop,discard,download);
 root.append(heading,description,task,controls,player,prompt,status);
 container.append(root);
 let mediaRecorder=null,stream=null,chunks=[],blob=null,url=null,limit=null;
 let discardPending=false,disposed=false;
 function revoke(){
  if(url){URL.revokeObjectURL(url);url=null;}
  player.pause();player.removeAttribute("src");player.hidden=true;
  blob=null;download.disabled=true;discard.disabled=true;
 }
 function stopTracks(){
  stream?.getTracks().forEach(t=>t.stop());stream=null;
  if(limit!==null){clearTimeout(limit);limit=null;}
 }
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){
  start.disabled=true;
  status.textContent="Microphone recording is unavailable in this browser. You can still practise speaking without recording.";
 }
 start.addEventListener("click",async()=>{
  if(disposed||mediaRecorder?.state==="recording")return;
  try{
   revoke();chunks=[];discardPending=false;
   onStartRecording();
   stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
   if(disposed){stopTracks();return;}
   mediaRecorder=new MediaRecorder(stream);
   mediaRecorder.ondataavailable=e=>{if(!discardPending&&!disposed&&e.data?.size)chunks.push(e.data);};
   mediaRecorder.onerror=()=>{status.textContent="Recording error. No file was uploaded.";stopTracks();start.disabled=false;stop.disabled=true;};
   mediaRecorder.onstop=()=>{
    stopTracks();
    start.disabled=disposed;stop.disabled=true;
    if(discardPending||disposed){chunks=[];revoke();return;}
    const output=new Blob(chunks,{type:mediaRecorder.mimeType||"audio/webm"});chunks=[];
    if(!output.size){status.textContent="No usable audio was recorded.";return;}
    blob=output;url=URL.createObjectURL(blob);
    player.src=url;player.hidden=false;discard.disabled=false;download.disabled=false;
    status.textContent="Recording is ready for private playback. It was not automatically scored or uploaded.";
   };
   mediaRecorder.start();
   start.disabled=true;stop.disabled=false;discard.disabled=false;
   status.textContent="Recording in progress. Press Stop when ready (maximum two minutes).";
   limit=setTimeout(()=>{if(mediaRecorder?.state==="recording")mediaRecorder.stop();},120000);
  }catch(e){
   stopTracks();start.disabled=false;stop.disabled=true;
   status.textContent="Microphone permission was denied or recording is not supported. Nothing was recorded.";
  }
 });
 stop.addEventListener("click",()=>{if(mediaRecorder?.state==="recording")mediaRecorder.stop();});
 discard.addEventListener("click",()=>{
  discardPending=true;
  if(mediaRecorder?.state==="recording"){try{mediaRecorder.stop();}catch(_){}}
  stopTracks();chunks=[];revoke();stop.disabled=true;start.disabled=disposed;
  status.textContent="Recording discarded from this session.";
 });
 download.addEventListener("click",()=>{
  if(!blob)return;
  const fileUrl=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=fileUrl;
  a.download="physics-english-speaking-practice."+(blob.type.includes("mp4")?"m4a":"webm");
  a.click();setTimeout(()=>URL.revokeObjectURL(fileUrl),2000);
  status.textContent="Recording saved by your browser. It remains your private file.";
 });
 const dispose=()=>{disposed=true;discardPending=true;try{if(mediaRecorder?.state==="recording")mediaRecorder.stop();}catch(_){}stopTracks();chunks=[];revoke();};
 window.addEventListener("pagehide",dispose,{once:true});
 return {setPrompt(value){task.textContent=value;}};
}
