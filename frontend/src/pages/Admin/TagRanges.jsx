import { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Space, Popconfirm, App, Typography, Switch, Tag,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function TagRanges() {
  const { message } = App.useApp();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/departments');
      setRows(data.items || []);
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to load departments');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

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
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Department</Button>}
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        Departments listed here drive the asset form. Each department's asset tags must fall within its numeric range.
        Ranges may overlap across teams. New asset creation auto-assigns the next available tag in the chosen department's range.
      </Typography.Paragraph>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        columns={[
          { title: 'Sort', dataIndex: 'sort_order', width: 70 },
          { title: 'Department', dataIndex: 'name' },
          {
            title: 'Range',
            render: (_, r) => (
              <Tag color="blue">
                {String(r.min_tag).padStart(4, '0')}–{String(r.max_tag).padStart(4, '0')}
              </Tag>
            ),
          },
          { title: 'Total Slots', render: (_, r) => (r.max_tag - r.min_tag + 1).toLocaleString(), width: 120 },
          {
            title: 'Active',
            dataIndex: 'is_active',
            width: 80,
            render: v => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
          },
          {
            title: 'Actions', width: 130, render: (_, r) => (
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
