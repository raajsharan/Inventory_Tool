import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, loading } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [error, setError] = useState('');

  async function onFinish(values) {
    setError('');
    try {
      await login(values.email, values.password);
      const to = loc.state?.from?.pathname || '/dashboard';
      nav(to, { replace: true });
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f1e4d 0%, #1f3a8a 100%)'
    }}>
      <Card style={{ width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Typography.Title level={3} style={{ marginBottom: 4 }}>Infrastructure Inventory</Typography.Title>
          <Typography.Text type="secondary">Sign in to your enterprise account</Typography.Text>
        </div>
        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}
        <Form layout="vertical" onFinish={onFinish} initialValues={{ email: 'admin@example.com' }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<MailOutlined />} placeholder="you@example.com" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Sign in
          </Button>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginTop: 24, fontSize: 12, textAlign: 'center' }}>
          Default admin (seeded): admin@example.com / Admin@123
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
