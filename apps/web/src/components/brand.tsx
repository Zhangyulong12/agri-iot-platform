export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="FlowDesk">
      <span className="brand-mark" aria-hidden="true">
        F
      </span>
      {!compact && (
        <span className="brand-name">
          FlowDesk<span className="brand-caption">企业服务工作台</span>
        </span>
      )}
    </div>
  );
}
