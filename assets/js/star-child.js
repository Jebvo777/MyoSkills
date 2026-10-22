// A continuous, skinned constellation figure. Body, hands and starlight share one rig.
export function createStarChild(T,scene,camera,{reduced=()=>false}={}){
 const figure=new T.Group();figure.name='MyoSkills / Star Child';scene.add(figure);
 const bones=[],boneMap={};
 function bone(name,parent,x=0,y=0,z=0){const b=new T.Bone();b.name=name;b.position.set(x,y,z);(parent||figure).add(b);boneMap[name]=b;b.userData.index=bones.length;bones.push(b);return b;}
 const hips=bone('hips',null),spine=bone('spine',hips,0,.55),chest=bone('chest',spine,0,.48),neck=bone('neck',chest,0,.23),head=bone('head',neck,0,.34);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const prefix=side<0?'left':'right',shoulder=bone(prefix+'Shoulder',chest,side*.43,0),elbow=bone(prefix+'Elbow',shoulder,0,-.53),wrist=bone(prefix+'Wrist',elbow,0,-.49);
  const fingers=[];
  for(let i=0;i<4;i++){
   const digit=bone(prefix+'Finger'+i,wrist,(i-1.5)*.038,-.155,.005),tip=bone(prefix+'FingerTip'+i,digit,0,-[.072,.09,.10,.08][i]);fingers.push({digit,tip,length:[.13,.16,.17,.14][i]});
  }
  const thumb=bone(prefix+'Thumb',wrist,-side*.065,-.07,.008);thumb.rotation.z=-side*.8;
  arms.push({side,shoulder,elbow,wrist,fingers,thumb});
  const hip=bone(prefix+'Hip',hips,side*.165,-.035),knee=bone(prefix+'Knee',hip,0,-.64),ankle=bone(prefix+'Ankle',knee,0,-.62);legs.push({hip,knee,ankle});
 }
 figure.updateMatrixWorld(true);
 const positions=[],colors=[],skinIndices=[],skinWeights=[],indices=[];
 const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const mixWeights=(a,b,t)=>[[a,1-t],[b,t]];
 const point=new T.Vector3();
 function vertex(x,y,z,weights){
  const i=positions.length/3;positions.push(x,y,z);
  const color=new T.Color().setRGB(.29+random(i+1)*.15,.66+random(i+2)*.26,.77+random(i+3)*.18);colors.push(color.r,color.g,color.b);
  const active=weights.filter(([,w])=>w>0),sum=active.reduce((n,[,w])=>n+w,0)||1;
  for(let k=0;k<4;k++){skinIndices.push(active[k]?.[0].userData.index??0);skinWeights.push((active[k]?.[1]||0)/sum);}return i;
 }
 function rings(count,sides,sample){
  const start=positions.length/3;
  for(let j=0;j<=count;j++)for(let k=0;k<sides;k++)sample(j/count,(k+(j%2)*.5)/sides*Math.PI*2,j,k);
  for(let j=0;j<count;j++)for(let k=0;k<sides;k++){
   const a=start+j*sides+k,b=start+j*sides+(k+1)%sides,c=a+sides,d=b+sides;indices.push(a,c,b,b,c,d);
  }
 }
 function ellipsoid(cx,cy,cz,rx,ry,rz,weights,rows=13,sides=16,transform=null){
  rings(rows,sides,(u,a)=>{const latitude=u*Math.PI,r=Math.sin(latitude);point.set(cx+Math.cos(a)*rx*r,cy+Math.cos(latitude)*ry,cz+Math.sin(a)*rz*r);if(transform)point.applyMatrix4(transform);vertex(point.x,point.y,point.z,weights);});
 }
 function profileAt(profile,u){const f=u*(profile.length-1),i=Math.min(profile.length-2,Math.floor(f)),t=f-i;return profile[i].map((v,k)=>v+(profile[i+1][k]-v)*t);}
 const torsoProfile=[[0,.12,.11],[.12,.29,.17],[.32,.235,.145],[.56,.285,.17],[.8,.365,.205],[1.015,.37,.175],[1.14,.16,.10],[1.2,.075,.075]];
 rings(23,19,(u,a)=>{
  const [y,rx,rz]=profileAt(torsoProfile,u),weights=y<.53?mixWeights(hips,spine,smooth((y-.08)/.55)):mixWeights(spine,chest,smooth((y-.52)/.58));
  vertex(Math.cos(a)*rx,y,Math.sin(a)*rz,weights);
 });
 ellipsoid(0,.02,0,.285,.20,.17,[[hips,1]],10,16);
 ellipsoid(0,1.25,0,.082,.145,.078,mixWeights(chest,head,.5),9,12);
 // A quiet, faceless human silhouette, as in the supplied constellation reference.
 ellipsoid(0,1.61,.005,.237,.30,.205,[[head,1]],16,20);
 function limb(start,length,profile,first,second,third){
  rings(21,12,(u,a)=>{
   const distance=u*length,[rx,rz]=profileAt(profile,u);
   let weights=distance<.68?mixWeights(first,second,smooth((distance-.36)/.32)):mixWeights(second,third,smooth((distance-(length-.19))/.19));
   vertex(start.x+Math.cos(a)*rx,start.y-distance,start.z+Math.sin(a)*rz,weights);
  });
 }
 for(const arm of arms){
  const {side,shoulder,elbow,wrist,fingers,thumb}=arm;
  limb(new T.Vector3(side*.43,1.03,0),1.02,[[.115,.11],[.122,.105],[.108,.09],[.075,.07],[.087,.068],[.068,.053],[.046,.038]],shoulder,elbow,wrist);
  ellipsoid(side*.43,1.015,0,.127,.135,.115,[[shoulder,1]],10,12);
  ellipsoid(0,-.09,.003,.079,.118,.039,[[wrist,1]],10,12,wrist.matrixWorld);
  for(const {digit,tip,length} of fingers){
   const bend=Math.abs(tip.position.y);
   rings(9,7,(u,a)=>{const radius=(1-u*.45)*.0145;point.set(Math.cos(a)*radius,-u*length,Math.sin(a)*radius).applyMatrix4(digit.matrixWorld);vertex(point.x,point.y,point.z,mixWeights(digit,tip,smooth((u*length-bend+.02)/.055)));});
  }
  rings(8,8,(u,a)=>{const radius=.018*(1-u*.45);point.set(Math.cos(a)*radius,-u*.105,Math.sin(a)*radius).applyMatrix4(thumb.matrixWorld);vertex(point.x,point.y,point.z,[[thumb,1]]);});
 }
 for(const {hip,knee,ankle} of legs){
  const start=hip.getWorldPosition(new T.Vector3());
  limb(start,1.26,[[.135,.125],[.143,.12],[.118,.10],[.088,.085],[.102,.08],[.081,.064],[.049,.048]],hip,knee,ankle);
  ellipsoid(start.x,-1.34,.08,.071,.069,.17,[[ankle,1]],9,12);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(skinIndices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(skinWeights,4));geometry.setIndex(indices);geometry.computeVertexNormals();
 const skeleton=new T.Skeleton(bones);
 const mesh=new T.SkinnedMesh(geometry,new T.MeshBasicMaterial({color:'#A8FFF2',vertexColors:true,wireframe:true,transparent:true,opacity:.23,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));mesh.frustumCulled=false;figure.add(mesh);figure.updateMatrixWorld(true);mesh.bind(skeleton);
 const silhouette=new T.SkinnedMesh(geometry,new T.MeshBasicMaterial({color:'#54BECE',transparent:true,opacity:.035,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));figure.add(silhouette);silhouette.bind(skeleton,mesh.bindMatrix);silhouette.frustumCulled=false;

 const sparkPosition=[],sparkSkin=[],sparkWeight=[],corners=[],sizes=[],tints=[],phases=[],sparkIndices=[],seen=new Set();
 for(let i=0;i<positions.length/3;i+=3){
  const key=positions.slice(i*3,i*3+3).map(v=>Math.round(v*36)).join(':');if(seen.has(key))continue;seen.add(key);
  const bright=random(i+73)>.935,size=bright?.048:.013+random(i+4)*.012,tint=new T.Color(bright?(random(i)>.5?'#FFF0BE':'#E5FFFC'):random(i+5)>.8?'#AC9AFF':'#61E0CA'),base=sparkPosition.length/3;
  for(const [x,y]of [[-1,-1],[1,-1],[1,1],[-1,1]]){
   sparkPosition.push(...positions.slice(i*3,i*3+3));sparkSkin.push(...skinIndices.slice(i*4,i*4+4));sparkWeight.push(...skinWeights.slice(i*4,i*4+4));corners.push(x,y);sizes.push(size);tints.push(tint.r,tint.g,tint.b);phases.push(random(i+8)*Math.PI*2);
  }
  sparkIndices.push(base,base+1,base+2,base,base+2,base+3);
 }
 const sparkGeometry=new T.BufferGeometry();sparkGeometry.setAttribute('position',new T.Float32BufferAttribute(sparkPosition,3));sparkGeometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(sparkSkin,4));sparkGeometry.setAttribute('skinWeight',new T.Float32BufferAttribute(sparkWeight,4));sparkGeometry.setAttribute('aCorner',new T.Float32BufferAttribute(corners,2));sparkGeometry.setAttribute('aSize',new T.Float32BufferAttribute(sizes,1));sparkGeometry.setAttribute('aTint',new T.Float32BufferAttribute(tints,3));sparkGeometry.setAttribute('aPhase',new T.Float32BufferAttribute(phases,1));sparkGeometry.setIndex(sparkIndices);
 const sparkMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,uniforms:{uTime:{value:0},uGreeting:{value:0}},vertexShader:`
  #include <common>
  #include <skinning_pars_vertex>
  attribute vec2 aCorner;attribute float aSize;attribute vec3 aTint;attribute float aPhase;
  varying vec2 vCorner;varying vec3 vTint;varying float vPhase;
  void main(){
   #include <skinbase_vertex>
   #include <begin_vertex>
   #include <skinning_vertex>
   vec4 mv=modelViewMatrix*vec4(transformed,1.);mv.xy+=aCorner*aSize;
   gl_Position=projectionMatrix*mv;vCorner=aCorner;vTint=aTint;vPhase=aPhase;
  }`,fragmentShader:`uniform float uTime;uniform float uGreeting;varying vec2 vCorner;varying vec3 vTint;varying float vPhase;
  void main(){float r=length(vCorner);if(r>1.)discard;float halo=pow(1.-smoothstep(0.,1.,r),2.);float core=exp(-r*r*40.);float ray=exp(-abs(vCorner.x*vCorner.y)*110.)*(1.-r)*.17;float twinkle=.72+.28*sin(uTime*.9+vPhase);float a=(halo*.68+core*.75+ray)*twinkle;gl_FragColor=vec4(vTint*(1.15+uGreeting*.2),a);}`});
 const starlight=new T.SkinnedMesh(sparkGeometry,sparkMaterial);starlight.frustumCulled=false;figure.add(starlight);starlight.bind(skeleton,mesh.bindMatrix);
 figure.position.set(.19,-.12,0);figure.scale.setScalar(1.07);

 const ringsMaterial=new T.MeshBasicMaterial({color:'#61E0CA',transparent:true,opacity:.32,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const platform=new T.Group();platform.position.y=-1.60;scene.add(platform);
 for(const [radius,thickness]of [[.89,.006],[1.1,.003]]){const ring=new T.Mesh(new T.TorusGeometry(radius,thickness,5,100),ringsMaterial);ring.rotation.x=Math.PI/2;platform.add(ring);}
 const orbitMaterial=new T.MeshBasicMaterial({color:'#9B87FF',transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false});
 const orbit=new T.Mesh(new T.TorusGeometry(1.16,.003,4,120,Math.PI*1.72),orbitMaterial);orbit.rotation.set(1.16,.18,-.3);orbit.position.set(.15,.1,-.14);scene.add(orbit);
 const haloMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){vec2 p=(vUv-.5)*vec2(2.5,2.);float a=exp(-dot(p,p)*4.5)*.075;gl_FragColor=vec4(.23,.72,.83,a);}'});
 const halo=new T.Mesh(new T.PlaneGeometry(3.7,4.5),haloMaterial);halo.position.set(.12,.05,-.32);scene.add(halo);

 let greeting=-1.1,disposed=false;
 const approach=(object,key,target,blend)=>object[key]+=(target-object[key])*blend;
 function greet(time){greeting=time-1.05;}
 function update(time,dt,pointer){
  const quiet=reduced(),clock=quiet?0:time;if(!quiet&&clock-greeting>12)greeting=clock;
  const age=Math.max(0,clock-greeting),lift=quiet?1:smooth(age/.85)*(1-smooth((age-4.05)/1.15)),envelope=quiet?0:smooth((age-.65)/.4)*(1-smooth((age-3.5)/.65)),wave=Math.sin(age*5.4)*envelope,blend=dt>0?1-Math.exp(-dt*9):1;
  const arm=arms[0];approach(arm.shoulder.rotation,'z',-.12-1.98*lift+wave*.075,blend);approach(arm.elbow.rotation,'z',-.07-.59*lift+wave*.16,blend);approach(arm.wrist.rotation,'z',wave*.26,blend);
  for(const [i,{digit,tip}]of arm.fingers.entries()){digit.rotation.x=.035+wave*.022;tip.rotation.x=.045+Math.sin(clock*1.5+i)*.025;}
  arms[1].shoulder.rotation.z=.11+Math.sin(clock*.6)*.012;arms[1].elbow.rotation.x=-.06;
  hips.rotation.z=Math.sin(clock*.43)*.009;spine.rotation.x=Math.sin(clock*.8)*.007;chest.rotation.y=Math.sin(clock*.32)*.035;head.rotation.y=(quiet?0:pointer.x*.12)+Math.sin(clock*.29)*.045;head.rotation.z=-.025*lift;
  figure.rotation.y=(quiet?0:pointer.x*.09)+Math.sin(clock*.24)*.075;figure.position.y=-.12+Math.sin(clock*.75)*.022;
  sparkMaterial.uniforms.uTime.value=clock;sparkMaterial.uniforms.uGreeting.value=envelope;ringsMaterial.opacity=.28+Math.sin(clock*.7)*.045;orbit.rotation.z=-.3+Math.sin(clock*.18)*.07;
  camera.lookAt(-.02,.23,0);
 }
 function dispose(){if(disposed)return;disposed=true;skeleton.dispose();}
 return {update,greet,dispose};
}
