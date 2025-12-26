import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { heroSlides } from '@/data/content'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/providers/LanguageProvider'
import { cn } from '@/utils/cn'
import { Link } from 'react-router-dom'

const AUTO_INTERVAL = 5000

export function HeroSlider() {
  const { language } = useLanguage()
  const [activeIndex, setActiveIndex] = useState(0)

  const slides = useMemo(() => heroSlides, [])
  const total = slides.length

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total)
    }, AUTO_INTERVAL)

    return () => window.clearInterval(timer)
  }, [total])

  const goTo = (index: number) => {
    setActiveIndex((index + total) % total)
  }

  return (
    <section className="relative w-full flex justify-center mt-5">
      {/* Preload the first hero image for faster first paint */}
      <img
        src={slides[0]?.image}
        alt=""
        className="hidden"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        aria-hidden
      />
      <div className="w-[95%] max-w-[1400px] h-[70vh] rounded-[30px] overflow-hidden shadow-2xl relative">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              'absolute inset-0 h-full w-full bg-cover bg-center transition-opacity duration-700 ease-smooth',
              index === activeIndex ? 'opacity-100' : 'opacity-0',
            )}
            style={{ backgroundImage: `url(${slide.image})` }}
          >
            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        ))}

        <div className="relative z-10 flex h-full flex-col items-center justify-end gap-8 px-4 text-center text-white pb-20 md:pb-28 lg:pb-32">
          <div>
            <h1 className="hero-title serif-heading text-6xl font-extrabold tracking-tight text-white md:text-7xl lg:text-7xl">
              {language === 'en' ? (
                (() => {
                  const t = slides[activeIndex].title.en
                  const key = 'Adventure'
                  if (t.includes(key)) {
                    const [before, after] = t.split(key)
                    return (
                      <>
                        {before}
                        <span className="text-[#FACC15]">{key}</span>
                        {after}
                      </>
                    )
                  }
                  return t
                })()
              ) : (
                slides[activeIndex].title[language]
              )}
            </h1>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Button asChild variant="hero" size="lg">
              <Link to="/tickets/zoo">{language === 'en' ? 'Book Tickets' : 'டிக்கெட் முன்பதிவு'}</Link>
            </Button>
            <Button asChild variant="sunshine" size="lg">
              <Link to="/adoption/choose">{language === 'en' ? 'Animal / Adoption' : 'விலங்கு / தத்தெடுதல்'}</Link>
            </Button>
          </div>
        </div>

        <button
          type="button"
          className="absolute left-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-3 backdrop-blur-sm transition-colors duration-300 ease-smooth hover:bg-white/30"
          onClick={() => goTo(activeIndex - 1)}
          aria-label="Previous Slide"
        >
          <ChevronLeft className="text-white" size={24} />
        </button>

        <button
          type="button"
          className="absolute right-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/20 p-3 backdrop-blur-sm transition-colors duration-300 ease-smooth hover:bg-white/30"
          onClick={() => goTo(activeIndex + 1)}
          aria-label="Next Slide"
        >
          <ChevronRight className="text-white" size={24} />
        </button>

        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-3">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={cn(
                'h-3 w-3 rounded-full bg-white/50 transition-transform duration-300 ease-smooth',
                index === activeIndex && 'scale-125 bg-white',
              )}
              onClick={() => goTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
