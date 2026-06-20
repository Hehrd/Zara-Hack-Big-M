import pg from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const { Pool } = pg;

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    max: 1,
    idleTimeoutMillis: 120000,
});
let dbInitialized = false;

const s3 = new S3Client({ region: process.env.STORAGE_REGION || 'us-east-1' });

async function connectDB() {
    if (!dbInitialized) {
        dbInitialized = true;

        // Posts table
        await db.query(`
            CREATE TABLE IF NOT EXISTS posts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                user_name VARCHAR(255) NOT NULL,
                content TEXT,
                image_url TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        await db.query(`
            ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT
        `);

        // Messages table for private chat
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                from_user_id INTEGER NOT NULL,
                from_user_name VARCHAR(255) NOT NULL,
                to_user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
    }
}

/**
 * Publish an event to an MQTT channel via the v2 Project API.
 */
async function mqttPublish(channel, event, data) {
    const projectId = process.env.OPENKBS_PROJECT_ID;
    const apiKey = process.env.OPENKBS_API_KEY;

    if (!projectId || !apiKey) {
        console.log('OPENKBS_PROJECT_ID or OPENKBS_API_KEY not set, skipping mqtt publish');
        return null;
    }

    try {
        const response = await fetch(`https://project.openkbs.com/projects/${projectId}/mqtt/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ channel, event, data }),
        });
        return await response.json();
    } catch (e) {
        console.error('MQTT publish failed:', e);
        return null;
    }
}

export async function handler(event) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
    };

    // Handle OPTIONS preflight
    if (event.requestContext?.http?.method === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { action, content, imageUrl, userId, userName, fileName, contentType } = body;

        // getUploadUrl doesn't need DB connection
        if (action === 'getUploadUrl') {
            const bucket = process.env.STORAGE_BUCKET;
            if (!bucket) {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: 'Storage not configured' })
                };
            }

            // Generate unique key for the file
            // Key must match CloudFront path prefix (e.g., /media/* -> media/...)
            const timestamp = Date.now();
            const safeName = (fileName || 'image.jpg').replace(/[^a-zA-Z0-9.-]/g, '_');
            const key = `media/uploads/${timestamp}-${safeName}`;

            // Create presigned URL for PUT
            const command = new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                ContentType: contentType || 'image/jpeg'
            });

            const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

            // Use CloudFront URL - key already contains the path prefix (media/uploads/...)
            // Final URL: /media/uploads/filename.png
            const publicUrl = `/${key}`;

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ uploadUrl, publicUrl, key })
            };
        }

        // All other actions need DB
        await connectDB();

        if (action === 'list') {
            // Get latest 50 posts
            const result = await db.query(
                'SELECT id, user_id, user_name, content, image_url, created_at FROM posts ORDER BY created_at DESC LIMIT 50'
            );

            const posts = result.rows.map(row => ({
                id: row.id,
                userId: row.user_id,
                userName: row.user_name,
                content: row.content,
                imageUrl: row.image_url,
                createdAt: row.created_at
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ posts })
            };
        }

        if (action === 'create') {
            // Allow posts with just image (no content required)
            if (!content && !imageUrl) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Content or image required' })
                };
            }
            if (!userId || !userName) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing user info' })
                };
            }

            // Insert post with optional image
            const result = await db.query(
                'INSERT INTO posts (user_id, user_name, content, image_url) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
                [userId, userName, content || '', imageUrl || null]
            );

            const post = {
                id: result.rows[0].id,
                userId,
                userName,
                content: content || '',
                imageUrl: imageUrl || null,
                createdAt: result.rows[0].created_at
            };

            // Broadcast to MQTT
            const postPublish = await mqttPublish('posts', 'new_post', { post });
            console.log('Post publish result:', JSON.stringify(postPublish));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ post, debug: { postPublish } })
            };
        }

        // Send private message - publishes to recipient's SECRET channel
        if (action === 'sendMessage') {
            const { toUserId, message, fromUserId, fromUserName } = body;

            if (!toUserId || !message || !fromUserId || !fromUserName) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required fields' })
                };
            }

            // Look up recipient's PRIVATE channel (stored in users table)
            const recipientResult = await db.query(
                'SELECT private_channel, name FROM users WHERE id = $1',
                [toUserId]
            );

            if (recipientResult.rows.length === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Recipient not found' })
                };
            }

            const recipientChannel = recipientResult.rows[0].private_channel;

            // Store message in database
            const msgResult = await db.query(
                'INSERT INTO messages (from_user_id, from_user_name, to_user_id, content) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
                [fromUserId, fromUserName, toUserId, message]
            );

            const msgData = {
                id: msgResult.rows[0].id,
                fromUserId,
                fromUserName,
                toUserId,
                content: message,
                createdAt: msgResult.rows[0].created_at
            };

            // Publish to recipient's SECRET private channel
            // Only the recipient is subscribed to this channel!
            console.log('Publishing to private channel:', recipientChannel.substring(0, 8) + '...');
            const publishResult = await mqttPublish(recipientChannel, 'new_message', msgData);
            console.log('Publish result:', JSON.stringify(publishResult));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: msgData,
                    debug: {
                        recipientChannel: recipientChannel.substring(0, 16) + '...',
                        publishResult
                    }
                })
            };
        }

        // Get chat history with a specific user
        if (action === 'getMessages') {
            const { userId, withUserId } = body;

            const result = await db.query(
                `SELECT id, from_user_id, from_user_name, to_user_id, content, created_at
                 FROM messages
                 WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)
                 ORDER BY created_at ASC
                 LIMIT 100`,
                [userId, withUserId]
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    messages: result.rows.map(m => ({
                        id: m.id,
                        fromUserId: m.from_user_id,
                        fromUserName: m.from_user_name,
                        toUserId: m.to_user_id,
                        content: m.content,
                        createdAt: m.created_at
                    }))
                })
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
        };

    } catch (error) {
        console.error('Posts error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
}
