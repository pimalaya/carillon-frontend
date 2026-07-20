import type * as React from 'react';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

interface CopyButtonProps {
  value: string;
  label?: string;
  size?: React.ComponentProps<typeof Button>['size'];
  variant?: React.ComponentProps<typeof Button>['variant'];
}

export function CopyButton({ value, label, size = 'icon', variant = 'ghost' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label ? `${label} copied` : 'Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  }

  return (
    <Button type="button" size={size} variant={variant} onClick={onCopy} aria-label="Copy">
      {copied ? <Check className="text-success" /> : <Copy />}
      {size !== 'icon' && (label ?? 'Copy')}
    </Button>
  );
}
