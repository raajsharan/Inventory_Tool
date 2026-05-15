import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card, Form, Input, InputNumber, Select, Switch, DatePicker, Button, Space, Typography,
  Row, Col, Divider, App,
} from 'antd';
import dayjs from 'dayjs';
import api from '../../api/client';

export default function CustomPageRecordForm({ mode = 'create' }) {
  const { slug, recordId } = useParams();
  const nav = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [page, setPage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/custom-pages/${slug}`)
      .then(r => setPage(r.data))
      .catch(e => message.error(e.response?.data?.error || 'Failed to load page'));
  }, [slug]);

  useEffect(() => {
    if (mode !== 'edit' || !page || !recordId) return;
    api.get(`/custom-pages/${page.id}/records`, { params: { page: 1, pageSize: 500 } })
      .then(r => {
        const rec = (r.data.items || []).find(x => x.id === recordId);
        if (!rec) {
          message.error('Record not found');
          nav(`/custom-pages/${slug}`);
          return;
        }
        const v = { ...rec.data };
        page.fields.forEach(f => {
          if (f.field_type === 'date' && v[f.field_key]) v[f.field_key] = dayjs(v[f.field_key]);
        });
        form.setFieldsValue(v);
      });
  }, [mode, page, recordId]); // eslint-disable-line

  // Group fields by section preserving order.
  const sections = useMemo(() => {
    if (!page) return [];
    const groups = new Map();
    for (const f of page.fields) {
      const sec = f.section || 'General';
      if (!groups.has(sec)) groups.set(sec, []);
      groups.get(sec).push(f);
    }
    return Array.from(groups.entries()).map(([name, fields]) => ({ name, fields }));
  }, [page]);

  async function onFinish(values) {
    if (!page) return;
    setSubmitting(true);
    const data = { ...values };
    page.fields.forEach(f => {
      if (f.field_type === 'date' && data[f.field_key]) {
        data[f.field_key] = data[f.field_key].toISOString();
      }
    });
    try {
      if (mode === 'create') {
        await api.post(`/custom-pages/${page.id}/records`, { data });
        message.success('Record created');
      } else {
        await api.put(`/custom-pages/${page.id}/records/${recordId}`, { data });
        message.success('Record updated');
      }
      nav(`/custom-pages/${slug}`);
    } catch (e) {
      message.error(e.response?.data?.error || 'Save failed');
    } finally { setSubmitting(false); }
  }

  if (!page) return null;

  const title = mode === 'create' ? `Add Record — ${page.name}` : `Edit Record — ${page.name}`;

  return (
    <Card title={<Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>}
      className="inventory-form-card"
    >
      <Form form={form} layout="vertical" onFinish={onFinish} className="inventory-form">
        {sections.map((sec) => (
          <div key={sec.name}>
            <Divider orientation="left" className="section-divider">{sec.name}</Divider>
            <Row gutter={16}>
              {sec.fields.map(f => {
                const rules = f.is_required ? [{ required: true, message: `${f.label} is required` }] : [];
                const wideTypes = ['textarea'];
                const span = wideTypes.includes(f.field_type) ? 24 : 8;
                return (
                  <Col xs={24} md={span} key={f.field_key}>
                    <Form.Item name={f.field_key} label={f.label} rules={rules}
                      valuePropName={f.field_type === 'toggle' ? 'checked' : 'value'}>
                      {renderInput(f)}
                    </Form.Item>
                  </Col>
                );
              })}
            </Row>
          </div>
        ))}

        <Space style={{ marginTop: 16 }}>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {mode === 'create' ? 'Create Record' : 'Save Changes'}
          </Button>
          <Button onClick={() => nav(`/custom-pages/${slug}`)}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}

function renderInput(f) {
  switch (f.field_type) {
    case 'text':     return <Input />;
    case 'textarea': return <Input.TextArea rows={3} />;
    case 'number':   return <InputNumber style={{ width: '100%' }} />;
    case 'dropdown': return <Select options={(f.options || []).map(o => ({ label: o, value: o }))} allowClear />;
    case 'toggle':   return <Switch />;
    case 'date':     return <DatePicker style={{ width: '100%' }} />;
    default:         return <Input />;
  }
}
