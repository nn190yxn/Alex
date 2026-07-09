import { Alert, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Tooltip, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlatformConfig, PlatformConfigInput, PlatformMode, PlatformValidationResult } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';

type ModelFormValues = PlatformConfigInput;

export function ModelSettingsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ModelFormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<PlatformConfig | null>(null);
  const modelsQuery = useQuery({
    queryKey: ['model-settings'],
    queryFn: () => apiGet<PlatformConfig[]>('/platforms')
  });
  const models = modelsQuery.data?.success ? modelsQuery.data.data : [];
  const saveMutation = useMutation({
    mutationFn: (values: ModelFormValues) => {
      const payload = toModelPayload(values, Boolean(editingModel));
      return editingModel
        ? apiPatch<PlatformConfig>(`/platforms/${editingModel.id}`, payload)
        : apiPost<PlatformConfig>('/platforms', payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setModalOpen(false);
        setEditingModel(null);
        form.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['model-settings'] });
        void messageApi.success('模型设置已保存');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const validateMutation = useMutation({
    mutationFn: (modelId: string) => apiPost<PlatformValidationResult>(`/platforms/${modelId}/validate`, {}),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['model-settings'] });
      if (response.success) {
        void messageApi.success(response.data.message);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const openCreateModal = () => {
    setEditingModel(null);
    form.resetFields();
    form.setFieldsValue({ mode: 'api', enabled: true, rateLimitPerMinute: 20 });
    setModalOpen(true);
  };

  const openEditModal = (model: PlatformConfig) => {
    setEditingModel(model);
    form.setFieldsValue({
      platformCode: model.platformCode,
      name: model.name,
      mode: model.mode,
      endpointUrl: model.endpointUrl,
      modelName: model.modelName,
      rateLimitPerMinute: model.rateLimitPerMinute,
      enabled: model.enabled,
      credentialRef: undefined
    });
    setModalOpen(true);
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <PageErrorAlert response={modelsQuery.data} />
      <Card title="模型设置" extra={<Button type="primary" onClick={openCreateModal}>新增模型</Button>}>
        <Typography.Paragraph>
          这里统一管理要接入的大模型。DeepSeek、小米模型、豆包、通义千问或其他兼容 OpenAI Chat Completions 的接口，都可以在这里填写接口地址、模型名称和密钥引用。
        </Typography.Paragraph>
        <Alert
          type="info"
          showIcon
          message="API Key 只用于后台调用，页面只显示是否已填写"
          description="可以直接填写供应商给的 API Key，也可以填写服务器环境变量名；编辑模型时密钥不会回填。"
        />
      </Card>

      <Card title="已接入模型" loading={modelsQuery.isLoading}>
        <Table
          rowKey="id"
          dataSource={models}
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: <EmptyState description="还没有模型设置，请先新增一个模型。" actionLabel="新增模型" onAction={openCreateModal} /> }}
          scroll={{ x: 1100 }}
          columns={[
            { title: '模型', render: (_, record) => <Space direction="vertical" size={0}><Typography.Text>{record.name}</Typography.Text><Typography.Text type="secondary">{record.platformCode}</Typography.Text></Space> },
            { title: '调用方式', dataIndex: 'mode', render: (value: PlatformMode) => modeLabels[value] },
            { title: '接口地址', dataIndex: 'endpointUrl', render: (value) => value || '-' },
            { title: '模型名称', dataIndex: 'modelName', render: (value) => value || '-' },
            { title: '密钥', render: (_, record) => record.hasCredential ? <Tag color="green">已填写</Tag> : <Tag>未填写</Tag> },
            { title: '启用', dataIndex: 'enabled', render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用中' : '已停用'}</Tag> },
            { title: '最近检查', render: (_, record) => record.lastValidation ? <Tag color={record.lastValidation.ok ? 'green' : 'red'}>{record.lastValidation.message}</Tag> : <Tag>未检查</Tag> },
            {
              title: '操作',
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => openEditModal(record)}>编辑</Button>
                  <Button type="link" loading={validateMutation.isPending} onClick={() => validateMutation.mutate(record.id)}>检查连接</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title={editingModel ? '编辑模型设置' : '新增模型设置'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveMutation.isPending}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item name="platformCode" label={<FieldLabel text="模型标识" help="用于系统内部识别这个模型，建议用英文小写，例如 deepseek、kimi、xiaomi。" />} rules={[{ required: true, message: '请输入模型标识' }]}>
            <Input placeholder="例如：deepseek" />
          </Form.Item>
          <Form.Item name="name" label={<FieldLabel text="显示名称" help="给运营人员看的名称，例如 DeepSeek、Kimi、小米大模型。" />} rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="例如：DeepSeek" />
          </Form.Item>
          <Form.Item name="mode" label={<FieldLabel text="调用方式" help="选择自动 API 测试后，系统会用接口地址和模型名称自动调用；手动测试用于复制问题后粘贴回答。" />} rules={[{ required: true, message: '请选择调用方式' }]}>
            <Select options={Object.entries(modeLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="endpointUrl" label={<FieldLabel text="接口地址" help="填写兼容 OpenAI Chat Completions 的完整地址，例如 https://api.deepseek.com/chat/completions。" />}>
            <Input placeholder="https://api.deepseek.com/chat/completions" />
          </Form.Item>
          <Form.Item name="modelName" label={<FieldLabel text="模型名称" help="填写供应商文档里的 model 名称，例如 deepseek-chat、moonshot-v1-8k。" />}>
            <Input placeholder="例如：deepseek-chat" />
          </Form.Item>
          <Form.Item name="credentialRef" label={<FieldLabel text="API Key" help="可以直接填写供应商给的 API Key；也可以填写服务器环境变量名，例如 DEEPSEEK_API_KEY。保存后页面只显示是否已填写。" />}>
            <Input.Password placeholder={editingModel ? '不填写则保持原 API Key' : '粘贴 API Key，或填写环境变量名'} />
          </Form.Item>
          <Form.Item name="rateLimitPerMinute" label={<FieldLabel text="每分钟调用上限" help="用于控制自动测试频率，避免供应商限流；不知道填多少可先填 20。" />}>
            <InputNumber min={0} addonAfter="次/分钟" className="full-width" />
          </Form.Item>
          <Form.Item name="enabled" label="是否启用" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function FieldLabel({ text, help }: { text: string; help: string }) {
  return (
    <Space size={4}>
      <span>{text}</span>
      <Tooltip title={help}>
        <Typography.Text type="secondary" aria-label={`${text}说明`} style={{ cursor: 'help' }}>?</Typography.Text>
      </Tooltip>
    </Space>
  );
}

function toModelPayload(values: ModelFormValues, editing: boolean): PlatformConfigInput {
  const credentialRef = values.credentialRef?.trim();

  return {
    ...values,
    platformCode: values.platformCode.trim(),
    name: values.name.trim(),
    endpointUrl: values.endpointUrl?.trim() || undefined,
    modelName: values.modelName?.trim() || undefined,
    credentialRef: credentialRef || (editing ? undefined : credentialRef),
    rateLimitPerMinute: values.rateLimitPerMinute ?? 0,
    enabled: values.enabled ?? true
  };
}

const modeLabels: Record<PlatformMode, string> = {
  api: '自动 API 调用',
  semi_auto: '浏览器或手动确认',
  manual: '手动录入',
  mock: '演示模拟'
};
