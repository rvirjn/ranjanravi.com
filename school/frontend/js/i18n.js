/**
 * Hindi interface. Translates menu items, headings, buttons and labels on screen (exact text matches),
 * so data entered by the school (names, notices, remarks) stays as typed.
 */
(() => {
  const KEY = "school_lang";
  const lang = localStorage.getItem(KEY) || "en";

  const HI = {
    // groups & navigation
    "Overview": "सारांश", "Academics": "पढ़ाई", "Finance": "वित्त", "School": "विद्यालय", "Other": "अन्य", "Requests": "अनुरोध", "Account": "खाता",
    "Daily": "दैनिक", "Classroom": "कक्षा", "Exams": "परीक्षा", "Communication": "संचार", "Staff": "स्टाफ", "Reports": "रिपोर्ट",
    "People": "लोग", "Fees": "फीस", "Settings": "सेटिंग्स",
    "Dashboard": "डैशबोर्ड", "My Profile": "मेरी प्रोफ़ाइल", "Attendance": "उपस्थिति", "Classwork & Homework": "कक्षा कार्य और गृह कार्य",
    "Timetable": "समय सारणी", "My Timetable": "मेरी समय सारणी", "Homework Submission": "गृह कार्य जमा करें", "Quizzes & Tests": "क्विज़ और टेस्ट",
    "Study Material": "अध्ययन सामग्री", "Online Classes": "ऑनलाइन कक्षाएं", "Exams & Datesheet": "परीक्षा और डेटशीट",
    "Results & Report Card": "परिणाम और रिपोर्ट कार्ड", "Remarks & Achievements": "टिप्पणियां और उपलब्धियां", "Fees & Payments": "फीस और भुगतान",
    "Notices": "सूचनाएं", "Events & Holidays": "कार्यक्रम और छुट्टियां", "Photo Gallery": "फोटो गैलरी", "Transport": "परिवहन", "Library": "पुस्तकालय",
    "Leave Application": "छुट्टी आवेदन", "Messages": "संदेश", "Complaints & Feedback": "शिकायत और सुझाव", "ID Card & Certificates": "पहचान पत्र और प्रमाण पत्र",
    "Change Password": "पासवर्ड बदलें", "Student Attendance": "विद्यार्थी उपस्थिति", "HW/CW Update": "गृह कार्य / कक्षा कार्य भेजें",
    "Attendance Report": "उपस्थिति रिपोर्ट", "Students Reports": "विद्यार्थी रिपोर्ट", "Homework Assignments": "गृह कार्य",
    "Lesson Plans": "पाठ योजना", "Marks Entry": "अंक प्रविष्टि", "Results & Report Cards": "परिणाम और रिपोर्ट कार्ड", "Grades Entry": "ग्रेड प्रविष्टि",
    "Student Remarks": "विद्यार्थी टिप्पणी", "Class Fee Dues": "कक्षा फीस बकाया", "Student Leave Requests": "विद्यार्थी छुट्टी अनुरोध",
    "My Attendance": "मेरी उपस्थिति", "My Leave": "मेरी छुट्टी", "Salary Slips": "वेतन पर्ची", "My Salary Slips": "मेरी वेतन पर्ची", "Duties & Substitutions": "ड्यूटी और प्रतिस्थापन",
    "Teacher Attendance": "शिक्षक उपस्थिति", "Student Attendance Report": "विद्यार्थी उपस्थिति रिपोर्ट", "Teacher Attendance Report": "शिक्षक उपस्थिति रिपोर्ट",
    "HW/CW Reports": "गृह कार्य / कक्षा कार्य रिपोर्ट", "Classwork": "कक्षा कार्य", "Homework": "गृह कार्य", "Posted by": "किसने भेजा", "Time": "समय",
    "Results": "परिणाम", "Student Results": "विद्यार्थी परिणाम", "Students & Admissions": "विद्यार्थी और प्रवेश", "Teachers": "शिक्षक", "Approvals": "स्वीकृतियां",
    "Exams & Admit Cards": "परीक्षा और प्रवेश पत्र", "WhatsApp": "व्हाट्सएप", "Fee Overview": "फीस सारांश", "Collect Fee": "फीस जमा करें",
    "Dues Reminders": "बकाया रिमाइंडर", "Receipts": "रसीदें", "Download Receipts": "रसीद डाउनलोड करें", "Parent Payments": "अभिभावक भुगतान", "Auto Fee Reminders": "स्वतः फीस रिमाइंडर",
    "Classes & Fees": "कक्षाएं और फीस", "Fee Report": "फीस रिपोर्ट", "Monthly Fees": "मासिक फीस", "Monthly Tuition Fee": "मासिक ट्यूशन फीस",
    "Student Portal": "विद्यार्थी पोर्टल", "Teacher Portal": "शिक्षक पोर्टल", "Principal Portal": "प्रधानाचार्य पोर्टल", "Accounts Portal": "लेखा पोर्टल",
    // buttons & common words
    "Logout": "लॉग आउट", "Website": "वेबसाइट", "Login": "लॉग इन", "Logging in...": "लॉग इन हो रहा है...", "Sending...": "भेजा जा रहा है...", "Submit": "जमा करें", "Save": "सहेजें", "Cancel": "रद्द करें", "Send": "भेजें",
    "View": "देखें", "Print": "प्रिंट", "Back": "वापस", "Add": "जोड़ें", "Delete": "हटाएं", "Approve": "स्वीकृत करें", "Reject": "अस्वीकार करें",
    "PRESENT": "उपस्थित", "ABSENT": "अनुपस्थित", "Present": "उपस्थित", "Absent": "अनुपस्थित", "Late": "देर से", "Half day": "आधा दिन", "Leave": "छुट्टी",
    "Mark All Present": "सभी को उपस्थित करें", "Submit Attendance": "उपस्थिति जमा करें", "All classes": "सभी कक्षाएं", "Not marked": "दर्ज नहीं",
    "Marked": "दर्ज", "Not posted": "नहीं भेजा", "Posted": "भेजा गया", "My class": "मेरी कक्षा", "Date": "तारीख", "Month": "महीना", "Class": "कक्षा",
    "Student": "विद्यार्थी", "Subject": "विषय", "Roll": "रोल", "Status": "स्थिति", "Amount": "राशि", "Total": "कुल", "Due": "बकाया", "Paid": "भुगतान किया",
    "Overdue": "समय सीमा पार", "Pending": "लंबित", "Approved": "स्वीकृत", "Rejected": "अस्वीकृत", "Completed": "पूर्ण", "Upcoming": "आगामी",
    "Classwork (CW)": "कक्षा कार्य (CW)", "Homework (HW)": "गृह कार्य (HW)", "WhatsApp Preview": "व्हाट्सएप पूर्वावलोकन",
    "Total Fees": "कुल फीस", "Balance Due": "शेष बकाया", "Total due": "कुल बकाया", "Tuition fee due": "ट्यूशन फीस बकाया", "Other fee due": "अन्य फीस बकाया", "Pay Online": "ऑनलाइन भुगतान", "Scan and pay": "स्कैन करके भुगतान करें",
    "Dues (month-wise)": "बकाया (महीने के अनुसार)", "Pay by Scanner": "स्कैनर से भुगतान करें",
    "Scan with PhonePe, Google Pay or Paytm, then enter the transaction ID.": "PhonePe, Google Pay या Paytm से स्कैन करें, फिर ट्रांजैक्शन आईडी लिखें।",
    "Scanner is not set for this school.": "इस स्कूल का स्कैनर सेट नहीं है।",
    "I have paid": "मैंने भुगतान कर दिया", "All Fee Items": "सभी फीस मदें", "Payment Done": "भुगतान हो गया", "Send to Accountant": "लेखाकार को भेजें",
    "Online Payments I reported": "मैंने जो ऑनलाइन भुगतान बताया", "You have not reported a payment yet.": "आपने अभी कोई भुगतान नहीं बताया।", "Not received": "प्राप्त नहीं हुआ", "Paid on / via": "भुगतान तिथि / माध्यम",
    "Today's Classes": "आज की कक्षाएं", "Homework Due": "बाकी गृह कार्य", "Latest Notices": "नई सूचनाएं", "Upcoming Exams": "आगामी परीक्षाएं",
    "Apply Leave": "छुट्टी के लिए आवेदन", "Pay Fees": "फीस भरें", "Report Card": "रिपोर्ट कार्ड", "Holistic Progress Card": "समग्र प्रगति कार्ड",
    "Admit Card": "प्रवेश पत्र", "Record Fee": "फीस दर्ज करें", "Collect": "जमा करें", "Students": "विद्यार्थी", "Working Days": "कार्य दिवस",
    "Change Password ": "पासवर्ड बदलें", "Current password": "वर्तमान पासवर्ड", "New password": "नया पासवर्ड", "Confirm new password": "नया पासवर्ड दोबारा",
    "Update Password": "पासवर्ड अपडेट करें", "At least 5 characters": "कम से कम 5 अक्षर",
    "Login ID is generated automatically. Default password: s@123": "लॉग इन आईडी अपने आप बनती है। डिफ़ॉल्ट पासवर्ड: s@123",
    "Reset password to s@123?": "पासवर्ड s@123 पर रीसेट करें?",
    "Default password: t@123": "डिफ़ॉल्ट पासवर्ड: t@123",
    "Reset password to t@123?": "पासवर्ड t@123 पर रीसेट करें?",
    "New password must be at least 5 characters": "नया पासवर्ड कम से कम 5 अक्षर का होना चाहिए",
    "Admission No.": "प्रवेश संख्या", "Date of Admission": "प्रवेश तिथि", "User ID": "यूज़र आईडी",
    "Last digits of the User ID, such as 001": "यूज़र आईडी के अंतिम अंक, जैसे 001",
    "Admission No. is required": "प्रवेश संख्या आवश्यक है",
    "Date of Admission is required": "प्रवेश तिथि आवश्यक है",
    "Joining date is required": "जॉइनिंग तिथि आवश्यक है",
    "Joining date": "जॉइनिंग तिथि", "Joining Date": "जॉइनिंग तिथि",
    "Admission No. must be a number such as 001 or 002": "प्रवेश संख्या 001 या 002 जैसी संख्या होनी चाहिए",
    "Date of Admission must be a date (YYYY-MM-DD)": "प्रवेश तिथि YYYY-MM-DD रूप में होनी चाहिए",
    "User ID is the school code, S, the year from Date of Admission, and this number. Default password: s@123": "यूज़र आईडी में विद्यालय कोड, S, प्रवेश तिथि का वर्ष और यह नंबर होता है। डिफ़ॉल्ट पासवर्ड: s@123",
    "User ID is the school code, T, and this number. Default password: t@123": "यूज़र आईडी में विद्यालय कोड, T और यह नंबर होता है। डिफ़ॉल्ट पासवर्ड: t@123",
    "User ID is the school code, P, and this number. Default password: p@123": "यूज़र आईडी में विद्यालय कोड, P और यह नंबर होता है। डिफ़ॉल्ट पासवर्ड: p@123",
    "User ID is the school code, A, and this number. Default password: a@123": "यूज़र आईडी में विद्यालय कोड, A और यह नंबर होता है। डिफ़ॉल्ट पासवर्ड: a@123",
    "Notices & Circulars": "सूचनाएं और परिपत्र", "Upcoming Events": "आगामी कार्यक्रम", "Holidays": "छुट्टियां",
    "Student Details": "विद्यार्थी विवरण", "Parents & Contact": "अभिभावक और संपर्क", "Request Update": "बदलाव का अनुरोध", "Photo": "फोटो",
    "Teacher Details": "शिक्षक विवरण", "Principal Details": "प्रधानाचार्य विवरण", "Accountant Details": "लेखाकार विवरण", "Contact": "संपर्क",
    "Request Contact Update": "संपर्क बदलाव का अनुरोध", "Send Request": "अनुरोध भेजें",
    "The school office will verify and update your record.": "विद्यालय कार्यालय जाँच कर आपका रिकॉर्ड अपडेट करेगा।",
    "Principal profile changes": "प्रधानाचार्य की प्रोफ़ाइल बदलाव", "Profile Changes": "प्रोफ़ाइल बदलाव",
    "No profile change requests from the principal.": "प्रधानाचार्य की ओर से कोई प्रोफ़ाइल बदलाव अनुरोध नहीं है।",
    "Person": "व्यक्ति",
    "Choose photo": "फोटो चुनें", "School icon": "स्कूल आइकन",
    "Weekly Timetable": "साप्ताहिक समय सारणी", "Teachers Timetable": "शिक्षक समय सारणी", "Add Period": "पीरियड जोड़ें", "Edit Period": "पीरियड बदलें",
    "All teachers": "सभी शिक्षक", "Teacher": "शिक्षक", "Day": "दिन", "Period": "पीरियड", "Start time": "आरंभ समय", "End time": "अंत समय",
    "No periods yet. Add the first one.": "अभी कोई पीरियड नहीं है। पहला जोड़ें।",
    "No periods for this teacher yet. Add the first one.": "इस शिक्षक का अभी कोई पीरियड नहीं है। पहला जोड़ें।",
    "Students see the periods of their own class.": "विद्यार्थी अपनी कक्षा के पीरियड देखते हैं।",
    "Subjects come from the class. Add them under Classes.": "विषय कक्षा से आते हैं। उन्हें कक्षाएं में जोड़ें।",
    "No subjects on this class": "इस कक्षा में कोई विषय नहीं",
    "Add subjects on this class first, under Classes": "पहले इस कक्षा के विषय कक्षाएं में जोड़ें",
    "Add a teacher first.": "पहले एक शिक्षक जोड़ें।", "Add a class first.": "पहले एक कक्षा जोड़ें।",
    "Select a subject": "विषय चुनें",
    "Fee Receipts": "फीस रसीदें", "Fee Defaulters": "फीस डिफ़ॉल्टर", "Search": "खोजें",
    "Student / Parent Login": "विद्यार्थी / अभिभावक लॉग इन", "Teacher Login": "शिक्षक लॉग इन", "Principal Login": "प्रधानाचार्य लॉग इन",
    "Accountant Login": "लेखाकार लॉग इन", "Password": "पासवर्ड", "Admission Number": "प्रवेश संख्या", "Employee ID": "कर्मचारी आईडी",
    "Forgot password?": "पासवर्ड भूल गए?", "School Portal": "विद्यालय पोर्टल", "School Management Portal (ERP)": "विद्यालय प्रबंधन पोर्टल (ERP)", "RV Smart School (ERP)": "आरवी स्मार्ट स्कूल (ERP)", "Staff Login": "स्टाफ लॉग इन",
    "About & Features": "परिचय और सुविधाएँ", "Privacy Policy": "गोपनीयता नीति", "Download Android app": "एंड्रॉइड ऐप डाउनलोड करें",
    "Send Temporary Password": "अस्थायी पासवर्ड भेजें",
    "Enter your User ID. If an email is registered, a temporary password will be sent to it.": "अपनी यूज़र आईडी लिखें। यदि ईमेल दर्ज है, तो उस पर अस्थायी पासवर्ड भेजा जाएगा।",
    "Your session has ended. Please log in again.": "आपका सत्र समाप्त हो गया है। कृपया फिर से लॉग इन करें।",
    "Incorrect User ID or password": "यूज़र आईडी या पासवर्ड गलत है",
    "If the User ID is registered with an email address, a temporary password has been sent. Otherwise please contact the school office.": "यदि यह यूज़र आईडी किसी ईमेल पते के साथ दर्ज है, तो अस्थायी पासवर्ड भेज दिया गया है। अन्यथा कृपया विद्यालय कार्यालय से संपर्क करें।",
    "Cannot reach the school server. Check your internet connection and try again.": "विद्यालय सर्वर तक पहुँच नहीं हो पा रही। अपना इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।",
    "Session expired": "सत्र समाप्त हो गया",
    "RV-Smart-School-ERP.apk · version 1.0.0": "RV-Smart-School-ERP.apk · संस्करण 1.0.0",
    "Classes": "कक्षाएं", "Add Class": "कक्षा जोड़ें", "Principal": "प्रधानाचार्य", "Add Principal": "प्रधानाचार्य जोड़ें",
    "Bus Routes": "बस रूट", "Add Bus Route": "बस रूट जोड़ें", "No bus routes yet. Add the first route.": "अभी कोई बस रूट नहीं है। पहला रूट जोड़ें।",
    "Route name": "रूट का नाम", "Bus number": "बस नंबर", "Bus No.": "बस नंबर", "Driver name": "चालक का नाम", "Driver": "चालक",
    "Driver phone": "चालक का फ़ोन", "Attendant": "अटेंडेंट", "Morning pickup starts": "सुबह पिकअप शुरू", "Afternoon drop starts": "दोपहर ड्रॉप शुरू",
    "Monthly fee (Rs)": "मासिक फीस (रु.)", "Monthly fee": "मासिक फीस", "Stops & Timings": "स्टॉप और समय", "Add stop": "स्टॉप जोड़ें",
    "Stop": "स्टॉप", "Pickup": "पिकअप", "Drop": "ड्रॉप", "Route": "रूट",
    "Add or edit a bus route under People. Fee changes apply to months billed from now on. Already billed months are not changed.": "बस रूट लोग में जोड़ें या बदलें। फीस बदलाव आगे बनने वाले महीनों पर लागू होता है। पहले से बने महीने नहीं बदलते।",
    "Leave a stop blank to skip it. Fee changes apply to months billed from now on.": "खाली स्टॉप छोड़ दिया जाता है। फीस बदलाव आगे बनने वाले महीनों पर लागू होता है।",
    "Route name is required": "रूट का नाम आवश्यक है", "Bus number is required": "बस नंबर आवश्यक है",
    "Each stop needs a name": "हर स्टॉप का नाम आवश्यक है", "A route can have at most 40 stops": "एक रूट में अधिक से अधिक 40 स्टॉप हो सकते हैं",
    "Route not found": "रूट नहीं मिला", "Monthly fee must be a number": "मासिक फीस एक संख्या होनी चाहिए",
    "Schools": "विद्यालय", "Add School": "विद्यालय जोड़ें", "Accountants": "लेखाकार", "Add Accountant": "लेखाकार जोड़ें",
    "Manage": "प्रबंधन", "Admin Portal": "एडमिन पोर्टल", "Reset password": "पासवर्ड रीसेट करें", "Remove": "हटाएं",
    "User ID": "यूज़र आईडी", "User ID:": "यूज़र आईडी:", "password:": "पासवर्ड:", "Login with your User ID": "अपनी यूज़र आईडी से लॉग इन करें", "Back to login": "लॉग इन पर वापस",
    "Attendance Today": "आज की उपस्थिति", "Homework to Review": "जांच के लिए गृह कार्य", "Ungraded submissions": "बिना ग्रेड वाले",
    "Leave Requests": "छुट्टी अनुरोध", "Awaiting your approval": "आपकी स्वीकृति बाकी", "HW/CW Today": "आज का HW/CW", "Full timetable": "पूरी समय सारणी",
    "All": "सभी", "Enter Marks": "अंक दर्ज करें", "Your Upcoming Online Classes": "आपकी आगामी ऑनलाइन कक्षाएं", "Start": "शुरू करें",
    "Recent Messages": "हाल के संदेश", "Inbox": "इनबॉक्स", "Calendar": "कैलेंडर", "Homework Pending": "बाकी गृह कार्य", "Fee Due": "फीस बकाया",
    "Last Result": "पिछला परिणाम", "Nothing overdue": "कुछ भी लंबित नहीं", "View all": "सभी देखें", "Datesheet": "डेटशीट",
    "Upcoming Online Classes": "आगामी ऑनलाइन कक्षाएं", "Join": "जुड़ें", "Collected Today": "आज जमा", "This Month": "इस महीने",
    "Total Dues": "कुल बकाया", "2+ Months Pending": "2+ महीने बाकी", "Class-wise Dues": "कक्षा अनुसार बकाया", "Fee Rules": "फीस नियम",
    "Recent Receipts": "हाल की रसीदें", "All receipts": "सभी रसीदें", "Students Present": "उपस्थित विद्यार्थी", "Teachers Present": "उपस्थित शिक्षक",
    "Pending Approvals": "लंबित स्वीकृतियां", "Upcoming": "आगामी", "Open": "खोलें", "Submit Teacher Attendance": "शिक्षक उपस्थिति जमा करें",
    "Update & Send": "अपडेट करें और भेजें",
    "View & Send": "देखें और भेजें",
    "View & Send now": "देखें और अभी भेजें",
    "WhatsApp Message": "व्हाट्सएप संदेश",
    "Same as the email above: who it is for, the subject and the message. This one is previewed, then sent on WhatsApp.": "ऊपर वाले ईमेल जैसा: किसे भेजना है, विषय और संदेश। इसे पहले देखें, फिर व्हाट्सएप पर भेजें।",
    "View & Send reminder": "देखें और रिमाइंडर भेजें",
    "View & Send reminder to all": "देखें और सभी को रिमाइंडर भेजें",
    "View & Send fee reminder": "देखें और फीस रिमाइंडर भेजें",
    "Add this to every message": "हर संदेश में यह जोड़ें",
    "Send selected": "चुने हुए को भेजें",
    "Check all": "सभी चुनें",
    "No WhatsApp number": "व्हाट्सएप नंबर नहीं",
    "From date": "आरंभ तिथि",
    "To date": "अंतिम तिथि",
    "Same as From date for one day. Pick a later To date when a festival or holiday lasts longer.": "एक दिन के लिए दोनों तिथियाँ एक जैसी रखें। त्योहार या छुट्टी कई दिन की हो तो अंतिम तिथि आगे चुनें।",
    "No WhatsApp group set": "व्हाट्सएप ग्रुप सेट नहीं है",
    "WhatsApp group name:": "व्हाट्सएप ग्रुप का नाम:",
    "WhatsApp group name": "व्हाट्सएप ग्रुप का नाम",
    "Also send on WhatsApp?": "व्हाट्सएप पर भी भेजें?",
    "WhatsApp group name for everyone": "सबके लिए व्हाट्सएप ग्रुप का नाम",
    "WhatsApp group name for teachers": "शिक्षकों के लिए व्हाट्सएप ग्रुप का नाम",
    "Select at least one person.": "कम से कम एक व्यक्ति चुनें।",
    "A selected message is empty.": "एक चुना हुआ संदेश खाली है।",
    "Nobody with dues matches this message.": "इस संदेश के लिए बकाया वाला कोई नहीं है।",
    "Uncheck anyone you do not want to message. Edit a message to change it for that family only.": "जिसे संदेश नहीं भेजना हो, उसका निशान हटा दें। किसी परिवार का संदेश बदलने के लिए उसे संपादित करें।",
    "Optional. Added before the school signature.": "वैकल्पिक। विद्यालय के हस्ताक्षर से पहले जोड़ा जाएगा।", "Posted for this date": "इस तारीख को भेजा गया", "Submit & Generate Receipt": "जमा करें और रसीद बनाएं",
    "1. Select dues being paid": "1. जमा हो रहा बकाया चुनें", "3. Payment details": "3. भुगतान विवरण", "Add item": "मद जोड़ें",
    "Date given by parent": "अभिभावक द्वारा भुगतान तिथि", "Paid by": "भुगतानकर्ता", "Mode": "माध्यम", "Given to (received by)": "प्राप्तकर्ता",
    "Note": "टिप्पणी", "Previous Receipts": "पिछली रसीदें", "Pending months": "बाकी महीने", "Last paid": "अंतिम भुगतान", "Dues": "बकाया",
    "Father": "पिता", "Mother": "माता", "Mobile": "मोबाइल",
    "10 digit mobile": "10 अंकों का मोबाइल",
    "Enter a 10 digit mobile number, without +91": "बिना +91 के 10 अंकों का मोबाइल नंबर लिखें",
    "Name cannot contain a number": "नाम में अंक नहीं हो सकता",
    "Name is required": "नाम आवश्यक है",
    "Enter a valid email address": "सही ईमेल पता लिखें",
    "Admission No. must be a number such as 001 or 002": "प्रवेश संख्या 001 या 002 जैसी संख्या होनी चाहिए",
    "Date of Admission is not a valid date": "प्रवेश तिथि सही नहीं है",
    "Joining date is not a valid date": "जॉइनिंग तिथि सही नहीं है",
    "10 digits each, separated by commas. Do not add +91.": "हर नंबर 10 अंक का हो, अल्पविराम से अलग। +91 न जोड़ें।",
    "Monday": "सोमवार", "Tuesday": "मंगलवार", "Wednesday": "बुधवार", "Thursday": "गुरुवार", "Friday": "शुक्रवार", "Saturday": "शनिवार", "Sunday": "रविवार",
  };
  const TITLES = {
    "Login | RV Smart School (ERP)": "लॉग इन | आरवी स्मार्ट स्कूल (ERP)",
    "About & Features | School Management Portal (ERP)": "परिचय और सुविधाएँ | विद्यालय प्रबंधन पोर्टल (ERP)",
    "Privacy Policy | School Management Portal (ERP)": "गोपनीयता नीति | विद्यालय प्रबंधन पोर्टल (ERP)",
  };
  const PATTERNS = [
    [/^(\d+) students$/, "$1 विद्यार्थी"],
    [/^Good (morning|afternoon|evening), (.+)$/, (m, part, name) => `${{ morning: "सुप्रभात", afternoon: "नमस्कार", evening: "शुभ संध्या" }[part]}, ${name}`],
    [/^Today's (Classes|Schedule) \((\w+)\)$/, (m, what, day) => `आज ${what === "Classes" ? "की कक्षाएं" : "का कार्यक्रम"} (${HI[day] || day})`],
    [/^(\d+) present$/, "$1 उपस्थित"],
    [/^(\d+) absent$/, "$1 अनुपस्थित"],
    [/^(\d+) of (\d+) classes posted$/, "$1 / $2 कक्षाओं का HW/CW भेजा गया"],
    [/^User ID (\S+) is already used$/, "यूज़र आईडी $1 पहले से है"],
    [/^Admission No\. (\S+) is already used$/, "प्रवेश संख्या $1 पहले से है"],
    [/^Admission No\. (\S+) is already used by another (student|teacher|principal|accountant)$/, (m, num, who) => `प्रवेश संख्या ${num} किसी अन्य ${{ student: "विद्यार्थी", teacher: "शिक्षक", principal: "प्रधानाचार्य", accountant: "लेखाकार" }[who]} के पास पहले से है`],
    [/^A route named (.+) already exists$/, "रूट $1 पहले से है"],
    [/^(.+) has (\d+) student\(s\)\. Move them to another route or own transport first\.$/, "$1 पर $2 विद्यार्थी हैं। पहले उन्हें दूसरे रूट या अपने परिवहन पर भेजें।"],
    [/^1 stop$/, "1 स्टॉप"],
    [/^(\d+) stops$/, "$1 स्टॉप"],
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

  function inHindiCopy(node) {
    const el = node.nodeType === 1 ? node : node.parentElement;
    return !!(el && el.closest && el.closest(".hi-copy"));
  }

  function translate(root) {
    if (root.nodeType === 1 && inHindiCopy(root)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => {
        if (inHindiCopy(n)) return NodeFilter.FILTER_REJECT;
        return n.parentElement && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentElement.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      },
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

  function applyLangBlocks() {
    const hi = lang === "hi";
    document.querySelectorAll(".en-copy").forEach((el) => { el.hidden = hi; });
    document.querySelectorAll(".hi-copy").forEach((el) => { el.hidden = !hi; });
    document.querySelectorAll(".en-copy [id], .hi-copy [id]").forEach((el) => {
      const base = el.id.replace(/-hi$/, "");
      const inHi = !!el.closest(".hi-copy");
      el.id = (hi === inHi) ? base : base + "-off";
    });
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }

  function start() {
    addToggle();
    applyLangBlocks();
    if (lang === "hi") {
      document.documentElement.lang = "hi";
      document.documentElement.classList.add("lang-hi");
      if (TITLES[document.title]) document.title = TITLES[document.title];
      translate(document.body);
    }
    new MutationObserver((mutations) => {
      addToggle();
      if (lang !== "hi") return;
      mutations.forEach((m) => m.addedNodes.forEach((n) => {
        if (n.nodeType === 1) translate(n);
        else if (n.nodeType === 3) {
          if (inHindiCopy(n)) return;
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
