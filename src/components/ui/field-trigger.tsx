import * as React from "react"
import { cn } from "cn"
import { ChevronDownIcon } from "lucide-react"
import { ANALYTICS_ELEMENTS } from "@/constants/analytics"

/**
 * An input-looking button that opens a picker (calendar, list, combobox). Shares the Input field
 * styling (`[data-slot='field-trigger']` in design-system.css): 44px, radius 4, 16/400, muted
 * placeholder, a right-aligned vertically centred 16px icon and the same focus / aria-invalid states.
 */
function FieldTrigger({
  className,
  value,
  placeholder,
  icon,
  valueId,
  type = "button",
  ...props
}: Omit<React.ComponentProps<"button">, "value" | "children"> & {
  /** Visible value; when empty the placeholder renders in the muted colour. */
  value?: React.ReactNode
  placeholder: string
  /** Trailing icon; defaults to a chevron. */
  icon?: React.ReactNode
  /** id for the value span, for aria-labelledby compositions. */
  valueId?: string
}) {
  const empty = value === undefined || value === null || value === ""
  return (
    <button
      type={type}
      data-analytics-label={ANALYTICS_ELEMENTS.FIELD_TRIGGER}
      className={cn("outline-none", className)}
      {...props}
      // After the spread: a Radix `asChild` trigger (PopoverTrigger) passes its own data-slot through props.
      data-slot="field-trigger"
      data-placeholder={empty ? "" : undefined}
    >
      <span data-slot="field-trigger-value" id={valueId}>{empty ? placeholder : value}</span>
      {icon ?? <ChevronDownIcon aria-hidden="true" />}
    </button>
  )
}

export { FieldTrigger }
