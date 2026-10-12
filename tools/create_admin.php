<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/../app/bootstrap.php';
$email=mb_strtolower(trim($argv[1]??''));
if(!filter_var($email,FILTER_VALIDATE_EMAIL)){fwrite(STDERR,"Usage: php tools/create_admin.php admin@example.com\n");exit(1);}
if(one('SELECT id FROM users WHERE email=?',[$email])){fwrite(STDERR,"Account already exists; use its profile to change the password.\n");exit(1);}
fwrite(STDOUT,"New admin password (minimum 12 characters): ");
$tty=function_exists('shell_exec')&&is_readable('/dev/tty');
if($tty)@shell_exec('stty -echo < /dev/tty');
try{$password=trim((string)fgets(STDIN));}finally{if($tty)@shell_exec('stty echo < /dev/tty');fwrite(STDOUT,"\n");}
if(mb_strlen($password)<12){fwrite(STDERR,"Password too short\n");exit(1);}
$id=insert('users',['email'=>$email,'password_hash'=>password_hash($password,PASSWORD_DEFAULT),'name'=>'Администратор','role'=>'admin','about'=>'','consent_at'=>now(),'created_at'=>now()]);
echo "Administrator created, ID ".$id."\n";
