import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Modal, Form, Input, Space, Popconfirm, App, Typography, Tag, Switch,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreAddOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function AdminCustomPages() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/custom-pages');
      setRows(data.items || []);
    } catch (e) {
      message.error(e.response?.data?.error || 'Failed to load');
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openEdit(p) {
    setEditing(p);
    form.setFieldsValue({
      name: p.name,
      description: p.description,
      icon: p.icon,
      is_active: p.is_active,
    });
    setOpen(true);
  }

  async function onSubmit(values) {
    try {
      await api.put(`/custom-pages/${editing.id}`, values);
      message.success('Saved');
      setOpen(false);
      load();
      // refresh sidebar
      setTimeout(() => location.reload(), 50);
    } catch (e) {
      message.error(e.response?.data?.error || 'Save failed');
    }
  }

  async function onDelete(id) {
    try {
      await api.delete(`/custom-pages/${id}`);
      message.success('Page deleted');
      load();
      setTimeout(() => location.reload(), 50);
    } catch (e) {
      message.error(e.response?.data?.error || 'Delete failed');
    }
  }

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>Custom Pages</Typography.Title>}
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => nav('/custom-pages/new')}>
          New Page
        </Button>
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        Manage custom pages here. Rename, change description, or delete a page. Deleting a page
        permanently removes its fields and all records.
      </Typography.Paragraph>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={rows}
        pagination={false}
        columns={[
          {
            title: 'Page',
            render: (_, r) => (
              <Space>
                <AppstoreAddOutlined />
                <Link to={`/custom-pages/${r.slug}`}>
                  <strong>{r.name}</strong>
                </Link>
              </Space>
            ),
          },
          { title: 'Slug', dataIndex: 'slug', render: v => <Tag>{v}</Tag> },
          { title: 'Description', dataIndex: 'description', render: v => v || <Typography.Text type="secondary">—</Typography.Text> },
          {
            title: 'Fields',
            render: (_, r) => <Tag color="blue">{r.fields?.length ?? 0} fields</Tag>,
            width: 110,
          },
          {
            title: 'Active', dataIndex: 'is_active', width: 90,
            render: v => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
          },
          {
            title: 'Actions', width: 160, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
                <Popconfirm
                  title="Delete this page?"
                  description="This will permanently delete the page and all its records."
                  okType="danger"
                  onConfirm={() => onDelete(r.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title={editing ? `Edit Page: ${editing.name}` : 'Edit Page'}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="icon" label="Icon (Ant Design name, optional)" extra="e.g. ApiOutlined, DatabaseOutlined">
            <Input />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Field structure (columns) cannot be edited from this dialog to protect existing records.
            Create a new page if you need a different schema.
          </Typography.Text>
        </Form>
      </Modal>
    </Card>
  );
}
