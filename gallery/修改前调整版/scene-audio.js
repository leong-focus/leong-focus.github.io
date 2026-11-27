(()=>{
 const tracks={};let latest=null,currentScene=-1,leaving=false;
 function track(name,file,volume,loop){
  const clip=new Audio('assets/audio/'+file+'?v=scene-audio-10');clip.preload='auto';clip.volume=volume;clip.loop=loop;
  const item={name,clip,pending:false,blocked:false};tracks[name]=item;
  clip.addEventListener('canplay',()=>{if(latest)sync(latest)});return item;
 }
 track('chant','temple-chant-louder-v2.mp3',1,true);
 track('paper','study-paper-louder-v2.mp3',1,false);
 track('writing','study-writing-louder-v2.mp3',1,true);
 track('birds','study-birds.mp3',.14,true);
 track('foliage','third-foliage.mp3',.86,true);
 track('voices','museum-voices.mp3',.55,true);
 function sceneFor(state){
  if(!state||state.dragging||document.hidden||leaving||window.gallerySoundPreference?.enabled===false)return -1;
  if(state.target===0&&Math.abs(state.position)<.025)return 0;
  if(state.target===1&&Math.abs(state.position-1)<.025)return 1;
  if(state.target===2&&Math.abs(state.position-2)<.025)return 2;
  if(state.target===3&&Math.abs(state.position-3)<.025)return 3;
  return -1;
 }
 function wanted(name){return currentScene===0?name==='chant':currentScene===1?['paper','writing','birds'].includes(name):currentScene===2?name==='foliage':currentScene===3&&name==='voices'}
 function stop(item){item.clip.pause();if(item.clip.currentTime!==0)item.clip.currentTime=0}
 function play(item){
  if(item.pending||item.blocked||!item.clip.paused)return;
  item.pending=true;
  try{
   const result=item.clip.play();
   Promise.resolve(result).then(()=>{item.pending=false;if(!wanted(item.name)||document.hidden||leaving)stop(item)}).catch(()=>{item.pending=false;item.blocked=true});
  }catch{item.pending=false;item.blocked=true}
 }
 let paperStarted=false;
 function sync(state){
  latest=state;const next=sceneFor(state);
  if(next!==currentScene){Object.values(tracks).forEach(stop);currentScene=next;paperStarted=false}
  for(const item of Object.values(tracks)){
   if(!wanted(item.name)){if(!item.clip.paused||item.clip.currentTime)stop(item);continue}
   if(item.name==='paper'){
    if(!paperStarted&&!item.blocked){play(item);paperStarted=true}
   }else play(item);
  }
 }
 function retry(){
  Object.values(tracks).forEach(item=>item.blocked=false);
  if(currentScene===1&&tracks.paper.clip.paused&&tracks.paper.clip.currentTime===0)paperStarted=false;
  if(latest)sync(latest);
 }
 document.addEventListener('pointerdown',retry,{capture:true});
 document.addEventListener('keydown',retry,{capture:true});
 document.addEventListener('visibilitychange',()=>{if(latest)sync(latest)});
 window.addEventListener('gallery-audio-change',retry);
 window.addEventListener('pagehide',()=>{leaving=true;Object.values(tracks).forEach(stop)});
 window.addEventListener('pageshow',()=>{leaving=false;retry()});
 window.gallerySceneAudio={sync,get state(){return {scene:currentScene,volumes:Object.fromEntries(Object.entries(tracks).map(([key,item])=>[key,item.clip.volume]))}}};
})();
