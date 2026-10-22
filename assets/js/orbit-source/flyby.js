import * as T from 'three';
import {DOCK_NORMAL,DOCK_RADIUS,FOOT_Y} from './model-factory.js';

export const SPACE_SPEED=3.2;
export const FLYBY_SECONDS=32;
export const PLANET_KINDS=['posture','breathing','tongue','swallowing','chewing','lips'];
export const PHASES={takeoff:.55,transfer:4.65,landing:24.6,touch:31.45,end:32};
const Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1);
const B5=[1,5,10,10,5,1],B4=[1,4,6,4,1];
const forward=new T.Vector3(),tangent=new T.Vector3(),correction=new T.Quaternion();
export const smooth=x=>{x=T.MathUtils.clamp(x,0,1);return x*x*x*(x*(x*6-15)+10);};
export const FORWARD_Q=new T.Quaternion().setFromUnitVectors(Y,new T.Vector3(0,0,-1));

// World-space C2 Hermite motion. The camera travels along -Z at SPACE_SPEED.
// A floating origin keeps coordinates bounded throughout the infinite flight.
class FlightCurve extends T.Curve {
  constructor(p0,p1,v0,v1,duration) {
    super();this.duration=duration;this.bulge=new T.Vector3();
    this.points=[p0.clone(),p0.clone().addScaledVector(v0,duration/5),p0.clone().addScaledVector(v0,duration*2/5),p1.clone().addScaledVector(v1,-duration*2/5),p1.clone().addScaledVector(v1,-duration/5),p1.clone()];
  }
  getPoint(u,out=new T.Vector3()) {
    out.set(0,0,0);for(let i=0;i<6;i++)out.addScaledVector(this.points[i],B5[i]*Math.pow(1-u,5-i)*Math.pow(u,i));return out.addScaledVector(this.bulge,64*Math.pow(u*(1-u),3));
  }
  getVelocity(u,out=new T.Vector3()) {
    out.set(0,0,0);
    for(let i=0;i<5;i++){const a=this.points[i],b=this.points[i+1],s=5*B4[i]*Math.pow(1-u,4-i)*Math.pow(u,i)/this.duration;out.x+=(b.x-a.x)*s;out.y+=(b.y-a.y)*s;out.z+=(b.z-a.z)*s;}
    return out.addScaledVector(this.bulge,192*u*u*(1-u)*(1-u)*(1-2*u)/this.duration);
  }
  getTangent(u,out=new T.Vector3()){return this.getVelocity(u,out).normalize();}
}

function framesFor(curve,start,end) {
  const frames=[start.clone()],prev=curve.getTangent(0),next=new T.Vector3(),delta=new T.Quaternion();
  for(let i=1;i<=320;i++){curve.getTangent(i/320,next);delta.setFromUnitVectors(prev,next);frames.push(delta.clone().multiply(frames[i-1]).normalize());prev.copy(next);}
  const relative=frames[320].clone().invert().multiply(end);
  if(relative.w<0)relative.set(-relative.x,-relative.y,-relative.z,-relative.w);
  const roll=2*Math.atan2(relative.y,relative.w);
  for(let i=1;i<=320;i++)frames[i].multiply(new T.Quaternion().setFromAxisAngle(Y,roll*smooth(i/320)));
  frames[320].copy(end);return frames;
}

export function createFlybyPlan(aspect) {
  const portrait=aspect<.95,rocketScale=portrait?1.12:1.3;
  const x=portrait?Math.max(4.4,aspect*15):Math.min(30,aspect*15);
  const radius=(portrait?2.8:5)*Math.min(1,aspect/.40);
  const spacing=SPACE_SPEED*FLYBY_SECONDS;
  const entries=PLANET_KINDS.map((kind,i)=>{
    const side=i%2===0?-1:1;
    const centre=new T.Vector3(side*x,[12,-12,13,-13,11,-12][i]*(portrait?.75:1),-72);
    const normal=new T.Vector3(-side*.38,.32,.865).normalize();
    const orientation=new T.Quaternion().setFromUnitVectors(DOCK_NORMAL,normal).multiply(new T.Quaternion().setFromAxisAngle(DOCK_NORMAL,(i-2)*.13));
    const r=radius*[1,.98,1.02,1.02,.98,1][i];
    const dock=centre.clone().addScaledVector(normal,r*DOCK_RADIUS-FOOT_Y*rocketScale);
    const outer=centre.clone().addScaledVector(normal,r*2.3+2.8);
    const dockQ=new T.Quaternion().setFromUnitVectors(Y,normal);
    const incomingQ=dockQ.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI));
    return {kind,side,centre,radius:r,normal,orientation,dock,outer,dockQ,incomingQ,rocketScale};
  });
  const legs=entries.map((source,i)=>{
    const target=entries[(i+1)%entries.length],offset=new T.Vector3(0,0,-spacing);
    const targetCentre=target.centre.clone().add(offset),targetDock=target.dock.clone().add(offset),targetOuter=target.outer.clone().add(offset);
    const launchV=source.normal.clone().multiplyScalar(1.6),arriveV=target.normal.clone().multiplyScalar(-1);
    const takeoff=new FlightCurve(source.dock,source.outer,new T.Vector3(),launchV,PHASES.transfer-PHASES.takeoff);
    const transfer=new FlightCurve(source.outer,targetOuter,launchV,arriveV,PHASES.landing-PHASES.transfer);
    const landing=new FlightCurve(targetOuter,targetDock,arriveV,new T.Vector3(),PHASES.touch-PHASES.landing);
    return {source,target,targetCentre,targetDock,targetOuter,takeoff,transfer,landing,frames:framesFor(transfer,source.dockQ,target.incomingQ)};
  });
  return {aspect,portrait,rocketScale,entries,legs,spacing,cruise:new T.Vector3(0,portrait?-5:-5.2,-24)};
}

export function createFlybyState(){return {position:new T.Vector3(),worldPosition:new T.Vector3(),worldVelocity:new T.Vector3(),quaternion:new T.Quaternion(),planetCentre:new T.Vector3(),sourceCentre:new T.Vector3(),targetCentre:new T.Vector3(),planet:0,source:0,target:1,encounter:0,phase:0,stage:'touch',progress:0,throttle:0,legs:1,contact:0,opacity:1};}

export function cameraFollow(state,plan,out=new T.Vector3()){
  return out.set(0,(state.position.y-plan.cruise.y)*.30,0);
}

function onCurve(curve,frames,u,out) {
  curve.getPoint(u,out.worldPosition);curve.getVelocity(u,out.worldVelocity);
  const f=T.MathUtils.clamp(u,0,1)*320,i=Math.min(319,Math.floor(f));
  out.quaternion.copy(frames[i]).slerp(frames[i+1],f-i);
  forward.copy(Y).applyQuaternion(out.quaternion);curve.getTangent(u,tangent);correction.setFromUnitVectors(forward,tangent);out.quaternion.premultiply(correction).normalize();
}

export function sampleFlyby(time,plan,out=createFlybyState()) {
  const encounter=Math.floor(Math.max(0,time)/FLYBY_SECONDS),phase=Math.max(0,time)-encounter*FLYBY_SECONDS;
  const index=encounter%PLANET_KINDS.length,leg=plan.legs[index],source=leg.source,target=leg.target;
  out.encounter=encounter;out.source=index;out.target=(index+1)%PLANET_KINDS.length;out.phase=phase;
  out.contact=0;out.legs=0;out.throttle=0;out.opacity=1;out.planet=phase<PHASES.landing?out.source:out.target;
  out.sourceCentre.copy(source.centre);out.sourceCentre.z+=phase*SPACE_SPEED;
  out.targetCentre.copy(leg.targetCentre);out.targetCentre.z+=phase*SPACE_SPEED;
  out.planetCentre.copy(out.planet===out.source?out.sourceCentre:out.targetCentre);
  if(phase<PHASES.takeoff){
    out.stage='touch';out.progress=phase/PHASES.takeoff;
    out.worldPosition.copy(source.dock);out.worldVelocity.set(0,0,0);out.quaternion.copy(source.dockQ);out.legs=1;
  }else if(phase<PHASES.transfer){
    const u=(phase-PHASES.takeoff)/(PHASES.transfer-PHASES.takeoff);out.stage='takeoff';out.progress=u;
    leg.takeoff.getPoint(u,out.worldPosition);leg.takeoff.getVelocity(u,out.worldVelocity);out.quaternion.copy(source.dockQ);
    out.throttle=.88*smooth(u/.12);out.legs=1-smooth((u-.2)/.5);out.contact=(1-smooth(u/.5))*out.throttle;
  }else if(phase<PHASES.landing){
    const u=(phase-PHASES.transfer)/(PHASES.landing-PHASES.transfer);out.stage='transfer';out.progress=u;
    onCurve(leg.transfer,leg.frames,u,out);out.throttle=.50+.30*Math.sin(Math.PI*u);
  }else if(phase<PHASES.touch){
    const u=(phase-PHASES.landing)/(PHASES.touch-PHASES.landing);out.stage='landing';out.progress=u;
    leg.landing.getPoint(u,out.worldPosition);leg.landing.getVelocity(u,out.worldVelocity);
    // Turn while descending, then brake tail-first; there is no alignment stop.
    out.quaternion.copy(target.incomingQ).slerp(target.dockQ,smooth(u/.74));
    out.legs=smooth((u-.20)/.55);
    out.throttle=.65*smooth((u-.4)/.28)*(1-smooth((u-.88)/.12));out.contact=smooth((u-.65)/.25)*out.throttle;
  }else{
    out.stage='touch';out.progress=(phase-PHASES.touch)/(FLYBY_SECONDS-PHASES.touch);
    out.worldPosition.copy(leg.targetDock);out.worldVelocity.set(0,0,0);out.quaternion.copy(target.dockQ);out.legs=1;
  }
  out.position.copy(out.worldPosition);out.position.z+=phase*SPACE_SPEED;
  return out;
}
