(() => {
  const { esc, fmtDate, fmtTime, fmtMonth, money, badge, card, empty, table, run, todayIso } = UI;

  const kind = () => (((MPS.session() || {}).user || {}).designation || "").trim().toLowerCase();
  const checkInCase = (row) => esc(row.checkin_label || (row.check_in ? "Check-In" : ""));

  function punchHtml(c) {
    c = c || {};
    let action;
    if (c.check_out) {
      action = `<p style="margin:0 0 8px"><b>${checkInCase(c)}</b> &middot; <b>Out</b> ${fmtTime(c.check_out)}${c.auto_checkout ? ` ${badge("Auto check-out", "warn")}` : ""}</p>`;
      if (c.checkin_open !== false) action += `<button class="btn" id="checkinBtn" type="button"><i class="fa fa-sign-in"></i> Check-In</button>`;
    } else if (c.check_in) {
      action = `<p style="margin:0 0 8px"><b>${checkInCase(c)}</b></p>
        <button class="btn" id="checkoutBtn" type="button"><i class="fa fa-sign-out"></i> Check out</button>`;
    } else if (c.checkin_block === "before") {
      action = `<p style="margin:0">Check-in is not allowed before teacher timing.</p>`;
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
    if (inn) inn.addEventListener("click", async () => { if (await run(() => MPS.post("/other/checkin"))) reload(); });
    if (out) out.addEventListener("click", async () => { if (await run(() => MPS.post("/other/checkout"))) reload(); });
  }

  async function checkIn(view) {
    const d = await MPS.get("/other/checkin");
    const group = d.whatsapp_group
      ? `Sent to WhatsApp group name: <b>${esc(d.whatsapp_group)}</b> when you check in or check out.`
      : "No WhatsApp group set, so this check-in message will not be sent.";
    view.innerHTML = `${punchHtml(d.today)}
      ${card("Check-in WhatsApp message", `<p class="small" style="margin:0 0 10px">${group}</p><div class="preview-box">${esc(d.checkin_message || "")}</div>`, { icon: "fa-whatsapp" })}
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

  function busExpenseForm(category, item, meta, onSubmit) {
    const editing = !!item.id;
    const m = UI.modal(editing ? "Edit expense" : "Add expense", `<form id="busExpenseForm" class="grid grid-2" style="gap:0 16px">
        ${UI.fieldHtml({ name: "date", label: "Date", type: "date", value: item.date || todayIso(), max: todayIso(), required: true })}
        ${UI.fieldHtml({
          name: "route_id", label: "Bus", type: "select", placeholder: "Other", value: item.route_id || "",
          options: (meta.routes || []).map((r) => ({ value: r.id, label: r.bus_no ? `${r.route_name} (${r.bus_no})` : r.route_name })),
        })}
        <div class="field"><label for="f_particular">${esc(category.field || "Expense")}</label>
          <input id="f_particular" name="particular" required maxlength="120" placeholder="${esc(category.placeholder || "")}" value="${esc(item.particular || "")}" list="busExpenseList">
          <datalist id="busExpenseList">${(category.suggestions || []).map((s) => `<option value="${esc(s)}"></option>`).join("")}</datalist>
        </div>
        ${UI.fieldHtml({ name: "amount", label: "Amount (Rs)", type: "number", min: 1, step: 1, required: true, value: item.amount || "" })}
        ${UI.fieldHtml({ name: "method", label: "Mode", type: "select", options: meta.payment_methods, value: item.method || meta.payment_methods[0] })}
        ${UI.fieldHtml({ name: "note", label: "Note", maxlength: 300, value: item.note || "" })}
        <div class="form-error" hidden style="grid-column:1/-1"></div>
      </form>
      <div class="modal-actions"><button type="button" class="btn btn-light" data-close>Cancel</button>
        <button type="button" class="btn" id="saveBusExpense">${editing ? "Save" : "Add"}</button></div>`, { wide: true });
    const form = m.body.querySelector("#busExpenseForm");
    const errorEl = form.querySelector(".form-error");
    const submit = m.body.querySelector("#saveBusExpense");
    submit.addEventListener("click", async () => {
      if (!form.reportValidity()) return;
      submit.disabled = true;
      errorEl.hidden = true;
      try {
        const result = await onSubmit({
          date: form.date.value,
          route_id: form.route_id.value,
          particular: form.particular.value.trim(),
          amount: form.amount.value,
          method: form.method.value,
          note: form.note.value.trim(),
        });
        m.close();
        if (result && result.message) UI.toast(result.message);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
        submit.disabled = false;
      }
    });
  }

  async function busWork(view, state = {}) {
    const month = state.month || "all";
    const [work, expenses] = await Promise.all([
      MPS.get("/other/bus"),
      MPS.get(`/other/bus-expenses?month=${encodeURIComponent(month)}`),
    ]);
    const option = (value, label, current) => `<option value="${esc(value)}" ${String(value) === String(current) ? "selected" : ""}>${esc(label)}</option>`;
    const routes = work.routes || [];
    const routeCards = routes.length
      ? routes.map((route) => card(route.route_name || "Bus", `
          <p class="small muted">${[route.bus_no, route.pickup_start ? `Pickup ${route.pickup_start}` : "", route.drop_start ? `Drop ${route.drop_start}` : ""].filter(Boolean).map(esc).join(" · ")}</p>
          ${(route.stops || []).length ? `<p class="small">${(route.stops || []).map((stop) => {
            const when = [stop.pickup ? `pickup ${stop.pickup}` : "", stop.drop ? `drop ${stop.drop}` : ""].filter(Boolean).join(", ");
            return esc(stop.name || "") + (when ? ` (${when})` : "");
          }).filter(Boolean).join(", ")}</p>` : ""}
          ${table([
            { label: "Student", render: (s) => `<b>${esc(s.name)}</b>` },
            { label: "Class", render: (s) => esc(s.class_label || "-") },
            { label: "Father", render: (s) => esc(s.father_name || "-") },
            { label: "Phone", render: (s) => esc(s.phone || "-") },
          ], route.students || [], { empty: "No students on this bus.", emptyIcon: "fa-users" })}
        `, { icon: "fa-bus" })).join("")
      : empty("No bus route is linked to your name or phone. Ask the office to put your phone on the route.", "fa-bus");
    const rows = expenses.items || [];
    view.innerHTML = `${routeCards}
      <div class="toolbar"><div class="filters">
        <label style="margin:0">Month</label>
        <select id="busMonth">${option("all", "All months", expenses.month)}${(expenses.months || []).map((m) => option(m, fmtMonth(m), expenses.month)).join("")}</select>
      </div></div>
      ${card("Bus expenses", rows.length ? table([
        { label: "Date", className: "nowrap", render: (r) => fmtDate(r.date) },
        { label: "Bus", render: (r) => (r.bus_no || r.route_name ? `<b>${esc(r.route_name || r.bus_no)}</b>` : '<span class="muted">Other</span>') },
        { label: "Expense", render: (r) => `<b>${esc(r.particular)}</b>` },
        { label: "Amount", className: "right nowrap", render: (r) => money(r.amount) },
        { label: "Mode", render: (r) => esc(r.method || "-") },
        { label: "", className: "right nowrap", render: (r) => `<button class="btn btn-light btn-sm" data-edit="${esc(r.id)}"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-light btn-sm" data-del="${esc(r.id)}" title="Remove"><i class="fa fa-trash"></i></button>` },
      ], rows, { footer: `<td colspan="3">Total</td><td class="right"><b>${money(expenses.total || 0)}</b></td><td colspan="2"></td>` }) : empty(expenses.month === "all" ? expenses.category.empty_all : expenses.category.empty_month, "fa-bus"), {
        icon: "fa-bus",
        flush: !!rows.length,
        actions: `<button class="btn btn-sm" id="addBusExpense"><i class="fa fa-plus"></i> Add</button>`,
      })}`;
    const reload = (next) => UI.runScreen(view, () => busWork(view, { month: next }));
    view.querySelector("#busMonth").addEventListener("change", (e) => reload(e.target.value));
    const openForm = (item) => busExpenseForm(expenses.category, item || {}, expenses, async (payload) => {
      const path = item && item.id ? `/other/bus-expenses/${item.id}` : "/other/bus-expenses";
      const result = await MPS.post(path, payload);
      reload(expenses.month);
      return result;
    });
    view.querySelector("#addBusExpense").addEventListener("click", () => openForm());
    view.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const item = rows.find((row) => row.id === b.dataset.edit);
      if (item) openForm(item);
    }));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Delete this expense?")) return;
      if (await run(() => MPS.del(`/other/bus-expenses/${b.dataset.del}`))) reload(expenses.month);
    }));
  }

  function visitorForm(done) {
    const m = UI.modal("Visitor entered", `<form id="visitorForm" class="grid" style="gap:0">
        ${UI.fieldHtml({ name: "name", label: "Person name", required: true, maxlength: 80 })}
        ${UI.fieldHtml({ name: "phone", label: "Phone", required: true, maxlength: 10 })}
        ${UI.fieldHtml({ name: "purpose", label: "Purpose of visit", required: true, maxlength: 200 })}
        ${UI.fieldHtml({ name: "address", label: "Address", required: true, maxlength: 160 })}
        <div class="form-error" hidden></div>
      </form>
      <div class="modal-actions"><button type="button" class="btn btn-light" data-close>Cancel</button>
        <button type="button" class="btn" id="saveVisitor">Add</button></div>`);
    const form = m.body.querySelector("#visitorForm");
    const errorEl = form.querySelector(".form-error");
    const submit = m.body.querySelector("#saveVisitor");
    submit.addEventListener("click", async () => {
      if (!form.reportValidity()) return;
      submit.disabled = true;
      errorEl.hidden = true;
      try {
        const result = await MPS.post("/other/visitors", {
          name: form.name.value.trim(),
          phone: form.phone.value.trim(),
          purpose: form.purpose.value.trim(),
          address: form.address.value.trim(),
        });
        m.close();
        UI.toast(result.message);
        done();
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
        submit.disabled = false;
      }
    });
  }

  async function visitors(view, state = {}) {
    const date = state.date || todayIso();
    const d = await MPS.get(`/other/visitors?date=${encodeURIComponent(date)}`);
    const rows = d.visitors || [];
    const inside = rows.filter((row) => !row.out_time).length;
    view.innerHTML = `<div class="toolbar"><div class="filters">
        <label style="margin:0">Date</label>
        <input type="date" id="visitDate" value="${esc(d.date)}" max="${todayIso()}">
      </div></div>
      ${card("Campus register", table([
        { label: "Person", render: (r) => `<b>${esc(r.name)}</b><div class="small muted">${esc(r.phone)}</div>` },
        { label: "Purpose", render: (r) => esc(r.purpose) },
        { label: "Address", render: (r) => esc(r.address) },
        { label: "In", className: "nowrap", render: (r) => fmtTime(r.in_time) },
        { label: "Out", className: "nowrap", render: (r) => (r.out_time ? fmtTime(r.out_time) : badge("Inside", "warn")) },
        { label: "", className: "right nowrap", render: (r) => `${r.out_time ? "" : `<button class="btn btn-sm" data-out="${esc(r.id)}">Left</button> `}<button class="btn btn-light btn-sm" data-del="${esc(r.id)}" title="Remove"><i class="fa fa-trash"></i></button>` },
      ], rows, { empty: "No visitors on this date.", emptyIcon: "fa-id-card-o" }), {
        icon: "fa-id-card-o",
        flush: !!rows.length,
        actions: `${inside ? badge(`${inside} inside`, "warn") : ""} <button class="btn btn-sm" id="addVisitor"><i class="fa fa-plus"></i> Add</button>`,
      })}`;
    const reload = (next) => UI.runScreen(view, () => visitors(view, { date: next }));
    view.querySelector("#visitDate").addEventListener("change", (e) => reload(e.target.value));
    view.querySelector("#addVisitor").addEventListener("click", () => visitorForm(() => reload(d.date)));
    view.querySelectorAll("[data-out]").forEach((b) => b.addEventListener("click", async () => {
      if (await run(() => MPS.post(`/other/visitors/${b.dataset.out}/out`, {}))) reload(d.date);
    }));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Remove this visitor entry?")) return;
      if (await run(() => MPS.del(`/other/visitors/${b.dataset.del}`))) reload(d.date);
    }));
  }

  const modules = [
    { id: "checkin", label: "Check In / Out", icon: "fa-sign-in", group: "Daily", render: checkIn },
  ];
  if (kind() === "driver") {
    modules.push({ id: "bus", label: "Bus expenses", icon: "fa-bus", group: "Daily", render: (v) => busWork(v) });
  }
  if (kind() === "guard") {
    modules.push({ id: "visitors", label: "Campus register", icon: "fa-id-card-o", group: "Daily", render: (v) => visitors(v) });
  }
  modules.push({ id: "password", label: "Change Password", icon: "fa-key", group: "Account", render: UI.shared.password });

  UI.startApp({
    role: "other",
    portalName: "Staff Portal",
    userSub: (u) => `${u.employee_id || ""} · ${u.designation || "Staff"}`,
    modules,
  });
})();
