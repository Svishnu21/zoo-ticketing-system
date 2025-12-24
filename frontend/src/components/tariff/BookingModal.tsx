import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

import type { LocalizedText, TariffItem } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface SelectedItem extends TariffItem {
  quantity: number
}

interface BookingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: SelectedItem[]
  total: number
}

const fieldLabels: Record<string, LocalizedText> = {
  name: { en: 'Full Name', ta: 'முழுப் பெயர்' },
  email: { en: 'Email Address', ta: 'மின்னஞ்சல் முகவரி' },
  phone: { en: 'Phone Number', ta: 'தொலைபேசி எண்' },
  visitDate: { en: 'Preferred Visit Date', ta: 'விருப்பமான வருகை தேதி' },
  notes: { en: 'Additional Notes', ta: 'கூடுதல் குறிப்புகள்' },
}

export function BookingModal({ open, onOpenChange, items, total }: BookingModalProps) {
  const { language } = useLanguage()
  const [submitted, setSubmitted] = useState(false)
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    visitDate: '',
    notes: '',
  })

  const summary = useMemo(
    () =>
      items.filter((item) => item.quantity > 0).map((item) => ({
        id: item.id,
        label: item.label,
        quantity: item.quantity,
        amount: item.quantity * item.price,
      })),
    [items],
  )

  const hasSelection = summary.length > 0

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasSelection) return
    setSubmitted(true)
    window.setTimeout(() => onOpenChange(false), 1500)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10 backdrop-blur">
  <div className="relative w-full max-w-3xl rounded-3xl bg-white p-8 shadow-lg">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-full bg-soft-bg p-2 text-forest-green transition-colors duration-300 ease-smooth hover:bg-vibrant-green hover:text-white"
          aria-label="Close booking modal"
        >
          <X size={18} />
        </button>

        <h3 className="text-2xl font-bold text-forest-green">{language === 'en' ? 'Online Ticket Booking' : 'ஆன்லைன் டிக்கெட் முன்பதிவு'}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {language === 'en'
            ? 'Complete the form and we will confirm your booking via email.'
            : 'படிவத்தை நிரப்புங்கள்; உங்கள் முன்பதிவை மின்னஞ்சல் மூலம் உறுதிப்படுத்துவோம்.'}
        </p>

        <div className="mt-6 grid gap-8 md:grid-cols-[2fr,3fr]">
          <div className="space-y-4 rounded-2xl border border-forest-green/20 bg-soft-bg p-4">
            <h4 className="text-lg font-semibold text-forest-green">
              {language === 'en' ? 'Your Selection' : 'உங்கள் தேர்வு'}
            </h4>
            {summary.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {language === 'en'
                  ? 'Use the ticket grid to add passes before booking.'
                  : 'முன்பதிவு செய்யும் முன் டிக்கெட் கிரிடில் தேர்வுகளைச் சேருங்கள்.'}
              </p>
            )}
            <ul className="space-y-3">
              {summary.map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span>
                    {item.label[language]} <span className="text-muted-foreground">× {item.quantity}</span>
                  </span>
                  <span className="font-semibold">₹ {item.amount}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-forest-green/15 pt-4">
              <p className="text-base font-bold text-forest-green">
                {language === 'en' ? 'Total' : 'மொத்தம்'}: ₹ {total}
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {(Object.keys(formState) as Array<keyof typeof formState>).map((field) => {
              const isNotes = field === 'notes'
              const inputType = field === 'visitDate' ? 'date' : field === 'email' ? 'email' : 'text'
              return (
                <label key={field} className="block text-sm font-medium text-muted-foreground">
                  <span className="mb-1 inline-block text-forest-green">{fieldLabels[field][language]}</span>
                  {isNotes ? (
                    <textarea
                      value={formState[field]}
                      onChange={(event) => handleChange(field, event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-green"
                    />
                  ) : (
                    <input
                      value={formState[field]}
                      onChange={(event) => handleChange(field, event.target.value)}
                      type={inputType}
                      required
                      className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-green"
                    />
                  )}
                </label>
              )
            })}

            <Button
              type="submit"
              size="lg"
              className={cn('w-full', !hasSelection && 'cursor-not-allowed opacity-60')}
              disabled={!hasSelection}
            >
              {submitted
                ? language === 'en'
                  ? 'Booking Sent!'
                  : 'முன்பதிவு அனுப்பப்பட்டது!'
                : language === 'en'
                  ? 'Confirm Booking'
                  : 'முன்பதிவை உறுதிசெய்க'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
