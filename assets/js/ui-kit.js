import {state,$,$$} from './core.js?v=20261022-uikit';

export function initUIKit(){
 const ranges=()=>$$('input[type=range]:not(#compare-slider)').forEach(setRange);
 const input=e=>{if(e.target.matches('input[type=range]'))setRange(e.target);};
 document.addEventListener('input',input);state.cleanup.push(()=>document.removeEventListener('input',input));ranges();
 const route=$('.hologram-route');if(!route)return;
 const path=$('.stellar-path',route),stages=$$('.stellar-stage',route);let raf=0,disposed=false;
 const update=()=>{
  raf=0;if(disposed||!route.isConnected)return;
  const box=route.getBoundingClientRect(),screen=window.innerHeight;
  const progress=Math.max(0,Math.min(1,(screen*.75-box.top)/Math.max(1,box.height-screen*.25)));
  path.style.setProperty('--route-progress',progress.toFixed(4));path.style.setProperty('--route-dash',(-progress*300).toFixed(2));
  stages.forEach((stage,i)=>stage.classList.toggle('is-reached',progress>=i/4));
 };
 const scroll=()=>{if(!raf)raf=requestAnimationFrame(update);};
 window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',scroll,{passive:true});
 const resize=new ResizeObserver(scroll);resize.observe(route);update();
 state.cleanup.push(()=>{disposed=true;cancelAnimationFrame(raf);resize.disconnect();window.removeEventListener('scroll',scroll);window.removeEventListener('resize',scroll);});
}

function setRange(el){const min=Number(el.min||0),max=Number(el.max||100),value=Number(el.value);el.style.setProperty('--range-progress',`${Math.max(0,Math.min(100,(value-min)/Math.max(1,max-min)*100))}%`);}
