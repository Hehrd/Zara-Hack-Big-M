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

export const handlers = [
  http.get('*/health', async () => {
    await delay(250)
    return HttpResponse.json({ status: 'ok' })
  }),
  http.get('*/devices', () => HttpResponse.json(devices)),
  http.get('*/alerts', () => HttpResponse.json(alerts)),
]
