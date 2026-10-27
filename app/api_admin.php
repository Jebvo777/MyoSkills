<?php
declare(strict_types=1);
function api_admin(string $action): bool {
    if(!str_starts_with($action,'admin.')) return false;
    $u=require_user(['admin']);
    switch($action) {
    case 'admin.dashboard':
        $users=visible_accounts(many('SELECT id,email,name,role,specialty,verified,active,city,clinic,created_at FROM users WHERE archived_at IS NULL ORDER BY id DESC'));
        json_response(['testimonials'=>many("SELECT t.* FROM testimonials t JOIN users u ON u.id=t.patient_id WHERE t.is_demo=0 AND u.active=1 AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test' ORDER BY t.id DESC"),'assets'=>many("SELECT id,original_name,note,mime_type,is_public FROM media WHERE category='site' AND archived_at IS NULL ORDER BY id DESC"),'users'=>$users,'pages'=>many('SELECT * FROM content_pages ORDER BY sort_order'),'exercises'=>many('SELECT e.*,p.title planet_title,p.color FROM exercises e JOIN planets p ON p.id=e.planet_id WHERE e.archived_at IS NULL ORDER BY p.sort_order,e.level'),'planets'=>many('SELECT * FROM planets ORDER BY sort_order'),'documents'=>many("SELECT m.id,m.owner_id,m.original_name,m.created_at,u.name,u.specialty,u.verified FROM media m JOIN users u ON u.id=m.owner_id WHERE m.category='diploma' AND m.archived_at IS NULL AND u.archived_at IS NULL ORDER BY m.id DESC"),'settings'=>settings(),'audit'=>many('SELECT a.*,u.name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE u.archived_at IS NULL ORDER BY a.id DESC LIMIT 100'),'totals'=>['users'=>count($users),'patients'=>(int)one("SELECT COUNT(*) n FROM patients p JOIN users u ON u.id=p.user_id WHERE u.role='patient' AND u.archived_at IS NULL")['n'],'submissions'=>(int)one("SELECT COUNT(*) n FROM submissions s JOIN users u ON u.id=s.patient_id JOIN exercises e ON e.id=s.exercise_id JOIN media m ON m.id=s.media_id WHERE s.status='pending' AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test' AND e.archived_at IS NULL AND m.archived_at IS NULL")['n']+ (int)one("SELECT COUNT(*) n FROM submissions s JOIN users u ON u.id=s.patient_id JOIN exercises e ON e.id=s.exercise_id JOIN media m ON m.id=s.media_id WHERE s.status!='pending' AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test' AND e.archived_at IS NULL AND m.archived_at IS NULL")['n'],'pending'=>(int)one("SELECT COUNT(*) n FROM submissions s JOIN users u ON u.id=s.patient_id JOIN exercises e ON e.id=s.exercise_id JOIN media m ON m.id=s.media_id WHERE s.status='pending' AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test' AND e.archived_at IS NULL AND m.archived_at IS NULL")['n']]]);
    case 'admin.page.save':
        write_guard();$d=input();$slug=required($d,'slug',80);if(!preg_match('/^[a-z0-9][a-z0-9-]{1,79}$/',$slug))fail('Адрес страницы: латиница, цифры и дефис');
        $cover=!empty($d['cover_media_id'])?ident($d['cover_media_id']):null;
        if($cover&&!one("SELECT id FROM media WHERE id=? AND category='site' AND is_public=1 AND archived_at IS NULL AND mime_type LIKE 'image/%'",[$cover]))fail('Обложка должна быть публичным изображением');
        $values=['slug'=>$slug,'title'=>required($d,'title',160),'title_en'=>value($d,'title_en',160),'body'=>required($d,'body',30000),'body_en'=>value($d,'body_en',30000),'cover_media_id'=>$cover,'menu_label'=>value($d,'menu_label',80),'menu_label_en'=>value($d,'menu_label_en',80),'active'=>!empty($d['active'])?1:0,'sort_order'=>(int)($d['sort_order']??0)];
        if(!empty($d['id'])){$id=ident($d['id']);if(!one('SELECT id FROM content_pages WHERE id=?',[$id]))fail('Страница не найдена');$parts=[];foreach($values as $k=>$v)$parts[]=$k.'=?';sql('UPDATE content_pages SET '.implode(',',$parts).' WHERE id=?',[...array_values($values),$id]);}
        else $id=insert('content_pages',$values);
        audit($u,'admin.page.save','page',$id);json_response(['id'=>$id]);
    case 'admin.user.save':
        write_guard(); $d=input(); $id=ident($d['id']??0); $old=one('SELECT * FROM users WHERE id=?',[$id]); if(!$old || !account_available($old)) fail('Пользователь не найден');
        $active=!empty($d['active'])?1:0; $verified=!empty($d['verified'])?1:0;
        if($id===(int)$u['id'] && !$active) fail('Нельзя отключить собственный аккаунт');
        if($verified && $old['role']==='doctor' && !$old['verified'] && !one("SELECT id FROM media WHERE owner_id=? AND category='diploma' AND archived_at IS NULL",[$id])) fail('Для верификации нужен загруженный документ специалиста');
        sql('UPDATE users SET active=?,verified=? WHERE id=?',[$active,$old['role']==='doctor'?$verified:0,$id]);
        if($old['role']==='doctor' && $verified!== (int)$old['verified']) notification($id,'verification',$verified?'Профиль специалиста подтверждён':'Профиль требует проверки','Статус документов обновлён администратором','?page=doctor');
        audit($u,'admin.user.save','user',$id); json_response(['message'=>'Пользователь обновлён']);
    case 'admin.exercise.save':
        write_guard(); $d=input(); $pid=ident($d['planet_id']??0); if(!one('SELECT id FROM planets WHERE id=?',[$pid])) fail('Планета не найдена');
        $steps=$d['steps']??[]; if(!is_array($steps)||count($steps)>20) fail('Не более 20 шагов');
        $steps=array_values(array_filter(array_map(fn($s)=>mb_substr(trim((string)$s),0,1000),$steps),fn($s)=>$s!==''));
        $mid=!empty($d['video_media_id'])?ident($d['video_media_id']):null;
        $video=$mid?one("SELECT id,stored_name,mime_type FROM media WHERE id=? AND category='exercise' AND archived_at IS NULL",[$mid]):null;
        if($mid && (!$video || !str_starts_with($video['mime_type'],'video/') || !is_readable(MYO_ROOT.'/storage/files/'.basename($video['stored_name'])))) fail('Выберите доступное видео из библиотеки');
        if(!empty($d['active']) && (!$video || !$steps || value($d,'description',7000)==='')) fail('Для публикации упражнения загрузите видеообразец, добавьте описание и хотя бы один шаг. Без них сохраните упражнение как черновик.');
        $values=['planet_id'=>$pid,'title'=>required($d,'title',160),'description'=>value($d,'description',7000),'steps_json'=>json_encode($steps,JSON_UNESCAPED_UNICODE),'level'=>max(1,min(10,(int)($d['level']??1))),'duration_seconds'=>max(10,min(3600,(int)($d['duration_seconds']??60))),'repetitions'=>value($d,'repetitions',60),'video_media_id'=>$mid,'video_path'=>'','active'=>!empty($d['active'])?1:0];
        if(!empty($d['id'])) { $id=ident($d['id']); if(!one('SELECT id FROM exercises WHERE id=? AND archived_at IS NULL',[$id])) fail('Упражнение не найдено'); $sets=[];foreach($values as $k=>$v)$sets[]=$k.'=?'; sql('UPDATE exercises SET '.implode(',',$sets).' WHERE id=?',[...array_values($values),$id]); }
        else {$values['created_by']=$u['id'];$values['created_at']=now();$id=insert('exercises',$values);}
        audit($u,'admin.exercise.save','exercise',$id); json_response(['id'=>$id]);
    case 'admin.planet.save':
        write_guard(); $d=input(); $id=ident($d['id']??0); $planet=one('SELECT * FROM planets WHERE id=?',[$id]);if(!$planet) fail('Планета не найдена');
        $color=required($d,'color',12); if(!preg_match('/^#[0-9a-fA-F]{6}$/',$color)) fail('Цвет в формате #7357e8');
        $image=$planet['image'];
        if(array_key_exists('image_media_id',$d)){
            if(empty($d['image_media_id']))$image='assets/images/planet-'.$planet['slug'].'.webp';
            else {$mid=ident($d['image_media_id']);if(!one("SELECT id FROM media WHERE id=? AND category='site' AND is_public=1 AND archived_at IS NULL AND mime_type LIKE 'image/%'",[$mid]))fail('Выберите публичное изображение');$image='asset.php?id='.$mid;}
        }
        sql('UPDATE planets SET title=?,subtitle=?,description=?,color=?,image=?,sort_order=? WHERE id=?',[required($d,'title',100),value($d,'subtitle',160),value($d,'description',3000),$color,$image,(int)($d['sort_order']??0),$id]);
        audit($u,'admin.planet.save','planet',$id); json_response(['id'=>$id]);
    case 'admin.settings.save':
        write_guard(); $d=input(); $keys=['about','contact_email','contact_phone','contact_address','legal_company','shop_links','services','faq','tariffs_message','landing_title','about_en','landing_title_en','tariffs_message_en','services_en','faq_en','shop_links_en'];
        $values=[];
        foreach($d as $key=>$v){
            if(!in_array($key,$keys,true)) continue;
            if(in_array($key,['shop_links','services','faq','shop_links_en','services_en','faq_en'],true)) {
                if(!is_array($v)||!array_is_list($v)||count($v)>30) fail('Неверная структура контента');
                $base=str_replace('_en','',$key);$items=[];
                foreach($v as $item){
                    if(!is_array($item))fail('Неверная структура контента');
                    if($base==='shop_links')$items[]=['title'=>required($item,'title',160),'url'=>http_url(required($item,'url',500)),'description'=>value($item,'description',1000)];
                    elseif($base==='services')$items[]=['title'=>required($item,'title',160),'text'=>required($item,'text',3000)];
                    else $items[]=['q'=>required($item,'q',200),'a'=>required($item,'a',6000)];
                }
                $v=$items;
                $v=json_encode($v,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
            } else $v=value([$key=>$v],$key,15000);
            if($key==='contact_email' && $v!=='' && !filter_var($v,FILTER_VALIDATE_EMAIL))fail('Укажите корректную почту');
            if(strlen($v)>60000) fail('Слишком большой блок контента: '.$key);
            $values[$key]=$v;
        }
        transaction(function() use($values,$u){
            foreach($values as $key=>$v) {
                sql('INSERT INTO app_settings (setting_key,setting_value) VALUES (?,?) ON DUPLICATE KEY UPDATE setting_value=?',[$key,$v,$v]);
            }
            audit($u,'admin.settings.save');
        }); json_response(['message'=>'Контент сохранён']);
    }
    fail('Действие администратора не найдено',404);
}
