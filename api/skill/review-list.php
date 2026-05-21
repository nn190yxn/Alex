<?php
/**
 * 复盘记录列表 API
 * GET /api/skill/review-list.php?page=1&page_size=20&scene_type=new_sale
 */

require_once __DIR__ . '/../../api/config.php';
handleCORS();

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(405, '只支持 GET 请求');
}

$userId = getCurrentUserId();
if (!$userId) {
    jsonResponse(401, '请先登录');
}

$page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
$pageSize = isset($_GET['page_size']) ? min(50, max(1, (int)$_GET['page_size'])) : 20;
$sceneType = isset($_GET['scene_type']) ? trim($_GET['scene_type']) : '';

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
    
    $where = "WHERE user_id = ?";
    $params = [$userId];
    
    if ($sceneType) {
        $where .= " AND scene_type = ?";
        $params[] = $sceneType;
    }
    
    // 总数
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM skill_review_records $where");
    $stmt->execute($params);
    $total = (int)$stmt->fetchColumn();
    
    // 列表
    $offset = ($page - 1) * $pageSize;
    $stmt = $pdo->prepare("SELECT id, scene_type, recording_url, transcript_text, ai_report, ai_score, ai_level, status, error_message, created_at 
        FROM skill_review_records $where 
        ORDER BY created_at DESC 
        LIMIT $offset, $pageSize");
    $stmt->execute($params);
    $records = $stmt->fetchAll();
    
    jsonResponse(0, 'success', [
        'records' => $records,
        'total' => $total,
        'page' => $page,
        'page_size' => $pageSize,
    ]);
    
} catch (Exception $e) {
    error_log('[skill.list] Error: ' . $e->getMessage());
    jsonResponse(500, '查询失败: ' . $e->getMessage());
}



