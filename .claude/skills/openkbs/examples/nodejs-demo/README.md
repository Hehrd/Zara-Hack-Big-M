# nodejs-demo

A social app demonstrating OpenKBS elastic services:

- **Auth** (functions/auth) -- User registration, login, MQTT token generation via Postgres
- **Posts** (functions/posts) -- Create/list posts with image uploads (S3), real-time broadcast (MQTT), and private chat messaging
- **Frontend** (site/index.html) -- React SPA with feed, presence, and private messaging over WebSocket

Requires: `postgres: true`, `storage: { "cloudfront": "media" }`, `mqtt: true`
