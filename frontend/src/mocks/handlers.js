import { http, HttpResponse } from 'msw'
import locationRecommendations from './locationRecommendations.fixture.json'

const devices = [
  { id: 'device-001', name: 'Warehouse Sensor', status: 'online', temperature: 22.4 },
  { id: 'device-002', name: 'Delivery Tracker', status: 'online', temperature: 19.8 },
  { id: 'device-003', name: 'Cold Storage Monitor', status: 'offline', temperature: 4.1 },
]

const alerts = [
  { id: 'alert-001', severity: 'high', message: 'Cold storage device is offline', deviceId: 'device-003' },
  { id: 'alert-002', severity: 'low', message: 'Tracker battery below 30%', deviceId: 'device-002' },
]

const mockUsers = new Map([
  ['frogo@locus.dev', { id: 1, email: 'frogo@locus.dev', password: null, createdAt: '2026-06-20T14:30:00.000Z' }],
])

function normalizeMockEmail(value) {
  const trimmed = String(value || '').trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.includes('@') ? trimmed : `${trimmed}@locus.dev`
}

function authError(status, error, message, path) {
  return HttpResponse.json({
    timestamp: new Date().toISOString(),
    status,
    error,
    message,
    path,
  }, { status })
}

function tokenPair(email) {
  const now = Date.now()
  return {
    tokenType: 'Bearer',
    accessToken: `mock-access-token:${email}:${now}`,
    accessTokenExpiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
    refreshToken: `mock-refresh-token:${email}:${now}`,
    refreshTokenExpiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

let nextAnalysisId = 1
let nextSavedRegionId = 1
const mockAnalyses = []
const mockSavedRegions = []

function normalizeTags(tags) {
  return Array.isArray(tags) ? tags.map((tag) => String(tag).trim()).filter(Boolean) : []
}

function pointInPolygon(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const intersects = ((a.lat > point.lat) !== (b.lat > point.lat))
      && point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng
    if (intersects) inside = !inside
  }
  return inside
}

function recommendationsForRegion({ city = 'London', businessDescription, region, requestedCount = 3 }) {
  // GeoJSON Polygon ([lng, lat] rings) -> {lat, lng} ring for point-in-polygon.
  const ring = region?.type === 'Polygon' && region.coordinates?.[0]?.length >= 4
    ? region.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
    : null
  const heatmap = ring
    ? locationRecommendations.heatmap_layer.filter((location) => location.centroid && pointInPolygon(
      { lat: location.centroid.latitude, lng: location.centroid.longitude },
      ring,
    ))
    : locationRecommendations.heatmap_layer
  return {
    ...locationRecommendations,
    city,
    business_needs: {
      ...locationRecommendations.business_needs,
      business_type: businessDescription || locationRecommendations.business_needs.business_type,
    },
    heatmap_layer: heatmap,
    ranked_locations: [...heatmap].sort((a, b) => b.final_score - a.final_score).slice(0, requestedCount),
  }
}

function toAnalysisSummary(analysis) {
  return {
    id: analysis.id,
    city: analysis.city,
    business_description: analysis.business_description,
    requested_result_count: analysis.requested_result_count,
    created_at: analysis.created_at,
  }
}

function savedRegionResponse(savedRegion) {
  const analysis = mockAnalyses.find((item) => item.id === savedRegion.analysis_id)
  const location = analysis?.result?.heatmap_layer?.find((item) => item.lsoa_code === savedRegion.lsoa_code)

  return {
    id: savedRegion.id,
    analysis_id: savedRegion.analysis_id,
    lsoa_code: savedRegion.lsoa_code,
    lsoa_name: location?.lsoa_name ?? savedRegion.lsoa_code,
    final_score: location?.final_score ?? 0,
    centroid_lat: location?.centroid?.latitude ?? null,
    centroid_lng: location?.centroid?.longitude ?? null,
    city: analysis?.city ?? 'London',
    business_description: analysis?.business_description ?? 'Mock analysis',
    requested_result_count: analysis?.requested_result_count ?? 3,
    notes: savedRegion.notes ?? null,
    tags: savedRegion.tags,
    created_at: savedRegion.created_at,
    updated_at: savedRegion.updated_at,
  }
}

export const handlers = [
  http.get('*/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('*/devices', () => HttpResponse.json(devices)),
  http.get('*/alerts', () => HttpResponse.json(alerts)),
  http.post('*/api/auth/signup', async ({ request }) => {
    const body = await request.json()
    const email = normalizeMockEmail(body.email)
    const password = String(body.password || '')

    if (!email || password.length < 8) {
      return authError(400, 'Bad Request', 'email and password are required; password must be at least 8 characters', '/api/auth/signup')
    }

    if (mockUsers.has(email)) {
      return authError(409, 'Conflict', 'User already exists', '/api/auth/signup')
    }

    const user = {
      id: mockUsers.size + 1,
      email,
      password,
      createdAt: new Date().toISOString(),
    }
    mockUsers.set(email, user)

    return HttpResponse.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    }, { status: 201 })
  }),
  http.post('*/api/auth/login', async ({ request }) => {
    const body = await request.json()
    const email = normalizeMockEmail(body.email)
    const password = String(body.password || '')
    let user = mockUsers.get(email)

    if (!email || !password) {
      return authError(401, 'Unauthorized', 'Invalid credentials', '/api/auth/login')
    }

    if (!user) {
      user = {
        id: mockUsers.size + 1,
        email,
        password: null,
        createdAt: new Date().toISOString(),
      }
      mockUsers.set(email, user)
    }

    if (user.password && user.password !== password) {
      return authError(401, 'Unauthorized', 'Invalid credentials', '/api/auth/login')
    }

    return HttpResponse.json(tokenPair(email))
  }),
  http.post('*/api/auth/refresh', async ({ request }) => {
    const body = await request.json()
    const refreshToken = String(body.refreshToken || '')
    const [, email] = refreshToken.split(':')

    if (!refreshToken.startsWith('mock-refresh-token:') || !mockUsers.has(email)) {
      return authError(401, 'Unauthorized', 'Invalid refresh token', '/api/auth/refresh')
    }

    return HttpResponse.json(tokenPair(email))
  }),
  http.post('*/api/auth/refresh-token', async ({ request }) => {
    const body = await request.json()
    const refreshToken = String(body.refreshToken || '')
    const [, email] = refreshToken.split(':')

    if (!refreshToken.startsWith('mock-refresh-token:') || !mockUsers.has(email)) {
      return authError(401, 'Unauthorized', 'Invalid refresh token', '/api/auth/refresh-token')
    }

    return HttpResponse.json(tokenPair(email))
  }),
  http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 204 })),
  http.get('*/api/analyze', () => HttpResponse.json([...mockAnalyses.map(toAnalysisSummary)].reverse())),
  http.get('*/api/analyze/:id', ({ params }) => {
    const analysis = mockAnalyses.find((item) => item.id === Number(params.id))
    if (!analysis) return authError(404, 'Not Found', 'Analysis not found', `/api/analyze/${params.id}`)
    return HttpResponse.json(analysis)
  }),
  http.get('*/api/saved-regions', () => HttpResponse.json([...mockSavedRegions.map(savedRegionResponse)].reverse())),
  http.post('*/api/saved-regions', async ({ request }) => {
    const body = await request.json()
    const analysisId = Number(body.analysis_id)
    const lsoaCode = String(body.lsoa_code || '')
    const analysis = mockAnalyses.find((item) => item.id === analysisId)
    const location = analysis?.result?.heatmap_layer?.find((item) => item.lsoa_code === lsoaCode)

    if (!analysis || !location) {
      return authError(404, 'Not Found', 'Analysis region not found', '/api/saved-regions')
    }

    const existing = mockSavedRegions.find((item) => item.analysis_id === analysisId && item.lsoa_code === lsoaCode)
    if (existing) return HttpResponse.json(savedRegionResponse(existing))

    const now = new Date().toISOString()
    const savedRegion = {
      id: nextSavedRegionId++,
      analysis_id: analysisId,
      lsoa_code: lsoaCode,
      notes: body.notes || null,
      tags: normalizeTags(body.tags),
      created_at: now,
      updated_at: now,
    }
    mockSavedRegions.push(savedRegion)

    return HttpResponse.json(savedRegionResponse(savedRegion), { status: 201 })
  }),
  http.put('*/api/saved-regions/:id', async ({ params, request }) => {
    const savedRegion = mockSavedRegions.find((item) => item.id === Number(params.id))
    if (!savedRegion) return authError(404, 'Not Found', 'Saved region not found', `/api/saved-regions/${params.id}`)

    const body = await request.json()
    savedRegion.notes = body.notes || null
    savedRegion.tags = normalizeTags(body.tags)
    savedRegion.updated_at = new Date().toISOString()

    return HttpResponse.json(savedRegionResponse(savedRegion))
  }),
  http.delete('*/api/saved-regions/:id', ({ params }) => {
    const index = mockSavedRegions.findIndex((item) => item.id === Number(params.id))
    if (index === -1) return authError(404, 'Not Found', 'Saved region not found', `/api/saved-regions/${params.id}`)
    mockSavedRegions.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('*/api/location-recommendations', async ({ request }) => {
    const body = await request.json()
    const requestedCount = Number(new URL(request.url).searchParams.get('count')) || 3
    const resultCount = Math.max(1, Math.min(20, requestedCount))
    const result = recommendationsForRegion({
      city: body.city || 'London',
      businessDescription: body.business_description,
      region: body.region,
      requestedCount: resultCount,
    })
    const now = new Date().toISOString()
    const analysis = {
      id: nextAnalysisId++,
      city: result.city,
      business_description: body.business_description || result.business_needs?.business_type || 'Mock analysis',
      requested_result_count: resultCount,
      region: body.region ?? null,
      result,
      created_at: now,
    }
    mockAnalyses.push(analysis)

    return HttpResponse.json({ analysis_id: analysis.id, ...result })
  }),
  // Keep development-only follow-up reads and cross-origin preflights inside
  // MSW. The production backend exposes this route as POST only.
  http.get('*/api/location-recommendations', ({ request }) => {
    const requestedCount = Number(new URL(request.url).searchParams.get('count')) || 3
    const resultCount = Math.max(1, Math.min(20, requestedCount))
    const latestAnalysis = mockAnalyses.at(-1)
    const result = latestAnalysis?.result ?? recommendationsForRegion({ requestedCount: resultCount })

    return HttpResponse.json({
      analysis_id: latestAnalysis?.id ?? null,
      ...result,
      ranked_locations: [...result.heatmap_layer]
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, resultCount),
    })
  }),
  http.options('*/api/location-recommendations', () => new HttpResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  })),
]
