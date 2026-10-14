import {
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Brand } from '../components/brand';
import { authErrorMessage, login, register } from '../auth/session';
import { devPreviewEnabled } from '../auth/preview';
import { useAuthStore } from '../stores/auth-store';
import type { RegisterInput } from '../auth/types';

export function LoginPage({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const status = useAuthStore((state) => state.status);
  const isRegister = mode === 'register';
  const from = (location.state as { from?: string } | null)?.from;
  const destination =
    from && /^\/(?!\/)/.test(from) && !/^\/(login|register)/.test(from) ? from : '/';
  if (status === 'authenticated') return <Navigate to={destination} replace />;

  async function submit(values: RegisterInput) {
    setPending(true);
    setError('');
    try {
      if (isRegister) await register(values);
      else await login({ email: values.email, password: values.password });
      void navigate(destination, { replace: true });
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-story-copy">
          <div className="eyebrow">让服务协作更有序</div>
          <h1>
            每一个问题，
            <br />
            都值得被认真处理。
          </h1>
          <p>
            连接团队、规范流程、沉淀服务。
            <br />
            FlowDesk 为企业构建统一的工单工作空间。
          </p>
          <div className="login-feature">
            <SafetyCertificateOutlined /> 身份认证已接通 · 企业业务分阶段上线
          </div>
        </div>
        <span className="login-story-footer">FlowDesk / 企业服务管理</span>
      </section>
      <section className="login-form-panel">
        <div className="login-form-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <span className="eyebrow">欢迎使用 FLOWDESK</span>
          <h2>{isRegister ? '创建你的账户' : '登录你的工作空间'}</h2>
          <p className="muted">
            {isRegister
              ? '注册后即可登录，企业加入功能将在下一阶段提供。'
              : '使用邮箱和密码，继续你的工作。'}
          </p>
          {error && <Alert showIcon type="error" title={error} role="alert" />}
          <Form
            key={mode}
            layout="vertical"
            requiredMark={false}
            onFinish={(values: RegisterInput) => {
              void submit(values);
            }}
            disabled={pending}
          >
            {isRegister && (
              <Form.Item
                label="显示名称"
                name="displayName"
                rules={[
                  { required: true, whitespace: true, message: '请输入显示名称' },
                  { max: 80, message: '显示名称最多 80 字符' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入显示名称"
                  size="large"
                  autoComplete="nickname"
                  maxLength={80}
                />
              </Form.Item>
            )}
            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效邮箱' },
                { max: 254, message: '邮箱过长' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="请输入邮箱"
                size="large"
                autoComplete="username"
                maxLength={254}
              />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 12, message: '密码至少 12 字符' },
                { max: 128, message: '密码最多 128 字符' },
              ]}
              extra={
                isRegister ? '至少 12 字符，可使用空格与 Unicode。邮箱验证暂未提供。' : undefined
              }
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码（至少 12 字符）"
                size="large"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                maxLength={128}
              />
            </Form.Item>
            <Button type="primary" size="large" block htmlType="submit" loading={pending}>
              {isRegister ? '注册并登录' : '登录'}
            </Button>
          </Form>
          <div className="preview-entry">
            <Link to={isRegister ? '/login' : '/register'} state={location.state}>
              {isRegister ? '已有账户？前往登录' : '没有账户？创建账户'}
            </Link>
            {devPreviewEnabled && <Link to="/dev-preview">开发环境无数据预览</Link>}
          </div>
          <p className="login-footnote">第二阶段 2A · 身份认证</p>
        </div>
      </section>
    </main>
  );
}
