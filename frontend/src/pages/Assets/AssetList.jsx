import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Card, Table, Input, Select, Space, Button, Tag, Popconfirm, App, Row, Col, Typography,
} from 'antd';
import {
  PlusOutlined, DownloadOutlined, UploadOutlined, SearchOutlined,
  EditOutlined, DeleteOutlined, ReloadOutlined,
} from '@ant-design/icons';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AssetList() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const nav = useNavigate();
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [dropdowns, setDropdowns] = useState({});
  const [filters, setFilters] = useState({ search: '', osType: undefined, serverStatus: undefined, location: undefined, eolStatus: undefined });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const canWrite = ['admin','asset_manager'].includes(user?.role);
  const isAdmin = user?.role === 'admin';

  async function load() {
    setLoading(true);
    try {
      const params = { page, pageSize, ...filters };
      const { data } = await api.get('/assets', { params });
      setData(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, pageSize, filters.osType, filters.serverStatus, filters.location, filters.eolStatus]); // eslint-disable-line
  useEffect(() => {
    api.get('/dropdowns').then(r => setDropdowns(r.data.grouped || {}));
  }, []);

  function onSearch() { setPage(1); load(); }

  async function onDelete(id) {
    await api.delete(`/assets/${id}`);
    message.success('Asset deleted');
    load();
  }

  async function onExport() {
    const params = new URLSearchParams(
      Object.entries(filters).filter(([_, v]) => v !== undefined && v !== '')
    ).toString();
    const res = await api.get(`/assets/export?${params}`, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url; a.download = 'assets-export.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  const ddOptions = (cat) => (dropdowns[cat] || []).map(d => ({ label: d.value, value: d.value }));

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>Asset Inventory</Typography.Title>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>Refresh</Button>
          <Button icon={<DownloadOutlined />} onClick={onExport}>Export</Button>
          {canWrite && <Link to="/assets/import"><Button icon={<UploadOutlined />}>Import</Button></Link>}
          {canWrite && <Link to="/assets/new"><Button type="primary" icon={<PlusOutlined />}>Add Asset</Button></Link>}
        </Space>
      }
    >
      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Input prefix={<SearchOutlined />} placeholder="Search VM, hostname, IP, user, dept"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onPressEnter={onSearch} allowClear />
        </Col>
        <Col xs={12} md={4}>
          <Select allowClear placeholder="OS Type" style={{ width: '100%' }} value={filters.osType}
            onChange={(v) => setFilters({ ...filters, osType: v })} options={ddOptions('os_type')} />
        </Col>
        <Col xs={12} md={4}>
          <Select allowClear placeholder="Server Status" style={{ width: '100%' }} value={filters.serverStatus}
            onChange={(v) => setFilters({ ...filters, serverStatus: v })} options={ddOptions('server_status')} />
        </Col>
        <Col xs={12} md={4}>
          <Select allowClear placeholder="Location" style={{ width: '100%' }} value={filters.location}
            onChange={(v) => setFilters({ ...filters, location: v })} options={ddOptions('location')} />
        </Col>
        <Col xs={12} md={4}>
          <Select allowClear placeholder="EOL Status" style={{ width: '100%' }} value={filters.eolStatus}
            onChange={(v) => setFilters({ ...filters, eolStatus: v })} options={ddOptions('eol_status')} />
        </Col>
      </Row>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={data.items}
        pagination={{
          current: page, pageSize, total: data.total,
          showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          showTotal: (t) => `${t} assets`,
        }}
        scroll={{ x: 1200 }}
        columns={[
          { title: 'VM Name', dataIndex: 'vm_name', fixed: 'left', width: 160,
            render: (v, r) => <Link to={`/assets/${r.id}`}>{v}</Link> },
          { title: 'Hostname', dataIndex: 'os_hostname', width: 180 },
          { title: 'IP', dataIndex: 'ip_address', width: 130 },
          { title: 'OS', dataIndex: 'os_type', width: 110 },
          { title: 'OS Version', dataIndex: 'os_version', width: 150 },
          { title: 'Status', dataIndex: 'server_status', width: 120,
            render: v => v && <Tag color={v === 'Active' ? 'green' : v === 'Decommissioned' ? 'red' : 'orange'}>{v}</Tag> },
          { title: 'Location', dataIndex: 'location', width: 140 },
          { title: 'EOL', dataIndex: 'eol_status', width: 130,
            render: v => v && <Tag color={v === 'Supported' ? 'green' : v === 'EOL' ? 'red' : 'orange'}>{v}</Tag> },
          { title: 'Assigned User', dataIndex: 'assigned_user', width: 150 },
          { title: 'Department', dataIndex: 'department', width: 140 },
          { title: 'Tools', width: 130, render: (_, r) => (
            <Space size={4}>
              {r.manage_engine_installed && <Tag color="blue">ME</Tag>}
              {r.tenable_installed && <Tag color="purple">Tenable</Tag>}
              {r.idrac_enabled && <Tag color="cyan">iDRAC</Tag>}
            </Space>
          )},
          {
            title: 'Actions', fixed: 'right', width: 120, render: (_, r) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => nav(`/assets/${r.id}`)} />
                {isAdmin && (
                  <Popconfirm title="Delete this asset?" onConfirm={() => onDelete(r.id)}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                )}
              </Space>
            )
          },
        ]}
      />
    </Card>
  );
}
