import { useEffect } from 'react';
import { Card, Space, Typography } from 'antd';
import { useLocation } from 'react-router-dom';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { AutomationOperatorCard } from '../../automation/components/AutomationOperatorCard';
import { GeoMetricDashboardCard } from '../components/GeoMetricDashboardCard';
import { ManualTestEntryCard } from '../components/ManualTestEntryCard';
import { MonitoringRunsCard } from '../components/MonitoringRunsCard';
import { PlatformConfigCard } from '../components/PlatformConfigCard';
import { TestQuestionCandidateCard } from '../components/TestQuestionCandidateCard';

export function MonitoringPage() {
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const location = useLocation();
  const scrollToMonitoringRuns = () => {
    document.getElementById('monitoring-runs-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (location.hash === '#manual-test-entry') {
      requestAnimationFrame(() => {
        document.getElementById('manual-test-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <Card title="AI 测试">
        <Typography.Paragraph>
          创建一次 AI 测试，记录 AI 平台回答、手动录入回答和测试结果解读。
        </Typography.Paragraph>
      </Card>
      <AutomationOperatorCard brandId={activeBrandId} source="monitoring" title="AI 自动测试与运营" compact />
      <GeoMetricDashboardCard brandId={activeBrandId} onStartTest={scrollToMonitoringRuns} />
      <TestQuestionCandidateCard brandId={activeBrandId} />
      <ManualTestEntryCard brandId={activeBrandId} />
      <MonitoringRunsCard brandId={activeBrandId} />
      <PlatformConfigCard />
    </Space>
  );
}
