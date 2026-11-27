const eras=[["元代泰定四年 · 觉林院佛前供养", "一器初成，一念长存。", "泰定四年，信士张进成定制这一对凤尾尊，施舍给觉林院佛前供养。岁月流转，觉林院早已湮没在群山之中，唯有青瓷与铭文，留存下这段记载。\n\n铭文原文「栝倉劍川流山萬安社居奉三寶弟子張進成燒造大花瓶壹雙 捨入覺林院大法堂佛前 永充供養祈福保安家門吉慶者 泰定四年丁卯歲仲秋吉日謹題」。"], ["元代末年 · 官邸书斋", "案上有青，纸间有岁月。", "从佛前到书斋，一器青瓷，静听笔墨与风声。"], ["民国 · 深宅珍藏", "人间几度，青色如初。", "「旧时王谢堂前燕，飞入寻常百姓家。」\n\n窗外光阴流转，旧宅里的一抹青，仍被珍重。"], ["现在 · 博物馆", "走过岁月，与你相逢。", "曾经的日常，成为今日的珍藏。故事仍在继续。"]];

const scenery=document.querySelector('#scenery'),artifact=document.querySelector('#artifact'),buttons=[...document.querySelectorAll('[data-era]')],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const contents=document.querySelector('#contents'),contentImage=contents.querySelector('img'),glass=document.querySelector('#glass');
const initialEra=Math.max(0,Math.min(3,Number(new URLSearchParams(location.search).get("scene"))||0));
let position=initialEra,target=initialEra,active=-1,drag=null,lastWheel=-1000,lastChange=performance.now(),contentEra=-1,contentReady=false;
const contentFiles=['lotus','scrolls','pink-flowers',null],contentClasses=['lotus','scrolls','pink',''];
const sceneSizes=[[1673,940],[1675,939],[1673,940],[1668,943]];
// x/y/height are measured in fractions of each scene, so the base stays on its surface.
const placements=[[.499,.895,.196],[.584,.837,.280],[.386,.773,.329],[.356,.754,.605]];
const layers=eras.map((e,i)=>{const el=document.createElement('div');el.className='scene';const img=new Image();img.src='../assets/scene-'+(i+1)+'.png?v=museum-green-3';img.alt='';img.draggable=false;el.append(img);scenery.append(el);return el});
const preloads=contentFiles.filter(Boolean).map(file=>{const img=new Image();img.src='assets/'+file+'.png?v=museum-green-3';return img.decode().catch(()=>{})});
// Retain existing scene-change hooks for the first two scene soundtracks.
function syncTempleChant(){window.gallerySceneAudio.sync({position,target,dragging:!!drag})}

function select(n){const next=Math.max(0,Math.min(3,n));if(next!==target){target=next;lastChange=performance.now();syncTempleChant()}}
function placement(i){const [sw,sh]=sceneSizes[i],s=Math.max(innerWidth/sw,innerHeight/sh),[cx,base,h]=placements[i];return {x:(innerWidth-sw*s)/2+cx*sw*s,y:(innerHeight-sh*s)/2+base*sh*s,h:h*sh*s}}
function paint(){
 syncTempleChant();
 position+=(target-position)*(reduced?1:.085);if(Math.abs(position-target)<.0005)position=target;
 const low=Math.floor(position),high=Math.min(3,low+1),f=position-low;
 layers.forEach((el,i)=>{const delta=i-position;el.style.zIndex=i===low+1?'2':'1';el.style.opacity=i===low||i===low+1?'1':'0';el.style.clipPath=i===low+1?'circle('+(f*155)+'% at 72% 56%)':'none';el.style.transform=reduced||!(f>.0001)?'none':'translateX('+(delta*3)+'vw) scale('+(1+Math.sin(f*Math.PI)*.09)+') rotate('+(delta*Math.sin(f*Math.PI)*1.5)+'deg)'});
 const a=placement(low),b=placement(high),x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,h=a.h+(b.h-a.h)*f,w=h*695/1366;
 Object.assign(artifact.style,{left:(x-w/2)+'px',top:(y-h)+'px',width:w+'px',height:h+'px'});
 const minorDimming=Math.max(0,1-Math.abs(position-2)),museumLight=Math.max(0,Math.min(1,position-2)),filter='saturate('+(1-minorDimming*.035+museumLight*1.15)+') brightness('+(1-minorDimming*.035+museumLight*.08)+') contrast('+(1+museumLight*.10)+')';artifact.querySelector('.body').style.filter=filter;artifact.querySelector('.lip').style.filter=filter;artifact.querySelector('.museum-light').style.opacity=museumLight*.48;
 glass.style.opacity=Math.max(0,Math.min(1,(position-2.5)*2));
 const era=Math.round(position),settled=position===target&&Number.isInteger(target)&&!drag&&performance.now()-lastChange>450;
 if(settled&&era!==contentEra){contentEra=era;contentReady=false;if(contentFiles[era]){contents.className=contentClasses[era];contentImage.alt=['原图荷花','书斋卷轴','粉色牡丹',''][era];contentImage.src='assets/'+contentFiles[era]+'.png?v=museum-green-3';contentImage.decode().then(()=>{if(contentEra===era)contentReady=true}).catch(()=>{})}}
 if(!settled){contents.style.opacity=0;contentEra=-1;contentReady=false}else contents.style.opacity=contentFiles[era]&&contentReady?1:0;
 window.galleryPetals?.sync(settled&&era===2&&contentReady);
 window.galleryIncense?.sync(target===0&&position<.025&&!drag);
 document.querySelector('#progress').style.left=(position*25)+'%';
 if(active!==era){active=era;['period','title','description'].forEach((k,i)=>document.getElementById(k).textContent=eras[era][i]);buttons.forEach((button,i)=>button.setAttribute('aria-pressed',i===era));const s=document.querySelector('section');s.classList.remove('changing');void s.offsetWidth;s.classList.add('changing')}
 document.querySelector('section').classList.toggle('inscription-card',Math.round(position)===0);document.querySelector('section').dataset.era=era;requestAnimationFrame(paint);
}
for(let i=0;i<49;i++){const x=25+i*550/48,y=98-162*(x-25)/550*(1-(x-25)/550),l=document.createElementNS('http://www.w3.org/2000/svg','line');Object.entries({x1:x,y1:y+5,x2:x,y2:y+(i%4===0?13:9)}).forEach(([k,v])=>l.setAttribute(k,v));document.querySelector('#ticks').append(l)}
paint();
buttons.forEach((b,i)=>b.addEventListener('click',()=>select(i)));document.querySelector('#brand').addEventListener('click',e=>{e.preventDefault();select(0)});const main=document.querySelector('main');main.addEventListener('pointerdown',e=>{if(e.target.closest('button,a'))return;drag={x:e.clientX,start:target};lastChange=performance.now();main.setPointerCapture(e.pointerId)});main.addEventListener('pointermove',e=>{if(drag)select(drag.start-(e.clientX-drag.x)/(innerWidth*.32))});function release(){if(drag){select(Math.round(target));drag=null}}main.addEventListener('pointerup',release);main.addEventListener('pointercancel',release);main.addEventListener('wheel',e=>{e.preventDefault();let now=performance.now();if(now-lastWheel<650||Math.abs(e.deltaY)+Math.abs(e.deltaX)<8)return;lastWheel=now;select(Math.round(target)+Math.sign(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY))},{passive:false});document.addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();select(e.key==='Home'?0:e.key==='End'?3:Math.round(target)+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1))}});document.querySelector('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await main.requestFullscreen()}catch{document.querySelector('#fullscreen').textContent='请使用浏览器全屏'}});Promise.all([...document.images].filter(img=>img.getAttribute('src')).map(img=>img.decode())).then(()=>{let l=document.querySelector('#loading');l.style.opacity=0;setTimeout(()=>l.remove(),800)}).catch(()=>{document.querySelector('#loading').textContent='画卷加载失败，请刷新重试'});window.timeGallery={select,get state(){return{position,target,active}}};
