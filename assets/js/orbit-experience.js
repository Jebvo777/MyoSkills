import {state,$$,asset} from './core.js?v=20261022-final';
import {createStarChild} from './star-child.js?v=20261022-final';

let vendorPromise;
const templates=new Map();
const kinds=['posture','breathing','tongue','swallowing','chewing','lips'];
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
const reduced=()=>document.documentElement.dataset.motion==='off'||motionQuery.matches;

function engine(){
 if(window.MYO_ORBIT_VENDOR)return Promise.resolve(window.MYO_ORBIT_VENDOR);
 return vendorPromise??=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=asset('assets/vendor/orbit-engine.js');script.async=true;
  script.onload=()=>window.MYO_ORBIT_VENDOR?resolve(window.MYO_ORBIT_VENDOR):reject(Error('orbit'));
  script.onerror=()=>{vendorPromise=null;script.remove();reject(Error('orbit'));};document.head.append(script);
 });
}
function model(V,name){
 if(!templates.has(name))templates.set(name,new V.GLTFLoader().setMeshoptDecoder(V.MeshoptDecoder).loadAsync(asset('assets/models/'+name+'.glb')).catch(error=>{templates.delete(name);throw error;}));
 return templates.get(name).then(g=>{const root=g.scene.clone(true);root.userData.cachedGLTF=true;return root;});
}

export function initOrbitalExperiences(){
 $$('canvas[data-orbit-scene]').forEach(canvas=>{
  if(canvas.dataset.mounted)return;canvas.dataset.mounted='1';
  let dead=false,stop=()=>{},started=false;
  const observer=new IntersectionObserver(entries=>{if(entries[0]?.isIntersecting&&!started){started=true;observer.disconnect();mount(canvas,()=>dead).then(fn=>{if(dead)fn();else stop=fn;}).catch(()=>{});}},{rootMargin:'180px'});
  observer.observe(canvas);
  state.cleanup.push(()=>{dead=true;observer.disconnect();stop();});
 });
}

async function mount(canvas,isDead){
 const V=await engine();if(isDead()||!canvas.isConnected)return()=>{};
 const T=V.T,mode=canvas.dataset.orbitScene,host=canvas.parentElement;
 const fallbacks=[...host.children].filter(el=>el.matches('.orbital-fallback,.cockpit-fallback'));
 const setReady=ready=>{host.classList.toggle('is-3d-ready',ready);fallbacks.forEach(el=>{el.hidden=ready;});};
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',stencil:false});}catch{return()=>{};}
 renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(42,1,.1,400);
 let environment=null;try{if(mode!=='guide')environment=V.makeEnvironment(renderer);}catch{}
 if(environment){scene.environment=environment.texture;scene.environmentIntensity=.4;}
 scene.add(new T.HemisphereLight('#DDE3F2','#171B35',.7));
 [[-8,10,12,'#F7F8FF',2.3],[9,1,-8,'#BCA8FF',1.2],[-9,-4,5,'#61E0CA',1.1]].forEach(([x,y,z,color,power])=>{const light=new T.DirectionalLight(color,power);light.position.set(x,y,z);scene.add(light);});
 let drawScene=()=>{},select=()=>{},raf=0,last=0,time=0,visible=true,lost=false,disposed=false,first=true,guide=null,greetingTimer=0,lastHello=-100;
 let pointer=new T.Vector2(),targetPointer=new T.Vector2();
 const cleanup=()=>{
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);resize.disconnect();intersection.disconnect();
  host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('pointerenter',greet);host.removeEventListener('focusin',greet);host.removeEventListener('myo:guide-greet',greet);clearTimeout(greetingTimer);guide?.dispose();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('myo:planet',select);window.removeEventListener('myo:motion',motion);canvas.removeEventListener('webglcontextlost',contextLost);
  const done=new Set();scene.traverse(n=>{for(let p=n;p;p=p.parent)if(p.userData.cachedGLTF)return;for(const value of [n.geometry,...(Array.isArray(n.material)?n.material:[n.material])])if(value&&!done.has(value)){done.add(value);value.dispose?.();}});
  environment?.dispose();renderer.dispose();setReady(false);
 };
 function schedule(){if(!raf&&!disposed&&!isDead()&&visible&&!lost&&!document.hidden){last=performance.now();raf=requestAnimationFrame(frame);}}
 function frame(now){
  raf=0;if(disposed||isDead()||!canvas.isConnected){cleanup();return;}if(!visible||document.hidden||lost)return;
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;const moving=!reduced();if(moving)time+=dt;
  pointer.lerp(targetPointer,1-Math.exp(-dt*3));drawScene(time,moving?dt:0,pointer,first);renderer.render(scene,camera);
  if(first){first=false;setReady(true);}
  if(moving)raf=requestAnimationFrame(frame);
 }
 function resizeScene(){
  if(disposed)return;const rect=host.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height),aspect=w/h;
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.setSize(w,h,false);camera.aspect=aspect;
  camera.fov=mode==='flight'&&aspect>2?2*Math.atan(Math.tan(25*Math.PI/180)*2/aspect)*180/Math.PI:mode==='flight'?50:42;
  if(mode==='guide')camera.position.set(0,.27,5.9);
  else if(mode!=='flight')camera.position.set(0,.2,mode==='cockpit'?10:12*Math.max(1,1.05/aspect));
  camera.updateProjectionMatrix();schedule();
 }
 const resize=new ResizeObserver(resizeScene),intersection=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting!==false;if(visible)schedule();else{cancelAnimationFrame(raf);raf=0;}},{threshold:0});
 const move=e=>{if(e.pointerType==='touch'||reduced())return;const r=host.getBoundingClientRect();targetPointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);};
 const leave=()=>targetPointer.set(0,0);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();};
 const motion=()=>schedule();
 const greet=()=>{if(!guide||disposed)return;if(time-lastHello>.55){guide.greet(time);lastHello=time;}host.classList.add('is-greeting');clearTimeout(greetingTimer);greetingTimer=setTimeout(()=>host.classList.remove('is-greeting'),4200);schedule();};
 const contextLost=e=>{e.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;setReady(false);};
 try{
  if(mode==='guide'){guide=createStarChild(T,scene,camera,{reduced});drawScene=guide.update;}
  else{
   const names=mode==='flight'?kinds:mode==='cockpit'?[kinds[Number(canvas.dataset.planetIndex)||0]]:['posture','breathing','tongue'];
   const [worlds,rocketModel]=await Promise.all([Promise.all(names.map(name=>model(V,'planet-'+name))),model(V,'rocket')]);
   if(isDead()||!canvas.isConnected){cleanup();return()=>{};}
   const rocket=new T.Group();rocket.add(rocketModel);scene.add(rocket);
   const roots=worlds.map(world=>{const root=new T.Group();root.add(world);scene.add(root);return root;});
   const engineFX=new V.EngineFX(scene,rocket,innerWidth<760),meteors=new V.Meteors(scene,innerWidth<760);
   if(mode==='flight'){
    const stars=V.makeStars(scene,innerWidth<760),plan=V.createFlybyPlan(Math.min(2,Math.max(.65,host.clientWidth/Math.max(1,host.clientHeight)))),flight=V.createFlybyState(),shadow=V.makeLandingShadow(scene);
    const bodies=Array.from({length:2},()=>({centre:new T.Vector3(),dock:new T.Vector3(),normal:new T.Vector3(),radius:1,rocketScale:1}));
    rocket.scale.setScalar(plan.rocketScale);const legs=[];rocketModel.traverse(n=>{if(n.name.startsWith('LandingLeg_')){n.userData.baseY=n.position.y;legs.push(n);}});
    drawScene=(t,dt,p)=>{
     const clock=t+6;V.sampleFlyby(clock,plan,flight);roots.forEach((root,i)=>root.visible=i===flight.source||i===flight.target);
     for(let j=0;j<2;j++){
      const index=j===0?flight.source:flight.target,entry=plan.entries[index],centre=j===0?flight.sourceCentre:flight.targetCentre,root=roots[index],body=bodies[j];
      root.position.copy(centre);root.quaternion.copy(entry.orientation);root.scale.setScalar(entry.radius);root.children[0].quaternion.setFromAxisAngle(V.DOCK_NORMAL,clock*.035);
      body.centre.copy(centre);body.normal.copy(entry.normal);body.radius=entry.radius;body.rocketScale=entry.rocketScale;body.dock.copy(entry.dock).sub(entry.centre).add(centre);
     }
     rocket.position.copy(flight.position);rocket.quaternion.copy(flight.quaternion);legs.forEach(n=>{n.scale.setScalar(.18+.82*flight.legs);n.position.y=n.userData.baseY+.11*(1-flight.legs);});rocket.updateMatrixWorld(true);
     engineFX.update(dt,clock,flight,bodies);shadow.update(flight,bodies[flight.planet===flight.source?0:1]);V.cameraFollow(flight,plan,camera.position);camera.position.x+=p.x*.22;camera.lookAt(camera.position.x, camera.position.y,-80);
     stars.update(clock,renderer.getPixelRatio());meteors.update(clock);
    };
   }else{
    const cockpit=mode==='cockpit';
    roots.forEach((root,i)=>{root.position.set(cockpit?0:i===0?-3.35:i===1?3.35:.1,cockpit?.6:i===0?1.15:i===1?-.7:2.9,cockpit?-1.3:i===2?-6:-1.8);root.scale.setScalar(cockpit?1.5:i===2?.65:1.25);});
    rocket.scale.setScalar(cockpit?.45:.85);
    const velocity=new T.Vector3(),previous=new T.Vector3(),tangent=new T.Vector3(),q=new T.Quaternion(),Y=new T.Vector3(0,1,0);
    const flight={throttle:.65,worldVelocity:velocity};
    drawScene=(t,dt,p,initial)=>{
     const a=t*.24+.7,r=cockpit?2.65:3.65;rocket.position.set(Math.sin(a)*r,Math.sin(2*a)*(cockpit?.9:1.45)+(cockpit?.8:0),Math.cos(a)*(cockpit?1.2:1.65)+1.3);
     tangent.set(Math.cos(a)*r,2*Math.cos(2*a)*(cockpit?.9:1.45),-Math.sin(a)*(cockpit?1.2:1.65)).normalize();q.setFromUnitVectors(Y,tangent);
     if(initial)rocket.quaternion.copy(q);else rocket.quaternion.slerp(q,1-Math.exp(-dt*7));
     velocity.copy(rocket.position).sub(previous).divideScalar(Math.max(dt,.016));previous.copy(rocket.position);if(initial)velocity.set(0,0,0);
     roots.forEach((root,i)=>{root.rotation.y=t*.055+i*.4;root.rotation.z=Math.sin(t*.12+i)*.045;});
     rocket.updateMatrixWorld(true);engineFX.update(dt,t,flight,[]);meteors.spread=.22;meteors.update(t);camera.position.x=p.x*.18;camera.lookAt(0,cockpit?.35:0,0);
    };
    if(cockpit)select=async e=>{const index=Math.max(0,Math.min(5,Number(e.detail.id)-1));try{const next=await model(V,'planet-'+kinds[index]);if(disposed||isDead())return;roots[0].clear();roots[0].add(next);}catch{}};
   }
  }
  host.addEventListener('pointermove',move,{passive:true});host.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',visibility);window.addEventListener('myo:planet',select);window.addEventListener('myo:motion',motion);canvas.addEventListener('webglcontextlost',contextLost);
  if(guide){host.addEventListener('pointerenter',greet,{passive:true});host.addEventListener('focusin',greet);host.addEventListener('myo:guide-greet',greet);greet();}
  resize.observe(host);intersection.observe(host);resizeScene();schedule();return cleanup;
 }catch{cleanup();return()=>{};}
}

