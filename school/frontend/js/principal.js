(() => {
  const { esc, fmtDate, fmtTime, fmtMonth, money, badge, card, stat, empty, table, kv, tabs, onTabs, openForm, modal, printDoc, run, todayIso, dateChip, eventSpan, avatar } = UI;
  const PHOTO = (s) => ({ name: "photo", label: "Photo", type: "photo", value: s.photo });

  // ---------- Dashboard ----------
  async function dashboard(view) {
    const d = await MPS.get("/principal/dashboard");
    const p = d.pending;
    const pendingTotal = Object.values(p).reduce((a, b) => a + b, 0);
    view.innerHTML = `
      <div class="welcome"><div><h2>Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Principal</h2>
        <p>${esc(d.weekday)}, ${fmtDate(d.today)}${d.is_holiday ? " &middot; Holiday" : ""}</p></div>
        <div class="btn-group"><a class="btn btn-light" href="#teacher-attendance"><i class="fa fa-user-circle"></i> Teacher Attendance</a>
        <a class="btn btn-light" href="#attendance"><i class="fa fa-check-square-o"></i> Student Attendance</a>
        <a class="btn btn-light" href="#approvals"><i class="fa fa-check-circle"></i> Approvals${pendingTotal ? ` (${pendingTotal})` : ""}</a></div></div>
      <div class="grid grid-4">
        ${stat("Students Present", `${d.present} / ${d.students_total}`, { icon: "fa-users", tone: d.classes_marked < d.classes.length ? "warn" : "ok", sub: `${d.absent} absent &middot; ${d.classes_marked}/${d.classes.length} classes marked` })}
        ${stat("Teachers Present", d.teachers_marked ? `${d.teachers_present} / ${d.teachers_total}` : "Not marked", { icon: "fa-user-circle", tone: d.teachers_marked ? "ok" : "danger", sub: d.teachers_marked ? `${d.teachers_absent} absent` : '<a href="#teacher-attendance">Mark now</a>' })}
        ${stat("Fee Collected (month)", money(d.fees.collected_month), { icon: "fa-inr", tone: "info", sub: `Today ${money(d.fees.collected_today)}` })}
        ${stat("Fee Dues", money(d.fees.total_due), { icon: "fa-exclamation-circle", tone: "danger", sub: `${d.fees.defaulters} students 2+ months` })}
        ${stat("Pending Approvals", pendingTotal, { icon: "fa-check-circle", tone: pendingTotal ? "warn" : "ok", sub: '<a href="#approvals">Open</a>' })}
      </div>
      <div class="grid grid-side">
        ${card("Today's Classes", table(
          [
            { label: "Class", render: (c) => `<b>${esc(c.label)}</b><div class="small muted">${esc(c.class_teacher)}</div>` },
            { label: "Attendance", render: (c) => (c.marked ? `${badge("Marked")} <span class="small">${c.present} P &middot; ${c.absent} A</span>` : badge("Not marked")) },
            { label: "HW/CW", render: (c) => badge(c.diary ? "Posted" : "Not posted") },
          ],
          d.classes
        ), { icon: "fa-th-large", flush: true })}
        <div class="stack">
          ${card("Pending Approvals", `<ul class="list">${[
            ["Teacher leave", p.teacher_leaves], ["Lesson plans", p.lesson_plans], ["Certificates", p.certificates], ["Complaints", p.complaints],
            ["Profile changes", p.profile_requests], ["Parent fee payments", p.payment_intimations],
          ].map(([label, n]) => `<li><div class="grow">${label}</div>${n ? badge(n, "warn") : '<span class="muted">0</span>'}</li>`).join("")}</ul>`,
            { icon: "fa-check-circle", flush: true, actions: '<a class="small" href="#approvals">Open</a>' })}
          ${card("Upcoming", d.events.length ? `<ul class="list">${d.events.map((e) => `<li>${dateChip(e.date)}<div class="grow"><div class="title">${esc(e.title)}</div><div class="meta">${esc(eventSpan(e))} · ${e.type}</div></div></li>`).join("")}</ul>` : empty("Nothing upcoming"), { icon: "fa-calendar", flush: true })}
        </div>
      </div>`;
  }

  // ---------- Teacher attendance ----------
  async function teacherAttendance(view, ctx, day = todayIso()) {
    const d = await MPS.get(`/principal/staff-attendance?date=${day}`);
    const status = Object.fromEntries(d.teachers.map((t) => [t.id, t.status || (t.on_leave ? "L" : null)]));
    view.innerHTML = `
      <div class="toolbar"><div class="filters"><label style="margin:0">Date</label><input type="date" id="day" value="${day}" max="${todayIso()}"></div>
        <button class="btn" id="allP"><i class="fa fa-check-square-o"></i> Mark All Present</button></div>
      ${d.marked ? `<div class="form-ok">Already marked at ${fmtTime(d.marked_on)}. You can change and submit again.</div>` : ""}
      ${d.is_holiday ? '<div class="form-error">This date is a holiday or Sunday.</div>' : ""}
      ${card(`Teachers · ${d.day}, ${fmtDate(d.date)}`, d.teachers
        .map((t) => `<div class="att-row" data-sid="${t.id}"><div class="att-name"><div class="avatar" style="width:36px;height:36px;background:var(--info-bg);color:var(--info)">${UI.avatar(t.name, t.photo)}</div>
          <div><b>${esc(t.name)}</b><div class="small muted">${esc(t.employee_id)} &middot; ${esc(t.designation || "")}${t.on_leave ? ` &middot; ${badge("On approved leave", "warn")}` : ""}</div></div></div>
          <div class="att-actions"><button type="button" class="att-btn present" data-set="P">PRESENT</button><button type="button" class="att-btn absent" data-set="A">ABSENT</button>
          <span class="att-more"><button type="button" class="att-mini" data-set="LT">Late</button><button type="button" class="att-mini" data-set="HD">Half day</button><button type="button" class="att-mini" data-set="L">Leave</button></span></div></div>`)
        .join(""), { icon: "fa-user-circle", flush: true })}
      <div class="sticky-bar"><span id="summary"></span><button class="btn" id="submit"><i class="fa fa-check"></i> Submit Teacher Attendance</button></div>`;
    const paint = (id) => {
      const row = view.querySelector(`[data-sid="${id}"]`);
      row.querySelectorAll("[data-set]").forEach((b) => b.classList.toggle("on", b.dataset.set === status[id]));
      row.dataset.status = status[id] || "";
    };
    const summarize = () => {
      const v = Object.values(status);
      view.querySelector("#summary").innerHTML = `<b style="color:var(--success)">${v.filter((x) => ["P", "LT", "HD"].includes(x)).length} present</b> &middot; <b style="color:var(--danger)">${v.filter((x) => x === "A").length} absent</b> &middot; ${v.filter((x) => x === "L").length} leave${v.filter((x) => !x).length ? ` &middot; <span class="muted">${v.filter((x) => !x).length} not marked</span>` : ""}`;
    };
    d.teachers.forEach((t) => paint(t.id));
    summarize();
    view.querySelectorAll(".att-row [data-set]").forEach((b) => b.addEventListener("click", () => {
      const id = b.closest(".att-row").dataset.sid;
      status[id] = b.dataset.set;
      paint(id);
      summarize();
    }));
    view.querySelector("#allP").addEventListener("click", () => {
      d.teachers.forEach((t) => {
        if (status[t.id] !== "L") status[t.id] = "P";
        paint(t.id);
      });
      summarize();
    });
    view.querySelector("#day").addEventListener("change", (e) => teacherAttendance(view, ctx, e.target.value));
    view.querySelector("#submit").addEventListener("click", async () => {
      if (Object.values(status).some((v) => !v)) {
        UI.toast("Mark every teacher first", "error");
        return;
      }
      if (await run(() => MPS.post("/principal/staff-attendance", { date: d.date, records: status }))) teacherAttendance(view, ctx, d.date);
    });
  }

  async function teacherAttendanceReport(view, ctx, month) {
    const d = await MPS.get(`/principal/staff-attendance/report${month ? `?month=${month}` : ""}`);
    view.innerHTML = `<div class="toolbar"><div class="filters"><select id="month"><option value="">Whole session</option>${d.months.map((m) => `<option value="${m}" ${m === month ? "selected" : ""}>${fmtMonth(m)}</option>`).join("")}</select></div></div>
      ${card("Teacher Attendance Report", table([
        { label: "Teacher", render: (t) => `<b>${esc(t.name)}</b>` }, { label: "Days", key: "working_days", className: "right" },
        { label: "Present", key: "present", className: "right" }, { label: "Absent", key: "absent", className: "right" }, { label: "Late", key: "late", className: "right" },
        { label: "Leave", key: "leave", className: "right" }, { label: "%", render: (t) => `<div style="min-width:110px"><b>${t.percentage}%</b>${UI.progress(t.percentage)}</div>` },
      ], d.teachers), { icon: "fa-bar-chart", flush: true })}`;
    view.querySelector("#month").addEventListener("change", (e) => teacherAttendanceReport(view, ctx, e.target.value));
  }

  // ---------- Students ----------
  const STUDENT_FORM = (s, d) => {
    const numbers = (d && d.next_admission_numbers) || {};
    const suggested = s.id ? "" : (numbers[todayIso().slice(0, 4)] || "001");
    return [
    PHOTO(s),
    { name: "name", label: "Student name", required: true, value: s.name, person: true, title: "Name cannot contain a number" },
    { name: "admission_number", label: "Admission No.", required: true, value: UI.shared.admissionSuffix(s) || suggested, hint: "Last digits of the User ID, such as 001", pattern: "[0-9]{1,6}", inputmode: "numeric", maxlength: 6, title: "Admission No. must be a number such as 001 or 002" },
    { name: "admission_date", label: "Date of Admission", type: "date", required: true, min: UI.admissionDate.min, max: UI.admissionDate.max, value: s.admission_date || (s.id ? "" : todayIso()) },
    { name: "class_id", label: "Class", type: "select", required: true, options: d.classes.map((c) => ({ value: c.id, label: c.label })), value: s.class_id },
    { name: "roll_no", label: "Roll No.", type: "number", value: s.roll_no },
    { name: "gender", label: "Gender", type: "select", options: ["", "Male", "Female"], value: s.gender },
    { name: "dob", label: "Date of birth", type: "date", value: s.dob },
    { name: "father_name", label: "Father's name", required: true, value: s.father_name, person: true, title: "Name cannot contain a number" },
    { name: "father_phone", label: "Father's mobile (WhatsApp)", type: "mobile", required: true, value: s.father_phone },
    { name: "mother_name", label: "Mother's name", value: s.mother_name, person: true, title: "Name cannot contain a number" },
    { name: "mother_phone", label: "Mother's mobile (WhatsApp)", type: "mobile", value: s.mother_phone },
    { name: "phone", label: "Parent / guardian mobile", type: "mobile", value: s.phone },
    { name: "address", label: "Address", type: "textarea", value: s.address },
    { name: "transport_route_id", label: "Transport", type: "select", options: [{ value: "", label: "Own transport" }, ...d.routes.map((r) => ({ value: r.id, label: r.label }))], value: s.transport_route_id || "" },
    { name: "blood_group", label: "Blood group", value: s.blood_group },
  ];
  };

  async function students(view, ctx, state = {}) {
    const q = new URLSearchParams();
    if (state.classId) q.set("class_id", state.classId);
    if (state.q) q.set("q", state.q);
    const d = await MPS.get(`/principal/students?${q}`);
    view.innerHTML = `<div class="toolbar"><div class="filters">
        <select id="cls"><option value="">All classes</option>${d.classes.map((c) => `<option value="${c.id}" ${c.id === state.classId ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select>
        <input id="q" placeholder="Search name / admission / father / mobile" value="${esc(state.q || "")}" style="min-width:240px"></div>
        <div class="btn-group"><button class="btn" id="add"><i class="fa fa-user-plus"></i> New Admission</button></div></div>
      ${card(`Students (${d.students.length})`, table(
        [
          { label: "Class", key: "class_label" },
          { label: "Roll", key: "roll_no" },
          { label: "Student", render: (s) => `<div class="who"><div class="avatar">${avatar(s.name, s.photo)}</div><div><b>${esc(s.name)}</b>${s.active === false ? ` ${badge("Inactive", "neutral")}` : ""}<div class="small muted">${esc(s.admission_no)}</div></div></div>` },
          { label: "Father / Mobile", render: (s) => `${esc(s.father_name)}<div class="small muted">${esc(s.father_phone || "")}${s.mother_phone ? ` &middot; M: ${esc(s.mother_phone)}` : ""}</div>` },
          { label: "", className: "right nowrap", render: (s) => `<button class="btn btn-light btn-sm" data-view="${s.id}">View</button> <button class="btn btn-light btn-sm" data-edit="${s.id}"><i class="fa fa-pencil"></i></button>` },
        ],
        d.students
      ), { icon: "fa-users", flush: true })}`;
    view.querySelector("#cls").addEventListener("change", (e) => students(view, ctx, { ...state, classId: e.target.value }));
    let timer;
    view.querySelector("#q").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => students(view, ctx, { ...state, q: e.target.value }), 400);
    });
    view.querySelector("#add").addEventListener("click", () =>
      openForm({
        title: "New Admission",
        loginPreview: {
          letter: "S", password: "s@123", withYear: true, suggest: true,
          nextByYear: d.next_admission_numbers || {},
          code: (ctx.school && (ctx.school.code || ctx.school.short_name)) || "",
        },
        admissionCheck: { withYear: true, usedByYear: d.used_admission_numbers || {} },
        fields: STUDENT_FORM({ class_id: state.classId }, d), submitLabel: "Add Student",
        onSubmit: async (v) => {
          const r = await MPS.post("/principal/students", v);
          students(view, ctx, state);
          return r;
        },
      })
    );
    view.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const s = d.students.find((x) => x.id === b.dataset.edit);
      const years = [];
      const fromId = String(s.admission_no || "").match(/S(\d{4})\d{3,}$/);
      if (fromId) years.push(fromId[1]);
      const fromDate = String(s.admission_date || "").slice(0, 4);
      if (/^\d{4}$/.test(fromDate) && !years.includes(fromDate)) years.push(fromDate);
      const m = openForm({
        title: `Edit ${s.name}`,
        admissionCheck: { withYear: true, usedByYear: d.used_admission_numbers || {}, allow: { number: UI.shared.admissionSuffix(s), years } },
        fields: [...STUDENT_FORM(s, d), { name: "active", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Left school (inactive)" }], value: String(s.active !== false) }],
        onSubmit: async (v) => {
          const r = await MPS.post(`/principal/students/${s.id}`, v);
          students(view, ctx, state);
          return r;
        },
      });
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "btn btn-light btn-sm";
      reset.textContent = "Reset password";
      reset.addEventListener("click", () => confirm("Reset password to s@123?") && run(() => MPS.post(`/principal/users/student/${s.id}/reset-password`)));
      m.body.querySelector(".modal-actions").prepend(reset);
    }));
    view.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => studentDetail(b.dataset.view)));
  }

  async function studentDetail(id) {
    const m = modal("Student", UI.loading(), { wide: true });
    const d = await MPS.get(`/principal/students/${id}`);
    const s = d.student;
    m.body.innerHTML = `<div class="grid grid-4" style="margin-bottom:14px">
        ${stat("Attendance", `${d.attendance.percentage}%`, { icon: "fa-calendar-check-o" })}
        ${stat("Fee due", money(d.fees.due), { icon: "fa-inr", tone: d.fees.due ? "warn" : "ok" })}
        ${stat("Last result", d.results.length ? `${d.results[d.results.length - 1].percentage}%` : "-", { icon: "fa-trophy", tone: "info" })}
        ${stat("Pending months", d.fees.pending_months.length, { icon: "fa-exclamation-circle", tone: d.fees.pending_months.length >= 2 ? "danger" : "ok" })}</div>
      ${kv([["Name", s.name], ["User ID", s.admission_no], ["Admission No.", UI.shared.admissionSuffix(s)], ["Date of Admission", fmtDate(s.admission_date)], ["Class", d.class_label], ["Roll", s.roll_no], ["DOB", fmtDate(s.dob)], ["Father", s.father_name],
        ["Father mobile", s.father_phone], ["Mother", s.mother_name], ["Mother mobile", s.mother_phone], ["Address", s.address]])}
      <div class="modal-actions"><button class="btn" id="hpc"><i class="fa fa-id-badge"></i> Progress Card</button></div>`;
    m.body.querySelector("#hpc").addEventListener("click", () => UI.showProgressCard(`/principal/students/${id}/progress-card`));
  }

  // ---------- Teachers ----------
  async function teachers(view, ctx) {
    const d = await MPS.get("/principal/teachers");
    const nextNumber = d.next_admission_number || "001";
    const FORM = (t) => [
      PHOTO(t),
      { name: "name", label: "Name", required: true, value: t.name, person: true, title: "Name cannot contain a number" },
      { name: "admission_number", label: "Admission No.", required: true, value: UI.shared.admissionSuffix(t) || (t.id ? "" : nextNumber), hint: "Last digits of the User ID, such as 001", pattern: "[0-9]{1,6}", inputmode: "numeric", maxlength: 6, title: "Admission No. must be a number such as 001 or 002" },
      { name: "joining_date", label: "Joining date", type: "date", required: true, min: UI.admissionDate.min, max: UI.admissionDate.max, value: t.joining_date || t.admission_date || (t.id ? "" : todayIso()) },
      { name: "designation", label: "Designation", value: t.designation },
      { name: "subjects", label: "Subjects (comma separated)", value: (t.subjects || []).join(", ") },
      { name: "phone", label: "Mobile", type: "mobile", required: true, value: t.phone },
      { name: "email", label: "Email", type: "email", pattern: "[^@\\s]+@[^@\\s]+\\.[^@\\s]+", title: "Enter a valid email address", value: t.email },
      { name: "qualification", label: "Qualification", value: t.qualification },
      { name: "gender", label: "Gender", type: "select", options: ["", "Male", "Female"], value: t.gender },
      { name: "address", label: "Address", type: "textarea", value: t.address },
    ];
    view.innerHTML = card(`Teachers (${d.teachers.length})`, table(
      [
        { label: "Teacher", render: (t) => `<div class="who"><div class="avatar">${avatar(t.name, t.photo)}</div><div><b>${esc(t.name)}</b>${t.active === false ? ` ${badge("Inactive", "neutral")}` : ""}<div class="small muted">${esc(t.employee_id)} &middot; ${esc(t.designation || "")}</div></div></div>` },
        { label: "Subjects", render: (t) => `<span class="small">${esc((t.subjects || []).join(", "))}</span>` },
        { label: "Classes", render: (t) => `<span class="small">${esc(t.class_labels.join(", "))}</span>${t.class_teacher_label ? `<div>${badge(`CT ${t.class_teacher_label}`, "success")}</div>` : ""}` },
        { label: "Mobile", key: "phone" },
        { label: "Attendance", render: (t) => `${t.attendance}%` },
        { label: "", className: "right", render: (t) => `<button class="btn btn-light btn-sm" data-edit="${t.id}"><i class="fa fa-pencil"></i></button>` },
      ],
      d.teachers
    ), { icon: "fa-user-circle", flush: true, actions: '<button class="btn btn-sm" id="add"><i class="fa fa-user-plus"></i> Add Teacher</button>' });
    view.querySelector("#add").addEventListener("click", () => openForm({
      title: "Add Teacher",
      loginPreview: {
        letter: "T", password: "t@123", suggest: true, nextNumber,
        code: (ctx.school && (ctx.school.code || ctx.school.short_name)) || "",
      },
      admissionCheck: { usedNumbers: d.used_admission_numbers || [] },
      fields: FORM({}), submitLabel: "Add",
      onSubmit: async (v) => {
        const r = await MPS.post("/principal/teachers", v);
        teachers(view, ctx);
        return r;
      },
    }));
    view.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const t = d.teachers.find((x) => x.id === b.dataset.edit);
      const m = openForm({
        title: `Edit ${t.name}`,
        admissionCheck: { usedNumbers: d.used_admission_numbers || [], allow: { number: UI.shared.admissionSuffix(t) } },
        fields: [...FORM(t), { name: "active", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }], value: String(t.active !== false) }],
        onSubmit: async (v) => {
          const r = await MPS.post(`/principal/teachers/${t.id}`, v);
          teachers(view, ctx);
          return r;
        },
      });
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "btn btn-light btn-sm";
      reset.textContent = "Reset password";
      reset.addEventListener("click", () => confirm("Reset password to t@123?") && run(() => MPS.post(`/principal/users/teacher/${t.id}/reset-password`)));
      m.body.querySelector(".modal-actions").prepend(reset);
    }));
  }

  // ---------- Exams & results ----------
  async function exams(view, ctx) {
    const d = await MPS.get("/principal/exams");
    view.innerHTML = card("Exams", table(
      [
        { label: "Exam", render: (e) => `<b>${esc(e.name)}</b><div class="small muted">${esc(e.term || "")} &middot; max ${e.max_marks} per subject</div>` },
        { label: "Dates", render: (e) => `${fmtDate(e.start_date)} - ${fmtDate(e.end_date)}`, className: "nowrap" },
        { label: "Status", render: (e) => badge(e.status) },
        { label: "", className: "right nowrap", render: (e) => `<button class="btn btn-light btn-sm" data-admit="${e.id}"><i class="fa fa-id-card-o"></i> Admit cards</button>
          ${e.status === "Upcoming" ? `<button class="btn btn-light btn-sm" data-done="${e.id}">Mark completed</button>` : ""}` },
      ],
      d.exams
    ), { icon: "fa-file-text-o", flush: true, actions: '<button class="btn btn-sm" id="add"><i class="fa fa-plus"></i> Schedule Exam</button>' });
    view.querySelector("#add").addEventListener("click", () => openForm({
      title: "Schedule Exam", intro: "A datesheet is created for every class (one subject per working day from the start date).",
      fields: [
        { name: "name", label: "Exam name", required: true, placeholder: "e.g. Annual Examination" },
        { name: "term", label: "Term", type: "select", options: ["Term 1", "Term 2"], value: "Term 2" },
        { name: "start_date", label: "Start date", type: "date", required: true },
        { name: "max_marks", label: "Maximum marks per subject", type: "number", value: 100, required: true },
        { name: "time", label: "Exam time", value: "09:00 - 12:00" },
        { name: "syllabus", label: "Syllabus", type: "textarea" },
      ],
      submitLabel: "Schedule",
      onSubmit: async (v) => {
        const r = await MPS.post("/principal/exams", v);
        exams(view, ctx);
        return r;
      },
    }));
    view.querySelectorAll("[data-done]").forEach((b) => b.addEventListener("click", async () => (await run(() => MPS.post(`/principal/exams/${b.dataset.done}`, { status: "Completed" }))) && exams(view, ctx)));
    view.querySelectorAll("[data-admit]").forEach((b) => b.addEventListener("click", () => openForm({
      title: "Print admit cards",
      fields: [{ name: "class_id", label: "Class", type: "select", options: d.classes.map((c) => ({ value: c.id, label: c.label })), required: true }],
      submitLabel: "Print",
      onSubmit: async (v) => {
        const r = await MPS.get(`/principal/admit-cards?exam_id=${b.dataset.admit}&class_id=${v.class_id}`);
        printDoc("Admit Cards", r.students.map((s) => UI.admitCardHtml(s, r.exam, r.class_label)).join(""));
      },
    })));
  }

  async function results(view, ctx, state = {}) {
    const d = await MPS.get("/principal/exams");
    const examId = state.examId || (d.exams.find((e) => e.status === "Completed") || d.exams[0]).id;
    const classId = state.classId || d.classes[0].id;
    const r = await MPS.get(`/principal/results?exam_id=${examId}&class_id=${classId}`);
    const subjects = [...new Set(r.results.flatMap((x) => x.subjects.map((s) => s.subject)))];
    const sheet = table([
      { label: "Roll", key: "roll_no" }, { label: "Student", render: (x) => `<b>${esc(x.name)}</b>` },
      ...subjects.map((sub) => ({ label: sub, className: "right", render: (x) => { const s = x.subjects.find((y) => y.subject === sub); return s ? s.marks : "-"; } })),
      { label: "Total", render: (x) => (x.max_total ? `${x.total}/${x.max_total}` : "-"), className: "right" }, { label: "%", key: "percentage", className: "right" },
      { label: "Grade", render: (x) => (x.max_total ? badge(x.grade, "success") : "-") }, { label: "Rank", render: (x) => x.rank || "-", className: "right" },
    ], r.results);
    view.innerHTML = `<div class="toolbar"><div class="filters">
        <select id="exam">${d.exams.map((e) => `<option value="${e.id}" ${e.id === examId ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select>
        <select id="cls">${d.classes.map((c) => `<option value="${c.id}" ${c.id === classId ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></div>
        <button class="btn" id="print"><i class="fa fa-print"></i> Print</button></div>
      <div class="grid grid-3">${stat("Class average", `${r.class_average}%`, { icon: "fa-line-chart", tone: "info" })}
        ${stat("Passed", r.pass_count, { icon: "fa-check" })}${stat("Topper", (r.results.find((x) => x.rank === 1) || {}).name || "-", { icon: "fa-trophy", tone: "warn" })}</div>
      ${card(`${r.exam.name} · ${r.class_label}`, sheet, { icon: "fa-trophy", flush: true })}`;
    view.querySelector("#exam").addEventListener("change", (e) => results(view, ctx, { examId: e.target.value, classId }));
    view.querySelector("#cls").addEventListener("change", (e) => results(view, ctx, { examId, classId: e.target.value }));
    view.querySelector("#print").addEventListener("click", () => printDoc("Result Sheet", `<h3 style="text-align:center">${esc(r.exam.name)} - ${esc(r.class_label)}</h3>${sheet}`));
  }

  // ---------- Approvals ----------
  async function approvals(view, ctx, tab = "teacher_leaves") {
    const d = await MPS.get("/principal/approvals");
    const c = d.counts;
    const tabsHtml = tabs([
      { id: "teacher_leaves", label: `Teacher Leave (${c.teacher_leaves})` }, { id: "lesson_plans", label: `Lesson Plans (${c.lesson_plans})` },
      { id: "certificates", label: `Certificates (${c.certificates})` }, { id: "complaints", label: `Complaints (${c.complaints})` },
      { id: "profile_requests", label: `Profile Changes (${c.profile_requests})` },
    ], tab);
    const act = (id, kind) => `<button class="btn btn-sm" data-ok="${id}" data-kind="${kind}">Approve</button> <button class="btn btn-danger btn-sm" data-no="${id}" data-kind="${kind}">Reject</button>`;
    const bodies = {
      teacher_leaves: table([
        { label: "Teacher", render: (l) => `<b>${esc(l.teacher_name)}</b><div class="small muted">Applied ${fmtDate(l.applied_on)}</div>` },
        { label: "Dates", render: (l) => `${fmtDate(l.from_date)}${l.to_date !== l.from_date ? ` - ${fmtDate(l.to_date)}` : ""}`, className: "nowrap" },
        { label: "Type", key: "type" }, { label: "Reason", render: (l) => esc(l.reason) }, { label: "Status", render: (l) => badge(l.status) },
        { label: "", className: "right nowrap", render: (l) => (l.status === "Pending" ? act(l.id, "leave") : "") },
      ], d.teacher_leaves, { empty: "No leave applications." }),
      lesson_plans: table([
        { label: "Teacher", render: (p) => `<b>${esc(p.teacher_name)}</b><div class="small muted">${esc(p.class_label)} &middot; ${esc(p.subject)}</div>` },
        { label: "Week", render: (p) => fmtDate(p.week) }, { label: "Topic", render: (p) => `<b>${esc(p.topic)}</b><div class="small">${esc(p.objectives || "")}</div>` },
        { label: "Review", render: (p) => badge(p.review_status || "Pending") + (p.review_note ? `<div class="small muted">${esc(p.review_note)}</div>` : "") },
        { label: "", className: "right nowrap", render: (p) => (p.review_status === "Pending" ? `<button class="btn btn-sm" data-ok="${p.id}" data-kind="plan">Approve</button> <button class="btn btn-light btn-sm" data-no="${p.id}" data-kind="plan">Changes needed</button>` : "") },
      ], d.lesson_plans, { empty: "No lesson plans." }),
      certificates: table([
        { label: "Student", render: (r) => `<b>${esc(r.student_name)}</b><div class="small muted">${fmtDate(r.date)}</div>` },
        { label: "Certificate", key: "type" }, { label: "Purpose", render: (r) => esc(r.reason) }, { label: "Status", render: (r) => badge(r.status) + (r.remark ? `<div class="small muted">${esc(r.remark)}</div>` : "") },
        { label: "", className: "right nowrap", render: (r) => (r.status === "Pending" ? act(r.id, "cert") : "") },
      ], d.certificates, { empty: "No certificate requests." }),
      complaints: table([
        { label: "Student", render: (r) => `<b>${esc(r.student_name)}</b><div class="small muted">${fmtDate(r.date)} &middot; ${esc(r.category)}</div>` },
        { label: "Complaint", render: (r) => esc(r.description) }, { label: "Status", render: (r) => badge(r.status) + (r.response ? `<div class="small muted">${esc(r.response)}</div>` : "") },
        { label: "", className: "right", render: (r) => (r.status === "Pending" ? `<button class="btn btn-sm" data-reply="${r.id}">Respond</button>` : "") },
      ], d.complaints, { empty: "No complaints." }),
      profile_requests: table([
        { label: "Person", render: (r) => `<b>${esc(r.person_name || r.student_name)}</b><div class="small muted">${esc(r.role_label || "Student")} · ${fmtDate(r.date)}</div>` },
        { label: "Changes", render: (r) => Object.entries(r.changes).map(([k, v]) => `<div class="small">${esc({ phone: "Mobile", email: "Email", address: "Address", father_phone: "Father's mobile", mother_phone: "Mother's mobile" }[k] || k)}: <b>${esc(v)}</b></div>`).join("") },
        { label: "Status", render: (r) => badge(r.status) }, { label: "", className: "right nowrap", render: (r) => (r.status === "Pending" ? act(r.id, "profile") : "") },
      ], d.profile_requests, { empty: "No profile change requests." }),
    };
    view.innerHTML = `${tabsHtml}${card("Approvals", bodies[tab], { icon: "fa-check-circle", flush: true })}`;
    onTabs(view, (t) => approvals(view, ctx, t));
    const reload = () => { if (ctx.noteApprovals) ctx.noteApprovals(); approvals(view, ctx, tab); };
    const decide = (kind, id, approve) => {
      const map = {
        leave: () => MPS.post(`/principal/teacher-leaves/${id}`, { status: approve ? "Approved" : "Rejected" }),
        cert: () => MPS.post(`/principal/certificates/${id}`, { status: approve ? "Approved" : "Rejected", remark: approve ? "Collect from the school office" : "" }),
        profile: () => MPS.post(`/principal/profile-requests/${id}`, { status: approve ? "Approved" : "Rejected" }),
      };
      if (kind === "plan") {
        openForm({ title: approve ? "Approve lesson plan" : "Changes needed", fields: [{ name: "note", label: "Note to teacher", type: "textarea" }], submitLabel: approve ? "Approve" : "Send back",
          onSubmit: async (v) => { const r = await MPS.post(`/principal/lesson-plans/${id}`, { review_status: approve ? "Approved" : "Changes Needed", note: v.note }); reload(); return r; } });
        return;
      }
      run(map[kind]).then((r) => r && reload());
    };
    view.querySelectorAll("[data-ok]").forEach((b) => b.addEventListener("click", () => decide(b.dataset.kind, b.dataset.ok, true)));
    view.querySelectorAll("[data-no]").forEach((b) => b.addEventListener("click", () => decide(b.dataset.kind, b.dataset.no, false)));
    view.querySelectorAll("[data-reply]").forEach((b) => b.addEventListener("click", () => openForm({
      title: "Respond to complaint", fields: [{ name: "response", label: "Response", type: "textarea", required: true }], submitLabel: "Send",
      onSubmit: async (v) => { const r = await MPS.post(`/principal/complaints/${b.dataset.reply}`, v); reload(); return r; },
    })));
  }

  // ---------- Notices & events ----------
  async function notices(view, ctx) {
    const [classData, { notices: items }] = await Promise.all([MPS.get("/classes"), MPS.get("/notices")]);
    const classes = classData.classes;
    const groupAll = classData.whatsapp_group_all || "";
    const groupTeachers = classData.whatsapp_group_teachers || "";
    view.innerHTML = card("Notices & Circulars", items.length ? `<ul class="list">${items
      .map((n) => `<li>${dateChip(n.date)}<div class="grow"><div class="title">${esc(n.title)} ${badge(n.audience, "neutral")} ${n.class_label ? badge(n.class_label, "neutral") : ""}</div>
        <p class="pre">${esc(n.body)}</p><div class="meta">${esc(n.posted_by)}</div></div><button class="btn btn-light btn-sm" data-del="${n.id}"><i class="fa fa-trash"></i></button></li>`)
      .join("")}</ul>` : empty("No notices."), { icon: "fa-bullhorn", flush: true, actions: '<button class="btn btn-sm" id="add"><i class="fa fa-plus"></i> Post Notice</button>' });
    view.querySelector("#add").addEventListener("click", () => {
      const m = openForm({
        title: "Post Notice",
        fields: [
          { name: "audience", label: "For", type: "select", options: [{ value: "all", label: "Everyone" }, { value: "students", label: "Students & parents" }, { value: "teachers", label: "Teachers only" }] },
          { name: "class_id", label: "Class", type: "select", options: [{ value: "", label: "All classes" }, ...classes.map((c) => ({ value: c.id, label: c.label }))] },
          { name: "title", label: "Title", required: true },
          { name: "body", label: "Notice", type: "textarea", required: true },
          { name: "whatsapp", label: "Also send on WhatsApp?", type: "select", options: [{ value: "", label: "No" }, { value: "1", label: "Yes" }] },
        ],
        submitLabel: "Post",
        onSubmit: async (v) => { const r = await MPS.post("/principal/notices", { ...v, whatsapp: Boolean(v.whatsapp) }); notices(view, ctx); return r; },
      });
      const form = m.body.querySelector("form");
      const hint = document.createElement("div");
      hint.className = "field-hint";
      hint.hidden = true;
      form.querySelector('[name="whatsapp"]').closest(".field").appendChild(hint);
      const showGroups = () => {
        if (form.whatsapp.value !== "1") {
          hint.hidden = true;
          hint.replaceChildren();
          return;
        }
        hint.hidden = false;
        hint.replaceChildren();
        const addGroup = (group, classLabel) => {
          const line = document.createElement("div");
          if (classLabel) line.append(document.createTextNode(`${classLabel} — `));
          line.append(document.createTextNode("WhatsApp group name: "));
          if (group) {
            const name = document.createElement("b");
            name.textContent = group;
            line.append(name);
          } else {
            line.append(document.createTextNode("No WhatsApp group set"));
          }
          hint.append(line);
        };
        if (form.audience.value === "teachers") {
          addGroup(groupTeachers);
          return;
        }
        if (!form.class_id.value && form.audience.value === "all") {
          addGroup(groupAll);
          return;
        }
        const picked = form.class_id.value ? classes.filter((c) => c.id === form.class_id.value) : classes;
        picked.forEach((c) => {
          addGroup(c.whatsapp_group, c.label);
        });
      };
      ["whatsapp", "class_id", "audience"].forEach((name) => form[name].addEventListener("change", showGroups));
    });
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => confirm("Delete this notice?") && (await run(() => MPS.del(`/principal/notices/${b.dataset.del}`))) && notices(view, ctx)));
  }

  async function events(view, ctx) {
    const { events: items } = await MPS.get("/events");
    view.innerHTML = card("Events & Holidays", table([
      { label: "Date", render: (e) => `<b>${esc(eventSpan(e))}</b>`, className: "nowrap" }, { label: "Title", render: (e) => `<b>${esc(e.title)}</b><div class="small muted">${esc(e.description || "")}</div>` },
      { label: "Type", render: (e) => badge(e.type, e.type === "holiday" ? "warn" : "neutral") },
      { label: "", className: "right", render: (e) => `<button class="btn btn-light btn-sm" data-del="${e.id}"><i class="fa fa-trash"></i></button>` },
    ], items), { icon: "fa-calendar", flush: true, actions: '<button class="btn btn-sm" id="add"><i class="fa fa-plus"></i> Add</button>' });
    view.querySelector("#add").addEventListener("click", () => openForm({
      title: "Add Event / Holiday",
      fields: [
        { name: "title", label: "Title", required: true },
        { name: "date", label: "From date", type: "date", required: true, value: todayIso() },
        { name: "end_date", label: "To date", type: "date", required: true, value: todayIso(), hint: "Same as From date for one day. Pick a later To date when a festival or holiday lasts longer." },
        { name: "type", label: "Type", type: "select", options: [{ value: "event", label: "Event" }, { value: "holiday", label: "Holiday" }] },
        { name: "description", label: "Description", type: "textarea" },
      ],
      submitLabel: "Add",
      onSubmit: async (v) => { const r = await MPS.post("/principal/events", v); events(view, ctx); return r; },
    }));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => confirm("Remove?") && (await run(() => MPS.del(`/principal/events/${b.dataset.del}`))) && events(view, ctx)));
  }

  // ---------- Classes ----------
  async function classes(view, ctx) {
    const d = await MPS.get("/principal/classes");
    const FORM = (c) => [
      { name: "name", label: "Class name", required: true, value: c.name, placeholder: "e.g. Class 8" },
      { name: "section", label: "Section", value: c.section ?? "A" },
      { name: "room", label: "Room", value: c.room },
      { name: "subjects", label: "Subjects (comma separated)", value: (c.subjects || []).join(", "), placeholder: "English, Hindi, Mathematics" },
      { name: "whatsapp_group", label: "WhatsApp group name", value: c.whatsapp_group, hint: "Exact name of the class WhatsApp group" },
      { name: "class_teacher_id", label: "Class teacher", type: "select", placeholder: "Not assigned", options: d.teachers.map((t) => ({ value: t.id, label: t.name })), value: c.class_teacher_id },
      { name: "order", label: "Display order", type: "number", value: c.order, hint: "Lower numbers are listed first" },
    ];
    view.innerHTML = card(`Classes (${d.classes.length})`, table(
      [
        { label: "Class", render: (c) => `<b>${esc(c.name)}</b><div class="small muted">Section ${esc(c.section || "-")}${c.room ? ` &middot; ${esc(c.room)}` : ""}</div>` },
        { label: "Subjects", render: (c) => `<span class="small">${esc((c.subjects || []).join(", "))}</span>` },
        { label: "Class teacher", render: (c) => esc(c.class_teacher_name || "-") },
        { label: "Students", key: "student_count", className: "right" },
        { label: "Monthly fee", render: (c) => money(c.monthly_fee), className: "right" },
        { label: "", className: "right nowrap", render: (c) => `<button class="btn btn-light btn-sm" data-edit="${c.id}"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-light btn-sm" data-del="${c.id}" title="Remove"><i class="fa fa-trash"></i></button>` },
      ],
      d.classes,
      { empty: "No classes yet. Add the first class." }
    ), { icon: "fa-th-large", flush: true, actions: '<button class="btn btn-sm" id="add"><i class="fa fa-plus"></i> Add Class</button>' });
    view.querySelector("#add").addEventListener("click", () => openForm({
      title: "Add Class", fields: FORM({}), submitLabel: "Add",
      onSubmit: async (v) => { const r = await MPS.post("/principal/classes", v); classes(view, ctx); return r; },
    }));
    view.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const c = d.classes.find((x) => x.id === b.dataset.edit);
      openForm({
        title: `Edit ${c.name}`, fields: FORM(c),
        onSubmit: async (v) => { const r = await MPS.post(`/principal/classes/${c.id}`, v); classes(view, ctx); return r; },
      });
    }));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      const c = d.classes.find((x) => x.id === b.dataset.del);
      if (!confirm(`Remove ${c.name}? Its timetable is removed too. Classes with students cannot be removed.`)) return;
      if (await run(() => MPS.del(`/principal/classes/${c.id}`))) classes(view, ctx);
    }));
  }

  UI.startApp({
    role: "principal",
    portalName: "Principal Portal",
    userSub: (u) => `${u.employee_id} · Principal`,
    modules: [
      { id: "dashboard", label: "Dashboard", icon: "fa-tachometer", group: "Overview", render: dashboard },
      { id: "profile", label: "My Profile", icon: "fa-user", group: "Overview", render: (v, c) => UI.shared.myProfile(v, c) },
      { id: "approvals", label: "Approvals", icon: "fa-check-circle", group: "Overview", render: (v, c) => approvals(v, c) },
      { id: "teacher-attendance", label: "Teacher Attendance", icon: "fa-user-circle", group: "Daily", render: (v, c) => teacherAttendance(v, c) },
      { id: "attendance", label: "Student Attendance", icon: "fa-check-square-o", group: "Daily", render: (v, c) => UI.shared.classAttendance(v, c) },
      { id: "diary", label: "HW/CW Update", icon: "fa-whatsapp", group: "Daily", render: (v, c) => UI.shared.diary(v, c) },
      { id: "attendance-report", label: "Student Attendance Report", icon: "fa-bar-chart", group: "Reports", render: (v, c) => UI.shared.attendanceReport(v, c) },
      { id: "teacher-report", label: "Teacher Attendance Report", icon: "fa-line-chart", group: "Reports", render: (v, c) => teacherAttendanceReport(v, c) },
      { id: "results", label: "Results", icon: "fa-trophy", group: "Reports", render: (v, c) => results(v, c) },
      { id: "students", label: "Students & Admissions", icon: "fa-users", group: "People", render: (v, c) => students(v, c) },
      { id: "teachers", label: "Teachers", icon: "fa-user-circle", group: "People", render: teachers },
      { id: "exams", label: "Exams & Admit Cards", icon: "fa-file-text-o", group: "Academics", render: exams },
      { id: "notices", label: "Notices", icon: "fa-bullhorn", group: "Communication", render: notices },
      { id: "events", label: "Events & Holidays", icon: "fa-calendar", group: "Communication", render: events },
      { id: "gallery", label: "Photo Gallery", icon: "fa-picture-o", group: "Communication", render: (v, c) => UI.shared.gallery(v, c, { manage: true }) },
      { id: "whatsapp", label: "WhatsApp", icon: "fa-whatsapp", group: "Communication", render: (v, c) => UI.shared.whatsapp(v, c) },
      { id: "collect", label: "Student Fee Update", icon: "fa-money", group: "Fees", render: (v, c) => Accounts.collect(v, c) },
      { id: "defaulters", label: "Dues & Defaulters", icon: "fa-exclamation-triangle", group: "Fees", render: (v, c) => Accounts.defaulters(v, c) },
      { id: "receipts", label: "Receipts", icon: "fa-file-text-o", group: "Fees", render: (v, c) => Accounts.receipts(v, c) },
      { id: "intimations", label: "Parent Payments", icon: "fa-bell", group: "Fees", render: Accounts.intimations },
      { id: "reminders", label: "Fee Reminders", icon: "fa-clock-o", group: "Fees", render: Accounts.reminders },
      { id: "classes", label: "Classes", icon: "fa-th-large", group: "Settings", render: (v, c) => classes(v, c) },
      { id: "password", label: "Change Password", icon: "fa-key", group: "Account", render: UI.shared.password },
    ],
  });
})();
