/** Fee office screens, shared by the accountant and principal portals. */
const Accounts = (() => {
  const { esc, fmtDate, fmtDateTime, fmtMonth, money, badge, card, stat, empty, table, kv, openForm, run, todayIso, printDoc } = UI;

  // ---------- Dashboard ----------
  async function dashboard(view) {
    const d = await MPS.get("/accounts/dashboard");
    view.innerHTML = `
      <div class="grid grid-4">
        ${stat("Collected Today", money(d.collected_today), { icon: "fa-inr", sub: `${d.receipts_today} receipt(s)` })}
        ${stat("This Month", money(d.collected_month), { icon: "fa-calendar", tone: "info" })}
        ${stat("Dues", "By class", { icon: "fa-exclamation-circle", tone: "info", sub: `<a href="#collect">Open a class</a>` })}
        ${stat("Pending Approvals", (d.pending_approvals || 0) + (d.pending_intimations || 0) + (d.pending_complaints || 0), { icon: "fa-check-circle", tone: (d.pending_approvals || d.pending_intimations || d.pending_complaints) ? "warn" : "ok", sub: `<a href="#approvals">Open</a>` })}
      </div>
      <div class="grid grid-side">
        ${card("Classes", `<div class="class-tiles">${d.classes.map((c) => `<button type="button" class="class-tile" data-class="${c.id}"><b>${esc(c.label)}</b><span>${c.student_count} students</span><span class="tile-status pending">Open to see dues</span></button>`).join("")}</div>`, { icon: "fa-th-large" })}
        ${card("Fee Rules", kv([["Collecting now", `${d.rules.billable_month_label} fee`], ["Collection window", d.rules.collection_window], ["Late fee", d.rules.late_fee_rule], ["WhatsApp reminders", d.rules.reminders]]), { icon: "fa-info-circle" })}
      </div>
      ${card("Recent Receipts", receiptTable(d.recent_receipts), { icon: "fa-file-text-o", flush: true, actions: '<a class="small" href="#receipts">All receipts</a>' })}`;
    view.querySelectorAll("[data-class]").forEach((a) => a.addEventListener("click", () => {
      sessionStorage.setItem("school_collect_class", a.dataset.class);
      location.hash = "collect";
    }));
    bindReceipts(view);
  }

  const receiptTable = (items) =>
    table(
      [
        { label: "Receipt", render: (p) => `<b>${esc(p.receipt_no)}</b><div class="small muted">${fmtDate(p.date)}</div>` },
        { label: "Student", render: (p) => `${esc(p.student_name)}${p.class_label ? `<div class="small muted">${esc(p.class_label)}</div>` : ""}${(p.sibling_names || []).length ? `<div class="small muted">Siblings: ${esc(p.sibling_names.join(", "))}</div>` : ""}` },
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
    await UI.runScreen(view, () => renderCollect(view, ctx, state));
  }

  async function renderCollect(view, ctx, state = {}) {
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
    if (state.studentId) return await studentFee(view, ctx, state);
    if (state.classId) return await classStudents(view, ctx, state);
    const d = await MPS.get("/accounts/dashboard");
    view.innerHTML = `<div class="toolbar"><span class="small muted">Collecting <b>${esc(d.rules.billable_month_label)}</b> fee &middot; ${esc(d.rules.collection_window)}</span>
        <div class="filters"><input id="search" placeholder="Search student / admission no." style="min-width:240px"></div></div>
      <div class="class-tiles">${[{ id: "all", label: "All", student_count: d.classes.reduce((t, c) => t + Number(c.student_count || 0), 0) }, ...d.classes]
        .map((c) => `<button type="button" class="class-tile" data-class="${c.id}"><b>${esc(c.label)}</b><span>${c.student_count} students</span><span class="tile-status pending">Open</span></button>`)
        .join("")}</div><div id="results"></div>`;
    view.querySelectorAll("[data-class]").forEach((b) => b.addEventListener("click", () => collect(view, ctx, { classId: b.dataset.class })));
    let timer;
    view.querySelector("#search").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = e.target.value.trim();
        const box = view.querySelector("#results");
        if (!box) return;
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
    let sortKey = "";
    let sortDir = "asc";
    const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base", numeric: true });
    const byRoll = (a, b) => String(a.roll_no ?? "").localeCompare(String(b.roll_no ?? ""), undefined, { numeric: true });

    function sortedStudents() {
      const list = d.students.slice();
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortKey === "roll") {
        list.sort((a, b) => dir * byRoll(a, b) || String(a.class_label || "").localeCompare(String(b.class_label || ""), undefined, { numeric: true }) || byName(a, b));
      } else if (sortKey === "name") {
        list.sort((a, b) => dir * byName(a, b) || String(a.roll_no ?? "").localeCompare(String(b.roll_no ?? ""), undefined, { numeric: true }));
      } else if (sortKey === "due") {
        list.sort((a, b) => dir * ((Number(a.due) || 0) - (Number(b.due) || 0)) || byName(a, b));
      }
      return list;
    }

    function paint() {
      const columns = [{ label: "Roll", key: "roll_no", sort: "roll" }];
      if (state.classId === "all") columns.push({ label: "Class", key: "class_label" });
      columns.push(
          { label: "Student", sort: "name", render: (s) => `<b>${esc(s.name)}</b><div class="small muted">${esc(s.admission_no)} &middot; ${esc(s.father_name)} &middot; ${esc(s.phone || "")}</div>` },
          { label: "Siblings", render: (s) => ((s.sibling_names || []).length ? esc(s.sibling_names.join(", ")) : '<span class="muted">-</span>') },
          { label: "Last paid", render: (s) => (s.last_paid_amount ? money(s.last_paid_amount) : '<span class="muted">-</span>'), className: "right nowrap" },
          { label: "Dues", sort: "due", render: (s) => (s.due ? `<b style="color:var(--danger)">${money(s.due)}</b>` : badge("Paid", "success")), className: "right" },
          { label: "Pending months", render: (s) => {
            const count = (s.pending_months || []).length;
            if (!count) return '<span class="muted">-</span>';
            const label = count === 1 ? "1 month" : `${count} months`;
            return count >= 2 ? badge(label, "danger") : esc(label);
          } },
          { label: "Last paid date", render: (s) => (s.last_payment ? fmtDate(s.last_payment) : '<span class="muted">-</span>'), className: "nowrap" },
          { label: "", className: "right", render: (s) => `<button class="btn btn-sm" data-student="${s.id}"><i class="fa fa-inr"></i> Record Fee</button>` },
      );
      view.innerHTML = `<div class="toolbar"><button class="btn btn-light btn-sm" id="back"><i class="fa fa-arrow-left"></i> All classes</button>
        ${badge(`${state.classId === "all" ? "Dues" : "Class dues"} ${money(d.due_total != null ? d.due_total : d.students.reduce((t, s) => t + s.due, 0))}`, "warn")}</div>
      ${card(`${d.class_label} · Students`, table(
        columns,
        sortedStudents(),
        { sort: { key: sortKey, dir: sortDir } }
      ), { icon: "fa-users", flush: true })}`;
      view.querySelector("#back").addEventListener("click", () => collect(view, ctx, {}));
      view.querySelectorAll("[data-sort]").forEach((btn) => btn.addEventListener("click", () => {
        const key = btn.dataset.sort;
        if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
        else {
          sortKey = key;
          sortDir = "asc";
        }
        paint();
      }));
      view.querySelectorAll("[data-student]").forEach((b) => b.addEventListener("click", () => collect(view, ctx, { classId: state.classId, studentId: b.dataset.student })));
    }

    paint();
  }

  async function studentFee(view, ctx, state) {
    const d = await MPS.get(`/accounts/student/${state.studentId}`);
    const s = d.student;
    const pendingInt = d.intimations.filter((i) => i.status === "Pending");
    const family = d.family_fees || [];
    const tuitionChoices = (family.length ? family : [{
      class_id: s.class_id, class_label: d.class_label, names: [s.name], monthly_tuition: d.tuition_rate || 0,
      rebate: 0, fee_holder_id: s.id, current: true,
    }]).map((row) => ({
      value: row.current ? "Tuition Fee" : `Tuition Fee|${row.class_id}`,
      label: family.length > 1 || (row.names || []).length > 1
        ? `Tuition Fee — ${row.class_label} (${(row.names || []).join(", ")})`
        : "Tuition Fee",
      rate: (Number(row.class_fee) || 0) * Math.max((row.names || []).length, 1),
      holderId: row.fee_holder_id,
      due: d.charges
        .filter((c) => c.head === "Tuition Fee" && c.due > 0 && c.student_id === row.fee_holder_id)
        .reduce((t, c) => t + c.due, 0),
    }));
    const familyRebate = family.reduce((total, row) => total + (Number(row.rebate) || 0), 0);
    const feeRates = { ...(d.other_fee_rates || {}), "Tuition Fee": tuitionChoices[0].rate };
    const classFeeByHolder = {};
    family.forEach((row) => { classFeeByHolder[row.fee_holder_id] = Number(row.class_fee) || 0; });
    const monthDues = (d.dues || []).map((row) => {
      const tuition = (d.charges || []).filter((c) => c.head === "Tuition Fee" && c.month === row.key && c.due > 0);
      if (!tuition.length) return row;
      const fee = tuition.reduce((total, charge) => total + (classFeeByHolder[charge.student_id] || Number(charge.amount) || 0), 0);
      return { ...row, amount: fee };
    });
    const familyPeople = family.flatMap((row) => (row.names || []).map((name) => ({ name, classLabel: row.class_label })));
    const familyNote = familyPeople.length > 1
      ? `<p class="small" style="padding:12px 18px 0">${familyPeople.map((person) => `<b>${esc(person.name)}</b> (${esc(person.classLabel)})`).join(", ")}</p>`
      : "";
    view.innerHTML = `
      <div class="toolbar"><button class="btn btn-light btn-sm" id="back"><i class="fa fa-arrow-left"></i> ${state.classId === "all" ? "All students" : `${esc(d.class_label)} students`}</button>
        <span>${badge(`Balance ${money(d.summary.due)}`, d.summary.due ? "danger" : "success")}${(d.siblings || []).length ? ` <span class="small muted">Combined with ${d.siblings.map((sib) => `<a href="#" data-sibling="${esc(sib.id)}" data-sibling-class="${esc(sib.class_id || "")}" title="${esc(sib.class_label || "")}">${esc(sib.name)}</a>`).join(", ")}. Same due on each sibling.</span>` : ""}</span></div>
      ${pendingInt.length ? `<div class="form-ok">Parent says paid: ${pendingInt.map((i) => `<b>${money(i.amount)}</b> on ${fmtDate(i.paid_on)} via ${esc(i.method)} ${i.reference ? `(${esc(i.reference)})` : ""}${i.screenshot ? ` <a href="${esc(UI.fileUrl(i.screenshot))}" target="_blank">screenshot</a>` : ""}`).join("; ")}</div>` : ""}
      <div class="grid grid-side">
        <div class="stack">
          ${card(s.name, `${familyNote}<div id="items" class="fee-items"></div><div style="padding:10px 18px"><button class="btn btn-light btn-sm" id="addItem"><i class="fa fa-plus"></i> Add item</button></div>`, { icon: "fa-shopping-bag", flush: true })}
          ${card("Payment details", `<form id="payForm" class="grid grid-2" style="gap:0 16px">
            ${UI.fieldHtml({ name: "paid_on", label: "Date given by parent", type: "date", value: todayIso(), max: todayIso(), required: true })}
            ${UI.fieldHtml({ name: "paid_by", label: "Paid by", value: s.father_name, required: true })}
            ${UI.fieldHtml({ name: "method", label: "Mode", type: "select", options: d.payment_methods, value: pendingInt[0] ? pendingInt[0].method : "Cash" })}
            ${UI.fieldHtml({ name: "reference", label: "UPI / cheque reference", value: pendingInt[0] ? pendingInt[0].reference : "" })}
            ${UI.fieldHtml({ name: "received_by", label: "Given to (received by)", type: "select", options: d.received_by_options && d.received_by_options.length ? d.received_by_options : [d.received_by], value: d.received_by })}
            ${UI.fieldHtml({ name: "note", label: "Note" })}
            <p class="small" style="grid-column:1/-1;margin:8px 0 0"><i class="fa fa-whatsapp"></i> WhatsApp receipt will be sent to the parent and the fee collection group.</p>
          </form>
          <div class="sticky-bar static"><span>Total: <b id="total" style="font-size:20px">Rs 0</b></span><button class="btn" id="submit"><i class="fa fa-eye"></i> Preview</button></div>`, { icon: "fa-credit-card", flush: false })}
          ${card("Payment History", table(
            [
              { label: "Date", render: (p) => fmtDate(p.paid_on || p.date), className: "nowrap" },
              { label: "Receipt", render: (p) => `<b>${esc(p.receipt_no)}</b>${p.recorded_on_sibling ? `<div class="small muted">${esc(p.student_name)}</div>` : ""}` },
              { label: "For", render: (p) => `<span class="small">${esc((p.particulars || p.lines || []).map((l) => `${l.description} ${money(l.amount)}`).join(", "))}</span>` },
              { label: "Mode", render: (p) => `${esc(p.method || "")}${p.reference ? `<div class="small muted">${esc(p.reference)}</div>` : ""}` },
              { label: "Paid by", key: "paid_by" },
              { label: "Received by", key: "received_by" },
              { label: "Amount", render: (p) => `<b>${money(p.total)}</b>`, className: "right nowrap" },
              { label: "", className: "right", render: (p) => `<button class="btn btn-light btn-sm" data-receipt="${p.id}"><i class="fa fa-print"></i> View</button>` },
            ],
            d.payments,
            { empty: "No payments yet.", emptyIcon: "fa-history" }
          ), { icon: "fa-history", flush: true })}
        </div>
        <div class="stack">
          ${card(s.name, kv([["Admission No.", s.admission_no], ["Class", `${d.class_label} (Roll ${s.roll_no})`], ["Father", s.father_name], ["Mobile", s.father_phone || s.phone]]), { icon: "fa-user" })}
          ${card("Dues (month-wise)", monthDues.length ? table([{ label: "Month / Item", key: "label" }, { label: "Due", render: (g) => money(g.amount), className: "right" }], monthDues) : empty("No dues", "fa-check"), { icon: "fa-inr", flush: true })}
          ${card("Previous Receipts", receiptTable(d.payments.map((p) => ({ ...p, student_name: p.student_name || s.name }))), { icon: "fa-file-text-o", flush: true })}
        </div>
      </div>`;

    const itemsBox = view.querySelector("#items");
    const titleNode = itemsBox.closest(".card").querySelector(".card-head h3").lastChild;
    const duesWord = document.documentElement.lang === "hi" ? "बकाया" : "Dues";
    const readRows = () =>
      [...itemsBox.querySelectorAll("[data-fee-item]")].map((tr) => ({
        tr,
        head: tr.querySelector("[data-head]").value,
        item: tr.querySelector("[data-head]").selectedOptions[0].textContent.trim(),
        description: tr.querySelector("[data-desc]").value.trim(),
        rate: Number(tr.querySelector("[data-rate]").value || 0),
        rebate: Number(tr.querySelector("[data-rebate]").value || 0),
        paid: Number(tr.querySelector("[data-paid]").value || 0),
      }));
    const tuitionChoice = (head) => tuitionChoices.find((choice) => choice.value === head);
    const tuitionChargesFor = (choice) => d.charges
      .filter((c) => c.head === "Tuition Fee" && c.due > 0 && c.student_id === choice.holderId)
      .sort((a, b) => String(a.month || "").localeCompare(String(b.month || "")));
    const allocateTuition = (rows) => {
      const lines = [];
      let overflow = "";
      tuitionChoices.forEach((choice) => {
        let left = rows.filter((row) => row.head === choice.value).reduce((t, row) => t + row.paid, 0);
        tuitionChargesFor(choice).forEach((c) => {
          if (left <= 0) return;
          const amount = Math.min(left, c.due);
          lines.push({ charge_id: c.id, amount });
          left -= amount;
        });
        if (left > 0) overflow = `${choice.label} PAID is more than the due of ${money(choice.due)}`;
      });
      return { lines, overflow };
    };
    const recalc = () => {
      const rows = readRows();
      rows.forEach((row) => {
        const choice = tuitionChoice(row.head);
        const rowDue = choice ? Math.max(0, choice.due - row.paid) : Math.max(0, row.rate - row.paid);
        row.tr.querySelector("[data-row-due]").textContent = money(rowDue);
      });
      const tuitionPaid = tuitionChoices.reduce((t, choice) => {
        const paid = rows.filter((row) => row.head === choice.value).reduce((sum, row) => sum + row.paid, 0);
        return t + Math.min(paid, choice.due);
      }, 0);
      const addedDue = rows
        .filter((row) => !tuitionChoice(row.head))
        .reduce((t, row) => t + Math.max(0, (row.rate || row.paid) - row.paid), 0);
      const remaining = Math.max(0, d.summary.due - tuitionPaid) + addedDue;
      titleNode.nodeValue = ` ${s.name} (${duesWord} : ${money(remaining)})`;
      view.querySelector("#total").textContent = money(rows.reduce((t, row) => t + row.paid, 0));
    };
    const addItem = () => {
      const tr = document.createElement("div");
      tr.className = "fee-item";
      tr.setAttribute("data-fee-item", "");
      const itemOptions = [
        ...tuitionChoices.map((choice) => `<option value="${esc(choice.value)}">${esc(choice.label)}</option>`),
        ...d.other_heads.filter((h) => h !== "Tuition Fee").map((h) => `<option value="${esc(h)}">${esc(h)}</option>`),
      ];
      tr.innerHTML = `<label>Item</label><select data-head>${itemOptions.join("")}</select>
        <label>Description</label><input data-desc placeholder="e.g. 2 sets, size 28">
        <label>Rate</label><input type="text" inputmode="numeric" class="amount-input" data-rate placeholder="0" autocomplete="off">
        <label>Rebate</label><input type="text" inputmode="numeric" class="amount-input" data-rebate placeholder="0" autocomplete="off">
        <label>PAID</label><input type="text" inputmode="numeric" class="amount-input" data-paid placeholder="0" autocomplete="off">
        <label>Dues</label><b class="fee-item-due" data-row-due>${money(0)}</b>
        <button type="button" class="btn btn-light btn-sm" data-remove><i class="fa fa-times"></i> Remove</button>`;
      itemsBox.appendChild(tr);
      const head = tr.querySelector("[data-head]");
      const rate = tr.querySelector("[data-rate]");
      const rebate = tr.querySelector("[data-rebate]");
      const paid = tr.querySelector("[data-paid]");
      [rate, paid].forEach((input) => input.addEventListener("input", () => {
        const next = input.value.replace(/\D/g, "");
        if (input.value !== next) input.value = next;
      }));
      const fillRate = () => {
        const choice = tuitionChoice(head.value);
        if (choice) {
          rate.value = choice.rate || "";
          rebate.value = familyRebate || "";
        } else if (feeRates[head.value] != null) {
          rate.value = feeRates[head.value];
          rebate.value = "";
        } else {
          rate.value = "";
          rebate.value = "";
        }
      };
      head.addEventListener("change", () => {
        fillRate();
        recalc();
      });
      rate.addEventListener("input", () => {
        if (!tuitionChoice(head.value) && !paid.dataset.touched) paid.value = rate.value;
        recalc();
      });
      paid.addEventListener("input", (e) => {
        e.target.dataset.touched = "1";
        recalc();
      });
      tr.querySelector("[data-remove]").addEventListener("click", () => {
        tr.remove();
        recalc();
      });
      fillRate();
      recalc();
    };
    view.querySelector("#addItem").addEventListener("click", addItem);
    addItem();
    titleNode.nodeValue = ` ${s.name} (${duesWord} : ${money(d.summary.due)})`;
    bindReceipts(view);
    view.querySelector("#back").addEventListener("click", () => collect(view, ctx, { classId: state.classId || s.class_id }));
    view.querySelectorAll("[data-sibling]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const classId = state.classId === "all" ? "all" : a.dataset.siblingClass || state.classId;
      collect(view, ctx, { classId, studentId: a.dataset.sibling });
    }));
    view.querySelector("#submit").addEventListener("click", async (e) => {
      const form = view.querySelector("#payForm");
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      const rows = readRows().filter((row) => row.rate > 0 || row.paid > 0);
      const allocated = allocateTuition(rows);
      if (allocated.overflow) {
        UI.toast(allocated.overflow, "error");
        return;
      }
      const itemRows = rows.filter((row) => !tuitionChoice(row.head));
      if (itemRows.some((row) => row.paid > (row.rate || row.paid))) {
        UI.toast("PAID cannot be more than Rate", "error");
        return;
      }
      const entries = rows.map((row) => {
        const choice = tuitionChoice(row.head);
        const tuitionRow = family.find((person) => (person.current ? "Tuition Fee" : `Tuition Fee|${person.class_id}`) === row.head);
        const item = choice
          ? (family.length > 1 && tuitionRow ? `Tuition Fee — ${tuitionRow.class_label}` : "Tuition Fee")
          : row.item;
        return {
          item,
          description: row.description,
          rate: row.rate,
          rebate: row.rebate,
          paid: row.paid,
          due: choice ? Math.max(0, choice.due - row.paid) : Math.max(0, (row.rate || row.paid) - row.paid),
        };
      });
      const payload = {
        ...values,
        lines: allocated.lines,
        entries,
        items: itemRows.map((row) => ({
          head: row.head,
          description: row.description,
          amount: row.rate > 0 ? row.rate : row.paid,
          paid: row.paid,
        })),
        intimation_id: pendingInt[0] ? pendingInt[0].id : null,
      };
      if (!payload.lines.length && !payload.items.length) {
        UI.toast("Add an item and a PAID amount", "error");
        return;
      }
      const lines = payload.lines.map((line) => {
        const charge = d.charges.find((c) => c.id === line.charge_id);
        return { description: charge ? charge.description : "Tuition Fee", head: charge ? charge.head : "Tuition Fee", amount: line.amount, charge_id: line.charge_id };
      });
      payload.items.forEach((item) => {
        if (item.paid > 0) lines.push({ description: item.description || item.head, head: item.head, amount: item.paid });
      });
      const total = lines.reduce((sum, line) => sum + line.amount, 0);
      const left = d.charges.map((c) => ({ ...c }));
      lines.forEach((line) => {
        if (!line.charge_id) return;
        const charge = left.find((c) => c.id === line.charge_id);
        if (charge) charge.due = Math.max(0, charge.due - line.amount);
      });
      payload.items.forEach((item) => {
        const unpaid = Math.max(0, (item.amount || 0) - (item.paid || 0));
        if (unpaid > 0) left.push({ head: item.head, due: unpaid, month: "", month_label: "", description: item.description || item.head });
      });
      const groups = {};
      left.forEach((c) => {
        if (c.due <= 0) return;
        const monthly = c.month && ["Tuition Fee", "Transport Fee", "Late Fee"].includes(c.head);
        const key = monthly ? c.month : c.head;
        const group = groups[key] || { key, label: monthly ? (c.month_label || c.month) : c.head, amount: 0, heads: [] };
        group.amount += c.due;
        group.heads.push(`${c.head} Rs ${c.due}`);
        groups[key] = group;
      });
      const dues = Object.values(groups).sort((a, b) => String(a.key).localeCompare(String(b.key)));
      const heads = [...new Set(lines.map((line) => line.head).concat((d.charges || []).map((c) => c.head)))]
        .filter((head) => !["Tuition Fee", "Transport Fee", "Late Fee"].includes(head));
      const preview = {
        class_label: d.class_label,
        student: s,
        payment: {
          receipt_no: "Preview",
          date: todayIso(),
          paid_on: values.paid_on,
          paid_by: values.paid_by,
          received_by: values.received_by,
          method: values.method,
          reference: values.reference,
          note: values.note,
          lines,
          entries,
          total,
        },
        mobile: s.father_phone || s.phone || "",
        siblings: familyPeople.length > 1 ? familyPeople.map((person) => ({ name: person.name, class_label: person.classLabel })) : [],
        dues,
        item_rows: heads.map((head) => ({
          head,
          charged: left.filter((c) => c.head === head).reduce((sum, c) => sum + Number(c.amount || c.due || 0), 0),
          paid_now: lines.filter((line) => line.head === head).reduce((sum, line) => sum + line.amount, 0),
          paid_total: d.charges.filter((c) => c.head === head).reduce((sum, c) => sum + Number(c.paid || 0), 0)
            + lines.filter((line) => line.head === head).reduce((sum, line) => sum + line.amount, 0),
          due: left.filter((c) => c.head === head).reduce((sum, c) => sum + Number(c.due || 0), 0),
        })),
        summary: {
          paid: Number(d.summary.paid || 0) + total,
          due: dues.reduce((sum, group) => sum + group.amount, 0),
        },
      };
      const box = UI.modal("Receipt preview", `${UI.receiptHtml(preview)}<div class="modal-actions"><button type="button" class="btn btn-light" data-close>Back</button><button type="button" class="btn" id="confirmReceipt"><i class="fa fa-check"></i> Submit &amp; Generate Receipt</button></div>`, { wide: true });
      box.body.querySelector("#confirmReceipt").addEventListener("click", async (ev) => {
        ev.target.disabled = true;
        try {
          const r = await MPS.post(`/accounts/student/${s.id}/collect`, payload);
          box.close();
          UI.toast(r.message);
          if (r.receipt) UI.showReceipt(r.receipt);
          studentFee(view, ctx, state);
        } catch (err) {
          UI.toast(err.message, "error");
          ev.target.disabled = false;
        }
      });
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
  async function defaulters(view, ctx, state = {}) {
    if (typeof state === "number") state = { minMonths: state };
    if (!state.classId) {
      const d = await MPS.get("/accounts/defaulters");
      view.innerHTML = `<p class="small muted">Pick a class. Dues for that class are calculated when it opens.</p>
        <div class="class-tiles">${d.classes.map((c) => `<button type="button" class="class-tile" data-class="${c.id}"><b>${esc(c.label)}</b><span>${c.student_count} students</span></button>`).join("")}</div>`;
      view.querySelectorAll("[data-class]").forEach((b) => b.addEventListener("click", () => {
        UI.runScreen(view, () => defaulters(view, ctx, { classId: b.dataset.class }));
      }));
      return;
    }
    const minMonths = Number(state.minMonths) || 0;
    const minDue = Math.max(0, Math.floor(Number(state.minDue) || 0));
    const query = new URLSearchParams({ class_id: state.classId });
    if (minDue) query.set("min_due", String(minDue));
    else if (minMonths) query.set("min_months", String(minMonths));
    const d = await MPS.get(`/accounts/defaulters?${query}`);
    let sortKey = "";
    let sortDir = "asc";
    const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base", numeric: true });

    function sortedStudents() {
      const list = d.students.slice();
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortKey === "class") list.sort((a, b) => dir * ((Number(a.order) || 0) - (Number(b.order) || 0)) || ((Number(a.roll_no) || 0) - (Number(b.roll_no) || 0)) || byName(a, b));
      else if (sortKey === "name") list.sort((a, b) => dir * byName(a, b) || ((Number(a.due) || 0) - (Number(b.due) || 0)));
      else if (sortKey === "due") list.sort((a, b) => dir * ((Number(a.due) || 0) - (Number(b.due) || 0)) || byName(a, b));
      return list;
    }

    function paint() {
      const dueActive = Number(d.min_due) > 0;
      const shownMonths = dueActive ? 0 : (minMonths || d.min_months);
      view.innerHTML = `<div class="toolbar"><button class="btn btn-light btn-sm" id="back"><i class="fa fa-arrow-left"></i> All classes</button><div class="filters"><label style="margin:0">Pending for</label>
        <select id="min">${dueActive ? '<option value="0" selected>Any</option>' : ""}${[1, 2, 3, 4].map((n) => `<option value="${n}" ${n === shownMonths ? "selected" : ""}>${n}+ month(s)</option>`).join("")}</select>
        <label style="margin:0">Due at least</label>
        <input id="minDue" type="number" min="0" step="1" inputmode="numeric" placeholder="Any amount" value="${d.min_due ? esc(String(d.min_due)) : ""}"></div>
        <div class="btn-group">${badge(`${d.students.length} students · ${money(d.total_due)}`, "danger")}
        ${d.students.length ? '<button class="btn btn-sm" id="remind"><i class="fa fa-whatsapp"></i> View &amp; Send reminder to all</button>' : ""}</div></div>
      ${card("Dues Reminders", table(
        [
          { label: "Class", key: "class_label", sort: "class" },
          { label: "Student", sort: "name", render: (s) => `<b>${esc(s.name)}</b><div class="small muted">${esc(s.father_name)} &middot; ${esc(s.phone || "")}</div>` },
          { label: "Pending months", render: (s) => `${badge(`${s.pending_months.length}`, "danger")} <span class="small">${esc(s.pending_months.join(", "))}</span>` },
          { label: "Dues", sort: "due", render: (s) => `<b>${money(s.due)}</b>`, className: "right" },
          { label: "", className: "right nowrap", render: (s) => `<button class="btn btn-sm" data-student="${s.id}"><i class="fa fa-whatsapp"></i> View &amp; Send reminder</button>` },
        ],
        sortedStudents(),
        { sort: { key: sortKey, dir: sortDir }, empty: "No defaulters. Great!", emptyIcon: "fa-smile-o" }
      ), { icon: "fa-exclamation-triangle", flush: true })}`;
      view.querySelector("#back").addEventListener("click", () => {
        UI.runScreen(view, () => defaulters(view, ctx, {}));
      });
      const dueFilter = () => Math.max(0, Math.floor(Number(view.querySelector("#minDue").value) || 0));
      view.querySelector("#min").addEventListener("change", (e) => {
        const months = Number(e.target.value);
        if (!months) return;
        UI.runScreen(view, () => defaulters(view, ctx, { classId: state.classId, minMonths: months, minDue: 0 }));
      });
      view.querySelector("#minDue").addEventListener("change", () => {
        const amount = dueFilter();
        if (amount === (Number(d.min_due) || 0)) return;
        const months = Number(view.querySelector("#min").value) || minMonths || d.min_months;
        UI.runScreen(view, () => defaulters(view, ctx, { classId: state.classId, minMonths: months, minDue: amount }));
      });
      view.querySelectorAll("[data-sort]").forEach((btn) => btn.addEventListener("click", () => {
        const key = btn.dataset.sort;
        if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
        else {
          sortKey = key;
          sortDir = "asc";
        }
        paint();
      }));
      const remind = view.querySelector("#remind");
      if (remind)
        remind.addEventListener("click", () => UI.whatsappPreview({
          title: "View & Send reminder to all",
          fetchPreview: () => MPS.post("/accounts/reminders/preview", { kind: "overdue", student_ids: d.students.map((s) => s.id) }),
          send: (payload) => MPS.post("/accounts/reminders", { kind: "overdue", ...payload }),
        }));
      view.querySelectorAll("[data-student]").forEach((b) =>
        b.addEventListener("click", () => {
          const student = d.students.find((s) => s.id === b.dataset.student);
          const kind = student && student.pending_months.length >= 2 ? "overdue" : "reminder";
          UI.whatsappPreview({
            title: "View & Send reminder",
            fetchPreview: () => MPS.post("/accounts/reminders/preview", { kind, student_ids: [b.dataset.student] }),
            send: (payload) => MPS.post("/accounts/reminders", { kind, ...payload }),
          });
        })
      );
    }

    paint();
  }

  // ---------- Parent payment intimations ----------
  async function intimations(view, ctx, opts = {}) {
    const d = await MPS.get("/accounts/intimations");
    const root = opts.into || view;
    const reload = opts.reload || (() => intimations(view, ctx));
    root.innerHTML = card("Payments reported by parents", table(
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
    root.querySelectorAll("[data-record]").forEach((b) =>
      b.addEventListener("click", () => {
        sessionStorage.setItem("school_collect_student", JSON.stringify({ studentId: b.dataset.record }));
        location.hash = "collect";
      })
    );
    root.querySelectorAll("[data-reject]").forEach((b) =>
      b.addEventListener("click", () =>
        openForm({
          title: "Payment not received",
          fields: [{ name: "note", label: "Note for records", type: "textarea" }],
          submitLabel: "Mark not received",
          onSubmit: async (v) => {
            const r = await MPS.post(`/accounts/intimations/${b.dataset.reject}`, { status: "Rejected", note: v.note });
            reload();
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
      { kind: "notice", title: "Monthly fee notice", text: "Send with View & Send now. Fee for last month plus old dues.", icon: "fa-bullhorn" },
      { kind: "reminder", title: "Last-date reminder", text: "Send with View & Send now to everyone who still has dues.", icon: "fa-bell" },
      { kind: "overdue", title: "Overdue reminder", text: "Send with View & Send now to students with 2 or more months pending.", icon: "fa-exclamation-triangle" },
    ];
    view.innerHTML = `${card("Automatic Rules", kv([["Collecting now", `${d.rules.billable_month_label} fee`], ["Window", d.rules.collection_window], ["Late fee", d.rules.late_fee_rule], ["Schedule", d.rules.reminders]]), { icon: "fa-clock-o" })}
      <div class="grid grid-3">${kinds
        .map((k) => card(k.title, `<p class="small">${k.text}</p><button class="btn btn-sm" data-kind="${k.kind}"><i class="fa fa-whatsapp"></i> View &amp; Send now</button>`, { icon: k.icon }))
        .join("")}</div>
      ${card("Job History", table([{ label: "Job", key: "id" }, { label: "Ran on", render: (r) => fmtDateTime(r.ran_on) },
        { label: "Result", render: (r) => `<span class="small">${esc(typeof r.result === "string" ? r.result : (r.result && r.result.summary) || JSON.stringify(r.result))}</span>` }],
        d.runs, { empty: "No jobs run yet." }), { icon: "fa-history", flush: true, actions: '<button class="btn btn-light btn-sm" id="runJobs">Run daily check now</button>' })}`;
    view.querySelectorAll("[data-kind]").forEach((b) =>
      b.addEventListener("click", () => UI.whatsappPreview({
        title: "View & Send now",
        fetchPreview: () => MPS.post("/accounts/reminders/preview", { kind: b.dataset.kind }),
        send: (payload) => MPS.post("/accounts/reminders", { kind: b.dataset.kind, ...payload }),
      }))
    );
    view.querySelector("#runJobs").addEventListener("click", async () => (await run(() => MPS.post("/accounts/jobs/run"))) && reminders(view, ctx));
  }

  // ---------- Fee report: collections and student-wise dues ----------
  async function report(view, ctx, state = {}) {
    const q = new URLSearchParams(Object.entries(state).filter(([, v]) => v !== "" && v != null && v !== 0 && v !== "0"));
    const d = await MPS.get(`/accounts/report?${q}`);
    const f = d.filters;
    const du = d.dues;
    const none = '<span class="muted">-</span>';
    const option = (value, label, current) => `<option value="${esc(value)}" ${String(value) === String(current) ? "selected" : ""}>${esc(label)}</option>`;
    const byName = (a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base", numeric: true });
    let sortKey = "";
    let sortDir = "asc";

    const className = (id) => id !== "all" && (d.classes.find((c) => c.id === id) || {}).label;
    const joinFilters = (parts) => parts.filter(Boolean).map(esc).join(" &middot; ");
    const collectionFilterText = joinFilters([className(f.class_id), f.head, f.method]);
    const duesFilterText = joinFilters([
      className(f.dues_class_id), f.dues_head,
      (d.dues_statuses.find((s) => s.id === f.status) || {}).label,
      f.min_months && `${f.min_months}+ month(s) pending`,
      f.min_due && `Due at least ${money(f.min_due)}`,
      f.q && `"${f.q}"`,
    ]);
    const printFilters = (text) => (text ? `<p class="small">${text}</p>` : "");

    const collectionsHtml = `<p>From <b>${fmtDate(d.from)}</b> to <b>${fmtDate(d.to)}</b> &middot; Total collected: <b>${money(d.total)}</b> in ${d.receipts} receipt(s)</p>
      <div class="grid grid-2">
        <div>${table([{ label: "Fee head", key: "head" }, { label: "Amount", render: (h) => money(h.amount), className: "right" }], d.heads, { empty: "No collections." })}</div>
        <div>${table([{ label: "Mode", key: "method" }, { label: "Amount", render: (m) => money(m.amount), className: "right" }], d.methods, { empty: "-" })}</div>
      </div>
      <h4 style="margin:16px 0 6px">Day-wise</h4>
      ${table([{ label: "Date", render: (x) => fmtDate(x.date) },
        { label: "Receipts", className: "right", render: (x) => `<a href="#" data-day="${esc(x.date)}" title="Show receipts">${x.receipts}</a>` },
        { label: "Amount", render: (x) => money(x.amount), className: "right" }], d.days,
        { empty: "No collections.", footer: `<td>Total</td><td class="right">${d.receipts}</td><td class="right">${money(d.total)}</td>` })}`;

    const duesSummaryHtml = `<p class="small muted">Dues as of ${fmtDate(du.as_of)}. Siblings share one combined due, so each family is counted once in the totals.</p>
      <div class="grid grid-3">
        <div>${table([{ label: "Class", key: "label" }, { label: "Students", key: "students", className: "right" }, { label: "With dues", key: "with_dues", className: "right" },
          { label: "Dues", render: (r) => money(r.due), className: "right" }], du.by_class, { empty: "No students." })}</div>
        <div>${table([{ label: "Fee head", key: "head" }, { label: "Dues", render: (r) => money(r.due), className: "right" }], du.by_head, { empty: "No dues." })}</div>
        <div>${table([{ label: "Month", key: "label" }, { label: "Families", key: "families", className: "right" }, { label: "Dues", render: (r) => money(r.due), className: "right" }],
          du.by_month, { empty: "No dues." })}</div>
      </div>`;

    function sortedStudents() {
      const list = du.students.slice();
      const dir = sortDir === "desc" ? -1 : 1;
      if (sortKey === "class") list.sort((a, b) => dir * ((a.order - b.order) || ((Number(a.roll_no) || 0) - (Number(b.roll_no) || 0))) || byName(a, b));
      else if (sortKey === "name") list.sort((a, b) => dir * byName(a, b));
      else if (sortKey === "months") list.sort((a, b) => dir * (a.pending_months.length - b.pending_months.length) || byName(a, b));
      else if (sortKey === "due") list.sort((a, b) => dir * (a.due - b.due) || byName(a, b));
      else if (sortKey === "last") list.sort((a, b) => dir * String(a.last_payment || "").localeCompare(String(b.last_payment || "")) || byName(a, b));
      return list;
    }

    const studentTable = (withActions) => {
      const columns = [
        { label: "Class", sort: "class", className: "nowrap", render: (s) => `${esc(s.class_label)}${s.roll_no != null ? `<div class="small muted">Roll ${esc(s.roll_no)}</div>` : ""}` },
        { label: "Student", sort: "name", render: (s) => `<b>${esc(s.name)}</b><div class="small muted">${esc(s.admission_no)} &middot; ${esc(s.father_name)} &middot; ${esc(s.phone)}</div>`
          + (s.sibling_names.length ? `<div class="small muted">Siblings: ${esc(s.sibling_names.join(", "))}</div>` : "") },
        { label: "Pending months", sort: "months", render: (s) => (s.pending_months.length
          ? `${badge(String(s.pending_months.length), s.pending_months.length >= 2 ? "danger" : "warn")} <span class="small">${esc(s.pending_months.join(", "))}</span>`
          : none) },
        { label: "Dues detail", render: (s) => (s.dues_by_month.length
          ? `<span class="small">${s.dues_by_month.map((g) => `${esc(g.label)}: ${money(g.amount)}`).join("<br>")}</span>`
          : none) },
        { label: "Charged", render: (s) => money(s.charged), className: "right nowrap" },
        { label: "Paid", render: (s) => money(s.paid), className: "right nowrap" },
        { label: "Dues", sort: "due", className: "right nowrap", render: (s) => (s.due ? `<b style="color:var(--danger)">${money(s.due)}</b>` : badge("Paid", "success")) },
        { label: "Last paid", sort: "last", className: "nowrap", render: (s) => (s.last_payment ? `${money(s.last_paid_amount)}<div class="small muted">${fmtDate(s.last_payment)}</div>` : none) },
      ];
      if (withActions) columns.push({ label: "", className: "right nowrap", render: (s) => `<button class="btn btn-sm" data-record="${esc(s.id)}" data-cls="${esc(s.class_id)}"><i class="fa fa-inr"></i> Record Fee</button>` });
      return table(withActions ? columns : columns.map((c) => ({ ...c, sort: "" })), sortedStudents(), {
        sort: withActions ? { key: sortKey, dir: sortDir } : {},
        empty: "No students match these filters.",
        emptyIcon: "fa-smile-o",
        footer: du.students.length ? `<td colspan="4">Total (each family once)</td><td class="right">${money(du.total_charged)}</td><td class="right">${money(du.total_paid)}</td><td class="right"><b>${money(du.total_due)}</b></td><td colspan="${withActions ? 2 : 1}"></td>` : "",
      });
    };

    function paintStudents() {
      const box = view.querySelector("#duesStudents");
      box.innerHTML = card("Student-wise Dues", studentTable(true), {
        icon: "fa-users", flush: true,
        actions: badge(`${du.student_count} students · ${money(du.total_due)}`, du.total_due ? "danger" : "success"),
      });
      box.querySelectorAll("[data-sort]").forEach((btn) => btn.addEventListener("click", () => {
        const key = btn.dataset.sort;
        if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
        else {
          sortKey = key;
          sortDir = key === "due" || key === "months" ? "desc" : "asc";
        }
        paintStudents();
      }));
      box.querySelectorAll("[data-record]").forEach((b) => b.addEventListener("click", () => {
        sessionStorage.setItem("school_collect_student", JSON.stringify({ classId: b.dataset.cls, studentId: b.dataset.record }));
        location.hash = "collect";
      }));
    }

    view.innerHTML = `<div class="toolbar"><div class="filters">
        <label style="margin:0">From</label><input type="date" id="from" value="${esc(d.from)}">
        <label style="margin:0">To</label><input type="date" id="to" value="${esc(d.to)}">
        <select id="class">${d.classes.map((c) => option(c.id, c.label, f.class_id)).join("")}</select>
        <select id="head">${option("", "All heads", f.head)}${d.fee_heads.map((h) => option(h, h, f.head)).join("")}</select>
        <select id="method">${option("", "All modes", f.method)}${d.payment_methods.map((m) => option(m, m, f.method)).join("")}</select>
      </div><button class="btn" id="print"><i class="fa fa-print"></i> Print</button></div>
      ${card("Collections", collectionsHtml, { icon: "fa-bar-chart" })}
      <div class="toolbar"><div class="filters">
        <select id="duesClass">${d.classes.map((c) => option(c.id, c.label, f.dues_class_id)).join("")}</select>
        <select id="duesHead">${option("", "All heads", f.dues_head)}${d.fee_heads.map((h) => option(h, h, f.dues_head)).join("")}</select>
        <label style="margin:0">Show</label><select id="status">${d.dues_statuses.map((s) => option(s.id, s.label, f.status)).join("")}</select>
        <label style="margin:0">Pending for</label><select id="minMonths">${option(0, "Any", f.min_months)}${[1, 2, 3, 4, 6].map((n) => option(n, `${n}+ month(s)`, f.min_months)).join("")}</select>
        <label style="margin:0">Due at least</label><input id="minDue" type="number" min="0" step="1" inputmode="numeric" placeholder="Any amount" value="${f.min_due ? esc(String(f.min_due)) : ""}" style="width:130px">
        <input id="q" placeholder="Name, admission no, father, phone" value="${esc(f.q)}" style="min-width:240px">
        <button class="btn btn-light btn-sm" id="clear">Clear filters</button>
      </div></div>
      <div class="grid grid-3">
        ${stat("Total Dues", money(du.total_due), { icon: "fa-exclamation-circle", tone: du.total_due ? "danger" : "ok", sub: `Overdue ${money(du.total_overdue)}` })}
        ${stat("Students with dues", du.with_dues, { icon: "fa-users", tone: du.with_dues ? "warn" : "ok", sub: `${du.families} families · ${du.student_count} shown` })}
        ${stat("Paid against charges", money(du.total_paid), { icon: "fa-check-circle", tone: "info", sub: `Charged ${money(du.total_charged)}` })}
      </div>
      ${card("Dues Summary", duesSummaryHtml, { icon: "fa-pie-chart" })}
      <div id="duesStudents"></div>`;
    paintStudents();

    const collectionFilters = () => ({
      from: view.querySelector("#from").value,
      to: view.querySelector("#to").value,
      class_id: view.querySelector("#class").value,
      head: view.querySelector("#head").value,
      method: view.querySelector("#method").value,
    });
    const read = () => ({
      ...collectionFilters(),
      dues_class_id: view.querySelector("#duesClass").value,
      dues_head: view.querySelector("#duesHead").value,
      status: view.querySelector("#status").value,
      min_months: view.querySelector("#minMonths").value,
      min_due: String(Math.max(0, Math.floor(Number(view.querySelector("#minDue").value) || 0))),
      q: view.querySelector("#q").value.trim(),
    });
    const reload = (next) => {
      if (next.from && next.to && next.from > next.to) {
        UI.toast("From date cannot be after To date", "error");
        return;
      }
      UI.runScreen(view, () => report(view, ctx, next));
    };
    ["#from", "#to", "#class", "#head", "#method", "#duesClass", "#duesHead", "#status", "#minMonths", "#minDue", "#q"].forEach((sel) =>
      view.querySelector(sel).addEventListener("change", () => reload(read())));
    view.querySelector("#clear").addEventListener("click", () => reload(collectionFilters()));
    view.querySelectorAll("[data-day]").forEach((a) => a.addEventListener("click", (e) => {
      e.preventDefault();
      const day = d.days.find((x) => x.date === a.dataset.day);
      if (!day) return;
      const box = UI.modal(`Receipts on ${fmtDate(day.date)} · ${day.receipts} receipt(s) · ${money(day.amount)}`, receiptTable(day.items), { wide: true });
      bindReceipts(box.body);
    }));
    view.querySelector("#print").addEventListener("click", () => printDoc("Fee Report", `<h3 style="text-align:center">Fee Report</h3>
      <h4 style="margin:12px 0 6px">Collections</h4>${printFilters(collectionFilterText)}${collectionsHtml}
      <h4 style="margin:16px 0 6px">Dues Summary</h4>${printFilters(duesFilterText)}${duesSummaryHtml}
      <h4 style="margin:16px 0 6px">Student-wise Dues (${du.student_count} students &middot; ${money(du.total_due)})</h4>${studentTable(false)}`));
  }

  // ---------- Teacher salary ----------
  function salarySlipHtml(p, t) {
    const rows = [
      { head: `Salary (${fmtMonth(p.month)})`, earn: p.basic, ded: "" },
      ...Object.entries(p.allowances || {}).map(([head, amount]) => ({ head, earn: amount, ded: "" })),
      ...Object.entries(p.deductions || {}).map(([head, amount]) => ({ head, earn: "", ded: amount })),
    ];
    return `<div class="receipt">
      <h3 style="text-align:center;margin:0 0 10px">SALARY SLIP</h3>
      <table class="table receipt-head"><tbody>
        <tr><td><b>Slip No.</b> ${esc(p.slip_no || "-")}</td><td><b>Date:</b> ${fmtDate(p.date || p.paid_on)}</td></tr>
        <tr><td><b>Teacher:</b> ${esc(t.name)}</td><td><b>Employee ID:</b> ${esc(t.employee_id)}</td></tr>
        <tr><td><b>Designation:</b> ${esc(t.designation)}</td><td><b>Salary month:</b> ${esc(fmtMonth(p.month))}</td></tr>
        <tr><td><b>Paid on:</b> ${fmtDate(p.paid_on)}</td><td><b>Mode:</b> ${esc(p.method || "-")}${p.reference ? ` (${esc(p.reference)})` : ""}</td></tr>
        ${p.monthly ? `<tr><td><b>Monthly salary:</b> ${money(p.monthly)}</td><td>${p.total_due_after != null ? `<b>Salary still due:</b> ${money(p.total_due_after)}` : ""}</td></tr>` : ""}
      </tbody></table>
      ${table(
        [
          { label: "Head", key: "head" },
          { label: "Earnings", render: (r) => (r.earn === "" ? "" : money(r.earn)), className: "right" },
          { label: "Deductions", render: (r) => (r.ded === "" ? "" : money(r.ded)), className: "right" },
        ],
        rows,
        { footer: `<td>Total</td><td class="right">${money(p.gross)}</td><td class="right">${money(p.gross - p.net)}</td></tr><tr><td><b>Net Pay</b></td><td class="right" colspan="2"><b>${money(p.net)}</b></td>` }
      )}
      ${p.note ? `<p class="small"><b>Note:</b> ${esc(p.note)}</p>` : ""}
      <div class="print-sign"><span>Teacher's signature</span><span>Paid by: ${esc(p.paid_by || "")}</span></div></div>`;
  }

  function showSalarySlip(slip, teacher) {
    const m = UI.modal(`Salary Slip ${slip.slip_no || ""}`, `${salarySlipHtml(slip, teacher)}<div class="modal-actions"><button class="btn" id="printSlip"><i class="fa fa-print"></i> Print</button></div>`, { wide: true });
    m.body.querySelector("#printSlip").addEventListener("click", () => printDoc("Salary Slip", salarySlipHtml(slip, teacher)));
  }

  async function salarySlips(teacherId) {
    let d;
    try {
      d = await MPS.get(`/accounts/salaries/${teacherId}/slips`);
    } catch (e) {
      UI.toast(e.message, "error");
      return;
    }
    const m = UI.modal(`Salary slips · ${d.teacher.name}`, table(
      [
        { label: "Month", render: (p) => `<b>${esc(fmtMonth(p.month))}</b><div class="small muted">${esc(p.slip_no || "")}</div>` },
        { label: "Paid on", render: (p) => fmtDate(p.paid_on), className: "nowrap" },
        { label: "Mode", render: (p) => `${esc(p.method || "-")}${p.reference ? `<div class="small muted">${esc(p.reference)}</div>` : ""}` },
        { label: "Net Pay", render: (p) => `<b>${money(p.net)}</b>`, className: "right nowrap" },
        { label: "", className: "right nowrap", render: (p) => `<button class="btn btn-light btn-sm" data-slip="${esc(p.id)}"><i class="fa fa-print"></i> View</button>` },
      ],
      d.slips,
      { empty: "No salary slips yet.", emptyIcon: "fa-money" }
    ), { wide: true });
    m.body.querySelectorAll("[data-slip]").forEach((b) => b.addEventListener("click", () => showSalarySlip(d.slips.find((p) => p.id === b.dataset.slip), d.teacher)));
  }

  function paySalary(t, methods, done) {
    const months = t.pay_months || [];
    const m = UI.modal(`Pay ${t.name}`, `<form id="salaryForm" class="grid grid-2" style="gap:0 16px">
        ${UI.fieldHtml({ name: "month", label: "Salary month", type: "select", options: months.map((x) => ({ value: x.month, label: `${x.label} (due ${money(x.due)})` })), required: true })}
        ${UI.fieldHtml({ name: "salary", label: "Salary (Rs)", type: "number", min: 0, value: months[0] ? months[0].due : 0 })}
        ${UI.fieldHtml({ name: "other", label: "Other amount (Rs)", type: "number", min: 0, placeholder: "0" })}
        ${UI.fieldHtml({ name: "other_label", label: "Other for", placeholder: "e.g. Bonus, allowance" })}
        ${UI.fieldHtml({ name: "deduction", label: "Deduction (Rs)", type: "number", min: 0, placeholder: "0" })}
        ${UI.fieldHtml({ name: "deduction_label", label: "Deduction for", placeholder: "e.g. Advance, leave" })}
        ${UI.fieldHtml({ name: "paid_on", label: "Paid on", type: "date", value: todayIso(), max: todayIso(), required: true })}
        ${UI.fieldHtml({ name: "method", label: "Mode", type: "select", options: methods, value: methods[0] })}
        ${UI.fieldHtml({ name: "reference", label: "UPI / cheque reference" })}
        ${UI.fieldHtml({ name: "note", label: "Note" })}
        <div class="form-error" hidden style="grid-column:1/-1"></div>
      </form>
      <div class="modal-actions"><span style="margin-right:auto">Net pay: <b id="netPay" style="font-size:18px">${money(0)}</b></span>
        <button type="button" class="btn btn-light" data-close>Cancel</button>
        <button type="button" class="btn" id="paySalary"><i class="fa fa-check"></i> Pay &amp; Generate Slip</button></div>`, { wide: true });
    const form = m.body.querySelector("#salaryForm");
    const errorEl = form.querySelector(".form-error");
    const num = (name) => Number(form[name].value || 0);
    const paint = () => { m.body.querySelector("#netPay").textContent = money(Math.max(0, num("salary") + num("other") - num("deduction"))); };
    form.month.addEventListener("change", () => {
      const pick = months.find((x) => x.month === form.month.value);
      form.salary.value = pick ? pick.due : 0;
      paint();
    });
    form.addEventListener("input", paint);
    paint();
    const submit = m.body.querySelector("#paySalary");
    submit.addEventListener("click", async () => {
      if (!form.reportValidity()) return;
      submit.disabled = true;
      errorEl.hidden = true;
      try {
        const r = await MPS.post(`/accounts/salaries/${t.id}/pay`, Object.fromEntries(new FormData(form).entries()));
        m.close();
        UI.toast(r.message);
        showSalarySlip(r.slip, r.teacher);
        done();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
        submit.disabled = false;
      }
    });
  }

  function salaryTable(pay) {
    return table([
      { label: "Teachers Names", render: (t) => `<b>${esc(t.name)}</b><div class="small muted">${esc(t.employee_id)} &middot; ${esc(t.designation)}</div>` },
      { label: "Monthly Amount", render: (t) => `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <input type="number" class="amount-input" data-salary-amount="${esc(t.id)}" value="${t.monthly_salary || ""}" placeholder="0" min="0">
          <label class="small muted" style="margin:0;display:flex;gap:4px;align-items:center">Dues from <input type="month" data-salary-from="${esc(t.id)}" value="${esc(t.salary_from)}" max="${esc(pay.current_month)}" style="width:auto"></label>
          <button class="btn btn-sm" data-salary-save="${esc(t.id)}">Save</button></div>` },
      { label: "Last Amount paid", className: "nowrap", render: (t) => (t.last_paid_on
        ? `<b>${money(t.last_paid_amount)}</b><div class="small muted">${fmtDate(t.last_paid_on)} &middot; ${esc(t.last_paid_month_label)}</div>`
        : '<span class="muted">-</span>') },
      { label: "Total Dues", className: "nowrap", render: (t) => {
        if (!t.monthly_salary) return '<span class="muted">Set monthly amount</span>';
        if (!t.due) return badge("Paid", "success");
        return `<b style="color:var(--danger)">${money(t.due)}</b><div class="small muted">${esc(t.due_months.map((x) => x.label).join(", "))}</div>`;
      } },
      { label: "Other", className: "nowrap", render: (t) => (t.other_paid || t.deducted
        ? `${t.other_paid ? money(t.other_paid) : ""}${t.deducted ? `<div class="small muted">Deducted ${money(t.deducted)}</div>` : ""}`
        : '<span class="muted">-</span>') },
      { label: "", className: "right nowrap", render: (t) => `<button class="btn btn-sm" data-salary-pay="${esc(t.id)}" ${t.monthly_salary ? "" : 'disabled title="Set the monthly amount first"'}><i class="fa fa-inr"></i> Pay</button>
          <button class="btn btn-light btn-sm" data-salary-slips="${esc(t.id)}"><i class="fa fa-file-text-o"></i> Slips${t.slip_count ? ` (${t.slip_count})` : ""}</button>` },
    ], pay.teachers, { empty: "No active teachers.", emptyIcon: "fa-users" });
  }

  function bindSalaries(view, pay) {
    view.querySelectorAll("[data-salary-save]").forEach((b) => b.addEventListener("click", async () => {
      const id = b.dataset.salarySave;
      const result = await run(() => MPS.post(`/accounts/salaries/${id}`, {
        monthly_salary: view.querySelector(`[data-salary-amount="${id}"]`).value,
        salary_from: view.querySelector(`[data-salary-from="${id}"]`).value,
      }));
      if (result) settings(view);
    }));
    view.querySelectorAll("[data-salary-pay]").forEach((b) => b.addEventListener("click", () => {
      paySalary(pay.teachers.find((t) => t.id === b.dataset.salaryPay), pay.payment_methods, () => settings(view));
    }));
    view.querySelectorAll("[data-salary-slips]").forEach((b) => b.addEventListener("click", () => salarySlips(b.dataset.salarySlips)));
  }

  // ---------- Fee structure ----------
  async function settings(view) {
    const [d, pay] = await Promise.all([MPS.get("/principal/classes"), MPS.get("/accounts/salaries")]);
    view.innerHTML = `${card("Monthly Tuition Fee", `<div class="table-wrap"><table class="table"><thead><tr><th>Class</th><th>Students</th><th>Monthly fee (Rs)</th><th>WhatsApp group name</th><th></th></tr></thead><tbody>
        ${d.classes.map((c) => `<tr data-cls="${c.id}"><td><b>${esc(c.name)}</b></td><td>${c.student_count}</td>
          <td><input type="number" class="amount-input" data-f="monthly_fee" value="${c.monthly_fee}" min="0"></td>
          <td><input data-f="whatsapp_group" value="${esc(c.whatsapp_group || "")}" placeholder="exact group name"></td>
          <td><button class="btn btn-sm" data-save="${c.id}">Save</button></td></tr>`).join("")}</tbody></table></div>`, { icon: "fa-th-large", flush: true })}
      ${card("Transport Fee (monthly)", table([
        { label: "Route", render: (r) => `<b>${esc(r.route_name)}</b><div class="small muted">${esc(r.bus_no)}</div>` },
        { label: "Monthly fee (Rs)", render: (r) => `<input type="number" class="amount-input" data-route-fee="${r.id}" value="${r.monthly_fee || 0}" min="0">` },
        { label: "", render: (r) => `<button class="btn btn-sm" data-route="${r.id}">Save</button>` },
      ], d.routes), { icon: "fa-bus", flush: true })}
      ${card("Teacher Salary (monthly)", salaryTable(pay), { icon: "fa-money", flush: true, actions: badge(`Dues ${money(pay.due_total)}`, pay.due_total ? "warn" : "success") })}
      ${card("Other Fee", `<div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Rate (Rs)</th><th>Classes</th><th>Frequency</th><th></th></tr></thead><tbody>
        ${(d.other_fees || []).map((r) => `<tr><td><b>${esc(r.head)}</b></td>
          <td><input type="number" class="amount-input" data-fee-amount="${esc(r.id)}" value="${Number(r.amount) || 0}" min="0"></td>
          <td><input data-fee-classes="${esc(r.id)}" value="${esc(r.classes && r.classes !== "All classes" ? r.classes : "All classes")}"></td>
          <td><input data-fee-period="${esc(r.id)}" value="${esc(r.period || "")}"></td>
          <td><button class="btn btn-sm" data-fee-save="${esc(r.id)}">Save</button></td></tr>`).join("")}
        </tbody></table></div>`, { icon: "fa-shopping-bag", flush: true })}
      <p class="small muted">Add or edit a bus route under People. Tuition and transport changes apply to months billed from now on. Already billed months are not changed. Other fee rates fill in when that item is selected on Collect Fee.</p>`;
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
    view.querySelectorAll("[data-fee-save]").forEach((b) =>
      b.addEventListener("click", () => run(() => MPS.post(`/principal/other-fees/${b.dataset.feeSave}`, {
        amount: view.querySelector(`[data-fee-amount="${b.dataset.feeSave}"]`).value,
        classes: view.querySelector(`[data-fee-classes="${b.dataset.feeSave}"]`).value,
        period: view.querySelector(`[data-fee-period="${b.dataset.feeSave}"]`).value,
      })))
    );
    bindSalaries(view, pay);
  }

  return { dashboard, collect, receipts, defaulters, intimations, reminders, report, settings };
})();
