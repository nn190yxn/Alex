<?php
/**
 * 销售录音复盘上传与分析 API
 * POST /api/skill/upload-recording.php
 * 
 * 使用 fastcgi_finish_request() 实现异步处理：
 * 先返回响应给客户端，然后继续在后台执行转写和 AI 分析
 */

require_once __DIR__ . '/../../api/config.php';
handleCORS();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['code' => 405, 'message' => '只支持 POST 请求'], JSON_UNESCAPED_UNICODE);
    exit;
}

$userId = getCurrentUserId();
if (!$userId) {
    http_response_code(401);
    echo json_encode(['code' => 401, 'message' => '请先登录'], JSON_UNESCAPED_UNICODE);
    exit;
}

$staff = getStaffByUserId($userId);
if (!$staff) {
    http_response_code(403);
    echo json_encode(['code' => 403, 'message' => '未找到员工资料'], JSON_UNESCAPED_UNICODE);
    exit;
}

$sceneType = isset($_POST['scene_type']) ? trim($_POST['scene_type']) : '';
if (!in_array($sceneType, ['new_sale', 'renewal', 'assessment'])) {
    http_response_code(400);
    echo json_encode(['code' => 400, 'message' => '请选择复盘场景：新签/续费/体测解读'], JSON_UNESCAPED_UNICODE);
    exit;
}

$sceneNames = [
    'new_sale' => '新签复盘',
    'renewal' => '续费复盘',
    'assessment' => '体测解读复盘',
];

if (!isset($_FILES['recording']) || $_FILES['recording']['error'] !== UPLOAD_ERR_OK) {
    $error = $_FILES['recording']['error'] ?? UPLOAD_ERR_NO_FILE;
    http_response_code(400);
    echo json_encode(['code' => 400, 'message' => '录音文件上传失败，错误码: ' . $error], JSON_UNESCAPED_UNICODE);
    exit;
}

$recording = $_FILES['recording'];
// 安全过滤：只保留字母数字和点号，防止路径穿越和特殊字符注入
$rawExt = preg_replace('/[^a-zA-Z0-9.]/', '', pathinfo($recording['name'], PATHINFO_EXTENSION));
$ext = strtolower($rawExt);
$allowedExts = ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'aac'];
if (!in_array($ext, $allowedExts)) {
    http_response_code(400);
    echo json_encode(['code' => 400, 'message' => '不支持的音频格式，请上传 mp3/wav/m4a/aac 格式'], JSON_UNESCAPED_UNICODE);
    exit;
}

$maxSize = 50 * 1024 * 1024;
if ($recording['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['code' => 400, 'message' => '录音文件超过 50MB 限制'], JSON_UNESCAPED_UNICODE);
    exit;
}

$uploadDir = '/www/wwwroot/122.51.223.46/uploads/review-recordings/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// 安全文件名：使用 random_bytes 避免碰撞，不依赖用户输入
$filename = date('YmdHis') . '_' . bin2hex(random_bytes(16)) . '.' . $ext;
$savePath = $uploadDir . $filename;

if (!move_uploaded_file($recording['tmp_name'], $savePath)) {
    http_response_code(500);
    echo json_encode(['code' => 500, 'message' => '录音文件保存失败'], JSON_UNESCAPED_UNICODE);
    exit;
}

$recordingUrl = '/uploads/review-recordings/' . $filename;

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASSWORD,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
    
    $stmt = $pdo->prepare("INSERT INTO skill_review_records 
        (user_id, staff_id, scene_type, recording_url, status) 
        VALUES (?, ?, ?, ?, 'pending')");
    $stmt->execute([$userId, (int)$staff['id'], $sceneType, $recordingUrl]);
    $recordId = (int)$pdo->lastInsertId();
    
} catch (Exception $e) {
    error_log('[skill.review] DB error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['code' => 500, 'message' => '创建复盘记录失败'], JSON_UNESCAPED_UNICODE);
    exit;
}

// 发送响应给客户端
http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'code' => 0,
    'message' => '录音已上传，正在分析中',
    'data' => [
        'record_id' => $recordId,
        'scene_name' => $sceneNames[$sceneType],
        'recording_url' => $recordingUrl,
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// 关闭输出缓冲，发送响应
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} else {
    exit;
}

// ===== 以下代码在响应发送后执行（后台异步处理）=====

ignore_user_abort(true);
set_time_limit(600);

$sceneMap = [
    'new_sale' => [
        'name' => '追光小牛新签复盘',
        'skill_dir' => '/www/wwwroot/122.51.223.46/skills/追光小牛新签复盘/',
    ],
    'renewal' => [
        'name' => '追光小牛续费复盘',
        'skill_dir' => '/www/wwwroot/122.51.223.46/skills/追光小牛续费复盘/',
    ],
    'assessment' => [
        'name' => '追光小牛体测解读复盘',
        'skill_dir' => '/www/wwwroot/122.51.223.46/skills/追光小牛体测解读复盘/',
    ],
];

if (!isset($sceneMap[$sceneType])) {
    updateStatusPDO($pdo, $recordId, 'failed', '未知的场景类型: ' . $sceneType);
    exit;
}

try {
    updateStatusPDO($pdo, $recordId, 'transcribing', '开始语音转文字...');
    error_log("[$recordId] 开始语音转文字...");
    
    $transcript = transcribeAudio($savePath, $pdo);
    
    if (empty($transcript)) {
        updateStatusPDO($pdo, $recordId, 'failed', '语音转文字失败，未获取到文本');
        error_log("[$recordId] 语音转文字失败");
        exit;
    }
    
    error_log("[$recordId] 语音转文字完成，文本长度: " . mb_strlen($transcript, 'UTF-8') . " 字符");
    
    $stmt = $pdo->prepare("UPDATE skill_review_records SET transcript_text = ?, updated_at = NOW() WHERE id = ?");
    $stmt->execute([$transcript, $recordId]);
    
    $skillContent = readSkillContent($sceneMap[$sceneType]['skill_dir']);
    if (empty($skillContent)) {
        updateStatusPDO($pdo, $recordId, 'failed', '复盘标准文件不存在');
        error_log("[$recordId] 复盘标准文件不存在");
        exit;
    }
    
    updateStatusPDO($pdo, $recordId, 'analyzing', 'AI 正在分析录音内容...');
    error_log("[$recordId] 开始 AI 分析...");
    
    $report = analyzeWithAI($transcript, $skillContent, $sceneMap[$sceneType]['name'], $pdo);
    
    if (empty($report)) {
        updateStatusPDO($pdo, $recordId, 'failed', 'AI 分析失败');
        error_log("[$recordId] AI 分析失败");
        exit;
    }
    
    $score = extractScore($report);
    $level = extractLevel($report);
    
    error_log("[$recordId] AI 分析完成，分数: $score, 等级: $level");
    
    $stmt = $pdo->prepare("UPDATE skill_review_records 
        SET status = 'completed', ai_report = ?, ai_score = ?, ai_level = ?, updated_at = NOW() 
        WHERE id = ?");
    $stmt->execute([$report, $score, $level, $recordId]);
    
    error_log("[$recordId] 复盘完成");
    
} catch (Exception $e) {
    error_log('[skill.review] Error: ' . $e->getMessage());
    try {
        updateStatusPDO($pdo, $recordId, 'failed', $e->getMessage());
    } catch (Exception $inner) {
        error_log('[skill.review] DB update error: ' . $inner->getMessage());
    }
    exit;
}

// ===== 辅助函数 =====

function transcribeAudio($audioFile, $pdo) {
    $settings = loadAISettings($pdo);
    
    if (!empty($settings['zhipu_api_key'])) {
        $result = transcribeWithZhipu($audioFile, $settings['zhipu_api_key']);
        if ($result) return $result;
    }
    
    if (!empty($settings['doubao_api_key'])) {
        $result = transcribeWithDoubao($audioFile, $settings['doubao_api_key']);
        if ($result) return $result;
    }
    
    return null;
}

function transcribeWithZhipu($audioFile, $apiKey) {
    $ext = strtolower(pathinfo($audioFile, PATHINFO_EXTENSION));
    $mimeType = getAudioMimeType($ext);
    
    $boundary = '----WebKitFormBoundary' . md5(uniqid());
    $fileContent = file_get_contents($audioFile);
    $filename = basename($audioFile);
    
    $body = "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"file\"; filename=\"{$filename}\"\r\n";
    $body .= "Content-Type: {$mimeType}\r\n\r\n";
    $body .= $fileContent . "\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"model\"\r\n\r\n";
    $body .= "glm-4-voice\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"language\"\r\n\r\n";
    $body .= "zh-CN\r\n";
    $body .= "--{$boundary}--\r\n";
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: multipart/form-data; boundary=' . $boundary,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 30,
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if (isset($data['text']) && !empty($data['text'])) {
            return $data['text'];
        }
    }
    
    error_log("[skill.asr] Zhipu ASR failed (HTTP $httpCode): " . ($curlError ?: $response));
    return null;
}

function transcribeWithDoubao($audioFile, $apiKey) {
    $ext = strtolower(pathinfo($audioFile, PATHINFO_EXTENSION));
    $mimeType = getAudioMimeType($ext);
    
    $boundary = '----WebKitFormBoundary' . md5(uniqid());
    $fileContent = file_get_contents($audioFile);
    $filename = basename($audioFile);
    
    $body = "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"file\"; filename=\"{$filename}\"\r\n";
    $body .= "Content-Type: {$mimeType}\r\n\r\n";
    $body .= $fileContent . "\r\n";
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"model\"\r\n\r\n";
    $body .= "doubao-1.5-pro-32k\r\n";
    $body .= "--{$boundary}--\r\n";
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://ark.cn-beijing.volces.com/api/v3/audio/transcriptions',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: multipart/form-data; boundary=' . $boundary,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 30,
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if (isset($data['text']) && !empty($data['text'])) {
            return $data['text'];
        }
    }
    
    error_log("[skill.asr] Doubao ASR failed (HTTP $httpCode): " . substr($response, 0, 500));
    return null;
}

function analyzeWithAI($transcript, $skillContent, $sceneName, $pdo) {
    $settings = loadAISettings($pdo);
    
    $apiKey = $settings['deepseek_api_key'] ?? '';
    $model = 'deepseek-chat';
    $apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    
    if (empty($apiKey)) {
        $apiKey = $settings['doubao_api_key'] ?? '';
        $model = $settings['doubao_model'] ?? 'doubao-pro-32k';
        $apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    }
    
    if (empty($apiKey)) {
        throw new Exception('没有可用的 AI 服务配置');
    }
    
    $systemPrompt = "你是{$sceneName}的专业评估专家。请严格按照以下复盘标准对销售录音转写文本进行分析评分。\n\n{$skillContent}";
    
    $userPrompt = "请对以下录音转写文本进行复盘分析：\n\n--- 录音转写文本开始 ---\n{$transcript}\n--- 录音转写文本结束 ---\n\n请按照复盘标准输出完整的分析报告，必须包含总分（0-100）和等级（优秀/良好/合格/不合格）。";
    
    $payload = [
        'model' => $model,
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userPrompt],
        ],
        'temperature' => 0.3,
        'max_tokens' => 4000,
    ];
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $apiUrl,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 180,
        CURLOPT_CONNECTTIMEOUT => 30,
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        if (isset($data['choices'][0]['message']['content'])) {
            return $data['choices'][0]['message']['content'];
        }
    }
    
    throw new Exception("AI 分析失败 (HTTP $httpCode): " . substr($response, 0, 500));
}

function extractScore($report) {
    if (preg_match('/总分[：:]\s*(\d+)/', $report, $matches)) return (int)$matches[1];
    if (preg_match('/(\d{1,3})\s*分\s*\/\s*100/', $report, $matches)) return (int)$matches[1];
    if (preg_match('/得分[：:]\s*(\d+)/', $report, $matches)) return (int)$matches[1];
    if (preg_match('/评分[：:]\s*(\d+)/', $report, $matches)) return (int)$matches[1];
    return 0;
}

function extractLevel($report) {
    if (preg_match('/等级[：:]\s*(优秀|良好|合格|不合格)/', $report, $matches)) return $matches[1];
    if (preg_match('/(优秀|良好|合格|不合格)/', $report, $matches)) return $matches[1];
    return '';
}

function loadAISettings($pdo) {
    $settings = [
        'deepseek_api_key' => '',
        'zhipu_api_key' => '',
        'doubao_api_key' => '',
        'doubao_model' => 'doubao-pro-32k',
    ];
    
    try {
        $stmt = $pdo->query('SELECT setting_key, setting_value FROM ai_settings');
        foreach ($stmt->fetchAll() as $row) {
            $key = (string)($row['setting_key'] ?? '');
            $value = trim((string)($row['setting_value'] ?? ''));
            if (array_key_exists($key, $settings) && $value !== '') {
                $settings[$key] = $value;
            }
        }
    } catch (Exception $e) {
        error_log('[skill.asr] Settings load failed: ' . $e->getMessage());
    }
    
    return $settings;
}

function readSkillContent($skillDir) {
    $skillFile = $skillDir . 'SKILL.md';
    if (file_exists($skillFile)) return file_get_contents($skillFile);
    if (is_dir($skillDir)) {
        $files = glob($skillDir . '*.md');
        if (!empty($files)) {
            $content = '';
            foreach ($files as $file) $content .= file_get_contents($file) . "\n\n";
            return $content;
        }
    }
    return '';
}

function getAudioMimeType($ext) {
    $map = ['mp3' => 'audio/mpeg', 'wav' => 'audio/wav', 'm4a' => 'audio/mp4', 'ogg' => 'audio/ogg', 'webm' => 'audio/webm', 'aac' => 'audio/aac'];
    return $map[$ext] ?? 'audio/mpeg';
}

function updateStatusPDO($pdo, $recordId, $status, $error = '') {
    if ($status === 'failed') {
        $stmt = $pdo->prepare("UPDATE skill_review_records SET status = ?, error_message = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$status, $error, $recordId]);
    } else {
        $stmt = $pdo->prepare("UPDATE skill_review_records SET status = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$status, $recordId]);
    }
}
