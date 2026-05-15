import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Space, Popconfirm, App, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../api/client';

const CATEGORIES = [
  'os_type','os_version','server_status','patching_type','server_patch_type',
  'patching_schedule','location','eol_status',
];

export default function Dropdowns() {
  const { message } = App.useApp();
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  async function load() {
    const { data } = await api.get('/dropdowns', { params: filter ? { category: filter } : {} });
    setData(data.items);
  }
  useEffect(() => { load(); }, [filter]);

  function openCreate() { setEditing(null); form.resetFields(); setOpen(true); }
  function openEdit(v) { setEditing(v); form.setFieldsValue(v); setOpen(true); }

  async function onSubmit(v) {
    try {
      if (editing) await api.put(`/dropdowns/${editing.id}`, v);
      else await api.post('/dropdowns', v);
      message.success('Saved'); setOpen(false); load();
    } catch (e) { message.error(e.response?.data?.error || 'Failed'); }
  }

  async function onDelete(id) {
    await api.delete(`/dropdowns/${id}`);
    message.success('Deleted'); load();
  }

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>Dropdown Master</Typography.Title>}
      extra={
        <Space>
          <Select allowClear placeholder="Filter category" style={{ width: 200 }}
            options={CATEGORIES.map(c => ({ label: c, value: c }))} onChange={setFilter} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Value</Button>
        </Space>
      }
    >
      <Table
        rowKey="id"
        dataSource={data}
        columns={[
          { title: 'Category', dataIndex: 'category' },
          { title: 'Value', dataIndex: 'value' },
          { title: 'Parent', dataIndex: 'parent_value' },
          { title: 'Sort', dataIndex: 'sort_order', width: 80 },
          { title: 'Actions', width: 130, render: (_, r) => (
            <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
              <Popconfirm title="Delete?" onConfirm={() => onDelete(r.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )},
        ]}
      />
      <Modal open={open} title={editing ? 'Edit Value' : 'Add Value'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select options={CATEGORIES.map(c => ({ label: c, value: c }))} disabled={!!editing} />
          </Form.Item>
          <Form.Item name="value" label="Value" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="parent_value" label="Parent value (for cascading)"><Input /></Form.Item>
          <Form.Item name="sort_order" label="Sort order"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
