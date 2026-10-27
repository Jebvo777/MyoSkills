<?php
declare(strict_types=1);
function mission_rows(int $id): array {
    return many("SELECT a.*,e.title,e.description,e.steps_json,e.level,e.duration_seconds,e.repetitions,e.video_media_id,e.video_path,p.slug,p.title planet_title,p.color,p.image,p.icon,
    (SELECT COUNT(*) FROM practices pr WHERE pr.assignment_id=a.id AND pr.practice_day=?) done_today,
    (SELECT s.status FROM submissions s JOIN media m ON m.id=s.media_id WHERE s.assignment_id=a.id AND m.archived_at IS NULL ORDER BY s.id DESC LIMIT 1) last_status,
    (SELECT COUNT(*) FROM submissions s JOIN media m ON m.id=s.media_id WHERE s.assignment_id=a.id AND s.status='approved' AND m.archived_at IS NULL) approvals
    FROM assignments a JOIN exercises e ON e.id=a.exercise_id JOIN planets p ON p.id=e.planet_id WHERE a.patient_id=? AND e.active=1 AND e.archived_at IS NULL ORDER BY p.sort_order,e.level,a.id",[today(),$id]);
}
function api_patient(string $action): bool {
    switch($action) {
    case 'dashboard':
        $u=require_user(); $id=patient_id($u); $patient=patient_access($id,$u);
        $team=array_map(fn($r)=>public_user($r),many("SELECT u.* FROM patient_team t JOIN users u ON u.id=t.doctor_id WHERE t.patient_id=? AND t.status='active' AND u.active=1 AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test'",[$id]));
        json_response(['patient'=>$patient,'stats'=>stats($id),'missions'=>mission_rows($id),'planets'=>many('SELECT * FROM planets ORDER BY sort_order'),'team'=>$team,'notifications'=>many('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 6',[$u['id']])]);
    case 'mission':
        $u=require_user(); $id=patient_id($u); patient_access($id,$u);
        $aid=ident($_GET['id']??0); $rows=mission_rows($id); $m=null;
        foreach($rows as $row) if((int)$row['id']===$aid) $m=$row;
        if(!$m || $m['status']!=='active') fail('Это упражнение ещё не назначено или приостановлено',403);
        $m['steps']=json_decode($m['steps_json']??'[]',true)?:[];
        $m['submissions']=many('SELECT s.*,u.name reviewer FROM submissions s JOIN media m ON m.id=s.media_id LEFT JOIN users u ON u.id=s.reviewed_by WHERE s.assignment_id=? AND m.archived_at IS NULL ORDER BY s.id DESC LIMIT 12',[$aid]);
        json_response($m);
    case 'practice.complete':
        write_guard(); $u=require_user(['patient']); $d=input(); $aid=ident($d['assignment_id']??0);
        $result=transaction(function() use($u,$aid){
            $a=one("SELECT a.* FROM assignments a JOIN exercises e ON e.id=a.exercise_id WHERE a.id=? AND a.patient_id=? AND a.status='active' AND e.active=1 AND e.archived_at IS NULL".lock_suffix(),[$aid,$u['id']]);
            if(!$a) fail('Упражнение недоступно',403);
            if(!one('SELECT id FROM practices WHERE assignment_id=? AND practice_day=?',[$aid,today()])) insert('practices',['assignment_id'=>$aid,'patient_id'=>$u['id'],'exercise_id'=>$a['exercise_id'],'practice_day'=>today(),'created_at'=>now()]);
            $awarded=reward((int)$u['id'],$aid,today(),'fuel',10);
            return ['awarded'=>$awarded,'stats'=>stats((int)$u['id'])];
        }); json_response($result);
    case 'submission.create':
        write_guard(); $u=require_user(['patient']); $d=input(); $aid=ident($d['assignment_id']??0); $mid=ident($d['media_id']??0);
        $sid=transaction(function() use($u,$d,$aid,$mid){
            $a=one("SELECT a.* FROM assignments a JOIN exercises e ON e.id=a.exercise_id WHERE a.id=? AND a.patient_id=? AND a.status='active' AND e.active=1 AND e.archived_at IS NULL".lock_suffix(),[$aid,$u['id']]);
            if(!$a) fail('Упражнение недоступно',403);
            $m=one("SELECT * FROM media WHERE id=? AND owner_id=? AND patient_id=? AND category='video' AND archived_at IS NULL",[$mid,$u['id'],$u['id']]);
            if(!$m) fail('Видеофайл не найден',404);
            if(one('SELECT id FROM submissions WHERE media_id=?',[$mid])) fail('Это видео уже отправлено');
            if((int)one('SELECT COUNT(*) n FROM submissions s JOIN media m ON m.id=s.media_id WHERE s.assignment_id=? AND s.status=? AND m.archived_at IS NULL',[$aid,'pending'])['n']>=3) fail('Дождитесь проверки ранее отправленных видео');
            $sid=insert('submissions',['assignment_id'=>$aid,'patient_id'=>$u['id'],'exercise_id'=>$a['exercise_id'],'media_id'=>$mid,'patient_comment'=>value($d,'comment',2000),'created_at'=>now()]);
            if(!one('SELECT id FROM practices WHERE assignment_id=? AND practice_day=?',[$aid,today()])) insert('practices',['assignment_id'=>$aid,'patient_id'=>$u['id'],'exercise_id'=>$a['exercise_id'],'practice_day'=>today(),'created_at'=>now()]);
            reward((int)$u['id'],$aid,today(),'fuel',10);
            notification((int)$a['doctor_id'],'submission','Видео ждёт проверки',$u['name'].' отправил(а) выполнение упражнения','?page=doctor&tab=reviews');
            return $sid;
        }); audit($u,'submission.create','submission',$sid); json_response(['id'=>$sid,'stats'=>stats((int)$u['id'])],201);
    case 'diary':
        $u=require_user(); $id=patient_id($u); patient_access($id,$u);
        $period=($_GET['period']??'month')==='week'?'week':'month';
        $since=date('Y-m-d',strtotime($period==='week'?'-6 days':'-29 days'));
        $rows=many('SELECT pr.*,e.title,p.title planet_title,p.color FROM practices pr JOIN exercises e ON e.id=pr.exercise_id JOIN planets p ON p.id=e.planet_id WHERE pr.patient_id=? AND pr.practice_day>=? AND e.archived_at IS NULL ORDER BY pr.created_at DESC',[$id,$since]);
        $reviews=many('SELECT s.*,e.title,p.color,u.name reviewer FROM submissions s JOIN exercises e ON e.id=s.exercise_id JOIN media m ON m.id=s.media_id JOIN planets p ON p.id=e.planet_id LEFT JOIN users u ON u.id=s.reviewed_by WHERE s.patient_id=? AND s.created_at>=? AND e.archived_at IS NULL AND m.archived_at IS NULL ORDER BY s.id DESC',[$id,$since.' 00:00:00']);
        json_response(['practices'=>$rows,'submissions'=>$reviews,'stats'=>stats($id),'since'=>$since,'period'=>$period]);
    case 'progress':
        $u=require_user(); $id=patient_id($u); $p=patient_access($id,$u);
        $photos=many("SELECT m.id,m.original_name,m.capture_date,m.note,m.created_at,u.name author FROM media m JOIN users u ON u.id=m.owner_id WHERE m.patient_id=? AND m.category='photo' AND m.archived_at IS NULL ORDER BY COALESCE(m.capture_date,m.created_at) DESC,m.id DESC",[$id]);
        json_response(['patient'=>$p,'photos'=>$photos,'stats'=>stats($id),'missions'=>mission_rows($id)]);
    case 'report.send':
        write_guard(); $u=require_user(['patient']); $d=input();
        $period=value($d,'period',10,'week'); if(!in_array($period,['week','month'],true)) fail('Неверный период');
        $since=date('Y-m-d',strtotime($period==='week'?'-6 days':'-29 days'));
        $count=(int)one('SELECT COUNT(*) n FROM practices pr JOIN exercises e ON e.id=pr.exercise_id WHERE pr.patient_id=? AND pr.practice_day>=? AND e.archived_at IS NULL',[$u['id'],$since])['n'];
        notify_team((int)$u['id'],'report','Отчёт о занятиях',$u['name'].': '.$count.' занятий. Период: '.$period,'?page=patient&id='.$u['id'].'&tab=diary&period='.$period);
        json_response(['message'=>'Отчёт доступен вашей команде врачей','period'=>$period,'count'=>$count]);
    case 'team':
        $u=require_user(); $id=patient_id($u); patient_access($id,$u);
        json_response(array_map(fn($r)=>public_user($r),many("SELECT u.* FROM patient_team t JOIN users u ON u.id=t.doctor_id WHERE t.patient_id=? AND t.status='active' AND u.active=1 AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test'",[$id])));
    case 'team.request':
        write_guard(); $u=require_user(['patient']); $d=input(); $did=ident($d['doctor_id']??0);
        $doctor=one("SELECT * FROM users WHERE id=? AND role='doctor' AND verified=1 AND active=1",[$did]); if(!$doctor || !account_available($doctor)) fail('Специалист не найден',404);
        if(one('SELECT id FROM patient_team WHERE patient_id=? AND doctor_id=?',[$u['id'],$did])) fail('Запрос этому врачу уже отправлен или врач входит в команду');
        insert('patient_team',['patient_id'=>$u['id'],'doctor_id'=>$did,'status'=>'requested','joined_at'=>now()]);
        notification($did,'team_request','Пациент хочет начать занятия',$u['name'],'?page=doctor&tab=requests');
        json_response(['message'=>'Запрос отправлен. Специалист подтвердит начало работы.']);
    case 'messages':
        $u=require_user(); $id=patient_id($u); patient_access($id,$u);
        $other=(int)($_GET['with']??0);
        $params=[$id,$u['id'],$u['id']];
        $where='m.patient_id=? AND (m.sender_id=? OR m.recipient_id=?)';
        if($other){$where.=' AND (m.sender_id=? OR m.recipient_id=?)';$params[]=$other;$params[]=$other;}
        $rows=many('SELECT m.*,u.name sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE '.$where.' ORDER BY m.id DESC LIMIT 100',$params);
        json_response(array_reverse($rows));
    case 'messages.send':
        write_guard(); $u=require_user(); $d=input(); $id=patient_id($u,$d); patient_access($id,$u);
        $recipient=ident($d['recipient_id']??0); $other=one('SELECT * FROM users WHERE id=? AND active=1',[$recipient]); if(!$other || !account_available($other)) fail('Получатель не найден');
        if($u['role']==='patient') {
            if($other['role']!=='doctor'||!one("SELECT id FROM patient_team WHERE patient_id=? AND doctor_id=? AND status='active'",[$id,$recipient])) fail('Выберите специалиста своей команды',403);
        } elseif($u['role']==='doctor'){ if($recipient!==$id) fail('Сообщение в этом диалоге отправляется пациенту',403); }
        else fail('Администратор не участвует в клинической переписке',403);
        $body=required($d,'body',4000); $mid=insert('messages',['patient_id'=>$id,'sender_id'=>$u['id'],'recipient_id'=>$recipient,'body'=>$body,'created_at'=>now()]);
        notification($recipient,'message','Новое сообщение',$u['name'].': '.mb_substr($body,0,140),'?page=messages'.($other['role']==='doctor'?'&patient_id='.$id:''));
        json_response(['id'=>$mid],201);
    }
    return false;
}
