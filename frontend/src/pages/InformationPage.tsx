import { Link } from 'react-router-dom'
import {
  Compass,
  ShieldCheck,
  Leaf,
  Ticket,
  QrCode,
  Clock,
  HeartHandshake,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/providers/LanguageProvider'

export function InformationPage() {
  const { language } = useLanguage()

  const isEn = language === 'en'

  return (
    <div className="space-y-16 py-12">
      {/* Hero Section */}
      <section className="relative isolate overflow-hidden bg-soft-bg py-16">
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-forest-green/10 via-vibrant-green/5 to-transparent" />
        <div className="container max-w-5xl space-y-6 text-center">
          <span className="inline-flex items-center justify-center rounded-full border border-forest-green/30 bg-white/80 px-6 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-forest-green shadow-sm backdrop-blur">
            {isEn ? 'Visitor Guide · தகவல் வழிகாட்டி' : 'தகவல் வழிகாட்டி · Visitor Guide'}
          </span>
          <h1 className="text-4xl font-bold text-forest-green md:text-5xl">
            {isEn ? 'Information' : 'தகவல்'}
          </h1>
          <p className="mx-auto max-w-3xl text-base text-muted-foreground md:text-lg leading-relaxed">
            {isEn
              ? "Kurumbapatti Zoological Park is one of Salem's popular nature destinations, offering visitors an opportunity to experience wildlife conservation, environmental education, and family-friendly recreation."
              : 'குரும்பப்பட்டி உயிரியல் பூங்கா சேலத்தின் பிரபலமான இயற்கை சுற்றுலா தலங்களில் ஒன்றாகும். இது பார்வையாளர்களுக்கு வனவிலங்கு பாதுகாப்பு, சுற்றுச்சூழல் கல்வி மற்றும் குடும்ப பொழுதுபோக்கு அனுபவத்தை வழங்குகிறது.'}
          </p>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="container max-w-6xl space-y-12">
        {/* Welcome Section Banner Card */}
        <article className="group overflow-hidden rounded-3xl border border-forest-green/20 bg-white p-8 md:p-10 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forest-green/10 text-forest-green">
              <Compass className="h-7 w-7" />
            </div>
            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-forest-green md:text-3xl">
                {isEn ? 'Welcome to Kurumbapatti Zoological Park' : 'குரும்பப்பட்டி உயிரியல் பூங்காவிற்கு நல்வரவு'}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                {isEn
                  ? 'Kurumbapatti Zoological Park is maintained to provide a safe, clean, and enjoyable environment for visitors of all ages. Nestled at the foothills of the Shevaroys, the park features lush green spaces, diverse fauna, and immersive educational trails designed for families, students, and nature enthusiasts.'
                  : 'குரும்பப்பட்டி உயிரியல் பூங்கா அனைத்து வயது பார்வையாளர்களுக்கும் பாதுகாப்பான, சுத்தமான மற்றும் மகிழ்ச்சியான சூழலை வழங்கும் வகையில் பராமரிக்கப்படுகிறது. சேர்வராயன் மலை அடிவாரத்தில் அமைந்துள்ள இப்பூங்கா பசுமையான இடங்கள், பல்வேறு விலங்கினங்கள் மற்றும் சுற்றுச்சூழல் கல்வி அனுபவங்களை வழங்குகிறது.'}
              </p>
            </div>
          </div>
        </article>

        {/* 2-Column Grid for Before You Visit & Visitor Guidelines */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Before You Visit */}
          <article className="group flex flex-col justify-between rounded-3xl border border-forest-green/20 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-green/10 text-forest-green">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-forest-green md:text-2xl">
                  {isEn ? 'Before You Visit' : 'வருவதற்கு முன் அறிய வேண்டியவை'}
                </h2>
              </div>
              <ul className="space-y-3.5 text-sm md:text-base text-muted-foreground">
                {[
                  isEn ? 'Carry a valid booking confirmation or ticket.' : 'செல்லுபடியாகும் முன்பதிவு உறுதிப்படுத்தல் அல்லது டிக்கெட்டை உடன் வைத்திருங்கள்.',
                  isEn ? 'Follow all instructions provided by zoo staff.' : 'பூங்கா ஊழியர்கள் வழங்கும் அனைத்து வழிகாட்டுதல்களையும் பின்பற்றுங்கள்.',
                  isEn ? 'Keep the surroundings clean and use designated waste bins.' : 'சுற்றுப்புறத்தை சுத்தமாக வைத்து, குறிப்பிட்ட குப்பைத் தொட்டிகளைப் பயன்படுத்துங்கள்.',
                  isEn ? 'Stay on marked visitor pathways at all times.' : 'எப்போதும் குறிக்கப்பட்ட பார்வையாளர் பாதைகளிலேயே செல்லுங்கள்.',
                  isEn ? 'Supervise children at all times.' : 'குழந்தைகளை எப்போதும் கவனித்துக் கொள்ளுங்கள்.',
                  isEn ? 'Photography is permitted in general visitor areas unless instructed otherwise.' : 'பொது பார்வையாளர் பகுதிகளில் புகைப்படம் எடுக்க அனுமதி உண்டு.',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-forest-green" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          {/* Visitor Guidelines */}
          <article className="group flex flex-col justify-between rounded-3xl border border-forest-green/20 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-700">
                  <Leaf className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-forest-green md:text-2xl">
                  {isEn ? 'Visitor Guidelines' : 'பார்வையாளர் விதிமுறைகள்'}
                </h2>
              </div>
              <ul className="space-y-3.5 text-sm md:text-base text-muted-foreground">
                {[
                  isEn ? 'Do not feed or disturb the animals.' : 'விலங்குகளுக்கு உணவளிக்கவோ அல்லது இடையூறு செய்யவோ வேண்டாம்.',
                  isEn ? 'Avoid making loud noises near animal enclosures.' : 'விலங்கு அடைப்புகளுக்கு அருகில் உரத்த சத்தம் எழுப்புவதைத் தவிர்க்கவும்.',
                  isEn ? 'Smoking and alcohol consumption are strictly prohibited.' : 'புகைபிடித்தல் மற்றும் மது அருந்துதல் முற்றிலும் தடைசெய்யப்பட்டுள்ளது.',
                  isEn ? 'Do not pluck plants or damage park property.' : 'செடிகளைப் பறிக்கவோ அல்லது பூங்கா சொத்துக்களை சேதப்படுத்தவோ கூடாது.',
                  isEn ? 'Pets are not allowed inside the zoo.' : 'பூங்காவிற்குள் செல்லப் பிராணிகளுக்கு அனுமதி இல்லை.',
                  isEn ? 'Help us maintain a plastic-free and eco-friendly environment.' : 'நெகிழி அற்ற மற்றும் சூழல் நட்பு சூழலை பராமரிக்க உதவுங்கள்.',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>

        {/* 2-Column Grid for Ticket Information & Digital QR Verification */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Ticket Information */}
          <article className="group rounded-3xl border border-forest-green/20 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-green/10 text-forest-green">
                  <Ticket className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-forest-green md:text-2xl">
                  {isEn ? 'Ticket Information' : 'டிக்கெட் தகவல்கள்'}
                </h2>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">
                {isEn
                  ? 'Visitors can conveniently book tickets online through the official website or purchase them at the ticket counter during operating hours (subject to availability).'
                  : 'பார்வையாளர்கள் அதிகாரப்பூர்வ இணையதளம் மூலம் ஆன்லைனில் அல்லது வேலை நேரங்களில் டிக்கெட் கவுண்டரில் டிக்கெட்டுகளை வாங்கலாம்.'}
              </p>
              <div className="rounded-2xl border border-forest-green/15 bg-soft-bg p-5">
                <p className="text-sm font-semibold text-forest-green">
                  📌 {isEn ? 'Keep your ticket safe throughout your visit, as it may be required for verification at entry points.' : 'நுழைவு வாயில்களில் சரிபார்ப்பிற்கு தேவைப்படலாம் என்பதால் டிக்கெட்டை பாதுகாப்பாக வைக்கவும்.'}
                </p>
              </div>
            </div>
          </article>

          {/* Digital Ticket & QR Verification */}
          <article className="group rounded-3xl border border-forest-green/20 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-green/10 text-forest-green">
                  <QrCode className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-forest-green md:text-2xl">
                  {isEn ? 'Digital Ticket & QR Verification' : 'டிஜிட்டல் டிக்கெட் & QR சரிபார்ப்பு'}
                </h2>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">
                {isEn
                  ? 'Each online booking generates a unique QR code for secure entry. Visitors are requested to present the QR code at the entrance for quick validation.'
                  : 'ஒவ்வொரு ஆன்லைன் முன்பதிவும் பாதுகாப்பான நுழைவிற்கு தனித்துவமான QR குறியீட்டை உருவாக்குகிறது.'}
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-semibold text-forest-green">{isEn ? 'For a smoother experience:' : 'சமூகமான நுழைவிற்கு:'}</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>{isEn ? 'Ensure your mobile device is sufficiently charged.' : 'மொபைல் போனில் போதிய சார்ஜ் இருப்பதை உறுதிசெய்யவும்.'}</li>
                  <li>{isEn ? 'Keep the QR code ready before reaching the entry gate.' : 'நுழைவு வாயிலை அடைவதற்கு முன் QR குறியீட்டை தயார் நிலையில் வைக்கவும்.'}</li>
                  <li>{isEn ? 'One ticket is valid for one-time entry only.' : 'ஒரு டிக்கெட் ஒருமுறை மட்டுமே பயன்படுத்த முடியும்.'}</li>
                </ul>
              </div>
            </div>
          </article>
        </div>

        {/* 2-Column Grid for Park Timings & Conservation */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Park Timings */}
          <article className="group flex flex-col justify-between rounded-3xl border-2 border-forest-green/30 bg-gradient-to-br from-white via-soft-bg/50 to-forest-green/5 p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-green text-white">
                  <Clock className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-forest-green md:text-2xl">
                  {isEn ? 'Park Timings' : 'பூங்கா நேரங்கள்'}
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-2xl border border-forest-green/20 bg-white p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{isEn ? 'Opening Time' : 'திறக்கும் நேரம்'}</span>
                  <p className="mt-1 text-2xl font-bold text-forest-green">9:00 AM</p>
                </div>
                <div className="rounded-2xl border border-forest-green/20 bg-white p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{isEn ? 'Closing Time' : 'மூடும் நேரம்'}</span>
                  <p className="mt-1 text-2xl font-bold text-forest-green">5:00 PM</p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-center">
                <p className="text-sm font-bold text-amber-800">
                  🗓️ {isEn ? 'Weekly Holiday: Tuesday (Closed)' : 'வாராந்திர விடுமுறை: செவ்வாய்க்கிழமை (மூடப்படும்)'}
                </p>
              </div>

              <p className="text-xs text-center text-muted-foreground italic">
                {isEn ? 'Visitors are advised to arrive early to enjoy the complete zoo experience.' : 'முழுமையான அனுபவத்தைப் பெற பார்வையாளர்கள் சீக்கிரம் வர அறிவுறுத்தப்படுகிறார்கள்.'}
              </p>
            </div>
          </article>

          {/* Conservation & Awareness */}
          <article className="group flex flex-col justify-between rounded-3xl border border-forest-green/20 bg-white p-8 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-green/10 text-forest-green">
                  <HeartHandshake className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-forest-green md:text-2xl">
                  {isEn ? 'Conservation & Awareness' : 'பாதுகாப்பு & விழிப்புணர்வு'}
                </h2>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">
                {isEn
                  ? 'Kurumbapatti Zoological Park promotes wildlife conservation and environmental awareness through responsible animal care, educational initiatives, and sustainable practices.'
                  : 'குரும்பப்பட்டி உயிரியல் பூங்கா பொறுப்பான விலங்கு பராமரிப்பு, கல்வி முயற்சிகள் மற்றும் நிலையான நடைமுறைகள் மூலம் வனவிலங்கு பாதுகாப்பு மற்றும் சுற்றுச்சூழல் விழிப்புணர்வை ஊக்குவிக்கிறது.'}
              </p>
              <div className="rounded-2xl border border-forest-green/20 bg-forest-green/5 p-5">
                <p className="text-sm font-medium text-forest-green">
                  🌱 {isEn ? 'Every visitor contributes to protecting nature by following park rules and respecting wildlife.' : 'பூங்கா விதிகளை பின்பற்றுவதன் மூலம் ஒவ்வொரு பார்வையாளரும் இயற்கையை பாதுகாக்க பங்களிக்கின்றனர்.'}
                </p>
              </div>
            </div>
          </article>
        </div>

        {/* Need Assistance Banner Card */}
        <article className="rounded-3xl border border-forest-green/20 bg-gradient-to-r from-forest-green/10 via-soft-bg to-white p-8 md:p-10 shadow-lg text-center md:text-left">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <PhoneCall className="h-6 w-6 text-forest-green" />
                <h2 className="text-2xl font-bold text-forest-green">
                  {isEn ? 'Need Assistance?' : 'உதவி தேவையா?'}
                </h2>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">
                {isEn
                  ? 'If you require any help regarding ticket booking, facilities, accessibility, or general inquiries, please visit our Contact Us page or reach out to the park administration during working hours.'
                  : 'டிக்கெட் முன்பதிவு, வசதிகள் அல்லது பொதுவான கேள்விகள் தொடர்பான உதவி தேவைப்பட்டால், எங்களின் தொடர்பு பக்கத்தை பார்வையிடவும்.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 shrink-0">
              <Button asChild variant="hero" size="lg">
                <Link to="/contact">
                  <PhoneCall className="mr-2 h-4 w-4" />
                  {isEn ? 'Contact Us' : 'தொடர்புகொள்ள'}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-forest-green text-forest-green hover:bg-forest-green hover:text-white">
                <Link to="/tickets/zoo">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isEn ? 'Book Tickets' : 'டிக்கெட் முன்பதிவு'}
                </Link>
              </Button>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}
