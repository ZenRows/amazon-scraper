<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.zenrows.com/v1/?apikey=<YOUR_ZENROWS_API_KEY>&url=https%3A%2F%2Fwww.amazon.com%2FLogitech-Master-Bluetooth-Wireless-Receiver%2Fdp%2FB0FB21526X&js_render=true&premium_proxy=true&autoparse=true');
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
$response = curl_exec($ch);
echo $response . PHP_EOL;
curl_close($ch);
?>