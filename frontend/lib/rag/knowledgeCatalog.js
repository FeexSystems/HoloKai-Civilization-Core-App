/**
 * HoloKai African Civilizations Knowledge Catalog
 * Rich metadata for vector retrieval + archetype-aware filtering.
 * Sovereignty-first: curated local sources only.
 */

export const KNOWLEDGE_SOURCES = [
  {
    id: 'kemet',
    path: 'kemet.txt',
    title: 'Kemet (Ancient Egypt)',
    empire: 'Kemet',
    region: 'Northeast Africa',
    era: 'ancient',
    themes: ['history', 'architecture', 'science', 'philosophy', 'records', 'astronomy'],
    domains: ['historian', 'archaeology', 'linguistics'],
    archetypes: ['kemet-alpha', 'zamani', 'oluwa-core', 'kush-prime'],
    topicPack: { nodes: 801, episodes: 301, responses: 1001, label: 'Ancient Egypt' },
  },
  {
    id: 'mali-empire',
    path: 'mali-empire.txt',
    title: 'Mali Empire',
    empire: 'Mali',
    region: 'West Africa',
    era: 'medieval',
    themes: ['history', 'scholarship', 'trade', 'records', 'gold'],
    domains: ['historian', 'anthropology'],
    archetypes: ['kemet-alpha', 'oluwa-core', 'sika-gold', 'bantu-node'],
  },
  {
    id: 'great-zimbabwe',
    path: 'great-zimbabwe.txt',
    title: 'Great Zimbabwe',
    empire: 'Great Zimbabwe',
    region: 'Southern Africa',
    era: 'medieval',
    themes: ['architecture', 'history', 'trade', 'craft'],
    domains: ['archaeology', 'historian'],
    archetypes: ['kemet-alpha', 'sika-gold', 'kush-prime'],
  },
  {
    id: 'dogon-cosmology',
    path: 'dogon-cosmology.txt',
    title: 'Dogon Cosmology',
    empire: 'Dogon',
    region: 'West Africa',
    era: 'timeless',
    themes: ['cosmology', 'astronomy', 'philosophy', 'vision', 'science'],
    domains: ['anthropology', 'linguistics'],
    archetypes: ['asante-v', 'zamani', 'oluwa-core'],
  },
  {
    id: 'ifa-divination',
    path: 'ifa-divination.txt',
    title: 'Ifá Divination',
    empire: 'Yoruba',
    region: 'West Africa',
    era: 'timeless',
    themes: ['divination', 'philosophy', 'vision', 'ethics', 'oral-tradition'],
    domains: ['anthropology', 'ethics', 'linguistics'],
    archetypes: ['asante-v', 'zamani', 'oluwa-core', 'naja-7'],
  },
  {
    id: 'adinkra-symbols',
    path: 'adinkra-symbols.txt',
    title: 'Adinkra Symbols',
    empire: 'Akan / Asante',
    region: 'West Africa',
    era: 'timeless',
    themes: ['philosophy', 'craft', 'symbols', 'design', 'ethics'],
    domains: ['linguistics', 'anthropology', 'ethics'],
    archetypes: ['sika-gold', 'asante-v', 'zamani', 'oluwa-core'],
  },
  {
    id: 'nsibidi-writing',
    path: 'nsibidi-writing.txt',
    title: 'Nsibidi Writing',
    empire: 'Ejagham / Igbo',
    region: 'West Africa',
    era: 'ancient',
    themes: ['records', 'symbols', 'linguistics', 'history'],
    domains: ['linguistics', 'historian'],
    archetypes: ['kemet-alpha', 'bantu-node', 'oluwa-core'],
  },
  {
    id: 'ubuntu-philosophy',
    path: 'ubuntu-philosophy.txt',
    title: 'Ubuntu Philosophy',
    empire: 'Bantu',
    region: 'Southern / Central Africa',
    era: 'timeless',
    themes: ['philosophy', 'ethics', 'community', 'vision'],
    domains: ['ethics', 'anthropology'],
    archetypes: ['zamani', 'naja-7', 'bantu-node', 'asante-v'],
  },
  {
    id: 'benin-bronzes',
    path: 'benin-bronzes.txt',
    title: 'Benin Bronzes',
    empire: 'Benin',
    region: 'West Africa',
    era: 'medieval',
    themes: ['craft', 'art', 'history', 'metallurgy', 'sovereignty'],
    domains: ['archaeology', 'historian', 'ethics'],
    archetypes: ['sika-gold', 'kemet-alpha', 'naja-7', 'kush-prime'],
  },
  {
    id: 'nubia-kush',
    path: 'nubia-kush.txt',
    title: 'Nubia & Kingdom of Kush',
    empire: 'Kush',
    region: 'Northeast Africa',
    era: 'ancient',
    themes: ['history', 'architecture', 'sovereignty', 'trade'],
    domains: ['historian', 'archaeology'],
    archetypes: ['kush-prime', 'kemet-alpha', 'bantu-node', 'oluwa-core'],
    topicPack: { nodes: 601, episodes: 201, responses: 801, label: 'Nubia' },
  },
  {
    id: 'axum-empire',
    path: 'axum-empire.txt',
    title: 'Axum (Aksumite Empire)',
    empire: 'Axum',
    region: 'Horn of Africa',
    era: 'ancient',
    themes: ['history', 'trade', 'architecture', 'religion', 'records', 'sovereignty'],
    domains: ['historian', 'archaeology', 'linguistics'],
    archetypes: ['kemet-alpha', 'kush-prime', 'bantu-node', 'oluwa-core'],
    topicPack: { nodes: 501, episodes: 151, responses: 601, label: 'Axum' },
  },
  {
    id: 'songhai-empire',
    path: 'songhai-empire.txt',
    title: 'Songhai Empire',
    empire: 'Songhai',
    region: 'West Africa',
    era: 'medieval',
    themes: ['history', 'scholarship', 'trade', 'records', 'gold', 'sovereignty'],
    domains: ['historian', 'anthropology'],
    archetypes: ['kemet-alpha', 'oluwa-core', 'sika-gold', 'bantu-node'],
  },
  {
    id: 'swahili-coast',
    path: 'swahili-coast.txt',
    title: 'Swahili Coast Civilization',
    empire: 'Swahili City-States',
    region: 'East Africa',
    era: 'medieval',
    themes: ['trade', 'linguistics', 'architecture', 'history', 'diaspora'],
    domains: ['historian', 'linguistics', 'anthropology', 'archaeology'],
    archetypes: ['bantu-node', 'kemet-alpha', 'oluwa-core', 'sika-gold'],
  },
  {
    id: 'carthage',
    path: 'carthage.txt',
    title: 'Carthage (North Africa)',
    empire: 'Carthage',
    region: 'North Africa',
    era: 'ancient',
    themes: ['history', 'trade', 'sovereignty', 'architecture', 'science'],
    domains: ['historian', 'archaeology'],
    archetypes: ['kemet-alpha', 'kush-prime', 'naja-7', 'oluwa-core'],
  },
]

/**
 * Preferred retrieval themes per Vanguard archetype.
 * Archivist → precise historical records; Oracle → visionary / cosmological content.
 */
export const ARCHETYPE_FILTERS = {
  'oluwa-core': {
    themes: ['oral-tradition', 'history', 'philosophy', 'cosmology'],
    preferredSources: ['mali-empire', 'dogon-cosmology', 'ifa-divination', 'ubuntu-philosophy'],
  },
  'naja-7': {
    themes: ['ethics', 'sovereignty', 'records', 'community'],
    preferredSources: ['ubuntu-philosophy', 'benin-bronzes', 'ifa-divination', 'kemet'],
  },
  'kemet-alpha': {
    themes: ['history', 'records', 'chronology', 'architecture', 'science'],
    preferredSources: [
      'kemet',
      'mali-empire',
      'nubia-kush',
      'nsibidi-writing',
      'great-zimbabwe',
      'axum-empire',
      'songhai-empire',
      'carthage',
    ],
  },
  'zamani': {
    themes: ['philosophy', 'science', 'cosmology', 'ethics'],
    preferredSources: ['ubuntu-philosophy', 'dogon-cosmology', 'ifa-divination', 'adinkra-symbols', 'kemet'],
  },
  'bantu-node': {
    themes: ['diaspora', 'trade', 'community', 'linguistics', 'history'],
    preferredSources: [
      'nubia-kush',
      'nsibidi-writing',
      'ubuntu-philosophy',
      'mali-empire',
      'benin-bronzes',
      'swahili-coast',
      'axum-empire',
    ],
  },
  'sika-gold': {
    themes: ['craft', 'art', 'design', 'symbols', 'metallurgy', 'architecture'],
    preferredSources: ['adinkra-symbols', 'benin-bronzes', 'great-zimbabwe', 'mali-empire'],
  },
  'asante-v': {
    themes: ['vision', 'divination', 'cosmology', 'philosophy', 'symbols'],
    preferredSources: ['ifa-divination', 'dogon-cosmology', 'adinkra-symbols', 'ubuntu-philosophy'],
  },
  'kush-prime': {
    themes: ['architecture', 'science', 'craft', 'sovereignty', 'history'],
    preferredSources: ['nubia-kush', 'kemet', 'great-zimbabwe', 'benin-bronzes', 'axum-empire', 'carthage'],
  },
}

export function getSourceById(id) {
  return KNOWLEDGE_SOURCES.find((s) => s.id === id) || null
}

/** Topic packs with Meta-Agent extract counts (Egypt / Nubia / Axum core). */
export function getTopicPacks() {
  return KNOWLEDGE_SOURCES.filter((s) => s.topicPack).map((s) => ({
    id: s.id,
    title: s.title,
    path: s.path,
    ...s.topicPack,
  }))
}
