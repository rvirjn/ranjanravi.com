/**
 * Hindi interface. Translates menu items, headings, buttons and labels on screen (exact text matches),
 * so data entered by the school (names, notices, remarks) stays as typed.
 */
(() => {
  const KEY = "mps_lang";
  const lang = localStorage.getItem(KEY) || "en";

  const HI = {
    // groups & navigation
    "Overview": "सारांश", "Academics": "पढ़ाई", "Finance": "वित्त", "School": "विद्यालय", "Requests": "अनुरोध", "Account": "खाता",
    "Daily": "दैनिक", "Classroom": "कक्षा", "Exams": "परीक्षा", "Communication": "संचार", "Staff": "स्टाफ", "Reports": "रिपोर्ट",
    "People": "लोग", "Fees": "फीस", "Settings": "सेटिंग्स",
    "Dashboard": "डैशबोर्ड", "My Profile": "मेरी प्रोफ़ाइल", "Attendance": "उपस्थिति", "Classwork & Homework": "कक्षा कार्य और गृह कार्य",
    "Timetable": "समय सारणी", "My Timetable": "मेरी समय सारणी", "Homework Submission": "गृह कार्य जमा करें", "Quizzes & Tests": "क्विज़ और टेस्ट",
    "Study Material": "अध्ययन सामग्री", "Online Classes": "ऑनलाइन कक्षाएं", "Exams & Datesheet": "परीक्षा और डेटशीट",
    "Results & Report Card": "परिणाम और रिपोर्ट कार्ड", "Remarks & Achievements": "टिप्पणियां और उपलब्धियां", "Fees & Payments": "फीस और भुगतान",
    "Notices": "सूचनाएं", "Events & Holidays": "कार्यक्रम और छुट्टियां", "Photo Gallery": "फोटो गैलरी", "Transport": "परिवहन", "Library": "पुस्तकालय",
    "Leave Application": "छुट्टी आवेदन", "Messages": "संदेश", "Complaints & Feedback": "शिकायत और सुझाव", "ID Card & Certificates": "पहचान पत्र और प्रमाण पत्र",
    "Change Password": "पासवर्ड बदलें", "Student Attendance": "विद्यार्थी उपस्थिति", "HW/CW Update": "गृह कार्य / कक्षा कार्य भेजें",
    "Attendance Report": "उपस्थिति रिपोर्ट", "My Classes & Students": "मेरी कक्षाएं और विद्यार्थी", "Homework Assignments": "गृह कार्य",
    "Lesson Plans": "पाठ योजना", "Marks Entry": "अंक प्रविष्टि", "Results & Report Cards": "परिणाम और रिपोर्ट कार्ड", "Co-Scholastic Grades": "सह-शैक्षिक ग्रेड",
    "Student Remarks": "विद्यार्थी टिप्पणी", "Class Fee Dues": "कक्षा फीस बकाया", "Student Leave Requests": "विद्यार्थी छुट्टी अनुरोध",
    "My Attendance": "मेरी उपस्थिति", "My Leave": "मेरी छुट्टी", "Salary Slips": "वेतन पर्ची", "Duties & Substitutions": "ड्यूटी और प्रतिस्थापन",
    "Teacher Attendance": "शिक्षक उपस्थिति", "Student Attendance Report": "विद्यार्थी उपस्थिति रिपोर्ट", "Teacher Attendance Report": "शिक्षक उपस्थिति रिपोर्ट",
    "Results": "परिणाम", "Students & Admissions": "विद्यार्थी और प्रवेश", "Teachers": "शिक्षक", "Approvals": "स्वीकृतियां",
    "Exams & Admit Cards": "परीक्षा और प्रवेश पत्र", "WhatsApp": "व्हाट्सएप", "Fee Overview": "फीस सारांश", "Student Fee Update": "विद्यार्थी फीस जमा",
    "Dues & Defaulters": "बकाया और डिफ़ॉल्टर", "Receipts": "रसीदें", "Parent Payments": "अभिभावक भुगतान", "Fee Reminders": "फीस रिमाइंडर",
    "Classes & Fees": "कक्षाएं और फीस", "Collection Report": "संग्रह रिपोर्ट", "Fee Structure": "फीस संरचना",
    "Student Portal": "विद्यार्थी पोर्टल", "Teacher Portal": "शिक्षक पोर्टल", "Principal Portal": "प्रधानाचार्य पोर्टल", "Accounts Portal": "लेखा पोर्टल",
    // buttons & common words
    "Logout": "लॉग आउट", "Website": "वेबसाइट", "Login": "लॉग इन", "Submit": "जमा करें", "Save": "सहेजें", "Cancel": "रद्द करें", "Send": "भेजें",
    "View": "देखें", "Print": "प्रिंट", "Back": "वापस", "Add": "जोड़ें", "Delete": "हटाएं", "Approve": "स्वीकृत करें", "Reject": "अस्वीकार करें",
    "PRESENT": "उपस्थित", "ABSENT": "अनुपस्थित", "Present": "उपस्थित", "Absent": "अनुपस्थित", "Late": "देर से", "Half day": "आधा दिन", "Leave": "छुट्टी",
    "Mark All Present": "सभी को उपस्थित करें", "Submit Attendance": "उपस्थिति जमा करें", "All classes": "सभी कक्षाएं", "Not marked": "दर्ज नहीं",
    "Marked": "दर्ज", "Not posted": "नहीं भेजा", "Posted": "भेजा गया", "My class": "मेरी कक्षा", "Date": "तारीख", "Month": "महीना", "Class": "कक्षा",
    "Student": "विद्यार्थी", "Subject": "विषय", "Roll": "रोल", "Status": "स्थिति", "Amount": "राशि", "Total": "कुल", "Due": "बकाया", "Paid": "भुगतान किया",
    "Overdue": "समय सीमा पार", "Pending": "लंबित", "Approved": "स्वीकृत", "Rejected": "अस्वीकृत", "Completed": "पूर्ण", "Upcoming": "आगामी",
    "Classwork (CW)": "कक्षा कार्य (CW)", "Homework (HW)": "गृह कार्य (HW)", "WhatsApp Preview": "व्हाट्सएप पूर्वावलोकन",
    "Total Fees": "कुल फीस", "Balance Due": "शेष बकाया", "Dues (month-wise)": "बकाया (महीने के अनुसार)", "Pay by Scanner": "स्कैनर से भुगतान करें",
    "I have paid": "मैंने भुगतान कर दिया", "All Fee Items": "सभी फीस मदें", "Payment Done": "भुगतान हो गया", "Send to Accountant": "लेखाकार को भेजें",
    "Today's Classes": "आज की कक्षाएं", "Homework Due": "बाकी गृह कार्य", "Latest Notices": "नई सूचनाएं", "Upcoming Exams": "आगामी परीक्षाएं",
    "Apply Leave": "छुट्टी के लिए आवेदन", "Pay Fees": "फीस भरें", "Report Card": "रिपोर्ट कार्ड", "Holistic Progress Card": "समग्र प्रगति कार्ड",
    "Admit Card": "प्रवेश पत्र", "Record Fee": "फीस दर्ज करें", "Collect": "जमा करें", "Students": "विद्यार्थी", "Working Days": "कार्य दिवस",
    "Change Password ": "पासवर्ड बदलें", "Current password": "वर्तमान पासवर्ड", "New password": "नया पासवर्ड", "Confirm new password": "नया पासवर्ड दोबारा",
    "Update Password": "पासवर्ड अपडेट करें", "Notices & Circulars": "सूचनाएं और परिपत्र", "Upcoming Events": "आगामी कार्यक्रम", "Holidays": "छुट्टियां",
    "Student Details": "विद्यार्थी विवरण", "Parents & Contact": "अभिभावक और संपर्क", "Request Update": "बदलाव का अनुरोध", "Photo": "फोटो",
    "Weekly Timetable": "साप्ताहिक समय सारणी", "Fee Receipts": "फीस रसीदें", "Fee Defaulters": "फीस डिफ़ॉल्टर", "Search": "खोजें",
    "Student / Parent Login": "विद्यार्थी / अभिभावक लॉग इन", "Teacher Login": "शिक्षक लॉग इन", "Principal Login": "प्रधानाचार्य लॉग इन",
    "Accountant Login": "लेखाकार लॉग इन", "Password": "पासवर्ड", "Admission Number": "प्रवेश संख्या", "Employee ID": "कर्मचारी आईडी",
    "Forgot password?": "पासवर्ड भूल गए?", "School Portal": "विद्यालय पोर्टल", "Staff Login": "स्टाफ लॉग इन",
    "User ID": "यूज़र आईडी", "Login with your User ID": "अपनी यूज़र आईडी से लॉग इन करें", "Back to login": "लॉग इन पर वापस",
    "Attendance Today": "आज की उपस्थिति", "Homework to Review": "जांच के लिए गृह कार्य", "Ungraded submissions": "बिना ग्रेड वाले",
    "Leave Requests": "छुट्टी अनुरोध", "Awaiting your approval": "आपकी स्वीकृति बाकी", "HW/CW Today": "आज का HW/CW", "Full timetable": "पूरी समय सारणी",
    "All": "सभी", "Enter Marks": "अंक दर्ज करें", "Your Upcoming Online Classes": "आपकी आगामी ऑनलाइन कक्षाएं", "Start": "शुरू करें",
    "Recent Messages": "हाल के संदेश", "Inbox": "इनबॉक्स", "Calendar": "कैलेंडर", "Homework Pending": "बाकी गृह कार्य", "Fee Due": "फीस बकाया",
    "Last Result": "पिछला परिणाम", "Nothing overdue": "कुछ भी लंबित नहीं", "View all": "सभी देखें", "Datesheet": "डेटशीट",
    "Upcoming Online Classes": "आगामी ऑनलाइन कक्षाएं", "Join": "जुड़ें", "Collected Today": "आज जमा", "This Month": "इस महीने",
    "Total Dues": "कुल बकाया", "2+ Months Pending": "2+ महीने बाकी", "Class-wise Dues": "कक्षा अनुसार बकाया", "Fee Rules": "फीस नियम",
    "Recent Receipts": "हाल की रसीदें", "All receipts": "सभी रसीदें", "Students Present": "उपस्थित विद्यार्थी", "Teachers Present": "उपस्थित शिक्षक",
    "Pending Approvals": "लंबित स्वीकृतियां", "Upcoming": "आगामी", "Open": "खोलें", "Submit Teacher Attendance": "शिक्षक उपस्थिति जमा करें",
    "Update & Send": "अपडेट करें और भेजें", "Posted for this date": "इस तारीख को भेजा गया", "Submit & Generate Receipt": "जमा करें और रसीद बनाएं",
    "1. Select dues being paid": "1. जमा हो रहा बकाया चुनें", "3. Payment details": "3. भुगतान विवरण", "Add item": "मद जोड़ें",
    "Date given by parent": "अभिभावक द्वारा भुगतान तिथि", "Paid by": "भुगतानकर्ता", "Mode": "माध्यम", "Given to (received by)": "प्राप्तकर्ता",
    "Note": "टिप्पणी", "Previous Receipts": "पिछली रसीदें", "Pending months": "बाकी महीने", "Last paid": "अंतिम भुगतान", "Dues": "बकाया",
    "Father": "पिता", "Mother": "माता", "Mobile": "मोबाइल",
    "Monday": "सोमवार", "Tuesday": "मंगलवार", "Wednesday": "बुधवार", "Thursday": "गुरुवार", "Friday": "शुक्रवार", "Saturday": "शनिवार", "Sunday": "रविवार",
  };
  const PATTERNS = [
    [/^(\d+) students$/, "$1 विद्यार्थी"],
    [/^Good (morning|afternoon|evening), (.+)$/, (m, part, name) => `${{ morning: "सुप्रभात", afternoon: "नमस्कार", evening: "शुभ संध्या" }[part]}, ${name}`],
    [/^Today's (Classes|Schedule) \((\w+)\)$/, (m, what, day) => `आज ${what === "Classes" ? "की कक्षाएं" : "का कार्यक्रम"} (${HI[day] || day})`],
    [/^(\d+) present$/, "$1 उपस्थित"],
    [/^(\d+) absent$/, "$1 अनुपस्थित"],
  ];

  function translateText(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (HI[trimmed]) return text.replace(trimmed, HI[trimmed]);
    for (const [re, rep] of PATTERNS) {
      if (re.test(trimmed)) return text.replace(trimmed, trimmed.replace(re, rep));
    }
    return null;
  }

  function translate(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const t = translateText(n.nodeValue);
      if (t !== null && t !== n.nodeValue) n.nodeValue = t;
    });
    if (root.querySelectorAll) {
      root.querySelectorAll("[placeholder],[title]").forEach((el) => {
        ["placeholder", "title"].forEach((a) => {
          const v = el.getAttribute(a);
          const t = v && translateText(v);
          if (t && t !== v) el.setAttribute(a, t);
        });
      });
    }
  }

  function addToggle() {
    const bars = document.querySelectorAll(".top-actions, .lang-slot");
    bars.forEach((bar) => {
      if (bar.querySelector(".lang-btn")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-light btn-sm lang-btn";
      btn.textContent = lang === "hi" ? "English" : "हिंदी";
      btn.title = lang === "hi" ? "Switch to English" : "हिंदी में देखें";
      btn.addEventListener("click", () => {
        localStorage.setItem(KEY, lang === "hi" ? "en" : "hi");
        location.reload();
      });
      bar.prepend(btn);
    });
  }

  function start() {
    addToggle();
    if (lang === "hi") {
      document.documentElement.lang = "hi";
      translate(document.body);
    }
    new MutationObserver((mutations) => {
      addToggle();
      if (lang !== "hi") return;
      mutations.forEach((m) => m.addedNodes.forEach((n) => {
        if (n.nodeType === 1) translate(n);
        else if (n.nodeType === 3) {
          const t = translateText(n.nodeValue);
          if (t !== null && t !== n.nodeValue) n.nodeValue = t;
        }
      }));
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  window.MPS_LANG = lang;
})();
