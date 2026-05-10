<?php
declare(strict_types=1);

require_once __DIR__ . '/_common.php';
handleCORS();

try {
    $context = appRequireStaffContext();
    $reportId = appRequireInt($_GET, 'report_id', '日报 ID');

    $pdo = workloadDb();
    workloadEnsureAuditSchema($pdo);

    $stmt = $pdo->prepare("SELECT * FROM workload_evidences WHERE report_id = ? ORDER BY created_at ASC");
    $stmt->execute([$reportId]);
    $list = $stmt->fetchAll(PDO::FETCH_ASSOC);

    appJsonSuccess(['list' => $list]);

} catch (Throwable $e) {
    appLogEvent('workload.evidence_list_error', ['error' => $e->getMessage()]);
    appJsonError(500, '获取列表失败');
}
