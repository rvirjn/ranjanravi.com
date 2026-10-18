# One-off generator for i18n-sitting.js. Not loaded by the app.
"""Build Hindi lookups for sitting_planet_effect lines shown in the UI."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BACKEND = Path(r"c:\Users\drkum\Documents\workspace\saptarishi\backend")
sys.path.insert(0, str(BACKEND))
from kundali_house_desc import _impact_sentence  # noqa: E402

DATA = BACKEND / "database" / "data.json"
OUT = Path(__file__).with_name("i18n-sitting.js")

THEMES = {
    "gains and income": "लाभ और आय",
    "faith and release": "श्रद्धा और मोक्ष",
    "fortune and belief": "भाग्य और विश्वास",
    "the career and fame": "कर्म और यश",
    "brothers and effort": "भाई और प्रयास",
    "courage and brothers": "साहस और भाई",
    "courage and the body": "साहस और शरीर",
    "the mind and the body": "मन और शरीर",
    "the self and the body": "स्वयं और शरीर",
    "ambition and the body": "महत्वाकांक्षा और शरीर",
    "life and sudden events": "आयु और अचानक घटनाएँ",
    "the spouse and pleasure": "जीवनसाथी और सुख",
    "detachment and the body": "वैराग्य और शरीर",
    "the home and the mother": "घर और माता",
    "the spouse and marriage": "जीवनसाथी और विवाह",
    "life and hidden matters": "आयु और गुप्त विषय",
    "the career and the name": "कर्म और नाम",
    "expense and going abroad": "व्यय और विदेश गमन",
    "gains, trade, and income": "लाभ, व्यापार और आय",
    "speech and family wealth": "वाणी और पारिवारिक धन",
    "speech and sudden wealth": "वाणी और अचानक धन",
    "hidden skill and brothers": "गुप्त कौशल और भाई",
    "speech, wealth, and taste": "वाणी, धन और रुचि",
    "children and intelligence": "संतान और बुद्धि",
    "gains, wealth, and wishes": "लाभ, धन और इच्छाएँ",
    "brothers, art, and effort": "भाई, कला और प्रयास",
    "speech, trade, and wealth": "वाणी, व्यापार और धन",
    "the career, art, and fame": "कर्म, कला और यश",
    "the spouse and detachment": "जीवनसाथी और वैराग्य",
    "speech, family, and wealth": "वाणी, परिवार और धन",
    "the spouse and partnership": "जीवनसाथी और साझेदारी",
    "gains, friends, and income": "लाभ, मित्र और आय",
    "gains, luxury, and friends": "लाभ, ऐश्वर्य और मित्र",
    "release and hidden disease": "मोक्ष और गुप्त रोग",
    "enemies, disease, and debt": "शत्रु, रोग और ऋण",
    "enemies and unusual illness": "शत्रु और असामान्य रोग",
    "gains and a foreign network": "लाभ और विदेशी संपर्क",
    "gains and spiritual company": "लाभ और सात्त्विक संगति",
    "the spouse and the feelings": "जीवनसाथी और भावनाएँ",
    "expense, the eyes, and loss": "व्यय, नेत्र और हानि",
    "speech, wealth, and the eyes": "वाणी, धन और नेत्र",
    "life, endurance, and service": "आयु, सहनशक्ति और सेवा",
    "expense, sleep, and the eyes": "व्यय, निद्रा और नेत्र",
    "brothers, writing, and effort": "भाई, लेखन और प्रयास",
    "speech, savings, and the eyes": "वाणी, बचत और नेत्र",
    "courage, siblings, and effort": "साहस, भाई-बहन और प्रयास",
    "enemies, illness, and expense": "शत्रु, रोग और व्यय",
    "beauty, comfort, and the body": "सौंदर्य, सुख और शरीर",
    "the spouse and a foreign bond": "जीवनसाथी और विदेशी बंधन",
    "courage, brothers, and effort": "साहस, भाई और प्रयास",
    "enemies, disease, and service": "शत्रु, रोग और सेवा",
    "expense, charity, and release": "व्यय, दान और मोक्ष",
    "enemies, illness, and service": "शत्रु, बीमारी और सेवा",
    "learning, speech, and the body": "विद्या, वाणी और शरीर",
    "life, comfort, and the in-laws": "आयु, सुख और ससुराल",
    "fortune, the father, and faith": "भाग्य, पिता और श्रद्धा",
    "expense, comfort, and pleasure": "व्यय, सुख और भोग",
    "wisdom, the body, and children": "विवेक, शरीर और संतान",
    "the home, the mother, and land": "घर, माता और भूमि",
    "fortune, the spouse, and faith": "भाग्य, जीवनसाथी और श्रद्धा",
    "the home, vehicles, and beauty": "घर, वाहन और सौंदर्य",
    "life, research, and reputation": "आयु, शोध और कीर्ति",
    "the career, respect, and dharma": "कर्म, सम्मान और धर्म",
    "the father, dharma, and fortune": "पिता, धर्म और भाग्य",
    "expense, solitude, and the eyes": "व्यय, एकांत और नेत्र",
    "enemies, the stomach, and worry": "शत्रु, उदर और चिंता",
    "discipline, the body, and delay": "अनुशासन, शरीर और विलंब",
    "enemies, speech, and the nerves": "शत्रु, वाणी और नसें",
    "the career, skill, and the name": "कर्म, कौशल और नाम",
    "life, the eyes, and hidden loss": "आयु, नेत्र और गुप्त हानि",
    "the home, learning, and vehicles": "घर, विद्या और वाहन",
    "courage, brothers, and publicity": "साहस, भाई और प्रसिद्धि",
    "children, learning, and patience": "संतान, विद्या और धैर्य",
    "children, intellect, and writing": "संतान, बुद्धि और लेखन",
    "children and an unusual intellect": "संतान और असामान्य बुद्धि",
    "fortune, learning, and the father": "भाग्य, विद्या और पिता",
    "speech and detachment from wealth": "वाणी और धन से वैराग्य",
    "gains, property, and later wealth": "लाभ, संपत्ति और बाद का धन",
    "hidden enemies and subtle disease": "गुप्त शत्रु और सूक्ष्म रोग",
    "meditation, expense, and the eyes": "ध्यान, व्यय और नेत्र",
    "the home, the mother, and comfort": "घर, माता और सुख",
    "the career, authority, and labour": "कर्म, अधिकार और श्रम",
    "expense, the father, and the eyes": "व्यय, पिता और नेत्र",
    "the career, status, and authority": "कर्म, पद और अधिकार",
    "the home, the mother, and property": "घर, माता और संपत्ति",
    "expense, learning, and a stay away": "व्यय, विद्या और परदेश वास",
    "children and a spiritual intellect": "संतान और आध्यात्मिक बुद्धि",
    "life, the eyes, and hidden illness": "आयु, नेत्र और गुप्त रोग",
    "life, the mind, and hidden illness": "आयु, मन और गुप्त रोग",
    "children, intelligence, and feeling": "संतान, बुद्धि और भाव",
    "children, intelligence, and counsel": "संतान, बुद्धि और सलाह",
    "the career and detachment from rank": "कर्म और पद से वैराग्य",
    "the career, the public, and the name": "कर्म, जनसंपर्क और नाम",
    "children, intelligence, and pleasure": "संतान, बुद्धि और सुख",
    "the home, the mother, and peace of mind": "घर, माता और मानसिक शांति",
}

PLANETS = [
    ("the Moon", "चंद्र"),
    ("the Sun", "सूर्य"),
    ("Jupiter", "गुरु"),
    ("Mercury", "बुध"),
    ("Venus", "शुक्र"),
    ("Saturn", "शनि"),
    ("Mars", "मंगल"),
    ("Rahu", "राहु"),
    ("Ketu", "केतु"),
]

# Nakshatra result phrases, without the house theme.
GOOD_BODY = {
    "a fast start and quick healing": "तेज शुरुआत और शीघ्र आरोग्य",
    "a fixed aim and a harvest that comes later": "स्थिर लक्ष्य और बाद में आने वाला फल",
    "a lasting victory made with allies": "मित्रों के साथ टिकी हुई विजय",
    "a purifying fire and a clear lead": "शुद्ध करने वाली अग्नि और स्पष्ट नेतृत्व",
    "a search that finds what pleases": "वह खोज जो अभीष्ट को पा लेती है",
    "a slow rain of grace and a firm foundation": "कृपा की धीमी वर्षा और दृढ़ आधार",
    "ancestral authority and a throne-like standing": "पितृ-अधिकार और सिंहासन-सा स्थान",
    "craft, beauty, and merit in the work": "शिल्प, सौंदर्य और कार्य में योग्यता",
    "friendship, devotion, and honor": "मित्रता, भक्ति और सम्मान",
    "growth, fertility, and the power to create": "वृद्धि, उर्वरता और सृजन की शक्ति",
    "healing of many ills through seclusion": "एकांत से अनेक रोगों का उपचार",
    "independence, movement, and trade": "स्वतंत्रता, गति और व्यापार",
    "invigoration and victory by conviction": "उत्साह और दृढ़ विश्वास से विजय",
    "learning by listening, and a name carried by speech": "सुनकर सीखना, और वाणी से फैलने वाला नाम",
    "nourishment, safe completion, and guidance": "पोषण, सुरक्षित पूर्णता और मार्गदर्शन",
    "nourishment, the guru, and the power of worship": "पोषण, गुरु और पूजा की शक्ति",
    "patronage, contracts, and settled wealth": "संरक्षण, अनुबंध और स्थिर धन",
    "renewal and the return of what was lost": "नवीकरण और खोई वस्तु की वापसी",
    "skill of the hands, so the gain arrives": "हाथों का कौशल, जिससे लाभ आता है",
    "spiritual fire and a lift through discipline": "आध्यात्मिक तेज और अनुशासन से उत्थान",
    "success that comes only through effort": "केवल प्रयास से मिलने वाली सफलता",
    "the courage to take the senior place": "वरिष्ठ स्थान लेने का साहस",
    "the discipline to remove what is finished": "जो समाप्त हो चुका है उसे हटाने का अनुशासन",
    "the power to reach the root and clear it": "मूल तक पहुँचकर उसे साफ करने की शक्ति",
    "the skill to bind an opponent": "प्रतिपक्षी को बाँधने का कौशल",
    "union, pleasure, and creative fire": "मिलन, सुख और सृजनात्मक तेज",
    "wealth, rhythm, and the power to gather people": "धन, लय और लोगों को जोड़ने की शक्ति",
}
BAD_BODY = {
    "a cutting manner that burns": "काटने वाला, झुलसा देने वाला स्वभाव",
    "a duty so heavy that ease is lost": "इतना भारी कर्तव्य कि चैन खो जाता है",
    "a harsh ending and a heavy burden": "कठोर अंत और भारी बोझ",
    "a loyalty that ties one down": "ऐसी निष्ठा जो बाँधकर रखती है",
    "a name that depends on hearsay": "सुनी-सुनाई बातों पर टिका नाम",
    "a pact that breaks and leaves one dependent": "टूटा समझौता, जिससे परावलंबन रह जाता है",
    "a rush that breaks off": "ऐसी जल्दबाजी जो बीच में टूट जाती है",
    "a slow win that demands a clean cause": "धीमी जीत, जिसके लिए स्वच्छ उद्देश्य चाहिए",
    "a split purpose and a delayed fruit": "बँटा उद्देश्य और देर से मिलने वाला फल",
    "a zeal that scorches ordinary life": "ऐसी तीव्रता जो सामान्य जीवन को झुलसा दे",
    "cleverness that overreaches": "हद से आगे की चतुराई",
    "desire and jealousy": "इच्छा और ईर्ष्या",
    "fame that empties the inner life": "भीतरी जीवन को खाली कर देने वाली प्रसिद्धि",
    "indulgence and ego in pleasure": "भोग में आसक्ति और अहंकार",
    "isolation and a hidden complaint": "अलगाव और छिपी शिकायत",
    "jealousy, battle, and isolation": "ईर्ष्या, संघर्ष और अकेलापन",
    "pride in being right": "अपने सही होने का गर्व",
    "pride of lineage and the end of a cycle": "वंश का गर्व और एक चक्र का अंत",
    "restless chasing": "बेचैन पीछा",
    "scattering, with no fixed base": "बिखराव, बिना स्थिर आधार के",
    "storm, tears, and struggle": "आँधी, आँसू और संघर्ष",
    "strength spent in caring for others": "दूसरों की देखभाल में खर्च हुई शक्ति",
    "suspicion, poison, and entanglement": "संदेह, विष और उलझन",
    "the same loss repeating before the return": "वापसी से पहले वही हानि बार-बार",
    "uprooting and ruin before a new start": "नई शुरुआत से पहले उखाड़ और विनाश",
    "uprooting, and ruin before a new start": "उखाड़, और नई शुरुआत से पहले विनाश",
    "vanity, with praise that does not last": "अहंकार, और वह प्रशंसा जो टिकती नहीं",
    "withdrawal, with the result hidden and late": "संकोच, और देर से छिपा फल",
}

NAV = {
    "Ati-maitri": "अतिमैत्री",
    "Janma": "जन्म",
    "Kshema": "क्षेम",
    "Maitri": "मैत्री",
    "Pratyari": "प्रत्यरि",
    "Sadhaka": "साधक",
    "Sampat": "संपत",
    "Vadha": "वध",
    "Vipat": "विपत",
}


BARE = {
    "sun": "सूर्य",
    "moon": "चंद्र",
    "mars": "मंगल",
    "mercury": "बुध",
    "jupiter": "गुरु",
    "venus": "शुक्र",
    "saturn": "शनि",
    "rahu": "राहु",
    "ketu": "केतु",
}


def _planet(name: str) -> str:
    low = name.strip().lower()
    for en, hi in PLANETS:
        if low == en.lower():
            return hi
    return BARE.get(low, name)


def _fill_planets(text: str) -> str:
    out = text
    for en, hi in PLANETS:
        out = re.sub(re.escape(en), hi, out)
    return out


def hi_template(templ: str) -> str | None:
    """Hindi for a spoken template that still contains {T}."""
    t = templ.strip()
    m = re.match(r"^You have (.+) in \{T\}\.$", t)
    if m and m.group(1).lower() in GOOD_BODY:
        return f"{{T}} में आपको {GOOD_BODY[m.group(1).lower()]} मिलता है।"
    m = re.match(r"^You have (.+) to \{T\}\.$", t)
    if m and m.group(1).lower() in GOOD_BODY:
        return f"{{T}} के लिए आपको {GOOD_BODY[m.group(1).lower()]} मिलता है।"
    m = re.match(r"^You may have (.+) in \{T\}\.$", t)
    if m and m.group(1).lower() in BAD_BODY:
        return f"{{T}} में आपको {BAD_BODY[m.group(1).lower()]} हो सकता है।"
    m = re.match(r"^(.+) shows in \{T\}\.$", t)
    if m and m.group(1).lower() in BAD_BODY:
        return f"{{T}} में {BAD_BODY[m.group(1).lower()]} दिखाई देता है।"
    m = re.match(r"^You have (.+) shows in \{T\}\.$", t)
    if m and m.group(1).lower() in BAD_BODY:
        return f"{{T}} में {BAD_BODY[m.group(1).lower()]} दिखाई देता है।"

    rules: list[tuple[str, str]] = [
        (r"^As a strong maraka, (.+) cuts life and \{T\} together\.$", "प्रबल मारक होने पर {P} आयु और {T} दोनों को काटता है।"),
        (r"^As badhaka, (.+) obstructs \{T\}\.$", "बाधक होने पर {P} {T} में बाधा डालता है।"),
        (r"^As karaka, (.+) feeds \{T\} with feeling and your mother's care\.$", "कारक होने पर {P} {T} को भाव और माता की देखभाल से पोषित करता है।"),
        (r"^As karaka, (.+) feeds \{T\} with vitality and authority\.$", "कारक होने पर {P} {T} को तेज और अधिकार से पोषित करता है।"),
        (r"^As karaka, (.+) feeds \{T\}\.$", "कारक होने पर {P} {T} को पोषित करता है।"),
        (r"^As maraka, (.+) cuts vitality through \{T\}\.$", "मारक होने पर {P} {T} के माध्यम से तेज घटाता है।"),
        (r"^As yogakaraka, (.+) raises \{T\} along with peace of mind\.$", "योगकारक होने पर {P} मानसिक शांति के साथ {T} को उठाता है।"),
        (r"^As yogakaraka, (.+) raises \{T\} along with status\.$", "योगकारक होने पर {P} पद के साथ {T} को उठाता है।"),
        (r"^As yogakaraka, (.+) raises \{T\}\.$", "योगकारक होने पर {P} {T} को उठाता है।"),
        (r"^As lagna lord here, (.+) ties your life to \{T\}, and that bond supports you\.$", "यहाँ लग्नेश होने पर {P} आपके जीवन को {T} से जोड़ता है, और यह बंधन आपको सहारा देता है।"),
        (r"^As lagna lord here, (.+) ties life itself to \{T\}, and that bond supports it\.$", "यहाँ लग्नेश होने पर {P} जीवन को ही {T} से जोड़ता है, और यह बंधन उसे सहारा देता है।"),
        (r"^As lagna lord here, strain in \{T\} falls on the body and you\.$", "यहाँ लग्नेश होने पर {T} का तनाव शरीर और आप पर पड़ता है।"),
        (r"^As lagna lord here, strain in \{T\} falls on your body and your mind\.$", "यहाँ लग्नेश होने पर {T} का तनाव आपके शरीर और मन पर पड़ता है।"),
        (r"^A neutral lagna lord leaves \{T\} to (.+)'s own strength\.$", "सम लग्नेश {T} को {P} की अपनी शक्ति पर छोड़ देता है।"),
        (r"^A neutral lagna lord leaves \{T\} to the own strength of (.+)\.$", "सम लग्नेश {T} को {P} की अपनी शक्ति पर छोड़ देता है।"),
        (r"^Friendship with the lagna lord supports you in \{T\}\.$", "लग्नेश से मित्रता {T} में आपको सहारा देती है।"),
        (r"^Friendship with the lagna lord supports \{T\}\.$", "लग्नेश से मित्रता {T} को सहारा देती है।"),
        (r"^Enmity with the lagna lord damages \{T\} and you together\.$", "लग्नेश से शत्रुता {T} और आपको साथ नुकसान पहुँचाती है।"),
        (r"^Enmity with the lagna lord damages \{T\} and your peace of mind together\.$", "लग्नेश से शत्रुता {T} और आपकी मानसिक शांति दोनों को नुकसान पहुँचाती है।"),
        (r"^Even against the lagna lord, a steady mind can hold a part of \{T\}\.$", "लग्नेश के विरोध में भी स्थिर मन {T} का कुछ अंश थाम सकता है।"),
        (r"^Even against the lagna lord, disciplined effort can hold a part of \{T\}\.$", "लग्नेश के विरोध में भी अनुशासित प्रयास {T} का कुछ अंश थाम सकता है।"),
        (r"^Even against the lagna lord, effort can hold a part of \{T\}\.$", "लग्नेश के विरोध में भी प्रयास {T} का कुछ अंश थाम सकता है।"),
        (r"^The support is real, but heat in \{T\} can still show\.$", "सहारा वास्तविक है, फिर भी {T} में ताप दिख सकता है।"),
        (r"^The support is real, but moodiness in \{T\} can still show\.$", "सहारा वास्तविक है, फिर भी {T} में मन की अस्थिरता दिख सकती है।"),
        (r"^The support is real, but strain in \{T\} can still show\.$", "सहारा वास्तविक है, फिर भी {T} में तनाव दिख सकता है।"),
        (r"^With no help from the lagna lord, \{T\} turns uneven under affliction\.$", "लग्नेश की सहायता न हो तो पीड़ा में {T} असमान हो जाता है।"),
        (r"^Burnt by the Sun, you lose strength in \{T\}, and the mind and the mother weaken\.$", "सूर्य से अस्त होने पर {T} में शक्ति घटती है, और मन तथा माता दुर्बल होते हैं।"),
        (r"^Burnt by the Sun, you lose strength in \{T\}\.$", "सूर्य से अस्त होने पर {T} में शक्ति घटती है।"),
        (r"^Even close to the Sun, a supported (.+) can still give a part of \{T\}\.$", "सूर्य के निकट भी सहारा पाकर {P} {T} का कुछ अंश दे सकता है।"),
        (r"^Even near the Sun, a supported Moon can renew you in \{T\} after the dark phase\.$", "सूर्य के निकट भी सहारा पाकर चंद्र कृष्ण पक्ष के बाद {T} में आपको फिर से बल दे सकता है।"),
        (r"^Ketu is not burnt by the Sun in the usual way, so this changes nothing for you in \{T\}\.$", "केतु सामान्य रूप से सूर्य से अस्त नहीं होता, इसलिए {T} में आपके लिए इसमें कुछ नहीं बदलता।"),
        (r"^Rahu is not burnt by the Sun in the usual way, so this changes nothing for you in \{T\}\.$", "राहु सामान्य रूप से सूर्य से अस्त नहीं होता, इसलिए {T} में आपके लिए इसमें कुछ नहीं बदलता।"),
        (r"^The Sun causes combustion\. It is not itself burnt, so this changes nothing for \{T\}\.$", "सूर्य अस्त करता है। वह स्वयं नहीं जलता, इसलिए {T} के लिए इसमें कुछ नहीं बदलता।"),
        (r"^A little can remain in \{T\} when benefics support (.+)\.$", "जब शुभ ग्रह {P} को सहारा दें, तब {T} में थोड़ा अंश रह सकता है।"),
        (r"^A little of \{T\} can remain when benefics support the Sun\.$", "जब शुभ ग्रह सूर्य को सहारा दें, तब {T} का थोड़ा अंश रह सकता है।"),
        (r"^Experience in \{T\} remains, though the force is past its peak\.$", "{T} का अनुभव रहता है, यद्यपि बल चरम से उतर चुका है।"),
        (r"^Your experience in \{T\} remains, though the force is past its peak\.$", "{T} में आपका अनुभव रहता है, यद्यपि बल चरम से उतर चुका है।"),
        (r"^Full strength turns excessive in \{T\}\.$", "{T} में पूरी शक्ति अति हो जाती है।"),
        (r"^Full strength turns to moodiness in \{T\}\.$", "{T} में पूरी शक्ति मन की अस्थिरता बन जाती है।"),
        (r"^Full strength turns to pride and heat in \{T\}\.$", "{T} में पूरी शक्ति गर्व और ताप बन जाती है।"),
        (r"^You are at full strength in \{T\}\.$", "{T} में आप पूरी शक्ति पर हैं।"),
        (r"^You are exhausted in \{T\} and do not hold\.$", "{T} में आप थके हुए हैं और इसे थाम नहीं पाते।"),
        (r"^You are growing in \{T\} and can be trained\.$", "{T} में आप बढ़ रहे हैं और इसे साधा जा सकता है।"),
        (r"^You are only beginning in \{T\}\.$", "{T} में आप अभी आरंभ पर ही हैं।"),
        (r"^You are still half-grown in \{T\}\.$", "{T} में आप अभी आधे विकसित हैं।"),
        (r"^You are too young to hold \{T\}\.$", "{T} को थामने के लिए आप अभी छोटे हैं।"),
        (r"^You come late and with less force in \{T\}\.$", "{T} में फल देर से और कम बल के साथ आता है।"),
        (r"^\{T\} comes late and with less force\.$", "{T} देर से और कम बल के साथ आता है।"),
        (r"^\{T\} is at full strength\.$", "{T} पूरी शक्ति पर है।"),
        (r"^\{T\} is exhausted and do not hold\.$", "{T} थक चुका है और टिकता नहीं।"),
        (r"^\{T\} is growing and can be trained\.$", "{T} बढ़ रहा है और इसे साधा जा सकता है।"),
        (r"^\{T\} is only beginning\.$", "{T} अभी आरंभ ही है।"),
        (r"^\{T\} is still half-grown\.$", "{T} अभी आधा विकसित है।"),
        (r"^\{T\} is too young to hold\.$", "{T} थामने योग्य अभी नहीं हुआ।"),
        (r"^Losing the planetary war weakens \{T\}\.$", "ग्रह युद्ध हारने से {T} दुर्बल होता है।"),
        (r"^Ketu does not enter graha yuddha, so this changes nothing for you in \{T\}\.$", "केतु ग्रह युद्ध में नहीं पड़ता, इसलिए {T} में आपके लिए इसमें कुछ नहीं बदलता।"),
        (r"^Rahu does not enter graha yuddha, so this changes nothing for you in \{T\}\.$", "राहु ग्रह युद्ध में नहीं पड़ता, इसलिए {T} में आपके लिए इसमें कुछ नहीं बदलता।"),
        (r"^The Moon does not enter graha yuddha, so this changes nothing for you in \{T\}\.$", "चंद्र ग्रह युद्ध में नहीं पड़ता, इसलिए {T} में आपके लिए इसमें कुछ नहीं बदलता।"),
        (r"^The Sun does not enter graha yuddha, so this changes nothing for \{T\}\.$", "सूर्य ग्रह युद्ध में नहीं पड़ता, इसलिए {T} के लिए इसमें कुछ नहीं बदलता।"),
        (r"^The Moon does not turn retrograde, so this changes nothing for you in \{T\}\.$", "चंद्र वक्री नहीं होता, इसलिए {T} में आपके लिए इसमें कुछ नहीं बदलता।"),
        (r"^The Sun does not turn retrograde, so this changes nothing for \{T\}\.$", "सूर्य वक्री नहीं होता, इसलिए {T} के लिए इसमें कुछ नहीं बदलता।"),
        (r"^You have retrograde, the result in \{T\} comes late and after a review, and it can still hold\.$", "वक्री होने पर {T} का फल देर से और पुनर्विचार के बाद आता है, और फिर भी टिक सकता है।"),
        (r"^Your retrograde, the result in \{T\} comes late and after a review, and it can still hold\.$", "वक्री होने पर {T} का फल देर से और पुनर्विचार के बाद आता है, और फिर भी टिक सकता है।"),
        (r"^Your retrograde, \{T\} turns inward, and the result is delayed or repeated\.$", "वक्री होने पर {T} अंतर्मुखी हो जाता है, और फल देर से या दोहराकर आता है।"),
        (r"^Cancellation lifts the debilitation, and you improve in \{T\} after a hard start\.$", "नीच भंग नीचता हटाता है, और कठिन आरंभ के बाद {T} में आप सुधरते हैं।"),
        (r"^Cancellation lifts the debilitation, and \{T\} improves after a hard start\.$", "नीच भंग नीचता हटाता है, और कठिन आरंभ के बाद {T} सुधरता है।"),
        (r"^Strong cancellation restores (.+), and you recover in \{T\} after early loss\.$", "प्रबल नीच भंग {P} को लौटाता है, और आरंभिक हानि के बाद {T} में आप संभलते हैं।"),
        (r"^Strong cancellation restores the Sun, and \{T\} recovers after early loss\.$", "प्रबल नीच भंग सूर्य को लौटाता है, और आरंभिक हानि के बाद {T} संभलता है।"),
        (r"^The same sign in the navamsa fixes the Moon's good result for you in \{T\}\.$", "नवांश में वही राशि चंद्र के शुभ फल को {T} में आपके लिए स्थिर करती है।"),
        (r"^The same sign in the navamsa fixes the Sun's good result in \{T\}\.$", "नवांश में वही राशि सूर्य के शुभ फल को {T} में स्थिर करती है।"),
        (r"^The same sign in the navamsa fixes the good result of (.+) for you in \{T\}\.$", "नवांश में वही राशि {P} के शुभ फल को {T} में आपके लिए स्थिर करती है।"),
        (r"^Ati-maitri can inflate pride in \{T\}\.$", "अतिमैत्री {T} में गर्व बढ़ा सकती है।"),
        (r"^Ati-maitri gives a strong fortune in \{T\}\.$", "अतिमैत्री {T} में प्रबल भाग्य देती है।"),
        (r"^Ati-maitri gives you a strong fortune in \{T\}\.$", "अतिमैत्री आपको {T} में प्रबल भाग्य देती है।"),
        (r"^Janma joins \{T\} to the body and the mind, and both can hold\.$", "जन्म {T} को शरीर और मन से जोड़ता है, और दोनों टिक सकते हैं।"),
        (r"^Janma joins \{T\} to your body and your mind, and both can hold\.$", "जन्म {T} को आपके शरीर और मन से जोड़ता है, और दोनों टिक सकते हैं।"),
        (r"^Janma loads \{T\} onto the body, and strain shows there\.$", "जन्म {T} को शरीर पर लादता है, और वहीं तनाव दिखता है।"),
        (r"^Janma loads \{T\} onto your body, and strain shows there\.$", "जन्म {T} को आपके शरीर पर लादता है, और वहीं तनाव दिखता है।"),
        (r"^Kshema can make you cautious in \{T\} to the point of delay\.$", "क्षेम आपको {T} में इतना सतर्क कर सकता है कि विलंब हो।"),
        (r"^Kshema can make \{T\} cautious to the point of delay\.$", "क्षेम {T} को इतना सतर्क कर सकता है कि विलंब हो।"),
        (r"^Kshema protects health and safety in \{T\}\.$", "क्षेम {T} में स्वास्थ्य और सुरक्षा की रक्षा करता है।"),
        (r"^Kshema protects your health and safety in \{T\}\.$", "क्षेम {T} में आपके स्वास्थ्य और सुरक्षा की रक्षा करता है।"),
        (r"^Maitri brings friends and cooperation in \{T\}\.$", "मैत्री {T} में मित्र और सहयोग लाती है।"),
        (r"^Maitri can tie \{T\} to the wrong ally\.$", "मैत्री {T} को गलत साथी से बाँध सकती है।"),
        (r"^Pratyari can be faced down when (.+) is otherwise strong in \{T\}\.$", "जब {P} अन्यथा प्रबल हो, तब {T} में प्रत्यरि का सामना किया जा सकता है।"),
        (r"^Pratyari raises enemies and opposition in \{T\}\.$", "प्रत्यरि {T} में शत्रु और विरोध बढ़ाता है।"),
        (r"^Sadhaka can push \{T\} so hard that rest is lost\.$", "साधक {T} पर ऐसा दबाव डाल सकता है कि विश्राम खो जाए।"),
        (r"^Sadhaka gives success in \{T\}\.$", "साधक {T} में सफलता देता है।"),
        (r"^Sadhaka gives you success in \{T\}\.$", "साधक आपको {T} में सफलता देता है।"),
        (r"^Sampat brings wealth through \{T\}\.$", "संपत {T} के माध्यम से धन लाता है।"),
        (r"^Sampat can swell the wish for \{T\} faster than the gain\.$", "संपत {T} की इच्छा को लाभ से तेज बढ़ा सकता है।"),
        (r"^Sampat can swell your wish for \{T\} faster than the gain\.$", "संपत {T} के लिए आपकी इच्छा को लाभ से तेज बढ़ा सकता है।"),
        (r"^Vadha brings loss and a hard break in \{T\}\.$", "वध {T} में हानि और कठोर विच्छेद लाता है।"),
        (r"^Vadha is lighter when benefics join (.+) in \{T\}\.$", "जब शुभ ग्रह {T} में {P} के साथ हों, तब वध हल्का होता है।"),
        (r"^Vipat brings obstacles and sudden trouble to \{T\}\.$", "विपत {T} को बाधा और अचानक कष्ट देता है।"),
        (r"^Vipat can still be crossed if benefics support (.+) in \{T\}\.$", "यदि शुभ ग्रह {T} में {P} को सहारा दें, तो विपत पार हो सकती है।"),
        (r"^Affliction makes \{T\} uneven\.$", "पीड़ा {T} को असमान कर देती है।"),
        (r"^The mind is unsettled\. Affliction makes \{T\} uneven\.$", "मन अस्थिर है। पीड़ा {T} को असमान कर देती है।"),
        (r"^The result for \{T\} follows the planets that join or aspect this (.+)\.$", "{T} का फल उन ग्रहों पर निर्भर है जो {P} के साथ हों या उस पर दृष्टि करें।"),
        (r"^You have \{T\} follow the planets that join or aspect the Sun\.$", "{T} का फल उन ग्रहों पर निर्भर है जो सूर्य के साथ हों या उस पर दृष्टि करें।"),
        (r"^You are supported\. You have \{T\}\.$", "आपको सहारा है। आपको {T} मिलता है।"),
        (r"^You are supported\. \{T\} come forward\.$", "आपको सहारा है। {T} आगे आता है।"),
        (r"^You have \{T\}\.$", "आपको {T} मिलता है।"),
        (r"^\{T\} come forward\.$", "{T} आगे आता है।"),
        (r"^It is not itself burnt, so this changes nothing for \{T\}\.$", "यह स्वयं नहीं जलता, इसलिए {T} के लिए इसमें कुछ नहीं बदलता।"),
    ]
    for pattern, hindi in rules:
        m = re.match(pattern, t)
        if not m:
            continue
        out = hindi
        if m.lastindex:
            out = out.replace("{P}", _planet(m.group(1)))
        return out
    return None


def load_clauses() -> tuple[set[str], set[str], list[str]]:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    sun_pat = re.compile(r"^Gives a fast start and quick healing to (.+)\.$")
    oth_pat = re.compile(r"^You have a fast start and quick healing in (.+)\.$")
    themes: dict[tuple[int, str], str] = {}
    for house in data["houses"]:
        for planet, block in house["sitting_planet_effect"].items():
            text = block["nakshatra"]["ashwini"]["good"]
            m = (sun_pat if planet == "sun" else oth_pat).match(text)
            themes[(house["house"], planet)] = m.group(1)

    def leaves(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key in ("good", "bad") and isinstance(value, str):
                    yield value
                else:
                    yield from leaves(value)

    spoken: set[str] = set()
    templates: set[str] = set()
    unmatched: set[str] = set()
    theme_list = sorted(set(themes.values()), key=len, reverse=True)
    for house in data["houses"]:
        for planet, block in house["sitting_planet_effect"].items():
            for text in leaves(block):
                sp = _impact_sentence(text)
                for part in re.split(r"(?<=[.!?])\s+", sp.strip()):
                    part = part.strip()
                    if not part:
                        continue
                    spoken.add(part)
                    low = part.lower()
                    hit = None
                    for theme in theme_list:
                        idx = low.find(theme.lower())
                        if idx >= 0:
                            hit = part[:idx] + "{T}" + part[idx + len(theme) :]
                            break
                    if hit:
                        templates.add(hit)
                    else:
                        unmatched.add(part)
    return spoken, templates, sorted(unmatched)


PREFIXES = [
    re.compile(
        r"^In a (?:strong|weak) (?:Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu) mahadasha(?: of \d+ years| \(\d+ years\))?,?\s*",
        re.I,
    ),
    re.compile(r"^In its own sign,\s*", re.I),
    re.compile(r"^In its root sign here,\s*", re.I),
    re.compile(
        r"^In its root sign in the (?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth),\s*",
        re.I,
    ),
    re.compile(r"^In its root sign,\s*", re.I),
    re.compile(r"^You are supported\.\s*", re.I),
    re.compile(r"^The mind is unsettled\.\s*", re.I),
]


def strip_prefixes(text: str) -> str:
    cur = text.strip()
    changed = True
    while changed:
        changed = False
        for rx in PREFIXES:
            m = rx.match(cur)
            if m:
                cur = cur[m.end() :]
                changed = True
    return cur.strip()


def hi_loose(text: str) -> str | None:
    raw = text.strip().rstrip(".")
    low = raw.lower()
    if low.startswith("you have ") and low[9:] in GOOD_BODY:
        return f"आपको {GOOD_BODY[low[9:]]} मिलता है।"
    if low.startswith("you have ") and low[9:] in BAD_BODY:
        return f"आपको {BAD_BODY[low[9:]]} है।"
    if low.startswith("you may have ") and low[13:] in BAD_BODY:
        return f"आपको {BAD_BODY[low[13:]]} हो सकता है।"
    return None


def _load_cores() -> dict[str, str]:
    from _cores_hi_a import CORE_A
    from _cores_hi_b import CORE_B
    out: dict[str, str] = {}
    for src in (CORE_A, CORE_B):
        for key, value in src.items():
            out[key.strip().rstrip(".").lower()] = value
    return out


def _strip_match(text: str) -> tuple[str, str] | None:
    """Return (hindi prefix, remainder) for the first matching wrapper."""
    rules = [
        (
            re.compile(
                r"^In a (strong|weak) (Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu) mahadasha(?: of (\d+) years| \((\d+) years\))?,?\s*",
                re.I,
            ),
            "dasha",
        ),
        (re.compile(r"^In its own sign,\s*", re.I), "own"),
        (re.compile(r"^In its root sign here,\s*", re.I), "root_here"),
        (
            re.compile(
                r"^In its root sign in the (first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth),\s*",
                re.I,
            ),
            "root_house",
        ),
        (re.compile(r"^In its root sign,\s*", re.I), "root"),
        (re.compile(r"^You are supported\.\s*", re.I), "supported"),
        (re.compile(r"^The mind is unsettled\.\s*", re.I), "mind"),
    ]
    ordinals = {
        "first": "पहले",
        "second": "दूसरे",
        "third": "तीसरे",
        "fourth": "चौथे",
        "fifth": "पाँचवें",
        "sixth": "छठे",
        "seventh": "सातवें",
        "eighth": "आठवें",
        "ninth": "नौवें",
        "tenth": "दसवें",
        "eleventh": "ग्यारहवें",
        "twelfth": "बारहवें",
    }
    for rx, kind in rules:
        m = rx.match(text)
        if not m:
            continue
        rest = text[m.end() :]
        if kind == "dasha":
            kind_hi = "प्रबल" if m.group(1).lower() == "strong" else "दुर्बल"
            years = m.group(3) or m.group(4)
            span = f" ({years} वर्ष)" if years else ""
            prefix = f"{kind_hi} {_planet(m.group(2))} महादशा{span} में "
        elif kind == "own":
            prefix = "स्वराशि में "
        elif kind == "root_here":
            prefix = "यहाँ मूलत्रिकोण में "
        elif kind == "root_house":
            prefix = f"{ordinals[m.group(1).lower()]} भाव की मूल राशि में "
        elif kind == "root":
            prefix = "मूल राशि में "
        elif kind == "supported":
            prefix = "आपको सहारा है। "
        else:
            prefix = "मन अस्थिर है। "
        return prefix, rest
    return None


ALIAS: dict[str, str] = {}


def translate_clause(text: str, cores: dict[str, str], templates: dict[str, str]) -> str | None:
    raw = " ".join(text.split()).strip()
    if not raw:
        return None
    low = raw.lower()
    themes = sorted(THEMES, key=len, reverse=True)
    for theme in themes:
        idx = low.find(theme)
        if idx < 0:
            continue
        templ = raw[:idx] + "{T}" + raw[idx + len(theme) :]
        hindi = templates.get(templ)
        if hindi:
            return hindi.replace("{T}", THEMES[theme])
    loose = hi_loose(raw)
    if loose:
        return loose
    key = raw.rstrip(".").lower()
    if key in cores:
        return cores[key]
    wrapped = _strip_match(raw)
    if wrapped:
        prefix, rest = wrapped
        if not rest.strip():
            return prefix.strip()
        inner = translate_clause(rest, cores, templates)
        if inner:
            return f"{prefix}{inner}"
    aliased = ALIAS.get(raw.rstrip(".").lower())
    if aliased:
        return aliased
    return None


def _js(obj: object) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2)


def emit(cores: dict[str, str], templates: dict[str, str], aliases: dict[str, str]) -> None:
    theme_pairs = sorted(THEMES.items(), key=lambda item: len(item[0]), reverse=True)
    body = f"""// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Hindi for sitting-planet effect lines (house grid Impact text).
 * Generated from data.json sentence patterns. Do not edit by hand.
 */
(function sittingI18n(global) {{
  const I18N = global.SaptarishiI18n;
  if (!I18N || typeof I18N.chartText !== "function") return;

  const THEMES = {_js(theme_pairs)};
  const TEMPLATES = {_js(templates)};
  const CORES = {_js(cores)};
  const ALIAS = {_js(aliases)};
  const GOOD = {_js(GOOD_BODY)};
  const BAD = {_js(BAD_BODY)};
  const PLANET = {_js({**{en.lower(): hi for en, hi in PLANETS}, **BARE})};

  function norm(text) {{
    return String(text || "").replace(/\\s+/g, " ").trim().replace(/[.!?]+$/, "").toLowerCase();
  }}

  function planetHi(name) {{
    return PLANET[String(name || "").toLowerCase()] || name;
  }}

  function loose(text) {{
    const low = norm(text);
    if (low.startsWith("you have ") && GOOD[low.slice(9)]) return `आपको ${{GOOD[low.slice(9)]}} मिलता है।`;
    if (low.startsWith("you have ") && BAD[low.slice(9)]) return `आपको ${{BAD[low.slice(9)]}} है।`;
    if (low.startsWith("you may have ") && BAD[low.slice(13)]) return `आपको ${{BAD[low.slice(13)]}} हो सकता है।`;
    return "";
  }}

  const ORD = {{
    first: "पहले",
    second: "दूसरे",
    third: "तीसरे",
    fourth: "चौथे",
    fifth: "पाँचवें",
    sixth: "छठे",
    seventh: "सातवें",
    eighth: "आठवें",
    ninth: "नौवें",
    tenth: "दसवें",
    eleventh: "ग्यारहवें",
    twelfth: "बारहवें"
  }};

  function wrapPrefix(text) {{
    const raw = String(text || "").replace(/\\s+/g, " ").trim();
    let match = raw.match(/^In a (strong|weak) (Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu) mahadasha(?: of (\\d+) years| \\((\\d+) years\\))?,?\\s*/i);
    if (match) {{
      const kind = match[1].toLowerCase() === "strong" ? "प्रबल" : "दुर्बल";
      const years = match[3] || match[4];
      const span = years ? ` (${{years}} वर्ष)` : "";
      return {{ prefix: `${{kind}} ${{planetHi(match[2])}} महादशा${{span}} में `, rest: raw.slice(match[0].length) }};
    }}
    match = raw.match(/^In its own sign,\\s*/i);
    if (match) return {{ prefix: "स्वराशि में ", rest: raw.slice(match[0].length) }};
    match = raw.match(/^In its root sign here,\\s*/i);
    if (match) return {{ prefix: "यहाँ मूलत्रिकोण में ", rest: raw.slice(match[0].length) }};
    match = raw.match(/^In its root sign in the (first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth),\\s*/i);
    if (match) return {{ prefix: `${{ORD[match[1].toLowerCase()]}} भाव की मूल राशि में `, rest: raw.slice(match[0].length) }};
    match = raw.match(/^In its root sign,\\s*/i);
    if (match) return {{ prefix: "मूल राशि में ", rest: raw.slice(match[0].length) }};
    match = raw.match(/^You are supported\\.\\s*/i);
    if (match) return {{ prefix: "आपको सहारा है। ", rest: raw.slice(match[0].length) }};
    match = raw.match(/^The mind is unsettled\\.\\s*/i);
    if (match) return {{ prefix: "मन अस्थिर है। ", rest: raw.slice(match[0].length) }};
    return null;
  }}

  function translateClause(text) {{
    const raw = String(text || "").replace(/\\s+/g, " ").trim();
    if (!raw) return "";
    const low = raw.toLowerCase();
    for (let i = 0; i < THEMES.length; i += 1) {{
      const theme = THEMES[i][0];
      const hindi = THEMES[i][1];
      const idx = low.indexOf(theme);
      if (idx < 0) continue;
      const templ = raw.slice(0, idx) + "{{T}}" + raw.slice(idx + theme.length);
      if (TEMPLATES[templ]) return TEMPLATES[templ].split("{{T}}").join(hindi);
    }}
    const plain = loose(raw);
    if (plain) return plain;
    const core = CORES[norm(raw)];
    if (core) return core;
    const wrapped = wrapPrefix(raw);
    if (wrapped) {{
      if (!wrapped.rest.trim()) return wrapped.prefix.trim();
      const inner = translateClause(wrapped.rest);
      if (inner) return `${{wrapped.prefix}}${{inner}}`;
    }}
    return ALIAS[norm(raw)] || "";
  }}

  function undoDignity(part) {{
    const trimmed = String(part || "").trim();
    const low = trimmed.toLowerCase();
    if (low.startsWith("gives you ")) return "You have " + trimmed.slice("gives you ".length);
    if (low.startsWith("may give you ")) return "You may have " + trimmed.slice("may give you ".length);
    return "";
  }}

  function cap(text) {{
    const trimmed = String(text || "").trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : "";
  }}

  function translatePart(part) {{
    return translateClause(part) || translateClause(cap(part)) || translateClause(undoDignity(part)) || "";
  }}

  function translateDignity(text) {{
    const match = String(text || "").match(/^(?:([^,]+),\\s*)?(exalted|debilitated)\\s+(Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Rahu|Ketu)\\s+([\\s\\S]+)$/i);
    if (!match) return "";
    const name = match[1] ? `${{match[1]}}, ` : "";
    const word = match[2].toLowerCase() === "debilitated" ? "नीच" : "उच्च";
    const parts = match[4].split(/(?<=[.!?])\\s+(?=[A-Za-z])/);
    const mapped = parts.map(translatePart);
    if (!mapped.length || mapped.some((item) => !item)) return "";
    return `${{name}}${{word}} ${{planetHi(match[3])}} ${{mapped.join(" ")}}`;
  }}

  function translateSitting(text) {{
    const raw = String(text || "").replace(/\\s+/g, " ").trim();
    if (!raw) return "";
    const whole = translateClause(raw);
    if (whole) return whole;
    const dignity = translateDignity(raw);
    if (dignity) return dignity;
    const parts = raw.split(/(?<=[.!?])\\s+(?=[A-Z])/);
    if (parts.length < 2) return "";
    const mapped = parts.map((part) => translateClause(part) || translateDignity(part));
    if (mapped.every(Boolean)) return mapped.join(" ");
    return "";
  }}

  const prev = I18N.chartText.bind(I18N);
  I18N.chartText = function chartTextWithSitting(value) {{
    if (!I18N.getLang || I18N.getLang() !== "hi") return prev(value);
    const text = value == null ? "" : String(value);
    const lead = (text.match(/^\\s*/) || [""])[0];
    const tail = (text.match(/\\s*$/) || [""])[0];
    const hit = translateSitting(text.trim());
    if (hit) return `${{lead}}${{hit}}${{tail}}`;
    return prev(value);
  }};
}})(window);
"""
    # The f-string above doubled braces for JS. Template placeholders in Python
    # were written as {{T}} which becomes {T} in the file. Verify quickly.
    OUT.write_text(body, encoding="utf-8")
    print("wrote", OUT, "bytes", OUT.stat().st_size)


def main() -> None:
    spoken, template_set, _unmatched = load_clauses()
    templates = {item: hi_template(item) for item in sorted(template_set)}
    missing_t = [key for key, value in templates.items() if not value]
    cores = _load_cores()
    failed = []
    latin = []
    for clause in sorted(spoken):
        hindi = translate_clause(clause, cores, templates)
        if not hindi:
            failed.append(clause)
            continue
        if re.search(r"[A-Za-z]{3,}", hindi):
            latin.append((clause, hindi))
    print("spoken", len(spoken))
    print("templates", len(templates), "missing", len(missing_t))
    print("failed", len(failed), "latin", len(latin))
    for row in missing_t[:20]:
        print("TPL", row)
    for row in failed[:30]:
        print("FAIL", row)
    if latin:
        Path(__file__).with_name("_latin_left.txt").write_text(
            "\n\n".join(f"{src}\n=> {hindi}" for src, hindi in latin),
            encoding="utf-8",
        )
    if missing_t or failed or latin:
        raise SystemExit(1)
    aliases: dict[str, str] = {}
    data = json.loads(DATA.read_text(encoding="utf-8"))

    def _leaves(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key in ("good", "bad") and isinstance(value, str):
                    yield value
                else:
                    yield from _leaves(value)

    for house in data["houses"]:
        for _planet_name, block in house["sitting_planet_effect"].items():
            for text in _leaves(block):
                spoken_text = _impact_sentence(text)
                raw_parts = [part.strip() for part in re.split(r"(?<=[.!?])\s+", text.strip()) if part.strip()]
                spoken_parts = [
                    part.strip() for part in re.split(r"(?<=[.!?])\s+", spoken_text.strip()) if part.strip()
                ]
                if len(raw_parts) != len(spoken_parts):
                    continue
                for raw_part, spoken_part in zip(raw_parts, spoken_parts):
                    hindi = translate_clause(spoken_part, cores, templates)
                    if not hindi or translate_clause(raw_part, cores, templates):
                        continue
                    aliases[raw_part.rstrip(".").lower()] = hindi
    ALIAS.update(aliases)
    if any(re.search(r"[A-Za-z]{3,}", value) for value in aliases.values()):
        raise SystemExit("alias hindi still has English")
    print("aliases", len(aliases))
    emit(cores, templates, aliases)


if __name__ == "__main__":
    main()
