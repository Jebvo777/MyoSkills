<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';
$email='';$name='Администратор';$sqlOnly=false;
foreach(array_slice($argv,1) as $arg) {
    if($arg==='--help') {
        fwrite(STDOUT,"Usage: php tools/create_admin.php [email] [--name=Name] [--sql]\n\nWithout --sql, creates a new administrator in the configured database.\n--sql prints an INSERT with a freshly generated password hash for phpMyAdmin; no database connection is made.\nExisting accounts are never overwritten. Passwords are entered interactively.\n");
        exit(0);
    }
    if($arg==='--sql'){$sqlOnly=true;continue;}
    if(str_starts_with($arg,'--name=')){$name=trim(substr($arg,7));continue;}
    if($email==='' && !str_starts_with($arg,'--')){$email=$arg;continue;}
    fwrite(STDERR,"Unknown argument. Use --help.\n");exit(1);
}
if($email===''){fwrite(STDERR,"Administrator email: ");$email=trim((string)fgets(STDIN));}
$email=mb_strtolower(trim($email));
if(!filter_var($email,FILTER_VALIDATE_EMAIL) || mb_strlen($email)>190 || reserved_account_email($email)) {
    fwrite(STDERR,"Enter a valid personal or organisation email address.\n");exit(1);
}
if($name==='' || mb_strlen($name)>160){fwrite(STDERR,"Name must contain 1–160 characters.\n");exit(1);}

function read_admin_password(string $prompt): string {
    fwrite(STDERR,$prompt);
    $hidden=function_exists('shell_exec') && is_readable('/dev/tty') && function_exists('stream_isatty') && stream_isatty(STDIN);
    $restore=null;
    if($hidden) {
        $restore=trim((string)@shell_exec('stty -g < /dev/tty'));
        if($restore!=='')@shell_exec('stty -echo < /dev/tty');
    }
    try{$password=rtrim((string)fgets(STDIN),"\r\n");}
    finally{if($restore)@shell_exec('stty '.escapeshellarg($restore).' < /dev/tty');fwrite(STDERR,"\n");}
    return $password;
}

try {
    if(!$sqlOnly && one('SELECT id FROM users WHERE email=?',[$email])) {
        fwrite(STDERR,"Account already exists. Use its normal password reset or a separate new administrator email.\n");exit(1);
    }
    $password=read_admin_password('New password (12–128 characters): ');
    if(mb_strlen($password)<12 || mb_strlen($password)>128){fwrite(STDERR,"Password length must be 12–128 characters.\n");exit(1);}
    if($password!==read_admin_password('Repeat password: ')){fwrite(STDERR,"Passwords do not match.\n");exit(1);}
    $hash=password_hash($password,PASSWORD_DEFAULT);
    unset($password);
    if($sqlOnly) {
        // Hex literals avoid dependence on the target SQL mode and quoting rules.
        $literal=fn(string $s):string=>'CONVERT(0x'.bin2hex($s).' USING utf8mb4)';
        echo "-- Import into your selected MyoSkills database. This creates one new administrator.\n";
        echo "-- A duplicate email stops the INSERT; existing accounts are not changed.\nSET NAMES utf8mb4;\n";
        echo "INSERT INTO users (email,password_hash,name,role,about,consent_at,created_at) VALUES (".$literal($email).','.$literal($hash).','.$literal($name).",'admin','',NOW(),NOW());\n";
        fwrite(STDERR,"SQL generated. Keep it private and delete it after importing.\n");
    } else {
        $id=insert('users',['email'=>$email,'password_hash'=>$hash,'name'=>$name,'role'=>'admin','about'=>'','consent_at'=>now(),'created_at'=>now()]);
        fwrite(STDOUT,"Administrator created, ID ".$id.". Sign in using your email and chosen password.\n");
    }
} catch(Throwable $e) {
    fwrite(STDERR,"Administrator was not created: ".$e->getMessage()."\n");exit(1);
}
