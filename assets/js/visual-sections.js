import {state,t,lang,esc,asset,icon,button,navLink,initials,fmtDate} from './core.js?v=20261022-final';

const copy=(ru,en)=>lang()==='en'?en:ru;
const art=(name,cls='')=>`<img class="${cls}" src="${asset('assets/images/'+name+'.webp')}" alt="" loading="lazy" decoding="async">`;
const artwork=['route-observatory','video-relay','care-constellation'];

export function flightSection(){
 return `<section class="orbit-film section-space"><header class="section-heading row-heading reveal"><div><span class="eyebrow">MYO / NEXT ORBIT</span><h2>${copy('Следующая планета уже ждёт','Your next planet is waiting')}</h2></div><p>${copy('У каждого путешествия — свой маршрут. У твоего — поддержка команды на каждом этапе.','Every journey has its own route. Yours has a care team at every stage.')}</p></header><div class="orbital-viewport orbital-film-view reveal">${art('orbital-medical-station','orbital-fallback')}<canvas class="orbital-canvas" data-orbit-scene="flight" aria-hidden="true"></canvas><div class="orbit-film-caption"><span><i class="signal-dot"></i> MYO / ${copy('ПОЛЁТ ПРОДОЛЖАЕТСЯ','THE JOURNEY CONTINUES')}</span><a href="#worlds" data-scroll="worlds">${t('Посмотреть планеты')}${icon('arrowup')}</a></div><div class="orbit-film-coordinates" aria-hidden="true">01 — 06<span>PERSONAL GALAXY</span></div></div></section>`;
}

export function journeySection(){
 const rows=[
  [copy('Врач выбирает маршрут','Your doctor plans the route'),copy('Назначает упражнения на нужных планетах. Новые уровни открываются после проверки.','Assigns exercises on the right planets. New levels open after review.'),'people'],
  [copy('Ты выполняешь миссию','You complete a mission'),copy('Смотришь образец, повторяешь упражнение и отправляешь своё видео врачу.','Watch the example, practise, and send your video to your doctor.'),'video'],
  [copy('Вместе идёте дальше','You move forward together'),copy('Получаешь комментарий, видишь занятия в дневнике и продолжаешь личный маршрут.','Get feedback, follow your diary, and continue along your personal route.'),'rocket']
 ];
 return `<section id="how" class="how-section section-space"><header class="section-heading reveal"><span class="eyebrow">01 / ${t('Как это работает')}</span><h2>${t('Путешествие начинается с назначения')}</h2><p>${copy('У каждого своя скорость. Миотерапевт составляет маршрут, а MyoSkills помогает возвращаться к нему каждый день.','Everyone has their own pace. Your myotherapist sets the route; MyoSkills helps you follow it each day.')}</p></header><div class="ms-step-grid">${rows.map(([title,body,ic],i)=>`<article class="ms-step-card reveal" style="--reveal-order:${i}"><header><span class="ms-step-index">0${i+1}</span><span class="ms-card-icon">${icon(ic)}</span></header>${art(artwork[i],'ms-step-art')}<h3>${title}</h3><p>${body}</p></article>`).join('')}</div></section>`;
}

export function serviceSection(){
 let rows=[];try{rows=JSON.parse((lang()==='en'?state.public?.settings?.services_en:null)||state.public?.settings?.services||'[]');}catch{}
 if(!Array.isArray(rows)||!rows.length)return '';
 return `<section class="service-section section-space"><header class="section-heading reveal"><span class="eyebrow">MYO / CARE SYSTEM</span><h2>${t('Наши услуги')}</h2></header><div class="ms-service-grid">${rows.map((s,i)=>`<article class="ms-service-card reveal" style="--reveal-order:${i%3}"><div class="ms-service-visual">${art(artwork[i%3],'ms-service-art')}<span class="ms-service-code">MYO / 0${i+1}</span></div><div class="ms-service-copy"><h3>${esc(t(s.title||''))}</h3><p>${esc(t(s.text||''))}</p>${navLink('Начать',state.user?(state.user.role==='doctor'?'doctor':state.user.role==='admin'?'admin':'dashboard'):'register','arrowup','icon-text')}</div></article>`).join('')}</div></section>`;
}

export function doctorFeature(){
 return `<section class="doctor-feature reveal"><div class="doctor-feature-copy"><span class="eyebrow">MYO / FOR DOCTORS</span><h2>${t('Рабочее место врача')}</h2><p>${t('Управляй маршрутом и проверяй видео в одном рабочем пространстве.')}</p><div class="doctor-feature-benefits"><span>${icon('video')}${t('Проверка видео')}</span><span>${icon('people')}${t('Совместное ведение')}</span><span>${icon('image')}${t('Фотопротокол')}</span></div>${navLink('Для врача',state.user?.role==='doctor'?'doctor':'register','arrowup','btn btn-mint',{role:'doctor'})}</div><div class="doctor-feature-stage">${art('orbital-medical-station','doctor-station-art')}<div class="doctor-workflow-note"><span class="eyebrow">MYO / CARE TEAM</span><h3>${t('Единая история лечения')}</h3><p>${t('Назначения, видео пациента и комментарии доступны специалистам его команды в личном кабинете.')}</p><div>${icon('shield')}<span>${t('Данные защищены правами доступа')}</span></div></div><div class="doctor-feature-status"><span class="signal-dot"></span>${copy('Команда на одной орбите','One team. One orbit.')}</div></div></section>`;
}

export function reviewRating(value){
 const rating=Math.max(0,Math.min(5,Number(value)||0));
 return `<span class="review-rating" role="img" aria-label="${rating}/5" style="--rating:${rating/5*100}%"><img class="stars-muted" src="${asset('assets/uikit/review-stars.svg')}" alt=""><span class="stars-value"><img src="${asset('assets/uikit/review-stars.svg')}" alt=""></span></span>`;
}
export function testimonialSection(){
 const rows=(state.public?.testimonials||[]).filter(r=>!Number(r.is_demo)&&r.body&&r.author_name),canLeaveReview=!state.user||state.user.role==='patient';
 return `<section class="ms-reviews section-space"><header class="section-heading row-heading reveal"><div><span class="eyebrow">MYO / YOUR VOICE</span><h2>${t('Истории на орбите')}</h2></div><div class="ms-review-heading-right"><p>${t('Отзывы о работе с сервисом. Публикуются после согласия автора и модерации.')}</p>${rows.length>1?`<div class="ms-review-controls">${button('Назад','reviews-prev','back','ms-review-arrow')}${button('Далее','reviews-next','back','ms-review-arrow next')}</div>`:''}</div></header><div class="ms-review-track" id="review-track" ${rows.length?'tabindex="0"':''} aria-label="${t('Отзывы')}">${rows.map((r,i)=>`<article class="ms-review-card" style="--review-accent:${i%2?'#7357E8':'#61E0CA'}"><header>${reviewRating(r.rating)}</header><p data-user-content>«${esc(r.body)}»</p><footer><span class="ms-review-avatar" aria-hidden="true">${esc(initials(r.author_name))}</span><div><strong data-user-content>${esc(r.author_name)}</strong>${r.created_at?`<time datetime="${esc(String(r.created_at).slice(0,10))}">${fmtDate(r.created_at,true)}</time>`:''}</div>${icon('message')}</footer></article>`).join('')||`<article class="ms-review-empty"><h3>${t('Опубликованных отзывов пока нет')}</h3>${canLeaveReview?`<p>${t('Твоя история может стать первой. Оставь отзыв в личном кабинете.')}</p>${navLink('В кабинет',state.user?'profile':'login','arrow','btn btn-outline')}`:`<p>${t('Отзывы о работе с сервисом. Публикуются после согласия автора и модерации.')}</p>`}</article>`}</div></section>`;
}
