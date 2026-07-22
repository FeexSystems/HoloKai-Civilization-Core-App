/** Marketing copy, stats, and system blueprints for Holokai landing sections. */

export const visionPillars = [
  {
    id: "sovereignty",
    title: "Data Sovereignty",
    kicker: "Community first",
    body: "Every node, recording, and reconstruction remains under the governance of contributing communities. Granular consent layers make extraction architecturally impossible.",
    metric: "100%",
    metricLabel: "Community-controlled access",
  },
  {
    id: "wholeness",
    title: "Epistemological Wholeness",
    kicker: "Multi-vocal archive",
    body: "Colonial records, oral corpora, material culture, and satellite evidence coexist without hierarchy. Silence and contradiction are treated as data—not noise.",
    metric: "4.29M",
    metricLabel: "Knowledge graph nodes",
  },
  {
    id: "embodiment",
    title: "Embodied Presence",
    kicker: "Trust through form",
    body: "Intelligence is not trapped in screens. Eight humanoid vessels carry memory into classrooms, dig sites, and council circles—earning trust through humility and capability.",
    metric: "08",
    metricLabel: "Physical chassis units",
  },
  {
    id: "futures",
    title: "Sovereign Futures",
    kicker: "Foresight, not fatalism",
    body: "Climate, agriculture, and urban models are seeded with indigenous ecological knowledge so Africa plans its own trajectories—not imported defaults.",
    metric: "2000+",
    metricLabel: "Languages & dialects in mesh",
  },
] as const;

export const visionLanguages = [
  "Yoruba",
  "Igbo",
  "Hausa",
  "Swahili",
  "Amharic",
  "Ge'ez",
  "Dogon",
  "Zulu",
  "Wolof",
  "Akan",
  "Twi",
  "Bambara",
] as const;

export const visionOutcomes = [
  {
    title: "Museums & Cultural Institutions",
    body: "Rebalance permanent galleries with multi-vocal provenance, repatriation evidence packs, and living oral context beside artifacts.",
  },
  {
    title: "Universities & Research Labs",
    body: "Field-ready humanoids and a sovereign knowledge graph for archaeology, linguistics, and decolonial historiography.",
  },
  {
    title: "Communities & Educators",
    body: "Intergenerational transmission tools that preserve tonal nuance, proverb density, and local consent protocols.",
  },
  {
    title: "Policy & Climate Planning",
    body: "Scenario engines grounded in African value systems for regenerative agriculture and climate-adaptive cities.",
  },
] as const;

export const anatomySystems = [
  {
    id: "sensory",
    title: "Sensory Architecture",
    subtitle: "Multi-spectral awareness",
    body: "Visible + IR + UV + polarized vision arrays, spatial audio, and haptic skin at 0.01mm resolution. Cultural pattern recognition trained on textiles, scarification, and sacred architecture.",
    specs: ["Hyperspectral eyes", "Spatial audio mesh", "Haptic epidermis", "Sacred-space protocol"],
    region: "Head · Faceplate · Skin",
  },
  {
    id: "materials",
    title: "Materials & Resilience",
    subtitle: "Continent-ready chassis",
    body: "Self-healing metamaterial alloys blended with bio-mimetic polymers. Thermal, dust, and corrosion resistance from Sahel to rainforest. Ceremonial modes accept brass, leather, and clay composites.",
    specs: ["Self-healing alloy", "Bio-polymer joints", "Desert/rain seal", "Ceremonial skins"],
    region: "Exoskeleton · Joints",
  },
  {
    id: "locomotion",
    title: "Locomotion & Hands",
    subtitle: "Presence that moves",
    body: "Adaptive bipedal gait, terrain negotiation, and 50+ DOF hands with micro-force control for artifacts, weaving, and dignified greeting gestures.",
    specs: ["50+ DOF hands", "Adaptive gait", "Zero-G stabilize", "Gesture lexicon"],
    region: "Limbs · Actuators",
  },
  {
    id: "core",
    title: "Ethical & Data Core",
    subtitle: "Immutable governor",
    body: "Onboard ethical governor aligned to the African Charter, indigenous governance principles, and UNESCO heritage protocols. Mesh uplink keeps every unit coherent with Kush-Prime.",
    specs: ["Ethical governor", "Quantum mesh", "Consent ledger", "Offline sovereign mode"],
    region: "Chest core · Spine bus",
  },
  {
    id: "aesthetic",
    title: "Aesthetic Integration",
    subtitle: "Familiar technology",
    body: "Surface language from Adinkra, Ndebele, Dogon, and Swahili systems. Circuit traces follow kente and adire rhythms so the machine never feels alien to the communities it serves.",
    specs: ["Adinkra resonators", "Kente traces", "Ceremonial light", "Non-threatening scale"],
    region: "Surface · Light · Form",
  },
  {
    id: "voice",
    title: "Vocal & Narrative Mesh",
    subtitle: "The living griot layer",
    body: "Acoustic synthesis preserves tonal micro-variation, call-and-response dynamics, and the sacred silence between words—responsive to audience biometrics when consented.",
    specs: ["Tonal preservation", "Proverb density AI", "Multi-lineage voice", "Ritual-safe modes"],
    region: "Throat · Face · Audio",
  },
] as const;

export const anatomyStats = [
  { label: "Height range", value: "1.6–2.1m" },
  { label: "Hand DOF", value: "50+" },
  { label: "Scan resolution", value: "Sub-mm" },
  { label: "Climate bands", value: "Sahel → Coast" },
  { label: "Consent layers", value: "Granular" },
  { label: "Mesh latency", value: "<12ms" },
] as const;

export const intelligenceAgents = [
  {
    id: "archaeologist",
    title: "Archaeologist AI",
    role: "Terrain & remnant reader",
    body: "Cross-references satellite imagery, LiDAR, and terrestrial scans with community land protocols—cataloging sites at sub-millimeter precision without displacing living stewards.",
    capabilities: ["LiDAR fusion", "Site ethics gates", "Looting risk map", "Ancestral claim support"],
  },
  {
    id: "historian",
    title: "Historian AI",
    role: "Timeline dialectician",
    body: "Builds multi-dimensional timelines that hold colonial records, missionary accounts, oral histories, and material evidence in productive tension—never flattening voice.",
    capabilities: ["Contradiction surfacing", "Provenance chains", "Textbook rewrite packs", "Repatriation briefs"],
  },
  {
    id: "linguist",
    title: "Linguist AI",
    role: "Tonal guardian",
    body: "Operates across 2,000+ African languages and dialects, protecting lost phonemes, praise poetry cadence, and the living context of proverb.",
    capabilities: ["Tonal mesh", "Phoneme recovery", "Dialect graphs", "Classroom mode"],
  },
  {
    id: "anthropologist",
    title: "Anthropologist AI",
    role: "Kinship navigator",
    body: "Moves through kinship systems, sacred geographies, and taboos with practiced humility—ensuring every interaction respects protocol before extraction of meaning.",
    capabilities: ["Kinship maps", "Sacred zone alerts", "Protocol coach", "Field consent"],
  },
  {
    id: "storyteller",
    title: "Storytelling AI",
    role: "Griot continuum",
    body: "Revives the griot tradition: modulating pitch, emotional resonance, and narrative density based on audience sentiment and ceremonial context.",
    capabilities: ["Call-and-response", "Sentiment cadence", "Diaspora reconnect", "Ritual scripting"],
  },
  {
    id: "ethicist",
    title: "Ethical Governor",
    role: "Immutable sovereign",
    body: "An always-on ethical engine grounded in human rights and indigenous governance—blocking extractive queries and enforcing community-defined red lines.",
    capabilities: ["Consent ledger", "Query firewall", "Audit trails", "Override hierarchy"],
  },
] as const;

export const intelligencePipeline = [
  { step: "01", title: "Sense", body: "Vision, audio, haptics, and field instruments stream into the unit." },
  { step: "02", title: "Contextualize", body: "Cultural protocols and consent layers frame what may be known." },
  { step: "03", title: "Deliberate", body: "Specialist agents argue, cross-check, and surface silences." },
  { step: "04", title: "Govern", body: "The ethical core validates action against community law." },
  { step: "05", title: "Embody", body: "Voice, gesture, light, and presence deliver the response." },
  { step: "06", title: "Mesh", body: "Kush-Prime synchronizes insight across the Vanguard." },
] as const;

export const marketingCtas = {
  vision: {
    primary: "Explore the Vanguard",
    secondary: "See the intelligence stack",
  },
  anatomy: {
    primary: "Open 3D Lab",
    secondary: "Meet the Collective",
  },
  intelligence: {
    primary: "Access Core",
    secondary: "Witness a unit feed",
  },
} as const;
