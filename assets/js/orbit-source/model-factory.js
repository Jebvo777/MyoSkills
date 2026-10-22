import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// The +X component keeps the entire landing corridor away from the upright
// posture ring as well as the horizontal rings on the other five worlds.
export const DOCK_NORMAL = new T.Vector3(0.42, 0.50, 0.757363859).normalize();
export const DOCK_RADIUS = .995;
export const FOOT_Y = -0.91;
const Y = new T.Vector3(0, 1, 0), Z = new T.Vector3(0, 0, 1);
const TAU = Math.PI * 2;
const color = hex => new T.Color(hex);
function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const physical = (name, c, extra = {}) => {
  const m = new T.MeshPhysicalMaterial({
    color: c, roughness: 0.29, metalness: 0.14,
    clearcoat: 0.62, clearcoatRoughness: 0.18,
    iridescence: 0.24, iridescenceIOR: 1.32,
    iridescenceThicknessRange: [110, 340], ...extra
  });
  m.name = name;
  return m;
};

function palette() {
  return {
    body: physical('Sculpted pearl · vertex colour', '#ffffff', {vertexColors: true, roughness: 0.32}),
    pearl: physical('Ivory ceramic', '#e3e9f4'),
    lilac: physical('Lavender pearl', '#ab8ddd'),
    violet: physical('Violet satin resin', '#7950df', {metalness: 0.26, roughness: 0.21}),
    mint: physical('Mint opaline resin', '#38d2b8', {metalness: 0.23, roughness: 0.19}),
    ice: physical('Ice blue opal', '#66c9e2', {roughness: 0.2}),
    pink: physical('Blush ceramic', '#e590ba'),
    gold: physical('Champagne metal', '#d1a447', {metalness: 0.63, roughness: 0.26}),
    dark: physical('Navy glass', '#151d38', {metalness: 0.65, roughness: 0.16}),
    light: physical('Mint navigation light', '#b2fff1', {emissive: '#61e1ca', emissiveIntensity: 0.9, roughness: 0.2})
  };
}

class Parts {
  constructor() { this.groups = new Map(); }
  add(geometry, material, position = new T.Vector3(), quaternion = new T.Quaternion(), scale = new T.Vector3(1,1,1)) {
    const g = geometry.clone();
    g.applyMatrix4(new T.Matrix4().compose(position, quaternion, scale));
    for (const key of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(key)) g.deleteAttribute(key);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.color) {
      const c = new Float32Array(g.attributes.position.count * 3); c.fill(1);
      g.setAttribute('color', new T.BufferAttribute(c, 3));
    }
    if (!g.index) g.setIndex(Array.from({length: g.attributes.position.count}, (_,i) => i));
    if (!this.groups.has(material)) this.groups.set(material, []);
    this.groups.get(material).push(g);
    geometry.dispose();
  }
  finish(name) {
    const root = new T.Group(); root.name = name;
    for (const [mat, gs] of this.groups) {
      const geometry = mergeGeometries(gs, false);
      geometry.computeBoundingSphere();
      const mesh = new T.Mesh(geometry, mat); mesh.name = `${name} / ${mat.name}`;
      root.add(mesh); gs.forEach(g => g.dispose());
    }
    return root;
  }
}

function point(theta, phi, r = 1) {
  return new T.Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)).multiplyScalar(r);
}
function isDock(p, margin = 0.935) { return p.clone().normalize().dot(DOCK_NORMAL) > margin; }
function ball(parts, p, radius, mat, scale = [1,1,1], q = new T.Quaternion(), detail = 14) {
  parts.add(new T.SphereGeometry(radius, detail, Math.ceil(detail*.7)), mat, p, q, new T.Vector3(...scale));
}
function tube(parts, pts, radius, mat, segments = 120, radial = 7, closed = false) {
  const curve = new T.CatmullRomCurve3(pts, closed, 'centripetal');
  parts.add(new T.TubeGeometry(curve, segments, radius, radial, closed), mat);
}

function baseSphere(parts, mat, kind) {
  const g = new T.SphereGeometry(1, 96, 56);
  const a = g.attributes.position;
  const colors = new Float32Array(a.count*3);
  const tones = {
    posture: ['#d5cee8','#8965ba','#e5e4f0'],
    breathing: ['#82decb','#2d9e9d','#bdebdc'],
    tongue: ['#dfcae9','#a17ac9','#f1c9dd'],
    swallowing: ['#8dcfe7','#6d8ac8','#a4e7dc'],
    chewing: ['#d0cdda','#9289ad','#e0cca6'],
    lips: ['#edbad2','#b584ba','#f3d4df']
  }[kind].map(color);
  const p = new T.Vector3(), c = new T.Color();
  for (let i=0;i<a.count;i++) {
    p.fromBufferAttribute(a,i).normalize();
    const th = Math.acos(T.MathUtils.clamp(p.y,-1,1)), ph = Math.atan2(p.z,p.x);
    const wx=p.x+.32*Math.sin(p.y*3.2+p.z*1.4);
    const wy=p.y+.38*Math.sin(p.z*3.0+p.x*1.1);
    const wave = (wy*.82+wx*.52)*12 + 1.2*Math.sin(p.z*4+wx*1.8);
    const s = Math.sin(wave), t = T.MathUtils.smoothstep(s, -.45, .75);
    c.copy(tones[0]).lerp(tones[1], t*.67).lerp(tones[2], Math.pow(Math.max(0,Math.cos(wave*1.9)),14)*.52);
    const relief = .004 + .013*Math.pow(Math.max(0,s),10) + .003*Math.sin(ph*17+th*23);
    p.multiplyScalar(isDock(p,.935) ? 1 : 1+relief);
    // A subtle flattened ceramic patch supports all three feet. It is part of
    // the planet body itself, retaining its marbled vertex colours.
    const axial=p.dot(DOCK_NORMAL),lateral=Math.sqrt(Math.max(0,p.lengthSq()-axial*axial));
    if(axial>0&&lateral<.49){const blend=1-T.MathUtils.smoothstep(lateral,.36,.49);p.addScaledVector(DOCK_NORMAL,(.990-axial)*blend);}
    a.setXYZ(i,p.x,p.y,p.z); c.toArray(colors,i*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));
  g.computeVertexNormals(); parts.add(g,mat);
}

function ribbon(parts, level, amp, phase, width, mat, frequency = 2, radius = 1.016) {
  const pos=[], idx=[]; const N=96, W=4;
  const sample=(u,v)=>{
    const phi=u*TAU;
    const th=level + amp*Math.sin(phi*frequency+phase) + .065*Math.sin(phi*3-phase) + v*width;
    const p=point(T.MathUtils.clamp(th,.035,Math.PI-.035),phi);
    p.applyAxisAngle(Y,1.4*Math.sin(p.y*2.2)+.55*Math.sin(p.x*2.5));
    p.applyAxisAngle(Z,.58*Math.sin(p.z*2.5));
    p.applyEuler(new T.Euler(.24,0,.48));
    return p.multiplyScalar(radius+.025*Math.cos(v*Math.PI));
  };
  for (let i=0;i<=N;i++) for (let j=0;j<=W;j++) { const p=sample(i/N,j/W-.5); pos.push(p.x,p.y,p.z); }
  for(let i=0;i<N;i++) for(let j=0;j<W;j++) {
    const a=i*(W+1)+j,b=a+W+1;
    const p=sample((i+.5)/N,(j+.5)/W-.5);
    if(isDock(p))continue;
    idx.push(a,b,a+1,b,b+1,a+1);
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  parts.add(g,mat);
  for(const edge of [-.5,.5]) {
    let section=[];
    const flush=()=>{if(section.length>3)tube(parts,section,.007,mat,Math.max(12,Math.ceil(section.length*.67)),5);section=[];};
    for(let i=0;i<=N;i++){const p=sample(i/N,edge);if(isDock(p))flush();else section.push(p);}
    flush();
  }
}

function orbit(parts, radius, thickness, mat, euler, y=0, arc=TAU, start=0) {
  const q = new T.Quaternion().setFromEuler(euler);
  const pts=[];
  for(let i=0;i<=120;i++) {
    const a=start+arc*i/120;
    pts.push(new T.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius).applyQuaternion(q));
  }
  tube(parts,pts,thickness,mat,Math.ceil(96*arc/TAU),7,arc===TAU);
}

function orbitBand(parts,radius,width,mat,euler,y=0) {
  const g=new T.TorusGeometry(radius,width,10,112);
  g.rotateX(Math.PI/2);g.scale(1,.27,1);g.translate(0,y,0);
  parts.add(g,mat,new T.Vector3(),new T.Quaternion().setFromEuler(euler));
}

function crystalGeometry(radius,height) {
  const p=[], ix=[];
  for(let row=0;row<2;row++) for(let j=0;j<6;j++){const a=j/6*TAU;p.push(Math.cos(a)*radius,row*height*.72,Math.sin(a)*radius);}
  p.push(radius*.16,height,0);
  for(let j=0;j<6;j++){const k=(j+1)%6;ix.push(j,k,j+6,k,k+6,j+6,j+6,k+6,12);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);
  const flat=g.toNonIndexed();flat.computeVertexNormals();g.dispose();return flat;
}

function dock(parts, mats) {
  const q=new T.Quaternion().setFromUnitVectors(Y,DOCK_NORMAL);
  const ringQ=q.clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-Math.PI/2));
  parts.add(new T.TorusGeometry(.28,.002,6,48),mats.mint,DOCK_NORMAL.clone().multiplyScalar(.990),ringQ);
  for(let i=0;i<4;i++) {
    const v=new T.Vector3(Math.cos(i/4*TAU)*.28,0,Math.sin(i/4*TAU)*.28).applyQuaternion(q).add(DOCK_NORMAL.clone().multiplyScalar(.9925));
    parts.add(new T.CylinderGeometry(.010,.010,.001,8),mats.light,v,q);
  }
}

function gear(parts,mats,theta,phi,size) {
  const n=point(theta,phi); if(isDock(n,.88))return;
  const q=new T.Quaternion().setFromUnitVectors(Z,n);
  const p=n.clone().multiplyScalar(1.04);
  parts.add(new T.TorusGeometry(size,.019,7,36),mats.gold,p,q);
  parts.add(new T.TorusGeometry(size*.75,.011,6,32),mats.lilac,p.clone().addScaledVector(n,.006),q);
  ball(parts,p.clone().addScaledVector(n,.016),size*.25,mats.gold,[1,1,.45],q,12);
  for(let i=0;i<10;i++){
    const a=i/10*TAU;
    const v=new T.Vector3(Math.cos(a)*size*.92,Math.sin(a)*size*.92,0).applyQuaternion(q).add(p);
    const qr=q.clone().multiply(new T.Quaternion().setFromAxisAngle(Z,a));
    parts.add(new T.BoxGeometry(size*.25,size*.20,.034),mats.pearl,v,qr);
    const mid=new T.Vector3(Math.cos(a)*size*.48,Math.sin(a)*size*.48,.008).applyQuaternion(q).add(p);
    parts.add(new T.BoxGeometry(size*.76,.012,.017),mats.gold,mid,qr);
  }
}

export function makePlanet(kind) {
  const mats=palette(),parts=new Parts(),rand=random(109+['posture','breathing','tongue','swallowing','chewing','lips'].indexOf(kind)*17);
  baseSphere(parts,mats.body,kind);
  if(kind==='posture') {
    for(let i=0;i<5;i++)ribbon(parts,.48+i*.48,.10,i*.7,.055,i%2?mats.pearl:mats.lilac);
    for(let i=0;i<22;i++) {
      const theta=.19+Math.pow(rand(),1.7)*1.35,phi=rand()*TAU,n=point(theta,phi);
      if(isDock(n,.85))continue;
      const q=new T.Quaternion().setFromUnitVectors(Y,n);
      for(let j=0;j<3;j++) {
        const off=new T.Vector3((rand()-.5)*.12,0,(rand()-.5)*.12).applyQuaternion(q);
        const p=n.clone().multiplyScalar(1.005).add(off);
        const h=Math.min(.62,(.1+rand()*.27)*(1.7-theta*.6)*(j===0?1.5:1));
        parts.add(crystalGeometry(.035+rand()*.025,h),j===0?mats.violet:mats.lilac,p,q);
        for(let b=0;b<3;b++)ball(parts,p.clone().add(new T.Vector3((rand()-.5)*.13,(rand()-.5)*.05,(rand()-.5)*.13)),.022+rand()*.016,mats.mint,[1,1,1],q,8);
      }
    }
    orbit(parts,1.42,.018,mats.violet,new T.Euler(0,0,Math.PI/2-.12));
    orbit(parts,1.45,.005,mats.gold,new T.Euler(0,0,Math.PI/2-.12));
  }
  if(kind==='breathing') {
    for(let i=0;i<5;i++)ribbon(parts,.45+i*.49,.14,i,.045,mats.mint,2);
    for(let i=0;i<15;i++) {
      const theta=.26+(i/15)*2.65,phi=i*2.4,n=point(theta,phi);
      if(isDock(n,.83))continue;
      const q=new T.Quaternion().setFromUnitVectors(Y,n);
      for(let j=0;j<6;j++) {
        const a=j/6*TAU, local=new T.Vector3(Math.cos(a)*.16,.01+rand()*.05,Math.sin(a)*.12).applyQuaternion(q);
        ball(parts,n.clone().multiplyScalar(1.025).add(local),.13+rand()*.075,mats.pearl,[1.1,.85,1],q,16);
      }
    }
    for(let i=0;i<3;i++)orbitBand(parts,1.35+i*.08,.055+i*.004,mats.mint,new T.Euler(.16,0,-.29),-.42+i*.42);
  }
  if(kind==='tongue') {
    for(let i=0;i<8;i++)ribbon(parts,.25+i*.38,.27,i*.52,.09,[mats.pink,mats.violet,mats.mint,mats.lilac][i%4],2);
    orbit(parts,1.45,.047,mats.violet,new T.Euler(.10,0,-.34));
    orbit(parts,1.48,.008,mats.lilac,new T.Euler(.10,0,-.34),.032);
  }
  if(kind==='swallowing') {
    for(let i=0;i<7;i++)ribbon(parts,.26+i*.42,.18,i*.4,.085,[mats.ice,mats.mint,mats.lilac][i%3],2);
    for(let i=0;i<3;i++) {
      const rad=i===1?1.60:1.32, yy=(i-1)*.58;
      orbitBand(parts,rad,i===1?.10:.075,mats.ice,new T.Euler(.08,0,-.12),yy);
      orbit(parts,rad+.042,.012,mats.mint,new T.Euler(.08,0,-.12),yy+.014);
      orbit(parts,rad-.055,.012,mats.lilac,new T.Euler(.08,0,-.12),yy-.01);
    }
  }
  if(kind==='chewing') {
    for(let i=0;i<7;i++)ribbon(parts,.30+i*.42,.095,i*.5,.04,[mats.lilac,mats.gold,mats.pearl][i%3],4);
    for(const [th,ph,size]of [[.78,1.7,.17],[1.5,2.2,.15],[1.5,.55,.14],[2.0,1.65,.1],[1.9,3.7,.16],[.6,4.6,.14]])gear(parts,mats,th,ph,size);
    for(let i=0;i<16;i++) {
      const angle=i/16*TAU;
      orbit(parts,1.46,.061,mats.pearl,new T.Euler(.17,0,-.23),0,TAU/16*.75,angle);
      const p=new T.Vector3(Math.cos(angle)*1.46,0,Math.sin(angle)*1.46).applyEuler(new T.Euler(.17,0,-.23));
      ball(parts,p,.065,mats.gold,[1,1,1],new T.Quaternion(),12);
      ball(parts,p.clone().multiplyScalar(1.025),.038,mats.violet,[1,1,1],new T.Quaternion(),10);
    }
    for(let i=0;i<40;i++){
      const n=point(Math.acos(1-2*rand()),rand()*TAU);if(isDock(n,.86))continue;
      const q=new T.Quaternion().setFromUnitVectors(Y,n);
      ball(parts,n.clone().multiplyScalar(1.01),.035+rand()*.035,i%3?mats.lilac:mats.gold,[1,.35,1],q,10);
    }
  }
  if(kind==='lips') {
    for(let i=0;i<25;i++){
      const n=point(Math.acos(1-2*(i+.5)/25),i*2.39996);if(isDock(n,.83))continue;
      const q=new T.Quaternion().setFromUnitVectors(Y,n).multiply(new T.Quaternion().setFromAxisAngle(Y,rand()*TAU));
      ball(parts,n.clone().multiplyScalar(.96),.29,[mats.pearl,mats.pink,mats.lilac,mats.pink][i%4],[1.1,.75,1.50],q,22);
    }
    orbit(parts,1.43,.026,mats.mint,new T.Euler(.10,0,-.32));
    orbit(parts,1.46,.008,mats.ice,new T.Euler(.10,0,-.32),.018);
  }
  // Pearl beads are actual geometry, never camera-facing image planes.
  const beadCount=kind==='lips'?52:32;
  for(let i=0;i<beadCount;i++){
    const n=point(Math.acos(1-2*rand()),rand()*TAU);if(isDock(n,.86))continue;
    const r=.017+Math.pow(rand(),2)*.068;
    ball(parts,n.clone().multiplyScalar(1.01+r*.40),r,[mats.pearl,mats.mint,mats.lilac,mats.pink][i%4],[1,1,1],new T.Quaternion(),12);
  }
  dock(parts,mats);
  const root=parts.finish(`MyoSkills ${kind}`);
  root.userData={style:'Pearl ceramic, mint opal, lavender resin; reference: supplied MyoSkills site',landingNormal:DOCK_NORMAL.toArray(),landingRadius:DOCK_RADIUS};
  const anchor=new T.Object3D();anchor.name='LandingAnchor';anchor.position.copy(DOCK_NORMAL).multiplyScalar(DOCK_RADIUS);anchor.quaternion.setFromUnitVectors(Y,DOCK_NORMAL);root.add(anchor);
  return root;
}

export function makeRocket() {
  const mats=palette(),parts=new Parts();
  const profile=[[-.64,.13],[-.55,.23],[-.35,.30],[0,.33],[.35,.29],[.60,.20],[.81,.095],[.92,0]].map(([y,r])=>new T.Vector2(r,y));
  parts.add(new T.LatheGeometry(profile,48),mats.pearl);
  for(const [y,r,th,mat]of [[-.49,.25,.026,mats.violet],[.39,.28,.022,mats.violet],[-.1,.332,.012,mats.gold]]) {
    parts.add(new T.TorusGeometry(r,th,8,48),mat,new T.Vector3(0,y,0),new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
  }
  // A raised circular glazed window and its two concentric metal rims.
  const win=new T.Vector3(0,.24,.268), q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.17);
  parts.add(new T.TorusGeometry(.137,.027,10,40),mats.violet,win,q);
  parts.add(new T.TorusGeometry(.14,.008,6,40),mats.gold,win.clone().add(new T.Vector3(0,0,.014)),q);
  ball(parts,win.clone().add(new T.Vector3(0,0,.014)),.126,mats.dark,[1,1,.32],q,32);
  ball(parts,win.clone().add(new T.Vector3(-.035,.04,.050)),.042,mats.mint,[1,.40,.12],q,14);
  parts.add(new T.CylinderGeometry(.13,.18,.15,28),mats.dark,new T.Vector3(0,-.67,0));
  parts.add(new T.TorusGeometry(.18,.021,8,32),mats.gold,new T.Vector3(0,-.745,0),new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2));
  for(let i=0;i<3;i++) {
    const a=i/3*TAU+Math.PI;
    const shape=new T.Shape();shape.moveTo(.22,.0);shape.bezierCurveTo(.4,-.04,.48,-.36,.45,-.55);shape.lineTo(.26,-.48);shape.closePath();
    const g=new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.018,bevelThickness:.015,curveSegments:10});g.translate(0,-.18,-.0225);
    parts.add(g,mats.violet,new T.Vector3(),new T.Quaternion().setFromAxisAngle(Y,a));
    const lp=new T.Vector3(Math.cos(a)*.36,-.52,-Math.sin(a)*.36);
    ball(parts,lp,.04,mats.light,[1,1,1],new T.Quaternion(),12);
  }
  const root=parts.finish('MyoSkills pearl explorer');
  for(let i=0;i<3;i++) {
    const a=i/3*TAU+Math.PI,legParts=new Parts();
    const pivot=new T.Group();pivot.name=`LandingLeg_${i}`;pivot.position.set(Math.cos(a)*.26,-.46,-Math.sin(a)*.26);
    const direction=new T.Vector3(Math.cos(a)*.18,-.40,-Math.sin(a)*.18),length=direction.length();
    legParts.add(new T.CylinderGeometry(.018,.021,length,8),mats.gold,direction.clone().multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(Y,direction.clone().normalize()));
    legParts.add(new T.SphereGeometry(.065,12,8),mats.pearl,new T.Vector3(direction.x,-.42,direction.z),new T.Quaternion(),new T.Vector3(1,.45,1));
    pivot.add(legParts.finish(`Leg ${i}`));root.add(pivot);
  }
  const anchor=new T.Object3D();anchor.name='EngineAnchor';anchor.position.set(0,-.75,0);root.add(anchor);
  root.userData={forwardAxis:'+Y',engineAxis:'-Y',footY:FOOT_Y,landingLegs:'LandingLeg_0, LandingLeg_1, LandingLeg_2'};
  return root;
}
