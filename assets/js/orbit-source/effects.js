import * as T from 'three';
import {SPACE_SPEED} from './flyby.js';

const Y=new T.Vector3(0,1,0),DOWN=new T.Vector3(0,-1,0);
const random=(a,b)=>a+Math.random()*(b-a);

export function makeEnvironment(renderer) {
  // A small studio environment gives every ceramic surface a broad softbox
  // reflection. It is rendered and convolved once, never once per frame.
  const width=256,height=128,data=new Float32Array(width*height*4);
  const direction=new T.Vector3();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const theta=y/height*Math.PI,phi=x/width*Math.PI*2;
    direction.set(Math.sin(theta)*Math.cos(phi),Math.cos(theta),Math.sin(theta)*Math.sin(phi));
    const key=Math.pow(Math.max(0,direction.dot(new T.Vector3(-.55,.7,.45).normalize())),30)*5.5;
    const fill=Math.pow(Math.max(0,direction.dot(new T.Vector3(.65,.1,-.75).normalize())),16)*2.8;
    const rim=Math.pow(Math.max(0,direction.dot(new T.Vector3(.2,-.8,.55).normalize())),24)*1.5;
    const i=(y*width+x)*4;
    data[i]=.22+key+fill*.68+rim*.5;data[i+1]=.25+key*.98+fill*.73+rim;data[i+2]=.35+key*.95+fill+rim*.9;data[i+3]=1;
  }
  const texture=new T.DataTexture(data,width,height,T.RGBAFormat,T.FloatType);
  texture.mapping=T.EquirectangularReflectionMapping;texture.needsUpdate=true;
  const pmrem=new T.PMREMGenerator(renderer),rt=pmrem.fromEquirectangular(texture);
  pmrem.dispose();texture.dispose();return rt;
}

export function makeStars(scene,low) {
  const count=low?1600:3000,p=new Float32Array(count*3),sizes=new Float32Array(count),colors=new Float32Array(count*3);
  const c=new T.Color();
  for(let i=0;i<count;i++) {
    p.set([random(-84,84),random(-48,48),random(0,180)],i*3);
    sizes[i]=Math.pow(Math.random(),3)*1.5+.8;
    c.set(['#e9f4ff','#88e2ed','#b8a0ee','#baf7df'][i%4]).toArray(colors,i*3);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(p,3));geometry.setAttribute('aSize',new T.BufferAttribute(sizes,1));geometry.setAttribute('color',new T.BufferAttribute(colors,3));
  const material=new T.ShaderMaterial({
    uniforms:{uTravel:{value:0},uPixelRatio:{value:1}},vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:`attribute float aSize;uniform float uTravel;uniform float uPixelRatio;varying vec3 vColor;varying float vAlpha;void main(){float depth=5.+mod(position.z-uTravel,180.);vec4 p=modelViewMatrix*vec4(position.xy,-depth,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize*uPixelRatio*65./depth,1.*uPixelRatio,3.2*uPixelRatio);vAlpha=.9*smoothstep(0.,14.,185.-depth)*smoothstep(0.,3.,depth-5.);vColor=color;}`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){float d=length((gl_PointCoord-.5)*2.);if(d>1.)discard;float glow=1.-smoothstep(.12,1.,d);gl_FragColor=vec4(vColor*1.3,glow*vAlpha);}`
  });
  const mesh=new T.Points(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
  return {mesh,update(time,dpr){material.uniforms.uTravel.value=(time*5)%180;material.uniforms.uPixelRatio.value=dpr;}};
}

export function makeConstellations(scene) {
  const patterns=[
    [[-3,1,0],[-1.9,2,.4],[-.9,1.3,-.4],[0,2.1,0],[1.2,1.2,.5],[2.9,1.8,0],[2.4,-.1,.4],[1.1,-1.3,0],[0,-1.9,-.3],[-1.6,-1.1,.2],[-3,1,0]],
    [[-3,-.8,0],[-1.4,.1,.5],[0,1.2,0],[1.1,.1,-.7],[2.7,.7,0],[3.1,2.1,.4]],
    [[-2,0,0],[-1,1.8,-.4],[.3,2.3,0],[1.8,1.2,.5],[1.2,-.6,0],[-.3,-1.3,-.4],[-2,0,0]]
  ];
  const items=patterns.map((arr,i)=>{
    const group=new T.Group(),q=new T.Quaternion().setFromEuler(new T.Euler(.15,i*.4,i*.32));
    const pts=arr.map(a=>new T.Vector3(...a).multiplyScalar(2).applyQuaternion(q));
    const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#7fc2d9',transparent:true,opacity:.16,depthWrite:false}));
    const stars=new T.Points(new T.BufferGeometry().setFromPoints(pts.slice(0,-1)),new T.PointsMaterial({color:'#b4f5e6',size:.14,transparent:true,opacity:.8,depthWrite:false}));
    group.add(line,stars);group.position.set([-32,37,-25][i],[23,-24,-20][i],-80);scene.add(group);return {group,line,stars,seed:35+i*53};
  });
  return {update(time){for(const e of items){const d=20+((e.seed-time*SPACE_SPEED)%160+160)%160;e.group.position.z=-d;const a=T.MathUtils.smoothstep(d,20,38)*(1-T.MathUtils.smoothstep(d,155,180));e.line.material.opacity=.16*a;e.stars.material.opacity=.8*a;}}};
}

export function makeLandingShadow(scene) {
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uOpacity:{value:0}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform float uOpacity;void main(){float r=length(vUv-.5)*2.;float a=pow(1.-smoothstep(.05,1.,r),1.6)*uOpacity;gl_FragColor=vec4(.015,.018,.035,a);}`});
  const shadow=new T.Mesh(new T.CircleGeometry(1,32),material);scene.add(shadow);
  const Z=new T.Vector3(0,0,1);
  return {update(state,body){
    const height=Math.max(0,state.position.distanceTo(body.centre)-body.dock.distanceTo(body.centre));
    shadow.visible=height<2&&(state.stage==='landing'||state.stage==='touch'||state.stage==='takeoff');
    shadow.position.copy(body.centre).addScaledVector(body.normal,body.radius*.991);
    shadow.quaternion.setFromUnitVectors(Z,body.normal);shadow.scale.setScalar(body.rocketScale*(.62+height*.13));
    material.uniforms.uOpacity.value=.24*(1-height/2);
  }};
}

export class Meteors {
  constructor(scene,low) {
    this.count=low?4:7;this.entries=[];this.dummy=new T.Object3D();this.velocity=new T.Vector3();this.direction=new T.Vector3();
    this.head=new T.InstancedMesh(new T.IcosahedronGeometry(.075,1),new T.MeshBasicMaterial({color:'#caf8ee',toneMapped:false}),this.count);
    this.trail=new T.InstancedMesh(new T.CylinderGeometry(.008,.032,1,5),new T.MeshBasicMaterial({color:'#98c9df',transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),this.count);
    this.head.frustumCulled=this.trail.frustumCulled=false;scene.add(this.head,this.trail);
    this.spread=1;
    for(let i=0;i<this.count;i++)this.entries.push({start:5+i*6.7,duration:random(.65,1.25),p:new T.Vector3(random(-20,26),random(12,22),random(-80,-20)),v:new T.Vector3(random(-26,-15),random(-13,-6),random(3,7)),length:random(1.6,3.6)});
  }
  update(t) {
    const d=this.dummy;
    this.entries.forEach((e,i)=>{
      let age=t-e.start;
      if(age>e.duration) {
        e.start=t+random(11,24);e.duration=random(.8,1.35);e.p.set(random(-27,30),random(7,23),random(-80,-20));e.v.set(random(-26,-15),random(-13,-6),random(3,7));age=-1;
      }
      if(age<0) {d.scale.setScalar(0);d.position.set(0,0,-100);d.updateMatrix();this.head.setMatrixAt(i,d.matrix);this.trail.setMatrixAt(i,d.matrix);return;}
      d.position.copy(e.p).addScaledVector(e.v,age);d.position.x*=this.spread;
      this.velocity.copy(e.v);this.velocity.x*=this.spread;this.direction.copy(this.velocity).normalize();d.quaternion.setFromUnitVectors(Y,this.direction);
      const fade=Math.sin(age/e.duration*Math.PI);d.scale.setScalar(fade);d.updateMatrix();this.head.setMatrixAt(i,d.matrix);
      d.position.addScaledVector(this.velocity,-e.length/this.velocity.length()/2);d.scale.set(fade,fade*e.length,fade);d.updateMatrix();this.trail.setMatrixAt(i,d.matrix);
    });
    this.head.instanceMatrix.needsUpdate=this.trail.instanceMatrix.needsUpdate=true;
  }
}

export class EngineFX {
  constructor(scene,rocket,low) {
    this.scene=scene;this.rocket=rocket;this.count=low?100:190;this.cursor=0;this.emitRemainder=0;this.dummy=new T.Object3D();
    this.engine=new T.Vector3();this.axis=new T.Vector3();this.temp=new T.Vector3();
    this.plume=new T.Group();this.plume.position.set(0,-.75,0);rocket.add(this.plume);
    const points=[new T.Vector2(0,0),new T.Vector2(.11,-.04),new T.Vector2(.14,-.25),new T.Vector2(.12,-.55),new T.Vector2(.085,-1.05),new T.Vector2(0,-1.65)];
    // Two genuinely volumetric lathed meshes, rather than crossed flame cards.
    this.flameMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,uniforms:{uTime:{value:0},uPower:{value:0}},
      vertexShader:`uniform float uTime;varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vec3 p=position;float a=clamp(-p.y/1.65,0.,1.);p.xz*=1.+.10*sin(p.y*24.+uTime*38.+p.x*12.)*a;vec4 mv=modelViewMatrix*vec4(p,1.);vP=position;vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform float uPower;uniform float uTime;varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){float a=clamp(-vP.y/1.65,0.,1.);float edge=pow(abs(dot(normalize(vN),normalize(vV))),.6);float shock=.75+.25*sin(a*52.-uTime*45.);vec3 c=mix(vec3(.65,1.,.92),vec3(.20,.40,1.),smoothstep(.05,.55,a));c=mix(c,vec3(.65,.25,.85),smoothstep(.6,1.,a));float alpha=(1.-a)*edge*.6*uPower*shock;gl_FragColor=vec4(c*2.2,alpha);}`});
    this.flame=new T.Mesh(new T.LatheGeometry(points,20),this.flameMaterial);this.plume.add(this.flame);
    this.core=new T.Mesh(new T.LatheGeometry(points.map(p=>new T.Vector2(p.x*.46,p.y*.62)),16),new T.MeshBasicMaterial({color:'#d7fff2',transparent:true,opacity:.8,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));this.plume.add(this.core);
    this.pool=Array.from({length:this.count},()=>({life:0,maxLife:1,p:new T.Vector3(),v:new T.Vector3(),size:.02,dust:false}));
    this.particles=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.64,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),this.count);this.particles.frustumCulled=false;scene.add(this.particles);
    this.palette=[new T.Color('#b5f9e7'),new T.Color('#6aa8ed'),new T.Color('#8767c7')];
  }
  reset(){this.pool.forEach(p=>p.life=0);this.emitRemainder=0;}
  update(dt,t,state,planets) {
    const q=this.rocket.quaternion;this.axis.copy(DOWN).applyQuaternion(q);this.engine.set(0,-.75,0).applyMatrix4(this.rocket.matrixWorld);
    const power=state.throttle;
    let maxLength=1.65;
    for(const p of planets) {
      this.temp.subVectors(this.engine,p.centre);
      const axial=this.temp.dot(p.normal),lateral=Math.sqrt(Math.max(0,this.temp.lengthSq()-axial*axial));
      if(axial>0&&lateral<p.radius*.36) {
        const rate=this.axis.dot(p.normal);
        if(rate<-.01){const hit=(p.radius*.993-axial)/rate;if(hit>=0)maxLength=Math.min(maxLength,Math.max(.04,(hit-.015)/this.rocket.scale.x));}
        continue;
      }
      const b=this.temp.dot(this.axis),c=this.temp.lengthSq()-(p.radius*1.032)**2,disc=b*b-c;
      if(disc>=0) {const hit=-b-Math.sqrt(disc);if(hit>=0)maxLength=Math.min(maxLength,Math.max(.04,(hit-.06)/this.rocket.scale.x));}
    }
    this.plume.visible=power>.015;
    const flicker=1+.045*Math.sin(t*79)+.025*Math.sin(t*131);
    this.plume.scale.set(1,Math.min(maxLength/1.65,(.3+power*.85)*flicker),1);
    this.flameMaterial.uniforms.uTime.value=t%(Math.PI*2);this.flameMaterial.uniforms.uPower.value=power;
    this.core.material.opacity=power*.80;
    this.emitRemainder+=dt*power*(this.count===100?68:120);
    while(this.emitRemainder>=1) {
      this.emitRemainder--;const p=this.pool[this.cursor++%this.count];
      p.life=p.maxLife=random(.24,.70);p.p.copy(this.engine);
      this.temp.set(random(-.28,.28),random(-.1,.1),random(-.28,.28)).applyQuaternion(q);
      p.v.copy(state.worldVelocity).addScaledVector(this.axis,random(2.5,5.2)).add(this.temp);p.v.z+=SPACE_SPEED;p.size=random(.015,.045);p.dust=false;
    }
    const d=this.dummy,c=new T.Color();
    for(let i=0;i<this.count;i++) {
      const p=this.pool[i];p.life-=dt;
      if(p.life>0) {
        p.p.addScaledVector(p.v,dt);
        for(const body of planets) {
          this.temp.subVectors(p.p,body.centre);const distance=this.temp.length(),r=body.radius*1.04;
          const axial=this.temp.dot(body.normal),lateral=Math.sqrt(Math.max(0,distance*distance-axial*axial));
          if(axial>0&&lateral<body.radius*.35) {
            const floor=body.radius*.993;
            if(axial<floor){p.p.addScaledVector(body.normal,floor-axial);p.v.z-=SPACE_SPEED;p.v.addScaledVector(body.normal,-p.v.dot(body.normal)).multiplyScalar(.75);p.v.addScaledVector(body.normal,.12);p.v.z+=SPACE_SPEED;p.dust=true;p.life=Math.min(p.life,.25);}
            continue;
          }
          if(distance<r+.04) {
            this.temp.multiplyScalar(1/Math.max(distance,.0001));p.p.copy(body.centre).addScaledVector(this.temp,r+.045);
            p.v.z-=SPACE_SPEED;p.v.addScaledVector(this.temp,-p.v.dot(this.temp)).multiplyScalar(.75);p.v.addScaledVector(this.temp,.22);p.v.z+=SPACE_SPEED;p.dust=true;p.life=Math.min(p.life,.25);
          }
        }
        const age=1-p.life/p.maxLife;d.position.copy(p.p);d.quaternion.identity();d.scale.setScalar(p.size*(p.dust?2.2:1)*(1-age));d.updateMatrix();
        c.copy(this.palette[Math.min(2,Math.floor(age*3))]).multiplyScalar(Math.max(.05,(1-age)*1.25));
      }else{d.scale.setScalar(0);d.updateMatrix();c.setScalar(0);}
      this.particles.setMatrixAt(i,d.matrix);this.particles.setColorAt(i,c);
    }
    this.particles.instanceMatrix.needsUpdate=true;this.particles.instanceColor.needsUpdate=true;
  }
}
