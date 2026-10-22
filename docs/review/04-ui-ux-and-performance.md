# 04: UI/UX, accessibility & performance

## 1. What I found

### Design system is not actually wired up

| Issue | Evidence |
|---|---|
| Theme tokens are malformed | `globals.css` `:root` has `--background: \t0.63\t0.72\t0.10;`, `--foreground`, `--muted` with stray tabs and decimals. Tailwind uses them as `hsl(var(--background))`. These aren't HSL triplets (they look like pasted oklch-style numbers). Depending on the browser they parse to near-black or get dropped. Either way it doesn't match the comments ("Very Dark Gray"). |
| Tokens missing in light mode | `--border`, `--input`, `--ring`, `--card`, `--popover`, `--destructive` exist only under `.dark`, and nothing ever adds the `dark` class (no theme provider). So `border-border` etc. resolve to nothing. |
| `purple` is blue | `tailwind.config.ts` overrides `purple-100..600` with blue hexes ("light blue for the background"), so `bg-purple-gradient`, `text-purple-400` are blue, and `from-blue-50 to-purple-50` on the landing page is a mix of real Tailwind purple and your fake one. Very confusing to maintain. |
| Styles commented out, classes still used | `.input-field`, `.select-field`, `.collection-card`, `.transformed-image`, `.transformation-original_image`, `.media-uploader_cldImage`, `.search`, `.transforming-loader`, `.transformed-placeholder` are all **commented out** in CSS but referenced in components. Image cards and result previews are effectively unstyled. |
| Hard-coded colors everywhere | `text-[#ededed]`, `text-gray-400`, `text-gray-700`, `bg-white`, `bg-yellow-50`, `#384262`. Mixed with tokens. No single source of truth. |
| Two icon systems + 15 SVG requests | Custom `/assets/icons/*.svg` via `next/image` (with `priority`/`eager` on 24 px icons) **and** `lucide-react` **and** `@radix-ui/react-icons`. |
| Duplicated UI logic | `SideBar` + `MobileNav` repeat nav-item markup; `TransformsForm` and `TrialTransformForm` are ~90% the same file. |
| Emoji as UI | "🎨 Trial Mode", "✨ Upgrade to Full Access". Reads as a prototype. |

### Flow problems

- Transform state is fragile: "Apply Transformation" then a spinner overlay that has no styles (`<div className="">`); success toast fires **before** Cloudinary has generated anything; failure = an 8-second timer that hides the spinner. There's no real progress, error, or retry.
- Silent failures: form submit with no uploaded image does nothing (no message). Save errors are `console.log`ged.
- Search only filters the 6 items on the current page. Pagination math disagrees with page size.
- "Update Image" link 404s; there's no delete UI.
- Upload area is a `<div onClick>`: not keyboard-reachable.
- Guest and signed-in experiences are two near-duplicate pages with different behavior; guests can't download; the promise "download quality limited" isn't true.
- Home hero (`.home`) is `hidden` below `sm`, and `MobileNav` shows only a Login button for signed-out users. **On a phone, a guest sees no tool shortcuts** beyond the promo card.

### Accessibility (Lighthouse a11y 96 hides real issues)

- Focus rings are removed with `!important` in `.button`, `.search-field`, `.sheet-content button`, `.IconButton`, `.dropdown-item` (`focus-visible:ring-transparent`, `outline-none`, `border-none`). Keyboard users can't see where they are (WCAG 2.4.7).
- Nested `<main>`: `(root)/layout.tsx` renders `<main>` and `page.tsx` renders another `<main>`; the auth layout has one too.
- Invalid list markup on the home hero: `<ul><Link><li>…</li></Link></ul>`.
- `<a>` inside `<button>` in pagination (`Button` wrapping `PaginationPrevious`).
- Icon `alt`s duplicate visible text (`alt={link.label}` next to `{link.label}`) → read twice. `alt="Alt"` on the result image. Card icon reuses the image title as alt.
- Color contrast fails in Lighthouse (search input area and others): `text-gray-400` body copy, `#ededed` headings on a background that may not be dark.
- No skip link, no `aria-current="page"` on active nav, no `aria-live` region for transform status, no `prefers-reduced-motion` handling.

### Performance (from your committed Lighthouse, mobile, `localhost` dev server)

| Metric | Value |
|---|---|
| Performance / A11y / Best Practices / SEO | 38 / 96 / 77 / 91 |
| FCP / LCP / TBT / CLS / TTI | 2.3 s / **11.7 s** / 2.5 s / 0 / 13.5 s |
| Root document | 1.75 s response; ~1.9 s wasted on redirects (Clerk dev-instance handshake) |
| Unused JS | ~700 KiB est. (includes dev-only Next devtools chunk); `@radix-ui/react-icons` ~85% unused |

Caveats: it's a dev server, so treat absolute numbers as pessimistic. But two findings are real in production too:

1. **The LCP element is a gallery card image with `loading="lazy"`** (`ul.collection-list > li > a.collection-card > img`). Lazy-loading your largest above-the-fold image delays it.
2. **Home calls `currentUser()`** (a network round-trip to Clerk) on every request, which forces the whole landing page dynamic and slow.

---

## 2. Visual direction (make it look modern in one pass)

Image editors look best **dark-first, neutral base, one accent, big imagery.** Think Linear/Vercel/Cleanup.pictures, not tutorial-purple.

Replace the token block in `globals.css` (valid HSL triplets; verify contrast with a checker before shipping):

```css
@layer base {
  :root {
    --background: 240 10% 4%;
    --foreground: 0 0% 96%;
    --card: 240 8% 7%;
    --card-foreground: 0 0% 96%;
    --popover: 240 8% 7%;
    --popover-foreground: 0 0% 96%;
    --primary: 262 83% 58%;
    --primary-foreground: 0 0% 100%;
    --secondary: 240 6% 14%;
    --secondary-foreground: 0 0% 96%;
    --muted: 240 6% 14%;
    --muted-foreground: 240 5% 65%;
    --accent: 190 90% 55%;
    --accent-foreground: 240 10% 4%;
    --destructive: 0 72% 55%;
    --destructive-foreground: 0 0% 100%;
    --border: 240 6% 18%;
    --input: 240 6% 18%;
    --ring: 262 83% 58%;
    --radius: 0.75rem;
  }
  /* optional light theme under .light or via next-themes */
}

:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { *, ::before, ::after { animation-duration: .01ms !important; transition-duration: .01ms !important; } }
```

Then:

- Delete the fake `purple`/`dark` palettes in `tailwind.config.ts`; use `primary`, `accent`, `muted`, `card` only. Grep for `text-\[#`, `bg-white`, `text-gray-`, `purple-` and replace with tokens.
- Delete every commented-out CSS block and the unused `.credits-*`/`.profile-*` classes. Style components with Tailwind utilities + `cva` (shadcn variants), not a global `@layer utilities` of one-off names.
- One icon set: `lucide-react`. Remove `@radix-ui/react-icons` and the `/assets/icons/*.svg` `<Image>` usage for UI icons.
- Add `next-themes` and a theme toggle (dark default). It's a 15-minute change that reads as polish.
- Tailwind v4 / shadcn v4 upgrade is optional and can wait. Don't do it in the same PR as the redesign.
- Type: keep Geist (good choice). Define a small scale (`text-sm/base/lg/2xl/4xl`) instead of `p-14-medium`, `p-16-semibold`, etc.
- Motion: subtle only (`motion`/`framer-motion` for card hover, page fade, slider). Respect reduced-motion.

---

## 3. Information architecture

Right now `/` is both marketing and dashboard. Split it:

| Route | Purpose | Rendering |
|---|---|---|
| `/` | Landing: hero with live before/after demos, 5 tools, how it works, FAQ, footer | **Static** (no Clerk calls). Signed-in users get a "Go to dashboard" button, or a redirect from `proxy.ts`. |
| `/dashboard` | Gallery: search, filter chips by tool, sort, pagination | Dynamic, `auth()` only |
| `/studio/[tool]` | One editor for all tools; guest mode = same UI with limits | Client editor + server actions |
| `/images/[id]` | Detail with compare slider, metadata, download menu, share toggle, edit/delete | Dynamic, ownership/visibility check |
| `/explore` (later) | Public gallery of images the owner marked public | ISR |

Guest mode = same `/studio/[tool]` component with `mode="guest"`: same layout, disabled Save/Download with an inline upgrade prompt. Kills the duplicated `TrialTransformForm`.

---

## 4. The studio (the screen recruiters will actually judge)

**Layout (desktop):** left rail = tool picker + controls; center = canvas; top bar = title, undo/compare toggle, Download menu, Save. **Mobile:** canvas on top, controls in a bottom sheet.

**Canvas:** dropzone → after upload, a **before/after slider** (drag or arrow keys), zoom on double-click.

**Dropzone:** drag & drop anywhere on the page, click, or paste from clipboard; shows format/size limits; client-side type/size check before upload; real upload progress. Make it a `<button>`/`role="button"` with keyboard support.

**Controls that reduce mistakes (and shrink the S-11 injection surface):**
- Remove/Recolor: prompt input **with suggestion chips** (person, car, shadow, logo…), and a real **color picker** + swatches for recolor (no free-text color).
- Generative Fill: **visual aspect-ratio cards** (little rectangles labeled 1:1, 4:5, 16:9…) instead of a Select.
- Restore/Background remove: one-click, no extra fields.

**State machine, not booleans** (replaces `isTransforming`/`isSubmitting`/timers):

```ts
type Phase =
  | { s: "idle" }
  | { s: "uploading"; pct: number }
  | { s: "ready" }                                  // uploaded, nothing applied
  | { s: "transforming"; attempt: number }
  | { s: "done" }
  | { s: "error"; message: string };
// useReducer + one <StatusRegion aria-live="polite"> that announces phase changes
```

Cloudinary can answer "still generating" (HTTP 423) for generative effects on first request (verify on your account). Poll with `HEAD` + backoff (1s, 2s, 3s… cap ~60s), show a skeleton with a progress hint, and offer **Cancel** and **Retry**. Fire the success toast only when the image really loaded.

**Before/after component** (drop-in starter; both children must share aspect ratio):

```tsx
"use client";
import { useCallback, useRef, useState, type ReactNode } from "react";

export function BeforeAfter({ before, after }: { before: ReactNode; after: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);

  const move = useCallback((x: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  }, []);

  return (
    <div
      ref={ref}
      className="relative touch-none select-none overflow-hidden rounded-xl"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (e.buttons) move(e.clientX); }}
    >
      <div>{after}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>{before}</div>
      <div
        role="slider" tabIndex={0} aria-label="Compare original and edited"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
          if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
        }}
        className="absolute inset-y-0 w-0.5 bg-white shadow"
        style={{ left: `${pos}%` }}
      >
        <span className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xs text-black">⇆</span>
      </div>
    </div>
  );
}
```

Use the same component in the landing hero (static, pre-rendered demo images) and on `/images/[id]`.

**Nice-to-haves (pick 2–3):** Cmd/Ctrl+Enter = apply, `D` = download; version history per image (each applied transform = a version); download format menu (PNG/JPG/WebP) via Cloudinary `f_` param; "copy share link" with public/private toggle; batch mode (multiple files, one tool).

---

## 5. Gallery (`/dashboard`)

- Masonry or uniform grid with skeletons while loading; hover overlay with actions (open, download, delete); lightbox on click.
- **Server-side** search (`?q=`), filter chips by transformation type, sort (newest/oldest), real pagination via `<Link href="?page=2">` (no client router, no `<a>` inside `<button>`). Cursor-based if you want to show off.
- Delete = confirm dialog + undo toast (optimistic).
- Empty state with a CTA ("Upload your first photo"), not the text "No Recent Images".
- Set `priority`/`preload` on the first 1–2 cards (that's your LCP), lazy for the rest.

## 6. Landing page

Hero (headline + sub + two buttons: *Try it free* / *Sign in*) with an auto-playing before/after demo; a 5-card tool grid each with its own before/after; "How it works" in 3 steps; short FAQ (privacy, limits, formats); footer with GitHub link and tech credits. Remove the emoji banners. Add OG image (`app/opengraph-image.tsx`), `metadataBase`, `robots.ts`, `sitemap.ts`, favicon/manifest. Current `openGraph.url` is hardcoded to a Vercel URL.

## 7. Required "boring" pages/states

`app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `loading.tsx` with skeletons per route (current `loading.tsx` is the text "Loading…"), form-level errors (not `console.log`), disabled-state explanations ("Upload an image first"), and toasts via `sonner` (replace the custom `use-toast` copy).

## 8. Accessibility checklist (do all of these)

- [ ] Global `:focus-visible` outline; remove every `focus-visible:ring-transparent`/`outline-none`/`!important` that hides it.
- [ ] One `<main>` per page; add a skip link.
- [ ] Upload trigger and slider are real controls (button / `role="slider"`).
- [ ] Pagination = links; no interactive-in-interactive.
- [ ] `alt=""` for decorative icons; meaningful alt for user images (use the title); no `alt="Alt"`.
- [ ] `aria-current="page"` on active nav item; active match by prefix, not `===`.
- [ ] `aria-live="polite"` status region for upload/transform state.
- [ ] Contrast ≥ 4.5:1 for text (fix `gray-400` body text and `#ededed` headings).
- [ ] Touch targets ≥ 44×44 px (download button is `px-2`).
- [ ] `prefers-reduced-motion` respected.
- [ ] Re-run Lighthouse + axe (`@axe-core/playwright` in the e2e suite).

## 9. Performance plan

1. Re-measure on a **production build** (`pnpm build && pnpm start`, or the Vercel URL) with Clerk on a production instance. Commit the *number* to the README; stop committing the HTML report.
2. LCP: `preload`/`priority` on the first gallery image(s); remove `priority`/`loading="eager"` from 24 px icons; give `sizes` to every `CldImage`.
3. Make `/` static. Use `auth()` (local JWT) instead of `currentUser()` (network) wherever you only need the id.
4. Replace SVG-icon `<Image>`s with inline lucide icons (removes ~7 requests on every page).
5. Remove `@radix-ui/react-icons`; run `@next/bundle-analyzer` once and look at the top 5.
6. Cache example images for guests (`revalidate` / `use cache`) instead of a DB hit per visitor.
7. `SideBar` returns `null` until mounted (`isMounted` pattern), so the whole sidebar pops in after hydration. Render it on the server; only the active-link logic needs `usePathname`.
8. `preload: false` for Geist Mono unless you actually use it above the fold.
9. Add Lighthouse CI with a budget (e.g. perf ≥ 90 mobile on the landing page) so regressions fail PRs.

## 10. Per-file change list

| File | Change |
|---|---|
| `app/globals.css` | New tokens, global focus style, delete commented/dead CSS, drop one-off utility classes |
| `tailwind.config.ts` | Remove fake `purple`/`dark` palettes, convert to ESM `export default`, remove unused `IBMPlex` |
| `app/layout.tsx` | `metadataBase`, ThemeProvider, skip link, remove hardcoded OG URL |
| `app/(root)/layout.tsx`, `page.tsx` | Single `<main>`; split landing vs dashboard |
| `components/SideBar.tsx`, `MobileNav.tsx` | Shared `<NavItem>`, server-render the sidebar, `aria-current`, lucide icons, mobile bottom bar with the 5 tools for guests |
| `components/Collection.tsx` | Link-based pagination, server-side search, skeletons, empty-state CTA, lazy/priority images |
| `components/Search.tsx` | `useDebouncedCallback`, `router.replace`, init from URL |
| `components/MediaUploader.tsx` | Real dropzone (drag/paste/keyboard), progress, size/type limits, remove false "credit deducted" toast, signed upload |
| `components/TransformedImage.tsx` | State machine, proper overlay, retry/cancel, alt text, before/after slider |
| `components/TransformsForm.tsx` + `TrialTransformForm.tsx` | Merge into one `StudioForm` + `useTransformation` hook; shared zod schema |
| `app/(root)/transforms/[id]/page.tsx` | Visibility/ownership check, metadata list as `<dl>`, compare slider, edit/delete, working Update route |
| `app/loading.tsx` (+ per-route) | Skeletons |
| new | `error.tsx`, `not-found.tsx`, `opengraph-image.tsx`, `robots.ts`, `sitemap.ts` |
