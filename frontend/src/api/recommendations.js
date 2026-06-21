import { apiClient } from './client'

export async function createLocationRecommendations({ city, region, businessDescription, requestedResultCount }) {
  const { data } = await apiClient.post(
    '/api/location-recommendations',
    {
      city,
      business_description: businessDescription,
      region,
    },
    { params: { count: requestedResultCount }, timeout: 180_000 },
  )
  return data
}
