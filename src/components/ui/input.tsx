import * as React from "react"
import { cn } from "cn"
import { ANALYTICS_ELEMENTS } from "@/constants/analytics"

/**
 * Craft text field. Geometry, type, border, focus ring and aria-invalid styling come from the
 * `[data-slot='input']` rules in src/app/craft/design-system.css (Craft is the only consumer of ui/),
 * shared with FieldTrigger and SelectTrigger so every field is 44px / 4px / 16px with one focus ring.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      data-analytics-label={ANALYTICS_ELEMENTS.TEXT_INPUT}
      className={cn("w-full min-w-0 outline-none", className)}
      {...props}
    />
  )
}

export { Input }
