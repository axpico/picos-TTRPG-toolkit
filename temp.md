You are an expert full‑stack engineer and product designer.

Goal
Design and implement a **single‑user, self‑hosted web application**: a system‑agnostic TTRPG Game Master toolkit, inspired by tools like “MITHOS: Game Master’s TTRPG Toolkit”, but with **entirely original code, UI, branding, and copy**. Do **not** copy any proprietary assets, artwork, trademarks, or text. This is for my **personal, internal use only**.[page:1]

High‑level requirements
- System‑agnostic: the app must not be tied to a specific RPG ruleset; it should work for fantasy, sci‑fi, horror, homebrew, etc.[page:1]
- Single‑user: only one GM account, no registration flow, just a simple password‑protected login.
- Privacy‑first, no cloud dependency: everything is stored locally (e.g., SQLite on the server). No external analytics, no tracking, no third‑party SaaS.
- “Infinite” workspace: a free‑panning, zoomable canvas/dashboard where I can arrange different panels (maps, trackers, notes, etc.) to mimic a physical DM table.[page:1]
- Modular tools: each major feature is a module/widget I can open, close, move and resize on the canvas.[page:1]
- Player‑facing view: a separate, read‑only URL (or “player screen” mode) that can be shown on a second monitor/TV, where I can choose what to project (map, initiative tracker, handouts, etc.).[page:1]
- Offline‑friendly: the app should keep working on my LAN even with no internet; no dependency on external APIs at runtime.[page:1]

Preferred tech stack
- Propose a **modern, pragmatic stack** and then stick to it, for example:
  - Backend: Node.js + TypeScript + a minimal framework (Express / Fastify) or Python + FastAPI.
  - Frontend: React + TypeScript + Vite (or similar) with a simple component library (e.g. Tailwind + headless UI components).
  - Database: SQLite via an ORM (Prisma / SQLAlchemy / etc.).
- Provide a clear justification of the chosen stack and folder structure at the beginning.

Core domain model
Define a minimal but extensible domain with entities like:
- Campaign (name, description, tags, custom settings).
- Session (date, summary, session notes, related campaign).
- NPC (name, role, portrait URL or local file reference, notes, tags, relationships).
- Monster/BestiaryEntry (name, type, stats as free‑form JSON or flexible fields, tags).
- Location/Map (name, description, image file reference or URL, GM notes, player notes).
- PartyMember (name, player name, basic stats, conditions).
- Shop/InventoryItem (name, type, price, stock, tags).
- Calendar/Time (custom calendars per campaign, current date/time, in‑world events).
- WeatherState (current weather, temperature, custom description).
- Layout (serialization of the current canvas layout: position/size/state of all widgets per campaign).

Expose these via a clean REST API (or GraphQL if you prefer), namespaced by campaign when appropriate.

Modules/widgets to implement
Implement at least the following modules as resizable, draggable widgets on the main canvas, each backed by API endpoints and persistent storage:[page:1]

1. Party Tracker
   - List of party members with HP/conditions and quick inline editing.
   - Ability to mark a character as down, stable, dead, etc.

2. Combat Tracker
   - Initiative order tracker with rounds, turn indicator, and notes.
   - Ability to add/remove creatures (from bestiary or ad‑hoc), reorder, and apply damage/conditions.

3. NPC Generator + NPC Library
   - Simple generator that can create random NPCs (name, role, quirk, hook) based on a few parameters (e.g. culture/region).
   - NPC Library to search, tag, edit, favorite, and attach NPCs to campaigns or locations.

4. Bestiary
   - List of monsters/creatures with flexible stat blocks (system‑agnostic).
   - Tagging by type, environment, challenge level (as free‑form or numeric).

5. Session Viewer / Notes integration
   - Internal rich‑text/markdown session notes editor.
   - Plus: ability to link to external markdown/notes files (e.g., pointing to local Obsidian vault paths or URLs/URIs for OneNote/Notion) without embedding or copying proprietary platforms.[page:1]
   - Show a list of sessions per campaign, with quick filters and search.

6. Shop Generator
   - Simple item generator for shops (e.g., price tiers, rarity) with randomization.
   - Ability to save a generated shop instance and reopen it later.

7. Weather Tool
   - Per‑campaign weather state with a button to “roll new weather”.
   - Optionally, weather tables configurable in settings.

8. Custom Calendar + Timekeeper
   - Support for custom calendar definitions per campaign (names of months, days per month, weekdays).
   - Controls to advance time by rounds, hours, days, etc., updating the in‑world calendar.

9. Map Display
   - Ability to upload map images.
   - Show a GM view with annotations/pins and a player view with limited information.
   - Basic fog‑of‑war is nice‑to‑have but can be simple (toggle visibility of layers/areas).

10. Session Recorder / Log
    - A log pane that automatically records simple events: time changes, weather changes, NPC introductions, combat start/end, etc.
    - Export log for a session as markdown or text.

11. Sticky Notes
    - Very lightweight text notes you can drop anywhere on the canvas and color‑code.

12. Dice Roller
    - Support common dice notation (e.g. 1d20+5).
    - History of recent rolls, with tags/labels indicating what the roll was for.

13. Multiple Campaign Support
    - Campaign switcher in the UI.
    - Each campaign has its own layout, data subsets, and configuration.

Canvas / layout system
- Implement a front‑end layout system that allows:
  - Opening multiple widgets at once.
  - Moving and resizing widgets.
  - Saving/restoring layout per campaign.
- It can be based on an existing drag‑and‑drop grid or your own implementation, but keep it simple and robust.

Player‑facing screen
- Implement a separate route, e.g. `/player/:campaignId`, which:
  - Shows only explicitly shared elements (e.g. current map, initiative order, current weather/time).
  - Auto‑updates via WebSockets or server‑sent events when the GM changes the relevant data.
- Provide a simple UI toggle in the GM view to mark specific widgets/fields as “broadcast to players”.

Authentication and security
- Single admin/GM account:
  - Simple login page with a config‑defined password (stored securely, e.g. hashed in the DB or environment).
  - No registration, no password reset flows.
- Basic CSRF and XSS protections.
- Clearly separate GM routes from player routes.

UX and UI guidelines
- Clean, utilitarian UI: focus on readability and quick access over flashy design.
- Dark theme by default, with a simple theme switcher if easy to implement.
- Keyboard shortcuts where useful (e.g., focus search, add new NPC, next turn in combat).

Implementation style
1. Start by outlining:
   - Chosen stack and why.
   - High‑level architecture.
   - Data model/schema.
   - API routes.
   - Frontend routing hierarchy and state management approach.

2. Then generate the code in well‑structured steps:
   - Database schema and migration setup.
   - Backend server with auth and main REST endpoints.
   - Frontend app structure (routes, layout, shared components, theme).
   - One module at a time (e.g., Party Tracker, then Combat Tracker, etc.).

3. For each module:
   - Show the backend API handlers.
   - Show the frontend React components/pages.
   - Show how state flows between them.

4. Provide:
   - A `docker-compose.yml` or simple run instructions.
   - Clear setup instructions (env vars, how to initialize DB, how to run dev/prod).

Legal and IP constraints
- Do not reuse any text, art, or branding from existing tools like MITHOS.
- Use generic, original names, copy, and visual design.
- The app must be original work, only conceptually inspired by the idea of a modular, system‑agnostic GM toolkit.

When you generate code, prefer completeness and coherence over brevity. If you cannot fit everything in one reply, proceed module by module, but keep the architecture consistent.