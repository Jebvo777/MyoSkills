"""Reproduce the deliberately fictional demo dataset. Python is not needed in production."""
from pathlib import Path
import json
import os, shlex, subprocess

root = Path(__file__).resolve().parents[1]
password_hash = subprocess.check_output(shlex.split(os.environ.get('MYO_PHP_COMMAND','php')) + ['-r', "echo password_hash('MyoDemo!2026', PASSWORD_BCRYPT);"],text=True).strip()
def esc(v):
    if v is None: return 'NULL'
    if isinstance(v, (int,float)): return str(v)
    return "'" + str(v).replace('\\','\\\\').replace("'","''") + "'"
lines = ["-- MyoSkills fictional demo dataset. Import schema.sql first.", "-- Test password for every account: MyoDemo!2026", "-- Use only on an empty test installation. IDs are intentionally fixed.", "SET NAMES utf8mb4;", "START TRANSACTION;"]
def add(table, rows):
    for row in rows:
        lines.append('INSERT INTO '+table+' ('+','.join(row)+') VALUES ('+','.join(esc(v) for v in row.values())+');')
stamp='2026-10-01 10:00:00'
names = [
 (1,'admin@myoskills.test','Администратор','admin','',0,'',''),
 (2,'olga@myoskills.test','Ольга Миронова','doctor','myotherapist',1,'Москва','Орбита'),
 (3,'irina@myoskills.test','Ирина Волкова','doctor','orthodontist',1,'Москва','Орбита'),
 (4,'lev@myoskills.test','Лев Соколов','doctor','ent',1,'Москва','Вектор'),
 (5,'denis@myoskills.test','Денис Орлов','doctor','osteopath',1,'Санкт-Петербург','Ритм'),
 (6,'alex@myoskills.test','Александр','patient','',0,'Москва',''),
 (7,'alisa@myoskills.test','Алиса','patient','',0,'Москва',''),
 (8,'max@myoskills.test','Максим','patient','',0,'Санкт-Петербург',''),
]
add('users',[dict(id=i,email=email,password_hash=password_hash,name=name,role=role,specialty=spec,verified=ver,city=city,clinic=clinic,clinics_json=json.dumps([clinic] if clinic else [],ensure_ascii=False),about=('Демонстрационный профиль специалиста. Данные для знакомства с интерфейсом.' if role=='doctor' else ''),contact_public=1 if role=='doctor' else 0,latitude=55.75 if city=='Москва' else (59.93 if city else None),longitude=37.61 if city=='Москва' else (30.31 if city else None),preferences_json=json.dumps({'reminders':True,'email':False,'reduced_motion':False,'language':'ru'}),consent_at=stamp,created_at=stamp) for i,email,name,role,spec,ver,city,clinic in names])
add('patients',[dict(user_id=i,access_code=f'MYO-DEMO-{i:04d}',claimed=1,appliance='Демонстрационный аппарат',treatment_plan='Тестовый план. Реальные назначения вносит врач.',started_at='2026-10-01') for i in (6,7,8)])
add('patient_team',[dict(patient_id=p,doctor_id=d,status='active',joined_at=stamp) for p,d in [(6,2),(6,3),(7,2),(7,3),(8,2),(8,5)]])
planets=[
 (1,'posture','Вертикаль','Осанка','#9d89f8','Кристаллы собирают твою устойчивую орбиту.','posture','body'),
 (2,'breathing','Аэрис','Дыхание','#61e1ca','Тихая планета воздушных потоков.','breathing','wind'),
 (3,'tongue','Лингва','Язык','#ef9daa','Извилистые тропы точного движения.','tongue','spark'),
 (4,'swallowing','Аква','Глотание','#9bcaef','Мир плавных волн и прозрачных колец.','swallowing','drop'),
 (5,'chewing','Мастика','Жевание','#e6bf77','Тактильные формы и ритмичные механизмы.','chewing','hex'),
 (6,'lips','Лаби','Губы и щёки','#dea6d9','Мягкая планета округлых форм.','lips','smile'),
]
add('planets',[dict(id=i,slug=slug,title=title,subtitle=sub,description=desc,color=color,secondary_color='#7357e8',image=f'assets/images/planet-{img}.webp',icon=icon,sort_order=i) for i,slug,title,sub,color,desc,img,icon in planets])
exercises=[]
for i,slug,title,sub,color,desc,img,icon in planets:
    for level in (1,2):
        exercises.append(dict(id=(i-1)*2+level,planet_id=i,title=f'{sub}: миссия {level}',description='Демонстрационный материал для проверки интерфейса. Содержание и видеообразец заменяет лечащий специалист.',steps_json=json.dumps(['Посмотри образец, который подготовил врач.','Выполни только назначенные врачом действия и количество повторений.','Загрузи короткое видео выполнения и дождись комментария.'],ensure_ascii=False),level=level,duration_seconds=60 if level==1 else 90,repetitions='По назначению врача',video_path='assets/demo-mission.mp4',created_by=1,created_at=stamp))
add('exercises',exercises)
assignments=[(1,6,1),(2,6,3),(3,6,5),(4,6,7),(5,6,9),(6,6,11),(7,7,1),(8,7,3),(9,7,7),(10,8,1),(11,8,3)]
add('assignments',[dict(id=i,patient_id=p,exercise_id=e,doctor_id=2,instructions='Тестовое назначение. Уточни у врача содержание и режим занятий.',days_per_week=7,created_at=stamp) for i,p,e in assignments])
add('visits',[dict(id=1,patient_id=6,doctor_id=3,visited_at='2026-10-01 11:00:00',diagnosis='Демонстрационная запись осмотра',appliance='Демонстрационный аппарат',method='Демонстрационный метод',recommendations='Тестовые рекомендации. Реальные данные заполняет врач.',treatment_plan='Тестовый план совместного ведения',next_visit='2026-10-20',created_at=stamp),dict(id=2,patient_id=6,doctor_id=2,visited_at='2026-10-03 15:00:00',diagnosis='Демонстрационная функциональная оценка',appliance='Демонстрационный аппарат',method='Тестовое назначение комплекса',recommendations='Демонстрационная запись для проверки истории',next_visit='2026-10-17',created_at=stamp)])
add('referrals',[dict(id=1,patient_id=6,from_doctor=3,to_doctor=4,specialty='ent',note='Демонстрационное направление для проверки совместного ведения.',created_at='2026-10-08 12:00:00')])
add('media',[dict(id=1,owner_id=3,patient_id=6,category='photo',original_name='Демонстрация фотопротокола 1.webp',stored_name='demo-photo-before.webp',mime_type='image/webp',size_bytes=1,capture_date='2026-10-01',note='Тестовое изображение. Не фотография пациента.',created_at=stamp),dict(id=2,owner_id=3,patient_id=6,category='photo',original_name='Демонстрация фотопротокола 2.webp',stored_name='demo-photo-after.webp',mime_type='image/webp',size_bytes=1,capture_date='2026-10-10',note='Тестовое изображение. Не фотография пациента.',created_at='2026-10-10 11:00:00'),dict(id=3,owner_id=6,patient_id=6,category='video',original_name='Демонстрационное видео.mp4',stored_name='demo-video.mp4',mime_type='video/mp4',size_bytes=1,created_at='2026-10-12 09:00:00')])
add('submissions',[dict(id=1,assignment_id=2,patient_id=6,exercise_id=3,media_id=3,status='pending',patient_comment='Демонстрационное видео для проверки сценария. Не выполнение лечебного упражнения.',created_at='2026-10-12 09:00:00')])
add('practices',[dict(assignment_id=a,patient_id=6,exercise_id=e,practice_day=day,created_at=day+' 18:00:00') for day in ['2026-10-09','2026-10-10','2026-10-11'] for a,p,e in assignments[:3]])
add('rewards',[dict(patient_id=6,assignment_id=a,reward_day=day,kind=kind,points=10 if kind=='fuel' else 25,created_at=day+' 18:00:00') for day in ['2026-10-09','2026-10-10','2026-10-11'] for a in [1,2,3] for kind in ['fuel','xp']])
add('notifications',[dict(user_id=6,type='assignment',title='Твой маршрут готов',body='Шесть планет и назначенные миссии ждут тебя. Продолжай в своём темпе.',link='?page=galaxy',created_at=stamp),dict(user_id=6,type='photo',title='Новый фотопротокол',body='Демонстрационная фотография добавлена в историю прогресса.',link='?page=progress',created_at='2026-10-10 11:05:00'),dict(user_id=4,type='referral',title='К тебе направлен пациент',body='Александр · Ирина Волкова',link='?page=doctor&tab=referrals',created_at='2026-10-08 12:00:00')])
add('messages',[dict(patient_id=6,sender_id=2,recipient_id=6,body='Это демонстрационный диалог. Здесь врач сможет объяснить назначение и ответить на вопросы.',created_at=stamp)])
settings={
 'about':'MyoSkills объединяет домашние занятия и обратную связь специалистов. Пациент получает персональный маршрут, а команда врачей — общую картину занятий и лечения.',
 'contact_email':'', 'contact_phone':'','legal_company':'',
 'landing_title':'Твой навык. Твоя галактика.',
 'tariffs_message':'На первом этапе доступ к сервису бесплатный. Тарифы появятся после запуска платных возможностей.',
 'shop_links':[],
 'services':[{'title':'Персональный маршрут','text':'Миотерапевт выбирает упражнения и открывает новые миссии после проверки.'},{'title':'Обратная связь по видео','text':'Загружай выполнение и получай комментарии специалиста.'},{'title':'Команда рядом','text':'Смежные врачи видят историю лечения в пределах своих прав.'}],
 'faq':[{'q':'Кто открывает новые упражнения?','a':'Верифицированный миотерапевт из вашей команды. Доступ определяется назначением.'},{'q':'Можно ли записать видео прямо на сайте?','a':'Да, если браузер поддерживает запись и сайт открыт по HTTPS. Готовый файл можно загрузить отдельно.'},{'q':'Кто видит мои фотографии и видео?','a':'Вы, специалисты вашей команды и администратор с правом доступа. Другие пациенты не получают доступ.'},{'q':'За что выдаются награды?','a':'Топливо отмечает выполнение, звёзды и опыт — подтверждение врача. Новые уровни открывает миотерапевт.'}]
}
add('app_settings',[dict(setting_key=k,setting_value=json.dumps(v,ensure_ascii=False) if isinstance(v,list) else v) for k,v in settings.items()])
lines.append('COMMIT;')
(root/'database'/'seed.sql').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('seed.sql generated')
