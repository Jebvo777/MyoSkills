<?php
declare(strict_types=1);
require __DIR__.'/app/bootstrap.php';
try {
    $u=require_user();$pid=patient_id($u);patient_access($pid,$u);
    $period=($_GET['period']??'week')==='month'?'month':'week';
    $since=date('Y-m-d',strtotime($period==='week'?'-6 days':'-29 days'));
    $rows=many('SELECT pr.practice_day,e.title,p.title planet_title,(SELECT s.status FROM submissions s WHERE s.assignment_id=pr.assignment_id AND s.created_at>=pr.practice_day AND s.created_at<? ORDER BY s.id DESC LIMIT 1) review_status FROM practices pr JOIN exercises e ON e.id=pr.exercise_id JOIN planets p ON p.id=e.planet_id WHERE pr.patient_id=? AND pr.practice_day>=? ORDER BY pr.practice_day DESC',[now(),$pid,$since]);
    header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="myoskills-report-'.today().'.csv"');header('Cache-Control: no-store');
    $f=fopen('php://output','wb');fwrite($f,"\xEF\xBB\xBF");fputcsv($f,['Дата','Упражнение','Группа','Проверка'],';');
    foreach($rows as $r){$safe=array_map(fn($s)=>preg_match('/^[=+@-]/u',(string)$s)?"'".$s:(string)$s,$r);fputcsv($f,$safe,';');}fclose($f);
}catch(ApiError $e){http_response_code($e->httpStatus);echo h($e->getMessage());}
catch(Throwable){http_response_code(503);echo 'Отчёт временно недоступен';}
