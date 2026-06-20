import { apiClient } from './client'

export async function createLocationRecommendations({ city, businessDescription, requestedResultCount }) {
  const { data } = await apiClient.post(
    '/api/location-recommendations',
    {
      city,
      business_description: businessDescription,
      requested_result_count: requestedResultCount,
    },
    { timeout: 180_000 },
  )
  return data
}
