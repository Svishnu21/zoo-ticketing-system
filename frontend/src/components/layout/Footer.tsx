import { Facebook, Instagram, MapPin, Phone, Twitter } from 'lucide-react'
import { Link } from 'react-router-dom'

import { footerContent } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'
import footerBg from '@/assets/images/footer.jpg'

export function Footer() {
  const { language } = useLanguage()
  const informationLinks = [
    { id: 'terms', label: 'Terms & Conditions', path: '/terms' },
    { id: 'privacy', label: 'Privacy Policy', path: '/privacy' },
    { id: 'cancellation', label: 'Cancellation & Refund', path: '/cancellation' },
    { id: 'disclaimer', label: 'Disclaimer', path: '/disclaimer' },
  ]
  const supportLinks = [
    { id: 'vet-care', label: 'Wild Animal Vet Care', path: '/support/animal-vet-care' },
    { id: 'adoption', label: 'Adoption Scheme', path: '/support/adoption-scheme' },
    { id: 'education', label: 'Zoo Education', path: '/support/zoo-education' },
    { id: 'publication', label: 'Publication', path: '/support/publication' },
  ]

  return (
    <footer className="relative overflow-hidden gradient-forest text-white">
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-90"
        style={{
          backgroundImage: `url(${footerBg})`,
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'repeat-x',
          backgroundSize: 'auto 150px',
        }}
      />
      <div className="relative z-10">
        <div className="container grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <h4 className="mb-4 text-lg font-semibold uppercase tracking-wide">Quick Links</h4>
            <div className="grid gap-2">
              {footerContent.quickLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="capitalize text-white/80 transition-colors duration-300 ease-smooth hover:text-accent-yellow"
                >
                  {item.labels[language]}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold uppercase tracking-wide">Contact Info</h4>
            <div className="space-y-4 text-white/80">
              <div className="flex gap-3">
                <div className="flex-shrink-0 pt-1">
                  <MapPin size={20} />
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed max-w-[22rem]">
                  {footerContent.contact.address.value[language]}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex-shrink-0">
                  <Phone size={20} />
                </div>
                <span className="text-sm">{footerContent.contact.phone.value[language]}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold uppercase tracking-wide">Other Information</h4>
            <div className="grid gap-2 text-white/80">
              {informationLinks.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/80 transition-colors duration-300 ease-smooth hover:text-accent-yellow"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold uppercase tracking-wide">Support</h4>
            <div className="grid gap-2 text-white/80">
              {supportLinks.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-white/80 transition-colors duration-300 ease-smooth hover:text-accent-yellow"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-lg font-semibold uppercase tracking-wide">Follow Us</h4>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/15"
              >
                <Facebook size={18} aria-hidden="true" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/15"
              >
                <Instagram size={18} aria-hidden="true" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white/15"
              >
                <Twitter size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/20 py-6 text-center text-sm text-white/80">
          {footerContent.copyright[language]}
        </div>
      </div>
    </footer>
  )
}
