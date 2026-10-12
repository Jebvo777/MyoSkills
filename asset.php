<?php
declare(strict_types=1);
require __DIR__.'/app/bootstrap.php';
try {
    $id=ident($_GET['id']??0);
    $m=one("SELECT m.* FROM media m JOIN users u ON u.id=m.owner_id WHERE m.id=? AND m.is_public=1 AND (m.category='site' OR (m.category='diploma' AND u.role='doctor' AND u.active=1 AND u.verified=1))",[$id]);
    if(!$m || !in_array($m['mime_type'],['image/jpeg','image/png','image/webp','application/pdf'],true))fail('Материал недоступен',404);
    $path=MYO_ROOT.'/storage/files/'.basename($m['stored_name']);if(!is_file($path))fail('Материал не найден',404);
    session_write_close();header('Content-Type: '.$m['mime_type']);header('Cache-Control: no-cache');
    header('Content-Length: '.filesize($path));header("Content-Disposition: inline; filename*=UTF-8''".rawurlencode($m['original_name']));
    readfile($path);
} catch(ApiError $e){http_response_code($e->httpStatus);header('Content-Type: text/plain; charset=utf-8');echo $e->getMessage();}
catch(Throwable){http_response_code(503);echo 'Материал временно недоступен';}
