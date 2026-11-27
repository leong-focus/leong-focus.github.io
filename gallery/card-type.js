(()=>{
 const card=document.querySelector('section'),nodes=[card.querySelector('#period'),card.querySelector('h1'),card.querySelector('#description')];
 function scale(){card.classList.toggle('single-line-card',nodes[1].textContent==='案上有青，纸间有岁月。');for(const node of nodes)node.style.fontSize='';const bases=nodes.map(node=>parseFloat(getComputedStyle(node).fontSize));nodes.forEach((node,i)=>node.style.fontSize=(bases[i]*1.2)+'px');if(card.classList.contains('single-line-card')&&nodes[1].scrollWidth>nodes[1].clientWidth){const fit=nodes[1].clientWidth/nodes[1].scrollWidth;nodes.forEach((node,i)=>node.style.fontSize=(bases[i]*1.2*fit)+'px')}}
 let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scale()})}
 new MutationObserver(schedule).observe(card,{attributes:true,attributeFilter:['class']});window.addEventListener('resize',schedule);scale();
})();
