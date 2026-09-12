/* Yongyu Optoelectronics website behaviour.
   Plain script on purpose: the site must run from file:// without a server,
   so no ES modules, no fetch(), no external dependencies. */
(function () {
  "use strict";

  var DATA = window.YY_DATA || {};
  var I18N = window.YY_I18N || { zh: {}, en: {} };
  var STORE_KEY = "yy_inquiry_v1";
  var LANG_KEY = "yy_lang_v1";
  var lang = "zh";

  /* ------------------------------------------------------------- utilities */

  function t(key, vars) {
    var table = I18N[lang] || I18N.zh;
    var text = table[key];
    if (text === undefined) text = (I18N.zh || {})[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (name) {
        text = text.replace("{" + name + "}", vars[name]);
      });
    }
    return text;
  }

  function bi(obj, base) {
    if (!obj) return "";
    return obj[base + (lang === "zh" ? "Cn" : "En")] || "";
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === "class") node.className = value;
        else if (key === "text") node.textContent = value;
        else if (key === "html") node.innerHTML = value;
        else if (key.indexOf("on") === 0 && typeof value === "function") node.addEventListener(key.slice(2), value);
        else if (value === true) node.setAttribute(key, "");
        else node.setAttribute(key, value);
      });
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function tidyRemark(text) {
    return String(text || "")
      .replace(/([\w])-\s+/g, "$1-")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
  }

  var COLOR_SWATCH = {
    Blue: "#1668e3",
    Green: "#009040",
    Red: "#d02010",
    Yellow: "#e8a12c",
    "Yellow-green": "#8bbf2a",
    Orange: "#f07020",
    White: "#f2f4f7",
    UV: "#7b61ff",
    "Ice-blue": "#7fd3ff",
  };

  function colorText(value) {
    if (lang === "zh") {
      var dict = (DATA.dict || {}).colors || {};
      if (dict[value]) return dict[value];
    }
    return value;
  }

  function remarkText(value) {
    var clean = tidyRemark(value);
    if (lang === "zh") {
      var dict = (DATA.dict || {}).remarks || {};
      if (dict[clean]) return dict[clean];
    }
    return clean;
  }

  function receiverItemText(value) {
    if (lang === "zh") {
      var dict = (DATA.dict || {}).receiverItems || {};
      if (dict[value]) return dict[value];
    }
    return value;
  }

  var toastTimer = null;
  function toast(message) {
    var node = document.getElementById("toast");
    if (!node) {
      node = el("div", { id: "toast", class: "toast", role: "status", "aria-live": "polite" });
      document.body.appendChild(node);
    }
    node.textContent = message;
    node.classList.add("is-open");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      node.classList.remove("is-open");
    }, 2600);
  }

  /* -------------------------------------------------------------- language */

  function detectLang() {
    var param = new URLSearchParams(window.location.search).get("lang");
    if (param === "zh" || param === "en") return param;
    try {
      var saved = window.localStorage.getItem(LANG_KEY);
      if (saved === "zh" || saved === "en") return saved;
    } catch (error) {
      /* localStorage can be unavailable; fall back to Chinese */
    }
    return "zh";
  }

  function applyStaticText() {
    $$("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    $$("[data-i18n-placeholder]").forEach(function (node) {
      node.setAttribute("placeholder", t(node.getAttribute("data-i18n-placeholder")));
    });
    $$("[data-i18n-aria]").forEach(function (node) {
      node.setAttribute("aria-label", t(node.getAttribute("data-i18n-aria")));
    });
    $$("[data-i18n-title]").forEach(function (node) {
      node.setAttribute("title", t(node.getAttribute("data-i18n-title")));
    });
  }

  function setLang(next, silent) {
    lang = next === "en" ? "en" : "zh";
    document.documentElement.setAttribute("data-lang", lang);
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch (error) {
      /* ignore */
    }
    $$("[data-lang-btn]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-lang-btn") === lang));
    });
    applyStaticText();
    renderPage();
    if (!silent) renderInquiry();
  }

  /* --------------------------------------------------------------- inquiry */

  /* localStorage can be blocked (some browsers refuse it on file://), so keep
     an in-memory copy as a fallback and remember that storage is unusable. */
  var memoryItems = [];
  var storageBlocked = false;

  function readStore() {
    if (storageBlocked) return memoryItems.slice();
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var items = raw ? JSON.parse(raw) : [];
      memoryItems = Array.isArray(items) ? items : [];
      return memoryItems.slice();
    } catch (error) {
      storageBlocked = true;
      return memoryItems.slice();
    }
  }

  function writeStore(items) {
    memoryItems = items.slice();
    if (storageBlocked) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(items));
    } catch (error) {
      storageBlocked = true;
    }
  }

  function findSeries(id) {
    return (DATA.series || []).filter(function (item) {
      return item.id === id;
    })[0];
  }

  function addItem(pn, seriesId, color) {
    if (!pn) return;
    var items = readStore();
    var exists = items.filter(function (item) {
      return item.pn === pn && item.seriesId === seriesId;
    })[0];
    if (exists) {
      toast(t("inquiry.added"));
      return;
    }
    items.push({ pn: pn, seriesId: seriesId, color: color || "", qty: "", note: "" });
    writeStore(items);
    markAddedButtons();
    renderInquiry();
    toast(t("inquiry.added") + " · " + pn);
  }

  function removeItem(pn, seriesId) {
    var items = readStore().filter(function (item) {
      return !(item.pn === pn && item.seriesId === seriesId);
    });
    writeStore(items);
    markAddedButtons();
    renderInquiry();
    toast(t("inquiry.removed"));
  }

  function updateItem(pn, seriesId, field, value) {
    var items = readStore();
    items.forEach(function (item) {
      if (item.pn === pn && item.seriesId === seriesId) item[field] = value;
    });
    writeStore(items);
  }

  function markAddedButtons() {
    var items = readStore();
    $$("[data-add-pn]").forEach(function (button) {
      var hit = items.some(function (item) {
        return item.pn === button.getAttribute("data-add-pn") && item.seriesId === button.getAttribute("data-add-series");
      });
      button.setAttribute("data-added", String(hit));
      button.textContent = hit ? t("product.added") : t("product.add");
    });
  }

  function renderInquiryBadge() {
    var count = readStore().length;
    $$("[data-inquiry-count]").forEach(function (node) {
      node.textContent = String(count);
      node.hidden = count === 0;
    });
    $$("[data-inquiry-label]").forEach(function (node) {
      node.textContent = t("header.inquiry");
    });
  }

  function inquiryListMarkup(container, options) {
    var items = readStore();
    container.innerHTML = "";
    if (!items.length) {
      container.appendChild(
        el("div", { class: "empty-state" }, [
          el("p", { text: t("inquiry.empty") }),
          el("a", { class: "btn btn-primary", href: "products.html", text: t("inquiry.emptyButton") }),
        ])
      );
      return items;
    }
    items.forEach(function (item, itemIndex) {
      var series = findSeries(item.seriesId);
      var title = series ? bi(series, "title") : item.seriesId;
      var uid = "inquiry-" + itemIndex + "-" + String(item.pn).replace(/[^A-Za-z0-9]/g, "");
      var row = el("div", { class: "inquiry-item" }, [
        el("div", {}, [
          el("div", { class: "pn", text: item.pn }),
          el("div", { class: "meta", text: title + (item.color ? " · " + colorText(item.color) : "") }),
        ]),
        el("div", { class: "qty" }, [
          el("label", { class: "visually-hidden", for: uid + "-qty", text: t("inquiry.qty") }),
          el("input", {
            id: uid + "-qty",
            type: "number",
            min: "0",
            step: "100",
            value: item.qty,
            placeholder: t("inquiry.qty"),
            onchange: function (event) {
              updateItem(item.pn, item.seriesId, "qty", event.target.value);
              if (!options || !options.compact) renderInquiry();
            },
          }),
        ]),
        el("div", { class: "meta" }, [
          el("label", { class: "visually-hidden", for: uid + "-note", text: t("inquiry.note") }),
          el("input", {
            id: uid + "-note",
            type: "text",
            value: item.note,
            placeholder: t("inquiry.notePlaceholder"),
            style: "width:100%;padding:5px 8px;border:1px solid var(--line-strong);border-radius:8px;font:inherit;font-size:13px;",
            onchange: function (event) {
              updateItem(item.pn, item.seriesId, "note", event.target.value);
              if (!options || !options.compact) renderInquiry();
            },
          }),
          el("button", {
            class: "link-danger",
            type: "button",
            text: t("inquiry.remove"),
            style: "margin-top:6px;",
            onclick: function () {
              removeItem(item.pn, item.seriesId);
            },
          }),
        ]),
      ]);
      container.appendChild(row);
    });
    return items;
  }

  function mailBody(items, profile) {
    var lines = [];
    lines.push(t("inquiry.mailSubject") + " — " + (DATA.company ? bi(DATA.company, "name") : "Yongyu Optoelectronics"));
    lines.push("");
    if (profile && profile.company) lines.push(t("inquiry.company") + ": " + profile.company);
    if (profile && profile.contact) lines.push(t("inquiry.contactName") + ": " + profile.contact);
    if (profile && (profile.company || profile.contact)) lines.push("");
    lines.push("No. | Part No. | Series | Qty | Note");
    items.forEach(function (item, index) {
      var series = findSeries(item.seriesId);
      lines.push(
        [
          index + 1,
          item.pn,
          series ? bi(series, "title") : item.seriesId,
          item.qty || "",
          item.note || "",
        ].join(" | ")
      );
    });
    lines.push("");
    lines.push(DATA.company ? bi(DATA.company, "name") + " · " + (DATA.meta ? DATA.meta.website : "www.yongyuled.com") : "");
    return lines.join("\n");
  }

  function inquiryProfile() {
    var company = document.getElementById("inquiry-company");
    var contact = document.getElementById("inquiry-contact");
    return {
      company: company ? company.value.trim() : "",
      contact: contact ? contact.value.trim() : "",
    };
  }

  function mailtoHref() {
    var items = readStore();
    var subject = t("inquiry.mailSubject") + " — " + (DATA.company ? bi(DATA.company, "name") : "");
    var body = mailBody(items, inquiryProfile());
    var email = (DATA.meta && DATA.meta.email) || "sales@yongyuled.com";
    return "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function copyText(text, successMessage) {
    function fallback() {
      var area = el("textarea", { style: "position:fixed;left:-9999px;top:0;" });
      area.value = text;
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (error) {
        ok = false;
      }
      document.body.removeChild(area);
      toast(ok ? successMessage : text.slice(0, 120));
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          toast(successMessage);
        },
        fallback
      );
    } else {
      fallback();
    }
  }

  function renderInquiry() {
    renderInquiryBadge();
    var drawerList = $("[data-inquiry-list]");
    if (drawerList) inquiryListMarkup(drawerList, { compact: true });
    var pageList = $("[data-inquiry-page-list]");
    if (pageList) {
      var items = inquiryListMarkup(pageList, {});
      var form = $("[data-inquiry-form]");
      if (form) form.hidden = items.length === 0;
      var preview = $("[data-inquiry-preview]");
      if (preview) preview.value = items.length ? mailBody(items, inquiryProfile()) : "";
      var send = $("[data-inquiry-send]");
      if (send) send.setAttribute("href", mailtoHref());
    }
    markAddedButtons();
  }

  function openDrawer(open) {
    var drawer = $("[data-drawer]");
    var backdrop = $("[data-drawer-backdrop]");
    if (!drawer) return;
    drawer.classList.toggle("is-open", open);
    if (backdrop) backdrop.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open) {
      var close = $("[data-drawer-close]");
      if (close) close.focus();
    }
  }

  /* ----------------------------------------------------------- table render */

  function columnLabel(col, withSub) {
    var label = col[lang === "zh" ? "cn" : "en"] || "";
    var sub = lang === "zh" ? col.subCn : col.subEn;
    if (withSub && sub) label += " " + sub;
    if (col.unit) label += " (" + col.unit + ")";
    return label;
  }

  function cellValue(col, row) {
    var value = row[col.key];
    if (value === undefined || value === null || value === "") return "—";
    if (col.key === "color") return colorText(value);
    if (col.key === "remark") return remarkText(value);
    if (col.key === "items") return receiverItemText(value);
    return String(value);
  }

  function isNumericColumn(col) {
    return ["iface", "vf_min", "vf_max", "vf_typ", "wl_min", "wl_max", "wl_typ", "cx", "cy", "cct_min", "cct_max", "iv_min", "iv_max", "iv_typ", "angle"].indexOf(col.key) > -1;
  }

  function renderTable(table, series, options) {
    var columns = table.columns || [];
    var wrap = el("div", { class: "table-wrap" });
    var spec = el("table", { class: "spec-table" });
    var thead = el("thead");
    var hasSub = columns.some(function (col) {
      return col.subCn || col.subEn;
    });

    if (hasSub) {
      var top = el("tr");
      var bottom = el("tr");
      var index = 0;
      while (index < columns.length) {
        var col = columns[index];
        var groupLabel = col[lang === "zh" ? "cn" : "en"];
        var span = 1;
        while (
          index + span < columns.length &&
          (columns[index + span][lang === "zh" ? "cn" : "en"] === groupLabel) &&
          (columns[index + span].subCn || columns[index + span].subEn)
        ) {
          span += 1;
        }
        if (col.subCn || col.subEn) {
          top.appendChild(el("th", { colspan: String(span), text: groupLabel + (col.unit ? " (" + col.unit + ")" : "") }));
          for (var step = 0; step < span; step += 1) {
            var current = columns[index + step];
            bottom.appendChild(el("th", { text: (lang === "zh" ? current.subCn : current.subEn) || "" }));
          }
          index += span;
        } else {
          top.appendChild(el("th", { rowspan: "2", text: groupLabel + (col.unit ? " (" + col.unit + ")" : "") }));
          index += 1;
        }
      }
      thead.appendChild(top);
      thead.appendChild(bottom);
    } else {
      var single = el("tr");
      columns.forEach(function (col) {
        single.appendChild(el("th", { text: columnLabel(col, false) }));
      });
      if (options && options.actions) single.appendChild(el("th", { text: "" }));
      thead.appendChild(single);
    }
    if (hasSub && options && options.actions) {
      var actionTh = el("th", { rowspan: "2", text: "" });
      thead.firstChild.appendChild(actionTh);
    }
    spec.appendChild(thead);

    var tbody = el("tbody");
    (table.rows || []).forEach(function (row) {
      var tr = el("tr", { "data-pn": row.pn || "" });
      if (row.pn) tr.id = "pn-" + String(row.pn).replace(/[^A-Za-z0-9-]/g, "");
      columns.forEach(function (col) {
        var cls = isNumericColumn(col) ? "c-num" : col.key === "remark" || col.key === "items" || col.key === "condition" ? "c-text" : "c-center";
        var text = cellValue(col, row);
        var td = el("td", { class: cls, "data-label": columnLabel(col, true) });
        if (col.key === "color") {
          var swatchColor = COLOR_SWATCH[row.color];
          td.appendChild(
            el("span", {
              class: "swatch",
              style: swatchColor ? "background:" + swatchColor + ";box-shadow:0 0 0 1px rgba(14,22,38,.12) inset;" : "background:#cbd5e1;",
            })
          );
        }
        td.appendChild(document.createTextNode(text));
        tr.appendChild(td);
      });
      if (options && options.actions) {
        var action = el("td", { class: "row-actions nolabel" });
        if (row.pn) {
          action.appendChild(
            el("button", {
              class: "add-btn",
              type: "button",
              "data-add-pn": row.pn,
              "data-add-series": series.id,
              text: t("product.add"),
              onclick: function () {
                addItem(row.pn, series.id, row.color || "");
              },
            })
          );
        }
        tr.appendChild(action);
      }
      tbody.appendChild(tr);
    });
    spec.appendChild(tbody);
    wrap.appendChild(spec);
    return wrap;
  }

  function tableToolbar(table, series) {
    var toolbar = el("div", { class: "table-toolbar" });
    var pns = (table.rows || [])
      .map(function (row) {
        return row.pn;
      })
      .filter(function (pn, index, list) {
        return pn && list.indexOf(pn) === index;
      });
    toolbar.appendChild(
      el("button", {
        class: "btn btn-outline btn-sm",
        type: "button",
        text: t("product.addAll"),
        onclick: function () {
          (table.rows || []).forEach(function (row) {
            if (row.pn) addItem(row.pn, series.id, row.color || "");
          });
          toast(t("inquiry.added"));
        },
      })
    );
    toolbar.appendChild(
      el("button", {
        class: "btn btn-outline btn-sm",
        type: "button",
        text: t("product.copy"),
        onclick: function () {
          copyText(pns.join("\n"), t("product.copied"));
        },
      })
    );
    toolbar.appendChild(el("span", { class: "spacer" }));
    toolbar.appendChild(
      el("span", { class: "small muted", text: t("inquiry.itemCount", { n: pns.length }) })
    );
    return toolbar;
  }

  /* ------------------------------------------------------------- renderers */

  function renderStats(target, count) {
    var stats = (DATA.stats || []).slice(0, count || 4);
    target.innerHTML = "";
    stats.forEach(function (stat) {
      target.appendChild(
        el("div", { class: "stat-card" }, [
          el("b", { class: "num", text: stat.value }),
          el("span", { text: bi(stat, "label") }),
        ])
      );
    });
  }

  function renderFamilies(target, options) {
    target.innerHTML = "";
    (DATA.families || []).forEach(function (family) {
      var media = el("div", { class: "card-media" });
      if (family.image) {
        media.appendChild(
          el("img", { src: family.image, alt: bi(family, "name"), loading: "lazy", decoding: "async" })
        );
      } else {
        media.appendChild(el("div", { class: "placeholder", text: bi(family, "name") }));
      }
      var body = el("div", { class: "card-body" }, [
        el("h3", {}, [
          document.createTextNode(bi(family, "name")),
          family.status === "dev" ? el("span", { class: "tag tag--dev", style: "margin-left:8px;", text: t("products.dev") }) : null,
        ]),
        el("p", { text: bi(family, "desc") }),
      ]);
      if (family.features && family.features.length) {
        var list = el("ul", { class: "small muted", style: "margin:4px 0 0;padding-left:1.1em;" });
        (family.features || []).forEach(function (feature) {
          list.appendChild(el("li", { text: feature }));
        });
        body.appendChild(list);
      }
      var meta = el("div", { class: "card-meta" });
      if (family.seriesIds && family.seriesIds.length) {
        meta.appendChild(el("span", { text: t("products.seriesCount", { n: family.seriesIds.length }) }));
      } else if (family.status === "dev") {
        meta.appendChild(el("span", { text: t("products.dev") }));
      }
      body.appendChild(meta);
      var card = el("article", { class: "card" }, [media, body]);
      if (family.id) {
        card.appendChild(
          el("a", {
            class: "card-link",
            href: "products.html?family=" + encodeURIComponent(family.id),
            "aria-label": bi(family, "name") + " - " + t("products.open"),
          })
        );
      }
      target.appendChild(card);
    });
  }

  function renderApplications(target, variant) {
    target.innerHTML = "";
    (DATA.applications || []).forEach(function (app) {
      var media = el("div", { class: "card-media card-media--cover" }, [
        el("img", { src: app.image, alt: bi(app, "name"), loading: "lazy", decoding: "async" }),
      ]);
      var body = el("div", { class: "card-body" }, [
        el("h3", { text: bi(app, "name") }),
      ]);
      if (variant === "full") {
        body.appendChild(
          el("p", {
            text:
              lang === "zh"
                ? "Chip LED 与红外产品可用于该领域的状态指示、显示与光源。"
                : "Chip LED and IR products serve indication, display and light sources in this field.",
          })
        );
      }
      target.appendChild(el("article", { class: "card" }, [media, body]));
    });
  }

  function renderCertifications(target) {
    target.innerHTML = "";
    (DATA.certifications || []).forEach(function (cert) {
      target.appendChild(
        el("div", { class: "cert" }, [
          el("b", { text: cert.code }),
          el("span", { text: bi(cert, "name") }),
        ])
      );
    });
  }

  function renderMilestones(target, limit) {
    target.innerHTML = "";
    var items = (DATA.milestones || []).slice(0);
    if (limit) items = items.slice(-limit);
    items.forEach(function (milestone) {
      var list = el("ul");
      (lang === "zh" ? milestone.itemsCn : milestone.itemsEn).forEach(function (text) {
        list.appendChild(el("li", { text: text }));
      });
      target.appendChild(
        el("li", {}, [el("span", { class: "year", text: milestone.year }), list])
      );
    });
  }

  function renderContacts(target, variant) {
    target.innerHTML = "";
    (DATA.contacts || []).forEach(function (contact) {
      var rows = [];
      rows.push(el("span", { class: "tag", text: bi(contact, "kind") }));
      rows.push(el("h3", { style: "margin:10px 0 4px;font-size:18px;", text: bi(contact, "company") }));
      rows.push(el("p", { class: "muted", style: "margin:0 0 10px;", text: bi(contact, "address") }));
      var list = el("ul", { style: "list-style:none;padding:0;margin:0;font-size:14.5px;" });
      if (contact.tel) {
        list.appendChild(
          el("li", {}, [
            el("span", { class: "muted", text: t("contact.tel") + "：" }),
            el("a", { href: "tel:" + contact.tel.replace(/[^\d+]/g, ""), text: contact.tel }),
          ])
        );
      }
      if (variant !== "short" && contact.fax) {
        list.appendChild(
          el("li", {}, [
            el("span", { class: "muted", text: t("contact.fax") + "：" }),
            document.createTextNode(contact.fax),
          ])
        );
      }
      if (contact.email) {
        list.appendChild(
          el("li", {}, [
            el("span", { class: "muted", text: t("contact.email") + "：" }),
            el("a", { href: "mailto:" + contact.email, text: contact.email }),
          ])
        );
      }
      rows.push(list);
      target.appendChild(el("article", { class: "card" }, [el("div", { class: "card-body" }, rows)]));
    });
  }

  function renderSeriesGrid(target, state) {
    var series = (DATA.series || []).filter(function (item) {
      if (state.family && state.family !== "all" && item.family !== state.family) return false;
      if (state.color && state.color !== "all") {
        var has = item.tables.some(function (table) {
          return (table.rows || []).some(function (row) {
            return row.color === state.color;
          });
        });
        if (!has) return false;
      }
      if (state.query) {
        var needle = state.query.toLowerCase();
        var haystack = [item.id, item.titleCn, item.titleEn]
          .concat(item.partNumbers || [])
          .join(" ")
          .toLowerCase();
        if (haystack.indexOf(needle) === -1) return false;
      }
      return true;
    });

    target.innerHTML = "";
    var counter = document.querySelector("[data-products-count]");
    if (counter) {
      counter.textContent = state.query || (state.color && state.color !== "all") || (state.family && state.family !== "all")
        ? t("products.countFiltered", { n: series.length })
        : t("products.countAll", { n: series.length });
    }
    if (!series.length) {
      var devFamily = (DATA.families || []).filter(function (family) {
        return family.id === state.family;
      })[0];
      if (devFamily && devFamily.status === "dev") {
        target.appendChild(
          el("div", { class: "empty-state" }, [
            el("h3", { text: bi(devFamily, "name") }),
            el("p", { text: bi(devFamily, "desc") }),
            el("span", { class: "tag tag--dev", text: t("products.dev") }),
          ])
        );
        return;
      }
      target.appendChild(el("div", { class: "empty-state", text: t("products.none") }));
      return;
    }
    series.forEach(function (item) {
      var media = el("div", { class: "card-media" }, [
        el("img", { src: item.image, alt: bi(item, "title"), loading: "lazy", decoding: "async" }),
      ]);
      var body = el("div", { class: "card-body" }, [
        el("h3", { text: bi(item, "title") }),
        el("p", { text: t("products.pkg") + "：" + item.pkg + " mm" }),
      ]);
      body.appendChild(
        el("div", { class: "card-meta" }, [
          el("span", { text: t("products.pnCount") + "：" + (item.partNumbers || []).length }),
          el("span", { text: t("products.tableCount") + "：" + item.tables.length }),
        ])
      );
      var card = el("article", { class: "card" }, [media, body]);
      card.appendChild(
        el("a", {
          class: "card-link",
          href: "product.html?series=" + encodeURIComponent(item.id),
          "aria-label": bi(item, "title") + " - " + t("products.open"),
        })
      );
      target.appendChild(card);
    });
  }

  function renderProductDetail() {
    var root = $("[data-product-root]");
    if (!root) return;
    var params = new URLSearchParams(window.location.search);
    var id = params.get("series") || "";
    var highlight = params.get("pn") || "";
    var series = findSeries(id);
    if (!series) {
      root.innerHTML = "";
      root.appendChild(el("div", { class: "empty-state", text: t("product.notFound") }));
      return;
    }
    document.title = bi(series, "title") + " - " + (DATA.company ? bi(DATA.company, "name") : "Yongyu");
    var titleNode = $("[data-product-title]");
    if (titleNode) titleNode.textContent = bi(series, "title");
    var crumbNode = $("[data-product-crumb]");
    if (crumbNode) crumbNode.textContent = bi(series, "title");
    root.innerHTML = "";

    var head = el("div", { class: "grid grid-2", style: "align-items:center;" }, [
      el("div", { class: "figure" }, [
        el("img", { src: series.image, alt: bi(series, "title"), decoding: "async" }),
      ]),
      el("div", {}, [
        el("span", { class: "eyebrow", text: (DATA.families || []).filter(function (f) { return f.id === series.family; }).map(function (f) { return bi(f, "name"); })[0] || "" }),
        el("h2", { text: bi(series, "title") }),
        el("p", { class: "lead", text: t("product.pkg") + "：" + series.pkg + " mm（" + t("product.unit") + "）" }),
        el("div", { class: "badge-row" }, [
          el("span", { class: "tag", text: t("product.pnCount") + " " + (series.partNumbers || []).length }),
          el("span", { class: "tag", text: t("product.tableCount") + " " + series.tables.length }),
        ]),
      ]),
    ]);
    root.appendChild(head);

    var tabs = el("div", { class: "tabs", role: "tablist" });
    var panels = el("div");
    var toolbarHost = el("div");
    var first = true;
    series.tables.forEach(function (table, index) {
      var tabId = "tab-" + index;
      var tab = el("button", {
        class: "tab",
        type: "button",
        role: "tab",
        id: tabId,
        "aria-selected": first ? "true" : "false",
        text: bi(table, "title"),
      });
      var panel = el("div", { class: "tab-panel", role: "tabpanel", "aria-labelledby": tabId });
      panel.hidden = !first;
      tab.addEventListener("click", function () {
        $$(".tab", tabs).forEach(function (other) {
          other.setAttribute("aria-selected", String(other === tab));
        });
        $$(".tab-panel", panels).forEach(function (other) {
          other.hidden = other !== panel;
        });
        toolbarHost.innerHTML = "";
        toolbarHost.appendChild(tableToolbar(table, series));
      });
      tabs.appendChild(tab);
      panels.appendChild(panel);
      first = false;
    });
    root.appendChild(tabs);
    root.appendChild(toolbarHost);

    series.tables.forEach(function (table, index) {
      var panel = panels.children[index];
      panel.appendChild(renderTable(table, series, { actions: true }));
    });
    root.appendChild(panels);
    toolbarHost.appendChild(tableToolbar(series.tables[0], series));

    var related = (DATA.series || []).filter(function (item) {
      return item.family === series.family && item.id !== series.id;
    });
    if (related.length) {
      var relatedSection = el("section", { class: "section section--tight" }, [
        el("h3", { text: t("product.related") }),
      ]);
      var grid = el("div", { class: "grid grid-4" });
      related.forEach(function (item) {
        var card = el("article", { class: "card" }, [
          el("div", { class: "card-body" }, [
            el("h4", { text: bi(item, "title") }),
            el("p", { class: "small muted", text: item.pkg + " mm · " + (item.partNumbers || []).length + " " + t("product.pnCount") }),
          ]),
        ]);
        card.appendChild(el("a", { class: "card-link", href: "product.html?series=" + encodeURIComponent(item.id), "aria-label": bi(item, "title") }));
        grid.appendChild(card);
      });
      relatedSection.appendChild(grid);
      root.appendChild(relatedSection);
    }

    var note = $("[data-product-note]");
    if (note) note.textContent = bi(DATA.meta, "note");

    markAddedButtons();
    if (highlight) {
      var node = document.getElementById("pn-" + highlight.replace(/[^A-Za-z0-9-]/g, ""));
      if (node) {
        node.scrollIntoView({ block: "center", behavior: "smooth" });
        node.style.boxShadow = "inset 0 0 0 2px var(--brand)";
        window.setTimeout(function () {
          node.style.boxShadow = "";
        }, 2400);
      }
    }
  }

  /* --------------------------------------------------------------- search */

  var partIndex = [];
  function buildIndex() {
    partIndex = [];
    (DATA.series || []).forEach(function (series) {
      (series.tables || []).forEach(function (table) {
        (table.rows || []).forEach(function (row) {
          if (row.pn) {
            partIndex.push({ pn: row.pn, seriesId: series.id, series: series, color: row.color || "" });
          }
        });
      });
    });
  }

  function setupSearch(input, host) {
    if (!input || !host) return;
    function close() {
      host.innerHTML = "";
    }
    input.addEventListener("input", function () {
      var query = input.value.trim().toLowerCase();
      if (query.length < 2) {
        close();
        return;
      }
      var hits = partIndex.filter(function (item) {
        return item.pn.toLowerCase().indexOf(query) > -1;
      });
      var seen = {};
      hits = hits.filter(function (item) {
        if (seen[item.pn]) return false;
        seen[item.pn] = true;
        return true;
      });
      close();
      if (!hits.length) return;
      var box = el("div", { class: "search-results" });
      hits.slice(0, 12).forEach(function (hit) {
        box.appendChild(
          el("button", {
            type: "button",
            onclick: function () {
              window.location.href = "product.html?series=" + encodeURIComponent(hit.seriesId) + "&pn=" + encodeURIComponent(hit.pn);
            },
          }, [
            el("span", { class: "pn", text: hit.pn }),
            el("span", { class: "meta", text: bi(hit.series, "title") + (hit.color ? " · " + colorText(hit.color) : "") }),
          ])
        );
      });
      host.appendChild(box);
    });
    document.addEventListener("click", function (event) {
      if (!host.contains(event.target) && event.target !== input) close();
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });
  }

  /* ----------------------------------------------------------- page render */

  function renderPage() {
    var page = document.body.getAttribute("data-page");
    var familyParam = new URLSearchParams(window.location.search).get("family");

    if (page === "index") {
      var heroStats = $("[data-hero-stats]");
      if (heroStats) {
        heroStats.innerHTML = "";
        (DATA.stats || []).slice(0, 4).forEach(function (stat) {
          heroStats.appendChild(
            el("div", { class: "hero-stat" }, [
              el("b", { class: "num", text: stat.value }),
              el("span", { text: bi(stat, "label") }),
            ])
          );
        });
      }
      var familyGrid = $("[data-families]");
      if (familyGrid) renderFamilies(familyGrid);
      var appsGrid = $("[data-applications]");
      if (appsGrid) renderApplications(appsGrid, "home");
      var statsBand = $("[data-stats]");
      if (statsBand) renderStats(statsBand, 4);
      var milestoneList = $("[data-milestones]");
      if (milestoneList) renderMilestones(milestoneList, 4);
      var certRow = $("[data-certs]");
      if (certRow) renderCertifications(certRow);
    }

    if (page === "about") {
      var aboutStats = $("[data-stats]");
      if (aboutStats) renderStats(aboutStats, 7);
      var aboutTimeline = $("[data-milestones]");
      if (aboutTimeline) renderMilestones(aboutTimeline);
      var profileZh = $("[data-profile-zh]");
      var profileEn = $("[data-profile-en]");
      if (profileZh && DATA.company) {
        profileZh.innerHTML = "";
        DATA.company.profileCn.forEach(function (text) {
          profileZh.appendChild(el("p", { text: text }));
        });
      }
      if (profileEn && DATA.company) {
        profileEn.innerHTML = "";
        DATA.company.profileEn.forEach(function (text) {
          profileEn.appendChild(el("p", { text: text }));
        });
      }
      var baseCards = $("[data-contacts]");
      if (baseCards) renderContacts(baseCards, "short");
    }

    if (page === "products") {
      var seriesGrid = $("[data-series]");
      var state = {
        family: familyParam || "all",
        color: "all",
        query: "",
      };
      var familyHost = $("[data-filter-family]");
      var colorHost = $("[data-filter-color]");
      if (familyHost) {
        var families = [{ id: "all", nameCn: t("products.all"), nameEn: t("products.all") }].concat(DATA.families || []);
        families.forEach(function (family) {
          var chip = el("button", {
            class: "chip",
            type: "button",
            "aria-pressed": String(state.family === family.id),
            text: bi(family, "name"),
            onclick: function () {
              state.family = family.id;
              $$(".chip", familyHost).forEach(function (other) {
                other.setAttribute("aria-pressed", String(other === chip));
              });
              renderSeriesGrid(seriesGrid, state);
            },
          });
          familyHost.appendChild(chip);
        });
      }
      if (colorHost) {
        var colors = [{ id: "all", label: t("products.all") }].concat(
          Object.keys(COLOR_SWATCH).map(function (key) {
            return { id: key, label: colorText(key) };
          })
        );
        colors.forEach(function (entry) {
          var chip = el("button", {
            class: "chip",
            type: "button",
            "aria-pressed": String(entry.id === "all"),
            text: entry.label,
            onclick: function () {
              state.color = entry.id;
              $$(".chip", colorHost).forEach(function (other) {
                other.setAttribute("aria-pressed", String(other === chip));
              });
              renderSeriesGrid(seriesGrid, state);
            },
          });
          if (entry.id !== "all" && COLOR_SWATCH[entry.id]) {
            chip.insertBefore(
              el("span", { class: "swatch", style: "background:" + COLOR_SWATCH[entry.id] + ";box-shadow:0 0 0 1px rgba(14,22,38,.12) inset;" }),
              chip.firstChild
            );
          }
          colorHost.appendChild(chip);
        });
      }
      var searchInput = $("[data-search-input]");
      if (searchInput) {
        searchInput.addEventListener("input", function () {
          state.query = searchInput.value.trim();
          renderSeriesGrid(seriesGrid, state);
        });
        setupSearch(searchInput, $("[data-search-host]") || searchInput.parentNode);
      }
      if (seriesGrid) renderSeriesGrid(seriesGrid, state);
    }

    if (page === "product") renderProductDetail();

    if (page === "applications") {
      var appGrid = $("[data-applications]");
      if (appGrid) renderApplications(appGrid, "full");
    }

    if (page === "strength") {
      var certGrid = $("[data-certs]");
      if (certGrid) renderCertifications(certGrid);
      var compliance = $("[data-compliance]");
      if (compliance) {
        compliance.innerHTML = "";
        (DATA.compliance || []).forEach(function (item) {
          compliance.appendChild(el("span", { class: "tag tag--led", text: item }));
        });
      }
      var strengthStats = $("[data-stats]");
      if (strengthStats) renderStats(strengthStats, 7);
    }

    if (page === "contact") {
      var contactGrid = $("[data-contacts]");
      if (contactGrid) renderContacts(contactGrid);
    }

    if (page === "inquiry") {
      var pageList = $("[data-inquiry-page-list]");
      if (pageList) {
        var inquiryForm = $("[data-inquiry-form]");
        if (inquiryForm) inquiryForm.hidden = readStore().length === 0;
        ["inquiry-company", "inquiry-contact"].forEach(function (id) {
          var node = document.getElementById(id);
          if (node && !node.value) {
            node.addEventListener("input", function () {
              var preview = $("[data-inquiry-preview]");
              if (preview) preview.value = mailBody(readStore(), inquiryProfile());
              var send = $("[data-inquiry-send]");
              if (send) send.setAttribute("href", mailtoHref());
            });
          }
        });
      }
    }

    renderInquiryBadge();
  }

  /* ------------------------------------------------------------------ init */

  function init() {
    lang = detectLang();
    document.documentElement.setAttribute("data-lang", lang);
    document.documentElement.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
    buildIndex();
    applyStaticText();
    $$("[data-lang-btn]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.getAttribute("data-lang-btn") === lang));
      button.addEventListener("click", function () {
        setLang(button.getAttribute("data-lang-btn"));
      });
    });

    var menuToggle = $("[data-menu-toggle]");
    var nav = $("[data-nav]");
    if (menuToggle && nav) {
      menuToggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(open));
      });
      $$("a", nav).forEach(function (link) {
        link.addEventListener("click", function () {
          nav.classList.remove("is-open");
          menuToggle.setAttribute("aria-expanded", "false");
        });
      });
    }

    $$("[data-open-drawer]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        openDrawer(true);
      });
    });
    $$("[data-drawer-close], [data-drawer-backdrop]").forEach(function (node) {
      node.addEventListener("click", function () {
        openDrawer(false);
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") openDrawer(false);
    });

    $$("[data-inquiry-clear]").forEach(function (clear) {
      clear.addEventListener("click", function () {
        writeStore([]);
        renderInquiry();
      });
    });
    $$("[data-inquiry-copy]").forEach(function (copyButton) {
      copyButton.addEventListener("click", function () {
        var items = readStore();
        if (!items.length) {
          toast(t("inquiry.noItems"));
          return;
        }
        copyText(mailBody(items, inquiryProfile()), t("inquiry.copied"));
      });
    });
    $$("[data-inquiry-send]").forEach(function (sendButton) {
      sendButton.addEventListener("click", function (event) {
        var items = readStore();
        if (!items.length) {
          event.preventDefault();
          toast(t("inquiry.noItems"));
          return;
        }
        sendButton.setAttribute("href", mailtoHref());
        var preview = $("[data-inquiry-preview]");
        if (preview) preview.value = mailBody(items, inquiryProfile());
        toast(t("inquiry.openMail"));
      });
    });
    $$("[data-inquiry-send-drawer]").forEach(function (sendButtonDrawer) {
      sendButtonDrawer.addEventListener("click", function (event) {
        var items = readStore();
        if (!items.length) {
          event.preventDefault();
          toast(t("inquiry.noItems"));
          return;
        }
        sendButtonDrawer.setAttribute("href", mailtoHref());
      });
    });

    var header = $(".site-header");
    if (header) {
      var onScroll = function () {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    renderPage();
    renderInquiry();

    var year = $("[data-year]");
    if (year) year.textContent = String(new Date().getFullYear());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
