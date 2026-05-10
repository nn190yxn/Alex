<?php
declare(strict_types=1);

require '/www/wwwroot/122.51.223.46/api/config.php';

$pdo = getDB();
$stmt = $pdo->prepare("INSERT INTO ai_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)");
$stmt->execute(array('doubao_api_key', '095b0d96-23fb-4d21-911d-917ad4fd414d'));
$stmt->execute(array('doubao_model', 'doubao-seed-2-0-lite-260428'));

fwrite(STDOUT, "OK\n");
