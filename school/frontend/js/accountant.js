(() => {
  const { esc, fmtDate, badge, card, table, run } = UI;

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
    const reqs = await MPS.get("/accounts/profile-requests");
    const pays = await MPS.get("/accounts/intimations");
    const profilePending = (reqs.requests || []).filter((r) => r.status === "Pending").length;
    const payPending = (pays.intimations || []).filter((i) => i.status === "Pending").length;
    view.innerHTML = `${UI.tabs([
      { id: "payments", label: `Parent Payments (${payPending})` },
      { id: "profile", label: `Profile Changes (${profilePending})` },
    ], tab)}<div id="approvalBody"></div>`;
    UI.onTabs(view, (t) => approvals(view, ctx, t));
    const body = view.querySelector("#approvalBody");
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
      { id: "profile", label: "My Profile", icon: "fa-user", group: "Overview", render: (v, c) => UI.shared.myProfile(v, c) },
      { id: "approvals", label: "Approvals", icon: "fa-check-circle", group: "Overview", render: approvals },
      { id: "collect", label: "Student Fee Update", icon: "fa-inr", group: "Fees", render: (v, c) => Accounts.collect(v, c) },
      { id: "receipts", label: "Receipts", icon: "fa-file-text-o", group: "Fees", render: (v, c) => Accounts.receipts(v, c) },
      { id: "defaulters", label: "Dues & Defaulters", icon: "fa-exclamation-triangle", group: "Fees", render: (v, c) => Accounts.defaulters(v, c) },
      { id: "reminders", label: "Fee Reminders", icon: "fa-whatsapp", group: "Fees", render: Accounts.reminders },
      { id: "settings", label: "Fee Structure", icon: "fa-sliders", group: "Fees", render: Accounts.settings },
      { id: "report", label: "Collection Report", icon: "fa-bar-chart", group: "Reports", render: (v, c) => Accounts.report(v, c) },
      { id: "principals", label: "Principal", icon: "fa-university", group: "People", render: principals },
      { id: "whatsapp", label: "WhatsApp", icon: "fa-whatsapp", group: "Communication", render: (v, c) => UI.shared.whatsapp(v, c) },
      { id: "password", label: "Change Password", icon: "fa-key", group: "Account", render: UI.shared.password },
    ],
  });
})();
