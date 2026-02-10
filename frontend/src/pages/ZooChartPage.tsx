import mapImage from '@/assets/images/map.jpg'
import { useLanguage } from '@/providers/LanguageProvider'
import { useEffect, useRef, useState } from 'react'
import type React from 'react'

type Point = { x: number; y: number }

const MIN_SCALE = 1
const MAX_SCALE = 3.6
const ZOOM_STEP = 0.18

export function ZooChartPage() {
  const { language } = useLanguage()
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const pointersRef = useRef<Map<number, Point>>(new Map())
  const panStartRef = useRef<Point | null>(null)
  const pinchBaseRef = useRef<{ distance: number; scale: number } | null>(null)
  const sizesRef = useRef({
    container: { width: 0, height: 0 },
    image: { width: 0, height: 0 },
  })
  const transformRef = useRef(transform)

  useEffect(() => {
    transformRef.current = transform
  }, [transform])

  const clampValue = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

  const updateSizes = () => {
    sizesRef.current = {
      container: {
        width: containerRef.current?.clientWidth ?? 0,
        height: containerRef.current?.clientHeight ?? 0,
      },
      image: {
        width: imageRef.current?.naturalWidth ?? 0,
        height: imageRef.current?.naturalHeight ?? 0,
      },
    }
  }

  useEffect(() => {
    updateSizes()
    const onResize = () => updateSizes()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const clampPosition = (scale: number, x: number, y: number) => {
    const { container, image } = sizesRef.current
    if (!container.width || !image.width) {
      return { x, y }
    }

    const scaledWidth = image.width * scale
    const scaledHeight = image.height * scale
    const maxX = Math.max(0, (scaledWidth - container.width) / 2)
    const maxY = Math.max(0, (scaledHeight - container.height) / 2)

    return {
      x: clampValue(x, -maxX - 32, maxX + 32),
      y: clampValue(y, -maxY - 32, maxY + 32),
    }
  }

  const applyZoom = (nextScale: number, focal?: Point) => {
    setTransform(prev => {
      const scale = clampValue(nextScale, MIN_SCALE, MAX_SCALE)
      if (!focal || !containerRef.current) {
        const { x, y } = clampPosition(scale, prev.x, prev.y)
        return { ...prev, scale, x, y }
      }

      const rect = containerRef.current.getBoundingClientRect()
      const offsetX = focal.x - (rect.left + rect.width / 2)
      const offsetY = focal.y - (rect.top + rect.height / 2)
      const factor = scale / prev.scale
      const nextX = prev.x - offsetX * (factor - 1)
      const nextY = prev.y - offsetY * (factor - 1)
      const clamped = clampPosition(scale, nextX, nextY)
      return { scale, ...clamped }
    })
  }

  const distanceBetween = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

  // We add a native, non-passive wheel listener to the container so we can call
  // preventDefault() (React's synthetic/onWheel can end up passive in some browsers).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const wheelHandler = (ev: WheelEvent) => {
      ev.preventDefault()
      const direction = ev.deltaY > 0 ? -1 : 1
      const nextScale = transformRef.current.scale * (1 + ZOOM_STEP * direction)
      applyZoom(nextScale, { x: ev.clientX, y: ev.clientY })
    }

    el.addEventListener('wheel', wheelHandler, { passive: false })
    return () => el.removeEventListener('wheel', wheelHandler as EventListener)
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // Ignore pointer-downs that originate from interactive controls so buttons remain clickable
    const target = event.target as Element | null
    if (target && target.closest('button, a, input, textarea, select, [role="button"]')) return

    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 1) {
      panStartRef.current = { x: event.clientX, y: event.clientY }
    }

    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values())
      pinchBaseRef.current = {
        distance: distanceBetween(points[0], points[1]),
        scale: transformRef.current.scale,
      }
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size === 1 && panStartRef.current) {
      const last = panStartRef.current
      const dx = event.clientX - last.x
      const dy = event.clientY - last.y
      panStartRef.current = { x: event.clientX, y: event.clientY }

      setTransform(prev => {
        const { x, y } = clampPosition(prev.scale, prev.x + dx, prev.y + dy)
        return { ...prev, x, y }
      })
    } else if (pointersRef.current.size === 2) {
      const [p1, p2] = Array.from(pointersRef.current.values())
      const base = pinchBaseRef.current
      if (!base) return

      const distance = distanceBetween(p1, p2)
      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
      const nextScale = base.scale * (distance / base.distance)
      applyZoom(nextScale, center)
    }
  }

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId)

    if (pointersRef.current.size === 1) {
      const [remaining] = Array.from(pointersRef.current.values())
      panStartRef.current = remaining
    } else {
      panStartRef.current = null
    }

    if (pointersRef.current.size < 2) {
      pinchBaseRef.current = null
    }
  }

  const resetView = () => setTransform({ scale: 1, x: 0, y: 0 })

  return (
    <section className="page-enter bg-soft-bg/70 py-16 md:py-20">
      <div className="container max-w-6xl space-y-10">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/70">
            {language === 'en' ? 'Zoo Map' : 'பூங்கா வரைபடம்'}
          </p>
          <h1 className="text-4xl font-bold text-forest-green md:text-5xl">
            {language === 'en' ? 'Explore the park layout and attractions' : 'பூங்காவின் அமைப்பையும் சிறப்புகளையும் ஆராயுங்கள்'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {language === 'en'
              ? 'Zoom, pan, and pinch to navigate the real park layout. Every enclosure and amenity is mapped so you can plan your path with confidence.'
              : 'உண்மையான பூங்கா வரைபடத்தில் பெரிதாக்கி, நகர்த்தி, பின்ச் செய்து உலாவலாம். ஒவ்வொரு விலங்கு பகுதியும் வசதியும் குறிக்கப்பட்டுள்ளதால் உங்கள் பயணத்தை எளிதாக திட்டமிடலாம்.'}
          </p>
        </header>

        <div className="rounded-3xl border border-forest-green/15 bg-white/95 p-6 shadow-forest-lg backdrop-blur">
          <div className="relative overflow-hidden rounded-2xl border border-forest-green/10 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/40">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,105,44,0.06),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(62,141,81,0.08),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(16,105,44,0.05),transparent_35%)]" />

            <div
              ref={containerRef}
              className="relative aspect-[4/3] w-full touch-none select-none sm:aspect-[16/10] md:h-[600px]"
              style={{ touchAction: 'none' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerLeave={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-forest-green shadow-sm">
                {language === 'en' ? 'Scroll or pinch to zoom • Drag to explore' : 'பெரிதாக்க ஸ்க்ரோல் அல்லது பின்ச் செய்யவும் • நகர்த்த இழுக்கவும்'}
              </div>

              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute inset-0"
                  style={{
                    transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
                    transformOrigin: 'center',
                    cursor: pointersRef.current.size > 0 ? 'grabbing' : transform.scale === 1 ? 'grab' : 'grab',
                  }}
                >
                  <img
                    ref={imageRef}
                    src={mapImage}
                    alt={
                      language === 'en'
                        ? 'Kurumbapatti Zoo map with visitor routes and enclosures'
                        : 'வருகையாளர்களுக்கான பாதைகள் மற்றும் விலங்கு பகுதிகளுடன் குரும்பட்டி பூங்கா வரைபடம்'
                    }
                    className="h-full w-full rounded-2xl object-contain"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onLoad={updateSizes}
                  />
                </div>
              </div>

              <div className="absolute right-4 top-4 z-30 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={resetView}
                  aria-label={language === 'en' ? 'Reset view' : 'காட்சி புதுப்பி'}
                  className="rounded-xl bg-forest-green px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-green/80"
                >
                  {language === 'en' ? 'Reset View' : 'காட்சியை மீட்டமை'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
          <div className="rounded-2xl border border-forest-green/10 bg-white/80 p-4 shadow-sm">
            <p className="font-semibold text-forest-green">{language === 'en' ? 'Navigation tips' : 'உலாவல் குறிப்புகள்'}</p>
            <ul className="mt-2 space-y-1">
              <li>{language === 'en' ? 'Use your mouse wheel or touch pinch to zoom into habitats and amenities.' : 'விலங்கு பகுதிகள் மற்றும் வசதிகளை நெருக்கமாகப் பார்க்க ஸ்க்ரோல் அல்லது பின்ச் செய்க.'}</li>
              <li>{language === 'en' ? 'Drag in any direction to follow the visitor paths across the park.' : 'பூங்கா முழுவதும் பாதைகளைக் காண எந்த திசையிலும் இழுக்கவும்.'}</li>
              <li>{language === 'en' ? 'Tap reset anytime to recenter the map if you explore too far.' : 'மிகவும் தூரம் சென்றால் மீட்டமை பொத்தானை அழுத்தி வரைபடத்தை மையப்படுத்தலாம்.'}</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-forest-green/10 bg-white/80 p-4 shadow-sm">
            <p className="font-semibold text-forest-green">{language === 'en' ? 'Plan your route' : 'உங்கள் பயணத்தை திட்டமிடுங்கள்'}</p>
            <ul className="mt-2 space-y-1">
              <li>{language === 'en' ? 'Identify nearby rest areas, ticket counters, and feeding points before you start walking.' : 'நடப்பதற்கு முன் ஓய்வு பகுதிகள், டிக்கெட் கவுண்டர்கள், உணவு வழங்கும் இடங்களை அறிந்துகொள்ளுங்கள்.'}</li>
              <li>{language === 'en' ? 'Zoom in to view internal sections of each enclosure when you are close by in the park.' : 'பூங்காவில் அந்த பகுதியை நெருங்கியபோது ஒவ்வொரு விலங்கு பகுதியின் உள்ளமைப்பையும் பெரிதாக்கிப் பார்க்கலாம்.'}</li>
              <li>{language === 'en' ? 'This map is kept current so your visit path matches on-ground signages.' : 'இந்த வரைபடம் தொடர்ந்து புதுப்பிக்கப்படுகிறது; தரையில் உள்ள குறியீடுகளுடன் இது பொருந்தும்.'}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
