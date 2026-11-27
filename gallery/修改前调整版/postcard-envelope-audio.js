(()=>{
 const stage=document.querySelector('#stage'),opening=new Audio('assets/audio/postcard-flip-audible-v2.mp3?v=2'),flip=new Audio('assets/audio/postcard-flip-audible-v2.mp3?v=2'),lifting=new Audio('assets/audio/postcard-lift-book-page.mp3?v=1');
 opening.preload=flip.preload=lifting.preload='auto';opening.volume=1;flip.volume=1;lifting.volume=.9;let opened=false,lifted=false;
 function stop(clip){clip.pause();clip.currentTime=0}
 function play(clip){if(window.gallerySoundPreference?.enabled===false||document.hidden)return;clip.currentTime=0;const result=clip.play();if(result)result.catch(()=>{})}
 new MutationObserver(()=>{const showing=stage.classList.contains('open'),rising=stage.classList.contains('lifting');if(showing&&!opened){opened=true;play(opening)}if(!showing&&opened){opened=false;stop(opening)}if(rising&&!lifted){lifted=true;play(lifting)}if(!rising&&lifted){lifted=false;stop(lifting)}}).observe(stage,{attributes:true,attributeFilter:['class']});
 function stopAll(){stop(opening);stop(flip);stop(lifting)}
 window.addEventListener('gallery-audio-change',()=>{if(window.gallerySoundPreference?.enabled===false)stopAll()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAll()});
 window.addEventListener('pagehide',stopAll);
 window.postcardPaperSound={playFlip(){play(flip)}};
})();
