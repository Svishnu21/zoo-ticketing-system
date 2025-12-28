import heroSlide1 from '@/assets/images/heroslide1.webp'
import heroSlide2 from '@/assets/images/heroslide2.webp'
import heroSlide3 from '@/assets/images/heroslide3.webp'
import mam1 from '@/assets/images/Mammals/Spotted Deer.webp'
import mam2 from '@/assets/images/Mammals/Sambar Deer.webp'
import mam3 from '@/assets/images/Mammals/Bonnet Macaque.webp'
import mam4 from '@/assets/images/Mammals/Rhesus Macaque.webp'
import mam5 from '@/assets/images/Mammals/Bengal Fox.webp'
import mam6 from '@/assets/images/Mammals/Golden Jackal.webp'
import bird1 from '@/assets/images/birds/Alexandrine Parakeet.webp'
import bird2 from '@/assets/images/birds/Indian Peafowl.webp'
import bird3 from '@/assets/images/birds/Grey Pelican.webp'
import bird4 from '@/assets/images/birds/Painted Stork.webp'
import fac1 from '@/assets/images/fac1.webp'
import fac2 from '@/assets/images/fac2.webp'
import fac3 from '@/assets/images/fac3.webp'
import fac4 from '@/assets/images/fac4.webp'
import fac5 from '@/assets/images/fac5.webp'
import fac6 from '@/assets/images/fac6.webp'
import fac7 from '@/assets/images/fac7.webp'
import fac8 from '@/assets/images/fac8.webp'
import fac9 from '@/assets/images/fac9.webp'
import fac10 from '@/assets/images/fac10.webp'
import fac11 from '@/assets/images/fac11.webp'
import fac12 from '@/assets/images/fac12.webp'
import ruleGallery1 from '@/assets/images/pond rules.webp'
import ruleGallery2 from '@/assets/images/park rules2.webp'
import ruleGallery3 from '@/assets/images/park rules 3.webp'
import safariImage from '@/assets/images/heroslide2.webp'
import gall1 from '@/assets/images/Gallery/gall1.webp'
import gall2 from '@/assets/images/Gallery/gall2.webp'
import gall3 from '@/assets/images/Gallery/gall3.webp'
import gall4 from '@/assets/images/Gallery/gall4.webp'
import gall5 from '@/assets/images/Gallery/gall5.webp'
import gall6 from '@/assets/images/Gallery/gall6.webp'
import gall7 from '@/assets/images/Gallery/gall7.webp'
import gall8 from '@/assets/images/Gallery/gall8.webp'
import gall9 from '@/assets/images/Gallery/gall9.webp'
import gall10 from '@/assets/images/Gallery/gall10.webp'
import gall11 from '@/assets/images/Gallery/gall11.webp'
import gall12 from '@/assets/images/Gallery/gall12.webp'

import { navItems } from './navigation'

export type LocalizedText = {
  en: string
  ta: string
}

export interface HeroSlide {
  id: string
  image: string
  title: LocalizedText
  subtitle: LocalizedText
}

export const heroSlides: HeroSlide[] = [
  {
    id: 'plan-adventure',
    image: heroSlide1,
    title: {
      en: 'Plan Your Next Adventure With Us',
      ta: 'உங்கள் அடுத்த சாகசத்தை எங்களுடன் திட்டமிடுங்கள்',
    },
    subtitle: {
      en: 'Seasonal tropical forests, immersive learning trails, and calm wildlife moments await you.',
      ta: 'காலமாற்றமான வெப்பமண்டலக் காடுகள் மற்றும் அமைதியான வனவிலங்கு அனுபவங்கள் உங்களை எதிர்நோக்குகின்றன.',
    },
  },
  {
    id: 'explore-kingdom',
    image: heroSlide2,
    title: {
      en: 'Explore the Wild Kingdom',
      ta: 'வன ராஜ்யத்தை ஆராயுங்கள்',
    },
    subtitle: {
      en: 'Travel through eco-sensitive habitats and meet the charismatic residents of Kurumbapatti.',
      ta: 'சூழல் நட்பு வாழிடங்களில் பயணம் செய்து குரும்பட்டி பூங்காவின் கவர்ச்சியான வாழ்வோரை சந்தியுங்கள்.',
    },
  },
  {
    id: 'connect-nature',
    image: heroSlide3,
    title: {
      en: 'Connect · Rejoice · Revive',
      ta: 'இணையுங்கள் · மகிழுங்கள் · புத்துணர்ச்சி பெறுங்கள்',
    },
    subtitle: {
      en: 'Every visit supports conservation, community outreach, and animal care initiatives.',
      ta: 'ஒவ்வொரு வருகையும் பாதுகாப்பு, சமூக சேவை, விலங்கு பராமரிப்பு பணிகளை முன்னேற்றி நிறைவேற்றுகிறது.',
    },
  },
]
export const welcomeContent: { heading: LocalizedText; paragraphs: LocalizedText[] } = {
  heading: {
    en: 'Discover and Conserve Native Wildlife',
    ta: 'தாயக வன விலங்குகளைக் கண்டறிந்து பாதுகாப்போம்',
  },
  paragraphs: [
    {
      en: "Kurumbapatti Zoological Park is recognized as the 'Small category Zoo' in the western part of Tamil Nadu. It is committed to providing nature education for school children and the local populace of Salem and adjoining districts.",
      ta: 'குரும்பப்பட்டி உயிரியல் பூங்கா,மேற்கு தமிழ்நாட்டின்  அங்கீகரிக்கப்பட்ட \'சிறிய வகை உயிரியல் பூங்கா\' ஆகும். இது சேலம் மற்றும் அருகிலுள்ள மாவட்டங்களின் பள்ளி மாணவர்கள் மற்றும் உள்ளூர் மக்களுக்கு இயற்கை கல்வியை வழங்க அர்ப்பணித்துள்ளது.',
    },
    {
      en: 'The zoo is also actively involved in the rescue and rehabilitation of wildlife under the Salem Circle of the Tamil Nadu Forest Department. Located amidst a reserve forest in the foothills of the Shevaroys (Eastern Ghats), the park is well-wooded and offers a natural forest ambience.',
      ta: 'இந்த பூங்கா, தமிழ்நாடு வனத்துறையின் சேலம் வட்டத்தின் கீழ் வனவிலங்குகளை மீட்பதிலும் மறுவாழ்வளிப்பதிலும் தீவிரமாக ஈடுபட்டுள்ளது. கிழக்குத் தொடர்ச்சி மலையின் சேர்வராயன் மலை அடிவாரத்தில், ஒரு காப்புக்காடுகளுக்கு மத்தியில் அமைந்துள்ள இந்த பூங்கா, மரங்கள் நிறைந்து இயற்கையான வனச் சூழலை வழங்குகிறது.',
    },
  ],
}

export type ParkRuleIcon =
  | 'cctv'
  | 'utensils'
  | 'hand'
  | 'fence'
  | 'silence'
  | 'trash'
  | 'ban'
  | 'smoke'
  | 'alcohol'
  | 'flowers'

export interface ParkRule {
  id: string
  icon: ParkRuleIcon
  title: LocalizedText
  description: LocalizedText
}

export const parkRules: ParkRule[] = [
  {
    id: 'cctv',
    icon: 'cctv',
    title: {
      en: 'YOU ARE UNDER CCTV SURVEILLANCE',
      ta: 'நீங்கள் சிசிடிவி கண்காணிப்பில் உள்ளீர்கள்',
    },
    description: {
      en: 'CCTV camera',
      ta: 'சிசிடிவி கேமரா',
    },
  },
  {
    id: 'do-not-feed',
    icon: 'utensils',
    title: {
      en: 'DO NOT FEED WILD ANIMALS',
      ta: 'வன விலங்குகளுக்கு உணவளிக்க வேண்டாம்',
    },
    description: {
      en: 'Hand feeding an animal (crossed out)',
      ta: 'விலங்கிற்கு உணவளிக்கும் கை (தடையிட்ட குறி)',
    },
  },
  {
    id: 'do-not-tease',
    icon: 'hand',
    title: {
      en: 'DO NOT TEASE WILD ANIMALS',
      ta: 'வன விலங்குகளைச் துன்புறுத்த வேண்டாம்',
    },
    description: {
      en: 'Person teasing an animal (crossed out)',
      ta: 'விலங்குகளை சீண்டும் நபர் (தடையிட்ட குறி)',
    },
  },
  {
    id: 'stay-behind-barricade',
    icon: 'fence',
    title: {
      en: 'DO NOT CROSS BARRICADES',
      ta: 'தடுப்புகளைத் தாண்ட வேண்டாம்',
    },
    description: {
      en: 'Person climbing a barricade (crossed out)',
      ta: 'தடுப்பைத் தாண்டும் நபர் (தடையிட்ட குறி)',
    },
  },
  {
    id: 'maintain-silence',
    icon: 'silence',
    title: {
      en: 'MAINTAIN SILENCE',
      ta: 'அமைதி காக்கவும்',
    },
    description: {
      en: 'Person “shushing”',
      ta: 'அமைதி காக்கச் சைகை செய்கிற நபர்',
    },
  },
  {
    id: 'no-littering',
    icon: 'trash',
    title: {
      en: 'DO NOT LITTER · USE DUSTBINS',
      ta: 'குப்பை போடாதீர்கள் · குப்பைத்தொட்டியைப் பயன்படுத்துங்கள்',
    },
    description: {
      en: 'Person using a dustbin',
      ta: 'குப்பைத்தொட்டியை பயன்படுத்தும் நபர்',
    },
  },
  {
    id: 'no-spitting',
    icon: 'ban',
    title: {
      en: 'DO NOT SPIT',
      ta: 'எச்சில் துப்ப வேண்டாம்',
    },
    description: {
      en: 'Person spitting (crossed out)',
      ta: 'எச்சில் துப்பும் நபர் (தடையிட்ட குறி)',
    },
  },
  {
    id: 'no-smoking',
    icon: 'smoke',
    title: {
      en: 'NO SMOKING',
      ta: 'புகைபிடிக்க வேண்டாம்',
    },
    description: {
      en: 'Cigarette (crossed out)',
      ta: 'சிகரெட் (தடையிட்ட குறி)',
    },
  },
  {
    id: 'no-alcohol',
    icon: 'alcohol',
    title: {
      en: 'ALCOHOL PROHIBITED',
      ta: 'மது அருந்தத் தடை',
    },
    description: {
      en: 'Bottle and glass (crossed out)',
      ta: 'பாட்டிலும் கண்ணாடியும் (தடையிட்ட குறி)',
    },
  },
  {
    id: 'no-plucking',
    icon: 'flowers',
    title: {
      en: 'DO NOT PLUCK FLOWERS OR LEAVES',
      ta: 'பூக்கள், இலைகளைப் பறிக்க வேண்டாம்',
    },
    description: {
      en: 'Hand plucking a flower (crossed out)',
      ta: 'பூவைப் பறிக்கும் கை (தடையிட்ட குறி)',
    },
  },
]

export interface RuleGalleryItem {
  id: string
  title: LocalizedText
  image: string
}

export const moreRulesGallery: RuleGalleryItem[] = [
  {
    id: 'mind-your-footsteps',
    title: {
      en: 'Keep Pathways Clear',
      ta: 'பாதைகள் சுத்தமாக இருக்கட்டும்',
    },
    image: ruleGallery1,
  },
  {
    id: 'guided-learning',
    title: {
      en: 'Stay with Your Group',
      ta: 'உங்கள் குழுவுடன் இருங்கள்',
    },
    image: ruleGallery2,
  },
  {
    id: 'respect-habitats',
    title: {
      en: 'Respect Animal Habitats',
      ta: 'விலங்குகளின் வாழிடத்தை மதிக்கவும்',
    },
    image: ruleGallery3,
  },
]

export interface InfoCardContent {
  id: string
  title: LocalizedText
  body: LocalizedText
}

export const aboutCards: InfoCardContent[] = [
  {
    id: 'history',
    title: { en: 'Our History', ta: 'எங்கள் வரலாறு' },
    body: {
      en: "Kurumbapatti Zoological Park, Salem, is a 'Small Category Zoo' guided by the Zoo Authority of Tamil Nadu (ZAT) and operated by the Tamil Nadu Forest Department.\n\nNestled within reserve forest at the foothills of the Shevaroy range of the Eastern Ghats, the park is draped in native woodland that preserves the feel of a thriving forest. Mixed dry deciduous vegetation and scrub habitats provide shelter for many resident species.\n\nOpened to visitors in 1976 as a Forest Recreation Centre, it became a small museum in 1981 across 11.5 hectares of protected forest. Over four decades, the site has gently evolved from a modest menagerie to a modern zoological park spanning 31.73 hectares, with ample space designated for future expansion.",
      ta: "சேலம் குரும்பப்பட்டி உயிரியல் பூங்கா, தமிழ்நாடு உயிரியல் பூங்கா ஆணையத்தின் (ZAT) வழிகாட்டுதலின் கீழ் வளர்ந்து வரும் 'சிறிய வகை உயிரியல் பூங்கா'; இதை தமிழ்நாடு வனத்துறை நிர்வகிக்கிறது.\n\nகிழக்குத் தொடர்ச்சி மலைத் தொடர்களில் சேர்வராயன் மலைகள் அடிவாரத்தில் உள்ள காப்புக்காட்டுகளுக்குள் அமைந்துள்ள இப்பூங்கா, செழித்த இயற்கை காட்டுக் காந்தத்தைக் கொண்டுள்ளது. கலந்த உலர் இலைவீச்சக் காடுகளும் புதர்ச்செடிகளும் பல்வேறு உயிரினங்களுக்கு பாதுகாப்பான வாழிடத்தை வழங்குகின்றன.\n\n1976 இல் வனப் பொழுதுபோக்கு மையமாக பொதுமக்களுக்கு திறக்கப்பட்ட இது, 1981 இல் 11.5 ஹெக்டேர் காப்புக்காடு நிலப்பரப்பில் சிறிய அருங்காட்சியகமாக மாற்றப்பட்டது. கடந்த நாற்பது ஆண்டுகளில் சிறிய விலங்கு காட்சியகத்திலிருந்து 31.73 ஹெக்டேர் பரப்பளவில் பரவியுள்ள நவீன உயிரியல் பூங்காவாக மெதுவாக வளர்ந்து, எதிர்கால விரிவாக்கத்திற்கான பெரும் நிலப்பரப்பை ஒதுக்கியுள்ளது.",
    },
  },
  {
    id: 'vision',
    title: { en: 'Our Vision', ta: 'எங்கள் பார்வை' },
    body: {
      en: 'The vision of the zoo is to serve as an open window into the seasonal tropical forests of Peninsular India, celebrating their rich biodiversity and championing their conservation.',
      ta: 'இந்த உயிரியல் பூங்காவின் பார்வை, தென் இந்திய தீபகற்பத்தின் காலமாற்றத்துடனான வெப்பமண்டலக் காடுகளின் செழுமையான உயிரினப் பன்மையை மக்களிடம் கொண்டாடச் செய்வதோடு, அதன் பாதுகாப்புக்காக விழிப்புணர்வை பரப்பும் திறந்த சாளரமாக இருப்பதே.',
    },
  },
  {
    id: 'mission',
    title: { en: 'Our Mission', ta: 'எங்கள் பணி' },
    body: {
      en: 'Our mission is to curate thematic habitats, provide proper housing, welfare, and veterinary care for every animal in our collection, and kindle a passion for conserving seasonal tropical forests so that biodiversity is protected and ecological balance endures.',
      ta: 'எங்கள் பணி, ஒவ்வொரு விலங்குக்கும் பொருத்தமான வாழிடம், நலச்சேவை, மருத்துவ பராமரிப்பு வழங்கும் கருப்பொருள் அடிப்படையிலான காட்சிகளை உருவாக்கி, காலமாற்ற வெப்பமண்டலக் காடுகளை பாதுகாக்கும் உணர்வை ஊக்குவிக்கிறது; இதன் மூலம் உயிரினப் பன்மை காக்கப்பட்டு, சூழல் சமநிலை நிலைப்பெறும்.',
    },
  },
]

export const safariContent = {
  title: { en: 'Park Safari Tour', ta: 'பூங்கா சஃபாரி பயணம்' },
  subtitle: { en: 'சஃபாரி', ta: 'சஃபாரி' },
  heading: {
    en: 'Eco-Friendly Safari Experience',
    ta: 'சூழல் நட்பு சஃபாரி அனுபவம்',
  },
  description: {
    en: 'Board our quiet, battery-operated safari vehicles for a 45-minute guided exploration that weaves through mixed habitats, spotting serene herbivores and vibrant birdlife.',
    ta: 'உங்கள் குடும்பத்துடன் கூடிய 45 நிமிட வழிகாட்டியுடன் மாறுபட்ட வாழிடங்களில் பயணித்து, அமைதியான மறைவிலங்குகள் மற்றும் வண்ணமயமான பறவைகளை காண எங்கள் மின்சார சஃபாரிகளில் சேருங்கள்.',
  },
  bullets: [
    {
      en: 'Quiet, low-emission ride that respects wildlife patterns',
      ta: 'விலங்குகளின் இயல்பை மதிக்கும் அமைதியான, குறைந்த மாசு பயணம்',
    },
    {
      en: 'Family-friendly guides narrating local ecology stories',
      ta: 'குடும்பங்களுக்கு ஏற்ற வழிகாட்டிகள் உள்ளூர் சூழலியல் கதைகளைப் பகிர்வார்கள்',
    },
    {
      en: 'Spot the entire park in one curated circuit',
      ta: 'ஒரே சுற்றுப்பயணத்தில் பூங்கா முழுவதையும் காணும் வாய்ப்பு',
    },
    {
      en: 'Battery fleet ensuring zero tailpipe emissions',
      ta: 'பூகாச்சியை வெளியிடாத மின்சார வாகனங்கள்',
    },
  ],
  image: safariImage,
}

export type AnimalCategory = 'Mammals' | 'Birds' | 'Reptiles'

export interface AnimalCard {
  name: LocalizedText
  category: AnimalCategory
  description: LocalizedText
  image: string
}

export const animals: AnimalCard[] = [
  {
    category: 'Mammals',
    name: { en: 'Sambar Deer', ta: 'சாம்பார் மான்' },
    description: {
      en: 'Majestic browsers thriving in the shaded woodlands of the park.',
      ta: 'பூங்காவின் நிழலான காடுகளில் செழித்து வளர்கின்ற அற்புதமான தாவர உண்ணிகள்.',
    },
    image: mam1,
  },
  {
    category: 'Mammals',
    name: { en: 'Spotted Deer', ta: 'புள்ளிமான்' },
    description: {
      en: 'Graceful herds emblematic of Southern Indian forests.',
      ta: 'தென்னிந்திய காடுகளின் அடையாளமாக திகழும் அழகிய கூட்டங்கள்.',
    },
    image: mam2,
  },
  {
    category: 'Mammals',
    name: { en: 'Bonnet Macaque', ta: 'அத்தி குரங்கு' },
    description: {
      en: 'Playful primates that enliven every visitor’s journey.',
      ta: 'ஒவ்வொரு பயணத்தையும் உற்சாகமாக்கும் துள்ளலான குரங்குகள்.',
    },
    image: mam3,
  },
  {
    category: 'Mammals',
    name: { en: 'Common Langur', ta: 'கடலைக் குரங்கு' },
    description: {
      en: 'Elegant langurs keeping a watchful eye from the tree canopy.',
      ta: 'மரங்களின் உச்சியில் இருந்து கண்காணிக்கும் மென்மையான லங்குர்கள்.',
    },
    image: mam4,
  },
  {
    category: 'Mammals',
    name: { en: 'Bengal Fox', ta: 'பெங்கால் நரி' },
    description: {
      en: 'Nocturnal guardians of the rocky outcrops.',
      ta: 'பாறை மேடுகளை இரவில் காவலாற்று நரிகள்.',
    },
    image: mam5,
  },
  {
    category: 'Mammals',
    name: { en: 'Indian Porcupine', ta: 'இந்திய முட்பன்றி' },
    description: {
      en: 'Nocturnal foragers whose striking quills offer formidable protection.',
      ta: 'அருமையான முள் கொண்ட இவ்விலங்குகள் இரவில் உணவு தேடி அலைந்து தனித்துவமான பாதுகாப்பை ஏற்படுத்துகின்றன.',
    },
    image: mam6,
  },
  {
    category: 'Birds',
    name: { en: 'Scarlet Ibis', ta: 'சிகப்பு ஐபிஸ்' },
    description: {
      en: 'Brilliant scarlet plumage lighting up our wetlands aviary.',
      ta: 'எங்கள் ஈரநில பறவைக் கூடத்தை ஒளிரச் செய்யும் பளிச்செனும் சிகப்பு இறகுகள்.',
    },
    image: bird1,
  },
  {
    category: 'Birds',
    name: { en: 'Blue-and-Gold Macaw', ta: 'நீலம்-தங்க மகாவோ' },
    description: {
      en: 'Charismatic parrots with dazzling plumage and playful chatter.',
      ta: 'மின்னும் இறகுகளும், கவர்ந்திழுக்கும் கீச்சும் கொண்ட புத்திசாலி கிளிகள்.',
    },
    image: bird2,
  },
  {
    category: 'Birds',
    name: { en: 'Great Hornbill', ta: 'பெரிய கொக்குக் கிளி' },
    description: {
      en: 'Iconic casque-billed hornbills gliding through lofty perches.',
      ta: 'உயரமான கிளைகளில் பறக்கும் மிகப்பழமையான கொக்குக்கிளிகள்.',
    },
    image: bird3,
  },
  {
    category: 'Birds',
    name: { en: 'Indian Paradise Flycatcher', ta: 'பரதகுயில்' },
    description: {
      en: 'Elegant streamers in flight painting graceful arcs of white.',
      ta: 'விண்ணில் விரிந்த வெண்மையான வால்களுடன் அலங்கரிக்கும் அருமையான பறவை.',
    },
    image: bird4,
  },
  {
    category: 'Birds',
    name: { en: 'Alexandrine Parakeet', ta: 'அலெக்சாண்ட்ரைன் கிளி' },
    description: {
      en: 'Intelligent parrots renowned for their crimson shoulder patches.',
      ta: 'சிகப்பு தோள்தழும்புகளுக்காக புகழ்பெற்ற புத்திசாலி கிளிகள்.',
    },
    image: 'https://images.unsplash.com/photo-1501238295340-c810d3c15611?auto=format&fit=crop&w=900&q=80',
  },
]

export interface FacilityCard {
  title: LocalizedText
  description: LocalizedText
  image: string
}

export const facilities: FacilityCard[] = [
  {
    image: fac1,
    title: { en: 'R.O Drinking Water', ta: 'ரொ. குடிநீர்' },
    description: {
      en: 'Safe, purified drinking water taps placed throughout the park.',
      ta: 'பூங்கா முழுவதும் பாதுகாப்பான சுத்திகரிக்கப்பட்ட குடிநீர் வசதி.',
    },
  },
  {
    image: fac2,
    title: { en: 'Refreshment Stalls', ta: 'உணவுப் பந்தல்கள்' },
    description: {
      en: 'Local snacks and healthy refreshments to energise your visit.',
      ta: 'உங்கள் பயணத்தை ஊக்கப்படுத்தும் சுவையான விருந்து மற்றும் ஆரோக்கிய உணவுகள்.',
    },
  },
  {
    image: fac3,
    title: { en: "Children's Play Park", ta: 'குழந்தைகள் விளையாட்டு பூங்கா' },
    description: {
      en: 'Shaded play zones designed for kids to explore safely.',
      ta: 'குழந்தைகள் பாதுகாப்பாக விளையாட அமைக்கப்பட்ட நிழல்மிகுந்த பகுதி.',
    },
  },
  {
    image: fac4,
    title: { en: 'Battery Operated Vehicle', ta: 'மின்சார வாகனம்' },
    description: {
      en: 'Eco-friendly transport connecting the key attractions.',
      ta: 'முக்கிய அம்சங்களுக்கிடையே எளிய சூழல் நட்பு போக்குவரத்து.',
    },
  },
  {
    image: fac5,
    title: { en: 'Resting Sheds', ta: 'ஓய்வு மண்டபங்கள்' },
    description: {
      en: 'Comfortable shelters offering respite during sunny afternoons.',
      ta: 'சூரிய ஒளி அதிகமான நேரங்களில் ஓய்வளிக்கும் வசதியான மண்டபங்கள்.',
    },
  },
  {
    image: fac6,
    title: { en: 'Clean Washrooms', ta: 'சுத்தமான கழிப்பறைகள்' },
    description: {
      en: 'Hygienic restrooms with dedicated maintenance staff.',
      ta: 'நேரடி பராமரிப்புடன் சுத்தமாக பராமரிக்கப்படும் கழிப்பறைகள்.',
    },
  },
  {
    image: fac7,
    title: { en: 'Parking Facility', ta: 'நிறுத்துவேலை வசதி' },
    description: {
      en: 'Spacious parking with dedicated slots for cars and two-wheelers.',
      ta: 'கார்கள் மற்றும் இருசக்கரங்களுக்கு தனி இடங்கள் கொண்ட பரபரப்பான நிறுத்தம்.',
    },
  },
  {
    image: fac8,
    title: { en: 'Veterinary Hospital', ta: 'வெட்டரினரி மருத்துவமனை' },
    description: {
      en: 'On-site veterinary care for animal welfare and emergencies.',
      ta: 'வன விலங்குகள் நலனுக்கும் அவசரங்களுக்கும் வழங்கப்படும் மருத்துவ பராமரிப்பு.',
    },
  },
  {
    image: fac9,
    title: { en: 'First Aid Kit', ta: 'முதுகட்ட துரித உதவி பெட்டி' },
    description: {
      en: 'First aid stations located across the park for visitor safety.',
      ta: 'பார்வையாளர்களின் பாதுகாப்புக்கு பூங்கா முழுவதும் உள்ள முதுகட்ட உதவி நிலையங்கள்.',
    },
  },
  {
    image: fac10,
    title: { en: 'Eco-Shop & Souvenirs', ta: 'Eco-Shop & Souvenirs' },
    description: {
      en: 'Purchase eco-friendly jute bags, caps, and nature-themed souvenirs to remember your visit.',
      ta: 'Purchase eco-friendly jute bags, caps, and nature-themed souvenirs to remember your visit.',
    },
  },
  {
    image: fac11,
    title: { en: 'Resting Lawns', ta: 'Resting Lawns' },
    description: {
      en: 'Beautifully maintained green lawns and gardens perfect for families to relax and enjoy nature.',
      ta: 'Beautifully maintained green lawns and gardens perfect for families to relax and enjoy nature.',
    },
  },
  {
    image: fac12,
    title: { en: "Mother's Feeding Room", ta: "Mother's Feeding Room" },
    description: {
      en: 'A private, comfortable, and hygienic space dedicated for mothers to nurse their infants.',
      ta: 'A private, comfortable, and hygienic space dedicated for mothers to nurse their infants.',
    },
  },
]

export interface TariffItem {
  id: string
  price: number
  label: LocalizedText
}

export const tariffItems: TariffItem[] = [
  { id: 'zoo_adult', price: 50, label: { en: 'Entry - Adult', ta: 'நுழைவு - பெரியவர்' } },
  { id: 'zoo_child', price: 10, label: { en: 'Entry - Child (5-12 yrs)', ta: 'நுழைவு - குழந்தை (5-12)' } },
  { id: 'camera_video', price: 150, label: { en: 'Video Camera (Does not include videography for commercial programs, short movies, etc.)', ta: 'வீடியோ கேமரா (வணிக நிகழ்ச்சிகள், குறும்படங்கள் போன்றவற்றுக்கான வீடியோ பதிவை உள்ளடக்காது)' } },
  { id: 'parking_4w_lmv', price: 50, label: { en: 'Parking - 4 Wheeler (LMV)', ta: 'நிறுத்தம் - 4 சக்கர (LMV)' } },
  { id: 'parking_4w_hmv', price: 100, label: { en: 'Parking - 4 Wheeler (HMV)', ta: 'நிறுத்தம் - 4 சக்கர (HMV)' } },
  { id: 'parking_2w_3w', price: 20, label: { en: 'Parking - 2 & 3 Wheeler', ta: 'நிறுத்தம் - 2 & 3 சக்கர' } },
  { id: 'battery_vehicle_adult', price: 50, label: { en: 'Battery Vehicle - Adult', ta: 'மின்வாகனம் - பெரியவர்' } },
  { id: 'battery_vehicle_child', price: 30, label: { en: 'Battery Vehicle - Child (5-12 yrs)', ta: 'மின்வாகனம் - குழந்தை (5-12)' } },
]

export interface FeeTableRow {
  id: string
  serial: number
  description: LocalizedText
  fee: number
}

export const feeStructure: FeeTableRow[] = [
  { id: 'zoo_adult', serial: 1, description: tariffItems[0].label, fee: 50 },
  { id: 'zoo_child', serial: 2, description: tariffItems[1].label, fee: 10 },

  { id: 'zoo_differently_abled', serial: 3, description: { en: 'Differently Abled', ta: 'விதிவிலக்கானவர்கள்' }, fee: 0 },
  { id: 'zoo_child_free', serial: 4, description: { en: 'Children (below 5)', ta: '5-க்கு கீழ் குழந்தைகள்' }, fee: 0 },

  { id: 'camera_video', serial: 5, description: tariffItems[2].label, fee: 150 },
  { id: 'parking_4w_lmv', serial: 6, description: tariffItems[3].label, fee: 50 },
  { id: 'parking_4w_hmv', serial: 7, description: tariffItems[4].label, fee: 100 },
  { id: 'parking_2w_3w', serial: 8, description: tariffItems[5].label, fee: 20 },
  { id: 'battery_vehicle_adult', serial: 9, description: tariffItems[6].label, fee: 50 },
  { id: 'battery_vehicle_child', serial: 10, description: tariffItems[7].label, fee: 30 },
]

export const visitorInfo = {
  title: { en: 'Visitor Information', ta: 'பார்வையாளர் தகவல்' },
  subtitle: { en: 'தகவல்', ta: 'தகவல்' },
  timings: {
    heading: { en: 'Park Timings', ta: 'பூங்கா நேரங்கள்' },
    description: {
      en: 'Open all days of the week',
      ta: 'வாரத்தின் அனைத்து நாட்களிலும் திறந்திருக்கும்',
    },
    alert: {
      en: 'Weekly Holiday: The Zoo remains CLOSED every Tuesday',
      ta: 'வாராந்திர விடுமுறை: ஒவ்வொரு செவ்வாய்க்கிழமையும் பூங்கா மூடப்படும்',
    },
  },
  reach: {
    heading: { en: 'How to Reach Us', ta: 'எங்களை எவ்வாறு அணைவது' },
    address: {
      en: `Kurumbapatti Zoological Park\nNear Yercaud Foothills\nSalem - 636008`,
      ta: `குரும்பப்பட்டி உயிரியல் பூங்கா\nசெட்டிச்சவடி கிராமம் அருகில்\nசேலம் - 636008`,
    },
  },
}

export interface GalleryImage {
  id: string
  image: string
  title: LocalizedText
}

export const galleryImages: GalleryImage[] = [
  {
    id: 'gallery-1',
    image: gall1,
    title: { en: 'Gallery View 1', ta: 'காட்சிப் படம் 1' },
  },
  {
    id: 'gallery-2',
    image: gall2,
    title: { en: 'Gallery View 2', ta: 'காட்சிப் படம் 2' },
  },
  {
    id: 'gallery-3',
    image: gall3,
    title: { en: 'Gallery View 3', ta: 'காட்சிப் படம் 3' },
  },
  {
    id: 'gallery-4',
    image: gall4,
    title: { en: 'Gallery View 4', ta: 'காட்சிப் படம் 4' },
  },
  {
    id: 'gallery-5',
    image: gall5,
    title: { en: 'Gallery View 5', ta: 'காட்சிப் படம் 5' },
  },
  {
    id: 'gallery-6',
    image: gall6,
    title: { en: 'Gallery View 6', ta: 'காட்சிப் படம் 6' },
  },
  {
    id: 'gallery-7',
    image: gall7,
    title: { en: 'Gallery View 7', ta: 'காட்சிப் படம் 7' },
  },
  {
    id: 'gallery-8',
    image: gall8,
    title: { en: 'Gallery View 8', ta: 'காட்சிப் படம் 8' },
  },
  {
    id: 'gallery-9',
    image: gall9,
    title: { en: 'Gallery View 9', ta: 'காட்சிப் படம் 9' },
  },
  {
    id: 'gallery-10',
    image: gall10,
    title: { en: 'Gallery View 10', ta: 'காட்சிப் படம் 10' },
  },
  {
    id: 'gallery-11',
    image: gall11,
    title: { en: 'Gallery View 11', ta: 'காட்சிப் படம் 11' },
  },
  {
    id: 'gallery-12',
    image: gall12,
    title: { en: 'Gallery View 12', ta: 'காட்சிப் படம் 12' },
  },
]

export const contactContent = {
  title: { en: 'Get in Touch', ta: 'எங்களை தொடர்புகொள்ளுங்கள்' },
  subtitle: { en: 'தொடர்புக்கு', ta: 'தொடர்புக்கு' },
  formHeading: { en: 'Send Us a Message', ta: 'எங்களுக்கு ஒரு செய்தி அனுப்புங்கள்' },
  fields: {
    name: { en: 'Your Name', ta: 'உங்கள் பெயர்' },
    email: { en: 'Your Email', ta: 'உங்கள் மின்னஞ்சல்' },
    message: { en: 'Message', ta: 'செய்தி' },
  },
  submit: { en: 'Submit', ta: 'சமர்ப்பிக்க' },
  details: {
    address: {
      heading: { en: 'Address', ta: 'முகவரி' },
      value: visitorInfo.reach.address,
    },
    phone: {
      heading: { en: 'Phone', ta: 'தொலைபேசி' },
      value: { en: '0427-2912197', ta: '0427-2912197' },
    },
    email: {
      heading: { en: 'Email', ta: 'மின்னஞ்சல்' },
      value: { en: 'info@kurumbapattizoo.com', ta: 'info@kurumbapattizoo.com' },
    },
  },
}

export const footerContent = {
  quickLinks: navItems.slice(0, 6),
  contact: contactContent.details,
  socials: [
    { id: 'facebook', label: { en: 'Facebook', ta: 'ஃபேஸ்புக்' }, url: '#', icon: 'facebook' },
    { id: 'instagram', label: { en: 'Instagram', ta: 'இன்ஸ்டாகிராம்' }, url: '#', icon: 'instagram' },
    { id: 'twitter', label: { en: 'Twitter', ta: 'ட்விட்டர்' }, url: '#', icon: 'twitter' },
  ],
  copyright: {
    en: '© 2025 Kurumbapatti Zoological Park. All Rights Reserved.',
    ta: '© 2025 குரும்பப்பட்டி உயிரியல் பூங்கா. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
  },
}
