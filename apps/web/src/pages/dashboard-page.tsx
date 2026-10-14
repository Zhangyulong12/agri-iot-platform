import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Progress, Space, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { getHealth, getReadiness } from '../api/health';
import { PageHeading } from '../components/page-heading';

const modules = [
  {
    icon: <FileTextOutlined />,
    name: '工单管理',
    description: '集中记录问题，让每一次服务都有迹可循。',
    path: '/tickets',
    step: '第三阶段',
  },
  {
    icon: <TeamOutlined />,
    name: '企业成员',
    description: '以企业为边界，组织成员与协作角色。',
    path: '/members',
    step: '第二阶段',
  },
  {
    icon: <SafetyCertificateOutlined />,
    name: '权限与设置',
    description: '构建可信的权限边界与企业配置。',
    path: '/settings',
    step: '第二阶段起',
  },
];

export function DashboardPage() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: ({ signal }) => getHealth(signal),
    retry: false,
    staleTime: 30000,
  });
  const readiness = useQuery({
    queryKey: ['readiness'],
    queryFn: ({ signal }) => getReadiness(signal),
    retry: false,
    staleTime: 30000,
  });
  const refreshing = health.isFetching || readiness.isFetching;
  return (
    <>
      <PageHeading
        title="工作概览"
        description="你的企业服务工作台，从这里开始。"
        action={
          <Button
            icon={<CloudServerOutlined />}
            loading={refreshing}
            onClick={() => {
              void health.refetch();
              void readiness.refetch();
            }}
          >
            检查服务
          </Button>
        }
      />
      <section className="welcome-panel">
        <div>
          <div className="eyebrow">FLOWDESK / WORKSPACE</div>
          <h2>
            把问题交给流程，
            <br />
            把专注留给团队。
          </h2>
          <p>
            面向企业的多租户工单管理平台。
            <br />
            基础工程已就位，业务能力将分阶段上线。
          </p>
          <Space>
            <Tag color="blue">第一阶段</Tag>
            <span className="welcome-note">工程基础与界面预览</span>
          </Space>
        </div>
        <div className="flow-visual" aria-hidden="true">
          <div className="flow-node">
            <FileTextOutlined />
            <span>记录问题</span>
          </div>
          <div className="flow-line" />
          <div className="flow-node active">
            <TeamOutlined />
            <span>协作处理</span>
          </div>
          <div className="flow-line" />
          <div className="flow-node">
            <CheckCircleOutlined />
            <span>完成闭环</span>
          </div>
        </div>
      </section>
      <Alert
        type="info"
        showIcon
        title="当前为开发预览，尚未接通身份认证"
        description="页面可自由浏览。工单、成员与权限功能正在开发中，当前没有业务统计数据。"
        className="phase-alert"
      />
      <div className="section-heading">
        <h2>工作空间</h2>
        <span>为服务协作建立清晰的秩序</span>
      </div>
      <div className="module-grid">
        {modules.map((module) => (
          <Card key={module.path} className="module-card">
            <div className="module-icon">{module.icon}</div>
            <Tag className="module-tag">开发中</Tag>
            <h3>{module.name}</h3>
            <p>{module.description}</p>
            <div className="module-footer">
              <span>{module.step}</span>
              <Link to={module.path}>
                查看模块 <ArrowRightOutlined />
              </Link>
            </div>
          </Card>
        ))}
      </div>
      <div className="overview-grid">
        <Card
          title="服务状态"
          extra={
            <Tag color={health.isSuccess ? 'success' : 'default'}>
              {health.isPending ? '检查中' : health.isSuccess ? 'API 已连接' : 'API 未连接'}
            </Tag>
          }
        >
          <div className="service-row">
            <span>REST API</span>
            <strong>
              {health.isPending ? '正在检查' : health.isSuccess ? '运行正常' : '连接失败'}
            </strong>
          </div>
          <div className="service-row">
            <span>PostgreSQL</span>
            <strong>
              {readiness.isPending ? '正在检查' : readiness.isSuccess ? '连接正常' : '未就绪'}
            </strong>
          </div>
          <div className="service-row">
            <span>身份认证</span>
            <Tag>尚未实现</Tag>
          </div>
          <p className="card-note">
            {health.isError
              ? '请启动后端并检查 API 代理地址，再点击“检查服务”。'
              : readiness.isError
                ? 'API 存活不代表数据库可用，请启动 PostgreSQL 并检查连接配置。'
                : '服务状态来自真实接口，数据库就绪检查会执行 SELECT 1。'}
          </p>
        </Card>
        <Card title="建设进度" extra={<span className="muted">阶段 1 / 5</span>}>
          <div className="progress-heading">
            <strong>基础工程与架构</strong>
            <Tag color="blue">当前阶段</Tag>
          </div>
          <Progress percent={20} showInfo={false} strokeColor="#155eef" />
          <p className="card-note">接下来：身份认证、企业组织与租户上下文。</p>
          <div className="milestone">
            <CheckCircleOutlined /> 页面布局与路由 <CheckCircleOutlined /> API 与数据模型基础
          </div>
        </Card>
      </div>
    </>
  );
}
