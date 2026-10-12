precision highp float;
uniform vec2 uViewport;
uniform vec2 uPointer;
uniform float uTime;
uniform float uHero;
uniform float uSelected;
uniform vec4 uRocket;
uniform vec3 uColors[6];
const float PI=3.14159265;
mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec2 pointFor(int i){
 if(i==0)return vec2(.19,.75);if(i==1)return vec2(.51,.84);
 if(i==2)return vec2(.82,.68);if(i==3)return vec2(.74,.28);
 if(i==4)return vec2(.40,.17);return vec2(.15,.33);
}
vec3 centerFor(int i){vec2 p=pointFor(i)*2.0-1.0;return vec3(p.x*(uViewport.x/uViewport.y)*5.8,p.y*5.8,0.0);}
float sphere(vec3 ro,vec3 rd,vec3 center,float radius){
 vec3 q=ro-center;float b=dot(q,rd),d=b*b-dot(q,q)+radius*radius;
 if(d<0.0)return 1000.0;float t=-b-sqrt(d);return t>0.0?t:1000.0;
}
vec3 ringSpace(vec3 p,vec3 c,float id){p-=c;p.xy=turn(.25+id*.29+uPointer.x*.12)*p.xy;p.yz=turn(.88+uPointer.y*.18)*p.yz;return p;}
float torus(vec3 p,vec3 c,float major,float tube,float id){p=ringSpace(p,c,id);return length(vec2(length(p.xz)-major,p.y))-tube;}
float ringTrace(vec3 ro,vec3 rd,vec3 c,float major,float tube,float id){
 float t=sphere(ro,rd,c,major+tube+.025);if(t>100.0)return 1000.0;
 float start=t;
 for(int j=0;j<32;j++){float d=torus(ro+rd*t,c,major,tube,id);if(d<.0025)return t;t+=max(d,.003);if(t-start>major*2.2)break;}
 return 1000.0;
}
vec3 ringNormal(vec3 p,vec3 c,float major,float tube,float id){
 float e=.002;return normalize(vec3(torus(p+vec3(e,0,0),c,major,tube,id)-torus(p-vec3(e,0,0),c,major,tube,id),torus(p+vec3(0,e,0),c,major,tube,id)-torus(p-vec3(0,e,0),c,major,tube,id),torus(p+vec3(0,0,e),c,major,tube,id)-torus(p-vec3(0,0,e),c,major,tube,id)));
}
float grain(vec3 p){return sin(p.x*8.0+sin(p.z*5.0))*sin(p.y*6.0+sin(p.x*3.0))*.5+.5;}
vec3 planetSkin(vec3 p,vec3 c,float radius,int id){
 vec3 n=(p-c)/radius;n.xz=turn(uTime*.08+uPointer.x*.3+float(id))*n.xz;
 vec3 color=uColors[id];float g=grain(n*1.9),stripe=sin(n.y*22.0+g*4.0)*.5+.5;
 if(id==0)color=mix(color,vec3(.9,.87,1.0),smoothstep(.57,.82,g)*.55);
 if(id==1)color=mix(color,vec3(.86,1.0,.98),smoothstep(.35,.78,stripe)*.65);
 if(id==2)color=mix(color,vec3(.48,.30,.85),smoothstep(.6,.84,g)*.42);
 if(id==3)color=mix(color,vec3(.94,.98,1.0),pow(stripe,6.0)*.5);
 if(id==4)color=mix(color,vec3(.55,.32,.15),smoothstep(.64,.84,g)*.26);
 if(id==5)color=mix(color,vec3(.99,.82,.95),smoothstep(.4,.74,g)*.55);
 return color;
}
float ellipsoid(vec3 ro,vec3 rd,vec3 c,vec3 scale,float angle){
 vec3 q=ro-c,d=rd;q.xy=turn(angle)*q.xy;d.xy=turn(angle)*d.xy;q/=scale;d/=scale;
 float a=dot(d,d),b=dot(q,d),disc=b*b-a*(dot(q,q)-1.0);if(disc<0.0)return 1000.0;
 float t=(-b-sqrt(disc))/a;return t>0.0?t:1000.0;
}
void main(){
 vec2 uv=gl_FragCoord.xy/uViewport;float aspect=uViewport.x/uViewport.y;
 vec3 ro=vec3(0.0,0.0,10.0),rd=normalize(vec3((uv*2.0-1.0)*vec2(aspect,1.0)*.58,-1.0));
 float best=1000.0,radius=.70,kind=0.0,major=.97,tube=.037;int index=1;vec3 center=vec3(0.0);
 for(int i=0;i<6;i++){
  if(uHero>.5&&abs(float(i)-uSelected)>.2)continue;
  vec3 c=uHero>.5?vec3(0.0,.12,0.0):centerFor(i);float r=uHero>.5?2.05:.70;
  float s=sphere(ro,rd,c,r);if(s<best){best=s;kind=0.0;index=i;center=c;radius=r;}
  float ma=uHero>.5?2.78:.98,tu=uHero>.5?.09:.037;
  float ring=ringTrace(ro,rd,c,ma,tu,float(i));
  if(ring<best){best=ring;kind=1.0;index=i;center=c;major=ma;tube=tu;}
  if(uHero>.5){float outer=ringTrace(ro,rd,c,3.13,.025,1.0);if(outer<best){best=outer;kind=1.0;index=1;center=c;major=3.13;tube=.025;}}
 }
 vec3 color=vec3(0.0),light=normalize(vec3(-.5,.75,1.0));float alpha=0.0;
 if(best<100.0){
  vec3 p=ro+rd*best,n=kind>.5?ringNormal(p,center,major,tube,float(index)):normalize(p-center);
  vec3 base=kind>.5?mix(vec3(.45,.34,.91),vec3(.72,.65,1.0),.25+sin(uTime*.22)*.12):planetSkin(p,center,radius,index);
  float diffuse=max(dot(n,light),0.0),rim=pow(1.0-max(dot(n,-rd),0.0),3.0);
  float shine=pow(max(dot(reflect(-light,n),-rd),0.0),48.0);
  color=base*(.25+diffuse*.78)+vec3(.94,.97,1.0)*shine*.48+uColors[index]*rim*.30;
  if(kind<.5){
   vec3 q=(p-center)/radius;q.xz=turn(uTime*.08+float(index))*q.xz;
   float longitude=atan(q.z,q.x),latitude=asin(clamp(q.y,-1.0,1.0));
   float mesh=1.0-smoothstep(.04,.13,min(abs(sin(longitude*18.0)),abs(sin(latitude*14.0))));
   color=uColors[index]*(.10+diffuse*.17+mesh*.85)+uColors[index]*rim*.62;
   alpha=.26+.74*max(mesh,rim*.65);
  }
  if(uHero<.5&&abs(float(index)-uSelected)<.2)color+=uColors[index]*rim*.3;
  if(kind>.5)alpha=1.0;
 }
 if(uHero<.5&&uRocket.w>.01){
  vec2 rpos=uRocket.xy*2.0-1.0;vec3 c=vec3(rpos.x*aspect*5.8,rpos.y*5.8,1.0);
  float rocket=ellipsoid(ro,rd,c,vec3(.11,.28,.12),uRocket.z);
  vec2 tail=turn(-uRocket.z)*vec2(0.0,-.30);vec3 flameC=c+vec3(tail,0.0);
  float flame=ellipsoid(ro,rd,flameC,vec3(.065,.16,.065),uRocket.z);
  if(rocket<best){vec3 p=ro+rd*rocket,q=p-c;q.xy=turn(uRocket.z)*q.xy;vec3 n=normalize(q/vec3(.0121,.0784,.0144));float window=1.0-smoothstep(.07,.105,length(q.xy-vec2(0.0,.05)));vec3 base=mix(vec3(.94,.95,1.0),vec3(.18,.21,.34),window);color=base*(.4+.65*max(dot(n,light),0.0));alpha=1.0;best=rocket;}
  if(flame<best){color=vec3(.38,.89,.80)*(1.0+sin(uTime*12.0)*.12);alpha=.92;}
 }
 if(alpha<.01){
  vec2 p=uv-.5;float glow=exp(-dot(p,p)*9.0)*.085;
  color=mix(vec3(.45,.34,.91),vec3(.38,.89,.80),uv.y);alpha=glow;
 }
 gl_FragColor=vec4(color,alpha);
}
