(() => {
  const { esc, fmtDate, badge, card, table, run, modal, money } = UI;

  function clockValue(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return "";
    const hour = Number(match[1]);
    if (hour > 23) return "";
    return `${String(hour).padStart(2, "0")}:${match[2]}`;
  }

  function stopRow(stop) {
    return `<tr>
      <td><input data-stop="name" value="${esc(stop.name || "")}" placeholder="Stop name" maxlength="80"></td>
      <td><input data-stop="pickup" type="time" value="${esc(clockValue(stop.pickup))}"></td>
      <td><input data-stop="drop" type="time" value="${esc(clockValue(stop.drop))}"></td>
      <td class="right"><button type="button" class="btn btn-light btn-sm" data-remove-stop title="Remove"><i class="fa fa-times"></i></button></td>
    </tr>`;
  }

  function routeForm(route, onSubmit) {
    const stops = route.stops && route.stops.length ? route.stops : [{ name: "", pickup: "", drop: "" }];
    const m = modal(route.id ? `Edit ${route.route_name}` : "Add Bus Route", `
      <form>
        <div class="grid grid-2">
          <div class="field"><label for="route_name">Route name</label><input id="route_name" name="route_name" required maxlength="80" value="${esc(route.route_name || "")}" placeholder="e.g. Civil Lines"></div>
          <div class="field"><label for="bus_no">Bus number</label><input id="bus_no" name="bus_no" required maxlength="40" value="${esc(route.bus_no || "")}" placeholder="e.g. UP 32 AB 1234"></div>
          <div class="field"><label for="driver_name">Driver name</label><input id="driver_name" name="driver_name" maxlength="80" data-person value="${esc(route.driver_name || "")}"></div>
          <div class="field"><label for="driver_phone">Driver phone</label><input id="driver_phone" name="driver_phone" type="text" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" title="Enter a 10 digit mobile number, without +91" data-mobile value="${esc(String(route.driver_phone || "").replace(/\D/g, "").slice(-10))}" placeholder="10 digit mobile"></div>
          <div class="field"><label for="attendant_name">Attendant</label><input id="attendant_name" name="attendant_name" maxlength="80" data-person value="${esc(route.attendant_name || "")}"></div>
          <div class="field"><label for="monthly_fee">Monthly fee (Rs)</label><input id="monthly_fee" name="monthly_fee" type="number" min="0" step="1" value="${Number(route.monthly_fee || 0)}"></div>
          <div class="field"><label for="pickup_start">Morning pickup starts</label><input id="pickup_start" name="pickup_start" type="time" value="${esc(clockValue(route.pickup_start))}"></div>
          <div class="field"><label for="drop_start">Afternoon drop starts</label><input id="drop_start" name="drop_start" type="time" value="${esc(clockValue(route.drop_start))}"></div>
        </div>
        <h4 style="margin:4px 0 8px">Stops &amp; Timings</h4>
        <div class="table-wrap"><table class="table"><thead><tr><th>Stop</th><th>Pickup</th><th>Drop</th><th></th></tr></thead>
          <tbody id="stops">${stops.map(stopRow).join("")}</tbody></table></div>
        <button type="button" class="btn btn-light btn-sm" id="addStop" style="margin-top:8px"><i class="fa fa-plus"></i> Add stop</button>
        <p class="field-hint">Leave a stop blank to skip it. Fee changes apply to months billed from now on.</p>
        <div class="form-error" hidden></div>
        <div class="modal-actions"><button type="button" class="btn btn-light" data-close>Cancel</button>
          <button type="submit" class="btn">${route.id ? "Save" : "Add"}</button></div>
      </form>`, { wide: true });
    const form = m.body.querySelector("form");
    const errorEl = form.querySelector(".form-error");
    const body = form.querySelector("#stops");
    const bindRow = (row) => {
      row.querySelector("[data-remove-stop]").addEventListener("click", () => {
        row.remove();
        if (!body.querySelector("tr")) body.insertAdjacentHTML("beforeend", stopRow({}));
      });
    };
    body.querySelectorAll("tr").forEach(bindRow);
    form.querySelector("#addStop").addEventListener("click", () => {
      if (body.querySelectorAll("tr").length >= 40) {
        errorEl.textContent = "A route can have at most 40 stops";
        errorEl.hidden = false;
        return;
      }
      body.insertAdjacentHTML("beforeend", stopRow({}));
      bindRow(body.lastElementChild);
      body.lastElementChild.querySelector("input").focus();
    });
    const phone = form.driver_phone;
    phone.addEventListener("input", () => {
      const raw = phone.value;
      const digits = raw.replace(/\D/g, "");
      if (raw.includes("+") || (digits.length === 12 && digits.startsWith("91")) || (digits.length === 11 && digits.startsWith("0"))) {
        phone.value = "";
        phone.setCustomValidity("Enter a 10 digit mobile number, without +91");
        phone.reportValidity();
        return;
      }
      phone.setCustomValidity("");
      const next = digits.slice(0, 10);
      if (phone.value !== next) phone.value = next;
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        const bad = [...form.elements].find((el) => el.willValidate && !el.validity.valid);
        errorEl.textContent = (bad && bad.validationMessage) || "Check the highlighted fields";
        errorEl.hidden = false;
        if (bad) bad.reportValidity();
        return;
      }
      const stops = [...body.querySelectorAll("tr")].map((row) => ({
        name: row.querySelector('[data-stop="name"]').value.trim(),
        pickup: row.querySelector('[data-stop="pickup"]').value,
        drop: row.querySelector('[data-stop="drop"]').value,
      })).filter((s) => s.name || s.pickup || s.drop);
      const payload = {
        route_name: form.route_name.value.trim(),
        bus_no: form.bus_no.value.trim(),
        driver_name: form.driver_name.value.trim(),
        driver_phone: form.driver_phone.value.trim(),
        attendant_name: form.attendant_name.value.trim(),
        monthly_fee: form.monthly_fee.value,
        pickup_start: form.pickup_start.value,
        drop_start: form.drop_start.value,
        stops,
      };
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      errorEl.hidden = true;
      try {
        const result = await onSubmit(payload);
        m.close();
        if (result && result.message) UI.toast(result.message);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
        submit.disabled = false;
      }
    });
  }

  async function routes(view) {
    const d = await MPS.get("/accounts/routes");
    view.innerHTML = card(`Bus Routes (${d.routes.length})`, table(
      [
        { label: "Route", render: (r) => {
          const n = (r.stops || []).length;
          return `<b>${esc(r.route_name)}</b><div class="small muted">${n === 1 ? "1 stop" : `${n} stops`}</div>`;
        } },
        { label: "Bus No.", render: (r) => esc(r.bus_no || "-") },
        { label: "Driver", render: (r) => `${esc(r.driver_name || "-")}${r.driver_phone ? `<div class="small muted">${esc(r.driver_phone)}</div>` : ""}` },
        { label: "Students", key: "student_count", className: "right" },
        { label: "Monthly fee", render: (r) => money(r.monthly_fee), className: "right" },
        { label: "", className: "right nowrap", render: (r) => `<button class="btn btn-light btn-sm" data-edit="${r.id}"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-light btn-sm" data-del="${r.id}" title="Remove"><i class="fa fa-trash"></i></button>` },
      ],
      d.routes,
      { empty: "No bus routes yet. Add the first route." }
    ), { icon: "fa-bus", flush: true, actions: '<button class="btn btn-sm" id="add"><i class="fa fa-plus"></i> Add Bus Route</button>' });
    view.querySelector("#add").addEventListener("click", () => routeForm({}, async (v) => {
      const r = await MPS.post("/accounts/routes", v);
      routes(view);
      return r;
    }));
    view.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const route = d.routes.find((x) => x.id === b.dataset.edit);
      routeForm(route, async (v) => {
        const r = await MPS.post(`/accounts/routes/${route.id}`, v);
        routes(view);
        return r;
      });
    }));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      const route = d.routes.find((x) => x.id === b.dataset.del);
      if (!confirm(`Remove ${route.route_name}? Students on this route must be moved first.`)) return;
      if (await run(() => MPS.del(`/accounts/routes/${route.id}`))) routes(view);
    }));
  }

  async function principals(view) {
    const d = await MPS.get("/accounts/principals");
    UI.shared.staffAccounts(view, {
      title: "Principal",
      noun: "Principal",
      icon: "fa-university",
      rows: d.principals,
      defaultPassword: d.default_password,
      idLetter: "P",
      nextAdmissionNumber: d.next_admission_number || "001",
      usedAdmissionNumbers: d.used_admission_numbers || [],
      create: (v) => MPS.post("/accounts/principals", v),
      update: (s, v) => MPS.post(`/accounts/principals/${s.id}`, v),
      resetPassword: (s) => MPS.post(`/accounts/principals/${s.id}/reset-password`),
      remove: (s) => MPS.del(`/accounts/principals/${s.id}`),
      reload: () => principals(view),
    });
  }

  async function approvals(view, ctx, tab = "payments") {
    const [reqs, pays, complaints] = await Promise.all([
      MPS.get("/accounts/profile-requests"),
      MPS.get("/accounts/intimations"),
      MPS.get("/complaints"),
    ]);
    const profilePending = (reqs.requests || []).filter((r) => r.status === "Pending").length;
    const payPending = (pays.intimations || []).filter((i) => i.status === "Pending").length;
    const complaintPending = (complaints.complaints || []).filter((c) => c.status === "Pending").length;
    view.innerHTML = `${UI.tabs([
      { id: "payments", label: `Parent Payments (${payPending})` },
      { id: "profile", label: `Profile Changes (${profilePending})` },
      { id: "complaints", label: `Complains (${complaintPending})` },
    ], tab)}<div id="approvalBody"></div>`;
    UI.onTabs(view, (t) => approvals(view, ctx, t));
    const body = view.querySelector("#approvalBody");
    if (tab === "complaints") {
      await UI.shared.complaints(body);
      return;
    }
    if (tab === "profile") {
      const labels = { phone: "Mobile", email: "Email", address: "Address" };
      body.innerHTML = card("Profile Changes", table([
        { label: "Principal", render: (r) => `<b>${esc(r.name)}</b><div class="small muted">${fmtDate(r.date)}</div>` },
        { label: "Changes", render: (r) => Object.entries(r.changes || {}).map(([k, v]) => `<div class="small">${esc(labels[k] || k)}: <b>${esc(v)}</b></div>`).join("") },
        { label: "Status", render: (r) => badge(r.status) },
        { label: "", className: "right nowrap", render: (r) => (r.status === "Pending" ? `<button class="btn btn-sm" data-ok="${r.id}">Approve</button> <button class="btn btn-danger btn-sm" data-no="${r.id}">Reject</button>` : "") },
      ], reqs.requests, { empty: "No profile change requests from the principal." }), { icon: "fa-check-circle", flush: true });
      const decide = async (id, status) => {
        if (await run(() => MPS.post(`/accounts/profile-requests/${id}`, { status }))) {
          if (ctx.noteApprovals) ctx.noteApprovals();
          approvals(view, ctx, "profile");
        }
      };
      body.querySelectorAll("[data-ok]").forEach((b) => b.addEventListener("click", () => decide(b.dataset.ok, "Approved")));
      body.querySelectorAll("[data-no]").forEach((b) => b.addEventListener("click", () => decide(b.dataset.no, "Rejected")));
      return;
    }
    await Accounts.intimations(view, ctx, { into: body, reload: () => { if (ctx.noteApprovals) ctx.noteApprovals(); approvals(view, ctx, "payments"); } });
  }

  UI.startApp({
    role: "accountant",
    portalName: "Accounts Portal",
    userSub: (u) => `${u.employee_id} · ${u.designation || "Accountant"}`,
    modules: [
      { id: "dashboard", label: "Dashboard", icon: "fa-tachometer", group: "Overview", render: Accounts.dashboard },
      { id: "approvals", label: "Approvals", icon: "fa-check-circle", group: "Overview", render: approvals },
      { id: "collect", label: "Collect Fee", icon: "fa-inr", group: "Fees", render: (v, c) => Accounts.collect(v, c) },
      { id: "receipts", label: "Download Receipts", icon: "fa-file-text-o", group: "Fees", render: (v, c) => Accounts.receipts(v, c) },
      { id: "principals", label: "Principal", icon: "fa-university", group: "People", render: principals },
      { id: "routes", label: "Bus Routes", icon: "fa-bus", group: "People", render: routes },
      { id: "settings", label: "Monthly Fees", icon: "fa-sliders", group: "People", render: Accounts.settings },
      { id: "report", label: "Fee Report", icon: "fa-bar-chart", group: "Reports", render: (v, c) => Accounts.report(v, c) },
      { id: "complaints", label: "Complains", icon: "fa-comments-o", group: "Communication", render: (v) => UI.shared.complaints(v) },
      { id: "defaulters", label: "Dues Reminders", icon: "fa-exclamation-triangle", group: "Communication", render: (v, c) => Accounts.defaulters(v, c) },
      { id: "reminders", label: "Auto Fee Reminders", icon: "fa-whatsapp", group: "Communication", render: Accounts.reminders },
      { id: "whatsapp", label: "WhatsApp", icon: "fa-whatsapp", group: "Communication", render: (v, c) => UI.shared.whatsapp(v, c) },
      { id: "profile", label: "My Profile", icon: "fa-user", group: "Account", render: (v, c) => UI.shared.myProfile(v, c) },
      { id: "password", label: "Change Password", icon: "fa-key", group: "Account", render: UI.shared.password },
    ],
  });
})();
