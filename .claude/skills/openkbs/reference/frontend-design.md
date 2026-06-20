# Frontend Design Reference

> Distilled from the [Anthropic frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design). Read this when you're about to build any non-trivial UI — a component, a page, an entire app — and want to avoid the generic "AI-generated" look.

## Design Thinking — before writing code

Don't open an editor until you've answered:

- **Purpose.** What problem does this interface solve? Who uses it?
- **Tone.** Pick an extreme and commit. Examples: *brutally minimal*, *maximalist chaos*, *retro-futuristic*, *organic / natural*, *luxury / refined*, *playful / toy-like*, *editorial / magazine*, *brutalist / raw*, *art deco / geometric*, *soft / pastel*, *industrial / utilitarian*. Use these as inspiration; design something true to your chosen direction.
- **Constraints.** Framework, performance, accessibility, browser/device targets.
- **Differentiation.** What makes this UNFORGETTABLE? What's the one thing someone will remember after closing the tab?

**Critical:** Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is *intentionality*, not intensity.

The implementation should be:

- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point of view
- Meticulously refined in every detail

## Aesthetics — the levers to push

### Typography

Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial, Inter, Roboto, system fonts — opt for distinctive, characterful choices that elevate the frontend's aesthetics. Pair a distinctive **display font** with a refined **body font**. Unexpected type elevates everything.

### Color & Theme

Commit to a cohesive aesthetic. Use **CSS variables** for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Justify every gradient stop or skip the gradient.

### Motion

Use animations for effects and micro-interactions. Prioritize CSS-only solutions for plain HTML; use the [Motion](https://motion.dev/) library for React when available. Focus on **high-impact moments**: one well-orchestrated page load with staggered reveals (`animation-delay`) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.

### Spatial Composition

Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space *or* controlled density — both work when intentional.

### Backgrounds & Visual Details

Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic: gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, grain overlays. Small details signal craft.

### Icons

Use a real icon set: lucide, heroicons, phosphor, or hand-crafted inline SVG. Pick one and stay consistent across the project. **Never use emoji as UI controls** — emoji renders inconsistently across operating systems, can't be styled, and is an instant unprofessional tell. Emoji is fine inside content text (chat messages, notifications, casual copy) — never as a button, label, or affordance.

## Anti-patterns — instant tells of low-effort, AI-defaulted UI

NEVER use generic AI-generated aesthetics:

- Overused fonts: Inter, Roboto, Arial, system fonts (and don't converge on the safe-trendy alternatives like Space Grotesk either — vary across projects)
- Cliché color schemes: purple → pink (or blue → cyan) gradients on white backgrounds, gradient text on every headline, gradient borders everywhere
- Predictable layouts: centered-everything, identical rounded-2xl card grids, glassmorphism stacked on a hero blob, floating dashboard mockup tilted at 15°
- Cookie-cutter component design that lacks context-specific character
- Stock illustrations of abstract people / floating cubes / geometric blobs
- Both border AND drop-shadow on the same card; pick one
- Fake star-rating rows, fake testimonials, fake company logos
- "✨ AI-Powered" / "🚀 Built with…" emoji headlines

## Match implementation to vision

**Maximalist** designs need elaborate code with extensive animations, layered effects, and rich interactivity. **Minimalist** or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well, not from picking the simpler option.

Vary across projects — between light and dark themes, different fonts, different aesthetics. No two designs should feel the same. Don't hold back: commit fully to a distinctive vision.
