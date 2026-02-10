import { HeartHandshake, Leaf, Map, Sparkles, Trees } from 'lucide-react'

type CSRItem = {
  title: string
  cost: string
  impact: string
}

type CSRSection = {
  id: string
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  tone: string
  items: CSRItem[]
}

const csrSections: CSRSection[] = [
  {
    id: 'animal-care',
    title: 'Animal Care & Welfare',
    icon: HeartHandshake,
    tone: 'from-emerald-50 to-white',
    items: [
      {
        title: 'Animal adoption programme',
        cost: '₹ 500 to ₹ 10,00,000+',
        impact: 'Sustain feed, enrichment, and veterinary care across flagship species.',
      },
      {
        title: 'Animal enclosure enrichment and equipment',
        cost: '₹ 2,00,000',
        impact: 'Habitat furniture, climbing structures, and sensory tools for welfare.',
      },
      {
        title: 'Development of aviary with enrichment',
        cost: '₹ 5,00,000',
        impact: 'Flight space upgrades and mixed-species enrichment for birds.',
      },
      {
        title: 'Provision of cattle feed choppers',
        cost: '₹ 50,000',
        impact: 'Efficient feed prep to reduce waste and improve nutrition delivery.',
      },
    ],
  },
  {
    id: 'park-development',
    title: 'Park Development',
    icon: Trees,
    tone: 'from-olive-50 to-white',
    items: [
      {
        title: 'Conservation-themed enclosure murals',
        cost: '₹ 50,000',
        impact: 'Educational storytelling along visitor pathways.',
      },
      {
        title: 'Modernized toilet blocks',
        cost: '₹ 5,00,000',
        impact: 'Accessible, hygienic amenities for families and seniors.',
      },
      {
        title: 'Shaded parking structures',
        cost: '₹ 20,00,000',
        impact: 'Better visitor comfort and thermal protection for vehicles.',
      },
      {
        title: 'Interpretive signage and animal info boards',
        cost: '₹ 10,000 – 50,000',
        impact: 'Consistent wayfinding and species education across the park.',
      },
      {
        title: 'Lawn and flowering landscapes',
        cost: '₹ 1,00,000 – 3,00,000',
        impact: 'Pollinator-friendly green pockets that soften hardscapes.',
      },
      {
        title: 'Rest sheds across visitor circuits',
        cost: '₹ 5,00,000',
        impact: 'Comfort stops that improve dwell time and experience.',
      },
      {
        title: 'Staff changing and dining spaces',
        cost: '₹ 10,00,000',
        impact: 'Safe, dignified facilities for frontline animal care teams.',
      },
    ],
  },
  {
    id: 'visitor-amenities',
    title: 'Visitor Amenities',
    icon: Map,
    tone: 'from-sage-50 to-white',
    items: [
      {
        title: 'RO water systems and pipelines',
        cost: '₹ 5,00,000',
        impact: 'Reliable, clean drinking water across visitor loops.',
      },
      {
        title: 'Garden benches for visitors',
        cost: '₹ 1,00,000',
        impact: 'Resting spots with shade for seniors and families.',
      },
      {
        title: 'Animal-themed dustbins',
        cost: '₹ 50,000',
        impact: 'Playful waste stations that keep enclosures litter-free.',
      },
      {
        title: 'Mothers’ feeding room',
        cost: '₹ 10,00,000',
        impact: 'Private, hygienic space for nursing and childcare.',
      },
      {
        title: 'Cloak room with 500 lockers',
        cost: '₹ 5,00,000',
        impact: 'Secure storage to improve visitor mobility and safety.',
      },
      {
        title: 'Battery car/cycle waiting shelters',
        cost: '₹ 10,00,000',
        impact: 'Organized staging for electric mobility inside the park.',
      },
    ],
  },
  {
    id: 'others',
    title: 'Other Impact Areas',
    icon: Sparkles,
    tone: 'from-amber-50 to-white',
    items: [
      {
        title: 'Kids Zone play installations',
        cost: '₹ 10,00,000',
        impact: 'Inclusive play and learning moments for young visitors.',
      },
      {
        title: 'Staff welfare kits (rain gear, boots, uniforms)',
        cost: '₹ 5,00,000',
        impact: 'Safety and comfort for frontline teams in all seasons.',
      },
      {
        title: 'Advertising on tickets (annual)',
        cost: '₹ 50,000 / year',
        impact: 'Co-branded outreach to all park visitors.',
      },
      {
        title: 'Animal statues and entry arch',
        cost: '₹ 5,00,000 – 20,00,000',
        impact: 'Signature landmarks that celebrate wildlife identity.',
      },
      {
        title: 'Water fountain creation',
        cost: '₹ 5,00,000',
        impact: 'Cooling microclimate and visual delight.',
      },
      {
        title: 'CCTV surveillance coverage',
        cost: '₹ 20,000',
        impact: 'Enhanced safety and asset protection across zones.',
      },
    ],
  },
]

function SectionCard({ section }: { section: CSRSection }) {
  const Icon = section.icon
  return (
    <section className="space-y-4" aria-labelledby={section.id}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-green/10 text-forest-green">
          <Icon size={22} aria-hidden="true" />
        </div>
        <div>
          <h2 id={section.id} className="text-xl font-semibold text-forest-green md:text-2xl">
            {section.title}
          </h2>
          <div className="mt-1 h-1 w-16 rounded-full bg-forest-green/30" />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {section.items.map(item => (
          <article
            key={item.title}
            className="group relative overflow-hidden rounded-2xl border border-forest-green/12 bg-white/95 p-5 shadow-[0_12px_28px_rgba(26,62,39,0.06)] transition hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(26,62,39,0.10)]"
          >
            <div className={`absolute inset-0 opacity-70 bg-gradient-to-br ${section.tone}`} aria-hidden="true" />
            <div className="relative space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-semibold leading-snug text-forest-green/95">{item.title}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-forest-green/10 px-3 py-1 text-xs font-semibold leading-none text-forest-green/90 shadow-sm">
                  <span className="font-semibold tracking-tight">₹</span>
                  <span className="font-semibold tracking-tight whitespace-nowrap">{item.cost.replace('₹ ', '')}</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed text-forest-green/80">{item.impact}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function CSRActivityPage() {
  return (
    <section className="page-enter bg-soft-bg pb-20">
      <div className="relative -mx-4 overflow-hidden sm:-mx-0">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-olive-50" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/80 via-white/40 to-transparent" aria-hidden="true" />
        <div className="relative container flex flex-col items-center gap-4 px-6 py-16 text-center md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/70">CSR Initiatives</p>
          <h1 className="text-4xl font-bold text-forest-green md:text-5xl">Partner With Kurumbapatti Zoo</h1>
          <p className="max-w-3xl text-lg leading-relaxed text-forest-green/80">
            Collaborative projects that advance conservation, education, and visitor wellbeing. Choose an initiative or co-design
            a custom program with our team.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-medium text-forest-green/80">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 shadow-sm">
              <Leaf size={16} aria-hidden="true" /> Nature-positive investments
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 shadow-sm">
              <HeartHandshake size={16} aria-hidden="true" /> Transparent impact tracking
            </span>
          </div>
        </div>
      </div>

      <div className="container -mt-6 flex flex-col gap-10">
        <div className="mx-auto max-w-5xl rounded-3xl border border-forest-green/10 bg-white/90 p-8 shadow-forest-lg backdrop-blur md:p-10">
          <div className="space-y-3 text-center text-forest-green">
            <h2 className="text-2xl font-semibold md:text-3xl">Focused, Fundable Opportunities</h2>
            <p className="text-lg leading-relaxed text-forest-green/80">
              Four streams to match your CSR priorities. Each initiative lists an indicative investment and its on-ground impact.
            </p>
          </div>
        </div>

        <div className="space-y-12">
          {csrSections.map(section => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>

        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 rounded-3xl border border-forest-green/12 bg-gradient-to-br from-emerald-50 via-white to-olive-50 px-8 py-10 text-center text-forest-green shadow-[0_16px_40px_rgba(26,62,39,0.08)]">
          <h3 className="text-2xl font-semibold md:text-3xl">Ready to collaborate?</h3>
          <p className="max-w-2xl text-base leading-relaxed text-forest-green/80">
            We co-create scopes, milestones, and visibility plans with every partner. Reach out to align on budgets, timelines,
            and the impact you want to champion.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-forest-green/80">
            <span className="rounded-full bg-forest-green/10 px-3 py-1">Dedicated liaison for partners</span>
            <span className="rounded-full bg-forest-green/10 px-3 py-1">Progress reports and audits</span>
            <span className="rounded-full bg-forest-green/10 px-3 py-1">On-site visibility options</span>
          </div>
          <a
            href="/contact"
            className="inline-flex items-center justify-center rounded-2xl bg-forest-green px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Contact Director for CSR
          </a>
        </div>
      </div>
    </section>
  )
}
