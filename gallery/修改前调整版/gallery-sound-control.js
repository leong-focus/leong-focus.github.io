(()=>{
 let enabled=true;try{enabled=localStorage.getItem('time-gallery-audio-enabled')!=='false'}catch{}
 const button=document.createElement('button');button.type='button';button.className='gallery-sound-toggle';
 button.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true"><g class="sound-bars"><path d="M9 18v4"/><path d="M13 14v12"/><path d="M17 10v20"/><path d="M21 16v8"/><path d="M25 12v16"/><path d="M29 16v8"/><path d="M33 18v4"/></g><path class="sound-slash" d="M9 9 31 31"/></svg>';
 function update(){button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'声音已开启，点击静音':'声音已静音，点击开启');button.title=enabled?'静音':'开启声音'}
 function setEnabled(value){enabled=Boolean(value);try{localStorage.setItem('time-gallery-audio-enabled',String(enabled))}catch{}update();window.dispatchEvent(new Event('gallery-audio-change'))}
 button.addEventListener('click',()=>setEnabled(!enabled));
 window.addEventListener('storage',event=>{if(event.key==='time-gallery-audio-enabled'){enabled=event.newValue!=='false';update();window.dispatchEvent(new Event('gallery-audio-change'))}});
 window.gallerySoundPreference={get enabled(){return enabled},setEnabled};
 (document.querySelector('main')||document.body).append(button);update();
})();
