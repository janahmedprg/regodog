# Regodog

Regodog is a content-driven website and lightweight Content Managment System (CMS) built with React + TypeScript, server-side rendering (SSR), and Firebase. It supports public article publishing, category feeds, authenticated user accounts, and an admin authoring workflow powered by a Lexical-based rich text editor.

## What the Website Can Do

- Serve SSR-rendered pages for the home feed, tag/category feeds, and individual article pages.
- Hydrate server-rendered pages on the client with preloaded `window.__SSR_DATA__` payloads.
- Display article previews with thumbnails, publish dates, and extracted text snippets.
- Support dynamic content taxonomy via tag routes:
  - `/bakery`
  - `/standard_schnauzer`
  - `/farmhouse`
  - `/rego_project`
- Provide a full authentication flow:
  - email/password sign-up and sign-in
  - Google sign-in
  - email verification flow (`/auth/action`)
  - forgot-password + password reset flow
- Provide authenticated account management (`/account`) with profile fields and newsletter opt-in persistence.
- Provide admin-gated content management:
  - create articles
  - edit existing articles
  - delete articles
- Persist article content in multiple forms:
  - Lexical editor JSON state (for re-editing)
  - generated HTML (for rendering/indexability)
  - optional thumbnail image
- Support article engagement:
  - like/unlike with Firestore transaction-based updates
  - comment creation/editing with optional anonymous posting
- Generate `sitemap.xml` at build time from dynamic article IDs and tag routes.

## Technical Stack

- Frontend: React 19, TypeScript, React Router 7
- Build tooling: Vite 7, ESLint
- SSR runtime: custom Node HTTP SSR server (`server.js`) + Firebase Functions v2 SSR entry (`ssr_function/src/index.ts`)
- Backend services: Firebase Auth, Firestore, Cloud Storage, Firebase Hosting, Firebase Functions
- Editor: Lexical 0.38 ecosystem with extensive plugin support
- Real-time collaboration foundation: Yjs + `y-websocket` integration in editor collaboration layer
- Utility libraries: `date-fns`, `lodash`, `react-icons`, `katex`, `sitemap`

## Architecture Overview

### 1) Rendering model

- `src/entry-server.tsx` renders routes with `StaticRouter` and returns `{ appHtml, initialData }`.
- SSR data is fetched by `src/ssr/getInitialData.ts` before render.
- Server injects serialized initial data into HTML (`window.__SSR_DATA__`), then client hydrates via `src/main.tsx`.
- In production deployment, Firebase Hosting rewrites all routes to the `ssrApp` Cloud Function.

### 2) Data-fetch strategy for SSR

- SSR reads Firestore via REST endpoints (project-scoped API URLs).
- Feed pages resolve `news` docs and compute preview snippets by fetching stored HTML files and extracting plain text.
- Article pages prefetch article metadata and HTML content for crawlable, indexable markup.
- SSR payload trimming is applied in the function layer to avoid sending heavy article HTML/editor payloads to the client unnecessarily.

### 3) Content model and persistence

Primary collections/storage paths used by the app:

- Firestore `news`
  - core article metadata (`title`, `tags`, `createdAt`, `lastUpdated`, `author`, `likesCount`, `likedBy`, `thumbnailUrl`, `editorStateUrl`, `htmlContentUrl`)
- Firestore `check-admin`
  - admin allowlist (`id` fields checked against authenticated UID)
- Firestore `user-info`
  - account profile info + newsletter preference
- Cloud Storage `editor_state/*.json`
  - serialized Lexical state
- Cloud Storage `editor_html/*.html`
  - rendered article HTML
- Cloud Storage `thumbnails/*`
  - article thumbnails
- Cloud Storage `article-comments/{articleId}.csv`
  - per-article comment store

### 4) Authoring/editor system

The admin authoring experience uses a customized Lexical playground integration with plugins for:

- markdown shortcuts
- code highlighting (Prism/Shiki)
- lists/checklists/tables
- images, embeds (YouTube/Twitter/Figma), links, polls
- equations (KaTeX), Excalidraw, mentions, emojis
- collapsible sections, page breaks, layout blocks
- optional collaboration plugins using Yjs providers

On publish/update, the editor pipeline:

1. serializes editor state JSON
2. generates HTML from Lexical nodes
3. uploads both artifacts to Cloud Storage
4. writes/updates Firestore metadata document
5. removes old storage artifacts when replacing existing article content

## Routing Surface

- `/` - featured feed
- `/:tag` - tag-filtered feed (from `HeaderTags` enum)
- `/article/:id` - article view/edit context
- `/auth` - sign-in/sign-up
- `/auth/forgot-password` - reset request
- `/auth/action` - email action handler (verification/reset)
- `/account` - authenticated user profile management

## Build + Deployment Pipeline

- `npm run build:ssr`
  - TypeScript build + Vite client build + Vite SSR server build
- `npm run build`
  - SSR build + sitemap generation
- Firebase predeploy (configured in `firebase.json`):
  - builds SSR artifacts
  - copies `dist/client` and `dist/server` into function deployment package
  - installs function dependencies and builds function code
- Hosting rewrites all requests to `ssrApp` (region `us-central1`) for SSR response generation.