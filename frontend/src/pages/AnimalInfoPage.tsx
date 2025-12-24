import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Bird, PawPrint, Turtle } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import type { AnimalDetail } from '@/data/animalData'
import { animalData } from '@/data/animalData'

// Load all images from the assets folder so we can resolve image filenames stored in data
const imageModules = import.meta.glob('/src/assets/images/**/*.{jpg,jpeg,png}', { eager: true, as: 'url' }) as Record<string, string>

function resolveImage(filename?: string) {
  if (!filename) return ''
  const candidate = `/src/assets/images/${filename}`
  if (imageModules[candidate]) return imageModules[candidate]
  // fallback: try lowercase or simple variants
  const lower = filename.toLowerCase()
  const found = Object.keys(imageModules).find((p) => p.toLowerCase().endsWith(lower))
  return found ? imageModules[found] : ''
}

interface AnimalSectionDefinition {
  id: string
  title: string
  Icon: LucideIcon
  animals: { id: string; common: string; scientific?: string }[]
}

const animalSections: AnimalSectionDefinition[] = [
  {
    id: 'birds',
    title: 'Birds',
    Icon: Bird,
    animals: [
      { id: 'indian-peafowl', common: 'Indian Peafowl', scientific: 'Pavo cristatus' },
      { id: 'white-peafowl', common: 'White Peafowl', scientific: 'Pavo cristatus (Leucistic)' },
      { id: 'grey-pelican', common: 'Grey Pelican', scientific: 'Pelecanus philippensis' },
      { id: 'grey-heron', common: 'Grey Heron', scientific: 'Ardea cinerea' },
      { id: 'painted-stork', common: 'Painted Stork', scientific: 'Mycteria leucocephala' },
      { id: 'grey-partridge', common: 'Grey Partridge', scientific: 'Perdix perdix' },
      { id: 'cockatiel', common: 'Cockatiel', scientific: 'Nymphicus hollandicus' },
      { id: 'rose-ringed-parakeet', common: 'Rose-ringed Parakeet', scientific: 'Psittacula krameri' },
      { id: 'alexandrine-parakeet', common: 'Alexandrine Parakeet', scientific: 'Psittacula eupatria' },
      { id: 'budgerigar', common: 'Budgerigar', scientific: 'Melopsittacus undulatus' },
    ],
  },
  {
    id: 'mammals',
    title: 'Mammals',
    Icon: PawPrint,
    animals: [
      { id: 'spotted-deer', common: 'Spotted Deer', scientific: 'Axis axis' },
      { id: 'sambar-deer', common: 'Sambar Deer', scientific: 'Rusa unicolor' },
      { id: 'bonnet-macaque', common: 'Bonnet Macaque', scientific: 'Macaca radiata' },
      { id: 'rhesus-macaque', common: 'Rhesus Macaque', scientific: 'Macaca mulatta' },
      { id: 'bengal-fox', common: 'Bengal Fox', scientific: 'Vulpes bengalensis' },
      { id: 'golden-jackal', common: 'Golden Jackal', scientific: 'Canis aureus' },
      { id: 'asian-palm-civet', common: 'Asian Palm Civet', scientific: 'Paradoxurus hermaphroditus' },
    ],
  },
  {
    id: 'reptiles',
    title: 'Reptiles',
    Icon: Turtle,
    animals: [
      { id: 'marsh-crocodile', common: 'Marsh Crocodile', scientific: 'Crocodylus palustris' },
      { id: 'red-eared-slider', common: 'Red Eared Slider', scientific: 'Trachemys scripta elegans' },
      { id: 'indian-star-tortoise', common: 'Indian Star Tortoise', scientific: 'Geochelone elegans' },
      { id: 'rock-python', common: 'Indian Rock Python', scientific: 'Python molurus' },
    ],
  },
]

interface AnimalCardProps {
  id: string
  name: string
  scientific?: string
  Icon: LucideIcon
  onViewDetails: (id: string) => void
}

function AnimalCard({ id, name, scientific, Icon, onViewDetails, image }: AnimalCardProps & { image?: string }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#eee] bg-white shadow-md transition duration-300 ease-smooth hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-48 w-full overflow-hidden bg-white rounded-t-[10px]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name} className="w-full h-full object-cover rounded-t-[10px]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-12 w-12 text-forest-green/80 transition duration-300 ease-smooth group-hover:scale-110" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center gap-2 p-6 text-center">
        <h3 className="text-xl font-bold text-forest-green">{name}</h3>
        {scientific && <p className="text-sm italic text-slate-500">{scientific}</p>}
        <div className="mt-3">
          <Button type="button" variant="default" size="sm" className="px-6" onClick={() => onViewDetails(id)}>
            View Details
          </Button>
        </div>
      </div>
    </article>
  )
}

export function AnimalInfoPage() {
  const [activeAnimalId, setActiveAnimalId] = useState<string | null>(null)

  const selectedAnimal = useMemo(() => {
    return activeAnimalId ? animalData.find((animal) => animal.id === activeAnimalId) ?? null : null
  }, [activeAnimalId])

  const selectedAnimalImage = useMemo(() => {
    return selectedAnimal ? resolveImage(selectedAnimal.image) : ''
  }, [selectedAnimal])

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return
    }

    if (!activeAnimalId) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveAnimalId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeAnimalId])

  const handleOpenModal = (id: string) => {
    setActiveAnimalId(id)
  }

  const handleCloseModal = () => {
    setActiveAnimalId(null)
  }

  return (
    <div className="page-enter space-y-16 bg-white pb-28">
      <section className="relative isolate overflow-hidden bg-forest-green">
        <div className="container py-16">
          <div className="mx-auto max-w-3xl space-y-4 text-center">
            <h1 className="serif-heading text-4xl font-black text-[#FACC15] mx-auto">Wild Animals</h1>
            <p className="text-base font-medium text-white md:text-lg">Meet the wild residents of the park</p>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container">
          <div className="mx-auto max-w-6xl space-y-12 rounded-3xl border border-forest-green/15 bg-white p-8 shadow-md sm:p-10 md:p-12">
            {animalSections.map((section) => (
              <section key={section.id} className="space-y-6">
                <div className="space-y-2 text-center md:text-left">
                  <h2 className="serif-heading text-3xl font-bold text-forest-green md:text-4xl">{section.title}</h2>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-forest-green/60">
                    Curated highlights from our collection
                  </p>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {section.animals.map((animal) => {
                    const detail = animalData.find((d) => d.id === animal.id)
                    const img = detail ? resolveImage(detail.image) : ''
                    return (
                      <AnimalCard
                        key={`${section.id}-${animal.common}`}
                        id={animal.id}
                        name={animal.common}
                        scientific={animal.scientific}
                        Icon={section.Icon}
                        onViewDetails={handleOpenModal}
                        image={img}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
      {selectedAnimal && (
        <AnimalDetailModal animal={selectedAnimal} imageUrl={selectedAnimalImage} onClose={handleCloseModal} />
      )}
    </div>
  )
}

interface AnimalDetailModalProps {
  animal: AnimalDetail
  imageUrl?: string
  onClose: () => void
}

function AnimalDetailModal({ animal, imageUrl, onClose }: AnimalDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-8">
      <button
        type="button"
        aria-label="Close animal details"
        className="absolute inset-0 bg-[rgba(0,0,0,0.85)] backdrop-blur-[8px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${animal.commonName} details`}
        className="animal-modal relative z-10 w-[95%] md:w-[90%] max-w-[900px] max-h-[85vh] flex max-h-full flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_35px_90px_rgba(15,23,42,0.35)]"
      >
        <div className="flex items-center justify-between gap-6 bg-[#FACC15] px-8 py-5 text-forest-green flex-none">
          <div className="space-y-1">
            <p className="serif-heading text-3xl font-black leading-tight text-forest-green">
              {animal.commonName}
            </p>
            <p className="text-base italic text-forest-green/80">{animal.scientificName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/30 text-2xl font-black text-forest-green transition hover:bg-white/60"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="animal-modal-body overflow-y-auto p-6 pr-8">
          <div className="grid gap-6 bg-white lg:min-h-[420px] lg:grid-cols-[0.9fr_1.1fr]">
            <div className="self-start flex flex-col rounded-[20px] border border-forest-green/15 bg-gradient-to-br from-forest-green/5 via-white to-yellow-50 p-3 shadow-inner">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/70">Animal Portrait</p>
              <div className="animal-portrait mt-3 h-[320px] w-full overflow-hidden rounded-[10px] bg-white/70 text-center text-lg font-semibold text-forest-green/70">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={animal.commonName} className="w-full h-full object-cover" />
                  ) : (
                    'Image placeholder'
                  )}
                </div>
            </div>

            <div className="rounded-[20px] border border-yellow-100 bg-white/95 p-4 shadow-lg">
              <div className="divide-y divide-yellow-100">
                {animal.sections.map((section) => (
                  <div
                    key={`${animal.id}-${section.label}`}
                    className="grid gap-4 py-3 md:grid-cols-[160px_1fr]"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-forest-green">
                      {section.label}
                    </p>
                    <div className="space-y-2 text-left">
                      {section.values.map((value, index) => (
                        <p key={`${section.label}-${index}`} className="text-base leading-tight text-slate-600">
                          {value}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
