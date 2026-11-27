(()=>{
 let canvas=null,context=null,enabled=false,frame=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function ensure(){
  if(canvas)return true;const scene=document.querySelector('#scenery .scene');if(!scene)return false;
  canvas=document.createElement('canvas');canvas.className='incense-smoke';canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
  scene.append(canvas);context=canvas.getContext('2d');return true;
 }
 function draw(time){
  if(!enabled||document.hidden)return;
  const rect=canvas.parentElement.getBoundingClientRect(),w=rect.width,h=rect.height,dpr=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
  const c=context;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
  const scale=Math.max(w/1673,h/940),x=(w-1673*scale)/2+1090*scale,y=(h-940*scale)/2+668*scale,length=170*scale,t=reduced.matches?0:time/1000;
  const gradient=c.createLinearGradient(0,y,0,y-length);gradient.addColorStop(0,'rgba(255,253,241,.12)');gradient.addColorStop(.18,'rgba(255,253,242,.34)');gradient.addColorStop(.58,'rgba(255,254,247,.24)');gradient.addColorStop(1,'rgba(255,255,252,0)');
  function path(offset){c.beginPath();for(let i=0;i<=100;i++){const q=i/100,lift=q*length;const drift=(Math.sin(q*9-t*.75)*9+Math.sin(q*4.6-t*.43)*7)*Math.pow(Math.sin(q*Math.PI*.85),1.6)+q*7;const px=x+(drift+offset*q)*scale,py=y-lift;i?c.lineTo(px,py):c.moveTo(px,py)}}
  c.lineCap='round';c.lineJoin='round';c.strokeStyle=gradient;
  c.save();c.filter='blur('+Math.max(.7,scale*2.8)+'px)';c.lineWidth=5*scale;path(0);c.stroke();c.restore();
  c.save();c.filter='blur('+Math.max(.25,scale*.6)+'px)';c.lineWidth=1.9*scale;path(0);c.stroke();c.globalAlpha=.45;c.lineWidth=.8*scale;path(2);c.stroke();c.restore();
  if(!reduced.matches)frame=requestAnimationFrame(draw);
 }
 function stop(){enabled=false;cancelAnimationFrame(frame);if(canvas){canvas.hidden=true;context.clearRect(0,0,canvas.width,canvas.height)}}
 function sync(show){if(!show||document.hidden){if(enabled)stop();return}if(!enabled&&ensure()){enabled=true;canvas.hidden=false;draw(performance.now())}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
 window.galleryIncense={sync};
})();
