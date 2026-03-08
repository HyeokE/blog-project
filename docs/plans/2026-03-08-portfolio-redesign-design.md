# Portfolio Redesign: Apple Senior Designer Perspective

**Date**: 2026-03-08
**Scope**: `/about` portfolio page full visual redesign
**Approach**: B+C Hybrid — Apple Store spatial calm + Keynote storytelling
**Identity**: Cloud Dancer (Pantone 2026) warmth preserved

---

## Decisions

| Question | Decision |
|----------|----------|
| Design tone | Apple Store space + Keynote storytelling, warm Cloud Dancer identity |
| Hero treatment | AirplaneWindow as protagonist, cinematic scroll transition |
| Data structure | Keep P/D/I as-is, no data.ts changes |
| Backgrounds | Subtle tonal alternation (brand-100 / background) |
| Scroll strategy | "The Cinematic Scroll" — Hero sticky + parallax, rest BlurFade inView |

---

## Section 1: Hero — "Leaving the Cabin"

**Emotion**: Contemplation to action. The airplane window recedes, the professional world emerges.

**Structure**: `min-h-[200vh]` + `sticky top-0 h-dvh`. AirplaneWindow centered.

**Scroll Timeline** (useSectionScroll):

| progress | AirplaneWindow | Headline | Text |
|----------|---------------|----------|------|
| 0.0–0.25 | Full size, centered | Hidden (opacity:0, scale:0.92) | Hidden |
| 0.25–0.5 | scale 1→0.8, opacity 1→0, y 0→-60px | opacity 0→1, scale 0.92→1 | Stagger appear (0.05s) |
| 0.5–0.7 | Gone | Final position, opacity 1 | All visible |
| 0.7–1.0 | — | opacity 1→0, y 0→-40px | Fade out together |

**Load animation**: AirplaneWindow only — `opacity 0→1, scale 0.9→1, 1.6s ease [0.16,1,0.3,1]`. Text appears via scroll only.

**Typography**:
- Eyebrow: `font-sans-home text-[11px] tracking-[0.3em] uppercase text-muted-foreground`
- Headline: `font-serif-home text-[clamp(2.5rem,7vw,6rem)] font-semibold italic leading-[1.06]`
- Name/Role: `text-sm tracking-[0.22em] uppercase text-muted-foreground`
- Summary: `text-lg md:text-xl leading-[1.8] text-foreground/80`

**Responsive**: AirplaneWindow centered on all sizes. Headline uses clamp() for fluid scaling.

**Reduced motion**: No parallax, no scale transforms. Simple opacity transitions only.

---

## Section 2: Selected Work — "The Gallery"

**Emotion**: Walking through an Apple Store. Each company has its own table. No rush.

**Background**: `bg-brand-100 dark:bg-[#1e1d1c]` with 80px gradient fade at section boundaries.

**Company Divider**: `scaleX 0→1`, `transform-origin: left`, `0.8s cubic-bezier(0.22,1,0.36,1)` — CSS + Intersection Observer.

**Project Card — "Glass Shelf"**:
```
Light:  bg-white/60  backdrop-blur-xl  border border-white/80
        shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]
Dark:   bg-white/5   backdrop-blur-xl  border border-white/10
        shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_4px_rgba(0,0,0,0.2),0_12px_32px_rgba(0,0,0,0.3)]
Hover:  translateY(-2px), deeper shadow, 300ms ease
```

**Card layout**: `lg:grid-cols-[1.1fr_0.9fr]` — left: overview, right: P/D/I glass panels.

**PDI blocks — "Nested Glass"**:
```
Light:  bg-background/60  border border-border/40  rounded-2xl
Dark:   bg-background/20  border border-white/5
```

**Motion sequence**:
| Element | Animation |
|---------|-----------|
| Section header | BlurFade inView, y:20, blur:8px, 0.6s |
| Divider line | scaleX 0→1, 0.8s |
| Company name | BlurFade inView, y:24, blur:10px, 0.6s |
| Company meta | BlurFade delay:0.1, y:12, 0.4s |
| Project cards | BlurFade inView, stagger 0.15s, y:30, blur:12px, 0.7s |

---

## Section 3: Principles — "Precision Numbers"

**Numbers**: `font-serif-home text-5xl lg:text-7xl font-extralight italic text-foreground/8`
**Cards**: `rounded-3xl bg-card/40 p-7`, top 2px accent line in `foreground/10`
**Grid**: `md:grid-cols-2 xl:grid-cols-4 gap-5`
**Hover**: `translateY(-4px)`, shadow expand, accent line `foreground/30`
**Background**: Default `background` (tonal contrast with Selected Work)

---

## Section 4: Contact — "The Invitation"

**Container**: `max-w-3xl`, padding `py-40 md:py-52`
**Top decoration**: Horizontal line expanding from center, `w-0→60% opacity-0→0.3`, inView trigger
**Headline**: `scale 0.96→1` + BlurFade — "breathing into view"
**Background**: `brand-100` (same tone as Selected Work)

---

## Section 5: Cross-cutting

**Scroll Progress Bar**: `fixed top-0 h-[2px] bg-foreground/20 z-50`, scaleX = scrollProgress, transform-origin: left

**Section transitions**: 80px gradient fade between tinted/untinted sections

**Easing standard**: `cubic-bezier(0.22, 1, 0.36, 1)` — matches home hero's spring feel

**Reduced motion**: All parallax/scale disabled. Opacity-only transitions. Content immediately visible.

---

## Files to Modify

| File | Scope |
|------|-------|
| `AboutPage.tsx` | Add ScrollProgressBar |
| `AboutPortfolioScene.tsx` | Section bg wrappers + gradient transitions |
| `AboutHeroSection.tsx` | Full rewrite: cinematic sticky hero |
| `SelectedWorkSection.tsx` | Glass cards, divider animation, motion refinement |
| `WorkPrinciplesSection.tsx` | Large numbers, accent lines, hover enhancement |
| `ContactSection.tsx` | Spacing, decoration line, scale entrance |
| `useSectionScroll.ts` | No changes |
| `data.ts` | No changes |
