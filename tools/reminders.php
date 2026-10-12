<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';
foreach(many("SELECT DISTINCT u.* FROM users u JOIN assignments a ON a.patient_id=u.id WHERE u.role='patient' AND u.active=1 AND a.status='active'") as $u){
 $prefs=json_decode($u['preferences_json']??'{}',true)?:[];if(empty($prefs['reminders']))continue;
 if(one('SELECT id FROM practices WHERE patient_id=? AND practice_day=?',[$u['id'],today()]))continue;
 if(one('SELECT id FROM notifications WHERE user_id=? AND type=? AND created_at>=?',[$u['id'],'reminder',today().' 00:00:00']))continue;
 notification((int)$u['id'],'reminder','Твои миссии ждут','Сегодня можно продолжить путешествие в удобное время','?page=galaxy');
}
echo "Reminders saved\n";
