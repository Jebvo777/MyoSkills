<?php
declare(strict_types=1);
function api_doctor(string $action): bool {
    switch($action) {
    case 'doctor.dashboard':
        $u=require_user(['doctor']);
        $documents=many("SELECT id,original_name,created_at,mime_type,is_public FROM media WHERE owner_id=? AND category='diploma' AND archived_at IS NULL ORDER BY id DESC",[$u['id']]);
        if(!$u['verified']) json_response(['verified'=>false,'patients'=>[],'documents'=>$documents,'reviews'=>[],'referrals'=>[],'requests'=>[]]);
        $patients=many("SELECT p.*,u.name,u.city,(SELECT COUNT(*) FROM practices pr JOIN exercises pe ON pe.id=pr.exercise_id WHERE pr.patient_id=p.user_id AND pr.practice_day=? AND pe.archived_at IS NULL) today_count,(SELECT COUNT(*) FROM submissions s JOIN exercises e ON e.id=s.exercise_id JOIN media m ON m.id=s.media_id WHERE s.patient_id=p.user_id AND s.status='pending' AND e.archived_at IS NULL AND m.archived_at IS NULL) pending,(SELECT MAX(visited_at) FROM visits v WHERE v.patient_id=p.user_id) last_visit FROM patient_team t JOIN patients p ON p.user_id=t.patient_id JOIN users u ON u.id=p.user_id WHERE t.doctor_id=? AND t.status='active' AND u.active=1 AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test' ORDER BY u.name",[today(),$u['id']]);
        foreach($patients as &$p) $p['stats']=stats((int)$p['user_id']); unset($p);
        $reviews=many("SELECT s.*,e.title,u.name patient_name,p.color,p.title planet_title FROM submissions s JOIN exercises e ON e.id=s.exercise_id JOIN media m ON m.id=s.media_id JOIN planets p ON p.id=e.planet_id JOIN users u ON u.id=s.patient_id JOIN patient_team t ON t.patient_id=s.patient_id WHERE t.doctor_id=? AND t.status='active' AND s.status='pending' AND u.active=1 AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test' AND e.archived_at IS NULL AND m.archived_at IS NULL ORDER BY s.id",[$u['id']]);
        $referrals=many("SELECT r.*,u.name patient_name,f.name from_name,COALESCE(t.name,r.external_name) to_name FROM referrals r JOIN users u ON u.id=r.patient_id JOIN users f ON f.id=r.from_doctor LEFT JOIN users t ON t.id=r.to_doctor WHERE (r.from_doctor=? OR r.to_doctor=?) AND u.active=1 AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test' ORDER BY r.id DESC",[$u['id'],$u['id']]);
        $requests=many("SELECT t.id,t.patient_id,u.name,u.city,t.joined_at FROM patient_team t JOIN users u ON u.id=t.patient_id WHERE t.doctor_id=? AND t.status='requested' AND u.active=1 AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test'",[$u['id']]);
        json_response(['verified'=>true,'patients'=>$patients,'reviews'=>$reviews,'referrals'=>$referrals,'requests'=>$requests,'documents'=>$documents,'may_assign'=>may_assign($u)]);
    case 'doctor.patient':
        $u=require_user(['doctor','admin']); if($u['role']==='doctor') assert_doctor($u);
        $id=ident($_GET['id']??0); $p=patient_access($id,$u,true);
        $visits=many('SELECT v.*,u.name doctor_name,u.specialty FROM visits v JOIN users u ON u.id=v.doctor_id WHERE v.patient_id=? ORDER BY v.visited_at DESC',[$id]);
        foreach($visits as &$visit)$visit['files']=many('SELECT m.id,m.original_name,m.mime_type FROM visit_files vf JOIN media m ON m.id=vf.media_id WHERE vf.visit_id=? AND m.archived_at IS NULL',[$visit['id']]);unset($visit);
        $referrals=many('SELECT r.*,f.name from_name,COALESCE(t.name,r.external_name) to_name FROM referrals r JOIN users f ON f.id=r.from_doctor LEFT JOIN users t ON t.id=r.to_doctor WHERE r.patient_id=? ORDER BY r.id DESC',[$id]);
        json_response(['patient'=>$p,'stats'=>stats($id),'missions'=>mission_rows($id),'exercises'=>many('SELECT e.*,p.title planet_title,p.color FROM exercises e JOIN planets p ON p.id=e.planet_id WHERE e.active=1 AND e.archived_at IS NULL ORDER BY p.sort_order,e.level'),'team'=>array_map(fn($r)=>public_user($r),many("SELECT u.* FROM patient_team t JOIN users u ON u.id=t.doctor_id WHERE t.patient_id=? AND t.status='active' AND u.active=1 AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test'",[$id])),'visits'=>$visits,'referrals'=>$referrals,'photos'=>many("SELECT m.id,m.original_name,m.capture_date,m.note,u.name author FROM media m JOIN users u ON u.id=m.owner_id WHERE m.patient_id=? AND m.category='photo' AND m.archived_at IS NULL ORDER BY COALESCE(m.capture_date,m.created_at) DESC",[$id]),'documents'=>many("SELECT id,original_name,capture_date,note,created_at FROM media WHERE patient_id=? AND category='document' AND archived_at IS NULL ORDER BY id DESC",[$id]),'submissions'=>many('SELECT s.*,e.title,u.name reviewer FROM submissions s JOIN exercises e ON e.id=s.exercise_id JOIN media m ON m.id=s.media_id LEFT JOIN users u ON u.id=s.reviewed_by WHERE s.patient_id=? AND e.archived_at IS NULL AND m.archived_at IS NULL ORDER BY s.id DESC LIMIT 60',[$id]),'may_assign'=>may_assign($u),'may_photo'=>$u['role']==='admin'||in_array($u['specialty'],['myotherapist','orthodontist'],true)]);
    case 'doctor.patient.add':
        write_guard(); $u=require_user(['doctor']); assert_doctor($u); $d=input();
        $name=required($d,'name',160); $email=mb_strtolower(required($d,'email',190)); if(!filter_var($email,FILTER_VALIDATE_EMAIL) || reserved_account_email($email)) fail('Укажите действующую почту');
        $existing=one('SELECT * FROM users WHERE email=?',[$email]); $temporary=null;
        if($existing && (!account_available($existing) || !$existing['active'])) fail('Нельзя подключить этот аккаунт');
        if($existing && value($d,'access_code',40)==='') {
            if($existing['role']!=='patient'||!$existing['active'])fail('Нельзя подключить этот аккаунт');
            if(!one("SELECT id FROM patient_team WHERE patient_id=? AND doctor_id=? AND status='active'",[$existing['id'],$u['id']])) {
                $code='MYO-'.strtoupper(bin2hex(random_bytes(12)));
                transaction(function() use($u,$existing,$email,$code){
                    sql('UPDATE patient_invitations SET expires_at=? WHERE doctor_id=? AND email=? AND accepted_at IS NULL',[now(),$u['id'],$email]);
                    $invite=insert('patient_invitations',['doctor_id'=>$u['id'],'email'=>$email,'code_hash'=>hash('sha256',$code),'expires_at'=>date('Y-m-d H:i:s',strtotime('+14 days')),'created_at'=>now()]);
                    notification((int)$existing['id'],'invitation','Приглашение в команду врача',$u['name'].' · код: '.$code,'?page=profile');audit($u,'patient.invite','invitation',$invite);
                });
                json_response(['patient_id'=>null,'email'=>$email,'temporary_password'=>null,'access_code'=>$code,'requires_accept'=>true],201);
            }
            $d['access_code']=one('SELECT access_code FROM patients WHERE user_id=?',[$existing['id']])['access_code'];
        }
        $pid=transaction(function() use($d,$u,$name,$email,$existing,&$temporary){
            if($existing) {
                $p=one('SELECT * FROM patients WHERE user_id=? AND access_code=?',[$existing['id'],value($d,'access_code',40)]);
                if(!$p||$existing['role']!=='patient') fail('Для подключения существующего пациента нужен его код доступа');
                $pid=(int)$existing['id'];
            } else {
                $temporary='Myo-'.bin2hex(random_bytes(7)).'!';
                $pid=insert('users',['email'=>$email,'password_hash'=>password_hash($temporary,PASSWORD_DEFAULT),'name'=>$name,'role'=>'patient','phone'=>value($d,'phone',40),'city'=>value($d,'city',100),'about'=>'','created_at'=>now()]);
                $extended=in_array($u['specialty'],['myotherapist','orthodontist'],true);
                insert('patients',['user_id'=>$pid,'access_code'=>'MYO-'.strtoupper(bin2hex(random_bytes(12))),'claimed'=>0,'appliance'=>$extended?value($d,'appliance',160):'','treatment_plan'=>$extended?value($d,'treatment_plan',4000):'','started_at'=>today()]);
            }
            if(!one('SELECT id FROM patient_team WHERE patient_id=? AND doctor_id=?',[$pid,$u['id']])) insert('patient_team',['patient_id'=>$pid,'doctor_id'=>$u['id'],'status'=>'active','joined_at'=>now()]);
            else sql("UPDATE patient_team SET status='active',joined_at=? WHERE patient_id=? AND doctor_id=?",[now(),$pid,$u['id']]);
            notification($pid,'team','Врач присоединился к твоей команде',$u['name'],'?page=team');
            return $pid;
        });
        audit($u,'patient.add','patient',$pid); $p=one('SELECT access_code FROM patients WHERE user_id=?',[$pid]);
        json_response(['patient_id'=>$pid,'email'=>$email,'temporary_password'=>$temporary,'access_code'=>$p['access_code']],201);
    case 'doctor.request.respond':
        write_guard(); $u=require_user(['doctor']); assert_doctor($u); $d=input();
        $request=one("SELECT t.* FROM patient_team t JOIN users p ON p.id=t.patient_id WHERE t.id=? AND t.doctor_id=? AND t.status='requested' AND p.active=1 AND p.archived_at IS NULL AND LOWER(p.email) NOT LIKE '%@myoskills.test'",[ident($d['id']??0),$u['id']]); if(!$request) fail('Запрос не найден',404);
        $accept=!empty($d['accept']); sql('UPDATE patient_team SET status=?,joined_at=? WHERE id=?',[$accept?'active':'declined',now(),$request['id']]);
        notification((int)$request['patient_id'],'team',$accept?'Специалист подтвердил начало работы':'Ответ на запрос специалисту',$u['name'],$accept?'?page=team':'?page=specialists');
        json_response(['message'=>'Ответ сохранён']);
    case 'assignment.save':
        write_guard(); $u=require_user(['doctor']); if(!may_assign($u)) fail('Упражнения назначает верифицированный миотерапевт',403);
        $d=input(); $pid=ident($d['patient_id']??0); patient_access($pid,$u,true); $eid=ident($d['exercise_id']??0);
        if(!one('SELECT id FROM exercises WHERE id=? AND active=1 AND archived_at IS NULL',[$eid])) fail('Упражнение не найдено');
        $status=value($d,'status',20,'active'); if(!in_array($status,['active','paused','completed'],true)) fail('Неверный статус');
        $instructions=value($d,'instructions',3000); $days=max(1,min(7,(int)($d['days_per_week']??7)));
        $aid=transaction(function() use($pid,$eid,$u,$status,$instructions,$days){
            one('SELECT user_id FROM patients WHERE user_id=?'.lock_suffix(),[$pid]);
            patient_access($pid,$u,true);
            $a=one('SELECT * FROM assignments WHERE patient_id=? AND exercise_id=?'.lock_suffix(),[$pid,$eid]);
            if($a){ sql('UPDATE assignments SET status=?,instructions=?,doctor_id=?,days_per_week=? WHERE id=?',[$status,$instructions,$u['id'],$days,$a['id']]); $aid=(int)$a['id']; }
            else $aid=insert('assignments',['patient_id'=>$pid,'exercise_id'=>$eid,'doctor_id'=>$u['id'],'status'=>$status,'instructions'=>$instructions,'days_per_week'=>$days,'created_at'=>now()]);
            if($status==='active') notification($pid,'assignment','Новая миссия доступна','Миотерапевт обновил твой маршрут','?page=mission&id='.$aid);
            audit($u,'assignment.save','assignment',$aid);
            return $aid;
        }); json_response(['id'=>$aid]);
    case 'submission.review':
        write_guard(); $u=require_user(['doctor']); if(!may_assign($u)) fail('Видео проверяет миотерапевт',403);
        $d=input(); $sid=ident($d['id']??0); $status=required($d,'status',20); if(!in_array($status,['approved','retry'],true)) fail('Неверный статус');
        $comment=value($d,'comment',4000); if($status==='retry'&&$comment==='') fail('Объясните пациенту, что нужно поправить');
        $result=transaction(function() use($u,$sid,$status,$comment){
            $s=one('SELECT s.* FROM submissions s JOIN exercises e ON e.id=s.exercise_id JOIN media m ON m.id=s.media_id WHERE s.id=? AND e.archived_at IS NULL AND m.archived_at IS NULL'.lock_suffix(),[$sid]); if(!$s) fail('Видео не найдено',404);
            patient_access((int)$s['patient_id'],$u,true);
            if($s['status']!=='pending') fail('Это видео уже проверено. Обновите список.',409);
            sql('UPDATE submissions SET status=?,doctor_comment=?,reviewed_by=?,reviewed_at=? WHERE id=?',[$status,$comment,$u['id'],now(),$sid]);
            $awarded=$status==='approved' && reward((int)$s['patient_id'],(int)$s['assignment_id'],substr($s['created_at'],0,10),'xp',25);
            notification((int)$s['patient_id'],'review',$status==='approved'?'Исследование подтверждено':'Есть подсказка от врача',$comment?:'Врач проверил выполнение упражнения','?page=mission&id='.$s['assignment_id']);
            return ['awarded'=>$awarded];
        }); audit($u,'submission.review','submission',$sid); json_response($result);
    case 'visit.create':
        write_guard(); $u=require_user(['doctor']); assert_doctor($u); $d=input(); $pid=ident($d['patient_id']??0); patient_access($pid,$u,true);
        $day=date_value($d['date']??null,false); $time=value($d,'time',5,'12:00'); if(!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/',$time)) fail('Некорректное время');
        $extended=in_array($u['specialty'],['myotherapist','orthodontist'],true);
        $vid=transaction(function() use($u,$d,$pid,$day,$time,$extended){
            $appliance=$extended?value($d,'appliance',160):'';
            $plan=$extended?value($d,'treatment_plan',5000):'';
            $media=$d['media_ids']??[];if(!is_array($media)||count($media)>10)fail('Не более 10 файлов приёма');
            $media=array_values(array_unique(array_map('ident',$media)));
            foreach($media as $mid)if(!one("SELECT id FROM media WHERE id=? AND patient_id=? AND owner_id=? AND archived_at IS NULL AND category IN ('document','photo')",[$mid,$pid,$u['id']]))fail('Файл не относится к этому приёму',403);
            $diagnosis=required($d,'diagnosis',5000);
            $id=insert('visits',['patient_id'=>$pid,'doctor_id'=>$u['id'],'visited_at'=>$day.' '.$time.':00','diagnosis'=>$diagnosis,'appliance'=>$appliance,'method'=>$extended?value($d,'method',190):'','recommendations'=>value($d,'recommendations',5000),'treatment_plan'=>$plan,'next_visit'=>date_value($d['next_visit']??null),'created_at'=>now()]);
            foreach($media as $mid)insert('visit_files',['visit_id'=>$id,'media_id'=>$mid]);
            if($extended) sql('UPDATE patients SET appliance=?,treatment_plan=? WHERE user_id=?',[$appliance,$plan,$pid]);
            notify_team($pid,'visit','Обновлена история приёмов',$u['name'].' · '.mb_substr($diagnosis,0,180),'?page=patient&id='.$pid.'&tab=history');
            return $id;
        }); audit($u,'visit.create','visit',$vid); json_response(['id'=>$vid],201);
    case 'referral.create':
        write_guard(); $u=require_user(['doctor']); assert_doctor($u); if(!in_array($u['specialty'],['myotherapist','orthodontist'],true)) fail('Направление создаёт ортодонт или миотерапевт',403);
        $d=input(); $pid=ident($d['patient_id']??0); $p=patient_access($pid,$u,true); $did=!empty($d['to_doctor'])?ident($d['to_doctor']):null;
        if(!$did) {
            $spec=required($d,'specialty',40);if(!in_array($spec,['myotherapist','orthodontist','ent','osteopath','kinesiologist','neurologist'],true))fail('Выберите специальность');
            $email=value($d,'external_email',190);if($email!==''&&!filter_var($email,FILTER_VALIDATE_EMAIL))fail('Укажите корректную почту');
            $name=required($d,'external_name',160);
            $rid=insert('referrals',['patient_id'=>$pid,'from_doctor'=>$u['id'],'to_doctor'=>null,'external_name'=>$name,'external_email'=>$email,'external_phone'=>value($d,'external_phone',40),'external_clinic'=>value($d,'external_clinic',180),'specialty'=>$spec,'note'=>value($d,'note',4000),'created_at'=>now()]);
            notification($pid,'referral','Направление к специалисту',$name.' · '.$spec,'?page=team');audit($u,'referral.external','referral',$rid);
            json_response(['id'=>$rid,'external'=>true],201);
        }
        $doctor=one("SELECT * FROM users WHERE id=? AND role='doctor' AND active=1 AND verified=1",[$did]); if(!$doctor || !account_available($doctor) || $did===(int)$u['id']) fail('Выберите другого верифицированного специалиста');
        if(one("SELECT id FROM referrals WHERE patient_id=? AND to_doctor=? AND status='pending'",[$pid,$did])) fail('Направление этому специалисту уже ожидает ответа');
        $rid=insert('referrals',['patient_id'=>$pid,'from_doctor'=>$u['id'],'to_doctor'=>$did,'specialty'=>$doctor['specialty'],'note'=>value($d,'note',4000),'created_at'=>now()]);
        notification($did,'referral','К тебе направлен пациент',$p['name'].' · '.$u['name'],'?page=doctor&tab=referrals');
        notification($pid,'referral','Консультация смежного специалиста',$doctor['name'],'?page=team');
        audit($u,'referral.create','referral',$rid); json_response(['id'=>$rid],201);
    case 'referral.respond':
        write_guard(); $u=require_user(['doctor']); assert_doctor($u); $d=input(); $rid=ident($d['id']??0);
        $status=value($d,'status',20); if(!in_array($status,['arrived','missed'],true)) fail('Укажите результат приёма');
        transaction(function() use($u,$rid,$status){
            $r=one("SELECT r.* FROM referrals r JOIN users p ON p.id=r.patient_id WHERE r.id=? AND (r.to_doctor=? OR (r.to_doctor IS NULL AND r.from_doctor=?)) AND r.status='pending' AND p.active=1 AND p.archived_at IS NULL AND LOWER(p.email) NOT LIKE '%@myoskills.test'".lock_suffix(),[$rid,$u['id'],$u['id']]); if(!$r) fail('Направление уже обработано или недоступно',409);
            if(!$r['to_doctor'])patient_access((int)$r['patient_id'],$u,true);
            sql('UPDATE referrals SET status=?,responded_at=? WHERE id=?',[$status,now(),$rid]);
            if($status==='arrived' && $r['to_doctor']) {
                $m=one('SELECT id FROM patient_team WHERE patient_id=? AND doctor_id=?',[$r['patient_id'],$u['id']]);
                if($m) sql("UPDATE patient_team SET status='active',joined_at=? WHERE id=?",[now(),$m['id']]);
                else insert('patient_team',['patient_id'=>$r['patient_id'],'doctor_id'=>$u['id'],'status'=>'active','joined_at'=>now()]);
            }
            notification((int)$r['from_doctor'],'referral_response',$status==='arrived'?'Консультация состоялась':'Пациент не пришёл',$u['name'],'?page=patient&id='.$r['patient_id'].'&tab=history');
        }); audit($u,'referral.respond','referral',$rid); json_response(['message'=>'Результат сохранён']);
    }
    return false;
}
