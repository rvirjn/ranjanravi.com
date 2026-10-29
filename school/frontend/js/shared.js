(() => {
  const { esc, fmtDate, fmtTime, fmtDateTime, fmtMonth, money, badge, card, empty, table, kv, openForm, modal, printDoc, run, todayIso, avatar } = UI;
  const CODE_LABEL = { P: "Present", A: "Absent", LT: "Late", HD: "Half Day", L: "Leave" };
  const weekday = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long" });

  // =====================================================================
  // Class attendance: class tiles -> roster with PRESENT / ABSENT buttons
  // =====================================================================
  async function classAttendance(view, ctx, state = {}) {
    const day = state.date || todayIso();
    if (state.classId) return attendanceRoster(view, ctx, { ...state, date: day });
    const d = await MPS.get(`/attendance/classes?date=${day}`);
    const marked = d.classes.filter((c) => c.marked).length;
    view.innerHTML = `
      <div class="toolbar"><div class="filters"><label style="margin:0">Date</label>
        <input type="date" id="day" value="${day}" max="${todayIso()}"></div>
        ${badge(`${marked} of ${d.classes.length} classes marked`, marked === d.classes.length ? "success" : "warn")}</div>
      ${d.is_holiday ? '<div class="form-error">This date is a holiday or Sunday.</div>' : ""}
      <div class="class-tiles">${d.classes
        .map(
          (c) => `<button type="button" class="class-tile ${c.marked ? "done" : ""}" data-class="${c.id}">
            <b>${esc(c.label)}</b><span>${c.student_count} students</span>
            ${c.marked ? `<span class="tile-status ok"><i class="fa fa-check"></i> ${c.present} P &middot; ${c.absent} A</span>` : '<span class="tile-status pending">Not marked</span>'}
            ${c.is_my_class ? '<em>My class</em>' : ""}</button>`
        )
        .join("")}</div>`;
    view.querySelector("#day").addEventListener("change", (e) => classAttendance(view, ctx, { date: e.target.value }));
    view.querySelectorAll("[data-class]").forEach((b) => b.addEventListener("click", () => classAttendance(view, ctx, { date: day, classId: b.dataset.class })));
  }

  async function attendanceRoster(view, ctx, state) {
    const d = await MPS.get(`/attendance/class?class_id=${state.classId}&date=${state.date}`);
    const status = Object.fromEntries(d.students.map((s) => [s.id, s.status]));
    const isToday = d.date === todayIso();

    view.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-light btn-sm" id="back"><i class="fa fa-arrow-left"></i> All classes</button>
        <button class="btn" id="allP"><i class="fa fa-check-square-o"></i> Mark All Present</button>
      </div>
      ${d.marked ? `<div class="form-ok">Already marked by ${esc(d.marked_by)} at ${fmtTime(d.marked_on)}. You can change and submit again (WhatsApp goes only to newly absent students).</div>` : ""}
      ${d.is_holiday ? '<div class="form-error">This date is a holiday or Sunday.</div>' : ""}
      ${!isToday ? '<div class="form-error">Past date: WhatsApp alerts are sent only for today\'s attendance.</div>' : ""}
      ${card(`${d.class_label} · ${d.day}, ${fmtDate(d.date)}`, `<div id="rows">${d.students
        .map(
          (s) => `<div class="att-row" data-sid="${s.id}">
            <div class="att-name"><span class="roll">${esc(s.roll_no)}</span><div><b>${esc(s.name)}</b>
              <div class="small muted">${esc(s.father_name || "")}${s.has_phone ? "" : ' &middot; <span style="color:var(--danger)">no mobile</span>'}</div></div></div>
            <div class="att-actions">
              <button type="button" class="att-btn present" data-set="P">PRESENT</button>
              <button type="button" class="att-btn absent" data-set="A">ABSENT</button>
              <span class="att-more"><button type="button" class="att-mini" data-set="LT">Late</button><button type="button" class="att-mini" data-set="HD">Half day</button><button type="button" class="att-mini" data-set="L">Leave</button></span>
            </div></div>`
        )
        .join("")}</div>`, { icon: "fa-check-square-o", flush: true })}
      <div class="sticky-bar"><span id="summary"></span><button class="btn" id="submit"><i class="fa fa-paper-plane"></i> Submit Attendance</button></div>`;

    const paintRow = (sid) => {
      const row = view.querySelector(`[data-sid="${sid}"]`);
      row.querySelectorAll("[data-set]").forEach((b) => b.classList.toggle("on", b.dataset.set === status[sid]));
      row.dataset.status = status[sid] || "";
    };
    const summarize = () => {
      const values = Object.values(status);
      const count = (c) => values.filter((v) => v === c).length;
      const unmarked = values.filter((v) => !v).length;
      view.querySelector("#summary").innerHTML = `<b style="color:var(--success)">${count("P") + count("LT") + count("HD")} present</b> &middot; <b style="color:var(--danger)">${count("A")} absent</b>${count("L") ? ` &middot; ${count("L")} leave` : ""}${unmarked ? ` &middot; <span class="muted">${unmarked} not marked</span>` : ""}`;
    };
    d.students.forEach((s) => paintRow(s.id));
    summarize();

    view.querySelectorAll(".att-row [data-set]").forEach((b) =>
      b.addEventListener("click", () => {
        const sid = b.closest(".att-row").dataset.sid;
        status[sid] = b.dataset.set;
        paintRow(sid);
        summarize();
      })
    );
    view.querySelector("#allP").addEventListener("click", () => {
      d.students.forEach((s) => {
        status[s.id] = "P";
        paintRow(s.id);
      });
      summarize();
    });
    view.querySelector("#back").addEventListener("click", () => classAttendance(view, ctx, { date: state.date }));
    view.querySelector("#submit").addEventListener("click", async (e) => {
      const missing = d.students.filter((s) => !status[s.id]);
      if (missing.length) {
        UI.toast(`Mark all students first (${missing.length} left). Use "Mark All Present", then tap ABSENT for absentees.`, "error");
        return;
      }
      const absent = d.students.filter((s) => status[s.id] === "A");
      const note = absent.length && isToday ? `\n\nWhatsApp message will be sent to the parents of ${absent.length} absent student(s):\n${absent.map((s) => "- " + s.name).join("\n")}` : "";
      if (!confirm(`Submit attendance for ${d.class_label}?${note}`)) return;
      e.target.disabled = true;
      const result = await run(() => MPS.post("/attendance/class", { class_id: d.class_id, date: d.date, records: status }));
      e.target.disabled = false;
      if (result) classAttendance(view, ctx, { date: state.date });
    });
  }

  // =====================================================================
  // HW / CW update -> class WhatsApp group
  // =====================================================================
  async function diary(view, ctx, state = {}) {
    const day = state.date || todayIso();
    if (state.classId) return diaryForm(view, ctx, { ...state, date: day });
    const d = await MPS.get(`/diary/overview?date=${day}`);
    view.innerHTML = `
      <div class="toolbar"><div class="filters"><label style="margin:0">Date</label><input type="date" id="day" value="${day}" max="${todayIso()}"></div>
        <span class="small muted">Select a class to send Classwork (CW) and Homework (HW) to its WhatsApp group</span></div>
      <div class="class-tiles">${d.classes
        .map(
          (c) => `<button type="button" class="class-tile ${c.posts ? "done" : ""}" data-class="${c.id}">
            <b>${esc(c.label)}</b><span><i class="fa fa-whatsapp"></i> WhatsApp group name: ${c.whatsapp_group ? `<b>${esc(c.whatsapp_group)}</b>` : "No WhatsApp group set"}</span>
            ${c.posts ? `<span class="tile-status ok"><i class="fa fa-check"></i> ${esc(c.subjects.join(", "))}</span>` : '<span class="tile-status pending">Not posted</span>'}</button>`
        )
        .join("")}</div>`;
    view.querySelector("#day").addEventListener("change", (e) => diary(view, ctx, { date: e.target.value }));
    view.querySelectorAll("[data-class]").forEach((b) => b.addEventListener("click", () => diary(view, ctx, { date: day, classId: b.dataset.class })));
  }

  async function diaryForm(view, ctx, state) {
    const d = await MPS.get(`/diary?class_id=${state.classId}&date=${state.date}`);
    const rows = d.subjects
      .map(
        (s, i) => `<tr data-row="${i}"><td><b>${esc(s)}</b><input type="hidden" name="subject" value="${esc(s)}"></td>
          <td><input name="cw" placeholder="CW - one or two lines" maxlength="300"></td>
          <td><input name="hw" placeholder="HW - one or two lines" maxlength="300"></td></tr>`
      )
      .join("");
    const posts = d.posts.length
      ? d.posts
          .map(
            (p) => `<div class="item-card"><div class="row"><div><b>${esc(p.teacher_name)}</b> <span class="small muted">${fmtTime(p.posted_on)}</span></div>
              <div class="btn-group">${badge(`Seen by ${p.seen_count}/${p.class_size}`, "neutral")}
              <button class="btn btn-light btn-sm" data-resend="${p.id}"><i class="fa fa-whatsapp"></i> Resend</button>
              <button class="btn btn-light btn-sm" data-del="${p.id}"><i class="fa fa-trash"></i></button></div></div>
              <div class="pre small" style="margin-top:6px">${p.entries.map((e) => [e.cw ? `${esc(e.subject)} : CW - ${esc(e.cw)}` : "", e.hw ? `${esc(e.subject)} : HW - ${esc(e.hw)}` : ""].filter(Boolean).join("\n")).join("\n")}</div></div>`
          )
          .join("")
      : empty("Nothing posted for this date yet.", "fa-book");

    view.innerHTML = `
      <div class="toolbar"><button class="btn btn-light btn-sm" id="back"><i class="fa fa-arrow-left"></i> All classes</button>
        <span class="badge ${d.whatsapp_group ? "success" : "danger"}">WhatsApp group name: ${d.whatsapp_group ? `<b>${esc(d.whatsapp_group)}</b>` : "No WhatsApp group set"}</span></div>
      <div class="grid grid-side">
        ${card(`${d.class_label} · ${weekday(d.date)}, ${fmtDate(d.date)}`, `<div class="table-wrap"><table class="table diary-table"><thead><tr><th>Subject</th><th>Classwork (CW)</th><th>Homework (HW)</th></tr></thead>
          <tbody>${rows}<tr data-row="extra"><td><input name="subject" placeholder="Other subject"></td><td><input name="cw" placeholder="CW"></td><td><input name="hw" placeholder="HW"></td></tr></tbody></table></div>
          <div class="sticky-bar static"><span class="small muted">Leave a box empty to skip it</span><button class="btn" id="send"><i class="fa fa-whatsapp"></i> Update &amp; Send</button></div>`,
          { icon: "fa-pencil-square-o", flush: true })}
        ${card("WhatsApp Preview", '<div class="preview-box" id="preview"></div>', { icon: "fa-whatsapp" })}
      </div>
      ${card("Posted for this date", posts, { icon: "fa-history", flush: true })}`;

    const collect = () =>
      [...view.querySelectorAll("[data-row]")]
        .map((tr) => ({
          subject: tr.querySelector('[name="subject"]').value.trim(),
          cw: tr.querySelector('[name="cw"]').value.trim(),
          hw: tr.querySelector('[name="hw"]').value.trim(),
        }))
        .filter((e) => e.subject && (e.cw || e.hw));
    const preview = () => {
      const lines = collect().flatMap((e) => [e.cw ? `${e.subject} : CW - ${e.cw}` : "", e.hw ? `${e.subject} : HW - ${e.hw}` : ""].filter(Boolean));
      view.querySelector("#preview").textContent = lines.length
        ? `*${d.class_label} - Classwork & Homework*\nDate: ${fmtDate(d.date)} (${weekday(d.date)})\n\n${lines.join("\n")}\n\nPosted by ${ctx.user.name}`
        : "Type CW / HW to see the message here.";
    };
    preview();
    view.querySelectorAll(".diary-table input").forEach((i) => i.addEventListener("input", preview));
    view.querySelector("#back").addEventListener("click", () => diary(view, ctx, { date: state.date }));
    view.querySelector("#send").addEventListener("click", async (e) => {
      const entries = collect();
      if (!entries.length) {
        UI.toast("Write CW or HW for at least one subject", "error");
        return;
      }
      e.target.disabled = true;
      const result = await run(() => MPS.post("/diary", { class_id: d.class_id, date: d.date, entries }));
      e.target.disabled = false;
      if (result) diaryForm(view, ctx, state);
    });
    view.querySelectorAll("[data-resend]").forEach((b) => b.addEventListener("click", () => run(() => MPS.post(`/diary/${b.dataset.resend}/resend`))));
    view.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Delete this HW/CW entry?")) return;
        if (await run(() => MPS.del(`/diary/${b.dataset.del}`))) diaryForm(view, ctx, state);
      })
    );
  }

  // =====================================================================
  // Fee receipt
  // =====================================================================
  function receiptHtml(r) {
    const p = r.payment;
    const s = r.student;
    const cell = (v) => (v ? money(v) : "");
    const totalDue = r.dues.reduce((sum, g) => sum + g.amount, 0);
    return `<div class="receipt">
      <h3 style="text-align:center;margin:0 0 10px">FEE RECEIPT</h3>
      <table class="table receipt-head"><tbody>
        <tr><td><b>Receipt No.</b> ${esc(p.receipt_no)}</td><td><b>Date:</b> ${fmtDate(p.date)}</td></tr>
        <tr><td><b>Student:</b> ${esc(s.name)}</td><td><b>Class:</b> ${esc(r.class_label)} &nbsp; <b>Roll:</b> ${esc(s.roll_no)}</td></tr>
        <tr><td><b>Admission No.:</b> ${esc(s.admission_no)}</td><td><b>Father:</b> ${esc(s.father_name)}</td></tr>
        <tr><td><b>Paid by:</b> ${esc(p.paid_by)}</td><td><b>Given to:</b> ${esc(p.received_by)}</td></tr>
        <tr><td><b>Date paid by parent:</b> ${fmtDate(p.paid_on)}</td><td><b>Mode:</b> ${esc(p.method)}${p.reference ? ` (${esc(p.reference)})` : ""}</td></tr>
      </tbody></table>
      <h4>Fee received</h4>
      ${table([{ label: "Particulars", render: (l) => esc(l.description) }, { label: "Amount", render: (l) => money(l.amount), className: "right" }], p.lines,
        { footer: `<td>Total received</td><td class="right">${money(p.total)}</td>` })}
      <h4>Other items</h4>
      ${table(
        [
          { label: "Item", key: "head" },
          { label: "Charged", render: (i) => cell(i.charged), className: "right" },
          { label: "Paid now", render: (i) => cell(i.paid_now), className: "right" },
          { label: "Total paid", render: (i) => cell(i.paid_total), className: "right" },
          { label: "Due", render: (i) => cell(i.due), className: "right" },
        ],
        r.item_rows
      )}
      <h4>Dues (month-wise)</h4>
      ${r.dues.length ? table([{ label: "Month / Item", key: "label" }, { label: "Details", render: (g) => esc(g.heads.join(", ")) }, { label: "Due", render: (g) => money(g.amount), className: "right" }], r.dues,
        { footer: `<td>Total dues</td><td></td><td class="right">${money(totalDue)}</td>` }) : '<p class="muted">No dues. All fees paid.</p>'}
      <table class="table receipt-totals"><tbody>
        <tr><td>This receipt</td><td class="right"><b>${money(p.total)}</b></td></tr>
        <tr><td>Total paid (session)</td><td class="right">${money(r.summary.paid)}</td></tr>
        <tr><td>Balance dues</td><td class="right"><b>${money(r.summary.due)}</b></td></tr>
      </tbody></table>
      ${p.note ? `<p class="small"><b>Note:</b> ${esc(p.note)}</p>` : ""}
      <div class="print-sign"><span>Parent's signature</span><span>Received by: ${esc(p.received_by)}</span></div></div>`;
  }

  function showReceipt(r) {
    const m = modal(`Receipt ${r.payment.receipt_no}`, `${receiptHtml(r)}<div class="modal-actions"><button class="btn" id="printReceipt"><i class="fa fa-print"></i> Print</button></div>`, { wide: true });
    m.body.querySelector("#printReceipt").addEventListener("click", () => printDoc("Fee Receipt", receiptHtml(r)));
  }

  // =====================================================================
  // Holistic Progress Card
  // =====================================================================
  function progressCardHtml(d) {
    const s = d.student;
    const exams = d.results;
    const subjects = [...new Set(exams.flatMap((e) => e.subjects.map((x) => x.subject)))];
    const scholastic = subjects.length
      ? `<table class="table"><thead><tr><th>Subject</th>${exams.map((e) => `<th class="right">${esc(e.exam_name)}</th>`).join("")}</tr></thead><tbody>
        ${subjects.map((sub) => `<tr><td>${esc(sub)}</td>${exams.map((e) => {
          const x = e.subjects.find((y) => y.subject === sub);
          return `<td class="right">${x ? `${x.marks}/${x.max_marks} <b>${esc(x.grade)}</b>` : "-"}</td>`;
        }).join("")}</tr>`).join("")}</tbody>
        <tfoot><tr><td>Total / %</td>${exams.map((e) => `<td class="right">${e.total}/${e.max_total} (${e.percentage}%) ${esc(e.grade)}</td>`).join("")}</tr>
        <tr><td>Rank</td>${exams.map((e) => `<td class="right">${e.rank || "-"} / ${e.class_size}</td>`).join("")}</tr></tfoot></table>`
      : '<p class="muted">No exam results yet.</p>';
    const terms = d.co_scholastic.map((c) => c.term);
    const areas = [...new Set(d.co_scholastic.flatMap((c) => Object.keys(c.grades)))];
    const co = areas.length
      ? `<table class="table"><thead><tr><th>Area</th>${terms.map((t) => `<th class="right">${esc(t)}</th>`).join("")}</tr></thead><tbody>
        ${areas.map((a) => `<tr><td>${esc(a)}</td>${d.co_scholastic.map((c) => `<td class="right"><b>${esc(c.grades[a] || "-")}</b></td>`).join("")}</tr>`).join("")}</tbody></table>`
      : '<p class="muted">Co-scholastic grades not entered yet.</p>';
    const att = d.attendance;
    return `<div class="hpc">
      <h3 style="text-align:center;margin:0">HOLISTIC PROGRESS CARD</h3>
      <p style="text-align:center;margin:2px 0 12px">Academic Session ${esc(d.school.academic_year || "")}</p>
      <div class="hpc-top">${s.photo ? `<img src="${esc(UI.fileUrl(s.photo))}" class="hpc-photo" alt="">` : `<div class="hpc-photo">${esc(UI.initials(s.name))}</div>`}
        ${kv([["Name", s.name], ["Class", d.class_label], ["Roll No.", s.roll_no], ["Admission No.", s.admission_no], ["Date of Birth", fmtDate(s.dob)],
          ["Father", s.father_name], ["Mother", s.mother_name], ["Class Teacher", d.class_teacher]])}</div>
      <h4>Part A: Scholastic Areas</h4>${scholastic}
      <h4>Part B: Co-Scholastic Areas (Grades A / B / C)</h4>${co}
      <h4>Part C: Attendance</h4>
      <p>Working days: <b>${att.working_days}</b> &middot; Present: <b>${att.present}</b> &middot; Late: ${att.late} &middot; Half day: ${att.half_day} &middot; Absent: ${att.absent} &middot; Leave: ${att.leave} &middot; <b>${att.percentage}%</b></p>
      <h4>Part D: Teacher's Remarks</h4>
      ${d.remarks.length ? `<ul>${d.remarks.slice(0, 5).map((r) => `<li>${esc(r.text)} <span class="muted small">(${esc(r.teacher_name)}, ${fmtDate(r.date)})</span></li>`).join("")}</ul>` : '<p class="muted">-</p>'}
      <h4>Part E: Achievements</h4>
      ${d.achievements.length ? `<ul>${d.achievements.map((a) => `<li><b>${esc(a.title)}</b> <span class="muted small">${fmtDate(a.date)}</span></li>`).join("")}</ul>` : '<p class="muted">-</p>'}
      <p class="small muted">Grades: A1 91-100, A2 81-90, B1 71-80, B2 61-70, C1 51-60, C2 41-50, D 33-40, E below 33. Co-scholastic: A Outstanding, B Very good, C Fair.</p>
      <div class="print-sign"><span>Class Teacher</span><span>Parent</span><span>Principal</span></div></div>`;
  }

  async function showProgressCard(path) {
    const m = modal("Holistic Progress Card", UI.loading(), { wide: true });
    try {
      const d = await MPS.get(path);
      m.body.innerHTML = `${progressCardHtml(d)}<div class="modal-actions"><button class="btn" id="printHpc"><i class="fa fa-print"></i> Print</button></div>`;
      m.body.querySelector("#printHpc").addEventListener("click", () => printDoc("Progress Card", progressCardHtml(d)));
    } catch (e) {
      m.body.innerHTML = UI.errorBox(e.message);
    }
  }

  // =====================================================================
  // Admit card
  // =====================================================================
  function admitCardHtml(s, exam, classLabel) {
    return `<div class="admit-card">
      <h3 style="text-align:center;margin:0 0 4px">ADMIT CARD</h3>
      <p style="text-align:center;margin:0 0 10px"><b>${esc(exam.name)}</b> (${fmtDate(exam.start_date)} to ${fmtDate(exam.end_date)})</p>
      <div class="hpc-top">${s.photo ? `<img src="${esc(UI.fileUrl(s.photo))}" class="hpc-photo" alt="">` : `<div class="hpc-photo">${esc(UI.initials(s.name))}</div>`}
        ${kv([["Name", s.name], ["Class", classLabel], ["Roll No.", s.roll_no], ["Admission No.", s.admission_no], ["Father", s.father_name]])}</div>
      ${table([{ label: "Date", render: (r) => `${fmtDate(r.date)} (${weekday(r.date).slice(0, 3)})` }, { label: "Subject", key: "subject" }, { label: "Time", key: "time" }], exam.schedule || [])}
      <p class="small">Bring this admit card to every exam. Reach school 15 minutes before the exam.</p>
      <div class="print-sign"><span>Student</span><span>Principal</span></div></div>`;
  }

  // =====================================================================
  // Gallery
  // =====================================================================
  async function gallery(view, ctx, opts = {}) {
    const { albums } = await MPS.get("/gallery");
    view.innerHTML = `${opts.manage ? '<div class="toolbar"><div></div><button class="btn" id="newAlbum"><i class="fa fa-plus"></i> New Album</button></div>' : ""}
      ${albums.length ? albums
        .map((a) => card(a.title, `<p class="muted small">${fmtDate(a.date)}${a.description ? " &middot; " + esc(a.description) : ""}</p>
          <div class="gallery-grid">${a.photos.map((p) => `<a href="${esc(UI.fileUrl(p))}" target="_blank" rel="noopener"><img src="${esc(UI.fileUrl(p))}" alt="" loading="lazy"></a>`).join("")}</div>
          ${a.link ? `<p style="margin-top:10px"><a class="btn btn-light btn-sm" href="${esc(a.link)}" target="_blank" rel="noopener"><i class="fa fa-youtube-play"></i> Watch / more photos</a></p>` : ""}`,
          { icon: "fa-picture-o", actions: opts.manage ? `<button class="btn btn-light btn-sm" data-del="${a.id}"><i class="fa fa-trash"></i></button>` : "" }))
        .join("") : card("Photo Gallery", empty("No albums yet.", "fa-picture-o"))}`;
    if (!opts.manage) return;
    view.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (confirm("Delete this album?") && (await run(() => MPS.del(`/principal/gallery/${b.dataset.del}`)))) gallery(view, ctx, opts);
      })
    );
    view.querySelector("#newAlbum").addEventListener("click", () => {
      let photos = [];
      const m = openForm({
        title: "New Album",
        intro: '<button type="button" class="btn btn-light btn-sm" id="pickPhotos"><i class="fa fa-upload"></i> Choose photos</button> <span id="photoCount" class="small muted">No photos selected</span>',
        fields: [
          { name: "title", label: "Title", required: true },
          { name: "date", label: "Date", type: "date", value: todayIso() },
          { name: "description", label: "Description", type: "textarea" },
          { name: "link", label: "YouTube / Google Drive link (optional)", type: "url" },
        ],
        submitLabel: "Publish",
        onSubmit: async (v) => {
          const r = await MPS.post("/principal/gallery", { ...v, photos });
          gallery(view, ctx, opts);
          return r;
        },
      });
      m.body.querySelector("#pickPhotos").addEventListener("click", async () => {
        try {
          photos = photos.concat(await UI.pickAndUpload({ accept: "image/*", multiple: true }));
          m.body.querySelector("#photoCount").textContent = `${photos.length} photo(s) uploaded`;
        } catch (e) {
          UI.toast(e.message, "error");
        }
      });
    });
  }

  // =====================================================================
  // WhatsApp connection, groups and message log (principal / accountant)
  // =====================================================================
  const MODE_TEXT = {
    dry_run: "Dry run: messages are saved below but NOT sent. Set SCHOOL_WHATSAPP_MODE=test (to your own number) or live in docker-compose.",
    test: "Test mode: every message is delivered to the test number instead of parents / groups.",
    live: "Live: messages go to parents and class groups.",
  };

  async function whatsappPage(view, ctx, filter = "") {
    const [s, o] = await Promise.all([MPS.get("/whatsapp/status"), MPS.get(`/whatsapp/outbox${filter ? `?purpose=${filter}` : ""}`)]);
    const linked = s.connected;
    const principal = ctx.role === "principal";
    const statusBody = linked
      ? `<p>${badge("Connected", "success")} Linked to <b>+${esc(s.number)}</b> ${s.name ? `(${esc(s.name)})` : ""}</p>
         ${principal ? '<button class="btn btn-light btn-sm" id="unlink"><i class="fa fa-chain-broken"></i> Unlink</button> <button class="btn btn-light btn-sm" id="groups"><i class="fa fa-users"></i> Check groups</button>' : ""}`
      : s.state === "offline"
        ? `<p>${badge("Offline", "danger")} The WhatsApp service is not running. Start it with <code>docker compose up -d</code>.</p>`
        : `<p>${badge(s.state === "qr" ? "Waiting for scan" : s.state, "warn")} Link the school WhatsApp number <b>${esc(s.school_number)}</b>:</p>
           <ol class="small"><li>Open WhatsApp on that phone &gt; <b>Settings &gt; Linked devices &gt; Link a device</b></li><li>Scan this QR code (it refreshes every ~20 seconds)</li></ol>
           ${s.qr ? `<img src="${s.qr}" alt="WhatsApp QR" class="qr-box">` : '<p class="muted">QR code is loading... click Refresh.</p>'}
           <div class="btn-group" style="margin-top:10px"><button class="btn btn-light btn-sm" id="refresh"><i class="fa fa-refresh"></i> Refresh</button>
           ${principal ? '<button class="btn btn-light btn-sm" id="pair"><i class="fa fa-mobile"></i> Link with phone number instead</button>' : ""}</div>`;
    view.innerHTML = `
      <div class="grid grid-2">
        ${card("WhatsApp Connection", statusBody, { icon: "fa-whatsapp" })}
        ${card("Sending Mode", `<p>${badge(s.mode)} ${esc(MODE_TEXT[s.mode] || "")}</p>${s.mode === "test" ? `<p class="small">Test number: +${esc(s.test_number)}</p>` : ""}
          <p class="small muted">Messages: ${Object.entries(s.counts).map(([k, v]) => `${esc(k)} ${v}`).join(" &middot; ") || "none yet"}</p>
          <button class="btn btn-sm" id="testMsg"><i class="fa fa-paper-plane"></i> Send test message</button>`, { icon: "fa-sliders" })}
      </div>
      ${card("Class WhatsApp Groups", `<p class="small muted" style="padding:12px 18px 0">Homework goes to the class group. A notice for everyone uses WhatsApp group name: <b>${esc(s.whatsapp_group_all || "No WhatsApp group set")}</b>. A notice for teachers uses WhatsApp group name: <b>${esc(s.whatsapp_group_teachers || "No WhatsApp group set")}</b>. The school number must be a member of each group.</p>
        ${table([{ label: "Class", key: "label" }, { label: "WhatsApp group name", render: (c) => (c.group ? `<b>${esc(c.group)}</b>` : badge("Not set", "danger")) }], s.class_groups)}`,
        { icon: "fa-users", flush: true })}
      ${card("Message Log", `<div style="padding:12px 18px 0" class="filters"><select id="purpose"><option value="">All messages</option>
        ${["student_absent", "diary", "fee_notice", "fee_reminder", "fee_overdue", "fee_receipt", "notice", "test"].map((p) => `<option ${p === filter ? "selected" : ""}>${p}</option>`).join("")}</select></div>
        ${table([
          { label: "Time", render: (m) => fmtDateTime(m.created_on), className: "nowrap" },
          { label: "To", render: (m) => `${m.kind === "group" ? '<i class="fa fa-users"></i> ' : ""}<b>${esc(m.to_label || "")}</b><div class="small muted">${esc(m.kind === "group" ? "group" : "+" + m.to)}</div>` },
          { label: "Type", render: (m) => badge(m.purpose, "neutral") },
          { label: "Message", render: (m) => `<div class="small pre" style="max-width:420px;max-height:90px;overflow:auto">${esc(m.text)}</div>` },
          { label: "Status", render: (m) => badge(m.status) + (m.error ? `<div class="small" style="color:var(--danger)">${esc(m.error)}</div>` : "") },
          { label: "", render: (m) => (m.status === "failed" ? `<button class="btn btn-light btn-sm" data-retry="${m.id}">Retry</button>` : "") },
        ], o.messages, { empty: "No WhatsApp messages yet.", emptyIcon: "fa-whatsapp" })}`, { icon: "fa-list", flush: true })}`;

    const reload = () => whatsappPage(view, ctx, filter);
    const on = (id, fn) => view.querySelector(id) && view.querySelector(id).addEventListener("click", fn);
    on("#refresh", reload);
    on("#unlink", async () => confirm("Unlink WhatsApp from the portal?") && (await run(() => MPS.post("/whatsapp/logout"))) && reload());
    on("#groups", async () => {
      try {
        const { groups } = await MPS.get("/whatsapp/groups");
        modal("Groups of the school number", table([{ label: "Group name", key: "subject" }, { label: "Members", key: "size" }], groups, { empty: "The number is not in any group." }));
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
    on("#pair", async () => {
      try {
        const r = await MPS.post("/whatsapp/pair", {});
        modal("Link with phone number", `<p>On the phone with WhatsApp ${esc(s.school_number)}: <b>Settings &gt; Linked devices &gt; Link a device &gt; Link with phone number instead</b>, then enter:</p><p class="pair-code">${esc(r.code)}</p>`);
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
    on("#testMsg", () =>
      openForm({
        title: "Send test WhatsApp",
        fields: [
          { name: "number", label: "Mobile number", required: true, value: s.school_number },
          { name: "text", label: "Message", type: "textarea", value: `Test message from ${ctx.school.name || "the school"} portal.` },
        ],
        submitLabel: "Send",
        onSubmit: async (v) => {
          const r = await MPS.post("/whatsapp/test", v);
          reload();
          return r;
        },
      })
    );
    view.querySelector("#purpose").addEventListener("change", (e) => whatsappPage(view, ctx, e.target.value));
    view.querySelectorAll("[data-retry]").forEach((b) => b.addEventListener("click", async () => (await run(() => MPS.post(`/whatsapp/retry/${b.dataset.retry}`))) && reload()));
    if (!linked && s.state !== "offline") {
      clearTimeout(whatsappPage.timer);
      whatsappPage.timer = setTimeout(() => document.body.contains(view) && reload(), 20000);
    }
  }

  // =====================================================================
  // Attendance report for a class (teacher / principal)
  // =====================================================================
  async function attendanceReport(view, ctx, state = {}) {
    const { classes } = await MPS.get("/classes");
    const classId = state.classId || (ctx.user.class_teacher_of || classes[0].id);
    const d = await MPS.get(`/attendance/report?class_id=${classId}${state.month ? `&month=${state.month}` : ""}`);
    const low = d.students.filter((s) => s.working_days && s.percentage < 75).length;
    view.innerHTML = `
      <div class="toolbar"><div class="filters">
        <select id="cls">${classes.map((c) => `<option value="${c.id}" ${c.id === classId ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select>
        <select id="month"><option value="">Whole session</option>${d.months.map((m) => `<option value="${m}" ${m === state.month ? "selected" : ""}>${fmtMonth(m)}</option>`).join("")}</select>
      </div>${low ? badge(`${low} student(s) below 75%`, "danger") : badge("All students above 75%", "success")}</div>
      ${card(`${d.class_label} · ${state.month ? fmtMonth(state.month) : "Session to date"}`, table(
        [
          { label: "Roll", key: "roll_no" },
          { label: "Student", render: (s) => `<b>${esc(s.name)}</b>` },
          { label: "Days", key: "working_days", className: "right" },
          { label: "Present", key: "present", className: "right" },
          { label: "Absent", key: "absent", className: "right" },
          { label: "Late", key: "late", className: "right" },
          { label: "Half day", key: "half_day", className: "right" },
          { label: "Leave", key: "leave", className: "right" },
          { label: "Attendance", render: (s) => `<div style="min-width:120px"><b>${s.percentage}%</b>${UI.progress(s.percentage)}</div>` },
        ],
        d.students
      ), { icon: "fa-bar-chart", flush: true })}`;
    view.querySelector("#cls").addEventListener("change", (e) => attendanceReport(view, ctx, { classId: e.target.value, month: state.month }));
    view.querySelector("#month").addEventListener("change", (e) => attendanceReport(view, ctx, { classId, month: e.target.value }));
  }

  // ---------- Office staff accounts (admin -> accountants, accountant -> principals) ----------
  /**
   * opts: { title, noun, icon, rows, defaultPassword, extraFields, extraColumns,
   *         create(values), update(row, values), resetPassword(row), remove(row), reload() }
   */
  function staffAccounts(view, opts) {
    const FORM = (s) => [
      { name: "photo", label: "Photo", type: "photo", value: s.photo, hint: "Shown at the top left. Large photos are saved as a small PNG." },
      ...(opts.extraFields ? opts.extraFields(s) : []),
      { name: "name", label: "Name", required: true, value: s.name },
      { name: "designation", label: "Designation", value: s.designation },
      { name: "phone", label: "Mobile", required: true, value: s.phone },
      { name: "email", label: "Email", type: "email", value: s.email },
    ];
    view.innerHTML = card(`${opts.title} (${opts.rows.length})`, table(
      [
        { label: opts.noun, render: (s) => `<div class="who"><div class="avatar">${avatar(s.name, s.photo)}</div><div><b>${esc(s.name)}</b>${s.active === false ? ` ${badge("Inactive", "neutral")}` : ""}<div class="small muted">${esc(s.employee_id)} &middot; ${esc(s.designation || "")}</div></div></div>` },
        ...(opts.extraColumns || []),
        { label: "Mobile", key: "phone" },
        { label: "Email", key: "email" },
        { label: "", className: "right", render: (s) => `<button class="btn btn-light btn-sm" data-edit="${esc(s.key || s.id)}"><i class="fa fa-pencil"></i></button>` },
      ],
      opts.rows,
      { empty: `No ${opts.noun.toLowerCase()} added yet.` }
    ), { icon: opts.icon, flush: true, actions: `<button class="btn btn-sm" id="addStaff"><i class="fa fa-user-plus"></i> Add ${esc(opts.noun)}</button>` });

    view.querySelector("#addStaff").addEventListener("click", () => openForm({
      title: `Add ${opts.noun}`, intro: `Login ID is created automatically. Default password: ${esc(opts.defaultPassword)}`,
      fields: FORM({}), submitLabel: "Add",
      onSubmit: async (v) => { const r = await opts.create(v); opts.reload(); return r; },
    }));
    view.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const s = opts.rows.find((x) => String(x.key || x.id) === b.dataset.edit);
      const m = openForm({
        title: `Edit ${s.name}`,
        intro: `Login ID: <b>${esc(s.employee_id)}</b>`,
        fields: [...FORM(s).filter((f) => !f.createOnly), { name: "active", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }], value: String(s.active !== false) }],
        onSubmit: async (v) => { const r = await opts.update(s, v); opts.reload(); return r; },
      });
      const actions = m.body.querySelector(".modal-actions");
      const reset = document.createElement("button");
      reset.type = "button";
      reset.className = "btn btn-light btn-sm";
      reset.textContent = "Reset password";
      reset.addEventListener("click", () => confirm(`Reset password to ${opts.defaultPassword}?`) && run(() => opts.resetPassword(s)));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn-danger btn-sm";
      remove.textContent = "Remove";
      remove.addEventListener("click", async () => {
        if (!confirm(`Remove ${s.name} (${s.employee_id})? They will no longer be able to log in.`)) return;
        if (await run(() => opts.remove(s))) { m.close(); opts.reload(); }
      });
      actions.prepend(reset);
      actions.prepend(remove);
    }));
  }

  const CHANGE_LABEL = { phone: "Mobile", email: "Email", address: "Address" };
  const ROLE_TITLE = { teacher: "Teacher", principal: "Principal", accountant: "Accountant" };

  async function myProfile(view, ctx) {
    const d = await MPS.get("/me/profile");
    const u = d.user;
    const title = ROLE_TITLE[d.role] || "Staff";
    const pending = d.pending_requests.length
      ? `<div class="form-ok" style="margin-top:14px">Update request pending with the office: ${d.pending_requests
          .map((r) => Object.entries(r.changes).map(([k, v]) => `${esc(CHANGE_LABEL[k] || k)} → ${esc(v)}`).join(", "))
          .join("; ")}</div>`
      : "";
    const rows = [
      ["Name", u.name],
      ["Employee ID", u.employee_id],
      ["Designation", u.designation || title],
    ];
    if (u.qualification) rows.push(["Qualification", u.qualification]);
    if (u.subjects && u.subjects.length) rows.push(["Subjects", u.subjects.join(", ")]);
    if (u.joining_date) rows.push(["Joining Date", fmtDate(u.joining_date)]);
    if (u.dob) rows.push(["Date of Birth", fmtDate(u.dob)]);
    if (u.gender) rows.push(["Gender", u.gender]);
    if (u.blood_group) rows.push(["Blood Group", u.blood_group]);
    view.innerHTML = `
      ${card("Photo", `<div style="display:flex;gap:16px;align-items:center"><div class="avatar" style="width:84px;height:84px;font-size:28px">${avatar(u.name, u.photo)}</div>
        <button class="btn btn-light btn-sm" id="photoBtn"><i class="fa fa-camera"></i> ${u.photo ? "Change" : "Upload"} photo</button></div>`, { icon: "fa-camera" })}
      ${card(`${title} Details`, kv(rows), { icon: "fa-user" })}
      ${card("Contact", kv([
        ["Mobile", u.phone], ["Email", u.email], ["Address", u.address],
      ]) + pending, { icon: "fa-home", actions: '<button class="btn btn-sm" id="editBtn"><i class="fa fa-pencil"></i> Request Update</button>' })}`;
    view.querySelector("#photoBtn").addEventListener("click", async () => {
      try {
        const [file] = await UI.pickAndUpload({ accept: "image/png,image/jpeg,image/webp", icon: true });
        if (!file) return;
        await run(() => MPS.post("/me/photo", { file }));
        MPS.saveSession({ ...MPS.session(), user: { ...MPS.session().user, photo: file } });
        location.reload();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
    view.querySelector("#editBtn").addEventListener("click", () =>
      openForm({
        title: "Request Contact Update",
        intro: "The school office will verify and update your record.",
        fields: [
          { name: "phone", label: "Mobile", value: u.phone },
          { name: "email", label: "Email", type: "email", value: u.email },
          { name: "address", label: "Address", type: "textarea", value: u.address },
        ],
        submitLabel: "Send Request",
        onSubmit: async (v) => {
          const r = await MPS.post("/me/profile/update-request", v);
          ctx.refresh();
          return r;
        },
      })
    );
  }

  Object.assign(UI.shared, { classAttendance, diary, gallery, whatsapp: whatsappPage, attendanceReport, staffAccounts, myProfile });
  Object.assign(UI, { receiptHtml, showReceipt, progressCardHtml, showProgressCard, admitCardHtml, CODE_LABEL });
})();
