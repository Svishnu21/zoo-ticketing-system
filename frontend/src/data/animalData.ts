export interface AnimalDetailRow {
  label: string
  values: string[]
}

export interface AnimalDetail {
  id: string
  commonName: string
  scientificName: string
  sections: AnimalDetailRow[]
  image?: string
}

export const animalData: AnimalDetail[] = [
  {
    id: 'indian-peafowl',
    commonName: 'Indian Peafowl',
    scientificName: 'Pavo cristatus',
    image: 'birds/Indian Peafowl.webp',
    sections: [
      {
        label: 'Lifespan',
        values: [
          'Wild: 12–20 years',
          'Captivity: Up to 25 years with proper care and protection',
        ],
      },
      {
        label: 'Habitat & Range',
        values: [
          'Widely distributed across India, Sri Lanka, Nepal, and Pakistan',
          'Deciduous forests, scrublands, grasslands, agricultural belts, and settlements near water sources',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Omnivorous: seeds, grains, fruits, berries, insects, small reptiles, and the occasional small snake',
          'Forages mainly on the ground during early mornings and evenings',
        ],
      },
      {
        label: 'Behaviour & Social Structure',
        values: [
          'Diurnal, often seen in small harems of one male with several females',
          'Renowned courtship display with fanned train; loud calls at dawn and dusk',
          'Roosts on tall trees at night; nests on the ground with 3–7 eggs',
        ],
      },
      {
        label: 'Conservation Status & Threats',
        values: [
          'IUCN: Least Concern; Schedule I protection under India’s Wildlife Protection Act',
          'Threats include local hunting for feathers/meat, habitat degradation, and egg predation',
        ],
      },
    ],
  },
  {
    id: 'white-peafowl',
    commonName: 'White Peafowl',
    scientificName: 'Pavo cristatus (leucistic form)',
    image: 'birds/white peafowl.webp',
    sections: [
      {
        label: 'Important Note',
        values: [
          'White peafowl are genetic colour morphs of Indian Peafowl caused by leucism, not albinism',
          'Behaviour, ecology, and biology mirror that of the normal plumage birds',
        ],
      },
      {
        label: 'Lifespan',
        values: [
          'Wild (rare outside protection): ~12–20 years',
          'Captivity: Up to 25 years with husbandry similar to Indian Peafowl',
        ],
      },
      {
        label: 'Habitat & Range',
        values: [
          'Follows Indian Peafowl distribution but largely maintained in aviaries, breeding centres, and protected parks',
          'Reduced camouflage makes wild survival difficult',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Identical to Indian Peafowl: grains, seeds, crops, insects, small reptiles, fruits, and tender shoots',
        ],
      },
      {
        label: 'Behaviour & Social Structure',
        values: [
          'Diurnal, ground forager, roosts on tall trees, maintains small harems',
          'Courtship displays feature entirely white trains prized in aviculture',
        ],
      },
      {
        label: 'Conservation Status & Threats',
        values: [
          'Shares Indian Peafowl status: IUCN Least Concern; Schedule I protected',
          'In captivity: risks include inbreeding, low genetic diversity, and vulnerability if released',
        ],
      },
    ],
  },
  {
    id: 'grey-pelican',
    commonName: 'Grey (Spot-billed) Pelican',
    scientificName: 'Pelecanus philippensis',
    image: 'birds/Grey Pelican.webp',
    sections: [
      {
        label: 'Lifespan',
        values: ['Wild: 15–25 years', 'Captivity: 30+ years with veterinary care and safe nesting areas'],
      },
      {
        label: 'Habitat & Range',
        values: [
          'South and Southeast Asia: India, Sri Lanka, Nepal, Cambodia, Myanmar, Bangladesh',
          'Large freshwater lakes, reservoirs, marshes, and rivers with shallow water, abundant fish, and tall nesting trees',
        ],
      },
      {
        label: 'Diet & Feeding',
        values: [
          'Primarily piscivorous, targeting freshwater fish such as carps, tilapia, catfish, and perch',
          'Occasionally consumes amphibians, crustaceans, and small reptiles using the expandable throat pouch',
          'Often forages cooperatively in semicircles to corral fish',
        ],
      },
      {
        label: 'Behaviour & Breeding',
        values: [
          'Diurnal, highly colonial for roosting and breeding; large flocks travel together',
          'Nests atop sturdy trees, clutch of 2–4 eggs; both parents incubate and rear chicks',
          'Short-distance migrant within India, soaring on thermals',
        ],
      },
      {
        label: 'Conservation Status & Threats',
        values: [
          'IUCN: Near Threatened; Schedule I protection in India',
          'Threats: wetland loss, pollution, declining fish stocks, disturbance of colonies, and felling of nesting trees',
        ],
      },
    ],
  },
  {
    id: 'grey-heron',
    commonName: 'Grey Heron',
    scientificName: 'Ardea cinerea',
    image: 'birds/Grey Heron.webp',
    sections: [
      {
        label: 'Lifespan',
        values: ['Wild: 10–15 years', 'Captivity: 20–25 years'],
      },
      {
        label: 'Habitat & Range',
        values: [
          'Across Europe, Asia, and Africa; common throughout India',
          'Lakes, rivers, marshes, mangroves, lagoons, irrigation tanks, and agricultural wetlands with shallow water',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Carnivorous: primarily fish, plus frogs, tadpoles, aquatic insects, small reptiles, and occasional small mammals/crustaceans',
          'Hunts by standing still or slowly stalking and striking with a spear-like bill',
        ],
      },
      {
        label: 'Behaviour & Social Structure',
        values: [
          'Mostly diurnal but may forage at dusk/night; solitary hunter yet colonial breeder',
          'Nests high on trees or reedbeds; both parents share incubation and chick feeding',
        ],
      },
      {
        label: 'Movement & Conservation',
        values: [
          'Strong, slow wingbeats with S-curved neck; largely resident with local movements driven by water availability',
          'IUCN: Least Concern; protected by India’s Wildlife Protection Act; threatened by wetland loss, pollution, and colony disturbance',
        ],
      },
    ],
  },
  {
    id: 'painted-stork',
    commonName: 'Painted Stork',
    scientificName: 'Mycteria leucocephala',
    image: 'birds/Painted Stork.webp',
    sections: [
      {
        label: 'Lifespan',
        values: ['Wild: 15–28 years', 'Captivity: 30+ years with good management'],
      },
      {
        label: 'Habitat & Range',
        values: [
          'Native to South and Southeast Asia, abundant in India, Sri Lanka, Nepal, Bangladesh, Myanmar',
          'Shallow freshwater wetlands, marshes, swamps, lakes, reservoirs, floodplains, and paddy fields',
        ],
      },
      {
        label: 'Diet & Feeding',
        values: [
          'Carnivorous, feeding on fish, frogs, aquatic crustaceans, and insects',
          'Wades through shallow water with bill partly open, sweeping side-to-side before snapping shut on prey',
        ],
      },
      {
        label: 'Behaviour & Breeding',
        values: [
          'Diurnal, gregarious feeder; breeds colonially with ibises, pelicans, and herons',
          'Nests on tall trees near water; both parents incubate eggs and tend chicks until fledging',
        ],
      },
      {
        label: 'Status & Threats',
        values: [
          'IUCN: Near Threatened; legally protected in India',
          'Facing wetland destruction, pollution, loss of nesting trees, and disturbance from human activity',
        ],
      },
    ],
  },
  {
    id: 'grey-partridge',
    commonName: 'Grey Partridge',
    scientificName: 'Perdix perdix',
    image: 'birds/Grey Partridge.webp',
    sections: [
      {
        label: 'Lifespan',
        values: ['Wild: 4–6 years', 'Captivity: 8–10 years with protection'],
      },
      {
        label: 'Habitat & Range',
        values: [
          'South Asia: India, Pakistan, Nepal, Sri Lanka',
          'Dry grasslands, scrub forests, farmlands, village edges, semi-arid areas with low cover',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Omnivorous: seeds, grains, shoots, leaves, insects (beetles, termites, grasshoppers), and small invertebrates',
          'Ground forager active at dawn and dusk',
        ],
      },
      {
        label: 'Behaviour & Breeding',
        values: [
          'Terrestrial; prefers running to flying; usually seen in pairs or family groups',
          'Breeding tied to rainfall; nests are shallow scrapes with 6–9 eggs; both parents guard chicks',
          'Noted for loud "ka-tee-tar-ka" territorial calls',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Least Concern; protected under India’s Wildlife Protection Act'],
      },
    ],
  },
  {
    id: 'cockatiel',
    commonName: 'Cockatiel',
    scientificName: 'Nymphicus hollandicus',
    image: 'birds/Cockatiel.webp',
    sections: [
      {
        label: 'Lifespan',
        values: ['Wild: 10–15 years', 'Captivity: 15–25 years with balanced diet and hygiene'],
      },
      {
        label: 'Habitat & Range',
        values: [
          'Endemic to Australia’s dry grasslands, open woodlands, arid scrublands, and riverine forests',
          'Often found near water sources and adapted to hot interior regions',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Primarily seeds and grains plus leaves, shoots, buds, seasonal fruits, and occasional insects',
          'Captive diets include millet mixes, fresh greens, fruits, and egg food',
        ],
      },
      {
        label: 'Behaviour & Social Structure',
        values: [
          'Social, gentle, and intelligent; travels in small flocks, especially after rains',
          'Capable of learning whistles, mimicking sounds, and bonding closely with humans',
          'Nests in tree hollows; both parents incubate 4–7 eggs and feed chicks',
        ],
      },
      {
        label: 'Movement & Communication',
        values: [
          'Strong, swift fliers that range widely for food and water',
          'Vocal species; males produce clear whistling songs and courtship calls, using crest position as body language',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Least Concern with stable wild populations'],
      },
    ],
  },
  {
    id: 'rose-ringed-parakeet',
    commonName: 'Rose-ringed Parakeet',
    scientificName: 'Psittacula krameri',
    image: 'birds/Rose-ringed Parakeet.webp',
    sections: [
      {
        label: 'Lifespan',
        values: ['Wild: 10–20 years', 'Captivity: 20–30 years with good diet and care'],
      },
      {
        label: 'Habitat & Range',
        values: [
          'Native to India, Pakistan, Nepal, Bangladesh, Sri Lanka, and parts of Africa; feral in many global cities',
          'Occupies dry deciduous forests, woodlands, urban parks, gardens, and agricultural areas',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Herbivorous, feeding on fruits, seeds, grains, blossoms, nectar, buds, and shoots',
          'Frequently raids crops such as millet, maize, and sunflower; captive diets mirror this diversity',
        ],
      },
      {
        label: 'Behaviour & Social Structure',
        values: [
          'Highly social and intelligent; gathers in flocks and large roosts',
          'Excellent mimics capable of speech; nests in tree cavities or building crevices with 3–6 egg clutches',
        ],
      },
      {
        label: 'Movement & Communication',
        values: [
          'Fast, powerful flier with long daily foraging flights; dramatic roosting flights at dusk',
          'Extremely vocal, producing loud screeches and chatters; captive birds whistle and mimic speech',
        ],
      },
      {
        label: 'Conservation',
        values: [
          'IUCN: Least Concern; populations stable or increasing though threatened locally by nest-tree loss, crop conflict, and pet trade capture',
        ],
      },
    ],
  },
  {
    id: 'alexandrine-parakeet',
    commonName: 'Alexandrine Parakeet',
    scientificName: 'Psittacula eupatria',
    image: 'birds/Alexandrine Parakeet.webp',
    sections: [
      {
        label: 'Lifespan',
        values: ['Wild: 20–25 years', 'Captivity: 30–40 years with balanced diet and care'],
      },
      {
        label: 'Habitat & Range',
        values: [
          'India, Nepal, Sri Lanka, Bangladesh, Myanmar, and Southeast Asia',
          'Moist/dry deciduous forests, woodlands, riverine forests, mangroves, agricultural belts, and urban tree-lined avenues',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Fruits (guava, mango, jamun, figs), seeds, grains, blossoms, nectar, buds, and young leaves',
          'Feeds on crops such as paddy, sunflower, and millet; captive diets include seed mixes, produce, and mineral blocks',
        ],
      },
      {
        label: 'Behaviour & Social Structure',
        values: [
          'Intelligent, social, and excellent mimics; found in pairs, flocks, and communal roosts',
          'Nests in tree hollows or building crevices; clutch of 2–4 eggs with female incubating while male supplies food',
        ],
      },
      {
        label: 'Physical & Communication',
        values: [
          'Large parakeet with long tail and robust red beak; males show maroon shoulder patch and neck ring',
          'Very vocal with loud screeches and warning calls; captive birds master phrases and whistles',
        ],
      },
      {
        label: 'Conservation',
        values: [
          'IUCN: Near Threatened due to habitat loss, nest-tree felling, pet trade capture, and competition for hollows',
        ],
      },
    ],
  },
  {
    id: 'budgerigar',
    commonName: 'Budgerigar',
    scientificName: 'Melopsittacus undulatus',
    image: 'birds/Budgerigar.webp',
    sections: [
      {
        label: 'Lifespan',
        values: ['Wild: 5–7 years', 'Captivity: 8–15 years with excellent care'],
      },
      {
        label: 'Habitat',
        values: [
          'Native to Australia’s open woodlands, scrublands, grasslands, and semi-arid zones near water',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Primarily grass seeds along with leaves, shoots, and berries',
          'Captive diets include millet, mixed seeds, vegetables, and vitamin supplements',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Highly social, active, and vocal; forms large flocks and strong pair bonds',
          'Exceptional mimics of sounds and simple speech',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Least Concern with stable wild populations and prolific captive breeding'],
      },
    ],
  },
  {
    id: 'spotted-deer',
    commonName: 'Spotted Deer',
    scientificName: 'Axis axis',
    image: 'Mammals/Spotted Deer.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 8–12 years', 'Captivity: 15–20 years'],
      },
      {
        label: 'Habitat',
        values: [
          'Indian subcontinent: dry/moist deciduous forests, open grasslands, scrub forests, often near water and dense cover',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Herbivorous: grasses, leaves, fruits, tender shoots, herbs, and fallen forest produce',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Highly social herds of females, fawns, and a few males; vigilant with alarm calls and associations with langurs',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Least Concern with stable populations'],
      },
    ],
  },
  {
    id: 'sambar-deer',
    commonName: 'Sambar Deer',
    scientificName: 'Rusa unicolor',
    image: 'Mammals/Sambar Deer.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 12–16 years', 'Captivity: 20–26 years'],
      },
      {
        label: 'Habitat',
        values: [
          'Indian subcontinent and Southeast Asia: moist deciduous forests, evergreen tracts, grasslands, foothills near water',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Herbivorous browser feeding on leaves, grasses, shoots, twigs, fruits, bark, and aquatic plants',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Mostly solitary or in small groups; territorial males with large antlers; crepuscular and strong swimmers that emit loud alarm calls',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Vulnerable due to habitat loss, hunting, and competition with livestock'],
      },
    ],
  },
  {
    id: 'bonnet-macaque',
    commonName: 'Bonnet Macaque',
    scientificName: 'Macaca radiata',
    image: 'Mammals/Bonnet Macaque.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 20–25 years', 'Captivity: Up to 30 years'],
      },
      {
        label: 'Habitat',
        values: [
          'Southern India and Sri Lanka: dry/moist deciduous forests, scrublands, agriculture belts, and settlements',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Omnivorous: fruits, seeds, leaves, flowers, insects, small vertebrates, and human food in urban areas',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Lives in social troops with strong dominance hierarchy led by alpha male; highly intelligent and adaptable',
          'Displays grooming, vocal communication, and bold opportunistic feeding near humans',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Least Concern though threatened by habitat loss, vehicle strikes, and human conflict'],
      },
    ],
  },
  {
    id: 'rhesus-macaque',
    commonName: 'Rhesus Macaque',
    scientificName: 'Macaca mulatta',
    image: 'Mammals/Rhesus Macaque.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 15–20 years', 'Captivity: 25–30 years'],
      },
      {
        label: 'Habitat',
        values: [
          'Widespread in northern India and Southeast Asia: grasslands, forests, river valleys, villages, and cities',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Omnivorous: fruits, seeds, leaves, shoots, flowers, insects, small animals, and human food scraps',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Troops of 10–80 with complex dominance hierarchies; intelligent, expressive, and bold near humans',
          'Communicates through facial expressions, vocalisations, and gestures',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Least Concern though facing habitat loss, road accidents, and rising human conflict'],
      },
    ],
  },
  {
    id: 'bengal-fox',
    commonName: 'Bengal Fox',
    scientificName: 'Vulpes bengalensis',
    image: 'Mammals/Bengal Fox.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 6–8 years', 'Captivity: 10–12 years'],
      },
      {
        label: 'Habitat',
        values: [
          'Indian subcontinent: dry grasslands, scrublands, semi-arid plains; avoids dense forests and true deserts',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Omnivorous: rodents, insects, birds, reptiles, fruits, berries, seeds, and carrion',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Crepuscular/nocturnal; lives in pairs or small families; digs burrows for shelter and is highly territorial',
          'Relies on speed to evade predators',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Least Concern but declining locally due to habitat loss, agriculture, and road kills'],
      },
    ],
  },
  {
    id: 'golden-jackal',
    commonName: 'Golden Jackal',
    scientificName: 'Canis aureus',
    image: 'Mammals/Golden Jackal.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 8–10 years', 'Captivity: 15–16 years'],
      },
      {
        label: 'Habitat',
        values: [
          'India, Middle East, Southeast Europe, and Asia: dry deciduous forests, scrublands, grasslands, and farms',
          'Readily adapts to human-dominated areas',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Omnivorous: small mammals, birds, reptiles, insects, fruits, seeds, carrion, and human refuse',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Lives singly, in pairs, or family groups; territorial with vocal howls; mostly nocturnal/crepuscular',
          'Forms monogamous pairs and is an agile hunter and scavenger',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Least Concern though affected by habitat degradation, road kills, poisoning, and conflict'],
      },
    ],
  },
  {
    id: 'asian-palm-civet',
    commonName: 'Asian Palm Civet',
    scientificName: 'Paradoxurus hermaphroditus',
    image: 'Mammals/Asian Palm Civet.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 15–20 years', 'Captivity: 22–25 years'],
      },
      {
        label: 'Habitat',
        values: [
          'South and Southeast Asia: tropical rainforests, evergreen forests, plantations, rural areas, and human settlements',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Omnivorous: fruits (notably coffee berries), nuts, insects, rodents, reptiles, eggs, and small birds',
          'Known for producing Kopi Luwak coffee via digested coffee cherries',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Mostly solitary and nocturnal; expert climber spending time in trees; communicates via scent marking',
          'Shelters in tree hollows, roofs, or dense vegetation and adapts well to human presence',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Least Concern though locally impacted by habitat loss, hunting, and wildlife trade'],
      },
    ],
  },
  {
    id: 'marsh-crocodile',
    commonName: 'Marsh Crocodile',
    scientificName: 'Crocodylus palustris',
    image: 'Reptiles/Marsh Crocodile.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 40–60 years', 'Captivity: 70+ years'],
      },
      {
        label: 'Habitat',
        values: [
          'Indian subcontinent: freshwater lakes, rivers, marshes, ponds, tanks, and reservoirs with slow water and sandy or muddy banks',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Carnivorous ambush predator feeding on fish, amphibians, reptiles, birds, and small to medium mammals; juveniles eat insects and crustaceans',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Mostly solitary outside breeding; excellent swimmer and burrower; basks to thermoregulate and digs burrows to escape heat',
          'Females nest in sand/soil and guard eggs until hatching',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Vulnerable with threats from habitat loss, human conflict, poaching, and polluted waterways'],
      },
    ],
  },
  {
    id: 'red-eared-slider',
    commonName: 'Red Eared Slider',
    scientificName: 'Trachemys scripta elegans',
    image: 'Reptiles/Red Eared Slider.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 20–30 years', 'Captivity: Up to 40 years'],
      },
      {
        label: 'Habitat',
        values: [
          'Native to the southern United States; inhabits ponds, lakes, marshes, and slow rivers with calm, warm water and basking spots',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Omnivorous; juveniles favour animal prey (insects, small fish, worms, aquatic invertebrates) while adults include more aquatic plants and algae',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Semi-aquatic, diurnal, strong swimmers that bask frequently and may become territorial around basking sites',
          'Highly adaptable to varied environments',
        ],
      },
      {
        label: 'Conservation',
        values: [
          'IUCN: Not evaluated globally but recognised as invasive/exotic in many countries where it outcompetes native turtles; common in pet trade',
        ],
      },
    ],
  },
  {
    id: 'indian-star-tortoise',
    commonName: 'Indian Star Tortoise',
    scientificName: 'Geochelone elegans',
    image: 'Reptiles/Indian Star Tortoise.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 30–50 years', 'Captivity: 60–80 years with proper care'],
      },
      {
        label: 'Habitat',
        values: [
          'India, Sri Lanka, and Pakistan: dry scrub forests, grasslands, semi-arid regions with thorny vegetation',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Herbivorous: grasses, leaves, fruits, flowers, and succulents; captive diets emphasise leafy greens, vegetables, and calcium supplements',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Mostly solitary and shy; active mornings and late afternoons; rests under bushes or shallow burrows during heat',
          'Distinctive shell pattern offers camouflage in dry grasses',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Vulnerable due to illegal pet trade, habitat loss, and poaching'],
      },
    ],
  },
  {
    id: 'rock-python',
    commonName: 'Indian Rock Python',
    scientificName: 'Python molurus',
    image: 'Reptiles/Indian Rock Python.webp',
    sections: [
      {
        label: 'Life Span',
        values: ['Wild: 20–25 years', 'Captivity: 30+ years'],
      },
      {
        label: 'Habitat',
        values: [
          'Indian subcontinent: tropical forests, grasslands, swamps, rocky hills, mangroves, and areas near rivers or marshes',
        ],
      },
      {
        label: 'Diet',
        values: [
          'Carnivorous constrictor feeding on rodents, birds, reptiles, and small-to-medium mammals; large individuals tackle pigs, deer fawns, and monkeys',
        ],
      },
      {
        label: 'Behaviour',
        values: [
          'Solitary, mostly nocturnal or crepuscular; strong swimmer capable of long submersions; slow but delivers rapid strikes',
          'Females coil around eggs to protect and provide warmth',
        ],
      },
      {
        label: 'Conservation',
        values: ['IUCN: Near Threatened owing to poaching for skin/meat, habitat loss, and human conflict'],
      },
    ],
  },
]
