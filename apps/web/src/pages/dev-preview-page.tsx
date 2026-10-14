import { Alert, Button, Card, Space } from 'antd';
import { Link } from 'react-router-dom';
import { Brand } from '../components/brand';
export function DevPreviewPage() {
  return (
    <main className="main-content">
      <Brand />
      <Alert
        type="warning"
        showIcon
        title="仅开发环境的无数据界面预览"
        description="此页面不建立登录会话，不请求业务数据。正式工作台和后端受保护接口仍需要认证。"
      />
      <Card title="工作空间预览" style={{ marginTop: 24 }}>
        <Space direction="vertical">
          <p>工单、企业成员和系统设置仍在开发中。</p>
          <Link to="/login">
            <Button type="primary">前往真实登录</Button>
          </Link>
        </Space>
      </Card>
    </main>
  );
}
