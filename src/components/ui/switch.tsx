import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A small on/off switch (hand-written — no Radix dep). Stops click propagation
 * so it works inside clickable rows. Controlled via `checked`/`onCheckedChange`.
 */
const Switch = React.forwardRef<
  HTMLButtonElement,
  {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
    "aria-label"?: string;
  }
>(({ checked, onCheckedChange, disabled, className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onCheckedChange(!checked);
    }}
    className={cn(
      "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      checked ? "bg-primary" : "bg-input",
      className,
    )}
    {...props}
  >
    <span
      className={cn(
        "pointer-events-none inline-block size-4 rounded-full bg-background shadow transition-transform",
        checked ? "translate-x-4" : "translate-x-0.5",
      )}
    />
  </button>
));
Switch.displayName = "Switch";

export { Switch };
