from knowledge_base import KnowledgeBase

kb = KnowledgeBase()

documents = [
    # --- Sungbo’s Eredo ---
    {
        "text": "Sungbo’s Eredo is one of the largest earthwork complexes in West Africa, located in the Ijebu region of southwestern Nigeria. It consists of massive ditches and embankments that stretch for over 160 kilometers.",
        "metadata": {
            "domain": "archaeology",
            "source": "Archaeological surveys",
            "title": "Sungbo’s Eredo – Scale"
        }
    },
    {
        "text": "Oral traditions among the Ijebu people associate the construction of the Eredo with a legendary noblewoman known as Bilikisu Sungbo. These traditions emphasize communal labor, spiritual protection, and founding narratives.",
        "metadata": {
            "domain": "anthropology",
            "source": "Local oral histories",
            "title": "Sungbo Oral Traditions"
        }
    },
    {
        "text": "In local Yoruba usage, the term ‘Eredo’ refers to a large defensive trench or embankment. The name itself encodes both function and landscape form.",
        "metadata": {
            "domain": "linguistics",
            "source": "Linguistic notes",
            "title": "Meaning of Eredo"
        }
    },
    {
        "text": "Historical interpretations place Sungbo’s Eredo within the broader context of large-scale earthwork traditions in the forest zone of West Africa, demonstrating sophisticated political organization and labor mobilization.",
        "metadata": {
            "domain": "historian",
            "source": "Regional historical synthesis",
            "title": "Historical Context of the Eredo"
        }
    },

    # --- Mansa Musa ---
    {
        "text": "Mansa Musa ruled the Mali Empire from approximately 1312 to 1337. His pilgrimage to Mecca in 1324–1325 is one of the most famous journeys in medieval African history and drew widespread attention to the wealth and scholarship of West Africa.",
        "metadata": {
            "domain": "historian",
            "source": "Ibn Battuta, al-Umari, modern syntheses",
            "title": "Mansa Musa Overview"
        }
    },
    {
        "text": "Contemporary Arabic sources describe the enormous quantities of gold that Mansa Musa distributed during his pilgrimage, which temporarily affected gold prices in Cairo and the eastern Mediterranean.",
        "metadata": {
            "domain": "historian",
            "source": "al-Umari",
            "title": "Economic Impact of the Pilgrimage"
        }
    },
    {
        "text": "Discussions of Mansa Musa’s wealth should emphasize institutional achievement, support for scholarship (especially in Timbuktu), and diplomatic engagement rather than reducing the empire to stereotypes of extravagance.",
        "metadata": {
            "domain": "ethics",
            "source": "Cultural protocol notes",
            "title": "Responsible Framing of Imperial Wealth"
        }
    },
]

kb.add_documents(documents)
print(f"Seeded {len(documents)} documents into the knowledge base.")