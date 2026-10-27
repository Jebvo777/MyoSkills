<?php
declare(strict_types=1);

// This command deliberately does not load bootstrap.php or connect to a database.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$args = array_slice($argv, 1);
if ($args === ['--help']) {
    fwrite(STDOUT, "Usage: php tools/cleanup_legacy.php [--apply]\n\n");
    fwrite(STDOUT, "Without --apply, only reports unchanged retired files left by an overlay update.\n");
    fwrite(STDOUT, "--apply removes only the exact known files whose SHA-256 matches the original release.\n");
    fwrite(STDOUT, "Modified files, symbolic links and directories are kept. Config, storage and the database are never accessed.\n");
    fwrite(STDOUT, "Missing or modified files are normal and do not produce a failing exit status.\n");
    exit(0);
}
$apply = $args === ['--apply'];
if ($args !== [] && !$apply) {
    fwrite(STDERR, "Unknown arguments. Use --help.\n");
    exit(2);
}

$root = dirname(__DIR__);
// Source: Git e6b144b; the retired guide module is from a1af07e.
// Paths are fixed: there is no recursion, user-supplied path or wildcard deletion.
$known = [
    'demo/demo-video.mp4' => '0901b469aaab4edfba522baff240368b393d6b1c843ef75371e7b83ac2f00381',
    'demo/demo-photo-before.webp' => '0ff540b2a20f9de463a41e06027b831051ef80a8cefe5362c3cd5dba3e467656',
    'demo/demo-photo-after.webp' => '0ff540b2a20f9de463a41e06027b831051ef80a8cefe5362c3cd5dba3e467656',
    'assets/demo-mission.mp4' => '0901b469aaab4edfba522baff240368b393d6b1c843ef75371e7b83ac2f00381',
    'database/install_with_demo.sql' => '5813d4dcc8959dd3afff133ef9b2ca011d32d1558bee4197d5da5cc061c42d3f',
    'database/seed.sql' => '58367605115c20295311c69e2a3e4da60f2e8d058deb59671a84ead8dc100638',
    'tools/build_seed.py' => '8399091e583e3b319a2c8e814957b01ea829ea6e96ebca238109b9b5878fd0c1',
    'tests/router.php' => '73577afae0d71b8030d761c0d9873f9d62eb6c5eb264895113557ee0e564fce7',
    'tests/smoke.py' => '0b7fbfbf98b6d1b2a3f2e95de40eef7e0fa4f5eadc5aa8be4a1d0e0096234b6c',
    'tests/ui.mjs' => 'a40553d087fb44d578459b9e1e34e8107233a5bddffa967328faee58bbfe3570',
    'tests/fixtures/schema-v1.sql' => 'a7ba7e8fe1b41a9c1ddee8fad16241ac10eb53dd883f0c3f6d0d6ff36959ff47',
    'assets/js/star-child.js' => '66fd65e394ea1e860497674772ad83fb78194b296a32e06528c9830de1dcdd08',
];

/** Inspect every path component without traversing a symbolic link. */
function legacy_file_stat(string $root, string $relative): array {
    $parts = explode('/', $relative);
    $path = $root;
    foreach ($parts as $index => $part) {
        $path .= DIRECTORY_SEPARATOR . $part;
        clearstatcache(true, $path);
        $stat = @lstat($path);
        if ($stat === false) return ['status' => 'missing'];
        $type = $stat['mode'] & 0170000;
        if ($type === 0120000) return ['status' => 'symlink'];
        if ($index < count($parts) - 1 && $type !== 0040000) return ['status' => 'not-a-directory'];
        if ($index === count($parts) - 1 && $type !== 0100000) return ['status' => 'not-a-regular-file'];
    }
    return ['status' => 'file', 'stat' => $stat];
}

function legacy_same_file(array $first, array $second): bool {
    foreach (['dev', 'ino', 'mode', 'size', 'mtime', 'ctime'] as $key) {
        if ($first[$key] !== $second[$key]) return false;
    }
    return true;
}

$matched = 0;
$removed = 0;
$missing = 0;
$kept = 0;
$errors = 0;
fwrite(STDOUT, $apply ? "Apply mode: removing only unchanged retired files.\n" : "Dry run: no files will be removed. Use --apply to remove matching files.\n");

foreach ($known as $relative => $expectedHash) {
    $entry = legacy_file_stat($root, $relative);
    if ($entry['status'] === 'missing') {
        $missing++;
        fwrite(STDOUT, "MISSING: {$relative}\n");
        continue;
    }
    if ($entry['status'] !== 'file') {
        $kept++;
        fwrite(STDOUT, "KEEP ({$entry['status']}): {$relative}\n");
        continue;
    }
    $path = $root . DIRECTORY_SEPARATOR . $relative;
    $handle = @fopen($path, 'rb');
    if ($handle === false) {
        $errors++;
        fwrite(STDERR, "ERROR (cannot read): {$relative}\n");
        continue;
    }
    try {
        // Keep the opened file locked while hashing and removing it. Check its
        // identity again so a replaced path or changed directory is retained.
        if (!flock($handle, LOCK_EX | LOCK_NB)) {
            $errors++;
            fwrite(STDERR, "ERROR (file is busy): {$relative}\n");
            continue;
        }
        $opened = fstat($handle);
        if ($opened === false || !legacy_same_file($entry['stat'], $opened)) {
            $kept++;
            fwrite(STDOUT, "KEEP (changed during inspection): {$relative}\n");
            continue;
        }
        $hash = hash_init('sha256');
        $bytes = hash_update_stream($hash, $handle);
        $actualHash = hash_final($hash);
        if ($bytes !== $opened['size']) {
            $errors++;
            fwrite(STDERR, "ERROR (incomplete read): {$relative}\n");
            continue;
        }
        if (!hash_equals($expectedHash, $actualHash)) {
            $kept++;
            fwrite(STDOUT, "KEEP (modified): {$relative}\n");
            continue;
        }
        $current = legacy_file_stat($root, $relative);
        if ($current['status'] !== 'file' || !legacy_same_file($opened, $current['stat'])) {
            $kept++;
            fwrite(STDOUT, "KEEP (changed during inspection): {$relative}\n");
            continue;
        }
        $matched++;
        if (!$apply) {
            fwrite(STDOUT, "WOULD REMOVE: {$relative}\n");
        } elseif (@unlink($path)) {
            $removed++;
            fwrite(STDOUT, "REMOVED: {$relative}\n");
        } else {
            $errors++;
            fwrite(STDERR, "ERROR (cannot remove): {$relative}\n");
        }
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

fwrite(STDOUT, "Matched: {$matched}; removed: {$removed}; missing: {$missing}; kept: {$kept}; errors: {$errors}.\n");
exit($errors > 0 ? 1 : 0);
