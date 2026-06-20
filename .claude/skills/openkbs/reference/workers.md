# Elastic Workers (Beta)

> **STATUS: BETA TESTING** — This feature is in beta. Use ONLY when the user explicitly requests heavy compute, workers, or EC2-based processing. Do NOT suggest or use workers unless the user specifically asks for it.

## What Are Workers?

Workers are on-demand EC2 instances for heavy workloads that exceed Lambda limits. They provide powerful machines with fast NVMe storage, pre-installed tools (FFmpeg, Python, ImageMagick), and the same environment variables as Lambda functions.

Use workers when:
- Processing requires more than 15 minutes (Lambda max)
- Need more than 6 vCPU or 10GB RAM
- Need fast local storage for large files (video, datasets)
- Need system tools like FFmpeg, ImageMagick, etc.

## Project Structure

```
./workers/<name>/
  index.mjs        # Entry point (Node.js)
  package.json     # Dependencies (npm install runs on instance boot)
```

## openkbs.json

```json
{
  "workers": [
    { "name": "video-processor", "instance": "16core", "timeout": 3600 }
  ]
}
```

## CLI Commands

```bash
openkbs worker deploy <name>                    # Deploy worker code
openkbs worker run <name> [-d '{"key":"val"}']  # Launch instance, run worker
openkbs worker debug <name> [-i <tier>] [-t <sec>]  # SSH into a debug instance (auto-terminates)
openkbs worker list                             # List deployed workers (tier, last deploy)
openkbs worker runs [name]                      # List recent runs WITH run ids (filter by worker name)
openkbs worker logs <runId|name>                # View run output. A worker name tails its LATEST run.
openkbs worker stop <runId>                     # Cancel and terminate
openkbs worker types                            # Show tiers and pricing
openkbs worker destroy <name>                   # Delete worker
```

## Instance Tiers

| Tier | vCPU | RAM | NVMe Storage | Credits/hr |
|------|------|-----|-------------|------------|
| `8core` | 8 | 16GB | 474GB | 210 |
| `16core` | 16 | 32GB | 950GB | 420 |
| `32core` | 32 | 64GB | 1.9TB | 840 |
| `64core` | 64 | 128GB | 3.8TB | 1,680 |

**Billing:** Per-second (60s minimum). Credits reserved for full timeout upfront, excess refunded when worker completes early.

**Max timeout:** 7200 seconds (2 hours).

## Environment Variables (same as Lambda)

Workers receive the same auto-injected env vars as Lambda functions:
- `STORAGE_BUCKET` — Project S3 bucket name
- `STORAGE_REGION` — Bucket region
- `DATABASE_URL` — Postgres connection string (if enabled)
- `OPENKBS_API_KEY` — API key for platform services (AI proxy, MQTT, etc.)
- `OPENKBS_PROJECT_ID` — Project short ID

Additional worker-only env vars:
- `SCRATCH` — Path to fast NVMe storage (use for temp files)

Plus any custom env vars passed via `-d` or the API.

## Pre-installed Tools

Node.js 24, FFmpeg, ffprobe, Python 3.12, ImageMagick, AWS CLI v2, jq, curl, wget

## Triggering from a Lambda Function

The typical pattern: a Lambda receives an API request or event, then triggers a worker for heavy processing.

```javascript
// functions/api/index.mjs
const projectId = process.env.OPENKBS_PROJECT_ID;
const apiKey = process.env.OPENKBS_API_KEY;

// Trigger worker
const res = await fetch(
  `https://project.openkbs.com/projects/${projectId}/worker/video-processor/run`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      tier: '16core',
      timeout: 3600,
      env: { ORDER_ID: orderId, CUSTOMER_NAME: name },
    }),
  }
);
const { runId, status, cost } = await res.json();
// Save runId, respond to user with "processing..."
```

## Worker Code Example

```javascript
// workers/video-processor/index.mjs
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createWriteStream, readFileSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';
import { join, basename } from 'path';
import pg from 'pg';

const s3 = new S3Client({ region: process.env.STORAGE_REGION });
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } });
const bucket = process.env.STORAGE_BUCKET;
const scratch = process.env.SCRATCH;
const orderId = process.env.ORDER_ID;

mkdirSync(join(scratch, 'input'), { recursive: true });
mkdirSync(join(scratch, 'output'), { recursive: true });

// 1. Download input files from S3 to fast NVMe
const objects = await s3.send(new ListObjectsV2Command({
  Bucket: bucket, Prefix: `uploads/${orderId}/`,
}));
for (const obj of objects.Contents || []) {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: obj.Key }));
  await pipeline(res.Body, createWriteStream(join(scratch, 'input', basename(obj.Key))));
}

// 2. Process with FFmpeg (or any system tool)
execSync(`ffmpeg -i ${scratch}/input/raw.mp4 -c:v libx264 -preset slow ${scratch}/output/result.mp4`);

// 3. Upload result to S3
await s3.send(new PutObjectCommand({
  Bucket: bucket,
  Key: `processed/${orderId}/result.mp4`,
  Body: readFileSync(join(scratch, 'output', 'result.mp4')),
  ContentType: 'video/mp4',
}));

// 4. Update database
await db.query('UPDATE orders SET status=$1, completed_at=now() WHERE id=$2', ['completed', orderId]);

// 5. Send real-time notification via MQTT
await fetch(`https://project.openkbs.com/projects/${process.env.OPENKBS_PROJECT_ID}/mqtt/publish`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENKBS_API_KEY}`,
  },
  body: JSON.stringify({
    channel: `order-${orderId}`,
    event: 'completed',
    data: { videoUrl: `processed/${orderId}/result.mp4` },
  }),
});

await db.end();
console.log('Done');
```

## How Workers Differ from Functions

| | Functions (Lambda) | Workers (EC2) |
|---|---|---|
| Max timeout | 900s (15 min) | 7200s (2 hours) |
| Max memory | 10GB | 128GB |
| CPU | Up to 6 vCPU | Up to 64 vCPU |
| Local storage | 512MB /tmp | Up to 3.8TB NVMe |
| Tools | Node.js only | FFmpeg, Python, ImageMagick... |
| Startup | ~100ms | ~30s |
| Billing | Per-invocation | Per-second |
| Use for | API, triggers, quick tasks | Video, data, ML, batch |

## Debug Mode (interactive SSH)

> Use when a worker misbehaves and you need to reproduce it **inside the real
> environment**. Requires the worker to be deployed first (`openkbs worker deploy <name>`).

```bash
openkbs worker debug <name> [-i <tier>] [-t <seconds>]
```

Launches a worker EC2 in **debug mode**: the worker bundle is downloaded and staged at
`/opt/worker` (dependencies installed) but **not run**, an ephemeral SSH key is generated,
and you get a ready-to-use `ssh` command. The instance **auto-terminates** after the
timeout no matter what (default 30 min, max 2 h), and credits are reserved upfront and
refunded on stop — so a forgotten debug box cannot run up a bill.

Options:
- `-i, --instance <tier>` — tier (`8core`/`16core`/`32core`/`64core`, default `8core`)
- `-t, --timeout <sec>` — hard auto-terminate timeout (default `1800`, max `7200`)

Workflow:

```bash
openkbs worker debug video-processor -i 16core -t 1800
# → prints:  ssh -i <key> ec2-user@<ip>

ssh -i <key> -o StrictHostKeyChecking=no ec2-user@<ip>   # connect (retry once if refused)

# on the instance:
cd /opt/worker
source .env.sh        # load the exact worker env (OPENKBS_API_KEY, DATABASE_URL, SCRATCH, ...)
node index.mjs        # run the worker by hand — observe, edit, re-run, iterate

exit
openkbs worker stop <runId>   # terminate early (optional; it auto-kills at the timeout)
```

Notes:
- SSH is locked to your current IP only; the key lives in `~/.openkbs/debug-keys/`.
- All pre-installed tools (FFmpeg, ffprobe, Python, ImageMagick, AWS CLI) are available.
- Editing files on the box is for experimentation. To **persist** a fix, change the code in
  your `workers/<name>/` directory and `openkbs worker deploy <name>`. Pulling edited files
  back out of the instance is manual (e.g. `scp`).

## API Reference

All endpoints require `Authorization: Bearer <projectJWT or apiKey>` except where noted.

```
GET    /worker/types                                          # Public, no auth — list tiers
GET    /projects/{id}/worker                                  # List deployed workers
POST   /projects/{id}/worker/{name}                           # Deploy worker (body: {code: "base64zip"})
DELETE /projects/{id}/worker/{name}                           # Delete worker
POST   /projects/{id}/worker/{name}/run                       # Run worker (body: {tier?, timeout?, env?})
POST   /projects/{id}/worker/{name}/debug                     # Debug worker, SSH access (body: {tier?, timeout?, publicKey})
GET    /projects/{id}/worker/runs                             # List recent runs
GET    /projects/{id}/worker/run/{runId}                      # Get run status
POST   /projects/{id}/worker/run/{runId}/stop                 # Stop and terminate
GET    /projects/{id}/worker/run/{runId}/logs                 # Get run logs
POST   /projects/{id}/worker/run/{runId}/callback             # Internal: EC2 instance reports completion
```

### Deploy body
```json
{ "code": "<base64-encoded zip of worker directory>" }
```

### Run body
```json
{
  "tier": "8core",
  "timeout": 600,
  "env": { "CUSTOM_VAR": "value" }
}
```
`tier` defaults to `8core`, `timeout` defaults to `600` (seconds).
