(() => {
"use strict";
const ns="http://www.w3.org/2000/svg";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const deg=x=>x*Math.PI/180;
const rad=x=>x*180/Math.PI;
const fmt=(x,n=2)=>Number.isFinite(x)?Number(x).toFixed(n):"—";
const E=(tag,attrs={})=>{const e=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};
function svgBase(label){
  const s=E("svg",{viewBox:"0 0 720 320",role:"img","aria-label":label});
  s.classList.add("interactive-svg");return s;
}
function line(s,x1,y1,x2,y2,cls="ray"){const l=E("line",{x1,y1,x2,y2,class:cls});s.appendChild(l);return l}
function text(s,x,y,t,cls="vlabel"){const e=E("text",{x,y,class:cls});e.textContent=t;s.appendChild(e);return e}
function circle(s,cx,cy,r,cls="point"){const e=E("circle",{cx,cy,r,class:cls});s.appendChild(e);return e}
function hostShell(host,title){
  host.innerHTML='<div class="visual-head"><div><span class="theory-label">VISUAL MODEL</span><h3>'+title+'</h3></div><span class="visual-note">Change the controls and watch the geometry update.</span></div><div class="visual-controls"></div><div class="visual-canvas"></div><div class="visual-readout"></div>';
  return {controls:host.querySelector(".visual-controls"),canvas:host.querySelector(".visual-canvas"),readout:host.querySelector(".visual-readout")};
}
function addRange(parent,label,min,max,step,value,unit=""){
  const wrap=E("label",{class:"visual-control"}), span=E("span");span.textContent=label;
  const input=E("input",{type:"range",min,max,step,value});
  const out=E("strong");out.textContent=value+unit;
  input.addEventListener("input",()=>out.textContent=input.value+unit);
  wrap.append(span,input,out);parent.appendChild(wrap);return input;
}
function addSelect(parent,label,opts,value){
  const wrap=E("label",{class:"visual-control"}), span=E("span");span.textContent=label;
  const sel=E("select");
  opts.forEach(([v,t])=>{const o=E("option",{value:v});o.textContent=t;if(String(v)===String(value))o.selected=true;sel.appendChild(o)});
  wrap.append(span,sel);parent.appendChild(wrap);return sel;
}
function setReadout(el,items){el.innerHTML=items.map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join("")}

function mountRefraction(host){
  const ui=hostShell(host,"Refraction / total internal reflection");
  const n1=addRange(ui.controls,"n₁",1,2,0.01,1.00),n2=addRange(ui.controls,"n₂",1,2,0.01,1.50),inc=addRange(ui.controls,"incidence i",0,80,1,30,"°");
  const s=svgBase("Interactive Snell-Descartes refraction diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";const a=Number(n1.value),b=Number(n2.value),i=Number(inc.value),cx=360,cy=160;
    line(s,40,cy,680,cy,"interface");line(s,cx,25,cx,295,"normal");
    const L=210,ix=cx-L*Math.sin(deg(i)),iy=cy-L*Math.cos(deg(i));line(s,ix,iy,cx,cy,"ray incident");
    const sinr=a*Math.sin(deg(i))/b;
    let status,r;
    if(Math.abs(sinr)>1){status="total internal reflection";r=null;const rx=cx+L*Math.sin(deg(i)),ry=cy-L*Math.cos(deg(i));line(s,cx,cy,rx,ry,"ray reflected")}
    else{r=rad(Math.asin(sinr));status=b>a?"bends toward normal":b<a?"bends away from normal":"undeviated";const rx=cx+L*Math.sin(deg(r)),ry=cy+L*Math.cos(deg(r));line(s,cx,cy,rx,ry,"ray refracted")}
    text(s,55,145,"medium 1 · n₁="+fmt(a));text(s,55,185,"medium 2 · n₂="+fmt(b));text(s,300,65,"i="+fmt(i,1)+"°");if(r!==null)text(s,382,245,"r="+fmt(r,1)+"°");
    setReadout(ui.readout,[["Snell result",r===null?"TIR":fmt(r,2)+"°"],["Behaviour",status],["Critical angle",a>b?fmt(rad(Math.asin(b/a)),2)+"°":"not applicable"]]);
  };
  [n1,n2,inc].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountPlate(host){
  const ui=hostShell(host,"Plane-parallel plate");
  const n=addRange(ui.controls,"glass n",1.1,2,0.01,1.50),th=addRange(ui.controls,"thickness",1,8,0.1,4," cm"),inc=addRange(ui.controls,"incidence",0,75,1,45,"°");
  const s=svgBase("Interactive plane parallel plate ray diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";const nn=+n.value,t=+th.value,i=+inc.value,r=rad(Math.asin(Math.sin(deg(i))/nn)),d=t*Math.sin(deg(i-r))/Math.cos(deg(r));
    const y1=115,y2=205,cx=310,scale=110/4;
    s.appendChild(E("rect",{x:0,y:y1,width:720,height:y2-y1,class:"glass"}));line(s,0,y1,720,y1,"interface");line(s,0,y2,720,y2,"interface");
    const L=150,x0=cx-L*Math.sin(deg(i)),yy0=y1-L*Math.cos(deg(i));line(s,x0,yy0,cx,y1,"ray incident");
    const dy=y2-y1,dx=dy*Math.tan(deg(r));const x2=cx+dx;line(s,cx,y1,x2,y2,"ray refracted");
    const x3=x2+L*Math.sin(deg(i)),y3=y2+L*Math.cos(deg(i));line(s,x2,y2,x3,y3,"ray emergent");
    line(s,cx,y1,cx+dy*Math.tan(deg(i))+L*Math.sin(deg(i)),y2+L*Math.cos(deg(i)),"construction");
    text(s,25,105,"air");text(s,25,165,"glass n="+fmt(nn));text(s,25,225,"air");
    setReadout(ui.readout,[["internal angle r",fmt(r,2)+"°"],["lateral shift",fmt(d,2)+" cm"],["emergent direction","parallel to incident"]]);
  };
  [n,th,inc].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountLayers(host){
  const ui=hostShell(host,"Escape cone through layered liquids");
  const n1=addRange(ui.controls,"lower n₁",1.1,2.2,0.01,2.00),n2=addRange(ui.controls,"upper n₂",1.05,1.8,0.01,1.25),h1=addRange(ui.controls,"lower depth",2,20,0.5,10," cm"),h2=addRange(ui.controls,"upper depth",0,25,0.5,18," cm");
  const s=svgBase("Interactive two-layer escape cone");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";const a=+n1.value,b=+n2.value,H1=+h1.value,H2=+h2.value;
    const i2=Math.asin(1/b),sin1=clamp(b*Math.sin(i2)/a,-1,1),i1=Math.asin(sin1),R=H1*Math.tan(i1)+H2*Math.tan(i2);
    const yTop=60,yMid=155,yBot=280,cx=360; s.appendChild(E("rect",{x:0,y:yTop,width:720,height:yMid-yTop,class:"liquid upper"}));s.appendChild(E("rect",{x:0,y:yMid,width:720,height:yBot-yMid,class:"liquid lower"}));
    line(s,0,yTop,720,yTop,"interface");line(s,0,yMid,720,yMid,"interface");circle(s,cx,yBot-5,6,"source");
    const maxX=260,scale=maxX/Math.max(R,1),xMid=cx+H1*Math.tan(i1)*scale,xTop=cx+R*scale;
    line(s,cx,yBot-5,xMid,yMid,"ray incident");line(s,xMid,yMid,xTop,yTop,"ray refracted");line(s,cx,yBot-5,2*cx-xMid,yMid,"ray incident");line(s,2*cx-xMid,yMid,2*cx-xTop,yTop,"ray refracted");
    text(s,25,50,"air");text(s,25,105,"upper liquid n₂="+fmt(b));text(s,25,225,"lower liquid n₁="+fmt(a));text(s,cx-18,305,"source");
    setReadout(ui.readout,[["upper critical angle",fmt(rad(i2),2)+"°"],["lower-layer angle",fmt(rad(i1),2)+"°"],["escape radius",fmt(R,2)+" cm"]]);
  };
  [n1,n2,h1,h2].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountFibre(host){
  const ui=hostShell(host,"Step-index optical fibre");
  const nc=addRange(ui.controls,"core nᶜ",1.3,1.7,0.005,1.48),ng=addRange(ui.controls,"cladding nᵍ",1.2,1.65,0.005,1.46),inc=addRange(ui.controls,"launch angle",0,35,0.5,10,"°");
  const s=svgBase("Interactive step-index fibre acceptance diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    let c=+nc.value,g=Math.min(+ng.value,c-0.005); if(+ng.value>=c){ng.value=(c-0.005).toFixed(3);g=+ng.value}
    const i=+inc.value,NA=Math.sqrt(Math.max(0,c*c-g*g)),imax=rad(Math.asin(clamp(NA,0,1))),theta=rad(Math.asin(clamp(Math.sin(deg(i))/c,-1,1))),ok=i<=imax+1e-9;
    s.innerHTML="";s.appendChild(E("rect",{x:170,y:95,width:510,height:130,class:"cladding"}));s.appendChild(E("rect",{x:170,y:120,width:510,height:80,class:"core"}));line(s,35,160,170,160,"axis");
    line(s,35,160,170,160-(170-35)*Math.tan(deg(i)),"ray incident");
    let x=170,y=160,dir=1;const slope=Math.tan(deg(theta));
    for(let k=0;k<6&&x<680;k++){let nx=Math.min(680,x+100),ny=y+dir*(nx-x)*slope;if(ny>198||ny<122){const bound=dir>0?198:122;nx=x+(bound-y)/(dir*slope||1e-6);ny=bound;line(s,x,y,nx,ny,ok?"ray guided":"ray rejected");if(!ok){line(s,nx,ny,Math.min(680,nx+90),ny+dir*70,"ray rejected");break}dir*=-1;x=nx;y=ny}else{line(s,x,y,nx,ny,ok?"ray guided":"ray rejected");x=nx;y=ny}}
    text(s,185,115,"cladding");text(s,185,155,"core");text(s,185,220,"cladding");
    setReadout(ui.readout,[["NA",fmt(NA,4)],["max launch angle",fmt(imax,2)+"°"],["current ray",ok?"guided by TIR":"outside acceptance cone"]]);
  };
  [nc,ng,inc].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountMirror(host){
  const ui=hostShell(host,"Spherical mirror image formation");
  const kind=addSelect(ui.controls,"mirror",[["concave","concave"],["convex","convex"]],"concave"),fmag=addRange(ui.controls,"|f|",8,45,1,20," cm"),obj=addRange(ui.controls,"object distance",10,100,1,60," cm");
  const s=svgBase("Interactive spherical mirror ray diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";const f=(kind.value==="concave"?1:-1)*(+fmag.value),doo=+obj.value,inv=1/f-1/doo,di=Math.abs(inv)<1e-6?Infinity:1/inv,m=Number.isFinite(di)?-di/doo:Infinity;
    const mx=590,axis=170,scale=4,ox=mx-doo*scale,oh=70;line(s,20,axis,700,axis,"axis");s.appendChild(E("path",{d:kind.value==="concave"?"M590 55 Q535 170 590 285":"M590 55 Q645 170 590 285",class:"mirror"}));
    line(s,ox,axis,ox,axis-oh,"object");text(s,ox-22,axis-oh-10,"object");
    const fx=mx-f*scale;circle(s,fx,axis,4,"focus");text(s,fx-6,axis+23,"F");
    if(Number.isFinite(di)&&Math.abs(di)<150){const ix=mx-di*scale,ih=oh*m;line(s,ix,axis,ix,axis-ih,"image");text(s,ix-18,axis-ih+(ih<0?22:-10),"image")}
    if(kind.value==="concave"){line(s,ox,axis-oh,mx,axis-oh,"ray incident");line(s,mx,axis-oh,fx,axis,"ray reflected");line(s,ox,axis-oh,mx,axis,"ray incident");if(Number.isFinite(di))line(s,mx,axis,mx-di*scale,axis-oh*m,"ray reflected")}
    setReadout(ui.readout,[["image distance",Number.isFinite(di)?fmt(di,2)+" cm":"∞"],["magnification",Number.isFinite(m)?fmt(m,2):"∞"],["image",di>0?"real":di<0?"virtual":"at infinity"]]);
  };
  [kind,fmag,obj].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountPrism(host){
  const ui=hostShell(host,"Prism deviation");
  const A=addRange(ui.controls,"apex A",30,75,1,60,"°"),n=addRange(ui.controls,"index n",1.2,1.8,0.01,1.50),inc=addRange(ui.controls,"incidence i",5,80,1,50,"°");
  const s=svgBase("Interactive prism deviation diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";const aa=+A.value,nn=+n.value,i=+inc.value,r1=rad(Math.asin(clamp(Math.sin(deg(i))/nn,-1,1))),r2=aa-r1,crit=rad(Math.asin(1/nn));let e=null,D=null,status="";
    if(r2<0){status="geometry invalid: r₁>A"}
    else if(r2>crit){status="total internal reflection at second face"}
    else{e=rad(Math.asin(nn*Math.sin(deg(r2))));D=i+e-aa;status="transmitted"}
    s.appendChild(E("path",{d:"M360 35 L155 275 L565 275 Z",class:"prism"}));line(s,30,170,235,170,"ray incident");line(s,235,170,455,215,"ray refracted");if(e!==null)line(s,455,215,690,150,"ray emergent");else line(s,455,215,370,275,"ray reflected");
    text(s,350,65,"A="+fmt(aa,0)+"°");text(s,40,155,"i="+fmt(i,0)+"°");text(s,510,250,"n="+fmt(nn));
    setReadout(ui.readout,[["r₁",fmt(r1,2)+"°"],["r₂",fmt(r2,2)+"°"],["emergence",e===null?status:fmt(e,2)+"°"],["deviation D",D===null?"—":fmt(D,2)+"°"]]);
  };
  [A,n,inc].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountLens(host){
  const ui=hostShell(host,"Thin-lens ray model");
  const kind=addSelect(ui.controls,"lens",[["conv","converging"],["div","diverging"]],"conv"),fmag=addRange(ui.controls,"|f|",5,30,1,10," cm"),obj=addRange(ui.controls,"object distance",4,60,1,30," cm");
  const s=svgBase("Interactive thin lens image formation");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";const f=(kind.value==="conv"?1:-1)*(+fmag.value),doo=+obj.value,inv=1/f-1/doo,di=Math.abs(inv)<1e-7?Infinity:1/inv,m=Number.isFinite(di)?-di/doo:Infinity;
    const lx=360,axis=170,scale=6,ox=lx-doo*scale,oh=60;line(s,20,axis,700,axis,"axis");
    s.appendChild(E("path",{d:kind.value==="conv"?"M360 45 Q320 170 360 295 Q400 170 360 45":"M335 45 Q380 170 335 295 M385 45 Q340 170 385 295",class:"lens"}));
    line(s,ox,axis,ox,axis-oh,"object");const f1=lx-f*scale,f2=lx+f*scale;circle(s,f1,axis,4,"focus");circle(s,f2,axis,4,"focus");text(s,f1-8,axis+22,"F");text(s,f2-8,axis+22,"F′");
    if(Number.isFinite(di)&&Math.abs(di)<55){const ix=lx+di*scale,ih=oh*m;line(s,ix,axis,ix,axis-ih,"image")}
    line(s,ox,axis-oh,lx,axis-oh,"ray incident");
    if(kind.value==="conv"){line(s,lx,axis-oh,f2,axis,"ray refracted")}else{line(s,lx,axis-oh,lx+170,axis-oh+170*(axis-oh-(axis))/((lx)-(f2)||1),"ray refracted")}
    line(s,ox,axis-oh,lx,axis,"ray incident");line(s,lx,axis,lx+220,axis+(220)*(oh)/(lx-ox),"ray refracted");
    setReadout(ui.readout,[["image distance",Number.isFinite(di)?fmt(di,2)+" cm":"∞"],["magnification",Number.isFinite(m)?fmt(m,2):"∞"],["image",di>0?"real":di<0?"virtual":"at infinity"]]);
  };
  [kind,fmag,obj].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountEye(host){
  const ui=hostShell(host,"Reduced eye focus");
  const power=addRange(ui.controls,"eye power",55,70,0.1,60.6," D"),obj=addRange(ui.controls,"object distance",0.2,10,0.1,10," m");
  const s=svgBase("Interactive reduced-eye focusing diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";const P=+power.value,doo=+obj.value,di=1/(P-1/doo),retina=0.0165,err=(di-retina)*1000;
    line(s,25,170,700,170,"axis");s.appendChild(E("ellipse",{cx:455,cy:170,rx:115,ry:125,class:"eye"}));s.appendChild(E("path",{d:"M405 75 Q365 170 405 265 Q445 170 405 75",class:"lens"}));line(s,545,65,545,275,"retina");
    const fx=405+di*5000;line(s,40,115,405,115,"ray incident");line(s,405,115,clamp(fx,405,670),170,"ray refracted");line(s,40,225,405,225,"ray incident");line(s,405,225,clamp(fx,405,670),170,"ray refracted");circle(s,fx,170,5,Math.abs(err)<0.3?"focus good":"focus bad");text(s,555,85,"retina");
    setReadout(ui.readout,[["image distance",fmt(di*1000,2)+" mm"],["retina",fmt(retina*1000,1)+" mm"],["focus error",fmt(err,2)+" mm"],["status",Math.abs(err)<0.3?"focused on retina":err<0?"focus in front of retina":"focus behind retina"]]);
  };
  [power,obj].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountTelescope(host){
  const ui=hostShell(host,"Afocal astronomical telescope");
  const fo=addRange(ui.controls,"objective f",200,1500,10,1000," mm"),fe=addRange(ui.controls,"eyepiece f",10,80,1,20," mm");
  const s=svgBase("Interactive astronomical telescope ray diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";const a=+fo.value,b=+fe.value,G=a/b;line(s,20,170,700,170,"axis");s.appendChild(E("path",{d:"M180 45 Q140 170 180 295 Q220 170 180 45",class:"lens"}));s.appendChild(E("path",{d:"M535 70 Q505 170 535 270 Q565 170 535 70",class:"lens"}));
    line(s,20,95,180,95,"ray incident");line(s,20,130,180,130,"ray incident");line(s,180,95,480,170,"ray refracted");line(s,180,130,480,170,"ray refracted");line(s,480,170,535,120,"ray refracted");line(s,535,120,700,85,"ray emergent");line(s,480,170,535,150,"ray refracted");line(s,535,150,700,115,"ray emergent");
    text(s,130,35,"objective");text(s,500,55,"eyepiece");
    setReadout(ui.readout,[["normal-adjustment length",fmt(a+b,0)+" mm"],["|angular magnification|",fmt(G,1)+"x"],["final bundle","parallel (afocal)"]]);
  };
  [fo,fe].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function staticSvg(key){
  const s=svgBase(key.replaceAll("-"," "));
  line(s,20,170,700,170,"axis");
  const T=(x,y,t)=>text(s,x,y,t);
  if(key==="object-image"){line(s,190,75,190,170,"object");line(s,530,80,530,170,"image");line(s,360,35,360,295,"system");T(120,65,"real object: rays diverge");T(465,65,"real image: rays converge");line(s,190,75,360,120,"ray incident");line(s,360,120,530,80,"ray refracted");line(s,190,75,360,200,"ray incident");line(s,360,200,530,80,"ray refracted")}
  else if(key==="wavefront"){for(let x=80;x<330;x+=45)line(s,x,40,x,145,"wavefront");for(let x=430;x<690;x+=45)line(s,x,175,x-50,290,"wavefront");line(s,0,155,720,155,"interface");line(s,170,30,360,155,"ray incident");line(s,360,155,500,300,"ray refracted");T(60,25,"incident wavefronts");T(480,305,"refracted wavefronts")}
  else if(key==="index-order"){line(s,0,105,720,105,"interface");line(s,0,225,720,225,"interface");line(s,145,25,300,105,"ray incident");line(s,300,105,390,225,"ray refracted");line(s,390,225,520,300,"ray emergent");T(35,85,"compare angles to normal");T(35,155,"toward normal ⇒ higher n");T(35,265,"away ⇒ lower n")}
  else if(key==="refraction-choice"){line(s,0,160,720,160,"interface");line(s,360,25,360,295,"normal");line(s,155,55,360,160,"ray incident");line(s,360,160,470,290,"ray refracted");line(s,360,160,650,225,"wrong");T(470,275,"possible");T(595,210,"too far from normal")}
  else if(key==="plane-mirror"){line(s,360,30,360,295,"mirrorline");line(s,180,95,180,170,"object");line(s,540,95,540,170,"virtual");line(s,180,95,360,105,"ray incident");line(s,360,105,90,40,"ray reflected");line(s,360,105,540,95,"construction");T(160,75,"object");T(515,75,"image")}
  else if(key==="two-mirrors"){line(s,360,160,100,300,"mirrorline");line(s,360,160,620,300,"mirrorline");line(s,360,65,360,160,"ray incident");line(s,360,160,200,245,"ray reflected");line(s,200,245,420,300,"ray reflected");T(325,45,"two reflections")}
  else if(key==="mirror-field"){line(s,360,80,360,260,"mirrorline");circle(s,160,170,6,"eye");circle(s,560,170,6,"virtual");line(s,560,170,360,90,"construction");line(s,560,170,360,250,"construction");line(s,360,90,40,10,"ray reflected");line(s,360,250,40,320,"ray reflected");T(90,160,"eye");T(500,160,"virtual eye");T(40,300,"visible field bounded by rim rays")}
  else if(key==="two-spherical-mirrors"){s.appendChild(E("path",{d:"M120 55 Q200 170 120 285",class:"mirror"}));s.appendChild(E("path",{d:"M600 55 Q520 170 600 285",class:"mirror"}));line(s,360,95,360,170,"object");T(95,40,"mirror 1");T(555,40,"mirror 2");T(290,300,"image from first becomes object for second")}
  else if(key==="diopter"){s.appendChild(E("path",{d:"M390 35 Q300 170 390 305",class:"diopter"}));line(s,120,95,120,170,"object");line(s,120,95,390,115,"ray incident");line(s,390,115,560,155,"ray refracted");line(s,120,95,390,170,"ray incident");line(s,390,170,560,155,"ray refracted");T(350,25,"spherical diopter")}
  else if(key==="focal-plane"){line(s,520,45,520,295,"focalplane");circle(s,520,170,4,"focus");line(s,40,75,350,75,"ray incident");line(s,40,105,350,105,"ray incident");line(s,350,75,520,120,"ray refracted");line(s,350,105,520,120,"ray refracted");T(530,55,"image focal plane");T(530,120,"secondary focus")}
  else if(key==="spherical-aberration"){s.appendChild(E("path",{d:"M390 35 Q300 170 390 305",class:"diopter"}));[70,110,145].forEach((y,j)=>{line(s,35,y,340,y,"ray incident");line(s,340,y,520+j*35,170,"ray refracted")});T(470,300,"marginal/paraxial rays cross at different points")}
  else if(key==="glass-sphere"){circle(s,360,170,115,"sphere");line(s,35,110,245,110,"ray incident");line(s,245,110,420,145,"ray refracted");line(s,420,145,610,170,"ray emergent");T(250,35,"two successive spherical diopters")}
  else if(key==="prism"||key==="dispersion-prism"){s.appendChild(E("path",{d:"M360 35 L155 275 L565 275 Z",class:"prism"}));line(s,25,170,235,170,"ray incident");if(key==="dispersion-prism"){line(s,235,170,455,205,"ray red");line(s,235,170,455,220,"ray violet");line(s,455,205,690,150,"ray red");line(s,455,220,690,185,"ray violet");T(590,140,"red");T(590,205,"violet")}else{line(s,235,170,455,215,"ray refracted");line(s,455,215,690,150,"ray emergent")}T(345,65,"A")}
  else if(key==="lens-shapes"){["biconvex","plano-convex","biconcave","meniscus"].forEach((t,i)=>{const x=105+i*165;T(x-45,285,t);s.appendChild(E("ellipse",{cx:x,cy:160,rx:i===2?28:18,ry:90,class:"lens"}))})}
  else if(key==="autocollimation"){s.appendChild(E("path",{d:"M360 45 Q320 170 360 295 Q400 170 360 45",class:"lens"}));line(s,560,45,560,295,"mirrorline");line(s,175,100,175,170,"object");line(s,175,100,360,100,"ray incident");line(s,360,100,560,140,"ray refracted");line(s,560,140,360,100,"ray reflected");T(135,80,"object at F");T(530,35,"plane mirror")}
  else if(key==="defocus"){s.appendChild(E("path",{d:"M250 45 Q210 170 250 295 Q290 170 250 45",class:"lens"}));line(s,40,90,250,90,"ray incident");line(s,40,250,250,250,"ray incident");line(s,250,90,490,170,"ray refracted");line(s,250,250,490,170,"ray refracted");line(s,570,55,570,285,"screen");T(475,155,"sharp plane");T(580,45,"defocused screen")}
  else if(key==="two-lens"){s.appendChild(E("path",{d:"M250 55 Q215 170 250 285 Q285 170 250 55",class:"lens"}));s.appendChild(E("path",{d:"M500 55 Q465 170 500 285 Q535 170 500 55",class:"lens"}));line(s,40,95,250,95,"ray incident");line(s,250,95,420,170,"ray refracted");line(s,420,170,500,120,"ray refracted");line(s,500,120,690,120,"ray emergent");T(195,40,"lens 1");T(445,40,"lens 2")}
  else if(key==="microscope"){s.appendChild(E("path",{d:"M210 55 Q180 170 210 285 Q240 170 210 55",class:"lens"}));s.appendChild(E("path",{d:"M520 70 Q490 170 520 270 Q550 170 520 70",class:"lens"}));line(s,85,120,85,170,"object");line(s,410,170,410,245,"image");line(s,85,120,210,90,"ray incident");line(s,210,90,410,245,"ray refracted");line(s,410,245,520,120,"ray incident");line(s,520,120,690,80,"ray emergent");T(170,35,"objective");T(485,50,"eyepiece")}
  else if(key==="exit-pupil"){s.appendChild(E("path",{d:"M260 55 Q225 170 260 285 Q295 170 260 55",class:"lens"}));s.appendChild(E("path",{d:"M500 75 Q470 170 500 265 Q530 170 500 75",class:"lens"}));line(s,200,85,200,255,"aperture");line(s,200,85,500,135,"construction");line(s,200,255,500,205,"construction");line(s,500,135,620,155,"construction");line(s,500,205,620,185,"construction");line(s,620,155,620,185,"pupil");T(575,140,"exit pupil")}
  else if(key==="newtonian"){s.appendChild(E("path",{d:"M620 40 Q520 170 620 300",class:"mirror"}));line(s,55,100,620,100,"ray incident");line(s,55,145,620,145,"ray incident");line(s,620,100,420,170,"ray reflected");line(s,620,145,420,170,"ray reflected");line(s,395,145,445,195,"mirrorline");line(s,420,170,420,40,"ray reflected");T(540,35,"primary");T(430,130,"45° secondary")}
  else{T(240,160,"Diagram for "+key)}
  return s;
}
function mountStatic(key,host){
  host.innerHTML='<div class="visual-head"><div><span class="theory-label">DIAGRAM</span><h3>'+key.replaceAll("-"," ")+'</h3></div></div><div class="visual-canvas"></div>';
  host.querySelector(".visual-canvas").appendChild(staticSvg(key));
}
const live={
  "refraction-live":mountRefraction,"plate-live":mountPlate,"layers-live":mountLayers,"fibre-live":mountFibre,
  "mirror-live":mountMirror,"prism-live":mountPrism,"lens-live":mountLens,"eye-live":mountEye,"telescope-live":mountTelescope
};
window.OPTICS_VISUALS={
  mount(key,host){if(!host||!key)return;if(live[key])live[key](host);else mountStatic(key,host)}
};
})();