<?php
// Local integration-test router reproducing the Apache access rules.
$path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
if(preg_match('~^/mio/(app|database|storage|demo|docs|tests|tools)(/|$)~',$path)||preg_match('~^/mio/config\..*\.php$~',$path)){
 http_response_code(403);echo 'Forbidden';return true;
}
return false;
