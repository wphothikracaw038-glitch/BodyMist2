/* ==========================================================
   Body Scent — script.js (shared by every page)
   Each block runs only if the page contains its elements.
   ========================================================== */

(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  function formatPrice(n) {
    return Number(n).toLocaleString("th-TH") + " บาท";
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  /* ==========================================================
     1) product.html — product cards + mood filter
     ========================================================== */
  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  function initProducts() {
    var filterBar = document.getElementById("filter-bar");
    var list = document.getElementById("product-list");
    if (!filterBar || !list) return;

    filterBar.classList.add("mood-picker");
    list.classList.add("grid");

    var products = [];
    var current = "all";

    function buildItemLabel(p) {
      return p.size ? p.name + " " + p.size : p.name;
    }

    function buildCard(p) {
      var itemLabel = buildItemLabel(p);

      var card = el("article", "card");
      card.setAttribute("data-mood", p.mood);

      var media = el("div", "card__media");
      var img = el("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      media.appendChild(img);

      var body = el("div", "card__body");
      var title = el("h3", "card__title", p.name);
      var line = el("span", "mood-line");
      body.appendChild(title);
      body.appendChild(line);

      if (p.size) {
        var meta = el("p", "card__meta", p.size);
        meta.style.marginTop = "var(--s-2)";
        body.appendChild(meta);
      }

      var foot = el("div", "card__foot");
      foot.appendChild(el("span", "price", formatPrice(p.price)));

      var btn = el("a", "btn btn--gold btn--sm", "สั่งซื้อ");
      btn.href =
        "order.html?item=" + encodeURIComponent(itemLabel) +
        "&price=" + encodeURIComponent(p.price);
      foot.appendChild(btn);

      body.appendChild(foot);
      card.appendChild(media);
      card.appendChild(body);
      return card;
    }

    function render() {
      list.innerHTML = "";
      var shown = products.filter(function (p) {
        return current === "all" || p.mood === current;
      });

      if (!shown.length) {
        list.appendChild(el("p", "muted", "ยังไม่มีสินค้าในหมวดนี้"));
        return;
      }
      shown.forEach(function (p) {
        list.appendChild(buildCard(p));
      });
    }

    function setFilter(key, updateUrl) {
      current = key;
      Array.prototype.forEach.call(filterBar.querySelectorAll("button"), function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-filter") === key ? "true" : "false");
      });
      if (updateUrl && window.history && history.replaceState) {
        var url = new URL(window.location.href);
        if (key === "all") url.searchParams.delete("mood");
        else url.searchParams.set("mood", key);
        history.replaceState(null, "", url);
      }
      render();
    }

    // Build filter buttons
    MOODS.forEach(function (m) {
      var b = el("button");
      b.type = "button";
      b.setAttribute("data-filter", m.key);
      if (m.key !== "all") {
        var dot = el("span", "mood-dot");
        dot.setAttribute("data-mood", m.key);
        b.appendChild(dot);
      }
      b.appendChild(document.createTextNode(m.label));
      b.addEventListener("click", function () {
        setFilter(m.key, true);
      });
      filterBar.appendChild(b);
    });

    // Initial filter from ?mood=xxx
    var param = (new URLSearchParams(window.location.search).get("mood") || "").toLowerCase();
    var valid = MOODS.some(function (m) { return m.key === param; });
    var initial = valid ? param : "all";

    list.appendChild(el("p", "muted", "กำลังโหลดสินค้า..."));

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = data;
        setFilter(initial, false);
      })
      .catch(function (err) {
        console.error(err);
        list.innerHTML = "";
        list.appendChild(el("p", "muted", "โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"));
      });
  }

  /* ==========================================================
     2) order.html — prefill from URL + submit to Apps Script
     ========================================================== */
  function initOrder() {
    var form = document.getElementById("orderForm");
    if (!form) return;

    var params = new URLSearchParams(window.location.search);
    var item = params.get("item");
    var price = params.get("price");

    var itemsInput = document.getElementById("items");
    var totalInput = document.getElementById("total");

    // Fill BOTH fields as soon as the page loads
    if (itemsInput && item !== null) itemsInput.value = item;
    if (totalInput && price !== null) totalInput.value = price;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      var payload = {
        customerName: document.getElementById("customerName").value.trim(),
        contact: document.getElementById("contact").value.trim(),
        items: document.getElementById("items").value.trim(),
        total: document.getElementById("total").value.trim(),
        note: document.getElementById("note").value.trim()
      };

      fetch('https://script.google.com/macros/s/AKfycbw90nFsJIJoUV22ocsOXGfak7l2d6evzmo1JBJ431JjKuOlzDysYwcUmBugy_WjExmj_w/exec', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      .then(() => { window.location.href = 'thankyou.html'; })
      .catch(error => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  /* ==========================================================
     3) admin.html — read published CSV and show as table
     ========================================================== */
  var CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRvIPjqGTLGMDKWpE0bRmhq0drc9qYGApjI14pOWGmYc03tT2Q6HhHJG-5LLwxIpwqUghOQ_zmU_U4H/pub?gid=0&single=true&output=csv";

  // Minimal CSV parser: handles quoted fields, "" escapes,
  // commas and line breaks inside quotes, CRLF / LF endings.
  function parseCSV(text) {
    var rows = [];
    var row = [];
    var field = "";
    var inQuotes = false;

    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM

    for (var i = 0; i < text.length; i++) {
      var c = text[i];

      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else {
          field += c;
        }
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
    if (field !== "" || row.length) {
      row.push(field);
      rows.push(row);
    }

    // drop completely empty rows
    return rows.filter(function (r) {
      return r.some(function (cell) { return cell.trim() !== ""; });
    });
  }

  function initAdmin() {
    var tbody = document.querySelector("#ordersTable tbody");
    if (!tbody) return;

    function message(text) {
      tbody.innerHTML = "";
      var tr = el("tr");
      var td = el("td", "muted", text);
      td.colSpan = 6;
      td.style.textAlign = "center";
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    message("กำลังโหลดข้อมูล...");

    // timestamp param avoids a stale browser-cached copy
    fetch(CSV_URL + "&t=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = parseCSV(text);

        // Skip a header row if present (a date cell always contains a digit)
        if (rows.length && !/\d/.test(rows[0][0] || "")) rows.shift();

        if (!rows.length) {
          message("ยังไม่มีคำสั่งซื้อ");
          return;
        }

        // Rows are appended in order, so reverse = newest first
        rows.reverse();

        tbody.innerHTML = "";
        rows.forEach(function (r) {
          var tr = el("tr");
          for (var i = 0; i < 6; i++) {
            tr.appendChild(el("td", "", r[i] !== undefined ? r[i] : ""));
          }
          tbody.appendChild(tr);
        });
      })
      .catch(function (err) {
        console.error(err);
        message("โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      });
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initProducts();
    initOrder();
    initAdmin();
  });
})();
