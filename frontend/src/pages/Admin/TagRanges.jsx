import { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Space, Popconfirm, App, Typography,
  Switch, Tag, Progress, Tabs,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function TagRanges() {
  const { message } = App.useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [table, setTable] = useState('assets');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/departments/stats', { params: { table } });
      setRows(data.items || []);
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to load departments');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [table]); // eslint-disable-line

  function openCreate() {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, sort_order: (rows.at(-1)?.sort_order ?? 0) + 1 });
    setOpen(true);
  }

  function openEdit(r) {
    setEditing(r);
    form.setFieldsValue(r);
    setOpen(true);
  }

  async function onSubmit(values) {
    if (values.max_tag < values.min_tag) {
      form.setFields([{ name: 'max_tag', errors: ['Max must be ≥ Min'] }]);
      return;
    }
    try {
      if (editing) await api.put(`/departments/${editing.id}`, values);
      else         await api.post('/departments', values);
      message.success('Saved');
      setOpen(false);
      load();
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to save');
    }
  }

  async function onDelete(id) {
    try {
      await api.delete(`/departments/${id}`);
      message.success('Deleted');
      load();
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to delete');
    }
  }

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>Departments &amp; Asset Tag Ranges</Typography.Title>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Department</Button>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        Departments listed here drive the asset form. Each department's asset tags must fall within its numeric range.
        Usage counts are calculated against the selected inventory.
      </Typography.Paragraph>

      <Tabs
        size="small"
        activeKey={table}
        onChange={setTable}
        items={[
          { key: 'assets', label: 'Asset Inventory' },
          { key: 'beijing_assets', label: 'Beijing Inventory' },
        ]}
      />

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: 'Sort', dataIndex: 'sort_order', width: 60 },
          { title: 'Department', dataIndex: 'name' },
          {
            title: 'Range',
            width: 130,
            render: (_, r) => (
              <Tag color="blue">
                {String(r.min_tag).padStart(4, '0')}–{String(r.max_tag).padStart(4, '0')}
              </Tag>
            ),
          },
          { title: 'Total', dataIndex: 'total', width: 80, render: v => (v ?? 0).toLocaleString() },
          {
            title: 'Used',
            dataIndex: 'used',
            width: 90,
            render: v => <Tag color={v > 0 ? 'red' : 'default'}>{(v ?? 0).toLocaleString()}</Tag>,
          },
          {
            title: 'Free',
            dataIndex: 'available',
            width: 90,
            render: v => <Tag color="green">{(v ?? 0).toLocaleString()}</Tag>,
          },
          {
            title: 'Utilization',
            width: 180,
            render: (_, r) => (
              <Progress
                percent={r.usedPct ?? 0}
                size="small"
                status={r.usedPct >= 90 ? 'exception' : r.usedPct >= 70 ? 'active' : 'normal'}
              />
            ),
          },
          {
            title: 'Active',
            dataIndex: 'is_active',
            width: 80,
            render: v => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
          },
          {
            title: 'Actions', width: 110, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                <Popconfirm title="Delete this department?" onConfirm={() => onDelete(r.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={open}
        title={editing ? 'Edit Department' : 'Add Department'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="name" label="Department Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="e.g. Architecture Team" />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="min_tag" label="Min Tag" rules={[{ required: true, message: 'Required' }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="max_tag" label="Max Tag" rules={[{ required: true, message: 'Required' }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sort_order" label="Sort">
              <InputNumber min={0} style={{ width: 100 }} />
            </Form.Item>
          </Space>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
