(function () {
  "use strict";

  var CATEGORY_LABEL = {
    "cybersecurity": "Cybersecurity",
    "ai": "Artificial Intelligence",
    "general-tech": "General Tech",
  };

  var calGrid = document.getElementById("calGrid");
  var calLabel = document.getElementById("calLabel");
  var prevBtn = document.getElementById("prevMonth");
  var nextBtn = document.getElementById("nextMonth");
  var jumpTodayBtn = document.getElementById("jumpToday");
  var panel = document.getElementById("articlePanel");

  var index = [];        // [{date, category, headline}, ...]
  var byDate = {};       // date -> entry
  var viewMonth = new Date();
  viewMonth.setDate(1);
  var selectedDate = null;
  var currentDoc = null; // full loaded day JSON
  var levelIdx = 2;      // default to the middle reading level

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function renderCalendar() {
    var year = viewMonth.getFullYear();
    var month = viewMonth.getMonth();
    calLabel.textContent = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    var firstWeekday = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var today = todayStr();

    calGrid.innerHTML = "";
    for (var i = 0; i < firstWeekday; i++) {
      var filler = document.createElement("div");
      filler.className = "cal-day cal-day--empty";
      calGrid.appendChild(filler);
    }
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = year + "-" + pad(month + 1) + "-" + pad(day);
      var hasEntry = !!byDate[dateStr];
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = day;
      btn.className = "cal-day" + (hasEntry ? " cal-day--has" : "") +
        (dateStr === selectedDate ? " cal-day--selected" : "") +
        (dateStr === today ? " cal-day--today" : "");
      if (hasEntry) {
        btn.title = byDate[dateStr].headline;
        btn.addEventListener("click", function (ds) {
          return function () { selectDate(ds); };
        }(dateStr));
      } else {
        btn.disabled = true;
      }
      calGrid.appendChild(btn);
    }
  }

  function selectDate(dateStr) {
    selectedDate = dateStr;
    levelIdx = 2;
    renderCalendar();
    loadDay(dateStr);
  }

  function loadDay(dateStr) {
    panel.innerHTML = '<p class="empty-state">Loading…</p>';
    fetch("data/" + dateStr + ".json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then(function (doc) {
        currentDoc = doc;
        renderArticle();
      })
      .catch(function () {
        panel.innerHTML = '<p class="empty-state">No Daily Byte was published on ' + dateStr + '.</p>';
      });
  }

  function renderArticle() {
    if (!currentDoc) return;
    var doc = currentDoc;
    var level = doc.levels[levelIdx];
    var catKey = doc.category;
    var catLabel = CATEGORY_LABEL[catKey] || catKey;

    var paragraphs = level.summary
      .split(/\n+/)
      .filter(Boolean)
      .map(function (p) { return "<p>" + escapeHtml(p) + "</p>"; })
      .join("");

    var ticks = doc.levels.map(function (l) { return "<span>" + l.label + "</span>"; }).join("");
    var questions = doc.questions.map(function (q, i) {
      return '<li><span class="num">' + (i + 1) + "</span><span>" + escapeHtml(q) + "</span></li>";
    }).join("");

    panel.innerHTML =
      '<span class="category-badge category-badge--' + catKey + '">' + catLabel + "</span>" +
      '<h2 class="headline">' + escapeHtml(doc.headline) + "</h2>" +
      '<div class="source-line">' + formatDateLong(doc.date) + " · Source: " + escapeHtml(doc.source.name) + "</div>" +
      '<div class="level-control">' +
        '<div class="level-control__top">' +
          '<span class="level-control__label">Reading level: ' + level.label + " (~" + level.approx_lexile + "L)</span>" +
          '<span class="level-control__meta">' + level.reading_time_min + " min read · " + level.word_count + " words</span>" +
        "</div>" +
        '<input type="range" id="levelSlider" min="0" max="' + (doc.levels.length - 1) + '" step="1" value="' + levelIdx + '">' +
        '<div class="level-control__ticks">' + ticks + "</div>" +
      "</div>" +
      '<div class="summary-text">' + paragraphs + "</div>" +
      '<a class="read-more" href="' + doc.source.url + '" target="_blank" rel="noopener">📖 For further reading, see the full article at ' +
        escapeHtml(doc.source.name) + " ↗</a>" +
      '<div class="questions"><h3>Think About It</h3><ol>' + questions + "</ol></div>";

    document.getElementById("levelSlider").addEventListener("input", function (e) {
      levelIdx = parseInt(e.target.value, 10);
      renderArticle();
    });
  }

  function formatDateLong(dateStr) {
    var parts = dateStr.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function jumpToLatestOrToday() {
    var today = todayStr();
    if (byDate[today]) {
      viewMonth = new Date();
      viewMonth.setDate(1);
      selectDate(today);
      return;
    }
    if (index.length) {
      var latest = index[0].date; // index.json is sorted newest-first
      var d = new Date(latest.split("-")[0], latest.split("-")[1] - 1, 1);
      viewMonth = d;
      selectDate(latest);
      return;
    }
    panel.innerHTML = '<p class="empty-state">No Daily Byte articles have been published yet — check back soon.</p>';
    renderCalendar();
  }

  prevBtn.addEventListener("click", function () {
    viewMonth.setMonth(viewMonth.getMonth() - 1);
    renderCalendar();
  });
  nextBtn.addEventListener("click", function () {
    viewMonth.setMonth(viewMonth.getMonth() + 1);
    renderCalendar();
  });
  jumpTodayBtn.addEventListener("click", jumpToLatestOrToday);

  fetch("data/index.json", { cache: "no-store" })
    .then(function (res) { return res.ok ? res.json() : []; })
    .then(function (data) {
      index = data || [];
      byDate = {};
      index.forEach(function (e) { byDate[e.date] = e; });
      renderCalendar();
      jumpToLatestOrToday();
    })
    .catch(function () {
      index = [];
      byDate = {};
      renderCalendar();
      panel.innerHTML = '<p class="empty-state">Couldn\'t load the archive. Try again later.</p>';
    });
})();
