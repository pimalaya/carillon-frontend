import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/CopyButton';
import { cn } from '@/lib/utils';

interface SecretFieldProps {
  /** Non-secret hint of the signing secret (the full value is shown once). */
  value: string;
  onRotate?: () => void;
  rotating?: boolean;
  className?: string;
}

/**
 * Displays a webhook signing secret. The server only ever returns a hint after
 * creation; rotating mints a new one with overlap so receivers can migrate.
 * (D§4, ROADMAP M3)
 */
export function SecretField({ value, onRotate, rotating, className }: SecretFieldProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <code className="flex h-9 flex-1 items-center rounded-md border bg-muted/40 px-3 font-mono text-sm">
        {value}
      </code>
      <CopyButton value={value} label="Secret" variant="outline" />
      {onRotate && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRotate}
          disabled={rotating}
        >
          <RefreshCw className={cn(rotating && 'animate-spin')} />
          Rotate
        </Button>
      )}
    </div>
  );
}
