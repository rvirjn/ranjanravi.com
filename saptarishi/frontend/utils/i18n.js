// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * English / Hindi UI strings. Chart write-ups still come from the API.
 */
(function i18n(global) {
  const STORAGE_KEY = "saptarishi-lang";
  // Set false to hide the Hindi switch and keep the site in English.
  const LANG_SWITCH_ENABLED = true;

  const STRINGS = {
    en: {
      "lang.toHi": "Switch to Hindi",
      "lang.toEn": "Switch to English",
      "menu.open": "Open menu",
      "menu.close": "Close menu",
      "nav.kundali": "Full Kundali",
      "nav.remedy": "Only Remedy",
      "nav.prediction": "Timeline",
      "nav.muhurta": "Muhurta",
      "nav.profile": "Profile",
      "nav.privacy": "Privacy",
      "nav.login": "Login",
      "header.register": "Register",
      "header.login": "Login",
      "header.logout": "Logout",
      "header.loggingOut": "Logging out…",
      "header.wallet": "Wallet",
      "header.account": "Account",
      "header.profile": "Profile",
      "drawer.guest": "Guest",
      "drawer.signIn": "Sign in to save charts",
      "drawer.wallet": "Wallet ₹{amount}",
      "footer.contact": "Contact us",
      "footer.connect": "Connect Astrologer",
      "footer.call": "Call",
      "footer.ask": "Ask",
      "footer.siteViewsTitle": "Total site views",
      "footer.siteViewsPending": "Site views: …",
      "footer.siteViews": "Site views: {count}",
      "footer.rateNamed": "{name} · Call / Ask · ₹{rate}/min",
      "footer.privacy": "Privacy Policy",
      "form.changeBirth": "← kundali : change birth",
      "form.birthOptions": "Birth details options",
      "form.openBirth": "Open birth details",
      "form.newBirth": "New birth details",
      "form.searchSaved": "Search saved births",
      "form.searchPlaceholder": "Search by name, place, or date…",
      "form.searchAria": "Search saved birth details",
      "form.selectSaved": "Select saved name…",
      "form.savedList": "Saved birth details",
      "form.name": "Name",
      "form.enterName": "Enter Name",
      "form.place": "Place",
      "form.selectPlace": "Select Place…",
      "form.otherEllipsis": "Other…",
      "form.otherShort": "Other",
      "form.customPlace": "Custom Place",
      "form.customPlaceholder": "Type city and country.",
      "form.date": "Date",
      "form.time": "Time",
      "form.save": "Save",
      "form.show": "Show",
      "form.compare": "Kundali compare",
      "form.compareLead": "Enter another birth details",
      "form.compareHint": "Birth 1 uses the form above — choose <strong>Open birth details</strong> to pick a saved profile. For Birth 2 and below, pick from <strong>Saved birth details</strong> or enter a <strong>Name</strong> with place, date, and time.",
      "form.addMore": "+ Add More",
      "form.savedBirth": "Saved birth details",
      "form.remove": "Remove",
      "form.delete": "Delete",
      "form.active": "active",
      "form.deleteNamed": "Delete {name}",
      "form.noSaved": "No saved birth details yet.",
      "form.noMatch": "No births match “{query}”.",
      "form.deleteConfirm": "Delete saved birth details for {name}?",
      "form.deleteFailed": "Could not delete saved birth details.",
      "form.deleteSignIn": "Sign in to delete saved birth details.",
      "form.compareMin": "At least {count} more birth is required for compare.",
      "form.compareSignIn": "Register or sign in to compare kundalis.",
      "form.compareEmpty": "No lord strength data returned for these births.",
      "form.dayMonthYear": "Day - Month - Year",
      "form.hourMinSec": "Hour - Min - Sec",
      "form.birthDate": "Birth date",
      "form.birthTime": "Birth time",
      "form.birthPlace": "Birth place",
      "form.from": "From",
      "form.to": "To",
      "form.fromDate": "From date",
      "form.toDate": "To date",
      "form.enterPlace": "Enter a place",
      "form.enterCity": "Enter a city or district, not only the country.",
      "form.selectPlaceRequired": "Select Place.",
      "form.day": "Day",
      "form.month": "Month",
      "form.year": "Year",
      "form.hour": "Hour",
      "form.min": "Min",
      "form.sec": "Sec",
      "form.state": "State",
      "form.district": "District",
      "form.countries": "Countries",
      "kundali.summary": "Summary",
      "kundali.yourSummary": "Your Kundali Summary",
      "kundali.chart": "Chart",
      "kundali.planetStatus": "Planet Status",
      "kundali.houseStatus": "House Status",
      "kundali.planetsAria": "Birth time planets by planet",
      "kundali.housesAria": "Birth time planets by house",
      "kundali.sectionAria": "Planet and house status",
      "kundali.yogas": "Yogas",
      "kundali.yogasAria": "Present yogas",
      "kundali.doshas": "Doshas",
      "kundali.doshasAria": "Present doshas",
      "kundali.dasha": "Your current mahadasha",
      "kundali.nextDasha": "Your next mahadasha",
      "kundali.downloadPdf": "Download whole kundali PDF",
      "kundali.lordCompare": "Lord strength across compared births",
      "kundali.openRemedy": "Open Remedy",
      "kundali.openRemedyAria": "Open Remedy with these birth details",
      "kundali.remedyPlanet": "{label} is under strain. Refer to remedy for ways to reduce its negative impact.",
      "kundali.thisHouse": "This house",
      "kundali.remedyHouse": "{label} is under strain. Refer to remedy for ways to reduce its negative impact.",
      "kundali.remedyDosh": "{label} is present. Refer to remedy for ways to reduce its negative impact.",
      "kundali.remedyGeneric": "Refer to remedy for ways to reduce its negative impact.",
      "kundali.yogaEmpty": "No extra detail for this yoga.",
      "kundali.doshEmpty": "No extra detail for this dosha.",
      "chart.d1": "D1 — Lagna (Birth Chart)",
      "chart.d10": "D10 — Dasamsa (Career Chart)",
      "chart.d9": "D9 — Navamsa (Marriage Chart)",
      "chart.d60": "D60 — Shashtiamsa (Past-life Chart)",
      "chart.d30": "D30 — Trimsamsa (Misfortunes Chart)",
      "col.planet": "Planet",
      "col.aspected": "Aspected By",
      "col.conjunction": "Conjunction",
      "col.nakshatra": "Nakshatra",
      "col.house": "In House",
      "col.houseRashi": "In House Rashi",
      "col.houseLord": "In House Lord",
      "col.mahadasha": "Mahadasha on Age",
      "col.karakwaqt": "Karakwaqt",
      "col.malefic": "Malefic 6/8/12",
      "col.benefic": "Benefic 1/5/9",
      "col.navatara": "Nakshatra navatara",
      "col.degree": "Degree",
      "col.deathDegree": "Death Degree",
      "col.lagnaEnemy": "Lagna Lord Enemy",
      "dasha.planet": "Planet",
      "dasha.year": "Year",
      "dasha.age": "Age",
      "dasha.months": "Months",
      "dasha.now": "Now",
      "dasha.date": "Date",
      "dasha.yourAge": "Your age now",
      "dasha.jumpNow": "Jump to your age now",
      "dasha.empty": "No dasha at this age.",
      "dasha.noResult": "No dasha result for this planet.",
      "dasha.line": "Planet dasha line from year {from} to {to}",
      "dasha.lineAge": "Planet dasha line from age 0 to 120",
      "remedy.changeBirth": "← remedy : change birth",
      "remedy.dosh": "Remedy for kundali dosh",
      "remedy.doshEmpty": "No kundali dosh with a remedy found for this birth chart.",
      "remedy.doshAria": "Kundali dosh remedies",
      "remedy.debilitated": "Remedy for debilitated planet",
      "remedy.debilitatedEmpty": "No debilitated planet found for this birth chart.",
      "remedy.debilitatedAria": "Debilitated planet remedies",
      "remedy.low": "Remedy for low-strength planet",
      "remedy.lowEmpty": "No low-strength planet (below 50%) found for this birth chart.",
      "remedy.lowAria": "Low strength planet remedies",
      "remedy.dusthana": "Remedy for planet in dusthana 6/8/12 houses",
      "remedy.dusthanaEmpty": "No planet in dusthana (6/8/12) houses for this birth chart.",
      "remedy.dusthanaAria": "Dusthana planet remedies",
      "remedy.navatara": "Strengthen the already strong planet (Based on nakshatra/navatara)",
      "remedy.navataraAria": "Auspicious nava-tara",
      "remedy.noNavatara": "No auspicious nava-tara definitions found.",
      "remedy.col.desc": "Desc",
      "remedy.col.rule": "Rule",
      "remedy.col.worship": "Whom to worship",
      "remedy.col.fast": "Day to fast",
      "remedy.col.mantra": "Mantra to chant",
      "remedy.col.count": "Chant count",
      "remedy.col.how": "How to chant",
      "remedy.col.donate": "Things to donate",
      "remedy.col.respect": "Whom to respect most",
      "remedy.col.feed": "Feed to animal",
      "remedy.col.gem": "Gem",
      "remedy.col.nakshatra": "Nakshatra",
      "remedy.col.navatara": "Navatara",
      "remedy.col.symbol": "Symbol",
      "remedy.col.ruling": "Ruling Planet",
      "remedy.col.deity": "Deity",
      "remedy.col.tree": "Tree",
      "remedy.col.directions": "Directions",
      "remedy.col.lunar": "Lunar Month",
      "remedy.col.tithi": "Tithi",
      "remedy.col.remedy": "Remedy",
      "remedy.col.mantraWord": "Mantra",
      "remedy.col.animal": "Animal",
      "remedy.col.colors": "Colors",
      "remedy.col.number": "Number",
      "remedy.col.day": "Day",
      "remedy.col.time": "Time",
      "future.career": "Career",
      "future.marriage": "Marriage",
      "future.child": "Child born",
      "future.land": "Land / vehicle",
      "future.foreign": "Foreign travel / migration",
      "future.wealth": "Wealth",
      "future.options": "Prediction options",
      "future.topics": "Prediction topics",
      "future.back": "← prediction",
      "future.changeSuffix": " : change birth",
      "future.lead": "Enter birth details to find favourable dasha windows.",
      "future.detail": "Prediction birth details",
      "future.crumb": "Prediction",
      "future.yourDasha": "Your Dasha",
      "future.whatIsDasha": "What is Dasha?",
      "future.top3": "Top 3 dasha timings",
      "future.best": "Best favourable window",
      "muhurta.baby": "Baby Birth",
      "muhurta.marriage": "Marriage",
      "muhurta.home": "Buy Home",
      "muhurta.vehicle": "Buy Vehicle",
      "muhurta.travel": "Travelling",
      "muhurta.business": "Business Start",
      "muhurta.naming": "Naming",
      "muhurta.mundan": "Mundan",
      "muhurta.job": "Job Joining",
      "muhurta.options": "Muhurta options",
      "muhurta.categories": "Muhurta categories",
      "muhurta.back": "← muhurta",
      "muhurta.range": "Enter range details",
      "muhurta.crumb": "Muhurta",
      "muhurta.lead": "Enter place and date range to find strong slots.",
      "muhurta.findStrength": "Find best slots based on Kundali Overall Strength",
      "muhurta.findYoga": "Find best slots based on More Yoga",
      "muhurta.topSlots": "Top slots by kundali overall strength",
      "profile.fullName": "Full name",
      "profile.mobile": "Mobile number",
      "profile.mobilePh": "e.g. 9876543210",
      "profile.email": "Email",
      "profile.emailPh": "you@example.com",
      "profile.lifeEvents": "Give 3 major life events with dates",
      "profile.save": "Save changes",
      "profile.security": "Security",
      "profile.currentPassword": "Current password",
      "profile.newPassword": "New password",
      "profile.newPasswordPh": "At least 4 characters",
      "profile.confirmPassword": "Confirm new password",
      "profile.confirmPasswordPh": "Re-enter new password",
      "profile.updatePassword": "Update password",
      "profile.logout": "Logout",
      "profile.delete": "Delete account",
      "profile.confirmDelete": "Confirm with your password",
      "profile.deleteMine": "Delete my account",
      "profile.addWallet": "Add money to wallet",
      "future.runningNow": "Running now",
      "future.transit": "Transit confirmed",
      "muhurta.topYoga": "Top 5 by more yoga",
      "support.title": "Support",
      "support.lead": "Need help with your chart, wallet, or account? Reach us using the details below.",
      "support.contact": "Contact details",
      "support.reply": "Email or WhatsApp us. We typically reply within a few hours during the day.",
      "support.email": "Email",
      "support.whatsapp": "WhatsApp",
      "privacy.title": "Privacy Policy",
      "privacy.updated": "Last updated:",
      "profile.wallet": "Wallet Balance: ₹{amount}",
      "profile.usage": "Usage: {used}/{limit} queries",
      "profile.member": "Member since {date}",
      "profile.advance": "Advance Plan",
      "profile.basic": "Basic Plan",
      "profile.freeLeft": "Free Plan · {left} of {limit} births left",
      "profile.plans": "Free Plan: {free} kundali free\nBasic Plan: ₹{basic} per kundali\nAdvance Plan: ₹{advance} for unlimited access for {duration}.",
      "profile.oneYear": "1 year",
      "profile.years": "{count} years",
      "profile.oneMonth": "1 month",
      "profile.months": "{count} months",
      "auth.close": "Close",
      "auth.login": "Login",
      "auth.register": "Register",
      "auth.password": "Password",
      "auth.passwordPh": "Enter your password",
      "auth.forgot": "Forgot password?",
      "auth.signIn": "Sign in",
      "auth.sendTemp": "Send temporary password",
      "auth.backSignIn": "Back to sign in",
      "auth.namePh": "Your full name",
      "auth.confirmPassword": "Confirm password",
      "auth.confirmPh": "Re-enter password",
      "auth.create": "Create account",
      "auth.forgotLead": "Enter the mobile number and email on your account. If they match, we email you a temporary password.",
      "auth.signInContinue": "Sign in to continue.",
      "wallet.title": "Wallet",
      "wallet.back": "← wallet",
      "wallet.choose": "Choose amount",
      "wallet.amount": "Amount:",
      "wallet.coupon": "Enter coupon code",
      "wallet.verify": "Verify",
      "wallet.updated": "Wallet updated.",
      "wallet.continue": "Continue",
      "month.short.0": "JAN",
      "month.short.1": "FEB",
      "month.short.2": "MAR",
      "month.short.3": "APR",
      "month.short.4": "MAY",
      "month.short.5": "JUN",
      "month.short.6": "JUL",
      "month.short.7": "AUG",
      "month.short.8": "SEP",
      "month.short.9": "OCT",
      "month.short.10": "NOV",
      "month.short.11": "DEC",
      "month.long.0": "January",
      "month.long.1": "February",
      "month.long.2": "March",
      "month.long.3": "April",
      "month.long.4": "May",
      "month.long.5": "June",
      "month.long.6": "July",
      "month.long.7": "August",
      "month.long.8": "September",
      "month.long.9": "October",
      "month.long.10": "November",
      "month.long.11": "December",
      "month.dasha.0": "Jan",
      "month.dasha.1": "Feb",
      "month.dasha.2": "Mar",
      "month.dasha.3": "Apr",
      "month.dasha.4": "May",
      "month.dasha.5": "Jun",
      "month.dasha.6": "Jul",
      "month.dasha.7": "Aug",
      "month.dasha.8": "Sep",
      "month.dasha.9": "Oct",
      "month.dasha.10": "Nov",
      "month.dasha.11": "Dec"
    },
    hi: {
      "lang.toHi": "हिंदी में देखें",
      "lang.toEn": "अंग्रेज़ी में देखें",
      "menu.open": "मेनू खोलें",
      "menu.close": "मेनू बंद करें",
      "nav.kundali": "पूर्ण कुंडली",
      "nav.remedy": "केवल उपाय",
      "nav.prediction": "समयरेखा",
      "nav.muhurta": "मुहूर्त",
      "nav.profile": "प्रोफ़ाइल",
      "nav.privacy": "गोपनीयता",
      "nav.login": "लॉगिन",
      "header.register": "रजिस्टर",
      "header.login": "लॉगिन",
      "header.logout": "लॉगआउट",
      "header.loggingOut": "लॉगआउट हो रहा है…",
      "header.wallet": "वॉलेट",
      "header.account": "खाता",
      "header.profile": "प्रोफ़ाइल",
      "drawer.guest": "अतिथि",
      "drawer.signIn": "चार्ट सहेजने के लिए साइन इन करें",
      "drawer.wallet": "वॉलेट ₹{amount}",
      "footer.contact": "संपर्क",
      "footer.connect": "ज्योतिषी से बात",
      "footer.call": "कॉल",
      "footer.ask": "पूछें",
      "footer.siteViewsTitle": "कुल साइट दृश्य",
      "footer.siteViewsPending": "साइट दृश्य: …",
      "footer.siteViews": "साइट दृश्य: {count}",
      "footer.rateNamed": "{name} · कॉल / पूछें · ₹{rate}/मिनट",
      "footer.privacy": "गोपनीयता नीति",
      "form.changeBirth": "← कुंडली : जन्म बदलें",
      "form.birthOptions": "जन्म जानकारी के विकल्प",
      "form.openBirth": "सहेजी जन्म कुंडली",
      "form.newBirth": "नई जन्म कुंडली",
      "form.searchSaved": "सहेजी कुंडली खोजें",
      "form.searchPlaceholder": "नाम, स्थान या तिथि से खोजें…",
      "form.searchAria": "सहेजी जन्म जानकारी खोजें",
      "form.selectSaved": "सहेजा नाम चुनें…",
      "form.savedList": "सहेजी जन्म जानकारी",
      "form.name": "नाम",
      "form.enterName": "नाम लिखें",
      "form.place": "स्थान",
      "form.selectPlace": "स्थान चुनें…",
      "form.otherEllipsis": "अन्य…",
      "form.otherShort": "अन्य",
      "form.customPlace": "अन्य स्थान",
      "form.customPlaceholder": "शहर और देश लिखें।",
      "form.date": "तिथि",
      "form.time": "समय",
      "form.save": "सहेजें",
      "form.show": "दिखाएँ",
      "form.compare": "कुंडली तुलना",
      "form.compareLead": "दूसरी जन्म जानकारी लिखें",
      "form.compareHint": "जन्म 1 ऊपर वाले फ़ॉर्म से आता है — सहेजी प्रोफ़ाइल के लिए <strong>सहेजी जन्म कुंडली</strong> चुनें। जन्म 2 और आगे के लिए <strong>सहेजी जन्म जानकारी</strong> चुनें, या <strong>नाम</strong> के साथ स्थान, तिथि और समय लिखें।",
      "form.addMore": "+ और जोड़ें",
      "form.savedBirth": "सहेजी जन्म जानकारी",
      "form.remove": "हटाएँ",
      "form.delete": "मिटाएँ",
      "form.active": "सक्रिय",
      "form.deleteNamed": "{name} मिटाएँ",
      "form.noSaved": "अभी कोई सहेजी जन्म जानकारी नहीं है।",
      "form.noMatch": "“{query}” से कोई जन्म नहीं मिला।",
      "form.deleteConfirm": "{name} की सहेजी जन्म जानकारी मिटाएँ?",
      "form.deleteFailed": "सहेजी जन्म जानकारी मिटाई नहीं जा सकी।",
      "form.deleteSignIn": "सहेजी जन्म जानकारी मिटाने के लिए साइन इन करें।",
      "form.compareMin": "तुलना के लिए कम से कम {count} और जन्म चाहिए।",
      "form.compareSignIn": "कुंडली तुलना के लिए रजिस्टर करें या साइन इन करें।",
      "form.compareEmpty": "इन जन्मों के लिए स्वामी बल का डेटा नहीं मिला।",
      "form.dayMonthYear": "दिन - माह - वर्ष",
      "form.hourMinSec": "घंटा - मिनट - सेकंड",
      "form.birthDate": "जन्म तिथि",
      "form.birthTime": "जन्म समय",
      "form.birthPlace": "जन्म स्थान",
      "form.from": "से",
      "form.to": "तक",
      "form.fromDate": "आरंभ तिथि",
      "form.toDate": "अंतिम तिथि",
      "form.enterPlace": "स्थान लिखें",
      "form.enterCity": "केवल देश नहीं, शहर या ज़िला लिखें।",
      "form.selectPlaceRequired": "स्थान चुनें।",
      "form.day": "दिन",
      "form.month": "माह",
      "form.year": "वर्ष",
      "form.hour": "घंटा",
      "form.min": "मिनट",
      "form.sec": "सेकंड",
      "form.state": "राज्य",
      "form.district": "ज़िला",
      "form.countries": "देश",
      "kundali.summary": "सारांश",
      "kundali.yourSummary": "आपकी कुंडली का सारांश",
      "kundali.chart": "कुंडली",
      "kundali.planetStatus": "ग्रह स्थिति",
      "kundali.houseStatus": "भाव स्थिति",
      "kundali.planetsAria": "ग्रह के अनुसार जन्म के ग्रह",
      "kundali.housesAria": "भाव के अनुसार जन्म के ग्रह",
      "kundali.sectionAria": "ग्रह और भाव की स्थिति",
      "kundali.yogas": "योग",
      "kundali.yogasAria": "उपस्थित योग",
      "kundali.doshas": "दोष",
      "kundali.doshasAria": "उपस्थित दोष",
      "kundali.dasha": "आपकी वर्तमान महादशा",
      "kundali.nextDasha": "आपकी अगली महादशा",
      "kundali.downloadPdf": "पूरी कुंडली का पीडीएफ डाउनलोड करें",
      "kundali.lordCompare": "तुलना की जन्मों में स्वामी बल",
      "kundali.openRemedy": "उपाय खोलें",
      "kundali.openRemedyAria": "इन्हीं जन्म विवरण के साथ उपाय खोलें",
      "kundali.remedyPlanet": "{label} कमजोर है। नकारात्मक प्रभाव कम करने के उपाय देखें।",
      "kundali.thisHouse": "यह भाव",
      "kundali.remedyHouse": "{label} कमजोर है। नकारात्मक प्रभाव कम करने के उपाय देखें।",
      "kundali.remedyDosh": "{label} मौजूद है। नकारात्मक प्रभाव कम करने के उपाय देखें।",
      "kundali.remedyGeneric": "नकारात्मक प्रभाव कम करने के उपाय देखें।",
      "kundali.yogaEmpty": "इस योग का और विवरण नहीं है।",
      "kundali.doshEmpty": "इस दोष का और विवरण नहीं है।",
      "chart.d1": "D1 — लग्न (जन्म कुंडली)",
      "chart.d10": "D10 — दशांश (कर्म कुंडली)",
      "chart.d9": "D9 — नवमांश (विवाह कुंडली)",
      "chart.d60": "D60 — षष्ठ्यांश (पूर्वजन्म कुंडली)",
      "chart.d30": "D30 — त्रिंशांश (कष्ट कुंडली)",
      "col.planet": "ग्रह",
      "col.aspected": "दृष्टि",
      "col.conjunction": "युति",
      "col.nakshatra": "नक्षत्र",
      "col.house": "भाव",
      "col.houseRashi": "भाव राशि",
      "col.houseLord": "भाव स्वामी",
      "col.mahadasha": "आयु पर महादशा",
      "col.karakwaqt": "कारक वक़्त",
      "col.malefic": "पाप 6/8/12",
      "col.benefic": "शुभ 1/5/9",
      "col.navatara": "नक्षत्र नवातार",
      "col.degree": "अंश",
      "col.deathDegree": "मृत्यु अंश",
      "col.lagnaEnemy": "लग्नेश शत्रु",
      "dasha.planet": "ग्रह",
      "dasha.year": "वर्ष",
      "dasha.age": "आयु",
      "dasha.months": "माह",
      "dasha.now": "अभी",
      "dasha.date": "तिथि",
      "dasha.yourAge": "आपकी वर्तमान आयु",
      "dasha.jumpNow": "अपनी वर्तमान आयु पर जाएँ",
      "dasha.empty": "इस आयु पर कोई दशा नहीं।",
      "dasha.noResult": "इस ग्रह की दशा का परिणाम नहीं।",
      "dasha.line": "ग्रह दशा रेखा, वर्ष {from} से {to} तक",
      "dasha.lineAge": "ग्रह दशा रेखा, आयु 0 से 120 तक",
      "remedy.changeBirth": "← उपाय : जन्म बदलें",
      "remedy.dosh": "कुंडली दोष का उपाय",
      "remedy.doshEmpty": "इस जन्म कुंडली में उपाय वाला कोई दोष नहीं मिला।",
      "remedy.doshAria": "कुंडली दोष के उपाय",
      "remedy.debilitated": "नीच ग्रह का उपाय",
      "remedy.debilitatedEmpty": "इस जन्म कुंडली में कोई नीच ग्रह नहीं मिला।",
      "remedy.debilitatedAria": "नीच ग्रह के उपाय",
      "remedy.low": "कम बल वाले ग्रह का उपाय",
      "remedy.lowEmpty": "इस जन्म कुंडली में 50% से कम बल वाला कोई ग्रह नहीं मिला।",
      "remedy.lowAria": "कम बल वाले ग्रह के उपाय",
      "remedy.dusthana": "षष्ठ, अष्टम या द्वादश भाव के ग्रह का उपाय",
      "remedy.dusthanaEmpty": "इस जन्म कुंडली में 6, 8 या 12 भाव में कोई ग्रह नहीं है।",
      "remedy.dusthanaAria": "दुस्थान ग्रह के उपाय",
      "remedy.navatara": "पहले से बलवान ग्रह को और मजबूत करें (नक्षत्र / नवातार के आधार पर)",
      "remedy.navataraAria": "शुभ नवातार",
      "remedy.noNavatara": "कोई शुभ नवातार नहीं मिला।",
      "remedy.col.desc": "विवरण",
      "remedy.col.rule": "नियम",
      "remedy.col.worship": "किसकी पूजा करें",
      "remedy.col.fast": "व्रत का दिन",
      "remedy.col.mantra": "जप का मंत्र",
      "remedy.col.count": "जप संख्या",
      "remedy.col.how": "जप कैसे करें",
      "remedy.col.donate": "दान की वस्तुएँ",
      "remedy.col.respect": "किसका सम्मान करें",
      "remedy.col.feed": "किस जीव को खिलाएँ",
      "remedy.col.gem": "रत्न",
      "remedy.col.nakshatra": "नक्षत्र",
      "remedy.col.navatara": "नवातार",
      "remedy.col.symbol": "प्रतीक",
      "remedy.col.ruling": "स्वामी ग्रह",
      "remedy.col.deity": "देवता",
      "remedy.col.tree": "वृक्ष",
      "remedy.col.directions": "दिशा",
      "remedy.col.lunar": "चंद्र मास",
      "remedy.col.tithi": "तिथि",
      "remedy.col.remedy": "उपाय",
      "remedy.col.mantraWord": "मंत्र",
      "remedy.col.animal": "पशु",
      "remedy.col.colors": "रंग",
      "remedy.col.number": "अंक",
      "remedy.col.day": "वार",
      "remedy.col.time": "समय",
      "future.career": "कर्म",
      "future.marriage": "विवाह",
      "future.child": "संतान जन्म",
      "future.land": "भूमि / वाहन",
      "future.foreign": "विदेश यात्रा / प्रवास",
      "future.wealth": "धन",
      "future.options": "भविष्यफल के विकल्प",
      "future.topics": "भविष्यफल के विषय",
      "future.back": "← भविष्यफल",
      "future.changeSuffix": " : जन्म बदलें",
      "future.lead": "अनुकूल दशा काल जानने के लिए जन्म जानकारी लिखें।",
      "future.detail": "भविष्यफल की जन्म जानकारी",
      "future.crumb": "भविष्यफल",
      "future.yourDasha": "आपकी दशा",
      "future.whatIsDasha": "दशा क्या है?",
      "future.top3": "शीर्ष 3 दशा काल",
      "future.best": "सबसे अनुकूल समय",
      "muhurta.baby": "शिशु जन्म",
      "muhurta.marriage": "विवाह",
      "muhurta.home": "घर खरीद",
      "muhurta.vehicle": "वाहन खरीद",
      "muhurta.travel": "यात्रा",
      "muhurta.business": "व्यापार आरंभ",
      "muhurta.naming": "नामकरण",
      "muhurta.mundan": "मुंडन",
      "muhurta.job": "नौकरी में प्रवेश",
      "muhurta.options": "मुहूर्त के विकल्प",
      "muhurta.categories": "मुहूर्त की श्रेणियाँ",
      "muhurta.back": "← मुहूर्त",
      "muhurta.range": "तिथि सीमा लिखें",
      "muhurta.crumb": "मुहूर्त",
      "muhurta.lead": "मजबूत मुहूर्त के लिए स्थान और तिथि सीमा लिखें।",
      "muhurta.findStrength": "कुंडली के कुल बल से सर्वोत्तम समय खोजें",
      "muhurta.findYoga": "अधिक योग के आधार पर सर्वोत्तम समय खोजें",
      "muhurta.topSlots": "कुंडली के कुल बल से शीर्ष समय",
      "profile.fullName": "पूरा नाम",
      "profile.mobile": "मोबाइल नंबर",
      "profile.mobilePh": "जैसे 9876543210",
      "profile.email": "ईमेल",
      "profile.emailPh": "you@example.com",
      "profile.lifeEvents": "तिथि के साथ 3 बड़ी जीवन घटनाएँ लिखें",
      "profile.save": "बदलाव सहेजें",
      "profile.security": "सुरक्षा",
      "profile.currentPassword": "वर्तमान पासवर्ड",
      "profile.newPassword": "नया पासवर्ड",
      "profile.newPasswordPh": "कम से कम 4 अक्षर",
      "profile.confirmPassword": "नया पासवर्ड फिर लिखें",
      "profile.confirmPasswordPh": "नया पासवर्ड दोबारा लिखें",
      "profile.updatePassword": "पासवर्ड बदलें",
      "profile.logout": "लॉगआउट",
      "profile.delete": "खाता हटाएँ",
      "profile.confirmDelete": "अपने पासवर्ड से पुष्टि करें",
      "profile.deleteMine": "मेरा खाता हटाएँ",
      "profile.addWallet": "वॉलेट में धन जोड़ें",
      "future.runningNow": "अभी चल रही है",
      "future.transit": "गोचर से पुष्टि",
      "muhurta.topYoga": "अधिक योग के शीर्ष 5 समय",
      "support.title": "सहायता",
      "support.lead": "कुंडली, वॉलेट या खाते में मदद चाहिए? नीचे दिए विवरण से संपर्क करें।",
      "support.contact": "संपर्क",
      "support.reply": "ईमेल या व्हाट्सऐप करें। दिन में कुछ घंटों में उत्तर मिलता है।",
      "support.email": "ईमेल",
      "support.whatsapp": "व्हाट्सऐप",
      "privacy.title": "गोपनीयता नीति",
      "privacy.updated": "अंतिम अद्यतन:",
      "profile.wallet": "वॉलेट शेष: ₹{amount}",
      "profile.usage": "उपयोग: {used}/{limit} प्रश्न",
      "profile.member": "{date} से सदस्य",
      "profile.advance": "उन्नत योजना",
      "profile.basic": "साधारण योजना",
      "profile.freeLeft": "निःशुल्क योजना · {limit} में से {left} जन्म शेष",
      "profile.plans": "निःशुल्क योजना: {free} कुंडली मुफ्त\nसाधारण योजना: ₹{basic} प्रति कुंडली\nउन्नत योजना: ₹{advance} में {duration} तक असीमित उपयोग।",
      "profile.oneYear": "1 वर्ष",
      "profile.years": "{count} वर्ष",
      "profile.oneMonth": "1 माह",
      "profile.months": "{count} माह",
      "auth.close": "बंद करें",
      "auth.login": "लॉगिन",
      "auth.register": "रजिस्टर",
      "auth.password": "पासवर्ड",
      "auth.passwordPh": "अपना पासवर्ड लिखें",
      "auth.forgot": "पासवर्ड भूल गए?",
      "auth.signIn": "साइन इन",
      "auth.sendTemp": "अस्थायी पासवर्ड भेजें",
      "auth.backSignIn": "साइन इन पर वापस",
      "auth.namePh": "अपना पूरा नाम",
      "auth.confirmPassword": "पासवर्ड की पुष्टि",
      "auth.confirmPh": "पासवर्ड दोबारा लिखें",
      "auth.create": "खाता बनाएँ",
      "auth.forgotLead": "अपने खाते का मोबाइल नंबर और ईमेल लिखें। मिलान होने पर अस्थायी पासवर्ड ईमेल होगा।",
      "auth.signInContinue": "आगे बढ़ने के लिए साइन इन करें।",
      "wallet.title": "वॉलेट",
      "wallet.back": "← वॉलेट",
      "wallet.choose": "राशि चुनें",
      "wallet.amount": "राशि:",
      "wallet.coupon": "कूपन कोड लिखें",
      "wallet.verify": "जाँचें",
      "wallet.updated": "वॉलेट अपडेट हो गया।",
      "wallet.continue": "आगे बढ़ें",
      "month.short.0": "जन",
      "month.short.1": "फ़र",
      "month.short.2": "मार",
      "month.short.3": "अप्रै",
      "month.short.4": "मई",
      "month.short.5": "जून",
      "month.short.6": "जुल",
      "month.short.7": "अग",
      "month.short.8": "सित",
      "month.short.9": "अक्टू",
      "month.short.10": "नव",
      "month.short.11": "दिस",
      "month.long.0": "जनवरी",
      "month.long.1": "फ़रवरी",
      "month.long.2": "मार्च",
      "month.long.3": "अप्रैल",
      "month.long.4": "मई",
      "month.long.5": "जून",
      "month.long.6": "जुलाई",
      "month.long.7": "अगस्त",
      "month.long.8": "सितंबर",
      "month.long.9": "अक्टूबर",
      "month.long.10": "नवंबर",
      "month.long.11": "दिसंबर",
      "month.dasha.0": "जन",
      "month.dasha.1": "फ़र",
      "month.dasha.2": "मार",
      "month.dasha.3": "अप्रै",
      "month.dasha.4": "मई",
      "month.dasha.5": "जून",
      "month.dasha.6": "जुल",
      "month.dasha.7": "अग",
      "month.dasha.8": "सित",
      "month.dasha.9": "अक्टू",
      "month.dasha.10": "नव",
      "month.dasha.11": "दिस"
    }
  };

  function getLang() {
    if (!LANG_SWITCH_ENABLED) return "en";
    try {
      // Hindi until the visitor explicitly chooses English.
      return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "hi";
    } catch (err) {
      return "hi";
    }
  }

  function t(key) {
    const lang = getLang();
    const pack = STRINGS[lang] || STRINGS.en;
    if (pack[key] != null) return pack[key];
    if (STRINGS.en[key] != null) return STRINGS.en[key];
    return key;
  }

  function tf(key, vars) {
    let text = t(key);
    if (!vars) return text;
    Object.keys(vars).forEach((name) => {
      text = text.split(`{${name}}`).join(String(vars[name] ?? ""));
    });
    return text;
  }

  function readVars(el) {
    const raw = el.getAttribute("data-i18n-vars");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (err) {
      return null;
    }
  }

  function syncLangButtons(root) {
    const lang = getLang();
    const label = lang === "hi" ? "EN" : "हिं";
    const aria = t(lang === "hi" ? "lang.toEn" : "lang.toHi");
    (root || document).querySelectorAll(".site-header__lang").forEach((btn) => {
      if (btn.classList.contains("is-busy")) return;
      btn.textContent = label;
      btn.title = aria;
      btn.setAttribute("aria-label", aria);
    });
  }

  function apply(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const lang = getLang();
    document.documentElement.lang = lang === "hi" ? "hi" : "en";
    document.documentElement.classList.toggle("lang-hi", lang === "hi");
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const suffix = el.getAttribute("data-i18n-suffix") || "";
      el.textContent = tf(key, readVars(el)) + suffix;
    });
    scope.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (key) el.innerHTML = t(key);
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.placeholder = t(key);
    });
    scope.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      if (key) el.setAttribute("aria-label", tf(key, readVars(el)));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      if (key) el.title = tf(key, readVars(el));
    });
    syncLangButtons(scope);
  }

  function setLang(next) {
    if (!LANG_SWITCH_ENABLED) next = "en";
    const lang = next === "hi" ? "hi" : "en";
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      /* keep the choice for this page view */
    }
    apply(document);
    document.dispatchEvent(new CustomEvent("saptarishi-lang-change", { detail: { lang } }));
  }

  function bind(el, key, attr) {
    if (!el || !key) return el;
    if (attr === "placeholder") {
      el.setAttribute("data-i18n-placeholder", key);
      el.placeholder = t(key);
    } else if (attr === "aria") {
      el.setAttribute("data-i18n-aria", key);
      el.setAttribute("aria-label", t(key));
    } else if (attr === "title") {
      el.setAttribute("data-i18n-title", key);
      el.title = t(key);
    } else if (attr === "html") {
      el.setAttribute("data-i18n-html", key);
      el.innerHTML = t(key);
    } else {
      el.setAttribute("data-i18n", key);
      el.textContent = t(key);
    }
    return el;
  }

  let langSwitching = false;

  function setLangButtonsBusy(busy) {
    document.querySelectorAll(".site-header__lang").forEach((el) => {
      el.classList.toggle("is-busy", busy);
      el.disabled = busy;
      if (busy) {
        el.setAttribute("aria-busy", "true");
        el.textContent = "";
        const spin = document.createElement("span");
        spin.className = "site-header__lang-spin";
        spin.setAttribute("aria-hidden", "true");
        el.appendChild(spin);
        return;
      }
      el.removeAttribute("aria-busy");
      const spin = el.querySelector(".site-header__lang-spin");
      if (spin) spin.remove();
    });
  }

  document.addEventListener("click", (event) => {
    if (!LANG_SWITCH_ENABLED || langSwitching) return;
    const btn = event.target && event.target.closest && event.target.closest(".site-header__lang");
    if (!btn) return;
    event.preventDefault();
    langSwitching = true;
    const next = getLang() === "hi" ? "en" : "hi";
    setLangButtonsBusy(true);
    // Let this frame paint the spinner before the language rebuild blocks the thread.
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          setLang(next);
        } finally {
          setLangButtonsBusy(false);
          syncLangButtons(document);
          langSwitching = false;
        }
      }, 0);
    });
  });

  global.SaptarishiI18n = { getLang, t, tf, apply, setLang, bind, syncLangButtons };

  apply(document);
})(window);
