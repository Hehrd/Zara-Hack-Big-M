import { useEffect, useRef, useState } from 'react'
import { Building2, ChevronDown, Compass, Eraser, Flag, Layers3, LoaderCircle, MapPin, Rotate3D, Search, Sparkles } from 'lucide-react'
import { GoogleMapsOverlay } from '@deck.gl/google-maps'
import { ColumnLayer, PolygonLayer, ScatterplotLayer } from '@deck.gl/layers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAreaInsight, useCreateAnalysis } from '@/hooks/useAnalysis'
import { loadGoogleMaps } from '@/lib/googleMaps'

function createOpportunityLayers(analysis, zoom = 13, is3D = false) {
  const opacityFactor = Math.max(0.25, Math.min(1, 1 - Math.max(0, zoom - 13) * 0.19))
  const positiveCircles = analysis.zones.filter((zone) => zone.geometry === 'circle' && zone.impact === 'positive')
  const negativeCircles = analysis.zones.filter((zone) => zone.geometry === 'circle' && zone.impact === 'negative')
  const positivePolygons = analysis.zones.filter((zone) => zone.geometry === 'polygon' && zone.impact === 'positive')
  const negativePolygons = analysis.zones.filter((zone) => zone.geometry === 'polygon' && zone.impact === 'negative')
  const fadeColor = (color) => [...color.slice(0, 3), Math.round(color[3] * opacityFactor)]
  const eraseBlend = {
    blend: true,
    blendColorOperation: 'add',
    blendColorSrcFactor: 'zero',
    blendColorDstFactor: 'one-minus-src-alpha',
    blendAlphaOperation: 'add',
    blendAlphaSrcFactor: 'zero',
    blendAlphaDstFactor: 'one-minus-src-alpha',
  }
  const circleLayer = (id, data, erases = false) => new ScatterplotLayer({
    id: `${id}-${analysis.id}-${zoom}`,
    data,
    getPosition: (point) => [point.lng, point.lat],
    getRadius: (point) => point.radiusMeters,
    getFillColor: (point) => fadeColor(point.fillColor),
    getLineColor: (point) => point.lineColor,
    radiusUnits: 'meters',
    radiusMinPixels: 12,
    stroked: !erases,
    filled: true,
    lineWidthMinPixels: 1,
    antialiasing: true,
    ...(erases ? { parameters: eraseBlend } : {}),
  })
  const polygonLayer = (id, data, erases = false) => new PolygonLayer({
    id: `${id}-${analysis.id}-${zoom}`,
    data,
    getPolygon: (zone) => zone.points.map((point) => [point.lng, point.lat]),
    getFillColor: (zone) => fadeColor(zone.fillColor),
    getLineColor: (zone) => zone.lineColor,
    filled: true,
    stroked: !erases,
    lineWidthMinPixels: 1.5,
    ...(erases ? { parameters: eraseBlend } : {}),
  })
  const opportunitySurfaceLayer = new ColumnLayer({
    id: `opportunity-surface-${analysis.id}-${zoom}`,
    data: analysis.surfaceCells || [],
    diskResolution: 6,
    radius: 185,
    getPosition: (cell) => [cell.lng, cell.lat],
    getElevation: (cell) => cell.heightMeters,
    getFillColor: (cell) => fadeColor(cell.fillColor),
    radiusUnits: 'meters',
    extruded: true,
    stroked: false,
    wireframe: false,
    coverage: 0.96,
    parameters: {
      depthWriteEnabled: true,
      depthCompare: 'less-equal',
    },
  })
  return [
    ...(is3D ? [opportunitySurfaceLayer] : [circleLayer('positive-circles', positiveCircles), polygonLayer('positive-polygons', positivePolygons), circleLayer('negative-circles', negativeCircles, true), polygonLayer('negative-polygons', negativePolygons, true)]),
  ]
}

export function MapsPage() {
  const mapElement = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const analysisRef = useRef(null)
  const is3DRef = useRef(false)
  const areaModeRef = useRef('city')
  const polygonConstructorRef = useRef(null)
  const mapsEventRef = useRef(null)
  const selectionPolygonRef = useRef(null)
  const polygonPathListenersRef = useRef([])
  const cameraTransitionListenerRef = useRef(null)
  const customPointsRef = useRef([])
  const [mapError, setMapError] = useState('')
  const [is3D, setIs3D] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionTarget, setTransitionTarget] = useState(null)
  const [areaMode, setAreaMode] = useState('city')
  const [customPoints, setCustomPoints] = useState([])
  const analysis = useCreateAnalysis()
  const areaInsight = useAreaInsight()
  const loadAreaInsight = areaInsight.mutate
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID

  useEffect(() => {
    let active = true
    let mapClickListener
    let zoomListener

    loadGoogleMaps()
      .then(({ Map, Polygon, mapsEvent }) => {
        if (!active || !mapElement.current) return
        const mapOptions = {
          center: { lat: 51.5074, lng: -0.1278 },
          zoom: 11,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          renderingType: 'VECTOR',
          ...(mapId ? { mapId } : {}),
        }
        mapRef.current = new Map(mapElement.current, mapOptions)
        polygonConstructorRef.current = Polygon
        mapsEventRef.current = mapsEvent
        // Overlay mode renders in its own map-attached WebGL canvas. It is more
        // compatible than interleaving and still pans, zooms, and tilts with Google Maps.
        overlayRef.current = new GoogleMapsOverlay({ interleaved: false, layers: [] })
        overlayRef.current.setMap(mapRef.current)
        mapClickListener = mapRef.current.addListener('click', (event) => {
          if (areaModeRef.current === 'custom') {
            if (!selectionPolygonRef.current) {
              selectionPolygonRef.current = new polygonConstructorRef.current({ map: mapRef.current, paths: [[event.latLng]], editable: true, draggable: false, fillColor: '#10b981', fillOpacity: 0.12, strokeColor: '#047857', strokeOpacity: 0.9, strokeWeight: 2 })
              const path = selectionPolygonRef.current.getPaths().getAt(0)
              const syncPoints = () => {
                const points = path.getArray().map((point) => ({ lat: point.lat(), lng: point.lng() }))
                customPointsRef.current = points
                setCustomPoints(points)
              }
              polygonPathListenersRef.current = ['insert_at', 'set_at', 'remove_at'].map((eventName) => mapsEventRef.current.addListener(path, eventName, syncPoints))
              syncPoints()
              return
            }
            selectionPolygonRef.current.getPaths().getAt(0).push(event.latLng)
            return
          }
          if (!analysisRef.current?.id) return
          loadAreaInsight({ analysisId: analysisRef.current.id, lat: event.latLng.lat(), lng: event.latLng.lng() })
        })
        zoomListener = mapRef.current.addListener('zoom_changed', () => {
          if (!analysisRef.current || !overlayRef.current) return
          overlayRef.current.setProps({ layers: createOpportunityLayers(analysisRef.current, mapRef.current.getZoom(), is3DRef.current) })
        })
      })
      .catch((error) => active && setMapError(error.message))

    return () => {
      active = false
      mapClickListener?.remove()
      zoomListener?.remove()
      overlayRef.current?.setMap(null)
      selectionPolygonRef.current?.setMap(null)
      polygonPathListenersRef.current.forEach((listener) => listener.remove())
      polygonPathListenersRef.current = []
      cameraTransitionListenerRef.current?.remove()
    }
  }, [loadAreaInsight, mapId])

  useEffect(() => {
    if (!analysis.data || !mapRef.current || !overlayRef.current) return
    analysisRef.current = analysis.data
    mapRef.current.setCenter(analysis.data.center)
    mapRef.current.setZoom(analysis.data.zoom)
    overlayRef.current.setProps({ layers: createOpportunityLayers(analysis.data, analysis.data.zoom, is3D) })
  }, [analysis.data, is3D])

  function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    areaInsight.reset()
    const area = areaMode === 'custom'
      ? customPoints.length >= 3 && { type: 'polygon', label: 'Custom map area', points: customPoints }
      : form.get('area')?.trim()
    if (!area) return
    analysis.mutate({ businessType: form.get('businessType')?.trim(), area })
  }

  function changeAreaMode(mode) {
    setAreaMode(mode)
    areaModeRef.current = mode
    if (mode === 'city') {
      clearCustomArea()
    }
  }

  function undoCustomPoint() {
    selectionPolygonRef.current?.getPaths().getAt(0)?.pop()
  }

  function clearCustomArea() {
    polygonPathListenersRef.current.forEach((listener) => listener.remove())
    polygonPathListenersRef.current = []
    customPointsRef.current = []
    setCustomPoints([])
    selectionPolygonRef.current?.setMap(null)
    selectionPolygonRef.current = null
  }

  function toggle3D() {
    if (!mapRef.current || !mapId || isTransitioning) return
    const next = !is3D
    setIsTransitioning(true)
    setTransitionTarget(next ? '3D' : '2D')
    // Coplanar flat layers flicker while Google animates the camera tilt.
    // Hide the overlay briefly, then restore the target geometry on `idle`.
    overlayRef.current?.setProps({ layers: [] })
    cameraTransitionListenerRef.current?.remove()
    cameraTransitionListenerRef.current = mapsEventRef.current.addListenerOnce(mapRef.current, 'idle', () => {
      is3DRef.current = next
      setIs3D(next)
      setIsTransitioning(false)
      setTransitionTarget(null)
      if (analysisRef.current && overlayRef.current) overlayRef.current.setProps({ layers: createOpportunityLayers(analysisRef.current, mapRef.current.getZoom(), next) })
      cameraTransitionListenerRef.current = null
    })
    mapRef.current.setTilt(next ? 45 : 0)
    mapRef.current.setHeading(next ? 20 : 0)
  }

  function clearMap() {
    analysis.reset()
    areaInsight.reset()
    analysisRef.current = null
    overlayRef.current?.setProps({ layers: [] })
    clearCustomArea()
    setIs3D(false)
    is3DRef.current = false
    setIsTransitioning(false)
    setTransitionTarget(null)
    cameraTransitionListenerRef.current?.remove()
    cameraTransitionListenerRef.current = null
    mapRef.current?.setTilt(0)
    mapRef.current?.setHeading(0)
  }

  return (
    <div className="relative h-[calc(100vh-4rem)] min-h-[680px] overflow-hidden lg:h-screen">
      <div ref={mapElement} className="absolute inset-0 bg-[#dfe5dc]" aria-label="Locus opportunity map" />
      {isTransitioning && <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/10 backdrop-blur-[1px]" role="status" aria-live="polite"><div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/95 px-5 py-3.5 shadow-xl"><span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><LoaderCircle className="size-5 animate-spin" /></span><div><p className="text-sm font-semibold">Switching to {transitionTarget} view</p><p className="mt-0.5 text-xs text-muted-foreground">Preparing the opportunity surface…</p></div></div></div>}
      {mapError && <div role="alert" className="absolute left-1/2 top-8 z-20 w-[min(90%,520px)] -translate-x-1/2 rounded-2xl border border-destructive/30 bg-white p-4 text-sm text-destructive shadow-xl">{mapError}</div>}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-black/12 to-transparent" />
      <div className="absolute right-4 top-4 z-20 flex gap-2 lg:right-6 lg:top-6">
        <Button variant="outline" className="bg-white/95 shadow-md backdrop-blur" onClick={clearMap} disabled={!analysis.data && customPoints.length === 0}><Eraser /> Clear map</Button>
        <Button variant="outline" className="bg-white/95 shadow-md backdrop-blur" onClick={toggle3D} disabled={!mapId || isTransitioning} title={mapId ? 'Toggle map tilt' : 'Add VITE_GOOGLE_MAPS_MAP_ID to enable 3D'}>{isTransitioning ? <LoaderCircle className="animate-spin" /> : <Rotate3D />} {isTransitioning ? 'Switching…' : is3D ? '2D view' : '3D view'}</Button>
      </div>

      <aside className="absolute inset-x-3 bottom-3 z-20 max-h-[72%] overflow-auto rounded-[24px] border bg-white/96 p-5 shadow-[0_24px_70px_-20px_rgba(14,35,27,.45)] backdrop-blur lg:inset-y-5 lg:left-5 lg:right-auto lg:max-h-none lg:w-[360px] lg:rounded-[28px] lg:p-6">
        <div className="mb-6 flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Locus explorer</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em]">Find your next area</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose what you want to open and where to search.</p></div><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Compass className="size-5" /></span></div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-2 text-sm font-medium">Business type<div className="relative"><Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="businessType" className="h-11 bg-white pl-10" placeholder="e.g. Independent café" defaultValue="Independent café" /></div></label>
          <div className="space-y-2"><p className="text-sm font-medium">Target area</p><div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"><Button type="button" size="sm" variant={areaMode === 'city' ? 'default' : 'ghost'} onClick={() => changeAreaMode('city')}>City</Button><Button type="button" size="sm" variant={areaMode === 'custom' ? 'default' : 'ghost'} onClick={() => changeAreaMode('custom')}>Pick on map</Button></div></div>
          {areaMode === 'city' ? <label className="block space-y-2 text-sm font-medium">City or neighborhood<div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="area" className="h-11 bg-white pl-10" placeholder="City or neighborhood" defaultValue="London" /></div></label> : <div className="rounded-xl border border-dashed p-3 text-xs leading-5 text-muted-foreground"><span className={customPoints.length >= 3 ? 'font-semibold text-emerald-800' : ''}>{customPoints.length >= 3 ? 'Custom shape ready' : 'Draw a custom shape'}</span><br />{customPoints.length === 0 ? 'Click at least three points on the map.' : `${customPoints.length} ${customPoints.length === 1 ? 'point' : 'points'} selected · drag any point to adjust`}{customPoints.length > 0 && <div className="mt-2 flex gap-2"><Button type="button" size="xs" variant="outline" onClick={undoCustomPoint}>Undo point</Button><Button type="button" size="xs" variant="ghost" onClick={clearCustomArea}>Clear</Button></div>}</div>}
          {analysis.error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{analysis.error.response?.data?.message || analysis.error.message}</p>}
          <Button type="submit" className="h-11 w-full" disabled={analysis.isPending || (areaMode === 'custom' && customPoints.length < 3)}>{analysis.isPending ? <><LoaderCircle className="animate-spin" /> Building opportunity map…</> : <><Search /> Analyze this area</>}</Button>
        </form>

        {!analysis.data && !analysis.isPending && <div className="mt-6 rounded-2xl bg-[#f3f6f1] p-4"><div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="size-4 text-emerald-700" /> What happens next</div><p className="mt-2 text-xs leading-5 text-muted-foreground">The backend evaluates location signals and returns a scored surface. Locus displays it without changing the model.</p></div>}

        {analysis.data && <AnalysisResult analysis={analysis.data} insight={areaInsight} />}
      </aside>

      {analysis.data && <div className="absolute bottom-[calc(72%+24px)] right-4 z-20 w-52 rounded-2xl border bg-white/94 p-3 text-xs shadow-lg backdrop-blur lg:bottom-6 lg:right-6"><div className="mb-2 flex items-center gap-2 font-medium"><Layers3 className="size-4" /> Opportunity weight</div><div className="space-y-2 text-[10px] text-muted-foreground"><div className="flex items-center gap-2"><span className="size-4 rounded-full bg-emerald-500/45 ring-1 ring-emerald-700/30" /> Positive adds green</div><div className="flex items-center gap-2"><span className="grid size-4 place-items-center rounded-full border border-dashed border-slate-400 bg-white text-[9px]">−</span> Negative removes green</div></div></div>}
    </div>
  )
}

function AnalysisResult({ analysis, insight }) {
  return (
    <div className="mt-6 border-t pt-5">
      <div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Current analysis</p><p className="mt-1 text-sm font-semibold">{analysis.businessType} · {analysis.area}</p></div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">Demo surface</span></div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">Click anywhere on the map to inspect the backend explanation for that area.</p>
      {insight.isPending && <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Loading area context…</div>}
      {insight.data && <div className="mt-4 rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold">{insight.data.label}</p><ChevronDown className="size-4 text-muted-foreground" /></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{insight.data.summary}</p>{insight.data.matches.length > 0 && <ul className="mt-4 space-y-3">{insight.data.matches.map((match) => <li key={match.id} className={match.impact === 'negative' ? 'rounded-xl bg-rose-50/90 p-3' : 'rounded-xl bg-emerald-50/80 p-3'}><div className={match.impact === 'negative' ? 'flex items-center gap-2 text-xs font-semibold text-rose-900' : 'flex items-center gap-2 text-xs font-semibold text-emerald-900'}><Flag className={match.impact === 'negative' ? 'size-3.5 fill-rose-500 text-rose-600' : 'size-3.5 fill-emerald-500 text-emerald-600'} />{match.label}<span className="ml-auto text-[9px] uppercase tracking-wider">{match.impact === 'negative' ? `−${match.weight}` : `+${match.weight}`}</span></div><p className={match.impact === 'negative' ? 'mt-1.5 text-[11px] leading-4 text-rose-950/65' : 'mt-1.5 text-[11px] leading-4 text-emerald-950/65'}>{match.reason}</p></li>)}</ul>}</div>}
    </div>
  )
}
