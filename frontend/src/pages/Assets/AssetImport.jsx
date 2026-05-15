import { useState } from 'react';
import { Card, Button, Upload, Space, Typography, Alert, Table, Tag } from 'antd';
import { DownloadOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import api from '../../api/client';

export default function AssetImport() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function onDownloadTemplate() {
    const res = await api.get('/assets/template', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'asset-import-template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  async function customRequest({ file, onSuccess, onError }) {
    setLoading(true); setErr(''); setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/assets/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      onSuccess?.(res.data);
    } catch (e) {
      setErr(e.response?.data?.error || 'Import failed');
      onError?.(e);
    } finally { setLoading(false); }
  }

  return (
    <Card title={<Typography.Title level={4} style={{ margin: 0 }}>Import Assets from Excel</Typography.Title>}>
      <Alert
        type="info"
        showIcon
        message="Workflow"
        description="1) Download the template. 2) Fill it in (remove the example row). 3) Upload — each row is validated. Duplicate VM Names, IPs, or Asset Tags will be rejected."
        style={{ marginBottom: 16 }}
      />

      <Space style={{ marginBottom: 16 }}>
        <Button icon={<DownloadOutlined />} onClick={onDownloadTemplate}>Download Template</Button>
      </Space>

      <Upload.Dragger
        name="file"
        multiple={false}
        accept=".xlsx,.xls"
        customRequest={customRequest}
        showUploadList={false}
        disabled={loading}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">Click or drag .xlsx file to upload</p>
        <p className="ant-upload-hint">Max 10 MB. Validated server-side row by row.</p>
      </Upload.Dragger>

      {loading && <Alert type="info" showIcon message="Uploading and validating..." style={{ marginTop: 16 }} />}
      {err && <Alert type="error" message={err} style={{ marginTop: 16 }} />}

      {result && (
        <Card style={{ marginTop: 16 }} type="inner" title="Import Results">
          <Space>
            <Tag color="blue">Total rows: {result.total}</Tag>
            <Tag color="green">Imported: {result.success}</Tag>
            <Tag color={result.failed ? 'red' : 'default'}>Failed: {result.failed}</Tag>
          </Space>
          {result.failures?.length > 0 && (
            <Table
              style={{ marginTop: 16 }}
              size="small"
              rowKey={(r) => r.row}
              dataSource={result.failures}
              columns={[
                { title: 'Row', dataIndex: 'row', width: 80 },
                { title: 'Errors', dataIndex: 'errors', render: arr => arr?.map((e, i) => <Tag key={i} color="red">{e}</Tag>) },
                { title: 'Data', dataIndex: 'data', render: d => <code style={{ fontSize: 12 }}>{JSON.stringify(d)}</code> },
              ]}
            />
          )}
        </Card>
      )}
    </Card>
  );
}
