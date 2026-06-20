# API Endpoints

Base URL for local development: `http://localhost:6969`

All endpoints below accept and return JSON unless stated otherwise. Authentication endpoints are public.

## Sign up

`POST /api/auth/signup`

Creates a user account. The email is trimmed, converted to lowercase, and must be unique.

Request shape:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- `email`: required, valid email
- `password`: required, 8-128 characters

Success - `201 Created`:

```json
{
  "id": 1,
  "email": "user@example.com",
  "createdAt": "2026-06-20T14:30:00Z"
}
```

Possible errors: `400 Bad Request`, `409 Conflict` when the email is already registered.

## Log in

`POST /api/auth/login`

Authenticates a user and issues an access/refresh token pair.

Request shape:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

- `email`: required, valid email
- `password`: required, 8-128 characters

Success - `200 OK`:

```json
{
  "tokenType": "Bearer",
  "accessToken": "<jwt>",
  "accessTokenExpiresAt": "2026-06-20T14:45:00Z",
  "refreshToken": "<refresh-token>",
  "refreshTokenExpiresAt": "2026-07-20T14:30:00Z"
}
```

Possible errors: `400 Bad Request`, `401 Unauthorized` for invalid credentials.

## Refresh tokens

`POST /api/auth/refresh`

Alias: `POST /api/auth/refresh-token`

Exchanges a valid refresh token for a new token pair.

Request shape:

```json
{
  "refreshToken": "<refresh-token>"
}
```

- `refreshToken`: required, non-blank string

Success - `200 OK`:

```json
{
  "tokenType": "Bearer",
  "accessToken": "<jwt>",
  "accessTokenExpiresAt": "2026-06-20T14:45:00Z",
  "refreshToken": "<new-refresh-token>",
  "refreshTokenExpiresAt": "2026-07-20T14:30:00Z"
}
```

Possible errors: `400 Bad Request`, `401 Unauthorized` when the refresh token is invalid, expired, or revoked.

## Log out

`POST /api/auth/logout`

Revokes a refresh token.

Request shape:

```json
{
  "refreshToken": "<refresh-token>"
}
```

- `refreshToken`: required, non-blank string

Success - `204 No Content` with an empty response body.

Possible errors: `400 Bad Request`, `401 Unauthorized` when the refresh token is invalid.

## Error response

Failed requests handled by the API use this shape:

```json
{
  "timestamp": "2026-06-20T14:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "email: must be a well-formed email address",
  "path": "/api/auth/signup"
}
```

Unexpected server failures return the same shape with `500 Internal Server Error`.

## Using an access token

For protected endpoints, send the access token in the HTTP header:

```http
Authorization: Bearer <jwt>
```

## Create an analysis

`POST /api/analyze`

Creates an analysis owned by the authenticated user. Requires an access token.

Request shape:

```json
{
  "analysis": [
    "Strong pedestrian traffic in the target area",
    "Limited direct competition nearby"
  ]
}
```

- `analysis`: required, non-empty array of non-blank strings

Success - `201 Created`:

```json
{
  "id": 1,
  "analysis": [
    "Strong pedestrian traffic in the target area",
    "Limited direct competition nearby"
  ],
  "createdAt": "2026-06-20T20:30:00Z",
  "updatedAt": "2026-06-20T20:30:00Z"
}
```

Possible errors: `400 Bad Request`, `401 Unauthorized`.

## List analyses

`GET /api/analyze`

Returns all analyses owned by the authenticated user, ordered from newest to oldest. Requires an access token.

Success - `200 OK`:

```json
[
  {
    "id": 1,
    "analysis": [
      "Strong pedestrian traffic in the target area",
      "Limited direct competition nearby"
    ],
    "createdAt": "2026-06-20T20:30:00Z",
    "updatedAt": "2026-06-20T20:30:00Z"
  }
]
```

Returns an empty array when the user has no analyses.

Possible errors: `401 Unauthorized`.

## Update an analysis

`PUT /api/analyze/{id}`

Replaces the analysis items for an analysis owned by the authenticated user. Requires an access token.

Request shape:

```json
{
  "analysis": [
    "Updated market observation",
    "Updated competitor observation"
  ]
}
```

- `id`: analysis ID from the URL
- `analysis`: required, non-empty array of non-blank strings

Success - `200 OK`:

```json
{
  "id": 1,
  "analysis": [
    "Updated market observation",
    "Updated competitor observation"
  ],
  "createdAt": "2026-06-20T20:30:00Z",
  "updatedAt": "2026-06-20T20:45:00Z"
}
```

Possible errors: `400 Bad Request`, `401 Unauthorized`, `404 Not Found` when the analysis does not exist or belongs to another user.

## Delete an analysis

`DELETE /api/analyze/{id}`

Deletes an analysis owned by the authenticated user. Requires an access token.

Success - `204 No Content` with an empty response body.

Possible errors: `401 Unauthorized`, `404 Not Found` when the analysis does not exist or belongs to another user.
