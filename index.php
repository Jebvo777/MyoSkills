<?php
declare(strict_types=1);
require __DIR__.'/app/bootstrap.php';
$me=null;
try {$u=user();if($u)$me=public_user($u,true);}catch(Throwable){}
$boot=['base'=>rtrim((string)config('base_path'),'/'),'user'=>$me,'csrf'=>csrf_token(),'demo'=>(bool)config('demo_labels'),'limits'=>config('uploads')];
?>
<!doctype html>
<html lang="ru">
<head>
 <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <meta name="theme-color" content="#171b36">
 <meta name="description" content="MyoSkills — персональные упражнения, видеообратная связь и совместное ведение пациента в формате космического путешествия.">
 <title>MyoSkills — твоя галактика навыков</title>
 <link rel="icon" type="image/svg+xml" href="<?=h(url('assets/favicon.svg'))?>">
 <link rel="preload" as="image" href="<?=h(url('assets/images/hero-orbit.webp'))?>">
 <link rel="stylesheet" href="<?=h(url('assets/css/app.css'))?>">
</head>
<body>
 <a class="skip-link" href="#main-content">К содержанию</a>
 <div id="app"><div class="initial-loader"><span class="loader-orbit"></span><strong>MyoSkills</strong><span>Собираем твою галактику</span></div></div>
 <div id="toast-stack" class="toast-stack" aria-live="polite"></div>
 <dialog id="modal" class="modal"><div id="modal-content"></div></dialog>
 <div id="flight" class="flight" aria-hidden="true"><div class="flight-stars"></div><div class="flight-rocket">✦</div><p>Новая орбита уже рядом</p></div>
 <script nonce="<?=h(nonce())?>">window.MYO_BOOT=<?=json_encode($boot,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_QUOT)?>;</script>
 <script type="module" src="<?=h(url('assets/js/app.js'))?>"></script>
 <noscript><div class="noscript">Для интерактивного кабинета включите JavaScript в браузере.</div></noscript>
</body>
</html>
