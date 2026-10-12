import {state,$,$$,esc,asset,href,icon,t,lang,setLang,api,go,toast,busy,modal,closeModal,upload,button,navLink,badge,field,textarea,select,check,formData,initials,fmtDate,special,statusLabel,baseEffects} from './core.js?v=20261012-cockpit';
import {localizeStatic} from './i18n.js?v=20261012-cockpit';
import {landing,directory,authView,infoView,defaultPlanets} from './views-public.js?v=20261012-cockpit';
import {dashboardView,galaxyView,patientPlanetDetail,missionView,diaryView,progressView,teamView,messagesView,profileView} from './views-patient.js?v=20261012-cockpit';
import {doctorView,patientRecordView,adminView} from './views-clinical.js?v=20261012-cockpit';
import {selectStory} from './views-extra.js?v=20261012-cockpit';
import {initSpace,focusPlanet} from './space.js?v=20261012-cockpit';

const protectedPages=['dashboard','galaxy','mission','diary','progress','team','messages','profile','doctor','patient','admin'];
let renderSequence=0;
const routeFromLocation=()=>Object.fromEntries(new URLSearchParams(location.search));
function resetPage(){state.cleanup.splice(0).forEach(fn=>fn());if(state.recorder)stopRecorder();closeModal();}
function applyMotion(){const saved=localStorage.getItem('myo-motion');document.documentElement.dataset.motion=saved||(state.user?.preferences?.reduced_motion||matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on');}
state.navigate=async(page,params={},flight=false)=>{
 if(flight&&document.documentElement.dataset.motion!=='off'){$('#flight').classList.add('active');await new Promise(r=>setTimeout(r,800));$('#flight').classList.remove('active');}
 history.pushState({},'',href(page,params));await render({page,...params});window.scrollTo({top:0,behavior:'instant'});
};
async function render(route=routeFromLocation()){
 const seq=++renderSequence;resetPage();route.page||='home';state.route=route;setLang(lang());applyMotion();
 if(protectedPages.includes(route.page)&&!state.user){history.replaceState({},'',href('login'));state.route={page:'login'};route=state.route;}
 if(state.user&&['login','register'].includes(route.page)){history.replaceState({},'',href(homeForRole()));route={page:homeForRole()};state.route=route;}
 document.body.dataset.page=route.page;document.body.dataset.role=state.user?.role||'visitor';
 $('#app').classList.add('rendering');let html;
 try{
  switch(route.page){
   case 'home':html=landing();break;
   case 'specialists':html=directory();break;
   case 'login':case 'register':case 'forgot':case 'reset':html=authView(route.page,route);break;
   case 'dashboard':html=await dashboardView();break;
   case 'galaxy':html=await galaxyView();break;
   case 'mission':html=await missionView(route);break;
   case 'diary':html=await diaryView(route);break;
   case 'progress':html=await progressView();break;
   case 'team':html=await teamView();break;
   case 'messages':html=await messagesView(route);break;
   case 'profile':html=await profileView();break;
   case 'doctor':html=await doctorView(route);break;
   case 'patient':html=await patientRecordView(route);break;
   case 'admin':html=await adminView(route);break;
   default:html=infoView(route.page);
  }
  if(seq!==renderSequence)return;
  $('#app').innerHTML=html;$('#app').classList.remove('rendering');localizeStatic($('#app'));baseEffects();initSpace();bindPage(route);document.title=`MyoSkills · ${$('#main-content h1')?.textContent?.replace(/\s+/g,' ').trim()||t('Твой навык. Твоя галактика.')}`;
 }catch(e){
  if(seq!==renderSequence)return;
  $('#app').innerHTML=`<main class="public-page"><a class="brand" data-nav="home" href="${href('home')}">${icon('orbit')}MyoSkills</a><div class="empty-state" style="margin-top:80px">${icon('orbit')}<h1>${t('Не удалось открыть раздел')}</h1><p>${esc(e.message)}</p><div style="margin-top:25px">${navLink('Вернуться','home','back','btn btn-purple')}</div></div></main>`;$('#app').classList.remove('rendering');toast(e.message,'error');
 }
}
function homeForRole(){return state.user?.role==='doctor'?'doctor':state.user?.role==='admin'?'admin':'dashboard';}
function bindPage(route){
 if(route.page==='galaxy')$('#patient-planet-detail').innerHTML=patientPlanetDetail(state.dashboard.planets.find(p=>p.slug==='breathing')?.id||1);
 if(route.page==='mission'){
  setupTimer(state.mission.duration_seconds);
  const example=$('#example-video');
  if(example){
   example.insertAdjacentHTML('afterend',button('Голосовой спутник','voice-guide','volume','voice-guide',`aria-pressed="${Boolean(state.user?.preferences?.voice_instructions)}"`));
   example.addEventListener('ended',()=>{const message=t('Теперь твоя очередь выполнить упражнение');toast(message);if(state.user?.preferences?.voice_instructions&&window.speechSynthesis&&window.SpeechSynthesisUtterance){window.speechSynthesis.cancel();const speech=new window.SpeechSynthesisUtterance(message);speech.lang=lang()==='en'?'en-US':'ru-RU';window.speechSynthesis.speak(speech);}});
   state.cleanup.push(()=>window.speechSynthesis?.cancel());
  }
  const drop=$('#video-dropzone');drop?.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('dragging');});drop?.addEventListener('dragleave',()=>drop.classList.remove('dragging'));drop?.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer.files[0])selectVideo(e.dataTransfer.files[0]);});
 }
 if(route.page==='messages')$('#chat-stream')?.scrollTo(0,$('#chat-stream').scrollHeight);
 if(route.page==='profile'&&state.user.role==='patient')api('dashboard').then(d=>{if($('#access-code'))$('#access-code').textContent=d.patient.access_code;}).catch(e=>toast(e.message,'error'));
 if(route.page==='specialists')filterSpecialists();
}

document.addEventListener('click',async e=>{
 const link=e.target.closest('[data-nav]');
 if(link){e.preventDefault();const {nav,...ds}=link.dataset;const params={};for(const [k,v]of Object.entries(ds))if(v)params[k.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())]=v;await go(nav,params);return;}
 const scroll=e.target.closest('[data-scroll]');if(scroll){e.preventDefault();if(state.route.page!=='home')await go('home');$('#'+scroll.dataset.scroll)?.scrollIntoView({behavior:document.documentElement.dataset.motion==='off'?'instant':'smooth'});return;}
 const el=e.target.closest('[data-action]');if(!el)return;
 const d=el.dataset;
 switch(d.action){
  case 'language':setLang(lang()==='ru'?'en':'ru');render(state.route);break;
  case 'motion':localStorage.setItem('myo-motion',document.documentElement.dataset.motion==='off'?'on':'off');applyMotion();toast(document.documentElement.dataset.motion==='off'?'Движение отключено':'Движение включено');render(state.route);break;
  case 'modal-close':closeModal();break;
  case 'sidebar-toggle':$('.sidebar')?.classList.toggle('open');break;
  case 'mobile-menu':modal('Главная',`<nav class="mobile-menu-list">${['home','specialists','about','contacts','tools','pricing'].map((p,i)=>navLink(['Главная','Специалисты','О сервисе','Контакты','Инструменты','Тарифы'][i],p,'arrow','icon-text')).join('')}</nav>`);break;
  case 'logout':await busy(el,async()=>{await api('auth.logout',{});state.user=null;state.dashboard=null;go('home');});break;
  case 'demo-login':await busy(el,async()=>{const r=await api('auth.login',{email:d.email,password:'MyoDemo!2026'});state.user=r.user;go(homeForRole());});break;
  case 'planet-select':selectPlanet(Number(d.id));break;
  case 'doctor-contact':showDoctor(Number(d.id));break;
  case 'request-doctor':await busy(el,async()=>{await api('team.request',{doctor_id:Number(d.id)});closeModal();toast('Запрос отправлен');});break;
  case 'geolocation':geolocation(el);break;
  case 'notifications':showNotifications();break;
  case 'notification-open':await busy(el,async()=>{await api('notifications.read',{id:Number(d.id)});closeModal();const target=new URL(d.link||'?page=dashboard',location.href);const params=Object.fromEntries(target.searchParams);const page=params.page||homeForRole();delete params.page;go(page,params);});break;
  case 'notifications-read':await busy(el,async()=>{await api('notifications.read',{});showNotifications();});break;
  case 'command':showCommand();break;
  case 'view-video':modal('Видео',`<video controls autoplay playsinline src="${asset('media.php?id='+Number(d.media))}"></video>`,true);break;
  case 'view-photo':modal('Фотопротокол',`<img class="lightbox" src="${asset('media.php?id='+Number(d.media))}" alt="${t('Фотопротокол')}"><p class="photo-note" data-user-content>${esc(d.caption||'')}</p>`,true);break;
  case 'timer-toggle':state.timer?.toggle(el);break;
  case 'timer-reset':state.timer?.reset();break;
  case 'practice-complete':await busy(el,async()=>{const r=await api('practice.complete',{assignment_id:Number(d.id)});toast(r.awarded?'+10 FL · '+t('Занятие отмечено'):'Занятие уже отмечено сегодня');go('mission',{id:d.id});});break;
  case 'remove-video':removeVideo();break;
  case 'record-video':recordVideo();break;
  case 'record-start':state.recorder?.start();break;
  case 'record-stop':state.recorder?.stop();break;
  case 'record-use':if(state.recordedFile){selectVideo(state.recordedFile);closeModal();}break;
  case 'record-again':recordVideo();break;
  case 'submit-video':submitVideo(el);break;
  case 'report-send':await busy(el,async()=>{await api('report.send',{period:d.period});toast('Отчёт отправлен команде врачей');});break;
  case 'add-patient':showAddPatient();break;
  case 'add-visit':showVisit();break;
  case 'refer-patient':showReferral();break;
  case 'referral-respond':await busy(el,async()=>{await api('referral.respond',{id:Number(d.id),status:d.status});toast('Данные сохранены');render(state.route);});break;
  case 'patient-request':await busy(el,async()=>{await api('doctor.request.respond',{id:Number(d.id),accept:d.accept==='1'});toast('Данные сохранены');render(state.route);});break;
  case 'assign-exercise':showAssignment(Number(d.id));break;
  case 'review-submission':showReview(Number(d.id));break;
  case 'upload-photo':showFileUpload('photo',Number(d.patientId||state.patientRecord?.patient.user_id));break;
  case 'upload-document':showFileUpload('document',Number(d.patientId||state.patientRecord?.patient.user_id));break;
  case 'upload-diploma':showFileUpload('diploma');break;
  case 'upload-site':showFileUpload('site');break;
  case 'upload-visit-file':showFileUpload('document',Number(d.patientId),Number(d.visitId));break;
  case 'document-visibility':await busy(el,async()=>{await api('document.visibility',{id:Number(d.id),is_public:d.public==='1'});state.public=await api('public');toast('Данные сохранены');render(state.route);});break;
  case 'moderate-review':await busy(el,async()=>{await api('admin.testimonial.save',{id:Number(d.id),status:d.status});state.public=await api('public');toast('Данные сохранены');render(state.route);});break;
  case 'story-step':selectStory(Number(d.index));break;
  case 'edit-treatment':showTreatment();break;
  case 'admin-asset':showAdminAsset(Number(d.id));break;
  case 'profile-location':profileLocation(el);break;
  case 'voice-guide':await busy(el,async()=>{const enabled=!state.user.preferences?.voice_instructions;await api('account.voice',{enabled});state.user.preferences={...state.user.preferences,voice_instructions:enabled};el.setAttribute('aria-pressed',String(enabled));toast(enabled?'Голосовой спутник включён':'Голосовой спутник отключён');});break;
  case 'preview-exercise':{const ex=state.patientRecord.exercises.find(x=>Number(x.id)===Number(d.id));if(ex)modal('Видеообразец',`<video controls playsinline src="${asset(ex.video_media_id?'media.php?id='+ex.video_media_id:ex.video_path)}"></video>`,true);break;}
  case 'admin-user':showAdminUser(Number(d.id));break;
  case 'admin-exercise':showAdminExercise(Number(d.id||0));break;
  case 'admin-planet':showAdminPlanet(Number(d.id));break;
  case 'admin-page':showAdminPage(Number(d.id||0));break;
  case 'copy-credentials':try{await navigator.clipboard.writeText(state.credentialsText);toast('Скопировано');}catch{toast('Выделите и скопируйте данные из окна','error');}break;
 }
});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!(form instanceof HTMLFormElement))return;e.preventDefault();const data=formData(form);const submit=$('[type=submit]',form);
 await busy(submit,async()=>{
  switch(form.id){
  case 'auth-form':{
   const page=form.dataset.type;const action=page==='register'?'auth.register':page==='forgot'?'auth.forgot':page==='reset'?'auth.reset':'auth.login';
   if(page==='reset')data.token=state.route.token;
   let r;try{r=await api(action,data);}catch(err){$('.form-error',form).textContent=t(err.message);throw err;}
   if(r.user){state.user=r.user;go(homeForRole());}else{toast(r.message);if(page==='reset')go('login');}break;
  }
  case 'profile-form':{
   const preferences={email:data.email_notifications,reminders:data.reminders,reduced_motion:data.reduced_motion,voice_instructions:data.voice_instructions,public_email:data.public_email,public_phone:data.public_phone,public_social:data.public_social,language:lang()};
   state.user=await api('account.update',{...data,clinics:String(data.clinics||'').split('\n').map(x=>x.trim()).filter(Boolean),preferences});localStorage.setItem('myo-motion',preferences.reduced_motion?'off':'on');toast('Профиль сохранён');render(state.route);break;
  }
  case 'password-form':await api('account.password',data);form.reset();toast('Пароль изменён');break;
  case 'invite-claim-form':await api('invitation.accept',data);form.reset();toast('Приглашение принято');render(state.route);break;
  case 'testimonial-form':await api('testimonial.submit',data);toast('Отзыв отправлен на модерацию');render(state.route);break;
  case 'treatment-form':await api('treatment.save',{...data,patient_id:state.patientRecord.patient.user_id});closeModal();toast('План лечения сохранён');render(state.route);break;
  case 'admin-asset-form':await api('admin.asset.save',{...data,id:Number(form.dataset.id)});closeModal();state.public=await api('public');toast('Материал сохранён');render(state.route);break;
  case 'message-form':await api('messages.send',{...data,...state.chat});toast('Отправлено');render(state.route);break;
  case 'add-patient-form':{
   const r=await api('doctor.patient.add',data);state.credentialsText=`MyoSkills\n${t('Почта')}: ${r.email}\n${t('Временный пароль')}: ${r.temporary_password||'Аккаунт уже существовал'}\n${t('Код доступа')}: ${r.access_code}`;
   modal('Пациент добавлен',`<div class="credential-block"><div><small>${t('Почта')}</small><strong>${esc(r.email)}</strong></div>${r.temporary_password?`<div><small>${t('Временный пароль')}</small><strong>${esc(r.temporary_password)}</strong></div>`:''}<div><small>${t('Код доступа')}</small><strong>${esc(r.access_code)}</strong></div></div><div class="modal-actions">${button('Скопировать','copy-credentials','file','btn btn-outline')}${r.requires_accept?`<p>${t('Пациент должен принять код в своём профиле. До этого его история закрыта.')}</p>${navLink('Мои пациенты','doctor','arrow','btn btn-purple')}`:navLink('Открыть карточку','patient','arrow','btn btn-purple',{id:r.patient_id})}</div>`);break;
  }
  case 'visit-form':await api('visit.create',{...data,media_ids:state.visitUploads||[],patient_id:state.patientRecord.patient.user_id});closeModal();toast('Данные сохранены');render(state.route);break;
  case 'referral-form':await api('referral.create',{...data,patient_id:state.patientRecord.patient.user_id});closeModal();toast('Направление отправлено');render(state.route);break;
  case 'assignment-form':await api('assignment.save',{...data,patient_id:state.patientRecord.patient.user_id,exercise_id:Number(form.dataset.exercise)});closeModal();toast('Назначение сохранено');render(state.route);break;
  case 'review-form':await api('submission.review',{...data,id:Number(form.dataset.id)});closeModal();toast(data.status==='approved'?'Исследование подтверждено':'Комментарий отправлен');render(state.route);break;
  case 'file-upload-form':{
   const files=$('input[type=file]',form).files;if(!files.length)throw new Error(t('Выберите файл'));
   for(const file of files){await upload(file,form.dataset.category,{...(form.dataset.patientId?{patient_id:form.dataset.patientId}:{}),...(form.dataset.visitId?{visit_id:form.dataset.visitId}:{}),capture_date:data.capture_date||'',note:data.note||''},p=>{submit.textContent=`${t('Загрузка')} ${p}%`;});}
   closeModal();if(form.dataset.category==='site')state.public=await api('public');toast('Документ загружен');render(state.route);break;
  }
  case 'admin-user-form':await api('admin.user.save',{...data,id:Number(form.dataset.id)});closeModal();toast('Данные сохранены');render(state.route);break;
  case 'admin-exercise-form':await api('admin.exercise.save',{...data,...(form.dataset.id?{id:Number(form.dataset.id)}:{}),steps:String(data.steps||'').split('\n').filter(Boolean)});closeModal();toast('Данные сохранены');render(state.route);break;
  case 'admin-planet-form':await api('admin.planet.save',{...data,id:Number(form.dataset.id)});closeModal();state.public=await api('public');toast('Данные сохранены');render(state.route);break;
  case 'admin-page-form':await api('admin.page.save',{...data,...(form.dataset.id?{id:Number(form.dataset.id)}:{})});closeModal();state.public=await api('public');toast('Данные сохранены');render(state.route);break;
  case 'admin-content-form':{
   for(const key of ['shop_links','services','faq','shop_links_en','services_en','faq_en']){try{data[key]=JSON.parse(data[key]||'[]');}catch{throw new Error(`${t('Некорректный JSON')}: ${key}`);}}
   await api('admin.settings.save',data);state.public=await api('public');toast('Настройки сохранены');break;
  }
  }
 });
});
document.addEventListener('change',async e=>{
 const el=e.target;
 if(el.name==='role'&&el.closest('#auth-form')){const doc=el.value==='doctor';$('.doctor-register-fields').hidden=!doc;$('.patient-register-fields').hidden=doc;}
 if(el.id==='mission-video-file'&&el.files[0])selectVideo(el.files[0]);
 if(el.id==='specialist-type')filterSpecialists();
 if(el.id==='compare-left')$('#compare-img-left').src=asset('media.php?id='+Number(el.value));
 if(el.id==='compare-right')$('#compare-img-right').src=asset('media.php?id='+Number(el.value));
 if(el.id==='referral-specialty')updateReferralSelect();
 if(el.id==='referral-doctor')toggleExternalReferral();
 if(el.id==='visit-files'&&el.files.length){
  const submit=$('#visit-form [type=submit]');submit.disabled=true;
  try{for(const file of el.files){if((state.visitUploads||[]).length>=10)throw new Error(t('Не более 10 файлов приёма'));const media=await upload(file,'document',{patient_id:state.patientRecord.patient.user_id});state.visitUploads.push(media.id);const row=document.createElement('span');row.textContent=file.name;$('#visit-file-list').append(row);}}catch(err){toast(err.message,'error');}finally{if(submit.isConnected)submit.disabled=false;}
 }
 if(el.id==='exercise-video-upload'&&el.files[0]){
  const target=$('#exercise-video-state');target.textContent=t('Загрузка');
  try{const m=await upload(el.files[0],'exercise',{},p=>target.textContent=`${t('Загрузка')} ${p}%`);$('#exercise-media-id').value=m.id;target.textContent=el.files[0].name;toast('Видеообразец загружен');}catch(err){target.textContent=err.message;toast(err.message,'error');}
 }
});
document.addEventListener('input',e=>{
 const el=e.target;
 if(el.id==='specialist-search')filterSpecialists();
 if(el.id==='referral-search')updateReferralSelect();
 if(el.id==='patient-search')$$('#patient-rows tr').forEach(row=>row.hidden=!row.dataset.name.includes(el.value.toLowerCase()));
 if(el.id==='admin-user-search')$$('#admin-user-rows tr').forEach(row=>row.hidden=!row.dataset.name.includes(el.value.toLowerCase()));
 if(el.id==='compare-slider'){const value=Number(el.value);$('#compare-before').style.clipPath=`inset(0 ${100-value}% 0 0)`;$('#compare-handle').style.left=`${value}%`;}
 if(el.id==='command-search')$$('.command-results a').forEach(a=>a.hidden=!a.textContent.toLowerCase().includes(el.value.toLowerCase()));
});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();showCommand();}});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal-content').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
$('#modal').addEventListener('cancel',()=>{if(state.modalCleanup){state.modalCleanup();state.modalCleanup=null;}});
window.addEventListener('popstate',()=>render());

function selectPlanet(id){
 focusPlanet(id);
 $$('.planet-node').forEach(el=>{const yes=Number(el.dataset.id)===id;el.classList.toggle('selected',yes);el.setAttribute('aria-pressed',String(yes));});
 if($('#patient-planet-detail')){$('#patient-planet-detail').innerHTML=patientPlanetDetail(id);localizeStatic($('#patient-planet-detail'));return;}
 const p=(state.public?.planets||defaultPlanets).find(p=>Number(p.id)===id);if(!p)return;
 const detail=$('#public-planet-detail');if(!detail)return;
 detail.innerHTML=`<span class="eyebrow">0${id} / ${t(p.subtitle)}</span><h3>${esc(p.title)}</h3><p>${esc(p.description||t('Каждая новая миссия появляется после назначения врача.'))}</p><div class="detail-visual"><img class="planet-image" src="${asset(p.image)}" alt="${esc(p.title)}"></div>${navLink('Начать путешествие',state.user?(state.user.role==='patient'?'galaxy':homeForRole()):'register','arrow','btn btn-mint')}<small>${t('Доступ открывает миотерапевт')}</small>`;
}
function filterSpecialists(){
 if(!$('#specialist-results'))return;const q=($('#specialist-search')?.value||'').toLowerCase();const type=$('#specialist-type')?.value||'';let doctors=(state.public?.specialists||[]).filter(d=>(!type||d.specialty===type)&&`${d.name} ${d.city} ${d.clinic}`.toLowerCase().includes(q));
 if(state.location){doctors=doctors.map(d=>({...d,distance:d.latitude!==null&&d.longitude!==null?distance(state.location.lat,state.location.lng,Number(d.latitude),Number(d.longitude)):undefined})).sort((a,b)=>(a.distance??Infinity)-(b.distance??Infinity));}
 $('#specialist-results').innerHTML=doctors.map(d=>`<article class="specialist-card"><div class="doctor-avatar" style="--avatar-hue:${Number(d.id)%2?265:167}">${esc(initials(d.name))}<span>${icon('shield')}</span></div><div><span class="eyebrow">${special(d.specialty)}</span><h3>${esc(d.name)}</h3><p>${esc(d.city)} · ${esc(d.clinic)}${d.distance!==undefined?` · ${Math.round(d.distance)} km`:''}</p><p class="small subtle" data-user-content>${esc(d.about||'')}</p></div><footer>${badge(t('Профиль подтверждён'),'mint')}${button('Подробнее','doctor-contact','arrowup','icon-text',`data-id="${d.id}"`)}</footer></article>`).join('')||`<div class="empty-state"><h3>${t('Ничего не найдено')}</h3><p>${t('Попробуй изменить условия поиска.')}</p></div>`;
}
function distance(a,b,c,d){const rad=n=>n*Math.PI/180;const x=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
function geolocation(el){if(!navigator.geolocation){toast('Геолокация недоступна','error');return;}el.disabled=true;navigator.geolocation.getCurrentPosition(pos=>{state.location={lat:pos.coords.latitude,lng:pos.coords.longitude};filterSpecialists();el.disabled=false;},()=>{el.disabled=false;toast('Разрешите геолокацию или найдите специалиста по городу','error');},{timeout:12000,maximumAge:300000});}
function showDoctor(id){const d=state.public?.specialists.find(d=>Number(d.id)===id);if(!d)return;modal('Специалист',`<div class="table-user" style="margin-bottom:25px"><span class="doctor-avatar">${esc(initials(d.name))}</span><div><span class="eyebrow">${special(d.specialty)}</span><h2>${esc(d.name)}</h2><p class="subtle small">${esc(d.city)} · ${esc(d.clinic)}</p></div></div><p data-user-content>${esc(d.about||'')}</p>${d.education?`<h3>${t('Образование')}</h3><p data-user-content>${esc(d.education)}</p>`:''}${d.hobbies?`<p data-user-content>${t('Интересы')}: ${esc(d.hobbies)}</p>`:''}${(d.clinics||[]).length?`<p data-user-content>${d.clinics.map(esc).join('<br>')}</p>`:''}${d.social_url?`<a class="icon-text" href="${esc(d.social_url)}" target="_blank" rel="noopener">${t('Социальная сеть')}${icon('arrowup')}</a>`:''}${(d.documents||[]).map(m=>`<a class="document-row" href="${asset('asset.php?id='+m.id)}" target="_blank" rel="noopener">${icon('file')}${esc(m.original_name)}</a>`).join('')}${d.email||d.phone?`<p class="small" style="margin-top:20px">${esc(d.email||'')}<br>${esc(d.phone||'')}</p>`:''}<div class="modal-actions">${state.user?.role==='patient'?button('Пригласить в команду','request-doctor','plus','btn btn-purple',`data-id="${id}"`):navLink('Начать путешествие',state.user?homeForRole():'register','arrow','btn btn-purple')}</div>`);}
async function showNotifications(){
 try{const notes=await api('notifications');modal('Уведомления',`${button('Прочитать всё','notifications-read','check','icon-text')}<div class="notification-list" style="margin-top:18px">${notes.map(n=>`<button class="notification-item ${Number(n.is_read)?'':'unread'}" data-action="notification-open" data-id="${n.id}" data-link="${esc(n.link)}">${icon(({review:'video',assignment:'rocket',photo:'image',referral:'people',message:'message'})[n.type]||'bell')}<div><strong>${esc(n.title)}</strong><p data-user-content>${esc(n.body||'')}</p><small>${fmtDate(n.created_at)}</small></div></button>`).join('')||`<div class="empty-state"><h3>${t('Уведомлений пока нет')}</h3></div>`}</div>`);}catch(e){toast(e.message,'error');}
}
function showCommand(){const items=state.user?state.user.role==='patient'?[['dashboard','Управление миссией','grid'],['galaxy','Галактика','orbit'],['diary','Дневник','book'],['progress','Прогресс','chart'],['team','Команда','people'],['profile','Профиль','user']]:state.user.role==='doctor'?[['doctor','Мои пациенты','people'],['profile','Профиль','user']]:[['admin','Администрирование','shield'],['profile','Профиль','user']]:[['home','Главная','orbit'],['specialists','Специалисты','people'],['register','Регистрация','user']];modal('Поиск',`${field('Поиск','command-search','','text','id="command-search" autocomplete="off"')}<div class="command-results" style="margin-top:20px">${items.map(([p,l,ic])=>navLink(l,p,ic,'command-result')).join('')}</div>`);}
function setupTimer(total){
 let seconds=Number(total),interval=null;const draw=()=>{if(!$('#timer-minutes'))return;$('#timer-minutes').textContent=String(Math.floor(seconds/60)).padStart(2,'0');$('#timer-seconds').textContent=String(seconds%60).padStart(2,'0');};
 const pause=()=>{clearInterval(interval);interval=null;const btn=$('[data-action=timer-toggle]');if(btn)btn.innerHTML=t('Старт')+icon('play');};
 state.timer={toggle:el=>{if(interval){pause();return;}if(seconds<=0)seconds=total;el.innerHTML=t('Пауза')+icon('pause');interval=setInterval(()=>{seconds--;draw();if(seconds<=0){pause();toast('Время миссии завершилось. Сохрани выполнение.');}},1000);},reset:()=>{pause();seconds=total;draw();}};state.cleanup.push(pause);
}
function removeVideo(){if(state.videoUrl)URL.revokeObjectURL(state.videoUrl);state.videoUrl=null;state.selectedVideo=null;const panel=$('#selected-video');if(panel){panel.hidden=true;panel.innerHTML='';}$('[data-action=submit-video]')?.setAttribute('disabled','');}
function selectVideo(file){
 if(file.size>state.limits.video_mb*1024*1024){toast(`${t('Файл слишком большой')}: ${state.limits.video_mb} MB`,'error');return;}
 if(!/\.(mp4|webm|mov)$/i.test(file.name)){toast('Выберите MP4, WebM или MOV','error');return;}
 removeVideo();state.selectedVideo=file;state.videoUrl=URL.createObjectURL(file);const panel=$('#selected-video');if(!panel)return;panel.hidden=false;panel.innerHTML=`<video controls playsinline src="${state.videoUrl}"></video><p><span>${esc(file.name)} · ${(file.size/1024/1024).toFixed(1)} MB</span>${button('Удалить','remove-video','close','icon-btn')}</p>`;$('[data-action=submit-video]').disabled=false;state.cleanup.push(()=>{if(state.videoUrl)URL.revokeObjectURL(state.videoUrl);});
}
async function submitVideo(el){
 if(!state.selectedVideo)return;
 await busy(el,async()=>{const file=state.selectedVideo;const comment=$('#patient-comment').value;const progress=$('#upload-progress');progress.hidden=false;const m=await upload(file,'video',{},p=>{$('i',progress).style.width=p+'%';$('span',progress).textContent=p+'%';});await api('submission.create',{assignment_id:Number(el.dataset.id),media_id:m.id,comment});toast('Видео отправлено врачу');const d=await api('dashboard');const next=d.missions.find(m=>m.status==='active'&&!Number(m.done_today)&&Number(m.id)!==Number(el.dataset.id));if(next)go('mission',{id:next.id},true);else go('galaxy',{},true);});
}
function stopRecorder(){if(state.recorder){state.recorder.cleanup();state.recorder=null;}}
async function recordVideo(){
 stopRecorder();
 if(!window.isSecureContext){modal('Записать видео',`<p>${t('Камера доступна по HTTPS или на localhost.')}</p><p class="small subtle" style="margin-top:15px">${t('Загрузить готовое видео можно в любом случае.')}</p>`);return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Браузер не поддерживает запись. Загрузите готовый файл.','error');return;}
 modal('Записать видео',`<div class="record-preview"><video id="record-preview" autoplay muted playsinline></video><span id="record-time" class="record-time">00:00 / 03:00</span></div><div class="modal-actions">${button('Начать запись','record-start','camera','btn btn-purple','disabled')}${button('Остановить запись','record-stop','pause','btn btn-dark','hidden')}${button('Записать заново','record-again','camera','btn btn-outline','hidden')}${button('Использовать запись','record-use','check','btn btn-purple','hidden')}</div><p class="small subtle" style="margin-top:15px">${t('Данные защищены правами доступа')}</p>`,true);
 try{
  const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:true});
  if(!$('#modal').open||!$('#record-preview')){stream.getTracks().forEach(x=>x.stop());return;}
  const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));
  const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);let chunks=[],interval=null,duration=0,blobUrl=null,disposed=false;
  $('#record-preview').srcObject=stream;$('[data-action=record-start]').disabled=false;
  rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  rec.onstop=()=>{clearInterval(interval);stream.getTracks().forEach(x=>x.stop());if(disposed||!$('#record-preview'))return;const blob=new Blob(chunks,{type:rec.mimeType});state.recordedFile=new File([blob],`myoskills-${Date.now()}.${rec.mimeType.includes('mp4')?'mp4':'webm'}`,{type:rec.mimeType});blobUrl=URL.createObjectURL(blob);const video=$('#record-preview');video.srcObject=null;video.src=blobUrl;video.muted=false;video.controls=true;$('[data-action=record-stop]').hidden=true;$('[data-action=record-use]').hidden=false;$('[data-action=record-again]').hidden=false;$('#record-time').classList.remove('recording');};
  const cleanup=()=>{disposed=true;clearInterval(interval);if(rec.state!=='inactive')rec.stop();stream.getTracks().forEach(x=>x.stop());if(blobUrl)URL.revokeObjectURL(blobUrl);};
  state.recorder={start:()=>{if(rec.state!=='inactive')return;chunks=[];duration=0;rec.start(1000);$('[data-action=record-start]').hidden=true;$('[data-action=record-stop]').hidden=false;$('#record-time').classList.add('recording');interval=setInterval(()=>{duration++;if($('#record-time'))$('#record-time').textContent=`${String(Math.floor(duration/60)).padStart(2,'0')}:${String(duration%60).padStart(2,'0')} / 03:00`;if(duration>=180)rec.stop();},1000);},stop:()=>{if(rec.state!=='inactive')rec.stop();},cleanup};state.modalCleanup=stopRecorder;
 }catch{toast('Не удалось открыть камеру. Проверьте разрешения браузера.','error');closeModal();}
}
function showAddPatient(){modal('Добавить пациента',`<form id="add-patient-form" class="form-stack">${field('ФИО','name','','text','required maxlength="160"')}${field('Почта','email','','email','required maxlength="190"')}<div class="form-grid">${field('Телефон','phone','','tel')}${field('Город','city')}</div>${field('Код доступа существующего пациента','access_code','','text',`placeholder="${t('Необязательно')}" maxlength="40"`)}${['myotherapist','orthodontist'].includes(state.user.specialty)?`${field('Аппарат','appliance')}${textarea('План лечения','treatment_plan')}`:''}<button type="submit" class="btn btn-purple">${t('Добавить пациента')}${icon('plus')}</button></form>`);}
function showVisit(){
 const p=state.patientRecord?.patient;if(!p)return;const day=new Date().toLocaleDateString('en-CA');const extended=['myotherapist','orthodontist'].includes(state.user.specialty);state.visitUploads=[];
 modal('Добавить приём',`<form id="visit-form" class="form-stack"><div class="form-grid">${field('Дата приёма','date',day,'date','required')}${field('Время','time','12:00','time','required')}</div>${textarea('Диагноз','diagnosis','','required maxlength="5000"')}${extended?`${field('Аппарат','appliance',p.appliance)}${field('Метод лечения','method')}${textarea('План лечения','treatment_plan',p.treatment_plan)}`:''}${textarea('Рекомендации','recommendations','','maxlength="5000"')}${field('Следующий приём','next_visit','','date')}<label class="field"><span>${t('Файлы приёма')}</span><input id="visit-files" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple></label><div id="visit-file-list" class="upload-file-list"></div><button type="submit" class="btn btn-purple">${t('Сохранить')}${icon('check')}</button></form>`);
}
function showReferral(){modal('Направить',`<form id="referral-form" class="form-stack">${select('Специальность','specialty',[['myotherapist','Миотерапевт'],['orthodontist','Ортодонт'],['ent','ЛОР'],['osteopath','Остеопат'],['kinesiologist','Кинезиолог'],['neurologist','Невролог']],'','id="referral-specialty"')}${field('Поиск врача','referral_search','','search','id="referral-search" autocomplete="off"')}${select('Специалист','to_doctor',[],'','id="referral-doctor"')}<div id="external-referral" class="form-stack" hidden>${field('ФИО врача вне сервиса','external_name','','text','id="external-referral-name" maxlength="160"')}<div class="form-grid">${field('Почта','external_email','','email','maxlength="190"')}${field('Телефон','external_phone','','tel','maxlength="40"')}</div>${field('Клиника','external_clinic','','text','maxlength="180"')}<p class="small subtle">${t('Направление сохраняется в истории. Врач вне сервиса не получает доступ к данным пациента; результат консультации отмечает направивший специалист.')}</p></div>${textarea('Заметка','note','','maxlength="4000"')}<button class="btn btn-purple" type="submit">${t('Направить')}${icon('arrowup')}</button></form>`);updateReferralSelect();}
function toggleExternalReferral(){const external=$('#referral-doctor')?.value==='0';if($('#external-referral'))$('#external-referral').hidden=!external;if($('#external-referral-name'))$('#external-referral-name').required=external;}
function updateReferralSelect(){const spec=$('#referral-specialty').value;const q=($('#referral-search')?.value||'').toLowerCase();const selectEl=$('#referral-doctor');const previous=selectEl.value;const docs=(state.public?.specialists||[]).filter(d=>d.specialty===spec&&Number(d.id)!==Number(state.user.id)&&`${d.name} ${d.city}`.toLowerCase().includes(q));selectEl.innerHTML=docs.map(d=>`<option value="${d.id}">${esc(d.name)} · ${esc(d.city)}</option>`).join('')+`<option value="0">${t('Врач вне сервиса')}</option>`;selectEl.value=docs.some(d=>String(d.id)===previous)?previous:docs.length?String(docs[0].id):'0';toggleExternalReferral();}
function showTreatment(){const p=state.patientRecord.patient;modal('План лечения',`<form id="treatment-form" class="form-stack">${field('Клиника лечения','treatment_clinic',p.treatment_clinic||'','text','maxlength="180"')}${field('Аппарат','appliance',p.appliance||'','text','maxlength="160"')}${textarea('План лечения','treatment_plan',p.treatment_plan||'','maxlength="5000"')}<div class="form-grid">${field('Начало лечения','started_at',p.started_at||'','date')}${field('Завершение лечения','finished_at',p.finished_at||'','date')}</div>${select('Состояние','status',[['active','Активен'],['paused','Приостановлено'],['completed','Завершено']],p.status)}<button class="btn btn-purple" type="submit">${t('Сохранить')}${icon('check')}</button></form>`);}
function showAdminAsset(id){const m=state.admin.assets.find(m=>Number(m.id)===id);if(!m)return;modal('Публичные материалы',`<form id="admin-asset-form" data-id="${id}" class="form-stack">${field('Название','title',m.original_name,'text','required maxlength="190"')}${textarea('Заметка','note',m.note||'','maxlength="255"')}${check('Опубликовано','is_public',Number(m.is_public))}<button class="btn btn-purple" type="submit">${t('Сохранить')}${icon('check')}</button></form>`);}
function profileLocation(el){if(!navigator.geolocation){toast('Геолокация недоступна','error');return;}el.disabled=true;navigator.geolocation.getCurrentPosition(pos=>{const lat=$('#profile-form [name=latitude]'),lng=$('#profile-form [name=longitude]');if(lat&&lng){lat.value=pos.coords.latitude.toFixed(6);lng.value=pos.coords.longitude.toFixed(6);}el.disabled=false;},()=>{el.disabled=false;toast('Разрешите геолокацию или укажите координаты вручную','error');},{timeout:12000});}
function showAssignment(id){const e=state.patientRecord.exercises.find(e=>Number(e.id)===id);const a=state.patientRecord.missions.find(m=>Number(m.exercise_id)===id);modal('Назначить упражнение',`<form id="assignment-form" data-exercise="${id}" class="form-stack"><h3>${esc(e.title)}</h3>${select('Состояние','status',[['active','Открыто'],['paused','Приостановлено'],['completed','Завершено']],a?.status||'active')}${textarea('Назначение врача','instructions',a?.instructions||'','maxlength="3000"')}${select('Дней в неделю','days_per_week',Array.from({length:7},(_,i)=>[i+1,String(i+1)]),a?.days_per_week||7)}<button type="submit" class="btn btn-purple">${t('Сохранить')}${icon('check')}</button></form>`);}
function showReview(id){const s=state.clinic?.reviews.find(s=>Number(s.id)===id)||state.patientRecord?.submissions.find(s=>Number(s.id)===id);if(!s)return;modal('Проверка видео',`<div class="review-modal-layout"><video controls playsinline preload="metadata" src="${asset('media.php?id='+s.media_id)}"></video><form id="review-form" data-id="${id}" class="form-stack"><div class="review-info"><span class="eyebrow">${esc(s.patient_name||state.patientRecord?.patient.name||'')}</span><h3>${esc(s.title)}</h3><p data-user-content>${esc(s.patient_comment||'')}</p><small class="subtle">${fmtDate(s.created_at,true)}</small></div><div class="review-choice"><label><input type="radio" name="status" value="approved" checked>${icon('check')}${t('Исследование подтверждено')}</label><label><input type="radio" name="status" value="retry">${icon('message')}${t('Нужна корректировка')}</label></div>${textarea('Комментарий врача','comment','','maxlength="4000"')}<button class="btn btn-purple" type="submit">${t('Сохранить проверку')}${icon('check')}</button></form></div>`,true);}
function showFileUpload(category,pid=0,visitId=0){const accept=category==='photo'?'image/jpeg,image/png,image/webp':'application/pdf,image/jpeg,image/png,image/webp';modal(category==='photo'?'Добавить фото':category==='diploma'?'Загрузить диплом':'Добавить документ',`<form id="file-upload-form" data-category="${category}" ${pid?`data-patient-id="${pid}"`:''} ${visitId?`data-visit-id="${visitId}"`:''} class="form-stack file-upload-modal"><label class="dropzone"><input type="file" name="file" accept="${accept}" ${category==='photo'?'multiple':''} required><span class="upload-symbol">${icon('upload')}</span><strong>${t('Выбрать файл')}</strong><small>${category==='photo'?'JPEG / PNG / WebP':'PDF / JPEG / PNG / WebP'}</small></label>${category==='photo'?field('Дата','capture_date',new Date().toLocaleDateString('en-CA'),'date','required'):''}${textarea('Заметка','note','','maxlength="255"')}<button class="btn btn-purple" type="submit">${t('Загрузить')}${icon('upload')}</button></form>`);}
function showAdminUser(id){const u=state.admin.users.find(u=>Number(u.id)===id);if(!u)return;modal('Контроль доступа',`<form id="admin-user-form" data-id="${id}" class="form-stack"><div><h3>${esc(u.name)}</h3><p class="subtle small">${esc(u.email)}</p></div>${check('Активен','active',Number(u.active))}${u.role==='doctor'?check('Верифицирован','verified',Number(u.verified)):''}<button class="btn btn-purple" type="submit">${t('Сохранить')}${icon('check')}</button></form>`);}
function showAdminExercise(id){
 const e=state.admin.exercises.find(e=>Number(e.id)===id)||{};let steps=[];try{steps=JSON.parse(e.steps_json||'[]');}catch{}
 modal('Библиотека упражнений',`<form id="admin-exercise-form" ${id?`data-id="${id}"`:''} class="form-stack">${field('Название','title',e.title||'','text','required maxlength="160"')}${select('Планета','planet_id',state.admin.planets.map(p=>[p.id,p.title]),e.planet_id||1)}${textarea('Описание','description',e.description||'','maxlength="7000"')}${textarea('Шаги через новую строку','steps',steps.join('\n'))}<div class="form-grid">${field('Уровень','level',e.level||1,'number','min="1" max="10" required')}${field('Длительность в секундах','duration_seconds',e.duration_seconds||60,'number','min="10" max="3600" required')}</div>${field('Повторения','repetitions',e.repetitions||'')}${check('Активное упражнение','active',id?Number(e.active):true)}<label class="field"><span>${t('Загрузить видеообразец')}</span><input id="exercise-video-upload" type="file" accept="video/mp4,video/webm,video/quicktime"></label><input type="hidden" name="video_media_id" id="exercise-media-id" value="${e.video_media_id||''}"><p id="exercise-video-state" class="small subtle">${e.video_media_id?`#${e.video_media_id}`:t('Демонстрационный материал')}</p><button class="btn btn-purple" type="submit">${t('Сохранить')}${icon('check')}</button></form>`,true);
}
function showAdminPlanet(id){const p=state.admin.planets.find(p=>Number(p.id)===id);if(!p)return;modal('Планеты',`<form id="admin-planet-form" data-id="${id}" class="form-stack">${field('Название','title',p.title,'text','required maxlength="100"')}${field('Подзаголовок','subtitle',p.subtitle)}${textarea('Описание','description',p.description)}<div class="form-grid">${field('Палитра','color',p.color,'color','required')}${field('Порядок','sort_order',p.sort_order,'number')}</div>${select('Изображение планеты','image_media_id',[['','Стандартная планета'],...(state.admin.assets||[]).filter(m=>Number(m.is_public)&&m.mime_type.startsWith('image/')).map(m=>[m.id,m.original_name])],p.image?.startsWith('asset.php?id=')?p.image.split('=')[1]:'')}<button class="btn btn-purple" type="submit">${t('Сохранить')}${icon('check')}</button></form>`);}
function showAdminPage(id){const p=state.admin.pages?.find(p=>Number(p.id)===id)||{};modal('Страницы и меню',`<form id="admin-page-form" ${id?`data-id="${id}"`:''} class="form-stack">${field('Название','title',p.title||'','text','required maxlength="160"')}${field('Адрес страницы','slug',p.slug||'','text','required pattern="[a-z0-9][a-z0-9-]{1,79}" maxlength="80"')}${field('Название в меню','menu_label',p.menu_label||'','text','maxlength="80"')}${textarea('Содержание','body',p.body||'','required maxlength="30000"')}${field('Заголовок на английском','title_en',p.title_en||'','text','maxlength="160"')}${field('Меню на английском','menu_label_en',p.menu_label_en||'','text','maxlength="80"')}${textarea('Содержание на английском','body_en',p.body_en||'','maxlength="30000"')}${select('Обложка','cover_media_id',[['','Без обложки'],...(state.admin.assets||[]).filter(m=>Number(m.is_public)&&m.mime_type.startsWith('image/')).map(m=>[m.id,m.original_name])],p.cover_media_id||'')}${field('Порядок','sort_order',p.sort_order||0,'number')}${check('Активен','active',id?Number(p.active):true)}<button type="submit" class="btn btn-purple">${t('Сохранить')}${icon('check')}</button></form>`,true);}

async function start(){
 setLang(lang());applyMotion();
 try{const me=await api('auth.me');state.user=me.user;}catch{}
 try{state.public=await api('public');}catch{state.public={planets:defaultPlanets,specialists:[],settings:{}};}
 await render();
}
start();
