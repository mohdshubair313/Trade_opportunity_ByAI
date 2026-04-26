# TradeInsight AI — Brand Identity Brief

> A design direction for the logotype, icon mark, and social share image.
> Written as working documentation, not a mood board. The goal is
> specificity — whoever executes this (a designer, Figma, or you at 2 AM)
> should finish with something that feels inevitable, not approximate.

---

## 0. Design philosophy — what we're actually selling

Before any pixel, clarify what the brand is trying to *feel like* versus what it literally *is*.

TradeInsight AI is a **research desk compressed into a sentence**. Its users — retail investors, MSME exporters, SME founders, consultants, ambitious students — are the ones generic AI tools talk down to. They want a tool that takes them seriously: typography-first, data-respectful, no emoji parades, no "Hey there! 👋 Let's analyze your sector! 🚀".

Three feelings the brand must carry, ranked:

1. **Earned confidence.** The look of a Bloomberg terminal operator who decided to open-source his workflow. Measured, unshowy, sharp.
2. **Grounded technology.** Modern — yes, AI — but the AI is an employee here, not the protagonist. The protagonist is the reader's decision.
3. **Quiet Indian-ness.** We serve Indian markets. But we reject the visual language of Indian retail fintech (aggressive saffrons, rupee-symbol logos, Bollywood gradients). Our Indian-ness is in the *tone* — sharp, direct, unsentimental — not the palette.

**Three feelings to reject, ranked:**

1. "Playful AI startup" — rounded icons, waving mascots, pastel gradients.
2. "Crypto bro fintech" — neon, cyberpunk lines, metallic chrome.
3. "Enterprise SaaS filler" — navy gradients, abstract cubes, handshake imagery.

We are closer in spirit to **Linear, Stripe, Ramp, Mercury, and Arc** than anything else. Premium restraint over flashy personality.

---

## 1. Logo — the wordmark

### 1.1 Decision: wordmark-led, not icon-led

For a product whose name is its identity (*TradeInsight* reads as two nouns colliding — action + understanding — which is the whole value prop), an icon would only weaken the name's work. Our primary brand mark is a custom-tuned **wordmark**. A paired icon exists as a companion (for favicons, social avatars, app tiles, and in-product chrome) but never tries to carry the brand on its own.

This is the Stripe / Notion / Mercury approach. It is **not** the Slack / Asana / Airbnb approach.

### 1.2 Wordmark concept — "Tradeinsight"

One word, lowercase, set as a custom-tuned geometric sans. The two halves of the name — *trade* and *insight* — are visually **flush but tonally distinct**. No space, no camelCase. The eye resolves it as one word, then on second glance separates it into two ideas. Like the word *overflow* or *nightfall* — two meanings welded by a craftsman.

#### 1.2.1 Typographic direction

- **Base typeface:** Inter (we already ship it on the site — keeps the brand's running text and its logo in the same family, which is the hallmark of serious design systems: Linear does it, Stripe does it, Vercel does it).
- **Weight:** 600 (Semibold). Not 700 — too shouty. Not 500 — too uncertain.
- **Tracking:** −0.02em (tightened, but not crushed). Inter's default is slightly loose for a logo context; tighten it to read as one object.
- **Case:** lowercase throughout. Capital-T would introduce aggression the brand doesn't need.
- **Baseline treatment:** the final **t** of *insight* is drawn with a crossbar that extends **~15% longer than default** to the right. This becomes the logo's quiet signature — a flourish you notice only after you've seen it twice. It evokes a chart's trend line extending past the data. Think of it as the product's "claim" that its analysis continues past what you see.

#### 1.2.2 The cut between *trade* and *insight*

This is the one piece of typographic drama we permit ourselves. There are three candidate treatments, ordered by my preference:

1. **The weight shift** *(preferred).* Set *trade* in Inter Regular (400) and *insight* in Inter Semibold (600). The reader's eye gets a rhythm: light → heavy, setup → payoff. Exactly what the product delivers. This is the closest Western analog to how Stripe distinguishes brand elements.

2. **The color shift.** Both halves at the same weight, but *insight* carries the primary emerald while *trade* stays foreground-white. Reads slightly more like a category filter than a logotype — ranks lower for brand uniqueness.

3. **The italic shift.** *trade* roman, *insight* in Instrument Serif italic. Maximum personality — and maximum risk. Use only in big hero contexts (website hero headlines, billboards), never as the primary wordmark.

**Decision: Option 1 for the primary mark.** Options 2 and 3 live in the extended system but do not replace the primary.

#### 1.2.3 The "AI" suffix

Many competitors bake "AI" into their wordmarks (Perplexity AI, Glean AI, Jasper AI) and it ages badly. In two years "AI" will feel like "cloud" does today — suffix pollution. We handle this by **not** making AI part of the wordmark. It appears only in the full product name ("TradeInsight AI") in long-form contexts, typeset as a monospace subordinate in `font-mono 11px uppercase tracking-[0.2em] text-muted-foreground`, set to the **right** of the wordmark, **baseline-aligned to the x-height** (not the cap line) so it sits visually inside the wordmark's optical weight. Think: Linear's version number badge, not a shouted "POWERED BY AI."

### 1.3 The icon mark — concept & construction

The companion icon needs to carry the brand when the wordmark won't fit. Favicons. Twitter/X avatars. App tiles. In-product toolbar icons. It must work at 16×16 and 512×512 with equal confidence.

#### 1.3.1 Concept: "The Insight Bracket"

Every TradeInsight report opens with cited sources — the `[N]` citation chip is already a visual motif in the product UI. The icon extends this. Picture a **left bracket `[` embracing a single ascending diagonal line** that represents a rising trend.

- The bracket is the *citation / research* half of the brand.
- The diagonal is the *market movement / insight* half.
- Together: **grounded insight**. The entire value proposition in one mark.

Conceptually, it's also a disguised **T** — the initial letter — if you squint. This is a visual Easter egg, never announced.

#### 1.3.2 Grid construction

- Drawn on a **24 × 24 base grid**, with the bracket occupying the left ~9 units and the diagonal occupying the right ~13 units.
- **Stroke weight:** 2.25 units at the base grid. This scales linearly: at 48×48 the stroke is 4.5px, at 16×16 optical hinting rounds to 1.5px (we ship a **separate 16×16 optimized asset** rather than letting the browser downsample — this is what gives Linear and Arc their crisp tab icons).
- **Corner geometry:** the bracket's two corners are mitred at **45°**, not rounded. Sharpness matters. Rounding would make it feel softer and friendlier than the brand's voice supports.
- **Terminus of the diagonal:** the upper-right tip ends in a **flat 90° cut perpendicular to the stroke** — not a cap. This produces the sensation of a chart line still rising past the visible frame. Same psychology as the crossbar of the wordmark's final *t*.

#### 1.3.3 Negative-space rule

The icon must never be placed on a colored container smaller than **1.5× its own height**. At close proximity to other logos or UI chrome, the mark needs **at least 8 units of clear space** (relative to the 24-unit grid) on all sides. This is the same breathing-room ratio Stripe uses. Violating it is the fastest way to make the icon feel amateur.

### 1.4 Color system

We inherit the app's existing color tokens — same palette, sharpened.

| Token | HSL | Hex | Role in the logo |
|---|---|---|---|
| **Foreground** | `0 0% 98%` | `#FAFAFA` | Wordmark primary |
| **Primary (deep emerald)** | `142.1 76.2% 36.3%` | `#15803D` | Icon fills + hierarchy accent |
| **Accent (living emerald)** | `142 71% 45%` | `#22C55E` | Reserved for interaction states and the OG image glow |
| **Background (near-black)** | `0 0% 3.9%` | `#0A0A0A` | Primary canvas |
| **Surface** | `0 0% 6%` | `#0F0F0F` | Card / chrome surfaces |

#### 1.4.1 The emerald-over-black decision

We do **not** use pure black (`#000000`). Pure black on modern OLED screens creates a hard visual edge where type looks slightly chromatic; `#0A0A0A` prevents this while still reading as "black" in ambient vision. Same decision Apple made for dark mode.

We do **not** use pure white for the wordmark. `#FAFAFA` has 2% softening which, against near-black, prevents the wordmark from vibrating at small sizes (a phenomenon called "simultaneous contrast" — two perfect-opposite values optically buzz).

These are small things. Small things compound.

#### 1.4.2 Mono-chrome variants

| Variant | Use |
|---|---|
| **Full color (emerald + white on dark)** | Primary — digital dark surfaces |
| **Single-color white** | On any dark photograph / video background |
| **Single-color black** | On light backgrounds (pricing PDFs, investor decks with white pages) |
| **Single-color emerald** | In-product chrome only — never for external brand assets |
| **Inverted (black on white)** | Print and press contexts |

**Never**: gradient fills inside the logotype itself. Gradient text on a logo is the "Comic Sans of 2025." Gradients live in backgrounds and UI accents, never in the mark.

### 1.5 Favicon strategy

- **16×16 and 32×32**: a *manually redrawn* reduction of the icon mark — not a down-scale. At these sizes, the bracket's corner mitre is replaced with a single pixel, and the diagonal's stroke collapses to 2px. Produced as a separate asset.
- **180×180** (Apple touch): icon mark centered on a rounded-square (22.5% corner radius, per Apple's 2019 shape) filled `#0A0A0A` with a 1px inner emerald stroke at 15% opacity. This replicates the app-tile look of native iOS apps.
- **192×192 and 512×512** (PWA / Android maskable): icon mark on `#0A0A0A` with **20% safe-zone padding** — Android's maskable specification crops aggressively, and without padding the diagonal's terminus gets chopped.

### 1.6 Proscriptions — what the logo must never do

- Never sit on a gradient background. It dilutes the optical rigor.
- Never tilt, rotate, or animate on entry. Static is a choice, not a limitation.
- Never appear smaller than **20px tall** (wordmark) or **16px** (icon). Below this, the tracking collapses and it reads as a bitmap.
- Never use emoji-adjacent rendering. If a mockup includes the logo, it is SVG or a rasterized export from SVG — never a screenshot of a Google Doc.
- Never appear with the social icons. The wordmark stands alone or pairs with the tagline, nothing else.

### 1.7 The tagline — when to use it

**Primary tagline:** "Market intelligence, written for you."

Use at three densities:

| Context | Typesetting |
|---|---|
| **Website hero** | Instrument Serif italic at display size, paired with the wordmark as set in §1.2 |
| **Product footer / email signature** | Inter Regular 14/20, tracking normal, below the wordmark with 16px gap |
| **Print / deck cover** | Inter Medium 18/24, with a 40% emerald underline on "written for you" |

Never use the tagline as a substitute for the wordmark. Never break it across lines unless the context forces it (email signature in Outlook mobile).

---

## 2. The OG image — your silent salesperson

Open Graph images are the single most under-designed asset in most startups' brand systems. They get more impressions than your entire website — every LinkedIn share, every Slack paste, every WhatsApp forward produces a rendered preview. Treat it accordingly.

### 2.1 Purpose and composition doctrine

The OG image has **two jobs**, in order:

1. **Make the reader stop scrolling.** They have about 1.2 seconds.
2. **Communicate what they'll find if they click.** Not a feature list — a feeling.

The composition therefore follows a **three-layer depth model** borrowed from editorial design:

- **Layer 1 (background):** establishes the atmosphere — deep, dark, emerald-lit.
- **Layer 2 (supporting):** a product-shape silhouette or abstract data ghost. Present but subordinate.
- **Layer 3 (foreground):** the headline + logo + one piece of proof.

Nothing sits on the same visual plane. The image reads in depth the same way a well-shot film frame does.

### 2.2 Canvas specifications

- **Dimensions:** 1200 × 630px (the LinkedIn/Facebook/WhatsApp/Discord safe default).
- **Twitter/X specific variant:** 1200 × 675px — same composition, 45px of extra vertical breathing room at the top and bottom split 60/40.
- **Safe zone:** keep all type and critical marks within a **1100 × 560px inner rectangle**. Platforms crop differently and the outer 50px is dangerous real estate.
- **Export:** PNG 24 (with transparent canvas NOT used — flatten to the background color). JPG at 90% is acceptable for size-sensitive contexts. WebP is the emerging standard; produce both.

### 2.3 The composition — "The Opening Line"

The OG is built to mirror the look of our website hero, but rethought for a still frame held to the eye for ~1 second.

#### 2.3.1 Layout

Landscape, **two-column implicit grid with a 60:40 split**.

- **Left column (60%):** headline + logo + tagline + one data chip.
- **Right column (40%):** a cropped, pulled-up *fragment* of a TradeInsight report card — just enough that the viewer recognizes "this is a real product, not a landing page."

The right column bleeds off the right edge of the canvas by approximately 24px. This is the **Apple Keynote trick** — a cropped element reads as a window into a larger world rather than a frame to decorate.

#### 2.3.2 Typography on the OG

- **Headline:** Instrument Serif Italic, 84px, color `#FAFAFA`, tracking −0.02em, line-height 1.04.
  **Default headline:** *"Market intelligence, written for you."* with *"written for you"* in `#22C55E` (living emerald). This matches the hero of the website — visual consistency across the funnel is worth far more than cleverness.
- **Kicker (above the headline):** Inter SemiBold 13px, tracking 0.2em, uppercase, color `#22C55E` at 70% opacity. Content: `TRADEINSIGHT · AI MARKET RESEARCH`.
- **Supporting line (below the headline):** Inter Regular 18/28, color `#FAFAFA` at 70% opacity. One sentence, max 90 characters. Example: *"Pick a sector. Get a cited, persona-tuned report in under fifteen seconds."*
- **Logo lockup:** wordmark at 32px cap-height, positioned in the lower-left, with 56px clear space from the canvas edges.
- **URL treatment:** lower-right, Inter Medium 14px `#FAFAFA` at 60% opacity: `tradeinsight.shubair.in`. This is the "caption" the reader reads last and remembers first.

#### 2.3.3 The visual anchor on the right

The report fragment on the right is **not** a screenshot. A screenshot at OG scale will always look fuzzy and cheap. Instead, we re-render the core elements of the results card as **vector illustration**:

- A rounded rectangle (16px radius, 420×520px, rotated −4° clockwise so it tilts slightly into the frame — just enough that the brain registers depth).
- Inside: a **"Pharmaceuticals"** sector header, one green sparkline trending up, a pull-quote citation chip `[3]` in emerald, and three horizontal prose lines (gray placeholder bars at 40%/70%/55% widths).
- The card sits atop a diffuse **emerald radial gradient** — a 600px circle at 20% opacity of `#22C55E`, centered behind the card's top third. This is the "halo" that makes the card float.

#### 2.3.4 Background treatment

- Base fill: `#0A0A0A` (the app's near-black).
- **Grid pattern overlay:** 72px × 72px faint grid at 4% foreground opacity, **masked** by a radial gradient so the grid fades out entirely in the corners. Same grid as the website hero. Consistency is the payload.
- **A single emerald wash** at the top-left, 45° angle, fading from `#22C55E` at 15% opacity to transparent at 60% of the canvas width. Think of it as a light source. Every convincing rendered image needs one.

#### 2.3.5 Micro-details that separate premium from generic

- A **1px hairline** at the very top edge of the canvas in emerald at 30% opacity. Reads as a "signal" frame.
- A **"LIVE" chip** inside the report card fragment — a 12px dot that appears to pulse. In a static image, you convey pulse by drawing a 2nd ghost ring around it at 40% opacity offset by 2px. The eye registers motion that isn't there.
- **Noise layer** at 3% opacity across the entire canvas. Flat digital black renders on displays as a sterile zone. A whisper of monochromatic noise gives it the same tactile warmth that analog photography has. This is the single biggest tell between a "designed" OG and a "templated" one.

### 2.4 Variants for different share contexts

| Variant | When | Difference |
|---|---|---|
| **Hero (default)** | Homepage share, general posts | As described above |
| **Compare feature** | "/compare" URL shares | Right-column card shows three sector cards stacked with opportunity/risk scores. Headline changes to: *"Rank sectors on opportunity. In seconds."* |
| **Report-specific** | Individual analysis report shares | Right-column shows the actual sector being shared. Generated dynamically. Requires an `/api/og?sector=...` endpoint (Next.js supports this via `@vercel/og`). |
| **Dark/light pair** | LinkedIn preview renders dark; some feeds render light | Produce a light-mode variant with `#FAFAFA` background, `#0A0A0A` type, emerald stays the same. |

### 2.5 The Next.js implementation hint

Vercel ships `@vercel/og` which renders React components to OG images at runtime. The OG image should be produced this way so it stays in sync with brand tokens — never as a hand-exported PNG that drifts from the design system over six months.

Route: `app/opengraph-image.tsx` for the default, `app/results/[sector]/opengraph-image.tsx` for the per-report dynamic version.

The headline prop, the sparkline shape, the LIVE chip — all of it ends up as JSX with Tailwind classes, compiled to a PNG on every request, cached at the edge. This is how Linear and Vercel do their share cards.

---

## 3. The extended system — how logo + OG connect to everything else

Brand is what remains after you remove the logo. If we stopped shipping the wordmark tomorrow, the typographic voice + color restraint + grid rhythm should still read as "TradeInsight" across any touchpoint.

### 3.1 Design tokens, codified

All of these already exist in `tailwind.config.ts` and `globals.css`. The brand work is documenting them so they stop being implicit:

```
Colors
  --bg        #0A0A0A
  --surface   #0F0F0F
  --fg        #FAFAFA
  --fg-muted  #A1A1A1
  --primary   #15803D  (deep emerald — structure)
  --accent    #22C55E  (living emerald — motion / interaction)
  --border    #262626

Typography
  --font-sans     Inter (400, 500, 600, 700, 800)
  --font-display  Instrument Serif (400, 400-italic)
  --font-mono     ui-monospace fallback stack

Scale
  Spacing        4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96
  Border radius  4 · 8 · 12 · 16 · 24 · 32 (full)

Rhythm
  Grid           72px square on landing hero + OG
  Reading width  72ch for prose, 96ch for cards

Motion
  Easing         cubic-bezier(0.22, 1, 0.36, 1)
  Enter duration 400-450ms
  Infinite loops FORBIDDEN on landing / OG
```

### 3.2 Why this brief refuses to show you an AI-generated logo mockup

Every design brief written in the last 18 months that ended with *"here's a Midjourney render of your logo"* produced a mark that looked generically premium but couldn't survive inspection. A well-specified brief, executed by a human who can sweat a serif's terminal curve at 2 AM, will always outperform.

The specification above is deliberately detailed enough that a competent type designer could draw the wordmark from it alone — no mood board, no Pinterest. That's the test of a good brief.

### 3.3 What to ship first

Priority order, ranked by impact per day of work:

1. **The wordmark SVG**, at the single correct scale, in a `/brand/` directory of the repo. Primary asset.
2. **Favicon family** (16, 32, 180, 192, 512, mask). 30 minutes of Figma once the wordmark is locked.
3. **The default OG image**, rendered via `@vercel/og`. Ships within a day.
4. **The light-mode logo variant**. Half a day once the dark one is final.
5. **Per-report dynamic OG** (`/api/og`). A weekend's work — ship after the defaults are live.
6. **Brand guidelines PDF**, 6-8 pages, for future contractors. Ship when you hire your second designer, not before.

---

## 4. Closing note

A logo doesn't make a company. But a sloppy logo tells every sophisticated reader — the investor, the analyst, the consultant you want to convert — that you don't sweat the details. In a product whose whole value is "we sweat the details so you don't have to," that's fatal.

Get the wordmark right. Draw the icon once, on-grid, at 24 units. Ship the OG. Then go back to writing code.

**— End of brief —**
