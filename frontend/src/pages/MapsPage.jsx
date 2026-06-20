import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { GoogleMapsOverlay } from '@deck.gl/google-maps'
import { GeoJsonLayer } from '@deck.gl/layers'
import { Building2, Compass, Eraser, Flag, LoaderCircle, MapPin, Rotate3D, Search, Sparkles, Trophy, TrendingDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { createLocationRecommendations } from '@/api/recommendations'

const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 }

// Diverging score ramp (low → high) over the deck.gl heatmap.
function scoreColor(t) {
  const clamped = Math.max(0, Math.min(1, t))
  const stops = [
    [30, 58, 138], // deep blue (low)
    [16, 185, 129], // emerald (mid)
    [250, 204, 21], // amber (high-mid)
    [239, 68, 68], // red (top)
  ]
  const scaled = clamped * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(scaled))
  const f = scaled - i
  const [a, b] = [stops[i], stops[i + 1]]
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ]
}

function toFeatureCollection(heatmap) {
  const scores = heatmap.map((s) => s.final_score)
  const max = Math.max(...scores, 0.000001)
  const min = Math.min(...scores, 0)
  const span = max - min || 1
  return {
    type: 'FeatureCollection',
    features: heatmap
      .filter((s) => s.geometry)
      .map((s) => ({
        type: 'Feature',
        geometry: s.geometry,
        properties: {
          lsoaCode: s.lsoa_code,
          lsoaName: s.lsoa_name,
          score: s.final_score,
          t: (s.final_score - min) / span,
        },
      })),
  }
}

function formatLayerName(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Fade the grid as the user zooms in so streets stay readable underneath.
// City view (zoom ~10) stays solid; street view (zoom ~16) becomes faint.
function zoomAlpha(zoom, is3D) {
  const base = is3D ? 210 : 150
  const min = is3D ? 70 : 45
  const t = Math.max(0, Math.min(1, (zoom - 10) / 6))
  return Math.round(base - (base - min) * t)
}

function buildHeatmapLayer(featureCollection, is3D, zoom, selectedCode, onPick) {
  const alpha = zoomAlpha(zoom, is3D)
  return new GeoJsonLayer({
    id: 'lsoa-heatmap',
    data: featureCollection,
    stroked: true,
    filled: true,
    extruded: is3D,
    getFillColor: (f) => [...scoreColor(f.properties.t), alpha],
    getLineColor: (f) => (f.properties.lsoaCode === selectedCode ? [255, 255, 255, 255] : [255, 255, 255, 60]),
    getLineWidth: (f) => (f.properties.lsoaCode === selectedCode ? 3 : 0.5),
    lineWidthUnits: 'pixels',
    getElevation: (f) => f.properties.t * 2600,
    lineWidthMinPixels: 0.5,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 90],
    onClick: (info) => onPick(info?.object?.properties ?? null),
    updateTriggers: {
      getFillColor: [alpha],
      getLineColor: [selectedCode],
      getLineWidth: [selectedCode],
    },
  })
}

export function MapsPage() {
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const mapsEventRef = useRef(null)
  const cameraTransitionListenerRef = useRef(null)
  const zoomListenerRef = useRef(null)

  const [mapError, setMapError] = useState('')
  const [is3D, setIs3D] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionTarget, setTransitionTarget] = useState(null)
  const [city, setCity] = useState('London')
  const [description, setDescription] = useState('A cozy independent specialty coffee shop for young professionals and students')
  const [selected, setSelected] = useState(null)
  const [zoom, setZoom] = useState(10)

  const recommend = useMutation({ mutationFn: createLocationRecommendations })
  const result = recommend.data
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID

  const featureCollection = useMemo(
    () => (result?.heatmap_layer ? toFeatureCollection(result.heatmap_layer) : null),
    [result],
  )

  useEffect(() => {
    let active = true
    loadGoogleMaps()
      .then(({ Map, mapsEvent }) => {
        if (!active || !mapElement.current) return
        mapsEventRef.current = mapsEvent
        // VECTOR routes through WebGLOverlayView, which Google disables without a valid
        // Map ID — leaving deck's canvas unsized and the heatmap invisible. Fall back to
        // RASTER unless a Map ID is configured (3D tilt also needs VECTOR + a Map ID).
        mapRef.current = new Map(mapElement.current, {
          center: LONDON_CENTER,
          zoom: 10,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          ...(mapId ? { mapId, renderingType: 'VECTOR' } : { renderingType: 'RASTER' }),
        })
        overlayRef.current = new GoogleMapsOverlay({ interleaved: false, layers: [] })
        overlayRef.current.setMap(mapRef.current)
        zoomListenerRef.current = mapsEvent.addListener(mapRef.current, 'zoom_changed', () => {
          setZoom(mapRef.current.getZoom())
        })
      })
      .catch((error) => active && setMapError(error.message))
    return () => {
      active = false
      cameraTransitionListenerRef.current?.remove()
      zoomListenerRef.current?.remove()
      overlayRef.current?.setMap(null)
    }
  }, [mapId])

  useEffect(() => {
    if (!overlayRef.current || !featureCollection) return
    overlayRef.current.setProps({ layers: [buildHeatmapLayer(featureCollection, is3D, zoom, selected?.lsoaCode, setSelected)] })
  }, [featureCollection, is3D, zoom, selected])

  useEffect(() => {
    const ranked = result?.ranked_locations ?? []
    if (featureCollection && ranked[0]?.centroid && mapRef.current) {
      mapRef.current.setCenter({ lat: ranked[0].centroid.latitude, lng: ranked[0].centroid.longitude })
      mapRef.current.setZoom(12)
    }
  }, [featureCollection, result])

  function handleSubmit(event) {
    event.preventDefault()
    const trimmedCity = city.trim()
    const trimmedDescription = description.trim()
    if (!trimmedCity || !trimmedDescription) return
    setSelected(null)
    recommend.mutate({ city: trimmedCity, businessDescription: trimmedDescription, requestedResultCount: 3 })
  }

  function toggle3D() {
    if (!mapRef.current || !mapId || isTransitioning) return
    const next = !is3D
    setIsTransitioning(true)
    setTransitionTarget(next ? '3D' : '2D')
    overlayRef.current?.setProps({ layers: [] })
    cameraTransitionListenerRef.current?.remove()
    cameraTransitionListenerRef.current = mapsEventRef.current.addListenerOnce(mapRef.current, 'idle', () => {
      setIs3D(next)
      setIsTransitioning(false)
      setTransitionTarget(null)
      cameraTransitionListenerRef.current = null
    })
    mapRef.current.setTilt(next ? 45 : 0)
    mapRef.current.setHeading(next ? 20 : 0)
  }

  function clearMap() {
    recommend.reset()
    setSelected(null)
    overlayRef.current?.setProps({ layers: [] })
    setIs3D(false)
    setIsTransitioning(false)
    setTransitionTarget(null)
    cameraTransitionListenerRef.current?.remove()
    cameraTransitionListenerRef.current = null
    mapRef.current?.setTilt(0)
    mapRef.current?.setHeading(0)
  }

  const explanationFor = (code) => result?.explanations?.find((e) => e.lsoa_code === code)
  const selectedExplanation = selected ? explanationFor(selected.lsoaCode) : null

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[680px] overflow-hidden lg:h-screen">
      <div ref={mapElement} className="absolute inset-0 bg-[#dfe5dc]" aria-label="Locus opportunity map" />
      {isTransitioning && <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/10 backdrop-blur-[1px]" role="status" aria-live="polite"><div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-5 py-3.5 shadow-xl"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><LoaderCircle className="size-5 animate-spin" /></span><div><p className="text-sm font-semibold">Switching to {transitionTarget} view</p><p className="mt-0.5 text-xs text-muted-foreground">Preparing the opportunity surface…</p></div></div></div>}
      {mapError && <div role="alert" className="absolute left-1/2 top-8 z-20 w-[min(90%,520px)] -translate-x-1/2 rounded-2xl border border-destructive/30 bg-white p-4 text-sm text-destructive shadow-xl">{mapError}</div>}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/12 to-transparent" />
      <div className="absolute right-4 top-4 z-20 flex gap-2 lg:right-6 lg:top-6">
        <Button variant="outline" className="bg-white/95 shadow-md backdrop-blur" onClick={clearMap} disabled={!result}><Eraser /> Clear map</Button>
        <Button variant="outline" className="bg-white/95 shadow-md backdrop-blur" onClick={toggle3D} disabled={!mapId || isTransitioning} title={mapId ? 'Toggle map tilt' : 'Add VITE_GOOGLE_MAPS_MAP_ID to enable 3D'}>{isTransitioning ? <LoaderCircle className="animate-spin" /> : <Rotate3D />} {isTransitioning ? 'Switching…' : is3D ? '2D view' : '3D view'}</Button>
      </div>

      <aside className="absolute inset-x-3 bottom-3 z-20 max-h-[72%] overflow-auto rounded-[24px] border bg-white/96 p-5 shadow-[0_24px_70px_-20px_rgba(14,35,27,.45)] backdrop-blur lg:inset-y-5 lg:left-5 lg:right-auto lg:max-h-none lg:w-[380px] lg:rounded-[28px] lg:p-6">
        <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Locus explorer</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Find your next area</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Describe your business and a city. We score every LSOA and map the best areas.</p></div><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Compass className="size-5" /></span></div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-medium">City
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-11 bg-white pl-10" placeholder="London" />
            </div>
            <span className="text-[11px] font-normal text-muted-foreground">Proof of concept: London has demographic data loaded. Other cities are accepted but have no layers yet.</span>
          </label>
          <label className="block space-y-2 text-sm font-medium">Business description
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-md border border-input bg-white p-3 pl-10 text-sm leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="e.g. A premium yoga studio targeting affluent professionals" />
            </div>
          </label>
          {recommend.error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{recommend.error.response?.data?.message || recommend.error.message}</p>}
          <Button type="submit" className="h-11 w-full" disabled={recommend.isPending || !description.trim() || !city.trim()}>{recommend.isPending ? <><LoaderCircle className="animate-spin" /> Building opportunity map…</> : <><Search /> Analyze this area</>}</Button>
        </form>

        {recommend.isPending && <p className="mt-4 text-xs leading-5 text-muted-foreground">Running the model, Google Places lookup, and the Spark scoring job across ~5,000 LSOAs. This can take up to a minute.</p>}

        {!result && !recommend.isPending && <div className="mt-6 rounded-2xl bg-[#f3f6f1] p-4"><div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-emerald-700" /> What happens next</div><p className="mt-2 text-xs leading-5 text-muted-foreground">The backend scores every area, returns a ranked surface, and Locus colors the map. Click any area to inspect its score.</p></div>}

        {result && <ResultPanel result={result} selected={selected} selectedExplanation={selectedExplanation} explanationFor={explanationFor} />}
      </aside>

      {result && (
        <div className="absolute bottom-[calc(72%+24px)] right-4 z-20 w-48 rounded-2xl border bg-white/94 p-3 text-xs shadow-lg backdrop-blur lg:bottom-6 lg:right-6">
          <div className="mb-2 font-medium">Opportunity score</div>
          <div className="h-2 w-full rounded-full" style={{ background: 'linear-gradient(90deg, rgb(30,58,138), rgb(16,185,129), rgb(250,204,21), rgb(239,68,68))' }} />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Low</span><span>High</span></div>
        </div>
      )}
    </div>
  )
}

function ResultPanel({ result, selected, selectedExplanation, explanationFor }) {
  return (
    <div className="mt-6 space-y-5 border-t pt-5">
      <div>
        <p className="text-xs text-muted-foreground">Detected business type</p>
        <p className="mt-1 text-sm font-semibold">{result.business_needs?.business_type}</p>
        {result.business_needs?.needs?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.business_needs.needs.map((need) => (
              <span key={need} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-800">{need}</span>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between gap-2"><div><p className="text-sm font-semibold">{selected.lsoaName}</p><p className="text-[11px] text-muted-foreground">{selected.lsoaCode}</p></div><span className="flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white"><Flag className="size-3" /> {Number(selected.score).toFixed(3)}</span></div>
          {selectedExplanation && <p className="mt-3 border-t pt-3 text-[11px] leading-5 text-slate-700">{selectedExplanation.explanation}</p>}
        </div>
      )}

      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><Trophy className="size-4 text-amber-500" /> Top {result.ranked_locations?.length} areas</p>
        {result.ranked_locations?.map((loc, index) => {
          const explanation = explanationFor(loc.lsoa_code)
          const weights = Object.entries(loc.weighted_layer_values || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
          return (
            <div key={loc.lsoa_code} className="rounded-2xl border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">#{index + 1} · {loc.lsoa_name}</p>
                  <p className="text-[11px] text-muted-foreground">{loc.lsoa_code}</p>
                </div>
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">{loc.final_score.toFixed(3)}</span>
              </div>
              {weights.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {weights.slice(0, 4).map(([id, value]) => (
                    <div key={id} className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">{formatLayerName(id)}</span>
                      <span className={value < 0 ? 'flex items-center gap-1 font-medium text-rose-600' : 'flex items-center gap-1 font-medium text-emerald-700'}>
                        {value < 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
                        {value.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {explanation && (
                <div className="mt-3 border-t pt-3">
                  <p className="text-[11px] leading-5 text-slate-700">{explanation.explanation}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${explanation.provider?.includes('Grok') ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{explanation.provider}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
