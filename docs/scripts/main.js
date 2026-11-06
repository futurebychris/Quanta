(function () {
  "use strict";

  var state = {
    runs: [],
    selectedRunId: 39,
    metric: "returnOnCapital",
    sortKey: "id",
    sortDirection: "asc"
  };

  var METRICS = {
    returnOnCapital: {
      title: "Return on capital",
      description: "Normalized simulated PnL divided by session capital. This is not a risk-adjusted measure.",
      getValue: function (run) { return run.metrics.returnOnCapital; },
      format: formatSignedPercent,
      formatAxis: formatPercent,
      negative: false
    },
    maxDrawdown: {
      title: "Maximum drawdown / capital",
      description: "Largest peak-to-trough decline in the simulated equity path, divided by session capital.",
      getValue: function (run) { return run.metrics.maxDrawdownCapital; },
      format: formatSignedPercent,
      formatAxis: formatPercent,
      negative: true
    },
    tradeCount: {
      title: "Completed simulated trades",
      description: "Count of completed simulated trades stored for each historical backtest.",
      getValue: function (run) { return run.metrics.tradeCount; },
      format: formatInteger,
      formatAxis: formatInteger,
      negative: false
    },
    winRate: {
      title: "Historical win rate",
      description: "Share of completed simulated trades with positive PnL. This does not imply future performance.",
      getValue: function (run) { return run.metrics.winRate; },
      format: formatUnsignedPercent,
      formatAxis: formatPercent,
      negative: false
    },
    profitFactor: {
      title: "Historical profit factor",
      description: "Gross simulated gains divided by absolute gross simulated losses. Execution costs are excluded.",
      getValue: function (run) { return run.metrics.profitFactor; },
      format: formatRatio,
      formatAxis: formatRatio,
      negative: false
    }
  };

  var ARCHITECTURE = {
    market: {
      label: "IMPLEMENTED · DATA FOUNDATION",
      title: "Canonical historical inputs",
      copy: "Quanta constrains research to regular-session, minute-level bars and routes replay through the same indicator and decision path used by the strategy engine.",
      contract: "CONTRACT / CAUSAL INPUTS ONLY"
    },
    strategy: {
      label: "IMPLEMENTED · DETERMINISTIC ENGINE",
      title: "Strategy 8887 proposes opportunities",
      copy: "The rules-based engine evaluates completed bars, applies a fixed decision order, and emits raw candidates before operational gates determine whether a simulated position can open.",
      contract: "CONTRACT / SAME PER-BAR PATH"
    },
    candidate: {
      label: "IMPLEMENTED · RESEARCH CONTRACTS",
      title: "Candidates survive execution history",
      copy: "Immutable CandidateEvent records preserve accepted and blocked opportunities. CandidateOutcome labels each one independently without pretending that it was an executed portfolio trade.",
      contract: "CONTRACT / EVENT ≠ ORDER ≠ OUTCOME"
    },
    model: {
      label: "RESEARCH · NO FITTED ARTIFACT",
      title: "TAKE / SKIP is a narrow filter",
      copy: "The frozen feature, target, and validation contracts are implemented. Logistic Regression and XGBoost fitting remain planned; this repository does not support a trained-model claim.",
      contract: "ROLE / FILTER CANDIDATES ONLY"
    },
    risk: {
      label: "IMPLEMENTED · FINAL AUTHORITY",
      title: "Risk remains deterministic",
      copy: "A future TAKE decision would still pass through deterministic cash, session, concurrency, barrier, and flattening rules. Model output cannot bypass those controls.",
      contract: "AUTHORITY / RULES OVERRIDE MODEL"
    },
    broker: {
      label: "LOCKED · OUTSIDE PUBLIC SYSTEM",
      title: "Brokerage is isolated",
      copy: "This static website contains no credentials, authenticated clients, account data, quotes, positions, streaming, or order controls. The connection boundary remains unchanged.",
      contract: "BOUNDARY / NO PUBLIC CONNECTION"
    }
  };

  function query(selector, root) {
    return (root || document).querySelector(selector);
  }

  function queryAll(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === "string") node.textContent = text;
    return node;
  }

  function formatMoney(value) {
    if (!Number.isFinite(value)) return "—";
    var absolute = Math.abs(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return (value > 0 ? "+$" : value < 0 ? "-$" : "$") + absolute;
  }

  function formatCapital(value) {
    return "$" + Number(value).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatSignedPercent(value) {
    if (!Number.isFinite(value)) return "—";
    return (value > 0 ? "+" : "") + (value * 100).toFixed(2) + "%";
  }

  function formatUnsignedPercent(value) {
    if (!Number.isFinite(value)) return "—";
    return (value * 100).toFixed(1) + "%";
  }

  function formatPercent(value) {
    if (!Number.isFinite(value)) return "—";
    return (Math.abs(value) * 100).toFixed(value === 0 ? 0 : 2) + "%";
  }

  function formatInteger(value) {
    if (!Number.isFinite(value)) return "—";
    return Math.round(value).toLocaleString("en-US");
  }

  function formatRatio(value) {
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(2);
  }

  function initNavigation() {
    var toggle = query("[data-nav-toggle]");
    var nav = query("[data-site-nav]");
    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!open));
        nav.classList.toggle("is-open", !open);
      });
      queryAll("a", nav).forEach(function (link) {
        link.addEventListener("click", function () {
          toggle.setAttribute("aria-expanded", "false");
          nav.classList.remove("is-open");
        });
      });
    }

    if (!("IntersectionObserver" in window)) return;
    var links = queryAll(".site-nav a");
    var linkById = new Map();
    links.forEach(function (link) {
      linkById.set(link.getAttribute("href").slice(1), link);
    });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (link) { link.removeAttribute("aria-current"); });
        var active = linkById.get(entry.target.id);
        if (active) active.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-20% 0px -68% 0px", threshold: 0 });
    linkById.forEach(function (_, id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  function initArchitecture() {
    var buttons = queryAll("[data-architecture]");
    var label = query("#architecture-detail-label");
    var title = query("#architecture-detail-title");
    var copy = query("#architecture-detail-copy");
    var contract = query("#architecture-detail-contract");
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var item = ARCHITECTURE[button.dataset.architecture];
        if (!item) return;
        buttons.forEach(function (candidate) {
          candidate.classList.remove("is-active");
          candidate.setAttribute("aria-pressed", "false");
        });
        button.classList.add("is-active");
        button.setAttribute("aria-pressed", "true");
        label.textContent = item.label;
        title.textContent = item.title;
        copy.textContent = item.copy;
        contract.textContent = item.contract;
      });
    });
  }

  function selectedRun() {
    return state.runs.find(function (run) { return run.id === state.selectedRunId; }) || state.runs[0];
  }

  function selectRun(id) {
    if (!state.runs.some(function (run) { return run.id === id; })) return;
    state.selectedRunId = id;
    updateInspector();
    renderChart();
    renderTable();
  }

  function updateInspector() {
    var run = selectedRun();
    if (!run) return;
    query("[data-inspector-name]").textContent = run.name;
    query("[data-inspector-id]").textContent = "RUN " + run.id + (run.baseline ? " · BASELINE ANCHOR" : " · HISTORICAL SNAPSHOT");
    query("[data-inspector-period]").textContent = run.period.from + " — " + run.period.to;
    query("[data-inspector-capital]").textContent = formatCapital(run.capital);
    query("[data-inspector-pnl]").textContent = formatMoney(run.metrics.totalPnl);
    query("[data-inspector-trades]").textContent = formatInteger(run.metrics.tradeCount);
    query("[data-inspector-drawdown]").textContent = formatMoney(run.metrics.maxDrawdown);
    query("[data-inspector-pf]").textContent = formatRatio(run.metrics.profitFactor);
  }

  function showTooltip(event, run, metric) {
    var tooltip = query("#chart-tooltip");
    tooltip.textContent = run.name + " · " + metric.format(metric.getValue(run)) + " · " + run.period.from + " to " + run.period.to;
    tooltip.hidden = false;
    var rect = event.currentTarget.getBoundingClientRect();
    var x = event.clientX || rect.left + rect.width * 0.55;
    var y = event.clientY || rect.top;
    var left = Math.min(window.innerWidth - 280, Math.max(12, x + 14));
    var top = Math.max(12, y - 44);
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip() {
    var tooltip = query("#chart-tooltip");
    tooltip.hidden = true;
  }

  function renderChart() {
    var host = query("#comparison-chart");
    if (!host || !state.runs.length) return;
    var metric = METRICS[state.metric];
    var values = state.runs.map(function (run) { return Math.abs(metric.getValue(run)); });
    var maximum = Math.max.apply(null, values.concat([0.0001]));
    query("#comparison-title").textContent = metric.title;
    query("#chart-summary").textContent = metric.description;
    query("#chart-axis-max").textContent = metric.formatAxis(maximum);
    host.setAttribute("aria-label", metric.title + " across five historical backtest snapshots");
    host.replaceChildren();

    state.runs.slice().sort(function (a, b) { return a.id - b.id; }).forEach(function (run, index) {
      var value = metric.getValue(run);
      var row = make("button", "bar-row");
      row.type = "button";
      row.dataset.runId = String(run.id);
      row.classList.toggle("is-baseline", run.baseline);
      row.classList.toggle("is-negative", metric.negative || value < 0);
      row.classList.toggle("is-selected", run.id === state.selectedRunId);
      row.setAttribute("aria-label", run.name + ", " + metric.title + " " + metric.format(value) + ". Select experiment.");

      var label = make("span", "bar-label");
      label.appendChild(make("strong", "", run.name));
      label.appendChild(make("small", "", "RUN " + run.id + (run.baseline ? " · BASELINE" : "")));
      var track = make("span", "bar-track");
      var fill = make("span", "bar-fill");
      fill.style.width = Math.max(0.6, Math.abs(value) / maximum * 100) + "%";
      fill.style.animationDelay = index * 35 + "ms";
      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(make("span", "bar-value", metric.format(value)));
      row.addEventListener("click", function () { selectRun(run.id); });
      row.addEventListener("pointerenter", function (event) { showTooltip(event, run, metric); });
      row.addEventListener("pointermove", function (event) { showTooltip(event, run, metric); });
      row.addEventListener("pointerleave", hideTooltip);
      row.addEventListener("focus", function (event) { showTooltip(event, run, metric); });
      row.addEventListener("blur", hideTooltip);
      host.appendChild(row);
    });
  }

  function sortValue(run, key) {
    if (key === "id" || key === "name" || key === "capital") return run[key];
    if (key === "maxDrawdown") return run.metrics.maxDrawdownCapital;
    return run.metrics[key];
  }

  function renderTable() {
    var body = query("#experiment-table-body");
    if (!body || !state.runs.length) return;
    var direction = state.sortDirection === "asc" ? 1 : -1;
    var rows = state.runs.slice().sort(function (a, b) {
      var left = sortValue(a, state.sortKey);
      var right = sortValue(b, state.sortKey);
      if (typeof left === "string") return left.localeCompare(right) * direction;
      return (left - right) * direction;
    });
    body.replaceChildren();
    rows.forEach(function (run) {
      var row = document.createElement("tr");
      row.classList.toggle("is-selected", run.id === state.selectedRunId);
      var id = make("td", "", String(run.id));
      var name = document.createElement("td");
      var select = make("button", "", run.name + (run.baseline ? " · baseline" : ""));
      select.type = "button";
      select.addEventListener("click", function () { selectRun(run.id); });
      name.appendChild(select);
      row.appendChild(id);
      row.appendChild(name);
      row.appendChild(make("td", "", formatCapital(run.capital)));
      row.appendChild(make("td", "", formatSignedPercent(run.metrics.returnOnCapital)));
      row.appendChild(make("td", "", formatSignedPercent(run.metrics.maxDrawdownCapital)));
      row.appendChild(make("td", "", formatInteger(run.metrics.tradeCount)));
      row.appendChild(make("td", "", formatUnsignedPercent(run.metrics.winRate)));
      body.appendChild(row);
    });
  }

  function initMetricControls() {
    queryAll("[data-metric]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.metric = button.dataset.metric;
        queryAll("[data-metric]").forEach(function (candidate) {
          candidate.setAttribute("aria-pressed", String(candidate === button));
        });
        renderChart();
      });
    });
    queryAll("[data-sort]").forEach(function (button) {
      button.addEventListener("click", function () {
        var key = button.dataset.sort;
        if (state.sortKey === key) {
          state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDirection = "asc";
        }
        queryAll("[data-sort]").forEach(function (candidate) {
          candidate.closest("th").removeAttribute("aria-sort");
        });
        button.closest("th").setAttribute("aria-sort", state.sortDirection === "asc" ? "ascending" : "descending");
        renderTable();
      });
    });
  }

  function renderLoadError(error) {
    var chart = query("#comparison-chart");
    var body = query("#experiment-table-body");
    if (chart) {
      chart.replaceChildren(make("p", "chart-loading", "Dashboard data could not be loaded. Serve this directory with the documented local preview command."));
    }
    if (body) {
      var row = document.createElement("tr");
      var cell = make("td", "", "Static data unavailable");
      cell.colSpan = 7;
      row.appendChild(cell);
      body.replaceChildren(row);
    }
    if (window.console && console.error) console.error("Quanta dashboard load failed", error);
  }

  function loadDashboard() {
    return fetch("data/backtest-runs.json", { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
      })
      .then(function (payload) {
        if (!payload || !Array.isArray(payload.runs) || payload.runs.length === 0) {
          throw new Error("Dashboard payload has no runs");
        }
        state.runs = payload.runs;
        var baseline = state.runs.find(function (run) { return run.baseline; });
        state.selectedRunId = baseline ? baseline.id : state.runs[0].id;
        updateInspector();
        renderChart();
        renderTable();
      })
      .catch(renderLoadError);
  }

  initNavigation();
  initArchitecture();
  initMetricControls();
  loadDashboard();
})();
