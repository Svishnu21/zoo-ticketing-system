import { type ComponentType, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, CigaretteOff, Cctv, Fence, Flower2, Hand, Trash2, UtensilsCrossed, VolumeX, WineOff } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { parkRules, moreRulesGallery } from '@/data/content'
import type { ParkRuleIcon, RuleGalleryItem } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'
import { cn } from '@/utils/cn'

const iconMap: Record<ParkRuleIcon, ComponentType<{ className?: string }>> = {
  cctv: Cctv,
  utensils: UtensilsCrossed,
  hand: Hand,
  fence: Fence,
  silence: VolumeX,
  trash: Trash2,
  ban: Ban,
  smoke: CigaretteOff,
  alcohol: WineOff,
  flowers: Flower2,
}

export function ParkRulesPage() {
  const { language } = useLanguage()
  const [previewItem, setPreviewItem] = useState<RuleGalleryItem | null>(null)

  useEffect(() => {
    if (!previewItem) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewItem(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewItem])

  return (
    <div className="space-y-20">
      <section className="relative isolate overflow-hidden bg-soft-bg py-20">
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-forest-green/10 via-vibrant-green/5 to-transparent" />
        <div className="container space-y-16">
          <header className="mx-auto max-w-4xl space-y-6 text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-forest-green/30 bg-white/80 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-forest-green shadow-sm backdrop-blur">
              Park Rules | பூங்கா விதிகள்
            </span>
            <h1 className="text-4xl font-bold text-forest-green md:text-5xl">
              {language === 'en' ? 'Respect Wildlife, Cherish Every Visit' : 'விலங்குகளை மதித்து, ஒவ்வொரு வருகையையும் சிறப்பிக்கவும்'}
            </h1>
            <p className="text-base text-muted-foreground md:text-lg">
              {language === 'en'
                ? 'Please review these essential guidelines before you begin exploring Kurumbapatti Zoological Park. They ensure a safe, serene, and memorable experience for you and the wildlife we protect.'
                : 'குரும்பப்பட்டி உயிரியல் பூங்காவை ஆராயும் முன் இந்த முக்கிய வழிகாட்டுதல்களைப் படிக்கவும். அவை உங்களுக்கும் நாம் காக்கும் விலங்குகளுக்கும் பாதுகாப்பான, அமைதியான, நினைவுகூரத்தக்க அனுபவத்தை ஏற்படுத்துகின்றன.'}
            </p>
            <div className="flex justify-center">
              <Button asChild variant="hero" size="lg">
                <Link to="/">
                  {language === 'en' ? 'Back to Home' : 'முகப்புக்கு திரும்ப'}
                </Link>
              </Button>
            </div>
          </header>

          <div className="rounded-3xl border border-forest-green/15 bg-white/90 shadow-xl">
            <div className="overflow-hidden rounded-3xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead className="bg-forest-green text-white">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.25em]">Symbol / சின்னம்</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.25em]">Guideline / விதி</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parkRules.map((rule, index) => {
                      const Icon = iconMap[rule.icon]

                      return (
                        <tr
                          key={rule.id}
                          className={cn(
                            'border-b border-forest-green/10 bg-white/95',
                            index % 2 === 1 && 'bg-soft-bg/80',
                          )}
                        >
                          <td className="px-6 py-5 align-top">
                            <div className="flex items-start gap-4">
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-100 text-red-600">
                                <Icon className="h-6 w-6" aria-hidden="true" />
                              </span>
                              <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
                                <p>{rule.description.en}</p>
                                <p className="text-[11px] text-forest-green/70">{rule.description.ta}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 align-top">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-forest-green">{rule.title.en}</p>
                              <p className="text-sm font-semibold text-forest-green/80">{rule.title.ta}</p>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="border-t border-forest-green/10 bg-soft-bg/60 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.3em] text-forest-green">
              Follow · Respect · Preserve / கண்காணி · மரியாதை செய் · பாதுகாப்போம்
            </div>
          </div>

          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-forest-green md:text-4xl">{language === 'en' ? 'More Rules to be Followed' : 'மேலும் பின்பற்ற வேண்டிய விதிகள்'}</h2>
              <p className="mt-3 text-base text-muted-foreground md:text-lg">
                {language === 'en'
                  ? 'Visual reminders to keep every visit safe and respectful.'
                  : 'ஒவ்வொரு வருகையும் பாதுகாப்பாகவும் மரியாதையாகவும் இருக்கும் வகையில் காட்சிப்படுத்தப்பட்ட நினைவூட்டல்கள்.'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {moreRulesGallery.map((item) => (
                <article
                  key={item.id}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-forest-green/15 bg-white shadow-lg transition-transform duration-300 ease-smooth hover:-translate-y-1 hover:shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => setPreviewItem(item)}
                    className="group relative aspect-[4/3] w-full overflow-hidden bg-soft-bg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/40"
                  >
                    <img
                      src={item.image}
                      alt={item.title[language]}
                      loading="lazy"
                      className="h-full w-full transform object-cover transition-transform duration-500 ease-smooth group-hover:scale-105"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-forest-green/30 opacity-0 transition-opacity duration-300 ease-smooth group-hover:opacity-100 group-focus-visible:opacity-100">
                      <span className="rounded-full bg-white/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-forest-green">
                        {language === 'en' ? 'Preview' : 'முன்னோட்டம்'}
                      </span>
                    </span>
                  </button>
                  <div className="flex flex-1 flex-col justify-center px-6 pb-8 pt-6 text-center">
                    <h3 className="text-lg font-semibold text-forest-green">{item.title.en}</h3>
                    <p className="mt-2 text-sm font-medium text-forest-green/80 rule-card-tamil">{item.title.ta}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-10"
          onClick={() => setPreviewItem(null)}
          role="presentation"
        >
          <div
            className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/40"
              onClick={() => setPreviewItem(null)}
              aria-label={language === 'en' ? 'Close preview' : 'முன்னோட்டத்தை மூடவும்'}
            >
              X
            </button>
            <div className="flex w-full items-center justify-center bg-black/80">
              <img
                src={previewItem.image}
                alt={previewItem.title[language]}
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            <div className="bg-white/90 px-8 py-6 text-center">
              <h3 className="text-xl font-semibold text-forest-green">{previewItem.title.en}</h3>
              <p className="mt-2 text-sm font-medium text-forest-green/80 rule-card-tamil">{previewItem.title.ta}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
