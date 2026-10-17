// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Hindi for chart words: tile names, significations, and the lines under tiles.
 */
(function chartI18n(global) {
  const I18N = global.SaptarishiI18n;
  if (!I18N) return;

  const ORDINAL = {
    1: "पहला",
    2: "दूसरा",
    3: "तीसरा",
    4: "चौथा",
    5: "पाँचवाँ",
    6: "छठा",
    7: "सातवाँ",
    8: "आठवाँ",
    9: "नौवाँ",
    10: "दसवाँ",
    11: "ग्यारहवाँ",
    12: "बारहवाँ"
  };

  const PHRASE = {
    "sun (surya)": "सूर्य",
    "moon (chandra)": "चंद्र",
    "mars (mangal)": "मंगल",
    "mercury (budh)": "बुध",
    "jupiter (guru)": "गुरु",
    "venus (sukra)": "शुक्र",
    "venus (shukra)": "शुक्र",
    "saturn (shani)": "शनि",
    "ascendant (lagna)": "लग्न",
    sun: "सूर्य",
    surya: "सूर्य",
    moon: "चंद्र",
    chandra: "चंद्र",
    mars: "मंगल",
    mangal: "मंगल",
    mercury: "बुध",
    budh: "बुध",
    jupiter: "गुरु",
    guru: "गुरु",
    venus: "शुक्र",
    sukra: "शुक्र",
    shukra: "शुक्र",
    saturn: "शनि",
    shani: "शनि",
    rahu: "राहु",
    ketu: "केतु",
    ascendant: "लग्न",
    lagna: "लग्न",
    aries: "मेष",
    mesha: "मेष",
    taurus: "वृषभ",
    vrishabha: "वृषभ",
    gemini: "मिथुन",
    mithuna: "मिथुन",
    cancer: "कर्क",
    karka: "कर्क",
    leo: "सिंह",
    simha: "सिंह",
    virgo: "कन्या",
    kanya: "कन्या",
    libra: "तुला",
    tula: "तुला",
    scorpio: "वृश्चिक",
    vrishchika: "वृश्चिक",
    sagittarius: "धनु",
    dhanu: "धनु",
    capricorn: "मकर",
    makara: "मकर",
    aquarius: "कुंभ",
    kumbha: "कुंभ",
    pisces: "मीन",
    meena: "मीन",
    ashwini: "अश्विनी",
    bharani: "भरणी",
    krittika: "कृत्तिका",
    rohini: "रोहिणी",
    mrigashira: "मृगशिरा",
    ardra: "आर्द्रा",
    punarvasu: "पुनर्वसु",
    pushya: "पुष्य",
    ashlesha: "आश्लेषा",
    magha: "मघा",
    "purva phalguni": "पूर्वा फाल्गुनी",
    "uttara phalguni": "उत्तरा फाल्गुनी",
    hasta: "हस्त",
    chitra: "चित्रा",
    swati: "स्वाती",
    vishakha: "विशाखा",
    anuradha: "अनुराधा",
    jyeshtha: "ज्येष्ठा",
    mula: "मूल",
    "purva ashadha": "पूर्वाषाढ़ा",
    "uttara ashadha": "उत्तराषाढ़ा",
    shravana: "श्रवण",
    dhanishta: "धनिष्ठा",
    shatabhisha: "शतभिषा",
    "purva bhadrapada": "पूर्वा भाद्रपद",
    "uttara bhadrapada": "उत्तरा भाद्रपद",
    revati: "रेवती",
    "great friend": "अतिमित्र",
    "great enemy": "अतिशत्रु",
    mooltrikona: "मूलत्रिकोण",
    "mool trikona": "मूलत्रिकोण",
    exalted: "उच्च",
    debilitated: "नीच",
    trikona: "त्रिकोण",
    kendra: "केंद्र",
    neutral: "सम",
    friend: "मित्र",
    enemy: "शत्रु",
    own: "स्वराशि",
    high: "उच्च",
    low: "नीच",
    yes: "हाँ",
    no: "नहीं",
    "no planet": "कोई ग्रह नहीं",
    "house lord": "भाव स्वामी",
    "aspected planet": "दृष्टि करने वाला ग्रह",
    "lagna lord": "लग्नेश",
    "in this house": "इस भाव में",
    "in house rashi": "भाव राशि",
    "in house lord": "भाव स्वामी",
    "in house": "भाव",
    "aspected by": "दृष्टि",
    "ruled by": "स्वामी",
    "relates to": "से जुड़ा है",
    "death degree": "मृत्यु अंश",
    "mahadasha on age": "आयु पर महादशा",
    "nakshatra navatara": "नक्षत्र नवातार",
    "malefic 6/8/12": "पाप 6/8/12",
    "benefic 1/5/9": "शुभ 1/5/9",
    "lagna lord enemy": "लग्नेश शत्रु",
    conjunction: "युति",
    nakshatra: "नक्षत्र",
    navatara: "नवातार",
    planet: "ग्रह",
    degree: "अंश",
    karakwaqt: "कारक वक़्त",
    yogakaraka: "योगकारक",
    "yog karak": "योगकारक",
    karak: "कारक",
    marak: "मारक",
    badhak: "बाधक",
    "prabal marak": "प्रबल मारक",
    "neecha bhanga": "नीच भंग",
    "strong neecha bhanga": "प्रबल नीच भंग",
    pros: "लाभ",
    cons: "हानि",
    yoga: "योग",
    dosha: "दोष",
    dosh: "दोष",
    exchange: "परस्पर परिवर्तन",
    lords: "स्वामी",
    "from moon": "चंद्र से",
    "odd signs": "विषम राशि",
    "even signs": "सम राशि",
    monday: "सोमवार",
    tuesday: "मंगलवार",
    wednesday: "बुधवार",
    thursday: "गुरुवार",
    friday: "शुक्रवार",
    saturday: "शनिवार",
    sunday: "रविवार",
    "krishna paksha (dark moon)": "कृष्ण पक्ष",
    "shukla paksha (white moon)": "शुक्ल पक्ष",
    "born": "बाल",
    child: "कुमार",
    youth: "युवा",
    old: "वृद्ध",
    dead: "मृत",
    soul: "आत्मा",
    father: "पिता",
    vitality: "जीवन शक्ति",
    authority: "अधिकार",
    power: "शक्ति",
    ego: "अहंकार",
    fame: "यश",
    government: "सरकार",
    leadership: "नेतृत्व",
    health: "स्वास्थ्य",
    status: "प्रतिष्ठा",
    identity: "पहचान",
    purpose: "उद्देश्य",
    self: "स्वयं",
    confidence: "आत्मविश्वास",
    administration: "प्रशासन",
    eyesight: "दृष्टि",
    pride: "गर्व",
    respect: "सम्मान",
    willpower: "इच्छाशक्ति",
    gold: "स्वर्ण",
    "political success": "राजनीतिक सफलता",
    "royal connections": "राजसी संबंध",
    digestion: "पाचन",
    body: "शरीर",
    disease: "रोग",
    "disease resistance": "रोग प्रतिरोध",
    nature: "स्वभाव",
    personality: "व्यक्तित्व",
    "self-image": "आत्म-छवि",
    appearance: "रूप",
    complexion: "रंग",
    stature: "कद",
    face: "मुख",
    "overall happiness": "संपूर्ण सुख",
    longevity: "आयु",
    brain: "मस्तिष्क",
    head: "सिर",
    physique: "शरीर रचना",
    efforts: "प्रयास",
    discipline: "अनुशासन",
    knowledge: "ज्ञान",
    strength: "बल",
    wisdom: "बुद्धि",
    mother: "माता",
    home: "घर",
    "peace of mind": "मानसिक शांति",
    "mental peace": "मानसिक शांति",
    happiness: "सुख",
    property: "संपत्ति",
    vehicles: "वाहन",
    education: "शिक्षा",
    children: "संतान",
    "children's happiness": "संतान सुख",
    intelligence: "बुद्धि",
    creativity: "रचनात्मकता",
    romance: "प्रेम",
    speculation: "सट्टेबाजी",
    mantra: "मंत्र",
    spouse: "जीवनसाथी",
    marriage: "विवाह",
    partner: "साथी",
    partnership: "साझेदारी",
    "business partners": "व्यापार साझेदार",
    "business partnership": "व्यापार साझेदारी",
    business: "व्यापार",
    career: "कर्म",
    profession: "पेशा",
    "public image": "सार्वजनिक छवि",
    rank: "पद",
    income: "आय",
    gains: "लाभ",
    friends: "मित्र",
    "fulfillment of wishes": "इच्छा पूर्ति",
    expenses: "व्यय",
    loss: "हानि",
    losses: "हानि",
    "foreign travel": "विदेश यात्रा",
    "foreign lands": "विदेश",
    "foreign residence": "विदेश निवास",
    moksha: "मोक्ष",
    sleep: "निद्रा",
    wealth: "धन",
    speech: "वाणी",
    family: "परिवार",
    food: "भोजन",
    courage: "साहस",
    siblings: "भाई-बहन",
    brothers: "भाई",
    communication: "संवाद",
    "short travel": "अल्प यात्रा",
    writing: "लेखन",
    skills: "कौशल",
    skill: "कौशल",
    enemies: "शत्रु",
    "open enemies": "प्रत्यक्ष शत्रु",
    "hidden enemies": "गुप्त शत्रु",
    disease: "रोग",
    diseases: "रोग",
    debt: "ऋण",
    debts: "ऋण",
    service: "सेवा",
    obstacles: "बाधा",
    death: "मृत्यु",
    transformation: "परिवर्तन",
    "sudden events": "अचानक घटनाएँ",
    "sudden change": "अचानक परिवर्तन",
    "sudden gains": "अचानक लाभ",
    "sudden losses": "अचानक हानि",
    occult: "गुप्त विद्या",
    inheritance: "विरासत",
    fortune: "भाग्य",
    dharma: "धर्म",
    luck: "भाग्य",
    "higher education": "उच्च शिक्षा",
    guru: "गुरु",
    gurus: "गुरु",
    father: "पिता",
    pilgrimage: "तीर्थ",
    religion: "धर्म",
    "long travel": "दूर यात्रा",
    work: "कार्य",
    karma: "कर्म",
    fame: "यश",
    authority: "अधिकार",
    government: "सरकार",
    state: "राज्य",
    mother: "माता",
    comfort: "सुख-सुविधा",
    comforts: "सुख-सुविधा",
    land: "भूमि",
    house: "भाव",
    emotion: "भावना",
    emotions: "भावनाएँ",
    mind: "मन",
    feelings: "भावनाएँ",
    popularity: "लोकप्रियता",
    beauty: "सौंदर्य",
    arts: "कला",
    art: "कला",
    luxury: "विलास",
    pleasure: "भोग",
    wife: "पत्नी",
    husband: "पति",
    love: "प्रेम",
    delay: "विलंब",
    sorrow: "दुःख",
    grief: "शोक",
    fear: "भय",
    anger: "क्रोध",
    patience: "धैर्य",
    endurance: "सहनशक्ति",
    victory: "विजय",
    competition: "प्रतिस्पर्धा",
    sports: "खेल",
    travel: "यात्रा",
    research: "शोध",
    technology: "तकनीक",
    mathematics: "गणित",
    logic: "तर्क",
    memory: "स्मृति",
    learning: "अध्ययन",
    teacher: "शिक्षक",
    teachers: "शिक्षक",
    students: "विद्यार्थी",
    "public dealings": "जन-व्यवहार",
    publicity: "प्रचार",
    promotion: "पदोन्नति",
    salary: "वेतन",
    job: "नौकरी",
    workers: "कर्मचारी",
    servants: "सेवक",
    subordinates: "अधीनस्थ",
    litigation: "मुकदमा",
    lawsuits: "मुकदमे",
    justice: "न्याय",
    law: "कानून",
    charity: "दान",
    faith: "श्रद्धा",
    worship: "पूजा",
    spirituality: "आध्यात्मिका",
    meditation: "ध्यान",
    detachment: "वैराग्य",
    renunciation: "संन्यास",
    isolation: "एकांत",
    solitude: "एकांत",
    hospital: "अस्पताल",
    hospitalization: "अस्पताल में भर्ती",
    accident: "दुर्घटना",
    accidents: "दुर्घटनाएँ",
    "chronic disease": "दीर्घ रोग",
    "incurable disease": "असाध्य रोग",
    eyes: "आँखें",
    "right eye": "दाहिनी आँख",
    "left eye": "बाईं आँख",
    heart: "हृदय",
    bones: "हड्डियाँ",
    teeth: "दाँत",
    throat: "कंठ",
    chest: "वक्ष",
    stomach: "पेट",
    hands: "हाथ",
    arms: "भुजाएँ",
    legs: "पैर",
    feet: "चरण",
    knees: "घुटना",
    thighs: "जाँघ",
    waist: "कमर",
    skin: "त्वचा",
    hair: "केश",
    voice: "स्वर",
    ears: "कान",
    "name": "नाम",
    time: "समय",
    weekday: "वार",
    "moon tithi": "चंद्र तिथि",
    tithi: "तिथि",
    paya: "पाया",
    gandmool: "गंडमूल",
    mangalik: "मांगलिक",
    "combust planet": "अस्त ग्रह",
    "exalted planet": "उच्च ग्रह",
    "debilitated planet": "नीच ग्रह",
    "retrograde planet": "वक्री ग्रह",
    "vargottama planet": "वर्गोत्तम ग्रह",
    "planet in death degree": "मृत्यु अंश का ग्रह",
    "starting name letter": "नामाक्षर",
    "difficult yogas are cut": "कठिन योग कट जाते हैं",
    "difficult yogas are not cut": "कठिन योग नहीं कटते",
    "life energy": "जीवन शक्ति",
    "self-confidence": "आत्मविश्वास",
    "peace of mind": "मानसिक शांति",
    "and is aspected by": "और इस पर दृष्टि है",
    "it contains": "इसमें है",
    "friendly relationship": "मित्र संबंध",
    "neutral relationship": "सम संबंध",
    "inimical relationship": "शत्रु संबंध",
    "malefic house": "पाप भाव",
    "good house": "शुभ भाव",
    combust: "अस्त",
    "own rashi": "स्वराशि",
    "friendly rashi": "मित्र राशि",
    "enemy rashi": "शत्रु राशि",
    "its degree is": "इसका अंश है",
    phase: "अवस्था",
    "for this kundali": "इस कुंडली में",
    "cancels this debilitation": "यह नीचता काटता है",
    "raja yoga": "राज योग",
    "dhana yoga": "धन योग",
    "viparita raja yoga": "विपरीत राज योग",
    forms: "बनाता है",
    form: "बनता है",
    "more info": "और जानकारी",
    friendly: "मित्र",
    "friendly nakshatra": "मित्र नक्षत्र",
    "enemy nakshatra": "शत्रु नक्षत्र",
    "own nakshatra": "स्व नक्षत्र",
    retrograde: "वक्री",
    vargottama: "वर्गोत्तम",
    "graha yuddha": "ग्रह युद्ध",
    "planetary war": "ग्रहीय संग्राम",
    janma: "जन्म",
    sampat: "संपत",
    vipat: "विपत",
    kshema: "क्षेम",
    pratyari: "प्रत्यरि",
    sadhaka: "साधक",
    vadha: "वध",
    maitri: "मैत्री",
    "ati-maitri": "अतिमैत्री",
    "ati maitri": "अतिमैत्री",
    ruchaka: "रुचक",
    bhadra: "भद्र",
    hamsa: "हंस",
    malavya: "मालव्य",
    sasa: "शश",
    gajakesari: "गजकेसरी",
    sunapha: "सुनफा",
    anapha: "अनफा",
    durudhara: "दुरुधरा",
    "chandra-mangala": "चंद्र-मंगल",
    "guru-chandra": "गुरु-चंद्र",
    vish: "विष",
    "chandra-rahu": "चंद्र-राहु",
    "chandra-ketu": "चंद्र-केतु",
    "budha-aditya": "बुध-आदित्य",
    vesi: "वेसि",
    vasi: "वसि",
    ubhayachari: "उभयचरी",
    shubha: "शुभ",
    "guru-mangala": "गुरु-मंगल",
    "budha-guru": "बुध-गुरु",
    "shukra-guru": "शुक्र-गुरु",
    "budha-shukra": "बुध-शुक्र",
    "ravi-chandra": "रवि-चंद्र",
    lakshmi: "लक्ष्मी",
    saraswati: "सरस्वती",
    amala: "अमल",
    adhi: "अधि",
    vasumati: "वसुमती",
    "maha bhagya": "महाभाग्य",
    pravrajya: "प्रव्रज्या",
    chamara: "चामर",
    kahala: "कहल",
    sankha: "शंख",
    bheri: "भेरी",
    "dharma-karmadhipati": "धर्म-कर्माधिपति",
    rajju: "रज्जु",
    musala: "मूसल",
    nala: "नल",
    veena: "वीणा",
    vallaki: "वल्लकी",
    yuga: "युग",
    shoola: "शूल",
    mala: "माला",
    sarpa: "सर्प",
    daridra: "दरिद्र",
    dur: "दुर्",
    kemadruma: "केमद्रुम",
    parijata: "पारिजात",
    pushkala: "पुष्कल",
    gauri: "गौरी",
    srimant: "श्रीमंत",
    lagnadhi: "लग्नाधि",
    chatussagara: "चतुस्सागर",
    "ravi-mangala": "रवि-मंगल",
    "ravi-guru": "रवि-गुरु",
    "ravi-shukra": "रवि-शुक्र",
    "ravi-shani": "रवि-शनि",
    "chandra-budha": "चंद्र-बुध",
    "chandra-shukra": "चंद्र-शुक्र",
    "mangala-budha": "मंगल-बुध",
    "mangala-shukra": "मंगल-शुक्र",
    "mangala-rahu": "मंगल-राहु",
    "guru-shani": "गुरु-शनि",
    "guru-chandal": "गुरु-चांडाल",
    chandal: "चांडाल",
    "shukra-shani": "शुक्र-शनि",
    "shukra-rahu": "शुक्र-राहु",
    "budha-shani": "बुध-शनि",
    "budha-rahu": "बुध-राहु",
    "shani-rahu": "शनि-राहु",
    "shani-ketu": "शनि-केतु",
    manglik: "मांगलिक",
    grahan: "ग्रहण",
    pitru: "पितृ",
    angarak: "अंगारक",
    "kaal sarp": "काल सर्प",
    kaal: "काल",
    sarp: "सर्प",
    shakat: "शकट",
    andhak: "अंधक",
    shapit: "शापित",
    arisht: "अरिष्ट",
    aspect: "दृष्टि",
    cancellation: "निरसन",
    concentration: "एकाग्रता",
    pattern: "स्वरूप",
    like: "जैसा",
    "shoola-like concentration": "शूल जैसी एकाग्रता",
    "kemadruma cancellation": "केमद्रुम निरसन",
    "parijata-like lagna strength": "पारिजात जैसा लग्न बल",
    "pushkala-like pattern": "पुष्कल जैसा स्वरूप",
    "gauri-like pattern": "गौरी जैसा स्वरूप",
    "srimant-like wealth pattern": "श्रीमंत जैसा धन योग",
    "chatussagara-like": "चतुस्सागर जैसा",
    "neecha bhanga (lord with debilitated planet)": "नीच भंग (नीच ग्रह के साथ स्वामी)",
    lovers: "प्रेमी",
    women: "स्त्रियाँ",
    relationships: "संबंध",
    music: "संगीत",
    attraction: "आकर्षण",
    enjoyment: "आनंद",
    refinement: "परिष्कार",
    sensuality: "कामुकता",
    fashion: "फैशन",
    poetry: "काव्य",
    charm: "मोह",
    attractive: "आकर्षक",
    artistic: "कलात्मक",
    talent: "प्रतिभा",
    "artistic talent": "कला-प्रतिभा",
    happy: "सुखी",
    "love life": "प्रेम जीवन",
    "happy love life": "सुखी प्रेम जीवन",
    material: "भौतिक",
    "material comfort": "भौतिक सुख-सुविधा",
    "material comforts": "भौतिक सुख-सुविधा",
    excessive: "अत्यधिक",
    attachment: "आसक्ति",
    "financial base": "धन का आधार",
    firm: "दृढ़",
    "throughout life": "जीवन भर",
    "the financial base firm throughout life": "जीवन भर धन का आधार दृढ़",
    accounts: "लेखे",
    "accumulated wealth": "संचित धन",
    achievement: "उपलब्धि",
    action: "कर्म",
    adaptability: "अनुकूलन",
    adventures: "साहसिक कार्य",
    age: "आयु",
    aggression: "आक्रामकता",
    ambition: "महत्वाकांक्षा",
    amplification: "वृद्धि",
    analysis: "विश्लेषण",
    "ancestral property": "पैतृक संपत्ति",
    ascetics: "संन्यासी",
    ashram: "आश्रम",
    athletes: "खिलाड़ी",
    "auspicious deeds": "शुभ कर्म",
    awards: "पुरस्कार",
    "bad luck": "अशुभ",
    "bank savings": "बैंक बचत",
    "bed comfort": "शय्या सुख",
    benefits: "लाभ",
    birthplace: "जन्मस्थान",
    buildings: "भवन",
    "buried treasure": "निहित धन",
    calculation: "गणना",
    calves: "पिंडलियाँ",
    "career persistence": "कर्म में दृढ़ता",
    "change of place": "स्थान परिवर्तन",
    character: "चरित्र",
    commerce: "वाणिज्य",
    "competitive exams": "प्रतियोगी परीक्षा",
    confinement: "बंधन",
    contracts: "अनुबंध",
    craving: "लालसा",
    curiosity: "जिज्ञासा",
    "daily occupation": "दैनिक कार्य",
    data: "आँकड़े",
    "daughter-in-law": "बहू",
    desire: "इच्छा",
    "detachment through effort": "प्रयास से वैराग्य",
    disgrace: "अपयश",
    "distant stay": "दूर निवास",
    "divine blessings": "दैवी आशीर्वाद",
    dreams: "स्वप्न",
    drive: "प्रेरणा",
    "ear and breathing-related ailments": "कान और श्वास के रोग",
    "early education": "प्रारंभिक शिक्षा",
    "eating habits": "भोजन की आदत",
    "elder brother": "बड़ा भाई",
    "elder siblings": "बड़े भाई-बहन",
    elderly: "वृद्धजन",
    "emotional security": "भावनात्मक सुरक्षा",
    energy: "ऊर्जा",
    engineering: "अभियांत्रिकी",
    expansion: "विस्तार",
    experimentation: "प्रयोग",
    "family values": "पारिवारिक मूल्य",
    followers: "अनुयायी",
    "foreign trade": "विदेशी व्यापार",
    foreigners: "विदेशी",
    grace: "कृपा",
    grain: "अनाज",
    growth: "वृद्धि",
    hardship: "कष्ट",
    harmony: "सामंजस्य",
    "heart ailments": "हृदय रोग",
    "hidden help": "गुप्त सहायता",
    "higher learning": "उच्च अध्ययन",
    hobbies: "शौक",
    humility: "विनम्रता",
    illusion: "माया",
    imagination: "कल्पना",
    "immovable property": "अचल संपत्ति",
    "in-laws' wealth": "ससुराल का धन",
    initiative: "पहल",
    "inner liberation": "आंतरिक मुक्ति",
    innovation: "नवप्रवर्तन",
    insurance: "बीमा",
    intellect: "बुद्धि",
    intoxication: "नशा",
    intuition: "अंतर्ज्ञान",
    investment: "निवेश",
    kingdom: "राज्य",
    labour: "श्रम",
    language: "भाषा",
    liberation: "मोक्ष",
    "life force": "जीवन शक्ति",
    "life philosophy": "जीवन दर्शन",
    liquids: "तरल",
    livelihood: "आजीविका",
    "lower-abdomen ailments": "अधोउदर के रोग",
    "lower-chest ailments": "अधो वक्ष के रोग",
    lungs: "फेफड़े",
    lust: "काम",
    maraka: "मारक",
    "marital happiness": "दांपत्य सुख",
    "mass influence": "जन प्रभाव",
    mastery: "प्रवीणता",
    "maternal home": "ननिहाल",
    "maternal relatives": "मातृ पक्ष",
    "maternal uncle": "मामा",
    maya: "माया",
    media: "मीडिया",
    minimalism: "अल्प संग्रह",
    morality: "नैतिकता",
    "mother's death": "माता का देहांत",
    "mother's happiness": "माता का सुख",
    motherland: "मातृभूमि",
    mouth: "मुख",
    "movable property": "चल संपत्ति",
    mysticism: "रहस्यवाद",
    mystics: "रहस्यदर्शी",
    neck: "गर्दन",
    neighbors: "पड़ोसी",
    nurturing: "पालन",
    obsession: "आसक्ति",
    "occult knowledge": "गुप्त ज्ञान",
    optimism: "आशावाद",
    "past life karma": "पूर्वजन्म कर्म",
    "past tendencies": "पूर्व संस्कार",
    "past-life merit": "पूर्वजन्म पुण्य",
    perseverance: "लगन",
    "personal life": "निजी जीवन",
    pets: "पालतू",
    politics: "राजनीति",
    "poor people": "निर्धन",
    position: "पद",
    "private organs": "गुप्त अंग",
    profit: "लाभ",
    prosperity: "समृद्धि",
    protection: "रक्षा",
    "psychic insight": "अंतर्दृष्टि",
    public: "जन",
    recognition: "मान्यता",
    "reproductive organs": "प्रजनन अंग",
    reputation: "कीर्ति",
    responsibility: "उत्तरदायित्व",
    "rise of fortune": "भाग्योदय",
    "risk-taking": "जोखिम",
    rivals: "प्रतिद्वंद्वी",
    "scriptural knowledge": "शास्त्र ज्ञान",
    seniors: "वरिष्ठ",
    sensitivity: "संवेदनशीलता",
    separation: "वियोग",
    shoulders: "कंधे",
    sister: "बहन",
    slaves: "दास",
    "social image": "सामाजिक छवि",
    "social network": "सामाजिक मंडली",
    soldiers: "सैनिक",
    "spiritual seekers": "साधक",
    "spouse's nature": "जीवनसाथी का स्वभाव",
    stamina: "सहनशक्ति",
    structure: "ढाँचा",
    study: "अध्ययन",
    "sudden breaks": "अचानक विराम",
    "sudden financial gain": "अचानक धन लाभ",
    taste: "रुचि",
    "technical skills": "तकनीकी कौशल",
    tongue: "जिह्वा",
    trade: "व्यापार",
    truth: "सत्य",
    "unconventional paths": "अपरंपरागत मार्ग",
    "unconventional people": "अपरंपरागत लोग",
    untruth: "असत्य",
    "unusual success": "असाधारण सफलता",
    "upper chest": "ऊर्ध्व वक्ष",
    "upper heart": "ऊर्ध्व हृदय",
    "upper-abdomen ailments": "ऊर्ध्व उदर के रोग",
    war: "युद्ध",
    weapons: "शस्त्र",
    "wife's brother": "साला",
    "wife's sister": "साली",
    wit: "वाक्चातुर्य",
    workplace: "कार्यस्थल",
    worry: "चिंता",
    "young people": "युवा",
    "younger siblings": "छोटे भाई-बहन",
    lord: "स्वामी",
    chart: "कुंडली",
    show: "दिखाएँ",
    hide: "छिपाएँ",
    reading: "विवरण",
    green: "हरा",
    red: "लाल",
    "birth chart": "जन्म कुंडली",
    "lagna (birth chart)": "लग्न (जन्म कुंडली)",
    dasamsa: "दशमांश",
    "career chart": "कर्म कुंडली",
    navamsa: "नवांश",
    "marriage chart": "विवाह कुंडली",
    shashtiamsa: "षष्ट्यांश",
    "past-life chart": "पूर्वजन्म कुंडली",
    trimsamsa: "त्रिंशांश",
    "misfortunes chart": "कष्ट कुंडली",
    "you have": "आपको है",
    "you will": "आपको होगा",
    "you may": "आपको हो सकता है",
    "gives you": "आपको देता है",
    "may give you": "आपको दे सकता है",
    "old age": "वृद्धावस्था",
    "body, mind and wellbeing": "शरीर, मन और कल्याण",
    "wealth and prosperity": "धन और समृद्धि",
    "obstacles, accidents, and troubles": "बाधा, दुर्घटना और कष्ट",
    "safety, health and stability": "सुरक्षा, स्वास्थ्य और स्थिरता",
    "enemies, opposition, and conflicts": "शत्रु, विरोध और संघर्ष",
    "success and achievement": "सफलता और उपलब्धि",
    "severe suffering, destruction, and loss": "घोर कष्ट, विनाश और हानि",
    "friendship and cooperation": "मित्रता और सहयोग",
    "supreme luck and fortune": "उत्तम भाग्य और सौभाग्य",
    wellbeing: "कल्याण",
    accidents: "दुर्घटना",
    troubles: "कष्ट",
    safety: "सुरक्षा",
    stability: "स्थिरता",
    opposition: "विरोध",
    conflicts: "संघर्ष",
    success: "सफलता",
    suffering: "कष्ट",
    destruction: "विनाश",
    friendship: "मित्रता",
    cooperation: "सहयोग",
    supreme: "उत्तम",
    and: "और",
    or: "या",
    with: "के साथ",
    the: "",
    a: "",
    an: ""
  };

  const PHRASE_KEYS = Object.keys(PHRASE).sort((a, b) => b.length - a.length);

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function hiToken(word) {
    const key = String(word || "").trim().toLowerCase();
    return PHRASE[key] || word;
  }

  function replacePhrases(text) {
    let out = String(text || "");
    PHRASE_KEYS.forEach((phrase) => {
      const re = new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(phrase)})(?![A-Za-z0-9])`, "gi");
      out = out.replace(re, (full, lead) => `${lead}${PHRASE[phrase]}`);
    });
    return out
      .replace(/\s{2,}/g, " ")
      .replace(/\s+([,.;:])/g, "$1")
      .replace(/(\S+)\s*\(\1\)/g, "$1")
      .trim();
  }

  function ordinal(num) {
    return ORDINAL[Number(num)] || String(num);
  }

  function yearPhrase(label) {
    const text = String(label || "").trim();
    if (/^this year$/i.test(text)) return "इस वर्ष";
    const count = text.match(/^(\d+)\s+years?$/i);
    if (!count) return text;
    return Number(count[1]) === 1 ? "1 वर्ष" : `${count[1]} वर्षों`;
  }

  const DASHA_CLAUSE = {
    "a slow rise that lasts": "धीमा पर टिकाऊ उत्थान होता है।",
    "administration, justice, contracts, and iron, oil, or mineral work do well": "प्रशासन, न्याय, अनुबंध, और लोहा, तेल या खनिज का कार्य अच्छा चलता है।",
    "what saturn gives, it does not take back": "शनि जो देता है, वह वापस नहीं लेता।",
    "delay, loneliness, joint and bone disease, trouble from workers, and a risk of lost reputation": "विलंब, एकांत, जोड़ और हड्डी के रोग, कर्मचारियों से कष्ट, और कीर्ति हानि का डर रहता है।",
    "the rule of the dasha is honest work": "इस दशा का नियम ईमानदार कार्य है।",
    "honor, promotion, gain from government, and the father's support": "सम्मान, पदोन्नति, सरकार से लाभ, और पिता का सहयोग मिलता है।",
    "confidence is high and the person takes a leading role": "आत्मविश्वास ऊँचा रहता है और अग्रणी भूमिका मिलती है।",
    "clashes from ego, disputes with superiors, worry about the father's health, and heart or eye complaints": "अहंकार से टकराव, वरिष्ठों से विवाद, पिता के स्वास्थ्य की चिंता, और हृदय या आँख की शिकायत होती है।",
    "peace of mind, family happiness, work with the public, travel, and the mother's support": "मानसिक शांति, पारिवारिक सुख, जन-कार्य, यात्रा, और माता का सहयोग मिलता है।",
    "creative work and water, milk, food, or hospitality do well": "रचनात्मक कार्य, और जल, दूध, भोजन या आतिथ्य अच्छा चलता है।",
    "a restless mind, insomnia, emotional decisions, and worry about the mother's health": "अस्थिर मन, अनिद्रा, भावनात्मक निर्णय, और माता के स्वास्थ्य की चिंता रहती है।",
    "bold decisions, gain of land and property, and a rise in sport, technical work, or security": "साहसिक निर्णय, भूमि और संपत्ति का लाभ, और खेल, तकनीकी कार्य या सुरक्षा में उन्नति होती है।",
    "anger, accidents, injury, disputes with brothers, litigation, and blood or pitta trouble": "क्रोध, दुर्घटना, चोट, भाइयों से विवाद, मुकदमा, और रक्त या पित्त की तकलीफ होती है।",
    "education, writing, publishing, trade, accounts, technology, and communication": "शिक्षा, लेखन, प्रकाशन, व्यापार, लेखे, तकनीक और संवाद अच्छा चलता है।",
    "money comes from intellectual work": "धन बौद्धिक कार्य से आता है।",
    "indecision, misunderstandings, errors in contracts and documents, and skin or nerve trouble": "अनिश्चय, गलतफहमी, अनुबंध और दस्तावेज़ की भूल, और त्वचा या नस की तकलीफ होती है।",
    "learning, marriage, children, wealth, dharma, and respect": "विद्या, विवाह, संतान, धन, धर्म और सम्मान मिलता है।",
    "teaching, law, finance, and consulting rise": "अध्यापन, कानून, वित्त और परामर्श में उन्नति होती है।",
    "bad investments from too much optimism, delay in children, weight or liver trouble, and loss through false teachers": "अधिक आशावाद से गलत निवेश, संतान में विलंब, भार या यकृत की तकलीफ, और झूठे गुरु से हानि होती है।",
    "happiness in marriage, vehicles and property, and recognition in art, entertainment, fashion, or beauty": "विवाह में सुख, वाहन और संपत्ति, और कला, मनोरंजन, फैशन या सौंदर्य में पहचान मिलती है।",
    "marital discord, health loss from excess, diabetes or urinary trouble, and ups and downs in an art business": "वैवाहिक कलह, अति से स्वास्थ्य हानि, मधुमेह या मूत्र रोग, और कला-व्यापार में उतार-चढ़ाव होता है।",
    "foreign travel, politics, media, technology, and a sudden large gain": "विदेश यात्रा, राजनीति, मीडिया, तकनीक, और अचानक बड़ा लाभ मिलता है।",
    "when rahu is in house 3, 6, 10, or 11, or joined with a benefic: foreign travel, politics, media, technology, and a sudden large gain": "जब राहु भाव 3, 6, 10 या 11 में हो, या शुभ ग्रह के साथ हो: विदेश यात्रा, राजनीति, मीडिया, तकनीक, और अचानक बड़ा लाभ मिलता है।",
    "illusion, addiction, fraud and lawsuits, disgrace, insomnia, and fear": "भ्रम, लत, छल और मुकदमे, अपयश, अनिद्रा, और भय रहता है।",
    "keep the ambition, and do not drop the ethical limit": "महत्वाकांक्षा रखें, और नैतिक सीमा न छोड़ें।",
    "sadhana, occult and medical study, astrology, and research": "साधना, गुप्त और चिकित्सा अध्ययन, ज्योतिष, और शोध अच्छा चलता है।",
    "the gain is inner attainment more than rank": "लाभ पद से अधिक आंतरिक सिद्धि का है।",
    "aimlessness, sadness from detachment, illness that is hard to diagnose, and sudden separation": "लक्ष्यहीनता, वैराग्य से उदासी, पहचान में कठिन रोग, और अचानक वियोग होता है।",
    "ganesha worship is the main support": "गणेश पूजा मुख्य सहारा है।"
  };

  function translateDashaClause(part) {
    const clean = String(part || "").replace(/[.!?]+$/, "").trim();
    const key = clean.toLowerCase();
    if (!key) return "";
    if (DASHA_CLAUSE[key]) return DASHA_CLAUSE[key];
    let match = key.match(/^(.+?) antardashas are (?:the )?hard tests$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा कठिन परीक्षा है।`;
    match = key.match(/^(.+?) antardashas are easier$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा सरल है।`;
    match = key.match(/^(.+?) are easier$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा सरल है।`;
    match = key.match(/^(.+?) antardashas need care$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा में सावधानी चाहिए।`;
    match = key.match(/^(.+?) antardashas bring mental pressure$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा मानसिक दबाव लाती है।`;
    match = key.match(/^(.+?) antardashas need restraint around (.+)$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा में ${replacePhrases(match[2])} पर संयम चाहिए।`;
    match = key.match(/^(.+?) antardashas need a second look at (.+)$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा में ${replacePhrases(match[2])} को दोबारा देखें।`;
    match = key.match(/^(.+?) antardashas need limits on (.+)$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा में ${replacePhrases(match[2])} की सीमा रखें।`;
    match = key.match(/^(.+?) antardashas need caution$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा में सावधानी चाहिए।`;
    match = key.match(/^(.+?) antardashas need care in (.+)$/);
    if (match) return `${replacePhrases(match[1])} की अंतर्दशा में ${replacePhrases(match[2])} में सावधानी चाहिए।`;
    match = key.match(/^(.+?) usually ease it$/);
    if (match) return `${replacePhrases(match[1])} प्रायः राहत देते हैं।`;
    match = key.match(/^(.+?) usually balances it$/);
    if (match) return `${replacePhrases(match[1])} प्रायः संतुलन रखता है।`;
    match = key.match(/^(.+?) usually prosper$/);
    if (match) return `${replacePhrases(match[1])} प्रायः समृद्ध होते हैं।`;
    match = key.match(/^(.+?) usually relieve it$/);
    if (match) return `${replacePhrases(match[1])} प्रायः राहत देते हैं।`;
    match = key.match(/^(.+?) are usually favorable$/);
    if (match) return `${replacePhrases(match[1])} प्रायः अनुकूल हैं।`;
    match = key.match(/^(.+?) are often good for (.+)$/);
    if (match) return `${replacePhrases(match[1])} प्रायः ${replacePhrases(match[2])} के लिए अच्छे हैं।`;
    const phrased = replacePhrases(clean);
    return /।$/.test(phrased) ? phrased : `${phrased}।`;
  }

  function translateDashaClauses(body) {
    return String(body || "")
      .split(/(?<=[.!?])\s+/)
      .map((part) => translateDashaClause(part))
      .filter(Boolean)
      .join(" ");
  }

  function tryPatterns(text) {
    if (text === "Calculation") return "गणना";
    let match = text.match(/^Running from the past (.+?) till (.+?)\.?$/i);
    if (match) return `पिछले ${yearPhrase(match[1])} से चल रही है, आगे ${yearPhrase(match[2])} तक।`;
    match = text.match(/^Running from this year till (.+?)\.?$/i);
    if (match) return `इस वर्ष से चल रही है, आगे ${yearPhrase(match[1])} तक।`;
    match = text.match(/^Running this year\.?$/i);
    if (match) return "इस वर्ष चल रही है।";
    match = text.match(/^Running\.?$/i);
    if (match) return "चल रही है।";
    match = text.match(/^Will start in (.+?) and run for (.+?)\.?$/i);
    if (match) return `${yearPhrase(match[1])} बाद शुरू होगी और ${yearPhrase(match[2])} तक चलेगी।`;
    match = text.match(/^Will start this year and run for (.+?)\.?$/i);
    if (match) return `इस वर्ष शुरू होगी और ${yearPhrase(match[1])} तक चलेगी।`;
    match = text.match(/^Will start in (.+?)\.?$/i);
    if (match) return `${yearPhrase(match[1])} बाद शुरू होगी।`;
    match = text.match(/^Will start this year\.?$/i);
    if (match) return "इस वर्ष शुरू होगी।";
    match = text.match(/^Next\.?$/i);
    if (match) return "अगली।";
    match = text.match(/^For (.+?)\.?$/i);
    if (match) return `${replacePhrases(match[1])} के लिए`;

    match = text.match(/^(?:([^,]+),\s*)?your (.+?) is neither strong nor weak, so you will get mixed results\.?$/i);
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      return `${name}आपका ${replacePhrases(match[2])} न तो प्रबल है न दुर्बल, इसलिए फल मिश्रित मिलेंगे।`;
    }
    match = text.match(/^During your (.+?) mahadasha(?: \(([^)]+)\))? you will get mixed results, that is:\s*(.+)$/i);
    if (match) {
      const span = match[2] ? ` (${yearPhrase(match[2])})` : "";
      return `आपकी ${replacePhrases(match[1])} की महादशा${span} में फल मिश्रित मिलेंगे, अर्थात्: ${translateDashaClauses(match[3])}`;
    }
    match = text.match(/^(.+?) during your (.+?) mahadasha(?: \(([^)]+)\))?(?:,\s*([^:]+))?:\s*(.+)$/i);
    if (match && !/^during\b/i.test(match[1])) {
      const span = match[3] ? ` (${yearPhrase(match[3])})` : "";
      const condition = match[4] ? `${translateDashaClause(match[4])} ` : "";
      return `${match[1]}, आपकी ${replacePhrases(match[2])} की महादशा${span} में ${condition}${translateDashaClauses(match[5])}`;
    }

    match = text.match(
      /^(?:([^,]+),\s*)?[Yy]our (\d+)(?:st|nd|rd|th) house is ([A-Za-z]+)(?:, ruled by ([A-Za-z ]+))?\.\s*It contains (.+?)(?: and is aspected by (.+))?\.$/
    );
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      const lord = match[4] ? `, स्वामी ${hiToken(match[4].trim())}` : "";
      const sitting = /^no planet$/i.test(match[5].trim()) ? "कोई ग्रह नहीं" : replacePhrases(match[5]);
      const aspects = match[6] ? ` और इस पर ${replacePhrases(match[6])} की दृष्टि है` : "";
      return `${name}आपका ${ordinal(match[2])} भाव ${hiToken(match[3])} है${lord}। इसमें ${sitting} है${aspects}।`;
    }

    match = text.match(
      /^(?:([^,]+),\s*)?[Yy]our (.+?) is(?: in ([A-Za-z]+(?: \([^)]+\))?))?(?: in the (\d+)(?:st|nd|rd|th) house)?(?: and is aspected by (.+))?\.$/
    );
    if (match && !/\bhouse is\b/i.test(text)) {
      const name = match[1] ? `${match[1]}, ` : "";
      const planet = replacePhrases(match[2]);
      const bits = [];
      if (match[3]) bits.push(`${hiToken(match[3].replace(/\s*\([^)]*\)/, ""))} राशि में`);
      if (match[4]) bits.push(`भाव ${match[4]} में`);
      const where = bits.length ? ` ${bits.join(" ")}` : "";
      const aspects = match[5] ? ` इस पर ${replacePhrases(match[5])} की दृष्टि है।` : "";
      return `${name}आपका ${planet}${where} है।${aspects}`.replace(/\s+/g, " ").trim();
    }

    match = text.match(/^The (\d+)(?:st|nd|rd|th) house relates to (.+)\.$/i);
    if (match) {
      return `${ordinal(match[1])} भाव ${replacePhrases(match[2])} से जुड़ा है।`;
    }

    match = text.match(/^(.+?) relates to (.+)\.$/);
    if (match && !/^the\b/i.test(match[1])) {
      return `${replacePhrases(match[1])} ${replacePhrases(match[2])} से जुड़ा है।`;
    }

    match = text.match(/^(House Lord|Aspected planet|Planet) (.+?)(?: in this house)? status:\s*(.+)$/i);
    if (match) {
      const role = match[1].toLowerCase();
      const roleHi = role === "house lord" ? "भाव स्वामी" : role === "aspected planet" ? "दृष्टि ग्रह" : "";
      const where = /in this house/i.test(text) ? "इस भाव में " : "";
      const who = `${roleHi ? `${roleHi} ` : ""}${replacePhrases(match[2])}`.trim();
      return `${where}${who} की स्थिति: ${match[3]}`;
    }

    match = text.match(/^(.+?) has a friendly relationship with Lagna lord (.+?)\.?$/i);
    if (match) return `${replacePhrases(match[1])} का लग्नेश ${replacePhrases(match[2])} से मित्र संबंध है।`;
    match = text.match(/^(.+?) has a neutral relationship with Lagna lord (.+?)\.?$/i);
    if (match) return `${replacePhrases(match[1])} का लग्नेश ${replacePhrases(match[2])} से सम संबंध है।`;
    match = text.match(/^(.+?) has an inimical relationship with Lagna lord (.+?)\.?$/i);
    if (match) return `${replacePhrases(match[1])} का लग्नेश ${replacePhrases(match[2])} से शत्रु संबंध है।`;
    match = text.match(/^(.+?) itself is the Lagna lord\.?$/i);
    if (match) return `${replacePhrases(match[1])} स्वयं लग्नेश है।`;

    match = text.match(/^(.+?) is in the (\d+)(?:st|nd|rd|th) house, which is a malefic house(.*)$/i);
    if (match) return `${replacePhrases(match[1])} ${ordinal(match[2])} भाव में है, जो पाप भाव है${match[3]}`;
    match = text.match(/^(.+?) is in a malefic house \(6th, 8th, or 12th\)(.*)$/i);
    if (match) return `${replacePhrases(match[1])} पाप भाव (6, 8 या 12) में है${match[2]}`;
    match = text.match(/^(.+?) is in a good house, i\.e\. the (\d+)(?:st|nd|rd|th), not in the malefic 6th, 8th, or 12th houses\.?$/i);
    if (match) return `${replacePhrases(match[1])} शुभ भाव में है, यानी ${ordinal(match[2])}, पाप भाव 6, 8 या 12 में नहीं।`;
    match = text.match(/^(.+?) is in a trikona house(.*)$/i);
    if (match) return `${replacePhrases(match[1])} त्रिकोण भाव में है${match[2]}`;
    match = text.match(/^(.+?) is combust(.*?) because it is near the Sun\.?$/i);
    if (match) return `${replacePhrases(match[1])} सूर्य के पास होने से अस्त है${match[2]}।`;

    match = text.match(/^It is exalted in (.+)$/i);
    if (match) return `यह ${replacePhrases(match[1].replace(/\.$/, ""))} में उच्च है।`;
    match = text.match(/^It is in mooltrikona in (.+)$/i);
    if (match) return `यह ${replacePhrases(match[1].replace(/\.$/, ""))} में मूलत्रिकोण है।`;
    match = text.match(/^It is debilitated in (.+)$/i);
    if (match) return `यह ${replacePhrases(match[1].replace(/\.$/, ""))} में नीच है।`;
    match = text.match(/^It is in its own rashi, (.+)$/i);
    if (match) return `यह अपनी राशि ${replacePhrases(match[1].replace(/\.$/, ""))} में है।`;
    match = text.match(/^It is in a friendly rashi, (.+?)(?:, ruled by (.+?))?(\s*\([+-]?\d+\))?\.?$/i);
    if (match) {
      const lord = match[2] ? `, स्वामी ${replacePhrases(match[2].trim())}` : "";
      return `यह मित्र राशि ${replacePhrases(match[1].trim())} में है${lord}${match[3] || ""}।`;
    }
    match = text.match(/^It is in an enemy rashi, (.+?)(?:, ruled by (.+?))?(\s*\([+-]?\d+\))?\.?$/i);
    if (match) {
      const lord = match[2] ? `, स्वामी ${replacePhrases(match[2].trim())}` : "";
      return `यह शत्रु राशि ${replacePhrases(match[1].trim())} में है${lord}${match[3] || ""}।`;
    }

    match = text.match(/^(.+?) is in a friendly nakshatra, ([^,]+?)(?:, ruled by (.+?))?(\s*\([+-]?\d+\))?\.?$/i);
    if (match) {
      const lord = match[3] ? `, स्वामी ${replacePhrases(match[3].trim())}` : "";
      return `${replacePhrases(match[1])} मित्र नक्षत्र ${replacePhrases(match[2].trim())} में है${lord}${match[4] || ""}।`;
    }
    match = text.match(/^(.+?) is in an enemy nakshatra, ([^,]+?)(?:, ruled by (.+?))?(\s*\([+-]?\d+\))?\.?$/i);
    if (match) {
      const lord = match[3] ? `, स्वामी ${replacePhrases(match[3].trim())}` : "";
      return `${replacePhrases(match[1])} शत्रु नक्षत्र ${replacePhrases(match[2].trim())} में है${lord}${match[4] || ""}।`;
    }
    match = text.match(/^(.+?) is in its own (.+?) nakshatra(\s*\([+-]?\d+\))?\.?$/i);
    if (match) return `${replacePhrases(match[1])} अपने ${replacePhrases(match[2].trim())} नक्षत्र में है${match[3] || ""}।`;
    match = text.match(/^(.+?) is retrograde \(moving at double speed\)(\s*\([+-]?\d+\))?\.?$/i);
    if (match) return `${replacePhrases(match[1])} वक्री है (दोगुनी गति)${match[2] || ""}।`;
    match = text.match(/^(.+?) is vargottama \(same sign in D1 and D9\)(\s*\([+-]?\d+\))?\.?$/i);
    if (match) return `${replacePhrases(match[1])} वर्गोत्तम है (D1 और D9 में एक ही राशि)${match[2] || ""}।`;
    match = text.match(/^(.+?) lost a graha yuddha \(planetary war\)(?: against (.+?))?(\s*\([+-]?\d+\))?\.?$/i);
    if (match) {
      const foe = match[2] ? ` ${replacePhrases(match[2].trim())} से` : "";
      return `${replacePhrases(match[1])} ग्रह युद्ध में${foe} हारा${match[3] || ""}।`;
    }

    match = text.match(/^Its degree is (.+), and it is in the (.+) phase\.?$/i);
    if (match) return `इसका अंश ${match[1]} है, और यह ${hiToken(match[2])} अवस्था में है।`;
    match = text.match(/^(.+?) is at the death degree(.*)$/i);
    if (match) return `${replacePhrases(match[1])} मृत्यु अंश पर है${match[2]}`;
    match = text.match(/^(.+?)'s nakshatra navatara is (.+?)\.?$/i);
    if (match) return `${replacePhrases(match[1])} का नक्षत्र नवातार ${replacePhrases(match[2].trim())} है।`;
    match = text.match(/^(Strong )?Neecha Bhanga cancels this debilitation(.*)$/i);
    if (match) return `${match[1] ? "प्रबल " : ""}नीच भंग यह नीचता काटता है${match[2]}`;

    match = text.match(/^(.+?) Planet Pros in your kundali:?$/i);
    if (match) return `आपकी कुंडली में ${replacePhrases(match[1].trim())} ग्रह के पक्ष`;
    match = text.match(/^(.+?) Planet Cons in your kundali:?$/i);
    if (match) return `आपकी कुंडली में ${replacePhrases(match[1].trim())} ग्रह के विपक्ष`;

    match = text.match(/^(.+?) forms (.+?)\.?$/i);
    if (match) {
      const label = typeof I18N.doshName === "function" ? I18N.doshName(match[2].trim()) : match[2].trim();
      const shown = label && label !== match[2].trim() ? label : replacePhrases(match[2].trim());
      return `${replacePhrases(match[1])} ${shown} बनाता है।`;
    }

    match = text.match(/^(.+?) is (?:an? )?(.+?) planet(.*?) for this kundali\.?$/i);
    if (match) return `${replacePhrases(match[1])} इस कुंडली का ${replacePhrases(match[2])} ग्रह है${match[3]}।`;

    match = text.match(/^(?:([^,]+),\s*)?(exalted|debilitated) (.+?) gives you ([^.!?]+)\.?$/i);
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      const word = match[2].toLowerCase() === "debilitated" ? "नीच" : "उच्च";
      return `${name}${word} ${replacePhrases(match[3].trim())} आपको ${replacePhrases(match[4].trim())} देता है।`;
    }
    match = text.match(/^(?:([^,]+),\s*)?[Yy]ou should avoid ([^.!?]+)\.?$/);
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      return `${name}${replacePhrases(match[2].trim())} से बचें।`;
    }
    match = text.match(/^(?:([^,]+),\s*)?[Yy]ou keep ([^.!?]+)\.?$/);
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      return `${name}आप ${replacePhrases(match[2].trim())} रखते हैं।`;
    }
    match = text.match(/^(?:([^,]+),\s*)?[Yy]ou pour fortune into ([^.!?]+)\.?$/);
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      return `${name}भाग्य ${replacePhrases(match[2].trim())} में लगता है।`;
    }
    match = text.match(/^gives you ([^.!?]+)\.?$/i);
    if (match) return `आपको ${replacePhrases(match[1].trim())} देता है।`;
    match = text.match(/^may give you ([^.!?]+)\.?$/i);
    if (match) return `आपको ${replacePhrases(match[1].trim())} दे सकता है।`;
    match = text.match(/^(?:([^,]+),\s*)?[Yy]ou have ([^.!?]+)\.?$/);
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      return `${name}आपको ${replacePhrases(match[2].trim())} है।`;
    }
    match = text.match(/^(?:([^,]+),\s*)?[Yy]ou will have ([^.!?]+)\.?$/);
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      return `${name}आपको ${replacePhrases(match[2].trim())} मिलेगा।`;
    }
    match = text.match(/^(?:([^,]+),\s*)?[Yy]ou will ([^.!?]+)\.?$/);
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      return `${name}आपको ${replacePhrases(match[2].trim())} होगा।`;
    }
    match = text.match(/^(?:([^,]+),\s*)?[Yy]ou may ([^.!?]+)\.?$/);
    if (match) {
      const name = match[1] ? `${match[1]}, ` : "";
      const rest = match[2].replace(/\.$/, "");
      return `${name}आपको ${replacePhrases(rest)} हो सकता है।`;
    }

    return null;
  }

  function leftoverLatin(original, translated) {
    let body = String(translated || "");
    const name = String(original || "").match(/^([^,\n]+),\s+/);
    if (name && body.startsWith(name[1])) body = body.slice(name[1].length);
    return /[A-Za-z]{3,}/.test(body);
  }

  function chartText(value) {
    if (I18N.getLang() !== "hi") return value == null ? "" : String(value);
    const text = String(value ?? "");
    const lead = (text.match(/^\s*/) || [""])[0];
    const tail = (text.match(/\s*$/) || [""])[0];
    const trimmed = text.trim();
    if (!trimmed || trimmed === "—" || trimmed === "-") return text;
    if (trimmed === ".") return `${lead}।${tail}`;
    if (/^[\d.+\-–%°/, ]+$/.test(trimmed)) return text;
    const whole = tryPatterns(trimmed);
    let body = whole;
    if (!body) {
      const parts = trimmed.split(/(?<=[.!?])\s+(?=[A-Z])/);
      const speak = (part) => {
        const via = tryPatterns(part) || replacePhrases(part);
        return leftoverLatin(part, via) ? part : via;
      };
      body = parts.length > 1 ? parts.map(speak).join(" ") : speak(trimmed);
    } else if (leftoverLatin(trimmed, body)) {
      body = trimmed;
    }
    return `${lead}${body}${tail}`;
  }

  I18N.chartText = chartText;
  I18N.planetShortHi = {
    sun: "सू",
    moon: "चं",
    mars: "मं",
    mercury: "बु",
    jupiter: "गु",
    venus: "शु",
    saturn: "श",
    rahu: "रा",
    ketu: "के"
  };
})(window);
