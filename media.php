<?php
declare(strict_types=1);
require __DIR__.'/app/bootstrap.php';
try {
    $u=require_user(); $id=ident($_GET['id']??0); $m=one('SELECT * FROM media WHERE id=?',[$id]);
    if(!$m||!media_allowed($m,$u)) fail('Файл недоступен',403);
    $path=MYO_ROOT.'/storage/files/'.basename($m['stored_name']);
    if(!is_file($path)&&config('demo_labels')&&preg_match('/^(demo-photo-(before|after)\.webp|demo-video\.mp4)$/',$m['stored_name'])) $path=MYO_ROOT.'/demo/'.$m['stored_name'];
    if(!is_file($path)) fail('Файл отсутствует в хранилище',404);
    session_write_close();
    $size=filesize($path); $start=0; $end=$size-1;
    header('Content-Type: '.$m['mime_type']); header('Accept-Ranges: bytes'); header('Cache-Control: private, no-store');
    header('Content-Disposition: '.(!empty($_GET['download'])?'attachment':'inline')."; filename*=UTF-8''".rawurlencode($m['original_name']));
    if(isset($_SERVER['HTTP_RANGE'])) {
        if(!preg_match('/^bytes=(\d*)-(\d*)$/',$_SERVER['HTTP_RANGE'],$r) || ($r[1]===''&&$r[2]==='')) {http_response_code(416);header('Content-Range: bytes */'.$size);exit;}
        if($r[1]==='') {$start=max(0,$size-(int)$r[2]);} else {$start=(int)$r[1];$end=$r[2]===''?$end:min($end,(int)$r[2]);}
        if($start>$end||$start>=$size) {http_response_code(416);header('Content-Range: bytes */'.$size);exit;}
        http_response_code(206); header('Content-Range: bytes '.$start.'-'.$end.'/'.$size);
    }
    $length=$end-$start+1;header('Content-Length: '.$length);
    $f=fopen($path,'rb');fseek($f,$start);
    while($length>0&&!feof($f)){ $chunk=fread($f,min(65536,$length)); if($chunk===false)break;echo $chunk;$length-=strlen($chunk); }
    fclose($f);
} catch(ApiError $e){http_response_code($e->httpStatus);header('Content-Type: text/plain; charset=utf-8');echo $e->getMessage();}
catch(Throwable){http_response_code(503);echo 'Файл временно недоступен';}
