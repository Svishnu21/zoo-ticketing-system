import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import type { GalleryImage } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'

interface PhotoLightboxProps {
  image: GalleryImage
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function PhotoLightbox({ image, onClose, onPrev, onNext }: PhotoLightboxProps) {
  const { language } = useLanguage()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 py-12 backdrop-blur">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full bg-white/20 p-2 text-white transition-colors duration-300 ease-smooth hover:bg-white/30"
        aria-label={language === 'en' ? 'Close' : 'மூடு'}
      >
        <X size={22} />
      </button>

      <button
        type="button"
        onClick={onPrev}
        className="absolute left-10 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition-colors duration-300 ease-smooth hover:bg-white/30"
        aria-label={language === 'en' ? 'Previous image' : 'முந்தைய படம்'}
      >
        <ChevronLeft size={24} />
      </button>

  <div className="max-w-4xl overflow-hidden rounded-3xl bg-white shadow-lg">
        <img src={image.image} alt={image.title[language]} className="h-[70vh] w-full rounded-2xl object-cover" />
        <div className="p-4 text-center text-lg font-semibold text-forest-green">
          {image.title[language]}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="absolute right-10 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white transition-colors duration-300 ease-smooth hover:bg-white/30"
        aria-label={language === 'en' ? 'Next image' : 'அடுத்த படம்'}
      >
        <ChevronRight size={24} />
      </button>
    </div>
  )
}
