// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Full Hindi for remedy paragraphs. Word-by-word swap is not used here.
 */
(function remedyI18n(global) {
  const I18N = global.SaptarishiI18n;
  if (!I18N) return;

  function keyOf(text) {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[—–]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  const PAIRS = [
    [
      "You have Pitru Dosha in your chart. It is a memory of ancestral duty, not a curse. You may see delays with children, repeating family strain, or progress that feels blocked despite honest work.",
      "आपकी कुंडली में पितृ दोष है। यह पूर्वजों के कर्तव्य की स्मृति है, शाप नहीं। संतान में देरी, परिवार में बार-बार तनाव, या ईमानदार परिश्रम के बावजूद रुकी हुई प्रगति दिख सकती है।"
    ],
    [
      "Sun with Rahu or Ketu, or 9th lord in 6/8/12",
      "सूर्य राहु या केतु के साथ है, अथवा नवमेश षष्ठ, अष्टम या द्वादश भाव में है।"
    ],
    [
      "Pitru Devata (ancestors), Lord Shiva, Lord Ganesha",
      "पितृ देवता (पूर्वज), भगवान शिव, भगवान गणेश"
    ],
    [
      "Pitru Paksha (Ashwin Krishna paksha) is the strongest time. Also Amavasya, especially Sarva Pitru Amavasya, and the ancestor's death tithi.",
      "पितृ पक्ष (आश्विन कृष्ण पक्ष) सबसे उपयुक्त समय है। अमावस्या भी, विशेषकर सर्वपितृ अमावस्या, तथा पूर्वज की मृत्यु-तिथि।"
    ],
    [
      "For Pitru Dosha shanti, the Chandra japa count is 0 and the Ketu japa count is 0. The shanti is Shraddha and Tarpan in Pitru Paksha, offering water and food to the ancestors, feeding crows, cows, and the needy in their memory, and serving living parents and elders. Plant and water a Peepal where you can. Pind daan at a tirtha such as Gaya is traditional when a priest can perform it.",
      "पितृ दोष की शांति में चंद्र-जप की संख्या 0 है और केतु-जप की संख्या 0 है। शांति है पितृ पक्ष में श्राद्ध और तर्पण: पूर्वजों को जल और भोजन देना, उनकी स्मृति में कौआ, गाय और जरूरतमंद को खिलाना, तथा जीवित माता-पिता और बड़ों की सेवा करना। जहाँ हो सके पीपल लगाएँ और उसे जल दें। जब पुरोहित संपन्न कर सकें, तब गया जैसे तीर्थ पर पिंडदान परंपरा है।"
    ],
    [
      "On every Amavasya (and other Pitru-related days), daan and helping someone in need are very important.",
      "प्रत्येक अमावस्या पर, और अन्य पितृ-संबंधी दिनों पर, दान तथा जरूरतमंद की सहायता बहुत महत्वपूर्ण है।"
    ],
    [
      "Donation need not be expensive—what matters is shraddha (faith and respect), sincerity, and helping someone who genuinely needs it.",
      "दान महँगा होना आवश्यक नहीं। महत्व श्रद्धा (विश्वास और सम्मान), सच्चाई, और सच में जरूरत वाले की सहायता का है।"
    ],
    [
      "Donate as per capacity: **rice (chawal), moong dal, green vegetables (hari sabzi)**, wheat flour (atta), fruits, jaggery (gud), **sesame seeds (til)**, and clothes.",
      "सामर्थ्य के अनुसार दान करें: **चावल, मूंग की दाल, हरी सब्जी**, गेहूँ का आटा, फल, गुड़, **तिल**, और वस्त्र।"
    ],
    [
      "**Give these to a Brahmin**, poor or needy person, elderly person, or anyone who genuinely needs food and support—prefer a genuinely hungry or needy person, and help with respect.",
      "**ये वस्तुएँ किसी ब्राह्मण को दें**, निर्धन या जरूरतमंद को, वृद्ध को, या जिसे सच में भोजन और सहारा चाहिए। भूखे या जरूरतमंद को प्राथमिकता दें, और सम्मान के साथ सहायता करें।"
    ],
    [
      "Traditional charity also includes feeding Brahmins and needy people, donating food and clothes, and offering sesame seeds.",
      "परंपरागत दान में ब्राह्मणों और जरूरतमंदों को भोजन कराना, भोजन और वस्त्र दान करना, तथा तिल अर्पित करना भी आता है।"
    ],
    [
      "Along with daan, offer Tarpan and remember ancestors with gratitude on Amavasya. **Annual Shraddha** is preferably on the ancestor death Tithi; if unknown, use Sarva Pitru Amavasya.",
      "दान के साथ अमावस्या पर तर्पण करें और कृतज्ञता से पूर्वजों का स्मरण करें। **वार्षिक श्राद्ध** पूर्वज की मृत्यु-तिथि पर उत्तम है; तिथि अज्ञात हो तो सर्वपितृ अमावस्या रखें।"
    ],
    [
      "Prefer Shraddha + Tarpan + Daan + Annadaan + remembrance of ancestors (with mantra as a supporting practice).",
      "श्राद्ध, तर्पण, दान, अन्नदान और पूर्वजों का स्मरण साथ रखें। मंत्र सहायक अभ्यास है।"
    ],
    [
      "Do without expecting immediate results—the purpose is respect for ancestors and help for those in need.",
      "तुरंत फल की आशा न करें। उद्देश्य पूर्वजों का सम्मान और जरूरतमंदों की सहायता है।"
    ],
    [
      "If a complicated puja is not possible, **start simply: every Amavasya remember ancestors**, offer Tarpan if you know the method, and feed or help someone who genuinely needs food.",
      "जटिल पूजा संभव न हो तो **सरल आरंभ करें: प्रत्येक अमावस्या पर पूर्वजों का स्मरण करें**, विधि आती हो तो तर्पण करें, और जिसे सच में भोजन चाहिए उसे खिलाएँ या सहायता करें।"
    ],
    [
      "This simple daan and seva with sincere shraddha is itself a meaningful Pitru remembrance.",
      "सच्ची श्रद्धा के साथ यह सरल दान और सेवा स्वयं सार्थक पितृ-स्मरण है।"
    ],
    [
      "ancestors (Pitru), father, mother, elders, and needy people",
      "पूर्वज (पितृ), पिता, माता, बड़े, और जरूरतमंद लोग"
    ],
    [
      "feed crows, cows, and the needy in memory of the ancestors",
      "पूर्वजों की स्मृति में कौआ, गाय और जरूरतमंद को खिलाएँ"
    ],
    [
      "pearl (moti) in silver on little finger; cat's eye (lehsunia) in silver on little finger (after consultation)",
      "चाँदी में मोती, कनिष्ठा अंगुली में; चाँदी में लहसुनिया, कनिष्ठा अंगुली में (परामर्श के बाद)"
    ],
    [
      "You have Mangal Dosha (Manglik) in your chart. You tend to be energetic, bold, and direct — qualities that serve you well in career and property matters. In marriage and close relationships, you may need extra patience; heated moments or delays in settling down are possible. Many Manglik natives lead successful, active lives.",
      "आपकी कुंडली में मंगल दोष (मांगलिक) है। आप ऊर्जावान, साहसी और सीधे होते हैं। ये गुण कर्म और संपत्ति में साथ देते हैं। विवाह और निकट संबंधों में अधिक धैर्य चाहिए; तीखे क्षण या बसने में देरी संभव है। अनेक मांगलिक सफल और सक्रिय जीवन जीते हैं।"
    ],
    [
      "Mangal Dosha is mainly discussed in connection with marriage and relationships. A person with Mangal Dosha is often called Mangalik and a strong Mars associated with Mangal Dosha can also give positive qualities, such as leadership, courage, determination, and the ability to take action.",
      "मंगल दोष मुख्यतः विवाह और संबंधों के संदर्भ में कहा जाता है। मंगल दोष वाले को प्रायः मांगलिक कहा जाता है। इससे जुड़ा प्रबल मंगल नेतृत्व, साहस, दृढ़ता और कार्य करने की क्षमता भी देता है।"
    ],
    [
      "Mars in sensitive houses from lagna 1/2/4/7/8/12",
      "लग्न से भाव 1, 2, 4, 7, 8 या 12 में मंगल।"
    ],
    [
      "You have Manglik Dosha in your chart. Married life can feel the heat of Mars — marriage may be delayed, or discord can follow it. Courage and drive remain strengths, and many people with this dosha build strong careers and homes once the sharper edges settle.",
      "आपकी कुंडली में मांगलिक दोष है। वैवाहिक जीवन में मंगल की तीव्रता रह सकती है। विवाह में देरी हो सकती है, या उसके बाद मतभेद। साहस और लगन शक्ति हैं, और तीखापन शांत होने पर अनेक लोग मजबूत कर्म और घर बनाते हैं।"
    ],
    [
      "Mars in 1/4/7/8/12",
      "भाव 1, 4, 7, 8 या 12 में मंगल।"
    ],
    [
      "You have Chandra-Manglik dosha in your chart. Your feelings run hot and fast — you react quickly, speak frankly, and rarely stay idle for long. This gives drive and initiative, but at home the same heat can show up as impulsive words or a tone that is harder than you intend.",
      "आपकी कुंडली में चंद्र-मांगलिक दोष है। भाव जल्दी और तीव्र उठते हैं। आप शीघ्र प्रतिक्रिया करते हैं, स्पष्ट बोलते हैं, और देर तक निष्क्रिय नहीं रहते। इससे पहल मिलती है, पर घर में वही तीव्रता अचानक शब्दों या इच्छित से कठोर स्वर में दिख सकती है।"
    ],
    [
      "Mars in 1/4/7/8/12 from the Moon",
      "चंद्र से भाव 1, 4, 7, 8 या 12 में मंगल।"
    ],
    [
      "You have Kemadruma Dosha in your chart. Emotional support can feel thin, and inner steadiness may take more effort than it does for others. Loneliness, uneven confidence, or a sense of having to manage feelings alone can show up, especially in quieter periods of life.",
      "आपकी कुंडली में केमद्रुम दोष है। भावनात्मक सहारा कम लग सकता है, और आंतरिक स्थिरता के लिए अधिक प्रयास चाहिए। एकाकीपन, असमान आत्मविश्वास, या भावों को अकेले सँभालने का अनुभव शांत काल में अधिक दिख सकता है।"
    ],
    [
      "no planet other than the Sun with the Moon or in the 2nd or 12th from the Moon; Rahu and Ketu are not counted",
      "चंद्र के साथ या चंद्र से द्वितीय अथवा द्वादश भाव में सूर्य के अतिरिक्त कोई ग्रह नहीं; राहु और केतु नहीं गिने जाते।"
    ],
    [
      "You have Surya Grahan Dosha in your chart. You may go through phases where self-confidence, health, or relations with your father and seniors feel tested. These periods often push you to rebuild your identity on a stronger foundation.",
      "आपकी कुंडली में सूर्य ग्रहण दोष है। ऐसे काल आ सकते हैं जब आत्मविश्वास, स्वास्थ्य, या पिता और वरिष्ठों से संबंध परीक्षा में हों। ये काल प्रायः पहचान को अधिक दृढ़ आधार पर फिर बनाने के लिए प्रेरित करते हैं।"
    ],
    [
      "Sun conjunct Rahu or Ketu",
      "सूर्य राहु या केतु के साथ युति में।"
    ],
    [
      "You have Chandra Grahan Dosha in your chart. Your mind and emotions are unusually deep and sensitive — you may experience worry, vivid imagination, or mood swings at times. The same sensitivity can make you intuitive, creative, or drawn to research and unconventional paths.",
      "आपकी कुंडली में चंद्र ग्रहण दोष है। मन और भाव असाधारण गहरे और संवेदनशील हैं। कभी चिंता, सजीव कल्पना या मनोदशा का बदलना हो सकता है। वही संवेदनशीलता अंतर्दृष्टि, रचना और शोध या अलग मार्ग की ओर ले जा सकती है।"
    ],
    [
      "Moon conjunct Rahu or Ketu",
      "चंद्र राहु या केतु के साथ युति में।"
    ],
    [
      "You have Shani Dosha in your chart. Life may feel heavy at times — delays, seriousness, health caution, or extra responsibility can mark your early and middle years. You are built for endurance; what you earn through honest labour tends to last, and respect and stability often arrive later in life.",
      "आपकी कुंडली में शनि दोष है। जीवन कभी भारी लग सकता है। देरी, गंभीरता, स्वास्थ्य की सावधानी या अतिरिक्त उत्तरदायित्व आरंभ और मध्य वर्षों में रह सकते हैं। आप सहन के लिए बने हैं। ईमानदार श्रम से अर्जित वस्तु टिकती है, और सम्मान तथा स्थिरता प्रायः जीवन में बाद में आते हैं।"
    ],
    [
      "Saturn in 1st, 8th, or 12th",
      "शनि प्रथम, अष्टम या द्वादश भाव में।"
    ],
    [
      "You have Guru Chandal Dosha in your chart. You may question traditional teachings, follow unusual gurus, or swing between great faith and doubt. This can lead to brilliant insight and wide influence — or to poor advice taken too easily.",
      "आपकी कुंडली में गुरु चांडाल दोष है। आप परंपरागत शिक्षा पर प्रश्न कर सकते हैं, असाधारण गुरु अपना सकते हैं, या गहरी श्रद्धा और संदेह के बीच झूल सकते हैं। इससे तीक्ष्ण अंतर्दृष्टि और व्यापक प्रभाव मिल सकता है, या आसानी से गलत सलाह भी।"
    ],
    [
      "Jupiter conjunct Rahu",
      "गुरु राहु के साथ युति में।"
    ],
    [
      "You have Guru Chandal Dosha by aspect. The pull is mixed guidance and unusual beliefs, and a mind that can turn that tension into original thought. You may question tradition, follow unusual teachers, or swing between faith and doubt.",
      "आपकी कुंडली में दृष्टि से गुरु चांडाल दोष है। मार्गदर्शन मिश्रित और मान्यताएँ असाधारण रहती हैं, और मन उस तनाव को मौलिक विचार में बदल सकता है। आप परंपरा पर प्रश्न कर सकते हैं, अलग गुरु अपना सकते हैं, या श्रद्धा और संदेह के बीच झूल सकते हैं।"
    ],
    [
      "Jupiter and Rahu in mutual aspect",
      "गुरु और राहु परस्पर दृष्टि में।"
    ],
    [
      "You have Angarak Dosha in your chart. Energy may refuse to move in a useful direction, and a stubborn streak can cause repeated losses, sudden anger, or conflict. The same fire can suit surgery, sports, engineering, police work, or bold enterprise.",
      "आपकी कुंडली में अंगारक दोष है। ऊर्जा उपयोगी दिशा में न चले, और हठ से बार-बार हानि, अचानक क्रोध या संघर्ष हो सकता है। वही अग्नि शल्य, खेल, अभियंत्रण, पुलिस कार्य या साहसिक उद्यम के अनुकूल हो सकती है।"
    ],
    [
      "Mars conjunct Rahu, or Mars conjunct Ketu",
      "मंगल राहु के साथ, अथवा मंगल केतु के साथ युति में।"
    ],
    [
      "You have Angarak Dosha by aspect. The heat shows as sudden anger, conflict, and a force that needs a direction. The same intensity can become skill when it has a clear purpose.",
      "आपकी कुंडली में दृष्टि से अंगारक दोष है। तीव्रता अचानक क्रोध, संघर्ष, और दिशा माँगने वाले बल के रूप में दिखती है। स्पष्ट उद्देश्य मिलने पर वही तीव्रता कौशल बन सकती है।"
    ],
    [
      "Mars and Rahu in mutual aspect",
      "मंगल और राहु परस्पर दृष्टि में।"
    ],
    [
      "You have Kaal Sarp Dosha in your chart. Your life may feel marked by sharp turns — sudden rises, unexpected falls, family complications, or recurring obstacles that test your faith. Many people with this dosha achieve great things through persistence.",
      "आपकी कुंडली में काल सर्प दोष है। जीवन में तीखे मोड़ लग सकते हैं: अचानक उत्थान, अनपेक्षित पतन, पारिवारिक जटिलता, या श्रद्धा की परीक्षा लेने वाली बाधाएँ। इस दोष वाले अनेक लोग दृढ़ता से बड़ी सिद्धि करते हैं।"
    ],
    [
      "seven planets between the Rahu–Ketu axis",
      "राहु-केतु अक्ष के बीच सात ग्रह।"
    ],
    [
      "You have Anant Kaal Sarp Dosha. This type colours self, health, and personality versus marriage and partnerships. You may feel pulled between independence and relationship demands, or notice delays and tests in close bonds.",
      "आपकी कुंडली में अनंत काल सर्प दोष है। यह प्रकार आत्म, स्वास्थ्य और व्यक्तित्व को विवाह तथा साझेदारी के सामने रखता है। स्वतंत्रता और संबंधों की माँग के बीच खिंचाव, या निकट बंधनों में देरी और परीक्षा हो सकती है।"
    ],
    [
      "You have Kulik Kaal Sarp Dosha. This type colours family, speech, and wealth versus longevity, inheritance, and sudden events. Money, family talk, or in-law matters may swing sharply; words can heal or wound more than you expect.",
      "आपकी कुंडली में कुलिक काल सर्प दोष है। यह प्रकार परिवार, वाणी और धन को आयु, विरासत और अचानक घटनाओं के सामने रखता है। धन, पारिवारिक बात या ससुराल के विषय तीव्र रूप से बदल सकते हैं; वचन अपेक्षा से अधिक जोड़ या घाव कर सकते हैं।"
    ],
    [
      "You have Vasuki Kaal Sarp Dosha. This type colours courage, siblings, and effort versus fortune, father, and dharma. You may work hard yet feel luck or a father's blessing arrives late; siblings and short journeys can be mixed.",
      "आपकी कुंडली में वासुकि काल सर्प दोष है। यह प्रकार साहस, भाई-बहन और प्रयास को भाग्य, पिता और धर्म के सामने रखता है। परिश्रम के बाद भी भाग्य या पिता का आशीर्वाद देर से लग सकता है; भाई-बहन और अल्प यात्रा मिश्रित रह सकते हैं।"
    ],
    [
      "You have Shankhpal Kaal Sarp Dosha. This type colours home, mother, and property versus career and public standing. Peace at home and progress at work may not arrive together; property or a mother's health can need extra care.",
      "आपकी कुंडली में शंखपाल काल सर्प दोष है। यह प्रकार घर, माता और संपत्ति को कर्म तथा सार्वजनिक प्रतिष्ठा के सामने रखता है। घर की शांति और कार्य की प्रगति साथ न आएँ; संपत्ति या माता के स्वास्थ्य को अतिरिक्त ध्यान चाहिए।"
    ],
    [
      "You have Padma Kaal Sarp Dosha. This type colours children, intellect, and romance versus gains and social networks. Studies, love, or children may bring intense lessons; friendships and income can rise and fall with your hopes.",
      "आपकी कुंडली में पद्म काल सर्प दोष है। यह प्रकार संतान, बुद्धि और प्रेम को लाभ तथा सामाजिक मंडली के सामने रखता है। अध्ययन, प्रेम या संतान गहन पाठ दे सकते हैं; मित्रता और आय आशा के साथ बढ़ और घट सकती है।"
    ],
    [
      "You have Mahapadma Kaal Sarp Dosha. This type colours enemies, health, and service versus expenses, foreign lands, and losses. Legal, health, or debt struggles can appear, yet so can victory through service and time spent abroad.",
      "आपकी कुंडली में महापद्म काल सर्प दोष है। यह प्रकार शत्रु, स्वास्थ्य और सेवा को व्यय, विदेश और हानि के सामने रखता है। विधि, स्वास्थ्य या ऋण का संघर्ष हो सकता है, और सेवा तथा विदेश-वास से विजय भी।"
    ],
    [
      "You have Takshak Kaal Sarp Dosha. This type colours marriage and partnerships versus self and identity. A spouse, business partners, or public dealings may dominate the story, and it is easy to lose yourself in the other person.",
      "आपकी कुंडली में तक्षक काल सर्प दोष है। यह प्रकार विवाह और साझेदारी को आत्म तथा पहचान के सामने रखता है। जीवनसाथी, व्यापारिक साझी या सार्वजनिक व्यवहार कथा पर हावी हो सकते हैं, और दूसरे में स्वयं को खोना आसान है।"
    ],
    [
      "You have Karkotak Kaal Sarp Dosha. This type colours sudden changes, the occult, and longevity versus family wealth and speech. Inheritance, hidden matters, or crises can reshape family money, and speech around in-laws or joint assets carries extra weight.",
      "आपकी कुंडली में कर्कोटक काल सर्प दोष है। यह प्रकार अचानक परिवर्तन, गुप्त विद्या और आयु को पारिवारिक धन तथा वाणी के सामने रखता है। विरासत, छिपे विषय या संकट पारिवारिक धन को बदल सकते हैं, और ससुराल या संयुक्त संपत्ति पर वचन का भार अधिक है।"
    ],
    [
      "You have Shankhachood Kaal Sarp Dosha. This type colours fortune, father, and higher learning versus effort, siblings, and courage. Faith, luck, or a father's blessing may feel delayed while every step still has to be fought for.",
      "आपकी कुंडली में शंखचूड़ काल सर्प दोष है। यह प्रकार भाग्य, पिता और उच्च विद्या को प्रयास, भाई-बहन और साहस के सामने रखता है। श्रद्धा, भाग्य या पिता का आशीर्वाद देर से लग सकता है, जबकि हर कदम अभी भी संघर्ष माँगता है।"
    ],
    [
      "You have Ghatak Kaal Sarp Dosha. This type colours career ambition and reputation versus home and emotional peace. Public life can be intense — status, bosses, and vocation — while the heart and home feel restless.",
      "आपकी कुंडली में घातक काल सर्प दोष है। यह प्रकार कर्म की महत्वाकांक्षा और कीर्ति को घर तथा मानसिक शांति के सामने रखता है। सार्वजनिक जीवन तीव्र हो सकता है, पद, अधिकारी और वृत्ति, जबकि मन और घर अशांत लगें।"
    ],
    [
      "You have Vishdhar Kaal Sarp Dosha. This type colours gains and desires versus children, creativity, and speculation. Income, networks, and wishes can swell, then disappoint; children or romance may need extra patience.",
      "आपकी कुंडली में विषधर काल सर्प दोष है। यह प्रकार लाभ और इच्छा को संतान, रचना और सट्टे के सामने रखता है। आय, मंडली और इच्छाएँ बढ़कर निराश कर सकती हैं; संतान या प्रेम में अतिरिक्त धैर्य चाहिए।"
    ],
    [
      "You have Sheshnag Kaal Sarp Dosha. This type colours expenses, sleep, and isolation versus health, debts, and daily struggle. Foreign lands, hospitals, or solitude may mark the path; hidden enemies and expenses need watching.",
      "आपकी कुंडली में शेषनाग काल सर्प दोष है। यह प्रकार व्यय, निद्रा और एकांत को स्वास्थ्य, ऋण और दैनिक संघर्ष के सामने रखता है। विदेश, चिकित्सालय या एकांत मार्ग चिह्नित कर सकते हैं; गुप्त शत्रु और व्यय पर ध्यान चाहिए।"
    ],
    [
      "You have Gandmool (Sataisa) in your chart. Tradition links this with struggle for the native and strain for the parents, often felt up to about the 28th year, and with a sharper life path later. This is not a curse; many accomplished people are born under it.",
      "आपकी कुंडली में गंडमूल (सत्ताईसा) है। परंपरा इसे जातक के संघर्ष और माता-पिता के तनाव से जोड़ती है, प्रायः लगभग 28वें वर्ष तक, और बाद में अधिक स्पष्ट जीवन-पथ से। यह शाप नहीं है; अनेक सिद्ध व्यक्ति इसी में जन्मे हैं।"
    ],
    [
      "Moon in Ashwini, Ashlesha, Magha, Jyeshtha, Mula, or Revati (Gandmool / Sataisa nakshatras)",
      "चंद्र अश्विनी, आश्लेषा, मघा, ज्येष्ठा, मूल या रेवती में (गंडमूल / सत्ताईसा नक्षत्र)।"
    ],
    [
      "You have Vish Dosha in your chart. You tend to feel life deeply and seriously — loneliness, delay in marriage, or heavy family duty may touch you at times. This also gives emotional maturity, loyalty, and the ability to endure what others cannot.",
      "आपकी कुंडली में विष दोष है। आप जीवन को गहरा और गंभीर अनुभव करते हैं। एकाकीपन, विवाह में देरी, या भारी पारिवारिक कर्तव्य कभी छू सकते हैं। इससे भावनात्मक परिपक्वता, निष्ठा, और वह सहनशक्ति भी मिलती है जो दूसरों के लिए कठिन है।"
    ],
    [
      "Moon conjunct Saturn",
      "चंद्र शनि के साथ युति में।"
    ],
    [
      "You have Shakat Dosha in your chart. Stability is hard to hold: early success in work can be followed by a sudden decline, and the reward often stays smaller than the effort. Progress tends to return after a long stretch of uneven fortune.",
      "आपकी कुंडली में शकट दोष है। स्थिरता टिकना कठिन है। कार्य में आरंभिक सफलता के बाद अचानक गिरावट आ सकती है, और फल प्रायः परिश्रम से छोटा रहता है। असमान भाग्य की लंबी अवधि के बाद प्रगति लौटती है।"
    ],
    [
      "Moon in 6/8/12 from Jupiter",
      "गुरु से षष्ठ, अष्टम या द्वादश भाव में चंद्र।"
    ],
    [
      "You have Andhak Dosha in your chart. Goals can stay hard to see: much effort, little arrival. Head, eyes, heart, and the bond with the father may also feel the weight.",
      "आपकी कुंडली में अंधक दोष है। लक्ष्य देखना कठिन रह सकता है: अधिक परिश्रम, कम प्राप्ति। सिर, नेत्र, हृदय, और पिता से संबंध भी भार अनुभव कर सकते हैं।"
    ],
    [
      "Sun conjunct Saturn",
      "सूर्य शनि के साथ युति में।"
    ],
    [
      "You have Shapit Dosha in your chart. It is read as an old karmic lesson, not a punishment. Delays, pressure, and situations that linger can weigh on work, health, or peace of mind.",
      "आपकी कुंडली में शपित दोष है। इसे दंड नहीं, पुराना कर्म-पाठ माना जाता है। देरी, दबाव, और देर तक टिके विषय कर्म, स्वास्थ्य या मानसिक शांति पर भार डाल सकते हैं।"
    ],
    [
      "Saturn conjunct Rahu",
      "शनि राहु के साथ युति में।"
    ],
    [
      "You have Shapit Dosha by aspect. It is read as an old karmic lesson, not a punishment. Delays, pressure, and situations that linger can weigh on work, health, or peace of mind.",
      "आपकी कुंडली में दृष्टि से शपित दोष है। इसे दंड नहीं, पुराना कर्म-पाठ माना जाता है। देरी, दबाव, और देर तक टिके विषय कर्म, स्वास्थ्य या मानसिक शांति पर भार डाल सकते हैं।"
    ],
    [
      "Saturn and Rahu in mutual aspect",
      "शनि और राहु परस्पर दृष्टि में।"
    ],
    [
      "You have Shani-Ketu Arisht in your chart. Life can bring bondage-like situations, sudden breaks, or the need for surgery. Restriction and detachment often arrive together, and the weight is felt most in health, work, or freedom of movement.",
      "आपकी कुंडली में शनि-केतु अरिष्ट है। जीवन में बंधन जैसी स्थिति, अचानक विच्छेद, या शल्य की आवश्यकता आ सकती है। रोक और विरक्ति प्रायः साथ आते हैं, और भार स्वास्थ्य, कर्म या गति की स्वतंत्रता में सबसे अधिक लगता है।"
    ],
    [
      "Saturn conjunct Ketu",
      "शनि केतु के साथ युति में।"
    ]
  ];

  const MAP = new Map(PAIRS.map(([en, hi]) => [keyOf(en), hi]));

  const LABELS = {
    sun: "सूर्य",
    surya: "सूर्य",
    "sun god": "सूर्य",
    "surya (sun god)": "सूर्य",
    moon: "चंद्र",
    chandra: "चंद्र",
    mars: "मंगल",
    mangal: "मंगल",
    mercury: "बुध",
    budha: "बुध",
    jupiter: "गुरु",
    brihaspati: "बृहस्पति",
    venus: "शुक्र",
    shukra: "शुक्र",
    saturn: "शनि",
    shani: "शनि",
    rahu: "राहु",
    ketu: "केतु",
    "surya graha": "सूर्य ग्रह",
    "surya graha mantra": "सूर्य ग्रह मंत्र",
    "surya graha beej mantra": "सूर्य ग्रह बीज मंत्र",
    "chandra graha": "चंद्र ग्रह",
    "chandra graha mantra": "चंद्र ग्रह मंत्र",
    "chandra graha beej mantra": "चंद्र ग्रह बीज मंत्र",
    "mangal graha": "मंगल ग्रह",
    "mangal graha mantra": "मंगल ग्रह मंत्र",
    "mangal graha beej mantra": "मंगल ग्रह बीज मंत्र",
    "budha graha": "बुध ग्रह",
    "budha graha mantra": "बुध ग्रह मंत्र",
    "budha graha beej mantra": "बुध ग्रह बीज मंत्र",
    "brihaspati graha": "बृहस्पति ग्रह",
    "brihaspati graha mantra": "बृहस्पति ग्रह मंत्र",
    "brihaspati graha beej mantra": "बृहस्पति ग्रह बीज मंत्र",
    guru: "गुरु",
    aspect: "दृष्टि",
    "guru graha": "गुरु ग्रह",
    "guru graha mantra": "गुरु ग्रह मंत्र",
    "shukra graha": "शुक्र ग्रह",
    "shukra graha mantra": "शुक्र ग्रह मंत्र",
    "shukra graha beej mantra": "शुक्र ग्रह बीज मंत्र",
    "shani graha": "शनि ग्रह",
    "shani graha mantra": "शनि ग्रह मंत्र",
    "shani graha beej mantra": "शनि ग्रह बीज मंत्र",
    "rahu graha": "राहु ग्रह",
    "rahu graha mantra": "राहु ग्रह मंत्र",
    "rahu graha beej mantra": "राहु ग्रह बीज मंत्र",
    "ketu graha": "केतु ग्रह",
    "ketu graha mantra": "केतु ग्रह मंत्र",
    "ketu graha beej mantra": "केतु ग्रह बीज मंत्र",
    "mangal dosha": "मंगल दोष",
    "mangal dosha (manglik)": "मंगल दोष (मांगलिक)",
    "manglik dosha": "मांगलिक दोष",
    "manglik": "मांगलिक दोष",
    "chandra-manglik dosha": "चंद्र-मांगलिक दोष",
    "kemadruma dosha": "केमद्रुम दोष",
    "surya grahan dosha": "सूर्य ग्रहण दोष",
    "chandra grahan dosha": "चंद्र ग्रहण दोष",
    "pitru dosha": "पितृ दोष",
    "shani dosha": "शनि दोष",
    "guru chandal dosha": "गुरु चांडाल दोष",
    "angarak dosha": "अंगारक दोष",
    "kaal sarp dosha": "काल सर्प दोष",
    "gandmool": "गंडमूल",
    "vish dosha": "विष दोष",
    "shakat dosha": "शकट दोष",
    "andhak dosha": "अंधक दोष",
    "shapit dosha": "शपित दोष",
    "shani-ketu arisht": "शनि-केतु अरिष्ट",
    "lord ganesha mantra": "भगवान गणेश का मंत्र",
    "nag gayatri": "नाग गायत्री",
    "sarpa sukta": "सर्प सूक्त",
    "hanuman chalisa": "हनुमान चालीसा",
    "durga saptashati": "दुर्गा सप्तशती",
    "mahamrityunjaya mantra": "महामृत्युंजय मंत्र",
    "laghu mrityunjaya mantra": "लघु मृत्युंजय मंत्र",
    anant: "अनंत",
    kulik: "कुलिक",
    vasuki: "वासुकि",
    shankhpal: "शंखपाल",
    shankhapal: "शंखपाल",
    padma: "पद्म",
    padam: "पद्म",
    mahapadma: "महापद्म",
    mahapadam: "महापद्म",
    takshak: "तक्षक",
    karkotak: "कर्कोटक",
    shankhachood: "शंखचूड़",
    shankachood: "शंखचूड़",
    ghatak: "घातक",
    patak: "पातक",
    vishdhar: "विषधर",
    vishadhara: "विषधर",
    sheshnag: "शेषनाग",
    "shesh naag": "शेषनाग"
  };

  const DAYS = {
    sunday: "रविवार",
    monday: "सोमवार",
    tuesday: "मंगलवार",
    wednesday: "बुधवार",
    thursday: "गुरुवार",
    friday: "शुक्रवार",
    saturday: "शनिवार"
  };

  const NAK = {
    ashwini: "अश्विनी",
    magha: "मघा",
    mula: "मूल",
    moola: "मूल",
    ashlesha: "आश्लेषा",
    jyeshtha: "ज्येष्ठा",
    jyestha: "ज्येष्ठा",
    revati: "रेवती",
    "this nakshatra": "इस नक्षत्र"
  };

  function nakHi(name) {
    const key = String(name || "").trim().toLowerCase();
    return NAK[key] || String(name || "").trim();
  }

  function labelHi(raw) {
    let text = String(raw || "").trim().replace(/\s+/g, " ");
    let aspect = false;
    if (/ by aspect$/i.test(text)) {
      aspect = true;
      text = text.replace(/ by aspect$/i, "");
    }
    text = text.replace(/^the planet /i, "").replace(/^the /i, "");
    const hit = LABELS[text.toLowerCase()];
    if (!hit) return null;
    return aspect ? `दृष्टि से ${hit}` : hit;
  }

  function dayHi(name) {
    return DAYS[String(name || "").trim().toLowerCase()] || null;
  }

  function doshName(value) {
    const text = String(value || "").trim();
    if (I18N.getLang() !== "hi") return text;
    const whole = labelHi(text);
    if (whole) return whole;
    const typed = text.match(/^(.+?) \(([^)]+)\)$/);
    if (typed) {
      const base = labelHi(typed[1]);
      const type = labelHi(typed[2]);
      if (base && type) return `${base} (${type})`;
      if (base) return base;
    }
    return text;
  }

  function pacifyHi(clause) {
    let text = String(clause || "").replace(/\.$/, "").trim();
    text = text.replace(/ in my horoscope$/i, "");
    let effects = false;
    if (/^the inauspicious effects of /i.test(text)) {
      effects = true;
      text = text.replace(/^the inauspicious effects of /i, "");
    }
    text = text.replace(/^the planet /i, "").replace(/^the /i, "");
    const name = labelHi(text);
    if (!name) return null;
    return effects
      ? `अपनी सामर्थ्य के अनुसार, अपनी कुंडली में ${name} के अशुभ प्रभाव को शांत करने के लिए।`
      : `अपनी सामर्थ्य के अनुसार, अपनी कुंडली में ${name} को शांत करने के लिए।`;
  }

  function chantPiece(piece) {
    const text = String(piece || "").trim().replace(/\.$/, "");
    let match = text.match(/^(?:the )?(.+?) mantra ([\d,]+) times(?: with havan)?$/i);
    if (match) {
      const name = labelHi(match[1]);
      if (!name) return null;
      return `${name} मंत्र ${match[2].replace(/~/g, "")} बार`;
    }
    match = text.match(/^(?:the )?(Nag Gayatri|Sarpa Sukta|Hanuman Chalisa|Durga Saptashati) ([\d,]+) times$/i);
    if (match) {
      const name = labelHi(match[1]);
      return name ? `${name} ${match[2]} बार` : null;
    }
    return null;
  }

  function chantList(body) {
    const parts = String(body || "")
      .replace(/\.$/, "")
      .split(/,\s+(?:and\s+)?|\s+and\s+/);
    const hi = parts.map(chantPiece);
    if (!parts.length || hi.some((part) => !part)) return null;
    return hi.join(", ");
  }

  function whenHi(planet, withPlanet, chant) {
    const a = labelHi(planet);
    const b = labelHi(withPlanet);
    const rest = chantPiece(chant) || chantList(chant);
    if (!a || !b || !rest) return null;
    return `जब ${a} ${b} के साथ हो, तब ${rest} भी जपें।`;
  }

  function quoteChant(quote, tail) {
    const extra = String(tail || "").trim().replace(/\.$/, "");
    let when = "";
    let count = "";
    let match = extra.match(/^on (\w+)(?: evening| morning)? until ([\d,]+)$/i);
    if (match) {
      const day = dayHi(match[1]);
      if (!day) return null;
      when = `${day} को `;
      count = match[2];
    } else if ((match = extra.match(/^at sunrise on (\w+) until ([\d,]+)$/i))) {
      const day = dayHi(match[1]);
      if (!day) return null;
      when = `${day} को सूर्योदय पर `;
      count = match[2];
    } else if ((match = extra.match(/^the same way(?:,)? for a total of ([\d,]+)$/i))) {
      count = match[1];
    } else if ((match = extra.match(/^the same way on (\w+) evening, for a total of ([\d,]+)$/i))) {
      const day = dayHi(match[1]);
      if (!day) return null;
      when = `${day} की संध्या को उसी विधि से `;
      count = match[2];
    } else if ((match = extra.match(/^until ([\d,]+)$/i))) {
      count = match[1];
    } else {
      return null;
    }
    return `${when}"${quote}" का जप ${count} बार करें।`;
  }

  function proceedHi(rest) {
    const text = String(rest || "").trim().replace(/\.$/, "");
    let match = text.match(/^the above (.+?) mantra(.*)$/i);
    if (match) {
      const name = labelHi(match[1]);
      if (!name) return null;
      const extra = proceedExtra(match[2]);
      if (match[2].trim() && extra == null) return null;
      return `फिर उपर्युक्त ${name} मंत्र का जप करें${extra || ""}।`;
    }
    match = text.match(/^the (Guru|Shani|Chandra|Surya|Mangal|Rahu|Ketu) mantra(.*)$/i);
    if (match) {
      const name = labelHi(match[1]);
      if (!name) return null;
      const extra = proceedExtra(match[2]);
      if (match[2].trim() && extra == null) return null;
      return `फिर ${name} मंत्र का जप करें${extra || ""}।`;
    }
    match = text.match(/^the mantra for (?:the planet )?(.+)$/i);
    if (match) {
      const name = labelHi(match[1]);
      if (!name) return null;
      return `फिर ${name} का मंत्र जपें।`;
    }
    match = text.match(/^the Moon, best on Monday evening near moonrise$/i);
    if (match) return "फिर चंद्र का मंत्र जपें, सोमवार संध्या चंद्रोदय के निकट उत्तम है।";
    return null;
  }

  function proceedExtra(extra) {
    const text = String(extra || "").trim().replace(/^,/, "").trim();
    if (!text) return "";
    const known = {
      "at sunrise, facing east (best on sunday)": " सूर्योदय पर, पूर्व की ओर (रविवार उत्तम है)",
      "on tuesday morning, facing east": " मंगलवार प्रातः, पूर्व की ओर",
      "on thursday morning, facing east": " गुरुवार प्रातः, पूर्व की ओर",
      "on thursday morning": " गुरुवार प्रातः",
      "on monday evening near moonrise": " सोमवार संध्या चंद्रोदय के निकट",
      "on saturday at dusk, facing west": " शनिवार संध्या, पश्चिम की ओर",
      "on saturday at dusk": " शनिवार संध्या",
      "on saturday evening": " शनिवार की संध्या"
    };
    return Object.prototype.hasOwnProperty.call(known, text.toLowerCase()) ? known[text.toLowerCase()] : null;
  }

  function patternOne(text) {
    const line = String(text || "").trim();
    if (!line) return null;
    const direct = MAP.get(keyOf(line));
    if (direct != null) return direct;

    if (DAYS[line.toLowerCase()]) return DAYS[line.toLowerCase()];

    let match = line.match(/^To the best of my ability, in order to pacify (.+)$/i);
    if (match) return pacifyHi(match[1]);

    match = line.match(/^For (.+?) shanti, chant (.+)$/i);
    if (match) {
      const name = labelHi(match[1]);
      let body = match[2].replace(/\.$/, "");
      const havan = /\s+with havan$/i.test(body);
      body = body.replace(/\s+with havan$/i, "");
      const list = chantList(body);
      if (name && list) return `${name} की शांति के लिए ${list}${havan ? " हवन सहित" : ""} जपें।`;
    }

    match = line.match(/^For (.+?), chant (.+)$/i);
    if (match) {
      const name = labelHi(match[1]);
      const list = chantList(match[2].replace(/\.$/, ""));
      if (name && list) return `${name} के लिए ${list} जपें।`;
    }

    match = line.match(/^When (.+?) is with (.+?), also chant (.+)$/i);
    if (match) return whenHi(match[1], match[2], match[3]);

    match = line.match(/^If (.+?) is with (.+?), also chant "([^"]+)" the same way(?: on (\w+) evening)?, for a total of ([\d,]+)\.?$/i);
    if (match) {
      const a = labelHi(match[1]);
      const b = labelHi(match[2]);
      const day = match[4] ? dayHi(match[4]) : "";
      if (!a || !b || (match[4] && !day)) return null;
      const when = day ? `${day} की संध्या को ` : "";
      return `यदि ${a} ${b} के साथ हो, तो ${when}उसी विधि से "${match[3]}" का जप कुल ${match[5]} बार करें।`;
    }

    match = line.match(/^If (.+?) is with (.+?), also chant "([^"]+)" as above on (\w+) evening\.?$/i);
    if (match) {
      const a = labelHi(match[1]);
      const b = labelHi(match[2]);
      const day = dayHi(match[4]);
      if (!a || !b || !day) return null;
      return `यदि ${a} ${b} के साथ हो, तो ${day} की संध्या को ऊपर की विधि से "${match[3]}" का जप भी करें।`;
    }

    match = line.match(/^If (.+?) is with (.+?), also chant "([^"]+)" on (\w+) or (\w+)\.?$/i);
    if (match) {
      const a = labelHi(match[1]);
      const b = labelHi(match[2]);
      const day1 = dayHi(match[4]);
      const day2 = dayHi(match[5]);
      if (!a || !b || !day1 || !day2) return null;
      return `यदि ${a} ${b} के साथ हो, तो ${day1} या ${day2} को "${match[3]}" का जप भी करें।`;
    }

    match = line.match(/^Also chant "([^"]+)" (.+)$/i);
    if (match) return quoteChant(match[1], match[2]);

    match = line.match(/^Also recite the (.+?)(?: on (\w+))?\.?$/i);
    if (match) {
      const name = labelHi(match[1]);
      if (!name) return null;
      const day = match[2] ? dayHi(match[2]) : "";
      if (match[2] && !day) return null;
      return day ? `${day} को ${name} का पाठ भी करें।` : `${name} का पाठ भी करें।`;
    }

    match = line.match(/^Also offer the (.+?) in the same sankalpa\.?$/i);
    if (match) {
      const rebuilt = chantList(match[1]);
      if (!rebuilt) return null;
      return `उसी संकल्प में ${rebuilt} भी अर्पित करें।`;
    }

    match = line.match(/^Also worship Lord Shiva with a Monday abhishek, and chant the Mahamrityunjaya mantra \(Om Tryambakam Yajamahe\) along with the Rahu and Ketu practice\.?$/i);
    if (match) {
      return "सोमवार को भगवान शिव का अभिषेक भी करें, और राहु-केतु के अभ्यास के साथ महामृत्युंजय मंत्र (Om Tryambakam Yajamahe) का जप करें।";
    }

    match = line.match(/^For personal daily japa of ([^:]+): take a little water in the right hand and take sankalpa-?$/i);
    if (match) {
      const name = labelHi(match[1]);
      if (!name) return null;
      return `${name} के नित्य जप के लिए दाहिने हाथ में थोड़ा जल लेकर संकल्प करें।`;
    }

    match = line.match(/^Take a little water in the right hand and take sankalpa:\s*(.+)$/i);
    if (match) {
      const rest = patternOne(match[1]);
      return rest ? `दाहिने हाथ में थोड़ा जल लेकर संकल्प करें: ${rest}` : null;
    }

    match = line.match(/^I, Your name, am beginning the daily chanting of the (.+?)-"([^"]+)"-?(.*)$/i);
    if (match) {
      const name = labelHi(match[1]);
      if (!name) return null;
      const tail = String(match[3] || "").trim();
      let hi = `मैं, आपका नाम, ${name} का नित्य जप आरंभ कर रहा हूँ-"${match[2]}"-`;
      if (!tail) return hi;
      const more = patternOne(tail.charAt(0).toUpperCase() + tail.slice(1));
      return more ? `${hi} ${more}` : null;
    }

    match = line.match(/^After this, release the water held in your hand\.?$/i);
    if (match) return "इसके बाद हाथ का जल छोड़ दें।";

    match = line.match(/^After this, release the water and first chant one full rosary \(mala\) of "([^"]+)", then proceed with (.+)$/i);
    if (match) {
      const next = proceedHi(match[2]);
      if (!next) return null;
      return `इसके बाद जल छोड़ें और पहले "${match[1]}" की एक पूरी माला जपें, ${next}`;
    }

    match = line.match(/^After this, release the water and first chant one full rosary \(mala\) of "([^"]+)", then proceed\.?$/i);
    if (match) return `इसके बाद जल छोड़ें और पहले "${match[1]}" की एक पूरी माला जपें, फिर आगे बढ़ें।`;

    match = line.match(/^First chant one full rosary \(mala\) of the Lord Ganesha mantra-"([^"]+)"-after which you may proceed to chant the mantra for (.+?)\.?$/i);
    if (match) {
      let target = match[2].replace(/\.$/, "");
      let note = "";
      const best = target.match(/^(.*?), best on monday evening near moonrise$/i);
      if (best) {
        target = best[1];
        note = ", सोमवार संध्या चंद्रोदय के निकट उत्तम है";
      }
      const name = labelHi(target);
      if (!name) return null;
      return `पहले भगवान गणेश के मंत्र की एक पूरी माला जपें-"${match[1]}"-फिर ${name} का मंत्र जपें${note}।`;
    }

    match = line.match(/^You have Gandmool \(Sataisa\) in your chart\. The Moon at birth was in (.+)\. Tradition links this with struggle for the native and strain for the parents, often felt up to about the 28th year, and with a sharper life path later\. This is not a curse; many accomplished people are born in these stars\.?$/i);
    if (match) {
      return `आपकी कुंडली में गंडमूल (सत्ताईसा) है। जन्म के समय चंद्र ${nakHi(match[1])} में था। परंपरा इसे जातक के संघर्ष और माता-पिता के तनाव से जोड़ती है, प्रायः लगभग 28वें वर्ष तक, और बाद में अधिक स्पष्ट जीवन-पथ से। यह शाप नहीं है; अनेक सिद्ध व्यक्ति इन्हीं नक्षत्रों में जन्मे हैं।`;
    }

    match = line.match(/^People generally do the puja on the 27th day after birth\. If it was not done then, it can be done when the Moon next transits (.+?)(?: again)?\. Weekly: Wednesday for Mercury stars \(Ashlesha, Jyeshtha, Revati\); Tuesday for Ketu stars \(Ashwini, Magha, Mula\)\.?$/i);
    if (match) {
      return `पूजा सामान्यतः जन्म के 27वें दिन की जाती है। तब न हुई हो तो जब चंद्र फिर ${nakHi(match[1])} में आए, तब की जा सकती है। साप्ताहिक: बुध नक्षत्र (आश्लेषा, ज्येष्ठा, रेवती) के लिए बुधवार; केतु नक्षत्र (अश्विनी, मघा, मूल) के लिए मंगलवार।`;
    }

    match = line.match(/^People generally do the Gandmool \/ Sataisa puja on the 27th day after birth\. If it was not done then, it can be done later whenever the Moon transits (.+?) again\.?$/i);
    if (match) {
      return `गंडमूल / सत्ताईसा की पूजा सामान्यतः जन्म के 27वें दिन की जाती है। तब न हुई हो तो बाद में जब भी चंद्र फिर ${nakHi(match[1])} में आए, तब की जा सकती है।`;
    }

    return null;
  }

  function patternRemedy(text) {
    const whole = patternOne(text);
    if (whole) return whole;
    const bits = String(text || "").split(/(?<=\.)\s+(?=[A-Z])/);
    if (bits.length < 2) return null;
    const hi = bits.map((bit) => patternOne(bit));
    if (hi.some((part) => !part)) return null;
    return hi.join(" ");
  }

  function remedyText(value) {
    const text = value == null ? "" : String(value);
    if (I18N.getLang() !== "hi") return text;
    const keyed = keyOf(text.replace(/^(?:Rule|Desc):\s*/i, ""));
    const hit = MAP.get(keyed);
    if (hit != null) return hit;
    return patternRemedy(keyed) || text;
  }

  I18N.doshName = doshName;

  I18N.remedyText = remedyText;
})(window);
