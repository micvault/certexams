window.PMI_INTERACTIVE = (function () {
  "use strict";

  /* ─── Utilities ─────────────────────────────────────────── */
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function makeEl(tag, cls, html) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html !== undefined) el.innerHTML = html;
    return el;
  }

  /* ─── CSS (injected once) ────────────────────────────────── */
  let cssReady = false;
  function ensureCSS() {
    if (cssReady) return;
    cssReady = true;
    const s = document.createElement("style");
    s.textContent = `
      /* ── shared ── */
      .ia-wrap { font-family: inherit; }
      .ia-check-btn {
        margin-top: 18px;
        padding: 12px 24px;
        border-radius: 14px;
        border: 0;
        background: linear-gradient(135deg,#667eea,#764ba2);
        color: #fff;
        font-size: .95rem;
        font-weight: 800;
        cursor: pointer;
        font-family: inherit;
        transition: all .2s;
      }
      .ia-check-btn:hover:not(:disabled){ transform:translateY(-2px); box-shadow:0 6px 18px rgba(102,126,234,.4); }
      .ia-check-btn:disabled{ opacity:.45; cursor:default; }
      .ia-result {
        margin-top: 14px;
        padding: 14px 16px;
        border-radius: 14px;
        font-size: .92rem;
        line-height: 1.6;
        font-weight: 600;
      }
      .ia-result.correct { background:#f0fff4; border:2px solid #48bb78; color:#22543d; }
      .ia-result.wrong   { background:#fff5f5; border:2px solid #f56565; color:#742a2a; }

      /* ── ORDER ── */
      .order-list { list-style:none; display:flex; flex-direction:column; gap:10px; margin:0; padding:0; }
      .order-item {
        display:flex; align-items:center; gap:10px;
        padding:14px 16px;
        background:#f7fafc; border:2px solid #e2e8f0;
        border-radius:14px; font-size:.95rem; font-weight:600; color:#2d3748;
        transition: border-color .2s, background .2s;
      }
      .order-item.dragging { opacity:.45; }
      .order-item.drag-over { border-color:#667eea; background:#eef2ff; }
      .order-item.correct  { border-color:#48bb78; background:#f0fff4; color:#22543d; }
      .order-item.wrong    { border-color:#f56565; background:#fff5f5; color:#742a2a; }
      .order-item.locked   { pointer-events:none; }
      .order-num {
        min-width:28px; height:28px; display:grid; place-items:center;
        border-radius:50%; background:#667eea; color:#fff;
        font-size:.82rem; font-weight:900;
      }
      .order-handle {
        cursor:grab; color:#a0aec0; font-size:1.1rem; user-select:none;
        padding:2px 4px;
      }
      .order-move-btns { margin-left:auto; display:flex; gap:4px; }
      .order-move-btn {
        border:1.5px solid #cbd5e0; background:#fff; border-radius:8px;
        width:28px; height:28px; font-size:.85rem; cursor:pointer;
        display:grid; place-items:center; color:#4a5568;
        transition: all .15s;
      }
      .order-move-btn:hover { border-color:#667eea; color:#667eea; }
      .order-correct-answer {
        margin-top:14px; padding:14px; border-radius:14px;
        background:#fef3c7; border:2px solid #f59e0b; color:#92400e;
        font-size:.9rem;
      }
      .order-correct-answer ol { margin:8px 0 0 18px; }

      /* ── MATCH ── */
      .match-layout { display:flex; flex-direction:column; gap:14px; }
      .match-pool {
        display:flex; flex-wrap:wrap; gap:8px;
        padding:14px; background:#f7fafc; border:2px dashed #cbd5e0; border-radius:14px;
        min-height:52px;
      }
      .match-pool-label {
        font-size:.82rem; font-weight:800; color:#718096;
        text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px;
      }
      .match-chip {
        padding:9px 14px; border-radius:10px;
        background:#fff; border:2px solid #cbd5e0;
        font-size:.88rem; font-weight:700; color:#2d3748;
        cursor:pointer; transition:all .2s; user-select:none;
      }
      .match-chip:hover:not(.placed):not(.locked) { border-color:#667eea; color:#667eea; }
      .match-chip.selected { border-color:#667eea; background:#eef2ff; color:#667eea; box-shadow:0 0 0 3px rgba(102,126,234,.2); }
      .match-chip.placed   { opacity:.35; pointer-events:none; }
      .match-rows { display:flex; flex-direction:column; gap:10px; }
      .match-row  { display:flex; align-items:stretch; gap:10px; }
      .match-right-text {
        flex:1; padding:12px 14px;
        background:#f7fafc; border:2px solid #e2e8f0; border-radius:12px;
        font-size:.9rem; color:#4a5568; line-height:1.5;
        transition:all .2s;
      }
      .match-right-text.correct { border-color:#48bb78; background:#f0fff4; color:#22543d; }
      .match-right-text.wrong   { border-color:#f56565; background:#fff5f5; color:#742a2a; }
      .match-slot {
        min-width:140px; padding:10px 14px;
        border:2px dashed #cbd5e0; border-radius:12px;
        display:flex; align-items:center; justify-content:center;
        font-size:.88rem; color:#a0aec0; font-weight:600;
        transition:all .2s; background:#fff;
      }
      .match-row { cursor:pointer; }
      .match-row:hover .match-slot:not(.filled):not(.locked) { border-color:#667eea; background:#eef2ff; color:#667eea; }
      .match-slot.ready  { border-color:#667eea; background:#eef2ff; }
      .match-slot.filled { border-color:#10b981; background:#d1fae5; color:#065f46; font-weight:800; }
      .match-slot.correct{ border-color:#48bb78; background:#f0fff4; color:#22543d; cursor:default; }
      .match-slot.wrong  { border-color:#f56565; background:#fff5f5; color:#742a2a; cursor:default; }
      .match-slot.locked { pointer-events:none; }
      .match-detail { display:flex; flex-direction:column; gap:2px; align-items:flex-start; line-height:1.4; }
      .match-detail small { font-size:.78rem; opacity:.9; font-weight:700; }
      @media(max-width:600px){
        .match-row { flex-direction:column; }
        .match-slot { min-width:unset; }
      }

      /* ── CLASSIFY ── */
      .classify-pool {
        display:flex; flex-wrap:wrap; gap:8px;
        padding:14px; background:#f7fafc; border:2px dashed #cbd5e0; border-radius:14px;
        min-height:52px;
      }
      .classify-pool-label {
        font-size:.82rem; font-weight:800; color:#718096;
        text-transform:uppercase; letter-spacing:.5px; margin-bottom:6px;
      }
      .classify-item {
        padding:9px 14px; border-radius:10px;
        background:#fff; border:2px solid #cbd5e0;
        font-size:.88rem; font-weight:700; color:#2d3748;
        cursor:pointer; transition:all .2s; user-select:none;
      }
      .classify-item:hover:not(.placed):not(.locked) { border-color:#667eea; color:#667eea; }
      .classify-item.selected { border-color:#667eea; background:#eef2ff; color:#667eea; box-shadow:0 0 0 3px rgba(102,126,234,.2); }
      .classify-item.placed   { opacity:.35; pointer-events:none; }
      .classify-buckets { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px; }
      .classify-bucket {
        min-height:100px; padding:14px;
        border:2px dashed #cbd5e0; border-radius:14px; background:#fff;
        cursor:pointer; transition:all .2s;
      }
      .classify-bucket:hover:not(.locked) { border-color:#667eea; background:#eef2ff; }
      .classify-bucket.ready { border-color:#667eea; background:#eef2ff; }
      .classify-bucket-title {
        font-size:.88rem; font-weight:900; text-align:center;
        padding:6px 12px; border-radius:8px; margin-bottom:10px;
        background: linear-gradient(135deg,#667eea,#764ba2);
        color:#fff;
      }
      .classify-placed-item {
        padding:7px 10px; border-radius:8px; margin:4px 0;
        background:#f0f4ff; border:1.5px solid #c7d2fe;
        font-size:.85rem; font-weight:700; color:#3730a3;
        cursor:pointer; transition:all .15s;
        display:flex; justify-content:space-between; align-items:center;
      }
      .classify-placed-item:hover:not(.locked) { border-color:#f56565; color:#c53030; }
      .classify-placed-item .remove-x { font-size:.75rem; opacity:.6; }
      .classify-placed-item.correct { background:#f0fff4; border-color:#48bb78; color:#22543d; cursor:default; }
      .classify-placed-item.wrong   { background:#fff5f5; border-color:#f56565; color:#742a2a; cursor:default; }
      .classify-bucket.locked { pointer-events:none; }
      @media(max-width:500px){ .classify-buckets { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(s);
  }

  /* ═══════════════════════════════════════════════════════════
     ORDER
     ═══════════════════════════════════════════════════════════ */
  function renderOrder(q, container, completed, onComplete, reviewData) {
    const wrap = makeEl("div", "ia-wrap");

    if (completed) {
      const ol = makeEl("ol", "order-list");
      const reviewedOrder = Array.isArray(reviewData?.order) && reviewData.order.length === q.items.length
        ? reviewData.order
        : q.items;
      reviewedOrder.forEach((item, i) => {
        const li = makeEl("li", "order-item locked");
        li.classList.add(item === q.items[i] ? "correct" : "wrong");
        li.innerHTML = `<span class="order-num">${i + 1}</span><span>${item}</span>`;
        ol.appendChild(li);
      });
      wrap.appendChild(ol);
      const hasWrong = reviewedOrder.some((item, i) => item !== q.items[i]);
      if (hasWrong) {
        const hint = makeEl("div", "order-correct-answer");
        hint.innerHTML = "<strong>Correct order:</strong><ol>" +
          q.items.map(it => `<li>${it}</li>`).join("") + "</ol>";
        wrap.appendChild(hint);
      }
      container.appendChild(wrap);
      return;
    }

    let order = shuffle(q.items);
    let dragSrc = null;

    function buildList() {
      const ol = makeEl("ol", "order-list");
      ol.id = "order-list-" + q.number;
      order.forEach((item, idx) => {
        const li = makeEl("li", "order-item");
        li.setAttribute("draggable", "true");
        li.dataset.idx = idx;
        li.innerHTML = `
          <span class="order-handle" title="Drag to reorder">⠿</span>
          <span class="order-num">${idx + 1}</span>
          <span style="flex:1">${item}</span>
          <span class="order-move-btns">
            <button class="order-move-btn" data-dir="up" title="Move up">↑</button>
            <button class="order-move-btn" data-dir="down" title="Move down">↓</button>
          </span>`;

        // drag events
        li.addEventListener("dragstart", e => {
          dragSrc = idx;
          li.classList.add("dragging");
          e.dataTransfer.effectAllowed = "move";
        });
        li.addEventListener("dragend", () => {
          li.classList.remove("dragging");
          ol.querySelectorAll(".order-item").forEach(el => el.classList.remove("drag-over"));
        });
        li.addEventListener("dragover", e => {
          e.preventDefault();
          ol.querySelectorAll(".order-item").forEach(el => el.classList.remove("drag-over"));
          li.classList.add("drag-over");
        });
        li.addEventListener("drop", e => {
          e.preventDefault();
          if (dragSrc !== null && dragSrc !== idx) {
            [order[dragSrc], order[idx]] = [order[idx], order[dragSrc]];
            refresh();
          }
        });

        // ↑ ↓ click
        li.querySelectorAll(".order-move-btn").forEach(btn => {
          btn.addEventListener("click", () => {
            const dir = btn.dataset.dir;
            if (dir === "up" && idx > 0) {
              [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
              refresh();
            } else if (dir === "down" && idx < order.length - 1) {
              [order[idx + 1], order[idx]] = [order[idx], order[idx + 1]];
              refresh();
            }
          });
        });

        ol.appendChild(li);
      });
      return ol;
    }

    let olEl = buildList();
    wrap.appendChild(olEl);

    function refresh() {
      const newOl = buildList();
      wrap.replaceChild(newOl, olEl);
      olEl = newOl;
    }

    // Check button
    const checkBtn = makeEl("button", "ia-check-btn", "Check Order");
    checkBtn.addEventListener("click", () => {
      checkBtn.disabled = true;
      const isCorrect = order.every((item, i) => item === q.items[i]);

      olEl.querySelectorAll(".order-item").forEach((li, i) => {
        li.setAttribute("draggable", "false");
        li.classList.add(order[i] === q.items[i] ? "correct" : "wrong", "locked");
        li.querySelector(".order-move-btns")?.remove();
        li.querySelector(".order-handle")?.remove();
      });

      if (!isCorrect) {
        const hint = makeEl("div", "order-correct-answer");
        hint.innerHTML = "<strong>Correct order:</strong><ol>" +
          q.items.map(it => `<li>${it}</li>`).join("") + "</ol>";
        wrap.appendChild(hint);
      }

      const res = makeEl("div", "ia-result " + (isCorrect ? "correct" : "wrong"));
      res.textContent = isCorrect ? "✓ Correct order!" : "✗ Not quite — see the correct order above.";
      wrap.appendChild(res);

      onComplete(isCorrect, { type: "order", order: [...order] });
    });
    wrap.appendChild(checkBtn);
    container.appendChild(wrap);
  }

  /* ═══════════════════════════════════════════════════════════
     MATCH
     ═══════════════════════════════════════════════════════════ */
  function renderMatch(q, container, completed, onComplete, reviewData) {
    const wrap = makeEl("div", "ia-wrap match-layout");

    if (completed) {
      const rows = makeEl("div", "match-rows");
      const reviewedSlots = reviewData?.slots && typeof reviewData.slots === "object" ? reviewData.slots : null;
      q.pairs.forEach((p, i) => {
        const row = makeEl("div", "match-row");
        const userValue = reviewedSlots ? reviewedSlots[i] : p.left;
        const isCorrect = userValue === p.left;
        const right = makeEl("div", "match-right-text " + (isCorrect ? "correct" : "wrong"), p.right);
        const slot = makeEl("div", "match-slot " + (isCorrect ? "correct" : "wrong") + " locked");
        if (isCorrect) {
          slot.textContent = p.left;
        } else {
          slot.innerHTML = `<div class="match-detail"><small>Your answer:</small><span>${userValue || "— none —"}</span><small>Correct answer:</small><span>${p.left}</span></div>`;
        }
        row.append(right, slot);
        rows.appendChild(row);
      });
      wrap.appendChild(rows);
      container.appendChild(wrap);
      return;
    }

    // State
    const slots = {};          // rightIdx → leftText | null
    q.pairs.forEach((_, i) => slots[i] = null);
    let selected = null;       // currently selected chip text

    // Pool
    const poolLabel = makeEl("div", "match-pool-label", "Select an item below, then click any row to place it →");
    const pool = makeEl("div", "match-pool");
    const chips = {};          // leftText → chip el

    shuffle(q.pairs.map(p => p.left)).forEach(leftText => {
      const chip = makeEl("div", "match-chip", leftText);
      chip.dataset.val = leftText;
      chip.addEventListener("click", () => selectChip(leftText));
      pool.appendChild(chip);
      chips[leftText] = chip;
    });

    wrap.append(poolLabel, pool);

    // Rows
    const rows = makeEl("div", "match-rows");
    const rowEls = {};
    const rightEls = {};
    const slotEls = {};

    q.pairs.forEach((p, i) => {
      const row = makeEl("div", "match-row");
      const right = makeEl("div", "match-right-text", p.right);
      const slotEl = makeEl("div", "match-slot", "— place here —");
      slotEl.dataset.idx = i;
      rowEls[i] = row;
      rightEls[i] = right;
      slotEls[i] = slotEl;

      row.addEventListener("click", () => {
        if (selected) {
          placeSelected(i);
        } else if (slots[i]) {
          // Return filled chip back to pool
          chips[slots[i]].classList.remove("placed");
          slots[i] = null;
          slotEls[i].textContent = "— place here —";
          slotEls[i].classList.remove("filled");
        }
      });

      row.append(right, slotEl);
      rows.appendChild(row);
    });
    wrap.appendChild(rows);

    function selectChip(text) {
      if (selected) chips[selected]?.classList.remove("selected");
      if (selected === text) { selected = null; clearReady(); return; }
      selected = text;
      chips[text].classList.add("selected");
      Object.values(slotEls).forEach(s => {
        if (!s.classList.contains("filled")) s.classList.add("ready");
      });
    }

    function clearReady() {
      Object.values(slotEls).forEach(s => s.classList.remove("ready"));
    }

    function placeSelected(idx) {
      if (!selected) return;
      const prev = slots[idx];
      if (prev) {
        chips[prev].classList.remove("placed");
        slots[idx] = null;
      }
      slots[idx] = selected;
      chips[selected].classList.add("placed");
      chips[selected].classList.remove("selected");
      slotEls[idx].textContent = selected;
      slotEls[idx].classList.add("filled");
      slotEls[idx].classList.remove("ready");
      selected = null;
      clearReady();
    }

    // Check button
    const checkBtn = makeEl("button", "ia-check-btn", "Check Matches");
    checkBtn.addEventListener("click", () => {
      checkBtn.disabled = true;
      let allCorrect = true;
      q.pairs.forEach((p, i) => {
        const rowEl = rowEls[i];
        const rightEl = rightEls[i];
        const slotEl = slotEls[i];
        const isCorrect = slots[i] === p.left;
        slotEl.classList.remove("filled", "ready");
        slotEl.classList.add("locked");
        rowEl.classList.add(isCorrect ? "correct" : "wrong");
        rightEl.classList.add(isCorrect ? "correct" : "wrong");

        if (isCorrect) {
          slotEl.classList.add("correct");
          slotEl.textContent = p.left;
        } else {
          slotEl.classList.add("wrong");
          slotEl.innerHTML = `<div class="match-detail"><small>Your answer:</small><span>${slots[i] || "— none —"}</span><small>Correct answer:</small><span>${p.left}</span></div>`;
          allCorrect = false;
        }
      });
      Object.values(chips).forEach(c => c.classList.add("locked"));

      const res = makeEl("div", "ia-result " + (allCorrect ? "correct" : "wrong"));
      res.textContent = allCorrect ? "✓ All matches correct!" : "✗ Some matches were wrong — see corrections above.";
      wrap.appendChild(res);
      onComplete(allCorrect, { type: "match", slots: { ...slots } });
    });
    wrap.appendChild(checkBtn);
    container.appendChild(wrap);
  }

  /* ═══════════════════════════════════════════════════════════
     CLASSIFY
     ═══════════════════════════════════════════════════════════ */
  function renderClassify(q, container, completed, onComplete, reviewData) {
    const wrap = makeEl("div", "ia-wrap");

    if (completed) {
      const buckets = makeEl("div", "classify-buckets");
      const reviewedBuckets = reviewData?.buckets && typeof reviewData.buckets === "object" ? reviewData.buckets : null;
      q.categories.forEach(cat => {
        const bucket = makeEl("div", "classify-bucket locked");
        const title = makeEl("div", "classify-bucket-title", cat);
        bucket.appendChild(title);
        const itemsToShow = reviewedBuckets ? (reviewedBuckets[cat] || []) : q.items.filter(it => it.category === cat).map(it => it.text);
        itemsToShow.forEach(text => {
          const correctCat = q.items.find(it => it.text === text)?.category;
          const className = correctCat === cat ? "classify-placed-item correct locked" : "classify-placed-item wrong locked";
          const el = makeEl("div", className, text);
          bucket.appendChild(el);
        });
        buckets.appendChild(bucket);
      });
      wrap.appendChild(buckets);
      container.appendChild(wrap);
      return;
    }

    // State: bucketIdx → [text, ...]
    const placed = {};
    q.categories.forEach((_, i) => placed[i] = []);
    let selected = null;
    const itemEls = {};

    // Pool
    const poolLabel = makeEl("div", "classify-pool-label", "Items — click one, then click a category ↓");
    const pool = makeEl("div", "classify-pool");

    shuffle(q.items.map(it => it.text)).forEach(text => {
      const el = makeEl("div", "classify-item", text);
      el.dataset.text = text;
      el.addEventListener("click", () => {
        if (selected) itemEls[selected]?.classList.remove("selected");
        if (selected === text) { selected = null; return; }
        selected = text;
        el.classList.add("selected");
      });
      pool.appendChild(el);
      itemEls[text] = el;
    });

    wrap.append(poolLabel, pool);

    // Buckets
    const bucketsWrap = makeEl("div", "classify-buckets");
    const bucketEls = {};
    const listEls = {};

    q.categories.forEach((cat, ci) => {
      const bucket = makeEl("div", "classify-bucket");
      const title = makeEl("div", "classify-bucket-title", cat);
      const list = makeEl("div");
      listEls[ci] = list;
      bucketEls[ci] = bucket;

      bucket.append(title, list);
      bucket.addEventListener("click", () => {
        if (!selected) return;
        // Move item to this bucket (remove from other bucket if present)
        q.categories.forEach((_, oi) => {
          const idx = placed[oi].indexOf(selected);
          if (idx !== -1) placed[oi].splice(idx, 1);
        });
        placed[ci].push(selected);
        itemEls[selected].classList.add("placed");
        itemEls[selected].classList.remove("selected");
        selected = null;
        refreshBuckets();
      });

      bucketsWrap.appendChild(bucket);
    });

    wrap.appendChild(bucketsWrap);

    function refreshBuckets() {
      q.categories.forEach((_, ci) => {
        listEls[ci].innerHTML = "";
        placed[ci].forEach(text => {
          const el = makeEl("div", "classify-placed-item");
          el.innerHTML = `${text} <span class="remove-x">✕</span>`;
          el.addEventListener("click", e => {
            e.stopPropagation();
            placed[ci].splice(placed[ci].indexOf(text), 1);
            itemEls[text].classList.remove("placed");
            refreshBuckets();
          });
          listEls[ci].appendChild(el);
        });
      });
    }

    // Check button
    const checkBtn = makeEl("button", "ia-check-btn", "Check Classification");
    checkBtn.addEventListener("click", () => {
      checkBtn.disabled = true;
      let allCorrect = true;

      q.categories.forEach((cat, ci) => {
        bucketEls[ci].classList.add("locked");
        listEls[ci].querySelectorAll(".classify-placed-item").forEach(el => {
          el.classList.add("locked");
          // Find the correct category for this text
          const text = placed[ci].find(t => el.textContent.trim().startsWith(t.trim()));
          const correctCat = q.items.find(it => it.text === text)?.category;
          if (correctCat === cat) {
            el.classList.add("correct");
          } else {
            el.classList.add("wrong");
            allCorrect = false;
          }
        });
      });
      Object.values(itemEls).forEach(el => el.classList.add("locked"));

      const res = makeEl("div", "ia-result " + (allCorrect ? "correct" : "wrong"));
      res.textContent = allCorrect
        ? "✓ All correctly classified!"
        : "✗ Some classifications were wrong — incorrect items are highlighted in red.";
      wrap.appendChild(res);
      const bucketsSnapshot = {};
      q.categories.forEach((cat, ci) => {
        bucketsSnapshot[cat] = [...placed[ci]];
      });
      onComplete(allCorrect, { type: "classify", buckets: bucketsSnapshot });
    });
    wrap.appendChild(checkBtn);
    container.appendChild(wrap);
  }

  /* ─── Public API ─────────────────────────────────────────── */
  return {
    isInteractive(q) {
      return q.type === "order" || q.type === "match" || q.type === "classify";
    },
    render(q, container, completed, onComplete, reviewData) {
      ensureCSS();
      if (q.type === "order")    return renderOrder(q, container, completed, onComplete, reviewData);
      if (q.type === "match")    return renderMatch(q, container, completed, onComplete, reviewData);
      if (q.type === "classify") return renderClassify(q, container, completed, onComplete, reviewData);
    }
  };
})();
