# ZamZam CRM UI/UX Design System

Status: implemented as the shared visual baseline for the CRM.

Audience: individual real-estate brokers and brokerage teams.

Primary job: move a lead from attribution through requirements, matching, client delivery, visits, negotiation, and closing without losing context or evidence.

## Design Direction

- Tone: quiet, utilitarian, trustworthy, and optimized for repeated operational use.
- Structure: a workbench layout with a persistent desktop side rail and a compact mobile navigation drawer.
- Hierarchy: spacing, type, grouping, and table structure carry meaning before color or animation.
- Evidence: only recorded data is shown as fact. Missing values use an explicit unavailable or pending state.
- Primary action: one gold action per working context. Gold is never used as a claim of verification.

## Color Palette

### Gold and Ink Theme

| Token | Hex | Use |
| --- | --- | --- |
| `--color-surface-canvas` | `#0A0D14` | App background and page canvas |
| `--color-surface-raised` | `#12151F` | Sidebar, mobile header, controls, table headers |
| `--color-surface-subtle` | `#1B202C` | Cards, active navigation, raised panels |
| `--color-surface-inset` | `#0D1018` | Inputs, inner sections, dense data areas |
| `--color-text-primary` | `#F8FAFC` | Headings, key values, primary labels |
| `--color-text-secondary` | `#CBD5E1` | Supporting labels and readable body text |
| `--color-text-muted` | `#94A3B8` | Metadata, helper copy, unavailable states |
| `--color-text-inverse` | `#12151F` | Text on the gold action |
| `--color-action-primary` | `#B59658` | Primary action, selected state, brand accent |
| `--color-action-primary-hover` | `#CCB67B` | Hover, active icon, emphasis on dark surfaces |
| `--color-focus-ring` | `#F4D98B` | Keyboard focus ring |
| `--color-border-default` | `rgba(181,150,88,.28)` | Standard panel and control border |
| `--color-border-subtle` | `rgba(181,150,88,.16)` | Dividers and low-emphasis borders |
| `--color-border-strong` | `rgba(204,182,123,.62)` | Focused or selected border |

### Monochrome Theme

| Token | Hex | Use |
| --- | --- | --- |
| `--color-surface-canvas` | `#000000` | App background and page canvas |
| `--color-surface-raised` | `#09090B` | Sidebar, mobile header, controls |
| `--color-surface-subtle` | `#121212` | Cards and active navigation |
| `--color-surface-inset` | `#0A0A0A` | Inputs and inner sections |
| `--color-text-primary` | `#FFFFFF` | Headings and key values |
| `--color-text-secondary` | `#E4E4E7` | Supporting labels and body text |
| `--color-text-muted` | `#A1A1AA` | Metadata and helper copy |
| `--color-text-inverse` | `#09090B` | Text on the white action |
| `--color-action-primary` | `#FFFFFF` | Primary action and selected state |
| `--color-action-primary-hover` | `#E4E4E7` | Hover and emphasis |
| `--color-focus-ring` | `#FFFFFF` | Keyboard focus ring |
| `--color-border-default` | `rgba(255,255,255,.28)` | Standard border |
| `--color-border-subtle` | `rgba(255,255,255,.14)` | Low-emphasis divider |
| `--color-border-strong` | `rgba(255,255,255,.72)` | Focused or selected border |

### Semantic Status Colors

Status colors are intentionally separate from brand gold.

| State | Foreground | Surface | Use |
| --- | --- | --- | --- |
| Success | `#4ADE80` | `#123323` | Saved, current, payment received |
| Warning | `#FBBF24` | `#33280E` | Aging, pending, needs attention |
| Danger | `#F87171` | `#3A171A` | Request failure, rejected, stale |
| Information | `#60A5FA` | `#132A46` | Recorded context, warm interest, informational copy |

Do not use status colors to imply regulatory certification, guaranteed availability, or a conversion result.

## Type and Spacing

- Display: Marcellus, roman only, for page and section headings.
- Body: Plus Jakarta Sans for readable UI labels and actions.
- Data: Geist Mono for IDs, timestamps, money values, and dense operational metadata.
- Base spacing follows a 4px rhythm: 4, 8, 12, 16, 20, and 24px.
- Control minimum target: 44px height and 44px width for icon-only controls.
- Control radius: 6px. Panel radius: 12px. Repeated cards should not exceed 12px.
- Focus uses a 2px visible ring with 2px offset and is never animated.

## Workflow UX Rules

1. Attribution records the source and normalizes contact details before assignment.
2. Leads expose stage, owner, next follow-up, and requirements without requiring a detail-page detour.
3. Matching shows the requirement inputs and the inventory evidence used for each result.
4. Portal creation produces `/p/{token}` links only; the public view contains no internal CRM navigation.
5. Visits preserve buyer, itinerary, logistics, and post-visit outcome in one working context.
6. Deals use reversible stage movement. A rejected update restores the previous stage and announces the error.
7. Analytics uses recorded values or an explicit unavailable state. It never substitutes a fabricated percentage.

## Motion and Responsiveness

- Motion is limited to `transform` and `opacity` for interaction feedback.
- Shared hover states use a 150ms to 180ms ease-out transition.
- No decorative pulse, lift, or gradient is required to understand a workflow state.
- `prefers-reduced-motion: reduce` collapses transitions and animations to near-zero duration.
- Internal routes are verified at 320, 375, 414, 768, and 1440px.
- Tables and filter strips may scroll inside their own bounded containers; the document itself must not scroll horizontally.

## Accessibility Contract

- Every form control has a programmatic label.
- Dialogs use native `dialog` semantics, labelled titles/descriptions, initial focus, Escape handling, focus containment, and focus restoration.
- Icon-only actions have an accessible name.
- Failures use a visible `role="alert"` message and a retry or recovery action where applicable.
- Active navigation exposes `aria-current="page"` and remains visibly distinct without relying on color alone.
