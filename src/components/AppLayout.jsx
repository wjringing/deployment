import React, { useState } from 'react';
import { Layout, Menu, Dropdown, Button, Avatar, Space, Drawer } from 'antd';
import {
  MenuOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  DashboardOutlined,
  TeamOutlined,
  CalendarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  MessageOutlined,
  CoffeeOutlined,
  CalculatorOutlined,
  ApartmentOutlined,
  EnvironmentOutlined,
  SafetyOutlined,
  TrophyOutlined,
  BookOutlined,
  LinkOutlined,
  RobotOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const { Header, Content } = Layout;

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, isSuperAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const isSuperAdminUser = isSuperAdmin();

  // Navigation menu items
  const menuItems = [
    {
      key: 'deployment',
      label: 'Deployment',
      icon: <CalendarOutlined />,
      children: [
        { key: '/deployment', label: 'Manage Deployments', icon: <CalendarOutlined /> },
        { key: '/auto-assignment', label: 'Auto Assignment Rules', icon: <RobotOutlined /> },
        { key: '/fixed-closing', label: 'Fixed Closing Positions', icon: <ClockCircleOutlined /> },
      ],
    },
    {
      key: 'staff',
      label: 'Staff',
      icon: <TeamOutlined />,
      children: [
        { key: '/staff', label: 'Staff Management', icon: <TeamOutlined /> },
        { key: '/training', label: 'Training & Development', icon: <BookOutlined /> },
        { key: '/performance', label: 'Performance Scorecard', icon: <TrophyOutlined /> },
      ],
    },
    {
      key: 'operations',
      label: 'Operations',
      icon: <FileTextOutlined />,
      children: [
        { key: '/checklists', label: 'Checklists', icon: <CheckSquareOutlined /> },
        { key: '/handover', label: 'Handover Notes', icon: <MessageOutlined /> },
        { key: '/breaks', label: 'Break Scheduler', icon: <CoffeeOutlined /> },
      ],
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: <BarChartOutlined />,
      children: [
        { key: '/labor-sales', label: 'Labor & Sales Calculator', icon: <CalculatorOutlined /> },
        { key: '/sales', label: 'Sales Data', icon: <BarChartOutlined /> },
        { key: '/targets', label: 'Target Settings', icon: <BarChartOutlined /> },
      ],
    },
    {
      key: 'configuration',
      label: 'Configuration',
      icon: <SettingOutlined />,
      children: [
        { key: '/settings', label: 'System Settings', icon: <SettingOutlined /> },
        { key: '/stations', label: 'Station Mappings', icon: <EnvironmentOutlined /> },
        { key: '/rules', label: 'Assignment Rules', icon: <LinkOutlined /> },
        { key: '/position-relationships', label: 'Position Relationships', icon: <ApartmentOutlined /> },
        { key: '/schedule-upload', label: 'Upload Schedule', icon: <CalendarOutlined /> },
      ],
    },
  ];

  // Add admin menu items for super admins
  if (isSuperAdminUser) {
    menuItems.push({
      key: 'admin',
      label: 'Administration',
      icon: <SafetyOutlined />,
      children: [
        { key: '/admin/dashboard', label: 'Admin Dashboard', icon: <DashboardOutlined /> },
        { key: '/admin/users', label: 'User Management', icon: <UserOutlined /> },
        { key: '/admin/locations', label: 'Location Management', icon: <EnvironmentOutlined /> },
        { key: '/admin/regions', label: 'Regional Management', icon: <ApartmentOutlined /> },
        { key: '/admin/audit', label: 'Audit Logs', icon: <FileTextOutlined /> },
      ],
    });
  }

  const handleMenuClick = ({ key }) => {
    navigate(key);
    setMobileOpen(false);
  };

  const userMenu = (
    <Menu
      items={[
        {
          key: 'user-info',
          label: (
            <div className="px-2 py-1">
              <div className="font-semibold">{user?.email}</div>
              <div className="text-xs text-gray-500">
                {userProfile?.role || 'User'}
              </div>
            </div>
          ),
          disabled: true,
        },
        { type: 'divider' },
        {
          key: 'logout',
          label: 'Logout',
          icon: <LogoutOutlined />,
          onClick: handleLogout,
        },
      ]}
    />
  );

  // Find current selected keys
  const getCurrentSelectedKeys = () => {
    const path = location.pathname;
    return [path];
  };

  return (
    <Layout className="min-h-screen">
      <Header className="bg-white shadow-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate('/deployment')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-700 shadow-lg">
              <span className="text-xl font-bold text-white">K</span>
            </div>
            <span className="hidden sm:inline-block text-xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
              KFC Management
            </span>
          </div>

          {/* Desktop Navigation */}
          <Menu
            mode="horizontal"
            selectedKeys={getCurrentSelectedKeys()}
            items={menuItems}
            onClick={handleMenuClick}
            className="hidden lg:flex flex-1 border-0 bg-transparent"
            style={{ minWidth: 0, flex: 'auto' }}
          />
        </div>

        {/* Right side - User menu and mobile toggle */}
        <Space size="middle">
          <Dropdown overlay={userMenu} placement="bottomRight" trigger={['click']}>
            <Button type="text" className="flex items-center gap-2">
              <Avatar
                size="small"
                icon={<UserOutlined />}
                className="bg-gradient-to-br from-red-600 to-red-700"
              />
              <span className="hidden sm:inline">
                {user?.email?.split('@')[0]}
              </span>
            </Button>
          </Dropdown>

          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setMobileOpen(true)}
            className="lg:hidden"
          />
        </Space>
      </Header>

      {/* Mobile Drawer */}
      <Drawer
        title="Navigation"
        placement="right"
        onClose={() => setMobileOpen(false)}
        open={mobileOpen}
        width={280}
      >
        <Menu
          mode="inline"
          selectedKeys={getCurrentSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-0"
        />
      </Drawer>

      <Content className="p-4 md:p-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </Content>
    </Layout>
  );
};

export default AppLayout;
