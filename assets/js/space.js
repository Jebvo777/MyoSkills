import {state,asset,$$, $} from './core.js?v=20261012-cockpit';
let shaderFiles;
const positions=[[.19,.75],[.51,.84],[.82,.68],[.74,.28],[.40,.17],[.15,.33]];
const rgb=hex=>{const v=parseInt(String(hex).replace('#',''),16);return [(v>>16&255)/255,(v>>8&255)/255,(v&255)/255];};
export function initSpace(){
 $$('.webgl-scene').forEach(canvas=>mount(canvas));
 initJaw();
}
async function mount(canvas){
 let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power',premultipliedAlpha:false});}catch{}
 if(!gl)return;
 let disposed=false,raf=0,program,buffer,ro,observer;const parent=canvas.parentElement;
 const clean=()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect();observer?.disconnect();window.removeEventListener('myo:planet',focus);document.removeEventListener('visibilitychange',visibility);parent.removeEventListener('pointermove',move);parent.removeEventListener('pointerleave',leave);canvas.removeEventListener('webglcontextlost',lost);if(program)gl.deleteProgram(program);if(buffer)gl.deleteBuffer(buffer);parent.classList.remove('space-ready');};
 state.cleanup.push(clean);
 let pointer=[0,0],selected=Number(canvas.dataset.planetIndex??1),current=[...positions[1]],start=[...current],target=[...current],started=0,last=0,visible=true;
 const focus=e=>{selected=Math.max(0,Math.min(5,Number(e.detail.id)-1));start=[...current];target=[...positions[selected]];started=performance.now();draw(performance.now(),true);};
 const move=e=>{const r=canvas.getBoundingClientRect();pointer=[(e.clientX-r.left)/Math.max(1,r.width)*2-1,(e.clientY-r.top)/Math.max(1,r.height)*2-1];if(document.documentElement.dataset.motion==='off')draw(performance.now(),true);};
 const leave=()=>{pointer=[0,0];};
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();};
 const lost=e=>{e.preventDefault();clean();};
 const schedule=()=>{if(!disposed&&visible&&!document.hidden&&!raf&&document.documentElement.dataset.motion!=='off')raf=requestAnimationFrame(draw);};
 function draw(time,force=false){
  if(disposed||!program)return;if(force&&raf)cancelAnimationFrame(raf);raf=0;
  if(!force&&time-last<32){schedule();return;}last=time;
  const motion=document.documentElement.dataset.motion!=='off',progress=motion?Math.min(1,(time-started)/1050):1,ease=progress*progress*(3-2*progress);
  current=start.map((v,i)=>v+(target[i]-v)*ease);
  gl.useProgram(program);gl.viewport(0,0,canvas.width,canvas.height);
  gl.uniform2f(gl.getUniformLocation(program,'uViewport'),canvas.width,canvas.height);
  gl.uniform2f(gl.getUniformLocation(program,'uPointer'),pointer[0],pointer[1]);gl.uniform1f(gl.getUniformLocation(program,'uTime'),motion?time/1000:0);
  gl.uniform1f(gl.getUniformLocation(program,'uHero'),canvas.dataset.scene==='hero'?1:0);gl.uniform1f(gl.getUniformLocation(program,'uSelected'),selected);
  const angle=Math.atan2(target[0]-start[0],target[1]-start[1]);gl.uniform4f(gl.getUniformLocation(program,'uRocket'),current[0],current[1],angle,1);
  gl.drawArrays(gl.TRIANGLES,0,3);schedule();
 }
 try{
  shaderFiles??=Promise.all(['orbit.vert','orbit.frag'].map(async name=>{const r=await fetch(asset('assets/shaders/'+name));if(!r.ok)throw Error('shader');return r.text();}));
  const [vert,frag]=await shaderFiles;if(disposed||!canvas.isConnected)return;
  const compile=(type,source)=>{const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('shader');}return shader;};
  const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT)?.precision;
  const shaders=[compile(gl.VERTEX_SHADER,vert),compile(gl.FRAGMENT_SHADER,precision?frag:frag.replace('precision highp float','precision mediump float'))];
  program=gl.createProgram();shaders.forEach(s=>gl.attachShader(program,s));gl.linkProgram(program);shaders.forEach(s=>gl.deleteShader(s));if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('program');
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  gl.useProgram(program);const colors=(state.public?.planets||[]).slice(0,6).map(p=>rgb(p.color));while(colors.length<6)colors.push(rgb('#61e1ca'));gl.uniform3fv(gl.getUniformLocation(program,'uColors[0]'),new Float32Array(colors.flat()));
  const resize=()=>{if(disposed)return;const r=canvas.getBoundingClientRect();const ratio=Math.min(window.devicePixelRatio||1,1.25,1100/Math.max(1,r.width));canvas.width=Math.max(1,Math.round(r.width*ratio));canvas.height=Math.max(1,Math.round(r.height*ratio));draw(performance.now(),true);};
  ro=new ResizeObserver(resize);ro.observe(canvas);resize();parent.classList.add('space-ready');
  observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting!==false;if(visible)schedule();else{cancelAnimationFrame(raf);raf=0;}},{threshold:0});observer.observe(canvas);
  parent.addEventListener('pointermove',move);parent.addEventListener('pointerleave',leave);window.addEventListener('myo:planet',focus);document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',lost);schedule();
 }catch{clean();}
}
export function focusPlanet(id){window.dispatchEvent(new window.CustomEvent('myo:planet',{detail:{id}}));}
export function initJaw(){
 const model=$('#jaw-model'),slider=$('#jaw-slider');if(!model||!slider)return;
 const set=()=>{const value=Number(slider.value)/100;$('#jaw-percentage').textContent=Math.round(value*100)+'%';$$('.model-tooth').forEach(el=>{const i=Number(el.dataset.tooth),n=i-5.5,a=Math.abs(n),jitter=Math.sin(i*2.7),x=n*29+(1-value)*jitter*7,y=a*a*1.2+(1-value)*Math.cos(i*1.8)*10,z=-a*a*1.5,angle=(1-value)*jitter*18;el.style.transform=`translate3d(${x}px,${y}px,${z}px) rotateY(${n*3}deg) rotateZ(${angle}deg)`;});};
 slider.addEventListener('input',set);set();
 let phase=0,raf=0;const animate=()=>{if(document.documentElement.dataset.motion==='off'||!model.isConnected)return;phase+=.008;model.style.setProperty('--jaw-sway',Math.sin(phase)*4+'deg');raf=requestAnimationFrame(animate);};animate();state.cleanup.push(()=>cancelAnimationFrame(raf));
}
