(() => {
"use strict";
const ns="http://www.w3.org/2000/svg";
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const deg=x=>x*Math.PI/180;
const rad=x=>x*180/Math.PI;
const fmt=(x,n=2)=>Number.isFinite(x)?Number(x).toFixed(n):"—";
const svgTags=new Set(["svg","line","text","circle","ellipse","path","rect","defs","marker","title"]);
const E=(tag,attrs={})=>{const e=svgTags.has(tag)?document.createElementNS(ns,tag):document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e};
let markerSerial=0;
function svgBase(label){
  const s=E("svg",{viewBox:"0 0 720 320",role:"img","aria-label":label});
  s.classList.add("interactive-svg");
  const title=E("title");title.textContent=label;s.appendChild(title);
  const defs=E("defs"),base="ray-arrow-"+(++markerSerial),colors={blue:"#238da3",green:"#249a70",orange:"#d28d25",red:"#c35a65",spectralRed:"#a85d5d",violet:"#655da8"};
  s._rayMarkers={};
  Object.entries(colors).forEach(([k,color])=>{
    const id=base+"-"+k,m=E("marker",{id,viewBox:"0 0 8 7",refX:7,refY:3.5,markerWidth:7,markerHeight:7,orient:"auto",markerUnits:"strokeWidth"}),
      p=E("path",{d:"M0 0 L8 3.5 L0 7 Z",fill:color});
    m.appendChild(p);defs.appendChild(m);s._rayMarkers[k]=id;
  });
  s.appendChild(defs);s._svgHeader=[title,defs];return s;
}
function clearSvg(s){const keep=s._svgHeader||[];s.innerHTML="";keep.forEach(x=>s.appendChild(x))}
function line(s,x1,y1,x2,y2,cls="ray"){
  const l=E("line",{x1,y1,x2,y2,class:cls}),tokens=String(cls).split(/\s+/);
  let marker=null;
  if(tokens.includes("reflected"))marker="orange";
  else if(tokens.includes("violet"))marker="violet";
  else if(tokens.includes("red"))marker="spectralRed";
  else if(tokens.some(x=>["refracted","emergent","guided"].includes(x)))marker="green";
  else if(tokens.some(x=>["rejected","wrong"].includes(x)))marker="red";
  else if(tokens.some(x=>["ray","incident"].includes(x)))marker="blue";
  if(marker&&s._rayMarkers?.[marker])l.setAttribute("marker-end","url(#"+s._rayMarkers[marker]+")");
  s.appendChild(l);return l
}
function text(s,x,y,t,cls="vlabel"){const e=E("text",{x,y,class:cls});e.textContent=t;s.appendChild(e);return e}
function circle(s,cx,cy,r,cls="point"){const e=E("circle",{cx,cy,r,class:cls});s.appendChild(e);return e}
function hostShell(host,title){
  host.innerHTML='<div class="visual-head"><div><span class="theory-label">VISUAL MODEL</span><h3>'+title+'</h3></div><span class="visual-note">Change the controls and watch the geometry update.</span></div><div class="visual-controls"></div><div class="visual-canvas"></div><div class="visual-legend" aria-label="Diagram key"><span><i class="legend-ray"></i>solid arrow = real light path</span><span><i class="legend-construction"></i>dashed = construction / backward extension</span></div><div class="visual-readout"></div>';
  return {controls:host.querySelector(".visual-controls"),canvas:host.querySelector(".visual-canvas"),readout:host.querySelector(".visual-readout")};
}
function installViewControl(host){
  const head=host.querySelector(".visual-head");if(!head)return;
  const btn=E("button",{type:"button",class:"visual-expand","aria-expanded":"false"});btn.textContent="Enlarge diagram";
  btn.addEventListener("click",()=>{
    const on=!host.classList.contains("visual-expanded");host.classList.toggle("visual-expanded",on);
    btn.setAttribute("aria-expanded",String(on));btn.textContent=on?"Close enlarged view":"Enlarge diagram";
  });
  head.appendChild(btn);
}
function addRange(parent,label,min,max,step,value,unit=""){
  const wrap=E("label",{class:"visual-control"}), span=E("span");span.textContent=label;
  const input=E("input",{type:"range",min,max,step,value});
  const out=E("strong");out.textContent=value+unit;input._valueOutput=out;input._unit=unit;
  input.addEventListener("input",()=>out.textContent=input.value+unit);
  wrap.append(span,input,out);parent.appendChild(wrap);return input;
}
function addNumber(parent,label,min,max,step,value,unit=""){
  const wrap=E("label",{class:"visual-control"}),span=E("span");span.textContent=label;
  const input=E("input",{type:"number",min,max,step,value}),out=E("strong");out.textContent=value+unit;input._valueOutput=out;input._unit=unit;
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
function findControl(host,label){
  const box=host.querySelector(".visual-controls");if(!box)return null;
  for(const wrap of Array.from(box.children||[])){
    const children=Array.from(wrap.children||[]);
    if(children[0]?.textContent===label)return children.find(x=>x.tagName==="INPUT"||x.tagName==="SELECT"||x.tagName==="input"||x.tagName==="select")||null;
  }
  return null;
}
function emitControl(ctl){
  if(typeof ctl.dispatchEvent==="function"&&typeof Event==="function"){
    ctl.dispatchEvent(new Event("input",{bubbles:true}));ctl.dispatchEvent(new Event("change",{bubbles:true}));
  }else if(typeof ctl.fire==="function"){ctl.fire("input");ctl.fire("change")}
}
function applyPreset(host,preset){
  if(!preset?.controls)return;
  const apply=()=>{
    Object.entries(preset.controls).forEach(([label,value])=>{
      const ctl=findControl(host,label);if(!ctl)return;
      if(ctl.tagName==="INPUT"||ctl.tagName==="input"){
        const n=Number(value),lo=Number(ctl.min),hi=Number(ctl.max);
        ctl.value=Number.isFinite(n)&&Number.isFinite(lo)&&Number.isFinite(hi)?String(clamp(n,lo,hi)):String(value);
        if(ctl._valueOutput)ctl._valueOutput.textContent=ctl.value+(ctl._unit||"");
      }else ctl.value=String(value);
      emitControl(ctl);
    });
  };
  apply();
  const box=host.querySelector(".visual-controls");
  if(box){
    const reset=E("button",{type:"button",class:"visual-reset"});reset.textContent="Reset to exercise values";
    reset.addEventListener("click",apply);box.appendChild(reset);
  }
}

function mountRefraction(host){
  const ui=hostShell(host,"Refraction / total internal reflection");
  const n1=addRange(ui.controls,"n₁",1,2,0.01,1.00),n2=addRange(ui.controls,"n₂",1,2,0.01,1.50),inc=addRange(ui.controls,"incidence i",0,89.9,0.1,30,"°");
  const s=svgBase("Interactive Snell-Descartes refraction diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);const a=Number(n1.value),b=Number(n2.value),i=Number(inc.value),cx=360,cy=160;
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
    clearSvg(s);const nn=+n.value,t=+th.value,i=+inc.value,r=rad(Math.asin(Math.sin(deg(i))/nn)),d=t*Math.sin(deg(i-r))/Math.cos(deg(r));
    const px=18,y1=85,y2=y1+t*px,cx=300;
    s.appendChild(E("rect",{x:0,y:y1,width:720,height:y2-y1,class:"glass"}));line(s,0,y1,720,y1,"interface");line(s,0,y2,720,y2,"interface");
    const L=120,x0=cx-L*Math.sin(deg(i)),yy0=y1-L*Math.cos(deg(i));line(s,x0,yy0,cx,y1,"ray incident");
    const dy=y2-y1,dx=dy*Math.tan(deg(r)),x2=cx+dx;line(s,cx,y1,x2,y2,"ray refracted");
    const x3=x2+L*Math.sin(deg(i)),y3=y2+L*Math.cos(deg(i));line(s,x2,y2,x3,y3,"ray emergent");
    const xu=cx+dy*Math.tan(deg(i)),x4=xu+L*Math.sin(deg(i)),y4=y2+L*Math.cos(deg(i));line(s,cx,y1,x4,y4,"construction");
    line(s,cx,y1-28,cx,y1+28,"normal");line(s,x2,y2-28,x2,y2+28,"normal");
    text(s,25,y1-10,"air");text(s,25,(y1+y2)/2,"glass n="+fmt(nn));text(s,25,y2+22,"air");
    setReadout(ui.readout,[["internal angle r",fmt(r,2)+"°"],["lateral shift",fmt(d,2)+" cm"],["emergent direction","parallel to incident"]]);
  };
  [n,th,inc].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountLayers(host){
  const ui=hostShell(host,"Escape cone through layered liquids");
  const n1=addRange(ui.controls,"lower n₁",1.1,2.2,0.01,2.00),n2=addRange(ui.controls,"upper n₂",1.05,1.8,0.01,1.25),h1=addRange(ui.controls,"lower depth",2,20,0.5,10," cm"),h2=addRange(ui.controls,"upper depth",0,25,0.5,18," cm");
  const s=svgBase("Interactive two-layer escape cone");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);const a=+n1.value,b=+n2.value,H1=+h1.value,H2=+h2.value;
    const i2=Math.asin(1/b),i1=Math.asin(clamp(1/a,-1,1)),R=H1*Math.tan(i1)+H2*Math.tan(i2);
    const scale=Math.min(195/Math.max(H1+H2,1),250/Math.max(R,1)),yBot=285,yMid=yBot-H1*scale,yTop=yMid-H2*scale,cx=360;
    s.appendChild(E("rect",{x:0,y:yTop,width:720,height:yMid-yTop,class:"liquid upper"}));s.appendChild(E("rect",{x:0,y:yMid,width:720,height:yBot-yMid,class:"liquid lower"}));
    line(s,0,yTop,720,yTop,"interface");line(s,0,yMid,720,yMid,"interface");circle(s,cx,yBot,6,"source");
    const xMid=cx+H1*scale*Math.tan(i1),xTop=cx+R*scale;
    line(s,cx,yBot,xMid,yMid,"ray incident");line(s,xMid,yMid,xTop,yTop,"ray refracted");
    line(s,cx,yBot,2*cx-xMid,yMid,"ray incident");line(s,2*cx-xMid,yMid,2*cx-xTop,yTop,"ray refracted");
    line(s,xTop,yTop,xTop+80,yTop,"ray emergent");line(s,2*cx-xTop,yTop,2*cx-xTop-80,yTop,"ray emergent");
    text(s,25,yTop-10,"air");text(s,25,(yTop+yMid)/2,"upper liquid n₂="+fmt(b));text(s,25,(yMid+yBot)/2,"lower liquid n₁="+fmt(a));text(s,cx-18,307,"source");
    setReadout(ui.readout,[["upper critical angle",fmt(rad(i2),2)+"°"],["lower-layer angle",fmt(rad(i1),2)+"°"],["escape radius",fmt(R,2)+" cm"]]);
  };
  [n1,n2,h1,h2].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountFibre(host){
  const ui=hostShell(host,"Step-index optical fibre");
  const nc=addRange(ui.controls,"core nᶜ",1.3,1.7,0.005,1.48),
    ng=addRange(ui.controls,"cladding nᵍ",1.0,1.65,0.005,1.46),
    inc=addRange(ui.controls,"launch angle",0,89.9,0.1,10,"°"),
    length=addNumber(ui.controls,"length L",0.001,100,0.001,1," km");
  const s=svgBase("Interactive step-index fibre acceptance and modal-delay diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    let cc=+nc.value,g=Math.min(+ng.value,cc-0.005);
    if(+ng.value>=cc){ng.value=(cc-0.005).toFixed(3);if(ng._valueOutput)ng._valueOutput.textContent=ng.value+(ng._unit||"");g=+ng.value}
    const i=+inc.value,Lkm=Math.max(0.001,+length.value),Lm=Lkm*1000,c0=3e8,
      NA=Math.sqrt(Math.max(0,cc*cc-g*g)),imax=rad(Math.asin(clamp(NA,0,1))),
      theta=rad(Math.asin(clamp(Math.sin(deg(i))/cc,-1,1))),
      critical=rad(Math.asin(clamp(g/cc,0,1))),iwall=90-theta,ok=iwall+1e-9>=critical,
      thetaLim=90-critical,coreSpeed=c0/cc,
      tAxial=cc*Lm/c0,tCurrent=ok?cc*Lm/(c0*Math.cos(deg(theta))):NaN,
      tLim=cc*Lm/(c0*Math.cos(deg(thetaLim))),delay=tLim-tAxial;
    clearSvg(s);s.appendChild(E("rect",{x:170,y:95,width:510,height:130,class:"cladding"}));s.appendChild(E("rect",{x:170,y:120,width:510,height:80,class:"core"}));line(s,35,160,170,160,"axis");
    const launchL=135;line(s,170-launchL*Math.cos(deg(i)),160-launchL*Math.sin(deg(i)),170,160,"ray incident");
    let x=170,y=160,dir=1;const slope=Math.tan(deg(theta));
    for(let k=0;k<8&&x<680;k++){
      let nx=Math.min(680,x+100),ny=y+dir*(nx-x)*slope;
      if(ny>198||ny<122){
        const bound=dir>0?198:122;nx=x+(bound-y)/(dir*slope||1e-6);ny=bound;line(s,x,y,nx,ny,ok?"ray guided":"ray rejected");
        if(!ok){
          const tnorm=rad(Math.asin(clamp(cc*Math.sin(deg(iwall))/g,-1,1))),thetaClad=90-tnorm,run=Math.min(120,680-nx);
          line(s,nx,ny,nx+run,ny+dir*run*Math.tan(deg(thetaClad)),"ray rejected");break;
        }
        dir*=-1;x=nx;y=ny;
      }else{line(s,x,y,nx,ny,ok?"ray guided":"ray rejected");x=nx;y=ny}
    }
    text(s,185,115,"cladding");text(s,185,155,"core");text(s,185,220,"cladding");
    text(s,430,288,"wall incidence i′ = 90° − θ; TIR requires i′ ≥ i_c");
    setReadout(ui.readout,[
      ["NA",fmt(NA,4)],["max launch angle",fmt(imax,2)+"°"],
      ["internal angle θ",fmt(theta,2)+"°"],["wall incidence i′",fmt(iwall,2)+"°"],
      ["critical angle i_c",fmt(critical,2)+"°"],["current ray",ok?"guided by TIR":"refracts into cladding"],
      ["core speed",fmt(coreSpeed/1e8,3)+"×10⁸ m/s"],
      ["axial time t₁",fmt(tAxial*1e6,3)+" µs"],
      ["current transit",ok?fmt(tCurrent*1e6,3)+" µs":"not guided"],
      ["limiting time t₂",fmt(tLim*1e6,3)+" µs"],
      ["modal delay Δt",fmt(delay*1e9,2)+" ns"]
    ]);
  };
  [nc,ng,inc,length].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountMirror(host){
  const ui=hostShell(host,"Spherical mirror image formation");
  const kind=addSelect(ui.controls,"mirror",[["concave","concave"],["convex","convex"]],"concave"),
    fmag=addRange(ui.controls,"|f|",8,200,1,20," cm"),
    obj=addRange(ui.controls,"object distance",10,600,1,60," cm"),
    height=addNumber(ui.controls,"object height",0.1,20,0.1,3," cm");
  const s=svgBase("Interactive spherical mirror ray diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const f=(kind.value==="concave"?1:-1)*(+fmag.value),doo=+obj.value,hObj=+height.value,
      inv=1/f-1/doo,di=Math.abs(inv)<1e-7?Infinity:1/inv,m=Number.isFinite(di)?-di/doo:Infinity,hImg=Number.isFinite(m)?m*hObj:Infinity;
    const mx=575,axis=170,maxD=Math.max(doo,Math.abs(Number.isFinite(di)?di:0),2*Math.abs(f),20),scale=Math.min(4.2,390/maxD),
      ox=mx-doo*scale,oh=clamp(hObj*18,32,78);
    line(s,20,axis,700,axis,"axis");
    s.appendChild(E("path",{d:kind.value==="concave"?"M575 45 Q520 170 575 295":"M575 45 Q630 170 575 295",class:"mirror"}));
    line(s,ox,axis,ox,axis-oh,"object");text(s,ox-20,axis-oh-9,"object "+fmt(hObj,1)+" cm");
    const fx=mx-f*scale,cx=mx-2*f*scale;circle(s,fx,axis,4,"focus");circle(s,cx,axis,4,"point");text(s,fx-7,axis+22,"F");text(s,cx-7,axis+22,"C");
    if(Number.isFinite(di)&&Math.abs(di)<2.2*maxD){const ix=mx-di*scale,ih=oh*m;line(s,ix,axis,ix,axis-ih,di<0?"virtual":"image");text(s,ix-18,axis-ih+(ih<0?22:-8),"image")}
    const top=axis-oh;line(s,ox,top,mx,top,"ray incident");
    if(kind.value==="concave"){
      line(s,mx,top,fx,axis,"ray reflected");line(s,ox,top,mx,axis,"ray incident");
      if(Number.isFinite(di))line(s,mx,axis,mx-di*scale,axis-oh*m,"ray reflected");
      if(di<0){line(s,mx,top,mx-di*scale,axis-oh*m,"construction");line(s,mx,axis,mx-di*scale,axis-oh*m,"construction")}
    }else{
      const end1x=mx-170,end1y=top-(axis-top)*170/Math.max(20,fx-mx);
      line(s,mx,top,end1x,end1y,"ray reflected");line(s,mx,top,fx,axis,"construction");line(s,ox,top,mx,axis,"ray incident");
      if(Number.isFinite(di)){const ix=mx-di*scale,iy=axis-oh*m,ex=mx-170,ey=axis+(axis-iy)*170/Math.max(20,ix-mx);line(s,mx,axis,ex,ey,"ray reflected");line(s,mx,axis,ix,iy,"construction")}
    }
    setReadout(ui.readout,[["|R|=2|f|",fmt(2*Math.abs(f),2)+" cm"],["image distance",Number.isFinite(di)?fmt(di,2)+" cm":"∞"],["magnification",Number.isFinite(m)?fmt(m,2):"∞"],["image height",Number.isFinite(hImg)?fmt(hImg,2)+" cm":"∞"],["image",di>0?"real":di<0?"virtual":"at infinity"],["orientation",m<0?"inverted":"upright"]]);
  };
  [kind,fmag,obj,height].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountDiopter(host){
  const ui=hostShell(host,"Spherical diopter — USTHB algebraic convention");
  const n1=addRange(ui.controls,"incident n",1.00,2.00,0.01,1.00),
    n2=addRange(ui.controls,"emergent n′",1.00,2.00,0.01,1.50),
    surface=addSelect(ui.controls,"surface",[["R+","R > 0 · centre right"],["R-","R < 0 · centre left"]],"R+"),
    rmag=addRange(ui.controls,"|R|",2,250,1,20," cm"),
    objectNature=addSelect(ui.controls,"object",[["real","real object"],["virtual","virtual object"],["infinity","object at infinity"]],"real"),
    obj=addRange(ui.controls,"|SA|",2,400,1,100," cm");
  const s=svgBase("Interactive spherical diopter in the USTHB oriented-distance convention");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const a=+n1.value,b=+n2.value,R=(surface.value==="R+"?1:-1)*(+rmag.value),
      SA=objectNature.value==="infinity"?-Infinity:(objectNature.value==="real"?-1:1)*(+obj.value),
      power=(b-a)/(R/100),rhs=(b-a)/R+(Number.isFinite(SA)?a/SA:0),
      SAp=Math.abs(rhs)<1e-10?Infinity:b/rhs,
      gamma=Number.isFinite(SA)&&Number.isFinite(SAp)?a*SAp/(b*SA):0,
      SF=Math.abs(b-a)<1e-10?Infinity:-a*R/(b-a),
      SFp=Math.abs(b-a)<1e-10?Infinity:b*R/(b-a);
    const sx=360,axis=170,finite=[R,SA,SAp,SF,SFp].filter(Number.isFinite).map(Math.abs),
      maxD=Math.max(40,...finite),scale=Math.min(4.5,270/maxD),cx=sx+R*scale;
    line(s,20,axis,700,axis,"axis");
    s.appendChild(E("path",{d:R>0?"M390 45 Q330 170 390 295":"M330 45 Q390 170 330 295",class:"diopter"}));
    circle(s,sx,axis,4,"point");text(s,sx-8,axis+24,"S");
    if(cx>28&&cx<692){circle(s,cx,axis,4,"point");text(s,cx-8,axis+24,"C")}
    const markF=(x,label)=>{if(Number.isFinite(x)&&x>25&&x<695){circle(s,x,axis,4,"focus");text(s,x-9,axis-12,label)}};
    markF(sx+SF*scale,"F");markF(sx+SFp*scale,"F′");
    const oh=55;
    let ox=null,oTop=axis-oh;
    if(Number.isFinite(SA)){
      ox=sx+SA*scale;line(s,ox,axis,ox,oTop,objectNature.value==="virtual"?"virtual":"object");text(s,ox-24,oTop-8,objectNature.value==="virtual"?"virtual A":"A");
    }else{text(s,35,95,"object at infinity: axial parallel bundle")}
    let ix=null,iTop=null;
    if(Number.isFinite(SAp)){
      ix=sx+SAp*scale;
      const signedH=(gamma===0?1:Math.sign(gamma))*Math.min(90,Math.max(18,Math.abs(gamma)*oh));
      iTop=axis-signedH;line(s,ix,axis,ix,iTop,SAp<0?"virtual":"image");text(s,ix-22,iTop+(iTop>axis?22:-8),SAp<0?"virtual A′":"A′");
    }
    const hits=[128,145];
    hits.forEach(yh=>{
      if(objectNature.value==="infinity")line(s,35,yh,sx,yh,"ray incident");
      else if(objectNature.value==="real")line(s,ox,oTop,sx,yh,"ray incident");
      else{
        const slope=(oTop-yh)/(ox-sx),yLeft=yh+slope*(35-sx);
        line(s,35,yLeft,sx,yh,"ray incident");line(s,sx,yh,ox,oTop,"construction");
      }
      if(Number.isFinite(SAp)){
        if(SAp>0)line(s,sx,yh,ix,iTop,"ray refracted");
        else{
          const slope=(yh-iTop)/(sx-ix),yEnd=yh+slope*(690-sx);
          line(s,sx,yh,690,yEnd,"ray refracted");line(s,sx,yh,ix,iTop,"construction");
        }
      }else line(s,sx,yh,690,yh,"ray refracted");
    });
    if(cx>25&&cx<695)line(s,sx,hits[0],cx,axis,"normal");
    text(s,35,42,"incident medium n="+fmt(a));text(s,515,42,"emergent medium n′="+fmt(b));
    text(s,35,300,"Gauss/paraxial schematic · transverse curvature exaggerated");
    setReadout(ui.readout,[
      ["R",fmt(R,1)+" cm"],["surface power Φ",fmt(power,2)+" D"],
      ["SA",Number.isFinite(SA)?fmt(SA,2)+" cm":"−∞"],
      ["SA′",Number.isFinite(SAp)?fmt(SAp,2)+" cm":"∞"],
      ["γ",Number.isFinite(gamma)?fmt(gamma,3):"—"],
      ["image",!Number.isFinite(SAp)?"at infinity":SAp>0?"real":"virtual"],
      ["SF",Number.isFinite(SF)?fmt(SF,2)+" cm":"∞"],["SF′",Number.isFinite(SFp)?fmt(SFp,2)+" cm":"∞"]
    ]);
  };
  [n1,n2,surface,rmag,objectNature,obj].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountPrism(host){
  const ui=hostShell(host,"Prism deviation");
  const A=addRange(ui.controls,"apex A",30,75,1,60,"°"),n=addRange(ui.controls,"index n",1.2,1.8,0.01,1.52),inc=addRange(ui.controls,"incidence i",0,75,1,30,"°");
  const s=svgBase("Interactive prism with moving second-face intersection");ui.canvas.appendChild(s);
  const cross=(a,b)=>a.x*b.y-a.y*b.x;
  const redraw=()=>{
    clearSvg(s);
    const aa=+A.value,nn=+n.value,i=+inc.value,r1=rad(Math.asin(clamp(Math.sin(deg(i))/nn,-1,1))),r2=aa-r1,crit=rad(Math.asin(1/nn));
    const h=220,half=h*Math.tan(deg(aa/2)),ap={x:0,y:h},L={x:-half,y:0},Rt={x:half,y:0},map=p=>({x:360+p.x,y:285-p.y});
    const aps=map(ap),ls=map(L),rs=map(Rt);s.appendChild(E("path",{d:"M"+aps.x+" "+aps.y+" L"+ls.x+" "+ls.y+" L"+rs.x+" "+rs.y+" Z",class:"prism"}));
    const tEntry=.58,P={x:ap.x+tEntry*(L.x-ap.x),y:ap.y+tEntry*(L.y-ap.y)};
    const vL={x:L.x-ap.x,y:L.y-ap.y},lenL=Math.hypot(vL.x,vL.y),nIn={x:-vL.y/lenL,y:vL.x/lenL};
    const normal1=Math.atan2(nIn.y,nIn.x),dirInc=normal1+deg(i),dirInside=normal1+deg(r1),dIn={x:Math.cos(dirInside),y:Math.sin(dirInside)};
    const vR={x:Rt.x-ap.x,y:Rt.y-ap.y},den=cross(dIn,vR),w={x:ap.x-P.x,y:ap.y-P.y},t=cross(w,vR)/den,u=cross(w,dIn)/den;
    const Q={x:P.x+t*dIn.x,y:P.y+t*dIn.y},Ps=map(P),Qs=map(Q);
    const incomingStart={x:P.x-170*Math.cos(dirInc),y:P.y-170*Math.sin(dirInc)},Is=map(incomingStart);
    line(s,Is.x,Is.y,Ps.x,Ps.y,"ray incident");line(s,Ps.x,Ps.y,Qs.x,Qs.y,"ray refracted");
    const lenR=Math.hypot(vR.x,vR.y),nOut={x:-vR.y/lenR,y:vR.x/lenR},normal2=Math.atan2(nOut.y,nOut.x);
    if(!Number.isFinite(t)||t<=0||u<0||u>1){text(s,410,80,"ray misses second face");setReadout(ui.readout,[["r₁",fmt(r1,2)+"°"],["r₂",fmt(r2,2)+"°"],["geometry","no second-face hit"],["D","—"]]);return}
    if(r2>crit){
      const ref=2*normal2-dirInside,End=map({x:Q.x+160*Math.cos(ref),y:Q.y+160*Math.sin(ref)});
      line(s,Qs.x,Qs.y,End.x,End.y,"ray reflected");text(s,430,75,"TIR at face 2");
      setReadout(ui.readout,[["r₁",fmt(r1,2)+"°"],["r₂",fmt(r2,2)+"°"],["critical",fmt(crit,2)+"°"],["result","TIR"]]);return
    }
    const e=rad(Math.asin(nn*Math.sin(deg(r2)))),outAngle=normal2-deg(e),End=map({x:Q.x+175*Math.cos(outAngle),y:Q.y+175*Math.sin(outAngle)}),Dtot=i+e-aa;
    line(s,Qs.x,Qs.y,End.x,End.y,"ray emergent");text(s,345,58,"A="+fmt(aa,0)+"°");
    setReadout(ui.readout,[["r₁",fmt(r1,2)+"°"],["r₂",fmt(r2,2)+"°"],["emergence",fmt(e,2)+"°"],["deviation D",fmt(Dtot,2)+"°"]]);
  };
  [A,n,inc].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountLens(host){
  const ui=hostShell(host,"Thin-lens ray model");
  const kind=addSelect(ui.controls,"lens",[["conv","converging"],["div","diverging"]],"conv"),
    objectNature=addSelect(ui.controls,"object",[["real","real object"],["virtual","virtual object"]],"real"),
    fmag=addRange(ui.controls,"|f|",5,60,1,10," cm"),
    obj=addRange(ui.controls,"object distance",3,100,1,30," cm"),
    height=addNumber(ui.controls,"object height",0.1,20,0.1,2," cm");
  const s=svgBase("Interactive thin lens image formation");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const f=(kind.value==="conv"?1:-1)*(+fmag.value),dmag=+obj.value,doo=(objectNature.value==="virtual"?-1:1)*dmag,hObj=+height.value,
      inv=1/f-1/doo,di=Math.abs(inv)<1e-7?Infinity:1/inv,m=Number.isFinite(di)?-di/doo:Infinity,hImg=Number.isFinite(m)?m*hObj:Infinity;
    const lx=360,axis=170,maxD=Math.max(Math.abs(doo),Math.abs(Number.isFinite(di)?di:0),2*Math.abs(f),15),
      scale=Math.min(6,285/maxD),ox=lx-doo*scale,oh=clamp(hObj*25,32,78),top=axis-oh;
    line(s,20,axis,700,axis,"axis");
    s.appendChild(E("path",{d:kind.value==="conv"?"M360 45 Q320 170 360 295 Q400 170 360 45":"M335 45 Q380 170 335 295 M385 45 Q340 170 385 295",class:"lens"}));
    line(s,ox,axis,ox,top,objectNature.value==="virtual"?"virtual":"object");text(s,ox-28,top-8,(objectNature.value==="virtual"?"virtual object ":"object ")+fmt(hObj,1)+" cm");
    const F=lx-f*scale,Fp=lx+f*scale;circle(s,F,axis,4,"focus");circle(s,Fp,axis,4,"focus");text(s,F-8,axis+22,"F");text(s,Fp-8,axis+22,"F′");
    let ix=null,iy=null;
    if(Number.isFinite(di)&&Math.abs(di)<2.1*maxD){ix=lx+di*scale;const ih=oh*m;iy=axis-ih;line(s,ix,axis,ix,iy,di<0?"virtual":"image");text(s,ix-22,iy+(iy>axis?22:-8),di<0?"virtual image":"image")}
    if(objectNature.value==="real"){
      line(s,ox,top,lx,top,"ray incident");
      if(kind.value==="conv")line(s,lx,top,Fp,axis,"ray refracted");
      else{const ex=lx+210,ey=top+(top-axis)*210/Math.max(20,lx-Fp);line(s,lx,top,ex,ey,"ray refracted");line(s,lx,top,Fp,axis,"construction")}
      line(s,ox,top,lx,axis,"ray incident");const ex2=lx+230,ey2=axis+(axis-top)*230/Math.max(20,lx-ox);line(s,lx,axis,ex2,ey2,"ray refracted");
      if(di<0&&Number.isFinite(di)){const vx=lx+di*scale,vy=axis-oh*m;line(s,lx,top,vx,vy,"construction");line(s,lx,axis,vx,vy,"construction")}
    }else{
      const vTop=top,hitYs=[110,220];
      hitYs.forEach(yh=>{
        const slopeIn=(vTop-yh)/(ox-lx),yLeft=yh+slopeIn*(40-lx);line(s,40,yLeft,lx,yh,"ray incident");line(s,lx,yh,ox,vTop,"construction");
        if(Number.isFinite(di)&&ix!==null&&iy!==null){
          if(di>0)line(s,lx,yh,ix,iy,"ray refracted");
          else{const xEnd=680,yEnd=yh+(yh-iy)*(xEnd-lx)/Math.max(1,lx-ix);line(s,lx,yh,xEnd,yEnd,"ray refracted");line(s,lx,yh,ix,iy,"construction")}
        }
      });
    }
    setReadout(ui.readout,[["object",objectNature.value],["power",fmt(100/f,2)+" D"],["image distance",Number.isFinite(di)?fmt(di,2)+" cm":"∞"],["magnification",Number.isFinite(m)?fmt(m,2):"∞"],["image height",Number.isFinite(hImg)?fmt(hImg,2)+" cm":"∞"],["image",di>0?"real":di<0?"virtual":"at infinity"],["orientation",m<0?"inverted":"upright"]]);
  };
  [kind,objectNature,fmag,obj,height].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountEye(host){
  const ui=hostShell(host,"Reduced eye focus");
  const power=addRange(ui.controls,"eye power",55,70,0.1,60.6," D"),obj=addRange(ui.controls,"object distance",0.2,10,0.1,10," m");
  const s=svgBase("Interactive reduced-eye focusing diagram");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);const P=+power.value,doo=+obj.value,di=1/(P-1/doo),retina=0.0165,err=(di-retina)*1000;
    line(s,25,170,700,170,"axis");s.appendChild(E("ellipse",{cx:455,cy:170,rx:115,ry:125,class:"eye"}));s.appendChild(E("path",{d:"M405 75 Q365 170 405 265 Q445 170 405 75",class:"lens"}));line(s,545,65,545,275,"retina");
    const fx=405+di*5000;line(s,40,115,405,115,"ray incident");line(s,405,115,clamp(fx,405,670),170,"ray refracted");line(s,40,225,405,225,"ray incident");line(s,405,225,clamp(fx,405,670),170,"ray refracted");circle(s,fx,170,5,Math.abs(err)<0.3?"focus good":"focus bad");text(s,555,85,"retina");
    setReadout(ui.readout,[["image distance",fmt(di*1000,2)+" mm"],["retina",fmt(retina*1000,1)+" mm"],["focus error",fmt(err,2)+" mm"],["status",Math.abs(err)<0.3?"focused on retina":err<0?"focus in front of retina":"focus behind retina"]]);
  };
  [power,obj].forEach(x=>x.addEventListener("input",redraw));redraw();
}
function mountPlaneDiopter(host){
  const ui=hostShell(host,"Plane diopter / apparent depth");
  const n1=addNumber(ui.controls,"incident n",1.00,2.50,0.01,1.33),
    n2=addNumber(ui.controls,"emergent n′",1.00,2.50,0.01,1.00),
    depth=addNumber(ui.controls,"|SA|",0.1,1000,0.1,30," cm");
  const s=svgBase("Interactive plane-diopter apparent-depth model");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const a=+n1.value,b=+n2.value,d=Math.max(0.001,+depth.value),SA=-d,SAp=SA*b/a,app=Math.abs(SAp);
    const yS=82,x0=360,yObj=yS+105,yImg=yS+105*(b/a);
    line(s,30,yS,690,yS,"interface");text(s,35,yS-14,"emergent medium n′="+fmt(b));text(s,35,yS+24,"incident medium n="+fmt(a));
    circle(s,x0,yObj,7,"source");text(s,x0+14,yObj+5,"object");
    circle(s,x0,yImg,6,"virtual");text(s,x0+14,yImg+5,"apparent image");
    [295,430].forEach(px=>{
      line(s,x0,yObj,px,yS,"ray incident");
      const slope=(px-x0)/(yS-yImg),xTop=px+slope*(20-yS);
      line(s,px,yS,xTop,20,"ray refracted");line(s,px,yS,x0,yImg,"construction");
    });
    line(s,x0-18,yS,x0-18,yObj,"construction");line(s,x0-28,yS,x0-8,yS,"construction");line(s,x0-28,yObj,x0-8,yObj,"construction");
    text(s,470,300,"paraxial model: SA′/SA = n′/n");
    setReadout(ui.readout,[["SA",fmt(SA,2)+" cm"],["SA′",fmt(SAp,2)+" cm"],["apparent distance",fmt(app,2)+" cm"],["depth ratio",fmt(b/a,4)],["image","virtual"]]);
  };
  [n1,n2,depth].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountMirrorTranslation(host){
  const ui=hostShell(host,"Translation of a plane mirror");
  const dist=addNumber(ui.controls,"object–mirror distance",10,220,0.5,100," cm"),
    shift=addNumber(ui.controls,"mirror shift toward object",0,50,0.5,3," cm");
  const s=svgBase("Interactive plane-mirror translation model");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const d=Math.max(1,+dist.value),raw=Math.max(0,+shift.value),dx=Math.min(raw,d-1),scale=1.3,ox=85,axis=200,
      m0=ox+d*scale,m1=ox+(d-dx)*scale,i0=ox+2*d*scale,i1=ox+2*(d-dx)*scale;
    line(s,20,axis,700,axis,"axis");line(s,ox,axis,ox,axis-75,"object");text(s,55,axis-88,"fixed object");
    line(s,m0,55,m0,285,"construction");text(s,m0-30,45,"initial mirror");
    line(s,m1,55,m1,285,"mirrorline");text(s,m1-25,305,"final mirror");
    line(s,i0,axis,i0,axis-65,"construction");text(s,i0-34,axis-78,"initial image");
    line(s,i1,axis,i1,axis-65,"virtual");text(s,i1-28,axis-78,"final image");
    line(s,m1,275,m0,275,"construction");text(s,(m0+m1)/2-20,265,"Δm");
    line(s,i1,105,i0,105,"construction");text(s,(i0+i1)/2-25,95,"Δimage");
    setReadout(ui.readout,[["mirror shift",fmt(dx,2)+" cm"],["image shift",fmt(2*dx,2)+" cm"],["relation","Δx_image = 2 Δx_mirror"],["image remains","virtual and symmetric about the mirror"]]);
  };
  [dist,shift].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountLensCombination(host){
  const ui=hostShell(host,"Two thin lenses — equivalent power");
  const f1=addNumber(ui.controls,"f₁′",-500,500,0.5,20," cm"),
    f2=addNumber(ui.controls,"f₂′",-500,500,0.5,30," cm"),
    sep=addNumber(ui.controls,"separation d",0,100,0.5,10," cm");
  const s=svgBase("Interactive two-thin-lens equivalent-power model");ui.canvas.appendChild(s);
  const drawLens=(x,f,label)=>{
    const path=f>0?"M"+x+" 45 Q"+(x-28)+" 170 "+x+" 295 Q"+(x+28)+" 170 "+x+" 45":"M"+(x-20)+" 45 Q"+(x+20)+" 170 "+(x-20)+" 295 M"+(x+20)+" 45 Q"+(x-20)+" 170 "+(x+20)+" 295";
    s.appendChild(E("path",{d:path,class:"lens"}));text(s,x-16,35,label);
  };
  const redraw=()=>{
    clearSvg(s);
    const a=+f1.value,b=+f2.value,d=Math.max(0,+sep.value),valid=Math.abs(a)>1e-9&&Math.abs(b)>1e-9,
      P1=valid?100/a:NaN,P2=valid?100/b:NaN,Peq=valid?P1+P2-(d/100)*P1*P2:NaN,
      feq=Number.isFinite(Peq)&&Math.abs(Peq)>1e-9?100/Peq:Infinity,afocal=valid&&Math.abs(Peq)<1e-6;
    const axis=170,x1=225,x2=x1+(d===0?14:clamp(d*8,55,250));line(s,20,axis,700,axis,"axis");drawLens(x1,a,"L₁");drawLens(x2,b,"L₂");
    if(valid){
      [1,-1].forEach(y0=>{
        const th1=-y0/a,y2=y0+d*th1,th2=th1-y2/b,post=50,y3=y2+post*th2,
          py0=axis-y0*50,py2=axis-clamp(y2*50,-115,115),py3=axis-clamp(y3*50,-125,125);
        line(s,35,py0,x1,py0,"ray incident");line(s,x1,py0,x2,py2,"ray refracted");line(s,x2,py2,680,py3,"ray emergent");
      });
    }
    line(s,x1,300,x2,300,"construction");text(s,(x1+x2)/2-25,292,"d="+fmt(d,1)+" cm");
    text(s,35,55,afocal?"parallel in → parallel out (afocal)":Number.isFinite(feq)?"equivalent focal length f′eq="+fmt(feq,2)+" cm":"enter non-zero focal lengths");
    setReadout(ui.readout,[["Φ₁",Number.isFinite(P1)?fmt(P1,3)+" D":"—"],["Φ₂",Number.isFinite(P2)?fmt(P2,3)+" D":"—"],["Φeq",Number.isFinite(Peq)?fmt(Peq,3)+" D":"—"],["f′eq",afocal?"∞":Number.isFinite(feq)?fmt(feq,2)+" cm":"—"],["system",!valid?"invalid":afocal?"afocal":Peq>0?"converging":"diverging"],["formula","Φeq = Φ₁ + Φ₂ − d Φ₁Φ₂"]]);
  };
  [f1,f2,sep].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountAccommodation(host){
  const ui=hostShell(host,"Eye accommodation");
  const pp=addNumber(ui.controls,"near point PP",5,200,0.5,25," cm"),
    farMode=addSelect(ui.controls,"far point",[["infinity","PR = ∞"],["finite","finite PR"]],"infinity"),
    pr=addNumber(ui.controls,"far distance",0.1,100,0.1,5," m");
  const s=svgBase("Interactive eye accommodation interval model");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const near=Math.max(0.1,+pp.value),finite=farMode.value==="finite",far=Math.max(0.01,+pr.value),
      A=100/near-(finite?1/far:0),eyeX=625,axis=170,nearX=eyeX-clamp(near*5,70,350);
    line(s,30,axis,700,axis,"axis");s.appendChild(E("ellipse",{cx:eyeX,cy:axis,rx:55,ry:43,class:"eye"}));text(s,eyeX-25,axis+65,"eye");
    line(s,nearX,90,nearX,245,"focalplane");text(s,nearX-30,75,"PP");
    if(finite){
      const farX=80;line(s,farX,90,farX,245,"focalplane");text(s,farX-25,75,"PR");
      line(s,farX,270,nearX,270,"construction");text(s,farX+15,295,"clear-vision interval");
    }else{
      [115,140].forEach(y=>line(s,35,y,eyeX-55,y,"ray incident"));text(s,35,95,"PR = ∞ · parallel rays");
      line(s,nearX,270,eyeX-75,270,"construction");text(s,nearX+20,295,"accommodation from ∞ to PP");
    }
    setReadout(ui.readout,[["PP",fmt(near,1)+" cm"],["PR",finite?fmt(far,2)+" m":"∞"],["near vergence",fmt(100/near,2)+" D"],["far vergence",finite?fmt(1/far,2)+" D":"0.00 D"],["accommodation amplitude",fmt(A,2)+" D"]]);
  };
  [pp,farMode,pr].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountMagnifier(host){
  const ui=hostShell(host,"Magnifier and angular vision");
  const mode=addSelect(ui.controls,"viewing",[["naked","naked eye"],["relaxed","magnifier · final image at ∞"],["near","magnifier · final image at near point"],["finite","finite object / image"]],"relaxed"),
    f=addNumber(ui.controls,"f′",1,50,0.1,5," cm"),
    obj=addNumber(ui.controls,"object distance",0.5,100,0.1,5," cm"),
    D=addNumber(ui.controls,"reference D",10,100,0.5,25," cm"),
    h=addNumber(ui.controls,"object height",0.001,20,0.001,2," mm"),
    eye=addNumber(ui.controls,"eye threshold ×10⁻⁴",0.1,20,0.1,4,"");
  const s=svgBase("Interactive magnifier angular-magnification and resolution model");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const ff=+f.value,dd=+D.value,hmm=+h.value,hcm=hmm/10,threshold=+eye.value*1e-4,view=mode.value;
    let u=+obj.value,di=null,gamma=null,G=1,alpha=hcm/dd,alphaP=alpha;
    if(view==="relaxed"){u=ff;di=Infinity;G=dd/ff;alphaP=hcm/ff}
    else if(view==="near"){u=ff*dd/(ff+dd);di=-dd;G=1+dd/ff;alphaP=G*alpha}
    else if(view==="finite"){di=1/(1/ff-1/u);gamma=-di/u;G=Math.abs(gamma);alphaP=Math.abs(gamma)*hcm/dd}
    const lx=365,axis=170,eyeX=655;
    line(s,20,axis,700,axis,"axis");circle(s,eyeX,axis,12,"eye");text(s,eyeX-18,axis+32,"eye");
    if(view==="naked"){
      const ox=115,ht=62;line(s,ox,axis,ox,axis-ht,"object");text(s,70,axis-ht-10,"AB at D");
      line(s,ox,axis-ht,eyeX,axis,"ray incident");line(s,ox,axis,eyeX,axis,"construction");
      text(s,470,75,"α ≈ AB / D");
    }else{
      s.appendChild(E("path",{d:"M365 45 Q330 170 365 295 Q400 170 365 45",class:"lens"}));text(s,335,35,"loupe");
      const scale=Math.min(45,210/Math.max(u,ff,1)),ox=lx-u*scale,ht=55;
      line(s,ox,axis,ox,axis-ht,"object");text(s,ox-18,axis-ht-9,"AB");
      const Fx=lx-ff*scale;circle(s,Fx,axis,4,"focus");text(s,Fx-8,axis+22,"F");
      if(view==="relaxed"){
        line(s,ox,axis-ht,lx,110,"ray incident");line(s,lx,110,eyeX,110,"ray emergent");
        line(s,ox,axis-ht,lx,210,"ray incident");line(s,lx,210,eyeX,210,"ray emergent");
        text(s,430,75,"object at F → parallel output");
      }else{
        const iX=Number.isFinite(di)?lx+di*scale:null,iH=Number.isFinite(gamma)?Math.max(18,Math.min(95,Math.abs(gamma)*ht)):55,iTop=axis-(gamma>=0?iH:-iH);
        [120,210].forEach(yh=>{
          line(s,ox,axis-ht,lx,yh,"ray incident");
          if(Number.isFinite(di)&&di>0)line(s,lx,yh,iX,iTop,"ray refracted");
          else if(Number.isFinite(di)){
            const slope=(yh-iTop)/(lx-iX),yEnd=yh+slope*(eyeX-lx);line(s,lx,yh,eyeX,yEnd,"ray refracted");line(s,lx,yh,iX,iTop,"construction");
          }
        });
        if(Number.isFinite(di)){line(s,iX,axis,iX,iTop,di<0?"virtual":"image");text(s,iX-20,iTop+(iTop>axis?22:-8),"A′B′")}
        if(view==="near")text(s,410,75,"virtual image placed at the near point");
      }
    }
    const minMM=(view==="naked"?dd*threshold:view==="near"?dd*threshold/Math.max(G,1e-12):view==="finite"?dd*threshold/Math.max(G,1e-12):ff*threshold)*10;
    setReadout(ui.readout,[
      ["viewing",view==="naked"?"naked eye":view],
      ["G",fmt(G,2)+"×"],["α naked",fmt(alpha,6)+" rad"],["α′",fmt(alphaP,6)+" rad"],
      ["intrinsic power Π",fmt(100/ff,2)+" m⁻¹"],
      ["minimum AB at eye threshold",fmt(minMM,3)+" mm"],
      ["OA",view==="naked"?"—":fmt(-u,2)+" cm"],
      ["OA′",view==="finite"||view==="near"?(Number.isFinite(di)?fmt(di,2)+" cm":"∞"):view==="relaxed"?"∞":"—"]
    ]);
  };
  [mode,f,obj,D,h,eye].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountAngularResolution(host){
  const ui=hostShell(host,"Angular size and telescope resolution");
  const dist=addNumber(ui.controls,"distance",1,1000000,1,384000," km"),
    size=addNumber(ui.controls,"object size",0.001,10000,0.001,3480," km"),
    G=addNumber(ui.controls,"magnification G",1,1000,1,100,"×"),
    eye=addNumber(ui.controls,"eye threshold ×10⁻⁴",0.1,20,0.1,3,""),
    detail=addNumber(ui.controls,"test detail",0.001,10000,0.001,0.2," km");
  const s=svgBase("Interactive angular-size and telescope-resolution model");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const L=+dist.value,S=+size.value,g=+G.value,threshold=+eye.value*1e-4,test=+detail.value,
      alpha=S/L,alphaP=g*alpha,limitAlpha=threshold/g,limitSize=L*limitAlpha,resolved=test+1e-9>=limitSize;
    const ex=95,axis=155,mx=590,r=clamp(24+Math.sqrt(Math.min(Math.abs(alpha),1))*480,28,90);
    circle(s,ex,axis,13,"eye");text(s,55,axis+36,"observer");
    circle(s,mx,axis,r,"sphere");text(s,mx-26,axis+5,"object");
    line(s,ex,axis,mx,axis-r,"ray incident");line(s,ex,axis,mx,axis+r,"ray incident");line(s,ex,axis,mx,axis,"construction");
    s.appendChild(E("path",{d:"M250 70 Q225 155 250 240 Q275 155 250 70",class:"lens"}));
    s.appendChild(E("path",{d:"M325 90 Q305 155 325 220 Q345 155 325 90",class:"lens"}));
    text(s,225,55,"telescope");text(s,125,95,"α");text(s,365,75,"α′ = Gα");
    line(s,390,260,650,260,"construction");line(s,390,245,390,275,"construction");line(s,650,245,650,275,"construction");
    text(s,400,240,"resolution test detail");text(s,400,295,resolved?"detail ≥ limit → resolved":"detail < limit → not resolved");
    setReadout(ui.readout,[
      ["α = size/distance",fmt(alpha,8)+" rad"],["α′ = Gα",fmt(alphaP,6)+" rad"],
      ["eye threshold α′lim",fmt(threshold,6)+" rad"],["object-angle limit",fmt(limitAlpha,8)+" rad"],
      ["minimum linear detail",fmt(limitSize,3)+" km"],["test detail",fmt(test,3)+" km"],
      ["resolution",resolved?"resolved":"not resolved"],
      ["model note",alphaP>0.2?"Gα is outside the strict small-angle/paraxial regime":"small-angle model is reasonable"]
    ]);
  };
  [dist,size,G,eye,detail].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountLensMaker(host){
  const ui=hostShell(host,"Thin-lens maker relation");
  const nl=addNumber(ui.controls,"lens n",1.01,3,0.01,1.50),
    nm=addNumber(ui.controls,"medium nₘ",1,2.5,0.01,1.00),
    R1=addNumber(ui.controls,"R₁", -500,500,0.5,20," cm"),
    R2=addNumber(ui.controls,"R₂", -500,500,0.5,-20," cm");
  const s=svgBase("Interactive thin-lens maker relation with signed surface radii and surrounding-medium index");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const n=+nl.value,m=+nm.value,r1=+R1.value,r2=+R2.value,
      t1=Math.abs(r1)<1e-10?0:1/r1,t2=Math.abs(r2)<1e-10?0:1/r2,
      shape=t1-t2,C=100*(n-m)*shape,invf=(n/m-1)*shape,f=Math.abs(invf)<1e-12?Infinity:1/invf;
    line(s,20,170,700,170,"axis");
    if(m>1.001)s.appendChild(E("rect",{x:0,y:0,width:720,height:320,class:"liquid upper"}));
    const drawSurface=(which,R,x)=>{
      if(Math.abs(R)<1e-10){line(s,x,65,x,275,"lens");text(s,x-18,50,which+" plane");return}
      const bulge=R>0?-45:45;
      s.appendChild(E("path",{d:"M"+x+" 65 Q"+(x+bulge)+" 170 "+x+" 275",class:"lens"}));
      text(s,x-30,50,which+"="+fmt(R,1)+" cm");
    };
    drawSurface("R₁",r1,330);drawSurface("R₂",r2,390);
    text(s,285,302,"lens n="+fmt(n,2)+" · surrounding nₘ="+fmt(m,2));
    text(s,35,38,"positive radius: centre of curvature lies to the right of the surface");
    setReadout(ui.readout,[["1/R₁−1/R₂",fmt(shape,5)+" cm⁻¹"],["USTHB vergence C",fmt(C,3)+" D"],["f′",Number.isFinite(f)?fmt(f,2)+" cm":"∞"],["system",Math.abs(C)<1e-10?"afocal/zero power":C>0?"converging":"diverging"],["relation","C=(n_lens−nₘ)(1/R₁−1/R₂),  C=nₘ/f′"]]);
  };
  [nl,nm,R1,R2].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountCauchy(host){
  const ui=hostShell(host,"Cauchy dispersion law");
  const A=addNumber(ui.controls,"Cauchy A",1,2.5,0.001,1.500,""),
    B=addNumber(ui.controls,"Cauchy B",0,0.2,0.0001,0.0040," µm²"),
    lambda=addNumber(ui.controls,"λ",0.35,1.5,0.001,0.500," µm");
  const s=svgBase("Interactive Cauchy-law graph of refractive index versus inverse wavelength squared");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const aa=+A.value,bb=+B.value,lam=+lambda.value,x=1/(lam*lam),nn=aa+bb*x,
      x0=90,y0=275,w=550,h=210,xmax=9,ymin=Math.min(aa-.01,nn-.01),ymax=Math.max(aa+bb*xmax+.01,nn+.01),
      X=q=>x0+q/xmax*w,Y=q=>y0-(q-ymin)/(ymax-ymin)*h;
    line(s,x0,y0,x0+w,y0,"axis");line(s,x0,55,x0,y0,"axis");
    line(s,X(0),Y(aa),X(xmax),Y(aa+bb*xmax),"construction");
    circle(s,X(x),Y(nn),7,"point");line(s,X(x),Y(nn),X(x),y0,"construction");line(s,x0,Y(nn),X(x),Y(nn),"construction");
    text(s,470,50,"n = A + B/λ²");text(s,290,305,"1/λ² (µm⁻²)");text(s,35,75,"n");
    text(s,X(x)+10,Y(nn)-10,"λ="+fmt(lam,3)+" µm");
    setReadout(ui.readout,[["1/λ²",fmt(x,4)+" µm⁻²"],["n(λ)",fmt(nn,4)],["intercept A",fmt(aa,4)],["slope B",fmt(bb,5)+" µm²"]]);
  };
  [A,B,lambda].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountGoniometer(host){
  const ui=hostShell(host,"Prism goniometer — reflection and minimum deviation");
  const view=addSelect(ui.controls,"measurement",[["reflection","reflection: determine A"],["minimum","minimum deviation: determine Dₘ"]],"reflection"),
    L1=addNumber(ui.controls,"L₁",0,360,0.001,198.2333,"°"),
    L2=addNumber(ui.controls,"L₂",0,360,0.001,318.1333,"°"),
    N1=addNumber(ui.controls,"N₁",0,360,0.001,303.5,"°"),
    N2=addNumber(ui.controls,"N₂",0,360,0.001,205.8333,"°"),
    unc=addNumber(ui.controls,"reading uncertainty",0,60,0.1,2," arcmin");
  const s=svgBase("Interactive prism goniometer readings for apex angle, minimum deviation, refractive index and uncertainty");ui.canvas.appendChild(s);
  const smallDiff=(a,b)=>{const d=Math.abs(a-b)%360;return Math.min(d,360-d)};
  const degMin=x=>{let d=Math.floor(Math.abs(x)+1e-10),m=(Math.abs(x)-d)*60;if(m>=59.995){d+=1;m=0}return d+"°"+String(Math.round(m)).padStart(2,"0")+"′"};
  const redraw=()=>{
    clearSvg(s);
    const l1=+L1.value,l2=+L2.value,n1=+N1.value,n2=+N2.value,du=+unc.value,
      sepL=smallDiff(l1,l2),A=sepL/2,sepN=smallDiff(n1,n2),Dm=(180-sepN)/2,
      nn=Math.sin(deg((A+Dm)/2))/Math.sin(deg(A/2)),
      dRad=du*Math.PI/(180*60),cot=x=>1/Math.tan(x),
      dn=(nn/2)*(Math.abs(cot(deg((A+Dm)/2)))*dRad+Math.abs(cot(deg((A+Dm)/2))-cot(deg(A/2)))*dRad),
      cx=360,cy=160,R=118,active=view.value==="reflection"?[[l1,"L₁"],[l2,"L₂"]]:[[n1,"N₁"],[n2,"N₂"]];
    circle(s,cx,cy,R,"goniometer-ring");circle(s,cx,cy,5,"point");
    for(let a=0;a<360;a+=30){
      const x1=cx+(R-7)*Math.cos(deg(a)),y1=cy-(R-7)*Math.sin(deg(a)),x2=cx+R*Math.cos(deg(a)),y2=cy-R*Math.sin(deg(a));
      line(s,x1,y1,x2,y2,"construction");
    }
    s.appendChild(E("path",{d:"M360 105 L315 195 L405 195 Z",class:"prism"}));text(s,345,155,"prism");
    active.forEach(([ang,label],idx)=>{
      const x=cx+R*Math.cos(deg(ang)),y=cy-R*Math.sin(deg(ang));
      line(s,cx,cy,x,y,idx===0?"ray incident":"ray reflected");circle(s,x,y,6,"point");text(s,x+(x>=cx?8:-38),y+(y>=cy?18:-8),label+" "+degMin(ang));
    });
    text(s,35,35,view.value==="reflection"?"reflected telescope directions are separated by 2A":"minimum-deviation two-position method gives 2Dₘ = 180° − |N₁−N₂|");
    setReadout(ui.readout,[
      ["|L₂−L₁|",degMin(sepL)],["A",degMin(A)+" = "+fmt(A,4)+"°"],
      ["|N₁−N₂|",degMin(sepN)],["Dₘ",degMin(Dm)+" = "+fmt(Dm,4)+"°"],
      ["n",fmt(nn,4)],["Δn worst case",fmt(dn,6)],["relative Δn/n",fmt(100*dn/nn,3)+"%"]
    ]);
  };
  [view,L1,L2,N1,N2,unc].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountMicroscope(host){
  const ui=hostShell(host,"Compound microscope — relaxed-eye adjustment");
  const geometry=addSelect(ui.controls,"geometry",[["interval","optical interval Δ"],["separation","lens separation O₁O₂"]],"interval"),
    f1=addNumber(ui.controls,"objective f₁′",0.1,20,0.01,0.5," cm"),
    f2=addNumber(ui.controls,"eyepiece f₂′",0.2,20,0.01,2.5," cm"),
    span=addNumber(ui.controls,"Δ or O₁O₂",0.1,100,0.1,16," cm"),
    D=addNumber(ui.controls,"reference dₘ",10,100,0.5,25," cm"),
    h=addNumber(ui.controls,"object AB",1,5000,1,50," µm"),
    eye=addNumber(ui.controls,"eye threshold ×10⁻⁴",0.1,20,0.1,4,"");
  const s=svgBase("Interactive compound microscope with objective, intermediate image, eyepiece and relaxed parallel output");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const a=+f1.value,b=+f2.value,val=+span.value,dm=+D.value,hUm=+h.value,threshold=+eye.value*1e-4,
      Delta=geometry.value==="interval"?val:val-a-b,L=a+Delta+b,A1=a+Delta,
      doo=Math.abs(Delta)>1e-10?a*A1/Delta:Infinity,mObj=Math.abs(Delta)>1e-10?-Delta/a:0,
      Geye=dm/b,G=mObj*Geye,f0=Math.abs(Delta)>1e-10?-(a*b)/Delta:Infinity,
      Pi=Math.abs(Delta)>1e-10?100*Delta/(a*b):0,
      hCm=hUm/10000,alpha=hCm/dm,alphaP=Math.abs(mObj)*hCm/b,
      nakedResolved=alpha>=threshold,withResolved=alphaP>=threshold,
      x1=150,scale=Math.min(28,430/Math.max(L,1)),x2=x1+L*scale,xA=x1+A1*scale,
      ox=x1-Math.max(35,Number.isFinite(doo)?doo*scale:60),axis=170,objTop=axis-42,
      imageHeight=Math.min(92,Math.max(18,Math.abs(mObj)*10)),imgTop=axis+(mObj<0?imageHeight:-imageHeight);
    line(s,20,axis,700,axis,"axis");
    s.appendChild(E("path",{d:"M"+x1+" 45 Q"+(x1-30)+" 170 "+x1+" 295 Q"+(x1+30)+" 170 "+x1+" 45",class:"lens"}));
    s.appendChild(E("path",{d:"M"+x2+" 70 Q"+(x2-25)+" 170 "+x2+" 270 Q"+(x2+25)+" 170 "+x2+" 70",class:"lens"}));
    line(s,ox,axis,ox,objTop,"object");text(s,ox-25,objTop-9,"AB");
    line(s,xA,axis,xA,imgTop,"image");text(s,xA-30,imgTop+(imgTop>axis?22:-8),"A₁B₁ at F₂");
    [110,225].forEach(yh=>{line(s,ox,objTop,x1,yh,"ray incident");line(s,x1,yh,xA,imgTop,"ray refracted")});
    const outSlope=(imgTop-axis)/Math.max(1,b*scale);
    [115,220].forEach(yE=>{line(s,xA,imgTop,x2,yE,"ray incident");line(s,x2,yE,690,yE+outSlope*(690-x2),"ray emergent")});
    const F1p=x1+a*scale,F2=x2-b*scale;circle(s,F1p,axis,4,"focus");circle(s,F2,axis,4,"focus");text(s,F1p-12,axis+23,"F₁′");text(s,F2-8,axis+23,"F₂");
    text(s,x1-38,35,"objective");text(s,x2-32,55,"eyepiece");
    if(Delta>0){line(s,F1p,300,F2,300,"construction");text(s,(F1p+F2)/2-35,292,"Δ="+fmt(Delta,2)+" cm")}
    setReadout(ui.readout,[
      ["O₁O₂",fmt(L,2)+" cm"],["Δ",fmt(Delta,2)+" cm"],["O₁A",Number.isFinite(doo)?fmt(-doo,4)+" cm":"∞"],
      ["O₁A₁",fmt(A1,2)+" cm"],["γ objective",fmt(mObj,2)],["G eyepiece",fmt(Geye,2)+"×"],
      ["G total",fmt(G,2)+"×"],["equivalent f₀′",Number.isFinite(f0)?fmt(f0,4)+" cm":"∞"],
      ["intrinsic power Π",fmt(Pi,2)+" m⁻¹"],["α naked",fmt(alpha,6)+" rad"],
      ["α′ microscope",fmt(alphaP,6)+" rad"],["resolution",(!nakedResolved&&withResolved)?"unresolved naked → resolved with microscope":withResolved?"resolved with microscope":"below stated threshold"]
    ]);
  };
  [geometry,f1,f2,span,D,h,eye].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountTwoLensImaging(host){
  const ui=hostShell(host,"Two separated lenses — intermediate and final image");
  const f1=addNumber(ui.controls,"f₁′",-200,200,0.5,10," cm"),
    f2=addNumber(ui.controls,"f₂′",-200,200,0.5,5," cm"),
    d=addNumber(ui.controls,"separation d",0,200,0.5,20," cm"),
    obj=addNumber(ui.controls,"object distance",1,300,0.5,30," cm");
  const s=svgBase("Interactive two-lens imaging model with intermediate image, afocal condition and equivalent focal points");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const a=+f1.value,b=+f2.value,sep=+d.value,do1=+obj.value,eps=1e-8,
      inv1=1/a-1/do1,di1=Math.abs(inv1)<eps?Infinity:1/inv1,
      do2=Number.isFinite(di1)?sep-di1:-Infinity,
      inv2=1/b-(Number.isFinite(do2)?1/do2:0),di2=Math.abs(inv2)<eps?Infinity:1/inv2,
      xFinal=Number.isFinite(di2)?sep+di2:Infinity,
      m1=Number.isFinite(di1)?-di1/do1:Infinity,
      m2=Number.isFinite(di2)&&Number.isFinite(do2)?-di2/do2:0,
      gamma=Number.isFinite(di2)&&Number.isFinite(m1)&&Number.isFinite(m2)?m1*m2:(Math.abs(do1-a)<1e-7&&Number.isFinite(di2)?-b/a:NaN),
      power=1/a+1/b-sep/(a*b),feq=Math.abs(power)<eps?Infinity:1/power,
      A=1-sep/a,C=-power,Dm=1-sep/b,
      O1F=Math.abs(C)>eps?Dm/C:Infinity,O2Fp=Math.abs(C)>eps?-A/C:Infinity,
      F1F=Number.isFinite(O1F)?O1F+a:Infinity,F2pFp=Number.isFinite(O2Fp)?O2Fp-b:Infinity,
      dParallel=Number.isFinite(di1)?di1+b:Infinity,parallel=!Number.isFinite(di2),
      maxX=Math.max(do1,sep,Math.abs(Number.isFinite(di1)?di1:0),Math.abs(Number.isFinite(xFinal)?xFinal:0),40),
      scale=Math.min(8,430/maxX),x1=260,x2=x1+sep*scale,axis=170,h0=5,ys=8,ox=x1-do1*scale,objY=axis-h0*ys;
    line(s,20,axis,700,axis,"axis");
    const lensPath=(x,f)=>f>0?"M"+x+" 45 Q"+(x-30)+" 170 "+x+" 295 Q"+(x+30)+" 170 "+x+" 45":"M"+(x-20)+" 45 Q"+(x+22)+" 170 "+(x-20)+" 295 M"+(x+20)+" 45 Q"+(x-22)+" 170 "+(x+20)+" 295";
    s.appendChild(E("path",{d:lensPath(x1,a),class:"lens"}));s.appendChild(E("path",{d:lensPath(x2,b),class:"lens"}));text(s,x1-20,35,"L₁");text(s,x2-20,35,"L₂");
    line(s,ox,axis,ox,objY,"object");text(s,ox-18,objY-8,"AB");
    const rays=[{y:h0,u:0},{y:0,u:-h0/do1}];
    rays.forEach(r=>{
      const yObj=h0,y1=r.y,u1=r.u-y1/a,y2=y1+sep*u1,u2=u1-y2/b,
        sy1=axis-y1*ys,sy2=axis-y2*ys,x0=ox,syObj=axis-yObj*ys,xe=690,yEnd=sy2-u2*(xe-x2)/scale*ys;
      line(s,x0,syObj,x1,sy1,"ray incident");line(s,x1,sy1,x2,sy2,"ray refracted");line(s,x2,sy2,xe,yEnd,"ray emergent");
    });
    if(Number.isFinite(di1)){
      const xi=x1+di1*scale,hi=h0*m1,yi=axis-hi*ys;line(s,xi,axis,xi,yi,di1<0?"virtual":"image");text(s,xi-22,yi+(yi>axis?20:-8),"A₁B₁");
    }else text(s,(x1+x2)/2-45,75,"L₁ output is parallel");
    if(Number.isFinite(xFinal)&&Number.isFinite(gamma)){
      const xf=x1+xFinal*scale,yf=axis-h0*gamma*ys;line(s,xf,axis,xf,yf,di2<0?"virtual":"image");text(s,xf-22,yf+(yf>axis?20:-8),"A′B′");
      if(di2<0){
        const bundle=[...s.children].filter(x=>x.tagName==="line"&&String(x.getAttribute?.("class")||x.attrs?.class||"").includes("emergent"));
        bundle.slice(-2).forEach(l=>line(s,+l.getAttribute?.("x1")||+l.attrs.x1,+l.getAttribute?.("y1")||+l.attrs.y1,xf,yf,"construction"));
      }
    }
    const f1x=x1-a*scale,f1px=x1+a*scale,f2x=x2-b*scale,f2px=x2+b*scale;
    [[f1x,"F₁"],[f1px,"F₁′"],[f2x,"F₂"],[f2px,"F₂′"]].forEach(([x,l])=>{if(x>20&&x<700){circle(s,x,axis,4,"focus");text(s,x-10,axis+22,l)}});
    setReadout(ui.readout,[
      ["L₁ image distance",Number.isFinite(di1)?fmt(di1,2)+" cm":"∞"],
      ["object for L₂",Number.isFinite(do2)?fmt(do2,2)+" cm":"at ∞"],
      ["final O₂A′",Number.isFinite(di2)?fmt(di2,2)+" cm":"∞"],
      ["final position from O₁",Number.isFinite(xFinal)?fmt(xFinal,2)+" cm":"∞"],
      ["total γ",Number.isFinite(gamma)?fmt(gamma,3):"—"],["output",parallel?"parallel / image at ∞":di2>0?"converges to a real image":"diverges from a virtual image"],
      ["parallel-output separation",Number.isFinite(dParallel)?fmt(dParallel,2)+" cm":"not finite"],
      ["f′eq",Number.isFinite(feq)?fmt(feq,2)+" cm":"∞"],["O₁F",Number.isFinite(O1F)?fmt(O1F,2)+" cm":"∞"],["O₂F′",Number.isFinite(O2Fp)?fmt(O2Fp,2)+" cm":"∞"],
      ["F₁F",Number.isFinite(F1F)?fmt(F1F,2)+" cm":"∞"],["F₂′F′",Number.isFinite(F2pFp)?fmt(F2pFp,2)+" cm":"∞"]
    ]);
  };
  [f1,f2,d,obj].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountExitPupil(host){
  const ui=hostShell(host,"Exit pupil / cercle oculaire");
  const aperture=addNumber(ui.controls,"entrance aperture D",0.1,50,0.1,10," cm"),
    separation=addNumber(ui.controls,"aperture → eyepiece",0.5,200,0.5,55," cm"),
    fe=addNumber(ui.controls,"eyepiece f′",0.2,50,0.1,5," cm");
  const s=svgBase("Interactive exit-pupil construction as the image of the entrance aperture through the eyepiece");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const D=+aperture.value,dist=+separation.value,f=+fe.value,inv=1/f-1/dist,
      sp=Math.abs(inv)<1e-9?Infinity:1/inv,m=Number.isFinite(sp)?-sp/dist:Infinity,dExit=Number.isFinite(m)?Math.abs(m)*D:Infinity,
      scale=Math.min(7,300/Math.max(dist,1)),xA=115,xE=xA+dist*scale,axis=170,
      hA=clamp(D*scale/2,20,78),xP=Number.isFinite(sp)?xE+sp*scale:690,hP=Number.isFinite(dExit)?clamp(dExit*scale/2,8,55):20;
    line(s,20,axis,700,axis,"axis");line(s,xA,axis-hA,xA,axis+hA,"aperture");text(s,xA-55,axis-hA-12,"entrance aperture");
    s.appendChild(E("path",{d:"M"+xE+" 65 Q"+(xE-25)+" 170 "+xE+" 275 Q"+(xE+25)+" 170 "+xE+" 65",class:"lens"}));text(s,xE-28,50,"eyepiece");
    if(Number.isFinite(sp)&&xP<700){
      line(s,xP,axis-hP,xP,axis+hP,"pupil");text(s,xP-32,axis-hP-10,"exit pupil");
      [axis-hA,axis+hA].forEach((yA,j)=>{
        const yP=j===0?axis+hP:axis-hP;line(s,xA,yA,xE,axis,"construction");line(s,xE,axis,xP,yP,"construction");
        line(s,xA,yA,xE,j===0?axis-35:axis+35,"ray incident");line(s,xE,j===0?axis-35:axis+35,xP,yP,"ray emergent");
      });
      circle(s,xP,axis,5,"eye");text(s,xP+12,axis+5,"place eye here");
    }else{
      [axis-hA,axis+hA].forEach(yA=>{line(s,xA,yA,xE,yA,"ray incident");line(s,xE,yA,690,yA,"ray emergent")});text(s,500,75,"exit pupil at infinity");
    }
    setReadout(ui.readout,[
      ["pupil distance after eyepiece",Number.isFinite(sp)?fmt(sp,2)+" cm":"∞"],["aperture magnification",Number.isFinite(m)?fmt(m,4):"∞"],
      ["exit-pupil diameter",Number.isFinite(dExit)?fmt(dExit,3)+" cm":"∞"],["eye placement","near the exit pupil for full light and field"]
    ]);
  };
  [aperture,separation,fe].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountNewtonian(host){
  const ui=hostShell(host,"Newtonian telescope — primary, 45° secondary and eyepiece");
  const f1=addNumber(ui.controls,"primary f₁′",5,150,0.5,50," cm"),
    Dp=addNumber(ui.controls,"primary diameter",1,40,0.5,10," cm"),
    offset=addNumber(ui.controls,"secondary before F₁",0.2,30,0.1,5," cm"),
    f2=addNumber(ui.controls,"eyepiece f₂′",0.5,20,0.1,2.5," cm"),
    h=addNumber(ui.controls,"A₁B₁",0,30,0.1,0," mm"),
    dproj=addNumber(ui.controls,"secondary projected aperture",0.1,20,0.1,1," cm");
  const s=svgBase("Interactive Newtonian telescope with converging primary cone, 45-degree secondary, redirected focal plane and afocal eyepiece");ui.canvas.appendChild(s);
  const cross=(a,b)=>a.x*b.y-a.y*b.x;
  const redraw=()=>{
    clearSvg(s);
    const F=+f1.value,D=+Dp.value,x=Math.min(+offset.value,F*0.95),fe=+f2.value,hmm=+h.value,dp=+dproj.value,
      hcm=hmm/10,G=F/fe,theta=F>0?hcm/F:0,thetaP=fe>0?hcm/fe:0,
      secFromPrimary=F-x,beamAtSec=D*x/F,maxOffset=F*dp/D,full=dp+1e-9>=beamAtSec,
      scale=Math.min(30,390/Math.max(F+fe+x,10)),mx=645,axis=185,Fx=mx-F*scale,sx=mx-secFromPrimary*scale,
      mirrorR=clamp(D*scale/2,28,92),imgDy=clamp(hcm*scale,-65,65),B1={x:Fx,y:axis+imgDy},
      B2={x:sx+imgDy,y:axis-x*scale},eyeY=B2.y-fe*scale;
    line(s,25,axis,700,axis,"axis");
    s.appendChild(E("rect",{x:Fx-25,y:axis-mirrorR-12,width:mx-Fx+45,height:2*(mirrorR+12),class:"tube"}));
    s.appendChild(E("path",{d:"M"+mx+" "+(axis-mirrorR)+" Q"+(mx-35)+" "+axis+" "+mx+" "+(axis+mirrorR),class:"mirror"}));
    text(s,mx-70,axis-mirrorR-14,"primary");
    circle(s,Fx,axis,4,"focus");text(s,Fx-12,axis+24,"F₁");
    const secHalf=clamp(Math.max(18,beamAtSec*scale*.85),20,55);
    line(s,sx-secHalf,axis-secHalf,sx+secHalf,axis+secHalf,"mirrorline");text(s,sx-65,axis+secHalf+20,"45° secondary");
    const primaryHits=[axis-mirrorR*.72,axis+mirrorR*.72],incomingSlope=-theta;
    primaryHits.forEach(py=>{
      const x0=30,y0=py-incomingSlope*(mx-x0);line(s,x0,y0,mx,py,"ray incident");
      const P={x:mx,y:py},d1={x:B1.x-P.x,y:B1.y-P.y},S0={x:sx,y:axis},sd={x:1,y:1},den=cross(d1,sd),
        t=Math.abs(den)>1e-9?cross({x:S0.x-P.x,y:S0.y-P.y},sd)/den:0.5,Q={x:P.x+t*d1.x,y:P.y+t*d1.y};
      line(s,P.x,P.y,Q.x,Q.y,"ray reflected");line(s,Q.x,Q.y,B2.x,B2.y,"ray reflected");
    });
    line(s,B2.x,axis-2,B2.x,B2.y,"image");text(s,B2.x+10,B2.y+5,"A₂B₂");
    line(s,sx,axis,B2.x,B2.y,"construction");text(s,sx+8,(axis+B2.y)/2,"x");
    const eyeX=sx,eyeHalf=38;
    if(eyeY>25){
      s.appendChild(E("path",{d:"M"+eyeX+" "+(eyeY-eyeHalf)+" Q"+(eyeX-20)+" "+eyeY+" "+eyeX+" "+(eyeY+eyeHalf)+" Q"+(eyeX+20)+" "+eyeY+" "+eyeX+" "+(eyeY-eyeHalf),class:"lens"}));
      text(s,eyeX+12,eyeY-20,"eyepiece");
      const outSlope=fe>0?-(B2.x-eyeX)/(fe*scale):0;
      [-20,20].forEach(dx=>{
        const hit={x:eyeX+dx,y:eyeY};line(s,B2.x,B2.y,hit.x,hit.y,"ray incident");
        const topY=20,topX=hit.x+outSlope*(eyeY-topY);line(s,hit.x,hit.y,topX,topY,"ray emergent");
      });
    }
    line(s,mx,axis+mirrorR+28,Fx,axis+mirrorR+28,"construction");text(s,(mx+Fx)/2-38,axis+mirrorR+45,"f₁′="+fmt(F,1)+" cm");
    text(s,35,35,"incoming rays from infinity → primary focus → 45° fold → eyepiece");
    setReadout(ui.readout,[
      ["|G|=f₁′/f₂′",fmt(G,2)+"×"],["θ≈A₁B₁/f₁′",fmt(theta,4)+" rad"],["|θ′|≈A₂B₂/f₂′",fmt(thetaP,4)+" rad"],
      ["primary → secondary",fmt(secFromPrimary,2)+" cm"],["secondary → focus",fmt(x,2)+" cm"],["secondary → eyepiece",fmt(x+fe,2)+" cm"],
      ["minimum tube diameter",fmt(D,2)+" cm"],["basic tube length",fmt(F,2)+" cm"],
      ["beam diameter at secondary",fmt(beamAtSec,3)+" cm"],["projected secondary aperture",fmt(dp,3)+" cm"],
      ["full primary cone",full?"intercepted":"clipped"],["largest x for this aperture",fmt(maxOffset,2)+" cm"],
      ["focus vs tube-wall radius",fmt(x-D/2,2)+" cm"]
    ]);
  };
  [f1,Dp,offset,f2,h,dproj].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function mountTelescope(host){
  const ui=hostShell(host,"Afocal astronomical telescope");
  const fo=addRange(ui.controls,"objective f",200,1500,10,1000," mm"),
    fe=addRange(ui.controls,"eyepiece f",10,80,1,20," mm"),
    field=addRange(ui.controls,"field angle α",-1,1,0.05,0,"°");
  const s=svgBase("Interactive afocal astronomical telescope with off-axis angular magnification");ui.canvas.appendChild(s);
  const redraw=()=>{
    clearSvg(s);
    const a=+fo.value,b=+fe.value,alpha=+field.value,G=a/b,total=a+b,scale=420/total,
      x1=120,x2=x1+total*scale,xf=x1+a*scale,axis=170,fopx=a*scale,fepx=b*scale,u=Math.tan(deg(alpha));
    line(s,20,axis,700,axis,"axis");
    s.appendChild(E("path",{d:"M"+x1+" 45 Q"+(x1-35)+" 170 "+x1+" 295 Q"+(x1+35)+" 170 "+x1+" 45",class:"lens"}));
    s.appendChild(E("path",{d:"M"+x2+" 70 Q"+(x2-28)+" 170 "+x2+" 270 Q"+(x2+28)+" 170 "+x2+" 70",class:"lens"}));
    [95,130].forEach(y1=>{
      const Y1=axis-y1,u1=u-Y1/fopx,Yf=Y1+fopx*u1,Y2=Yf+fepx*u1,u2=u1-Y2/fepx,
        yF=axis-Yf,y2=axis-Y2,x0=25,Y0=Y1-u*(x1-x0),y0=axis-Y0,yEnd=y2-u2*(690-x2);
      line(s,x0,y0,x1,y1,"ray incident");line(s,x1,y1,xf,yF,"ray refracted");
      line(s,xf,yF,x2,y2,"ray refracted");line(s,x2,y2,690,yEnd,"ray emergent");
    });
    const beta=-G*alpha;
    line(s,xf,55,xf,285,"construction");circle(s,xf,axis-fopx*u,4,"focus");
    text(s,xf-25,300,"F₁′ = F₂");text(s,x1-35,35,"objective");text(s,x2-30,55,"eyepiece");
    if(Math.abs(alpha)>1e-9){text(s,30,55,"incoming field angle α="+fmt(alpha,2)+"°");text(s,485,300,"output β≈−(f₁′/f₂′)α="+fmt(beta,2)+"°")}
    setReadout(ui.readout,[
      ["normal length",fmt(total,0)+" mm"],["|G|",fmt(G,1)+"×"],["signed G",fmt(-G,1)],
      ["input angle α",fmt(alpha,2)+"°"],["output angle β",fmt(beta,2)+"°"],
      ["shared focal plane",fmt(a,0)+" mm after objective"],["output","parallel / afocal"]
    ]);
  };
  [fo,fe,field].forEach(x=>{x.addEventListener("input",redraw);x.addEventListener("change",redraw)});redraw();
}
function staticSvg(key){
  const s=svgBase(key.replaceAll("-"," "));
  line(s,20,170,700,170,"axis");
  const T=(x,y,t)=>text(s,x,y,t);
  if(key==="object-image"){line(s,190,75,190,170,"object");line(s,530,80,530,170,"image");line(s,360,35,360,295,"system");T(120,65,"real object: rays diverge");T(465,65,"real image: rays converge");line(s,190,75,360,120,"ray incident");line(s,360,120,530,80,"ray refracted");line(s,190,75,360,200,"ray incident");line(s,360,200,530,80,"ray refracted")}
  else if(key==="wavefront"){
    line(s,0,160,720,160,"interface");line(s,360,25,360,295,"normal");
    const A={x:120,y:40},I={x:360,y:160},B={x:520,y:300};
    line(s,A.x,A.y,I.x,I.y,"ray incident");line(s,I.x,I.y,B.x,B.y,"ray refracted");
    const wf=(cx,cy,dx,dy)=>{const L=Math.hypot(dx,dy),px=-dy/L*42,py=dx/L*42;line(s,cx-px,cy-py,cx+px,cy+py,"wavefront")};
    [[175,67],[235,97],[295,127]].forEach(p=>wf(p[0],p[1],I.x-A.x,I.y-A.y));
    [[402,197],[447,237],[490,275]].forEach(p=>wf(p[0],p[1],B.x-I.x,B.y-I.y));
    T(55,30,"incident wavefronts ⟂ ray");T(470,310,"refracted wavefronts ⟂ ray");T(390,145,"slower medium: ray bends toward normal");
  }
  else if(key==="uniform-propagation"){
    s.appendChild(E("rect",{x:30,y:45,width:660,height:230,class:"glass"}));line(s,75,220,645,90,"ray incident");
    [170,280,390,500].forEach(x=>line(s,x,75,x+35,250,"wavefront"));
    T(50,35,"uniform transparent medium: n is constant");T(390,285,"Fermat/eikonal result: rays are straight in a homogeneous medium");
  }
  else if(key==="index-order"){line(s,0,105,720,105,"interface");line(s,0,225,720,225,"interface");line(s,145,25,300,105,"ray incident");line(s,300,105,390,225,"ray refracted");line(s,390,225,520,300,"ray emergent");T(35,85,"compare angles to normal");T(35,155,"toward normal ⇒ higher n");T(35,265,"away ⇒ lower n")}
  else if(key==="refraction-choice"){line(s,0,160,720,160,"interface");line(s,360,25,360,295,"normal");line(s,155,55,360,160,"ray incident");line(s,360,160,470,290,"ray refracted");line(s,360,160,650,225,"wrong");T(470,275,"possible");T(595,210,"too far from normal")}
  else if(key==="plane-mirror"){
    line(s,360,30,360,295,"mirrorline");line(s,180,95,180,170,"object");line(s,540,95,540,170,"virtual");
    const I={x:360,y:140};line(s,180,95,I.x,I.y,"ray incident");line(s,I.x,I.y,90,207.5,"ray reflected");line(s,I.x,I.y,540,95,"construction");
    line(s,I.x-28,I.y,I.x+28,I.y,"normal");
    T(160,75,"object");T(515,75,"virtual image");T(245,132,"i = r");
  }
  else if(key==="two-mirrors"){
    line(s,180,220,500,220,"mirrorline");line(s,500,60,500,220,"mirrorline");
    const P0={x:80,y:100},P1={x:300,y:220},P2={x:500,y:111},P3={x:300,y:2};
    line(s,P0.x,P0.y,P1.x,P1.y,"ray incident");line(s,P1.x,P1.y,P2.x,P2.y,"ray reflected");line(s,P2.x,P2.y,P3.x,P3.y,"ray reflected");
    T(185,245,"M₁");T(515,85,"M₂");T(250,300,"schematic two-reflection path; apply the exercise's stated mirror angle α");
  }
  else if(key==="mirror-field"){
    line(s,360,80,360,260,"mirrorline");circle(s,160,170,6,"eye");circle(s,560,170,6,"virtual");
    [[90,-38],[250,298]].forEach(([ym,yl])=>{
      line(s,160,170,360,ym,"ray reflected");line(s,360,ym,560,170,"construction");line(s,360,ym,40,yl,"construction");
    });
    T(90,160,"eye");T(500,160,"virtual eye");T(42,310,"field limits = edge lines toward virtual eye");
  }
  else if(key==="two-spherical-mirrors"){s.appendChild(E("path",{d:"M120 55 Q200 170 120 285",class:"mirror"}));s.appendChild(E("path",{d:"M600 55 Q520 170 600 285",class:"mirror"}));line(s,360,95,360,170,"object");T(95,40,"mirror 1");T(555,40,"mirror 2");T(290,300,"image from first becomes object for second")}
  else if(key==="diopter"){
    s.appendChild(E("path",{d:"M390 35 Q300 170 390 305",class:"diopter"}));circle(s,520,170,4,"point");circle(s,390,170,4,"point");
    line(s,390,170,520,170,"construction");T(375,195,"S");T(510,195,"C");T(95,95,"incident medium n");T(545,95,"emergent medium n′");
    T(175,300,"sign convention: R = SC; image position must be calculated from the exercise data");
  }
  else if(key==="focal-plane"){
    line(s,520,45,520,295,"focalplane");line(s,360,35,360,295,"system");circle(s,520,210,4,"focus");
    [[40,80,360,144],[40,120,360,184]].forEach(v=>line(s,v[0],v[1],v[2],v[3],"ray incident"));
    line(s,360,144,520,210,"ray refracted");line(s,360,184,520,210,"ray refracted");
    T(530,55,"image focal plane");T(530,210,"secondary focus F′θ");T(40,55,"inclined parallel bundle");
  }
  else if(key==="spherical-aberration"){
    const cx=275,cy=170,R=120;s.appendChild(E("path",{d:"M"+cx+" 50 A"+R+" "+R+" 0 0 1 "+cx+" 290",class:"diopter"}));
    [20,60].forEach((h,j)=>{
      const yy=cy-h,xh=cx+Math.sqrt(R*R-h*h),ii=Math.asin(h/R),rrr=Math.asin(1.5*Math.sin(ii)),alpha=rrr-ii,xf=xh+h/Math.tan(alpha);
      line(s,35,yy,xh,yy,"ray incident");line(s,xh,yy,xf,cy,"ray refracted");circle(s,xf,cy,4,j?"bad":"good");
    });
    T(35,35,"glass n=1.50 → air");T(475,145,"marginal focus");T(560,195,"paraxial focus farther away");T(430,300,"outside Gauss conditions: focal position depends on ray height");
  }
  else if(key==="glass-sphere"){
    circle(s,360,170,115,"sphere");circle(s,245,170,4,"point");circle(s,475,170,4,"point");
    T(205,150,"surface 1");T(475,150,"surface 2");T(305,45,"glass sphere");
    line(s,90,170,245,170,"ray incident");line(s,245,170,475,170,"ray refracted");line(s,475,170,630,170,"ray emergent");
    T(170,300,"treat successively: air → glass, transfer across sphere, glass → air");
  }
  else if(key==="goniometer"){
    circle(s,360,165,115,"goniometer-ring");circle(s,360,165,6,"point");
    line(s,360,165,190,70,"ray incident");line(s,360,165,555,75,"ray reflected");line(s,360,165,515,270,"ray reflected");
    T(115,55,"collimator / incident direction");T(520,62,"telescope position 1");T(505,292,"telescope position 2");
    T(315,160,"prism");T(250,25,"angular readings on circular scale");
  }
  else if(key==="prism"||key==="dispersion-prism"){
    const ap={x:360,y:35},L={x:155,y:275},R={x:565,y:275};s.appendChild(E("path",{d:"M"+ap.x+" "+ap.y+" L"+L.x+" "+L.y+" L"+R.x+" "+R.y+" Z",class:"prism"}));
    const P={x:245,y:170};line(s,25,170,P.x,P.y,"ray incident");
    if(key==="dispersion-prism"){
      const Qr={x:492,y:190},Qv={x:502,y:202};
      line(s,P.x,P.y,Qr.x,Qr.y,"ray red");line(s,P.x,P.y,Qv.x,Qv.y,"ray violet");
      line(s,Qr.x,Qr.y,690,150,"ray red");line(s,Qv.x,Qv.y,690,190,"ray violet");T(610,140,"red: smaller deviation");T(590,208,"violet: larger deviation");
    }else{
      const Q={x:500,y:200};line(s,P.x,P.y,Q.x,Q.y,"ray refracted");line(s,Q.x,Q.y,690,150,"ray emergent");
    }
    T(345,65,"A");T(220,155,"face 1");T(500,180,"face 2");
  }
  else if(key==="scale-comparison"){const rows=[["atom",2,"not ray-scale"],["λ = 600 nm",8,"reference"],["10 µm slit",45,"diffraction relevant"],["1 cm aperture",260,"ray optics safe"]];rows.forEach((r,i)=>{const y=45+i*62;s.appendChild(E("rect",{x:180,y,width:r[1],height:18,class:i<2?"wrong":"glass"}));T(35,y+14,r[0]);T(470,y+14,r[2])})}
  else if(key==="stigmatisme"){circle(s,135,110,5,"source");circle(s,565,110,5,"focus");line(s,360,30,360,300,"system");[65,105,150,205,245].forEach(y=>{line(s,135,110,360,y,"ray incident");line(s,360,y,565,110,"ray refracted")});T(65,90,"A");T(575,100,"A′");T(425,290,"stigmatic: all rays meet at A′")}
  else if(key==="fermat-reflection"){line(s,0,175,720,175,"mirrorline");circle(s,125,60,5,"source");circle(s,585,65,5,"eye");circle(s,585,285,5,"virtual");line(s,125,60,355,175,"ray incident");line(s,355,175,585,65,"ray reflected");line(s,355,175,585,285,"construction");T(105,45,"A");T(595,55,"B");T(595,300,"B*");T(230,315,"stationary reflected path ↔ straight line to the mirror image B*")}
  else if(key==="reversibility"){line(s,0,160,720,160,"interface");line(s,360,25,360,295,"normal");line(s,120,55,360,160,"ray incident");line(s,360,160,525,285,"ray refracted");T(55,45,"reverse ray arrows");T(440,300,"same geometrical path")}
  else if(key==="mirror-derivation"){
    s.appendChild(E("path",{d:"M600 45 Q545 170 600 295",class:"mirror"}));const S=600,C=460,F=530;
    circle(s,S,170,4,"point");circle(s,C,170,4,"point");circle(s,F,170,4,"focus");
    const I={x:582.4,y:95};line(s,120,95,I.x,I.y,"ray incident");line(s,I.x,I.y,F,170,"ray reflected");line(s,I.x,I.y,C,170,"construction");
    T(S-8,195,"S");T(C-8,195,"C");T(F-8,195,"F");T(415,35,"F is midway between S and C; normal at I passes through C");
  }
  else if(key==="mirror-centre"){
    s.appendChild(E("path",{d:"M600 45 Q545 170 600 295",class:"mirror"}));const C={x:400,y:170},I={x:576.64,y:121.5},A={x:140,y:235};
    circle(s,C.x,C.y,4,"point");circle(s,I.x,I.y,4,"point");line(s,A.x,A.y,I.x,I.y,"ray incident");line(s,I.x,I.y,A.x,A.y,"ray reflected");
    line(s,C.x,C.y,I.x,I.y,"construction");T(C.x-8,C.y+24,"C");T(520,92,"I");T(160,260,"a ray directed through C strikes normally and retraces its path");
  }
  else if(key==="diopter-derivation"){
    s.appendChild(E("path",{d:"M390 35 Q300 170 390 305",class:"diopter"}));const C={x:520,y:170},I={x:350,y:105};
    circle(s,C.x,C.y,4,"point");circle(s,390,170,4,"point");line(s,120,125,I.x,I.y,"ray incident");line(s,I.x,I.y,590,150,"ray refracted");line(s,I.x,I.y,C.x,C.y,"normal");
    T(335,90,"I");T(510,195,"C");T(378,195,"S");T(210,300,"angles are measured from the normal IC; apply Snell then the Gauss approximation");
  }
  else if(key==="diopter-centre"){
    s.appendChild(E("path",{d:"M390 35 Q300 170 390 305",class:"diopter"}));const C={x:520,y:170},I={x:350,y:135},A={x:120,y:88};
    circle(s,C.x,C.y,4,"point");circle(s,I.x,I.y,4,"point");line(s,A.x,A.y,650,196,"ray incident");line(s,I.x,I.y,C.x,C.y,"construction");
    T(510,195,"C");T(330,125,"I");T(150,70,"ray aimed through C is normal at the spherical surface and is undeviated");
  }
  else if(key==="right-angle-prism"){
    T(40,35,"1) normal entry through a short face → one TIR → 90° deviation");
    s.appendChild(E("path",{d:"M70 70 L70 250 L250 250 Z",class:"prism"}));line(s,20,160,70,160,"ray incident");line(s,70,160,160,160,"ray refracted");line(s,160,160,160,250,"ray reflected");line(s,160,250,160,310,"ray emergent");T(145,150,"45°");
    T(365,35,"2) normal entry through hypotenuse → two TIRs → 180° deviation");
    s.appendChild(E("path",{d:"M430 70 L430 250 L610 250 Z",class:"prism"}));
    line(s,600,0,480,120,"ray incident");line(s,480,120,430,170,"ray refracted");line(s,430,170,510,250,"ray reflected");line(s,510,250,560,200,"ray reflected");line(s,560,200,680,80,"ray emergent");
  }
  else if(key==="immersed-prism"){
    s.appendChild(E("rect",{x:0,y:0,width:720,height:320,class:"liquid upper"}));s.appendChild(E("path",{d:"M360 35 L150 275 L570 275 Z",class:"prism"}));
    const I1={x:465,y:155},I2={x:360,y:275};line(s,230,190,I1.x,I1.y,"ray incident");line(s,I1.x,I1.y,I2.x,I2.y,"ray reflected");line(s,I2.x,I2.y,265,315,"ray emergent");
    line(s,I1.x-40,I1.y-35,I1.x+40,I1.y+35,"normal");line(s,I2.x,I2.y-45,I2.x,I2.y+35,"normal");
    T(25,40,"outside liquid n′");T(475,135,"I₁: 70° → must remain TIR");T(375,260,"I₂: 50° → must transmit");T(205,305,"source-supplied incidence angles set 1.15 ≤ n′ < 1.41");
  }
  else if(key==="newton-lens"){line(s,205,35,205,300,"focalplane");line(s,520,35,520,300,"focalplane");s.appendChild(E("path",{d:"M360 45 Q322 170 360 295 Q398 170 360 45",class:"lens"}));circle(s,205,170,4,"focus");circle(s,520,170,4,"focus");T(170,25,"object focal plane");T(480,25,"image focal plane");T(275,305,"Newton distances x and x′")}
  else if(key==="bessel"){line(s,80,55,80,170,"object");line(s,640,45,640,295,"screen");s.appendChild(E("path",{d:"M270 60 Q235 170 270 280 Q305 170 270 60",class:"lens"}));s.appendChild(E("path",{d:"M450 60 Q415 170 450 280 Q485 170 450 60",class:"construction"}));T(230,40,"L position 1");T(415,40,"L position 2");T(265,305,"D fixed; two sharp positions separated by d")}
  else if(key==="two-diopters-lens"){
    s.appendChild(E("path",{d:"M320 45 Q270 170 320 295",class:"diopter"}));s.appendChild(E("path",{d:"M385 45 Q440 170 385 295",class:"diopter"}));
    line(s,320,35,320,305,"construction");line(s,385,35,385,305,"construction");T(245,35,"surface 1: n₀ → n");T(395,35,"surface 2: n → n₀");
    T(170,300,"derive each diopter relation, then take the thin limit S₁≈S₂");T(325,165,"lens medium n");
  }
  else if(key==="immersed-lens"){s.appendChild(E("rect",{x:0,y:0,width:720,height:320,class:"liquid upper"}));s.appendChild(E("path",{d:"M360 45 Q322 170 360 295 Q398 170 360 45",class:"lens"}));T(25,40,"surrounding medium nₘ");T(290,305,"power changes with relative index n_lens / nₘ")}
  else if(key==="diaphragm-lens"){circle(s,95,170,5,"source");line(s,190,75,190,265,"aperture");s.appendChild(E("path",{d:"M380 50 Q345 170 380 290 Q415 170 380 50",class:"lens"}));line(s,590,45,590,295,"screen");line(s,95,170,190,95,"ray incident");line(s,190,95,380,115,"ray incident");line(s,380,115,590,145,"ray refracted");line(s,95,170,190,245,"ray incident");line(s,190,245,380,225,"ray incident");line(s,380,225,590,195,"ray refracted");T(145,60,"diaphragm");T(560,35,"focal screen")}
  else if(key==="eye-range"){
    s.appendChild(E("ellipse",{cx:540,cy:170,rx:70,ry:55,class:"eye"}));line(s,60,170,470,170,"axis");
    line(s,110,95,110,245,"focalplane");line(s,330,105,330,235,"focalplane");T(55,75,"PR (far point)");T(285,85,"PP (near point)");
    line(s,110,270,330,270,"construction");T(145,295,"clear-vision interval: PP lies nearer the eye than PR");
  }
  else if(key==="eye-anatomy"){s.appendChild(E("ellipse",{cx:400,cy:170,rx:170,ry:125,class:"eye"}));s.appendChild(E("path",{d:"M285 70 Q245 170 285 270",class:"diopter"}));s.appendChild(E("path",{d:"M350 100 Q320 170 350 240 Q385 170 350 100",class:"lens"}));line(s,535,70,535,270,"retina");line(s,300,95,300,245,"aperture");T(205,55,"cornea");T(270,295,"iris / pupil");T(330,85,"crystalline lens");T(545,65,"retina")}
  else if(key==="astigmatism"){
    line(s,20,160,700,160,"construction");T(30,30,"Meridian 1: stronger power → nearer focus");T(30,190,"Meridian 2: weaker power → farther focus");
    s.appendChild(E("path",{d:"M350 25 Q320 80 350 140 Q380 80 350 25",class:"lens"}));line(s,70,60,350,60,"ray incident");line(s,70,115,350,115,"ray incident");line(s,350,60,500,85,"ray refracted");line(s,350,115,500,85,"ray refracted");line(s,500,45,500,135,"focalplane");
    s.appendChild(E("path",{d:"M350 185 Q325 240 350 300 Q375 240 350 185",class:"lens"}));line(s,70,220,350,220,"ray incident");line(s,70,275,350,275,"ray incident");line(s,350,220,565,245,"ray refracted");line(s,350,275,565,245,"ray refracted");line(s,565,205,565,295,"focalplane");
    T(585,155,"retina cannot coincide with both focal planes");
  }
  else if(key==="prism45"){
    s.appendChild(E("path",{d:"M180 280 L180 80 L380 80 Z",class:"prism"}));
    const P={x:180,y:200},Q={x:255,y:205},R={x:248,y:80};
    line(s,25,186,P.x,P.y,"ray incident");line(s,P.x,P.y,Q.x,Q.y,"ray refracted");line(s,Q.x,Q.y,R.x,R.y,"ray reflected");line(s,R.x,R.y,242,10,"ray emergent");
    line(s,180,160,240,160,"normal");line(s,220,240,285,175,"normal");line(s,220,80,220,30,"normal");
    T(195,145,"i = 5°");T(265,220,"TIR on 45° face AB");T(300,55,"exit");T(410,155,"net deviation D = 90° + 2i = 100°");
  }
  else if(key==="fish-visibility"){
    line(s,0,155,720,155,"interface");line(s,360,30,360,300,"normal");circle(s,360,265,7,"source");T(375,280,"fish");
    circle(s,535,60,7,"source");T(550,60,"fisherman");
    const lim=48.75,dy=110,dx=dy*Math.tan(deg(lim));
    line(s,360,265,360-dx,155,"ray refracted");line(s,360,265,360+dx,155,"ray refracted");
    line(s,360-dx,155,90,155,"ray emergent");line(s,360+dx,155,630,155,"ray emergent");
    T(55,140,"air");T(55,185,"water n=1.33");T(385,215,"Snell window half-angle 48.75°");T(420,305,"at the limit, the corresponding air ray is grazing");
  }
  else if(key==="dove-prism"){
    s.appendChild(E("path",{d:"M260 70 L460 70 L640 250 L80 250 Z",class:"prism"}));
    const P={x:200,y:130},Q={x:553,y:250},R={x:618,y:228};
    line(s,25,130,P.x,P.y,"ray incident");line(s,P.x,P.y,Q.x,Q.y,"ray refracted");line(s,Q.x,Q.y,R.x,R.y,"ray reflected");line(s,R.x,R.y,700,R.y,"ray emergent");
    line(s,Q.x,Q.y-55,Q.x,Q.y+35,"normal");T(295,55,"AB");T(295,278,"CD (TIR face)");T(95,115,"45° end face");T(535,115,"45° end face");T(375,205,"i_CD ≈ 71.2° > i_c");
    T(470,300,"emergent ray is parallel to the incident ray");
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
  else if(key==="autocollimation"){
    line(s,20,170,700,170,"axis");line(s,180,45,180,295,"focalplane");s.appendChild(E("path",{d:"M360 45 Q320 170 360 295 Q400 170 360 45",class:"lens"}));line(s,590,45,590,295,"mirrorline");
    const A={x:180,y:115},Ap={x:180,y:225};circle(s,A.x,A.y,5,"source");circle(s,Ap.x,Ap.y,5,"focus");
    line(s,A.x,A.y,360,120,"ray incident");line(s,A.x,A.y,360,200,"ray incident");
    line(s,360,120,590,145,"ray refracted");line(s,360,200,590,225,"ray refracted");
    line(s,590,145,360,170,"ray reflected");line(s,590,225,360,250,"ray reflected");
    line(s,360,170,Ap.x,Ap.y,"ray refracted");line(s,360,250,Ap.x,Ap.y,"ray refracted");
    T(135,100,"A");T(135,245,"A′");T(125,310,"A and A′ lie in the front focal plane and are symmetric about F");T(550,35,"plane mirror");
  }
  else if(key==="defocus"){
    s.appendChild(E("path",{d:"M250 45 Q210 170 250 295 Q290 170 250 45",class:"lens"}));const F={x:490,y:170},screen=570;
    [[90,250],[250,90]].forEach(([yin,ylens])=>{line(s,40,yin,250,yin,"ray incident");line(s,250,yin,F.x,F.y,"ray refracted");const slope=(F.y-yin)/(F.x-250),ys=F.y+slope*(screen-F.x);line(s,F.x,F.y,screen,ys,"ray refracted")});
    line(s,screen,55,screen,285,"screen");line(s,F.x,145,F.x,195,"focalplane");T(F.x-35,135,"sharp image plane");T(screen+10,45,"displaced screen");T(505,285,"finite blur/defocus spot on displaced screen");
  }
  else if(key==="two-lens"){s.appendChild(E("path",{d:"M250 55 Q215 170 250 285 Q285 170 250 55",class:"lens"}));s.appendChild(E("path",{d:"M500 55 Q465 170 500 285 Q535 170 500 55",class:"lens"}));line(s,40,95,250,95,"ray incident");line(s,250,95,420,170,"ray refracted");line(s,420,170,500,120,"ray refracted");line(s,500,120,690,120,"ray emergent");T(195,40,"lens 1");T(445,40,"lens 2")}
  else if(key==="microscope"){s.appendChild(E("path",{d:"M210 55 Q180 170 210 285 Q240 170 210 55",class:"lens"}));s.appendChild(E("path",{d:"M520 70 Q490 170 520 270 Q550 170 520 70",class:"lens"}));line(s,85,120,85,170,"object");line(s,410,170,410,245,"image");line(s,85,120,210,90,"ray incident");line(s,210,90,410,245,"ray refracted");line(s,410,245,520,120,"ray incident");line(s,520,120,690,80,"ray emergent");T(170,35,"objective");T(485,50,"eyepiece")}
  else if(key==="exit-pupil"){s.appendChild(E("path",{d:"M260 55 Q225 170 260 285 Q295 170 260 55",class:"lens"}));s.appendChild(E("path",{d:"M500 75 Q470 170 500 265 Q530 170 500 75",class:"lens"}));line(s,200,85,200,255,"aperture");line(s,200,85,500,135,"construction");line(s,200,255,500,205,"construction");line(s,500,135,620,155,"construction");line(s,500,205,620,185,"construction");line(s,620,155,620,185,"pupil");T(575,140,"exit pupil")}
  else if(key==="curved-fibre"){
    s.appendChild(E("path",{d:"M120 255 Q300 55 600 115",class:"interface"}));s.appendChild(E("path",{d:"M125 280 Q305 85 605 145",class:"interface"}));
    const pts=[[150,245],[255,155],[375,112],[500,115],[585,132]];for(let i=0;i<pts.length-1;i++)line(s,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],"ray guided");
    T(65,45,"curved guide: the outer-wall incidence decreases as the bend tightens");T(395,300,"limiting bend radius occurs when the most unfavorable outer-wall incidence reaches the critical angle");
  }
  else if(key==="optical-wedge"){
    s.appendChild(E("path",{d:"M135 95 L590 120 L590 220 L135 260 Z",class:"glass"}));const P={x:250,y:102},Q={x:500,y:228};
    line(s,40,55,P.x,P.y,"ray incident");line(s,P.x,P.y,Q.x,Q.y,"ray refracted");line(s,Q.x,Q.y,685,285,"ray emergent");
    line(s,P.x,P.y-35,P.x,P.y+35,"normal");line(s,Q.x-8,Q.y-35,Q.x+8,Q.y+35,"normal");T(180,285,"non-parallel faces → emergent ray is generally not parallel to incident ray");
  }
  else if(key==="myopia-correction"){
    s.appendChild(E("ellipse",{cx:555,cy:170,rx:80,ry:60,class:"eye"}));line(s,625,100,625,240,"retina");s.appendChild(E("path",{d:"M250 80 Q285 170 250 260 M300 80 Q265 170 300 260",class:"lens"}));
    const FR={x:155,y:170};circle(s,FR.x,FR.y,5,"focus");T(115,195,"far point PR");
    [[145,94],[160,140]].forEach(([yl,ye])=>{line(s,30,yl,275,yl,"ray incident");line(s,275,yl,520,ye,"ray refracted");line(s,FR.x,FR.y,275,yl,"construction");line(s,520,ye,625,170,"ray refracted")});
    T(205,55,"negative spectacle lens");T(390,300,"parallel rays are made to diverge as if from PR, then the eye focuses them on the retina");
  }
  else if(key==="near-correction"){
    s.appendChild(E("ellipse",{cx:585,cy:170,rx:70,ry:55,class:"eye"}));s.appendChild(E("path",{d:"M300 80 Q265 170 300 260 Q335 170 300 80",class:"lens"}));line(s,110,125,110,170,"object");
    const V={x:25,y:100};line(s,V.x,V.y,V.x,170,"virtual");T(35,85,"virtual image at unaided near point");
    [[130,154],[170,226]].forEach(([yl,ye])=>{line(s,110,125,300,yl,"ray incident");line(s,300,yl,520,ye,"ray refracted");line(s,V.x,V.y,300,yl,"construction")});
    T(70,115,"reading object");T(245,55,"positive spectacle lens");T(345,300,"backward extensions meet at a farther virtual image that the eye can accommodate");
  }
  else if(key==="newtonian"){
    const F1={x:440,y:170},F2={x:520,y:90};s.appendChild(E("path",{d:"M620 40 Q520 170 620 300",class:"mirror"}));
    line(s,55,100,620,100,"ray incident");line(s,55,200,620,200,"ray incident");
    const I1={x:497.6,y:147.6},I2={x:536,y:186};line(s,620,100,I1.x,I1.y,"ray reflected");line(s,620,200,I2.x,I2.y,"ray reflected");
    line(s,495,145,540,190,"mirrorline");line(s,I1.x,I1.y,F2.x,F2.y,"ray reflected");line(s,I2.x,I2.y,F2.x,F2.y,"ray reflected");
    line(s,470,45,570,45,"lens");line(s,F2.x,F2.y,500,45,"ray incident");line(s,F2.x,F2.y,540,45,"ray incident");line(s,500,45,500,10,"ray emergent");line(s,540,45,540,10,"ray emergent");
    circle(s,F1.x,F1.y,4,"focus");circle(s,F2.x,F2.y,4,"focus");T(545,35,"primary");T(500,215,"45° secondary before F₁");T(555,70,"eyepiece");T(390,185,"unfolded F₁");T(530,100,"redirected focal point");
  }
  else{T(240,160,"Diagram for "+key)}
  return s;
}
function mountStatic(key,host){
  host.innerHTML='<div class="visual-head"><div><span class="theory-label">DIAGRAM</span><h3>'+key.replaceAll("-"," ")+'</h3></div><span class="visual-note">Conceptual schematic — use the exercise values; not to scale unless explicitly labelled.</span></div><div class="visual-canvas"></div><div class="visual-legend" aria-label="Diagram key"><span><i class="legend-ray"></i>solid arrow = real light path</span><span><i class="legend-construction"></i>dashed = construction / backward extension</span></div>';
  host.querySelector(".visual-canvas").appendChild(staticSvg(key));
}
const live={
  "refraction-live":mountRefraction,"plate-live":mountPlate,"layers-live":mountLayers,"fibre-live":mountFibre,
  "mirror-live":mountMirror,"mirror-translation-live":mountMirrorTranslation,"diopter-live":mountDiopter,"plane-diopter-live":mountPlaneDiopter,"prism-live":mountPrism,"goniometer-live":mountGoniometer,"cauchy-live":mountCauchy,"lens-live":mountLens,"lens-maker-live":mountLensMaker,"lens-combination-live":mountLensCombination,"two-lens-live":mountTwoLensImaging,"exit-pupil-live":mountExitPupil,"eye-live":mountEye,"accommodation-live":mountAccommodation,"magnifier-live":mountMagnifier,"microscope-live":mountMicroscope,"newtonian-live":mountNewtonian,"angular-resolution-live":mountAngularResolution,"telescope-live":mountTelescope
};
window.OPTICS_VISUALS={
  mount(key,host,preset){if(!host||!key)return;if(live[key]){live[key](host);applyPreset(host,preset)}else mountStatic(key,host);installViewControl(host)}
};
})();