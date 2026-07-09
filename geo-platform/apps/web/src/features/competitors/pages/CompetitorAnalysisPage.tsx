import { useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Space, Statistic, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Competitor, CompetitorDashboard, CompetitorInput } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';

type CompetitorFormValues = Omit<CompetitorInput, 'aliases' | 'industryTags'> & {
  aliasesText?: string;
  industryTagsText?: string;
};

export function CompetitorAnalysisPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompetitor, setEditingCompetitor] = useState<Competitor>();
  const [form] = Form.useForm<CompetitorFormValues>();
  const dashboardQuery = useQuery({
    queryKey: ['competitor-dashboard', activeBrandId],
    queryFn: () => apiGet<CompetitorDashboard>(`/brands/${activeBrandId}/competitors/analysis`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const saveMutation = useMutation({
    mutationFn: (values: CompetitorFormValues) => {
      const payload = toCompetitorPayload(values);
      return editingCompetitor
        ? apiPatch<Competitor>(`/brands/${activeBrandId}/competitors/${editingCompetitor.id}`, payload)
        : apiPost<Competitor>(`/brands/${activeBrandId}/competitors`, payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setModalOpen(false);
        setEditingCompetitor(undefined);
        form.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['competitor-dashboard', activeBrandId] });
        void messageApi.success('竞品档案已保存');
      }
    }
  });

  const openCreateModal = () => {
    setEditingCompetitor(undefined);
    form.resetFields();
    form.setFieldsValue({ suppressionRule: { consecutiveThreshold: 2 } });
    setModalOpen(true);
  };

  const openEditModal = (competitor: Competitor) => {
    setEditingCompetitor(competitor);
    form.setFieldsValue({
      name: competitor.name,
      aliasesText: competitor.aliases.join('\n'),
      website: competitor.website,
      industryTagsText: competitor.industryTags.join('\n'),
      comparisonNote: competitor.comparisonNote,
      suppressionRule: competitor.suppressionRule
    });
    setModalOpen(true);
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <Card
        title="竞品分析"
        extra={<Button type="primary" onClick={openCreateModal}>新增竞品</Button>}
      >
        <Typography.Paragraph>
          维护竞品档案，聚合同测试问题、同平台、同场景下的推荐顺序、压制情况和高风险场景。
        </Typography.Paragraph>
        <Space size={24} wrap>
          <Statistic title="竞品数量" value={dashboard?.competitors.length ?? 0} />
          <Statistic title="竞品提及率" value={dashboard?.mentionRate ?? 0} suffix="%" />
          <Statistic title="竞品压制率" value={dashboard?.suppressionRate ?? 0} suffix="%" />
          <Statistic title="平均排名差" value={dashboard?.averageRankGap ?? 0} />
          <Statistic title="高风险意图" value={dashboard?.highRiskIntents.length ?? 0} />
        </Space>
      </Card>

      <Card title="竞品档案" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="id"
          dataSource={dashboard?.competitors ?? []}
          pagination={false}
          columns={[
            { title: '竞品名称', dataIndex: 'name' },
            { title: '别名', render: (_, record) => record.aliases.map((alias) => <Tag key={alias}>{alias}</Tag>) },
            { title: '行业标签', render: (_, record) => record.industryTags.map((tag) => <Tag key={tag}>{tag}</Tag>) },
            { title: '连续压制阈值', render: (_, record) => record.suppressionRule.consecutiveThreshold },
            { title: '操作', render: (_, record) => <Button size="small" onClick={() => openEditModal(record)}>编辑</Button> }
          ]}
        />
      </Card>

      <Card title="高风险意图" loading={dashboardQuery.isLoading}>
        <Table
          rowKey="intentId"
          dataSource={dashboard?.highRiskIntents ?? []}
          pagination={false}
          columns={[
            { title: '测试场景', dataIndex: 'text' },
            { title: '被压制次数', dataIndex: 'suppressionCount' }
          ]}
        />
      </Card>

      <Card title="竞品对比明细" loading={dashboardQuery.isLoading}>
        <Table
          rowKey={(record) => `${record.runId}-${record.competitorName}`}
          dataSource={dashboard?.comparisons ?? []}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: '竞品', dataIndex: 'competitorName' },
            { title: '平台', dataIndex: 'platformCode' },
            { title: '测试场景', dataIndex: 'intentText' },
            { title: '品牌排名', dataIndex: 'brandRank', render: (value) => value ?? '未提及' },
            { title: '竞品排名', dataIndex: 'competitorRank', render: (value) => value ?? '未提及' },
            { title: '排名差', dataIndex: 'rankGap', render: (value) => value ?? '-' },
            { title: '压制', dataIndex: 'suppressed', render: (value) => value ? <Tag color="red">是</Tag> : <Tag>否</Tag> },
            { title: '推荐理由', dataIndex: 'recommendationReason' }
          ]}
        />
      </Card>

      <Modal
        title={editingCompetitor ? '编辑竞品' : '新增竞品'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveMutation.isPending}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item name="name" label="竞品名称" rules={[{ required: true, message: '请输入竞品名称' }]}><Input /></Form.Item>
          <Form.Item name="aliasesText" label="别名"><Input.TextArea rows={3} placeholder="一行一个别名" /></Form.Item>
          <Form.Item name="website" label="官网"><Input /></Form.Item>
          <Form.Item name="industryTagsText" label="行业标签"><Input.TextArea rows={3} placeholder="一行一个标签" /></Form.Item>
          <Form.Item name="comparisonNote" label="对比说明"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name={['suppressionRule', 'consecutiveThreshold']} label="连续压制阈值">
            <InputNumber min={2} max={10} className="full-width" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function toCompetitorPayload(values: CompetitorFormValues): CompetitorInput {
  return {
    name: values.name,
    aliases: splitLines(values.aliasesText),
    website: values.website,
    industryTags: splitLines(values.industryTagsText),
    comparisonNote: values.comparisonNote,
    suppressionRule: values.suppressionRule
  };
}

function splitLines(value?: string): string[] {
  return value?.split('\n').map((item) => item.trim()).filter(Boolean) ?? [];
}
