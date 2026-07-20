import type * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { eventMeta, type Tone } from '@/lib/format';
import type { DeliveryEvent } from '@/api/schemas';

const toneToVariant: Record<Tone, React.ComponentProps<typeof Badge>['variant']> = {
  default: 'secondary',
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  muted: 'muted',
};

export function EventBadge({ event }: { event: DeliveryEvent }) {
  const { label, tone } = eventMeta(event);
  return (
    <Badge variant={toneToVariant[tone]} className="font-normal">
      {label}
    </Badge>
  );
}
