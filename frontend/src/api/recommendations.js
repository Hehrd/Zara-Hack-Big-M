import { apiClient } from './client'

export async function createLocationRecommendations({ city, area, businessDescription, requestedResultCount }) {
  const { data } = await apiClient.post(
    '/api/location-recommendations',
    {
      city,
      area,
      business_description: businessDescription,
    },
    { params: { requested_result_count: requestedResultCount }, timeout: 180_000 },
  )
  return data
}
