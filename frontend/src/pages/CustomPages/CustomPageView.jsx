import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, DatePicker,
  Space, Typography, App, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, SettingOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CustomPageView({ initialAction }) {
  const { slug } = useParams();
  const loc = useLocation();
  const nav = useNavigate();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [page, setPage] = useState(null);
  const [records, setRecords] = useState({ items: [], total: 0 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [pageEditOpen, setPageEditOpen] = useState(false);
  const [pageForm] = Form.useForm();
  const [pg, setPg] = useState({ current: 1, pageSize: 20 });

  const canWrite = ['admin', 'asset_manager'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.get(`/custom-pages/${slug}`)
      .then(r => setPage(r.data))
      .catch(e => message.error(e.response?.data?.error || 'Failed to load page'));
  }, [slug]);

  useEffect(() => {
    if (initialAction === 'new' && page && canWrite) {
      openCreate();
    }
  }, [initialAction, page]); // eslint-disable-line

  async function loadRecords() {
    if (!page) return;
    const { data } = await api.get(`/custom-pages/${page.id}/records`, { params: { page: pg.current, pageSize: pg.pageSize } });
    setRecords(data);
  }
  useEffect(() => { loadRecords(); }, [page, pg.current, pg.pageSize]); // eslint-disable-line

  function openCreate() {
    setEditing(null);
    form.resetFields();
    setOpen(true);
  }

  function openEdit(record) {
    setEditing(record);
    const v = { ...record.data };
    page.fields.forEach(f => { if (f.field_type === 'date' && v[f.field_key]) v[f.field_key] = dayjs(v[f.field_key]); });
    form.setFieldsValue(v);
    setOpen(true);
  }

  async function onSubmit(values) {
    const data = { ...values };
    page.fields.forEach(f => { if (f.field_type === 'date' && data[f.field_key]) data[f.field_key] = data[f.field_key].toISOString(); });
    try {
      if (editing) await api.put(`/custom-pages/${page.id}/records/${editing.id}`, { data });
      else await api.post(`/custom-pages/${page.id}/records`, { data });
      message.success('Saved');
      setOpen(false);
      loadRecords();
      if (initialAction === 'new') nav(`/custom-pages/${slug}`, { replace: true });
    } catch (e) {
      message.error(e.response?.data?.error || 'Save failed');
    }
  }

  async function onDelete(id) {
    await api.delete(`/custom-pages/${page.id}/records/${id}`);
    message.success('Deleted');
    loadRecords();
  }

  function openPageEdit() {
    pageForm.setFieldsValue({
      name: page.name,
      description: page.description,
      icon: page.icon,
      is_active: page.is_active,
    });
    setPageEditOpen(true);
  }

  async function onPageEditSubmit(values) {
    try {
      const { data } = await api.put(`/custom-pages/${page.id}`, values);
      message.success('Page updated');
      setPageEditOpen(false);
      // If the slug changed, navigate to the new URL
      if (data.slug && data.slug !== slug) {
        setTimeout(() => location.replace(`/custom-pages/${data.slug}`), 50);
      } else {
        setPage({ ...page, ...data });
        setTimeout(() => location.reload(), 50); // refresh sidebar labels
      }
    } catch (e) {
      message.error(e.response?.data?.error || 'Update failed');
    }
  }

  async function onPageDelete() {
    try {
      await api.delete(`/custom-pages/${page.id}`);
      message.success('Page deleted');
      setTimeout(() => location.replace('/dashboard'), 50);
    } catch (e) {
      message.error(e.response?.data?.error || 'Delete failed');
    }
  }

  if (!page) return null;

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>{page.name}</Typography.Title>}
      extra={
        <Space>
          {canWrite && (
            <Button icon={<UploadOutlined />} onClick={() => nav(`/custom-pages/${slug}/import`)}>
              Import
            </Button>
          )}
          {canWrite && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add Record
            </Button>
          )}
          {isAdmin && (
            <>
              <Button icon={<SettingOutlined />} onClick={openPageEdit}>
                Edit Page
              </Button>
              <Popconfirm
                title="Delete this page?"
                description="This will permanently delete the page and all its records."
                okType="danger"
                onConfirm={onPageDelete}
              >
                <Button danger icon={<DeleteOutlined />}>Delete Page</Button>
              </Popconfirm>
            </>
          )}
        </Space>
      }
    >
      {page.description && <Typography.Paragraph type="secondary">{page.description}</Typography.Paragraph>}

      <Table
        rowKey="id"
        dataSource={records.items}
        pagination={{
          current: pg.current, pageSize: pg.pageSize, total: records.total,
          onChange: (current, pageSize) => setPg({ current, pageSize }),
          showSizeChanger: true,
        }}
        columns={[
          ...page.fields.map(f => ({
            title: f.label,
            dataIndex: ['data', f.field_key],
            render: (v) => {
              if (f.field_type === 'toggle') return v ? 'Yes' : 'No';
              if (f.field_type === 'date' && v) return new Date(v).toLocaleDateString();
              return v ?? '—';
            },
          })),
          {
            title: 'Actions', width: 130, render: (_, r) => (
              <Space>
                {canWrite && <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />}
                {isAdmin && (
                  <Popconfirm title="Delete?" onConfirm={() => onDelete(r.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editing ? 'Edit Record' : 'Add Record'}
        open={open}
        onCancel={() => {
          setOpen(false);
          if (initialAction === 'new') nav(`/custom-pages/${slug}`, { replace: true });
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          {page.fields.map(f => {
            const rules = f.is_required ? [{ required: true, message: `${f.label} is required` }] : [];
            const common = { name: f.field_key, label: f.label, rules };
            if (f.field_type === 'text')     return <Form.Item key={f.field_key} {...common}><Input /></Form.Item>;
            if (f.field_type === 'textarea') return <Form.Item key={f.field_key} {...common}><Input.TextArea rows={3} /></Form.Item>;
            if (f.field_type === 'number')   return <Form.Item key={f.field_key} {...common}><InputNumber style={{ width: '100%' }} /></Form.Item>;
            if (f.field_type === 'dropdown') return <Form.Item key={f.field_key} {...common}><Select options={(f.options || []).map(o => ({ label: o, value: o }))} allowClear /></Form.Item>;
            if (f.field_type === 'toggle')   return <Form.Item key={f.field_key} {...common} valuePropName="checked"><Switch /></Form.Item>;
            if (f.field_type === 'date')     return <Form.Item key={f.field_key} {...common}><DatePicker style={{ width: '100%' }} /></Form.Item>;
            return null;
          })}
        </Form>
      </Modal>

      <Modal
        title={`Edit Page — ${page.name}`}
        open={pageEditOpen}
        onCancel={() => setPageEditOpen(false)}
        onOk={() => pageForm.submit()}
        destroyOnClose
      >
        <Form form={pageForm} layout="vertical" onFinish={onPageEditSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="icon" label="Icon (Ant Design name, optional)">
            <Input placeholder="e.g. ApiOutlined" />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Field schema cannot be edited here — it would orphan existing record data.
          </Typography.Text>
        </Form>
      </Modal>
    </Card>
  );
}
