(()=>{
 const layer=document.createElement('div');layer.className='gallery-petals';layer.setAttribute('aria-hidden','true');document.querySelector('main').append(layer);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let active=false,next=0,count=0;
 function clear(){active=false;layer.replaceChildren()}
 function sync(show){
  const now=performance.now();
  if(!show||document.hidden||reduced.matches){if(active)clear();return}
  if(!active){active=true;next=now+650}
  if(now<next||layer.childElementCount>=4)return;
  const img=document.querySelector('#contents.pink img');if(!img)return;
  const rect=img.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const anchors=[[.46,.19],[.77,.37],[.25,.4]],anchor=anchors[count%3],petal=document.createElement('i');
  petal.className='falling-peony-petal';const size=Math.min(10,Math.max(5.5,rect.width*.032));
  petal.style.left=(rect.left+rect.width*anchor[0])+'px';petal.style.top=(rect.top+rect.height*anchor[1])+'px';
  petal.style.width=size+'px';petal.style.height=(size*.66)+'px';
  petal.style.setProperty('--sway',((count%2?1:-1)*(18+count%3*7))+'px');
  petal.style.setProperty('--fall',Math.max(85,rect.height*.52)+'px');
  petal.style.setProperty('--duration',(5.2+count%3*.6)+'s');
  petal.style.setProperty('--turn',(count%2?185:-155)+'deg');
  petal.addEventListener('animationend',()=>petal.remove(),{once:true});layer.append(petal);count++;next=now+1650;
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear()});window.addEventListener('pagehide',clear);
 window.galleryPetals={sync};
})();
