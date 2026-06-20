---
name: openkbs
description: OpenKBS platform CLI, elastic services, and AI proxy
---

# OpenKBS Platform v2

## CLI Commands

### Authentication
```bash
openkbs login              # Browser-based login (interactive users)
openkbs auth <token>       # Authenticate with project JWT (containers)
openkbs logout             # Clear stored credentials 
```

### Projects
```bash
openkbs list               # List all projects (alias: ls)
openkbs create [name] -r <region>  # Create + scaffold project (openkbs.json, functions/, site/, .claude/skills/)
openkbs deploy             # Deploy all elastic services declared in openkbs.json
openkbs update             # Update CLI binary + download latest skill into project
```

### Functions (Lambda)
```bash
openkbs fn list            # List deployed functions (alias: ls)
openkbs fn deploy <name>   # Zip ./functions/<name>/ and deploy to Lambda
openkbs fn logs <name>     # Tail recent CloudWatch logs
openkbs fn invoke <name> -d '{"action":"hello"}'   # Invoke with JSON payload
openkbs fn destroy <name>  # Delete function and its Lambda URL
```

Options for `fn deploy`:
- `-s, --schedule <expr>` -- Schedule expression, e.g. `"rate(1 hour)"` or `"cron(0 9 * * ? *)"`
- `-m, --memory <mb>` -- Memory in MB (default from openkbs.json)
- `-t, --timeout <sec>` -- Timeout in seconds
- `--no-http` -- Disable HTTP access (function URL)
- `-e, --env <KEY=VALUE>` -- Custom environment variable (repeatable, e.g. `-e API_SECRET=xxx -e DEBUG=true`)

### Static Site
```bash
openkbs site deploy        # Deploy ./site/ to S3 + CloudFront
```

### Storage (S3)
```bash
openkbs storage list [prefix]              # List objects (alias: ls)
openkbs storage upload <local> [remote]    # Upload a file
openkbs storage download <remote> [local]  # Download a file
openkbs storage rm <keys...>              # Delete objects
```

### PostgreSQL
```bash
openkbs postgres info       # Show host, database, engine, status
openkbs postgres connection # Output full connection string
openkbs postgres migrate    # Migrate from Neon to Aurora Serverless v2 (with data)
openkbs postgres migrate --no-data              # Migrate without data (fresh Aurora)
openkbs postgres migrate --min-acu 0.5 --max-acu 8  # Custom scaling
openkbs postgres cleanup-neon  # Delete old Neon DB after verified Aurora migration
openkbs postgres restore --point-in-time "2026-05-13T08:00:00Z"  # Snapshot from point in time
openkbs postgres restore-status           # Check if snapshot is ready (Aurora takes 15-30 min)
openkbs postgres cleanup-restore          # Delete snapshot when done
```

### MQTT (Real-time Messaging via AWS IoT Core)
```bash
openkbs mqtt info                              # Show MQTT status and endpoint
openkbs mqtt enable                            # Enable MQTT for this project
openkbs mqtt disable                           # Disable MQTT
openkbs mqtt token [-u userId]                 # Generate temporary client credentials
openkbs mqtt publish <channel> -d '<json>'     # Publish event to channel
```

### Email
```bash
openkbs email enable           # Enable email sending for this project
openkbs email info             # Show email status and usage
openkbs email send <to> -s <subject> -b <body>  # Send email
openkbs email disable          # Disable email
openkbs email verify-domain <domain>  # Start domain verification for custom sender
openkbs email verify-status           # Check verification status
```

### Custom Domain
```bash
openkbs domain add <domain>    # Register custom domain (e.g. example.com)
openkbs domain verify          # Check DNS records and certificate status
openkbs domain provision       # Create CloudFront distribution for domain
openkbs domain info            # Show current domain configuration
openkbs domain remove          # Remove custom domain
```

---

## Project Structure

```
./openkbs.json          # Project config (services, region, functions)
./functions/            # Each subfolder = one Lambda function
  api/
    index.mjs           # Entry point (export handler)
    package.json        # Optional dependencies (bundled on push)
./site/                 # Static site (S3 + CloudFront CDN)
  index.html
```

## Reverting to a previous version

When the user asks you to *revert the project to version v<N>* (a message the studio sends when they click Revert in Version History), do NOT do a blind `git reset --hard`. Treat it as a real engineering task:

1. **Diff** current HEAD vs the target tag: `git diff v<N> HEAD`. Summarise what's actually changed since v<N>.
2. **Scan for side-effects that code reverting alone won't undo:**
   - Database migrations created after v<N> (anything under `migrations/`, SQL files, or references inside functions that shape external tables). If any exist, write a **down-migration** that reverses the schema change.
   - Environment variables / secrets added or changed.
   - Uploaded storage objects, cron jobs created via `openkbs fn deploy --schedule`, email config, custom domain state — list anything that needs manual attention.
3. **Present a plan** (you're in plan mode by default for revert requests) that enumerates: code reversals, down-migrations, deploys needed, anything to flag to the user.
4. **Apply after approval:**
   - Reverse the code (`git checkout v<N> -- <paths>` for clean files, hand-edit if there are conflicts you want to resolve differently) in the working tree.
   - Commit using the conventional style:
     ```
     revert: restore project to v<N> — "<title of v<N>>"

     - reverse changes introduced after v<N>
     - <per-migration bullet>
     - ...
     ```
   - Run `openkbs deploy` (or the scoped variant) so the live state matches v<N>.
5. **Never** run `git reset --hard`. We keep history forward-only so the user can revert the revert if needed.

## Commits & Versions

After every meaningful change, commit your work **before** you call `openkbs deploy` / `site deploy` / `fn deploy`. The studio auto-tags each successful deploy as `v1`, `v2`, `v3`, … and the tag reuses **your commit message verbatim** — so your commit IS the version entry the user sees in Version History. If the tree is dirty, deploy still succeeds but the version tag is skipped with a warning; don't rely on this.

Use the natural bulleted style you already produce by default:

```
<type>: <title that summarises ALL the changes in this commit>

- <one concrete change per bullet, imperative mood>
- <…>
```

- **Title** is an overall summary of everything in the body — not just the headline item. Keep it ≤ 72 chars.
- **Body** is a dashed bullet list — one bullet per concrete change, imperative ("add X", "fix Y"). State what changed, and why when not obvious.
- **Type prefix** (preferred): pick the one that best describes the *dominant* change in the commit.
  - `feat` — new feature or capability
  - `fix` — bug fix
  - `style` — **visual / UI design changes** (layout, colors, spacing, typography, redesign). Use this for CSS, Tailwind classes, or any purely visual tweak. NOT for code formatting.
  - `refactor` — restructure code without changing behavior
  - `perf` — performance improvement
  - `docs` — documentation
  - `test` — add or fix tests
  - `build` — build system, dependencies, bundler config
  - `ci` — CI / deploy pipeline config
  - `chore` — maintenance, tooling, housekeeping
  - `revert` — rollback of a prior commit

Example:

```
feat: stripe checkout on /pricing

- add PricingPage with plan cards + CTA
- wire POST /api/stripe/intent and return client_secret
- handle 3DS redirect via stripe-js confirmCardPayment
- empty-state, loading, and error variants for checkout form
- add STRIPE_SECRET_KEY to settings.json template
```

Never bulldoze uncommitted work: if you change several things, group them into one well-titled commit rather than a flood of micro-commits.

## openkbs.json

```json
{
  "projectId": "a0ebcf5d1fa5",
  "region": "us-east-1",
  "postgres": true,
  "storage": { "cloudfront": "media" },
  "mqtt": true,
  "email": true,
  "functions": [
    { "name": "api", "runtime": "nodejs24.x", "memory": 512, "timeout": 30 },
    { "name": "cleanup", "schedule": "rate(1 hour)", "timeout": 900 }
  ],
  "site": "./site",
  "spa": "/app/index.html"
}
```

| Field | Description |
|-------|-------------|
| `projectId` | Project short ID (auto-set by `openkbs init` or `openkbs create`) |
| `region` | AWS region: `eu-central-1`, `us-east-1`, or `ap-southeast-1` |
| `postgres` | `true` for Neon (default), or `{ "engine": "aurora" }` for Aurora Serverless v2 |
| `storage` | Object with `cloudfront` prefix for CDN distribution |
| `mqtt` | `true` to enable real-time WebSocket messaging |
| `email` | `true` to enable email sending (SES) |
| `functions` | Array of function definitions to deploy |
| `site` | Path to static site directory |
| `spa` | SPA fallback path (all 404s redirect here) |

---

## Elastic Services

### Functions (Lambda)

Serverless functions running on **Node.js 24.x** (AWS Lambda).

Each function lives in `./functions/<name>/` with an `index.mjs` entry point that exports a `handler` function. The handler receives a Lambda Function URL event and returns a response object.

**Environment variables** injected automatically:
- `DATABASE_URL` -- Postgres connection string (if `postgres: true`)
- `STORAGE_BUCKET` -- S3 bucket name (if `storage` configured)
- `OPENKBS_PROJECT_ID` -- Project short ID
- `OPENKBS_API_KEY` -- Secret key for calling OpenKBS platform APIs

**Custom environment variables** — create a `.env` file in the function directory:

```
functions/api/.env
```

```env
MY_SECRET=abc123
STRIPE_KEY=sk_live_xxx
NODE_ENV=production
```

The CLI reads `.env` on each deploy and injects the variables into the Lambda alongside the auto-injected ones. The `.env` file is gitignored by default (the template `.gitignore` excludes `.*`), so secrets never end up in version control.

You can also pass env vars via CLI flags (these override `.env` values):

```bash
openkbs fn deploy api -e MY_SECRET=abc123 -e DEBUG=true
```

**Setting secrets:** When a function needs API keys, passwords, or other sensitive values, **never ask for the value in chat** and **never read `.env` files**. Instead, output this exact JSON marker in your response (the studio renders it as a secure password input):

```
{"__openkbs_ui__": "secret_input", "fn": "api", "key": "STRIPE_KEY", "label": "Enter your Stripe API key"}
```

Replace `fn` with the function name, `key` with the env var name, and `label` with a human-readable prompt. The studio shows a password field — the user enters the value and it goes directly to `functions/<fn>/.env` without ever appearing in chat. After the user submits, proceed with `openkbs fn deploy` to pick up the new secret.

Deploy: `openkbs fn deploy <name>`

**Performance: direct Lambda URLs in the frontend.**
API calls through CloudFront (`fetch('/api', ...)`) add ~30-50ms latency per request because CloudFront proxies to the Lambda origin. After the first `openkbs fn deploy`, the Lambda URL is known and stable (it doesn't change across deploys). Use it directly in the frontend for faster API calls:

```javascript
// Initial (before first deploy — Lambda URL unknown):
const API_BASE = '/api';

// After deploy — replace with the direct Lambda URL from `openkbs fn list`:
const API_BASE = 'https://xyz123.lambda-url.eu-central-1.on.aws';
```

The agent should: (1) deploy the function first, (2) get the Lambda URL from the deploy output or `openkbs fn list`, (3) update `API_BASE` in the frontend code, (4) redeploy the site. CORS is already handled — all function handlers include `Access-Control-Allow-Origin: *`.

### Storage (S3 + CloudFront)

Object storage backed by S3 with CloudFront CDN. Files uploaded to S3 are served through CloudFront at the domain's CDN path prefix (e.g. `/media/`).

### Postgres

Managed PostgreSQL database. Connection string is injected as `DATABASE_URL` into all functions. Use `openkbs postgres connection` to get the string for local development.

Two engines are available:
- **Neon** (default) — scale-to-zero, ideal for spiky/prototype workloads. Set `"postgres": true`.
- **Aurora Serverless v2** — consistent low-latency, ideal for enterprise/ERP workloads. Set `"postgres": { "engine": "aurora" }`. Minimum 0.5 ACU (always-on, no scale-to-zero). Optional: `{ "engine": "aurora", "minACU": 0.5, "maxACU": 8 }`.

**Point-in-time restore** — recover data from any past moment without affecting the live database:

```bash
openkbs postgres restore --point-in-time "2026-05-13T08:00:00Z"
# Neon: instant branch (read-only), returns connection string immediately
# Aurora: restore cluster (15-30 min), poll with restore-status

openkbs postgres restore-status   # check if ready, get connection string
openkbs postgres cleanup-restore  # delete snapshot when done
```

Agent workflow for selective data recovery:
1. Create snapshot: `openkbs postgres restore --point-in-time "<before the incident>"`
2. Get snapshot connection string from the output (or `restore-status`)
3. Connect to BOTH databases (live + snapshot) using `pg` library
4. Query the lost/corrupted records from the snapshot
5. INSERT them back into the live database
6. Clean up: `openkbs postgres cleanup-restore`

The snapshot is a full copy of the database at that moment. For Neon it's a branch (instant, free). For Aurora it's a separate cluster (15-30 min, costs ~$0.06/hr while running).

### MQTT (Real-time Messaging)

Real-time pub/sub messaging via AWS IoT Core MQTT over WebSocket. Clients get temporary AWS credentials from `POST /projects/{id}/mqtt/token`, then connect directly to IoT Core. Supports channels, presence, and event-based subscriptions. Client SDK: `<script src="https://openkbs.com/sdk/mqtt.js"></script>` (requires mqtt.js).

**Security:** MQTT credentials allow pub/sub on ALL channels within the project. Any user with credentials can subscribe to any channel. For private/sensitive channels, use unpredictable channel names (e.g., `crypto.randomBytes(32).toString('hex')`). For sensitive data, publish only from the server via `POST /projects/{id}/mqtt/publish` — never trust client-published messages without server-side validation.

### Workers (On-Demand EC2 Compute) — BETA

> **BETA — explicit opt-in only.** Do NOT use or suggest workers unless the user explicitly asks for heavy compute, workers, or EC2-based processing. For full documentation, read `reference/workers.md` in this skill bundle.

Workers provide on-demand EC2 instances (8–64 cores, NVMe storage, FFmpeg/Python pre-installed) for tasks that exceed Lambda limits. Code lives in `./workers/<name>/index.mjs`. Same env vars as Lambda. Billed per-second.

---

## API Base URLs

| Service | URL |
|---------|-----|
| Project API | `https://project.openkbs.com` |
| User API | `https://user.openkbs.com` |
| AI Proxy | `https://proxy.openkbs.com` | use lambda url (for requests time > 180 seconds): https://hvgvoqid2bib6x5cl35gldk3nu0ubsvw.lambda-url.eu-central-1.on.aws/

---

### Frontend Development

For complex interactive UIs (dashboards, multi-step forms, apps behind login), consider using React + Vite + Tailwind instead of building everything with raw HTML string concatenation. Keep landing pages and public-facing pages as plain HTML for better SEO and simplicity.

Avoid inlining entire applications inside a single HTML file or concatenating pages into one string variable — use separate files for pages and components.

**Design intentionality.** Before writing UI code, commit to a clear aesthetic direction and execute every detail with precision. Refined minimalism and bold maximalism both work — what fails is the wishy-washy AI default with no point of view. Pick a flavor (brutally minimal, refined editorial, retro-futuristic, brutalist, luxury, playful, industrial — your call) and stay true to it across the whole product.

**Aesthetic levers — push hard on these instead of leaving them at default:**

- **Typography.** Avoid generic fonts (Inter, Roboto, Arial, system). Pair a distinctive display font with a refined body font.
- **Color.** Dominant color + sharp accents beats a timid evenly-distributed palette. Use CSS variables for consistency. Justify every gradient stop or skip the gradient.
- **Spatial composition.** Asymmetry, overlap, diagonal flow, grid-breaking moments. Generous negative space OR controlled density — both fine when intentional.
- **Backgrounds & atmosphere.** Don't default to flat solids. Layered transparencies, noise textures, geometric patterns, dramatic shadows, grain overlays, custom cursors — small details that signal craft.
- **Motion.** One orchestrated page load with staggered reveals beats scattered micro-interactions. CSS-only where possible; Motion library for React.
- **Icons.** Use real icon sets (lucide, heroicons, phosphor, inline SVG). Never emoji as UI controls — emoji is fine only inside content text.

**Anti-patterns to avoid** (instant tells of low-effort, AI-defaulted UI): purple→pink gradients on white, generic system fonts, centered-everything layouts, identical rounded-2xl cards in a row, glassmorphism on a hero blob, "✨ AI-Powered" emoji headlines.

For a deeper take (design thinking process, motion patterns, spatial composition examples), read `reference/frontend-design.md` in this skill bundle before building any non-trivial UI.

---

### Agent Browser

`agent-browser` is pre-installed in the container (with Chromium ready). Use it whenever you need to interact with a real web page — navigate, fill forms, click, screenshot, scrape, run E2E checks against sites you just built, or dogfood your own UI before declaring it done.

**Before running any commands, load the official skill — its syntax changes between versions and guessing produces wrong invocations:**

```bash
agent-browser skills get agent-browser           # core docs (always start here)
agent-browser skills get agent-browser --full    # + references and templates
```

Specialized skills available via the same command (load only when relevant):

- `dogfood` — exploratory testing, QA passes, bug hunts on your own app
- `electron` — VS Code, Slack desktop, Discord, Figma, Notion, Spotify
- `slack` — Slack workspace automation (read unreads, send/search messages)
- `vercel-sandbox` — run automation inside Vercel Sandbox microVMs
- `agentcore` — AWS Bedrock AgentCore cloud browsers

**Canonical AI workflow** is *snapshot-then-act* — never write CSS selectors by hand. `snapshot -i` returns an accessibility tree with `@e1`, `@e2`, … refs which you then pass to `click` / `fill` / `hover` / `select`:

```bash
agent-browser open https://app.example.com/login
agent-browser snapshot -i        # → @e1 [input email], @e2 [input password], @e3 [button] "Sign In"
agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "secret"
agent-browser click @e3
agent-browser wait --url "**/dashboard"
```

Use `--session-name <name>` to auto-persist cookies + localStorage across calls (so you log in once, then reuse the session). Full auth, profile, network, and recording docs are in the loaded skill.

Full reference: https://github.com/vercel-labs/agent-browser

---

## Function Development Patterns

**CloudFront note:** All Lambda functions sit behind CloudFront. Use the `x-forwarded-for` header for the caller's real IP, not `sourceIp`.

### Basic handler with CORS

```javascript
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS },
    body: JSON.stringify(data),
  };
}

export async function handler(event) {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const body = event.body ? JSON.parse(event.body) : {};
  return json({ message: 'OK' });
}
```

### Action-based dispatch

```javascript
export async function handler(event) {
  const method = event.requestContext?.http?.method || 'GET';
  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const body = event.body ? JSON.parse(event.body) : {};
  const { action } = body;

  switch (action) {
    case 'list':   return handleList(body);
    case 'create': return handleCreate(body);
    default:       return json({ error: 'Unknown action' }, 400);
  }
}
```

### Postgres connection pooling

```javascript
import pg from 'pg';

let pool;
function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      max: 3,
      idleTimeoutMillis: 60_000,
    });
  }
  return pool;
}

// Usage in handler:
const db = getPool();
const result = await db.query('SELECT * FROM items LIMIT 50');
```

### S3 presigned upload URLs

```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

async function getUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const publicUrl = '/' + key;  // served via CloudFront
  return { uploadUrl, publicUrl };
}
```

Alternatively, use the Project API to get an upload URL without importing the AWS SDK:

```javascript
const projectId = process.env.OPENKBS_PROJECT_ID;
const apiKey = process.env.OPENKBS_API_KEY;

const res = await fetch(`https://project.openkbs.com/projects/${projectId}/storage/upload-url`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ key: 'media/uploads/photo.jpg', contentType: 'image/jpeg' }),
});
const { uploadUrl, publicUrl } = await res.json();
```

### Email — sending from a Lambda function

```javascript
const projectId = process.env.OPENKBS_PROJECT_ID;
const apiKey = process.env.OPENKBS_API_KEY;

const res = await fetch(`https://project.openkbs.com/projects/${projectId}/email/send`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Hello',
    html: '<h1>Hi!</h1>',
  }),
});
const { sent } = await res.json();
```

### MQTT — Architecture

MQTT uses AWS IoT Core MQTT over WebSocket. Clients connect **directly** to IoT Core (no proxy). The platform provides:
- `POST /projects/{id}/mqtt/token` — temporary STS credentials (15 min, scoped to project topics)
- `POST /projects/{id}/mqtt/publish` — server-side publish (metered, billed)
- Client SDK (`mqtt.js`) — browser SDK with channels, presence, auto-reconnect

**Data flow:**
```
Browser → SigV4-signed WebSocket → AWS IoT Core (managed MQTT broker)
Server  → POST /mqtt/publish   → Lambda → IoT Core → all subscribers
```

**Presence** uses MQTT Last Will and Testament (LWT) for auto-leave on disconnect (tab close, crash, network loss). When a new member enters, existing members reply with `sync` so the newcomer discovers everyone instantly. No polling or heartbeat needed.

### MQTT — get credentials (server-side)

```javascript
const projectId = process.env.OPENKBS_PROJECT_ID;
const apiKey = process.env.OPENKBS_API_KEY;

const res = await fetch(`https://project.openkbs.com/projects/${projectId}/mqtt/token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ userId: String(userId) }),
});
// Returns: { iotEndpoint, region, topicPrefix, clientIdPrefix, credentials: { accessKeyId, secretAccessKey, sessionToken } }
const mqttData = await res.json();
```

### MQTT — publish from server (metered)

```javascript
await fetch(`https://project.openkbs.com/projects/${projectId}/mqtt/publish`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  },
  body: JSON.stringify({ channel: 'posts', event: 'new_post', data: { id: 1, title: 'Hello' } }),
});
```

### MQTT — client SDK (browser)

```html
<script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>
<script src="https://openkbs.com/sdk/mqtt.js"></script>
```

```javascript
// Initialize (mqttData from /mqtt/token)
const realtime = new MQTT.Realtime({
  credentials: mqttData.credentials,
  iotEndpoint: mqttData.iotEndpoint,
  region: mqttData.region,
  topicPrefix: mqttData.topicPrefix,
  clientIdPrefix: mqttData.clientIdPrefix,
  clientId: 'user-123',     // unique per user
  debug: false               // true for console logs
});

// Connection events
realtime.connection.on('connected', () => console.log('online'));
realtime.connection.on('disconnected', () => console.log('offline'));

// Channels — subscribe to messages
const channel = realtime.channels.get('posts');
channel.subscribe((msg) => console.log(msg.name, msg.data));           // all messages
channel.subscribe('new_post', (msg) => console.log(msg.data));         // specific event
channel.publish('greeting', { text: 'Hello!' });                       // publish (if allowed)

// Presence — who's online
channel.presence.enter({ name: 'Alice' });                             // announce yourself
channel.presence.subscribe((members) => console.log(members));         // member list updates
channel.presence.subscribe('enter', (m) => console.log(m, 'joined'));  // specific events
channel.presence.subscribe('leave', (m) => console.log(m, 'left'));
channel.presence.leave();                                              // leave presence

// Cleanup
realtime.close();
```

### MQTT — Security

- Credentials are scoped to the project's IoT topics only (STS session policy)
- Credentials cannot access S3, Lambda, or any other AWS service
- Any user with credentials can subscribe to **all** channels in the project
- For private channels, use unpredictable names: `crypto.randomBytes(32).toString('hex')`
- For sensitive data, publish only from server via `/mqtt/publish` — never trust client-published messages
- Server-side publish is metered and billed; client-side publish is not

### MQTT — Billing

Server-side publish (`POST /mqtt/publish`) is billed probabilistically: 5 credits per 10,000 messages. Client-side presence (enter/leave/sync) is free.

---

## AI Proxy (proxy.openkbs.com)

AI proxy that routes to OpenAI, Anthropic, and Google. Charges to project credits automatically — no vendor API keys needed.

### Routes

| Route | Vendor |
|-------|--------|
| `/v1/openai/*` | OpenAI |
| `/v1/anthropic/*` | Anthropic |
| `/v1/google/*` | Google |

### Authentication

Uses `OPENKBS_API_KEY` (injected automatically into elastic functions).

> **Important:** The proxy only accepts `Authorization: Bearer <OPENKBS_API_KEY>` for auth.
> The OpenAI SDK sends this header by default, but the Anthropic SDK sends `x-api-key`
> and the Google SDK sends `x-goog-api-key` — neither works with the proxy.
> You must add `headers: { Authorization: \`Bearer ${apiKey}\` }` when configuring
> Anthropic or Google providers (both Vercel AI SDK and direct SDKs).

### List Available Models

Fetch current models programmatically:

```javascript
// From the proxy (no auth required)
const res = await fetch('https://proxy.openkbs.com/v1/models');
const { models } = await res.json();
// models: [{ vendor, model, alias, inputPrice, outputPrice, contextWindow }]

// Or from the project API
const res2 = await fetch('https://project.openkbs.com/ai/models');
```

### Recommended: Vercel AI SDK

```javascript
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';

const apiKey = process.env.OPENKBS_API_KEY;

const openai = createOpenAI({
  baseURL: 'https://proxy.openkbs.com/v1/openai',
  apiKey,
});

// Note: baseURL includes /v1 because @ai-sdk/anthropic appends only /messages
// (the proxy needs the full path /v1/anthropic/v1/messages)
const anthropic = createAnthropic({
  baseURL: 'https://proxy.openkbs.com/v1/anthropic/v1',
  apiKey,
  headers: { Authorization: `Bearer ${apiKey}` },
});

const google = createGoogleGenerativeAI({
  baseURL: 'https://proxy.openkbs.com/v1/google',
  apiKey,
  headers: { Authorization: `Bearer ${apiKey}` },
});

const { text } = await generateText({
  model: openai('gpt-5.4-mini'),    // or anthropic('claude-sonnet-4-6')
  prompt: 'Hello!',                  // or google('gemini-3.1-flash-lite-preview')
});
```

> **Note:** Functions run on AWS Lambda which does not support streaming responses. Use `generateText` (not `streamText`). The response is returned as JSON.

### Alternative: Direct SDK

```javascript
// OpenAI SDK
import OpenAI from 'openai';
const client = new OpenAI({
  baseURL: 'https://proxy.openkbs.com/v1/openai',
  apiKey: process.env.OPENKBS_API_KEY,
});
const res = await client.chat.completions.create({
  model: 'gpt-5.4-mini',
  messages: [{ role: 'user', content: 'Hello!' }],
  max_completion_tokens: 1024,  // Note: newer models use this instead of max_tokens
});

// Anthropic SDK
import Anthropic from '@anthropic-ai/sdk';
const anthropicClient = new Anthropic({
  baseURL: 'https://proxy.openkbs.com/v1/anthropic',  // Direct SDK appends /v1/messages automatically
  apiKey: process.env.OPENKBS_API_KEY,
  defaultHeaders: { Authorization: `Bearer ${process.env.OPENKBS_API_KEY}` },
});
const msg = await anthropicClient.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Google Gemini (raw fetch — no official SDK wrapper needed)
const apiKey = process.env.OPENKBS_API_KEY;
const geminiRes = await fetch('https://proxy.openkbs.com/v1/google/models/gemini-3.1-flash-lite-preview:generateContent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Hello!' }] }],
    generationConfig: { maxOutputTokens: 1024 },
  }),
});
```

### Board (Task Management)

The project board is a Trello-like kanban system. The AI engine can act as a **Project Manager** — reading the board structure, creating tasks, moving them between columns, and leaving comments.

**Workflow:** Start with `openkbs board context` to get a compact digest of what's in flight (in-progress, blocked, recent, stale). Use `openkbs board show` with filters for targeted queries. Never dump the whole board — it can grow to thousands of cards over time.

```bash
# Orientation — a compact digest, NOT the full board
openkbs board context                  # in-progress + blocked + recent + stale + column counts

# Targeted listing with filters (all optional; archived hidden by default)
openkbs board show --assignee me                       # my active cards
openkbs board show --label urgent --priority high      # urgent & high-priority
openkbs board show --column "In Progress" --stale      # stale in-progress
openkbs board show --blocked                           # cards with open blockers
openkbs board show --q "auth flow"                     # search title + description
openkbs board show --archived                          # include archived too
openkbs board show --json                              # machine-readable for parsing

# Discover what filter values exist (run any of these before filtering)
openkbs board labels                                    # all labels in this project
openkbs board types                                     # all card types
openkbs board columns                                   # all columns
openkbs board members                                   # all project members (valid --assignee)

# Search (title, description, AND comment bodies)
openkbs board search "password reset"

# Card management
openkbs board card <cardId>                         # Read full card detail (description, checklist, comments, activity)
openkbs board edit <cardId>                         # Check out the card description to .openkbs/tmp/card-<id>.md
openkbs board save <cardId>                         # Commit local edits back to the card
openkbs board discard <cardId>                      # Throw away local edits without saving
openkbs board create <title> [-c <column>] [-t <type>] [-p <priority>] [-d <description>]
openkbs board update <cardId> [--title <t>] [--description <d>] [--priority <p>] [--status <s>]
openkbs board move <cardId> <columnName>           # Move card to column by name
openkbs board comment <cardId> <message>           # Add a comment to a card
openkbs board assign <cardId> <email>              # Assign a project member by email (or userId)
openkbs board unassign <cardId> <email>            # Remove an assignee
openkbs board archive <cardId>                     # Hide from default views (reversible)
openkbs board unarchive <cardId>                   # Restore archived card
openkbs board delete <cardId>                       # Permanent delete — only for mistakes/duplicates

# Link cards (blocks, blocked-by, duplicates, duplicated-by, parent-of, child-of, relates-to)
openkbs board link <fromId> <toId> --type <type>   # Create a link between two cards
openkbs board unlink <fromId> <toId> [--type <t>]  # Remove a specific link, or all links between the pair
openkbs board links <cardId>                       # Show all links on a card (outgoing + incoming)

**Editing large card descriptions — use checkout / save instead of `update --description`:**
`openkbs board update <id> --description "..."` rewrites the entire body and is
expensive for long cards (large token payload, easy to clobber unrelated
content). For any non-trivial edit use the checkout flow:

```bash
openkbs board edit 7d5349                  # writes .openkbs/tmp/card-<full-id>.md
# Then use your normal file-editing tools (Edit, Write) on that file to apply
# small, surgical changes — it's a plain markdown file.
openkbs board save 7d5349                  # uploads the new body, deletes the temp file
# or:
openkbs board discard 7d5349               # drop local changes
```

The AI should prefer `edit`/`save` whenever changing more than a line or two
of an existing description. It keeps token usage low and limits accidental
overwrites.
```

**Card types:** task, bug, feature, expert-request, spec
**Priorities:** low, medium, high, critical
**Active vs archived:** all cards are active by default; archive hides from views (reversible). Delete is for creation mistakes only.
**Default columns (new projects):** Backlog, In Progress, Review, Done. Existing projects created before this change keep their original columns — the change is not migrated.

**Card IDs:** short 8-character strings (e.g. `7d5349Ab`) printed by `openkbs board`. Pass them verbatim to every other command — no truncation, no prefix matching.

**"spec" card type:** In openkbs-studio, when the user approves a spec in Spec mode, the spec is persisted as a board card of type `spec` in the Backlog column (not as a file in `spec/`). The card's `description` holds the full spec markdown.

**Usage patterns for the AI engine:**

1. **Before starting work** — read the board, check for existing cards
2. **Starting a task** — create a card or move existing one to "In Progress"
3. **During work** — update checklist items, add progress comments
4. **Finishing work** — move card to "Review" or "Done", add summary comment
5. **Finding bugs** — create a bug card in "Backlog"
6. **Breaking down tasks** — create multiple cards from a large request

Example AI workflow:
```bash
# 1. Get oriented with a compact digest (not the full board)
openkbs board context

# 2. Before creating a card, check if one already exists
openkbs board search "login page"

# 3. Create a task for the current work
openkbs board create "Implement login page" -c "In Progress" -t task -p high

# 4. Add progress notes
openkbs board comment abc123 "Login form component created with email/password fields"

# 5. Move to Done when finished
openkbs board move abc123 "Done"

# 6. Later — archive old Done cards so the column doesn't grow unbounded
openkbs board archive abc123
```

### Image Generation

Generate images. Supports reference images for branding, editing, and style transfer.

```bash
# Generate image
openkbs image "A sunset over mountains" -o site/hero.png

# With reference images
openkbs image "Create a banner with this logo" --ref site/logo.png -o site/banner.png
openkbs image "Product photo in this brand style" --ref brand.png --ref product.jpg -o site/promo.png

# Fast mode (quicker, lighter quality)
openkbs image "Quick sketch" --fast -o site/sketch.png

# Options
openkbs image "Wide banner" --aspect-ratio 16:9 --count 4 -o site/banner.png
```

Options: `-o <file>`, `--ref <file>` (repeatable, up to 10), `--aspect-ratio`, `--count`, `--fast`

When user uploads images in chat, they are saved to `site/_tmp/` and can be used as `--ref` paths.

### Available Models

The set of available models, their vendors, and current pricing are kept
in the platform database — no hardcoded list. Before writing any AI
functionality (choosing a model, quoting credit costs, explaining options
to the user), fetch the live catalog:

```bash
openkbs models          # human-readable table
openkbs models --json   # machine-readable (parse this in scripts)
```

Each entry returns: `vendor`, `model`, `alias`, `inputPrice`, `outputPrice`,
`contextWindow`. Prices are in credits per 1K tokens; **100,000 credits = 1 EUR**.

Programmatic equivalent (same data): `GET https://project.openkbs.com/ai/models`
(public, no auth).

### Spec & Plan Mode

Spec mode and Plan mode work together as a two-phase product development workflow.
Specs define WHAT to build; plans define HOW to build it. Both are persisted to
the file system (version controlled) and linked from board cards (workflow tracking).

#### Spec Mode — Requirements Gathering

You are acting as a Product Manager gathering business requirements.

**Phase 1 — Interview.** Before writing anything, interview the user to reach
shared understanding. Walk down each branch of the design tree, resolving
dependencies between decisions one by one:
- Ask questions **one at a time** — don't dump a list
- For each question, **provide your recommended answer** so the user can simply agree or redirect
- If a question can be answered by reading existing code or files, read them instead of asking
- Cover: goals, target users, user workflows, business rules, edge cases, constraints, what's explicitly out of scope
- Keep going until you've resolved every open branch — don't rush to writing

**Phase 2 — Write the spec.** Once you have shared understanding, write the
specification in the plan file:
- Ask the user what they want to build — goals, features, user workflows
- Ask clarifying questions about business logic, edge cases, and constraints
- If there is existing code in the repo, read it to understand current state and capabilities
- Structure the spec as: Goals, Functional Requirements, User Stories, Acceptance Criteria, Constraints, Out of Scope
- Focus on WHAT to build, not HOW — implementation details belong in Plan mode (next step)

Write the specification in the plan file. When ready, call ExitPlanMode to
present it for approval. On approval, the system automatically:
- Saves the full spec to `spec/<feature-name>.md` (source of truth, version controlled)
- Creates a board card of type `spec` in Backlog with a summary and link to the file

Do NOT use Write/Edit to create spec files yourself — the system persists the
spec for you.

#### Plan Mode — Implementation Planning

Plan mode follows spec mode. The AI designs the technical implementation plan
for a previously approved spec. On plan approval, the system saves the plan to
`spec/<feature-name>/plan.md` alongside the spec file, then proceeds into code
mode.

#### File Structure

```
spec/
├── user-auth.md                ← requirements specification
├── user-auth/
│   └── plan.md                 ← implementation plan
├── payment-flow.md
└── payment-flow/
    └── plan.md
```

The `spec/` folder is the source of truth for business requirements. Board cards
track workflow status (Backlog → In Progress → Done) with a summary and a link
to the spec file. This way business knowledge survives card archiving and stays
in version control.
