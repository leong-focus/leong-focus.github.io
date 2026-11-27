(()=>{
 const scene=document.querySelector('.scene'),target=document.querySelector('.target'),film=document.querySelector('.film-intro'),video=film.querySelector('video'),arrival=document.querySelector('.site-arrival');
 const volume=document.createElement('button');volume.type='button';volume.className='sound-control';
 volume.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 13h4l6-5v16l-6-5H5Z"/><g class="waves"><path d="M19 12q3 4 0 8"/><path d="M23 8q6 8 0 16"/><path d="M27 5q8 11 0 22"/></g><g class="muted-mark"><path d="m20 12 8 8m0-8-8 8"/><path d="m3 3 26 26"/></g></svg>';
 let enabled=true;
 function recording(name,level,loop=false){const clip=new Audio('audio/'+name+'.mp3?v=user-bell-cues-6');clip.preload='auto';clip.volume=level;clip.loop=loop;clip.muted=!enabled;return clip}
 const music=recording('music-loop',.32,true),birds=recording('birds',.4,true),fire=recording('fire',.36,true),musicBell=recording('user-bells',.65),floatBell=recording('user-bells',.65),digs=Array.from({length:3},()=>recording('dig',.7));
 const all=[music,birds,fire,musicBell,floatBell,...digs];let digIndex=0,needsGesture=false,gestureSeen=false;
 function syncButton(){volume.setAttribute('aria-pressed',String(enabled));volume.setAttribute('aria-label',enabled?'声音已开启，点击静音':'声音已静音，点击开启');volume.title=enabled?'静音':'开启声音'}
 function play(clip){if(!enabled)return;clip.muted=false;const p=clip.play();if(p)p.catch(()=>{if(clip===music){needsGesture=true;syncButton()}})}
 let arrivalBegan=null;
 function ambience(){
  if(arrival.hidden)arrivalBegan=null;else if(arrivalBegan===null)arrivalBegan=performance.now();
  const running=enabled&&!film.hidden&&!film.classList.contains('departing');
  const time=video.currentTime+(arrivalBegan===null?0:(performance.now()-arrivalBegan)/1000);
  for(const [clip,inCue] of [[birds,running&&time>=1.35&&time<10],[fire,running&&time>=7.25&&time<12]]){
   if(inCue){if(clip.paused)play(clip)}else if(!clip.paused){clip.pause();clip.currentTime=0}
  }
 }
 setInterval(()=>{if(!document.hidden)ambience()},100);

 function unlock(){gestureSeen=true;needsGesture=false;all.forEach(a=>a.muted=!enabled);if(enabled)play(music);ambience();syncButton()}
 volume.addEventListener('click',()=>{if(needsGesture&&enabled){unlock();return}enabled=!enabled;all.forEach(a=>a.muted=!enabled);if(enabled)unlock();else{birds.pause();fire.pause();syncButton()}});
 scene.append(volume);syncButton();music.autoplay=true;music.addEventListener('canplay',()=>{if(enabled&&music.paused)play(music)});if(enabled)play(music);[250,750,1600].forEach(delay=>setTimeout(()=>{if(enabled&&music.paused)play(music)},delay));
 document.addEventListener('pointerdown',event=>{if(event.target.closest('.sound-control'))return;if(!gestureSeen||needsGesture)unlock()},{capture:true});
 document.addEventListener('keydown',()=>{if(!gestureSeen||needsGesture)unlock()});
 video.addEventListener('timeupdate',ambience);video.addEventListener('seeking',ambience);new MutationObserver(ambience).observe(film,{attributes:true,attributeFilter:['class','hidden']});new MutationObserver(ambience).observe(arrival,{attributes:true,attributeFilter:['hidden']});
 target.addEventListener('click',()=>{if(!enabled)return;const clip=digs[digIndex++%digs.length];clip.pause();clip.currentTime=0;setTimeout(()=>{if(enabled)play(clip)},110)},{capture:true});
 // The supplied bell recording accompanies both the first floating reveal and acceptance.
 let floatingRang=false;
 new MutationObserver(()=>{
  const floating=!!scene.querySelector('.find.floating');
  if(floating&&!floatingRang){floatingRang=true;if(enabled){floatBell.currentTime=0;play(floatBell)}}
  if(!floating)floatingRang=false;
 }).observe(scene,{subtree:true,attributes:true,attributeFilter:['class']});
 const accept=document.querySelector('.repair-invite button');let acceptContinuing=false;
 accept.addEventListener('click',event=>{
  if(acceptContinuing||!enabled)return;
  event.preventDefault();event.stopImmediatePropagation();accept.disabled=true;
  const previousVolume=music.volume;music.volume=.1;musicBell.currentTime=0;
  let finished=false;
  const proceed=()=>{if(finished)return;finished=true;musicBell.onended=null;musicBell.onerror=null;music.volume=previousVolume;acceptContinuing=true;accept.disabled=false;accept.click()};
  musicBell.onended=proceed;musicBell.onerror=proceed;
  const started=musicBell.play();if(started)started.catch(proceed);
  setTimeout(proceed,3500);
 },{capture:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){all.forEach(a=>a.pause())}else{if(enabled)play(music);ambience()}});
 // Preserve the hand-painted mound relief and gently blend its contact edge.
 const source=document.querySelector('.clod'),image=new Image();image.onload=()=>{const w=image.naturalWidth,h=image.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(image,0,0);g.globalCompositeOperation='destination-in';g.filter='blur(4px)';g.drawImage(image,0,0);g.filter='none';const skirt=g.createLinearGradient(0,h*.66,0,h);skirt.addColorStop(0,'#fff');skirt.addColorStop(.58,'#ffffffd9');skirt.addColorStop(1,'#ffffff00');g.fillStyle=skirt;g.fillRect(0,0,w,h);const data=c.toDataURL('image/png');document.querySelectorAll('.clod,.surface-cover').forEach(el=>el.src=data)};image.src=source.src;
 window.excavationSound={get enabled(){return enabled},source:'recorded-audio',music:'user-supplied-video',cues:{birds:[1.35,10],fire:[7.25,12]}};
})();
