import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Breadcrumb, Space, Typography } from 'antd';
import {
  DashboardOutlined, DatabaseOutlined, PlusOutlined, UploadOutlined,
  AppstoreAddOutlined, AppstoreOutlined, UnorderedListOutlined,
  UserOutlined, TeamOutlined, FileSearchOutlined,
  SettingOutlined, LogoutOutlined, HistoryOutlined, TagsOutlined,
  GlobalOutlined, BarChartOutlined, EyeOutlined, CloudServerOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client';

const { Sider, Header, Content } = Layout;

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [customPages, setCustomPages] = useState([]);

  useEffect(() => {
    api.get('/custom-pages').then(r => setCustomPages(r.data.items || [])).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';
  const canWrite = ['admin', 'asset_manager'].includes(user?.role);

  const items = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">Dashboard</Link> },
    {
      key: 'assets', icon: <DatabaseOutlined />, label: 'Assets',
      children: [
        { key: '/assets', label: <Link to="/assets">All Assets</Link> },
        canWrite && { key: '/assets/new', icon: <PlusOutlined />, label: <Link to="/assets/new">Add Asset</Link> },
        canWrite && { key: '/assets/import', icon: <UploadOutlined />, label: <Link to="/assets/import">Import</Link> },
      ].filter(Boolean),
    },
    {
      key: 'beijing-assets', icon: <GlobalOutlined />, label: 'Beijing Assets',
      children: [
        { key: '/beijing-assets', label: <Link to="/beijing-assets">All Assets</Link> },
        canWrite && { key: '/beijing-assets/new', icon: <PlusOutlined />, label: <Link to="/beijing-assets/new">Add Asset</Link> },
        canWrite && { key: '/beijing-assets/import', icon: <UploadOutlined />, label: <Link to="/beijing-assets/import">Import</Link> },
      ].filter(Boolean),
    },
    {
      key: 'ext-assets', icon: <CloudServerOutlined />, label: 'Ext. Assets',
      children: [
        { key: '/ext-assets', label: <Link to="/ext-assets">All Assets</Link> },
        canWrite && { key: '/ext-assets/new', icon: <PlusOutlined />, label: <Link to="/ext-assets/new">Add Asset</Link> },
        canWrite && { key: '/ext-assets/import', icon: <UploadOutlined />, label: <Link to="/ext-assets/import">Import</Link> },
      ].filter(Boolean),
    },
    ...customPages.map((p) => ({
      key: `custom-${p.slug}`,
      icon: <AppstoreOutlined />,
      label: p.name,
      children: [
        { key: `/custom-pages/${p.slug}`, icon: <UnorderedListOutlined />, label: <Link to={`/custom-pages/${p.slug}`}>All Records</Link> },
        canWrite && { key: `/custom-pages/${p.slug}/new`, icon: <PlusOutlined />, label: <Link to={`/custom-pages/${p.slug}/new`}>Add Record</Link> },
        canWrite && { key: `/custom-pages/${p.slug}/import`, icon: <UploadOutlined />, label: <Link to={`/custom-pages/${p.slug}/import`}>Import</Link> },
      ].filter(Boolean),
    })),
    { key: '/reports', icon: <BarChartOutlined />, label: <Link to="/reports">Report Builder</Link> },
    isAdmin && {
      key: 'admin', icon: <SettingOutlined />, label: 'Administration',
      children: [
        { key: '/admin/users', icon: <TeamOutlined />, label: <Link to="/admin/users">Users</Link> },
        { key: '/admin/dropdowns', icon: <SettingOutlined />, label: <Link to="/admin/dropdowns">Dropdowns</Link> },
        { key: '/admin/tag-ranges', icon: <TagsOutlined />, label: <Link to="/admin/tag-ranges">Tag Ranges</Link> },
        { key: '/admin/custom-pages', icon: <AppstoreAddOutlined />, label: <Link to="/admin/custom-pages">Custom Pages</Link> },
        { key: '/admin/field-visibility', icon: <EyeOutlined />, label: <Link to="/admin/field-visibility">Field Customization</Link> },
        { key: '/admin/imports', icon: <HistoryOutlined />, label: <Link to="/admin/imports">Import History</Link> },
        { key: '/admin/audit', icon: <FileSearchOutlined />, label: <Link to="/admin/audit">Audit Log</Link> },
      ],
    },
  ].filter(Boolean);

  const crumbs = loc.pathname.split('/').filter(Boolean).map((seg, i, arr) => ({
    title: <Link to={'/' + arr.slice(0, i + 1).join('/')}>{seg.replace(/-/g,' ').replace(/^./, c => c.toUpperCase())}</Link>,
  }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} breakpoint="lg" collapsedWidth={64} theme="dark">
        <div className="logo-title">INVENTORY · IT</div>
        <Menu
          key={`menu-${customPages.length}`}
          theme="dark"
          mode="inline"
          selectedKeys={[loc.pathname]}
          defaultOpenKeys={['assets', 'beijing-assets', 'ext-assets', 'admin', ...customPages.map(p => `custom-${p.slug}`)]}
          items={items}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <Breadcrumb items={[{ title: <Link to="/">Home</Link> }, ...crumbs]} />
          <Space>
            <Typography.Text type="secondary">{user?.role?.replace('_',' ')}</Typography.Text>
            <Dropdown
              menu={{
                items: [
                  { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', onClick: () => { logout(); nav('/login'); } },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                {user?.fullName}
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="page-shell">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
