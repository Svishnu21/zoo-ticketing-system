import { useState } from 'react'

import { PhotoLightbox } from '@/components/gallery/PhotoLightbox'
import { galleryImages } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'

export function GalleryPage() {
  const { language } = useLanguage()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const handleOpen = (index: number) => setActiveIndex(index)
  const handleClose = () => setActiveIndex(null)

  const handlePrev = () => {
    setActiveIndex((prev) => {
      if (prev === null) return prev
      return (prev - 1 + galleryImages.length) % galleryImages.length
    })
  }

  const handleNext = () => {
    setActiveIndex((prev) => {
      if (prev === null) return prev
      return (prev + 1) % galleryImages.length
    })
  }

  return (
    <section className="page-enter bg-soft-bg py-20">
      <div className="container space-y-10">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-forest-green">{language === 'en' ? 'Photo Gallery' : 'படத்தொகுப்பு'}</h1>
          <p className="mt-2 text-xl text-muted-foreground">{language === 'en' ? 'படத்தொகுப்பு' : 'Photo Gallery'}</p>
        </div>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {galleryImages.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => handleOpen(index)}
              className="group overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 ease-smooth hover:-translate-y-1 hover:scale-105 hover:shadow-2xl"
            >
              <img src={image.image} alt={image.title[language]} className="h-64 w-full rounded-2xl object-cover" />
              <div className="px-4 py-3 text-left text-sm font-semibold text-forest-green">
                {image.title[language]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {activeIndex !== null && (
        <PhotoLightbox
          image={galleryImages[activeIndex]}
          onClose={handleClose}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </section>
  )
}
