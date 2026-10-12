import {icon} from './icons.js';
import {t,lang,setLang} from './i18n.js';
export {icon,t,lang,setLang};
export const state={...window.MYO_BOOT,public:null,dashboard:null,route:{},navigate:null,cleanup:[],modalCleanup:null};
export const $=(selector,root=document)=>root.querySelector(selector);
export const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const asset=p=>`${state.base}/${String(p||'').replace(/^\//,'')}`;
export const href=(page,params={})=>`${state.base}/index.php?${new URLSearchParams({page,...params})}`;
export const go=(page,params={},flight=false)=>state.navigate(page,params,flight);
export const fmtDate=(v,full=false)=>v?new Date(String(v).replace(' ','T')).toLocaleDateString(lang()==='en'?'en-GB':'ru-RU',{day:'numeric',month:'short',...(full?{year:'numeric'}:{})}):'—';
export const initials=v=>String(v||'M').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
export const special=s=>t(({myotherapist:'Миотерапевт',orthodontist:'Ортодонт',ent:'ЛОР',osteopath:'Остеопат',kinesiologist:'Кинезиолог',neurologist:'Невролог'})[s]||'Специалист');
export const statusLabel=s=>t(({pending:'На проверке',approved:'Подтверждено',retry:'Повторить с подсказкой',active:'Открыто',paused:'Приостановлено',completed:'Завершено',arrived:'Приём состоялся',missed:'Не пришёл',requested:'Запрос пациента'})[s]||s||'Новая миссия');
export const badge=(text,kind='')=>`<span class="badge ${esc(kind)}">${esc(text)}</span>`;
export const button=(text,action,ic='arrow',cls='btn',attrs='')=>`<button type="button" class="${cls}" ${action?`data-action="${esc(action)}"`:''} ${attrs}>${esc(t(text))}${icon(ic)}</button>`;
export const navLink=(text,page,ic='arrow',cls='btn',params={})=>`<a class="${cls}" data-nav="${esc(page)}" href="${href(page,params)}" ${Object.entries(params).map(([k,v])=>`data-${k.replace(/_/g,'-')}="${esc(v)}"`).join(' ')}>${esc(t(text))}${icon(ic)}</a>`;
export const empty=(title,text,ic='orbit')=>`<div class="empty-state">${icon(ic)}<h3>${esc(t(title))}</h3><p>${esc(t(text))}</p></div>`;
export const field=(label,name,value='',type='text',attrs='')=>`<label class="field"><span>${esc(t(label))}</span><input name="${esc(name)}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
export const textarea=(label,name,value='',attrs='')=>`<label class="field"><span>${esc(t(label))}</span><textarea name="${esc(name)}" ${attrs}>${esc(value)}</textarea></label>`;
export const select=(label,name,options,value='',attrs='')=>`<label class="field"><span>${esc(t(label))}</span><select name="${esc(name)}" ${attrs}>${options.map(([v,l])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(t(l))}</option>`).join('')}</select></label>`;
export const check=(label,name,checked=false)=>`<label class="check-field"><input type="checkbox" name="${esc(name)}" ${checked?'checked':''}><span class="check-box">${icon('check')}</span><span>${esc(t(label))}</span></label>`;
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
 $$('.tilt').forEach(el=>{el.addEventListener('pointermove',e=>{if(document.documentElement.dataset.motion==='off')return;const r=el.getBoundingClientRect();el.style.setProperty('--rx',`${-(e.clientY-r.top-r.height/2)/r.height*7}deg`);el.style.setProperty('--ry',`${(e.clientX-r.left-r.width/2)/r.width*10}deg`);});el.addEventListener('pointerleave',()=>{el.style.setProperty('--rx','0deg');el.style.setProperty('--ry','0deg');});});
 $$('.star-canvas').forEach(startStars);
}
function startStars(canvas){
 const ctx=canvas.getContext('2d');if(!ctx)return;let frame=0,raf=0,width=1,height=1;
 const particles=Array.from({length:95},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.6+.3,s:Math.random()*.3+.05}));
 const resize=()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;canvas.width=width*Math.min(devicePixelRatio,2);canvas.height=height*Math.min(devicePixelRatio,2);ctx.setTransform(Math.min(devicePixelRatio,2),0,0,Math.min(devicePixelRatio,2),0,0);};
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 const draw=()=>{ctx.clearRect(0,0,width,height);particles.forEach(p=>{const alpha=.3+Math.sin(frame*.01+p.x*12)*.25;ctx.fillStyle=`rgba(221,227,243,${alpha})`;ctx.beginPath();ctx.arc(p.x*width,(p.y*height+frame*p.s*.04)%height,p.r,0,Math.PI*2);ctx.fill();});frame++;if(document.documentElement.dataset.motion!=='off')raf=requestAnimationFrame(draw);};draw();
 state.cleanup.push(()=>{cancelAnimationFrame(raf);ro.disconnect();});
}
