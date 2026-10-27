<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';
if(count($argv)>1){fwrite(STDERR,"Usage: php tools/install.php\nUse database/upgrade_20261027_production.sql for an existing installation.\n");exit(1);}
try {
    if(one("SELECT COUNT(*) n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('users','patients','assignments')")['n']>0) {
        fwrite(STDERR,"This database already contains MyoSkills tables. Import database/upgrade_20261027_production.sql instead.\n");
        exit(1);
    }
    foreach(['schema.sql','bootstrap.sql'] as $file) {
        $content=file_get_contents(MYO_ROOT.'/database/'.$file);
        if($content===false)throw new RuntimeException('Missing installation file: '.$file);
        db()->exec($content);
        echo $file." imported\n";
    }
    echo "Installation complete. Create your administrator with php tools/create_admin.php your-email@example.com\n";
} catch(Throwable $e) {
    fwrite(STDERR,"Import failed: ".$e->getMessage()."\n");
    exit(1);
}
