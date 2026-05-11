<?php
/**
 * Admin toggle staff account status (enable/disable)
 */
require_once __DIR__ . '/../config.php';
handleCORS();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError(405, 'Method not allowed');
}
$user = getJwtCurrentUser();
if (!$user) {
    jsonError(403, '无权限访问');
}
$operatorStaff = getStaffByUserId((int)($user['user_id'] ?? 0));
$operatorRole = normalizeStaffRoleCode((string)($operatorStaff['role'] ?? ''));
if (!in_array($operatorRole, ['admin', 'ceo'], true)) {
    jsonError(403, '无权限访问');
}
$input = getRequestInput();
$staffId = (int)($input['staff_id'] ?? 0);
$status = (int)($input['status'] ?? 0);

if (!$staffId) {
    jsonError(400, '缺少员工ID');
}
if (!in_array($status, [0, 1], true)) {
    jsonError(400, '状态值无效');
}

$db = getDB();
$stmt = $db->prepare("SELECT user_id, name FROM staffs WHERE id = ?");
$stmt->execute([$staffId]);
$staff = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$staff) {
    jsonError(404, '员工不存在');
}

$db->prepare("UPDATE staffs SET status = ?, updated_at = NOW() WHERE id = ?")->execute([$status, $staffId]);

if ($staff['user_id']) {
    $db->prepare("UPDATE wp_users SET user_status = ? WHERE ID = ?")->execute([$status === 1 ? 0 : 1, $staff['user_id']]);
}

$label = $status === 1 ? '已启用' : '已停用';
jsonSuccess(['message' => $staff['name'] . ' 的账号' . $label]);
