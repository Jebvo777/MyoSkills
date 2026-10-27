<?php
declare(strict_types=1);
function api_auth(string $action): bool {
    switch($action) {
    case 'public':
        $doctors=array_map(fn($r)=>public_user($r),visible_accounts(many("SELECT * FROM users WHERE role='doctor' AND verified=1 AND active=1 AND archived_at IS NULL ORDER BY name")));
        json_response(['planets'=>many('SELECT * FROM planets ORDER BY sort_order'), 'specialists'=>$doctors,'settings'=>settings(),'pages'=>many('SELECT * FROM content_pages WHERE active=1 ORDER BY sort_order'),'documents'=>many("SELECT id,original_name,note,mime_type FROM media WHERE category='site' AND is_public=1 AND archived_at IS NULL ORDER BY id DESC"),'testimonials'=>many("SELECT t.id,t.author_name,t.rating,t.body,t.created_at FROM testimonials t JOIN users u ON u.id=t.patient_id WHERE t.status='approved' AND t.is_demo=0 AND u.active=1 AND u.archived_at IS NULL AND LOWER(u.email) NOT LIKE '%@myoskills.test' ORDER BY t.id DESC LIMIT 20"),'password_reset_available'=>password_reset_available()]);
    case 'auth.me':
        $u=user(); json_response(['user'=>$u?public_user($u,true):null,'csrf'=>csrf_token()]);
    case 'auth.login':
        write_guard(); $d=input(); $email=mb_strtolower(required($d,'email',190)); $password=required($d,'password',128);
        $key=hash('sha256',$email.'|'.($_SERVER['REMOTE_ADDR']??''));
        $since=date('Y-m-d H:i:s',strtotime('-15 minutes'));
        if((int)one('SELECT COUNT(*) n FROM login_attempts WHERE identity_hash=? AND attempted_at>?',[$key,$since])['n']>=10) fail('Слишком много попыток. Повторите через 15 минут.',429);
        $u=one('SELECT * FROM users WHERE email=? AND active=1',[$email]);
        if(!$u || !account_available($u) || !password_verify($password,$u['password_hash'])){ insert('login_attempts',['identity_hash'=>$key,'attempted_at'=>now()]); fail('Неверная почта или пароль',401); }
        sql('DELETE FROM login_attempts WHERE identity_hash=?',[$key]);
        if($u['role']==='patient') sql('UPDATE patients SET claimed=1 WHERE user_id=?',[$u['id']]);
        if(password_needs_rehash($u['password_hash'],PASSWORD_DEFAULT)) {
            $u['password_hash']=password_hash($password,PASSWORD_DEFAULT);
            sql('UPDATE users SET password_hash=? WHERE id=?',[$u['password_hash'],$u['id']]);
        }
        sign_in($u);
        audit($u,'login'); json_response(['user'=>public_user($u,true),'csrf'=>csrf_token()]);
    case 'auth.logout':
        write_guard(); $_SESSION=[]; session_regenerate_id(true); json_response(['csrf'=>csrf_token()]);
    case 'auth.register':
        write_guard(); $d=input();
        $name=value($d,'name',160); $email=mb_strtolower(required($d,'email',190)); $password=required($d,'password',128);
        $phone=required($d,'phone',40);$digits=preg_replace('/\D+/','',$phone);
        if(strlen($digits)<7 || strlen($digits)>15) fail('Укажите корректный номер телефона');
        if(!filter_var($email,FILTER_VALIDATE_EMAIL) || reserved_account_email($email)) fail('Укажите действующую почту');
        if(mb_strlen($password)<10) fail('Пароль должен содержать минимум 10 символов');
        if(empty($d['consent'])) fail('Подтвердите согласие с правилами и обработкой данных');
        $role=value($d,'role',20,'patient'); if(!in_array($role,['patient','doctor'],true)) fail('Недопустимая роль');
        $spec=value($d,'specialty',40);
        if($role==='doctor' && $spec!=='' && !in_array($spec,['myotherapist','orthodontist','ent','osteopath','kinesiologist','neurologist'],true)) fail('Выберите специальность');
        $existing=one('SELECT * FROM users WHERE email=?',[$email]);
        if($name==='') $name=$existing['name']??($role==='doctor'?'Новый специалист':'Новый участник');
        $code=value($d,'access_code',40);
        $id=transaction(function() use($d,$name,$email,$phone,$password,$role,$spec,$existing,$code) {
            if($existing) {
                if(!account_available($existing) || !$existing['active']) fail('Этот аккаунт недоступен. Обратитесь к администратору.',403);
                $inv=one('SELECT * FROM patients WHERE user_id=? AND access_code=? AND claimed=0'.lock_suffix(),[$existing['id'],$code]);
                if(!$inv || !$code || $role!=='patient') fail('Эта почта уже зарегистрирована. Используйте вход или восстановление пароля.');
                sql('UPDATE users SET name=?,phone=?,password_hash=?,consent_at=? WHERE id=?',[$name,$phone,password_hash($password,PASSWORD_DEFAULT),now(),$existing['id']]);
                sql('UPDATE patients SET claimed=1 WHERE user_id=?',[$existing['id']]);
                return (int)$existing['id'];
            }
            if($code) fail('Код приглашения и почта должны совпадать с данными, которые внёс врач');
            $clinics=profile_clinics($d['clinics']??[]);
            $preferences=['onboarding_complete'=>false,'language'=>value($d,'language',2,'ru')==='en'?'en':'ru'];
            $id=insert('users',['email'=>$email,'password_hash'=>password_hash($password,PASSWORD_DEFAULT),'name'=>$name,'role'=>$role,'specialty'=>$role==='doctor'?$spec:'','phone'=>$phone,'city'=>value($d,'city',100),'clinic'=>value($d,'clinic',180),'clinics_json'=>json_encode($clinics,JSON_UNESCAPED_UNICODE),'social_url'=>http_url(value($d,'social_url',255)),'about'=>'','preferences_json'=>json_encode($preferences),'consent_at'=>now(),'created_at'=>now()]);
            if($role==='patient') insert('patients',['user_id'=>$id,'access_code'=>'MYO-'.strtoupper(bin2hex(random_bytes(12))),'claimed'=>1,'started_at'=>today()]);
            notification($id,'welcome',$role==='doctor'?'Добро пожаловать на борт, доктор':'Твоя галактика ждёт','Заполни профиль и начни знакомство с сервисом.','?page=profile');
            return $id;
        });
        sign_in(one('SELECT * FROM users WHERE id=?',[$id]));
        json_response(['user'=>public_user(require_user(),true),'csrf'=>csrf_token()]);
    case 'auth.forgot':
        write_guard(); $d=input(); $email=mb_strtolower(required($d,'email',190));
        if(!password_reset_available()) fail('Восстановление пароля по почте пока недоступно. Обратитесь к администратору сервиса.',503);
        $key=hash('sha256','reset|'.$email.'|'.($_SERVER['REMOTE_ADDR']??''));
        if((int)one('SELECT COUNT(*) n FROM login_attempts WHERE identity_hash=? AND attempted_at>?',[$key,date('Y-m-d H:i:s',strtotime('-1 hour'))])['n']>=5) fail('Повторите запрос позже',429);
        insert('login_attempts',['identity_hash'=>$key,'attempted_at'=>now()]);
        $u=one('SELECT * FROM users WHERE email=? AND active=1',[$email]);
        if($u && account_available($u)) {
            $token=bin2hex(random_bytes(32));
            insert('password_resets',['user_id'=>$u['id'],'token_hash'=>hash('sha256',$token),'expires_at'=>date('Y-m-d H:i:s',strtotime('+30 minutes'))]);
            $link=rtrim((string)config('app_url'),'/').'/index.php?page=reset&token='.$token;
            $from=(string)config('mail.from');
            $sent=mail($email,'MyoSkills password reset',"Ссылка для смены пароля (30 минут):\n".$link,"From: ".$from."\r\nContent-Type: text/plain; charset=UTF-8");
            if(!$sent) {
                sql('UPDATE password_resets SET used_at=? WHERE token_hash=?',[now(),hash('sha256',$token)]);
                fail('Не удалось отправить письмо. Повторите позже или обратитесь к администратору.',503);
            }
        }
        json_response(['message'=>'Если эта почта зарегистрирована, письмо со ссылкой отправлено.']);
    case 'auth.reset':
        write_guard(); $d=input(); $token=required($d,'token',128); $password=required($d,'password',128);
        if(strlen($password)<10) fail('Минимум 10 символов');
        transaction(function() use($token,$password){
            $r=one('SELECT * FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at>?'.lock_suffix(),[hash('sha256',$token),now()]);
            if(!$r) fail('Ссылка истекла или уже использована');
            $target=one('SELECT * FROM users WHERE id=? AND active=1',[$r['user_id']]);
            if(!$target || !account_available($target)) fail('Ссылка истекла или уже использована');
            sql('UPDATE users SET password_hash=? WHERE id=?',[password_hash($password,PASSWORD_DEFAULT),$r['user_id']]);
            sql('UPDATE password_resets SET used_at=? WHERE user_id=? AND used_at IS NULL',[now(),$r['user_id']]);
        }); json_response(['message'=>'Пароль изменён. Войдите с новым паролем.']);
    case 'account.update':
        write_guard(); $u=require_user(); $d=input();
        $clinics=profile_clinics($d['clinics']??[]);
        $pref=$d['preferences']??[]; if(!is_array($pref)) fail('Неверные настройки');
        $preferences=['email'=>!empty($pref['email']),'reminders'=>!empty($pref['reminders']),'reduced_motion'=>!empty($pref['reduced_motion']),'voice_instructions'=>!empty($pref['voice_instructions']),'language'=>($pref['language']??'ru')==='en'?'en':'ru','onboarding_complete'=>true];
        $specialty=$u['specialty'];
        if($u['role']==='doctor') {
            $specialty=value($d,'specialty',40,$specialty);
            if(!in_array($specialty,['myotherapist','orthodontist','ent','osteopath','kinesiologist','neurologist'],true)) fail('Выберите специальность');
            if($u['verified'] && $specialty!==$u['specialty']) fail('Для смены специальности обратитесь к администратору');
        }
        foreach(['public_email','public_phone','public_social'] as $key)$preferences[$key]=!array_key_exists($key,$pref)||!empty($pref[$key]);
        $lat=$u['role']==='doctor'?coordinate($d['latitude']??$u['latitude'],90):null;
        $lng=$u['role']==='doctor'?coordinate($d['longitude']??$u['longitude'],180):null;
        if(($lat===null)!==($lng===null)) fail('Укажите широту и долготу вместе');
        sql('UPDATE users SET name=?,phone=?,city=?,clinic=?,about=?,social_url=?,education=?,hobbies=?,latitude=?,longitude=?,contact_public=?,clinics_json=?,preferences_json=?,specialty=? WHERE id=?',[required($d,'name',160),value($d,'phone',40),value($d,'city',100),value($d,'clinic',180),value($d,'about',3000),http_url(value($d,'social_url',255)),$u['role']==='doctor'?value($d,'education',4000):'',value($d,'hobbies',500),$lat,$lng,!empty($d['contact_public'])?1:0,json_encode($clinics,JSON_UNESCAPED_UNICODE),json_encode($preferences),$specialty,$u['id']]);
        audit($u,'profile.update'); json_response(public_user(require_user(),true));
    case 'account.password':
        write_guard(); $u=require_user(); $d=input();
        if(!password_verify(required($d,'current_password',128),$u['password_hash'])) fail('Текущий пароль неверен');
        $p=required($d,'password',128); if(mb_strlen($p)<10) fail('Минимум 10 символов');
        $hash=password_hash($p,PASSWORD_DEFAULT);
        sql('UPDATE users SET password_hash=? WHERE id=?',[$hash,$u['id']]);
        $_SESSION['credential_tag']=hash('sha256',$hash);
        session_regenerate_id(true); audit($u,'password.change'); json_response(['message'=>'Пароль изменён']);
    case 'notifications':
        $u=require_user(); json_response(many('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100',[$u['id']]));
    case 'notifications.read':
        write_guard(); $u=require_user(); $d=input();
        if(!empty($d['id'])) sql('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?',[ident($d['id']),$u['id']]);
        else sql('UPDATE notifications SET is_read=1 WHERE user_id=?',[$u['id']]);
        json_response(['message'=>'Уведомления прочитаны']);
    case 'upload':
        write_guard(); json_response(store_upload(require_user(),input()),201);
    }
    return false;
}
