// Mock research data — simulates Python backend responses until backend is connected

export const MOCK_SOURCES = [
  { slug: 'kush-napata-origins', title: 'The Rise of Napata: Origins of the Kushite State', civilization: 'Kush', era: '1070 BCE – 350 CE', region: 'Nubia', type: 'Manuscript', language: 'English', confidence: 0.92, author: 'Laszlo Torok', summary: 'Examines the formation of the Kushite state at Napata following the collapse of the New Kingdom Egyptian influence in Nubia.' },
  { slug: 'kandakes-of-mereo', title: 'The Kandakes of Meroe: Queens Who Ruled and Waged War', civilization: 'Kush', era: '300 BCE – 100 CE', region: 'Nubia', type: 'Article', language: 'English', confidence: 0.88, author: 'László Török', summary: 'Analysis of the matrilineal succession system and the military role of Kandakes in the Meroitic kingdom.' },
  { slug: 'benin-bronzes-casting', title: 'Bronze Casting in the Benin Kingdom: Techniques and Symbolism', civilization: 'Benin', era: '13th – 19th century', region: 'West Africa', type: 'Manuscript', language: 'English', confidence: 0.90, author: 'Paula Ben-Amos', summary: 'Documents the lost-wax casting techniques used in the Benin court bronzes and their political-religious significance.' },
  { slug: 'trans-saharan-gold-trade', title: 'The Trans-Saharan Gold Trade and the Rise of Ghana', civilization: 'Ghana Empire', era: '300 – 1200 CE', region: 'West Africa', type: 'Article', language: 'English', confidence: 0.85, author: 'Nehemia Levtzion', summary: 'Traces the gold-salt exchange networks that fueled the Ghana, Mali, and Songhai empires.' },
  { slug: 'dogon-astronomy-sirius', title: 'Dogon Astronomy and the Sirius System: A Critical Reassessment', civilization: 'Dogon', era: 'Pre-colonial – present', region: 'Mali', type: 'Article', language: 'English', confidence: 0.71, author: 'Walter van Beek', summary: 'Re-examines claims about Dogon knowledge of the Sirius binary system with ethnographic evidence.' },
  { slug: 'nsibidi-writing-system', title: 'Nsibidi: The Visual Language of the Ejagham', civilization: 'Ejagham / Igbo', era: 'Pre-colonial – present', region: 'Cross River', type: 'Manuscript', language: 'English', confidence: 0.83, author: 'J.K. MacGregor', summary: 'Documents the ideographic writing system used by secret societies in the Cross River region.' },
  { slug: 'swahili-coast-trade', title: 'The Swahili Coast: Indian Ocean Trade Networks 800-1500 CE', civilization: 'Swahili Coast', era: '800 – 1500 CE', region: 'East Africa', type: 'Article', language: 'English', confidence: 0.87, author: 'Mark Horton', summary: 'Maps the dhow trade routes connecting Kilwa, Mombasa, and Sofala to the Indian Ocean world.' },
  { slug: 'great-zimbabwe-architecture', title: 'Great Zimbabwe: Dry-Stone Architecture and State Formation', civilization: 'Zimbabwe', era: '1100 – 1450 CE', region: 'Southern Africa', type: 'Manuscript', language: 'English', confidence: 0.89, author: 'David Beach', summary: 'Analyzes the construction techniques and political meaning of the Great Zimbabwe stone complexes.' },
  { slug: 'ifa-divination-corpus', title: 'Ifá Divination: The Oracular Corpus of the Yoruba', civilization: 'Yoruba', era: 'Pre-colonial – present', region: 'West Africa', type: 'Oral Tradition', language: 'English', confidence: 0.86, author: 'William Bascom', summary: 'Comprehensive study of the Ifá divination system with its 256 odu and vast memorized corpus.' },
  { slug: 'meroitic-script-undeciphered', title: 'The Meroitic Script: Africa\'s Undeciphered Alphabet', civilization: 'Kush', era: '300 BCE – 400 CE', region: 'Nubia', type: 'Article', language: 'English', confidence: 0.78, author: 'Claude Rilly', summary: 'Survey of the Meroitic writing system, its decipherment status, and what we know and do not know.' },
  { slug: 'iron-metallurgy-bantu', title: 'Iron Metallurgy and the Bantu Expansion', civilization: 'Bantu peoples', era: '1000 BCE – 1000 CE', region: 'Sub-Saharan Africa', type: 'Article', language: 'English', confidence: 0.81, author: 'Nicole Lwango', summary: 'Examines the role of iron technology in the Bantu-speaking peoples\' migration across central and southern Africa.' },
  { slug: 'ashanti-gold-weights', title: 'Ashanti Gold Weights: Proverbial Mathematics', civilization: 'Ashanti', era: '15th – 19th century', region: 'Ghana', type: 'Manuscript', language: 'English', confidence: 0.84, author: 'Timothy Garrard', summary: 'Documents the bronze gold-weight figurines encoding proverbs, mathematics, and trade values.' },
];

export const MOCK_TIMELINE_EVENTS = [
  { id: 't1', date: '3500 BCE', title: ' emergence of early Nile valley agriculture', civilization: 'Egypt', region: 'Nile Valley' },
  { id: 't2', date: '3100 BCE', title: 'Unification of Upper and Lower Egypt under Narmer', civilization: 'Kemet', region: 'Nile Valley' },
  { id: 't3', date: '2650 BCE', title: 'Imhotep designs the Step Pyramid of Djoser at Saqqara', civilization: 'Kemet', region: 'Nile Valley' },
  { id: 't4', date: '1500 BCE', title: 'Emergence of the Kingdom of Kush at Kerma', civilization: 'Kush', region: 'Nubia' },
  { id: 't5', date: '1070 BCE', title: 'Collapse of New Kingdom Egypt; Kushite independence at Napata', civilization: 'Kush', region: 'Nubia' },
  { id: 't6', date: '747 BCE', title: 'Kushite King Piankhy conquers Egypt — 25th Dynasty begins', civilization: 'Kush', region: 'Nubia' },
  { id: 't7', date: '800 BCE', title: 'Nok culture terracotta production peaks in central Nigeria', civilization: 'Nok', region: 'West Africa' },
  { id: 't8', date: '300 BCE', title: 'Kingdom of Aksum rises in the Horn of Africa', civilization: 'Aksum', region: 'Horn of Africa' },
  { id: 't9', date: '300 BCE', title: 'Meroe becomes capital of Kush; ironworking flourishes', civilization: 'Kush', region: 'Nubia' },
  { id: 't10', date: '300 CE', title: 'Aksum mints its own coinage', civilization: 'Aksum', region: 'Horn of Africa' },
  { id: 't11', date: '700 CE', title: 'Trans-Saharan gold trade fuels the rise of Ghana Empire', civilization: 'Ghana Empire', region: 'West Africa' },
  { id: 't12', date: '1000 CE', title: 'Great Zimbabwe settlement begins construction', civilization: 'Zimbabwe', region: 'Southern Africa' },
  { id: 't13', date: '1200 CE', title: 'Swahili coastal city-states flourish on Indian Ocean routes', civilization: 'Swahili Coast', region: 'East Africa' },
  { id: 't14', date: '1235 CE', title: 'Sundiata Keita founds the Mali Empire', civilization: 'Mali', region: 'West Africa' },
  { id: 't15', date: '1324 CE', title: 'Mansa Musa\'s pilgrimage to Mecca', civilization: 'Mali', region: 'West Africa' },
  { id: 't16', date: '1300 CE', title: 'Benin Kingdom develops sophisticated bronze casting', civilization: 'Benin', region: 'West Africa' },
];

export const MOCK_MAP_LOCATIONS = [
  { id: 'kush', name: 'Kingdom of Kush', lat: 18.5, lng: 31.8, civilization: 'Kush', era: '1500 BCE – 350 CE', description: 'Napata and Meroe — the black pharaohs of Nubia.' },
  { id: 'kemet', name: 'Kemet / Ancient Egypt', lat: 26.0, lng: 32.0, civilization: 'Kemet', era: '3100 BCE – 30 BCE', description: 'The civilization of the Nile — pyramids, astronomy, and medicine.' },
  { id: 'aksum', name: 'Kingdom of Aksum', lat: 14.1, lng: 38.7, civilization: 'Aksum', era: '100 – 960 CE', description: 'The great trading empire of the Horn — stelae and coinage.' },
  { id: 'mali', name: 'Mali Empire', lat: 15.0, lng: -8.0, civilization: 'Mali', era: '1235 – 1670 CE', description: 'Timbuktu and Djenné — centers of learning and gold trade.' },
  { id: 'benin', name: 'Benin Kingdom', lat: 6.5, lng: 5.6, civilization: 'Benin', era: '1300 – 1897 CE', description: 'The bronze-casting kingdom of the Edo people.' },
  { id: 'zimbabwe', name: 'Great Zimbabwe', lat: -20.3, lng: 30.9, civilization: 'Zimbabwe', era: '1100 – 1450 CE', description: 'Dry-stone city of the Shona — center of gold trade.' },
  { id: 'ghana', name: 'Ghana Empire', lat: 15.0, lng: -10.0, civilization: 'Ghana Empire', era: '300 – 1200 CE', description: 'Wagadu — the first great trading empire of West Africa.' },
  { id: 'swahili', name: 'Swahili Coast', lat: -6.8, lng: 39.3, civilization: 'Swahili Coast', era: '800 – 1500 CE', description: 'Kilwa and the Indian Ocean dhow networks.' },
  { id: 'nok', name: 'Nok Culture', lat: 9.5, lng: 7.5, civilization: 'Nok', era: '1500 BCE – 500 CE', description: 'Earliest known terracotta sculpture in West Africa.' },
];

export const MOCK_CHAT_RESPONSE = (question, guardian) => ({
  answer: `Based on available sources, ${guardian.name} addresses your question about "${question}" by drawing on verified archival material. The evidence points to a rich tradition spanning multiple centuries, with the earliest documented references appearing in the ${guardian.focus[0]} corpus. Scholarly consensus, as reflected in the cited sources, supports the conclusion that this civilization maintained sophisticated systems of governance, trade, and knowledge transmission. However, some claims remain contested, and further research is encouraged to verify specific details.`,
  claims: [
    { text: 'The matrilineal succession system was central to Kushite governance.', sources: ['kush-napata-origins', 'kandakes-of-mereo'], confidence: 0.91 },
    { text: 'Meroitic ironworking was among the most advanced in the ancient world.', sources: ['meroitic-script-undeciphered'], confidence: 0.82 },
  ],
  citations: [
    { sourceSlug: 'kush-napata-origins', sourceTitle: 'The Rise of Napita: Origins of the Kushite State', confidence: 0.92 },
    { sourceSlug: 'kandakes-of-mereo', sourceTitle: 'The Kandakes of Meroe', confidence: 0.88 },
  ],
  insufficientEvidence: false,
});

export const MOCK_MANUSCRIPTS = [
  { id: 'm1', slug: 'ifa-divination-corpus', title: 'Ifá Divination Corpus — Odu Ifá', civilization: 'Yoruba', date: 'Pre-colonial', pages: 256, language: 'Yoruba / English', hasTranscription: true, hasTranslation: true },
  { id: 'm2', slug: 'meroitic-script-undeciphered', title: 'Meroitic Inscription — Stele of Amanishakheto', civilization: 'Kush', date: '1st century BCE', pages: 12, language: 'Meroitic (undeciphered)', hasTranscription: true, hasTranslation: false },
  { id: 'm3', slug: 'nsibidi-writing-system', title: 'Nsibidi Symbols — Ejagham Secret Society Records', civilization: 'Ejagham', date: 'Pre-colonial', pages: 48, language: 'Nsibidi', hasTranscription: true, hasTranslation: true },
  { id: 'm4', slug: 'benin-bronzes-casting', title: 'Benin Court Chronicles — Bronze Plaque Inscriptions', civilization: 'Benin', date: '16th century', pages: 84, language: 'Edo / English', hasTranscription: true, hasTranslation: true },
];

export const MOCK_ORAL_TRADITIONS = [
  { id: 'o1', title: 'The Epic of Sundiata Keita', region: 'Mali', language: 'Mandinka', theme: 'Founding', duration: '45 min', narrator: 'Griot tradition' },
  { id: 'o2', title: 'The Kandake Who Rode to War', region: 'Nubia', language: 'Nobiin', theme: 'Warfare', duration: '22 min', narrator: 'Oral chronicle' },
  { id: 'o3', title: 'How the Dogon Learned the Stars', region: 'Mali', language: 'Dogon', theme: 'Astronomy', duration: '18 min', narrator: 'Elder tradition' },
  { id: 'o4', title: 'The Origin of the Nsibidi', region: 'Cross River', language: 'Ejagham', theme: 'Writing', duration: '15 min', narrator: 'Secret society' },
  { id: 'o5', title: 'The Queen of Sheba and the Ethiopian Line', region: 'Ethiopia', language: 'Amharic / Ge\'ez', theme: 'Dynasty', duration: '30 min', narrator: 'Royal chronicle' },
  { id: 'o6', title: 'The Swahili Dhow Songs', region: 'Swahili Coast', language: 'Swahili', theme: 'Trade', duration: '12 min', narrator: 'Sailor tradition' },
];

export const MOCK_KNOWLEDGE_GRAPH = [
  { id: 'kush', label: 'Kingdom of Kush', type: 'civilization' },
  { id: 'kemet', label: 'Kemet / Egypt', type: 'civilization' },
  { id: 'aksum', label: 'Aksum', type: 'civilization' },
  { id: 'mali', label: 'Mali Empire', type: 'civilization' },
  { id: 'benin', label: 'Benin Kingdom', type: 'civilization' },
  { id: 'zimbabwe', label: 'Great Zimbabwe', type: 'civilization' },
  { id: 'kandake', label: 'Kandake Amanirenas', type: 'person' },
  { id: 'sundiata', label: 'Sundiata Keita', type: 'person' },
  { id: 'mansa-musa', label: 'Mansa Musa', type: 'person' },
  { id: 'imhotep', label: 'Imhotep', type: 'person' },
  { id: 'iron', label: 'Iron Metallurgy', type: 'concept' },
  { id: 'gold-trade', label: 'Gold Trade', type: 'concept' },
  { id: 'matrilineal', label: 'Matrilineal Succession', type: 'concept' },
  { id: 'ifá', label: 'Ifá Divination', type: 'concept' },
  { id: 'nsibidi', label: 'Nsibidi', type: 'concept' },
  { id: 'pyramid', label: 'Pyramid Architecture', type: 'concept' },
  { id: 'dhow', label: 'Dhow Navigation', type: 'concept' },
  { id: 'griot', label: 'Griot Tradition', type: 'concept' },
];

export const MOCK_GRAPH_EDGES = [
  { from: 'kush', to: 'kemet', label: 'conquered (25th Dynasty)' },
  { from: 'kush', to: 'kandake', label: 'ruled by' },
  { from: 'kush', to: 'matrilineal', label: 'practiced' },
  { from: 'kush', to: 'iron', label: 'developed' },
  { from: 'kemet', to: 'imhotep', label: 'produced' },
  { from: 'kemet', to: 'pyramid', label: 'built' },
  { from: 'mali', to: 'sundiata', label: 'founded by' },
  { from: 'mali', to: 'mansa-musa', label: 'ruled by' },
  { from: 'mali', to: 'gold-trade', label: 'controlled' },
  { from: 'benin', to: 'iron', label: 'mastered' },
  { from: 'zimbabwe', to: 'gold-trade', label: 'centered on' },
  { from: 'kemet', to: 'ifá', label: 'influenced' },
  { from: 'nsibidi', to: 'griot', label: 'used by' },
  { from: 'aksum', to: 'gold-trade', label: 'traded' },
];

export const CIVILIZATIONS = [
  'Kush', 'Kemet', 'Aksum', 'Mali', 'Benin', 'Zimbabwe', 'Ghana Empire', 'Swahili Coast', 'Nok', 'Yoruba', 'Ashanti', 'Dogon', 'Ejagham'
];

export const COMPARE_DIMENSIONS = [
  { key: 'governance', label: 'Governance' },
  { key: 'religion', label: 'Religion' },
  { key: 'language', label: 'Language' },
  { key: 'science', label: 'Science' },
  { key: 'trade', label: 'Trade' },
  { key: 'architecture', label: 'Architecture' },
];

export const COMPARE_DATA = {
  Kush: {
    governance: 'Monarchy with strong matrilineal succession. Kandakes (queen mothers) held sovereign power.',
    religion: 'Amun worship centered at Napata. Later Meroitic deities like Apedemak the lion god.',
    language: 'Meroitic — one of Africa\'s earliest scripts, still largely undeciphered.',
    science: 'Advanced ironworking at Meroe. Astronomical knowledge encoded in pyramids.',
    trade: 'Gold, ivory, and iron via Nile routes to Egypt and the Mediterranean.',
    architecture: 'Steep pyramids at Meroe — distinct from Egyptian form. Temples at Musawwarat es-Sufra.',
  },
  Kemet: {
    governance: 'Divine kingship — the pharaoh as Horus on earth. Bureaucratic administration by viziers.',
    religion: 'Polytheistic pantheon. Osiris, Isis, Ra. Temple cults and mortuary practices.',
    language: 'Hieroglyphic, hieratic, and demotic scripts. Earliest fully deciphered African writing.',
    science: 'Mathematics, astronomy, medicine. The Edwin Smith papyrus. 365-day calendar.',
    trade: 'Nubian gold, Punt incense, Mediterranean grain exports.',
    architecture: 'Pyramids of Giza, temples of Karnak and Luxor, mortuary complexes.',
  },
  Mali: {
    governance: 'Mansa (emperor) system. Decentralized provincial rule under trusted nobles.',
    religion: 'Islam adopted under Mansa Musa. Timbuktu as center of Islamic learning.',
    language: 'Mandinka, Arabic. Scholars wrote in Arabic — libraries of Timbuktu.',
    science: 'Astronomy, jurisprudence, mathematics at Sankore Madrasa.',
    trade: 'Gold-salt trade across the Sahara. Mansa Musa\'s wealth destabilized Mediterranean gold markets.',
    architecture: 'Djenné mud-brick mosque. Timbuktu scholarly architecture.',
  },
  Benin: {
    governance: 'Oba (divine king) system. Court guilds and title-based administrative structure.',
    religion: 'Royal ancestor veneration. Olokun deity of the sea and wealth.',
    language: 'Edo. Oral chronicles and court histories.',
    science: 'Lost-wax bronze casting of extraordinary technical precision.',
    trade: 'European coastal trade from 15th century. Pepper, ivory, textiles.',
    architecture: 'Moat and wall system of Benin City — among the largest earthworks in the world.',
  },
};