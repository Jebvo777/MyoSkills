import {icon} from './icons.js?v=20261022-starchild';
import {t,lang,setLang} from './i18n.js?v=20261022-starchild';
export {icon,t,lang,setLang};
export const state={...window.MYO_BOOT,public:null,dashboard:null,route:{},navigate:null,cleanup:[],modalCleanup:null};
export const $=(selector,root=document)=>root.querySelector(selector);
export const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const asset=p=>{const path=String(p||'').replace(/^\//,'');return `${state.base}/${path}${path.startsWith('assets/')?`${path.includes('?')?'&':'?'}v=${encodeURIComponent(state.asset_version||'20261022-starchild')}`:''}`;};
export const href=(page,params={})=>`${state.base}/index.php?${new URLSearchParams({page,...params})}`;
export const go=(page,params={},flight=false)=>state.navigate(page,params,flight);
export const fmtDate=(v,full=false)=>v?new Date(String(v).replace(' ','T')).toLocaleDateString(lang()==='en'?'en-GB':'ru-RU',{day:'numeric',month:'short',...(full?{year:'numeric'}:{})}):'—';
export const initials=v=>String(v||'M').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
export const special=s=>t(({myotherapist:'Миотерапевт',orthodontist:'Ортодонт',ent:'ЛОР',osteopath:'Остеопат',kinesiologist:'Кинезиолог',neurologist:'Невролог'})[s]||'Специалист');
export const statusLabel=s=>t(({pending:'На проверке',approved:'Подтверждено',retry:'Повторить с подсказкой',active:'Открыто',paused:'Приостановлено',completed:'Завершено',arrived:'Приём состоялся',missed:'Не пришёл',requested:'Запрос пациента'})[s]||s||'Новая миссия');
export const badge=(text,kind='')=>`<span class="badge ${esc(kind)}">${esc(text)}</span>`;
export const button=(text,action,ic='arrow',cls='btn',attrs='')=>`<button type="button" class="${cls}" ${action?`data-action="${esc(action)}"`:''} ${attrs}>${esc(t(text))}${icon(ic)}</button>`;
export const navLink=(text,page,ic='arrow',cls='btn',params={})=>`<a class="${cls}" data-nav="${esc(page)}" href="${href(page,params)}" ${Object.entries(params).map(([k,v])=>`data-${k.replace(/_/g,'-')}="${esc(v)}"`).join(' ')}>${esc(t(text))}${icon(ic)}</a>`;
const emptyArt={rocket:'route-observatory',book:'route-observatory',video:'video-relay',people:'care-constellation',image:'orbital-medical-station'};
export const empty=(title,text,ic='orbit')=>`<div class="empty-state">${emptyArt[ic]?`<img class="empty-illustration" src="${asset('assets/images/'+emptyArt[ic]+'.webp')}" alt="" loading="lazy">`:icon(ic)}<h3>${esc(t(title))}</h3><p>${esc(t(text))}</p></div>`;
export const field=(label,name,value='',type='text',attrs='')=>{
 const password=type==='password',hint=password&&(/new-password|minlength=/.test(attrs));
 const id=`field-${name.replace(/[^a-z0-9_-]/gi,'-')}`,placeholder=/placeholder=/.test(attrs)?'':' placeholder=" "';
 const input=`<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${attrs}${placeholder}${hint?` aria-describedby="${id}-hint"`:''}>`;
 return `<label class="field"><span>${esc(t(label))}</span>${password?`<span class="input-wrap password-wrap">${input}<button type="button" data-action="password-visibility" class="password-visibility" aria-label="${t('Показать пароль')}" aria-pressed="false">${icon('eye-off')}</button></span>`:input}${hint?`<small id="${id}-hint" class="password-hint">${t('Не менее 10 символов')}</small>`:''}</label>`;
};
export const textarea=(label,name,value='',attrs='')=>`<label class="field"><span>${esc(t(label))}</span><textarea name="${esc(name)}" ${attrs}>${esc(value)}</textarea></label>`;
export const select=(label,name,options,value='',attrs='')=>`<label class="field"><span>${esc(t(label))}</span><select name="${esc(name)}" ${attrs}>${options.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t(l))}</option>`).join('')}</select></label>`;
export const check=(label,name,checked=false,kind='check')=>`<label class="check-field ${kind==='switch'?'switch-field':''}"><input type="checkbox" name="${esc(name)}" ${kind==='switch'?'role="switch"':''} ${checked?'checked':''}><span class="check-box" aria-hidden="true"></span><span>${esc(t(label))}</span></label>`;
export const formData=form=>{const fd=new FormData(form);const d=Object.fromEntries(fd.entries());for(const box of $$('input[type=checkbox]',form)) d[box.name]=box.checked;return d;};

export function toast(message,kind='success'){
 const el=document.createElement('div');el.className=`toast ${kind}`;el.setAttribute('role',kind==='error'?'alert':'status');el.innerHTML=`${icon(kind==='error'?'close':'check')}<span>${esc(t(message))}</span>`;$('#toast-stack').append(el);setTimeout(()=>el.remove(),6500);
}
export async function api(action,data=null,params={}){
 const query=new URLSearchParams({action,...params});
 const options={credentials:'same-origin',headers:{'Accept':'application/json'}};
 if(data!==null){options.method='POST';options.headers['X-CSRF-Token']=state.csrf;options.headers['Content-Type']='application/json';options.body=JSON.stringify(data);}
 const response=await fetch(asset(`api.php?${query}`),options);
 let body;try{body=await response.json();}catch{throw new Error(t('Сервер вернул некорректный ответ'));}
 if(!response.ok||!body.ok){if(response.status===401&&state.user){state.user=null;go('login');}throw new Error(body.error||t('Не удалось выполнить действие'));}
 if(body.data?.csrf)state.csrf=body.data.csrf;
 return body.data;
}
export function upload(file,category,extra={},progress=()=>{}){
 return new Promise((resolve,reject)=>{
  const fd=new FormData();fd.append('file',file,file.name||'recording.webm');fd.append('category',category);Object.entries(extra).forEach(([k,v])=>fd.append(k,v));
  const xhr=new XMLHttpRequest();xhr.open('POST',asset('api.php?action=upload'));xhr.setRequestHeader('X-CSRF-Token',state.csrf);xhr.responseType='json';
  xhr.upload.onprogress=e=>{if(e.lengthComputable)progress(Math.round(e.loaded/e.total*100));};
  xhr.onerror=()=>reject(new Error(t('Соединение прервалось. Повторите загрузку.')));
  xhr.onload=()=>{const b=xhr.response;if(xhr.status>=200&&xhr.status<300&&b?.ok)resolve(b.data);else reject(new Error(b?.error||t('Не удалось загрузить файл')));};xhr.send(fd);
 });
}
export async function busy(el,fn){
 if(el?.disabled)return;const original=el?.innerHTML;if(el){el.disabled=true;el.classList.add('is-loading');}
 try{return await fn();}catch(e){toast(e.message,'error');return null;}finally{if(el?.isConnected){el.disabled=false;el.classList.remove('is-loading');el.innerHTML=original;}}
}
export function modal(title,content,wide=false){
 closeModal();const dialog=$('#modal');dialog.classList.toggle('wide',wide);$('#modal-content').innerHTML=`<div class="modal-head"><h2>${esc(t(title))}</h2>${button('Закрыть','modal-close','close','icon-btn')}</div>${content}`;dialog.showModal();
 setTimeout(()=>$('#modal input, #modal textarea, #modal button')?.focus(),30);
}
export function closeModal(){if(state.modalCleanup){state.modalCleanup();state.modalCleanup=null;}if($('#modal')?.open)$('#modal').close();}
export function cardDoctor(d,action='doctor-contact'){
 return `<article class="specialist-card"><div class="doctor-avatar" style="--avatar-hue:${Number(d.id)%2?265:167}">${esc(initials(d.name))}<span>${icon('shield')}</span></div><div><span class="eyebrow">${esc(special(d.specialty))}</span><h3>${esc(d.name)}</h3><p>${esc(d.city)}${d.clinic?' · '+esc(d.clinic):''}</p><p class="subtle small">${esc(d.about||'')}</p></div><footer>${badge(t('Профиль подтверждён'),'mint')}${button('Подробнее',action,'arrowup','icon-text',`data-id="${d.id}"`)}</footer></article>`;
}
export function planetImage(p,cls=''){return `<img class="planet-image ${cls}" src="${asset(p.image)}" alt="${esc(p.title)}" loading="lazy" draggable="false">`;}
export function pageHead(eyebrow,title,description='',actions=''){return `<header class="page-head"><div><span class="eyebrow">${esc(t(eyebrow))}</span><h1>${esc(t(title))}</h1>${description?`<p>${esc(t(description))}</p>`:''}</div><div class="page-actions">${actions}</div></header>`;}

export function baseEffects(){
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.08});
 $$('.reveal').forEach(el=>observer.observe(el));state.cleanup.push(()=>observer.disconnect());
 $$('.tilt').forEach(el=>{
  let raf=0,last=0,rx=0,ry=0,tx=0,ty=0;
  const tick=now=>{raf=0;if(!el.isConnected||document.documentElement.dataset.motion==='off')return;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;const blend=1-Math.exp(-dt*8);rx+=(tx-rx)*blend;ry+=(ty-ry)*blend;el.style.setProperty('--rx',`${rx.toFixed(3)}deg`);el.style.setProperty('--ry',`${ry.toFixed(3)}deg`);if(Math.abs(tx-rx)+Math.abs(ty-ry)>.015)raf=requestAnimationFrame(tick);};
  const run=()=>{if(!raf){last=performance.now();raf=requestAnimationFrame(tick);}};
  const move=e=>{if(e.pointerType==='touch'||document.documentElement.dataset.motion==='off')return;const r=el.getBoundingClientRect();tx=-(e.clientY-r.top-r.height/2)/r.height*3;ty=(e.clientX-r.left-r.width/2)/r.width*4;run();};
  const leave=()=>{tx=ty=0;run();};el.addEventListener('pointermove',move,{passive:true});el.addEventListener('pointerleave',leave);state.cleanup.push(()=>{cancelAnimationFrame(raf);el.removeEventListener('pointermove',move);el.removeEventListener('pointerleave',leave);});
 });
 $$('.star-canvas').forEach(startStars);
}
function startStars(canvas){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const global=canvas.dataset.starfield==='global';let raf=0,width=1,height=1,last=0,disposed=false;
 const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
 const particles=Array.from({length:global?155:65},(_,i)=>({x:random(i*6+1),y:random(i*6+2),r:random(i*6+3)*(global?.85:.9)+.25,phase:random(i*6+4)*6.28,speed:random(i*6+5)*.3+.16}));
 const resize=()=>{const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);const ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=width*ratio;canvas.height=height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);draw(performance.now(),true);};
 function draw(time=0,force=false){
  if(disposed)return;if(force&&raf)cancelAnimationFrame(raf);raf=0;
  const moving=document.documentElement.dataset.motion!=='off';
  if(!force&&time-last<32){raf=requestAnimationFrame(draw);return;}last=time;const phase=moving?time/1000:0;
  ctx.clearRect(0,0,width,height);
  if(global){ctx.beginPath();particles.slice(0,27).forEach((p,i)=>{particles.slice(i+1,27).forEach(q=>{if(Math.hypot(p.x-q.x,p.y-q.y)<.12){ctx.moveTo(p.x*width,p.y*height);ctx.lineTo(q.x*width,q.y*height);}});});ctx.strokeStyle='rgba(97,224,202,.035)';ctx.lineWidth=.65;ctx.stroke();}
  particles.forEach(p=>{const alpha=.1+(Math.sin(phase*p.speed+p.phase)*.5+.5)*.42,x=p.x*width,y=p.y*height;
   if(global&&p.r>1.15){const glow=ctx.createRadialGradient(x,y,0,x,y,p.r*6);glow.addColorStop(0,`rgba(97,225,202,${alpha*.45})`);glow.addColorStop(1,'rgba(97,225,202,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,p.r*6,0,Math.PI*2);ctx.fill();}
   ctx.fillStyle=`rgba(${p.phase>4.9?'238,214,157':'169,219,231'},${alpha})`;ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();
  });
  if(moving&&!document.hidden)raf=requestAnimationFrame(draw);
 }
 const ro=new ResizeObserver(resize);ro.observe(canvas);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else draw(performance.now(),true);};document.addEventListener('visibilitychange',visibility);resize();
 state.cleanup.push(()=>{disposed=true;cancelAnimationFrame(raf);ro.disconnect();document.removeEventListener('visibilitychange',visibility);});
}
