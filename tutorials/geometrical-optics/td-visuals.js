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
    s.innerHTML="";
    const f=(kind.value==="concave"?1:-1)*(+fmag.value),doo=+obj.value,inv=1/f-1/doo,di=Math.abs(inv)<1e-7?Infinity:1/inv,m=Number.isFinite(di)?-di/doo:Infinity;
    const mx=575,axis=170,maxD=Math.max(doo,Math.abs(Number.isFinite(di)?di:0),2*Math.abs(f),20),scale=Math.min(4.2,390/maxD),ox=mx-doo*scale,oh=62;
    line(s,20,axis,700,axis,"axis");
    s.appendChild(E("path",{d:kind.value==="concave"?"M575 45 Q520 170 575 295":"M575 45 Q630 170 575 295",class:"mirror"}));
    line(s,ox,axis,ox,axis-oh,"object");text(s,ox-20,axis-oh-9,"object");
    const fx=mx-f*scale,cx=mx-2*f*scale;circle(s,fx,axis,4,"focus");circle(s,cx,axis,4,"point");text(s,fx-7,axis+22,"F");text(s,cx-7,axis+22,"C");
    if(Number.isFinite(di)&&Math.abs(di)<2.2*maxD){const ix=mx-di*scale,ih=oh*m;line(s,ix,axis,ix,axis-ih,di<0?"virtual":"image");text(s,ix-18,axis-ih+(ih<0?22:-8),"image")}
    const top=axis-oh;
    line(s,ox,top,mx,top,"ray incident");
    if(kind.value==="concave"){
      line(s,mx,top,fx,axis,"ray reflected");
      line(s,ox,top,mx,axis,"ray incident");
      if(Number.isFinite(di)) line(s,mx,axis,mx-di*scale,axis-oh*m,"ray reflected");
      if(di<0){line(s,mx,top,mx-di*scale,axis-oh*m,"construction");line(s,mx,axis,mx-di*scale,axis-oh*m,"construction")}
    }else{
      const end1x=mx-170,end1y=top-(axis-top)*170/Math.max(20,fx-mx);
      line(s,mx,top,end1x,end1y,"ray reflected");line(s,mx,top,fx,axis,"construction");
      line(s,ox,top,mx,axis,"ray incident");
      if(Number.isFinite(di)){const ix=mx-di*scale,iy=axis-oh*m;const ex=mx-170,ey=axis+(axis-iy)*170/Math.max(20,ix-mx);line(s,mx,axis,ex,ey,"ray reflected");line(s,mx,axis,ix,iy,"construction")}
    }
    setReadout(ui.readout,[["image distance",Number.isFinite(di)?fmt(di,2)+" cm":"∞"],["magnification",Number.isFinite(m)?fmt(m,2):"∞"],["image",di>0?"real":di<0?"virtual":"at infinity"],["orientation",m<0?"inverted":"upright"]]);
  };
  [kind,fmag,obj].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountPrism(host){
  const ui=hostShell(host,"Prism deviation");
  const A=addRange(ui.controls,"apex A",30,75,1,60,"°"),n=addRange(ui.controls,"index n",1.2,1.8,0.01,1.52),inc=addRange(ui.controls,"incidence i",5,75,1,30,"°");
  const s=svgBase("Interactive prism geometry and deviation");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";
    const aa=+A.value,nn=+n.value,i=+inc.value,r1=rad(Math.asin(clamp(Math.sin(deg(i))/nn,-1,1))),r2=aa-r1,crit=rad(Math.asin(1/nn));
    const h=220,half=clamp(h*Math.tan(deg(aa/2)),95,270),ax=360,top=38,base=top+h,left=ax-half,right=ax+half;
    s.appendChild(E("path",{d:"M"+ax+" "+top+" L"+left+" "+base+" L"+right+" "+base+" Z",class:"prism"}));
    const entry={x:(ax+left)/2,y:(top+base)/2},exit={x:(ax+right)/2,y:(top+base)/2};
    const face1=Math.atan2(base-top,left-ax),normal1=face1-Math.PI/2,dirIn=normal1+deg(i);
    line(s,entry.x-160*Math.cos(dirIn),entry.y-160*Math.sin(dirIn),entry.x,entry.y,"ray incident");
    line(s,entry.x,entry.y,exit.x,exit.y,"ray refracted");
    if(r2>crit){
      const face2=Math.atan2(base-top,right-ax),normal2=face2+Math.PI/2,inside=Math.atan2(exit.y-entry.y,exit.x-entry.x),ref=2*normal2-inside;
      line(s,exit.x,exit.y,exit.x+150*Math.cos(ref),exit.y+150*Math.sin(ref),"ray reflected");
      text(s,450,80,"TIR");setReadout(ui.readout,[["r₁",fmt(r1,2)+"°"],["r₂=A-r₁",fmt(r2,2)+"°"],["critical",fmt(crit,2)+"°"],["result","TIR at face 2"]]);return;
    }
    const e=rad(Math.asin(nn*Math.sin(deg(r2)))),Dtot=i+e-aa;
    const face2=Math.atan2(base-top,right-ax),normalOut=face2-Math.PI/2,out=normalOut+deg(e);
    line(s,exit.x,exit.y,exit.x+170*Math.cos(out),exit.y+170*Math.sin(out),"ray emergent");
    text(s,345,65,"A="+fmt(aa,0)+"°");
    setReadout(ui.readout,[["r₁",fmt(r1,2)+"°"],["r₂",fmt(r2,2)+"°"],["emergence",fmt(e,2)+"°"],["deviation D",fmt(Dtot,2)+"°"]]);
  };
  [A,n,inc].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountLens(host){
  const ui=hostShell(host,"Thin-lens ray model");
  const kind=addSelect(ui.controls,"lens",[["conv","converging"],["div","diverging"]],"conv"),fmag=addRange(ui.controls,"|f|",5,30,1,10," cm"),obj=addRange(ui.controls,"object distance",4,60,1,30," cm");
  const s=svgBase("Interactive thin lens image formation");ui.canvas.appendChild(s);
  const redraw=()=>{
    s.innerHTML="";
    const f=(kind.value==="conv"?1:-1)*(+fmag.value),doo=+obj.value,inv=1/f-1/doo,di=Math.abs(inv)<1e-7?Infinity:1/inv,m=Number.isFinite(di)?-di/doo:Infinity;
    const lx=360,axis=170,maxD=Math.max(doo,Math.abs(Number.isFinite(di)?di:0),2*Math.abs(f),15),scale=Math.min(6,285/maxD),ox=lx-doo*scale,oh=60;
    line(s,20,axis,700,axis,"axis");
    s.appendChild(E("path",{d:kind.value==="conv"?"M360 45 Q320 170 360 295 Q400 170 360 45":"M335 45 Q380 170 335 295 M385 45 Q340 170 385 295",class:"lens"}));
    line(s,ox,axis,ox,axis-oh,"object");
    const F=lx-f*scale,Fp=lx+f*scale;circle(s,F,axis,4,"focus");circle(s,Fp,axis,4,"focus");text(s,F-8,axis+22,"F");text(s,Fp-8,axis+22,"F′");
    if(Number.isFinite(di)&&Math.abs(di)<2.1*maxD){const ix=lx+di*scale,ih=oh*m;line(s,ix,axis,ix,axis-ih,di<0?"virtual":"image")}
    const top=axis-oh;line(s,ox,top,lx,top,"ray incident");
    if(kind.value==="conv"){
      line(s,lx,top,Fp,axis,"ray refracted");
    }else{
      const ex=lx+210,ey=top+(top-axis)*210/Math.max(20,lx-Fp);line(s,lx,top,ex,ey,"ray refracted");line(s,lx,top,Fp,axis,"construction");
    }
    line(s,ox,top,lx,axis,"ray incident");const ex2=lx+230,ey2=axis+(axis-top)*230/Math.max(20,lx-ox);line(s,lx,axis,ex2,ey2,"ray refracted");
    if(di<0&&Number.isFinite(di)){const ix=lx+di*scale,iy=axis-oh*m;line(s,lx,top,ix,iy,"construction");line(s,lx,axis,ix,iy,"construction")}
    setReadout(ui.readout,[["image distance",Number.isFinite(di)?fmt(di,2)+" cm":"∞"],["magnification",Number.isFinite(m)?fmt(m,2):"∞"],["image",di>0?"real":di<0?"virtual":"at infinity"],["orientation",m<0?"inverted":"upright"]]);
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
    s.innerHTML="";
    const a=+fo.value,b=+fe.value,G=a/b,total=a+b,scale=420/total,x1=120,x2=x1+total*scale,xf=x1+a*scale,axis=170;
    line(s,20,axis,700,axis,"axis");
    s.appendChild(E("path",{d:"M"+x1+" 45 Q"+(x1-35)+" 170 "+x1+" 295 Q"+(x1+35)+" 170 "+x1+" 45",class:"lens"}));
    s.appendChild(E("path",{d:"M"+x2+" 70 Q"+(x2-28)+" 170 "+x2+" 270 Q"+(x2+28)+" 170 "+x2+" 70",class:"lens"}));
    [95,130].forEach(y=>{line(s,25,y,x1,y,"ray incident");line(s,x1,y,xf,axis,"ray refracted");const y2=axis+(axis-y)*(x2-xf)/Math.max(1,xf-x1);line(s,xf,axis,x2,y2,"ray refracted");const slope=(y2-axis)/Math.max(1,x2-xf);line(s,x2,y2,690,y2+slope*(690-x2),"ray emergent")});
    line(s,xf,55,xf,285,"construction");text(s,xf-25,300,"F₁′ = F₂");text(s,x1-35,35,"objective");text(s,x2-30,55,"eyepiece");
    setReadout(ui.readout,[["normal length",fmt(total,0)+" mm"],["|G|",fmt(G,1)+"x"],["shared focal plane",fmt(a,0)+" mm after objective"],["output","parallel / afocal"]]);
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
  else if(key==="goniometer"){
    circle(s,360,165,115,"goniometer-ring");circle(s,360,165,6,"point");
    line(s,360,165,190,70,"ray incident");line(s,360,165,555,75,"ray reflected");line(s,360,165,515,270,"ray reflected");
    T(115,55,"collimator / incident direction");T(520,62,"telescope position 1");T(505,292,"telescope position 2");
    T(315,160,"prism");T(250,25,"angular readings on circular scale");
  }
  else if(key==="prism"||key==="dispersion-prism"){s.appendChild(E("path",{d:"M360 35 L155 275 L565 275 Z",class:"prism"}));line(s,25,170,235,170,"ray incident");if(key==="dispersion-prism"){line(s,235,170,455,205,"ray red");line(s,235,170,455,220,"ray violet");line(s,455,205,690,150,"ray red");line(s,455,220,690,185,"ray violet");T(590,140,"red");T(590,205,"violet")}else{line(s,235,170,455,215,"ray refracted");line(s,455,215,690,150,"ray emergent")}T(345,65,"A")}
  else if(key==="scale-comparison"){const rows=[["atom",2,"not ray-scale"],["λ = 600 nm",8,"reference"],["10 µm slit",45,"diffraction relevant"],["1 cm aperture",260,"ray optics safe"]];rows.forEach((r,i)=>{const y=45+i*62;s.appendChild(E("rect",{x:180,y,width:r[1],height:18,class:i<2?"wrong":"glass"}));T(35,y+14,r[0]);T(470,y+14,r[2])})}
  else if(key==="stigmatisme"){circle(s,135,110,5,"source");circle(s,565,110,5,"focus");line(s,360,30,360,300,"system");[65,105,150,205,245].forEach(y=>{line(s,135,110,360,y,"ray incident");line(s,360,y,565,110,"ray refracted")});T(65,90,"A");T(575,100,"A′");T(425,290,"stigmatic: all rays meet at A′")}
  else if(key==="fermat-reflection"){line(s,0,220,720,220,"mirrorline");circle(s,125,75,5,"source");circle(s,585,80,5,"eye");circle(s,585,360,5,"virtual");line(s,125,75,355,220,"ray incident");line(s,355,220,585,80,"ray reflected");line(s,355,220,585,360,"construction");T(105,60,"A");T(595,70,"B");T(590,300,"B*");T(260,290,"stationary path ↔ straight line to mirror image")}
  else if(key==="reversibility"){line(s,0,160,720,160,"interface");line(s,360,25,360,295,"normal");line(s,120,55,360,160,"ray incident");line(s,360,160,525,285,"ray refracted");T(55,45,"reverse ray arrows");T(440,300,"same geometrical path")}
  else if(key==="mirror-derivation"){s.appendChild(E("path",{d:"M600 45 Q545 170 600 295",class:"mirror"}));circle(s,485,170,4,"point");circle(s,375,170,4,"focus");circle(s,150,170,4,"source");line(s,150,170,555,95,"ray incident");line(s,555,95,375,170,"ray reflected");line(s,555,95,485,170,"construction");T(130,195,"A");T(365,195,"F");T(475,195,"C");T(420,35,"small angles + i=r")}
  else if(key==="mirror-centre"){s.appendChild(E("path",{d:"M590 45 Q535 170 590 295",class:"mirror"}));circle(s,370,170,4,"point");line(s,145,100,590,170,"ray incident");line(s,590,170,145,240,"ray reflected");T(355,195,"C");T(220,65,"ray through C is normal")}
  else if(key==="diopter-derivation"){s.appendChild(E("path",{d:"M390 35 Q300 170 390 305",class:"diopter"}));circle(s,520,170,4,"point");line(s,120,115,350,100,"ray incident");line(s,350,100,590,145,"ray refracted");line(s,350,100,520,170,"normal");T(335,85,"I");T(510,195,"C");T(245,300,"Snell + paraxial angles → conjugation")}
  else if(key==="diopter-centre"){s.appendChild(E("path",{d:"M390 35 Q300 170 390 305",class:"diopter"}));circle(s,520,170,4,"point");line(s,120,100,520,170,"ray incident");line(s,520,170,650,193,"ray refracted");T(500,195,"C");T(180,75,"normal ray through centre")}
  else if(key==="right-angle-prism"){s.appendChild(E("path",{d:"M175 270 L175 70 L525 270 Z",class:"prism"}));line(s,25,170,175,170,"ray incident");line(s,175,170,350,270,"ray refracted");line(s,350,270,525,170,"ray reflected");T(240,305,"45° incidence > critical → TIR");T(70,150,"normal entry")}
  else if(key==="immersed-prism"){s.appendChild(E("rect",{x:0,y:0,width:720,height:320,class:"liquid upper"}));s.appendChild(E("path",{d:"M360 35 L150 275 L570 275 Z",class:"prism"}));line(s,30,160,240,160,"ray incident");line(s,240,160,440,95,"ray refracted");line(s,440,95,515,250,"ray reflected");T(25,40,"outside liquid n′");T(445,80,"70°: keep TIR");T(510,270,"50°: force transmission");T(220,305,"exactly one TIR sets an interval for n′")}
  else if(key==="newton-lens"){line(s,205,35,205,300,"focalplane");line(s,520,35,520,300,"focalplane");s.appendChild(E("path",{d:"M360 45 Q322 170 360 295 Q398 170 360 45",class:"lens"}));circle(s,205,170,4,"focus");circle(s,520,170,4,"focus");T(170,25,"object focal plane");T(480,25,"image focal plane");T(275,305,"Newton distances x and x′")}
  else if(key==="bessel"){line(s,80,55,80,170,"object");line(s,640,45,640,295,"screen");s.appendChild(E("path",{d:"M270 60 Q235 170 270 280 Q305 170 270 60",class:"lens"}));s.appendChild(E("path",{d:"M450 60 Q415 170 450 280 Q485 170 450 60",class:"construction"}));T(230,40,"L position 1");T(415,40,"L position 2");T(265,305,"D fixed; two sharp positions separated by d")}
  else if(key==="two-diopters-lens"){s.appendChild(E("path",{d:"M320 45 Q270 170 320 295 Q390 170 385 45",class:"lens"}));line(s,90,105,320,115,"ray incident");line(s,320,115,385,135,"ray refracted");line(s,385,135,620,170,"ray emergent");T(220,35,"surface 1");T(410,35,"surface 2");T(225,305,"add the two diopter conjugation relations")}
  else if(key==="immersed-lens"){s.appendChild(E("rect",{x:0,y:0,width:720,height:320,class:"liquid upper"}));s.appendChild(E("path",{d:"M360 45 Q322 170 360 295 Q398 170 360 45",class:"lens"}));T(25,40,"surrounding medium nₘ");T(290,305,"power changes with relative index n_lens / nₘ")}
  else if(key==="diaphragm-lens"){circle(s,95,170,5,"source");line(s,190,75,190,265,"aperture");s.appendChild(E("path",{d:"M380 50 Q345 170 380 290 Q415 170 380 50",class:"lens"}));line(s,590,45,590,295,"screen");line(s,95,170,190,95,"ray incident");line(s,190,95,380,115,"ray incident");line(s,380,115,590,145,"ray refracted");line(s,95,170,190,245,"ray incident");line(s,190,245,380,225,"ray incident");line(s,380,225,590,195,"ray refracted");T(145,60,"diaphragm");T(560,35,"focal screen")}
  else if(key==="eye-range"){line(s,115,70,115,270,"focalplane");line(s,600,70,600,270,"focalplane");s.appendChild(E("ellipse",{cx:360,cy:170,rx:70,ry:55,class:"eye"}));T(65,55,"PP near point");T(555,55,"PR far point");T(245,295,"clear-vision interval / accommodation")}
  else if(key==="eye-anatomy"){s.appendChild(E("ellipse",{cx:400,cy:170,rx:170,ry:125,class:"eye"}));s.appendChild(E("path",{d:"M285 70 Q245 170 285 270",class:"diopter"}));s.appendChild(E("path",{d:"M350 100 Q320 170 350 240 Q385 170 350 100",class:"lens"}));line(s,535,70,535,270,"retina");line(s,300,95,300,245,"aperture");T(205,55,"cornea");T(270,295,"iris / pupil");T(330,85,"crystalline lens");T(545,65,"retina")}
  else if(key==="astigmatism"){s.appendChild(E("path",{d:"M350 60 Q305 170 350 280 Q395 170 350 60",class:"lens"}));line(s,40,110,350,110,"ray incident");line(s,40,230,350,230,"ray incident");line(s,350,110,500,170,"ray refracted");line(s,350,230,565,170,"ray refracted");T(405,300,"different meridians → different focal planes")}
  else if(key==="prism45"){
    s.appendChild(E("path",{d:"M180 275 L180 65 L520 275 Z",class:"prism"}));
    line(s,25,155,180,145,"ray incident");
    line(s,180,145,350,245,"ray refracted");
    line(s,350,245,465,110,"ray reflected");
    line(s,465,110,650,100,"ray emergent");
    line(s,180,145,180,55,"normal");
    T(195,85,"i = 5°");T(315,300,"45° geometry");T(380,225,"TIR on AB");T(515,85,"D = 100°");
  }
  else if(key==="fish-visibility"){
    line(s,0,155,720,155,"interface");line(s,360,30,360,300,"normal");
    circle(s,360,265,7,"source");T(375,280,"fish");
    circle(s,535,60,7,"source");T(550,60,"fisherman");
    const lim=48.75, L=210;
    line(s,360,265,360-L*Math.sin(deg(lim)),265-L*Math.cos(deg(lim)),"ray refracted");
    line(s,360,265,360+L*Math.sin(deg(lim)),265-L*Math.cos(deg(lim)),"ray refracted");
    T(55,140,"air");T(55,185,"water n=1.33");T(385,205,"Snell window ±48.75°");T(505,245,"outside window: no transmitted fisherman ray");
  }
  else if(key==="dove-prism"){
    s.appendChild(E("path",{d:"M145 105 L260 55 L570 55 L660 105 L570 255 L260 255 Z",class:"prism"}));
    line(s,25,130,175,130,"ray incident");line(s,175,130,360,215,"ray refracted");line(s,360,215,555,130,"ray reflected");line(s,555,130,700,130,"ray emergent");
    T(270,45,"AB");T(305,280,"CD (TIR mirror)");T(150,95,"45°");T(600,95,"45°");T(265,190,"incidence on CD ≈ 71.2°");
  }
  else if(key==="cauchy-data"){
    line(s,100,265,650,265,"axis");line(s,100,45,100,265,"axis");
    const pts=[[2.64,1.6914],[2.98,1.6967],[3.09,1.6984],[3.35,1.7023],[4.06,1.7130],[5.26,1.7307],[6.11,1.7435]];
    const xmin=2.4,xmax=6.3,ymin=1.685,ymax=1.75;
    pts.forEach(([x,y])=>{const px=100+(x-xmin)/(xmax-xmin)*550,py=265-(y-ymin)/(ymax-ymin)*210;circle(s,px,py,5,"point")});
    line(s,120,245,630,70,"construction");T(480,55,"n ≈ n₀ + a/λ²");T(310,300,"1/λ² (µm⁻²)");T(30,80,"n");T(150,35,"seven measured spectral lines");
  }
  else if(key==="lens-shapes"){
    s.appendChild(E("path",{d:"M90 75 Q55 160 90 245 Q130 160 90 75",class:"lens"}));
    s.appendChild(E("path",{d:"M250 75 L250 245 Q305 160 250 75",class:"lens"}));
    s.appendChild(E("path",{d:"M410 75 Q455 160 410 245 M465 75 Q420 160 465 245",class:"lens"}));
    s.appendChild(E("path",{d:"M575 75 Q540 160 575 245 Q620 160 600 75",class:"lens"}));
    [["biconvex",80],["plano-convex",225],["biconcave",400],["meniscus",565]].forEach(v=>T(v[1],285,v[0]));
  }
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