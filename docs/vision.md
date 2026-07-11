# Product vision

`@graundtech/fluent2-react-kit` exists to close a specific gap: teams who want their product to **look and feel like a Fluent 2 / Microsoft 365-style application** but who want to **build it the way the shadcn/ui ecosystem builds things** — copy-paste, unstyled-primitive-first, Tailwind-native, no heavyweight component-library runtime.

Nothing in the current open-source landscape does both at once. Microsoft's own Fluent UI React is the authoritative Fluent 2 implementation, but it is a large, opinionated runtime library with its own styling engine (Griffel) and its own component API — adopting it means adopting its whole world. shadcn/ui-style kits give you the copy-paste model and Tailwind-native styling, but none of them are visually Fluent 2. This kit is the intersection: Fluent 2 visuals, delivered through the shadcn distribution model, described in full in [`docs/design/tokens-research.md`](design/tokens-research.md) and enforced by [`docs/component-conventions.md`](../docs/component-conventions.md).

## Who this is for

The primary target is **line-of-business / ERP-style SaaS applications** — internal tools, admin panels, dashboards, and enterprise products where a Fluent-like visual language (dense data, clear hierarchy, Microsoft-familiar interaction patterns) is a natural fit, and where the team building it wants ownership of the component source rather than a black-box dependency.

Concretely, the kit targets React applications built with:

- **Next.js** (App Router or Pages Router)
- **Vite** (React SPA)
- **React Router** (framework mode or library mode)

No framework is privileged in the component code itself — see "Rendering philosophy" below. The demo app happens to be Next.js because it's a convenient, Vercel-deployable showcase, not because the kit assumes Next.js.

## The differentiator

**Fluent 2 visuals through a shadcn-like system.** Every design decision in this kit is filtered through one question: *does this make the component read as Fluent 2, expressed through an API a shadcn/ui user already knows?* That means:

- Component names, prop names, and prop values follow shadcn/ui exactly (`Button`, `variant="ghost"`, `size="sm"`) — never Fluent's own naming (`variant="subtle"`, no `Fluent`-prefixed names).
- Visual details — the brand state ramp, the bottom-accent field focus, flat elevation, the radius scale, motion curves — are derived from Fluent 2's publicly documented design tokens, not invented independently and not copied from Fluent UI source.
- Distribution follows the shadcn registry model: components are files you own, not opaque package exports.

## Source-precedence hierarchy

When a design or implementation question doesn't have an obvious answer, resolve it by walking this hierarchy — highest-precedence source wins:

1. **shadcn/ui API conventions.** If shadcn/ui has an established pattern for this (a prop name, a component shape, a variant set), use it. The kit's job is to reskin shadcn, not to redesign its API surface.
2. **Fluent 2 aesthetics.** Where shadcn/ui doesn't dictate a visual answer (color, spacing, motion, elevation, radius), match Fluent 2's publicly documented design language.
3. **Base UI primitives.** Where behavior needs real state/focus/portal management (not just markup + classes), defer to how `@base-ui/react` models that interaction pattern rather than inventing bespoke behavior.
4. **React / Next.js best practices.** Where none of the above apply (e.g., how to structure a compound component, server/client boundaries), follow current React and Next.js community conventions.
5. **WAI-ARIA APG.** For any remaining accessibility/semantics question (roles, keyboard patterns, focus management), the [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) is the final authority.

This ordering is why, for example, `Button`'s variant *names* come from shadcn (`default | secondary | outline | ghost | destructive | link`) while its variant *look* (brand state ramp, flat surfaces, 4px radius) comes from Fluent — and why `Avatar` reaches for a Base UI primitive (image-with-fallback loading state is real behavior) while `Separator` and `Label` stay plain markup (no behavior to manage, so markup + ARIA semantics settle it directly).

## Rendering philosophy

- **Client-safe by default.** Every component that is pure markup + classes (the majority) ships with no `"use client"` directive and no client-only React features, so it can be dropped into a React Server Component tree unchanged.
- **`"use client"` only when required.** The directive is added only to files that genuinely need client-only React (state, effects, refs for imperative DOM work, context, or a Base UI primitive that manages open/close/focus state internally). A caller passing an `onClick` prop does not, by itself, force a component to be client-only.
- **No RSC dependency.** The kit does not assume React Server Components exist. Every component works identically in a plain client-rendered React tree (Vite SPA, React Router library mode) — RSC support is a bonus property of writing plain, hook-free components, not a requirement placed on consumers.
- **No Vercel assumption for consumers.** The Vercel release pipeline (documented in [`VERCEL_PIPELINE.md`](../VERCEL_PIPELINE.md)) is this *repository's* deployment choice for its demo/registry host — it has no bearing on how a consuming application is built or deployed. Nothing in `packages/react` references Vercel, Next.js-only APIs, or any hosting assumption.

## Related docs

- [`docs/component-conventions.md`](../docs/component-conventions.md) — the normative authoring contract that operationalizes this vision per-component.
- [`docs/design/tokens-research.md`](design/tokens-research.md) — how Fluent 2's design tokens were researched and mapped onto the shadcn variable contract.
- [`docs/registry.md`](registry.md) — how the shadcn-distribution model is implemented for this kit.
- [`docs/status-and-backlog.md`](status-and-backlog.md) — what's shipped so far against this vision, and what's next.
