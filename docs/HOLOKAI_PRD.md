# Product Requirements Document: HoloKai

> Generated via Base44 `generate_prd`. Preserved verbatim from the tool result provided in chat.
> Note: the original result was truncated by the source tool at ~10,000 characters (cut off mid-sentence
> in "Design Preferences" — "The only UI layer is a floating min[...]"). If the full, untruncated PRD is
> available, paste the remainder and it will be appended here.

## Intent & Goal
HoloKai is a Pan-African living civilization research platform structured as two seamless phases of one experience. Phase 1 — the Orbital Lab — is a fully public, immersive 3D entrance built around an embedded Spline scene: a futuristic orbital laboratory housing a humanoid AI robot surrounded by rotating holographic African civilization artifacts. Visitors explore, select a Guardian persona, and pass through a cinematic portal into Phase 2 — the Civilization Core — a professional research environment (digital museum meets AI laboratory) where authenticated users conduct grounded, source-cited research into African history, languages, science, astronomy, trade, and culture. The tagline is "Where Civilization Remembers." The two phases feel like different rooms in the same ecosystem, not separate products.

## Audience & Roles
Three roles exist. Public Visitor: unauthenticated, accesses only the Orbital Lab — explores the 3D scene, interacts with holographic objects, selects a Guardian persona, and initiates the portal transition. Authenticated Researcher: logged-in user, full access to the Civilization Core — research chat, library, timeline, maps, manuscript viewer, citations, knowledge graph, compare civilizations, oral tradition explorer, and their saved session/persona context. Admin (future): content moderation and editorial review queue. Guardian (persona) is not an auth role but a research context state — one of eight distinct humanoid AI entities, each a unique physical form with African-inspired design engraving, specific accent colors, a curated research domain, and a personality.

### The Eight Guardians

| Guardian | Role | Form | Accent Color(s) | Domain |
|---|---|---|---|---|
| **OLUWA-CORE** | Guide | Yoruba-inspired gold-engraved humanoid, warm golden glow | `#E8B84B` | Yoruba civilization, spirituality, governance |
| **NAJA-7** | Cipher | Silver sleek form, green-orange visor eyes | `#4AFF91` / `#FF8C42` | Linguistics, writing systems, Nsibidi, Meroe script |
| **KEMET-ALPHA** | Scholar | Dark bronze form, dense hieroglyphic engravings, gold accents | `#C8952A` | Kemet/Egypt, astronomy, medicine, mathematics |
| **ZAMANI** | Chronicler | Warm-toned organic humanoid in traditional robes | `#FF8C42` | Oral traditions, memory, East African history |
| **BANTU-NODE** | Strategist | Tactical olive-green and gold armored form | `#6B8C3E` | Military strategy, migration routes, Bantu expansion |
| **SIKA-GOLD** | Archivist | Mirror-polished gold finish, topographic engravings | `#FFD700` | Trade routes, economics, Akan/Ashanti goldwork |
| **ASANTE-V** | Navigator | Translucent crystalline body, purple neural glow, gold circuitry | `#A855F7` | Astronomy, ocean navigation, diaspora mapping |
| **KUSH-PRIME** | Historian | White opalescent translucent glowing form | `#E8E8FF` | Kingdom of Kush, Nubia, matrilineal dynasties |

## Core Flows

1. **Orbital Lab entrance**: Public visitor opens HoloKai → full-screen Spline orbital laboratory loads (100vw/100vh, no competing UI) → OLUWA-CORE (default Guardian) animates at center with idle glow pulse → holographic African civilization objects rotate around it (manuscripts, star maps, Benin Bronzes, Adinkra symbols, Great Zimbabwe, DNA helix, Nsibidi glyphs, etc.) → visitor hovers/scrolls → eight Guardian portrait cards rise from the bottom as a horizontal carousel: name, domain tag, accent color glow, full-body key art image → clicking a Guardian card triggers visual scene transformation (Guardian image swaps, background accent color shifts, ambient holograms change to that domain's artifacts) → visitor clicks "Begin Journey" CTA → portal opens, camera flies through → app routes to Civilization Core login/signup gate carrying the selected Guardian context.

2. **Civilization Core arrival**: Authenticated researcher arrives at Civilization Core already loaded with their Guardian context (`guardianId`, `topic`, `language`, `journey` passed via session state from Orbital Lab) → persona-specific dashboard opens with curated tool panels and the Guardian's accent color theme applied to the sidebar → active Guardian is docked as a ~200px widget in the bottom-right corner, alive with ambient animation states tied to AI activity.

3. **Research Chat**: Researcher opens Research Chat → types or speaks a question about an African civilization → Base44 frontend sends query + Guardian persona context to Python backend (FastAPI/RAG endpoint) → backend returns grounded answer with claim-level citations → UI renders answer alongside source cards (title, date, type, confidence score) → researcher clicks source card to open Source Viewer (PDF reader / manuscript viewer inline) → researcher can pin citations, copy references, or open full Citation Browser.

4. **Library**: Researcher opens the Library → faceted search by civilization, era, region, source type, language → results as source cards in a modular grid → clicking a source opens full record with metadata, linked claims, related sources, and "Discuss this source" shortcut pre-loading it into Research Chat.

5. **Timeline Explorer**: Researcher opens Timeline Explorer → interactive chronological visualization of civilizations, events, and eras → clicking a node opens event detail panel with linked sources and "Ask HoloKai about this" action → timeline filters by Guardian-relevant civilizations.

6. **Interactive Map**: Researcher opens Interactive Map → geographic view of African continent and diaspora with selectable layers: trade routes, kingdom boundaries, migration paths, astronomical observation sites, diaspora corridors → clicking a region loads regional sources and opens contextual Research Chat pre-seeded with that region.

7. **Compare Civilizations**: Researcher opens Compare Civilizations → selects two or more civilizations from a picker → side-by-side comparison grid across dimensions (governance, religion, language, science, trade, architecture) → each cell links to supporting sources → AI generates a synthesis narrative with citations at the bottom.

8. **Manuscript Viewer**: Researcher opens Manuscript Viewer → browses digitized manuscripts with zoom, pan, and highlight annotation → side panel shows transcription, translation, and linked citations → highlighted passage can be sent directly to Research Chat for analysis.

9. **Knowledge Graph**: Researcher opens Knowledge Graph → interactive force-directed node graph of civilizations, people, events, manuscripts, and concepts → clicking a node opens its detail panel and filters the Civilization Core context to that node → zoom/pan navigation.

10. **Oral Tradition Explorer**: Researcher opens Oral Tradition Explorer → browse oral histories by region, language, and theme → audio player with synchronized scrolling transcript → linked to relevant written sources and timeline events.

11. **Guardian switching**: Guardian selection in Civilization Core → researcher clicks Guardian icon in sidebar → Guardian switcher panel slides open showing all eight Guardians with full-body key art images, domain tags, accent colors → selecting a new Guardian updates the dashboard tools, accent theme, docked widget visual, and Research Chat persona context → session state is updated.

## Technical Requirements

- **Stack**: Base44 (React + Tailwind + Vite) is the full frontend and auth layer. Existing Python FastAPI backend handles all RAG, grounded answer synthesis, PostgreSQL/pgvector, citation validation, job orchestration. Base44 calls Python backend via REST API (configurable `VITE_API_BASE_URL`).
- **Spline**: Embedded via `@splinetool/react-spline` (already in existing frontend `package-lock.json`). Full-screen in Orbital Lab with Spline public API event listeners wired for: Guardian variable changes (eye color, hologram set, lighting), portal trigger animation, idle detection for robot greeting prompt.
- **Guardian key art**: Eight full-body PNG images (one per Guardian) — served as static assets, used in carousel cards, Guardian switcher panel, and docked widget.
- **Session handoff**: On "Begin Journey", session context object `{guardianId, guardianName, topic, language, journey, accentColor}` written to React context / localStorage and carried into Civilization Core route — SPA routing, no page reload.
- **Base44 entities**:
  - `ResearchSession {userId, guardianId, guardianName, topic, language, journey, accentColor, createdAt}`
  - `SavedCitation {userId, claimText, sourceSlug, sourceTitle, confidence, savedAt}`
  - `UserGuardianPreference {userId, preferredGuardianId, lastActive}`
- **Knowledge base**: The 16-volume HoloKai Complete Library (105k characters across 16 domains) provided as seed data — used as static in-app reference content for the Civilization Core when the Python backend is unavailable, and as prompt context for Research Chat.
- **Backend API surface**:
  - `POST /api/grounded/ask`
  - `POST /api/alive/ask`
  - `POST /api/rag/ask`
  - `GET /api/sources` (faceted)
  - `GET /api/sources/:slug`
  - `GET /api/timeline/events`
  - `GET /api/jobs/:job_id`
  - `POST /api/jobs/grounded-ask`
- **Three.js**: `@react-three/fiber` and `@react-three/drei` available for the Knowledge Graph 3D node visualization and any CSS/canvas fallback orbital effects.
- **GitHub connector**: noted for future integration — not wired yet.

## Design Preferences

**Brand identity**: Primary palette is obsidian black (`#0A0A0A`) and burnished gold (`#C8952A` / `#E8B84B`). Brand mark: HoloKai humanoid figure icon + wordmark "HOLOKAI" in wide-tracked display capitals. Tagline "Where Civilization Remembers" in lightweight spaced serif beneath. Aesthetic: **Afrofuturist Luxury** — dark matte surfaces with warm gold/amber light, Art Deco structural geometry, African symbolic engravings (Adinkra, Nsibidi, hieroglyphics) rendered as fine-line surface texture on Guardian figures. No bright/neon colors except Guardian-specific accent glows.

**Orbital Lab phase**: Full-bleed Spline iframe 100vw/100vh, zero competing chrome (no nav bar, no hero copy). Background: deep space black (`#05050A`) with subtle warm-gold particle drift. Only UI layer is a floating minimal HUD:
- bottom-center horizontal Guardian carousel (8 cards: full-body key art, name, domain, accent glow border)
- centered "Begin Journey" pill button in gold (`#C8952A`)
- top-left wordmark only

Guardian carousel cards use glassmorphism panels (`backdrop-blur-md`, 1px gold border at 20% opacity, `#0A0A0A` fill at 80% opacity).

**Typography**: Display headings in wide-tracked uppercase sans (Syne or Space Grotesk Bold), body text in elegant light-weight sans, monospaced accent labels (source slugs, timestamps, citation IDs) in a subtle mono font.

**Guardian visual system** (holograms + accents per Guardian):
- OLUWA-CORE: warm gold engraved humanoid, accent `#E8B84B`, holograms of Yoruba bronze heads and Ife sculptures
- NAJA-7: silver sleek armor with green-orange visor, accent `#4AFF91` / `#FF8C42`, holograms of ancient alphabets and Nsibidi glyphs
- KEMET-ALPHA: dark bronze with gold hieroglyph engravings, accent `#C8952A`, holograms of astronomical charts and papyrus scrolls
- ZAMANI: warm amber organic humanoid in robes, accent `#FF8C42`, holograms of talking drums and oral tradition waveforms
- BANTU-NODE: olive-green and gold tactical armor, accent `#6B8C3E`, holograms of migration maps and campaign routes
- SIKA-GOLD: mirror-polished gold with topographic lines, accent `#FFD700`, holograms of gold weights and trade route charts
- ASANTE-V: translucent crystalline with purple neural glow, accent `#A855F7`, holograms of star constellations and ocean current maps
- KUSH-PRIME: white opalescent glowing form, accent `#E8E8FF`, holograms of pyramid silhouettes and dynastic scrolls

**Civilization Core phase**: Dark SaaS research environment.
- Background `#0D0D1A`, card surfaces `#1A1A2E`, sidebar `#111120`
- Left sidebar: HoloKai wordmark top, Guardian portrait + name + active domain mid, nav items with lucide icons
- Main area: modular grid, high information density, all panels use 1px gold/accent borders at low opacity
- Active Guardian's accent color tints sidebar active state, panel borders, and CTA buttons
- Bottom-right docked Guardian widget (~200×280px) with four CSS animation states:
  - **idle**: slow golden pulse
  - **retrieving**: orbiting document particles around the figure
  - **reasoning**: neural pathway glow lines across the figure
  - **speaking**: energy core chest pulse

**Shared DNA across both phases**: obsidian + gold palette, Syne/Space Grotesk typography, glassmorphism floating panels, African geometric motifs as subtle background texture, warm amber/gold light as the emotional through-line.

---

## Relationship to this codebase

This PRD describes the Base44 app being reconstructed under `base44-app/` in this project, and its Python backend integration target is the existing FastAPI backend (`main.py`, `holokai_alive.py`, `grounding.py`, `catalog_backend.py`, `job_manager.py`) already implemented here.

Endpoints referenced in this PRD that **already exist**:
- `POST /api/grounded/ask` ✅
- `POST /api/alive/ask` ✅
- `POST /api/rag/ask` ✅
- `POST /api/jobs/grounded-ask` ✅
- `GET /api/jobs/{job_id}` ✅

Endpoints referenced in this PRD that **do not yet exist** and would need to be added:
- `GET /api/sources` (faceted) — closest existing equivalent: `GET /api/library/search`
- `GET /api/sources/:slug` — closest existing equivalent: `GET /api/library/{slug}`
- `GET /api/timeline/events` — not yet implemented

Base44 entities described here (`ResearchSession`, `SavedCitation`, `UserGuardianPreference`) are **Base44-native data models** (its own hosted DB), separate from the PostgreSQL/pgvector catalog implemented in `postgres_store.py`. These would live entirely inside the Base44 app, not in the Python backend.
