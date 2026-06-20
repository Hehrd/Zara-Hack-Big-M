let mapsPromise

export function loadGoogleMaps() {
  if (window.google?.maps?.Map) return Promise.resolve({ Map: window.google.maps.Map, Polygon: window.google.maps.Polygon, mapsEvent: window.google.maps.event })
  if (mapsPromise) return mapsPromise

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured.'))

  mapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__zarahackGoogleMapsReady'
    const script = document.createElement('script')
    window[callbackName] = () => {
      delete window[callbackName]
      resolve({ Map: window.google.maps.Map, Polygon: window.google.maps.Polygon, mapsEvent: window.google.maps.event })
    }
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&libraries=maps&callback=${callbackName}`
    script.async = true
    script.onerror = () => {
      delete window[callbackName]
      reject(new Error('Google Maps failed to load. Check the API key and referrer restrictions.'))
    }
    document.head.appendChild(script)
  })

  return mapsPromise
}
