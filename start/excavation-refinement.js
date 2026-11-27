
(()=>{
 const scene=document.querySelector('.scene'),soil=document.querySelector('.soil');
 let seed=6481;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const grain=document.createElement('canvas');grain.className='ground-grain';grain.width=1600;grain.height=900;soil.prepend(grain);
 const g=grain.getContext('2d');
 for(let i=0;i<12000;i++){const x=random()*1600,y=260+random()*585;if(x<120||x>1450&&y>720)continue;const size=.3+random()*1.7;g.globalAlpha=.025+random()*.11;g.fillStyle=random()<.57?'#7f5838':'#f8ddb1';g.beginPath();g.ellipse(x,y,size*1.5,size,random()*Math.PI,0,Math.PI*2);g.fill()}g.globalAlpha=1;

 const earth=new Image();earth.src=getComputedStyle(scene).backgroundImage.slice(4,-1).replace(/^['"]|['"]$/g,'');
 const soilSource=document.querySelector('.clod').src;
 function pit(canvas,index){
  const c=canvas.getContext('2d');canvas.width=640;canvas.height=300;let local=[];
  for(let i=0;i<84;i++){const a=i/84*Math.PI*2,r=1+Math.sin(i*1.7+index)*.012+Math.sin(i*.71)*.02;local.push([320+Math.cos(a)*293*r,150+Math.sin(a)*115*r])}
  function outline(){c.beginPath();local.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath()}
  c.clearRect(0,0,640,300);c.save();outline();c.clip();
  if(earth.complete&&earth.naturalWidth){const sw=earth.naturalWidth*.38,sh=earth.naturalHeight*.30,sx=earth.naturalWidth*(.15+(index%4)*.065),sy=earth.naturalHeight*(.38+(index%3)*.04);c.drawImage(earth,sx,sy,sw,sh,0,0,640,300)}else{c.fillStyle='#cfa06c';c.fillRect(0,0,640,300)}
  const shade=c.createLinearGradient(0,28,0,275);shade.addColorStop(0,'#604631a6');shade.addColorStop(.18,'#76503865');shade.addColorStop(.4,'#98674324');shade.addColorStop(.72,'#a97a4b0f');shade.addColorStop(1,'#f3ce9620');c.fillStyle=shade;c.fillRect(0,0,640,300);
  const colors=['#b2714a','#efd1a0','#bd925f','#957250','#d8aa75','#c58a63'];
  for(let i=0;i<110;i++){const x=random()*640,y=random()*300,r=14+random()*52,cloud=c.createRadialGradient(x,y,0,x,y,r);cloud.addColorStop(0,colors[i%colors.length]+'19');cloud.addColorStop(1,colors[i%colors.length]+'00');c.fillStyle=cloud;c.fillRect(x-r,y-r,r*2,r*2)}
  // Preserve only natural watercolor earth texture; no repeated incision stripes.
  for(let i=0;i<1700;i++){c.globalAlpha=.025+random()*.09;c.fillStyle=i%3?'#724c32':'#f7d9a6';c.beginPath();c.ellipse(random()*640,random()*300,.4+random()*1.6,.3+random(),0,0,7);c.fill()}c.globalAlpha=1;c.restore();
  const feather=document.createElement('canvas');feather.width=640;feather.height=300;const f=feather.getContext('2d');f.filter='blur(3px)';f.beginPath();local.forEach(([x,y],i)=>i?f.lineTo(x,y):f.moveTo(x,y));f.closePath();f.fillStyle='#fff';f.fill();c.globalCompositeOperation='destination-in';c.drawImage(feather,0,0);c.globalCompositeOperation='source-over';
 }

 const pits=[...document.querySelectorAll('.hollow')];
 pits.forEach((el,index)=>{
  const originalWidth=parseFloat(el.style.getPropertyValue('--w'));el.style.setProperty('--w',(originalWidth*1.24)+'%');
  if(index<2){el.style.setProperty('--x','49%');el.style.setProperty('--y','54%')}
  const canvas=document.createElement('canvas');el.append(canvas);pit(canvas,index);
 });
 earth.addEventListener('load',()=>pits.forEach((el,index)=>pit(el.querySelector('canvas'),index)),{once:true});
 new MutationObserver(()=>{if(pits[1].classList.contains('open'))pits[0].classList.add('merged-pit')}).observe(pits[1],{attributes:true,attributeFilter:['class']});
 // Connected thin surface cover blends the original clods into the surrounding ground.
 const positions=[[29,39,14],[43,39,11],[58,43,12],[37,57,12],[61,58,13],[47,72,12],[67,70,11]];
 positions.forEach(([x,y,w],i)=>{const cover=new Image();cover.src=soilSource;cover.className='surface-cover';cover.alt='';cover.style.left=x+'%';cover.style.top=y+'%';cover.style.width=w+'%';cover.style.transform='translate(-50%,-50%) rotate('+(i<2?-5:4)+'deg)';soil.prepend(cover)});
 document.querySelectorAll('.find').forEach((el,index)=>{
  const img=el.querySelector('img');function thicken(){
   const pad=18,w=img.naturalWidth,h=img.naturalHeight;if(!w)return;const canvas=document.createElement('canvas');canvas.className='artifact-surface';canvas.width=w+pad*2;canvas.height=h+pad*2;canvas.setAttribute('aria-label','有胎体断面和弧度的青瓷残片');const c=canvas.getContext('2d');
   if(index===0){el.classList.add('original-major');c.drawImage(img,pad,pad)}else{
   const edge=document.createElement('canvas');edge.width=w;edge.height=h;const e=edge.getContext('2d');e.drawImage(img,0,0);e.globalCompositeOperation='source-in';e.fillStyle='#b4956f';e.fillRect(0,0,w,h);
   c.shadowColor='#3e2c1c70';c.shadowBlur=9;c.shadowOffsetY=7;c.drawImage(edge,pad+3,pad+8);c.shadowColor='transparent';for(let d=8;d>=1;d--)c.drawImage(edge,pad+d*.38,pad+d);
   c.filter='brightness(.97) contrast(1.035)';c.drawImage(img,pad,pad);c.filter='none';
   const volume=document.createElement('canvas');volume.width=canvas.width;volume.height=canvas.height;const v=volume.getContext('2d');v.drawImage(img,pad,pad);v.globalCompositeOperation='source-in';const light=v.createLinearGradient(0,0,canvas.width,0);light.addColorStop(0,'#243a272e');light.addColorStop(.36,'#fff9db12');light.addColorStop(.62,'#ffffff00');light.addColorStop(1,'#30402a40');v.fillStyle=light;v.fillRect(0,0,volume.width,volume.height);c.drawImage(volume,0,0);}
   img.replaceWith(canvas);
   const complete=document.createElement('canvas');complete.width=canvas.width;complete.height=canvas.height;complete.getContext('2d').drawImage(canvas,0,0);
   const cuts=[.66,.64,.57,.69,.61,.67];const jagged=[];for(let k=0;k<=28;k++)jagged.push(Math.sin(k*1.77+index)*.025+Math.cos(k*.74+index*.9)*.024+(random()-.5)*.025);
   function expose(){
    c.clearRect(0,0,canvas.width,canvas.height);c.globalCompositeOperation='source-over';c.drawImage(complete,0,0);
    if(el.classList.contains('floating'))return;
    const cut=el.classList.contains('partial')?.43:cuts[index],mask=document.createElement('canvas');mask.width=canvas.width;mask.height=canvas.height;const m=mask.getContext('2d');
    m.beginPath();m.moveTo(0,0);m.lineTo(mask.width,0);for(let k=28;k>=0;k--)m.lineTo(mask.width*k/28,mask.height*(cut+jagged[k]));m.closePath();m.fillStyle='#fff';m.fill();
    c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);c.globalCompositeOperation='source-over';
    // The alpha crop removes the lower half; align what is actually visible to its own excavation.
    const pixels=complete.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let minX=canvas.width,minY=canvas.height,maxX=0,maxY=0;
    for(let y=0;y<canvas.height*cuts[index];y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>45){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
    function seat(){
     if(el.classList.contains('floating'))return;
     const pitIndex=index===0?0:index+1;
     const hollow=document.querySelectorAll('.hollow')[pitIndex],rect=scene.getBoundingClientRect();
     const pitX=parseFloat(hollow.style.getPropertyValue('--x')),pitY=parseFloat(hollow.style.getPropertyValue('--y')),pitWidth=parseFloat(hollow.style.getPropertyValue('--w'))/100*rect.width,pitHeight=pitWidth/1.95;
     el.style.setProperty('--x',pitX+'%');el.style.setProperty('--y',(pitY+pitHeight*.14/rect.height*100)+'%');
     const renderWidth=rect.width*parseFloat(el.style.getPropertyValue('--w'))/100,scale=renderWidth/canvas.width;
     const x=((minX+maxX)/2-canvas.width/2)*scale,y=((minY+maxY)/2-canvas.height/2)*scale,a=parseFloat(el.style.getPropertyValue('--angle'))*Math.PI/180;
     el.style.setProperty('--buried-dx',-(Math.cos(a)*x-Math.sin(a)*y)+'px');el.style.setProperty('--buried-dy',-.62*(Math.sin(a)*x+Math.cos(a)*y)+'px');
    }
    seat();el._seatInPit=seat;

   }
   new MutationObserver(expose).observe(el,{attributes:true,attributeFilter:['class']});expose();
  }if(img.complete)thicken();else img.addEventListener('load',thicken,{once:true});
 });
 window.addEventListener('resize',()=>document.querySelectorAll('.find').forEach(el=>el._seatInPit?.()));
 const target=document.querySelector('.target');target.addEventListener('click',()=>{target.disabled=true;setTimeout(()=>target.disabled=false,620)});
 window.excavationArtRevision={version:'soil-depth-1',paperFont:'ReferenceKai',pitCount:document.querySelectorAll('.hollow canvas').length};
})();
