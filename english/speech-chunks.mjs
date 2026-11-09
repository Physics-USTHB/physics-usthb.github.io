// Split long original texts at natural boundaries for browser speech playback.
// Avoid abrupt truncation and very long utterances that some engines stop early.
export function speechChunks(text,maxLength=1100){
 if(typeof text!=="string"||!Number.isInteger(maxLength)||maxLength<180||maxLength>5000)
  throw Error("Invalid speech text/limit");
 const cleaned=text.replace(/[|*#]/g," ").replace(/\s+/gu," ").trim();
 if(!cleaned)return [];
 const sentences=cleaned.split(/(?<=[.!?])\s+(?=[\p{Lu}\d“"'])/u).filter(Boolean);
 const chunks=[];
 let buffer="";
 const flush=()=>{if(buffer){chunks.push(buffer);buffer="";}};
 function append(part){
  if(!part)return;
  if(part.length>maxLength){
   const words=part.split(/\s+/u);
   for(const word of words){
    if(word.length>maxLength){
     flush();
     // Extremely long unbroken tokens are split without dropping characters.
     for(let i=0;i<word.length;i+=maxLength)chunks.push(word.slice(i,i+maxLength));
    }else if(!buffer)buffer=word;
    else if(buffer.length+1+word.length<=maxLength)buffer+=" "+word;
    else{flush();buffer=word;}
   }
  }else if(!buffer)buffer=part;
  else if(buffer.length+1+part.length<=maxLength)buffer+=" "+part;
  else{flush();buffer=part;}
 }
 for(const sentence of sentences)append(sentence);
 flush();
 return chunks;
}
