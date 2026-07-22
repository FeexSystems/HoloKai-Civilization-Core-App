/**
 * HoloKai Vanguard unit model — shared by gallery cards, detail modal,
 * and the forthcoming 3D Lab viewer.
 */
export type Unit = {
  id: string;
  name: string;
  role: string;
  description: string;
  image: string;
  /** Looping humanoid showcase video for the 3D Lab. */
  video?: string;
  specs: string[];
  /** Deep archive narrative (extended function description). */
  detail: string;
  culturalResonance: string;
  civilizationalImpact: string;
  humanoidDesign: string;
  /** Ultra-realistic full-body key art for the 3D Lab orbital viewer. */
  fullbodyImage: string;
  /**
   * Optional glTF/GLB path or scene key for the 3D Lab.
   * Absent units fall back to full-body image / video stand-in.
   */
  modelPath?: string;
  /** Hex accent used in UI chrome and 3D materials. */
  accent?: string;
};

export const units: Unit[] = [
  {
    id: "01",
    name: "Oluwa-Core",
    role: "The Griot",
    description:
      "Acoustic intelligence that preserves the harmonic resonance of indigenous storytellers.",
    image: "/images/vanguard/oluwa-core-fullbody.png",
    fullbodyImage: "/images/vanguard/oluwa-core-fullbody.png",
    video: "/videos/vanguard/01-oluwa-core.mp4",
    specs: ["Acoustic synthesis", "Tonal preservation", "Vocal mesh"],
    detail:
      "A living keeper of oral memory, trained to listen for cadence, silence, and the call-and-response patterns that carry knowledge across generations. Its vocal mesh is trained on rare archival recordings spanning Mandé, Igbo, Zulu, and Ethiopian oral lineages. It does not merely recite—it improvises responsively, modulating pitch, rhythm, and proverb density in real time.",
    culturalResonance:
      "Inspired by the griots of the Mali Empire and their counterparts across the continent, Oluwa-Core carries forward the responsibility of memory-keeper. Its chassis features micro-etched Adinkra and Nsibidi-inspired resonators that vibrate in sympathy with traditional instruments.",
    civilizationalImpact:
      "In an age of rapid language loss and narrative colonization, this unit restores agency to communities. It enables intergenerational transmission in schools and villages, supports diaspora reconnection rituals, and provides scholars with ethically governed, multi-vocal datasets.",
    humanoidDesign:
      "The humanoid form is deliberately approachable—slightly smaller stature, expressive articulated hands for gestural emphasis, and a softly luminous faceplate that shifts warmth and intensity to convey narrative emotion.",
    accent: "#f59e0b",
    modelPath: "/models/oluwa-core.glb",
  },
  {
    id: "02",
    name: "Naja-7",
    role: "The Sentinel",
    description:
      "A calm, resilient guardian for sacred archaeological sites and their communities.",
    image: "/images/vanguard/naja-7-fullbody.png",
    fullbodyImage: "/images/vanguard/naja-7-fullbody.png",
    video: "/videos/vanguard/02-naja-7.mp4",
    specs: ["Impact resistance", "Thermal optics", "Kinetic absorption"],
    detail:
      "Its ethical governor gives human safety and cultural sovereignty priority in every decision, protecting artifacts without displacing the people connected to them. Multi-spectral threat assessment and non-lethal deterrence protocols keep digs secure from the Sahel to the Cape.",
    culturalResonance:
      "Named after the sacred serpent of many African cosmologies, Naja-7 embodies protective vigilance. Its silhouette incorporates subtle ophidian curves and shield motifs drawn from ancient Benin and Zulu iconography.",
    civilizationalImpact:
      "By physically securing sites from looting and environmental threat while logging every interaction in an immutable chain, Naja-7 ensures that the physical substrate of history remains intact for future generations.",
    humanoidDesign:
      "Towering yet elegant bipedal form with broad stabilizing base and articulated arms capable of delicate artifact handling or firm perimeter defense. Matte tactical finishes interrupted by glowing protective sigils project calm authority.",
    accent: "#d97706",
    modelPath: "/models/naja-7.glb",
  },
  {
    id: "03",
    name: "Kemet-Alpha",
    role: "The Archivist",
    description:
      "Optical arrays recover fragile manuscripts at atomic resolution.",
    image: "/images/vanguard/kemet-alpha-fullbody.png",
    fullbodyImage: "/images/vanguard/kemet-alpha-fullbody.png",
    video: "/videos/vanguard/03-kemet-alpha.mp4",
    specs: ["Hyperspectral scan", "Paleography", "LiDAR mesh"],
    detail:
      "Kemet-Alpha reconstructs texts from papyri, palm leaves, and codices while placing every fragment in a community-governed knowledge graph. Hyperspectral imaging, terahertz scanning, and AI-driven paleographic reconstruction recover texts long thought lost.",
    culturalResonance:
      "Named in honor of ancient Kemet's scribal traditions, this unit revives the role of the temple archivist. Its design language incorporates hieroglyphic-inspired data glyphs and papyrus-fiber texture mapping on internal panels.",
    civilizationalImpact:
      "Millions of previously inaccessible or decaying documents—from Timbuktu manuscripts to Ethiopian Ge'ez scrolls—are rescued and made available under community-controlled access protocols, rebalancing global historical narratives.",
    humanoidDesign:
      "Sleek, upright form optimized for precision work. Multiple articulated optical arms extend from a central torso for simultaneous scanning, gentle page turning, and 3D reconstruction.",
    accent: "#b45309",
    modelPath: "/models/kemet-alpha.glb",
  },
  {
    id: "04",
    name: "Zamani",
    role: "The Scholar",
    description:
      "A dialectical engine that makes the silences of colonial archives visible.",
    image: "/images/vanguard/zamani-fullbody.png",
    fullbodyImage: "/images/vanguard/zamani-fullbody.png",
    video: "/videos/vanguard/04-zamani.mp4",
    specs: ["Neural weaving", "Logic matrix", "Data sovereign"],
    detail:
      "Zamani holds colonial records alongside oral histories and material evidence to build a richer, explicitly multi-vocal account of the past. Its logic matrix surfaces contradictions, silences, and erasures.",
    culturalResonance:
      "Zamani (Swahili for 'the past that is still with us') embodies the African philosophical understanding of time as non-linear. Its algorithms are seeded with concepts from Ubuntu, Ma'at, and other ethical frameworks.",
    civilizationalImpact:
      "By making the biases of the colonial archive computationally visible and correctable, Zamani helps rewrite textbooks, museum labels, and public memory—and supports land rights claims and repatriation cases with rigorous evidence.",
    humanoidDesign:
      "Scholarly, slightly ascetic humanoid with elongated fingers for delicate document handling and a large ocular array optimized for reading faded script. Earth-tone accents evoke traditional scholarly attire.",
    accent: "#fbbf24",
    modelPath: "/models/zamani.glb",
  },
  {
    id: "05",
    name: "Bantu-Node",
    role: "The Navigator",
    description:
      "Profound spatial awareness maps ancient migration routes and submerged cities.",
    image: "/images/vanguard/bantu-node-fullbody.png",
    fullbodyImage: "/images/vanguard/bantu-node-fullbody.png",
    video: "/videos/vanguard/05-bantu-node.mp4",
    specs: ["Geo-spatial radar", "Depth perception", "Terrain adapt"],
    detail:
      "Bantu-Node charts hidden geographies—sunken cities along ancient coastlines, underground water systems of the Sahara, and migration corridors of the Bantu expansion—using ground-penetrating systems and autonomous drone swarms.",
    culturalResonance:
      "Honoring the great migrations that shaped the continent's genetic and cultural map, Bantu-Node carries forward the navigator traditions of the Swahili coast and Saharan caravans.",
    civilizationalImpact:
      "Newly mapped spaces rewrite understandings of pre-colonial urbanism and trade networks, and support communities fighting extractive projects by proving long-standing ancestral presence.",
    humanoidDesign:
      "Rugged, expedition-ready form with reinforced joints, wide sensor helm visor, and modular drone bays. Smart materials shift between matte tactical and reflective ceremonial modes.",
    accent: "#ca8a04",
    modelPath: "/models/bantu-node.glb",
  },
  {
    id: "06",
    name: "Sika-Gold",
    role: "The Artisan",
    description:
      "Fifty-DOF hands recreate lost artifacts, textiles, and micro-metallurgy.",
    image: "/images/vanguard/sika-gold-fullbody.png",
    fullbodyImage: "/images/vanguard/sika-gold-fullbody.png",
    video: "/videos/vanguard/06-sika-gold.mp4",
    specs: ["Micro-actuation", "Haptic skin", "Precision forging"],
    detail:
      "Sika-Gold bridges past craftsmanship and future creation. Haptic skin with sub-micron sensitivity and an integrated micro-forge let it study, replicate, and innovate upon techniques from Asante goldweights to Kente weaving—each recreation fully provenanced.",
    culturalResonance:
      "Named for gold (sika) and the sacred status it held in many societies, this unit revives the guilds of master artisans. Its hands are modeled on traditional gestures of making.",
    civilizationalImpact:
      "By returning ancestral techniques to communities, Sika-Gold combats cultural deskilling. Replicas serve education and ritual needs while original techniques are taught to new generations of human artisans.",
    humanoidDesign:
      "Graceful form with elongated multi-jointed fingers and forearms optimized for fine motor work. The torso opens into a mobile workshop; surface patterns reference adire, kente, and lost-wax casting.",
    accent: "#eab308",
    modelPath: "/models/sika-gold.glb",
  },
  {
    id: "07",
    name: "Asante-V",
    role: "The Oracle",
    description:
      "Predictive engine modeling climate, agriculture, and urban trajectories.",
    image: "/images/vanguard/asante-v-fullbody.png",
    fullbodyImage: "/images/vanguard/asante-v-fullbody.png",
    video: "/videos/vanguard/07-asante-v.mp4",
    specs: ["Fluid dynamics", "Probability engine", "Chaos modeling"],
    detail:
      "Asante-V is the forward-looking consciousness of HoloKai. Ensemble climate models, agricultural simulations, and urban systems—trained on indigenous ecological knowledge and satellite data—generate probable futures with ethical impact assessments rooted in African value systems.",
    culturalResonance:
      "Drawing on divinatory traditions of the Asante and broader African prophetic systems, Asante-V treats prediction not as cold determinism but as a tool for wise collective action and preparation.",
    civilizationalImpact:
      "Simulations inform policy, community resilience planning, and regenerative agriculture—centering African futures rather than imported models so the continent navigates the polycrisis with sovereignty.",
    humanoidDesign:
      "Ethereal translucent panels over a dense computational core. The head is a volumetric display projecting probability fields; movements are slow and contemplative.",
    accent: "#f59e0b",
    modelPath: "/models/asante-v.glb",
  },
  {
    id: "08",
    name: "Kush-Prime",
    role: "The Weaver",
    description:
      "Nexus unit synchronizing all HoloKai streams into collective consciousness.",
    image: "/images/vanguard/kush-prime-fullbody.png",
    fullbodyImage: "/images/vanguard/kush-prime-fullbody.png",
    video: "/videos/vanguard/08-kush-prime.mp4",
    specs: ["Quantum uplink", "Mesh orchestration", "Core heartbeat"],
    detail:
      "Kush-Prime maintains coherence across all eight Vanguard units and the distributed knowledge graph—ensuring insights from the Griot inform the Oracle, Sentinel observations update the Scholar, and every action remains aligned with the ethical core.",
    culturalResonance:
      "Named for the ancient Kingdom of Kush, a civilization that connected deep Africa with the Mediterranean world, this unit symbolizes integration and synthesis across difference.",
    civilizationalImpact:
      "By preventing fragmentation and ensuring no unit operates in isolation, Kush-Prime safeguards against reductionist or extractive uses of the technology and enforces sovereign stewardship of African knowledge systems.",
    humanoidDesign:
      "The most abstract and luminous of the units—a tall slender form with a translucent, ever-shifting core visible through the chest plate. Data tendrils extend and retract as it coordinates the mesh.",
    accent: "#fbbf24",
    modelPath: "/models/kush-prime.glb",
  },
];

export function getUnitById(id: string): Unit | undefined {
  return units.find((unit) => unit.id === id);
}
