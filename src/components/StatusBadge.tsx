import type * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { watchDisplay, type Tone } from '@/lib/format';
import type { WatchState } from '@/api/schemas';

const toneToVariant: Record<Tone, React.ComponentProps<typeof Badge>['variant']> = {
  default: 'secondary',
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  muted: 'muted',
};

const toneToDot: Record<Tone, string> = {
  default: 'bg-foreground/50',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
};

/**
 * A watch's status from its REST `active` flag plus any live SSE state. REST
 * only knows active/paused; the connection detail arrives over the stream.
 */
export function StatusBadge({
  active,
  liveState,
}: {
  active: boolean;
  liveState?: WatchState;
}) {
  const { label, tone, pulse } = watchDisplay(active, liveState);
  return (
    <Badge variant={toneToVariant[tone]} className="gap-1.5">
      <span className="relative flex size-2">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              toneToDot[tone],
            )}
          />
        )}
        <span className={cn('relative inline-flex size-2 rounded-full', toneToDot[tone])} />
      </span>
      {label}
    </Badge>
  );
}
