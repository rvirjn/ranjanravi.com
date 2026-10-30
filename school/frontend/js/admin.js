(() => {
  const { esc, badge, card, table, openForm, run, avatar } = UI;

  const SCHOOL_FORM = (s, isNew) => [
    ...(isNew ? [{ name: "code", label: "School code", required: true, placeholder: "e.g. ABC", hint: "2 to 6 letters. Login IDs start with it (ABCS2026001, ABCT001, ABCP001, ABCA001). Cannot be changed later." }] : []),
    { name: "photo", label: "School icon", type: "photo", value: s.photo },
    { name: "name", label: "School name", required: true, value: s.name },
    { name: "short_name", label: "Short name (logo text)", value: s.short_name },
    { name: "tagline", label: "Tagline", value: s.tagline, placeholder: "e.g. Nursery to Class 8 (English Medium)" },
    { name: "address", label: "Address", type: "textarea", value: s.address },
    { name: "phones", label: "Phone numbers (comma separated)", value: (s.phones || []).join(", "), hint: "10 digits each, separated by commas. Do not add +91." },
    { name: "email", label: "Email", type: "email", pattern: "[^@\\s]+@[^@\\s]+\\.[^@\\s]+", title: "Enter a valid email address", value: s.email },
    { name: "website", label: "Website", value: s.website, placeholder: "https://" },
    { name: "academic_year", label: "Academic year", value: s.academic_year, placeholder: "e.g. 2026-27", hint: "Set once, when the school is added. The principal moves students to the next year." },
    { name: "school_open_time", label: "School opening time", type: "time", required: true, value: s.school_open_time || "", hint: "Teacher check-in starts at this time. There is no early check-in. A later check-in shows how many minutes late." },
    { name: "school_close_time", label: "School closing time", type: "time", required: true, value: s.school_close_time || "", hint: "Check-in is not allowed after this time. A missed check-out is saved 2 hours later." },
    { name: "assembly_from", label: "Assembly from", type: "time", required: true, value: s.assembly_from || "" },
    { name: "assembly_to", label: "Assembly to", type: "time", required: true, value: s.assembly_to || "", hint: "A subject period must start after assembly ends." },
    { name: "upi", label: "UPI ID for fees", value: s.upi },
    { name: "payment_qr_name", label: "Name shown on payment scanner", value: s.payment_qr_name },
    { name: "bank_bank_name", label: "Bank name", value: (s.bank || {}).bank_name },
    { name: "bank_branch", label: "Bank branch", value: (s.bank || {}).branch },
    { name: "bank_account_no", label: "Bank account number", value: (s.bank || {}).account_no },
    { name: "bank_ifsc", label: "IFSC", value: (s.bank || {}).ifsc },
    { name: "whatsapp_number", label: "School WhatsApp number", type: "mobile", value: s.whatsapp_number },
    { name: "whatsapp_group_all", label: "WhatsApp group name for everyone", value: s.whatsapp_group_all, placeholder: "SAV All student & Teachers" },
    { name: "whatsapp_group_teachers", label: "WhatsApp group name for teachers", value: s.whatsapp_group_teachers, placeholder: "SAV All Teachers" },
    { name: "whatsapp_signature", label: "WhatsApp message signature", type: "textarea", value: s.whatsapp_signature, placeholder: "- School name, Town\nPh: ..." },
    { name: "facebook", label: "Facebook page", value: s.facebook },
    { name: "youtube", label: "YouTube channel", value: s.youtube },
    ...(isNew ? [] : [{ name: "active", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive (nobody of this school can log in)" }], value: String(s.active !== false) }]),
  ];

  async function schools(view) {
    const { schools: rows } = await MPS.get("/admin/schools");
    view.innerHTML = card(`Schools (${rows.length})`, table(
      [
        { label: "School", render: (s) => `<div class="who"><div class="avatar">${avatar(s.short_name || s.name, s.photo)}</div><div><b>${esc(s.name)}</b> ${badge(s.code, "neutral")}${s.active === false ? ` ${badge("Inactive", "danger")}` : ""}<div class="small muted">${esc(s.tagline || "")}</div><div class="small muted">${s.school_open_time && s.school_close_time ? `School ${esc(UI.fmtTime(s.school_open_time))} – ${esc(UI.fmtTime(s.school_close_time))}` : "School time not set"}${s.assembly_from && s.assembly_to ? ` · Assembly ${esc(UI.fmtTime(s.assembly_from))} – ${esc(UI.fmtTime(s.assembly_to))}` : ""}</div></div></div>` },
        { label: "Contact", render: (s) => `<span class="small">${esc((s.phones || []).join(", "))}${s.email ? `<br>${esc(s.email)}` : ""}</span>` },
        { label: "Classes", render: (s) => s.counts.classes, className: "right" },
        { label: "Students", render: (s) => s.counts.students, className: "right" },
        { label: "Teachers", render: (s) => s.counts.teachers, className: "right" },
        { label: "Principal / Accounts", render: (s) => `${s.counts.principals} / ${s.counts.accountants}`, className: "right" },
        { label: "", className: "right nowrap", render: (s) => `<button class="btn btn-light btn-sm" data-edit="${s.id}"><i class="fa fa-pencil"></i></button>
          <button class="btn btn-light btn-sm" data-del="${s.id}" title="Remove"><i class="fa fa-trash"></i></button>` },
      ],
      rows,
      { empty: "No schools yet. Add the first school." }
    ), { icon: "fa-university", flush: true, actions: '<button class="btn btn-sm" id="add"><i class="fa fa-plus"></i> Add School</button>' })
      + '<p class="small muted">After adding a school, add its accountant under Accountants. The accountant adds the principal, and the principal adds classes, teachers and students.</p>';

    view.querySelector("#add").addEventListener("click", () => openForm({
      title: "Add School", fields: SCHOOL_FORM({}, true), submitLabel: "Add",
      onSubmit: async (v) => { const r = await MPS.post("/admin/schools", v); schools(view); return r; },
    }));
    view.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => {
      const s = rows.find((x) => x.id === b.dataset.edit);
      openForm({
        title: `Edit ${s.name} (${s.code})`, fields: SCHOOL_FORM(s, false),
        onSubmit: async (v) => { const r = await MPS.post(`/admin/schools/${s.id}`, v); schools(view); return r; },
      });
    }));
    view.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      const s = rows.find((x) => x.id === b.dataset.del);
      const typed = prompt(`This permanently removes ${s.name} and ALL its data: ${s.counts.students} students, ${s.counts.teachers} teachers, fees, attendance and results.\n\nType the school code ${s.code} to confirm.`);
      if (typed === null) return;
      if (await run(() => MPS.post(`/admin/schools/${s.id}/delete`, { confirm: typed }))) schools(view);
    }));
  }

  async function accountants(view) {
    const [{ accountants: rows, default_password: defaultPassword, next_admission_numbers: nextNumbers, used_admission_numbers: usedNumbers }, { schools: schoolRows }] = await Promise.all([MPS.get("/admin/accountants"), MPS.get("/admin/schools")]);
    const path = (s) => `/admin/schools/${s.school_id}/accountants/${s.id}`;
    UI.shared.staffAccounts(view, {
      title: "Accountants",
      noun: "Accountant",
      icon: "fa-inr",
      rows: rows.map((r) => ({ ...r, key: `${r.school_id}:${r.id}` })),
      defaultPassword,
      idLetter: "A",
      schoolField: "school_id",
      nextBySchool: nextNumbers || {},
      usedBySchool: usedNumbers || {},
      extraFields: () => [{ name: "school_id", label: "School", type: "select", required: true, createOnly: true, placeholder: "Choose school",
        options: schoolRows.map((s) => ({ value: s.id, label: `${s.name} (${s.code})`, code: s.code })) }],
      extraColumns: [{ label: "School", render: (s) => esc(s.school_name) }],
      create: (v) => MPS.post(`/admin/schools/${v.school_id}/accountants`, v),
      update: (s, v) => MPS.post(path(s), v),
      resetPassword: (s) => MPS.post(`${path(s)}/reset-password`),
      remove: (s) => MPS.del(path(s)),
      reload: () => accountants(view),
    });
  }

  UI.startApp({
    role: "admin",
    portalName: "Admin Portal",
    userSub: (u) => `${u.login_id} · Administrator`,
    modules: [
      { id: "schools", label: "Schools", icon: "fa-university", group: "Manage", render: schools },
      { id: "accountants", label: "Accountants", icon: "fa-inr", group: "Manage", render: accountants },
      { id: "password", label: "Change Password", icon: "fa-key", group: "Account", render: UI.shared.password },
    ],
  });
})();
