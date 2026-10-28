(() => {
  async function principals(view) {
    const d = await MPS.get("/accounts/principals");
    UI.shared.staffAccounts(view, {
      title: "Principal",
      noun: "Principal",
      icon: "fa-university",
      rows: d.principals,
      defaultPassword: d.default_password,
      create: (v) => MPS.post("/accounts/principals", v),
      update: (s, v) => MPS.post(`/accounts/principals/${s.id}`, v),
      resetPassword: (s) => MPS.post(`/accounts/principals/${s.id}/reset-password`),
      remove: (s) => MPS.del(`/accounts/principals/${s.id}`),
      reload: () => principals(view),
    });
  }

  UI.startApp({
    role: "accountant",
    portalName: "Accounts Portal",
    userSub: (u) => `${u.employee_id} · ${u.designation || "Accountant"}`,
    modules: [
      { id: "dashboard", label: "Fee Overview", icon: "fa-inr", group: "Overview", render: Accounts.dashboard },
      { id: "collect", label: "Student Fee Update", icon: "fa-inr", group: "Fees", render: (v, c) => Accounts.collect(v, c) },
      { id: "receipts", label: "Receipts", icon: "fa-file-text-o", group: "Fees", render: (v, c) => Accounts.receipts(v, c) },
      { id: "defaulters", label: "Dues & Defaulters", icon: "fa-exclamation-triangle", group: "Fees", render: (v, c) => Accounts.defaulters(v, c) },
      { id: "intimations", label: "Parent Payments", icon: "fa-bell", group: "Fees", render: Accounts.intimations },
      { id: "reminders", label: "Fee Reminders", icon: "fa-whatsapp", group: "Fees", render: Accounts.reminders },
      { id: "report", label: "Collection Report", icon: "fa-bar-chart", group: "Reports", render: (v, c) => Accounts.report(v, c) },
      { id: "principals", label: "Principal", icon: "fa-university", group: "Settings", render: principals },
      { id: "settings", label: "Fee Structure", icon: "fa-sliders", group: "Settings", render: Accounts.settings },
      { id: "whatsapp", label: "WhatsApp", icon: "fa-whatsapp", group: "Settings", render: (v, c) => UI.shared.whatsapp(v, c) },
      { id: "password", label: "Change Password", icon: "fa-key", group: "Account", render: UI.shared.password },
    ],
  });
})();
