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

function recommendationsForArea(area, requestedCount = 3) {
  const hasPolygon = area?.type === 'polygon' && area.points?.length >= 3
  const heatmap = hasPolygon
    ? locationRecommendations.heatmap_layer.filter((location) => location.centroid && pointInPolygon(
      { lat: location.centroid.latitude, lng: location.centroid.longitude },
      area.points,
    ))
    : locationRecommendations.heatmap_layer
  return {
    ...locationRecommendations,
    heatmap_layer: heatmap,
    ranked_locations: [...heatmap].sort((a, b) => b.final_score - a.final_score).slice(0, requestedCount),
  }
}

export const handlers = [
  http.get('*/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('*/devices', () => HttpResponse.json(devices)),
  http.get('*/alerts', () => HttpResponse.json(alerts)),
  http.post('*/api/location-recommendations', async ({ request }) => {
    const body = await request.json()
    const requestedCount = Number(new URL(request.url).searchParams.get('requested_result_count')) || 3
    return HttpResponse.json(recommendationsForArea(body.area, Math.max(1, Math.min(20, requestedCount))))
  }),
]
