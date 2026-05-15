import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Card, Table, Button, Modal, Form, Input, InputNumber, Select, Switch, DatePicker,
  Space, Typography, App, Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CustomPageView() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [page, setPage] = useState(null);
  const [records, setRecords] = useState({ items: [], total: 0 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const [pg, setPg] = useState({ current: 1, pageSize: 20 });

  const canWrite = ['admin','asset_manager'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    api.get(`/custom-pages/${slug}`)
      .then(r => setPage(r.data))
      .catch(e => message.error(e.response?.data?.error || 'Failed to load page'));
  }, [slug]);

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
    } catch (e) {
      message.error(e.response?.data?.error || 'Save failed');
    }
  }

  async function onDelete(id) {
    await api.delete(`/custom-pages/${page.id}/records/${id}`);
    message.success('Deleted');
    loadRecords();
  }

  if (!page) return null;

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>{page.name}</Typography.Title>}
      extra={canWrite && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Record</Button>}
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
        onCancel={() => setOpen(false)}
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
    </Card>
  );
}
