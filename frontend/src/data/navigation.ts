export interface NavLabels {
  en: string
  ta: string
}

export interface NavSubItem {
  path: string
  labels: NavLabels
}

export interface NavItem {
  path: string
  labels: NavLabels
  children?: NavSubItem[]
}

export const navItems: NavItem[] = [
  { path: '/', labels: { en: 'Home', ta: 'முகப்பு' } },
  {
    path: '/about',
    labels: { en: 'About Park', ta: 'பூங்கா பற்றி' },
    children: [
      { path: '/about', labels: { en: 'Park History', ta: 'பூங்கா வரலாறு' } },
      { path: '/about/how-to-reach', labels: { en: 'How to Reach Us', ta: 'எங்களை அடைவது எப்படி' } },
      { path: '/about/administration', labels: { en: 'Administrator', ta: 'நிர்வாகம்' } },
      
    ],
  },
  {
    path: '/tariff',
    labels: { en: 'Tariff', ta: 'கட்டணங்கள்' },
    children: [
      { path: '/tariff', labels: { en: 'Zoo Tariff', ta: 'பூங்கா கட்டணங்கள்' } },
      { path: '/tickets/zoo', labels: { en: 'Book Zoo Tickets', ta: 'பூங்கா  டிக்கெட்டுகள்' } },
      { path: '/adoption', labels: { en: 'Wild Animal Adoption', ta: 'வன விலங்கு தத்தெடுதல்' } },
    ],
  },
  { path: '/facilities', labels: { en: 'Facilities', ta: 'வசதிகள்' } },
  {
    path: '/information',
    labels: { en: 'Information', ta: 'தகவல்' },
    children: [
      { path: '/animal-info', labels: { en: 'Wild Animal Info', ta: 'வன விலங்கு தகவல்' } },
      { path: '/whats-new', labels: { en: "What's New", ta: 'புதிய செய்திகள்' } },
    ],
  },
  {
    path: '/partner-with-us',
    labels: { en: 'Partner With Us', ta: 'எங்களுடன் இணைவீர்' },
    children: [
      { path: '/partner-with-us/csr-activity', labels: { en: 'CSR Activity', ta: 'சமூக பொறுப்பு நடவடிக்கை' } },
    ],
  },
  {
    path: '/others',
    labels: { en: 'Others', ta: 'மற்றவை' },
    children: [
      { path: '/gallery', labels: { en: 'Gallery', ta: 'படத்தொகுப்பு' } },
      { path: '/support/publication', labels: { en: 'Publications', ta: 'வெளியீடுகள்' } },
      { path: '/tenders', labels: { en: 'Tenders', ta: 'டெண்டர்கள்' } },
      { path: '/others/zoo-chart', labels: { en: "Zoo's Chart", ta: 'பூங்கா அமைப்பு' } },
    ],
  },
  { path: '/contact', labels: { en: 'Contact Us', ta: 'தொடர்பு' } },
]
