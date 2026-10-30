(() => {
  const { esc, fmtDate, fmtTime, fmtDateTime, fmtMonth, money, badge, card, stat, empty, table, kv, progress, dateChip, tabs, onTabs, openForm, modal, printDoc, eventSpan } = UI;

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  const diaryLines = (p) =>
    `<div class="pre" style="margin-top:4px">${p.entries
      .flatMap((e) => [e.cw ? `<b>${esc(e.subject)}</b> : CW - ${esc(e.cw)}` : "", e.hw ? `<b>${esc(e.subject)}</b> : HW - ${esc(e.hw)}` : ""].filter(Boolean))
      .join("\n")}</div>`;

  function siblingBar(siblings) {
    if (!siblings || !siblings.length) return "";
    return `<div class="toolbar" style="margin:0"><span class="small muted"><i class="fa fa-users"></i> Your other children:</span><div class="btn-group">${siblings
      .map((s) => `<button class="btn btn-light btn-sm" data-switch="${s.id}">Switch to ${esc(s.name)} (${esc(s.class_label)})</button>`)
      .join("")}</div></div>`;
  }

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-switch]");
    if (!btn) return;
    try {
      const r = await MPS.post("/student/switch", { student_id: btn.dataset.switch });
      MPS.saveSession({ ...MPS.session(), token: r.token, user: r.user });
      location.hash = "dashboard";
      location.reload();
    } catch (err) {
      UI.toast(err.message, "error");
    }
  });

  // ---------- Classwork & Homework diary ----------
  async function diary(view) {
    const d = await MPS.get("/student/diary");
    const byDate = {};
    d.posts.forEach((p) => (byDate[p.date] = byDate[p.date] || []).push(p));
    const dates = Object.keys(byDate).sort().reverse();
    view.innerHTML = dates.length
      ? dates
          .map((day) => card(`${new Date(day + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" })}, ${fmtDate(day)}`,
            byDate[day].map((p) => `<div class="item-card"><div class="small muted">${esc(p.teacher_name)} &middot; ${UI.fmtTime(p.posted_on)}</div>${diaryLines(p)}</div>`).join(""),
            { icon: "fa-book", flush: true }))
          .join("")
      : card("Classwork & Homework", empty("Your teachers have not posted CW/HW yet.", "fa-book"));
  }

  async function classworkHomework(view, ctx, focus) {
    view.innerHTML = `<div id="diaryPane"></div><div id="hwSubmission" style="margin-top:16px"></div>`;
    await diary(view.querySelector("#diaryPane"));
    await homework(view.querySelector("#hwSubmission"), ctx);
    if (focus === "submit") view.querySelector("#hwSubmission").scrollIntoView();
  }

  // ---------- Quizzes ----------
  async function quizzes(view, ctx) {
    const { quizzes: items } = await MPS.get("/student/quizzes");
    view.innerHTML = card("Quizzes & Online Tests", items.length ? items
      .map((q) => `<div class="item-card"><div class="row"><div>${badge(q.subject, "neutral")} <h4 style="display:inline">${esc(q.title)}</h4>
          <div class="small muted">${q.question_count} questions &middot; ${esc(q.teacher_name)} &middot; last date ${fmtDate(q.due_date)}</div></div>
          ${q.attempt ? badge(`Score ${q.attempt.score}/${q.attempt.total}`, "success") : `<button class="btn btn-sm" data-start="${q.id}"><i class="fa fa-play"></i> Start Quiz</button>`}</div>
          ${q.attempt ? `<div class="small" style="margin-top:6px">${q.questions.map((x, i) => `${i + 1}. ${esc(x.q)} - <b>${esc(x.options[x.answer])}</b> ${q.attempt.answers[i] === x.answer ? "&#10004;" : `<span style="color:var(--danger)">(you: ${esc(x.options[q.attempt.answers[i]] ?? "-")})</span>`}`).join("<br>")}</div>` : ""}</div>`)
      .join("") : empty("No quizzes right now.", "fa-question-circle"), { icon: "fa-question-circle", flush: true });
    view.querySelectorAll("[data-start]").forEach((b) =>
      b.addEventListener("click", () => {
        const q = items.find((x) => x.id === b.dataset.start);
        const m = modal(q.title, `<form id="qz">${q.questions
          .map((x, i) => `<div class="field"><label>${i + 1}. ${esc(x.q)}</label>${x.options
            .map((o, j) => (o ? `<label style="font-weight:400;display:flex;gap:8px;align-items:center"><input type="radio" name="q${i}" value="${j}" required style="width:auto"> ${esc(o)}</label>` : ""))
            .join("")}</div>`)
          .join("")}<div class="modal-actions"><button class="btn" type="submit">Submit Answers</button></div></form>`, { wide: true });
        m.body.querySelector("#qz").addEventListener("submit", async (e) => {
          e.preventDefault();
          const answers = q.questions.map((_x, i) => Number((e.target.querySelector(`input[name="q${i}"]:checked`) || {}).value));
          const r = await UI.run(() => MPS.post(`/student/quizzes/${q.id}/attempt`, { answers }));
          if (r) {
            m.close();
            quizzes(view, ctx);
          }
        });
      })
    );
  }

  // ---------- Dashboard ----------
  async function dashboard(view) {
    const d = await MPS.get("/student/dashboard");
    const s = d.student;
    const att = d.attendance;
    const res = d.latest_result;
    const overdueHw = d.pending_homework.filter((h) => h.status === "Overdue").length;

    const schedule = d.schedule.length
      ? `<ul class="list">${d.schedule
          .map(
            (p) => `<li><div class="period-chip"><b>Period ${p.period}</b>${fmtTime(p.start)} - ${fmtTime(p.end)}</div>
            <div class="grow"><div class="title">${esc(p.subject)}</div><div class="meta">${esc(p.teacher_name)}</div></div></li>`
          )
          .join("")}</ul>`
      : empty("No classes today. Enjoy your holiday!", "fa-smile-o");

    const homework = d.pending_homework.length
      ? `<ul class="list">${d.pending_homework
          .map(
            (h) => `<li>${dateChip(h.due_date)}<div class="grow"><div class="title">${esc(h.title)}</div>
            <div class="meta">${esc(h.subject)} · Due ${fmtDate(h.due_date)}</div></div>${badge(h.status)}</li>`
          )
          .join("")}</ul>`
      : empty("All homework submitted. Great job!", "fa-check-circle");

    const notices = d.notices.length
      ? `<ul class="list">${d.notices
          .map((n) => `<li>${dateChip(n.date)}<div class="grow"><div class="title">${esc(n.title)}</div><div class="meta">${esc(n.body.slice(0, 90))}${n.body.length > 90 ? "..." : ""}</div></div></li>`)
          .join("")}</ul>`
      : empty("No notices.", "fa-bullhorn");

    const exams = d.upcoming_exams.length
      ? `<ul class="list">${d.upcoming_exams
          .map((e) => `<li>${dateChip(e.start_date)}<div class="grow"><div class="title">${esc(e.name)}</div><div class="meta">${fmtDate(e.start_date)} to ${fmtDate(e.end_date)}</div></div></li>`)
          .join("")}</ul>`
      : empty("No upcoming exams.", "fa-file-text-o");

    const events = d.events.length
      ? `<ul class="list">${d.events
          .map((e) => `<li>${dateChip(e.date)}<div class="grow"><div class="title">${esc(e.title)}</div><div class="meta">${esc(eventSpan(e))} · ${e.type === "holiday" ? "Holiday" : "Event"}</div></div></li>`)
          .join("")}</ul>`
      : empty("No upcoming events.", "fa-calendar");

    const online = d.online_classes.length
      ? card(
          "Upcoming Online Classes",
          `<ul class="list">${d.online_classes
            .map(
              (o) => `<li><i class="fa fa-video-camera" style="color:var(--green-600);margin-top:4px"></i><div class="grow"><div class="title">${esc(o.title)}</div>
              <div class="meta">${esc(o.subject)} · ${fmtDateTime(o.start)} · ${o.duration_min} min</div></div>
              <a class="btn btn-sm" href="${esc(o.link)}" target="_blank" rel="noopener">Join</a></li>`
            )
            .join("")}</ul>`,
          { icon: "fa-video-camera", flush: true }
        )
      : "";

    const todayAtt = d.today_attendance ? badge(`Today: ${UI.CODE_LABEL[d.today_attendance] || d.today_attendance}`, d.today_attendance === "A" ? "danger" : "success") : badge("Today: not marked yet", "neutral");
    const diaryCard = card(d.diary.length && d.diary[0].date === d.today ? "Today's Classwork & Homework" : "Latest Classwork & Homework", d.diary.length
      ? d.diary.map((p) => `<div class="item-card"><div class="small muted">${fmtDate(p.date)} &middot; ${esc(p.teacher_name)}</div>${diaryLines(p)}</div>`).join("")
      : empty("No CW/HW posted yet.", "fa-book"), { icon: "fa-book", flush: true, actions: '<a class="small" href="#diary">All days</a>' });
    view.innerHTML = `
      ${siblingBar(d.siblings)}
      <div class="welcome">
        <div><h2>${greeting()}, ${esc(s.name.split(" ")[0])}!</h2>
          <p>${esc(d.class_label)} · Roll No. ${esc(s.roll_no)} · Admission No. ${esc(s.admission_no)}</p>
          <p>${esc(d.weekday)}, ${fmtDate(d.today)} &nbsp; ${todayAtt}</p></div>
        <div class="btn-group">
          <a class="btn btn-light" href="#leaves"><i class="fa fa-calendar-times-o"></i> Apply Leave</a>
          <a class="btn btn-light" href="#fees"><i class="fa fa-inr"></i> Pay Fees</a>
          <a class="btn btn-light" href="#results"><i class="fa fa-trophy"></i> Report Card</a>
        </div>
      </div>
      <div class="grid grid-4">
        ${stat("Attendance", `${att.percentage}%`, { icon: "fa-calendar-check-o", tone: att.percentage < 75 ? "warn" : "ok", sub: `${att.present} of ${att.working_days} days present` })}
        ${stat("Homework Pending", d.pending_homework.length, { icon: "fa-pencil-square-o", tone: overdueHw ? "danger" : "info", sub: overdueHw ? `${overdueHw} overdue` : "Nothing overdue" })}
        ${stat("Fee Due", money(d.fees.due), { icon: "fa-inr", tone: d.fees.overdue ? "danger" : "ok", sub: d.fees.overdue ? `${money(d.fees.overdue)} overdue` : "No overdue fees" })}
        ${stat("Last Result", res ? `${res.percentage}%` : "-", { icon: "fa-trophy", tone: "info", sub: res ? `${esc(res.exam_name)} · Grade ${esc(res.grade)}` : "No results yet" })}
      </div>
      ${diaryCard}
      <div class="grid grid-2">
        ${card(`Today's Classes (${d.weekday})`, schedule, { icon: "fa-clock-o", flush: true, actions: '<a class="small" href="#timetable">Full timetable</a>' })}
        ${card("Homework Due", homework, { icon: "fa-pencil-square-o", flush: true, actions: '<a class="small" href="#diary/submit">View all</a>' })}
      </div>
      ${online}
      <div class="grid grid-3">
        ${card("Latest Notices", notices, { icon: "fa-bullhorn", flush: true, actions: '<a class="small" href="#notices">All</a>' })}
        ${card("Upcoming Exams", exams, { icon: "fa-file-text-o", flush: true, actions: '<a class="small" href="#exams">Datesheet</a>' })}
        ${card("Events & Holidays", events, { icon: "fa-calendar", flush: true, actions: '<a class="small" href="#events">Calendar</a>' })}
      </div>`;
  }

  // ---------- Profile ----------
  async function profile(view, ctx) {
    const d = await MPS.get("/student/profile");
    const s = d.student;
    const route = d.transport_route;
    const pending = d.pending_requests.length
      ? `<div class="form-ok" style="margin-top:14px">Update request pending with the office: ${d.pending_requests
          .map((r) => Object.entries(r.changes).map(([k, v]) => `${esc(k)} → ${esc(v)}`).join(", "))
          .join("; ")}</div>`
      : "";
    view.innerHTML = `
      ${siblingBar(d.siblings)}
      ${card("Photo", `<div style="display:flex;gap:16px;align-items:center"><div class="avatar" style="width:84px;height:84px;font-size:28px">${UI.avatar(s.name, s.photo)}</div>
        <button class="btn btn-light btn-sm" id="photoBtn"><i class="fa fa-camera"></i> ${s.photo ? "Change" : "Upload"} photo</button></div>`, { icon: "fa-camera" })}
      ${card("Student Details", kv([
        ["Name", s.name], ["Admission No.", s.admission_no], ["Class", d.class_label], ["Roll No.", s.roll_no],
        ["Date of Birth", fmtDate(s.dob)], ["Gender", s.gender], ["Blood Group", s.blood_group], ["House", s.house],
        ["Admission Date", fmtDate(s.admission_date)], ["Class Teacher", d.class_teacher],
      ]), { icon: "fa-user" })}
      ${card("Parents & Contact", kv([
        ["Father's Name", s.father_name], ["Father's Mobile (WhatsApp)", s.father_phone], ["Mother's Name", s.mother_name],
        ["Mother's Mobile (WhatsApp)", s.mother_phone], ["Parent Mobile", s.phone], ["Email", s.email], ["Address", s.address],
      ]) + pending, { icon: "fa-home", actions: '<button class="btn btn-sm" id="editBtn"><i class="fa fa-pencil"></i> Request Update</button>' })}
      ${card("Transport", route ? kv([["Route", route.route_name], ["Bus No.", route.bus_no], ["Driver", route.driver_name]]) : '<p class="muted">Not using school transport.</p>', { icon: "fa-bus" })}`;
    view.querySelector("#photoBtn").addEventListener("click", async () => {
      try {
        const [file] = await UI.pickAndUpload({ accept: "image/png,image/jpeg,image/webp", icon: true });
        if (!file) return;
        await UI.run(() => MPS.post("/me/photo", { file }));
        MPS.saveSession({ ...MPS.session(), user: { ...MPS.session().user, photo: file } });
        location.reload();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
    view.querySelector("#editBtn").addEventListener("click", () =>
      openForm({
        title: "Request Contact Update",
        intro: "The school office will verify and update your record. Absent alerts and fee messages are sent to these WhatsApp numbers.",
        fields: [
          { name: "father_phone", label: "Father's mobile (WhatsApp)", type: "mobile", required: true, value: s.father_phone },
          { name: "mother_phone", label: "Mother's mobile (WhatsApp)", type: "mobile", value: s.mother_phone },
          { name: "phone", label: "Parent / guardian mobile", type: "mobile", value: s.phone },
          { name: "email", label: "Email", type: "email", pattern: "[^@\\s]+@[^@\\s]+\\.[^@\\s]+", title: "Enter a valid email address", value: s.email },
          { name: "address", label: "Address", type: "textarea", value: s.address },
        ],
        submitLabel: "Send Request",
        onSubmit: async (v) => {
          const r = await MPS.post("/student/profile/update-request", v);
          ctx.refresh();
          return r;
        },
      })
    );
  }

  // ---------- Attendance ----------
  function calendar(month, byDate) {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const daysInMonth = new Date(y, m, 0).getDate();
    const offset = (first.getDay() + 6) % 7;
    const cells = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="dow">${d}</div>`);
    for (let i = 0; i < offset; i++) cells.push('<div class="day blank"></div>');
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${month}-${String(day).padStart(2, "0")}`;
      const status = byDate[iso] || "";
      cells.push(`<div class="day ${status}">${day}${status ? `<small>${status}</small>` : ""}</div>`);
    }
    return `<div class="calendar">${cells.join("")}</div>
      <div class="legend"><span><i style="background:var(--success-bg);border:1px solid var(--success)"></i>Present</span>
      <span><i style="background:var(--danger-bg);border:1px solid var(--danger)"></i>Absent</span>
      <span><i style="background:var(--warn-bg);border:1px solid var(--warn)"></i>Leave (L) / Late (LT) / Half day (HD)</span>
      <span><i style="background:#f5f7f6;border:1px solid #ccc"></i>Holiday / Sunday / Not marked</span></div>`;
  }

  async function attendance(view) {
    const d = await MPS.get("/student/attendance");
    if (!d.months.length) {
      view.innerHTML = card("Attendance", empty("Attendance has not been marked yet.", "fa-calendar-check-o"));
      return;
    }
    const paint = (month) => {
      const days = d.days.filter((x) => x.date.startsWith(month));
      const byDate = Object.fromEntries(days.map((x) => [x.date, x.status]));
      const count = (code) => days.filter((x) => x.status === code).length;
      const score = count("P") + count("LT") + count("HD") * 0.5;
      const pct = days.length ? Math.round((score * 1000) / days.length) / 10 : 0;
      view.innerHTML = `
        <div class="toolbar"><div class="filters"><label style="margin:0">Month</label>
          <select id="month">${d.months.map((mo) => `<option value="${mo}" ${mo === month ? "selected" : ""}>${fmtMonth(mo)}</option>`).join("")}</select></div>
          <div class="small muted">Session attendance: <b>${d.overall.percentage}%</b> (${d.overall.present}/${d.overall.working_days} days)</div></div>
        <div class="grid grid-4">
          ${stat("Working Days", days.length, { icon: "fa-calendar" })}
          ${stat("Present", count("P") + count("LT"), { icon: "fa-check", sub: `${pct}% this month${count("LT") ? ` &middot; ${count("LT")} late` : ""}` })}
          ${stat("Absent", count("A"), { icon: "fa-times", tone: "danger" })}
          ${stat("Leave / Half day", `${count("L")} / ${count("HD")}`, { icon: "fa-calendar-times-o", tone: "warn" })}
        </div>
        ${card(fmtMonth(month), calendar(month, byDate) + `<div style="margin-top:16px">${progress(pct)}</div>
          <p class="small muted" style="margin-top:6px">Minimum 75% attendance is required to appear in examinations.</p>`, { icon: "fa-calendar-check-o" })}`;
      view.querySelector("#month").addEventListener("change", (e) => paint(e.target.value));
    };
    paint(d.months[0]);
  }

  // ---------- Homework ----------
  async function homework(view, ctx, filter = "all") {
    const { homework: items } = await MPS.get("/student/homework");
    const shown = filter === "all" ? items : items.filter((h) => h.status.toLowerCase() === filter);
    const cards = shown.length
      ? shown
          .map((h) => {
            const sub = h.submission;
            const canSubmit = !sub || !sub.grade;
            return `<div class="item-card">
              <div class="row"><div>${badge(h.subject, "neutral")} <h4 style="display:inline">${esc(h.title)}</h4></div>${badge(h.status)}</div>
              <p class="desc pre">${esc(h.description)}</p>
              <div class="small muted">Given by ${esc(h.teacher_name)} on ${fmtDate(h.assigned_on)} · <b>Due ${fmtDate(h.due_date)}</b></div>
              ${sub ? `<div class="answer-box"><b>Your answer</b> <span class="small muted">(${fmtDateTime(sub.submitted_on)})</span><div class="pre">${esc(sub.answer)}</div>
                ${(sub.attachments || []).map((a, i) => `<a href="${esc(UI.fileUrl(a))}" target="_blank" rel="noopener" class="btn btn-light btn-sm" style="margin:6px 6px 0 0"><i class="fa fa-paperclip"></i> File ${i + 1}</a>`).join("")}
                ${sub.grade ? `<div style="margin-top:6px"><b>Grade:</b> ${badge(sub.grade, "success")} ${sub.feedback ? `<span class="muted"> - ${esc(sub.feedback)}</span>` : ""}</div>` : ""}</div>` : ""}
              ${canSubmit ? `<div style="margin-top:10px"><button class="btn btn-sm" data-submit="${h.id}"><i class="fa fa-upload"></i> ${sub ? "Update Submission" : "Submit Homework"}</button></div>` : ""}
            </div>`;
          })
          .join("")
      : empty("No homework in this list.", "fa-pencil-square-o");
    view.innerHTML = `${tabs(
      [
        { id: "all", label: `All (${items.length})` },
        { id: "pending", label: "Pending" },
        { id: "overdue", label: "Overdue" },
        { id: "submitted", label: "Submitted" },
        { id: "graded", label: "Graded" },
      ],
      filter
    )}${card("Homework & Assignments", cards, { icon: "fa-pencil-square-o", flush: true })}`;
    onTabs(view, (t) => homework(view, ctx, t));
    view.querySelectorAll("[data-submit]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const hw = items.find((h) => h.id === btn.dataset.submit);
        const form = openForm({
          title: `Submit: ${hw.title}`,
          intro: `Take a photo of the homework copy or write a short note.<br>
            <button type="button" class="btn btn-light btn-sm" id="attach" style="margin-top:8px"><i class="fa fa-camera"></i> Attach photo / PDF</button> <span id="attachCount" class="small muted"></span>`,
          fields: [{ name: "answer", label: "Answer / Note", type: "textarea", value: hw.submission ? hw.submission.answer : "" }],
          submitLabel: "Submit",
          onSubmit: async (v) => {
            const r = await MPS.post(`/student/homework/${hw.id}/submit`, { ...v, attachments });
            homework(view, ctx, filter);
            return r;
          },
        });
        let attachments = (hw.submission && hw.submission.attachments) || [];
        form.body.querySelector("#attachCount").textContent = attachments.length ? `${attachments.length} file(s) attached` : "";
        form.body.querySelector("#attach").addEventListener("click", async () => {
          try {
            attachments = attachments.concat(await UI.pickAndUpload({ multiple: true }));
            form.body.querySelector("#attachCount").textContent = `${attachments.length} file(s) attached`;
          } catch (e) {
            UI.toast(e.message, "error");
          }
        });
      })
    );
  }

  // ---------- Study material ----------
  async function materials(view) {
    const { materials: items } = await MPS.get("/student/materials");
    const subjects = [...new Set(items.map((m) => m.subject))].sort();
    const paint = (subject) => {
      const shown = subject ? items.filter((m) => m.subject === subject) : items;
      view.innerHTML = `<div class="toolbar"><div class="filters"><select id="subject"><option value="">All subjects</option>${subjects
        .map((s) => `<option ${s === subject ? "selected" : ""}>${esc(s)}</option>`)
        .join("")}</select></div></div>
        ${card("Study Material & Class Notes", shown.length ? shown
          .map((m) => `<div class="item-card"><div class="row"><div>${badge(m.subject, "neutral")} <h4 style="display:inline">${esc(m.title)}</h4></div>
            ${m.link ? `<a class="btn btn-sm" href="${esc(m.link)}" target="_blank" rel="noopener"><i class="fa fa-external-link"></i> Open</a>` : ""}</div>
            ${m.description ? `<p class="desc">${esc(m.description)}</p>` : ""}<div class="small muted">Shared by ${esc(m.teacher_name)} on ${fmtDate(m.uploaded_on)}</div></div>`)
          .join("") : empty("No study material shared yet.", "fa-folder-open-o"), { icon: "fa-folder-open-o", flush: true })}`;
      view.querySelector("#subject").addEventListener("change", (e) => paint(e.target.value));
    };
    paint("");
  }

  // ---------- Online classes ----------
  async function onlineClasses(view) {
    const { online_classes: items } = await MPS.get("/student/online-classes");
    const columns = (upcoming) => [
      { label: "When", render: (o) => `<b>${fmtDate(o.start)}</b><div class="small muted">${fmtTime(o.start)} · ${o.duration_min} min</div>`, className: "nowrap" },
      { label: "Class", render: (o) => `<b>${esc(o.title)}</b><div class="small muted">${esc(o.subject)} · ${esc(o.teacher_name)}</div>` },
      { label: "", className: "right", render: (o) => (upcoming ? `<a class="btn btn-sm" href="${esc(o.link)}" target="_blank" rel="noopener"><i class="fa fa-video-camera"></i> Join</a>` : badge("Completed", "neutral")) },
    ];
    view.innerHTML = `${card("Upcoming Live Classes", table(columns(true), items.filter((o) => o.upcoming).reverse(), { empty: "No live classes scheduled.", emptyIcon: "fa-video-camera" }), { icon: "fa-video-camera", flush: true })}
      ${card("Past Classes", table(columns(false), items.filter((o) => !o.upcoming), { empty: "No past classes." }), { icon: "fa-history", flush: true })}`;
  }

  // ---------- Exams ----------
  async function exams(view) {
    const data = await MPS.get("/student/exams");
    const items = data.exams;
    view.innerHTML = items.length
      ? items
          .map((e) =>
            card(
              e.name,
              `<p><b>${fmtDate(e.start_date)}</b> to <b>${fmtDate(e.end_date)}</b> · Maximum marks per subject: ${e.max_marks}</p>
              ${e.syllabus ? `<p class="muted"><b>Syllabus:</b> ${esc(e.syllabus)}</p>` : ""}
              ${table(
                [
                  { label: "Date", render: (r) => `${fmtDate(r.date)} <span class="small muted">${new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" })}</span>`, className: "nowrap" },
                  { label: "Subject", render: (r) => `<b>${esc(r.subject)}</b>` },
                  { label: "Time", key: "time", className: "nowrap" },
                ],
                e.schedule
              )}`,
              { icon: "fa-file-text-o", actions: `${badge(e.status)} ${e.status === "Upcoming" ? `<button class="btn btn-sm" data-admit="${e.id}"><i class="fa fa-id-card-o"></i> Admit Card</button>` : ""}` }
            )
          )
          .join("")
      : card("Exams", empty("No exams scheduled.", "fa-file-text-o"));
    view.querySelectorAll("[data-admit]").forEach((b) =>
      b.addEventListener("click", () => {
        const exam = items.find((e) => e.id === b.dataset.admit);
        const html = UI.admitCardHtml(data.student, exam, data.class_label);
        const m = modal("Admit Card", `${html}<div class="modal-actions"><button class="btn" id="printAdmit"><i class="fa fa-print"></i> Print</button></div>`, { wide: true });
        m.body.querySelector("#printAdmit").addEventListener("click", () => printDoc("Admit Card", html));
      })
    );
  }

  // ---------- Results ----------
  function resultTable(r) {
    return table(
      [
        { label: "Subject", render: (x) => `<b>${esc(x.subject)}</b>` },
        { label: "Marks", render: (x) => `${x.marks} / ${x.max_marks}`, className: "nowrap" },
        { label: "Grade", render: (x) => badge(x.grade, "success") },
      ],
      r.subjects,
      { footer: `<td>Total</td><td>${r.total} / ${r.max_total}</td><td>${esc(r.grade)}</td>` }
    );
  }

  async function results(view) {
    const d = await MPS.get("/student/results");
    if (!d.results.length) {
      view.innerHTML = card("Results", empty("No results published yet.", "fa-trophy"));
      return;
    }
    const trend = d.results
      .map((r) => `<div style="margin-bottom:10px"><div class="row" style="display:flex;justify-content:space-between"><span>${esc(r.exam_name)}</span><b>${r.percentage}%</b></div>${progress(r.percentage)}</div>`)
      .join("");
    view.innerHTML = `
      <div class="toolbar"><div></div><div class="btn-group"><button class="btn" id="hpcBtn"><i class="fa fa-id-badge"></i> Holistic Progress Card</button>
        <button class="btn btn-light" id="printBtn"><i class="fa fa-print"></i> Print Marks Report</button></div></div>
      ${card("Performance Trend", trend, { icon: "fa-line-chart" })}
      <div class="grid grid-2">${d.results
        .slice()
        .reverse()
        .map((r) =>
          card(r.exam_name, `<div class="grid grid-3" style="margin:0 0 12px;gap:10px">
              <div><div class="stat-label">Percentage</div><div class="stat-value">${r.percentage}%</div></div>
              <div><div class="stat-label">Grade</div><div class="stat-value">${esc(r.grade)}</div></div>
              <div><div class="stat-label">Rank</div><div class="stat-value">${r.rank || "-"}<span class="small muted"> / ${r.class_size}</span></div></div></div>
              ${resultTable(r)}`, { icon: "fa-trophy", actions: badge(r.result) })
        )
        .join("")}</div>`;
    view.querySelector("#hpcBtn").addEventListener("click", () => UI.showProgressCard("/student/progress-card"));
    view.querySelector("#printBtn").addEventListener("click", () => {
      const s = d.student;
      printDoc(
        "Report Card",
        `<h3 style="text-align:center">Progress Report ${esc(UI.state.school.academic_year || "")}</h3>
        ${kv([["Student", s.name], ["Admission No.", s.admission_no], ["Class", d.class_label], ["Roll No.", s.roll_no], ["Father's Name", s.father_name], ["Date of Birth", fmtDate(s.dob)]])}
        ${d.results.map((r) => `<h4 style="margin-top:16px">${esc(r.exam_name)} - ${r.percentage}% (Grade ${esc(r.grade)}, Rank ${r.rank || "-"})</h4>${resultTable(r)}`).join("")}
        <div class="print-sign"><span>Class Teacher</span><span>Parent</span><span>Principal</span></div>`
      );
    });
  }

  // ---------- Fees ----------
  async function fees(view, ctx) {
    const d = await MPS.get("/student/fees");
    const sm = d.summary;
    const scannerSrc = d.payment.payment_qr ? UI.fileUrl(d.payment.payment_qr) : (d.payment.scanner || "");
    const reportStatus = (i) => (i.status === "Rejected" ? "Not received" : i.status === "Recorded" ? "Approved" : (i.status || "Pending"));
    view.innerHTML = `
      <div class="fee-layout">
        <div class="fee-col">
          <div class="fee-tiles">
            ${stat("Total due", money(sm.due), { icon: "fa-inr", tone: sm.due ? "warn" : "ok" })}
            ${stat("Tuition fee due", money(sm.tuition_due || 0), { icon: "fa-book", tone: sm.tuition_due ? "warn" : "ok" })}
            ${stat("Other fee due", money(sm.other_due || 0), { icon: "fa-shopping-bag", tone: sm.other_due ? "warn" : "ok" })}
          </div>
      ${card("Dues (month-wise)", d.dues.length ? table(
        [
          { label: "Month / Item", render: (g) => `<b>${esc(g.label)}</b>` },
          { label: "Details", render: (g) => `<span class="small">${esc(g.heads.join(", "))}</span>` },
          { label: "Due", render: (g) => `<b>${money(g.amount)}</b>`, className: "right" },
        ],
        d.dues,
        { footer: `<td>Total payable</td><td></td><td class="right">${money(sm.due)}</td>` }
      ) : empty("No dues. All fees are paid. Thank you!", "fa-check-circle"),
        { icon: "fa-inr", flush: true, actions: sm.due ? '<button class="btn btn-sm" id="paidBtn"><i class="fa fa-check"></i> I have paid</button>' : "" })}
        <div style="margin-top:18px">
        ${card("Online Payments I reported", table(
          [
            { label: "Date", render: (i) => fmtDate(i.date), className: "nowrap" },
            { label: "Amount", render: (i) => `<b>${money(i.amount)}</b>`, className: "right" },
            { label: "Paid on / via", render: (i) => `${fmtDate(i.paid_on)}<div class="small muted">${esc(i.method)} ${esc(i.reference || "")}</div>${i.note ? `<div class="small">${esc(i.note)}</div>` : ""}` },
            { label: "Status", render: (i) => `${badge(reportStatus(i))}${i.receipt_no ? `<div class="small">${esc(i.receipt_no)}</div>` : ""}${i.review_note ? `<div class="small muted">${esc(i.review_note)}</div>` : ""}` },
          ],
          d.intimations,
          { empty: "You have not reported a payment yet.", emptyIcon: "fa-bell-o" }
        ), { icon: "fa-bell", flush: true })}
        </div>
        </div>
        ${card("Pay by Scanner", `<div style="text-align:center">
            ${scannerSrc ? `<img src="${esc(scannerSrc)}" alt="Payment scanner" class="scanner">` : ""}
            <p style="margin-top:8px"><b>${esc(d.payment.payment_qr_name || "")}</b><br>Scan with PhonePe, Google Pay, Paytm or any UPI app</p>
            <p class="small">UPI ID: <b>${esc(d.payment.upi || "")}</b></p></div>
          <form id="payForm">
            <div class="field"><label for="payAmount">Amount paid (Rs)</label><input id="payAmount" name="amount" type="number" required min="1" value="${sm.due || ""}"></div>
            <div class="field"><label for="payRef">Transaction ID / UTR</label><input id="payRef" name="reference" required placeholder="from the payment app"></div>
            <button type="button" class="btn btn-light btn-sm" id="payShot"><i class="fa fa-camera"></i> Attach payment screenshot</button> <span id="payShotName" class="small muted"></span>
            <div class="form-error" hidden></div>
            <div class="modal-actions"><button type="submit" class="btn">Send to Accountant</button></div>
          </form>`,
          { icon: "fa-qrcode", className: "pay-box" })}
      </div>
      ${card("All Fee Items", table(
        [
          { label: "Particulars", render: (c) => `<b>${esc(c.description)}</b>` },
          { label: "Due Date", render: (c) => fmtDate(c.due_date), className: "nowrap" },
          { label: "Amount", render: (c) => money(c.amount), className: "right nowrap" },
          { label: "Paid", render: (c) => (c.paid ? money(c.paid) : "-"), className: "right nowrap" },
          { label: "Status", render: (c) => badge(c.status) },
        ],
        d.charges.slice().reverse()
      ), { icon: "fa-list-alt", flush: true })}
      ${card("Receipts", table(
        [
          { label: "Receipt", render: (p) => `<b>${esc(p.receipt_no)}</b>` },
          { label: "Date", render: (p) => fmtDate(p.date), className: "nowrap" },
          { label: "For", render: (p) => `<span class="small">${esc(p.lines.map((l) => l.description).join(", "))}</span>` },
          { label: "Amount", render: (p) => `<b>${money(p.total)}</b>`, className: "right" },
          { label: "", className: "right", render: (p) => `<button class="btn btn-light btn-sm" data-receipt="${p.id}"><i class="fa fa-print"></i> View</button>` },
        ],
        d.payments,
        { empty: "No receipts yet." }
      ), { icon: "fa-file-text-o", flush: true })}`;

    view.querySelectorAll("[data-receipt]").forEach((b) =>
      b.addEventListener("click", async () => UI.showReceipt(await MPS.get(`/student/fees/receipt/${b.dataset.receipt}`)))
    );
    let screenshot = null;
    const shot = view.querySelector("#payShot");
    if (shot)
      shot.addEventListener("click", async () => {
        try {
          const [file] = await UI.pickAndUpload({ accept: "image/*" });
          screenshot = file || null;
          view.querySelector("#payShotName").textContent = screenshot ? "Screenshot attached" : "";
        } catch (e) {
          UI.toast(e.message, "error");
        }
      });
    const paidBtn = view.querySelector("#paidBtn");
    if (paidBtn)
      paidBtn.addEventListener("click", () => {
        let paidShot = null;
        const m = openForm({
          title: "Payment Done",
          intro: `Total due: <b>${money(sm.due)}</b>. Enter the payment details so the accountant can verify it.<br>
            <button type="button" class="btn btn-light btn-sm" id="shot" style="margin-top:8px"><i class="fa fa-camera"></i> Attach payment screenshot</button> <span id="shotName" class="small muted"></span>`,
          fields: [
            { name: "amount", label: "Amount paid (Rs)", type: "number", required: true, value: sm.due, min: 1 },
            { name: "paid_on", label: "Date of payment", type: "date", required: true, value: UI.todayIso(), max: UI.todayIso() },
            { name: "method", label: "Paid by", type: "select", required: true, options: d.payment_methods, value: "UPI / PhonePe" },
            { name: "reference", label: "Transaction ID / UTR", placeholder: "from the payment app" },
            { name: "note", label: "Note", placeholder: "e.g. September + October fee" },
          ],
          submitLabel: "Send to Accountant",
          onSubmit: async (v) => {
            const r = await MPS.post("/student/fees/intimate", { ...v, screenshot: paidShot });
            fees(view, ctx);
            return r;
          },
        });
        m.body.querySelector("#shot").addEventListener("click", async () => {
          try {
            const [file] = await UI.pickAndUpload({ accept: "image/*" });
            paidShot = file || null;
            if (paidShot) m.body.querySelector("#shotName").textContent = "Screenshot attached";
          } catch (e) {
            UI.toast(e.message, "error");
          }
        });
      });
    const payForm = view.querySelector("#payForm");
    payForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!payForm.reportValidity()) return;
      const values = Object.fromEntries(new FormData(payForm).entries());
      const errorEl = payForm.querySelector(".form-error");
      const submit = payForm.querySelector('button[type="submit"]');
      submit.disabled = true;
      errorEl.hidden = true;
      try {
        const result = await MPS.post("/student/fees/intimate", {
          amount: values.amount,
          paid_on: UI.todayIso(),
          method: "UPI / PhonePe",
          reference: values.reference,
          screenshot,
        });
        if (result && result.message) UI.toast(result.message);
        fees(view, ctx);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
        submit.disabled = false;
      }
    });
  }

  // ---------- Leave ----------
  async function leaves(view, ctx) {
    const d = await MPS.get("/student/leaves");
    view.innerHTML = card(
      "Leave Applications",
      table(
        [
          { label: "Dates", render: (l) => `<b>${fmtDate(l.from_date)}</b>${l.to_date !== l.from_date ? ` to <b>${fmtDate(l.to_date)}</b>` : ""}`, className: "nowrap" },
          { label: "Type", key: "type" },
          { label: "Reason", render: (l) => esc(l.reason) },
          { label: "Applied", render: (l) => fmtDate(l.applied_on), className: "nowrap" },
          { label: "Status", render: (l) => badge(l.status) + (l.review_note ? `<div class="small muted">${esc(l.review_note)}</div>` : "") },
        ],
        d.leaves,
        { empty: "No leave applications yet.", emptyIcon: "fa-calendar-times-o" }
      ),
      { icon: "fa-calendar-times-o", flush: true, actions: '<button class="btn btn-sm" id="applyBtn"><i class="fa fa-plus"></i> Apply for Leave</button>' }
    );
    view.querySelector("#applyBtn").addEventListener("click", () =>
      openForm({
        title: "Apply for Leave",
        intro: "Your class teacher will review the application.",
        fields: [
          { name: "type", label: "Leave type", type: "select", options: d.leave_types, required: true },
          { name: "from_date", label: "From", type: "date", required: true, value: UI.todayIso() },
          { name: "to_date", label: "To", type: "date", required: true, value: UI.todayIso() },
          { name: "reason", label: "Reason", type: "textarea", required: true },
        ],
        submitLabel: "Apply",
        onSubmit: async (v) => {
          const r = await MPS.post("/student/leaves", v);
          ctx.refresh();
          return r;
        },
      })
    );
  }

  // ---------- Transport ----------
  async function transport(view) {
    const { route } = await MPS.get("/student/transport");
    if (!route) {
      view.innerHTML = card("School Transport", empty("You have not opted for school transport. Contact the school office to avail bus facility.", "fa-bus"), { icon: "fa-bus" });
      return;
    }
    view.innerHTML = `${card(route.route_name, kv([
      ["Bus Number", route.bus_no], ["Driver", route.driver_name], ["Driver Phone", route.driver_phone], ["Attendant", route.attendant_name],
      ["Morning Pickup Starts", fmtTime(route.pickup_start)], ["Afternoon Drop Starts", fmtTime(route.drop_start)],
    ]) + `<div class="btn-group" style="margin-top:14px"><a class="btn btn-sm" href="tel:${esc(route.driver_phone.replace(/\s/g, ""))}"><i class="fa fa-phone"></i> Call Driver</a></div>`, { icon: "fa-bus" })}
      ${card("Stops & Timings", table(
        [
          { label: "#", render: (_s, i) => i + 1 },
          { label: "Stop", render: (s) => `<b>${esc(s.name)}</b>` },
          { label: "Pickup", render: (s) => fmtTime(s.pickup), className: "nowrap" },
          { label: "Drop", render: (s) => fmtTime(s.drop), className: "nowrap" },
        ],
        route.stops
      ), { icon: "fa-map-marker", flush: true })}`;
  }

  // ---------- Messages ----------
  function messageList(items, mode) {
    if (!items.length) return empty(mode === "inbox" ? "No messages yet." : "You have not sent any messages.", "fa-envelope-o");
    return `<ul class="list">${items
      .map(
        (m) => `<li style="cursor:pointer" data-msg="${m.id}"><div class="avatar" style="background:var(--green-100)">${UI.initials(mode === "inbox" ? m.from_name : m.to_name)}</div>
        <div class="grow"><div class="title">${esc(m.subject)}</div>
        <div class="meta">${mode === "inbox" ? "From" : "To"} ${esc(mode === "inbox" ? m.from_name : m.to_name)} · ${fmtDateTime(m.date)}</div>
        <div class="small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.body)}</div></div></li>`
      )
      .join("")}</ul>`;
  }

  function bindMessages(view, items) {
    view.querySelectorAll("[data-msg]").forEach((li) =>
      li.addEventListener("click", () => {
        const m = items.find((x) => x.id === li.dataset.msg);
        modal(m.subject, `<p class="muted small">From <b>${esc(m.from_name)}</b> to <b>${esc(m.to_name)}</b> · ${fmtDateTime(m.date)}</p><p class="pre">${esc(m.body)}</p>`);
      })
    );
  }

  async function messages(view, ctx, mode = "inbox") {
    const [d, t] = await Promise.all([MPS.get("/student/messages"), MPS.get("/student/teachers")]);
    const items = d[mode];
    const teachers = t.teachers.map((x) => ({ value: x.id, label: `${x.name} (${x.subjects.join(", ")})` }));
    view.innerHTML = `<div class="grid grid-side">
      <div>${tabs([{ id: "inbox", label: `Inbox (${d.inbox.length})` }, { id: "sent", label: `Sent (${d.sent.length})` }], mode)}
        ${card(mode === "inbox" ? "Inbox" : "Sent Messages", messageList(items, mode), { icon: "fa-envelope-o", flush: true, actions: '<button class="btn btn-sm" id="composeBtn"><i class="fa fa-pencil"></i> New Message</button>' })}
        <div style="margin-top:16px">${card("WhatsApp Message", `<p class="small muted">Same as the email above: who it is for, the subject and the message. This one is previewed, then sent on WhatsApp.</p>
          <div class="field"><label for="waTo">To</label><select id="waTo">${teachers.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select></div>
          <div class="field"><label for="waSubject">Subject</label><input id="waSubject" maxlength="200"></div>
          <div class="field"><label for="waBody">Message</label><textarea id="waBody"></textarea></div>
          <button class="btn" id="waSend" type="button"><i class="fa fa-whatsapp"></i> View &amp; Send</button>`, { icon: "fa-whatsapp" })}</div></div>
      ${card("My Teachers", `<ul class="list">${t.teachers
        .map((x) => `<li><div class="avatar" style="background:var(--info-bg);color:var(--info)">${UI.initials(x.name)}</div><div class="grow"><div class="title">${esc(x.name)} ${x.is_class_teacher ? badge("Class Teacher", "success") : ""}</div><div class="meta">${esc(x.subjects.join(", "))}</div></div></li>`)
        .join("")}</ul>`, { icon: "fa-users", flush: true })}</div>`;
    onTabs(view, (tab) => messages(view, ctx, tab));
    bindMessages(view, items);
    view.querySelector("#waSend").addEventListener("click", () => {
      const to_teacher_id = view.querySelector("#waTo").value;
      const subject = view.querySelector("#waSubject").value.trim();
      const body = view.querySelector("#waBody").value.trim();
      if (!to_teacher_id || !subject || !body) {
        UI.toast("Choose who it is for, and write the subject and message.", "error");
        return;
      }
      UI.whatsappPreview({
        title: "View & Send",
        emptyMessage: "No teacher found for this message.",
        fetchPreview: () => MPS.post("/student/messages/whatsapp/preview", { to_teacher_id, subject, body }),
        send: (payload) => MPS.post("/student/messages/whatsapp", payload),
      });
    });
    view.querySelector("#composeBtn").addEventListener("click", () =>
      openForm({
        title: "Message a Teacher",
        fields: [
          { name: "to_teacher_id", label: "To", type: "select", required: true, options: t.teachers.map((x) => ({ value: x.id, label: `${x.name} (${x.subjects.join(", ")})` })) },
          { name: "subject", label: "Subject", required: true, maxlength: 200 },
          { name: "body", label: "Message", type: "textarea", required: true },
        ],
        submitLabel: "Send",
        onSubmit: async (v) => {
          const r = await MPS.post("/student/messages", v);
          messages(view, ctx, "sent");
          return r;
        },
      })
    );
  }

  // ---------- Remarks & achievements ----------
  async function progressReport(view) {
    const [r, a] = await Promise.all([MPS.get("/student/remarks"), MPS.get("/student/achievements")]);
    view.innerHTML = `<div class="grid grid-2">
      ${card("Teacher Remarks", r.remarks.length ? `<ul class="list">${r.remarks
        .map((x) => `<li>${dateChip(x.date)}<div class="grow"><div class="title">${badge(x.type)}</div><p style="margin:4px 0">${esc(x.text)}</p><div class="meta">${esc(x.teacher_name)}</div></div></li>`)
        .join("")}</ul>` : empty("No remarks yet.", "fa-comment-o"), { icon: "fa-comment-o", flush: true })}
      ${card("Achievements & Awards", a.achievements.length ? `<ul class="list">${a.achievements
        .map((x) => `<li><i class="fa fa-trophy" style="color:#e0a800;font-size:22px;margin-top:2px"></i><div class="grow"><div class="title">${esc(x.title)}</div><div class="meta">${esc(x.category)} · ${fmtDate(x.date)}</div>${x.description ? `<div class="small">${esc(x.description)}</div>` : ""}</div></li>`)
        .join("")}</ul>` : empty("No achievements recorded yet.", "fa-trophy"), { icon: "fa-trophy", flush: true })}</div>`;
  }

  // ---------- Complaints ----------
  async function complaints(view, ctx) {
    const d = await MPS.get("/student/complaints");
    view.innerHTML = card(
      "Complains",
      d.complaints.length
        ? d.complaints
            .map((c) => `<div class="item-card"><div class="row"><div>${badge(c.category, "neutral")} <span class="small muted">${fmtDate(c.date)}</span></div>${badge(c.status)}</div>
              <p class="desc">${esc(c.description)}</p>${c.response ? `<div class="answer-box"><b>School response:</b> ${esc(c.response)}</div>` : ""}</div>`)
            .join("")
        : empty("No complaints or feedback submitted.", "fa-comments-o"),
      { icon: "fa-comments-o", flush: true, actions: '<button class="btn btn-sm" id="newBtn"><i class="fa fa-plus"></i> New</button>' }
    );
    view.querySelector("#newBtn").addEventListener("click", () =>
      openForm({
        title: "Complaint / Feedback",
        fields: [
          { name: "category", label: "Category", type: "select", options: d.categories, required: true },
          { name: "description", label: "Details", type: "textarea", required: true },
        ],
        submitLabel: "Submit",
        onSubmit: async (v) => {
          const r = await MPS.post("/student/complaints", v);
          ctx.refresh();
          return r;
        },
      })
    );
  }

  // ---------- Documents ----------
  function idCardHtml(s, classLabel, school) {
    return `<div class="id-card"><div class="id-top"><b>${esc(school.name || "")}</b><span>${esc(school.address || "")}</span></div>
      <div class="id-body"><div class="id-photo">${UI.initials(s.name)}</div><table>
        <tr><td colspan="2"><b style="font-size:15px">${esc(s.name)}</b></td></tr>
        <tr><td class="muted">Adm. No.</td><td>${esc(s.admission_no)}</td></tr>
        <tr><td class="muted">Class</td><td>${esc(classLabel)} (Roll ${esc(s.roll_no)})</td></tr>
        <tr><td class="muted">DOB</td><td>${fmtDate(s.dob)}</td></tr>
        <tr><td class="muted">Blood</td><td>${esc(s.blood_group)}</td></tr>
        <tr><td class="muted">Father</td><td>${esc(s.father_name)}</td></tr>
        <tr><td class="muted">Phone</td><td>${esc(s.phone)}</td></tr></table></div>
      <div class="id-foot">Session ${esc(school.academic_year || "")} · ${esc((school.phones || [])[0] || "")}</div></div>`;
  }

  async function documents(view, ctx) {
    const [p, c] = await Promise.all([MPS.get("/student/profile"), MPS.get("/student/certificates")]);
    const idCard = idCardHtml(p.student, p.class_label, UI.state.school);
    view.innerHTML = `<div class="grid grid-2">
      ${card("Student ID Card", `${idCard}<div style="margin-top:14px"><button class="btn btn-sm" id="printId"><i class="fa fa-print"></i> Print ID Card</button></div>`, { icon: "fa-id-card-o" })}
      ${card("Certificate Requests", table(
        [
          { label: "Certificate", render: (r) => `<b>${esc(r.type)}</b><div class="small muted">${esc(r.reason)}</div>` },
          { label: "Requested", render: (r) => fmtDate(r.date), className: "nowrap" },
          { label: "Status", render: (r) => badge(r.status) + (r.remark ? `<div class="small muted">${esc(r.remark)}</div>` : "") },
        ],
        c.requests,
        { empty: "No requests yet.", emptyIcon: "fa-certificate" }
      ), { icon: "fa-certificate", flush: true, actions: '<button class="btn btn-sm" id="reqBtn"><i class="fa fa-plus"></i> Request</button>' })}</div>`;
    view.querySelector("#printId").addEventListener("click", () => printDoc("ID Card", idCard));
    view.querySelector("#reqBtn").addEventListener("click", () =>
      openForm({
        title: "Request a Certificate",
        fields: [
          { name: "type", label: "Certificate", type: "select", options: c.types, required: true },
          { name: "reason", label: "Purpose", type: "textarea", required: true, placeholder: "e.g. scholarship application" },
        ],
        submitLabel: "Send Request",
        onSubmit: async (v) => {
          const r = await MPS.post("/student/certificates", v);
          ctx.refresh();
          return r;
        },
      })
    );
  }

  if ((location.hash || "").replace("#", "").split("/")[0] === "homework") location.replace("#diary/submit");

  UI.startApp({
    role: "student",
    portalName: "Student Portal",
    userSub: (u) => `Adm. ${u.admission_no} · Roll ${u.roll_no}`,
    modules: [
      { id: "dashboard", label: "Dashboard", icon: "fa-tachometer", group: "Overview", render: dashboard },
      { id: "diary", label: "Classwork & Homework", icon: "fa-book", group: "Daily", render: (v, c, focus) => classworkHomework(v, c, focus) },
      { id: "online-classes", label: "Online Classes", icon: "fa-video-camera", group: "Daily", render: onlineClasses },
      { id: "exams", label: "Exams Dates", icon: "fa-file-text-o", group: "Academics", render: exams },
      { id: "results", label: "Student Results", icon: "fa-trophy", group: "Reports", render: results },
      { id: "progress", label: "Remarks & Achievements", icon: "fa-star", group: "Reports", render: progressReport },
      { id: "fees", label: "Fees & Payments", icon: "fa-inr", group: "Fees", render: fees },
      { id: "notices", label: "Notices", icon: "fa-bullhorn", group: "Communication", render: UI.shared.notices },
      { id: "messages", label: "Messages", icon: "fa-envelope-o", group: "Communication", render: (v, c) => messages(v, c) },
      { id: "complaints", label: "Complains", icon: "fa-comments-o", group: "Communication", render: complaints },
      { id: "events", label: "Events & Holidays", icon: "fa-calendar", group: "Communication", render: UI.shared.events },
      { id: "gallery", label: "Photo Gallery", icon: "fa-picture-o", group: "Communication", render: (v, c) => UI.shared.gallery(v, c) },
      { id: "quizzes", label: "Quizzes & Tests", icon: "fa-question-circle", group: "Other", render: quizzes },
      { id: "materials", label: "Study Material", icon: "fa-folder-open-o", group: "Other", render: materials },
      { id: "library", label: "Library", icon: "fa-book", group: "Other", render: (v) => UI.shared.library(v, "/student/library") },
      { id: "transport", label: "Transport", icon: "fa-bus", group: "Other", render: transport },
      { id: "profile", label: "My Profile", icon: "fa-user", group: "Account", render: profile },
      { id: "timetable", label: "My Timetable", icon: "fa-clock-o", group: "Account", render: (v) => UI.shared.timetable(v, "/student/timetable", (p) => `<b>${esc(p.subject)}</b><span>${esc(p.teacher_name)}</span>`) },
      { id: "attendance", label: "My Attendance", icon: "fa-calendar-check-o", group: "Account", render: attendance },
      { id: "leaves", label: "My Leave", icon: "fa-calendar-times-o", group: "Account", render: leaves },
      { id: "documents", label: "My Certificates", icon: "fa-id-card-o", group: "Account", render: documents },
      { id: "password", label: "Change Password", icon: "fa-key", group: "Account", render: UI.shared.password },
    ],
  });
})();
