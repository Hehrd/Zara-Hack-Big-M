import { delay, http, HttpResponse } from 'msw'

const devices = [
  { id: 'device-001', name: 'Warehouse Sensor', status: 'online', temperature: 22.4 },
  { id: 'device-002', name: 'Delivery Tracker', status: 'online', temperature: 19.8 },
  { id: 'device-003', name: 'Cold Storage Monitor', status: 'offline', temperature: 4.1 },
]

const alerts = [
  { id: 'alert-001', severity: 'high', message: 'Cold storage device is offline', deviceId: 'device-003' },
  { id: 'alert-002', severity: 'low', message: 'Tracker battery below 30%', deviceId: 'device-002' },
]

const mockUser = { id: 1, email: 'frogo', password: '123123123' }
const mockUsers = new Map([[mockUser.email, mockUser]])
const validRefreshTokens = new Set()

function mockTokenPair() {
  const refreshToken = `mock-refresh-${crypto.randomUUID()}`
  validRefreshTokens.add(refreshToken)
  return {
    tokenType: 'Bearer',
    accessToken: `mock-access-${crypto.randomUUID()}`,
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    refreshToken,
    refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
  }
}

// Development-only backend stand-in. Production scoring belongs in Spring Boot.
function buildDemoZones() {
  const positiveLine = [6, 95, 70, 110]
  const positiveFill = (weight) => [16, 185, 129, Math.round(38 + weight * 105)]
  const negativeFill = (weight) => [0, 0, 0, Math.round(weight * 210)]
  const transparentLine = [0, 0, 0, 0]
  return [
    { id: 'population-fit', weight: 0.8, impact: 'positive', geometry: 'circle', label: 'Population fit', reason: 'Strong concentration of potential customers in this catchment.', lat: 51.51, lng: -0.13, radiusMeters: 2100, fillColor: positiveFill(0.8), lineColor: positiveLine },
    { id: 'competitor-gap', weight: 0.65, impact: 'positive', geometry: 'circle', label: 'Competitor gap', reason: 'Lower direct-competitor presence than surrounding areas.', lat: 51.52, lng: -0.115, radiusMeters: 2000, fillColor: positiveFill(0.65), lineColor: positiveLine },
    { id: 'business-density', weight: 0.55, impact: 'positive', geometry: 'circle', label: 'Business density', reason: 'Healthy commercial activity supports regular local visits.', lat: 51.503, lng: -0.108, radiusMeters: 2050, fillColor: positiveFill(0.55), lineColor: positiveLine },
    { id: 'transport-corridor', weight: 0.7, impact: 'positive', geometry: 'polygon', label: 'Transport corridor', reason: 'This custom catchment follows well-connected streets and stations.', points: [{ lat: 51.526, lng: -0.13 }, { lat: 51.525, lng: -0.082 }, { lat: 51.505, lng: -0.072 }, { lat: 51.497, lng: -0.105 }, { lat: 51.509, lng: -0.142 }], fillColor: positiveFill(0.7), lineColor: positiveLine },
    { id: 'competitor-pressure', weight: 0.72, impact: 'negative', geometry: 'circle', label: 'Competitor pressure', reason: 'A dense cluster of direct competitors lowers the relative opportunity.', lat: 51.515, lng: -0.095, radiusMeters: 1450, fillColor: negativeFill(0.72), lineColor: transparentLine },
    { id: 'high-cost-zone', weight: 0.5, impact: 'negative', geometry: 'polygon', label: 'High occupancy cost', reason: 'This custom-shaped zone represents higher commercial occupancy pressure.', points: [{ lat: 51.518, lng: -0.155 }, { lat: 51.523, lng: -0.132 }, { lat: 51.51, lng: -0.115 }, { lat: 51.496, lng: -0.125 }, { lat: 51.499, lng: -0.157 }], fillColor: negativeFill(0.5), lineColor: transparentLine },
  ]
}

function distanceInMeters(from, to) {
  const toRadians = (value) => value * Math.PI / 180
  const earthRadius = 6_371_000
  const latitudeDelta = toRadians(to.lat - from.lat)
  const longitudeDelta = toRadians(to.lng - from.lng)
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function pointInPolygon(point, polygon) {
  let inside = false
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const a = polygon[current]
    const b = polygon[previous]
    const intersects = ((a.lat > point.lat) !== (b.lat > point.lat)) && (point.lng < (b.lng - a.lng) * (point.lat - a.lat) / (b.lat - a.lat) + a.lng)
    if (intersects) inside = !inside
  }
  return inside
}

function zoneContains(location, zone) {
  return zone.geometry === 'polygon' ? pointInPolygon(location, zone.points) : distanceInMeters(location, zone) <= zone.radiusMeters
}

function buildDemoSurface(zones) {
  const cells = []
  const origin = { lat: 51.511, lng: -0.112 }
  for (let row = -11; row <= 11; row += 1) {
    for (let column = -14; column <= 14; column += 1) {
      const location = { lat: origin.lat + row * 0.003, lng: origin.lng + column * 0.0048 }
      const matches = zones.filter((zone) => zoneContains(location, zone))
      const positiveWeight = matches.filter((zone) => zone.impact === 'positive').reduce((total, zone) => total + zone.weight, 0)
      if (positiveWeight === 0) continue
      const negativeWeight = matches.filter((zone) => zone.impact === 'negative').reduce((total, zone) => total + zone.weight, 0)
      const netWeight = Math.max(0, positiveWeight - negativeWeight)
      cells.push({
        id: `${row}-${column}`,
        ...location,
        heightMeters: 25 + netWeight * 420,
        fillColor: [16, 185, 129, Math.round(45 + Math.min(1, netWeight) * 120)],
      })
    }
  }
  return cells
}

export const handlers = [
  http.post('*/api/auth/signup', async ({ request }) => {
    const { email, password } = await request.json()
    await delay(300)
    if (!email || !password || password.length < 8) {
      return HttpResponse.json({ status: 400, error: 'Bad Request', message: 'Email and a password of at least 8 characters are required.', path: '/api/auth/signup' }, { status: 400 })
    }
    const normalizedEmail = email.trim().toLowerCase()
    if (mockUsers.has(normalizedEmail)) {
      return HttpResponse.json({ status: 409, error: 'Conflict', message: 'This account is already registered.', path: '/api/auth/signup' }, { status: 409 })
    }
    const user = { id: Date.now(), email: normalizedEmail, password }
    mockUsers.set(normalizedEmail, user)
    return HttpResponse.json({ id: user.id, email: user.email, createdAt: new Date().toISOString() }, { status: 201 })
  }),
  http.post('*/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json()
    await delay(300)
    const user = mockUsers.get(email.trim().toLowerCase())
    if (!user || password !== user.password) {
      return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Invalid username or password.', path: '/api/auth/login' }, { status: 401 })
    }
    return HttpResponse.json(mockTokenPair())
  }),
  http.post('*/api/auth/refresh', async ({ request }) => {
    const { refreshToken } = await request.json()
    if (!validRefreshTokens.delete(refreshToken)) {
      return HttpResponse.json({ status: 401, error: 'Unauthorized', message: 'Refresh token is invalid or expired.', path: '/api/auth/refresh' }, { status: 401 })
    }
    return HttpResponse.json(mockTokenPair())
  }),
  http.post('*/api/auth/logout', async ({ request }) => {
    const { refreshToken } = await request.json()
    validRefreshTokens.delete(refreshToken)
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('*/health', async () => {
    await delay(250)
    return HttpResponse.json({ status: 'ok' })
  }),
  http.get('*/devices', () => HttpResponse.json(devices)),
  http.get('*/alerts', () => HttpResponse.json(alerts)),
  http.post('*/analyses', async ({ request }) => {
    const input = await request.json()
    await delay(700)
    if (!input?.businessType || !input?.area) return HttpResponse.json({ message: 'Business type and area are required.' }, { status: 400 })
    const zones = buildDemoZones()
    return HttpResponse.json({
      id: 'analysis-london-demo',
      businessType: input.businessType,
      area: typeof input.area === 'string' ? input.area : input.area.label,
      center: typeof input.area === 'string' ? { lat: 51.5074, lng: -0.1278 } : input.area.points.reduce((center, point) => ({ lat: center.lat + point.lat / input.area.points.length, lng: center.lng + point.lng / input.area.points.length }), { lat: 0, lng: 0 }),
      zoom: 13,
      zones,
      surfaceCells: buildDemoSurface(zones),
    })
  }),
  http.get('*/analyses/:analysisId/area', async ({ params, request }) => {
    await delay(250)
    const url = new URL(request.url)
    const location = { lat: Number(url.searchParams.get('lat')), lng: Number(url.searchParams.get('lng')) }
    const matches = buildDemoZones()
      .filter((zone) => zoneContains(location, zone))
      .map(({ id, weight, impact, geometry, label, reason }) => ({ id, weight, impact, geometry, label, reason }))
    const positiveCount = matches.filter((match) => match.impact === 'positive').length
    const negativeCount = matches.filter((match) => match.impact === 'negative').length
    return HttpResponse.json({
      analysisId: params.analysisId,
      location,
      label: 'Selected map area',
      summary: matches.length ? `${positiveCount} positive and ${negativeCount} negative ${matches.length === 1 ? 'signal applies' : 'signals apply'} to this location.` : 'No opportunity signals cover this location.',
      matches,
    })
  }),
]
