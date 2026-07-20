import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center',
        className,
      )}
    >
      {icon && <div className="mb-3 text-muted-foreground [&_svg]:size-8">{icon}</div>}
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
