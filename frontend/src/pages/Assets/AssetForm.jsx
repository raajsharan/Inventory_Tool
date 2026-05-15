import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card, Form, Input, Select, Switch, Row, Col, Button, Space, App, Typography, Divider,
} from 'antd';
import api from '../../api/client';

const ipRe = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export default function AssetForm({ mode }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [dd, setDd] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [osType, setOsType] = useState();

  useEffect(() => {
    api.get('/dropdowns').then(r => setDd(r.data.grouped || {}));
    if (mode === 'edit' && id) {
      api.get(`/assets/${id}`).then(r => {
        form.setFieldsValue({
          vmName: r.data.vm_name,
          osHostname: r.data.os_hostname,
          ipAddress: r.data.ip_address,
          assetType: r.data.asset_type,
          osType: r.data.os_type,
          osVersion: r.data.os_version,
          assignedUser: r.data.assigned_user,
          department: r.data.department,
          businessPurpose: r.data.business_purpose,
          serverStatus: r.data.server_status,
          patchingType: r.data.patching_type,
          serverPatchType: r.data.server_patch_type,
          patchingSchedule: r.data.patching_schedule,
          location: r.data.location,
          eolStatus: r.data.eol_status,
          serialNumber: r.data.serial_number,
          omeStatus: r.data.ome_status,
          hostedIp: r.data.hosted_ip,
          assetTag: r.data.asset_tag,
          assetUsername: r.data.asset_username,
          additionalRemarks: r.data.additional_remarks,
          manageEngineInstalled: r.data.manage_engine_installed,
          tenableInstalled: r.data.tenable_installed,
          idracEnabled: r.data.idrac_enabled,
        });
        setOsType(r.data.os_type);
      });
    }
  }, [id, mode]); // eslint-disable-line

  const opts = (cat, parent) => (dd[cat] || [])
    .filter(d => !parent || !d.parent_value || d.parent_value === parent)
    .map(d => ({ label: d.value, value: d.value }));

  async function onFinish(values) {
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await api.post('/assets', values);
        message.success('Asset created');
      } else {
        await api.put(`/assets/${id}`, values);
        message.success('Asset updated');
      }
      nav('/assets');
    } catch (e) {
      const err = e.response?.data;
      if (err?.details && typeof err.details === 'object' && !Array.isArray(err.details)) {
        const fields = Object.entries(err.details).map(([k, v]) => ({
          name: k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
          errors: [v],
        }));
        form.setFields(fields);
      }
      message.error(err?.error || 'Failed to save');
    } finally { setSubmitting(false); }
  }

  return (
    <Card title={<Typography.Title level={4} style={{ margin: 0 }}>{mode === 'create' ? 'Add Asset' : 'Edit Asset'}</Typography.Title>}>
      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ manageEngineInstalled: false, tenableInstalled: false, idracEnabled: false }}>
        <Divider orientation="left">Identity</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}><Form.Item name="vmName" label="VM Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="osHostname" label="OS Hostname"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="ipAddress" label="IP Address" rules={[{ required: true }, { pattern: ipRe, message: 'Invalid IP address' }]}><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="assetType" label="Asset Type"><Input placeholder="e.g. Virtual Server" /></Form.Item></Col>
          <Col xs={24} md={8}>
            <Form.Item name="osType" label="OS Type">
              <Select allowClear options={opts('os_type')} onChange={(v) => { setOsType(v); form.setFieldValue('osVersion', undefined); }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="osVersion" label="OS Version">
              <Select allowClear options={opts('os_version', osType)} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Ownership</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}><Form.Item name="assignedUser" label="Assigned User"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="department" label="Department"><Input /></Form.Item></Col>
          <Col xs={24} md={24}><Form.Item name="businessPurpose" label="Business Purpose"><Input.TextArea rows={2} /></Form.Item></Col>
        </Row>

        <Divider orientation="left">Operations</Divider>
        <Row gutter={16}>
          <Col xs={24} md={6}><Form.Item name="serverStatus" label="Server Status"><Select allowClear options={opts('server_status')} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="patchingType" label="Patching Type"><Select allowClear options={opts('patching_type')} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="serverPatchType" label="Server Patch Type"><Select allowClear options={opts('server_patch_type')} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="patchingSchedule" label="Patching Schedule"><Select allowClear options={opts('patching_schedule')} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="location" label="Location"><Select allowClear options={opts('location')} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="eolStatus" label="EOL Status"><Select allowClear options={opts('eol_status')} /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="omeStatus" label="OME Status"><Input /></Form.Item></Col>
          <Col xs={24} md={6}><Form.Item name="hostedIp" label="Hosted IP"><Input /></Form.Item></Col>
        </Row>

        <Divider orientation="left">Asset Tagging & Credentials</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}><Form.Item name="serialNumber" label="Serial Number"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="assetTag" label="Asset Tag"><Input /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="assetUsername" label="Asset Username"><Input /></Form.Item></Col>
          <Col xs={24} md={8}>
            <Form.Item name="assetPassword" label="Asset Password" extra="Encrypted (AES-256-GCM) at rest">
              <Input.Password placeholder={mode === 'edit' ? 'Leave blank to keep existing' : ''} autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}><Form.Item name="additionalRemarks" label="Additional Remarks"><Input.TextArea rows={2} /></Form.Item></Col>
        </Row>

        <Divider orientation="left">Tools</Divider>
        <Row gutter={16}>
          <Col xs={12} md={6}><Form.Item name="manageEngineInstalled" label="ManageEngine Installed" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={12} md={6}><Form.Item name="tenableInstalled" label="Tenable Installed" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col xs={12} md={6}><Form.Item name="idracEnabled" label="iDRAC Enabled" valuePropName="checked"><Switch /></Form.Item></Col>
        </Row>

        <Space>
          <Button type="primary" htmlType="submit" loading={submitting}>{mode === 'create' ? 'Create Asset' : 'Save Changes'}</Button>
          <Button onClick={() => nav('/assets')}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}
