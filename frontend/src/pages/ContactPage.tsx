import { useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { contactContent } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'

export function ContactPage() {
  const { language } = useLanguage()
  const [submitted, setSubmitted] = useState(false)
  const [formState, setFormState] = useState({ name: '', email: '', message: '' })

  const handleChange = (field: 'name' | 'email' | 'message', value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
    window.setTimeout(() => setSubmitted(false), 2000)
    setFormState({ name: '', email: '', message: '' })
  }

  return (
    <section className="page-enter bg-soft-bg py-20">
      <div className="container space-y-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-forest-green">{contactContent.title[language]}</h1>
          <p className="mt-2 text-xl text-muted-foreground">{contactContent.subtitle[language]}</p>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          <div className="rounded-3xl border border-forest-green/20 bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-forest-green">{contactContent.formHeading[language]}</h2>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-muted-foreground">
                <span className="mb-1 inline-block text-forest-green">{contactContent.fields.name[language]}</span>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) => handleChange('name', event.target.value)}
                  required
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-green"
                />
              </label>
              <label className="block text-sm font-medium text-muted-foreground">
                <span className="mb-1 inline-block text-forest-green">{contactContent.fields.email[language]}</span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  required
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-green"
                />
              </label>
              <label className="block text-sm font-medium text-muted-foreground">
                <span className="mb-1 inline-block text-forest-green">{contactContent.fields.message[language]}</span>
                <textarea
                  rows={5}
                  value={formState.message}
                  onChange={(event) => handleChange('message', event.target.value)}
                  required
                  className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-vibrant-green"
                />
              </label>
              <Button type="submit" size="lg" className="w-full">
                {submitted
                  ? language === 'en'
                    ? 'Message Sent!'
                    : 'செய்தி அனுப்பப்பட்டது!'
                  : contactContent.submit[language]}
              </Button>
            </form>
          </div>

          <div className="rounded-3xl border border-forest-green/20 bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-forest-green">
              {language === 'en' ? 'Contact Details' : 'தொடர்பு விவரங்கள்'}
            </h2>
            <div className="mt-6 space-y-6 text-muted-foreground">
              <div className="flex items-start gap-4">
                <MapPin className="mt-1 text-forest-green" size={24} />
                <div>
                  <p className="text-sm font-semibold text-forest-green">{contactContent.details.address.heading[language]}</p>
                  <p className="mt-2 whitespace-pre-line text-base">
                    {contactContent.details.address.value[language]}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="mt-1 text-forest-green" size={24} />
                <div>
                  <p className="text-sm font-semibold text-forest-green">{contactContent.details.phone.heading[language]}</p>
                  <p className="mt-2 text-base">{contactContent.details.phone.value[language]}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Mail className="mt-1 text-forest-green" size={24} />
                <div>
                  <p className="text-sm font-semibold text-forest-green">{contactContent.details.email.heading[language]}</p>
                  <p className="mt-2 text-base">{contactContent.details.email.value[language]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
