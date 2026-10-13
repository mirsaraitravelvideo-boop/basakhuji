<?php
/**
 * বাসাখুঁজি বাংলাদেশ — InfinityFree proxy
 *
 * basakhuji.site.je-তে এলে রিকোয়েস্ট Cloudflare Worker-এ পাঠিয়ে
 * উত্তর ফেরত দেয়। ফলে আপনার ডোমেইনেই পুরো সাইট চলে।
 *
 * ব্যবহার: InfinityFree File Manager → basakhuji.site.je-এর htdocs/
 * ফোল্ডারে index.php নামে আপলোড করুন (আগের index.html থাকলে সরিয়ে দিন)।
 */

$WORKER  = 'https://basakhuji.mirsaraitravelvideo.workers.dev';
$MY_HOST = 'basakhuji.site.je';

/* ===== ডায়াগনস্টিক: basakhuji.site.je/__diag__ খুললে রিপোর্ট দেখাবে ===== */
if (($_SERVER['REQUEST_URI'] ?? '') === '/__diag__') {
    header('Content-Type: text/plain; charset=utf-8');
    echo "PHP: " . PHP_VERSION . "\n";
    $cv = curl_version();
    echo "cURL: " . $cv['version'] . " | SSL: " . $cv['ssl_version'] . "\n\n";
    // worker homepage fetch test
    $t = curl_init($WORKER . '/');
    curl_setopt_array($t, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_HEADER => true,
        CURLOPT_TIMEOUT => 20, CURLOPT_ENCODING => '',
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
        CURLOPT_RESOLVE => [
            "basakhuji.mirsaraitravelvideo.workers.dev:443:104.21.70.118",
            "basakhuji.mirsaraitravelvideo.workers.dev:443:172.67.223.98",
        ],
    ]);
    $r = curl_exec($t);
    if ($r === false) {
        echo "FETCH FAIL: [" . curl_errno($t) . "] " . curl_error($t) . "\n";
    } else {
        $hs = curl_getinfo($t, CURLINFO_HEADER_SIZE);
        $rh = substr($r, 0, $hs);
        $rb = substr($r, $hs);
        echo "FETCH OK: http=" . curl_getinfo($t, CURLINFO_HTTP_CODE)
            . " total_bytes=" . strlen($r) . " body_bytes=" . strlen($rb) . "\n";
        echo "--- response headers from worker ---\n$rh\n";
        if (preg_match('#/_next/static/css/[^"\']+#', $rb, $m)) {
            echo "CSS URL found: " . $m[0] . "\n";
            $c = curl_init($WORKER . $m[0]);
            curl_setopt_array($c, [
                CURLOPT_RETURNTRANSFER => true, CURLOPT_HEADER => true,
                CURLOPT_TIMEOUT => 20, CURLOPT_ENCODING => '',
                CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
                CURLOPT_RESOLVE => [
                    "basakhuji.mirsaraitravelvideo.workers.dev:443:104.21.70.118",
                    "basakhuji.mirsaraitravelvideo.workers.dev:443:172.67.223.98",
                ],
            ]);
            $cr = curl_exec($c);
            if ($cr === false) {
                echo "CSS FETCH FAIL: [" . curl_errno($c) . "] " . curl_error($c) . "\n";
            } else {
                $chs = curl_getinfo($c, CURLINFO_HEADER_SIZE);
                echo "CSS FETCH OK: http=" . curl_getinfo($c, CURLINFO_HTTP_CODE)
                    . " body_bytes=" . (strlen($cr) - $chs) . "\n";
                echo "--- css headers ---\n" . substr($cr, 0, $chs) . "\n";
                echo "--- css body start ---\n" . substr($cr, $chs, 200) . "\n";
            }
            curl_close($c);
        } else {
            echo "NO CSS URL in HTML!\n";
        }
    }
    curl_close($t);
    exit;
}

$path = $_SERVER['REQUEST_URI'];           // /search?q=... সহ
$url  = $WORKER . $path;
$method = $_SERVER['REQUEST_METHOD'];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 25);
curl_setopt($ch, CURLOPT_ENCODING, '');    // gzip নিজে সামলাবে
curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
// InfinityFree-এর DNS workers.dev চিনতে পারে না — তাই DNS বাইপাস করে
// Cloudflare edge IP-তে সরাসরি যাওয়া (SNI/সার্টিফিকেট ঠিক থাকে)
$host443 = 'basakhuji.mirsaraitravelvideo.workers.dev:443';
curl_setopt($ch, CURLOPT_RESOLVE, [
    "$host443:104.21.70.118",
    "$host443:172.67.223.98",
]);

// ব্রাউজারের হেডার ফরোয়ার্ড (hop-by-hop বাদে)
$headers = [];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $k => $v) {
        $lk = strtolower($k);
        if (in_array($lk, ['host', 'connection', 'content-length', 'accept-encoding', 'keep-alive'])) continue;
        $headers[] = "$k: $v";
    }
} elseif (!empty($_COOKIE)) {
    $pairs = [];
    foreach ($_COOKIE as $k => $v) $pairs[] = "$k=$v";
    $headers[] = 'Cookie: ' . implode('; ', $pairs);
}
$headers[] = "X-Forwarded-Host: $MY_HOST";
$headers[] = "X-Forwarded-Proto: https";
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

// বডি (ফর্ম/আপলোড)
if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$response = curl_exec($ch);
if ($response === false) {
    $errno = curl_errno($ch);
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo "সাময়িক সমস্যা হচ্ছে (কোড $errno): " . htmlspecialchars($err) . " — এই লেখাটার স্ক্রিনশট পাঠান।";
    exit;
}
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$status     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$rawHeaders = substr($response, 0, $headerSize);
$body       = substr($response, $headerSize);
curl_close($ch);

http_response_code($status);
foreach (explode("\r\n", $rawHeaders) as $line) {
    if (stripos($line, 'HTTP/') === 0 || trim($line) === '') continue;
    $parts = explode(':', $line, 2);
    if (count($parts) < 2) continue;
    $hk = trim($parts[0]);
    $hv = trim($parts[1]);
    $lk = strtolower($hk);
    // hop-by-hop ও দৈর্ঘ্য-সংক্রান্ত হেডার বাদ (PHP নিজে বসাবে)
    if (in_array($lk, ['transfer-encoding', 'connection', 'content-length', 'content-encoding', 'keep-alive'])) continue;
    if ($lk === 'location') {
        // worker-এর ঠিকানা → নিজের ডোমেইনে বদলে দাও (ডোমেইনেই থাকবে)
        $hv = str_replace($WORKER, 'https://' . $MY_HOST, $hv);
        $hv = str_replace('basakhuji.mirsaraitravelvideo.workers.dev', $MY_HOST, $hv);
    }
    header("$hk: $hv", false);
}
echo $body;
