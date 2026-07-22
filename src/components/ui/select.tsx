import * as React from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A native `<select>` styled to match {@link Input}. Native (not a Radix
 * popover) keeps the bundle dep-free and gives free mobile/native keyboard
 * behaviour — enough for the onboarding mailbox picker.
 *
 * `loading` swaps the chevron for a spinner while the options are being fetched,
 * without disabling the field — a single-option list stays clickable so it's
 * clear it's a working picker, not a frozen one.
 */
const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select"> & { loading?: boolean }
>(({ className, children, loading, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    {loading ? (
      <Loader2 className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
    ) : (
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    )}
  </div>
));
Select.displayName = "Select";

export { Select };
