<?php
declare(strict_types=1);

const MYO_ROOT = __DIR__ . '/..';
date_default_timezone_set('Europe/Moscow');
$defaults = require MYO_ROOT . '/config.example.php';
$local = is_file(MYO_ROOT . '/config.local.php') ? require MYO_ROOT . '/config.local.php' : [];
$GLOBALS['myo_config'] = array_replace_recursive($defaults, is_array($local) ? $local : []);
if (getenv('MYO_BASE_PATH') !== false) $GLOBALS['myo_config']['base_path'] = rtrim((string)getenv('MYO_BASE_PATH'), '/');
foreach(['HOST'=>'host','PORT'=>'port','NAME'=>'name','USER'=>'user','PASSWORD'=>'password'] as $envKey=>$configKey) if(getenv('MYO_DB_'.$envKey)!==false) $GLOBALS['myo_config']['db'][$configKey]=getenv('MYO_DB_'.$envKey);
if(getenv('MYO_DEBUG')==='1') $GLOBALS['myo_config']['debug']=true;

if (PHP_SAPI !== 'cli') {
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_name('MYOSKILLS');
    session_set_cookie_params(['lifetime'=>0,'path'=>(config('base_path') ?: '') . '/', 'secure'=>$https, 'httponly'=>true, 'samesite'=>'Lax']);
    ini_set('session.use_strict_mode', '1');
    session_start();
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('X-Frame-Options: SAMEORIGIN');
    header('Permissions-Policy: camera=(self), microphone=(self), geolocation=(self)');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'nonce-" . nonce() . "'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'");
}

function config(string $key, mixed $fallback = null): mixed {
    $value = $GLOBALS['myo_config'];
    foreach (explode('.', $key) as $part) { if (!is_array($value) || !array_key_exists($part, $value)) return $fallback; $value = $value[$part]; }
    return $value;
}
function nonce(): string { static $value; return $value ??= base64_encode(random_bytes(18)); }
function now(): string { return date('Y-m-d H:i:s'); }
function today(): string { return date('Y-m-d'); }
function url(string $path = ''): string { return rtrim((string)config('base_path'), '/') . '/' . ltrim($path, '/'); }
function h(mixed $value): string { return htmlspecialchars((string)$value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function csrf_token(): string { return $_SESSION['csrf'] ??= bin2hex(random_bytes(24)); }

function db(): PDO {
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;
    $c = config('db');
    if (($c['driver'] ?? '') === 'sqlite' && PHP_SAPI !== 'cli' && !config('debug')) throw new RuntimeException('SQLite is available only in a local debug configuration');
    $dsn = ($c['driver'] ?? 'mysql') === 'sqlite' ? 'sqlite:' . $c['path'] : sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], $c['port'] ?? 3306, $c['name']);
    $pdo = new PDO($dsn, $c['user'] ?? null, $c['password'] ?? null, [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
    if (($c['driver'] ?? '') === 'sqlite') $pdo->exec('PRAGMA foreign_keys=ON');
    return $pdo;
}
function sql(string $query, array $params = []): PDOStatement { $stmt = db()->prepare($query); $stmt->execute($params); return $stmt; }
function one(string $query, array $params = []): ?array { return sql($query,$params)->fetch() ?: null; }
function many(string $query, array $params = []): array { return sql($query,$params)->fetchAll(); }
function insert(string $table, array $values): int {
    $fields = array_keys($values);
    sql('INSERT INTO ' . $table . ' (' . implode(',', $fields) . ') VALUES (' . implode(',', array_fill(0,count($fields),'?')) . ')', array_values($values));
    return (int)db()->lastInsertId();
}
function transaction(callable $fn): mixed {
    db()->beginTransaction();
    try { $result=$fn(); db()->commit(); return $result; } catch (Throwable $e) { if(db()->inTransaction()) db()->rollBack(); throw $e; }
}
function lock_suffix(): string { return config('db.driver') === 'mysql' ? ' FOR UPDATE' : ''; }

class ApiError extends RuntimeException { public function __construct(string $message, public int $httpStatus = 400) { parent::__construct($message); } }
function fail(string $message, int $status = 400): never { throw new ApiError($message,$status); }
function json_response(mixed $data, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok'=>true,'data'=>$data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function input(): array {
    static $data;
    if ($data !== null) return $data;
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($ct,'application/json')) {
        $raw = file_get_contents('php://input');
        if (strlen((string)$raw) > 262144) fail('Слишком большой запрос',413);
        $data = json_decode((string)$raw,true);
        if (!is_array($data)) fail('Некорректный JSON');
    } else $data = $_POST;
    return $data;
}
function value(array $data, string $key, int $max = 1000, string $default = ''): string {
    $s = trim((string)($data[$key] ?? $default));
    if (mb_strlen($s) > $max) fail('Слишком длинное значение: ' . $key);
    return $s;
}
function required(array $data, string $key, int $max = 1000): string { $s=value($data,$key,$max); if($s==='') fail('Заполните поле ' . $key); return $s; }
function ident(mixed $value): int { $id=filter_var($value,FILTER_VALIDATE_INT); if(!$id || $id<1) fail('Некорректный идентификатор'); return $id; }
function http_url(string $value): string {
    if($value==='') return '';
    $p=parse_url($value);
    if(!is_array($p) || !in_array($p['scheme']??'', ['http','https'],true) || empty($p['host']) || !filter_var($value,FILTER_VALIDATE_URL)) fail('Ссылка должна начинаться с https:// или http://');
    return $value;
}
function coordinate(mixed $value,int $limit): ?float {
    if($value===null || $value==='') return null;
    if(!is_numeric($value) || !is_finite((float)$value) || abs((float)$value)>$limit) fail('Некорректные координаты');
    return (float)$value;
}
function profile_clinics(mixed $value): array {
    if(is_string($value)) $value=preg_split('/\r?\n/',$value);
    if(!is_array($value)||count($value)>10) fail('Не более 10 клиник');
    return array_values(array_filter(array_map(fn($s)=>value(['clinic'=>$s],'clinic',180),$value)));
}
function date_value(mixed $value, bool $optional = true): ?string {
    if (!$value && $optional) return null;
    $d=DateTimeImmutable::createFromFormat('!Y-m-d',(string)$value);
    if(!$d || $d->format('Y-m-d')!==$value) fail('Укажите корректную дату');
    return $d->format('Y-m-d');
}
function write_guard(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('Используйте POST',405);
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? (input()['csrf'] ?? '');
    if (!is_string($token) || !hash_equals(csrf_token(),$token)) fail('Обновите страницу и повторите действие',419);
}
// The retired installation address space is never a sign-in identity.
function reserved_account_email(string $email): bool {
    return str_ends_with(mb_strtolower(trim($email)), '@myoskills.test');
}
function account_available(array $account): bool {
    return empty($account['archived_at']) && !reserved_account_email((string)($account['email'] ?? ''));
}
function visible_accounts(array $accounts): array {
    return array_values(array_filter($accounts, 'account_available'));
}
function password_reset_available(): bool {
    return (bool)config('mail.enabled') && function_exists('mail')
        && filter_var((string)config('mail.from'), FILTER_VALIDATE_EMAIL) !== false
        && filter_var((string)config('app_url'), FILTER_VALIDATE_URL) !== false;
}
function user(): ?array {
    $id=$_SESSION['uid']??0;
    if(!$id) return null;
    $u=one('SELECT * FROM users WHERE id=? AND active=1',[(int)$id]);
    $tag=$_SESSION['credential_tag']??'';
    if(!$u || !account_available($u) || !is_string($tag) || !hash_equals(hash('sha256',$u['password_hash']),$tag)) {
        unset($_SESSION['uid'],$_SESSION['credential_tag']);
        return null;
    }
    return $u;
}
function sign_in(array $u): void {
    session_regenerate_id(true);
    $_SESSION['uid']=(int)$u['id'];
    $_SESSION['credential_tag']=hash('sha256',$u['password_hash']);
    unset($_SESSION['csrf']);
}
function require_user(array $roles = []): array {
    $u=user(); if(!$u) fail('Войдите в аккаунт',401);
    if($roles && !in_array($u['role'],$roles,true)) fail('Это действие недоступно вашей роли',403);
    return $u;
}
function public_user(array $u, bool $self = false): array {
    $fields=['id','name','role','specialty','city','clinic','about','education','hobbies','verified','latitude','longitude'];
    $result=array_intersect_key($u,array_flip($fields));
    $result['id']=(int)$u['id'];
    $result['verified']=(bool)$u['verified'];
    $preferences=json_decode($u['preferences_json']??'{}',true)?:[];
    foreach(['email','phone','social_url'] as $field){$key=$field==='social_url'?'public_social':'public_'.$field;if($self || ((bool)$u['contact_public'] && ($preferences[$key]??true)))$result[$field]=$u[$field];}
    if($u['role']==='doctor') {
        $result['clinics']=json_decode($u['clinics_json']??'[]',true)?:[];
        $result['documents']=many("SELECT id,original_name,mime_type FROM media WHERE owner_id=? AND category='diploma' AND is_public=1 AND archived_at IS NULL",[$u['id']]);
    }
    if($self) { $result['contact_public']=(bool)$u['contact_public']; $result['clinics']=json_decode($u['clinics_json']??'[]',true)?:[]; $result['preferences']=json_decode($u['preferences_json']??'{}',true)?:[]; }
    return $result;
}
function may_assign(array $u): bool { return $u['role']==='doctor' && $u['specialty']==='myotherapist' && (bool)$u['verified']; }
function assert_doctor(array $u): void { if($u['role']!=='doctor' || !$u['verified']) fail('Действие доступно верифицированному специалисту',403); }
function patient_access(int $patientId, array $u, bool $history = false): array {
    $p=one("SELECT p.*,u.name,u.email,u.phone,u.social_url,u.city,u.contact_public,u.preferences_json FROM patients p JOIN users u ON u.id=p.user_id WHERE p.user_id=? AND u.active=1 AND u.archived_at IS NULL AND u.role='patient'",[$patientId]);
    if(!$p || reserved_account_email((string)$p['email'])) fail('Пациент не найден',404);
    $preferences=json_decode($p['preferences_json']??'{}',true)?:[];unset($p['preferences_json']);
    if($u['role']==='admin') return $p;
    if($u['role']==='patient' && (int)$u['id']===$patientId && !$history) return $p;
    if($u['role']==='doctor' && $u['verified'] && one('SELECT id FROM patient_team WHERE patient_id=? AND doctor_id=? AND status=?',[$patientId,$u['id'],'active'])) { foreach(['email','phone','social_url'] as $field){$key=$field==='social_url'?'public_social':'public_'.$field;if(!$p['contact_public']||!($preferences[$key]??true))$p[$field]='';} return $p; }
    fail('Нет доступа к данным этого пациента',403);
}
function patient_id(array $u, array $data = []): int { return $u['role']==='patient' ? (int)$u['id'] : ident($data['patient_id'] ?? $_GET['patient_id'] ?? 0); }
function audit(array $u, string $action, string $type='', ?int $id=null): void { insert('audit_logs',['user_id'=>$u['id'],'action'=>$action,'resource_type'=>$type,'resource_id'=>$id,'created_at'=>now()]); }
function notification(int $userId,string $type,string $title,string $body='',string $link=''): void {
    insert('notifications',['user_id'=>$userId,'type'=>$type,'title'=>$title,'body'=>$body,'link'=>$link,'created_at'=>now()]);
    if(config('mail.enabled')) {
        $recipient=one('SELECT email,preferences_json FROM users WHERE id=? AND active=1',[$userId]);
        $prefs=json_decode($recipient['preferences_json']??'{}',true)?:[];
        $from=(string)config('mail.from');
        if($recipient && !empty($prefs['email']) && filter_var($from,FILTER_VALIDATE_EMAIL)) {
            $message=$title."\n\n".$body."\n\n".rtrim((string)config('app_url'),'/').'/index.php'.($link?:'');
            $subject='=?UTF-8?B?'.base64_encode('MyoSkills · '.$title).'?=';
            @mail($recipient['email'],$subject,$message,"From: ".$from."\r\nContent-Type: text/plain; charset=UTF-8");
        }
    }
}
function notify_team(int $patientId,string $type,string $title,string $body='',string $link=''): void {
    foreach(many('SELECT doctor_id FROM patient_team WHERE patient_id=? AND status=?',[$patientId,'active']) as $m) notification((int)$m['doctor_id'],$type,$title,$body,$link);
}
function reward(int $patientId,int $assignmentId,string $day,string $kind,int $points): bool {
    if(one('SELECT id FROM rewards WHERE patient_id=? AND assignment_id=? AND reward_day=? AND kind=?',[$patientId,$assignmentId,$day,$kind])) return false;
    try { insert('rewards',['patient_id'=>$patientId,'assignment_id'=>$assignmentId,'reward_day'=>$day,'kind'=>$kind,'points'=>$points,'created_at'=>now()]); return true; }
    catch(PDOException $e) { if((string)$e->getCode()==='23000') return false; throw $e; }
}
function stats(int $id): array {
    $r=one("SELECT COALESCE(SUM(CASE WHEN kind='fuel' THEN points ELSE 0 END),0) fuel, COALESCE(SUM(CASE WHEN kind='xp' THEN points ELSE 0 END),0) xp FROM rewards WHERE patient_id=?",[$id]);
    $days=array_column(many('SELECT DISTINCT practice_day FROM practices WHERE patient_id=? ORDER BY practice_day DESC',[$id]),'practice_day');
    $cursor=today(); $streak=0;
    if(!in_array($cursor,$days,true)) $cursor=date('Y-m-d',strtotime('-1 day'));
    while(in_array($cursor,$days,true)){ $streak++; $cursor=date('Y-m-d',strtotime($cursor.' -1 day')); }
    $xp=(int)$r['xp'];
    return ['fuel'=>(int)$r['fuel'],'xp'=>$xp,'stars'=>(int)floor($xp/25),'streak'=>$streak,'rank'=>$xp>=750?'Капитан галактики':($xp>=250?'Исследователь':($xp>=75?'Пилот':'Космический стажёр')),'next_rank'=>$xp>=750?1500:($xp>=250?750:($xp>=75?250:75)), 'today_count'=>(int)one('SELECT COUNT(*) n FROM practices WHERE patient_id=? AND practice_day=?',[$id,today()])['n'],'approved'=>(int)one('SELECT COUNT(*) n FROM submissions WHERE patient_id=? AND status=?',[$id,'approved'])['n']];
}
function settings(): array { $out=[]; foreach(many('SELECT * FROM app_settings') as $r) $out[$r['setting_key']]=$r['setting_value']; return $out; }
function media_allowed(array $m,array $u): bool {
    if(!empty($m['archived_at'])) return false;
    if($u['role']==='admin') return true;
    if($m['category']==='diploma') return $u['role']==='doctor' && (int)$m['owner_id']===(int)$u['id'];
    if($m['category']==='exercise') {
        if($u['role']==='doctor') return (bool)$u['verified'];
        return (bool)one('SELECT a.id FROM assignments a JOIN exercises e ON e.id=a.exercise_id WHERE a.patient_id=? AND e.video_media_id=? AND a.status=? AND e.active=1 AND e.archived_at IS NULL',[$u['id'],$m['id'],'active']);
    }
    if($m['category']==='site') return false;
    if($m['category']==='document' && $u['role']==='patient' && (int)$m['owner_id']!==(int)$u['id']) return false;
    if($m['patient_id']) { try { patient_access((int)$m['patient_id'],$u); return true; } catch(ApiError){ return false; } }
    return false;
}

function store_upload(array $u,array $d): array {
    if(!isset($_FILES['file'])) fail('Выберите файл');
    $f=$_FILES['file'];
    if(($f['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK) fail(($f['error']??0)===UPLOAD_ERR_INI_SIZE?'Файл превышает лимит хостинга':'Не удалось принять файл');
    $category=value($d,'category',30);
    if(!in_array($category,['video','photo','document','diploma','exercise','site'],true)) fail('Недопустимая категория');
    $pid=null;
    if($category==='diploma') { if($u['role']!=='doctor') fail('Документы специалиста недоступны',403); }
    elseif(in_array($category,['exercise','site'],true)) { if($u['role']!=='admin') fail('Библиотекой управляет администратор',403); }
    else { $pid=patient_id($u,$d); patient_access($pid,$u); }
    if($category==='photo' && !($u['role']==='admin'||($u['role']==='doctor'&&in_array($u['specialty'],['myotherapist','orthodontist'],true)))) fail('Фотопротокол добавляет ортодонт или миотерапевт',403);
    if($category==='video' && $u['role']!=='patient') fail('Видео выполнения отправляет пациент',403);
    $visitId=!empty($d['visit_id'])?ident($d['visit_id']):null;
    if($visitId && (!in_array($category,['photo','document'],true) || !in_array($u['role'],['doctor','admin'],true) || !one('SELECT id FROM visits WHERE id=? AND patient_id=?',[$visitId,$pid]))) fail('Приём недоступен',403);
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    $video=['video/mp4'=>'mp4','video/webm'=>'webm','video/quicktime'=>'mov'];
    $images=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    $docs=['application/pdf'=>'pdf']+$images;
    $allowed=in_array($category,['video','exercise'],true)?$video:($category==='photo'?$images:$docs);
    if(!isset($allowed[$mime])) fail('Формат не поддерживается. Видео: MP4, WebM, MOV. Фото: JPEG, PNG, WebP. Документы: PDF или изображение.');
    $limit=(int)config('uploads.'.(in_array($category,['video','exercise'],true)?'video_mb':($category==='photo'?'image_mb':'document_mb')))*1024*1024;
    if($f['size']>$limit) fail('Файл слишком большой: максимум '.round($limit/1024/1024).' МБ',413);
    if(isset($images[$mime]) && !getimagesize($f['tmp_name'])) fail('Некорректное изображение');
    $stored=bin2hex(random_bytes(24)).'.'.$allowed[$mime];
    $dest=MYO_ROOT.'/storage/files/'.$stored;
    if(!is_dir(dirname($dest))) mkdir(dirname($dest),0750,true);
    if(!move_uploaded_file($f['tmp_name'],$dest)) fail('Хранилище недоступно для записи',503);
    chmod($dest,0640);
    try { $id=transaction(function() use($u,$pid,$category,$f,$stored,$mime,$d,$visitId){
        $id=insert('media',['owner_id'=>$u['id'],'patient_id'=>$pid,'category'=>$category,'original_name'=>mb_substr(basename($f['name']),0,190),'stored_name'=>$stored,'mime_type'=>$mime,'size_bytes'=>$f['size'],'capture_date'=>date_value($d['capture_date']??null),'note'=>value($d,'note',255),'is_public'=>$category==='site'?1:0,'created_at'=>now()]);
        if($visitId) insert('visit_files',['visit_id'=>$visitId,'media_id'=>$id]);
        audit($u,'upload',$category,$id);
        return $id;
    }); }
    catch(Throwable $e) { unlink($dest); throw $e; }
    if($category==='photo'){ notification((int)$pid,'photo','Новый фотопротокол','Врач добавил фотографию в историю прогресса','?page=progress'); }
    if($category==='diploma') foreach(many('SELECT id FROM users WHERE role=?',['admin']) as $a) notification((int)$a['id'],'verification','Новые документы специалиста',$u['name'],'?page=admin&tab=verification');
    return ['id'=>$id,'url'=>url('media.php?id='.$id),'mime_type'=>$mime,'category'=>$category];
}
