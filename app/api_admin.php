<?php
declare(strict_types=1);
function api_admin(string $action): bool {
    if(!str_starts_with($action,'admin.')) return false;
    $u=require_user(['admin']);
    switch($action) {
    case 'admin.dashboard':
        $users=many('SELECT id,email,name,role,specialty,verified,active,city,clinic,created_at FROM users ORDER BY id DESC');
        json_response(['users'=>$users,'pages'=>many('SELECT * FROM content_pages ORDER BY sort_order'),'exercises'=>many('SELECT e.*,p.title planet_title,p.color FROM exercises e JOIN planets p ON p.id=e.planet_id ORDER BY p.sort_order,e.level'),'planets'=>many('SELECT * FROM planets ORDER BY sort_order'),'documents'=>many("SELECT m.id,m.owner_id,m.original_name,m.created_at,u.name,u.specialty,u.verified FROM media m JOIN users u ON u.id=m.owner_id WHERE m.category='diploma' ORDER BY m.id DESC"),'settings'=>settings(),'audit'=>many('SELECT a.*,u.name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 100'),'totals'=>['users'=>count($users),'patients'=>(int)one('SELECT COUNT(*) n FROM patients')['n'],'submissions'=>(int)one("SELECT COUNT(*) n FROM submissions WHERE status='pending'")['n']+ (int)one("SELECT COUNT(*) n FROM submissions WHERE status!='pending'")['n'],'pending'=>(int)one("SELECT COUNT(*) n FROM submissions WHERE status='pending'")['n']]]);
    case 'admin.page.save':
        write_guard();$d=input();$slug=required($d,'slug',80);if(!preg_match('/^[a-z0-9][a-z0-9-]{1,79}$/',$slug))fail('Адрес страницы: латиница, цифры и дефис');
        $values=['slug'=>$slug,'title'=>required($d,'title',160),'body'=>required($d,'body',30000),'menu_label'=>value($d,'menu_label',80),'active'=>!empty($d['active'])?1:0,'sort_order'=>(int)($d['sort_order']??0)];
        if(!empty($d['id'])){$id=ident($d['id']);if(!one('SELECT id FROM content_pages WHERE id=?',[$id]))fail('Страница не найдена');$parts=[];foreach($values as $k=>$v)$parts[]=$k.'=?';sql('UPDATE content_pages SET '.implode(',',$parts).' WHERE id=?',[...array_values($values),$id]);}
        else $id=insert('content_pages',$values);
        audit($u,'admin.page.save','page',$id);json_response(['id'=>$id]);
    case 'admin.user.save':
        write_guard(); $d=input(); $id=ident($d['id']??0); $old=one('SELECT * FROM users WHERE id=?',[$id]); if(!$old) fail('Пользователь не найден');
        $active=!empty($d['active'])?1:0; $verified=!empty($d['verified'])?1:0;
        if($id===(int)$u['id'] && !$active) fail('Нельзя отключить собственный аккаунт');
        if($verified && $old['role']==='doctor' && !$old['verified'] && !one("SELECT id FROM media WHERE owner_id=? AND category='diploma'",[$id])) fail('Для верификации нужен загруженный документ специалиста');
        sql('UPDATE users SET active=?,verified=? WHERE id=?',[$active,$old['role']==='doctor'?$verified:0,$id]);
        if($old['role']==='doctor' && $verified!== (int)$old['verified']) notification($id,'verification',$verified?'Профиль специалиста подтверждён':'Профиль требует проверки','Статус документов обновлён администратором','?page=doctor');
        audit($u,'admin.user.save','user',$id); json_response(['message'=>'Пользователь обновлён']);
    case 'admin.exercise.save':
        write_guard(); $d=input(); $pid=ident($d['planet_id']??0); if(!one('SELECT id FROM planets WHERE id=?',[$pid])) fail('Планета не найдена');
        $steps=$d['steps']??[]; if(!is_array($steps)||count($steps)>20) fail('Не более 20 шагов');
        $steps=array_map(fn($s)=>mb_substr(trim((string)$s),0,1000),$steps);
        $mid=!empty($d['video_media_id'])?ident($d['video_media_id']):null;
        if($mid&&!one("SELECT id FROM media WHERE id=? AND category='exercise'",[$mid])) fail('Выберите видео из библиотеки');
        $values=['planet_id'=>$pid,'title'=>required($d,'title',160),'description'=>value($d,'description',7000),'steps_json'=>json_encode($steps,JSON_UNESCAPED_UNICODE),'level'=>max(1,min(10,(int)($d['level']??1))),'duration_seconds'=>max(10,min(3600,(int)($d['duration_seconds']??60))),'repetitions'=>value($d,'repetitions',60),'video_media_id'=>$mid,'video_path'=>$mid?'':'assets/demo-mission.mp4','active'=>!empty($d['active'])?1:0];
        if(!empty($d['id'])) { $id=ident($d['id']); if(!one('SELECT id FROM exercises WHERE id=?',[$id])) fail('Упражнение не найдено'); $sets=[];foreach($values as $k=>$v)$sets[]=$k.'=?'; sql('UPDATE exercises SET '.implode(',',$sets).' WHERE id=?',[...array_values($values),$id]); }
        else {$values['created_by']=$u['id'];$values['created_at']=now();$id=insert('exercises',$values);}
        audit($u,'admin.exercise.save','exercise',$id); json_response(['id'=>$id]);
    case 'admin.planet.save':
        write_guard(); $d=input(); $id=ident($d['id']??0); if(!one('SELECT id FROM planets WHERE id=?',[$id])) fail('Планета не найдена');
        $color=required($d,'color',12); if(!preg_match('/^#[0-9a-fA-F]{6}$/',$color)) fail('Цвет в формате #7357e8');
        sql('UPDATE planets SET title=?,subtitle=?,description=?,color=?,sort_order=? WHERE id=?',[required($d,'title',100),value($d,'subtitle',160),value($d,'description',3000),$color,(int)($d['sort_order']??0),$id]);
        audit($u,'admin.planet.save','planet',$id); json_response(['id'=>$id]);
    case 'admin.settings.save':
        write_guard(); $d=input(); $keys=['about','contact_email','contact_phone','legal_company','shop_links','services','faq','tariffs_message','landing_title'];
        foreach($d as $key=>$v){
            if(!in_array($key,$keys,true)) continue;
            if(in_array($key,['shop_links','services','faq'],true)) {
                if(!is_array($v)||count($v)>30) fail('Неверная структура контента');
                if($key==='shop_links') foreach($v as $item){$parsed=parse_url((string)($item['url']??''));if(!is_array($parsed)||!in_array($parsed['scheme']??'', ['http','https'],true)||empty($parsed['host']))fail('Ссылка должна начинаться с https:// или http://');}
                $v=json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
            } else $v=value([$key=>$v],$key,15000);
            if(one('SELECT setting_key FROM app_settings WHERE setting_key=?',[$key])) sql('UPDATE app_settings SET setting_value=? WHERE setting_key=?',[$v,$key]);
            else insert('app_settings',['setting_key'=>$key,'setting_value'=>$v]);
        }
        audit($u,'admin.settings.save'); json_response(['message'=>'Контент сохранён']);
    }
    fail('Действие администратора не найдено',404);
}
