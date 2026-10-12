<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';
$files=[MYO_ROOT.'/database/schema.sql'];
if(in_array('--demo',$argv,true))$files[]=MYO_ROOT.'/database/seed.sql';
try{foreach($files as $file){$content=file_get_contents($file);db()->exec($content);echo basename($file)." imported\n";}}catch(Throwable $e){fwrite(STDERR,"Import failed: ".$e->getMessage()."\n");exit(1);}
