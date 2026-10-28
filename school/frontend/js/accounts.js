/** Fee office screens, shared by the accountant and principal portals. */
const Accounts = (() => {
  const { esc, fmtDate, fmtDateTime, money, badge, card, stat, empty, table, kv, openForm, run, todayIso, printDoc } = UI;

  // ---------- Dashboard ----------
  async function dashboard(view) {
    const d = await MPS.get("/accounts/dashboard");
    view.innerHTML = `
      <div class="grid grid-4">
        ${stat("Collected Today", money(d.collected_today), { icon: "fa-inr", sub: `${d.receipts_today} receipt(s)` })}
        ${stat("This Month", money(d.collected_month), { icon: "fa-calendar", tone: "info" })}
        ${stat("Total Dues", money(d.total_due), { icon: "fa-exclamation-circle", tone: "warn", sub: `${money(d.overdue)} overdue` })}
        ${stat("2+ Months Pending", d.defaulters, { icon: "fa-users", tone: "danger", sub: `<a href="#defaulters">View list</a>` })}
      </div>
      ${d.pending_intimations ? `<div class="form-ok"><i class="fa fa-bell"></i> ${d.pending_intimations} parent payment(s) waiting for verification. <a href="#intimations">Verify now</a></div>` : ""}
      <div class="grid grid-side">
        ${card("Class-wise Dues", table(
          [
            { label: "Class", render: (c) => `<b>${esc(c.label)}</b>` },
            { label: "Students", key: "students", className: "right" },
            { label: "2+ months", render: (c) => (c.defaulters ? badge(c.defaulters, "danger") : "-"), className: "right" },
            { label: "Dues", render: (c) => `<b>${money(c.due)}</b>`, className: "right" },
            { label: "", className: "right", render: (c) => `<a class="btn btn-sm" href="#collect" data-class="${c.id}">Collect</a>` },
          ],
          d.classes
        ), { icon: "fa-th-large", flush: true })}
        ${card("Fee Rules", kv([["Collecting now", `${d.rules.billable_month_label} fee`], ["Collection window", d.rules.collection_window], ["Late fee", d.rules.late_fee_rule], ["WhatsApp reminders", d.rules.reminders]]), { icon: "fa-info-circle" })}
      </div>
      ${card("Recent Receipts", receiptTable(d.recent_receipts), { icon: "fa-file-text-o", flush: true, actions: '<a class="small" href="#receipts">All receipts</a>' })}`;
    view.querySelectorAll("[data-class]").forEach((a) => a.addEventListener("click", () => sessionStorage.setItem("school_collect_class", a.dataset.class)));
    bindReceipts(view);
  }

  const receiptTable = (items) =>
    table(
      [
        { label: "Receipt", render: (p) => `<b>${esc(p.receipt_no)}</b><div class="small muted">${fmtDate(p.date)}</div>` },
        { label: "Student", render: (p) => `${esc(p.student_name)}${p.class_label ? `<div class="small muted">${esc(p.class_label)}</div>` : ""}` },
        { label: "Paid by", key: "paid_by" },
        { label: "Mode", key: "method" },
        { label: "Amount", render: (p) => `<b>${money(p.total)}</b>`, className: "right" },
        { label: "", className: "right", render: (p) => `<button class="btn btn-light btn-sm" data-receipt="${p.id}"><i class="fa fa-print"></i> View</button>` },
      ],
      items,
      { empty: "No receipts yet.", emptyIcon: "fa-file-text-o" }
    );

  function bindReceipts(view) {
    view.querySelectorAll("[data-receipt]").forEach((b) => b.addEventListener("click", async () => UI.showReceipt(await MPS.get(`/accounts/receipts/${b.dataset.receipt}`))));
  }

  // ---------- Fee collection: class -> student -> collect ----------
  async function collect(view, ctx, state = {}) {
    const preset = sessionStorage.getItem("school_collect_class");
    if (preset) {
      sessionStorage.removeItem("school_collect_class");
      state = { classId: preset };
    }
    const presetStudent = sessionStorage.getItem("school_collect_student");
    if (presetStudent) {
      sessionStorage.removeItem("school_collect_student");
      state = JSON.parse(presetStudent);
    }
    if (state.studentId) return studentFee(view, ctx, state);
    if (state.classId) return classStudents(view, ctx, state);
    const d = await MPS.get("/accounts/dashboard");
    view.innerHTML = `<div class="toolbar"><span class="small muted">Collecting <b>${esc(d.rules.billable_month_label)}</b> fee &middot; ${esc(d.rules.collection_window)}</span>
        <div class="filters"><input id="search" placeholder="Search student / admission no." style="min-width:240px"></div></div>
      <div class="class-tiles">${d.classes
        .map((c) => `<button type="button" class="class-tile ${c.due ? "" : "done"}" data-class="${c.id}"><b>${esc(c.label)}</b><span>${c.students} students</span>
          <span class="tile-status ${c.due ? "pending" : "ok"}">${c.due ? `Dues ${money(c.due)}` : "No dues"}</span>${c.defaulters ? `<em style="background:var(--danger-bg);color:var(--danger)">${c.defaulters} late</em>` : ""}</button>`)
        .join("")}</div><div id="results"></div>`;
    view.querySelectorAll("[data-class]").forEach((b) => b.addEventListener("click", () => collect(view, ctx, { classId: b.dataset.class })));
    let timer;
    view.querySelector("#search").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = e.target.value.trim();
        const box = view.querySelector("#results");
        if (q.length < 2) {
          box.innerHTML = "";
          return;
        }
        const r = await MPS.get(`/principal/students?q=${encodeURIComponent(q)}`);
        box.innerHTML = card("Search results", table(
          [
            { label: "Student", render: (s) => `<b>${esc(s.name)}</b><div class="small muted">${esc(s.admission_no)} &middot; ${esc(s.class_label)}</div>` },
            { label: "Father", key: "father_name" },
            { label: "", className: "right", render: (s) => `<button class="btn btn-sm" data-student="${s.id}" data-cls="${s.class_id}">Open</button>` },
          ],
          r.students.slice(0, 20)
        ), { icon: "fa-search", flush: true });
        box.querySelectorAll("[data-student]").forEach((b) => b.addEventListener("click", () => collect(view, ctx, { classId: b.dataset.cls, studentId: b.dataset.student })));
      }, 300);
    });
  }

  async function classStudents(view, ctx, state) {
    const d = await MPS.get(`/accounts/class/${state.classId}`);
    view.innerHTML = `<div class="toolbar"><button class="btn btn-light btn-sm" id="back"><i class="fa fa-arrow-left"></i> All classes</button>
        ${badge(`Class dues ${money(d.students.reduce((t, s) => t + s.due, 0))}`, "warn")}</div>
      ${card(`${d.class_label} · Students`, table(
        [
          { label: "Roll", key: "roll_no" },
          { label: "Student", render: (s) => `<b>${esc(s.name)}</b><div class="small muted">${esc(s.admission_no)} &middot; ${esc(s.father_name)} &middot; ${esc(s.phone || "")}</div>` },
          { label: "Pending months", render: (s) => (s.pending_months.length ? `${s.pending_months.length >= 2 ? badge(`${s.pending_months.length} months`, "danger") : ""} <span class="small">${esc(s.pending_months.join(", "))}</span>` : '<span class="muted">-</span>') },
          { label: "Last paid", render: (s) => fmtDate(s.last_payment), className: "nowrap" },
          { label: "Dues", render: (s) => (s.due ? `<b style="color:var(--danger)">${money(s.due)}</b>` : badge("Paid", "success")), className: "right" },
          { label: "", className: "right", render: (s) => `<button class="btn btn-sm" data-student="${s.id}"><i class="fa fa-inr"></i> Record Fee</button>` },
        ],
        d.students
      ), { icon: "fa-users", flush: true })}`;
    view.querySelector("#back").addEventListener("click", () => collect(view, ctx, {}));
    view.querySelectorAll("[data-student]").forEach((b) => b.addEventListener("click", () => collect(view, ctx, { classId: state.classId, studentId: b.dataset.student })));
  }

  async function studentFee(view, ctx, state) {
    const d = await MPS.get(`/accounts/student/${state.studentId}`);
    const s = d.student;
    const due = d.charges.filter((c) => c.due > 0);
    const pendingInt = d.intimations.filter((i) => i.status === "Pending");
    view.innerHTML = `
      <div class="toolbar"><button class="btn btn-light btn-sm" id="back"><i class="fa fa-arrow-left"></i> ${esc(d.class_label)} students</button>
        <span>${badge(`Balance ${money(d.summary.due)}`, d.summary.due ? "danger" : "success")}</span></div>
      ${pendingInt.length ? `<div class="form-ok">Parent says paid: ${pendingInt.map((i) => `<b>${money(i.amount)}</b> on ${fmtDate(i.paid_on)} via ${esc(i.method)} ${i.reference ? `(${esc(i.reference)})` : ""}${i.screenshot ? ` <a href="${esc(UI.fileUrl(i.screenshot))}" target="_blank">screenshot</a>` : ""}`).join("; ")}</div>` : ""}
      <div class="grid grid-side">
        <div class="stack">
          ${card("1. Select dues being paid", due.length ? `<div class="table-wrap"><table class="table"><thead><tr><th></th><th>Particulars</th><th>Due date</th><th class="right">Due</th><th class="right">Paying now</th></tr></thead><tbody>
            ${due.map((c) => `<tr><td><input type="checkbox" class="fee-check" data-charge="${c.id}" checked></td><td><b>${esc(c.description)}</b>${c.status === "Overdue" ? ` ${badge("Overdue")}` : ""}</td>
              <td class="nowrap">${fmtDate(c.due_date)}</td><td class="right">${money(c.due)}</td>
              <td class="right"><input type="number" class="amount-input" data-amount="${c.id}" value="${c.due}" min="0" max="${c.due}"></td></tr>`).join("")}</tbody></table></div>`
            : empty("No dues. You can still add items below.", "fa-check-circle"), { icon: "fa-list", flush: true })}
          ${card("2. Other items (dress, book, copy, tie, belt, exam, development, event...)", `<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Description</th><th class="right">Charge</th><th class="right">Paid now</th><th></th></tr></thead>
            <tbody id="items"></tbody></table></div><div style="padding:10px 18px"><button class="btn btn-light btn-sm" id="addItem"><i class="fa fa-plus"></i> Add item</button></div>`, { icon: "fa-shopping-bag", flush: true })}
          ${card("3. Payment details", `<form id="payForm" class="grid grid-2" style="gap:0 16px">
            ${UI.fieldHtml({ name: "paid_on", label: "Date given by parent", type: "date", value: todayIso(), max: todayIso(), required: true })}
            ${UI.fieldHtml({ name: "paid_by", label: "Paid by", value: s.father_name, required: true })}
            ${UI.fieldHtml({ name: "method", label: "Mode", type: "select", options: d.payment_methods, value: pendingInt[0] ? pendingInt[0].method : "Cash" })}
            ${UI.fieldHtml({ name: "reference", label: "UPI / cheque reference", value: pendingInt[0] ? pendingInt[0].reference : "" })}
            ${UI.fieldHtml({ name: "received_by", label: "Given to (received by)", value: d.received_by })}
            ${UI.fieldHtml({ name: "note", label: "Note" })}
            <label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" name="whatsapp" checked style="width:auto"> Send WhatsApp receipt to parent</label>
          </form>
          <div class="sticky-bar static"><span>Total: <b id="total" style="font-size:20px">Rs 0</b></span><button class="btn" id="submit"><i class="fa fa-check"></i> Submit &amp; Generate Receipt</button></div>`, { icon: "fa-credit-card", flush: false })}
        </div>
        <div class="stack">
          ${card(s.name, kv([["Admission No.", s.admission_no], ["Class", `${d.class_label} (Roll ${s.roll_no})`], ["Father", s.father_name], ["Mobile", s.father_phone || s.phone]]), { icon: "fa-user" })}
          ${card("Dues (month-wise)", d.dues.length ? table([{ label: "Month / Item", key: "label" }, { label: "Due", render: (g) => money(g.amount), className: "right" }], d.dues) : empty("No dues", "fa-check"), { icon: "fa-inr", flush: true })}
          ${card("Previous Receipts", receiptTable(d.payments.map((p) => ({ ...p, student_name: s.name }))), { icon: "fa-file-text-o", flush: true })}
        </div>
      </div>`;

    const itemsBox = view.querySelector("#items");
    const addItem = () => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><select data-head>${d.other_heads.map((h) => `<option>${esc(h)}</option>`).join("")}</select></td>
        <td><input data-desc placeholder="e.g. 2 sets, size 28"></td>
        <td class="right"><input type="number" class="amount-input" data-charge-amt min="0" placeholder="0"></td>
        <td class="right"><input type="number" class="amount-input" data-paid-amt min="0" placeholder="0"></td>
        <td><button type="button" class="btn btn-light btn-sm" data-remove><i class="fa fa-times"></i></button></td>`;
      itemsBox.appendChild(tr);
      tr.querySelector("[data-remove]").addEventListener("click", () => {
        tr.remove();
        recalc();
      });
      tr.querySelector("[data-charge-amt]").addEventListener("input", (e) => {
        const paid = tr.querySelector("[data-paid-amt]");
        if (!paid.dataset.touched) paid.value = e.target.value;
        recalc();
      });
      tr.querySelector("[data-paid-amt]").addEventListener("input", (e) => {
        e.target.dataset.touched = "1";
        recalc();
      });
    };
    const lines = () =>
      [...view.querySelectorAll("[data-charge]")]
        .filter((c) => c.checked)
        .map((c) => ({ charge_id: c.dataset.charge, amount: Number(view.querySelector(`[data-amount="${c.dataset.charge}"]`).value || 0) }))
        .filter((l) => l.amount > 0);
    const items = () =>
      [...itemsBox.querySelectorAll("tr")]
        .map((tr) => ({
          head: tr.querySelector("[data-head]").value,
          description: tr.querySelector("[data-desc]").value,
          amount: Number(tr.querySelector("[data-charge-amt]").value || 0),
          paid: Number(tr.querySelector("[data-paid-amt]").value || 0),
        }))
        .filter((i) => i.amount > 0);
    const recalc = () => {
      const total = lines().reduce((t, l) => t + l.amount, 0) + items().reduce((t, i) => t + i.paid, 0);
      view.querySelector("#total").textContent = money(total);
    };
    view.querySelectorAll("[data-charge], [data-amount]").forEach((el) => el.addEventListener("input", recalc));
    view.querySelectorAll("[data-charge]").forEach((el) => el.addEventListener("change", recalc));
    view.querySelector("#addItem").addEventListener("click", addItem);
    recalc();
    bindReceipts(view);
    view.querySelector("#back").addEventListener("click", () => collect(view, ctx, { classId: s.class_id }));
    view.querySelector("#submit").addEventListener("click", async (e) => {
      const form = view.querySelector("#payForm");
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      const payload = { ...values, whatsapp: Boolean(values.whatsapp), lines: lines(), items: items(), intimation_id: pendingInt[0] ? pendingInt[0].id : null };
      if (!payload.lines.length && !payload.items.length) {
        UI.toast("Select a due or add an item", "error");
        return;
      }
      e.target.disabled = true;
      try {
        const r = await MPS.post(`/accounts/student/${s.id}/collect`, payload);
        UI.toast(r.message);
        if (r.receipt) UI.showReceipt(r.receipt);
        studentFee(view, ctx, state);
      } catch (err) {
        UI.toast(err.message, "error");
        e.target.disabled = false;
      }
    });
  }

  // ---------- Receipts ----------
  async function receipts(view, ctx, state = {}) {
    const q = new URLSearchParams();
    if (state.q) q.set("q", state.q);
    if (state.date) q.set("date", state.date);
    const d = await MPS.get(`/accounts/receipts?${q}`);
    view.innerHTML = `<div class="toolbar"><div class="filters"><input id="q" placeholder="Receipt no. / student / paid by" value="${esc(state.q || "")}" style="min-width:240px">
        <input type="date" id="date" value="${esc(state.date || "")}"><button class="btn btn-light btn-sm" id="clear">Clear</button></div>
        ${badge(`${d.receipts.length} receipt(s) · ${money(d.receipts.reduce((t, p) => t + p.total, 0))}`, "neutral")}</div>
      ${card("Fee Receipts", receiptTable(d.receipts), { icon: "fa-file-text-o", flush: true })}`;
    bindReceipts(view);
    let timer;
    view.querySelector("#q").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => receipts(view, ctx, { ...state, q: e.target.value }), 400);
    });
    view.querySelector("#date").addEventListener("change", (e) => receipts(view, ctx, { ...state, date: e.target.value }));
    view.querySelector("#clear").addEventListener("click", () => receipts(view, ctx, {}));
  }

  // ---------- Defaulters ----------
  async function defaulters(view, ctx, minMonths) {
    const d = await MPS.get(`/accounts/defaulters${minMonths ? `?min_months=${minMonths}` : ""}`);
    view.innerHTML = `<div class="toolbar"><div class="filters"><label style="margin:0">Pending for</label>
        <select id="min">${[1, 2, 3, 4].map((n) => `<option value="${n}" ${n === d.min_months ? "selected" : ""}>${n}+ month(s)</option>`).join("")}</select></div>
        <div class="btn-group">${badge(`${d.students.length} students · ${money(d.total_due)}`, "danger")}
        ${d.students.length ? '<button class="btn btn-sm" id="remind"><i class="fa fa-whatsapp"></i> Send reminder to all</button>' : ""}</div></div>
      ${card("Fee Defaulters", table(
        [
          { label: "Class", key: "class_label" },
          { label: "Student", render: (s) => `<b>${esc(s.name)}</b><div class="small muted">${esc(s.father_name)} &middot; ${esc(s.phone || "")}</div>` },
          { label: "Pending months", render: (s) => `${badge(`${s.pending_months.length}`, "danger")} <span class="small">${esc(s.pending_months.join(", "))}</span>` },
          { label: "Dues", render: (s) => `<b>${money(s.due)}</b>`, className: "right" },
          { label: "", className: "right", render: (s) => `<button class="btn btn-sm" data-student="${s.id}">Collect</button>` },
        ],
        d.students,
        { empty: "No defaulters. Great!", emptyIcon: "fa-smile-o" }
      ), { icon: "fa-exclamation-triangle", flush: true })}`;
    view.querySelector("#min").addEventListener("change", (e) => defaulters(view, ctx, Number(e.target.value)));
    const remind = view.querySelector("#remind");
    if (remind)
      remind.addEventListener("click", () => confirm(`Send WhatsApp overdue reminder to ${d.students.length} families?`) &&
        run(() => MPS.post("/accounts/reminders", { kind: "overdue", student_ids: d.students.map((s) => s.id) })));
    view.querySelectorAll("[data-student]").forEach((b) =>
      b.addEventListener("click", () => {
        sessionStorage.setItem("school_collect_student", JSON.stringify({ studentId: b.dataset.student }));
        location.hash = "collect";
      })
    );
  }

  // ---------- Parent payment intimations ----------
  async function intimations(view, ctx) {
    const d = await MPS.get("/accounts/intimations");
    view.innerHTML = card("Payments reported by parents", table(
      [
        { label: "Date", render: (i) => fmtDate(i.date), className: "nowrap" },
        { label: "Student", render: (i) => `<b>${esc(i.student_name)}</b><div class="small muted">${esc(i.class_label)}</div>` },
        { label: "Amount", render: (i) => `<b>${money(i.amount)}</b>`, className: "right" },
        { label: "Paid on / via", render: (i) => `${fmtDate(i.paid_on)}<div class="small muted">${esc(i.method)} ${esc(i.reference || "")}</div>${i.note ? `<div class="small">${esc(i.note)}</div>` : ""}` },
        { label: "Screenshot", render: (i) => (i.screenshot ? `<a href="${esc(UI.fileUrl(i.screenshot))}" target="_blank" rel="noopener"><img src="${esc(UI.fileUrl(i.screenshot))}" style="height:48px;border-radius:6px"></a>` : "-") },
        { label: "Status", render: (i) => badge(i.status === "Rejected" ? "Not received" : i.status) + (i.receipt_no ? `<div class="small">${esc(i.receipt_no)}</div>` : "") },
        { label: "", className: "right nowrap", render: (i) => (i.status === "Pending" ? `<button class="btn btn-sm" data-record="${i.student_id}">Verify &amp; Record</button> <button class="btn btn-light btn-sm" data-reject="${i.id}">Not received</button>` : "") },
      ],
      d.intimations,
      { empty: "No payments reported by parents.", emptyIcon: "fa-bell-o" }
    ), { icon: "fa-bell", flush: true });
    view.querySelectorAll("[data-record]").forEach((b) =>
      b.addEventListener("click", () => {
        sessionStorage.setItem("school_collect_student", JSON.stringify({ studentId: b.dataset.record }));
        location.hash = "collect";
      })
    );
    view.querySelectorAll("[data-reject]").forEach((b) =>
      b.addEventListener("click", () =>
        openForm({
          title: "Payment not received",
          fields: [{ name: "note", label: "Note for records", type: "textarea" }],
          submitLabel: "Mark not received",
          onSubmit: async (v) => {
            const r = await MPS.post(`/accounts/intimations/${b.dataset.reject}`, { status: "Rejected", note: v.note });
            intimations(view, ctx);
            return r;
          },
        })
      )
    );
  }

  // ---------- Reminders ----------
  async function reminders(view, ctx) {
    const d = await MPS.get("/accounts/jobs");
    const kinds = [
      { kind: "notice", title: "Monthly fee notice", text: "Sent automatically on the 1st: fee for last month + old dues.", icon: "fa-bullhorn" },
      { kind: "reminder", title: "Last-date reminder", text: "Sent automatically on the 5th to everyone with dues.", icon: "fa-bell" },
      { kind: "overdue", title: "Overdue reminder", text: "Sent every alternate day after the 5th to students with 2+ months pending.", icon: "fa-exclamation-triangle" },
    ];
    view.innerHTML = `${card("Automatic Rules", kv([["Collecting now", `${d.rules.billable_month_label} fee`], ["Window", d.rules.collection_window], ["Late fee", d.rules.late_fee_rule], ["Schedule", d.rules.reminders]]), { icon: "fa-clock-o" })}
      <div class="grid grid-3">${kinds
        .map((k) => card(k.title, `<p class="small">${k.text}</p><button class="btn btn-sm" data-kind="${k.kind}"><i class="fa fa-whatsapp"></i> Send now</button>`, { icon: k.icon }))
        .join("")}</div>
      ${card("Job History", table([{ label: "Job", key: "id" }, { label: "Ran on", render: (r) => fmtDateTime(r.ran_on) },
        { label: "Result", render: (r) => `<span class="small">${esc(typeof r.result === "string" ? r.result : (r.result && r.result.summary) || JSON.stringify(r.result))}</span>` }],
        d.runs, { empty: "No jobs run yet." }), { icon: "fa-history", flush: true, actions: '<button class="btn btn-light btn-sm" id="runJobs">Run daily check now</button>' })}`;
    view.querySelectorAll("[data-kind]").forEach((b) =>
      b.addEventListener("click", () => confirm("Send this WhatsApp message to all matching parents now?") && run(() => MPS.post("/accounts/reminders", { kind: b.dataset.kind })))
    );
    view.querySelector("#runJobs").addEventListener("click", async () => (await run(() => MPS.post("/accounts/jobs/run"))) && reminders(view, ctx));
  }

  // ---------- Collection report ----------
  async function report(view, ctx, state = {}) {
    const q = new URLSearchParams(state);
    const d = await MPS.get(`/accounts/report?${q}`);
    const body = `<p>From <b>${fmtDate(d.from)}</b> to <b>${fmtDate(d.to)}</b> &middot; Total collected: <b>${money(d.total)}</b></p>
      <div class="grid grid-2">
        <div>${table([{ label: "Fee head", key: "head" }, { label: "Amount", render: (h) => money(h.amount), className: "right" }], d.heads, { empty: "No collections." })}</div>
        <div>${table([{ label: "Mode", key: "method" }, { label: "Amount", render: (m) => money(m.amount), className: "right" }], d.methods, { empty: "-" })}</div>
      </div>
      <h4 style="margin:16px 0 6px">Day-wise</h4>
      ${table([{ label: "Date", render: (x) => fmtDate(x.date) }, { label: "Receipts", key: "receipts", className: "right" }, { label: "Amount", render: (x) => money(x.amount), className: "right" }], d.days,
        { empty: "No collections.", footer: `<td>Total</td><td></td><td class="right">${money(d.total)}</td>` })}`;
    view.innerHTML = `<div class="toolbar"><div class="filters"><label style="margin:0">From</label><input type="date" id="from" value="${d.from}">
        <label style="margin:0">To</label><input type="date" id="to" value="${d.to}"></div><button class="btn" id="print"><i class="fa fa-print"></i> Print</button></div>
      ${card("Fee Collection Report", body, { icon: "fa-bar-chart" })}`;
    const reload = () => report(view, ctx, { from: view.querySelector("#from").value, to: view.querySelector("#to").value });
    view.querySelector("#from").addEventListener("change", reload);
    view.querySelector("#to").addEventListener("change", reload);
    view.querySelector("#print").addEventListener("click", () => printDoc("Collection Report", `<h3 style="text-align:center">Fee Collection Report</h3>${body}`));
  }

  // ---------- Fee structure ----------
  async function settings(view, ctx) {
    const d = await MPS.get("/principal/classes");
    view.innerHTML = `${card("Monthly Tuition Fee & WhatsApp Group", `<div class="table-wrap"><table class="table"><thead><tr><th>Class</th><th>Students</th><th>Monthly fee (Rs)</th><th>WhatsApp group name</th>${ctx.role === "principal" ? "<th>Class teacher</th>" : ""}<th></th></tr></thead><tbody>
        ${d.classes.map((c) => `<tr data-cls="${c.id}"><td><b>${esc(c.name)}</b></td><td>${c.student_count}</td>
          <td><input type="number" class="amount-input" data-f="monthly_fee" value="${c.monthly_fee}" min="0"></td>
          <td><input data-f="whatsapp_group" value="${esc(c.whatsapp_group || "")}" placeholder="exact group name"></td>
          ${ctx.role === "principal" ? `<td><select data-f="class_teacher_id">${d.teachers.map((t) => `<option value="${t.id}" ${t.id === c.class_teacher_id ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></td>` : ""}
          <td><button class="btn btn-sm" data-save="${c.id}">Save</button></td></tr>`).join("")}</tbody></table></div>`, { icon: "fa-th-large", flush: true })}
      ${card("Transport Fee (monthly)", table([
        { label: "Route", render: (r) => `<b>${esc(r.route_name)}</b><div class="small muted">${esc(r.bus_no)}</div>` },
        { label: "Monthly fee (Rs)", render: (r) => `<input type="number" class="amount-input" data-route-fee="${r.id}" value="${r.monthly_fee || 0}" min="0">` },
        { label: "", render: (r) => `<button class="btn btn-sm" data-route="${r.id}">Save</button>` },
      ], d.routes), { icon: "fa-bus", flush: true })}
      <p class="small muted">Fee changes apply to months billed from now on. Already billed months are not changed.</p>`;
    view.querySelectorAll("[data-save]").forEach((b) =>
      b.addEventListener("click", () => {
        const row = view.querySelector(`[data-cls="${b.dataset.save}"]`);
        const payload = {};
        row.querySelectorAll("[data-f]").forEach((i) => (payload[i.dataset.f] = i.value));
        run(() => MPS.post(`/principal/classes/${b.dataset.save}`, payload));
      })
    );
    view.querySelectorAll("[data-route]").forEach((b) =>
      b.addEventListener("click", () => run(() => MPS.post(`/principal/routes/${b.dataset.route}`, { monthly_fee: view.querySelector(`[data-route-fee="${b.dataset.route}"]`).value })))
    );
  }

  return { dashboard, collect, receipts, defaulters, intimations, reminders, report, settings };
})();
