const UI = (() => {
  setInterval(() => {
    document.querySelectorAll(".spin-ccw b").forEach((el) => {
      const next = (Number(el.textContent) || 0) + 1;
      el.textContent = String(next > 99 ? 1 : next);
    });
  }, 700);

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const state = { school: {} };

  // ---------- formatting ----------
  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);

  function fmtDate(value) {
    if (!value) return "-";
    const [y, m, d] = String(value).slice(0, 10).split("-");
    return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  }

  function fmtTime(value) {
    const text = String(value || "");
    const t = text.length > 5 ? text.slice(11, 16) : text;
    if (!t) return "";
    let [h, mi] = t.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(mi).padStart(2, "0")} ${suffix}`;
  }

  const fmtDateTime = (value) => (value ? `${fmtDate(value)}, ${fmtTime(value)}` : "-");

  function fmtMonth(ym) {
    if (!ym) return "";
    const [y, m] = ym.split("-");
    return `${MONTHS_FULL[Number(m) - 1]} ${y}`;
  }

  const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }

  /** Uploaded files live behind the API; bundled images (image/...) and full URLs are used as-is. */
  function fileUrl(name) {
    if (!name) return "";
    if (/^(https?:|image\/|data:)/.test(name)) return name;
    return `${MPS_CONFIG.API_BASE}/files/${encodeURIComponent(name)}`;
  }

  function avatar(name, photo) {
    if (!photo) return esc(initials(name));
    const letters = esc(initials(name));
    return `<img src="${esc(fileUrl(photo))}" alt="${letters}" class="avatar-img" onerror="this.replaceWith(document.createTextNode(this.alt))">`;
  }

  async function uploadFile(file, { icon = false } = {}) {
    const session = MPS.session();
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${MPS_CONFIG.API_BASE}/upload${icon ? "?icon=1" : ""}`, {
      method: "POST",
      headers: session && session.token ? { Authorization: "Bearer " + session.token } : {},
      body: form,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error || "Upload failed");
    return json.file;
  }

  /** Opens the file window. Resolves to the chosen files, or none if the window is closed. */
  function pickFiles({ accept = "image/*,application/pdf", multiple = false } = {}) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.style.cssText = "position:fixed;left:-100px;top:0;width:1px;height:1px;opacity:0";
      let settled = false;
      const finish = (files) => {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(files);
      };
      input.addEventListener("change", () => finish(Array.from(input.files || [])));
      input.addEventListener("cancel", () => finish([]));
      document.body.appendChild(input);
      input.click();
    });
  }

  /** Lets the user pick files; resolves to uploaded file names. */
  async function pickAndUpload({ accept = "image/*,application/pdf", multiple = false, icon = false } = {}) {
    const files = await pickFiles({ accept, multiple });
    const names = [];
    for (const file of files) names.push(await uploadFile(file, { icon }));
    return names;
  }

  function todayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // ---------- building blocks ----------
  const TONE_WORDS = {
    success: ["paid", "approved", "present", "completed", "graded", "resolved", "pass", "submitted", "returned", "positive", "marked", "recorded", "sent", "connected", "posted"],
    warn: ["pending", "due", "in progress", "leave", "planned", "issued", "upcoming", "not marked", "dry_run", "queued", "changes needed", "late", "half day", "test", "not posted", "qr"],
    danger: ["rejected", "overdue", "absent", "needs improvement", "fail", "failed", "logged_out", "offline", "not received"],
  };

  function toneFor(text) {
    const t = String(text || "").toLowerCase();
    for (const [tone, words] of Object.entries(TONE_WORDS)) {
      if (words.includes(t)) return tone;
    }
    return "";
  }

  const badge = (text, tone) => `<span class="badge ${tone ?? toneFor(text)}">${esc(text)}</span>`;

  function card(title, body, opts = {}) {
    const head = title
      ? `<div class="card-head"><h3>${opts.icon ? `<i class="fa ${opts.icon}"></i>` : ""}${esc(title)}</h3>${opts.actions || ""}</div>`
      : "";
    return `<section class="card ${opts.className || ""}">${head}<div class="card-body ${opts.flush ? "flush" : ""}">${body}</div></section>`;
  }

  function stat(label, value, opts = {}) {
    return `<div class="card stat tone-${opts.tone || "ok"}">
      <div class="stat-icon"><i class="fa ${opts.icon || "fa-circle"}"></i></div>
      <div><div class="stat-value">${value}</div><div class="stat-label">${esc(label)}</div>${opts.sub ? `<div class="stat-sub">${opts.sub}</div>` : ""}</div>
    </div>`;
  }

  const empty = (text, icon = "fa-inbox") => `<div class="empty"><i class="fa ${icon}"></i>${esc(text)}</div>`;
  const spinner = () => `<span class="spin-ccw" aria-hidden="true"><i class="fa fa-spinner"></i><b>1</b></span>`;
  const loading = () => `<div class="loading">${spinner()} Loading...</div>`;
  const errorBox = (message) => `<div class="error-box"><i class="fa fa-exclamation-circle"></i> ${esc(message)}</div>`;

  function table(columns, rows, opts = {}) {
    if (!rows || !rows.length) return empty(opts.empty || "Nothing to show yet.", opts.emptyIcon);
    const head = columns.map((c) => `<th class="${c.className || ""}">${esc(c.label)}</th>`).join("");
    const body = rows
      .map(
        (row, i) =>
          `<tr>${columns
            .map((c) => `<td class="${c.className || ""}">${c.render ? c.render(row, i) : esc(row[c.key] ?? "-")}</td>`)
            .join("")}</tr>`
      )
      .join("");
    const foot = opts.footer ? `<tfoot><tr>${opts.footer}</tr></tfoot>` : "";
    return `<div class="table-wrap"><table class="table ${opts.className || ""}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table></div>`;
  }

  function kv(pairs) {
    return `<div class="kv">${pairs
      .filter((p) => p)
      .map(([label, value]) => `<div><span>${esc(label)}</span><b>${value === undefined || value === null || value === "" ? "-" : esc(value)}</b></div>`)
      .join("")}</div>`;
  }

  function progress(value) {
    const tone = value < 60 ? "danger" : value < 75 ? "warn" : "";
    return `<div class="progress ${tone}"><div style="width:${Math.max(0, Math.min(100, value))}%"></div></div>`;
  }

  function eventSpan(e) {
    const end = e && e.end_date && e.end_date !== e.date ? e.end_date : "";
    return end ? `${fmtDate(e.date)} – ${fmtDate(end)}` : fmtDate(e && e.date);
  }

  function dateChip(value) {
    const [, m, d] = String(value).slice(0, 10).split("-");
    return `<div class="date-chip"><b>${Number(d)}</b><span>${MONTHS[Number(m) - 1]}</span></div>`;
  }

  function tabs(items, active) {
    return `<div class="tabs">${items
      .map((t) => `<button type="button" class="tab ${t.id === active ? "active" : ""}" data-tab="${esc(t.id)}">${esc(t.label)}</button>`)
      .join("")}</div>`;
  }

  function onTabs(root, handler) {
    root.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => handler(btn.dataset.tab)));
  }

  // ---------- feedback ----------
  function toast(message, tone = "success") {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = `toast ${tone === "error" ? "error" : ""}`;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  async function run(fn, successMessage) {
    try {
      const result = await fn();
      toast((result && result.message) || successMessage || "Saved");
      return result;
    } catch (e) {
      toast(e.message, "error");
      return null;
    }
  }

  // ---------- modals & forms ----------
  function modal(title, bodyHtml, opts = {}) {
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `<div class="modal ${opts.wide ? "wide" : ""}" role="dialog" aria-modal="true">
      <div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Close">&times;</button></div>
      <div class="modal-body">${bodyHtml}</div></div>`;
    const close = () => wrap.remove();
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-close]")) close();
    });
    document.body.appendChild(wrap);
    return { el: wrap, body: wrap.querySelector(".modal-body"), close };
  }

  function option(o, selected) {
    const value = typeof o === "object" ? o.value : o;
    const label = typeof o === "object" ? o.label : o;
    const code = typeof o === "object" && o.code ? ` data-code="${esc(o.code)}"` : "";
    return `<option value="${esc(value)}"${code} ${String(value) === String(selected ?? "") ? "selected" : ""}>${esc(label)}</option>`;
  }

  function mobileDigits(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
    return digits.slice(0, 10);
  }

  function bindMobileInput(input) {
    input.addEventListener("input", () => {
      const raw = input.value;
      const digits = raw.replace(/\D/g, "");
      if (raw.includes("+") || (digits.length === 12 && digits.startsWith("91")) || (digits.length === 11 && digits.startsWith("0"))) {
        input.value = "";
        input.setCustomValidity("Enter a 10 digit mobile number, without +91");
        input.reportValidity();
        return;
      }
      input.setCustomValidity("");
      const next = digits.slice(0, 10);
      if (input.value !== next) input.value = next;
    });
  }

  function fieldHtml(f) {
    const id = `f_${f.name}`;
    const req = f.required ? "required" : "";
    let input;
    if (f.type === "select") {
      input = `<select id="${id}" name="${f.name}" ${req}>${f.placeholder ? `<option value="">${esc(f.placeholder)}</option>` : ""}${(f.options || [])
        .map((o) => option(o, f.value))
        .join("")}</select>`;
    } else if (f.type === "textarea") {
      input = `<textarea id="${id}" name="${f.name}" ${req} placeholder="${esc(f.placeholder || "")}" maxlength="${f.maxlength || 4000}">${esc(f.value || "")}</textarea>`;
    } else if (f.type === "mobile") {
      input = `<input id="${id}" name="${f.name}" type="text" inputmode="numeric" autocomplete="tel" maxlength="16" pattern="[0-9]{10}" title="Enter a 10 digit mobile number, without +91" data-mobile value="${esc(mobileDigits(f.value))}" placeholder="${esc(f.placeholder || "10 digit mobile")}" ${req}>`;
    } else if (f.type === "photo") {
      const preview = f.value
        ? `<img src="${fileUrl(f.value)}" alt="" class="avatar-img">`
        : `<i class="fa fa-user"></i>`;
      input = `<div class="photo-pick"><div class="avatar" data-photo-preview="${esc(f.name)}">${preview}</div>
        <button type="button" class="btn btn-light btn-sm" data-photo-for="${esc(f.name)}"><i class="fa fa-camera"></i> Choose photo</button>
        <input type="hidden" name="${esc(f.name)}" value="${esc(f.value || "")}"></div>`;
    } else {
      const attrs = ["min", "max", "step", "maxlength", "minlength", "autocomplete", "pattern", "title", "inputmode"]
        .filter((a) => f[a] !== undefined)
        .map((a) => `${a}="${esc(f[a])}"`)
        .join(" ");
      input = `<input id="${id}" name="${f.name}" type="${f.type || "text"}" value="${esc(f.value ?? "")}" placeholder="${esc(f.placeholder || "")}" ${attrs} ${f.person ? "data-person" : ""} ${req}>`;
    }
    return `<div class="field"><label for="${id}">${esc(f.label)}</label>${input}${f.hint ? `<div class="field-hint">${esc(f.hint)}</div>` : ""}</div>`;
  }

  function admissionPad(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits || Number(digits) < 1) return "";
    return String(Number(digits)).padStart(3, "0");
  }

  function previewSchoolCode(form, preview) {
    if (preview.schoolField) {
      const sel = form.querySelector(`[name="${preview.schoolField}"]`);
      const opt = sel && sel.selectedOptions && sel.selectedOptions[0];
      return String((opt && opt.dataset.code) || "").toUpperCase();
    }
    const school = state.school || {};
    return String(preview.code || school.code || school.short_name || "").toUpperCase();
  }

  function suggestedAdmission(form, preview) {
    if (preview.nextBySchool && preview.schoolField) {
      const sel = form.querySelector(`[name="${preview.schoolField}"]`);
      const id = sel && sel.value;
      return (id && preview.nextBySchool[id]) || "";
    }
    if (preview.nextByYear) {
      const date = (form.admission_date && form.admission_date.value) || todayIso();
      const year = String(date).slice(0, 4);
      return preview.nextByYear[year] || "001";
    }
    return preview.nextNumber || "";
  }

  function previewLoginId(form, preview) {
    const number = admissionPad(form.admission_number && form.admission_number.value);
    const code = previewSchoolCode(form, preview);
    if (!code || !number) return "";
    if (preview.withYear) {
      const date = (form.admission_date && form.admission_date.value) || (form.joining_date && form.joining_date.value);
      const year = String(date || "").slice(0, 4);
      if (!/^\d{4}$/.test(year)) return "";
      return `${code}${preview.letter}${year}${number}`;
    }
    return `${code}${preview.letter}${number}`;
  }

  const admissionLatest = new Date();
  admissionLatest.setDate(admissionLatest.getDate() + 366);
  const admissionDate = { min: "1970-01-01", max: `${admissionLatest.getFullYear()}-${String(admissionLatest.getMonth() + 1).padStart(2, "0")}-${String(admissionLatest.getDate()).padStart(2, "0")}` };

  function bindPersonName(input) {
    input.addEventListener("input", () => {
      const value = input.value.trim();
      input.setCustomValidity(value && /\d/.test(value) ? "Name cannot contain a number" : "");
    });
  }

  function bindAdmissionCheck(form, check) {
    const numberField = form.admission_number;
    if (!numberField || !check) return;
    const dateField = form.admission_date || form.joining_date;
    const paint = () => {
      const raw = numberField.value.trim();
      if (raw && !/^\d{1,6}$/.test(raw)) {
        numberField.setCustomValidity("Admission No. must be a number such as 001 or 002");
        return;
      }
      const number = admissionPad(raw);
      if (!number) {
        numberField.setCustomValidity("");
        return;
      }
      let year = "";
      if (check.withYear) {
        year = String((dateField && dateField.value) || "").slice(0, 4);
        if (!/^\d{4}$/.test(year)) {
          numberField.setCustomValidity("");
          return;
        }
      }
      const allow = check.allow || {};
      const years = allow.years || (allow.year ? [allow.year] : []);
      const allowed = allow.number && admissionPad(allow.number) === number && (!check.withYear || years.includes(year));
      let used = [];
      if (check.usedBySchool && check.schoolField) {
        const sel = form.querySelector(`[name="${check.schoolField}"]`);
        used = (sel && check.usedBySchool[sel.value]) || [];
      } else if (check.withYear) {
        used = (check.usedByYear && check.usedByYear[year]) || [];
      } else {
        used = check.usedNumbers || [];
      }
      numberField.setCustomValidity(!allowed && used.includes(number) ? `Admission No. ${number} is already used` : "");
    };
    numberField.addEventListener("input", paint);
    if (dateField) dateField.addEventListener("change", paint);
    if (check.schoolField) {
      const sel = form.querySelector(`[name="${check.schoolField}"]`);
      if (sel) sel.addEventListener("change", paint);
    }
    paint();
  }

  function openForm({ title, intro, fields, submitLabel = "Save", onSubmit, loginPreview, admissionCheck }) {
    const previewHtml = loginPreview
      ? `<div class="login-preview"><div><b>User ID:</b> <span data-login-id></span></div><div><b>password:</b> ${esc(loginPreview.password)}</div></div>`
      : "";
    const m = modal(
      title,
      `<form>${intro ? `<p class="muted">${intro}</p>` : ""}${fields.map(fieldHtml).join("")}
        ${previewHtml}
        <div class="form-error" hidden></div>
        <div class="modal-actions"><button type="button" class="btn btn-light" data-close>Cancel</button>
        <button type="submit" class="btn">${esc(submitLabel)}</button></div></form>`
    );
    const form = m.body.querySelector("form");
    form.querySelectorAll("[data-mobile]").forEach(bindMobileInput);
    form.querySelectorAll("[data-person]").forEach(bindPersonName);
    if (admissionCheck) bindAdmissionCheck(form, admissionCheck);
    const errorEl = form.querySelector(".form-error");
    if (loginPreview) {
      const slot = form.querySelector("[data-login-id]");
      const paint = () => { slot.textContent = previewLoginId(form, loginPreview); };
      if (loginPreview.suggest) {
        const numberField = form.admission_number;
        const dateField = form.admission_date || form.joining_date;
        if (dateField && !dateField.value) dateField.value = todayIso();
        const applySuggestion = () => {
          if (!numberField || numberField.dataset.userEdited === "1") return;
          const next = suggestedAdmission(form, loginPreview);
          if (!next) return;
          numberField.value = next;
        };
        if (numberField) {
          numberField.addEventListener("input", (e) => {
            if (e.isTrusted) numberField.dataset.userEdited = "1";
          });
        }
        if (dateField) dateField.addEventListener("change", applySuggestion);
        if (loginPreview.schoolField) {
          const sel = form.querySelector(`[name="${loginPreview.schoolField}"]`);
          if (sel) sel.addEventListener("change", applySuggestion);
        }
        applySuggestion();
      }
      form.addEventListener("input", paint);
      form.addEventListener("change", paint);
      paint();
    }
    const submit = form.querySelector('button[type="submit"]');
    const first = form.querySelector("input:not([type=hidden]), select, textarea");
    if (first) first.focus();
    form.querySelectorAll("[data-photo-for]").forEach((btn) => {
      const label = btn.innerHTML;
      btn.addEventListener("click", async () => {
        errorEl.hidden = true;
        let files = [];
        try {
          files = await pickFiles({ accept: "image/png,image/jpeg,image/webp" });
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.hidden = false;
          return;
        }
        if (!files.length) return;
        btn.disabled = true;
        btn.innerHTML = `${spinner()} Saving photo`;
        try {
          const file = await uploadFile(files[0], { icon: true });
          form.querySelector(`[name="${btn.dataset.photoFor}"]`).value = file;
          const preview = form.querySelector(`[data-photo-preview="${btn.dataset.photoFor}"]`);
          preview.innerHTML = `<img src="${fileUrl(file)}" alt="" class="avatar-img">`;
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.hidden = false;
        } finally {
          btn.disabled = false;
          btn.innerHTML = label;
        }
      });
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      submit.disabled = true;
      errorEl.hidden = true;
      try {
        const result = await onSubmit(values);
        m.close();
        if (result && result.message) toast(result.message);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
      } finally {
        submit.disabled = false;
      }
    });
    return m;
  }

  /** Show each WhatsApp message and recipient, then send only the checked ones. */
  async function whatsappPreview({ title, fetchPreview, send, emptyMessage }) {
    let data;
    try {
      data = await fetchPreview();
    } catch (e) {
      toast(e.message, "error");
      return;
    }
    const people = data.recipients || [];
    if (!people.length) {
      toast(emptyMessage || "Nobody with dues matches this message.", "error");
      return;
    }
    const rows = people.map((p) => {
      const phones = p.phones || [];
      const who = phones.length ? phones.map((ph) => `${ph.label} ${ph.number}`).join(", ") : "No WhatsApp number";
      return `<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:10px">
        <label style="display:flex;gap:8px;align-items:flex-start;font-weight:600">
          <input type="checkbox" class="wa-pick" data-id="${esc(p.student_id)}" ${phones.length ? "checked" : "disabled"} style="width:auto;margin-top:4px">
          <span>${esc(p.name)} <span class="muted" style="font-weight:400">${esc(p.class_label || "")}</span>
            <div class="small" style="font-weight:400">To: ${esc(who)}</div></span>
        </label>
        <textarea class="wa-msg" data-id="${esc(p.student_id)}" ${phones.length ? "" : "disabled"}>${esc(p.message || "")}</textarea>
      </div>`;
    }).join("");
    const m = modal(title, `
      <p class="small muted">Uncheck anyone you do not want to message. Edit a message to change it for that family only.</p>
      <div class="field"><label for="wa-extra">Add this to every message</label>
        <textarea id="wa-extra" placeholder="Optional. Added before the school signature."></textarea></div>
      <div class="toolbar"><label style="display:flex;gap:8px;align-items:center;font-weight:400;margin:0">
        <input type="checkbox" id="wa-all" checked style="width:auto"> Check all</label>
        <span class="small muted" id="wa-count"></span></div>
      ${rows}
      <div class="form-error" hidden></div>
      <div class="modal-actions"><button type="button" class="btn btn-light" data-close>Cancel</button>
        <button type="button" class="btn" id="wa-send"><i class="fa fa-whatsapp"></i> Send selected</button></div>`, { wide: true });
    const root = m.body;
    const picks = () => [...root.querySelectorAll(".wa-pick")].filter((c) => !c.disabled);
    const chosen = () => picks().filter((c) => c.checked);
    const count = () => { root.querySelector("#wa-count").textContent = `${chosen().length} of ${picks().length} selected`; };
    count();
    root.querySelector("#wa-all").addEventListener("change", (e) => {
      picks().forEach((c) => { c.checked = e.target.checked; });
      count();
    });
    root.querySelectorAll(".wa-pick").forEach((c) => c.addEventListener("change", () => {
      const all = root.querySelector("#wa-all");
      all.checked = picks().length > 0 && picks().every((x) => x.checked);
      count();
    }));
    const err = root.querySelector(".form-error");
    root.querySelector("#wa-send").addEventListener("click", async () => {
      const picked = chosen();
      if (!picked.length) {
        err.textContent = "Select at least one person.";
        err.hidden = false;
        return;
      }
      const messages = {};
      const student_ids = [];
      for (const box of picked) {
        const text = root.querySelector(`.wa-msg[data-id="${CSS.escape(box.dataset.id)}"]`).value.trim();
        if (!text) {
          err.textContent = "A selected message is empty.";
          err.hidden = false;
          return;
        }
        student_ids.push(box.dataset.id);
        messages[box.dataset.id] = text;
      }
      const btn = root.querySelector("#wa-send");
      btn.disabled = true;
      err.hidden = true;
      try {
        const result = await send({ student_ids, messages, extra: root.querySelector("#wa-extra").value });
        m.close();
        if (result && result.message) toast(result.message);
      } catch (e) {
        err.textContent = e.message;
        err.hidden = false;
        btn.disabled = false;
      }
    });
  }

  // ---------- printing ----------
  function schoolHeader() {
    const s = state.school || {};
    return `<div class="print-head"><h2>${esc(s.name || "")}</h2>
      <p>${esc(s.address || "")}</p>
      <p>${esc((s.phones || []).join(", "))}${s.email ? " | " + esc(s.email) : ""}</p></div>`;
  }

  function printDoc(title, html) {
    let area = document.getElementById("print-area");
    if (!area) {
      area = document.createElement("div");
      area.id = "print-area";
      document.body.appendChild(area);
    }
    area.innerHTML = `<div class="print-doc">${schoolHeader()}${html}</div>`;
    document.body.classList.add("printing");
    if (window.MPSAndroid && typeof window.MPSAndroid.printPage === "function") {
      window.MPSAndroid.printPage(title);
    } else {
      window.print();
    }
  }

  // ---------- app shell ----------
  function startApp({ role, portalName, modules, userSub }) {
    const session = MPS.session();
    if (!session || !session.token) {
      location.replace("login.html");
      return;
    }
    if (session.role !== role) {
      location.replace(session.home || "login.html");
      return;
    }
    state.school = session.school || {};
    const ctx = {
      role,
      user: session.user,
      get school() {
        return state.school;
      },
      navigate: (id) => {
        if (location.hash === "#" + id) route();
        else location.hash = id;
      },
      refresh: () => route(),
      noteApprovals: () => paintApprovalCount(),
    };

    let lastGroup = null;
    const nav = modules
      .map((m) => {
        const heading = m.group && m.group !== lastGroup ? `<div class="nav-group">${esc(m.group)}</div>` : "";
        lastGroup = m.group || lastGroup;
        const label = m.id === "approvals"
          ? `<span class="nav-label">${esc(m.label)}<span data-approvals></span></span>`
          : esc(m.label);
        return `${heading}<a href="#${m.id}" data-id="${m.id}"><i class="fa ${m.icon}"></i>${label}</a>`;
      })
      .join("");

    document.body.innerHTML = `<div class="app-shell" id="shell">
      <aside class="sidebar">
        <div class="brand"><div class="logo" id="schoolShort"></div><div><strong id="schoolName"></strong><span>${esc(portalName)}</span></div></div>
        <div class="user-chip"><div class="avatar" id="userAvatar"></div><div><strong id="userName"></strong><span id="userSub"></span></div></div>
        <nav class="nav">${nav}</nav>
      </aside>
      <div class="backdrop" id="backdrop"></div>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" id="menuBtn" aria-label="Menu"><i class="fa fa-bars"></i></button>
          <h1 id="pageTitle"></h1>
          <div class="top-actions">
            <a class="btn btn-light btn-sm" id="schoolWebsite" target="_blank" rel="noopener" title="School website" hidden><i class="fa fa-globe"></i><span>Website</span></a>
            <button class="btn btn-light btn-sm" id="logoutBtn"><i class="fa fa-sign-out"></i><span>Logout</span></button>
          </div>
        </header>
        <main class="view" id="view"></main>
      </div>
    </div><div id="print-area"></div>`;

    const shell = document.getElementById("shell");
    const view = document.getElementById("view");

    function paintUser() {
      document.getElementById("userAvatar").innerHTML = avatar(ctx.user.name, ctx.user.photo);
      document.getElementById("userName").textContent = ctx.user.name;
      document.getElementById("userSub").textContent = userSub(ctx.user);
    }
    paintUser();

    function paintSchool() {
      const s = state.school || {};
      const logo = document.getElementById("schoolShort");
      if (s.photo) {
        logo.textContent = "";
        logo.classList.add("has-icon");
        logo.innerHTML = `<img src="${fileUrl(s.photo)}" alt="">`;
        document.getElementById("schoolName").textContent = s.name || MPS_CONFIG.PRODUCT_NAME;
      } else if (!s.name && !s.short_name) {
        logo.textContent = "";
        logo.classList.add("has-icon");
        logo.innerHTML = '<img src="image/campus-badge.png" alt="RV Smart School">';
        document.getElementById("schoolName").textContent = MPS_CONFIG.PRODUCT_NAME;
      } else {
        logo.classList.remove("has-icon");
        logo.replaceChildren();
        logo.textContent = s.short_name || initials(s.name);
        document.getElementById("schoolName").textContent = s.name || MPS_CONFIG.PRODUCT_NAME;
      }
      const website = document.getElementById("schoolWebsite");
      website.hidden = !s.website;
      if (s.website) website.href = s.website;
    }
    paintSchool();

    function paintApprovalCount() {
      const slot = document.querySelector("[data-approvals]");
      if (!slot) return;
      MPS.get("/me/approvals-count").then((d) => {
        slot.textContent = `(${d.count})`;
      }).catch(() => null);
    }

    async function route() {
      const id = location.hash.replace("#", "") || modules[0].id;
      const mod = modules.find((m) => m.id === id) || modules[0];
      shell.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.id === mod.id));
      document.getElementById("pageTitle").textContent = mod.label;
      document.title = `${mod.label} | ${state.school.name || MPS_CONFIG.PRODUCT_NAME}`;
      shell.classList.remove("nav-open");
      const host = document.createElement("div");
      host.className = "stack";
      host.innerHTML = loading();
      view.replaceChildren(host);
      window.scrollTo(0, 0);
      try {
        await mod.render(host, ctx);
      } catch (e) {
        host.innerHTML = errorBox(e.message);
      }
      paintApprovalCount();
    }

    document.getElementById("menuBtn").addEventListener("click", () => shell.classList.toggle("nav-open"));
    document.getElementById("backdrop").addEventListener("click", () => shell.classList.remove("nav-open"));
    document.getElementById("logoutBtn").addEventListener("click", () => {
      MPS.post("/auth/logout")
        .catch(() => null)
        .finally(() => {
          MPS.clearSession();
          location.replace("login.html");
        });
    });
    window.addEventListener("hashchange", route);
    route();

    MPS.get("/auth/me")
      .then((data) => {
        ctx.user = data.user;
        state.school = data.school || {};
        MPS.saveSession({ ...MPS.session(), user: data.user, school: data.school, home: data.home });
        paintUser();
        paintSchool();
      })
      .catch(() => null);
  }

  // ---------- modules shared by both portals ----------
  const shared = {
    async notices(view) {
      const { notices } = await MPS.get("/notices");
      view.innerHTML = card(
        "Notices & Circulars",
        notices.length
          ? `<ul class="list">${notices
              .map(
                (n) => `<li>${dateChip(n.date)}<div class="grow"><div class="title">${esc(n.title)} ${n.class_label ? badge(n.class_label, "neutral") : ""}</div>
                <p class="pre">${esc(n.body)}</p><div class="meta">Posted by ${esc(n.posted_by)} on ${fmtDate(n.date)}</div></div></li>`
              )
              .join("")}</ul>`
          : empty("No notices right now.", "fa-bullhorn"),
        { icon: "fa-bullhorn", flush: true }
      );
    },

    async events(view) {
      const { events } = await MPS.get("/events");
      const today = todayIso();
      const list = (items, emptyText) =>
        items.length
          ? `<ul class="list">${items
              .map(
                (e) => `<li>${dateChip(e.date)}<div class="grow"><div class="title">${esc(e.title)}</div>
                ${e.description ? `<div class="meta">${esc(e.description)}</div>` : ""}<div class="meta">${esc(eventSpan(e))}</div></div></li>`
              )
              .join("")}</ul>`
          : empty(emptyText, "fa-calendar");
      const ends = (e) => e.end_date || e.date;
      const upcoming = events.filter((e) => ends(e) >= today);
      view.innerHTML = `<div class="grid grid-2">
        ${card("Upcoming Events", list(upcoming.filter((e) => e.type === "event"), "No upcoming events."), { icon: "fa-star", flush: true })}
        ${card("Holidays", list(upcoming.filter((e) => e.type === "holiday"), "No upcoming holidays."), { icon: "fa-sun-o", flush: true })}
      </div>
      ${card("Past Events & Holidays", list(events.filter((e) => ends(e) < today).reverse(), "Nothing yet."), { icon: "fa-history", flush: true })}`;
    },

    async password(view) {
      view.innerHTML = card(
        "Change Password",
        `<form id="pwForm" style="max-width:420px">
          ${fieldHtml({ name: "current_password", label: "Current password", type: "password", required: true, autocomplete: "current-password" })}
          ${fieldHtml({ name: "new_password", label: "New password", type: "password", required: true, minlength: 5, autocomplete: "new-password", hint: "At least 5 characters" })}
          ${fieldHtml({ name: "confirm_password", label: "Confirm new password", type: "password", required: true, minlength: 5, autocomplete: "new-password" })}
          <div class="form-error" hidden></div>
          <button class="btn" type="submit"><i class="fa fa-key"></i> Update Password</button>
        </form>`,
        { icon: "fa-key" }
      );
      const form = view.querySelector("#pwForm");
      const errorEl = form.querySelector(".form-error");
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(form).entries());
        errorEl.hidden = true;
        if (values.new_password !== values.confirm_password) {
          errorEl.textContent = "New passwords do not match";
          errorEl.hidden = false;
          return;
        }
        try {
          const result = await MPS.post("/auth/password/change", values);
          MPS.saveSession({ ...MPS.session(), token: result.token });
          form.reset();
          toast("Password changed successfully");
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.hidden = false;
        }
      });
    },

    async library(view, path) {
      const data = await MPS.get(path);
      const issued = table(
        [
          { label: "Book", render: (r) => `<b>${esc(r.title)}</b><div class="small muted">${esc(r.author)}</div>` },
          { label: "Issued", render: (r) => fmtDate(r.issued_on), className: "nowrap" },
          { label: "Due", render: (r) => fmtDate(r.due_on), className: "nowrap" },
          { label: "Returned", render: (r) => fmtDate(r.returned_on), className: "nowrap" },
          { label: "Status", render: (r) => badge(r.status) + (r.overdue_days ? `<div class="small muted">${r.overdue_days} day(s) late</div>` : "") },
          { label: "Fine", render: (r) => (r.fine ? money(r.fine) : "-"), className: "right" },
        ],
        data.issued,
        { empty: "No books issued.", emptyIcon: "fa-book" }
      );
      view.innerHTML = `${card("My Books", issued, { icon: "fa-book", flush: true, actions: `<span class="small muted">Fine: ${money(data.fine_per_day)}/day after due date</span>` })}
        ${card("Library Catalogue", `<div style="padding:14px 18px 0"><input id="bookSearch" placeholder="Search by title, author or category"></div><div id="catalog"></div>`, { icon: "fa-search", flush: true })}`;
      const renderCatalog = (q) => {
        const term = q.trim().toLowerCase();
        const books = data.catalog.filter((b) => !term || `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(term));
        view.querySelector("#catalog").innerHTML = table(
          [
            { label: "Title", render: (b) => `<b>${esc(b.title)}</b>` },
            { label: "Author", key: "author" },
            { label: "Category", key: "category" },
            { label: "Available", render: (b) => (b.available > 0 ? badge(`${b.available} of ${b.copies}`, "success") : badge("Not available", "danger")) },
          ],
          books,
          { empty: "No matching books." }
        );
      };
      renderCatalog("");
      view.querySelector("#bookSearch").addEventListener("input", (e) => renderCatalog(e.target.value));
    },

    async timetable(view, path, slot) {
      const { days, periods } = await MPS.get(path);
      const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
      const numbers = [...new Set(periods.map((p) => p.period))].sort((a, b) => a - b);
      const times = {};
      periods.forEach((p) => (times[p.period] = `${fmtTime(p.start)} - ${fmtTime(p.end)}`));
      const cell = (day, n) => {
        const p = periods.find((x) => x.day === day && x.period === n);
        return `<td class="slot ${day === today ? "today" : ""}">${p ? slot(p) : '<span class="muted">-</span>'}</td>`;
      };
      const rows = numbers
        .map((n) => `<tr><td class="period-col"><b>Period ${n}</b>${times[n]}</td>${days.map((d) => cell(d, n)).join("")}</tr>`)
        .join("");
      const grid = periods.length
        ? `<div class="table-wrap"><table class="table timetable"><thead><tr><th>Time</th>${days
            .map((d) => `<th class="${d === today ? "today" : ""}">${d}</th>`)
            .join("")}</tr></thead><tbody>${rows}</tbody></table></div>`
        : empty("Timetable not published yet.", "fa-clock-o");
      view.innerHTML = card("Weekly Timetable", grid, { icon: "fa-clock-o", flush: true, actions: '<span class="small muted">Break: 10:00 - 10:20 AM</span>' });
    },
  };

  return {
    esc,
    fmtDate,
    eventSpan,
    fmtTime,
    fmtDateTime,
    fmtMonth,
    money,
    initials,
    fileUrl,
    avatar,
    uploadFile,
    pickAndUpload,
    todayIso,
    badge,
    card,
    stat,
    empty,
    loading,
    errorBox,
    table,
    kv,
    progress,
    dateChip,
    tabs,
    onTabs,
    toast,
    run,
    modal,
    whatsappPreview,
    fieldHtml,
    openForm,
    admissionDate,
    printDoc,
    startApp,
    shared,
    state,
  };
})();
