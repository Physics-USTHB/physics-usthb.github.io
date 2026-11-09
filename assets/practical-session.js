(()=>{'use strict';
if(window.__PhysicsUSTHBPracticalSession)return;
window.__PhysicsUSTHBPracticalSession=true;

function practicalCode(){
  const parts=location.pathname.split('/').filter(Boolean);
  for(let i=parts.length-1;i>=0;i--)if(/^[a-z]\d{2}$/i.test(parts[i]))return parts[i].toUpperCase();
  return null;
}
function matchingKeys(storage,code){
  if(!storage||!code)return[];
  const re=new RegExp('(^|_)'+code+'(_|$)','i'),out=[];
  for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k&&re.test(k))out.push(k)}
  return out;
}
function clearCurrentPractical(){
  const code=practicalCode();
  const local=matchingKeys(window.localStorage,code),session=matchingKeys(window.sessionStorage,code);
  const ok=window.confirm('Restart this practical?\n\nAll saved measurements, analysis progress and generated run values for '+(code||'this practical')+' on this browser will be erased. Other practicals will not be affected.\n\nThis cannot be undone.');
  if(!ok)return;
  local.forEach(k=>localStorage.removeItem(k));
  session.forEach(k=>sessionStorage.removeItem(k));
  location.reload();
}
function init(){
  if(document.getElementById('restartPractical'))return;
  const host=document.querySelector('.navlinks')||document.querySelector('.tabrow')||document.querySelector('header .shell');
  if(!host)return;
  const b=document.createElement('button');
  b.id='restartPractical';b.type='button';b.textContent='Restart practical';
  b.title='Erase saved progress for this practical on this browser and begin a fresh run';
  b.setAttribute('aria-label','Restart this practical from the beginning');
  b.style.cssText='appearance:none;border:1px solid currentColor;border-radius:999px;background:transparent;color:inherit;padding:7px 11px;font:inherit;font-size:.88rem;font-weight:700;cursor:pointer;white-space:nowrap;opacity:.9';
  b.addEventListener('mouseenter',()=>b.style.opacity='1');b.addEventListener('mouseleave',()=>b.style.opacity='.9');
  b.addEventListener('click',clearCurrentPractical);
  host.appendChild(b);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();