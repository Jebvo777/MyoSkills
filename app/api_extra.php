<?php
declare(strict_types=1);

function api_extra(string $action): bool {
    switch($action) {
    case 'account.voice':
        write_guard();$u=require_user();$d=input();$preferences=json_decode($u['preferences_json']??'{}',true)?:[];
        $preferences['voice_instructions']=!empty($d['enabled']);sql('UPDATE users SET preferences_json=? WHERE id=?',[json_encode($preferences),$u['id']]);json_response(['enabled'=>$preferences['voice_instructions']]);
    case 'invitation.accept':
        write_guard(); $u=require_user(['patient']); $d=input(); $code=mb_strtoupper(required($d,'code',40));
        $doctorId=transaction(function() use($u,$code){
            $invite=one('SELECT * FROM patient_invitations WHERE code_hash=? AND email=? AND accepted_at IS NULL AND expires_at>?'.lock_suffix(),[hash('sha256',$code),$u['email'],now()]);
            if(!$invite) fail('Код не найден, истёк или выдан для другой почты',400);
            $doctor=one("SELECT * FROM users WHERE id=? AND role='doctor' AND active=1 AND verified=1",[$invite['doctor_id']]);
            if(!$doctor) fail('Профиль приглашающего специалиста сейчас недоступен',403);
            $member=one('SELECT id FROM patient_team WHERE patient_id=? AND doctor_id=?',[$u['id'],$doctor['id']]);
            if($member) sql("UPDATE patient_team SET status='active',joined_at=? WHERE id=?",[now(),$member['id']]);
            else insert('patient_team',['patient_id'=>$u['id'],'doctor_id'=>$doctor['id'],'status'=>'active','joined_at'=>now()]);
            sql('UPDATE patient_invitations SET accepted_at=? WHERE id=?',[now(),$invite['id']]);
            notification((int)$doctor['id'],'team','Пациент принял приглашение',$u['name'],'?page=patient&id='.$u['id']);
            audit($u,'invitation.accept','invitation',(int)$invite['id']);
            return (int)$doctor['id'];
        }); json_response(['doctor_id'=>$doctorId,'message'=>'Специалист добавлен в команду']);
    case 'treatment.save':
        write_guard(); $u=require_user(['doctor','admin']);
        if($u['role']==='doctor'){assert_doctor($u);if(!in_array($u['specialty'],['myotherapist','orthodontist'],true))fail('План лечения ведёт ортодонт или миотерапевт',403);}
        $d=input();$pid=ident($d['patient_id']??0);patient_access($pid,$u,true);
        $start=date_value($d['started_at']??null);$finish=date_value($d['finished_at']??null);
        if($start && $finish && $finish<$start)fail('Дата завершения не может быть раньше начала');
        $status=value($d,'status',30,'active');if(!in_array($status,['active','paused','completed'],true))fail('Неверный статус лечения');
        sql('UPDATE patients SET appliance=?,treatment_plan=?,treatment_clinic=?,started_at=?,finished_at=?,status=? WHERE user_id=?',[value($d,'appliance',160),value($d,'treatment_plan',5000),value($d,'treatment_clinic',180),$start,$finish,$status,$pid]);
        audit($u,'treatment.save','patient',$pid);json_response(['message'=>'План лечения сохранён']);
    case 'document.visibility':
        write_guard();$u=require_user(['doctor']);$d=input();$id=ident($d['id']??0);
        if(!one("SELECT id FROM media WHERE id=? AND owner_id=? AND category='diploma'",[$id,$u['id']]))fail('Документ не найден',404);
        sql('UPDATE media SET is_public=? WHERE id=?',[!empty($d['is_public'])?1:0,$id]);
        audit($u,'document.visibility','media',$id);json_response(['message'=>'Видимость документа обновлена']);
    case 'testimonial.me':
        $u=require_user(['patient']);json_response(one('SELECT * FROM testimonials WHERE patient_id=?',[$u['id']]));
    case 'testimonial.submit':
        write_guard();$u=require_user(['patient']);$d=input();if(empty($d['consent']))fail('Подтвердите согласие на публикацию отзыва');
        $name=required($d,'author_name',100);$body=required($d,'body',3000);$rating=filter_var($d['rating']??5,FILTER_VALIDATE_INT);
        if($rating===false||$rating<1||$rating>5)fail('Оценка от 1 до 5');
        transaction(function() use($u,$name,$body,$rating){
            sql("INSERT INTO testimonials (patient_id,author_name,rating,body,status,is_demo,created_at,updated_at) VALUES (?,?,?,?,'pending',?,?,?) ON DUPLICATE KEY UPDATE author_name=?,rating=?,body=?,status='pending',updated_at=?",[$u['id'],$name,$rating,$body,config('demo_labels')?1:0,now(),now(),$name,$rating,$body,now()]);
            foreach(many("SELECT id FROM users WHERE role='admin' AND active=1") as $a)notification((int)$a['id'],'testimonial','Новый отзыв на модерации',$name,'?page=admin&tab=feedback');
            audit($u,'testimonial.submit');
        });json_response(['message'=>'Отзыв отправлен на модерацию']);
    case 'admin.testimonial.save':
        write_guard();$u=require_user(['admin']);$d=input();$id=ident($d['id']??0);$status=required($d,'status',20);
        if(!in_array($status,['approved','rejected','pending'],true))fail('Неверный статус');
        $review=one('SELECT * FROM testimonials WHERE id=?',[$id]);if(!$review)fail('Отзыв не найден',404);
        sql('UPDATE testimonials SET status=?,updated_at=? WHERE id=?',[$status,now(),$id]);
        audit($u,'testimonial.moderate','testimonial',$id);json_response(['message'=>'Статус отзыва обновлён']);
    case 'admin.asset.save':
        write_guard();$u=require_user(['admin']);$d=input();$id=ident($d['id']??0);
        if(!one("SELECT id FROM media WHERE id=? AND category='site'",[$id]))fail('Материал не найден',404);
        sql('UPDATE media SET original_name=?,note=?,is_public=? WHERE id=?',[required($d,'title',190),value($d,'note',255),!empty($d['is_public'])?1:0,$id]);
        audit($u,'asset.save','media',$id);json_response(['message'=>'Материал сохранён']);
    }
    return false;
}
