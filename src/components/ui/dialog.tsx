"use client"

import * as React from "react"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { Button } from "@/components/ui/button"

import "./dialog-sheet.css"
import { releaseSheet, sheetDragFrame } from "./sheet-gesture.mjs"
import { FloatingLayerContext } from "./layer"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

const SHEET_QUERY = "(max-width: 640px)"
const INTERACTIVE = "button,a,input,textarea,select,label,[role=combobox],[role=button],[contenteditable=true]"

// Native-style detents for the mobile sheet: drag the grab bar or header to expand, collapse or dismiss.
// Only the top zone listens, so inner scrolling, inputs and popovers keep their own gestures.
/**
 * iOS Safari (and Android with resizes-visual) keep the layout viewport when the on-screen keyboard opens, so a
 * sheet pinned to `bottom: 0` ends up behind the keyboard. Track the visual viewport and expose how much of the
 * layout viewport the keyboard covers (--sheet-keyboard) and the visible height (--sheet-visible-height);
 * dialog-sheet.css lifts and shortens the sheet with them. The focused field is then scrolled into view.
 */
function useSheetKeyboard(contentRef: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  React.useEffect(() => {
    const viewport = typeof window === "undefined" ? null : window.visualViewport
    if (!enabled || !viewport) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const sheet = contentRef.current
        if (!sheet) return
        const covered = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop))
        sheet.style.setProperty("--sheet-keyboard", `${covered}px`)
        sheet.style.setProperty("--sheet-visible-height", `${Math.round(viewport.height)}px`)
        // Under ~80px is browser chrome (toolbar collapse), not a keyboard.
        if (covered > 80) sheet.dataset.sheetKeyboard = "true"
        else delete sheet.dataset.sheetKeyboard
        const active = document.activeElement
        if (covered > 80 && active instanceof HTMLElement && sheet.contains(active)) active.scrollIntoView({ block: "nearest" })
      })
    }
    const onFocusIn = () => window.setTimeout(update, 300)
    update()
    viewport.addEventListener("resize", update)
    viewport.addEventListener("scroll", update)
    document.addEventListener("focusin", onFocusIn)
    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener("resize", update)
      viewport.removeEventListener("scroll", update)
      document.removeEventListener("focusin", onFocusIn)
    }
  }, [contentRef, enabled])
}

function useSheetDrag(enabled: boolean) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const drag = React.useRef<{ id: number; y: number; t: number; lastY: number; lastT: number; height: number; max: number } | null>(null)

  const onPointerDown = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const sheet = contentRef.current
    const target = event.target as Element
    if (!enabled || !sheet || event.button !== 0 || !window.matchMedia(SHEET_QUERY).matches) return
    if (!target.closest("[data-slot='dialog-sheet-handle'],[data-slot='dialog-header']") || target.closest(INTERACTIVE)) return
    const max = Math.round(window.innerHeight - 12)
    drag.current = { id: event.pointerId, y: event.clientY, t: event.timeStamp, lastY: event.clientY, lastT: event.timeStamp, height: sheet.getBoundingClientRect().height, max }
    try { sheet.setPointerCapture(event.pointerId) } catch { /* capture is best-effort; moves still arrive via bubbling */ }
    sheet.dataset.sheetDragging = "true"
  }, [enabled])

  const onPointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current, sheet = contentRef.current
    if (!state || !sheet || state.id !== event.pointerId) return
    const frame = sheetDragFrame({ dy: event.clientY - state.y, startHeight: state.height, maxHeight: state.max })
    sheet.style.transform = frame.translate ? `translateY(${frame.translate}px)` : ""
    sheet.style.height = frame.height !== state.height ? `${frame.height}px` : ""
    if (frame.height !== state.height) sheet.style.maxHeight = "none"
    state.lastY = event.clientY; state.lastT = event.timeStamp
  }, [])

  const onPointerEnd = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current, sheet = contentRef.current
    if (!state || !sheet || state.id !== event.pointerId) return
    drag.current = null
    delete sheet.dataset.sheetDragging
    const dy = event.clientY - state.y
    const elapsed = Math.max(1, event.timeStamp - state.lastT)
    const velocity = event.timeStamp - state.lastT < 80 ? (event.clientY - state.lastY) / elapsed || dy / Math.max(1, event.timeStamp - state.t) : 0
    const expanded = sheet.dataset.sheetExpanded === "true"
    const decision = releaseSheet({ dy, velocity, expanded, height: state.height })
    sheet.style.height = ""; sheet.style.maxHeight = ""
    if (decision === "close") {
      sheet.dataset.sheetDismissed = "true"
      sheet.style.transform = "translateY(100%)"
      window.setTimeout(() => closeRef.current?.click(), 180)
      return
    }
    sheet.style.transform = ""
    if (decision === "expand") sheet.dataset.sheetExpanded = "true"
    if (decision === "collapse") delete sheet.dataset.sheetExpanded
  }, [])

  // A guarded close (e.g. busy) leaves the dialog open: bring the sheet back.
  React.useEffect(() => {
    const sheet = contentRef.current
    if (!sheet || !enabled) return
    const observer = new MutationObserver(() => {
      if (sheet.dataset.sheetDismissed && sheet.dataset.state === "open") {
        window.setTimeout(() => {
          if (sheet.dataset.state === "open") { delete sheet.dataset.sheetDismissed; sheet.style.transform = "" }
        }, 260)
      }
    })
    observer.observe(sheet, { attributes: true, attributeFilter: ["data-sheet-dismissed"] })
    return () => observer.disconnect()
  }, [enabled])

  return { contentRef, closeRef, handlers: enabled ? { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd } : {} }
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = "Close",
  mobilePresentation = "sheet",
  ref,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  /** Screen-reader name of the corner close button (localized by callers). */
  closeLabel?: string
  /** Below 640px: "sheet" anchors to the bottom edge (see dialog-sheet.css); "modal" keeps the centered dialog. */
  mobilePresentation?: "sheet" | "modal"
}) {
  const sheet = useSheetDrag(mobilePresentation === "sheet")
  useSheetKeyboard(sheet.contentRef, mobilePresentation === "sheet")
  // Controlled dialogs often have no DialogTrigger, and Radix then has nothing to refocus on close.
  // Remember the element that had focus when the dialog opened (focus has not moved yet) and return to it.
  const opener = React.useRef<HTMLElement | null>(null)
  const handleOpenAutoFocus = React.useCallback((event: Event) => {
    const active = document.activeElement
    opener.current = active instanceof HTMLElement && active !== document.body && !sheet.contentRef.current?.contains(active) ? active : null
    onOpenAutoFocus?.(event)
  }, [onOpenAutoFocus, sheet.contentRef])
  const handleCloseAutoFocus = React.useCallback((event: Event) => {
    onCloseAutoFocus?.(event)
    const target = opener.current
    opener.current = null
    if (event.defaultPrevented || !target?.isConnected) return
    event.preventDefault()
    target.focus()
  }, [onCloseAutoFocus])
  const setRef = React.useCallback((node: HTMLDivElement | null) => {
    sheet.contentRef.current = node
    if (typeof ref === "function") ref(node)
    else if (ref) ref.current = node
  }, [ref, sheet.contentRef])
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        data-mobile-presentation={mobilePresentation}
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
        {...props}
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
        {...sheet.handlers}
        ref={setRef}
      >
        {mobilePresentation === "sheet" && (
          <>
            <div data-slot="dialog-sheet-handle" aria-hidden="true" />
            <DialogPrimitive.Close ref={sheet.closeRef} tabIndex={-1} aria-hidden="true" hidden />
          </>
        )}
        {/* Popovers and selects opened from inside the dialog stack above it. */}
        <FloatingLayerContext.Provider value="dialog">{children}</FloatingLayerContext.Provider>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/*
 * One layout for every Craft dialog (look in src/app/craft/design-system.css):
 *   DialogHeader  — DialogTitle (20/600) + optional DialogDescription (14 muted), left-aligned, rule below.
 *   body          — any content between header and footer.
 *   DialogFooter  — rule above; children in order secondary → primary. Desktop: right-aligned row
 *                   (secondary left, primary right). Phones (sheet): the same row, buttons share the width.
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-row justify-end gap-2",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
