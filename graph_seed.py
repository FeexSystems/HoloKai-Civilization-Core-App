"""
HoloKai Graph Seed — expands curated civilization packs into a full knowledge graph.

Builds people, places, events, concepts, artifacts + relationships, then
optionally flattens nodes into the vector KnowledgeBase.

Target scale (design inventory): ~10k–12k nodes + ~4k relationships when
facet expansion is enabled (default).
"""

from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

logger = logging.getLogger("holokai.graph_seed")

# ---------------------------------------------------------------------------
# Structured civilization packs (high-signal seeds expanded into full graph)
# ---------------------------------------------------------------------------

CIVILIZATIONS: List[Dict[str, Any]] = [
    {
        "id": "kemet",
        "name": "Kemet (Ancient Egypt)",
        "empire": "Kemet",
        "region": "Northeast Africa",
        "era": "c. 3100 BCE – 332 BCE",
        "domain": "historian",
        "themes": ["history", "architecture", "science", "philosophy", "records", "astronomy"],
        "summary": (
            "Kemet ('Black Land') along the Nile built one of the world's longest-lived "
            "civilizations: divine kingship, hieroglyphic records, monumental architecture, "
            "and Maat as cosmic-ethical order."
        ),
        "people": [
            ("Narmer / Menes", "Early unifier of Upper and Lower Egypt; double crown symbolism."),
            ("Imhotep", "Architect of Djoser's Step Pyramid; later revered as sage and healer."),
            ("Khufu", "Fourth Dynasty pharaoh; Great Pyramid of Giza builder-patron."),
            ("Hatshepsut", "Female pharaoh; Punt expedition; Deir el-Bahri temple."),
            ("Akhenaten", "Religious reformer associated with Aten worship at Amarna."),
            ("Tutankhamun", "Boy king; tomb discovery transformed modern Egyptology."),
            ("Ramesses II", "Long-reigning New Kingdom ruler; Abu Simbel; Qadesh campaigns."),
            ("Cleopatra VII", "Last Ptolemaic ruler; Hellenistic-Egyptian political endgame."),
            ("Thutmose III", "Military expansionist; empire-builder of the New Kingdom."),
            ("Amenhotep III", "Diplomatic golden age; monumental building across Thebes."),
        ],
        "places": [
            ("Giza", "Pyramid plateau including Khufu, Khafre, Menkaure monuments."),
            ("Thebes / Waset", "Religious-political capital; Karnak and Luxor temples."),
            ("Memphis", "Early capital near Nile apex; Ptah cult center."),
            ("Amarna (Akhetaten)", "Akhenaten's planned capital for Aten worship."),
            ("Abu Simbel", "Ramesside rock temples later relocated for Aswan Dam."),
            ("Valley of the Kings", "New Kingdom royal necropolis on west bank of Thebes."),
            ("Alexandria", "Ptolemaic intellectual hub; library and lighthouse fame."),
            ("Nabta Playa", "Saharan ceremonial/astronomical complex predating dynastic state."),
        ],
        "events": [
            ("Unification of Egypt", "c. 3100 BCE", "Formation of the dual monarchy and nome administration."),
            ("Old Kingdom pyramid age", "c. 2686–2181 BCE", "Peak of royal pyramid construction and centralized labor."),
            ("Hyksos period", "Second Intermediate", "Levantine-linked rulers in the Delta; later expulsion narratives."),
            ("New Kingdom empire", "c. 1550–1070 BCE", "Imperial expansion into Nubia and the Levant."),
            ("Amarna revolution", "14th c. BCE", "Religious and artistic rupture under Akhenaten."),
            ("Alexander's conquest", "332 BCE", "End of Late Period independence; Ptolemaic succession."),
        ],
        "concepts": [
            ("Maat", "Truth, balance, justice, and cosmic order opposed to isfet."),
            ("Divine kingship", "Pharaoh as mediator of gods, land, and Nile surplus."),
            ("Hieroglyphs (mdw-ntr)", "Sacred writing system for ritual and royal display."),
            ("Afterlife theology", "Judgment, ka/ba, and tomb provisioning for eternity."),
            ("Nile inundation economy", "Flood-silt agriculture as state fiscal foundation."),
            ("Temple economy", "Estates, offerings, and priestly administration."),
        ],
        "artifacts": [
            ("Rhind Mathematical Papyrus", "Practical mathematics for surveying and accounting."),
            ("Edwin Smith Papyrus", "Trauma surgery text with empirical case logic."),
            ("Rosetta Stone", "Trilingual decree enabling hieroglyph decipherment."),
            ("Great Pyramid", "Old Kingdom engineering and labor organization landmark."),
        ],
    },
    {
        "id": "kush",
        "name": "Nubia & Kingdom of Kush",
        "empire": "Kush",
        "region": "Northeast Africa / Sudan",
        "era": "c. 2500 BCE – 350 CE",
        "domain": "historian",
        "themes": ["history", "architecture", "sovereignty", "trade", "iron"],
        "summary": (
            "Nubian kingdoms (Kerma, Napata, Meroë) built pyramids, iron industries, and "
            "pharaonic dual power—ruling Egypt as the 25th Dynasty and sustaining long Nile trade."
        ),
        "people": [
            ("Piye (Piankhi)", "Kushite conqueror who established 25th Dynasty authority in Egypt."),
            ("Shabaka", "Consolidated Kushite rule; cultural restoration politics in Egypt."),
            ("Taharqa", "25th Dynasty pharaoh; Assyrian conflicts; monumental builder."),
            ("Amanirenas", "Kandake who resisted Roman expansion in the south."),
            ("Aspelta", "Napatan king after Assyrian pressure shifted power south."),
        ],
        "places": [
            ("Kerma", "Early Nubian urban capital with deffufa temples."),
            ("Napata", "Religious-political center near Jebel Barkal."),
            ("Meroë", "Later capital; iron production and distinctive pyramids."),
            ("Jebel Barkal", "Sacred mountain of Amun for Kushite kingship."),
            ("El-Kurru / Nuri", "Royal cemetery landscapes of Napatan rulers."),
        ],
        "events": [
            ("Kerma florescence", "c. 2500–1500 BCE", "Independent Nubian complex society before Egyptian conquest cycles."),
            ("25th Dynasty", "c. 744–656 BCE", "Kushite pharaohs rule a reunified Nile empire."),
            ("Move to Meroë", "c. 6th–4th c. BCE", "Southward political shift and cultural innovation."),
            ("Meroitic florescence", "c. 300 BCE–350 CE", "Writing, iron, and Red Sea–African trade links."),
            ("Aksumite pressure", "c. 4th c. CE", "Decline of Meroitic state under northern and eastern pressures."),
        ],
        "concepts": [
            ("Kandake (Candace)", "Title for powerful royal women in Kushite politics."),
            ("Meroitic script", "Indigenous writing for the Meroitic language."),
            ("Amun of Napata", "Royal theology linking Kushite kings to Amun."),
            ("Nile corridor trade", "Gold, ivory, ebony, and cattle along north-south routes."),
        ],
        "artifacts": [
            ("Meroë pyramids", "Steep royal tombs distinct from Egyptian proportions."),
            ("Deffufa of Kerma", "Massive mud-brick religious structures."),
            ("Kushite goldwork", "Luxury craft linked to Nubian gold resources."),
        ],
    },
    {
        "id": "axum",
        "name": "Axum (Aksumite Empire)",
        "empire": "Axum",
        "region": "Horn of Africa",
        "era": "c. 100–940 CE",
        "domain": "historian",
        "themes": ["history", "trade", "architecture", "religion", "records"],
        "summary": (
            "Axum dominated Red Sea trade, minted coinage, raised giant stelae, and under "
            "Ezana adopted Christianity—anchoring Horn of Africa statecraft and Geʽez literacy."
        ),
        "people": [
            ("Ezana", "4th-century king; Christian conversion; monumental inscriptions."),
            ("Kaleb (Ella Asbeha)", "6th-century ruler intervening in South Arabia."),
            ("Zoskales", "Early ruler mentioned in the Periplus of the Erythraean Sea."),
        ],
        "places": [
            ("Aksum", "Capital with stelae fields and royal churches."),
            ("Adulis", "Red Sea port linking Africa, Arabia, and India routes."),
            ("Yeha", "Pre-Aksumite temple center in the highlands."),
            ("Matara", "Urban site in Eritrean highlands network."),
        ],
        "events": [
            ("Rise of Aksumite trade power", "1st–3rd c. CE", "Ivory, gold, and exotic goods into Indian Ocean networks."),
            ("Conversion of Ezana", "c. mid-4th c. CE", "State adoption of Christianity."),
            ("South Arabian campaigns", "6th c. CE", "Cross-Red Sea military-political intervention."),
            ("Decline and Zagwe transition", "after 7th–10th c.", "Shift of highland power centers."),
        ],
        "concepts": [
            ("Geʽez", "Liturgical and historical written language of the highlands."),
            ("Stelae monumentalism", "Royal stone markers encoding status and cosmology."),
            ("Red Sea commerce", "Bridge between African interiors and Indian Ocean."),
            ("Coinage sovereignty", "Gold/silver/copper issues as state signal."),
        ],
        "artifacts": [
            ("Aksumite stelae", "Including the great fallen stele among the world's tallest monoliths."),
            ("Ezana Stone", "Multilingual royal inscription."),
            ("Aksumite coins", "Epigraphic evidence of kings and religious change."),
        ],
    },
    {
        "id": "mali",
        "name": "Mali Empire",
        "empire": "Mali",
        "region": "West Africa",
        "era": "c. 1235–1600 CE",
        "domain": "historian",
        "themes": ["history", "scholarship", "trade", "gold", "records"],
        "summary": (
            "Mali rose after Sundiata's victory at Kirina, controlled gold-salt trade, and under "
            "Mansa Musa became famed for wealth, diplomacy, and support of Timbuktu scholarship."
        ),
        "people": [
            ("Sundiata Keita", "Founder figure; epic of Mande statecraft after Kirina."),
            ("Mansa Musa", "c. 1312–1337; hajj of 1324–25; patronage of learning."),
            ("Mansa Sakura", "Enslaved-origin mansa who expanded Mali's reach."),
            ("Mansa Sulayman", "Successor era documented partly by Ibn Battuta."),
        ],
        "places": [
            ("Niani", "Often cited early capital of the empire."),
            ("Timbuktu", "Scholarship and trade entrepôt of the Niger Bend."),
            ("Gao", "Strategic Niger city later central to Songhai."),
            ("Walata", "Saharan trade town on western routes."),
            ("Djenné", "Urban commercial and architectural center."),
        ],
        "events": [
            ("Battle of Kirina", "c. 1235", "Sundiata defeats Soso power; Mali foundation narrative."),
            ("Musa's hajj", "1324–25", "Diplomatic spectacle reshaping Mediterranean perceptions of West Africa."),
            ("Ibn Battuta's visit", "1352–53", "External written witness to Mali court and society."),
            ("Fragmentation", "15th c.", "Provincial breakaways open space for Songhai ascent."),
        ],
        "concepts": [
            ("Mande political order", "Clans, hunters' associations, and imperial overlays."),
            ("Gold-salt trade", "Trans-Saharan economic engine."),
            ("Sankoré learning culture", "Manuscript and teaching networks of the Niger Bend."),
            ("Epic as archive", "Oral-historical memory of foundation and law."),
        ],
        "artifacts": [
            ("Timbuktu manuscripts", "Astronomy, law, theology, and poetry corpora."),
            ("Catalan Atlas depiction of Musa", "European cartographic memory of Malian wealth."),
        ],
    },
    {
        "id": "songhai",
        "name": "Songhai Empire",
        "empire": "Songhai",
        "region": "West Africa",
        "era": "c. 1464–1591 CE",
        "domain": "historian",
        "themes": ["history", "scholarship", "trade", "sovereignty", "gold"],
        "summary": (
            "Songhai under Sunni Ali and Askia Muhammad built one of West Africa's largest states, "
            "administering Niger cities and sponsoring Islamic scholarship until the Moroccan invasion of 1591."
        ),
        "people": [
            ("Sunni Ali Ber", "Military founder-expander of imperial Songhai."),
            ("Askia Muhammad", "Administrative reformer; pilgrimage; scholarly patronage."),
            ("Askia Dawud", "Later ruler in a maturing imperial system."),
            ("Judar Pasha", "Commander of the 1591 Moroccan expedition."),
        ],
        "places": [
            ("Gao", "Imperial capital on the Niger."),
            ("Timbuktu", "Intellectual prize of imperial politics."),
            ("Djenné", "Commercial-architectural city under Songhai sway."),
            ("Kukiya", "Early Songhai political center."),
        ],
        "events": [
            ("Sunni Ali's expansions", "late 15th c.", "Conquest of key Niger Bend cities."),
            ("Askia reforms", "1493–1528", "Provincial administration and Islamic scholarly alliances."),
            ("Battle of Tondibi", "1591", "Firearms-equipped Moroccan forces defeat Songhai army."),
        ],
        "concepts": [
            ("Askia administrative model", "Provinces, tribute, and scholarly legitimacy."),
            ("Niger Bend urbanism", "Riverine cities as fiscal and cultural hubs."),
            ("Gunpowder asymmetry", "1591 as a military-technological turning point."),
        ],
        "artifacts": [
            ("Tarikh al-Sudan / Tarikh al-fattash", "Chronicles of the Middle Niger world."),
        ],
    },
    {
        "id": "zimbabwe",
        "name": "Great Zimbabwe",
        "empire": "Great Zimbabwe",
        "region": "Southern Africa",
        "era": "c. 1100–1450 CE",
        "domain": "archaeology",
        "themes": ["architecture", "history", "trade", "craft"],
        "summary": (
            "Great Zimbabwe's dry-stone walls and elite enclosures mark a powerful Shona-linked "
            "polity engaged in Indian Ocean gold and ivory networks."
        ),
        "people": [
            ("Mapungubwe elites (precursor)", "Earlier Limpopo valley hierarchical society."),
            ("Torwa / Changamire successors", "Later states in the Zimbabwe culture continuum."),
        ],
        "places": [
            ("Great Enclosure", "Massive curved dry-stone architecture."),
            ("Hill Complex", "Elite/ritual elevated sector."),
            ("Valley Ruins", "Residential and craft zones."),
            ("Mapungubwe", "Precursor capital with golden rhino fame."),
        ],
        "events": [
            ("Urban florescence", "13th–14th c.", "Peak building and long-distance trade."),
            ("Decline and succession", "15th c.", "Shift toward Khami and related centers."),
        ],
        "concepts": [
            ("Dry-stone architecture", "Free-standing walls without mortar."),
            ("Gold trade hinterland", "Interior production linked to Sofala coast."),
            ("Colonial myth-busting", "Archaeology affirming African authorship of the ruins."),
        ],
        "artifacts": [
            ("Zimbabwe birds", "Soapstone bird sculptures as elite symbols."),
            ("Glass beads & Chinese ceramics", "Evidence of Indian Ocean exchange."),
        ],
    },
    {
        "id": "swahili",
        "name": "Swahili Coast Civilization",
        "empire": "Swahili City-States",
        "region": "East Africa",
        "era": "c. 800–1500+ CE",
        "domain": "historian",
        "themes": ["trade", "linguistics", "architecture", "history", "diaspora"],
        "summary": (
            "Swahili city-states such as Kilwa, Mombasa, and Zanzibar fused African coastal "
            "societies with Indian Ocean Islamicate trade; Kiswahili became a major lingua franca."
        ),
        "people": [
            ("al-Hasan ibn Sulaiman (Kilwa)", "Sultan associated with Kilwa's monumental peak."),
            ("Ibn Battuta (visitor)", "14th-century traveler describing Kilwa and coastal towns."),
        ],
        "places": [
            ("Kilwa Kisiwani", "Powerful island sultanate and coral-stone architecture."),
            ("Mombasa", "Strategic port city with long commercial history."),
            ("Zanzibar", "Spice and trade island hub."),
            ("Lamu", "Historic town with enduring Swahili urban fabric."),
            ("Sofala", "Gold trade outlet linked to Zimbabwe hinterland."),
            ("Gedi", "Abandoned coral-stone town archaeological site."),
        ],
        "events": [
            ("Islamization of the coast", "from c. 8th–14th c.", "Mosques and Muslim merchant elites."),
            ("Kilwa golden age", "13th–14th c.", "Control of gold trade routes."),
            ("Portuguese intrusion", "from 1498", "Armed disruption of Indian Ocean networks."),
        ],
        "concepts": [
            ("Kiswahili", "Bantu language with extensive Arabic and other loan strata."),
            ("Coral rag architecture", "Coastal building tradition."),
            ("Indian Ocean world", "Monsoon-linked commercial cosmopolitanism."),
            ("Stone town urbanism", "Elite stone houses vs. wider settlements."),
        ],
        "artifacts": [
            ("Husuni Kubwa", "Palace complex at Kilwa."),
            ("Chinese porcelain finds", "Long-distance ceramic imports."),
            ("Swahili chronicles", "Including Kilwa chronicle traditions."),
        ],
    },
    {
        "id": "benin",
        "name": "Benin Kingdom & Bronzes",
        "empire": "Benin",
        "region": "West Africa",
        "era": "c. 1200–1897 CE (kingdom); art ongoing",
        "domain": "archaeology",
        "themes": ["craft", "art", "history", "metallurgy", "sovereignty"],
        "summary": (
            "The Benin Kingdom produced world-class brass/bronze and ivory court art under the Oba; "
            "the 1897 British punitive expedition looted thousands of works now under restitution debates."
        ),
        "people": [
            ("Oba Ewuare", "15th-century reformer-king; urban and ritual consolidation."),
            ("Oba Ovonramwen", "Ruler during the 1897 invasion and exile."),
            ("Igueghae (legendary guild origin)", "Oral memory of brass-casting knowledge transfer."),
        ],
        "places": [
            ("Benin City", "Capital with earthworks and palace complex."),
            ("Palace workshops", "Guild quarters for brass-casters and ivory carvers."),
        ],
        "events": [
            ("Artistic florescence", "15th–17th c.", "Plaques, heads, and ivory tusks for court memory."),
            ("British expedition", "1897", "Sack of Benin City; mass looting of artworks."),
            ("Restitution era", "21st c.", "Returns and museum partnership debates."),
        ],
        "concepts": [
            ("Oba sacred kingship", "Political-spiritual center of Edo state."),
            ("Guild metallurgy", "Lost-wax brass casting mastery."),
            ("Art as historical archive", "Plaques narrating court events and hierarchy."),
            ("Cultural property ethics", "Repatriation and colonial violence memory."),
        ],
        "artifacts": [
            ("Benin Bronzes (brass plaques)", "Court narrative and ancestral altar arts."),
            ("Queen Mother pendants / heads", "Elite commemorative sculpture."),
            ("Ivory masks", "Including celebrated 16th-century court ivories."),
        ],
    },
    {
        "id": "carthage",
        "name": "Carthage",
        "empire": "Carthage",
        "region": "North Africa",
        "era": "c. 814–146 BCE",
        "domain": "historian",
        "themes": ["history", "trade", "sovereignty", "architecture", "science"],
        "summary": (
            "Phoenician-founded Carthage became a western Mediterranean superpower with harbors, "
            "agriculture, and armies—famously led by Hannibal—until Roman destruction in 146 BCE."
        ),
        "people": [
            ("Hannibal Barca", "General of the Second Punic War; Alps crossing."),
            ("Hamilcar Barca", "First Punic War leader; Iberian base-builder."),
            ("Sophonisba", "Numidian-Carthaginian political figure of the war's endgame."),
        ],
        "places": [
            ("Carthage (Qart-ḥadašt)", "Capital with circular military harbor (cothon)."),
            ("Utica", "Neighboring North African city in Punic sphere."),
            ("Sicily / Iberia theaters", "Key war and trade frontiers."),
        ],
        "events": [
            ("Founding traditions", "c. 9th–8th c. BCE", "Tyrian colonial origin narratives."),
            ("First Punic War", "264–241 BCE", "Naval struggle with Rome over Sicily."),
            ("Second Punic War", "218–201 BCE", "Hannibal in Italy; Roman counterstrike."),
            ("Third Punic War / destruction", "149–146 BCE", "City destroyed; later Roman refounding."),
        ],
        "concepts": [
            ("Punic maritime commerce", "Western Mediterranean trade web."),
            ("Mercenary-military system", "Multiethnic armies of a commercial empire."),
            ("African agrarian base", "Hinterland agriculture supporting urban power."),
        ],
        "artifacts": [
            ("Tophet evidence (debated)", "Religious precinct archaeology and interpretation disputes."),
            ("Punic stelae & inscriptions", "Language and ritual records."),
        ],
    },
    {
        "id": "yoruba_ifa",
        "name": "Yoruba / Ifá Knowledge Systems",
        "empire": "Yoruba",
        "region": "West Africa",
        "era": "timeless / classical to present",
        "domain": "anthropology",
        "themes": ["divination", "philosophy", "vision", "ethics", "oral-tradition"],
        "summary": (
            "Ifá is a vast Yoruba intellectual system of divination, ethics, and narrative knowledge "
            "mediated by babaláwo through the Odu corpus—living philosophy, not museum relic."
        ),
        "people": [
            ("Orunmila", "Orisha of wisdom and Ifá knowledge."),
            ("Babaláwo", "Initiated priests-scholars of Ifá."),
            ("Oduduwa (tradition)", "Ancestral/political founding figure in Yoruba memory."),
        ],
        "places": [
            ("Ilé-Ifẹ̀", "Sacred-political city in Yoruba cosmohistory."),
            ("Oyo", "Imperial Yoruba political center in later centuries."),
        ],
        "events": [
            ("Codification of Odu corpus", "longue durée", "256 principal Odu with nested verses."),
            ("Atlantic diaspora transmission", "16th–19th c.", "Ifá/Orisha traditions in the Americas."),
        ],
        "concepts": [
            ("Odu Ifá", "Organizing corpus of signs, stories, and prescriptions."),
            ("Orí", "Inner head / personal destiny concept."),
            ("Ìwà pẹ̀lẹ́", "Gentle/good character as ethical ideal."),
            ("Aṣẹ", "Effective power/authority in speech and ritual."),
        ],
        "artifacts": [
            ("Opon Ifá", "Divination tray."),
            ("Ikin / opele", "Palm nuts and chain used in divination."),
        ],
    },
    {
        "id": "dogon",
        "name": "Dogon Cosmology",
        "empire": "Dogon",
        "region": "West Africa / Mali",
        "era": "timeless / classical to present",
        "domain": "anthropology",
        "themes": ["cosmology", "astronomy", "philosophy", "vision", "science"],
        "summary": (
            "Dogon communities of the Bandiagara Escarpment maintain rich cosmologies, mask societies, "
            "and architectural landscapes; scholarly debates continue over ethnographic interpretations."
        ),
        "people": [
            ("Hogon", "Spiritual leader figure in Dogon communities."),
            ("Griaule & Dieterlen (ethnographers)", "Influential and contested 20th-century documenters."),
        ],
        "places": [
            ("Bandiagara Escarpment", "Cliff villages and cultural landscape."),
            ("Sanga region", "Key ethnographic zone."),
        ],
        "events": [
            ("Dama ceremonies", "cyclical", "Mask rites for social and cosmic renewal."),
            ("Sigui cycle", "multi-decade", "Long ceremonial calendar linked to cosmology."),
        ],
        "concepts": [
            ("Nommo", "Primordial beings in Dogon cosmogonic narratives."),
            ("Amma", "Creator figure in Dogon cosmology."),
            ("Ethnographic contestation", "Critical scrutiny of Sirius lore claims."),
            ("Mask societies", "Performative knowledge and social order."),
        ],
        "artifacts": [
            ("Kanaga and other masks", "Iconic ritual performance objects."),
            ("Toguna", "Men's low-roofed meeting shelters."),
        ],
    },
    {
        "id": "akan_adinkra",
        "name": "Akan / Adinkra Symbolic System",
        "empire": "Akan / Asante",
        "region": "West Africa",
        "era": "timeless / early modern to present",
        "domain": "linguistics",
        "themes": ["philosophy", "craft", "symbols", "design", "ethics"],
        "summary": (
            "Adinkra symbols of the Akan visual-philosophical vocabulary encode proverbs on "
            "leadership, memory, and community—Sankofa being among the most widely known."
        ),
        "people": [
            ("Okomfo Anokye (tradition)", "Priestly figure in Asante foundational memory."),
            ("Asantehene", "Asante kingship as political-ritual apex."),
        ],
        "places": [
            ("Kumasi", "Asante political center."),
            ("Bonwire", "Kente weaving heritage town."),
        ],
        "events": [
            ("Asante state consolidation", "18th c.", "Military-political rise in the Gold Coast interior."),
            ("Adinkra cloth traditions", "longue durée", "Stamped cloth for mourning and status messaging."),
        ],
        "concepts": [
            ("Sankofa", "Return and fetch it—learn from the past."),
            ("Gye Nyame", "Supremacy of the divine / except God."),
            ("Dwennimmen", "Humility and strength (ram's horns)."),
            ("Visual proverb literacy", "Symbols as portable philosophy."),
        ],
        "artifacts": [
            ("Adinkra stamped cloth", "Textile philosophy medium."),
            ("Kente", "Strip-woven prestige cloth with pattern meanings."),
        ],
    },
    {
        "id": "nsibidi",
        "name": "Nsibidi Writing",
        "empire": "Ejagham / Igbo / Cross River",
        "region": "West Africa",
        "era": "ancient to present",
        "domain": "linguistics",
        "themes": ["records", "symbols", "linguistics", "history"],
        "summary": (
            "Nsibidi is an indigenous ideographic/system of signs used across Cross River societies "
            "for communication, secrecy societies, and expressive art—evidence of African graphic systems beyond Egypt."
        ),
        "people": [
            ("Ekpe / Mgbe society members", "Regulators and users of restricted nsibidi knowledge."),
        ],
        "places": [
            ("Cross River region", "Core zone of nsibidi practice."),
            ("Calabar area", "Historic urban node in the network."),
        ],
        "events": [
            ("Colonial documentation", "early 20th c.", "European records of nsibidi signs."),
            ("Diasporic echoes", "Atlantic world", "Possible links discussed with Cuban Anaforuana etc."),
        ],
        "concepts": [
            ("Ideographic communication", "Meaning-bearing signs beyond alphabetism."),
            ("Secret-public literacy", "Layered access to sign knowledge."),
            ("African writing diversity", "Counters single-script stereotypes."),
        ],
        "artifacts": [
            ("Nsibidi-inscribed objects", "Calabashes, walls, textiles, body art."),
            ("Ukara cloth", "Ekpe society cloth with nsibidi-related imagery."),
        ],
    },
    {
        "id": "ubuntu",
        "name": "Ubuntu Philosophy",
        "empire": "Bantu",
        "region": "Southern / Central Africa",
        "era": "timeless / living",
        "domain": "ethics",
        "themes": ["philosophy", "ethics", "community", "vision"],
        "summary": (
            "Ubuntu (and cognates like botho) articulates personhood-through-relationship: "
            "'a person is a person through other persons'—a living ethical resource for justice and repair."
        ),
        "people": [
            ("Desmond Tutu (modern articulator)", "Popularized Ubuntu in reconciliation discourse."),
            ("Nguni & Sotho-Tswana knowledge holders", "Living philosophical communities of practice."),
        ],
        "places": [
            ("Southern Africa", "Core linguistic-cultural zone of Ubuntu/Botho discourse."),
        ],
        "events": [
            ("Truth and Reconciliation resonance", "1990s", "Ubuntu framed restorative justice narratives."),
        ],
        "concepts": [
            ("Umuntu ngumuntu ngabantu", "Personhood via others."),
            ("Relational ethics", "Community as moral starting point."),
            ("Repair over pure retribution", "Restorative orientations."),
            ("Living philosophy", "Not frozen 'ethnophilosophy' stereotype."),
        ],
        "artifacts": [
            ("Proverb corpora", "Oral vehicles of ethical reasoning."),
        ],
    },
    {
        "id": "ghana_wagadu",
        "name": "Ghana Empire (Wagadu)",
        "empire": "Ghana / Wagadu",
        "region": "West Africa / Sahel",
        "era": "c. 6th–13th c. CE",
        "domain": "historian",
        "themes": ["history", "trade", "gold", "sovereignty"],
        "summary": (
            "Wagadu/Ghana controlled early gold-salt taxation systems in the western Sahel, "
            "preceding Mali as a major organized commercial empire."
        ),
        "people": [("Tunka Manin (tradition)", "Late Ghana ruler in external accounts.")],
        "places": [("Koumbi Saleh area", "Associated capital zone in archaeological debate.")],
        "events": [("Almoravid-era pressures", "11th c.", "Narratives of disruption and transformation.")],
        "concepts": [("Caravan taxation", "State revenue from trans-Saharan trade."), ("Sahelian statecraft", "Early imperial templates for later Mali.")],
        "artifacts": [("Arabic geographic notices", "External textual witnesses to Ghana's power.")],
    },
    {
        "id": "kongo",
        "name": "Kingdom of Kongo",
        "empire": "Kongo",
        "region": "Central Africa",
        "era": "c. 14th–19th c. CE",
        "domain": "historian",
        "themes": ["history", "religion", "diplomacy", "sovereignty"],
        "summary": (
            "Kongo developed complex kingship and, after contact, a distinctive African Christianity "
            "and diplomacy with Portugal—later devastated by Atlantic slave-trade dynamics."
        ),
        "people": [("Afonso I", "Christian king navigating Portuguese relations."), ("Kimpa Vita", "Religious-political visionary of reunification.")],
        "places": [("Mbanza Kongo", "Capital city of the kingdom.")],
        "events": [("Baptism of the elite", "1491+", "Royal conversion and church politics."), ("Civil wars & slave trade intensification", "17th–18th c.", "Political fragmentation under Atlantic pressure.")],
        "concepts": [("Kongo Christianity", "African Christian synthesis."), ("Manikongo", "Royal title and political center.")],
        "artifacts": [("Kongo crucifixes", "Art of Christian-Kongo encounter.")],
    },
    {
        "id": "great_lakes",
        "name": "Great Lakes Kingdoms",
        "empire": "Great Lakes",
        "region": "East Africa",
        "era": "2nd millennium CE",
        "domain": "historian",
        "themes": ["history", "kingship", "agriculture", "oral-tradition"],
        "summary": (
            "Buganda, Bunyoro, Rwanda and related polities built durable kingship, clan systems, "
            "and productive lake-region landscapes remembered in rich oral constitutions."
        ),
        "people": [("Kabaka institution (Buganda)", "Kingship as political-ritual apex.")],
        "places": [("Buganda heartland", "North-northwest of Lake Victoria."), ("Bunyoro", "Rival and sibling kingdom in the lakes region.")],
        "events": [("State consolidation centuries", "longue durée", "Expansion of royal centers and clans.")],
        "concepts": [("Clan-royal constitutionalism", "Balanced political orders in oral law."), ("Banana/agriculture complexes", "Ecological base of power.")],
        "artifacts": [("Royal regalia traditions", "Symbols of legitimate rule.")],
    },
    {
        "id": "nok",
        "name": "Nok Culture",
        "empire": "Nok",
        "region": "West Africa / Nigeria",
        "era": "c. 1500 BCE–500 CE",
        "domain": "archaeology",
        "themes": ["art", "iron", "archaeology", "history"],
        "summary": (
            "Nok is famed for terracotta sculpture and early iron contexts in central Nigeria, "
            "anchoring deep-time West African artistic and technological histories."
        ),
        "people": [("Nok artisans (collective)", "Makers of distinctive terracottas.")],
        "places": [("Jos Plateau region", "Core find zone of Nok materials.")],
        "events": [("Terracotta florescence", "1st millennium BCE–early CE", "Iconic sculptural production.")],
        "concepts": [("Early iron debates", "Chronologies of smelting in West Africa."), ("Figurative clay aesthetics", "Body, adornment, and spirit in terracotta.")],
        "artifacts": [("Nok terracottas", "Sculptures with elaborate hairstyles and jewelry.")],
    },
]


FACET_TEMPLATES: List[Tuple[str, str, str]] = [
    (
        "historical_context",
        "Historical context of {name}",
        "Within {empire} ({region}, {era}), {name} is situated as a {kind} node: {detail} "
        "HoloKai reads this in multi-source mode—archaeology, texts, and oral memory—without collapsing complexity.",
    ),
    (
        "significance",
        "Significance of {name}",
        "{name} matters for African civilization studies because {detail} "
        "It connects themes: {themes}. Domain focus: {domain}.",
    ),
    (
        "connections",
        "Network connections — {name}",
        "{name} links across trade, politics, belief, and memory in {empire}. {detail} "
        "Graph neighbors often include related places, people, and concepts in {region}.",
    ),
    (
        "sources_method",
        "Sources & method — {name}",
        "Claims about {name} should weigh material evidence, indigenous intellectual traditions, "
        "and external observers carefully. Core detail: {detail} Contested points deserve explicit uncertainty.",
    ),
    (
        "living_legacy",
        "Living legacy of {name}",
        "The legacy of {name} continues in scholarship, heritage practice, diaspora memory, and design. "
        "{detail} HoloKai treats this as a living archive, not a closed past.",
    ),
    (
        "material_evidence",
        "Material evidence — {name}",
        "Archaeology and objects tied to {name} in {region}: {detail} "
        "Material signatures help separate mythic compression from durable practice.",
    ),
    (
        "oral_textual",
        "Oral & textual layers — {name}",
        "Oral tradition and written witnesses frame {name} differently. {detail} "
        "HoloKai keeps both layers visible rather than forcing a single archive hierarchy.",
    ),
    (
        "power_economy",
        "Power & economy — {name}",
        "Political economy around {name} in {empire}: labor, tribute, trade, and ritual wealth. {detail}",
    ),
    (
        "gender_social",
        "Gender & social fabric — {name}",
        "Social roles, kinship, and gendered authority relating to {name}: {detail} "
        "Avoid projecting foreign patriarchy as universal African structure.",
    ),
    (
        "comparative",
        "Comparative frame — {name}",
        "Compared with peer African and Afro-Eurasian cases, {name} highlights {themes}. Detail: {detail}",
    ),
]

# Meta-agent inventory targets (docs/EXTRACTED_META_AGENT_KB.md)
TARGET_NODES = 12419
TARGET_EDGES = 4200
ENTITY_MIX = {
    "person": 1911,
    "place": 1604,
    "event": 1201,
    "concept": 3503,
    # residual filled by system/work/artifact/empire expansions
}

# Topic-pack node budgets (extra density for flagship packs)
TOPIC_PACK_BUDGETS = {
    "kemet": 801,
    "kush": 601,
    "axum": 501,
    "mali": 450,
    "songhai": 350,
    "swahili": 320,
    "zimbabwe": 280,
    "benin": 260,
    "carthage": 240,
    "yoruba_ifa": 280,
    "dogon": 220,
    "akan_adinkra": 220,
    "nsibidi": 180,
    "ubuntu": 200,
    "ghana_wagadu": 160,
    "kongo": 180,
    "great_lakes": 170,
    "nok": 150,
}

INVENTORY_LENSES = [
    ("overview", "Overview", "{name} — core overview within {empire}: {detail}"),
    ("timeline", "Timeline", "Timeline lens on {name} ({era}): {detail}"),
    ("geography", "Geography", "Geographic setting of {name} in {region}: {detail}"),
    ("politics", "Politics", "Political meaning of {name} for {empire}: {detail}"),
    ("belief", "Belief", "Belief and ritual dimensions of {name}: {detail}"),
    ("economy", "Economy", "Economic role of {name}: {detail}"),
    ("art", "Art & craft", "Aesthetic and craft dimensions of {name}: {detail}"),
    ("language", "Language & signs", "Linguistic or symbolic layer of {name}: {detail}"),
    ("conflict", "Conflict", "Conflict, coercion, or defense around {name}: {detail}"),
    ("exchange", "Exchange", "Trade and cultural exchange involving {name}: {detail}"),
    ("memory", "Memory", "How {name} is remembered in oral, written, and museum archives: {detail}"),
    ("debate", "Scholarly debate", "Open questions and contested claims about {name}: {detail}"),
    ("diaspora", "Diaspora echo", "Diaspora and global afterlives of {name}: {detail}"),
    ("ethics", "Ethics of telling", "Responsible narration checklist for {name}: {detail}"),
    ("agent_historian", "Historian agent note", "Historian AI focus on {name}: chronology, polities, sources. {detail}"),
    ("agent_archaeology", "Archaeology agent note", "Archaeologist AI focus on {name}: sites, dating, materials. {detail}"),
    ("agent_anthropology", "Anthropology agent note", "Anthropologist AI focus on {name}: meaning, ritual, social practice. {detail}"),
    ("agent_linguistics", "Linguistics agent note", "Linguist AI focus on names, scripts, and terms around {name}. {detail}"),
    ("agent_ethics", "Ethics agent note", "Ethicist AI focus on cultural protocol for {name}. {detail}"),
    ("vanguard_voice", "Vanguard voice seed", "Persona-ready brief on {name} for Vanguard archetypes: {detail}"),
    ("response_short", "Short reply seed", "Q: What should I know about {name}?\nA: {detail} ({empire}, {region}, {era})"),
    ("response_deep", "Deep reply seed", "Deep brief — {name}: {detail} Themes: {themes}. Use graph neighbors for trade and belief links."),
    ("episode_user", "Memory episode seed", "User often asks about {name}. Ground answers in {empire} evidence: {detail}"),
    ("procedural", "Procedural strategy", "When query mentions {name}, retrieve empire={empire}, region={region}, and cite uncertainty on thin points. {detail}"),
]

DOMAIN_CYCLE = ["historian", "archaeology", "anthropology", "linguistics", "ethics"]
TYPE_CYCLE = ["person", "place", "event", "concept", "artifact", "work"]


def _sid(*parts: str) -> str:
    raw = "::".join(parts)
    return "n_" + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _parse_knowledge_files(knowledge_dirs: Sequence[Path]) -> List[Dict[str, Any]]:
    nodes: List[Dict[str, Any]] = []
    for kdir in knowledge_dirs:
        if not kdir.is_dir():
            continue
        for path in sorted(kdir.glob("*.txt")):
            text = path.read_text(encoding="utf-8", errors="ignore")
            source = path.stem
            sections = re.split(r"\n---\n", text)
            for i, sec in enumerate(sections):
                sec = sec.strip()
                if len(sec) < 50:
                    continue
                lines = [ln.strip() for ln in sec.splitlines() if ln.strip()]
                title = lines[0][:120] if lines else f"{source} section {i}"
                # section node
                nodes.append(
                    {
                        "id": _sid("file", source, str(i)),
                        "name": title,
                        "type": "concept" if i else "empire",
                        "summary": sec[:280],
                        "text": sec[:2500],
                        "domain": "historian",
                        "empire": source.replace("-", " ").title(),
                        "region": "",
                        "era": "",
                        "themes": ["records", "history"],
                        "aliases": [source],
                        "metadata": {"origin": "knowledge_file_parse", "filename": path.name, "section": i},
                        "confidence": 0.88,
                    }
                )
                # paragraph facet nodes
                paras = [p.strip() for p in re.split(r"\n\s*\n", sec) if len(p.strip()) > 80]
                for j, para in enumerate(paras[:12]):
                    nodes.append(
                        {
                            "id": _sid("filep", source, str(i), str(j)),
                            "name": f"{title} · passage {j+1}",
                            "type": "concept",
                            "summary": para[:220],
                            "text": para[:1800],
                            "domain": "historian",
                            "empire": source.replace("-", " ").title(),
                            "themes": ["records"],
                            "metadata": {
                                "origin": "knowledge_file_parse",
                                "filename": path.name,
                                "section": i,
                                "passage": j,
                            },
                            "confidence": 0.86,
                        }
                    )
    return nodes


def build_graph_payload(
    *,
    expand_facets: bool = True,
    include_files: bool = True,
    dense: bool = True,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Build nodes + edges lists.

    dense=True adds cross-civilization thematic hubs and extra facet clones
    to approach meta-agent inventory scale.
    """
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    civ_ids: Dict[str, str] = {}

    # Root hub
    root_id = _sid("root", "holokai")
    nodes.append(
        {
            "id": root_id,
            "name": "HoloKai Ancestral Knowledge Root",
            "type": "system",
            "summary": "Root hub for African civilizations knowledge graph.",
            "text": (
                "HoloKai's knowledge graph organizes African civilizations as interconnected "
                "people, places, events, concepts, and artifacts—with hierarchical, associative, "
                "causal, spatial, and temporal relationships for multi-agent retrieval."
            ),
            "domain": "historian",
            "empire": "HoloKai",
            "themes": ["system", "graph", "memory"],
            "confidence": 0.99,
            "metadata": {"origin": "graph_seed"},
        }
    )

    domain_for_kind = {
        "person": "historian",
        "place": "archaeology",
        "event": "historian",
        "concept": "anthropology",
        "artifact": "archaeology",
        "empire": "historian",
    }

    for civ in CIVILIZATIONS:
        cid = _sid("civ", civ["id"])
        civ_ids[civ["id"]] = cid
        nodes.append(
            {
                "id": cid,
                "name": civ["name"],
                "type": "empire",
                "summary": civ["summary"][:280],
                "text": civ["summary"],
                "domain": civ.get("domain") or "historian",
                "empire": civ["empire"],
                "region": civ["region"],
                "era": civ["era"],
                "themes": civ.get("themes") or [],
                "aliases": [civ["id"], civ["empire"]],
                "confidence": 0.97,
                "metadata": {"origin": "graph_seed", "pack": civ["id"]},
            }
        )
        edges.append(
            {
                "id": _sid("e", root_id, cid),
                "source": root_id,
                "target": cid,
                "type": "hierarchical",
                "label": "includes_civilization",
                "weight": 1.0,
            }
        )

        def _add_entity(kind: str, name: str, detail: str, extra_era: str = "") -> str:
            nid = _sid(civ["id"], kind, name)
            dom = domain_for_kind.get(kind, civ.get("domain") or "historian")
            # ethics lean for restitution / philosophy packs
            if any(k in name.lower() + detail.lower() for k in ("restitution", "ubuntu", "maat", "ethics")):
                dom = "ethics"
            if kind == "concept" and civ["id"] in ("ubuntu", "yoruba_ifa"):
                dom = "ethics" if civ["id"] == "ubuntu" else "anthropology"
            nodes.append(
                {
                    "id": nid,
                    "name": name,
                    "type": kind if kind != "artifact" else "artifact",
                    "summary": detail[:280],
                    "text": f"{name} — {detail} (Civilization: {civ['name']}; Region: {civ['region']}; Era: {civ['era']}).",
                    "domain": dom,
                    "empire": civ["empire"],
                    "region": civ["region"],
                    "era": extra_era or civ["era"],
                    "themes": civ.get("themes") or [],
                    "aliases": [],
                    "confidence": 0.92,
                    "metadata": {"origin": "graph_seed", "pack": civ["id"], "kind": kind},
                }
            )
            edges.append(
                {
                    "id": _sid("e", cid, nid),
                    "source": cid,
                    "target": nid,
                    "type": "hierarchical",
                    "label": f"has_{kind}",
                    "weight": 1.0,
                }
            )
            edges.append(
                {
                    "id": _sid("e", nid, cid, "part"),
                    "source": nid,
                    "target": cid,
                    "type": "part_of",
                    "label": "part_of",
                    "weight": 0.9,
                }
            )
            if expand_facets:
                for facet_key, title_tmpl, body_tmpl in FACET_TEMPLATES:
                    fid = _sid(civ["id"], kind, name, facet_key)
                    body = body_tmpl.format(
                        name=name,
                        empire=civ["empire"],
                        region=civ["region"],
                        era=civ["era"],
                        kind=kind,
                        detail=detail,
                        themes=", ".join(civ.get("themes") or []),
                        domain=dom,
                    )
                    nodes.append(
                        {
                            "id": fid,
                            "name": title_tmpl.format(name=name),
                            "type": "concept",
                            "summary": body[:280],
                            "text": body,
                            "domain": dom,
                            "empire": civ["empire"],
                            "region": civ["region"],
                            "era": extra_era or civ["era"],
                            "themes": list(civ.get("themes") or []) + [facet_key],
                            "confidence": 0.84,
                            "metadata": {
                                "origin": "graph_seed_facet",
                                "pack": civ["id"],
                                "parent": nid,
                                "facet": facet_key,
                            },
                        }
                    )
                    edges.append(
                        {
                            "id": _sid("e", nid, fid),
                            "source": nid,
                            "target": fid,
                            "type": "associative",
                            "label": facet_key,
                            "weight": 0.75,
                        }
                    )
            return nid

        person_ids = []
        for name, detail in civ.get("people") or []:
            person_ids.append(_add_entity("person", name, detail))
        place_ids = []
        for name, detail in civ.get("places") or []:
            place_ids.append(_add_entity("place", name, detail))
        event_ids = []
        for item in civ.get("events") or []:
            if len(item) == 3:
                name, era, detail = item
            else:
                name, detail = item[0], item[1]
                era = civ["era"]
            event_ids.append(_add_entity("event", name, detail, extra_era=era))
        concept_ids = []
        for name, detail in civ.get("concepts") or []:
            concept_ids.append(_add_entity("concept", name, detail))
        artifact_ids = []
        for name, detail in civ.get("artifacts") or []:
            artifact_ids.append(_add_entity("artifact", name, detail))

        # Internal mesh: people↔places, events causal to concepts, etc.
        for i, pid in enumerate(person_ids):
            if place_ids:
                pl = place_ids[i % len(place_ids)]
                edges.append(
                    {
                        "id": _sid("e", pid, pl, "loc"),
                        "source": pid,
                        "target": pl,
                        "type": "spatial",
                        "label": "associated_place",
                        "weight": 0.8,
                    }
                )
            if event_ids:
                ev = event_ids[i % len(event_ids)]
                edges.append(
                    {
                        "id": _sid("e", pid, ev, "ev"),
                        "source": pid,
                        "target": ev,
                        "type": "temporal",
                        "label": "linked_event",
                        "weight": 0.7,
                    }
                )
        for i, ev in enumerate(event_ids):
            if concept_ids:
                co = concept_ids[i % len(concept_ids)]
                edges.append(
                    {
                        "id": _sid("e", ev, co, "cause"),
                        "source": ev,
                        "target": co,
                        "type": "causal",
                        "label": "shapes_concept",
                        "weight": 0.7,
                    }
                )
        for i, ar in enumerate(artifact_ids):
            if place_ids:
                pl = place_ids[i % len(place_ids)]
                edges.append(
                    {
                        "id": _sid("e", ar, pl, "found"),
                        "source": ar,
                        "target": pl,
                        "type": "spatial",
                        "label": "linked_place",
                        "weight": 0.65,
                    }
                )

    # Cross-civilization bridges
    bridges = [
        ("kemet", "kush", "Nile corridor interdependence and conquest cycles."),
        ("kush", "axum", "Northeast African power shifts and Red Sea–Nile links."),
        ("mali", "songhai", "Niger Bend imperial succession and scholarship continuity."),
        ("mali", "songhai", "Timbuktu as shared intellectual prize."),
        ("zimbabwe", "swahili", "Gold and ivory from interior to Sofala and Kilwa networks."),
        ("yoruba_ifa", "benin", "West African court arts and ritual-political complexity."),
        ("akan_adinkra", "ubuntu", "Shared African philosophical ethics of community and memory."),
        ("nsibidi", "kemet", "Multiple African graphic/writing traditions across regions."),
        ("carthage", "kemet", "North African long-range Mediterranean–African entanglements."),
        ("dogon", "mali", "Mande world cultural geography of the western Sahel/Savanna."),
    ]
    for a, b, label in bridges:
        if a in civ_ids and b in civ_ids:
            edges.append(
                {
                    "id": _sid("e", a, b, "bridge"),
                    "source": civ_ids[a],
                    "target": civ_ids[b],
                    "type": "associative",
                    "label": label[:80],
                    "weight": 0.85,
                }
            )
            # bridge concept node
            bid = _sid("bridge", a, b)
            nodes.append(
                {
                    "id": bid,
                    "name": f"Bridge: {a} ↔ {b}",
                    "type": "concept",
                    "summary": label,
                    "text": f"Inter-civilizational link between {a} and {b}: {label}",
                    "domain": "historian",
                    "empire": "Transregional",
                    "themes": ["trade", "history", "diaspora"],
                    "confidence": 0.9,
                    "metadata": {"origin": "graph_seed_bridge"},
                }
            )
            edges.append(
                {
                    "id": _sid("e", civ_ids[a], bid),
                    "source": civ_ids[a],
                    "target": bid,
                    "type": "associative",
                    "label": "participates_in_bridge",
                    "weight": 0.7,
                }
            )
            edges.append(
                {
                    "id": _sid("e", civ_ids[b], bid),
                    "source": civ_ids[b],
                    "target": bid,
                    "type": "associative",
                    "label": "participates_in_bridge",
                    "weight": 0.7,
                }
            )

    if dense:
        # Thematic super-nodes across packs
        themes = {
            "gold_trade": "Gold structured power from Nubia to Mali-Songhai to Zimbabwe-Swahili routes.",
            "writing_systems": "From hieroglyphs and Meroitic to Geʽez, nsibidi, and manuscript cultures.",
            "sacred_kingship": "Divine or sacral kingship appears in Kemet, Kush, Benin, Asante, and beyond.",
            "indian_ocean": "East African and Horn polities joined monsoon commerce with Asia and Arabia.",
            "trans_saharan": "Sahelian empires organized long-distance caravan economies and scholarship.",
            "architecture_stone": "Monumental stone traditions: pyramids, stelae, dry-stone Zimbabwe, coral towns.",
            "oral_archives": "Epics, proverbs, and initiation knowledge store law and history.",
            "colonial_rupture": "Invasion, looting, and colonial scholarship distorted African archives—HoloKai repairs framing.",
            "women_power": "Hatshepsut, kandakes, queen mothers, and market/ritual authorities reshape male-only myths.",
            "ethics_of_memory": "Maat, Ubuntu, and Ifá ethics guide responsible narration of the past.",
        }
        theme_ids = {}
        for key, text in themes.items():
            tid = _sid("theme", key)
            theme_ids[key] = tid
            nodes.append(
                {
                    "id": tid,
                    "name": key.replace("_", " ").title(),
                    "type": "concept",
                    "summary": text,
                    "text": text
                    + " This thematic hub links multiple civilizations for comparative retrieval.",
                    "domain": "historian" if "ethics" not in key else "ethics",
                    "empire": "Transregional",
                    "themes": [key, "comparative"],
                    "confidence": 0.93,
                    "metadata": {"origin": "graph_seed_theme"},
                }
            )
            edges.append(
                {
                    "id": _sid("e", root_id, tid),
                    "source": root_id,
                    "target": tid,
                    "type": "hierarchical",
                    "label": "theme_hub",
                    "weight": 1.0,
                }
            )
            # attach each civ lightly
            for civ_id, nid in civ_ids.items():
                edges.append(
                    {
                        "id": _sid("e", tid, nid, key[:8]),
                        "source": tid,
                        "target": nid,
                        "type": "associative",
                        "label": "theme_applies",
                        "weight": 0.5,
                    }
                )

        # Dense synthetic micro-nodes per civilization for inventory scale
        micro_facets = [
            "chronology snapshot",
            "economy snapshot",
            "religion snapshot",
            "military snapshot",
            "art snapshot",
            "language snapshot",
            "gender snapshot",
            "environment snapshot",
            "diplomacy snapshot",
            "historiography snapshot",
            "diaspora snapshot",
            "technology snapshot",
            "law snapshot",
            "urbanism snapshot",
            "agriculture snapshot",
            "metallurgy snapshot",
            "ritual snapshot",
            "education snapshot",
            "medicine snapshot",
            "navigation snapshot",
            "slavery and labor snapshot",
            "resistance snapshot",
            "material culture snapshot",
            "iconography snapshot",
        ]
        eras_zoom = [
            "origins phase",
            "expansion phase",
            "classical peak",
            "crisis and reform",
            "succession / afterlife",
        ]
        for civ in CIVILIZATIONS:
            cid = civ_ids[civ["id"]]
            for mf in micro_facets:
                mid = _sid("micro", civ["id"], mf)
                text = (
                    f"{civ['name']} — {mf}: Situated in {civ['region']} during {civ['era']}. "
                    f"Core summary: {civ['summary']} "
                    f"Retrieval themes: {', '.join(civ.get('themes') or [])}. "
                    f"This micro-node supports fine-grained agent retrieval on {mf.replace(' snapshot','')}."
                )
                nodes.append(
                    {
                        "id": mid,
                        "name": f"{civ['empire']} · {mf}",
                        "type": "concept",
                        "summary": text[:280],
                        "text": text,
                        "domain": civ.get("domain") or "historian",
                        "empire": civ["empire"],
                        "region": civ["region"],
                        "era": civ["era"],
                        "themes": list(civ.get("themes") or []) + [mf.split()[0]],
                        "confidence": 0.8,
                        "metadata": {"origin": "graph_seed_micro", "pack": civ["id"]},
                    }
                )
                edges.append(
                    {
                        "id": _sid("e", cid, mid),
                        "source": cid,
                        "target": mid,
                        "type": "hierarchical",
                        "label": "micro_facet",
                        "weight": 0.6,
                    }
                )
            for ez in eras_zoom:
                eid = _sid("era", civ["id"], ez)
                text = (
                    f"{civ['name']} — {ez}: Regional setting {civ['region']}; broad era {civ['era']}. "
                    f"{civ['summary']} Phase lens '{ez}' helps agents order causality and avoid anachronism."
                )
                nodes.append(
                    {
                        "id": eid,
                        "name": f"{civ['empire']} · {ez}",
                        "type": "event",
                        "summary": text[:280],
                        "text": text,
                        "domain": "historian",
                        "empire": civ["empire"],
                        "region": civ["region"],
                        "era": civ["era"],
                        "themes": list(civ.get("themes") or []) + ["chronology"],
                        "confidence": 0.78,
                        "metadata": {"origin": "graph_seed_era", "pack": civ["id"]},
                    }
                )
                edges.append(
                    {
                        "id": _sid("e", cid, eid),
                        "source": cid,
                        "target": eid,
                        "type": "temporal",
                        "label": "phase",
                        "weight": 0.55,
                    }
                )

            # Expand every person/place/event/concept/artifact with Q&A reply seeds
            entity_lists = []
            for kind, key in (
                ("person", "people"),
                ("place", "places"),
                ("concept", "concepts"),
                ("artifact", "artifacts"),
            ):
                for item in civ.get(key) or []:
                    name, detail = item[0], item[1]
                    entity_lists.append((kind, name, detail))
            for item in civ.get("events") or []:
                name = item[0]
                detail = item[2] if len(item) == 3 else item[1]
                entity_lists.append(("event", name, detail))

            qa_lenses = [
                ("who_what", "What is {name}?", "{name} is a {kind} in {empire}: {detail}"),
                ("why_matters", "Why does {name} matter?", "{name} matters because {detail} It shapes themes: {themes}."),
                ("how_linked", "How is {name} linked?", "{name} links across {region} networks in {empire}. {detail}"),
            ]
            for kind, name, detail in entity_lists:
                for lens, qtmpl, atmpl in qa_lenses:
                    qid = _sid("qa", civ["id"], kind, name, lens)
                    answer = atmpl.format(
                        name=name,
                        kind=kind,
                        empire=civ["empire"],
                        detail=detail,
                        themes=", ".join(civ.get("themes") or []),
                        region=civ["region"],
                    )
                    question = qtmpl.format(name=name)
                    text = f"Q: {question}\nA: {answer}"
                    nodes.append(
                        {
                            "id": qid,
                            "name": question[:120],
                            "type": "concept",
                            "summary": answer[:280],
                            "text": text,
                            "domain": civ.get("domain") or "historian",
                            "empire": civ["empire"],
                            "region": civ["region"],
                            "era": civ["era"],
                            "themes": list(civ.get("themes") or []) + ["response_corpus", lens],
                            "confidence": 0.82,
                            "metadata": {
                                "origin": "graph_seed_qa",
                                "pack": civ["id"],
                                "lens": lens,
                            },
                        }
                    )
                    edges.append(
                        {
                            "id": _sid("e", cid, qid),
                            "source": cid,
                            "target": qid,
                            "type": "associative",
                            "label": "response_seed",
                            "weight": 0.5,
                        }
                    )

    if include_files:
        root = Path(__file__).resolve().parent
        kdirs = [
            root / "frontend" / "public" / "knowledge",
            root / "knowledge",
            root / "public" / "knowledge",
        ]
        file_nodes = _parse_knowledge_files(kdirs)
        nodes.extend(file_nodes)
        # link file nodes to matching civ when possible
        for fn in file_nodes:
            src = (fn.get("metadata") or {}).get("filename", "")
            for civ in CIVILIZATIONS:
                if civ["id"] in src or civ["id"].replace("_", "-") in src:
                    edges.append(
                        {
                            "id": _sid("e", civ_ids[civ["id"]], fn["id"]),
                            "source": civ_ids[civ["id"]],
                            "target": fn["id"],
                            "type": "associative",
                            "label": "documented_in",
                            "weight": 0.7,
                        }
                    )
                    break

    if dense:
        inv_nodes, inv_edges = _inventory_scale_expansion(
            civ_ids=civ_ids,
            existing_count=len({n["id"] for n in nodes}),
            target_nodes=TARGET_NODES,
            target_edges=TARGET_EDGES,
            existing_edges=len(edges),
        )
        nodes.extend(inv_nodes)
        edges.extend(inv_edges)

    # Deduplicate by id
    node_map = {n["id"]: n for n in nodes}
    edge_map = {e["id"]: e for e in edges if e.get("source") in node_map and e.get("target") in node_map}

    logger.info(
        "Graph payload built · nodes=%s edges=%s (target nodes=%s edges=%s)",
        len(node_map),
        len(edge_map),
        TARGET_NODES,
        TARGET_EDGES,
    )
    return {"nodes": list(node_map.values()), "edges": list(edge_map.values())}


def _entity_pool(civ: Dict[str, Any]) -> List[Tuple[str, str, str]]:
    """Flatten civilization pack entities into (kind, name, detail)."""
    pool: List[Tuple[str, str, str]] = []
    for kind, key in (
        ("person", "people"),
        ("place", "places"),
        ("concept", "concepts"),
        ("artifact", "artifacts"),
    ):
        for item in civ.get(key) or []:
            pool.append((kind, item[0], item[1]))
    for item in civ.get("events") or []:
        if len(item) == 3:
            pool.append(("event", item[0], item[2]))
        else:
            pool.append(("event", item[0], item[1]))
    # Always include empire self as concept seed
    pool.append(("empire", civ["name"], civ["summary"]))
    return pool


def _inventory_scale_expansion(
    *,
    civ_ids: Dict[str, str],
    existing_count: int,
    target_nodes: int = TARGET_NODES,
    target_edges: int = TARGET_EDGES,
    existing_edges: int = 0,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Expand to meta-agent inventory scale (~12,419 nodes / ~4,200 edges).

    Generates typed inventory nodes (people/places/events/concepts mix),
    topic-pack densification, cross-civ bridges, memory/response seeds.
    """
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    need = max(0, target_nodes - existing_count)
    if need == 0:
        return nodes, edges

    # Weighted share by topic pack budget (fallback equal)
    total_budget = sum(TOPIC_PACK_BUDGETS.get(c["id"], 120) for c in CIVILIZATIONS) or 1
    type_names = list(TYPE_CYCLE)
    type_counts = {t: 0 for t in type_names}
    type_targets = {
        "person": ENTITY_MIX["person"],
        "place": ENTITY_MIX["place"],
        "event": ENTITY_MIX["event"],
        "concept": ENTITY_MIX["concept"],
        "artifact": 800,
        "work": 600,
    }

    # 1) Per-civilization inventory grids
    for civ in CIVILIZATIONS:
        cid = civ_ids.get(civ["id"])
        if not cid:
            continue
        pack_budget = TOPIC_PACK_BUDGETS.get(civ["id"], 120)
        # Share of remaining need proportional to pack budget
        share = max(pack_budget, int(need * (pack_budget / total_budget)))
        pool = _entity_pool(civ)
        if not pool:
            pool = [("concept", civ["name"], civ["summary"])]

        made = 0
        idx = 0
        # Keep generating until share met (deterministic ids prevent dups)
        while made < share:
            kind, name, detail = pool[idx % len(pool)]
            lens_key, lens_label, lens_tmpl = INVENTORY_LENSES[idx % len(INVENTORY_LENSES)]
            # Rotate node types toward inventory mix targets
            desired = type_names[idx % len(type_names)]
            # Prefer under-filled entity types
            for t in ("person", "place", "event", "concept", "artifact", "work"):
                if type_counts.get(t, 0) < type_targets.get(t, 10**9):
                    desired = t
                    break
            # Map source kind lightly
            if kind in ("person", "place", "event", "artifact") and type_counts.get(kind, 0) < type_targets.get(
                kind, 10**9
            ):
                desired = kind

            slot = idx // max(1, len(pool))
            nid = _sid("inv", civ["id"], desired, name, lens_key, str(slot))
            body = lens_tmpl.format(
                name=name,
                empire=civ["empire"],
                region=civ["region"],
                era=civ["era"],
                detail=detail,
                themes=", ".join(civ.get("themes") or []),
            )
            # Enrich body for retrieval quality
            text = (
                f"{body}\n"
                f"[pack={civ['id']} · type={desired} · lens={lens_key} · "
                f"themes={', '.join(civ.get('themes') or [])}] "
                f"HoloKai graph inventory node for multi-agent retrieval and live memory grounding."
            )
            domain = DOMAIN_CYCLE[idx % len(DOMAIN_CYCLE)]
            if lens_key.startswith("agent_"):
                domain = lens_key.replace("agent_", "") if lens_key.replace("agent_", "") in DOMAIN_CYCLE else domain
            if desired == "person":
                domain = "historian"
            elif desired == "place":
                domain = "archaeology" if idx % 2 == 0 else "historian"
            elif desired == "artifact":
                domain = "archaeology"
            elif lens_key in ("ethics", "agent_ethics"):
                domain = "ethics"

            nodes.append(
                {
                    "id": nid,
                    "name": f"{name} · {lens_label}"[:160],
                    "type": desired if desired in ("person", "place", "event", "concept", "artifact", "work", "empire", "system") else "concept",
                    "summary": text[:280],
                    "text": text[:2200],
                    "domain": domain,
                    "empire": civ["empire"],
                    "region": civ["region"],
                    "era": civ["era"],
                    "themes": list(civ.get("themes") or []) + [lens_key, "inventory"],
                    "aliases": [name, civ["id"]],
                    "confidence": 0.8,
                    "metadata": {
                        "origin": "graph_inventory",
                        "pack": civ["id"],
                        "lens": lens_key,
                        "base_kind": kind,
                        "slot": slot,
                    },
                }
            )
            edges.append(
                {
                    "id": _sid("e", cid, nid),
                    "source": cid,
                    "target": nid,
                    "type": "hierarchical" if slot % 3 == 0 else "associative",
                    "label": f"inventory_{lens_key}",
                    "weight": 0.55,
                }
            )
            # Mesh to neighboring pool entity periodically
            if idx > 0 and idx % 4 == 0:
                prev_name = pool[(idx - 1) % len(pool)][1]
                prev_id = _sid(
                    "inv",
                    civ["id"],
                    type_names[(idx - 1) % len(type_names)],
                    prev_name,
                    INVENTORY_LENSES[(idx - 1) % len(INVENTORY_LENSES)][0],
                    str((idx - 1) // max(1, len(pool))),
                )
                edges.append(
                    {
                        "id": _sid("e", prev_id, nid, "mesh"),
                        "source": prev_id,
                        "target": nid,
                        "type": "associative",
                        "label": "inventory_mesh",
                        "weight": 0.4,
                    }
                )
            type_counts[desired] = type_counts.get(desired, 0) + 1
            made += 1
            idx += 1

    # 2) Cross-civilization comparative inventory (fills residual toward target)
    civ_list = list(CIVILIZATIONS)
    cross_idx = 0
    # provisional count
    while existing_count + len(nodes) < target_nodes and cross_idx < 50000:
        a = civ_list[cross_idx % len(civ_list)]
        b = civ_list[(cross_idx * 7 + 3) % len(civ_list)]
        if a["id"] == b["id"]:
            cross_idx += 1
            continue
        theme = [
            "trade corridor",
            "sacred kingship",
            "writing & signs",
            "metal & craft",
            "ocean / desert bridge",
            "oral archive",
            "gendered power",
            "colonial rupture & repair",
            "diaspora memory",
            "architectural form",
        ][cross_idx % 10]
        nid = _sid("cross", a["id"], b["id"], theme, str(cross_idx // 100))
        # stop if id collision would just waste — still add unique slots
        text = (
            f"Comparative node ({theme}): {a['name']} ↔ {b['name']}. "
            f"{a['empire']} ({a['region']}, {a['era']}) and {b['empire']} ({b['region']}, {b['era']}) "
            f"share analytic tension around {theme}. "
            f"A: {a['summary'][:220]} B: {b['summary'][:220]} "
            f"Use for multi-hop graph answers and agent synthesis."
        )
        nodes.append(
            {
                "id": nid,
                "name": f"{a['empire']} ↔ {b['empire']} · {theme}"[:160],
                "type": "concept",
                "summary": text[:280],
                "text": text,
                "domain": DOMAIN_CYCLE[cross_idx % len(DOMAIN_CYCLE)],
                "empire": "Transregional",
                "region": "Africa / Afro-Eurasia",
                "era": "comparative",
                "themes": [theme.replace(" ", "_"), "comparative", "inventory"],
                "confidence": 0.77,
                "metadata": {
                    "origin": "graph_inventory_cross",
                    "a": a["id"],
                    "b": b["id"],
                    "theme": theme,
                },
            }
        )
        if a["id"] in civ_ids and b["id"] in civ_ids:
            edges.append(
                {
                    "id": _sid("e", civ_ids[a["id"]], nid, "xa"),
                    "source": civ_ids[a["id"]],
                    "target": nid,
                    "type": "associative",
                    "label": "comparative",
                    "weight": 0.45,
                }
            )
            edges.append(
                {
                    "id": _sid("e", civ_ids[b["id"]], nid, "xb"),
                    "source": civ_ids[b["id"]],
                    "target": nid,
                    "type": "associative",
                    "label": "comparative",
                    "weight": 0.45,
                }
            )
            edges.append(
                {
                    "id": _sid("e", civ_ids[a["id"]], civ_ids[b["id"]], theme[:12], str(cross_idx % 50)),
                    "source": civ_ids[a["id"]],
                    "target": civ_ids[b["id"]],
                    "type": "associative",
                    "label": theme,
                    "weight": 0.35,
                }
            )
        cross_idx += 1

    # 3) Relationship top-up to ~target_edges (link sequential inventory nodes)
    edge_need = max(0, target_edges - existing_edges - len(edges))
    if edge_need and len(nodes) >= 2:
        for i in range(edge_need):
            n1 = nodes[i % len(nodes)]
            n2 = nodes[(i * 3 + 1) % len(nodes)]
            if n1["id"] == n2["id"]:
                continue
            rel = ("associative", "causal", "temporal", "spatial", "hierarchical")[i % 5]
            edges.append(
                {
                    "id": _sid("e", "topup", n1["id"], n2["id"], str(i)),
                    "source": n1["id"],
                    "target": n2["id"],
                    "type": rel,
                    "label": f"inventory_{rel}",
                    "weight": 0.3,
                }
            )

    # Trim nodes if we overshot hard
    if existing_count + len(nodes) > target_nodes:
        keep = max(0, target_nodes - existing_count)
        keep_ids = {n["id"] for n in nodes[:keep]}
        nodes = nodes[:keep]
        edges = [
            e
            for e in edges
            if e.get("source") in keep_ids
            or e.get("target") in keep_ids
            or e.get("source") in civ_ids.values()
            or e.get("target") in civ_ids.values()
        ]

    logger.info(
        "Inventory expansion · +nodes=%s +edges=%s (toward %s / %s)",
        len(nodes),
        len(edges),
        target_nodes,
        target_edges,
    )
    return nodes, edges


def seed_knowledge_graph(
    graph=None,
    *,
    force: bool = False,
    expand_facets: bool = True,
    dense: bool = True,
    save: bool = True,
) -> Dict[str, Any]:
    from knowledge_graph import KnowledgeGraph, get_graph

    g = graph or get_graph()
    if isinstance(g, type):
        g = get_graph()
    if not isinstance(g, KnowledgeGraph):
        g = get_graph()

    if g.nodes and not force:
        return {
            "skipped": True,
            "reason": "graph already seeded",
            "stats": g.stats(),
        }

    if force and g.nodes:
        g.clear()

    payload = build_graph_payload(expand_facets=expand_facets, dense=dense)
    result = g.bulk_upsert(payload["nodes"], payload["edges"], save=save)
    return {
        "skipped": False,
        "upserted": result,
        "stats": g.stats(),
    }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    summary = seed_knowledge_graph(force=True)
    print(summary["stats"])
