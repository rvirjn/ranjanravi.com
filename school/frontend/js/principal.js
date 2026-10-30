(() => {
  const { esc, fmtDate, fmtTime, fmtDateTime, fmtMonth, money, badge, card, stat, empty, table, kv, tabs, onTabs, openForm, modal, printDoc, run, todayIso, dateChip, eventSpan, avatar } = UI;
  const PHOTO = (s) => ({ name: "photo", label: "Photo", type: "photo", value: s.photo });

  const checkInCase = (row) => esc(row.checkin_label || (row.check_in ? "Check-In" : ""));

  function punchHtml(c) {
    c = c || {};
    let action;
    if (c.check_out) {
      action = `<p style="margin:0 0 8px"><b>${checkInCase(c)}</b> &middot; <b>Out</b> ${fmtTime(c.check_out)}${c.auto_checkout ? ` ${badge("Auto check-out", "warn")}` : ""}</p>`;
      if (c.checkin_open !== false) action += `<button class="btn" id="checkinBtn" type="button"><i class="fa fa-sign-in"></i> Check-In</button>`;
    } else if (c.check_in) {
      const note = c.checkin_open === false
        ? "Check-out after school closing time is saved on your attendance. It is not sent on WhatsApp."
        : "Checking out before school closing time is sent on WhatsApp.";
      action = `<p style="margin:0 0 8px"><b>${checkInCase(c)}</b></p>
        <button class="btn" id="checkoutBtn" type="button"><i class="fa fa-sign-out"></i> Check out</button>
        <p class="small muted" style="margin-top:8px">${note}</p>`;
    } else if (c.checkin_open === false) {
      action = `<p style="margin:0">Check-in is not allowed after school closing time.</p>`;
    } else {
      action = `<button class="btn" id="checkinBtn" type="button"><i class="fa fa-sign-in"></i> Check-In</button>`;
    }
    return card("Check In / Check Out", action, { icon: "fa-sign-in" });
  }

  function bindPunch(root, reload) {
    const inn = root.querySelector("#checkinBtn");
    const out = root.querySelector("#checkoutBtn");
    if (inn) inn.addEventListener("click", async () => { if (await run(() => MPS.post("/principal/checkin"))) reload(); });
    if (out) out.addEventListener("click", async () => { if (await run(() => MPS.post("/principal/checkout"))) reload(); });
  }

  function checkinWhatsapp(d) {
    const group = d.whatsapp_group
      ? `Sent to WhatsApp group name: <b>${esc(d.whatsapp_group)}</b> when you check in.`
      : "No WhatsApp group set, so this check-in message will not be sent.";
    const early = d.checkout_message
      ? `<p class="small" style="margin:12px 0 10px">Checking out before school closing time is sent to the same group.</p><div class="preview-box">${esc(d.checkout_message)}</div>`
      : "";
    return card("Check-in WhatsApp message", `<p class="small" style="margin:0 0 10px">${group}</p><div class="preview-box">${esc(d.checkin_message || "")}</div>${early}`, { icon: "fa-whatsapp" });
  }

  async function checkIn(view) {
    const d = await MPS.get("/principal/checkin");
    view.innerHTML = `${punchHtml(d.today)}
      ${checkinWhatsapp(d)}
      ${card("Recent check-ins", table(
        [
          { label: "Date", render: (x) => fmtDate(x.date) },
          { label: "In", render: (x) => (x.check_in ? checkInCase(x) : "-") },
          { label: "Out", render: (x) => (x.check_out ? `${fmtTime(x.check_out)}${x.auto_checkout ? ` ${badge("Auto", "warn")}` : ""}` : "-") },
        ],
        d.recent,
        { empty: "No check-ins yet.", emptyIcon: "fa-sign-in" }
      ), { icon: "fa-clock-o", flush: true })}`;
    bindPunch(view, () => checkIn(view));
  }

  // ---------- Dashboard ----------
  async function dashboard(view) {
    const d = await MPS.get("/principal/dashboard");
    const p = d.pending;
    const pendingTotal = Object.values(p).reduce((a, b) => a + b, 0);
    view.innerHTML = `
      <div class="welcome"><div><h2>Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Principal</h2>
        <p>${esc(d.weekday)}, ${fmtDate(d.today)}${d.is_holiday ? " &middot; Holiday" : ""}</p></div>
        <div class="btn-group"><a class="btn btn-light" href="#teacher-attendance"><i class="fa fa-user-circle"></i> Teacher Attendance</a>
        <a class="btn btn-light" href="#approvals"><i class="fa fa-check-circle"></i> Approvals${pendingTotal ? ` (${pendingTotal})` : ""}</a></div></div>
      ${punchHtml(d.checkin)}
      <div class="grid grid-4">
        ${stat("Students Present", `${d.present} / ${d.students_total}`, { icon: "fa-users", tone: d.classes_marked < d.classes.length ? "warn" : "ok", sub: `${d.absent} absent &middot; ${d.classes_marked}/${d.classes.length} classes marked` })}
        ${stat("Teachers Present", d.teachers_recorded ? `${d.teachers_present} / ${d.teachers_total}` : "Not marked", { icon: "fa-user-circle", tone: d.teachers_marked ? "ok" : d.teachers_recorded ? "warn" : "danger", sub: d.teachers_marked ? `${d.teachers_absent} absent` : (d.teachers_recorded ? `${d.teachers_total - d.teachers_recorded} not marked · <a href="#teacher-attendance">Open</a>` : '<a href="#teacher-attendance">Mark now</a>') })}
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
    bindPunch(view, () => dashboard(view));
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
      ${d.school_open_time ? `<p class="small muted">School time ${fmtTime(d.school_open_time)} – ${fmtTime(d.school_close_time)}. In and out times come from teacher check-in.</p>` : ""}
      ${card(`Teachers · ${d.day}, ${fmtDate(d.date)}`, d.teachers
        .map((t) => `<div class="att-row" data-sid="${t.id}"><div class="att-name"><div class="avatar" style="width:36px;height:36px;background:var(--info-bg);color:var(--info)">${UI.avatar(t.name, t.photo)}</div>
          <div><b>${esc(t.name)}</b><div class="small muted">${esc(t.employee_id)} &middot; ${esc(t.designation || "")}${t.on_leave ? ` &middot; ${badge("On approved leave", "warn")}` : ""}</div>
          <div class="small muted">${t.check_in ? `${esc(t.checkin_label || "Check-In")}${t.check_out ? ` · Out ${fmtTime(t.check_out)}${t.auto_checkout ? " (auto)" : ""}` : " · Not checked out"}` : "Not checked in"}</div></div></div>
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
    const suggested = s.id ? "" : ((d && d.next_admission_number) || "001");
    return [
    PHOTO(s),
    { name: "name", label: "Student name", required: true, value: s.name, person: true, title: "Name cannot contain a number" },
    { name: "designation", label: "Designation", value: s.designation || "Student" },
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
          { label: "", className: "right nowrap", render: (s) => `<button class="btn btn-light btn-sm" data-view="${s.id}">View</button> <button class="btn btn-light btn-sm" data-edit="${s.id}" title="Edit"><i class="fa fa-pencil"></i></button> <button class="btn btn-light btn-sm" data-left="${s.id}" title="Left school"><i class="fa fa-sign-out"></i></button> <button class="btn btn-light btn-sm" data-del="${s.id}" title="Delete"><i class="fa fa-trash"></i></button>` },
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
          nextNumber: d.next_admission_number || "001",
          code: (ctx.school && (ctx.school.code || ctx.school.short_name)) || "",
        },
        admissionCheck: { usedNumbers: d.used_admission_numbers || [], who: "student" },
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
      const m = openForm({
        title: `Edit ${s.name}`,
        admissionCheck: { usedNumbers: d.used_admission_numbers || [], who: "student", allow: { number: UI.shared.admissionSuffix(s) } },
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
    view.querySelectorAll("[data-left]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Mark this student as left school?")) return;
      if (await run(() => MPS.post(`/principal/students/${b.dataset.left}`, { active: "false" }))) students(view, ctx, state);
    }));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this student? All data, including fee receipts, will be deleted.")) return;
      if (await run(() => MPS.del(`/principal/students/${b.dataset.del}`))) students(view, ctx, state);
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
      { name: "designation", label: "Designation", value: t.designation || "Teacher" },
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
        { label: "", className: "right nowrap", render: (t) => `<button class="btn btn-light btn-sm" data-edit="${t.id}" title="Edit"><i class="fa fa-pencil"></i></button> <button class="btn btn-light btn-sm" data-left="${t.id}" title="Left school"><i class="fa fa-sign-out"></i></button> <button class="btn btn-light btn-sm" data-del="${t.id}" title="Delete"><i class="fa fa-trash"></i></button>` },
      ],
      d.teachers
    ), { icon: "fa-user-circle", flush: true, actions: '<button class="btn btn-sm" id="add"><i class="fa fa-user-plus"></i> Add Teacher</button>' });
    view.querySelector("#add").addEventListener("click", () => openForm({
      title: "Add Teacher",
      loginPreview: {
        letter: "T", password: "t@123", suggest: true, nextNumber,
        code: (ctx.school && (ctx.school.code || ctx.school.short_name)) || "",
      },
      admissionCheck: { usedNumbers: d.used_admission_numbers || [], who: "teacher" },
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
        admissionCheck: { usedNumbers: d.used_admission_numbers || [], who: "teacher", allow: { number: UI.shared.admissionSuffix(t) } },
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
    view.querySelectorAll("[data-left]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Mark this teacher as left school?")) return;
      if (await run(() => MPS.post(`/principal/teachers/${b.dataset.left}`, { active: "false" }))) teachers(view, ctx);
    }));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this teacher? All data, including salary slips, will be deleted.")) return;
      if (await run(() => MPS.del(`/principal/teachers/${b.dataset.del}`))) teachers(view, ctx);
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
      { id: "certificates", label: `Certificates (${c.certificates})` }, { id: "complaints", label: `Complains (${c.complaints})` },
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
      profile_requests: table([
        { label: "Person", render: (r) => `<b>${esc(r.person_name || r.student_name)}</b><div class="small muted">${esc(r.role_label || "Student")} · ${fmtDate(r.date)}</div>` },
        { label: "Changes", render: (r) => Object.entries(r.changes).map(([k, v]) => `<div class="small">${esc({ phone: "Mobile", email: "Email", address: "Address", father_phone: "Father's mobile", mother_phone: "Mother's mobile" }[k] || k)}: <b>${esc(v)}</b></div>`).join("") },
        { label: "Status", render: (r) => badge(r.status) }, { label: "", className: "right nowrap", render: (r) => (r.status === "Pending" ? act(r.id, "profile") : "") },
      ], d.profile_requests, { empty: "No profile change requests." }),
    };
    if (tab === "complaints") {
      view.innerHTML = `${tabsHtml}<div id="approvalBody"></div>`;
      onTabs(view, (t) => approvals(view, ctx, t));
      await UI.shared.complaints(view.querySelector("#approvalBody"));
      return;
    }
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
      .join("")}</ul>` : empty("No notices."), { icon: "fa-bullhorn", flush: true, actions: '<button class="btn btn-sm" id="add"><i class="fa fa-plus"></i> Post</button>' });
    view.querySelector("#add").addEventListener("click", () => {
      const m = openForm({
        title: "Post",
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

  async function diaryReport(view, ctx, state = {}) {
    const day = state.date || todayIso();
    const q = new URLSearchParams({ date: day });
    if (state.classId) q.set("class_id", state.classId);
    const d = await MPS.get(`/principal/diary-report?${q}`);
    const dash = '<span class="muted">-</span>';
    view.innerHTML = `
      <div class="toolbar"><div class="filters">
        <label style="margin:0">Date</label><input type="date" id="day" value="${day}" max="${todayIso()}">
        <select id="cls"><option value="">All classes</option>${d.classes.map((c) => `<option value="${c.id}" ${c.id === state.classId ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select>
      </div>${badge(d.summary, d.posted_classes === d.total_classes && d.total_classes ? "success" : "warn")}</div>
      ${card(`HW/CW · ${fmtDate(d.date)}`, table(
        [
          { label: "Class", render: (r) => `<b>${esc(r.class_label)}</b>` },
          { label: "Subject", render: (r) => (r.posted ? esc(r.subject) || dash : badge("Not posted", "warn")) },
          { label: "Classwork", render: (r) => (r.cw ? esc(r.cw) : dash) },
          { label: "Homework", render: (r) => (r.hw ? esc(r.hw) : dash) },
          { label: "Posted by", render: (r) => (r.teacher_name ? esc(r.teacher_name) : dash) },
          { label: "Time", render: (r) => (r.posted_on ? fmtTime(r.posted_on) : dash) },
        ],
        d.rows,
        { empty: "No classes to show." }
      ), { icon: "fa-book", flush: true })}`;
    view.querySelector("#day").addEventListener("change", (e) => diaryReport(view, ctx, { date: e.target.value, classId: state.classId }));
    view.querySelector("#cls").addEventListener("change", (e) => diaryReport(view, ctx, { date: day, classId: e.target.value }));
  }

  // ---------- Teachers timetable ----------
  async function teacherTimetable(view, ctx, state = {}) {
    const d = await MPS.get("/principal/timetable");
    const teacherId = d.teachers.some((t) => t.id === state.teacherId) ? state.teacherId : "";
    const mine = d.periods.filter((p) => !teacherId || p.teacher_id === teacherId);
    const teacher = d.teachers.find((t) => t.id === teacherId);
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const numbers = [...new Set(mine.map((p) => p.period))].sort((a, b) => a - b);
    const times = {};
    mine.forEach((p) => (times[p.period] = `${fmtTime(p.start)} - ${fmtTime(p.end)}`));
    const cell = (day, n) => {
      const p = mine.find((x) => x.day === day && x.period === n);
      if (!p) return `<td class="slot ${day === today ? "today" : ""}"><span class="muted">-</span></td>`;
      return `<td class="slot ${day === today ? "today" : ""}"><b>${esc(p.subject)}</b><span>${esc(p.class_label)}</span>
        <div class="btn-group" style="margin-top:6px;justify-content:center">
          <button class="btn btn-light btn-sm" data-edit="${esc(p.id)}" title="Edit"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-light btn-sm" data-del="${esc(p.id)}" title="Remove"><i class="fa fa-trash"></i></button>
        </div></td>`;
    };
    const grid = numbers.length
      ? `<div class="table-wrap"><table class="table timetable"><thead><tr><th>Time</th>${d.days
          .map((day) => `<th class="${day === today ? "today" : ""}">${esc(day)}</th>`).join("")}</tr></thead><tbody>${numbers
          .map((n) => `<tr><td class="period-col"><b>Period ${n}</b>${times[n]}</td>${d.days.map((day) => cell(day, n)).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      : empty(teacherId ? "No periods for this teacher yet. Add the first one." : "No periods yet. Add the first one.", "fa-clock-o");
    const list = table(
      [
        { label: "Teacher", render: (p) => `<b>${esc(p.teacher_name)}</b>` },
        { label: "Day", key: "day" },
        { label: "Period", render: (p) => `Period ${p.period}`, className: "nowrap" },
        { label: "Time", render: (p) => `${fmtTime(p.start)} - ${fmtTime(p.end)}`, className: "nowrap" },
        { label: "Class", key: "class_label" },
        { label: "Subject", render: (p) => esc(p.subject) },
        { label: "", className: "right nowrap", render: (p) => `<button class="btn btn-light btn-sm" data-edit="${esc(p.id)}" title="Edit"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-light btn-sm" data-del="${esc(p.id)}" title="Remove"><i class="fa fa-trash"></i></button>` },
      ],
      mine,
      { empty: "No periods yet. Add the first one." }
    );
    view.innerHTML = `
      <div class="toolbar"><div class="filters">
        <label style="margin:0">Teacher</label>
        <select id="teacher"><option value="">All teachers</option>${d.teachers.map((t) => `<option value="${esc(t.id)}" ${t.id === teacherId ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
      </div><span class="small muted">${d.assembly_from && d.assembly_to ? `Assembly ${fmtTime(d.assembly_from)} – ${fmtTime(d.assembly_to)}. Periods start after ${fmtTime(d.assembly_to)}.` : "Set the assembly timing on the school before adding a period."} Students see the periods of their own class.</span></div>
      ${card(teacher ? teacher.name : `All teachers (${mine.length})`, teacherId ? grid : list, {
        icon: "fa-clock-o", flush: true,
        actions: '<button class="btn btn-sm" id="add"><i class="fa fa-plus"></i> Add Period</button>',
      })}`;
    const reload = (id) => teacherTimetable(view, ctx, { teacherId: id === undefined ? teacherId : id });
    view.querySelector("#teacher").addEventListener("change", (e) => reload(e.target.value));
    view.querySelector("#add").addEventListener("click", () => periodForm(d, { teacher_id: teacherId }, reload));
    view.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const p = d.periods.find((x) => x.id === b.dataset.edit);
      if (p) periodForm(d, p, reload);
    }));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      const p = d.periods.find((x) => x.id === b.dataset.del);
      if (!p || !confirm(`Remove ${p.subject} (${p.class_label}) on ${p.day}, period ${p.period}?`)) return;
      if (await run(() => MPS.del(`/principal/timetable/${p.id}`))) reload();
    }));
  }

  function periodForm(d, period, reload) {
    if (!d.teachers.length) {
      UI.toast("Add a teacher first.", "error");
      return;
    }
    if (!d.classes.length) {
      UI.toast("Add a class first.", "error");
      return;
    }
    const teachers = d.teachers.slice();
    if (period.teacher_id && !teachers.some((t) => t.id === period.teacher_id)) {
      teachers.unshift({ id: period.teacher_id, name: period.teacher_name || period.teacher_id });
    }
    const classId = period.class_id || d.classes[0].id;
    const known = d.periods.find((p) => p.period === Number(period.period || 1) && p.id !== period.id);
    const start = String(period.start || (known && known.start) || "").slice(0, 5);
    const end = String(period.end || (known && known.end) || "").slice(0, 5);
    const afterAssembly = d.assembly_to ? `Must start after assembly ends (${fmtTime(d.assembly_to)}).` : "Set the assembly timing on the school first.";
    const subjectsOf = (id) => {
      const cls = d.classes.find((c) => c.id === id);
      return (cls && cls.subjects) || [];
    };
    const m = openForm({
      title: period.id ? "Edit Period" : "Add Period",
      fields: [
        { name: "teacher_id", label: "Teacher", type: "select", required: true, value: period.teacher_id || d.teachers[0].id, options: teachers.map((t) => ({ value: t.id, label: t.name })) },
        { name: "class_id", label: "Class", type: "select", required: true, value: classId, options: d.classes.map((c) => ({ value: c.id, label: c.label })) },
        { name: "subject", label: "Subject", type: "select", required: true, value: period.subject, placeholder: "Select a subject", options: subjectsOf(classId).map((s) => ({ value: s, label: s })), hint: "Subjects come from the class. Add them under Classes." },
        { name: "day", label: "Day", type: "select", required: true, value: period.day || "Monday", options: d.days },
        { name: "period", label: "Period", type: "number", required: true, min: 1, max: 12, value: period.period || 1 },
        { name: "start", label: "Start time", type: "time", required: true, value: start, hint: afterAssembly },
        { name: "end", label: "End time", type: "time", required: true, value: end },
      ],
      submitLabel: period.id ? "Save" : "Add",
      onSubmit: async (v) => {
        const path = period.id ? `/principal/timetable/${period.id}` : "/principal/timetable";
        const r = await MPS.post(path, v);
        reload(v.teacher_id);
        return r;
      },
    });
    const form = m.body.querySelector("form");
    const subject = form.subject;
    const paintSubjects = () => {
      const current = subject.value;
      const options = subjectsOf(form.class_id.value);
      subject.innerHTML = options.length
        ? options.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")
        : `<option value="">No subjects on this class</option>`;
      if (options.includes(current)) subject.value = current;
      subject.setCustomValidity(options.length ? "" : "Add subjects on this class first, under Classes");
    };
    form.class_id.addEventListener("change", paintSubjects);
    paintSubjects();
    form.period.addEventListener("change", () => {
      const match = d.periods.find((p) => String(p.period) === form.period.value && p.id !== period.id);
      if (!match) return;
      form.start.value = String(match.start).slice(0, 5);
      form.end.value = String(match.end).slice(0, 5);
    });
  }

  const selectHtml = (id, options) =>
    `<select id="${id}">${options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select>`;

  async function messages(view, ctx, mode = "inbox") {
    const d = await MPS.get("/principal/messages");
    const recipients = [
      ...d.teachers.map((t) => ({ value: `teacher|${t.id}`, label: `Teacher: ${t.name}` })),
      ...d.classes.map((c) => ({ value: `class|${c.id}`, label: `Whole class: ${c.label}` })),
      ...d.students.map((s) => ({ value: `student|${s.id}`, label: `${s.name} (${s.class_label})` })),
    ];
    const waRecipients = [{ value: "teachers|all", label: "All teachers" }, ...recipients];
    const groupTeachers = d.whatsapp_group_teachers || "";
    const items = d[mode];
    const teacherList = d.teachers.length
      ? `<ul class="list">${d.teachers
        .map((t) => `<li><div class="avatar" style="background:var(--info-bg);color:var(--info)">${UI.initials(t.name)}</div><div class="grow"><div class="title">${esc(t.name)}</div><div class="meta">${esc(t.designation || t.employee_id)}</div></div></li>`)
        .join("")}</ul>`
      : empty("No teachers yet.", "fa-users");
    view.innerHTML = `<div class="grid grid-side">
      <div>${tabs([{ id: "inbox", label: `Inbox (${d.inbox.length})` }, { id: "sent", label: `Sent (${d.sent.length})` }], mode)}
      ${card(mode === "inbox" ? "Inbox" : "Sent Messages", items.length ? `<ul class="list">${items
        .map((m) => `<li style="cursor:pointer" data-msg="${m.id}"><div class="avatar" style="background:var(--green-100)">${UI.initials(mode === "inbox" ? m.from_name : m.to_name)}</div>
          <div class="grow"><div class="title">${esc(m.subject)}</div><div class="meta">${mode === "inbox" ? "From" : "To"} ${esc(mode === "inbox" ? m.from_name : m.to_name)} · ${fmtDateTime(m.date)}</div>
          <div class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.body)}</div></div>
          ${mode === "inbox" && (m.from_type === "student" || m.from_type === "teacher") ? `<button class="btn btn-light btn-sm" data-reply="${m.id}">Reply</button>` : ""}</li>`)
        .join("")}</ul>` : empty("No messages.", "fa-envelope-o"), { icon: "fa-envelope-o", flush: true, actions: '<button class="btn btn-sm" id="composeBtn"><i class="fa fa-pencil"></i> New Message</button>' })}
      <div style="margin-top:16px">${card("WhatsApp Message", `<p class="small muted">Same as the email above: who it is for, the subject and the message. This one is previewed, then sent on WhatsApp.</p>
        <div class="field"><label for="waTo">To</label>${selectHtml("waTo", waRecipients)}
          <p class="small muted" id="waGroupHint" hidden></p></div>
        <div class="field"><label for="waSubject">Subject</label><input id="waSubject" maxlength="200"></div>
        <div class="field"><label for="waBody">Message</label><textarea id="waBody"></textarea></div>
        <button class="btn" id="waSend" type="button"><i class="fa fa-whatsapp"></i> View &amp; Send</button>`, { icon: "fa-whatsapp" })}</div></div>
      ${card("Teachers", teacherList, { icon: "fa-users", flush: true })}</div>`;
    onTabs(view, (tab) => messages(view, ctx, tab));
    view.querySelectorAll("[data-msg]").forEach((li) =>
      li.addEventListener("click", (e) => {
        if (e.target.closest("[data-reply]")) return;
        const m = items.find((x) => x.id === li.dataset.msg);
        modal(m.subject, `<p class="muted small">From <b>${esc(m.from_name)}</b> to <b>${esc(m.to_name)}</b> · ${fmtDateTime(m.date)}</p><p class="pre">${esc(m.body)}</p>`);
      })
    );
    const waHint = view.querySelector("#waGroupHint");
    const showGroupHint = () => {
      const allTeachers = view.querySelector("#waTo").value === "teachers|all";
      waHint.hidden = !allTeachers;
      waHint.replaceChildren();
      if (!allTeachers) return;
      waHint.append(document.createTextNode("Message will go to WhatsApp group name: "));
      const name = document.createElement("b");
      name.textContent = groupTeachers || "No WhatsApp group set";
      waHint.append(name);
    };
    view.querySelector("#waTo").addEventListener("change", showGroupHint);
    showGroupHint();
    view.querySelector("#waSend").addEventListener("click", () => {
      const to = view.querySelector("#waTo").value;
      const subject = view.querySelector("#waSubject").value.trim();
      const body = view.querySelector("#waBody").value.trim();
      if (!to || !subject || !body) {
        UI.toast("Choose who it is for, and write the subject and message.", "error");
        return;
      }
      const [to_type, to_id] = to.split("|");
      UI.whatsappPreview({
        title: "View & Send",
        emptyMessage: "No one found for this message.",
        fetchPreview: () => MPS.post("/principal/messages/whatsapp/preview", { to_type, to_id, subject, body }),
        send: (payload) => MPS.post("/principal/messages/whatsapp", payload),
      });
    });
    const compose = async (preset) => {
      openForm({
        title: "New Message",
        fields: [
          { name: "to", label: "To", type: "select", required: true, options: recipients, value: preset && preset.to },
          { name: "subject", label: "Subject", required: true, maxlength: 200, value: preset && preset.subject },
          { name: "body", label: "Message", type: "textarea", required: true },
        ],
        submitLabel: "Send",
        onSubmit: async (v) => {
          const [to_type, to_id] = v.to.split("|");
          const r = await MPS.post("/principal/messages", { to_type, to_id, subject: v.subject, body: v.body });
          messages(view, ctx, "sent");
          return r;
        },
      });
    };
    view.querySelector("#composeBtn").addEventListener("click", () => compose());
    view.querySelectorAll("[data-reply]").forEach((b) =>
      b.addEventListener("click", () => {
        const m = items.find((x) => x.id === b.dataset.reply);
        compose({ to: `${m.from_type}|${m.from_id}`, subject: m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}` });
      })
    );
  }

  UI.startApp({
    role: "principal",
    portalName: "Principal Portal",
    userSub: (u) => `${u.employee_id} · Principal`,
    modules: [
      { id: "dashboard", label: "Dashboard", icon: "fa-tachometer", group: "Overview", render: dashboard },
      { id: "approvals", label: "Approvals", icon: "fa-check-circle", group: "Overview", render: (v, c) => approvals(v, c) },
      { id: "checkin", label: "Check In / Out", icon: "fa-sign-in", group: "Daily", render: checkIn },
      { id: "teacher-attendance", label: "Teacher Attendance", icon: "fa-user-circle", group: "Daily", render: (v, c) => teacherAttendance(v, c) },
      { id: "students", label: "Students", icon: "fa-users", group: "People", render: (v, c) => students(v, c) },
      { id: "teachers", label: "Teachers", icon: "fa-user-circle", group: "People", render: teachers },
      { id: "classes", label: "Classes", icon: "fa-th-large", group: "People", render: (v, c) => classes(v, c) },
      { id: "timetable", label: "Teachers Timetable", icon: "fa-clock-o", group: "Academics", render: (v, c) => teacherTimetable(v, c) },
      { id: "exams", label: "Exams & Admit Cards", icon: "fa-file-text-o", group: "Academics", render: exams },
      { id: "attendance-report", label: "Student Attendance Report", icon: "fa-bar-chart", group: "Reports", render: (v, c) => UI.shared.attendanceReport(v, c) },
      { id: "teacher-report", label: "Teacher Attendance Report", icon: "fa-line-chart", group: "Reports", render: (v, c) => teacherAttendanceReport(v, c) },
      { id: "diary-report", label: "HW/CW Reports", icon: "fa-book", group: "Reports", render: (v, c) => diaryReport(v, c) },
      { id: "results", label: "Student Results", icon: "fa-trophy", group: "Reports", render: (v, c) => results(v, c) },
      { id: "notices", label: "Notices", icon: "fa-bullhorn", group: "Communication", render: notices },
      { id: "messages", label: "Messages", icon: "fa-envelope-o", group: "Communication", render: (v, c) => messages(v, c) },
      { id: "complaints", label: "Complains", icon: "fa-comments-o", group: "Communication", render: (v) => UI.shared.complaints(v) },
      { id: "events", label: "Events & Holidays", icon: "fa-calendar", group: "Communication", render: events },
      { id: "gallery", label: "Photo Gallery", icon: "fa-picture-o", group: "Communication", render: (v, c) => UI.shared.gallery(v, c, { manage: true }) },
      { id: "profile", label: "My Profile", icon: "fa-user", group: "Account", render: (v, c) => UI.shared.myProfile(v, c) },
      { id: "password", label: "Change Password", icon: "fa-key", group: "Account", render: UI.shared.password },
    ],
  });
})();
