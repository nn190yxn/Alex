<?php
/**
 * Admin reset password API
 */
require_once __DIR__ . '/../config.php';
handleCORS();
$input = getRequestInput();
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
$db = getDB();

$targetUserId = (int)($input['user_id'] ?? 0);
if (!$targetUserId) {
    jsonError(400, '请指定用户ID');
}

// Verify target user exists
$stmt = $db->prepare("SELECT ID, user_login FROM wp_users WHERE ID = ?");
$stmt->execute([$targetUserId]);
$wpUser = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$wpUser) {
    jsonError(404, '用户不存在');
}

// Generate default password
$defaultPassword = '123456';
// WordPress password hash
$passwordToHash = base64_encode(hash_hmac('sha384', $defaultPassword, 'wp-sha384', true));
$hash = '$wp' . password_hash($passwordToHash, PASSWORD_BCRYPT);

$stmt = $db->prepare("UPDATE wp_users SET user_pass = ? WHERE ID = ?");
$stmt->execute([$hash, $targetUserId]);

// Log the reset
error_log("Admin {$user['user_id']} reset password for user {$targetUserId} ({$wpUser['user_login']})");

jsonSuccess([
    'default_password' => $defaultPassword,
    'message' => '密码已重置为默认密码',
]);
