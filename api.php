<?php
declare(strict_types=1);
require __DIR__.'/app/bootstrap.php';
try {
    $action=(string)($_GET['action']??'public');
    $public=['public','auth.me','auth.login','auth.register','auth.forgot','auth.reset'];
    if(!in_array($action,$public,true)) require_user();
    if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET') write_guard();
    foreach(['auth','extra','patient','doctor','admin'] as $module) {
        require_once __DIR__.'/app/api_'.$module.'.php';
        $handler='api_'.$module;
        if($handler($action)) exit;
    }
    fail('Действие не найдено',404);
} catch(ApiError $e) {
    http_response_code($e->httpStatus);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE);
} catch(Throwable $e) {
    if(isset($GLOBALS['myo_config']) && config('debug')) error_log((string)$e);
    else error_log('MyoSkills request failed: '.get_class($e));
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok'=>false,'error'=>'Сервис временно недоступен. Проверьте подключение и установку базы данных.'],JSON_UNESCAPED_UNICODE);
}
