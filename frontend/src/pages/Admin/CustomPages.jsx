import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card, Table, Button, Modal, Form, Input, Space, Popconfirm, App, Typography, Tag, Switch, Tooltip,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, AppstoreAddOutlined,
  DatabaseOutlined, GlobalOutlined, CloudServerOutlined, HddOutlined, EyeOutlined, LockOutlined,
} from '@ant-design/icons';
import api from '../../api/client';

// Built-in inventory pages. Schema is fixed (one DB table per page) — admins
// customize their fields through the Field Customization screen rather than
// editing them here.
const BUILT_IN_PAGES = [
  {
    id: 'built-in:assets',
    isBuiltIn: true,
    page_key: 'assets',
    slug: 'assets',
    name: 'Assets',
    description: 'Primary asset inventory.',
    path: '/assets',
    icon: <DatabaseOutlined />,
  },
  {
    id: 'built-in:beijing_assets',
    isBuiltIn: true,
    page_key: 'beijing_assets',
    slug: 'beijing-assets',
    name: 'Beijing Assets',
    description: 'Beijing region asset inventory.',
    path: '/beijing-assets',
    icon: <GlobalOutlined />,
  },
  {
    id: 'built-in:ext_assets',
    isBuiltIn: true,
    page_key: 'ext_assets',
    slug: 'ext-assets',
    name: 'Ext. Assets',
    description: 'Extended asset inventory.',
    path: '/ext-assets',
    icon: <CloudServerOutlined />,
  },
  {
    id: 'built-in:physical_esxi_servers',
    isBuiltIn: true,
    page_key: 'physical_esxi_servers',
    slug: 'physical-esxi',
    name: 'Physical & ESXi Servers',
    description: 'Physical hardware and ESXi hypervisors.',
    path: '/physical-esxi',
    icon: <HddOutlined />,
  },
];

export default function AdminCustomPages() {
  const { message } = App.useApp();
  const nav = useNavigate();
  const [custom, setCustom] = useState([]);
  const [builtInFieldCounts, setBuiltInFieldCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  async function load() {
    setLoading(true);
    try {
      const [customRes, fvRes] = await Promise.all([
        api.get('/custom-pages'),
        api.get('/field-visibility').catch(() => ({ data: { items: [] } })),
      ]);
      setCustom(customRes.data.items || []);
      const counts = {};
      for (const p of fvRes.data.items || []) counts[p.key] = (p.fields || []).length;
      setBuiltInFieldCounts(counts);
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

  const rows = [
    ...BUILT_IN_PAGES.map(p => ({
      ...p,
      is_active: true,
      fields: { length: builtInFieldCounts[p.page_key] ?? 0 },
    })),
    ...custom.map(p => ({ ...p, isBuiltIn: false, path: `/custom-pages/${p.slug}`, icon: <AppstoreAddOutlined /> })),
  ];

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
        Built-in pages (Assets, Beijing Assets, Ext. Assets, Physical &amp; ESXi) are listed here
        for reference — their schemas are fixed, so use{' '}
        <Link to="/admin/field-visibility">Field Customization</Link> to hide individual fields.
        Pages created via <strong>New Page</strong> can be renamed, edited, or deleted.
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
                {r.icon || <AppstoreAddOutlined />}
                <Link to={r.path}>
                  <strong>{r.name}</strong>
                </Link>
                {r.isBuiltIn && (
                  <Tooltip title="Built-in page — schema is managed by the system">
                    <Tag color="purple" icon={<LockOutlined />}>Built-in</Tag>
                  </Tooltip>
                )}
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
            title: 'Actions', width: 220, render: (_, r) => (
              r.isBuiltIn ? (
                <Tooltip title="Manage which fields are visible on this page">
                  <Button size="small" icon={<EyeOutlined />} onClick={() => nav('/admin/field-visibility')}>
                    Customize Fields
                  </Button>
                </Tooltip>
              ) : (
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
              )
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
