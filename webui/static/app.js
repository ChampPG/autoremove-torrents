(function () {
  const CLIENTS = ["qbittorrent", "transmission", "utorrent"];

  const formView = document.getElementById("form-view");
  const rawView = document.getElementById("raw-view");
  const formContainer = document.getElementById("form-container");
  const editor = document.getElementById("editor");
  const editorError = document.getElementById("editor-error");
  const output = document.getElementById("output");
  const btnViewForm = document.getElementById("btn-view-form");
  const btnViewRaw = document.getElementById("btn-view-raw");
  const btnReload = document.getElementById("btn-reload");
  const btnSave = document.getElementById("btn-save");
  const btnAddTask = document.getElementById("btn-add-task");
  const btnPreview = document.getElementById("btn-preview");
  const btnRun = document.getElementById("btn-run");

  let currentView = "form";
  let lastRaw = "";
  let lastParsed = null;

  function setError(msg) {
    editorError.textContent = msg || "";
    editorError.hidden = !msg;
  }

  function setOutput(text, isEmpty) {
    output.textContent = text || "";
    output.classList.toggle("empty", isEmpty);
  }

  function setLoading(btn, on) {
    btn.disabled = on;
    btn.dataset.loading = on ? "1" : "";
  }

  function setView(view) {
    currentView = view;
    btnViewForm.classList.toggle("active", view === "form");
    btnViewRaw.classList.toggle("active", view === "raw");
    formView.hidden = view !== "form";
    rawView.hidden = view !== "raw";
    if (view === "form" && lastParsed && lastParsed.tasks) {
      renderForm(lastParsed.tasks);
    } else if (view === "raw") {
      editor.value = lastRaw;
    }
  }

  async function api(method, url, body) {
    const opt = { method };
    if (body) {
      opt.headers = { "Content-Type": "application/json" };
      opt.body = JSON.stringify(body);
    }
    const res = await fetch(url, opt);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  function strategyRow(strat) {
    const tr = document.createElement("tr");
    tr.className = "strategy-row";
    tr.innerHTML = `
      <td><input type="text" class="input strategy-name" value="${escapeAttr(strat.name)}" placeholder="strategy name" /></td>
      <td><input type="text" class="input strategy-categories" value="${escapeAttr(strat.categories)}" placeholder="e.g. autobrr-ipt" /></td>
      <td><input type="text" class="input strategy-remove" value="${escapeAttr(strat.remove)}" placeholder="e.g. seeding_time &gt; 388800" /></td>
      <td><button type="button" class="btn btn-ghost btn-sm btn-remove-strategy" title="Remove strategy">×</button></td>
    `;
    return tr;
  }

  function escapeAttr(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function taskCard(task) {
    const card = document.createElement("div");
    card.className = "task-card";
    const stratRows = (task.strategies || []).map((s) => strategyRow(s));
    const stratRowsHtml = stratRows.map((r) => r.outerHTML).join("");
    card.innerHTML = `
      <div class="task-header">
        <h3 class="task-title">Task</h3>
        <button type="button" class="btn btn-ghost btn-sm btn-remove-task" title="Remove task">Remove task</button>
      </div>
      <div class="form-grid">
        <label class="field">
          <span class="field-label">Task name</span>
          <input type="text" class="input task-name" value="${escapeAttr(task.name)}" placeholder="my_task" />
        </label>
        <label class="field">
          <span class="field-label">Client</span>
          <select class="input task-client">${CLIENTS.map((c) => `<option value="${c}" ${c === (task.client || "qbittorrent") ? "selected" : ""}>${c}</option>`).join("")}</select>
        </label>
        <label class="field field-wide">
          <span class="field-label">Host</span>
          <input type="text" class="input task-host" value="${escapeAttr(task.host)}" placeholder="http://127.0.0.1:8080" />
        </label>
        <label class="field">
          <span class="field-label">Username</span>
          <input type="text" class="input task-username" value="${escapeAttr(task.username)}" autocomplete="off" />
        </label>
        <label class="field">
          <span class="field-label">Password</span>
          <input type="password" class="input task-password" value="${escapeAttr(task.password)}" autocomplete="new-password" />
        </label>
        <label class="field field-check">
          <input type="checkbox" class="input task-delete-data" ${task.delete_data ? "checked" : ""} />
          <span class="field-label">Delete data</span>
        </label>
      </div>
      <div class="strategies-block">
        <span class="strategies-label">Strategies</span>
        <table class="strategy-table">
          <thead><tr><th>Name</th><th>Categories</th><th>Remove</th><th></th></tr></thead>
          <tbody class="strategy-tbody">${stratRowsHtml}</tbody>
        </table>
        <button type="button" class="btn btn-ghost btn-sm btn-add-strategy">+ Add strategy</button>
      </div>
    `;

    const tbody = card.querySelector(".strategy-tbody");
    tbody.addEventListener("click", (e) => {
      if (e.target.classList.contains("btn-remove-strategy")) e.target.closest("tr")?.remove();
    });
    card.querySelector(".btn-add-strategy").onclick = () => {
      tbody.appendChild(strategyRow({ name: "", categories: "", remove: "" }));
    };
    card.querySelector(".btn-remove-task").onclick = () => card.remove();
    return card;
  }

  function renderForm(tasks) {
    formContainer.innerHTML = "";
    if (!tasks || tasks.length === 0) {
      formContainer.innerHTML = '<p class="form-empty">No tasks. Add one below or switch to Raw YAML.</p>';
    } else {
      tasks.forEach((t) => formContainer.appendChild(taskCard(t)));
    }
  }

  function collectTasks() {
    const cards = formContainer.querySelectorAll(".task-card");
    const tasks = [];
    cards.forEach((card) => {
      const name = (card.querySelector(".task-name")?.value || "").trim();
      const rows = card.querySelectorAll(".strategy-row");
      const strategies = [];
      rows.forEach((r) => {
        const sname = (r.querySelector(".strategy-name")?.value || "").trim();
        const remove = (r.querySelector(".strategy-remove")?.value || "").trim();
        if (!sname || !remove) return;
        strategies.push({
          name: sname,
          categories: (r.querySelector(".strategy-categories")?.value || "").trim(),
          remove,
        });
      });
      tasks.push({
        name: name || "my_task",
        client: card.querySelector(".task-client")?.value || "qbittorrent",
        host: (card.querySelector(".task-host")?.value || "").trim(),
        username: (card.querySelector(".task-username")?.value || "").trim(),
        password: (card.querySelector(".task-password")?.value || "").trim(),
        delete_data: !!card.querySelector(".task-delete-data")?.checked,
        strategies,
      });
    });
    return tasks;
  }

  async function loadConfig() {
    setError("");
    try {
      const { raw, parsed, error } = await api("GET", "/api/config");
      lastRaw = raw || "";
      lastParsed = parsed || null;
      if (error) {
        setError(error);
        setView("raw");
        editor.value = lastRaw;
      } else {
        if (currentView === "form" && lastParsed?.tasks) {
          renderForm(lastParsed.tasks);
        } else if (currentView === "raw") {
          editor.value = lastRaw;
        }
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveConfig() {
    setError("");
    setLoading(btnSave, true);
    try {
      if (currentView === "form") {
        const tasks = collectTasks();
        await api("POST", "/api/config", { tasks });
      } else {
        await api("POST", "/api/config", { raw: editor.value });
      }
      setError("");
      await loadConfig();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(btnSave, false);
    }
  }

  async function run(view) {
    const btn = view ? btnPreview : btnRun;
    setLoading(btn, true);
    setOutput("Running…", false);
    try {
      const { ok, output: out } = await api("POST", view ? "/api/preview" : "/api/run", {});
      setOutput(out || (ok ? "Done." : "No output."), false);
    } catch (e) {
      setOutput("Error: " + e.message, false);
    } finally {
      setLoading(btn, false);
    }
  }

  btnViewForm.addEventListener("click", () => setView("form"));
  btnViewRaw.addEventListener("click", () => setView("raw"));
  btnReload.addEventListener("click", loadConfig);
  btnSave.addEventListener("click", saveConfig);
  btnAddTask.addEventListener("click", () => {
    const empty = formContainer.querySelector(".form-empty");
    if (empty) empty.remove();
    formContainer.appendChild(
      taskCard({
        name: "my_task",
        client: "qbittorrent",
        host: "",
        username: "",
        password: "",
        delete_data: false,
        strategies: [{ name: "my_strategy", categories: "", remove: "seeding_time > 0" }],
      }, 0)
    );
  });
  btnPreview.addEventListener("click", () => run(true));
  btnRun.addEventListener("click", () => run(false));

  loadConfig();
  setOutput("", true);
})();
