import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { GoogleMapsOverlay } from '@deck.gl/google-maps'
import { GeoJsonLayer } from '@deck.gl/layers'
import { Bookmark, BookmarkCheck, Building2, Compass, Eraser, Flag, GitCompareArrows, LoaderCircle, MapPin, Rotate3D, Sparkles, Trophy, TrendingDown, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loadGoogleMaps } from '@/lib/googleMaps'
import { createLocationRecommendations } from '@/api/recommendations'
import { useAnalysis } from '@/hooks/useAnalyses'
import { useSaveRegion } from '@/hooks/useSavedRegions'

const routeApi = getRouteApi('/maps')

const LONDON_CENTER = { lat: 51.5074, lng: -0.1278 }

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

// Closed GeoJSON Polygon ([lng, lat] order) for the backend's region filter.
function pointsToGeoJsonPolygon(points) {
  const ring = points.map((p) => [p.lng, p.lat])
  ring.push([points[0].lng, points[0].lat])
  return { type: 'Polygon', coordinates: [ring] }
}

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
function zoomAlpha(zoom) {
  const base = 150
  const min = 45
  const t = Math.max(0, Math.min(1, (zoom - 10) / 6))
  return Math.round(base - (base - min) * t)
}

function buildHeatmapLayer(featureCollection, is3D, zoom, selectedCode, comparisonCodes, onPick) {
  const alpha = zoomAlpha(zoom)
  return new GeoJsonLayer({
    id: 'lsoa-heatmap',
    data: featureCollection,
    stroked: true,
    filled: true,
    extruded: is3D,
    // Adjacent polygons generate coincident side faces. Cull the inward-facing
    // copy so those walls do not fight for the same depth while the map moves.
    parameters: { cullMode: 'back' },
    // Suppress low-value areas so peaks read as recommendations instead of a
    // uniformly busy field. The zoom fade still applies to the whole surface.
    getFillColor: (f) => {
      const prominence = is3D ? 0.22 + 0.78 * Math.pow(f.properties.t, 1.7) : 1
      return [...scoreColor(f.properties.t), Math.round(alpha * prominence)]
    },
    getLineColor: (f) => {
      if (f.properties.lsoaCode === selectedCode) return [255, 255, 255, 255]
      if (comparisonCodes.includes(f.properties.lsoaCode)) return [52, 211, 153, 255]
      return is3D ? [255, 255, 255, 0] : [255, 255, 255, 60]
    },
    getLineWidth: (f) => (f.properties.lsoaCode === selectedCode || comparisonCodes.includes(f.properties.lsoaCode) ? 3 : is3D ? 0 : 0.5),
    lineWidthUnits: 'pixels',
    // A nonlinear scale creates distinct peaks instead of giving every area a
    // similarly tall wall. Keep a small base so low areas remain discoverable.
    getElevation: (f) => is3D ? 80 + Math.pow(f.properties.t, 2.4) * 4200 : 0,
    lineWidthMinPixels: 0.5,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 90],
    onClick: (info) => onPick(info?.object?.properties ?? null),
    updateTriggers: {
      getFillColor: [alpha, is3D],
      getLineColor: [selectedCode, comparisonCodes, is3D],
      getLineWidth: [selectedCode, comparisonCodes, is3D],
      getElevation: [is3D],
    },
  })
}

export function MapsPage() {
  const navigate = useNavigate()
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const mapsEventRef = useRef(null)
  const cameraTransitionListenerRef = useRef(null)
  const zoomListenerRef = useRef(null)
  const areaModeRef = useRef('city')
  const polygonConstructorRef = useRef(null)
  const selectionPolygonRef = useRef(null)
  const polygonPathListenersRef = useRef([])
  const openRegionMenuRef = useRef(null)

  const [mapError, setMapError] = useState('')
  const [is3D, setIs3D] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionTarget, setTransitionTarget] = useState(null)
  const [city, setCity] = useState('London')
  const [description, setDescription] = useState('A cozy independent specialty coffee shop for young professionals and students')
  const [selected, setSelected] = useState(null)
  const [zoom, setZoom] = useState(10)
  const [minimumScore, setMinimumScore] = useState(null)
  const [areaMode, setAreaMode] = useState('city')
  const [customPoints, setCustomPoints] = useState([])
  const [submittedAreaPoints, setSubmittedAreaPoints] = useState([])
  const [requestedResultCount, setRequestedResultCount] = useState(3)
  const [submittedResultCount, setSubmittedResultCount] = useState(3)
  const [comparisonAreas, setComparisonAreas] = useState([])
  const [isComparisonOpen, setIsComparisonOpen] = useState(false)
  const [regionContextMenu, setRegionContextMenu] = useState(null)

  const { analysis: analysisParam } = routeApi.useSearch()
  const storedAnalysis = useAnalysis(analysisParam)
  const saveRegion = useSaveRegion()
  const [savedCodes, setSavedCodes] = useState(() => new Set())

  const recommend = useMutation({ mutationFn: createLocationRecommendations })
  const rawResult = recommend.data ?? storedAnalysis.data?.result ?? undefined
  const analysisId = recommend.data?.analysis_id ?? storedAnalysis.data?.id ?? null
  const result = useMemo(() => {
    if (!rawResult || submittedAreaPoints.length < 3) return rawResult
    const contains = (area) => area.centroid && pointInPolygon(
      { lat: area.centroid.latitude, lng: area.centroid.longitude },
      submittedAreaPoints,
    )
    const heatmap = rawResult.heatmap_layer?.filter(contains) ?? []
    const allowedCodes = new Set(heatmap.map((area) => area.lsoa_code))
    return {
      ...rawResult,
      heatmap_layer: heatmap,
      ranked_locations: heatmap
        .filter((area) => allowedCodes.has(area.lsoa_code))
        .sort((a, b) => b.final_score - a.final_score)
        .slice(0, submittedResultCount),
    }
  }, [rawResult, submittedAreaPoints, submittedResultCount])
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID

  const featureCollection = useMemo(
    () => (result?.heatmap_layer ? toFeatureCollection(result.heatmap_layer) : null),
    [result],
  )
  const scoreRange = useMemo(() => {
    const scores = result?.heatmap_layer?.map((area) => area.final_score) ?? []
    if (!scores.length) return null
    return { min: Math.min(...scores), max: Math.max(...scores) }
  }, [result])
  const effectiveMinimumScore = minimumScore ?? scoreRange?.min ?? null
  const visibleFeatureCollection = useMemo(() => {
    if (!featureCollection || effectiveMinimumScore === null) return featureCollection
    return {
      ...featureCollection,
      features: featureCollection.features.filter((feature) => feature.properties.score >= effectiveMinimumScore),
    }
  }, [featureCollection, effectiveMinimumScore])

  useEffect(() => {
    let active = true
    let contextMenuHandler
    const mapContainer = mapElement.current
    if (!mapContainer) return undefined
    loadGoogleMaps()
      .then(({ Map, Polygon, mapsEvent }) => {
        if (!active) return
        mapsEventRef.current = mapsEvent
        polygonConstructorRef.current = Polygon
        // VECTOR routes through WebGLOverlayView, which Google disables without a valid
        // Map ID — leaving deck's canvas unsized and the heatmap invisible. Fall back to
        // RASTER unless a Map ID is configured (3D tilt also needs VECTOR + a Map ID).
        mapRef.current = new Map(mapContainer, {
          center: LONDON_CENTER,
          zoom: 10,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          ...(mapId ? { mapId, renderingType: 'VECTOR' } : { renderingType: 'RASTER' }),
        })
        overlayRef.current = new GoogleMapsOverlay({ interleaved: false, layers: [] })
        overlayRef.current.setMap(mapRef.current)
        contextMenuHandler = (event) => {
          const bounds = mapContainer.getBoundingClientRect()
          if (!overlayRef.current) return
          const picked = overlayRef.current.pickObject({ x: event.clientX - bounds.left, y: event.clientY - bounds.top, radius: 4 })
          if (!picked?.object?.properties) return
          event.preventDefault()
          openRegionMenuRef.current?.(picked.object.properties, event.clientX, event.clientY)
        }
        mapContainer.addEventListener('contextmenu', contextMenuHandler, true)
        zoomListenerRef.current = mapsEvent.addListener(mapRef.current, 'zoom_changed', () => {
          setZoom(mapRef.current.getZoom())
        })
        mapsEvent.addListener(mapRef.current, 'click', (event) => {
          if (areaModeRef.current !== 'custom') return
          if (!selectionPolygonRef.current) {
            selectionPolygonRef.current = new polygonConstructorRef.current({
              map: mapRef.current,
              paths: [[event.latLng]],
              editable: true,
              fillColor: '#10b981',
              fillOpacity: 0.12,
              strokeColor: '#047857',
              strokeOpacity: 0.9,
              strokeWeight: 2,
            })
            const path = selectionPolygonRef.current.getPath()
            const syncPoints = () => setCustomPoints(path.getArray().map((point) => ({ lat: point.lat(), lng: point.lng() })))
            polygonPathListenersRef.current = ['insert_at', 'set_at', 'remove_at'].map((name) => mapsEvent.addListener(path, name, syncPoints))
            const deleteVertex = (polygonEvent) => {
              polygonEvent.domEvent?.preventDefault()
              if (polygonEvent.vertex === undefined || polygonEvent.vertex === null) return
              path.removeAt(polygonEvent.vertex)
            }
            // `contextmenu` replaces the deprecated `rightclick` event in newer
            // Google Maps builds; keep both for compatibility with older builds.
            polygonPathListenersRef.current.push(
              mapsEvent.addListener(selectionPolygonRef.current, 'contextmenu', deleteVertex),
              mapsEvent.addListener(selectionPolygonRef.current, 'rightclick', deleteVertex),
            )
            syncPoints()
          } else {
            selectionPolygonRef.current.getPath().push(event.latLng)
          }
        })
      })
      .catch((error) => active && setMapError(error.message))
    return () => {
      active = false
      cameraTransitionListenerRef.current?.remove()
      zoomListenerRef.current?.remove()
      polygonPathListenersRef.current.forEach((listener) => listener.remove())
      selectionPolygonRef.current?.setMap(null)
      if (contextMenuHandler) mapContainer.removeEventListener('contextmenu', contextMenuHandler, true)
      overlayRef.current?.setMap(null)
    }
  }, [mapId])

  useEffect(() => {
    if (!overlayRef.current || !visibleFeatureCollection) return
    overlayRef.current.setProps({ layers: [buildHeatmapLayer(visibleFeatureCollection, is3D, zoom, selected?.lsoaCode, comparisonAreas.map((area) => area.lsoa_code), setSelected)] })
  }, [visibleFeatureCollection, is3D, zoom, selected, comparisonAreas])

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
    setComparisonAreas([])
    setIsComparisonOpen(false)
    setMinimumScore(null)
    setSubmittedAreaPoints(areaMode === 'custom' ? customPoints : [])
    const region = areaMode === 'custom' && customPoints.length >= 3
      ? pointsToGeoJsonPolygon(customPoints)
      : undefined
    const resultCount = Math.max(1, Math.min(20, Number(requestedResultCount) || 1))
    setRequestedResultCount(resultCount)
    setSubmittedResultCount(resultCount)
    recommend.mutate({ city: trimmedCity, region, businessDescription: trimmedDescription, requestedResultCount: resultCount })
    if (areaMode === 'custom') clearCustomArea()
  }

  function clearCustomArea() {
    polygonPathListenersRef.current.forEach((listener) => listener.remove())
    polygonPathListenersRef.current = []
    selectionPolygonRef.current?.setMap(null)
    selectionPolygonRef.current = null
    setCustomPoints([])
  }

  function changeAreaMode(mode) {
    setAreaMode(mode)
    areaModeRef.current = mode
    if (mode === 'city') clearCustomArea()
  }

  function undoCustomPoint() {
    selectionPolygonRef.current?.getPath()?.pop()
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
    mapRef.current.setTilt(next ? 55 : 0)
    mapRef.current.setHeading(next ? 20 : 0)
  }

  function adjustTilt(delta) {
    if (!mapRef.current || !is3D) return
    const current = mapRef.current.getTilt() ?? 55
    mapRef.current.setTilt(Math.max(20, Math.min(67.5, current + delta)))
  }

  function rotateMap(delta) {
    if (!mapRef.current || !is3D) return
    const current = mapRef.current.getHeading() ?? 0
    mapRef.current.setHeading((current + delta + 360) % 360)
  }

  function showRankedLocation(location) {
    setSelected({
      lsoaCode: location.lsoa_code,
      lsoaName: location.lsoa_name,
      score: location.final_score,
    })
    if (!mapRef.current || !location.centroid) return
    mapRef.current.panTo({
      lat: location.centroid.latitude,
      lng: location.centroid.longitude,
    })
    mapRef.current.setZoom(14)
  }

  function toggleComparisonArea(location) {
    const code = location.lsoa_code ?? location.lsoaCode
    const fullLocation = result?.heatmap_layer?.find((area) => area.lsoa_code === code) ?? location
    setIsComparisonOpen(true)
    setComparisonAreas((current) => {
      if (current.some((area) => area.lsoa_code === code)) return current.filter((area) => area.lsoa_code !== code)
      return [...current, fullLocation]
    })
  }

  function openComparison() {
    if (comparisonAreas.length < 2) return
    sessionStorage.setItem('locus-region-comparison', JSON.stringify({
      areas: comparisonAreas,
      categories: result?.selected_categories ?? [],
      businessType: result?.business_needs?.business_type ?? '',
    }))
    navigate({ to: '/compare' })
  }

  openRegionMenuRef.current = (location, x, y) => {
    const code = location.lsoa_code ?? location.lsoaCode
    const fullLocation = result?.heatmap_layer?.find((area) => area.lsoa_code === code) ?? location
    setRegionContextMenu({
      x: Math.max(8, Math.min(x, window.innerWidth - 232)),
      y: Math.max(8, Math.min(y, window.innerHeight - 150)),
      location: fullLocation,
    })
  }

  function clearMap() {
    recommend.reset()
    setSelected(null)
    setSavedCodes(new Set())
    setComparisonAreas([])
    setIsComparisonOpen(false)
    setMinimumScore(null)
    setSubmittedAreaPoints([])
    clearCustomArea()
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

  function handleSaveRegion(region) {
    if (!analysisId || !region) return
    saveRegion.mutate(
      { analysisId, lsoaCode: region.lsoaCode },
      { onSuccess: () => setSavedCodes((prev) => new Set(prev).add(region.lsoaCode)) },
    )
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[680px] overflow-hidden lg:h-screen">
      <div ref={mapElement} className="absolute inset-0 bg-[#dfe5dc]" aria-label="Locus opportunity map" />
      {regionContextMenu && <>
        <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setRegionContextMenu(null)} aria-label="Close region menu" />
        <div className="fixed z-50 w-56 overflow-hidden rounded-xl border bg-white p-1.5 text-sm shadow-2xl" style={{ left: regionContextMenu.x, top: regionContextMenu.y }} role="menu">
          <div className="border-b px-2.5 py-2"><p className="truncate text-xs font-semibold">{regionContextMenu.location.lsoa_name ?? regionContextMenu.location.lsoaName}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{regionContextMenu.location.lsoa_code ?? regionContextMenu.location.lsoaCode}</p></div>
          <button type="button" role="menuitem" className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-muted" onClick={() => { toggleComparisonArea(regionContextMenu.location); setRegionContextMenu(null) }}><GitCompareArrows className="size-4 text-emerald-700" />{comparisonAreas.some((area) => area.lsoa_code === (regionContextMenu.location.lsoa_code ?? regionContextMenu.location.lsoaCode)) ? 'Remove from compare' : 'Add to compare'}</button>
          {(() => {
            const code = regionContextMenu.location.lsoa_code ?? regionContextMenu.location.lsoaCode
            const isSaved = savedCodes.has(code)
            const isSaving = saveRegion.isPending && saveRegion.variables?.lsoaCode === code
            return (
              <button type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50" disabled={!analysisId || isSaved || isSaving} onClick={() => { handleSaveRegion({ lsoaCode: code }); setRegionContextMenu(null) }}>
                {isSaved ? <BookmarkCheck className="size-4 text-emerald-700" /> : <Bookmark className="size-4 text-emerald-700" />}
                {isSaved ? 'Saved' : isSaving ? 'Saving…' : 'Save region'}
                {!analysisId && !isSaved && <span className="ml-auto text-[9px] uppercase tracking-wide text-muted-foreground">Run first</span>}
              </button>
            )
          })()}
        </div>
      </>}
      {isTransitioning && <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/10 backdrop-blur-[1px]" role="status" aria-live="polite"><div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-5 py-3.5 shadow-xl"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><LoaderCircle className="size-5 animate-spin" /></span><div><p className="text-sm font-semibold">Switching to {transitionTarget} view</p><p className="mt-0.5 text-xs text-muted-foreground">Preparing the opportunity surface…</p></div></div></div>}
      {mapError && <div role="alert" className="absolute left-1/2 top-8 z-20 w-[min(90%,520px)] -translate-x-1/2 rounded-2xl border border-destructive/30 bg-white p-4 text-sm text-destructive shadow-xl">{mapError}</div>}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/12 to-transparent" />
      <div className="absolute right-4 top-4 z-20 flex gap-2 lg:right-6 lg:top-6">
        <Button variant="outline" className="bg-white/95 shadow-md backdrop-blur" onClick={clearMap} disabled={!result}><Eraser /> Clear map</Button>
        <Button variant="outline" className="bg-white/95 shadow-md backdrop-blur" onClick={toggle3D} disabled={!mapId || isTransitioning} title={mapId ? 'Toggle map tilt' : 'Add VITE_GOOGLE_MAPS_MAP_ID to enable 3D'}>{isTransitioning ? <LoaderCircle className="animate-spin" /> : <Rotate3D />} {isTransitioning ? 'Switching…' : is3D ? '2D view' : '3D view'}</Button>
      </div>
      {is3D && !isTransitioning && <div className="absolute right-4 top-16 z-20 flex items-center gap-1 rounded-xl border bg-white/95 p-1 shadow-md backdrop-blur lg:right-6 lg:top-[4.75rem]" aria-label="3D camera controls">
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => rotateMap(-15)} title="Rotate left" aria-label="Rotate left">↶</Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => adjustTilt(-7.5)} title="Lower camera tilt">Tilt −</Button>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => adjustTilt(7.5)} title="Raise camera tilt">Tilt +</Button>
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => rotateMap(15)} title="Rotate right" aria-label="Rotate right">↷</Button>
      </div>}

      <aside className="absolute inset-x-3 bottom-3 z-20 max-h-[72%] overflow-auto rounded-[24px] border bg-white/96 p-5 shadow-[0_24px_70px_-20px_rgba(14,35,27,.45)] backdrop-blur lg:inset-y-5 lg:left-5 lg:right-auto lg:max-h-none lg:w-[380px] lg:rounded-[28px] lg:p-6">
        <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Locus explorer</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Find your next area</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Describe your business and a city. We score every LSOA and map the best areas.</p></div><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Compass className="size-5" /></span></div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2"><p className="text-sm font-medium">Target area</p><div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            <Button type="button" size="sm" variant={areaMode === 'city' ? 'default' : 'ghost'} onClick={() => changeAreaMode('city')}>City</Button>
            <Button type="button" size="sm" variant={areaMode === 'custom' ? 'default' : 'ghost'} onClick={() => changeAreaMode('custom')}>Pick on map</Button>
          </div></div>
          {areaMode === 'city' ? <label className="block space-y-2 text-sm font-medium">City or neighborhood
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-11 bg-white pl-10" placeholder="London" />
            </div>
            <span className="text-[11px] font-normal text-muted-foreground">Proof of concept: London has demographic data loaded. Other cities are accepted but have no layers yet.</span>
          </label> : <div className="rounded-xl border border-dashed p-3 text-xs leading-5 text-muted-foreground">
            <span className={customPoints.length >= 3 ? 'font-semibold text-emerald-800' : ''}>{customPoints.length >= 3 ? 'Custom shape ready' : 'Draw a custom shape'}</span><br />
            {customPoints.length === 0 ? 'Click at least three points on the map.' : `${customPoints.length} ${customPoints.length === 1 ? 'point' : 'points'} selected · drag to adjust · right-click a point to delete it`}
            {customPoints.length > 0 && <div className="mt-2 flex gap-2"><Button type="button" size="xs" variant="outline" onClick={undoCustomPoint}>Undo point</Button><Button type="button" size="xs" variant="ghost" onClick={clearCustomArea}>Clear</Button></div>}
          </div>}
          <label className="block space-y-2 text-sm font-medium">Business description
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-md border border-input bg-white p-3 pl-10 text-sm leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="e.g. A premium yoga studio targeting affluent professionals" />
            </div>
          </label>
          <label className="block space-y-2 text-sm font-medium">Number of top areas
            <Input type="number" min="1" max="20" step="1" value={requestedResultCount} onChange={(event) => setRequestedResultCount(event.target.value)} className="h-11 bg-white" />
            <span className="text-[11px] font-normal text-muted-foreground">Choose between 1 and 20 recommendations.</span>
          </label>
          {recommend.error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{recommend.error.response?.data?.message || recommend.error.message}</p>}
          <Button type="submit" className="h-11 w-full" disabled={recommend.isPending || !description.trim() || !city.trim() || (areaMode === 'custom' && customPoints.length < 3)}>{recommend.isPending ? <><LoaderCircle className="animate-spin" /> Building opportunity map…</> : <><Sparkles /> Analyze this area</>}</Button>
        </form>

        {recommend.isPending && <p className="mt-4 text-xs leading-5 text-muted-foreground">Running the model, Google Places lookup, and the Spark scoring job across ~5,000 LSOAs. This can take up to a minute.</p>}

        {!result && !recommend.isPending && <div className="mt-6 rounded-2xl bg-[#f3f6f1] p-4"><div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-emerald-700" /> What happens next</div><p className="mt-2 text-xs leading-5 text-muted-foreground">The backend scores every area, returns a ranked surface, and Locus colors the map. Click any area to inspect its score.</p></div>}

        {result && <ResultPanel result={result} selected={selected} selectedExplanation={selectedExplanation} explanationFor={explanationFor} onLocationSelect={showRankedLocation} canSave={analysisId != null} onSaveRegion={handleSaveRegion} savedCodes={savedCodes} savingCode={saveRegion.isPending ? saveRegion.variables?.lsoaCode : null} />}
      </aside>

      {result && (isComparisonOpen ? <div className="absolute right-4 top-32 z-20 w-72 rounded-2xl border bg-slate-950 p-4 text-white shadow-xl lg:right-6">
        <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-semibold"><GitCompareArrows className="size-4 text-emerald-400" /> Compare regions</p><button type="button" className="rounded-lg p-1 text-white/55 hover:bg-white/10 hover:text-white" onClick={() => setIsComparisonOpen(false)} aria-label="Close comparison tray"><X className="size-4" /></button></div>
        <p className="mt-1 text-[11px] text-white/55">Right-click any region to add or remove it.</p>
        {comparisonAreas.length === 0 ? <p className="mt-3 rounded-xl border border-dashed border-white/15 p-3 text-center text-xs text-white/45">No regions selected</p> : <div className="mt-3 space-y-2">{comparisonAreas.map((area, index) => <div key={area.lsoa_code} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-400 text-[10px] font-bold text-slate-950">{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs">{area.lsoa_name ?? area.lsoaName}</span><button type="button" className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white" onClick={() => toggleComparisonArea(area)} aria-label={`Remove ${area.lsoa_name ?? area.lsoaName} from comparison`}><X className="size-3.5" /></button></div>)}</div>}
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px]"><span className="text-white/50">{comparisonAreas.length} selected</span><span className={comparisonAreas.length >= 2 ? 'font-medium text-emerald-400' : 'text-white/40'}>{comparisonAreas.length >= 2 ? 'Ready to compare' : 'Select at least 2'}</span></div>
        <Button type="button" size="sm" className="mt-3 w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={comparisonAreas.length < 2} onClick={openComparison}><GitCompareArrows /> Compare {comparisonAreas.length || ''} regions</Button>
      </div> : <Button type="button" size="sm" className="absolute right-4 top-32 z-20 shadow-lg lg:right-6" onClick={() => setIsComparisonOpen(true)}><GitCompareArrows /> {comparisonAreas.length ? `Compare ${comparisonAreas.length}` : 'Compare regions'}</Button>)}

      {result && (
        <div className="absolute bottom-[calc(72%+24px)] right-4 z-20 w-56 rounded-2xl border bg-white/94 p-3 text-xs shadow-lg backdrop-blur lg:bottom-6 lg:right-6">
          <div className="mb-2 flex items-center justify-between gap-2"><span className="font-medium">Minimum score</span><span className="font-semibold tabular-nums">{effectiveMinimumScore?.toFixed(3)}</span></div>
          {scoreRange && <input
            type="range"
            className="mb-2 w-full accent-emerald-600"
            min={scoreRange.min}
            max={scoreRange.max}
            step={(scoreRange.max - scoreRange.min) / 100 || 0.001}
            value={effectiveMinimumScore ?? scoreRange.min}
            onChange={(event) => setMinimumScore(Number(event.target.value))}
            aria-label="Minimum opportunity score"
          />}
          <div className="h-2 w-full rounded-full" style={{ background: 'linear-gradient(90deg, rgb(30,58,138), rgb(16,185,129), rgb(250,204,21), rgb(239,68,68))' }} />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>{scoreRange?.min.toFixed(3)}</span><span>{scoreRange?.max.toFixed(3)}</span></div>
        </div>
      )}
    </div>
  )
}

function ResultPanel({ result, selected, selectedExplanation, explanationFor, onLocationSelect, canSave, onSaveRegion, savedCodes, savingCode }) {
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
          {canSave && (() => {
            const isSaved = savedCodes?.has(selected.lsoaCode)
            const isSaving = savingCode === selected.lsoaCode
            return (
              <Button type="button" size="sm" variant={isSaved ? 'outline' : 'default'} className="mt-3 w-full" disabled={isSaved || isSaving} onClick={() => onSaveRegion(selected)}>
                {isSaved ? <><BookmarkCheck className="size-4" /> Saved</> : isSaving ? <><LoaderCircle className="size-4 animate-spin" /> Saving…</> : <><Bookmark className="size-4" /> Save region</>}
              </Button>
            )
          })()}
        </div>
      )}

      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold"><Trophy className="size-4 text-amber-500" /> Top {result.ranked_locations?.length} areas</p>
        {result.ranked_locations?.map((loc, index) => {
          const explanation = explanationFor(loc.lsoa_code)
          const weights = Object.entries(loc.weighted_layer_values || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
          return (
            <div key={loc.lsoa_code} className={`rounded-2xl border bg-white p-4 transition hover:border-emerald-400 hover:shadow-md ${selected?.lsoaCode === loc.lsoa_code ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''}`}>
              <button type="button" className="w-full text-left focus-visible:outline-none" onClick={() => onLocationSelect(loc)} aria-label={`Show ${loc.lsoa_name} on the map`}>
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
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
