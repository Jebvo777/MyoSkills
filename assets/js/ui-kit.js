import {state,$,$$} from './core.js?v=20261022-final';

export function initUIKit(){
 $$('input[type=range]:not(#compare-slider)').forEach(setRange);
 const input=e=>{if(e.target.matches('input[type=range]'))setRange(e.target);};
 document.addEventListener('input',input);state.cleanup.push(()=>document.removeEventListener('input',input));
 initReviews();initRoute();
}

function initRoute(){
 const timeline=$('.ms-route-timeline');if(!timeline)return;
 const rail=$('.ms-route-rail',timeline),steps=$$('.ms-route-step',timeline),label=$('#route-stage-label');let raf=0,dead=false,lastY=window.scrollY;
 const update=()=>{
  raf=0;if(dead||!timeline.isConnected)return;
  const centres=steps.map(step=>step.offsetTop+step.offsetHeight/2),start=centres[0],distance=Math.max(1,centres.at(-1)-start),top=timeline.getBoundingClientRect().top,anchor=innerHeight*.59;
  const progress=Math.max(0,Math.min(1,(anchor-top-start)/distance));let current=0;centres.forEach((centre,i)=>{if(top+centre<=anchor)current=i;});
  timeline.style.setProperty('--route-progress',progress.toFixed(5));timeline.style.setProperty('--route-dash',`${(-progress*130).toFixed(2)}px`);rail.style.top=`${start}px`;rail.style.height=`${distance}px`;rail.style.bottom='auto';
  if(window.scrollY!==lastY)timeline.dataset.direction=window.scrollY<lastY?'up':'down';lastY=window.scrollY;
  steps.forEach((step,i)=>{step.classList.toggle('is-reached',i<=current);step.classList.toggle('is-current',i===current);if(i===current)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');});
  if(label)label.textContent=`${String(current+1).padStart(2,'0')} / 05`;
 };
 const schedule=()=>{if(!dead&&!raf)raf=requestAnimationFrame(update);};
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
 const resize=new ResizeObserver(schedule);resize.observe(timeline);document.fonts?.ready.then(schedule);update();
 state.cleanup.push(()=>{dead=true;cancelAnimationFrame(raf);resize.disconnect();window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);});
}

function initReviews(){
 const track=$('#review-track');if(!track)return;
 const prev=$('[data-action=reviews-prev]'),next=$('[data-action=reviews-next]');let dragging=false,startX=0,startScroll=0,moved=false;
 const update=()=>{if(prev)prev.disabled=track.scrollLeft<=2;if(next)next.disabled=track.scrollLeft>=track.scrollWidth-track.clientWidth-2;};
 const down=e=>{if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button,a'))return;dragging=true;startX=e.clientX;startScroll=track.scrollLeft;moved=false;};
 const move=e=>{if(!dragging)return;const dx=e.clientX-startX;if(Math.abs(dx)>6){moved=true;track.classList.add('dragging');track.setPointerCapture(e.pointerId);}if(moved){e.preventDefault();track.scrollLeft=startScroll-dx;}};
 const up=()=>{dragging=false;track.classList.remove('dragging');update();};
 const key=e=>{if(e.target!==track||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();if(e.key==='Home'||e.key==='End')track.scrollTo({left:e.key==='Home'?0:track.scrollWidth,behavior:motionBehavior()});else scrollReviews(e.key==='ArrowLeft'?-1:1);};
 const leave=()=>{if(!moved)up();};
 track.addEventListener('scroll',update,{passive:true});track.addEventListener('pointerdown',down);track.addEventListener('pointermove',move);track.addEventListener('pointerup',up);track.addEventListener('pointercancel',up);track.addEventListener('pointerleave',leave);track.addEventListener('keydown',key);
 const resize=new ResizeObserver(update);resize.observe(track);update();state.cleanup.push(()=>resize.disconnect());
}
const motionBehavior=()=>document.documentElement.dataset.motion==='off'?'instant':'smooth';
export function scrollReviews(direction){const track=$('#review-track'),card=$('.ms-review-card',track||document);if(!track||!card)return;track.scrollBy({left:direction*(card.getBoundingClientRect().width+parseFloat(getComputedStyle(track).gap||24)),behavior:motionBehavior()});}
function setRange(el){const min=Number(el.min||0),max=Number(el.max||100),value=Number(el.value);el.style.setProperty('--range-progress',`${Math.max(0,Math.min(100,(value-min)/Math.max(1,max-min)*100))}%`);}
