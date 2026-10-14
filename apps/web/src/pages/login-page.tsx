import {
  ArrowRightOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { Link } from 'react-router-dom';
import { Brand } from '../components/brand';

export function LoginPage() {
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
            <SafetyCertificateOutlined /> 面向多租户的企业协作平台
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
          <h2>登录你的工作空间</h2>
          <p className="muted">使用企业邮箱，开启有序协作。</p>
          <Alert
            showIcon
            type="info"
            title="登录界面预览"
            description="认证尚未接通。请使用下方入口浏览工作台，输入内容不会发送到后端。"
          />
          <Form layout="vertical" requiredMark={false}>
            <Form.Item label="企业邮箱" name="email">
              <Input
                prefix={<MailOutlined />}
                placeholder="请输入企业邮箱"
                size="large"
                autoComplete="username"
              />
            </Form.Item>
            <Form.Item label="密码" name="password">
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button type="primary" size="large" block disabled>
              登录（认证开发中）
            </Button>
          </Form>
          <div className="preview-entry">
            <Link to="/">
              进入工作台预览 <ArrowRightOutlined />
            </Link>
            <span>无需账户 · 无业务数据</span>
          </div>
          <p className="login-footnote">第一阶段 · 基础工程与界面预览</p>
        </div>
      </section>
    </main>
  );
}
