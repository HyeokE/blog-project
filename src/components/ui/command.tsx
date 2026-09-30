"use client"

import * as React from "react"
import { cn } from "cn"
import { Command as CommandPrimitive } from "cmdk"
import { ANALYTICS_ELEMENTS } from "@/constants/analytics"

/** shadcn Command (cmdk). Craft look: `[data-slot^='command']` rules in design-system.css. */
function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

/** The search field is a Craft Input (same 44px field and focus ring) driven by cmdk. */
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper">
      <CommandPrimitive.Input
        data-slot="input"
        data-analytics-label={ANALYTICS_ELEMENTS.COMMAND_INPUT}
        className={cn("w-full min-w-0 outline-none", className)}
        {...props}
      />
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(className)}
      {...props}
    />
  )
}

function CommandEmpty({
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return <CommandPrimitive.Empty data-slot="command-empty" {...props} />
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      data-analytics-label={ANALYTICS_ELEMENTS.COMMAND_ITEM}
      className={cn(className)}
      {...props}
    />
  )
}

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
}
