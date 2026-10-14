import { Alert, Card, Empty, Tag } from 'antd';
import { PageHeading } from '../components/page-heading';

const content = {
  tickets: {
    title: '工单管理',
    description: '统一跟踪工单的创建、分配、处理与关闭。',
    next: '后续将支持工单创建、状态流转、评论、筛选与分页。',
  },
  members: {
    title: '企业成员',
    description: '管理企业成员，建立清晰的团队协作关系。',
    next: '后续将支持组织创建、成员邀请与 OWNER、ADMIN、AGENT、MEMBER 角色管理。',
  },
  settings: {
    title: '系统设置',
    description: '配置企业工作空间与平台偏好。',
    next: '后续将支持企业信息、角色权限与操作审计。所有权限由后端强制校验。',
  },
};

export function PlaceholderPage({ module }: { module: keyof typeof content }) {
  const page = content[module];
  return (
    <>
      <PageHeading
        title={page.title}
        description={page.description}
        action={<Tag color="blue">开发中</Tag>}
      />
      <Card className="placeholder-card">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <>
              <h2>{page.title}正在开发中</h2>
              <p>{page.next}</p>
            </>
          }
        />
        <Alert
          type="info"
          showIcon
          title="第一阶段只提供页面入口"
          description="当前尚未实现业务接口，没有工单、成员或企业配置数据。"
        />
      </Card>
    </>
  );
}
