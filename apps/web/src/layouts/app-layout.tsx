import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Avatar, Breadcrumb, Button, Drawer, Grid, Layout, Menu, Tag } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/brand';
import { useLayoutStore } from '../stores/layout-store';

const navigation = [
  { key: '/', icon: <AppstoreOutlined />, label: '工作概览' },
  { key: '/tickets', icon: <FileTextOutlined />, label: '工单管理' },
  { key: '/members', icon: <TeamOutlined />, label: '企业成员' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const narrow = !screens.lg;
  const { collapsed, mobileMenuOpen, toggleCollapsed, setMobileMenuOpen } = useLayoutStore();
  const current = navigation.find((item) => item.key === location.pathname);
  const menu = (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={navigation}
      onClick={({ key }) => {
        void navigate(key);
        setMobileMenuOpen(false);
      }}
    />
  );

  return (
    <Layout className="app-shell">
      {!narrow && (
        <Layout.Sider
          width={244}
          collapsedWidth={80}
          collapsed={collapsed}
          theme="light"
          className="sidebar"
        >
          <Brand compact={collapsed} />
          {!collapsed && (
            <div className="workspace-label">
              工作空间 <Tag color="blue">预览</Tag>
            </div>
          )}
          {menu}
          <div className="sidebar-footer">
            {collapsed ? (
              '01'
            ) : (
              <>
                <span className="status-dot" />
                第一阶段 · 基础工程
              </>
            )}
          </div>
        </Layout.Sider>
      )}
      <Drawer
        title={<Brand />}
        placement="left"
        open={narrow && mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        size={280}
      >
        {menu}
      </Drawer>
      <Layout>
        <Layout.Header className="topbar">
          <div className="topbar-start">
            <Button
              type="text"
              aria-label={narrow ? '打开导航菜单' : '切换侧栏'}
              icon={collapsed || narrow ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => (narrow ? setMobileMenuOpen(true) : toggleCollapsed())}
            />
            <Breadcrumb items={[{ title: '工作空间' }, { title: current?.label ?? '页面' }]} />
          </div>
          <div className="topbar-end">
            <Tag className="preview-tag">界面预览 · 未认证</Tag>
            <Avatar style={{ background: '#eaf0ff', color: '#155eef' }} icon={<TeamOutlined />} />
            <Link to="/login" className="login-link">
              登录页面 <ArrowLeftOutlined />
            </Link>
          </div>
        </Layout.Header>
        <Layout.Content className="main-content">
          <Outlet />
        </Layout.Content>
        <Layout.Footer className="app-footer">
          <span>FlowDesk · 让服务协作更有序</span>
          <span>基础工程 / v0.1.0</span>
        </Layout.Footer>
      </Layout>
    </Layout>
  );
}
