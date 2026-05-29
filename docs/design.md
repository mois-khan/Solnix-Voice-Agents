# UI / UX Design

> **Inspiration:** arrowhead.ai — dark, confident, voice-first. Dense with credibility but never cluttered.
> The product *is* the demo. Nothing on the page should compete with the "click and talk" moment.
> Every design decision below is made for one reason: to make a first-time visitor feel a real AI is talking to them within 5 seconds of landing.

---

## 1. Design Principles

1. **The mic CTA is the hero.** One click. No forms. No sign-up. No "learn more" trap. Visitors should be talking to an agent within 5 seconds of clicking.
2. **No chatbot tropes.** No chat bubbles as the primary surface. No generic gradient mesh. No "Powered by OpenAI" banner. No floating chat widget. The voice IS the product.
3. **Voice is visible at all times.** The orb must react to real audio amplitude — both the user's mic and the bot's TTS output. A static pulse is a disqualifying flaw. If the demo runs with audio muted, the orb animation should still visually communicate who is speaking.
4. **Persona-first navigation.** You pick *who* you're talking to before *what language*. This mirrors how a real caller would think: "I want to talk to the loan agent", not "I want to use Hindi mode".
5. **Indian-market polish.** Devanagari and Telugu script must render beautifully — correct line-height, correct Unicode font fallbacks, correct text wrapping. The language switcher should feel native to an Indian user, not an afterthought.
6. **One strong accent color.** Violet. Everything else is neutrals. The only exceptions are semantic colors (success green, warn yellow, danger red). No rainbow gradients, no teal-orange conflicts.

---

## 2. Design Language

### 2.1 Color Palette (Dark Theme — default)

All colors are defined as CSS custom properties in `globals.css` AND as Tailwind tokens in `tailwind.config.ts`. The Canvas orb reads them via `getComputedStyle`.

```css
/* globals.css */
:root {
  /* Backgrounds */
  --color-bg-base:      #0A0A0B;   /* near-black, slight warm tilt — page background */
  --color-bg-elevated:  #141416;   /* sidebar, nav, overlay backdrop */
  --color-bg-card:      #1C1C1F;   /* persona cards, transcript panel */
  --color-bg-card-hover:#222226;   /* card hover state */

  /* Borders */
  --color-border-subtle:#2A2A2E;   /* card borders, dividers */
  --color-border-accent:#7C5CFF44; /* selected card ring (violet, 27% opacity) */

  /* Text */
  --color-text-primary: #F5F5F7;   /* body text, headings */
  --color-text-secondary:#9A9AA0;  /* sub-labels, timestamps, muted copy */
  --color-text-tertiary: #6B6B72;  /* placeholder, disabled */

  /* Accent — the "voice" color */
  --color-accent:       #7C5CFF;   /* violet — orb base, CTA button, active pill */
  --color-accent-light: #A78BFA;   /* orb glow, hover states */
  --color-accent-dim:   #7C5CFF22; /* accent-tinted card backgrounds */

  /* Semantic */
  --color-success:      #34D399;   /* call active, booked state */
  --color-warn:         #FBBF24;   /* mic muted, approaching limit */
  --color-danger:       #F87171;   /* end call button */

  /* Orb gradients (used in Canvas fillStyle) */
  --orb-idle-1:   #7C5CFF;
  --orb-idle-2:   #A78BFA;
  --orb-user-1:   #06B6D4;
  --orb-user-2:   #3B82F6;
  --orb-agent-1:  #A78BFA;
  --orb-agent-2:  #F472B6;
}
```

```ts
// tailwind.config.ts — extend the theme, don't override
theme: {
  extend: {
    colors: {
      bg: {
        base:    'var(--color-bg-base)',
        elevated:'var(--color-bg-elevated)',
        card:    'var(--color-bg-card)',
      },
      border: {
        subtle: 'var(--color-border-subtle)',
        accent: 'var(--color-border-accent)',
      },
      text: {
        primary:   'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        tertiary:  'var(--color-text-tertiary)',
      },
      accent: {
        DEFAULT: 'var(--color-accent)',
        light:   'var(--color-accent-light)',
        dim:     'var(--color-accent-dim)',
      },
      success: 'var(--color-success)',
      warn:    'var(--color-warn)',
      danger:  'var(--color-danger)',
    },
  }
}
```

### 2.2 Typography

| Role | Font | Weight | Size token |
|---|---|---|---|
| Display headline | Geist Sans | 700 | `text-[64px]` desktop / `text-[40px]` mobile |
| Section heading | Geist Sans | 600 | `text-[32px]` |
| Card title | Geist Sans | 600 | `text-[18px]` |
| Body / UI | Geist Sans | 400–500 | `text-[16px]` |
| Label / pill | Geist Sans | 500 | `text-[12px]` |
| Transcript (Indic) | Noto Sans Devanagari / Noto Sans Telugu | 400 | `text-[16px]`, `leading-[1.8]` |
| Transcript (Latin) | Geist Mono | 400 | `text-[14px]` |
| Current agent line | Geist Sans + Indic fallback | 500 | `text-[20px]`, `leading-[1.7]` |

**Font loading in `layout.tsx`:**
```ts
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Noto_Sans_Devanagari, Noto_Sans_Telugu } from 'next/font/google'

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500'],
  variable: '--font-noto-devanagari',
})

const notoTelugu = Noto_Sans_Telugu({
  subsets: ['telugu'],
  weight: ['400', '500'],
  variable: '--font-noto-telugu',
})
```

The `TranscriptLine` component applies the Indic font chain when it detects Devanagari (`\u0900-\u097F`) or Telugu (`\u0C00-\u0C7F`) Unicode ranges in the text:

```ts
function needsIndicFont(text: string): boolean {
  return /[\u0900-\u097F\u0C00-\u0C7F]/.test(text)
}
```

### 2.3 Spacing & Radius

**4-point grid. All spacing in multiples of 4.**

```
Spacing tokens (Tailwind): 1=4px, 2=8px, 3=12px, 4=16px, 6=24px, 8=32px, 12=48px, 16=64px
```

**Border radius:**

| Element | Token | Value |
|---|---|---|
| Cards | `rounded-2xl` | 16px |
| Buttons (default) | `rounded-xl` | 12px |
| Language pills | `rounded-full` | 9999px |
| Orb container | `rounded-3xl` | 24px |
| Input fields | `rounded-lg` | 8px |

### 2.4 Elevation & Shadow

Cards use a double-layer shadow: a dark base shadow for depth, and a subtle violet inner glow on hover.

```ts
// Standard card
shadow: '0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)'

// Hovered / selected card
shadow: '0 1px 3px rgba(0,0,0,0.4), 0 4px 24px rgba(124,92,255,0.15), inset 0 0 0 1px rgba(124,92,255,0.2)'
```

### 2.5 Motion Spec

| Motion | Easing | Duration | Notes |
|---|---|---|---|
| Page section entrance | `cubic-bezier(0.16, 1, 0.3, 1)` | 500ms | `useInView` trigger on scroll |
| Call overlay open/close | `cubic-bezier(0.16, 1, 0.3, 1)` | 400ms | `AnimatePresence` + `y: 20 → 0` + `opacity: 0 → 1` |
| Persona card hover tilt | Spring: `stiffness: 300, damping: 20` | — | `rotateX: ±1.5°`, `rotateY: ±1.5°` on cursor position |
| Language pill switch | `ease-out` | 200ms | Background color + scale 0.95 → 1 |
| Orb amplitude | `requestAnimationFrame` | — | 60fps Canvas, no easing — raw amplitude |
| Orb idle pulse | Sinusoidal `Math.sin(Date.now() * 0.001)` | — | ~4s period, ±8px radius oscillation |
| Transcript line appear | `ease-out` | 300ms | `y: 8 → 0` + `opacity: 0 → 1` |
| `prefers-reduced-motion` | — | — | Disable all transforms. Orb: static gradient + `opacity` oscillation only. |

---

## 3. Page Structure

### 3.1 Landing Page — Sections in Order

```
┌──────────────────────────────────────────────────────────────────┐
│  NAV  (sticky, blurred backdrop on scroll)                        │  h: 64px
│  Logo  ·  Personas  ·  How it works  ·  Tech  ·  GitHub          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  HERO  (100vh, flex, desktop: row, mobile: column)               │
│                                                                  │
│   ┌──────────────────────┐   Talk to an AI voice agent.          │
│   │                      │   Live. In your language.             │
│   │   VoiceOrb (400px)   │                                       │
│   │   idle — slow        │   Three personas. Hindi. Telugu.      │
│   │   ambient violet     │   English. Powered by Sarvam + Gemini │
│   │   pulse              │                                       │
│   │                      │   [ ▶ Start a call ↓ ]  ← scroll CTA │
│   └──────────────────────┘                                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  PERSONA PICKER  (id="personas")                                 │
│                                                                  │
│  "Pick someone to talk to"  ← section heading                    │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  [Avatar]    │  │  [Avatar]    │  │  [Avatar]    │           │
│  │  Priya       │  │  Arjun       │  │  Meera       │           │
│  │  Loan        │  │  Insurance   │  │  Appointment │           │
│  │  Recovery    │  │  Renewal     │  │  Booking     │           │
│  │              │  │              │  │              │           │
│  │  [EN] [हि]   │  │  [EN][हि][తె]│  │  [EN][हि][తె]│           │
│  │              │  │              │  │              │           │
│  │  [ Talk → ]  │  │  [ Talk → ]  │  │  [ Talk → ]  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  HOW IT WORKS  (id="how-it-works")                               │
│                                                                  │
│  "How it works"                                                  │
│                                                                  │
│  ①  Pick your agent        ②  Speak naturally         ③  AI responds  │
│  Choose a persona          In English, Hindi,          In real time,   │
│  that fits your use case.  or Telugu — or              under 1.5s.     │
│                            switch mid-call.             Tools included. │
│                                                                  │
│  [SVG icon]                [SVG icon]                  [SVG icon]       │
│                                                                  │
│  (Each step animates in on scroll with a 150ms stagger)          │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  BUILT WITH  (id="tech")                                         │
│  "Built with the best infrastructure for Indian voice AI"        │
│                                                                  │
│  [Sarvam logo]  [Gemini logo]  [FastAPI logo]  [Next.js logo]   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  FOOTER                                                          │
│  SolnixMedia · POC · contact@solnixmedia.com                     │
│  Subtle: "Response times may vary. This is a proof of concept."  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Call Overlay — Full-screen, `fixed inset-0`, `z-50`

```
┌──────────────────────────────────────────────────────────────────┐
│  HEADER                                                    h:64px│
│  ← back   Priya · Loan Recovery    ● Live   [EN][हि]   ✕         │
│           (persona name + role)                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                                                                  │
│                    ╭─────────────────╮                           │
│                    │                 │                           │
│                    │   VoiceOrb      │   ← 300px, wired to       │
│                    │   (live audio   │     real amplitude        │
│                    │    amplitude)   │                           │
│                    │                 │                           │
│                    ╰─────────────────╯                           │
│                                                                  │
│         "नमस्ते, मैं प्रिया बोल रही हूँ…"                        │
│          ↑ latest agent line, text-xl, Indic font, centered      │
│                                                                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  TRANSCRIPT PANEL  (collapsible, slide-up on mobile)             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Priya   नमस्ते, मैं प्रिया बोल रही हूँ…          12:01 PM  │ │
│  │  You     हाँ बोलिए                                 12:01 PM  │ │
│  │  Priya   आपका EMI ₹12,500 overdue है…              12:02 PM  │ │
│  └─────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│  CALL CONTROLS                                             h:72px │
│          [ 🎤 Hold to speak ]    [ ⏹ End Call ]                  │
│          (Phase 2: auto VAD)     (danger-red)                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Specifications

### `VoiceOrb` — Canvas Component
```
Props:
  analyser:   AnalyserNode | null  — feeds amplitude data
  speaker:    'idle' | 'user' | 'agent'
  size:       number               — diameter in px (400 landing, 300 call overlay)

Canvas rendering (requestAnimationFrame loop):
  1. Get frequency data:  analyser.getByteFrequencyData(dataArray)
  2. Compute amplitude:   avg = dataArray.reduce() / dataArray.length (0–255)
  3. Map to radius:       r = size/2 * (0.55 + (amplitude/255) * 0.35)
  4. Draw radial gradient with persona-state colors (see §2.1 Orb gradients)
  5. Apply blur:          ctx.filter = `blur(${4 + amplitude/255 * 12}px)`
  6. Add outer glow:      ctx.shadowBlur = 30 + amplitude/255 * 40
                          ctx.shadowColor = accent color for current state

Idle state (no analyser or amplitude < 10):
  - Use Math.sin(Date.now() * 0.001) to drive size oscillation (±8px)
  - Period: ~6.3s (2π seconds)
  - Gradient: idle-1 → idle-2 (violet tones)

prefers-reduced-motion:
  - No requestAnimationFrame loop
  - Static gradient rendered once
  - CSS animation on wrapper div: opacity 0.7 → 1.0, 3s ease-in-out infinite alternate
```

### `PersonaCard`
```
Layout (vertical flex, p-6, gap-4):
  - Avatar: 80×80px, rounded-full, object-cover, border-2 border-border-subtle
  - Name: text-[18px] font-semibold text-text-primary
  - Role: text-[13px] text-text-secondary uppercase tracking-wide
  - Short blurb: text-[14px] text-text-secondary, max 2 lines (line-clamp-2)
  - Language pills row: flex gap-2 flex-wrap
  - CTA button: full width, accent background, 'Talk →'

States:
  - Default:  bg-bg-card border border-border-subtle
  - Hovered:  bg-bg-card-hover, inner glow shadow, 1.5° tilt (Framer Motion)
  - Selected: border-2 border-accent, bg-accent-dim, accent ring
  - Disabled (call active): opacity-40, cursor-not-allowed, tooltip "End your current call first"

Framer Motion whileHover:
  rotateX: cursor Y offset mapped to ±1.5°
  rotateY: cursor X offset mapped to ±1.5°
  transition: spring, stiffness 300, damping 20
```

### `LanguagePill`
```
Props: code ('en-IN' | 'hi-IN' | 'te-IN'), active: boolean, disabled: boolean

Display labels: { 'en-IN': 'EN', 'hi-IN': 'हि', 'te-IN': 'తె' }

Sizing: h-7 px-3 text-[12px] font-medium rounded-full

States:
  - Default:  bg-bg-elevated text-text-secondary border border-border-subtle
  - Active:   bg-accent text-white border-transparent
  - Disabled: opacity-30 cursor-not-allowed
```

### `TranscriptLine`
```
Props: speaker ('user' | 'agent'), text: string, timestamp: Date

Layout: flex gap-3, py-2
  Left:  Speaker label — 40px wide, text-[11px] uppercase tracking-wide
         'You' in text-text-tertiary
         Persona name in accent-light color
  Right: Text — flex-1, text-[14px], leading-relaxed
         Indic font if needsIndicFont(text) is true
         Timestamp — show on row hover, text-[11px] text-text-tertiary

Entrance animation: y: 8 → 0, opacity: 0 → 1, 300ms ease-out
```

### `CallControls`
```
Layout: fixed bottom-0, full-width, flex justify-center gap-4, py-4 pb-8
Background: gradient from transparent to bg-elevated (so transcript text fades under it)

Mic button (push-to-talk):
  - Rest:     bg-bg-card border border-border-subtle, icon: Mic, label "Hold to speak"
  - Active:   bg-accent border-transparent, icon: MicOff, scale: 1.05
  - Muted:    bg-warn/20 border-warn, icon: MicOff, label "Muted"
  Size: h-14 px-6 rounded-xl

End Call button:
  - Rest:     bg-danger/20 border border-danger text-danger
  - Hover:    bg-danger text-white
  Size: h-14 px-6 rounded-xl
  Icon: Square (stop), label "End Call"
```

### `MicPermissionPrompt`
```
Modal (shadcn Dialog, max-w-md, bg-bg-card):
  - Title: "Microphone access needed"
  - Body: "To talk to the agent, we need your microphone. No audio is stored."
  - Browser-specific instructions (detect via navigator.userAgent):
    Chrome:  "Click the lock icon (🔒) in the address bar → Site settings → Microphone → Allow"
    Firefox: "Click the shield icon in the address bar → Allow"
    Safari:  "Go to Safari → Settings for This Website → Microphone → Allow"
  - CTA: "Try again" button (re-triggers getUserMedia)
  - Secondary: "Learn more" link (MDN page on mic permissions)
```

### `LiveIndicator`
```
Inline flex, items-center, gap-1.5
Dot: 8×8px, rounded-full, bg-success
Pulse: CSS animation keyframes (scale 1 → 1.4 → 1, opacity 1 → 0 → 1, 1.5s infinite)
Label: "Live" text-[12px] text-success font-medium
```

---

## 5. Interaction Details That Matter

- **Persona switch mid-session:** Not allowed. If a call is active, cards show a tooltip "End your current call first" and are pointer-events-none. Never let state get into an ambiguous "which persona am I talking to" situation.
- **Language switch mid-session:** Allowed and demoed prominently. The pill switcher sends a WS `language_switch` message. On `language_switched` response: animate the active pill, insert a `[Language switched to Hindi]` divider line in the transcript. The bot's next utterance will be in the new language.
- **Push-to-talk UX:** The mic button is a hold button (mousedown / touchstart to start recording, mouseup / touchend to stop and send). Label changes to "Release to send" while held. This is Phase 1. Phase 2 replaces it with always-on VAD.
- **First load:** Orb is idle (slow ambient pulse). No audio autoplays. The "Start a call ↓" CTA scrolls to the persona picker. The orb in the hero is decorative until a call starts.
- **Bot takes > 3s:** The orb switches to 'thinking' state — slower, dimmer oscillation. No spinner. No loading bar. The transcript shows "…" after the last agent line.
- **WebSocket drops mid-call:** Show a "Reconnecting…" overlay on the orb (text centred inside the orb canvas). Attempt reconnect with 1s, 2s, 4s backoff. After 3 attempts, show "Connection lost" with a "Try again" button.
- **Audio decode fails:** Skip the chunk silently. Log to console. Never show the error to the user unless it happens 3+ times in a row, in which case show a warning toast.

---

## 6. Accessibility

- **Color contrast:** All text-primary on bg-base: `#F5F5F7` on `#0A0A0B` = 18.9:1. Text-secondary on bg-card: `#9A9AA0` on `#1C1C1F` = 4.7:1. Both exceed WCAG AA.
- **Keyboard navigation:** All persona cards are `<button>` elements. Call overlay traps focus when open (use `focus-trap-react` or shadcn Dialog's built-in trap). Tab order: header controls → orb (non-focusable) → transcript → mic button → end button.
- **Live transcript:** The transcript is visible by default in the call view — it serves as a real-time caption layer for deaf/HoH users. Never hide it behind a toggle that defaults to closed.
- **Reduced motion:** `prefers-reduced-motion` media query disables all Framer Motion transforms and switches the orb to the static gradient mode. Test explicitly in Chrome DevTools (Rendering → Emulate CSS media feature).
- **Screen reader:** `VoiceOrb` canvas has `aria-label="Voice activity visualizer"` and `role="img"`. Transcript lines are in a `<ul>` with `aria-live="polite"` so screen readers announce new lines as they appear.

---

## 7. Responsive Breakpoints

```
Mobile:  < 768px
Tablet:  768px – 1023px
Desktop: ≥ 1024px
```

| Element | Desktop | Tablet | Mobile |
|---|---|---|---|
| Hero layout | Row (orb left, text right) | Column (orb top, text below) | Column |
| Hero headline | 64px | 48px | 40px |
| Orb size (hero) | 400px | 320px | 260px |
| Persona picker | 3 cards in a row | 2-up grid | Single column |
| Call overlay orb | 300px | 260px | 200px |
| Transcript panel | Fixed height, scrollable | Fixed height | Slide-up Sheet (shadcn) |
| Call controls | Fixed bottom, centered | Same | Sticky bottom, full width |
| Nav links | All visible | "Personas · Tech · GitHub" only | Hamburger menu |

---

## 8. Assets to Produce

| Asset | Spec | Source |
|---|---|---|
| Priya avatar | 240×240px, PNG, transparent bg | AI-generated (consistent semi-realistic style). Warm, forward-facing, professional. Warm skin tones. |
| Arjun avatar | 240×240px, PNG, transparent bg | Same style/illustrator as Priya. Male, trustworthy. |
| Meera avatar | 240×240px, PNG, transparent bg | Same style. Female, warm, receptionist energy. |
| SolnixMedia logo | SVG, works on dark bg | Existing asset. |
| Sarvam logo | SVG | From Sarvam brand kit. |
| Gemini logo | SVG | From Google brand kit. |
| FastAPI logo | SVG | From FastAPI brand assets. |
| Next.js logo | SVG | From Vercel brand kit (wordmark + logomark both). |
| Favicon | 32×32 ICO + 180×180 PNG | The orb on dark background. Generate with a Canvas screenshot. |
| OG image | 1200×630 PNG | Orb centred on dark bg, "Solnix AI Voice Agents" headline, tech logos strip at bottom. |

**Avatar style brief for AI generation (use Midjourney or DALL-E 3):**
```
Prompt template:
"Professional headshot illustration of a [male/female] Indian [professional role],
semi-realistic digital art, warm neutral background replaced with pure transparent,
direct eye contact, confident expression, modern business casual clothing,
consistent lighting from the front, high detail face, no text, no watermark"

Run all three in the same session to ensure style consistency.
Upscale to 480px, then downsize to 240px for final output.
```

---

## 9. Copy & Microcopy

| Location | Copy |
|---|---|
| Hero headline | "Talk to an AI voice agent. In your language." |
| Hero sub-headline | "Three personas. Hindi. Telugu. English. Powered by Sarvam AI + Gemini." |
| Hero CTA | "Start a call ↓" |
| Persona section heading | "Pick someone to talk to" |
| How it works heading | "How it works" |
| Built with heading | "Built with the best infrastructure for Indian voice AI" |
| Mic button (rest) | "Hold to speak" |
| Mic button (active) | "Release to send" |
| End call button | "End Call" |
| MicPermissionPrompt title | "Microphone access needed" |
| MicPermissionPrompt body | "To talk to the agent, we need access to your microphone. No audio is stored or shared." |
| Reconnecting state | "Reconnecting…" |
| Connection failed | "Connection lost. Please try again." |
| Language divider in transcript | "[Switched to Hindi]" / "[Switched to Telugu]" / "[Switched to English]" |
| Footer disclaimer | "This is a proof of concept. Response times may vary." |