// Copyright (c) 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Full Hindi for the i-button Q&A. Word-by-word swap is not used here.
 */
(function qaHi(global) {
  const I18N = global.SaptarishiI18n;
  if (!I18N) return;

  function keyOf(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u2014\u2013]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  const EXACT = new Map([
    ["What is Dasha?", "दशा क्या है?"],
    ["What is Paya?", "पाया क्या है?"],
    ["What is Gold (Swarna) Paya?", "सुवर्ण पाया क्या है?"],
    ["What is Silver (Rajat) Paya?", "रजत पाया क्या है?"],
    ["What is Copper (Tamra) Paya?", "ताम्र पाया क्या है?"],
    ["What is Iron (Loha) Paya?", "लौह पाया क्या है?"],
    ["What is Starting Name Letter?", "नामाक्षर क्या है?"],
    ["What is a Combust Planet?", "अस्त ग्रह क्या है?"],
    ["What is an Exalted Planet?", "उच्च ग्रह क्या है?"],
    ["What is a Vargottama Planet?", "वर्गोत्तम ग्रह क्या है?"],
    ["What is a Graha Yuddha Loser?", "ग्रह युद्ध में पराजित ग्रह क्या है?"],
    ["What is a Debilitated Planet?", "नीच ग्रह क्या है?"],
    ["What is a Retrograde Planet?", "वक्री ग्रह क्या है?"],
    ["What is Nakshatra?", "नक्षत्र क्या है?"],
    ["What is Karakwaqt?", "कारक वक़्त क्या है?"],
    ["What is Malefic 6/8/12?", "पाप 6/8/12 क्या है?"],
    ["What is Benefic 1/5/9?", "शुभ 1/5/9 क्या है?"],
    ["What is Nakshatra Navatara?", "नक्षत्र नवतार क्या है?"],
    ["What is Death Degree?", "मृत्यु अंश क्या है?"],
    ["What is Gandmool?", "गंडमूल क्या है?"],
    ["What is Mangalik?", "मांगलिक क्या है?"],
    ["What does Gandmool Yes mean?", "गंडमूल हाँ का क्या अर्थ है?"],
    ["What does Gandmool No mean?", "गंडमूल नहीं का क्या अर्थ है?"],
    ["In Vedic astrology, a full life is counted as 120 years, divided among 9 planets. Each planet \"owns\" a fixed span — for example Sun 6 years, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17, Ketu 7, and Venus 20. Together they cover your whole life timeline.", "वैदिक ज्योतिष में पूरा जीवन 120 वर्ष गिना जाता है, जो नौ ग्रहों में बँटा है। हर ग्रह का एक निश्चित काल होता है — जैसे सूर्य 6 वर्ष, चंद्र 10, मंगल 7, राहु 18, गुरु 16, शनि 19, बुध 17, केतु 7, और शुक्र 20। ये मिलकर पूरी जीवन-रेखा को ढकते हैं।"],
    ["Right now, one planet is running for you — that is your Dasha. Think of Mahadasha as a big year, Antardasha as a season inside that year, and Pratyantar as a month inside that season.", "अभी आपके लिए एक ग्रह चल रहा है — वही आपकी दशा है। महादशा को एक बड़ा वर्ष मानें, अंतरदशा को उस वर्ष के भीतर की ऋतु, और प्रत्यंतर को उस ऋतु के भीतर का महीना।"],
    ["The colors in the chart below matter: green means that planet is more supportive in your birth chart; red means it needs more care; the fill shows how far you are through each phase.", "नीचे चार्ट के रंग मायने रखते हैं: हरा मतलब वह ग्रह जन्म कुंडली में अधिक सहायक है; लाल मतलब उसे अधिक ध्यान चाहिए; भराव दिखाता है कि हर चरण में आप कितना आगे बढ़ चुके हैं।"],
    ["Paya (Janma Paya) classifies birth into Gold (Swarna), Silver (Rajat), Copper (Tamra), or Iron (Loha) from the Moon.", "पाया (जन्म पाया) जन्म को चंद्र के अनुसार सुवर्ण, रजत, ताम्र या लौह में बाँटता है।"],
    ["Here it is calculated from the Moon's house from Lagna: 1/6/11 Gold, 2/5/9 Silver, 3/7/10 Copper, 4/8/12 Iron.", "यहाँ यह लग्न से चंद्र के भाव से गिना जाता है: 1/6/11 सुवर्ण, 2/5/9 रजत, 3/7/10 ताम्र, 4/8/12 लौह।"],
    ["Gold Paya means the Moon is in the 1st, 6th, or 11th house from Lagna.", "सुवर्ण पाया का अर्थ है कि चंद्र लग्न से प्रथम, षष्ठ या एकादश भाव में है।"],
    ["It is traditionally the most supportive Paya — ease, honour, reputation, and favourable openings are more likely themes.", "परंपरा में यह सबसे सहायक पाया है। सहजता, सम्मान, ख्याति और अनुकूल अवसर इसके अधिक संभावित विषय हैं।"],
    ["Silver Paya means the Moon is in the 2nd, 5th, or 9th house from Lagna.", "रजत पाया का अर्थ है कि चंद्र लग्न से द्वितीय, पंचम या नवम भाव में है।"],
    ["It is considered peaceful and fortunate — comfort, family support, and a gentler life rhythm are common themes.", "इसे शांत और सौभाग्यशाली माना जाता है। सुख, पारिवारिक सहारा और कोमल जीवन-लय इसके सामान्य विषय हैं।"],
    ["Copper Paya means the Moon is in the 3rd, 7th, or 10th house from Lagna.", "ताम्र पाया का अर्थ है कि चंद्र लग्न से तृतीय, सप्तम या दशम भाव में है।"],
    ["Results often come through effort and challenge — growth is real, but you usually have to work for it.", "फल प्रायः प्रयास और चुनौती से आते हैं। उन्नति वास्तविक होती है, पर उसके लिए प्रायः श्रम करना पड़ता है।"],
    ["Iron Paya means the Moon is in the 4th, 8th, or 12th house from Lagna.", "लौह पाया का अर्थ है कि चंद्र लग्न से चतुर्थ, अष्टम या द्वादश भाव में है।"],
    ["It is traditionally the heaviest Paya — delays and struggle can appear, but they also build patience and inner strength.", "परंपरा में यह सबसे भारी पाया है। विलंब और संघर्ष दिख सकते हैं, पर वे धैर्य और आंतरिक बल भी बनाते हैं।"],
    ["The starting name letter is the traditional Namakarana syllable from the pada of your Moon's birth nakshatra (Janma Nakshatra).", "नामाक्षर आपके चंद्र के जन्म नक्षत्र के पाद से लिया गया पारंपरिक नामकरण अक्षर है।"],
    ["Each of the 27 nakshatras has four padas, and each pada has a sound. A child's name is often chosen so it begins with that sound.", "सत्ताईस नक्षत्रों में से प्रत्येक के चार पाद होते हैं, और हर पाद का एक ध्वनि-अक्षर होता है। बालक का नाम प्रायः इसी अक्षर से आरंभ करने के लिए चुना जाता है।"],
    ["A planet is combust (Asta) when it sits too close to the Sun. Its own light is dimmed — like a star lost in the Sun's glare.", "ग्रह अस्त तब होता है जब वह सूर्य के बहुत निकट होता है। उसका अपना प्रकाश मंद पड़ जाता है, जैसे सूर्य की आभा में खोया तारा।"],
    ["In your chart, a combust planet may still work for you, but its results can feel quieter, delayed, or shaped by the Sun's themes: identity, authority, and visibility.", "आपकी कुंडली में अस्त ग्रह फिर भी काम कर सकता है, पर उसके फल शांत, विलंबित, या सूर्य के विषयों से गढ़े लग सकते हैं: पहचान, अधिकार और दृश्यता।"],
    ["Exalted (Uchcha) means the planet is in the sign where it performs at its best — strong, clear, and able to give good results.", "उच्च का अर्थ है कि ग्रह उस राशि में है जहाँ उसका फल सबसे स्पष्ट और प्रबल होता है, और वह अच्छे परिणाम दे सकता है।"],
    ["Each planet has one exaltation sign.", "हर ग्रह की एक उच्च राशि होती है।"],
    ["Vargottama means the planet is especially strong and consistent — its qualities show up more clearly in your life, with less inner conflict.", "वर्गोत्तम का अर्थ है कि ग्रह विशेष रूप से प्रबल और स्थिर है। उसके गुण जीवन में अधिक स्पष्ट दिखते हैं, और भीतर का विरोध कम रहता है।"],
    ["That area of life tends to be a reliable strength: results last, and you can count on this planet more than most.", "जीवन का वह क्षेत्र विश्वसनीय बल बनता है। फल टिकते हैं, और इस ग्रह पर अधिकांश से अधिक भरोसा किया जा सकता है।"],
    ["Graha Yuddha is a planetary war — two planets so close they compete, and one comes out weaker.", "ग्रह युद्ध वह स्थिति है जब दो ग्रह इतने निकट होते हैं कि उनमें स्पर्धा होती है, और एक दुर्बल निकलता है।"],
    ["The loser struggles to give its full results; that area of life can feel blocked or overpowered until you work with it more consciously.", "पराजित ग्रह अपने पूरे फल देने में संघर्ष करता है। जीवन का वह क्षेत्र अधिक सचेत प्रयास तक रुका या दबा हुआ लग सकता है।"],
    ["Debilitated (Neecha) means the planet is in the sign where it is weakest and finds it hardest to express its natural qualities.", "नीच का अर्थ है कि ग्रह उस राशि में है जहाँ वह सबसे दुर्बल है, और अपने स्वाभाविक गुणों को व्यक्त करने में सबसे अधिक कठिनाई पाता है।"],
    ["It does not mean the planet is useless — but that area of life may need more effort, patience, or care.", "इसका अर्थ यह नहीं कि ग्रह व्यर्थ है। पर जीवन के उस क्षेत्र में अधिक प्रयास, धैर्य या देखभाल चाहिए हो सकती है।"],
    ["Retrograde (Vakri) means the planet appears to move backward in the sky. In Vedic astrology this turns its energy inward.", "वक्री का अर्थ है कि आकाश में ग्रह उल्टी दिशा में चलता दिखाई देता है। वैदिक ज्योतिष में इसकी ऊर्जा भीतर की ओर मुड़ती है।"],
    ["Results may come in unconventional, delayed, or deeply personal ways. The planet is often considered stronger, but less straightforward.", "फल अपरंपरागत, विलंबित या गहरे निजी रूप में आ सकते हैं। ऐसे ग्रह को प्रायः अधिक बलवान माना जाता है, पर वह सीधा नहीं होता।"],
    ["Nakshatra is a lunar mansion — one of 27 star segments along the zodiac. Each spans about 13°20'.", "नक्षत्र राशिचक्र के सत्ताईस तारा-खंडों में से एक है। प्रत्येक लगभग 13°20' का होता है।"],
    ["Your Moon's birth nakshatra sets your starting Dasha. For each planet, its nakshatra shows the finer karmic tone of that graha.", "चंद्र का जन्म नक्षत्र आपकी आरंभिक दशा तय करता है। हर ग्रह का नक्षत्र उस ग्रह के सूक्ष्म कर्म-स्वर को दिखाता है।"],
    ["Karakwaqt shows the planet's role for your lagna (rising sign) — whether it acts as a helper or a challenging agent.", "कारक वक़्त लग्न के लिए ग्रह की भूमिका दिखाता है: वह सहायक है या चुनौती देने वाला।"],
    ["Green labels like yog karak and karak are supportive. Red labels like marak, badhak, and prabal marak need more care in their periods.", "योग कारक और कारक जैसे हरे नाम सहायक हैं। मारक, बाधक और प्रबल मारक जैसे लाल नाम अपनी दशा में अधिक ध्यान माँगते हैं।"],
    ["This marks whether a planet sits in the 6th, 8th, or 12th house from the lagna — called dusthana (difficult) houses.", "यह बताता है कि ग्रह लग्न से षष्ठ, अष्टम या द्वादश भाव में है या नहीं। इन भावों को दुःस्थान कहते हैं।"],
    ["Planets here can bring strain, hidden challenges, or karmic lessons in the areas they rule. Yes is flagged in red when this applies.", "यहाँ बैठे ग्रह अपने स्वामित्व वाले क्षेत्रों में तनाव, छिपी चुनौती या कर्म-सीख ला सकते हैं। जब यह लागू हो तो हाँ लाल रंग में दिखता है।"],
    ["Benefic 1/5/9 marks when a planet sits in a supportive house from the lagna: Trikona (1st, 5th, 9th) or Kendra (4th, 7th, 10th).", "शुभ 1/5/9 तब दिखता है जब ग्रह लग्न से सहायक भाव में हो: त्रिकोण (प्रथम, पंचम, नवम) या केंद्र (चतुर्थ, सप्तम, दशम)।"],
    ["Trikona and Kendra placements add strength in the chart table. Dusthana houses (6/8/12) are the opposite and appear under Malefic 6/8/12.", "त्रिकोण और केंद्र की स्थिति कुंडली तालिका में बल जोड़ती है। दुःस्थान (6/8/12) इसके विपरीत हैं, और वे पाप 6/8/12 में दिखते हैं।"],
    ["Navatara divides the 27 nakshatras into nine tara groups counted from your birth-star (Janma). It shows how friendly or stressful a planet's nakshatra is for you.", "नवतार जन्म नक्षत्र से गिनकर सत्ताईस नक्षत्रों को नौ तारा-समूहों में बाँटता है। यह बताता है कि किसी ग्रह का नक्षत्र आपके लिए कितना अनुकूल या तनावपूर्ण है।"],
    ["Helpful taras (green) support growth. Harmful taras like Vipat, Pratyari, and Naidhana (red) signal caution — obstacles, danger, or crisis themes.", "सहायक तारे (हरा) वृद्धि को सहारा देते हैं। विपत्, प्रत्यरि और नैधना जैसे हानिकारक तारे (लाल) सावधानी बताते हैं: बाधा, भय या संकट के विषय।"],
    ["Death Degree (Mrityu Bhaga) is a sensitive degree range within each sign where a planet is considered especially weakened.", "मृत्यु अंश हर राशि के भीतर वह संवेदनशील अंश है जहाँ ग्रह को विशेष रूप से दुर्बल माना जाता है।"],
    ["If a planet matches this degree in your chart, it is flagged Yes in red. It does not predict death — it shows a point where that planet's strength is under extra pressure.", "यदि आपकी कुंडली में कोई ग्रह इस अंश पर हो तो वह हाँ, लाल रंग में चिह्नित होता है। यह मृत्यु की भविष्यवाणी नहीं है। यह वह बिंदु है जहाँ उस ग्रह का बल अतिरिक्त दबाव में है।"],
    ["Gandmool (also called Sataisa / सतैसा) is when the Moon at birth is in one of six sensitive nakshatras: Ashwini, Ashlesha, Magha, Jyeshtha, Mula, or Revati.", "गंडमूल (सतैसा भी कहते हैं) तब होता है जब जन्म के समय चंद्र छह संवेदनशील नक्षत्रों में से एक में हो: अश्विनी, आश्लेषा, मघा, ज्येष्ठा, मूल या रेवती।"],
    ["These stars sit at the junctions of water and fire signs (gandanta). Traditional texts treat such a birth as needing extra care and a peace ritual, not as a curse.", "ये नक्षत्र जल और अग्नि राशियों के संधि-स्थल (गंडांत) पर बैठते हैं। परंपरा ऐसे जन्म को अतिरिक्त देखभाल और शांति-अनुष्ठान का विषय मानती है, शाप नहीं।"],
    ["Mangalik (Mangal Dosha) is when Mars sits in house 1, 2, 4, 7, 8, or 12 from Lagna.", "मांगलिक (मंगल दोष) तब होता है जब मंगल लग्न से भाव 1, 2, 4, 7, 8 या 12 में हो।"],
    ["Yes means the Moon at birth was in a Gandmool (Sataisa) nakshatra.", "हाँ का अर्थ है कि जन्म के समय चंद्र गंडमूल (सतैसा) नक्षत्र में था।"],
    ["See Doshas and Remedy on this chart for the peace ritual, mantras, and donations.", "शांति-अनुष्ठान, मंत्र और दान के लिए इस कुंडली में दोष और उपाय देखें।"],
    ["No means the Moon at birth was not in the six Gandmool nakshatras (Ashwini, Ashlesha, Magha, Jyeshtha, Mula, Revati).", "नहीं का अर्थ है कि जन्म के समय चंद्र छह गंडमूल नक्षत्रों में नहीं था: अश्विनी, आश्लेषा, मघा, ज्येष्ठा, मूल या रेवती।"],
    ["The Sataisa / Gandmool shanti ritual is not required from this rule. Other doshas, if any, are listed separately.", "इस नियम से सतैसा / गंडमूल शांति आवश्यक नहीं है। अन्य दोष हों तो वे अलग दिखेंगे।"],
    ["Classical rule: Mars in 1/4/7/8/12 from the Moon. Japa count for this reference is 0.", "शास्त्रीय नियम: चंद्र से भाव 1, 4, 7, 8 या 12 में मंगल। इस संदर्भ में जप संख्या 0 है।"],
    ["Classical rule: Jupiter and Rahu in mutual aspect. Shanti: 84,000 Guru and 80,000 Rahu.", "शास्त्रीय नियम: गुरु और राहु परस्पर दृष्टि में। शांति: 84,000 गुरु और 80,000 राहु।"],
    ["Classical rule: Mars and Rahu in mutual aspect. Shanti: 44,000 Mangal and 80,000 Rahu.", "शास्त्रीय नियम: मंगल और राहु परस्पर दृष्टि में। शांति: 44,000 मंगल और 80,000 राहु।"],
    ["Classical rule: Moon conjunct Saturn. Shanti: 102,000 Saturn and 48,000 Moon.", "शास्त्रीय नियम: चंद्र और शनि की युति। शांति: 1,02,000 शनि और 48,000 चंद्र।"],
    ["Classical rule: Mars in 1/4/7/8/12. Manglik anushthan japa is 1,25,000.", "शास्त्रीय नियम: भाव 1, 4, 7, 8 या 12 में मंगल। मांगलिक अनुष्ठान का जप 1,25,000 है।"],
    ["Classical rule: Moon in 6/8/12 from Jupiter. Shanti: 84,000 Guru and 48,000 Chandra.", "शास्त्रीय नियम: गुरु से भाव 6, 8 या 12 में चंद्र। शांति: 84,000 गुरु और 48,000 चंद्र।"],
    ["Classical rule: Sun conjunct Saturn. Shanti: 102,000 Shani and 31,000 Surya.", "शास्त्रीय नियम: सूर्य और शनि की युति। शांति: 1,02,000 शनि और 31,000 सूर्य।"],
    ["Classical rule: Saturn conjunct Rahu. Shanti: 80,000 Rahu and 102,000 Shani.", "शास्त्रीय नियम: शनि और राहु की युति। शांति: 80,000 राहु और 1,02,000 शनि।"],
    ["Classical rule: Saturn and Rahu in mutual aspect. Shanti: 80,000 Rahu and 102,000 Shani.", "शास्त्रीय नियम: शनि और राहु परस्पर दृष्टि में। शांति: 80,000 राहु और 1,02,000 शनि।"],
    ["Classical rule: Saturn conjunct Ketu. Shanti: 102,000 Shani and 70,000 Ketu.", "शास्त्रीय नियम: शनि और केतु की युति। शांति: 1,02,000 शनि और 70,000 केतु।"]
  ].map(function (pair) {
    return [keyOf(pair[0]), pair[1]];
  }));

  const LEFT = {
    "chandra grahan yoga": "चंद्र ग्रहण योग",
    "maha bhagya yoga": "महाभाग्य योग",
    "viparita raja yoga": "विपरीत राज योग",
    "dhana yoga": "धन योग",
    "veena yoga": "वीणा योग",
    "shoola yoga": "शूल योग",
    "kemadruma yoga cancelled": "केमद्रुम योग निरस्त",
    "parijata yoga": "पारिजात योग",
    "pushkala yoga": "पुष्कल योग",
    "gauri yoga": "गौरी योग",
    "srimant yoga": "श्रीमंत योग",
    "chatussagara yoga": "चतुस्सागर योग",
    "neecha bhanga": "नीच भंग",
    "chandra-manglik": "चंद्र-मांगलिक"
  };

  const GLOSS = {
    "courage, command, and physical vitality": "साहस, नेतृत्व और शारीरिक बल",
    "inner courage and drive": "आंतरिक साहस और प्रेरणा",
    "sharp intellect and eloquent speech": "तीक्ष्ण बुद्धि और प्रभावशाली वाणी",
    "mental agility and learning": "मानसिक तीव्रता और अध्ययन",
    "wisdom, dharma, and ethical stature": "विवेक, धर्म और नैतिक गरिमा",
    "inner wisdom and goodwill": "आंतरिक विवेक और सद्भावना",
    "beauty, refinement, and comfort": "शोभा, सुघड़ता और सुख",
    "charm and emotional refinement": "आकर्षण और भावनात्मक सुघड़ता",
    "authority through discipline and endurance": "अनुशासन और सहनशक्ति से अधिकार",
    "steady mind and durable standing": "स्थिर मन और टिकाऊ स्थान",
    "fame, wisdom, and respected standing": "यश, विवेक और सम्मानित स्थान",
    "self-earned wealth and personal effort": "स्वयं कमाया धन और व्यक्तिगत प्रयास",
    "refinement, charity, and inner poise": "सुघड़ता, दान और आंतरिक संतुलन",
    "supported prosperity and balanced life": "सहारा पाई समृद्धि और संतुलित जीवन",
    "enterprise, drive, and wealth potential": "उद्यम, प्रेरणा और धन की संभावना",
    "wisdom, optimism, and emotional grace": "विवेक, आशा और भावनात्मक शोभा",
    "emotional weight and sober realism": "भावनात्मक भार और संयत यथार्थ",
    "psychic intensity and unconventional mind": "मानसिक तीव्रता और अपरंपरागत मन",
    "detachment, intuition, and inner depth": "वैराग्य, अंतर्ज्ञान और आंतरिक गहराई",
    "sharp intellect and articulate expression": "तीक्ष्ण बुद्धि और स्पष्ट अभिव्यक्ति",
    "solar support and visible resourcefulness": "सूर्य का सहारा और दिखाई देने वाली साधन-कुशलता",
    "behind-the-scenes strength and subtle influence": "पर्दे के पीछे का बल और सूक्ष्म प्रभाव",
    "balanced, supported public life": "संतुलित और सहारा पाया सार्वजनिक जीवन",
    "dignified speech, learning, and wealth": "गरिमामय वाणी, विद्या और धन",
    "graceful spending and foreign favour": "शोभायुक्त व्यय और विदेश का अनुग्रह",
    "wisdom directing courageous action": "विवेक से निर्देशित साहसी कर्म",
    "learning, counsel, and broad knowledge": "अध्ययन, सलाह और विस्तृत ज्ञान",
    "grace, wisdom, and fortunate relationships": "शोभा, विवेक और सौभाग्यशाली संबंध",
    "arts, eloquence, and commercial skill": "कला, वाक्पटुता और व्यापारिक कौशल",
    "unified will and mind": "एक हुए संकल्प और मन",
    "prosperity through fortune and personal strength": "भाग्य और व्यक्तिगत बल से समृद्धि",
    "mastery of learning, speech, and the arts": "विद्या, वाणी और कला में निपुणता",
    "unblemished reputation and ethical career": "निष्कलंक ख्याति और नैतिक कर्म",
    "clean public character": "स्वच्छ सार्वजनिक चरित्र",
    "leadership and high command": "नेतृत्व और उच्च आदेश",
    "growing wealth and comfort over time": "समय के साथ बढ़ता धन और सुख",
    "great fortune and leadership potential": "महान भाग्य और नेतृत्व की संभावना",
    "exceptional luck and dignity": "असाधारण सौभाग्य और गरिमा",
    "renunciation, spirituality, or intense inner life": "वैराग्य, आध्यात्मिकता या तीव्र आंतरिक जीवन",
    "honored status and eloquent learning": "सम्मानित स्थान और वाक्पटु विद्या",
    "bold spirit and rising fortune": "साहसी स्वभाव और बढ़ता भाग्य",
    "dharmic wealth and long life": "धर्मयुक्त धन और दीर्घ जीवन",
    "merit and service bringing stable prosperity": "पुण्य और सेवा से स्थिर समृद्धि",
    "harmonious marriage and dharmic wealth": "सुमधुर विवाह और धर्मयुक्त धन",
    "purpose aligned with profession": "वृत्ति के साथ जुड़ा उद्देश्य",
    "fortune and career reinforcing each other": "भाग्य और कर्म एक-दूसरे को पुष्ट करते हैं",
    "rise through adversity": "विपत्ति से उन्नति",
    "transformation through struggle": "संघर्ष से रूपांतर",
    "gain from service and hidden challenges": "सेवा और छिपी चुनौतियों से लाभ",
    "service linked to retreat and renewal": "एकांत और नवीकरण से जुड़ी सेवा",
    "power through transformation and secrecy": "रूपांतर और गोपनीयता से शक्ति",
    "hidden resources unlocked": "छिपे साधन खुलते हैं",
    "wealth through family merit and intelligence": "पारिवारिक पुण्य और बुद्धि से धन",
    "resources and creative merit reinforcing each other": "साधन और रचनात्मक पुण्य एक-दूसरे को पुष्ट करते हैं",
    "fortune and accumulated wealth united": "भाग्य और संचित धन एक होते हैं",
    "luck feeding your treasury": "भाग्य कोष को भरता है",
    "income and gains strongly linked": "आय और लाभ दृढ़ता से जुड़े हैं",
    "gains flowing into savings": "लाभ बचत में आते हैं",
    "fortune through merit and wisdom": "पुण्य और विवेक से भाग्य",
    "dharma and merit bringing wealth": "धर्म और पुण्य धन लाते हैं",
    "creative gains and fulfilled wishes": "रचनात्मक लाभ और पूरी होती इच्छाएँ",
    "merit converting to profit": "पुण्य लाभ में बदलता है",
    "fortune and gains together": "भाग्य और लाभ साथ",
    "fortune feeding your ambitions": "भाग्य आकांक्षाओं को भरता है",
    "travel, change, and a restless life": "यात्रा, परिवर्तन और चंचल जीवन",
    "stability, persistence, and slow building": "स्थिरता, दृढ़ता और धीमा निर्माण",
    "adaptability and versatility": "अनुकूलन और बहु-कौशल",
    "balance, music, and a well-rounded life": "संतुलन, संगीत और सर्वतोमुखी जीवन",
    "intense focus on a few life themes": "जीवन के कुछ विषयों पर तीव्र एकाग्रता",
    "concentrated energy in specific domains": "विशिष्ट क्षेत्रों में केंद्रित ऊर्जा",
    "garland of support across life directions": "जीवन की दिशाओं में सहारे की माला",
    "entanglements requiring patience to resolve": "सुलझाने के लिए धैर्य माँगती उलझनें",
    "income struggles and delayed gains": "आय का संघर्ष और विलंबित लाभ",
    "tests to vitality and early ease": "प्राण और आरंभिक सहजता की परीक्षा",
    "emotional support restored": "भावनात्मक सहारा लौटता है",
    "fortune improving after early setbacks": "आरंभिक झटकों के बाद सुधरता भाग्य",
    "visibility, popularity, and comfort": "दृश्यता, लोकप्रियता और सुख",
    "emotional stability and marriage blessings": "भावनात्मक स्थिरता और विवाह के आशीर्वाद",
    "income and savings reinforcing prosperity": "आय और बचत समृद्धि को पुष्ट करती हैं",
    "leadership and authority in your field": "अपने क्षेत्र में नेतृत्व और अधिकार",
    "all-round stability and widespread success": "सर्वतोमुखी स्थिरता और विस्तृत सफलता",
    "weakness converting to strength over time": "समय के साथ दुर्बलता का बल में बदलना",
    "solar energy meets martial drive": "सौर तेज और मंगल की प्रेरणा का मेल",
    "dharmic vitality and respected authority": "धर्मयुक्त प्राण और सम्मानित अधिकार",
    "creative vitality and love of beauty": "रचनात्मक प्राण और सौंदर्य-प्रेम",
    "discipline under pressure and delayed confidence": "दबाव में अनुशासन और देर से आता आत्मविश्वास",
    "emotional intellect and fluent communication": "भावनात्मक बुद्धि और प्रवाहपूर्ण संवाद",
    "charm, comfort, and artistic sensitivity": "आकर्षण, सुख और कलात्मक संवेदनशीलता",
    "sharp wit, technical skill, and quick action": "तीक्ष्ण हाजिरजवाबी, तकनीकी कौशल और त्वरित कर्म",
    "passion, creativity, and driven desire": "तीव्रता, रचना और प्रेरित इच्छा",
    "aggressive intensity and unconventional drive": "आक्रामक तीव्रता और अपरंपरागत प्रेरणा",
    "structured wisdom and patient growth": "संरचित विवेक और धैर्यपूर्ण वृद्धि",
    "unconventional beliefs and amplified ambition": "अपरंपरागत मान्यताएँ और बढ़ी महत्वाकांक्षा",
    "enduring love, delayed comforts, artistic discipline": "स्थायी प्रेम, विलंबित सुख, कलात्मक अनुशासन",
    "unusual desires, foreign romance, creative intensity": "असामान्य इच्छाएँ, विदेशी प्रेम, रचनात्मक तीव्रता",
    "methodical intellect and careful speech": "व्यवस्थित बुद्धि और सावधान वाणी",
    "unconventional communication and clever strategy": "अपरंपरागत संवाद और चतुर रणनीति",
    "heavy karmic pressure and sudden structural change": "भारी कर्म-दबाव और अचानक संरचनात्मक परिवर्तन",
    "detached endurance and spiritual austerity": "वैराग्ययुक्त सहनशक्ति और आध्यात्मिक तप",
    "strong Mars influence on relationships and home life": "संबंधों और घरेलू जीवन पर मंगल का प्रबल प्रभाव",
    "Mars strongly colours your emotional life": "मंगल भावनात्मक जीवन को गहराई से रंगता है",
    "emotional support and inner steadiness feel thin": "भावनात्मक सहारा और आंतरिक स्थिरता पतली लगती है",
    "deep lessons around confidence and authority": "आत्मविश्वास और अधिकार की गहरी सीख",
    "intense emotional and mental sensitivity": "तीव्र भावनात्मक और मानसिक संवेदनशीलता",
    "ancestral blessings ask for remembrance and service": "पूर्वजों का आशीर्वाद स्मरण और सेवा माँगता है",
    "Saturn asks for patience, discipline, and hard work": "शनि धैर्य, अनुशासन और कठोर परिश्रम माँगता है",
    "unconventional beliefs and mixed guidance": "अपरंपरागत मान्यताएँ और मिश्रित मार्गदर्शन",
    "mixed guidance and unusual beliefs": "मिश्रित मार्गदर्शन और असामान्य मान्यताएँ",
    "sudden anger, conflict, and a force that needs a direction": "अचानक क्रोध, संघर्ष, और दिशा माँगने वाला बल",
    "sudden anger and conflict that need a direction": "अचानक क्रोध और संघर्ष, जिन्हें दिशा चाहिए",
    "a karmically loaded, fate-heavy life path": "कर्म से भरा, भाग्य-भारी जीवन-मार्ग",
    "early struggle, then a sharper path later": "आरंभ में संघर्ष, बाद में अधिक तीक्ष्ण मार्ग",
    "Mars's heat on marriage and close bonds": "विवाह और निकट संबंधों पर मंगल की ऊष्मा",
    "fortune rises, then slips away": "भाग्य चढ़ता है, फिर फिसल जाता है",
    "goals stay hard to see, and effort arrives late": "लक्ष्य कठिन दिखते हैं, और फल देर से पहुँचता है",
    "an old karmic lesson of delay and pressure": "विलंब और दबाव की पुरानी कर्म-सीख",
    "restriction, sudden breaks, and situations that feel binding": "संयम, अचानक विराम, और बाँधने वाली परिस्थितियाँ"
  };

  function leftHi(left) {
    const moon = String(left || "").match(/^(.*?) from the Moon$/i);
    const base = (moon ? moon[1] : left).trim();
    let hi = LEFT[base.toLowerCase()] || "";
    if (!hi && typeof I18N.remedyText === "function") {
      const hit = I18N.remedyText(base);
      if (hit && hit !== base) hi = String(hit).replace(/।$/, "");
    }
    if (!hi && typeof I18N.doshName === "function") {
      const hit = I18N.doshName(base);
      if (hit && hit !== base) hi = hit;
    }
    if (!hi) return "";
    return moon ? `${hi} चंद्र से` : hi;
  }

  function qaText(value) {
    const raw = value == null ? "" : String(value);
    if (I18N.getLang() !== "hi") return raw;
    const hit = EXACT.get(keyOf(raw));
    if (hit) return hit;
    let match = raw.match(/^Authority signature: lords of houses (\d+) and (\d+) conjunct\.?$/i);
    if (match) return `भाव ${match[1]} और भाव ${match[2]} के स्वामी एक साथ हैं।`;
    match = raw.match(/^Authority via mutual exchange of lords of (\d+) and (\d+)\.?$/i);
    if (match) return `भाव ${match[1]} और भाव ${match[2]} के स्वामियों का परस्पर परिवर्तन।`;
    match = raw.match(/^(.+?)\s+[\u2014\u2013-]\s+(.+)$/);
    if (match && match[1].trim().length < 80) {
      const gloss = GLOSS[keyOf(match[2].replace(/\.$/, ""))];
      const left = leftHi(match[1].trim());
      if (gloss && left) return `${left}: ${gloss}`;
    }
    return raw;
  }

  I18N.qaText = qaText;
})(window);
