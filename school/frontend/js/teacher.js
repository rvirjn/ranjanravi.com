(() => {
  const { esc, fmtDate, fmtTime, fmtDateTime, fmtMonth, money, badge, card, stat, empty, table, kv, progress, dateChip, tabs, onTabs, openForm, modal, printDoc, run, eventSpan } = UI;

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  const classSubjectOptions = (classes) =>
    classes.flatMap((c) => c.subjects.map((s) => ({ value: `${c.id}|${s}`, label: `${c.label} · ${s}` })));

  const splitClassSubject = (values) => {
    const [class_id, subject] = String(values.class_subject || "").split("|");
    const rest = { ...values };
    delete rest.class_subject;
    return { ...rest, class_id, subject };
  };

  const selectHtml = (id, options, selected, placeholder) =>
    `<select id="${id}">${placeholder ? `<option value="">${esc(placeholder)}</option>` : ""}${options
      .map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(selected ?? "") ? "selected" : ""}>${esc(o.label)}</option>`)
      .join("")}</select>`;

  async function allStudents(classes) {
    const lists = await Promise.all(classes.map((c) => MPS.get(`/teacher/students?class_id=${c.id}`)));
    return lists.flatMap((l) => l.students.map((s) => ({ ...s, class_label: l.class_label })));
  }

  // ---------- Dashboard ----------
  async function dashboard(view) {
    const d = await MPS.get("/teacher/dashboard");
    const t = d.teacher;
    const myClass = d.class_teacher_of ? (d.attendance_marked_today ? "Marked" : "Not marked") : null;
    const list = (items, render, emptyText, icon) => (items.length ? `<ul class="list">${items.map(render).join("")}</ul>` : empty(emptyText, icon));
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const mins = (value) => {
      const [h, m] = String(value || "").slice(0, 5).split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const next = d.schedule.find((p) => mins(p.end) > nowMin);
    const nextLabel = next
      ? `${esc(next.subject)} · ${esc(next.class_label)} · ${fmtTime(next.start)} - ${fmtTime(next.end)}`
      : (d.schedule.length ? "No more periods today." : "No classes today.");

    view.innerHTML = `
      <div class="welcome">
        <div><h2>${greeting()}, ${esc(t.name)}</h2>
          <p>${esc(t.designation)}${d.class_teacher_of ? ` · Class Teacher of ${esc(d.class_teacher_of)}` : ""}</p>
          <p>${esc(d.weekday)}, ${fmtDate(d.today)}</p></div>
        <div class="btn-group">
          <a class="btn btn-light" href="#attendance"><i class="fa fa-check-square-o"></i> Student Attendance</a>
          <a class="btn btn-light" href="#diary"><i class="fa fa-whatsapp"></i> HW/CW Update</a>
          <a class="btn btn-light" href="#timetable"><i class="fa fa-clock-o"></i> ${nextLabel}</a>
        </div>
      </div>
      <div class="grid grid-4">
        ${stat("Attendance Today", `${d.classes_marked_today} / ${d.classes_total}`, { icon: "fa-check-square-o", tone: d.is_holiday ? "info" : d.classes_marked_today < d.classes_total ? "warn" : "ok",
          sub: d.is_holiday ? "Holiday" : myClass ? `${esc(d.class_teacher_of)}: ${myClass}` : "classes marked" })}
        ${stat("Homework to Review", d.homework_to_review, { icon: "fa-pencil-square-o", tone: d.homework_to_review ? "warn" : "ok",
          sub: `<span>Ungraded submissions</span> · <a href="${(d.homework_review_ids || []).length === 1 ? `#diary/${esc(d.homework_review_ids[0])}` : "#diary/review"}">Open</a>` })}
        ${stat("Pending Approvals", d.pending_student_leaves, { icon: "fa-check-circle", tone: d.pending_student_leaves ? "warn" : "ok", sub: '<a href="#approvals">Open</a>' })}
        ${stat("HW/CW Today", d.class_teacher_of ? (d.diary_posted_today ? "Posted" : "Not posted") : "-", { icon: "fa-whatsapp", tone: d.class_teacher_of && !d.diary_posted_today ? "warn" : "ok", sub: d.class_teacher_of || "" })}
      </div>
      <div class="grid grid-2">
        ${card(`Today's Schedule (${d.weekday})`, list(d.schedule, (p) => `<li><div class="period-chip"><b>Period ${p.period}</b>${fmtTime(p.start)} - ${fmtTime(p.end)}</div>
            <div class="grow"><div class="title">${esc(p.subject)} ${p === next ? badge("Next", "success") : ""}</div><div class="meta">${esc(p.class_label)}</div></div></li>`, "No classes today.", "fa-smile-o"),
          { icon: "fa-clock-o", flush: true, actions: '<a class="small" href="#timetable">Full timetable</a>' })}
        ${card("Duties & Substitutions", list(d.duties, (x) => `<li>${dateChip(x.date)}<div class="grow"><div class="title">${esc(x.type)}</div><div class="meta">${esc(x.detail)}</div></div></li>`, "No upcoming duties.", "fa-briefcase"),
          { icon: "fa-briefcase", flush: true, actions: '<a class="small" href="#duties">All</a>' })}
      </div>
      ${d.online_classes.length ? card("Your Upcoming Online Classes", list(d.online_classes, (o) => `<li><i class="fa fa-video-camera" style="color:var(--green-600);margin-top:4px"></i><div class="grow"><div class="title">${esc(o.title)}</div>
          <div class="meta">${esc(o.class_label)} · ${esc(o.subject)} · ${fmtDateTime(o.start)}</div></div><a class="btn btn-sm" href="${esc(o.link)}" target="_blank" rel="noopener">Start</a></li>`, ""),
        { icon: "fa-video-camera", flush: true }) : ""}
      <div class="grid grid-3">
        ${card("Recent Messages", list(d.messages, (m) => `<li><div class="grow"><div class="title">${esc(m.subject)}</div><div class="meta">${esc(m.from_name)} · ${fmtDate(m.date)}</div></div></li>`, "No messages.", "fa-envelope-o"),
          { icon: "fa-envelope-o", flush: true, actions: '<a class="small" href="#messages">Inbox</a>' })}
        ${card("Notices", list(d.notices, (n) => `<li>${dateChip(n.date)}<div class="grow"><div class="title">${esc(n.title)}</div><div class="meta">${esc(n.posted_by)}</div></div></li>`, "No notices.", "fa-bullhorn"),
          { icon: "fa-bullhorn", flush: true, actions: '<a class="small" href="#notices">All</a>' })}
        ${card("Events & Holidays", list(d.events, (e) => `<li>${dateChip(e.date)}<div class="grow"><div class="title">${esc(e.title)}</div><div class="meta">${esc(eventSpan(e))} · ${e.type === "holiday" ? "Holiday" : "Event"}</div></div></li>`, "No upcoming events.", "fa-calendar"),
          { icon: "fa-calendar", flush: true, actions: '<a class="small" href="#events">Calendar</a>' })}
      </div>`;
  }

  // ---------- Profile ----------
  async function profile(view, ctx) {
    await UI.shared.myProfile(view, ctx);
    const d = await MPS.get("/teacher/profile");
    view.insertAdjacentHTML("beforeend", card("Classes Assigned", classTable(d.classes), { icon: "fa-users", flush: true }));
  }

  const classTable = (classes) =>
    table(
      [
        { label: "Class", render: (c) => `<b>${esc(c.label)}</b> ${c.is_class_teacher ? badge("Class Teacher", "success") : ""}` },
        { label: "Subjects", render: (c) => esc(c.subjects.join(", ")) },
        { label: "Room", key: "room" },
        { label: "Students", key: "student_count", className: "right" },
      ],
      classes
    );

  // ---------- My classes & students ----------
  async function studentDetail(studentId) {
    const m = modal("Student Details", UI.loading(), { wide: true });
    try {
      const d = await MPS.get(`/teacher/students/${studentId}`);
      const s = d.student;
      const latest = d.results[d.results.length - 1];
      m.body.innerHTML = `
        <div class="grid grid-4" style="margin-bottom:16px">
          ${stat("Attendance", `${d.attendance.percentage}%`, { icon: "fa-calendar-check-o", tone: d.attendance.percentage < 75 ? "warn" : "ok" })}
          ${stat("Last Result", latest ? `${latest.percentage}%` : "-", { icon: "fa-trophy", tone: "info", sub: latest ? latest.exam_name : "" })}
          ${stat("Rank", latest && latest.rank ? latest.rank : "-", { icon: "fa-star", tone: "info" })}
          ${stat("Fee Due", money(d.fees_due), { icon: "fa-inr", tone: d.fees_due ? "warn" : "ok" })}
        </div>
        ${kv([
          ["Name", s.name], ["Admission No.", s.admission_no], ["Class", d.class_label], ["Roll No.", s.roll_no], ["Date of Birth", fmtDate(s.dob)],
          ["Gender", s.gender], ["Blood Group", s.blood_group], ["Father", s.father_name], ["Mother", s.mother_name], ["Phone", s.phone],
          ["Email", s.email], ["Address", s.address], ["Transport", d.transport_route ? d.transport_route.route_name : "Own"],
        ])}
        <h4 style="margin:18px 0 8px">Remarks</h4>
        ${d.remarks.length ? `<ul class="list">${d.remarks.map((r) => `<li>${badge(r.type)}<div class="grow">${esc(r.text)}<div class="meta">${esc(r.teacher_name)} · ${fmtDate(r.date)}</div></div></li>`).join("")}</ul>` : '<p class="muted">No remarks yet.</p>'}
        <h4 style="margin:18px 0 8px">Exam Results</h4>
        ${table([{ label: "Exam", key: "exam_name" }, { label: "Total", render: (r) => `${r.total} / ${r.max_total}` }, { label: "%", key: "percentage" }, { label: "Grade", key: "grade" }, { label: "Rank", render: (r) => r.rank || "-" }], d.results, { empty: "No results yet." })}
        <div class="modal-actions"><button class="btn" id="hpcBtn"><i class="fa fa-id-badge"></i> Holistic Progress Card</button></div>`;
      m.body.querySelector("#hpcBtn").addEventListener("click", () => UI.showProgressCard(`/teacher/students/${studentId}/progress-card`));
    } catch (e) {
      m.body.innerHTML = UI.errorBox(e.message);
    }
  }

  async function classes(view, ctx, selected) {
    const { classes: list } = await MPS.get("/teacher/classes");
    if (!list.length) {
      view.innerHTML = card("Students Reports", empty("No classes assigned.", "fa-users"));
      return;
    }
    const classId = selected || (list.find((c) => c.is_class_teacher) || list[0]).id;
    const roster = await MPS.get(`/teacher/students?class_id=${classId}`);
    view.innerHTML = `
      <div class="grid grid-3">${list
        .map((c) => `<a class="card stat ${c.id === classId ? "" : "tone-info"}" href="javascript:void 0" data-class="${c.id}" style="text-decoration:none;color:inherit;${c.id === classId ? "outline:2px solid var(--green-500)" : ""}">
          <div class="stat-icon"><i class="fa fa-users"></i></div><div><div class="stat-value">${esc(c.label)}</div>
          <div class="stat-label">${c.student_count} students · ${esc(c.subjects.join(", "))}</div>${c.is_class_teacher ? `<div class="stat-sub">${badge("Class Teacher", "success")}</div>` : ""}</div></a>`)
        .join("")}</div>
      ${card(`Students of ${roster.class_label}`, table(
        [
          { label: "Roll", key: "roll_no" },
          { label: "Name", render: (s) => `<b>${esc(s.name)}</b><div class="small muted">${esc(s.admission_no)}</div>` },
          { label: "Father", key: "father_name" },
          { label: "Phone", render: (s) => `<a href="tel:${esc(String(s.phone).replace(/\s/g, ""))}">${esc(s.phone)}</a>`, className: "nowrap" },
          { label: "Attendance", render: (s) => `<div style="min-width:110px">${s.attendance_percentage}%${progress(s.attendance_percentage)}</div>` },
          { label: "", className: "right nowrap", render: (s) => `<button class="btn btn-light btn-sm" data-view="${s.id}">View</button> <button class="btn btn-light btn-sm" data-remark="${s.id}">Remark</button>` },
        ],
        roster.students
      ), { icon: "fa-users", flush: true })}`;
    view.querySelectorAll("[data-class]").forEach((a) => a.addEventListener("click", () => classes(view, ctx, a.dataset.class)));
    view.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => studentDetail(b.dataset.view)));
    view.querySelectorAll("[data-remark]").forEach((b) =>
      b.addEventListener("click", async () => {
        const { types } = await MPS.get("/teacher/remarks");
        const s = roster.students.find((x) => x.id === b.dataset.remark);
        remarkForm(types, [{ value: s.id, label: s.name }], s.id);
      })
    );
  }

  // ---------- Co-scholastic grades ----------
  async function coScholastic(view, ctx, state = {}) {
    const q = new URLSearchParams();
    if (state.classId) q.set("class_id", state.classId);
    if (state.term) q.set("term", state.term);
    let d;
    try {
      d = await MPS.get(`/teacher/co-scholastic?${q}`);
    } catch (e) {
      const { classes: list } = await MPS.get("/teacher/classes");
      if (!state.classId && list.length) return coScholastic(view, ctx, { classId: list[0].id });
      throw e;
    }
    const head = d.areas.map((a) => `<th>${esc(a)}</th>`).join("");
    const rows = d.students
      .map((s) => `<tr><td>${esc(s.roll_no)}</td><td><b>${esc(s.name)}</b></td>${d.areas
        .map((a) => `<td><select data-sid="${s.id}" data-area="${esc(a)}" style="min-width:64px"><option value="">-</option>${d.grades
          .map((g) => `<option ${s.grades[a] === g ? "selected" : ""}>${g}</option>`).join("")}</select></td>`).join("")}</tr>`)
      .join("");
    view.innerHTML = `<div class="toolbar"><div class="filters">
        ${selectHtml("cls", d.classes.map((c) => ({ value: c.id, label: c.label })), d.class_id)}
        ${selectHtml("term", d.terms.map((t) => ({ value: t, label: t })), d.term)}</div>
        <span class="small muted">A = Outstanding, B = Very good, C = Fair</span></div>
      ${card(`Grades Entry · ${d.class_label} · ${d.term}`, `<div class="table-wrap"><table class="table"><thead><tr><th>Roll</th><th>Student</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
        <div class="sticky-bar static"><span></span><button class="btn" id="save"><i class="fa fa-save"></i> Save Grades</button></div>`, { icon: "fa-paint-brush", flush: true })}`;
    view.querySelector("#cls").addEventListener("change", (e) => coScholastic(view, ctx, { classId: e.target.value, term: d.term }));
    view.querySelector("#term").addEventListener("change", (e) => coScholastic(view, ctx, { classId: d.class_id, term: e.target.value }));
    view.querySelector("#save").addEventListener("click", () => {
      const grades = {};
      view.querySelectorAll("select[data-sid]").forEach((s) => {
        grades[s.dataset.sid] = grades[s.dataset.sid] || {};
        if (s.value) grades[s.dataset.sid][s.dataset.area] = s.value;
      });
      run(() => MPS.post("/teacher/co-scholastic", { class_id: d.class_id, term: d.term, grades }));
    });
  }

  // ---------- Quizzes ----------
  function quizBuilder(classes, after) {
    const m = modal("Create Quiz", `<form id="quizForm">
      ${UI.fieldHtml({ name: "class_subject", label: "Class & subject", type: "select", required: true, options: classSubjectOptions(classes) })}
      ${UI.fieldHtml({ name: "title", label: "Quiz title", required: true })}
      ${UI.fieldHtml({ name: "due_date", label: "Last date", type: "date", value: UI.todayIso() })}
      <div id="questions"></div>
      <button type="button" class="btn btn-light btn-sm" id="addQ"><i class="fa fa-plus"></i> Add question</button>
      <div class="form-error" hidden></div>
      <div class="modal-actions"><button type="button" class="btn btn-light" data-close>Cancel</button><button class="btn" type="submit">Publish Quiz</button></div></form>`, { wide: true });
    const box = m.body.querySelector("#questions");
    const addQuestion = () => {
      const n = box.children.length;
      const div = document.createElement("div");
      div.className = "item-card";
      div.style.padding = "10px 0";
      div.innerHTML = `<label>Question ${n + 1}</label><input data-q placeholder="Type the question" required>
        <div class="grid grid-2" style="gap:8px;margin-top:8px">${[0, 1, 2, 3].map((i) => `<label style="display:flex;gap:8px;align-items:center;font-weight:400">
          <input type="radio" name="ans${n}" value="${i}" ${i === 0 ? "checked" : ""} style="width:auto"> <input data-o="${i}" placeholder="Option ${i + 1}" ${i < 2 ? "required" : ""}></label>`).join("")}</div>
        <div class="small muted">Select the circle next to the correct answer.</div>`;
      box.appendChild(div);
    };
    addQuestion();
    m.body.querySelector("#addQ").addEventListener("click", addQuestion);
    m.body.querySelector("#quizForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      const questions = [...box.children].map((div, n) => ({
        q: div.querySelector("[data-q]").value,
        options: [0, 1, 2, 3].map((i) => div.querySelector(`[data-o="${i}"]`).value),
        answer: Number((form.querySelector(`input[name="ans${n}"]:checked`) || {}).value || 0),
      }));
      try {
        const r = await MPS.post("/teacher/quizzes", { ...splitClassSubject(values), title: values.title, due_date: values.due_date, questions });
        m.close();
        UI.toast(r.message);
        after();
      } catch (err) {
        const el = form.querySelector(".form-error");
        el.textContent = err.message;
        el.hidden = false;
      }
    });
  }

  async function quizzes(view, ctx) {
    const d = await MPS.get("/teacher/quizzes");
    view.innerHTML = card("Quizzes & Online Tests", table(
      [
        { label: "Quiz", render: (q) => `<b>${esc(q.title)}</b><div class="small muted">${esc(q.class_label)} &middot; ${esc(q.subject)} &middot; ${q.questions.length} questions</div>` },
        { label: "Last date", render: (q) => fmtDate(q.due_date), className: "nowrap" },
        { label: "Attempted", render: (q) => `${q.attempts} / ${q.class_size}` },
        { label: "Average", render: (q) => (q.average === null ? "-" : `${q.average} / ${q.questions.length}`) },
        { label: "", className: "right nowrap", render: (q) => `<button class="btn btn-sm" data-res="${q.id}">Results</button> <button class="btn btn-light btn-sm" data-del="${q.id}"><i class="fa fa-trash"></i></button>` },
      ],
      d.quizzes,
      { empty: "No quizzes yet.", emptyIcon: "fa-question-circle" }
    ), { icon: "fa-question-circle", flush: true, actions: '<button class="btn btn-sm" id="newBtn"><i class="fa fa-plus"></i> Create Quiz</button>' });
    view.querySelector("#newBtn").addEventListener("click", () => quizBuilder(d.classes, () => quizzes(view, ctx)));
    view.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => confirm("Delete this quiz and its results?") && (await run(() => MPS.del(`/teacher/quizzes/${b.dataset.del}`))) && quizzes(view, ctx))
    );
    view.querySelectorAll("[data-res]").forEach((b) =>
      b.addEventListener("click", async () => {
        const r = await MPS.get(`/teacher/quizzes/${b.dataset.res}/results`);
        modal(`${r.quiz.title} - Results`, table(
          [
            { label: "Roll", key: "roll_no" },
            { label: "Student", render: (s) => `<b>${esc(s.name)}</b>` },
            { label: "Score", render: (s) => (s.attempt ? `<b>${s.attempt.score}</b> / ${s.attempt.total}` : badge("Not attempted", "neutral")) },
            { label: "Submitted", render: (s) => (s.attempt ? fmtDateTime(s.attempt.submitted_on) : "-") },
          ],
          r.students
        ), { wide: true });
      })
    );
  }

  // ---------- My attendance ----------
  async function myAttendance(view) {
    const d = await MPS.get("/teacher/my-attendance");
    view.innerHTML = `<div class="grid grid-4">
        ${stat("Attendance", `${d.percentage}%`, { icon: "fa-calendar-check-o", tone: d.percentage < 90 ? "warn" : "ok" })}
        ${stat("Working days", d.working_days, { icon: "fa-calendar" })}
        ${stat("Present", d.present + d.late, { icon: "fa-check" })}
        ${stat("Absent", d.absent, { icon: "fa-times", tone: "danger" })}</div>
      ${card("Daily Record", table(
        [
          { label: "Date", render: (x) => `${fmtDate(x.date)} <span class="small muted">${new Date(x.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</span>` },
          { label: "Status", render: (x) => badge(UI.CODE_LABEL[x.status] || x.status) },
        ],
        d.days.slice().reverse(),
        { empty: "Attendance not marked yet." }
      ), { icon: "fa-calendar-check-o", flush: true })}`;
  }

  // ---------- Homework ----------
  async function homeworkSubmissions(view, ctx, homeworkId, onBack) {
    const d = await MPS.get(`/teacher/homework/${homeworkId}/submissions`);
    const hw = d.homework;
    view.innerHTML = `<div class="toolbar"><button class="btn btn-light btn-sm" id="backBtn"><i class="fa fa-arrow-left"></i> Back to homework</button></div>
      ${card(`${hw.title}`, `<p>${badge(hw.subject, "neutral")} ${esc(hw.class_label)} · Due ${fmtDate(hw.due_date)}</p><p class="pre muted">${esc(hw.description)}</p>`, { icon: "fa-pencil-square-o" })}
      ${card("Submissions", d.students
        .map((s) => {
          const sub = s.submission;
          return `<div class="item-card"><div class="row"><div><b>${esc(s.roll_no)}. ${esc(s.name)}</b></div>
            ${sub ? (sub.grade ? badge(`Graded: ${sub.grade}`, "success") : badge("Submitted", "warn")) : badge("Not submitted", "danger")}</div>
            ${sub ? `<div class="answer-box"><span class="small muted">${fmtDateTime(sub.submitted_on)}</span><div class="pre">${esc(sub.answer)}</div>${sub.feedback ? `<div class="small" style="margin-top:6px"><b>Feedback:</b> ${esc(sub.feedback)}</div>` : ""}</div>
              <div style="margin-top:8px"><button class="btn btn-sm" data-grade="${s.student_id}"><i class="fa fa-check"></i> ${sub.grade ? "Change Grade" : "Grade"}</button></div>` : ""}</div>`;
        })
        .join(""), { icon: "fa-inbox", flush: true })}`;
    view.querySelector("#backBtn").addEventListener("click", () => (onBack ? onBack() : homework(view, ctx)));
    view.querySelectorAll("[data-grade]").forEach((b) =>
      b.addEventListener("click", () => {
        const s = d.students.find((x) => x.student_id === b.dataset.grade);
        openForm({
          title: `Grade: ${s.name}`,
          fields: [
            { name: "grade", label: "Grade", type: "select", required: true, options: ["A+", "A", "B+", "B", "C", "D", "Redo"], value: s.submission.grade },
            { name: "feedback", label: "Feedback", type: "textarea", value: s.submission.feedback || "" },
          ],
          onSubmit: async (v) => {
            const r = await MPS.post(`/teacher/homework/${homeworkId}/grade`, { ...v, student_id: s.student_id });
            homeworkSubmissions(view, ctx, homeworkId, onBack);
            return r;
          },
        });
      })
    );
  }

  async function homework(root, ctx, opts = {}) {
    const d = await MPS.get("/teacher/homework");
    root.innerHTML = card("Homework & Assignments", table(
      [
        { label: "Homework", render: (h) => `<b>${esc(h.title)}</b><div class="small muted">${esc(h.class_label)} · ${esc(h.subject)}</div>` },
        { label: "Given", render: (h) => fmtDate(h.assigned_on), className: "nowrap" },
        { label: "Due", render: (h) => fmtDate(h.due_date) + (h.due_date < UI.todayIso() ? ` ${badge("Closed", "neutral")}` : ""), className: "nowrap" },
        { label: "Submitted", render: (h) => `${h.submitted} / ${h.class_size}`, className: "nowrap" },
        { label: "Graded", render: (h) => (h.submitted - h.graded ? badge(`${h.submitted - h.graded} to grade`, "warn") : badge(`${h.graded}`, "success")) },
        { label: "", className: "right nowrap", render: (h) => `<button class="btn btn-sm" data-subs="${h.id}">Submissions</button> <button class="btn btn-light btn-sm" data-del="${h.id}" title="Delete"><i class="fa fa-trash"></i></button>` },
      ],
      d.homework,
      { empty: "No homework assigned yet.", emptyIcon: "fa-pencil-square-o" }
    ), { icon: "fa-pencil-square-o", flush: true, actions: '<button class="btn btn-sm" id="newBtn"><i class="fa fa-plus"></i> Assign Homework</button>' });
    root.querySelectorAll("[data-subs]").forEach((b) =>
      b.addEventListener("click", () => (opts.onSubmissions ? opts.onSubmissions(b.dataset.subs) : homeworkSubmissions(root, ctx, b.dataset.subs)))
    );
    root.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Delete this homework and all its submissions?")) return;
        if (await run(() => MPS.del(`/teacher/homework/${b.dataset.del}`))) homework(root, ctx, opts);
      })
    );
    root.querySelector("#newBtn").addEventListener("click", () =>
      openForm({
        title: "Assign Homework",
        fields: [
          { name: "class_subject", label: "Class & subject", type: "select", required: true, options: classSubjectOptions(d.classes) },
          { name: "title", label: "Title", required: true, maxlength: 200 },
          { name: "description", label: "Instructions", type: "textarea", required: true },
          { name: "due_date", label: "Due date", type: "date", required: true, min: UI.todayIso() },
        ],
        submitLabel: "Assign",
        onSubmit: async (v) => {
          const r = await MPS.post("/teacher/homework", splitClassSubject(v));
          homework(root, ctx, opts);
          return r;
        },
      })
    );
  }

  // ---------- Study material ----------
  async function materials(view, ctx) {
    const d = await MPS.get("/teacher/materials");
    view.innerHTML = card("Study Material", d.materials.length ? d.materials
      .map((m) => `<div class="item-card"><div class="row"><div>${badge(m.subject, "neutral")} <h4 style="display:inline">${esc(m.title)}</h4> <span class="small muted">${esc(m.class_label)}</span></div>
        <div class="btn-group">${m.link ? `<a class="btn btn-light btn-sm" href="${esc(m.link)}" target="_blank" rel="noopener"><i class="fa fa-external-link"></i> Open</a>` : ""}
        <button class="btn btn-light btn-sm" data-del="${m.id}"><i class="fa fa-trash"></i></button></div></div>
        ${m.description ? `<p class="desc">${esc(m.description)}</p>` : ""}<div class="small muted">Shared on ${fmtDate(m.uploaded_on)}</div></div>`)
      .join("") : empty("No material shared yet.", "fa-folder-open-o"), { icon: "fa-folder-open-o", flush: true, actions: '<button class="btn btn-sm" id="newBtn"><i class="fa fa-plus"></i> Share Material</button>' });
    view.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Remove this study material?")) return;
        if (await run(() => MPS.del(`/teacher/materials/${b.dataset.del}`))) materials(view, ctx);
      })
    );
    view.querySelector("#newBtn").addEventListener("click", () =>
      openForm({
        title: "Share Study Material",
        intro: "Paste a link to notes, a PDF on Google Drive, a YouTube video or an NCERT chapter.",
        fields: [
          { name: "class_subject", label: "Class & subject", type: "select", required: true, options: classSubjectOptions(d.classes) },
          { name: "title", label: "Title", required: true, maxlength: 200 },
          { name: "description", label: "Description", type: "textarea" },
          { name: "link", label: "Link", type: "url", placeholder: "https://" },
        ],
        submitLabel: "Share",
        onSubmit: async (v) => {
          const r = await MPS.post("/teacher/materials", splitClassSubject(v));
          materials(view, ctx);
          return r;
        },
      })
    );
  }

  // ---------- Lesson plans ----------
  async function lessonPlans(view, ctx) {
    const d = await MPS.get("/teacher/lesson-plans");
    view.innerHTML = card("Lesson Plans", table(
      [
        { label: "Week of", render: (p) => fmtDate(p.week), className: "nowrap" },
        { label: "Topic", render: (p) => `<b>${esc(p.topic)}</b><div class="small muted">${esc(p.class_label)} · ${esc(p.subject)}</div>` },
        { label: "Objectives & Activities", render: (p) => `<div class="small">${esc(p.objectives)}</div>${p.activities ? `<div class="small muted">${esc(p.activities)}</div>` : ""}` },
        { label: "Status", render: (p) => `<select data-plan="${p.id}" style="min-width:130px">${d.statuses.map((s) => `<option ${s === p.status ? "selected" : ""}>${esc(s)}</option>`).join("")}</select>` },
        { label: "Principal review", render: (p) => badge(p.review_status || "Pending") + (p.review_note ? `<div class="small muted">${esc(p.review_note)}</div>` : "") },
      ],
      d.lesson_plans,
      { empty: "No lesson plans yet.", emptyIcon: "fa-tasks" }
    ), { icon: "fa-tasks", flush: true, actions: '<button class="btn btn-sm" id="newBtn"><i class="fa fa-plus"></i> Add Plan</button>' });
    view.querySelectorAll("[data-plan]").forEach((s) =>
      s.addEventListener("change", () => run(() => MPS.post(`/teacher/lesson-plans/${s.dataset.plan}`, { status: s.value })))
    );
    view.querySelector("#newBtn").addEventListener("click", () =>
      openForm({
        title: "New Lesson Plan",
        fields: [
          { name: "class_subject", label: "Class & subject", type: "select", required: true, options: classSubjectOptions(d.classes) },
          { name: "week", label: "Week starting", type: "date", required: true, value: UI.todayIso() },
          { name: "topic", label: "Topic / Chapter", required: true, maxlength: 200 },
          { name: "objectives", label: "Learning objectives", type: "textarea" },
          { name: "activities", label: "Activities & resources", type: "textarea" },
        ],
        submitLabel: "Add",
        onSubmit: async (v) => {
          const r = await MPS.post("/teacher/lesson-plans", splitClassSubject(v));
          lessonPlans(view, ctx);
          return r;
        },
      })
    );
  }

  // ---------- Online classes ----------
  async function onlineClasses(view, ctx) {
    const d = await MPS.get("/teacher/online-classes");
    const columns = (upcoming) => [
      { label: "When", render: (o) => `<b>${fmtDate(o.start)}</b><div class="small muted">${fmtTime(o.start)} · ${o.duration_min} min</div>`, className: "nowrap" },
      { label: "Class", render: (o) => `<b>${esc(o.title)}</b><div class="small muted">${esc(o.class_label)} · ${esc(o.subject)}</div>` },
      { label: "", className: "right nowrap", render: (o) => upcoming
          ? `<a class="btn btn-sm" href="${esc(o.link)}" target="_blank" rel="noopener"><i class="fa fa-video-camera"></i> Start</a> <button class="btn btn-light btn-sm" data-del="${o.id}">Cancel</button>`
          : badge("Completed", "neutral") },
    ];
    view.innerHTML = `${card("Scheduled Live Classes", table(columns(true), d.online_classes.filter((o) => o.upcoming).reverse(), { empty: "No live classes scheduled.", emptyIcon: "fa-video-camera" }),
        { icon: "fa-video-camera", flush: true, actions: '<button class="btn btn-sm" id="newBtn"><i class="fa fa-plus"></i> Schedule Class</button>' })}
      ${card("Past Classes", table(columns(false), d.online_classes.filter((o) => !o.upcoming), { empty: "No past classes." }), { icon: "fa-history", flush: true })}`;
    view.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Cancel this online class?")) return;
        if (await run(() => MPS.del(`/teacher/online-classes/${b.dataset.del}`))) onlineClasses(view, ctx);
      })
    );
    view.querySelector("#newBtn").addEventListener("click", () =>
      openForm({
        title: "Schedule Online Class",
        fields: [
          { name: "class_subject", label: "Class & subject", type: "select", required: true, options: classSubjectOptions(d.classes) },
          { name: "title", label: "Topic", required: true, maxlength: 200 },
          { name: "start", label: "Date & time", type: "datetime-local", required: true },
          { name: "duration_min", label: "Duration (minutes)", type: "number", value: 40, min: 10, max: 240 },
          { name: "link", label: "Meeting link (Google Meet / Zoom)", type: "url", required: true, placeholder: "https://meet.google.com/..." },
        ],
        submitLabel: "Schedule",
        onSubmit: async (v) => {
          const r = await MPS.post("/teacher/online-classes", splitClassSubject(v));
          onlineClasses(view, ctx);
          return r;
        },
      })
    );
  }

  // ---------- Marks entry ----------
  async function marks(view, ctx, state = {}) {
    const d = await MPS.get("/teacher/exams");
    const options = classSubjectOptions(d.classes);
    const examId = state.examId || (d.exams[0] && d.exams[0].id);
    const cs = state.cs || (options[0] && options[0].value);
    let body = empty("Select an exam, class and subject.", "fa-table");
    let entry = null;
    if (examId && cs) {
      const [classId, subject] = cs.split("|");
      entry = await MPS.get(`/teacher/marks?exam_id=${examId}&class_id=${classId}&subject=${encodeURIComponent(subject)}`);
      body = `<div class="table-wrap"><table class="table"><thead><tr><th>Roll</th><th>Student</th><th class="right">Marks (out of ${entry.max_marks})</th></tr></thead><tbody>
        ${entry.students.map((s) => `<tr><td>${esc(s.roll_no)}</td><td><b>${esc(s.name)}</b></td><td class="right"><input class="marks-input" type="number" min="0" max="${entry.max_marks}" step="0.5" data-sid="${s.id}" value="${s.marks ?? ""}"></td></tr>`).join("")}
        </tbody></table></div><div style="padding:14px 18px;text-align:right;border-top:1px solid var(--line)"><button class="btn" id="saveBtn"><i class="fa fa-save"></i> Save Marks</button></div>`;
    }
    view.innerHTML = `<div class="toolbar"><div class="filters">
        ${selectHtml("exam", d.exams.map((e) => ({ value: e.id, label: `${e.name} (${e.status})` })), examId)}
        ${selectHtml("cs", options, cs)}</div></div>
      ${card(entry ? `${entry.exam.name} · ${entry.class_label} · ${entry.subject}` : "Marks Entry", body, { icon: "fa-table", flush: true })}`;
    view.querySelector("#exam").addEventListener("change", (e) => marks(view, ctx, { examId: e.target.value, cs }));
    view.querySelector("#cs").addEventListener("change", (e) => marks(view, ctx, { examId, cs: e.target.value }));
    const save = view.querySelector("#saveBtn");
    if (save) {
      save.addEventListener("click", async () => {
        const [classId, subject] = cs.split("|");
        const values = {};
        view.querySelectorAll("[data-sid]").forEach((i) => (values[i.dataset.sid] = i.value));
        save.disabled = true;
        await run(() => MPS.post("/teacher/marks", { exam_id: examId, class_id: classId, subject, marks: values }));
        save.disabled = false;
      });
    }
  }

  // ---------- Results ----------
  async function results(view, ctx, state = {}) {
    const d = await MPS.get("/teacher/exams");
    const examId = state.examId || (d.exams.find((e) => e.status === "Completed") || d.exams[0] || {}).id;
    const classId = state.classId || (d.classes.find((c) => c.is_class_teacher) || d.classes[0] || {}).id;
    if (!examId || !classId) {
      view.innerHTML = card("Results", empty("No exams or classes yet.", "fa-trophy"));
      return;
    }
    const r = await MPS.get(`/teacher/results?exam_id=${examId}&class_id=${classId}`);
    const subjects = [...new Set(r.results.flatMap((x) => x.subjects.map((s) => s.subject)))];
    const resultTable = table(
      [
        { label: "Roll", key: "roll_no" },
        { label: "Student", render: (x) => `<b>${esc(x.name)}</b>` },
        ...subjects.map((sub) => ({ label: sub, className: "right", render: (x) => {
          const s = x.subjects.find((y) => y.subject === sub);
          return s ? `${s.marks}<span class="small muted">/${s.max_marks}</span>` : "-";
        } })),
        { label: "Total", render: (x) => (x.max_total ? `<b>${x.total}</b>/${x.max_total}` : "-"), className: "right nowrap" },
        { label: "%", render: (x) => (x.max_total ? x.percentage : "-"), className: "right" },
        { label: "Grade", render: (x) => (x.max_total ? badge(x.grade, "success") : "-") },
        { label: "Rank", render: (x) => x.rank || "-", className: "right" },
      ],
      r.results
    );
    const scored = r.results.filter((x) => x.max_total).length;
    view.innerHTML = `<div class="toolbar"><div class="filters">
        ${selectHtml("exam", d.exams.map((e) => ({ value: e.id, label: e.name })), examId)}
        ${selectHtml("cls", d.classes.map((c) => ({ value: c.id, label: c.label })), classId)}</div>
        <button class="btn" id="printBtn"><i class="fa fa-print"></i> Print Result Sheet</button></div>
      <div class="grid grid-3">
        ${stat("Class Average", `${r.class_average}%`, { icon: "fa-line-chart", tone: "info" })}
        ${stat("Passed", `${r.pass_count} / ${scored}`, { icon: "fa-check" })}
        ${stat("Topper", (r.results.find((x) => x.rank === 1) || {}).name || "-", { icon: "fa-trophy", tone: "warn" })}
      </div>
      ${card(`${r.exam.name} · ${r.class_label}`, resultTable, { icon: "fa-trophy", flush: true })}`;
    view.querySelector("#exam").addEventListener("change", (e) => results(view, ctx, { examId: e.target.value, classId }));
    view.querySelector("#cls").addEventListener("change", (e) => results(view, ctx, { examId, classId: e.target.value }));
    view.querySelector("#printBtn").addEventListener("click", () =>
      printDoc("Result Sheet", `<h3 style="text-align:center">${esc(r.exam.name)} - ${esc(r.class_label)}</h3>
        <p>Class average: ${r.class_average}% · Passed: ${r.pass_count}/${scored}</p>${resultTable}
        <div class="print-sign"><span>Class Teacher</span><span>Exam In-charge</span><span>Principal</span></div>`)
    );
  }

  // ---------- Remarks ----------
  function remarkForm(types, studentOptions, selected, after) {
    openForm({
      title: "Add Remark",
      fields: [
        { name: "student_id", label: "Student", type: "select", required: true, options: studentOptions, value: selected },
        { name: "type", label: "Type", type: "select", required: true, options: types },
        { name: "text", label: "Remark", type: "textarea", required: true },
      ],
      submitLabel: "Add Remark",
      onSubmit: async (v) => {
        const r = await MPS.post("/teacher/remarks", v);
        if (after) after();
        return r;
      },
    });
  }

  async function remarks(view, ctx) {
    const d = await MPS.get("/teacher/remarks");
    view.innerHTML = card("Student Remarks", table(
      [
        { label: "Date", render: (r) => fmtDate(r.date), className: "nowrap" },
        { label: "Student", render: (r) => `<b>${esc(r.student_name)}</b>` },
        { label: "Type", render: (r) => badge(r.type) },
        { label: "Remark", render: (r) => esc(r.text) },
      ],
      d.remarks,
      { empty: "You have not added any remarks yet.", emptyIcon: "fa-comment-o" }
    ), { icon: "fa-comment-o", flush: true, actions: '<button class="btn btn-sm" id="newBtn"><i class="fa fa-plus"></i> Add Remark</button>' });
    view.querySelector("#newBtn").addEventListener("click", async () => {
      const students = await allStudents(d.classes);
      remarkForm(d.types, students.map((s) => ({ value: s.id, label: `${s.name} (${s.class_label}, Roll ${s.roll_no})` })), null, () => remarks(view, ctx));
    });
  }

  // ---------- Student leaves ----------
  async function studentLeaves(view, ctx) {
    const d = await MPS.get("/teacher/student-leaves");
    if (!d.class_label) {
      view.innerHTML = card("Approvals", empty("Leave requests are approved by class teachers. You are not a class teacher.", "fa-calendar-times-o"));
      return;
    }
    view.innerHTML = card(`Approvals · ${d.class_label}`, table(
      [
        { label: "Student", render: (l) => `<b>${esc(l.student_name)}</b><div class="small muted">Applied ${fmtDate(l.applied_on)}</div>` },
        { label: "Dates", render: (l) => `${fmtDate(l.from_date)}${l.to_date !== l.from_date ? ` to ${fmtDate(l.to_date)}` : ""}`, className: "nowrap" },
        { label: "Type", key: "type" },
        { label: "Reason", render: (l) => esc(l.reason) },
        { label: "Status", render: (l) => badge(l.status) + (l.review_note ? `<div class="small muted">${esc(l.review_note)}</div>` : "") },
        { label: "", className: "right nowrap", render: (l) => (l.status === "Pending" ? `<button class="btn btn-sm" data-review="${l.id}" data-status="Approved">Approve</button> <button class="btn btn-danger btn-sm" data-review="${l.id}" data-status="Rejected">Reject</button>` : "") },
      ],
      d.leaves,
      { empty: "No leave requests.", emptyIcon: "fa-calendar-times-o" }
    ), { icon: "fa-calendar-times-o", flush: true });
    view.querySelectorAll("[data-review]").forEach((b) =>
      b.addEventListener("click", () =>
        openForm({
          title: `${b.dataset.status === "Approved" ? "Approve" : "Reject"} Leave`,
          fields: [{ name: "note", label: "Note to student (optional)", type: "textarea" }],
          submitLabel: b.dataset.status === "Approved" ? "Approve" : "Reject",
          onSubmit: async (v) => {
            const r = await MPS.post(`/teacher/student-leaves/${b.dataset.review}`, { status: b.dataset.status, note: v.note });
            if (ctx.noteApprovals) ctx.noteApprovals();
            studentLeaves(view, ctx);
            return r;
          },
        })
      )
    );
  }

  // ---------- My leaves ----------
  async function myLeaves(view, ctx) {
    const d = await MPS.get("/teacher/leaves");
    view.innerHTML = `<div class="grid grid-3">${d.balance
        .map((b) => stat(`${b.type} Leave`, `${b.remaining} <span class="small muted">/ ${b.allowed}</span>`, { icon: "fa-calendar-o", tone: b.remaining ? "ok" : "danger", sub: `${b.used} used` }))
        .join("")}</div>
      ${card("My Leave Applications", table(
        [
          { label: "Dates", render: (l) => `<b>${fmtDate(l.from_date)}</b>${l.to_date !== l.from_date ? ` to <b>${fmtDate(l.to_date)}</b>` : ""}`, className: "nowrap" },
          { label: "Type", key: "type" },
          { label: "Reason", render: (l) => esc(l.reason) },
          { label: "Applied", render: (l) => fmtDate(l.applied_on), className: "nowrap" },
          { label: "Status", render: (l) => badge(l.status) },
        ],
        d.leaves,
        { empty: "No leave applications.", emptyIcon: "fa-calendar-o" }
      ), { icon: "fa-calendar-o", flush: true, actions: '<button class="btn btn-sm" id="applyBtn"><i class="fa fa-plus"></i> Apply for Leave</button>' })}`;
    view.querySelector("#applyBtn").addEventListener("click", () =>
      openForm({
        title: "Apply for Leave",
        intro: "Your application goes to the principal.",
        fields: [
          { name: "type", label: "Leave type", type: "select", required: true, options: d.balance.map((b) => ({ value: b.type, label: `${b.type} (${b.remaining} left)` })) },
          { name: "from_date", label: "From", type: "date", required: true, value: UI.todayIso() },
          { name: "to_date", label: "To", type: "date", required: true, value: UI.todayIso() },
          { name: "reason", label: "Reason", type: "textarea", required: true },
        ],
        submitLabel: "Apply",
        onSubmit: async (v) => {
          const r = await MPS.post("/teacher/leaves", v);
          myLeaves(view, ctx);
          return r;
        },
      })
    );
  }

  // ---------- Messages ----------
  async function messages(view, ctx, mode = "inbox") {
    const d = await MPS.get("/teacher/messages");
    const students = await allStudents(d.classes);
    const recipients = [
      ...d.classes.map((c) => ({ value: `class|${c.id}`, label: `Whole class: ${c.label}` })),
      ...students.map((s) => ({ value: `student|${s.id}`, label: `${s.name} (${s.class_label})` })),
    ];
    const items = d[mode];
    view.innerHTML = `${tabs([{ id: "inbox", label: `Inbox (${d.inbox.length})` }, { id: "sent", label: `Sent (${d.sent.length})` }], mode)}
      ${card(mode === "inbox" ? "Inbox" : "Sent Messages", items.length ? `<ul class="list">${items
        .map((m) => `<li style="cursor:pointer" data-msg="${m.id}"><div class="avatar" style="background:var(--green-100)">${UI.initials(mode === "inbox" ? m.from_name : m.to_name)}</div>
          <div class="grow"><div class="title">${esc(m.subject)}</div><div class="meta">${mode === "inbox" ? "From" : "To"} ${esc(mode === "inbox" ? m.from_name : m.to_name)} · ${fmtDateTime(m.date)}</div>
          <div class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.body)}</div></div>
          ${mode === "inbox" && m.from_type === "student" ? `<button class="btn btn-light btn-sm" data-reply="${m.id}">Reply</button>` : ""}</li>`)
        .join("")}</ul>` : empty("No messages.", "fa-envelope-o"), { icon: "fa-envelope-o", flush: true, actions: '<button class="btn btn-sm" id="composeBtn"><i class="fa fa-pencil"></i> New Message</button>' })}
      ${card("WhatsApp Message", `<p class="small muted">Same as the email above: who it is for, the subject and the message. This one is previewed, then sent on WhatsApp.</p>
        <div class="field"><label for="waTo">To</label>${selectHtml("waTo", recipients)}</div>
        <div class="field"><label for="waSubject">Subject</label><input id="waSubject" maxlength="200"></div>
        <div class="field"><label for="waBody">Message</label><textarea id="waBody"></textarea></div>
        <button class="btn" id="waSend" type="button"><i class="fa fa-whatsapp"></i> View &amp; Send</button>`, { icon: "fa-whatsapp" })}`;
    onTabs(view, (tab) => messages(view, ctx, tab));
    view.querySelectorAll("[data-msg]").forEach((li) =>
      li.addEventListener("click", (e) => {
        if (e.target.closest("[data-reply]")) return;
        const m = items.find((x) => x.id === li.dataset.msg);
        modal(m.subject, `<p class="muted small">From <b>${esc(m.from_name)}</b> to <b>${esc(m.to_name)}</b> · ${fmtDateTime(m.date)}</p><p class="pre">${esc(m.body)}</p>`);
      })
    );
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
        emptyMessage: "No students found for this message.",
        fetchPreview: () => MPS.post("/teacher/messages/whatsapp/preview", { to_type, to_id, subject, body }),
        send: (payload) => MPS.post("/teacher/messages/whatsapp", payload),
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
          const r = await MPS.post("/teacher/messages", { to_type, to_id, subject: v.subject, body: v.body });
          messages(view, ctx, "sent");
          return r;
        },
      });
    };
    view.querySelector("#composeBtn").addEventListener("click", () => compose());
    view.querySelectorAll("[data-reply]").forEach((b) =>
      b.addEventListener("click", () => {
        const m = items.find((x) => x.id === b.dataset.reply);
        compose({ to: `student|${m.from_id}`, subject: m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}` });
      })
    );
  }

  // ---------- Payslips ----------
  async function payslips(view) {
    const d = await MPS.get("/teacher/payslips");
    const slipHtml = (p) => {
      const rows = [
        ...[["Basic Pay", p.basic], ...Object.entries(p.allowances)].map(([k, v]) => ({ head: k, earn: v, ded: "" })),
        ...Object.entries(p.deductions).map(([k, v]) => ({ head: k, earn: "", ded: v })),
      ];
      return `<h3 style="text-align:center">Salary Slip - ${fmtMonth(p.month)}</h3>
        ${kv([["Employee", d.teacher.name], ["Employee ID", d.teacher.employee_id], ["Designation", d.teacher.designation], ["Paid On", fmtDate(p.paid_on)]])}
        ${table([{ label: "Head", key: "head" }, { label: "Earnings", render: (r) => (r.earn === "" ? "" : money(r.earn)), className: "right" }, { label: "Deductions", render: (r) => (r.ded === "" ? "" : money(r.ded)), className: "right" }], rows,
          { footer: `<td>Total</td><td class="right">${money(p.gross)}</td><td class="right">${money(p.gross - p.net)}</td></tr><tr><td>Net Pay</td><td class="right" colspan="2">${money(p.net)}</td>` })}`;
    };
    view.innerHTML = card("Salary Slips", table(
      [
        { label: "Month", render: (p) => `<b>${fmtMonth(p.month)}</b>` },
        { label: "Gross", render: (p) => money(p.gross), className: "right" },
        { label: "Deductions", render: (p) => money(p.gross - p.net), className: "right" },
        { label: "Net Pay", render: (p) => `<b>${money(p.net)}</b>`, className: "right" },
        { label: "Paid On", render: (p) => fmtDate(p.paid_on), className: "nowrap" },
        { label: "", className: "right nowrap", render: (p) => `<button class="btn btn-light btn-sm" data-view="${p.id}">View</button> <button class="btn btn-light btn-sm" data-print="${p.id}"><i class="fa fa-print"></i></button>` },
      ],
      d.payslips,
      { empty: "No salary slips yet.", emptyIcon: "fa-money" }
    ), { icon: "fa-money", flush: true });
    view.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => modal("Salary Slip", slipHtml(d.payslips.find((p) => p.id === b.dataset.view)), { wide: true })));
    view.querySelectorAll("[data-print]").forEach((b) => b.addEventListener("click", () => printDoc("Salary Slip", slipHtml(d.payslips.find((p) => p.id === b.dataset.print)))));
  }

  // ---------- Duties ----------
  async function duties(view) {
    const d = await MPS.get("/teacher/duties");
    const today = UI.todayIso();
    view.innerHTML = card("Duties & Substitutions", table(
      [
        { label: "Date", render: (x) => `<b>${fmtDate(x.date)}</b>`, className: "nowrap" },
        { label: "Type", render: (x) => badge(x.type, "neutral") },
        { label: "Details", render: (x) => esc(x.detail) },
        { label: "", render: (x) => (x.date >= today ? badge("Upcoming") : badge("Done", "neutral")) },
      ],
      d.duties,
      { empty: "No duties assigned.", emptyIcon: "fa-briefcase" }
    ), { icon: "fa-briefcase", flush: true });
  }

  async function hwCw(view, ctx, focus) {
    if (focus && focus !== "review") {
      await homeworkSubmissions(view, ctx, focus, () => { location.hash = "diary"; });
      return;
    }
    view.innerHTML = `<div id="diaryPane"></div><div id="hwAssignments" style="margin-top:16px"></div>`;
    await UI.shared.diary(view.querySelector("#diaryPane"), ctx);
    await homework(view.querySelector("#hwAssignments"), ctx, {
      onSubmissions: (id) => { location.hash = `diary/${id}`; },
    });
    if (focus === "review") view.querySelector("#hwAssignments").scrollIntoView();
  }

  UI.startApp({
    role: "teacher",
    portalName: "Teacher Portal",
    userSub: (u) => `${u.employee_id} · ${(u.subjects || []).join(", ")}`,
    modules: [
      { id: "dashboard", label: "Dashboard", icon: "fa-tachometer", group: "Overview", render: dashboard },
      { id: "approvals", label: "Approvals", icon: "fa-check-circle", group: "Overview", render: (v, c) => studentLeaves(v, c) },
      { id: "attendance", label: "Student Attendance", icon: "fa-check-square-o", group: "Daily", render: (v, c) => UI.shared.classAttendance(v, c) },
      { id: "diary", label: "HW/CW Update", icon: "fa-whatsapp", group: "Daily", render: (v, c) => hwCw(v, c) },
      { id: "marks", label: "Marks Entry", icon: "fa-table", group: "Academics", render: (v, c) => marks(v, c) },
      { id: "co-scholastic", label: "Grades Entry", icon: "fa-paint-brush", group: "Academics", render: (v, c) => coScholastic(v, c) },
      { id: "remarks", label: "Student Remarks", icon: "fa-comment-o", group: "Academics", render: remarks },
      { id: "classes", label: "Students Reports", icon: "fa-users", group: "Reports", render: (v, c) => classes(v, c) },
      { id: "results", label: "Student Results", icon: "fa-trophy", group: "Reports", render: (v, c) => results(v, c) },
      { id: "notices", label: "Notices", icon: "fa-bullhorn", group: "Communication", render: UI.shared.notices },
      { id: "messages", label: "Messages", icon: "fa-envelope-o", group: "Communication", render: (v, c) => messages(v, c) },
      { id: "events", label: "Events & Holidays", icon: "fa-calendar", group: "Communication", render: UI.shared.events },
      { id: "quizzes", label: "Quizzes & Tests", icon: "fa-question-circle", group: "Other", render: quizzes },
      { id: "materials", label: "Study Material", icon: "fa-folder-open-o", group: "Other", render: materials },
      { id: "lesson-plans", label: "Lesson Plans", icon: "fa-tasks", group: "Other", render: lessonPlans },
      { id: "online-classes", label: "Online Classes", icon: "fa-video-camera", group: "Other", render: onlineClasses },
      { id: "library", label: "Library", icon: "fa-book", group: "Other", render: (v) => UI.shared.library(v, "/teacher/library") },
      { id: "duties", label: "Duties & Substitutions", icon: "fa-briefcase", group: "Other", render: duties },
      { id: "profile", label: "My Profile", icon: "fa-user", group: "Account", render: profile },
      { id: "timetable", label: "My Timetable", icon: "fa-clock-o", group: "Account", render: (v) => UI.shared.timetable(v, "/teacher/timetable", (p) => `<b>${esc(p.subject)}</b><span>${esc(p.class_label)}</span>`) },
      { id: "my-attendance", label: "My Attendance", icon: "fa-calendar-check-o", group: "Account", render: myAttendance },
      { id: "my-leaves", label: "My Leave", icon: "fa-calendar-o", group: "Account", render: myLeaves },
      { id: "payslips", label: "My Salary Slips", icon: "fa-money", group: "Account", render: payslips },
      { id: "password", label: "Change Password", icon: "fa-key", group: "Account", render: UI.shared.password },
    ],
  });
})();
