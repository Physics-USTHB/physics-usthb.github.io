// Science-aware speech preprocessor for original A2 educational text.
// Only text *spoken by the browser* is transformed; displayed source and answer keys stay unchanged.
// This is a pronunciation aid, not experimental data, audio assessment, or CEFR evidence.

const UNITS=Object.freeze({
 "m/s²":["meter per second squared","meters per second squared"],
 "m/s^2":["meter per second squared","meters per second squared"],
 "rad/s":["radian per second","radians per second"],
 "m/s":["meter per second","meters per second"],
 "m²":["square meter","square meters"],
 "m^2":["square meter","square meters"],
 "m³":["cubic meter","cubic meters"],
 "m^3":["cubic meter","cubic meters"],
 "kΩ":["kiloohm","kiloohms"],
 "Ω":["ohm","ohms"],
 "kHz":["kilohertz","kilohertz"],
 "Hz":["hertz","hertz"],
 "µm":["micrometer","micrometers"],
 "mm":["millimeter","millimeters"],
 "cm":["centimeter","centimeters"],
 "kg":["kilogram","kilograms"],
 "ms":["millisecond","milliseconds"],
 "min":["minute","minutes"],
 "°C":["degree Celsius","degrees Celsius"],
 "°F":["degree Fahrenheit","degrees Fahrenheit"],
 "Pa":["pascal","pascals"],
 "V":["volt","volts"],
 "A":["ampere","amperes"],
 "K":["kelvin","kelvins"],
 "m":["meter","meters"],
 "g":["gram","grams"],
 "s":["second","seconds"],
 "h":["hour","hours"],
 "%":["percent","percent"]
});
const ones=["zero","one","two","three","four","five","six","seven","eight","nine",
 "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const tens=["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];

function numberWords(integer){
 if(integer<20)return ones[integer];
 if(integer<100)return tens[Math.floor(integer/10)]+(integer%10?"-"+ones[integer%10]:"");
 if(integer<1000)return ones[Math.floor(integer/100)]+" hundred"+
  (integer%100?" "+numberWords(integer%100):"");
 if(integer<10000)return numberWords(Math.floor(integer/1000))+" thousand"+
  (integer%1000?" "+numberWords(integer%1000):"");
 return String(integer).split("").map(d=>ones[Number(d)]).join(" ");
}
export function speakNumber(value){
 if(typeof value!=="string"||!/^[-+]?\d{1,4}(?:\.\d+)?$/.test(value))return value;
 const neg=value[0]==="-",raw=value.replace(/^[-+]/,"");
 const parts=raw.split(".");
 const first=numberWords(Number(parts[0]));
 const fraction=parts[1]===undefined?"":" point "+parts[1].split("").map(d=>ones[Number(d)]).join(" ");
 return (neg?"minus ":"")+first+fraction;
}
function safeUnit(value){
 return UNITS[value]||null;
}
export function speakUnit(symbol,number="2"){
 const names=safeUnit(symbol);
 if(!names)return symbol;
 return names[number==="1"||number==="-1"?0:1];
}
function escapeRegex(value){return value.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&");}
const symbols=Object.keys(UNITS).sort((a,b)=>b.length-a.length).map(escapeRegex).join("|");
const quantity=new RegExp("(?<![\\p{L}\\p{N}.])(-?\\d{1,4}(?:\\.\\d+)?)[ \\t]*("+symbols+")(?![\\p{L}\\p{N}/²³^])","gu");
const axisNames="Time|Position|Mass|Length|Voltage|Current|Temperature|Frequency|Resistance|Extension|Speed|Distance|Energy|Power|Period|Acceleration|Pressure|Volume";
const axis=new RegExp("\\b("+axisNames+")\\s*\\(\\s*("+symbols+")\\s*\\)","gi");

const namedUnitWords="ohms?|volts?|amperes?|meters?|seconds?|kilograms?|grams?|centimeters?|millimeters?|minutes?|hours?|kelvins?|hertz|pascals?|degrees?\\s+Celsius|radians?";
const namedQuantity=new RegExp("(?<![\\p{L}\\p{N}.])(-?\\d{1,4}(?:\\.\\d+)?)(?=\\s+(?:"+namedUnitWords+")(?![\\p{L}\\p{N}]))","giu");


export function scienceToSpeech(input){
 if(typeof input!=="string")throw Error("Speech input must be a string");
 return input
  .replace(axis,(_,quantityName,symbol)=>{
   const name=safeUnit(symbol);
   return name?quantityName+", in "+name[1]:quantityName+" ("+symbol+")";
  })
  .replace(quantity,(_,number,symbol)=>speakNumber(number)+" "+speakUnit(symbol,number))
  .replace(namedQuantity,(_,number)=>speakNumber(number))
  .replace(/(?<![\p{L}\p{N}.])(-?\d{1,4}\.\d+)(?![\p{L}\p{N}])/gu,
   (_,number)=>speakNumber(number));
}

function pipeCells(line){
 const row=line.trim();
 if(!row.startsWith("|")||!row.endsWith("|"))return null;
 return row.slice(1,-1).split("|").map(x=>x.trim());
}
function separatorRow(cells){
 return cells.every(c=>/^:?-{2,}:?$/.test(c));
}
function columnDescription(heading){
 const match=heading.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
 if(!match)return {label:heading,unit:null};
 return {label:match[1].trim(),unit:safeUnit(match[2].trim())?match[2].trim():null};
}
function tableToSpeech(rows){
 const parsed=rows.map(pipeCells).filter(Boolean);
 if(!parsed.length)return "";
 const header=parsed[0].map(columnDescription);
 const headerText=header.map(h=>h.label+(h.unit?", in "+speakUnit(h.unit):"")).join("; ");
 const rendered=["Table. Columns: "+headerText+"."];
 let count=0;
 for(const cells of parsed.slice(1)){
  if(separatorRow(cells))continue;
  count++;
  const parts=cells.map((cell,i)=>{
   const field=header[i]||{label:"Value",unit:null};
   let value=cell.replace(/\*\*/g,"").replace(/[*_]/g,"").trim();
   if(field.unit && /^-?\d{1,4}(?:\.\d+)?$/.test(value))value+=" "+field.unit;
   else if(/^-?\d{1,4}(?:\.\d+)?$/.test(value))value=speakNumber(value);
   return field.label+": "+value;
  });
  rendered.push("Row "+numberWords(count)+". "+parts.join(". ")+".");
 }
 return rendered.join(" ");
}
export function prepareCourseSpeech(input){
 if(typeof input!=="string")throw Error("Speech source must be a string");
 const lines=input.split(/\n/);
 const result=[];
 for(let i=0;i<lines.length;){
  if(pipeCells(lines[i])){
   const rows=[];
   while(i<lines.length&&pipeCells(lines[i]))rows.push(lines[i++]);
   result.push(tableToSpeech(rows));
  }else{
   result.push(lines[i++].replace(/\*\*/g,"").replace(/[*_]/g,""));
  }
 }
 return scienceToSpeech(result.join(" ").replace(/\s+/gu," ").trim());
}
