<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';
$files=[MYO_ROOT.'/database/schema.sql',MYO_ROOT.'/database/defaults.sql'];
try{foreach($files as $file){db()->exec(file_get_contents($file));echo basename($file)." imported\n";}}catch(Throwable $e){fwrite(STDERR,"Import failed: ".$e->getMessage()."\n");exit(1);}
