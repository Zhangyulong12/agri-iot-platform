import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="not-found">
      <Result
        status="404"
        title="404"
        subTitle="你访问的页面不存在。"
        extra={
          <Link to="/">
            <Button type="primary">返回工作概览</Button>
          </Link>
        }
      />
    </div>
  );
}
