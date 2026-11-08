/**
 * dsh-peers-syh - client half (browser bundle, no build step).
 *
 * Loaded through window.__ModuleLoader__.load({ id, factory }), like every
 * out-of-tree DSH client plugin. The factory gets the host's shared require,
 * but this half needs none of it: the device list is plain DOM.
 *
 * Where it draws: inside ds-harness-remote's own workspace dialog
 * (section.dshRemotePage), above its account footer. Remote declares no child
 * slot of its own, so this half mounts one section into that dialog and keeps
 * it there with a MutationObserver - when the dialog closes the section goes
 * with it, and nothing floats on the chat surface. No other plugin's DOM is
 * edited and no host file is touched.
 *
 * All data comes from the host half's own routes under /dsh-peers-syh/api.
 */
window.__ModuleLoader__.load({
  id: "dsh-peers-syh",
  factory: () => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const API = "/dsh-peers-syh/api";
    const CSS_ID = "dsh-peers-syh/panel";
    const PAGE_SELECTOR = ".dshRemotePage";
    const BODY_SELECTOR = ".dshRemotePageBody";
    const FOOTER_SELECTOR = ".dshRemoteAccountFooter";
    const SECTION_ATTR = "data-dsh-peers-section";

    const CSS = [
      ".dshPeersPanel{flex:0 0 auto;display:flex;flex-direction:column;text-align:left;color:var(--dsw-alias-label-primary);font-size:12px}",
      ".dshPeersPanelHead{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px}",
      ".dshPeersPanelTitle{min-width:0;display:flex;align-items:center;gap:10px}",
      ".dshPeersPanelTitle>strong{font-size:14px}",
      ".dshPeersPanelStatus{color:var(--dsw-alias-label-secondary);font-size:11px}",
      ".dshPeersRefresh{flex:0 0 auto;border:0;background:transparent;color:var(--dsw-alias-brand-primary);cursor:pointer;padding:5px 0;font:inherit;font-size:12px}",
      ".dshPeersRefresh:hover:not(:disabled){text-decoration:underline}",
      ".dshPeersRefresh:disabled{opacity:.5;cursor:default}",
      ".dshPeersHint{margin:0 0 10px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.4}",
      ".dshPeersList{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}",
      ".dshPeersRow{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;min-height:52px;padding:8px 4px;border-bottom:1px solid var(--dsw-alias-border-l2);text-align:left}",
      ".dshPeersRowMain{min-width:0;flex:1 1 160px;display:flex;flex-direction:column;gap:3px}",
      ".dshPeersRowTop{display:flex;align-items:center;gap:7px;min-width:0}",
      ".dshPeersRowName{font-size:13px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".dshPeersRowMeta{color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".dshPeersDot{width:6px;height:6px;border-radius:50%;flex:none;background:var(--dsw-alias-state-success-primary,#3fb950)}",
      ".dshPeersBadge{flex:none;padding:1px 6px;border-radius:999px;font-size:10px;line-height:16px;",
      "border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}",
      ".dshPeersDot[data-off=true]{background:var(--dsw-alias-label-tertiary,#8b949e)}",
      ".dshPeersInput{flex:1 1 160px;width:auto;min-width:0;max-width:100%;height:32px;padding:0 10px;border-radius:8px;",
      "border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:inherit;font:inherit;text-align:left}",
      ".dshPeersInput::placeholder{color:var(--dsw-alias-label-tertiary)}",
      ".dshPeersInput:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px;border-color:transparent}",
      ".dshPeersRow[data-dirty=true] .dshPeersInput{border-color:var(--dsw-alias-brand-primary)}",
      ".dshPeersPanelFooter{display:flex;align-items:center;gap:10px;padding-top:10px}",
      ".dshPeersFooterActions{display:inline-flex;align-items:center;gap:10px;margin-left:auto}",
      ".dshPeersSave{min-height:32px;padding:0 14px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);",
      "background:var(--dsw-alias-bg-layer-2);color:inherit;font:inherit;cursor:pointer}",
      ".dshPeersSave:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}",
      ".dshPeersSave:disabled{opacity:.45;cursor:default}",
      ".dshPeersLinkButton{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;",
      "font-size:12px;cursor:pointer;padding:5px 0}",
      ".dshPeersLinkButton:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}",
      ".dshPeersOk{color:var(--dsw-alias-state-success-primary,#3fb950)}",
      ".dshPeersNote{margin:8px 0 0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.4}",
      ".dshPeersError{margin:8px 0 0;color:var(--dsw-alias-state-danger-primary,#f85149);font-size:11px;line-height:1.4;word-break:break-word}",
      ".dshPeersEmpty{margin:0;color:var(--dsw-alias-label-secondary)}",
      // 窄屏（手机）补丁：面板自己的行让输入框换行；Remote 弹窗的样式来自上游
      // ds-harness-remote，本插件不改它的文件，只用同名选择器在窄屏下覆盖几何，
      // 让标题/主机行/状态列不再被压成竖排。选择器都锚在 .dshRemotePage 里，
      // 因此只在 Remote 弹窗打开时生效，不污染宿主其它页面。
      "@media (max-width:560px){",
      ".dshPeersRow{align-items:flex-start;gap:6px 10px}",
      ".dshPeersInput{flex:1 1 100%;width:100%}",
      ".dshPeersRowName{white-space:normal;overflow-wrap:anywhere}",
      ".dshPeersRowMeta{white-space:normal;overflow-wrap:anywhere}",
      ".dshPeersPanelHead{flex-wrap:wrap;gap:6px 12px}",
      ".dshPeersFooterActions{gap:8px}",
      ".dshRemotePage .dshRemotePageHeader{flex-wrap:wrap;align-items:flex-start;gap:8px 10px;padding:12px 12px 12px 54px}",
      ".dshRemotePage .dshRemotePageIntro{flex:1 1 140px}",
      ".dshRemotePage .dshRemotePageTitleRow{flex-wrap:wrap;gap:6px 8px}",
      ".dshRemotePage .dshRemotePageHeader strong{white-space:normal;overflow:visible;font-size:16px;line-height:1.35}",
      ".dshRemotePage .dshRemotePageHeader p{white-space:normal;overflow:visible;max-width:none;font-size:12px;line-height:1.4}",
      ".dshRemotePage .dshRemoteStarLink{display:none}",
      ".dshRemotePage .dshRemotePageBody{padding:16px 12px;gap:16px}",
      ".dshRemotePage .dshRemoteSectionHeading{flex-wrap:wrap;gap:6px 10px}",
      ".dshRemotePage .dshRemoteSectionTitle{flex:1 1 auto;min-width:0;flex-wrap:wrap;gap:6px 10px}",
      ".dshRemotePage .dshRemoteHostControlToggle{flex:0 0 auto}",
      ".dshRemotePage .dshRemoteConnectedMenu{flex:0 0 auto;margin-right:0}",
      ".dshRemotePage .dshRemoteSectionTitle>strong{white-space:nowrap}",
      ".dshRemotePage .dshRemoteSectionActions{flex:1 1 100%;justify-content:space-between;gap:8px}",
      ".dshRemotePage .dshRemoteHostList>button{flex-wrap:wrap;gap:2px 10px;min-height:52px;padding:10px 2px}",
      ".dshRemotePage .dshRemoteHostList>button>span{flex:1 1 auto;min-width:0}",
      ".dshRemotePage .dshRemoteHostList>button>span small{white-space:normal;overflow-wrap:anywhere;font-size:11px}",
      ".dshRemotePage .dshRemoteHostList>button>small{flex:0 0 auto;white-space:nowrap;font-size:12px}",
      "}",
    ].join("");

    function installStyle() {
      if (typeof document === "undefined") return;
      let element = document.querySelector('style[data-plugin-css="' + CSS_ID + '"]');
      if (!element) {
        element = document.createElement("style");
        element.setAttribute("data-plugin-css", CSS_ID);
        (document.head || document.documentElement).appendChild(element);
      }
      if (element.textContent !== CSS) element.textContent = CSS;
    }

    async function request(path, init) {
      const options = Object.assign({ headers: { "content-type": "application/json" } }, init || {});
      const response = await fetch(API + path, options);
      let body = {};
      try { body = await response.json(); } catch { body = {}; }
      if (!response.ok) throw new Error((body && body.error) || ("HTTP " + response.status));
      return body;
    }

    function shortId(value) {
      const text = String(value || "");
      return text.length > 8 ? text.slice(0, 8) : text;
    }

    function el(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    /* ---------- state ---------- */

    const state = {
      peers: [],
      rows: [],
      self: null,
      selfInput: null,
      loading: false,
      saving: false,
      error: null,
      note: null,
    };

    let section = null;
    let frame = 0;

    const aliasOf = (peer) => String((peer && peer.alias) || "").trim();
    const labelOf = (peer) =>
      (peer && (peer.alias || peer.remoteName || peer.name || peer.platform)) || "未命名设备";
    const selfNameOf = (self) => String((self && (self.configuredName || self.name)) || "").trim();
    const isSelfDirty = () => Boolean(state.selfInput) && state.selfInput.value.trim() !== selfNameOf(state.self);

    function changedRows() {
      return state.rows.filter((row) => row.input.value.trim() !== aliasOf(row.peer));
    }

    /* ---------- data ---------- */

    async function load() {
      state.loading = true;
      state.error = null;
      paint();
      try {
        const body = await request("/peers");
        state.peers = Array.isArray(body.peers) ? body.peers : [];
        state.self = body.self && typeof body.self === "object" ? body.self : null;
        state.error = body.remoteError ? String(body.remoteError) : null;
      } catch (failure) {
        state.peers = [];
        state.error = String((failure && failure.message) || failure);
      } finally {
        state.loading = false;
        paint();
      }
    }

    async function saveAll() {
      if (state.saving) return;
      const dirty = changedRows();
      const selfDirty = isSelfDirty();
      if (dirty.length === 0 && !selfDirty) return;
      const selfName = state.selfInput ? state.selfInput.value.trim() : "";
      if (selfDirty && !selfName) {
        state.error = "本机名不能为空";
        paint();
        return;
      }
      state.saving = true;
      state.note = null;
      state.error = null;
      paint();
      const notes = [];
      try {
        if (selfDirty) {
          await request("/self-name", { method: "POST", body: JSON.stringify({ name: selfName }) });
          notes.push("本机名已保存，重启 DSH 后生效");
        }
        if (dirty.length) {
          const aliases = {};
          for (const row of dirty) aliases[row.peer.hostId] = row.input.value.trim();
          const body = await request("/aliases", { method: "POST", body: JSON.stringify({ aliases }) });
          const savedCount = Number(body && body.saved);
          notes.push("已保存 " + (Number.isFinite(savedCount) ? savedCount : dirty.length) + " 台设备的名称");
        }
        state.note = notes.join("；");
      } catch (failure) {
        state.error = String((failure && failure.message) || failure);
      } finally {
        state.saving = false;
        if (state.error === null) await load();
        else paint();
      }
    }

    /* ---------- rendering ---------- */

    function updateDirty() {
      const dirty = changedRows();
      const selfDirty = isSelfDirty();
      for (const row of state.rows) {
        row.node.setAttribute("data-dirty", row.input.value.trim() !== aliasOf(row.peer) ? "true" : "false");
      }
      if (state.selfInput && state.selfInput.parentNode) {
        state.selfInput.parentNode.setAttribute("data-dirty", selfDirty ? "true" : "false");
      }
      const pending = dirty.length + (selfDirty ? 1 : 0);
      if (state.status) {
        state.status.textContent = state.saving
          ? "保存中…"
          : pending
            ? pending + " 台待保存"
            : state.peers.length
              ? "名称已同步"
              : "";
      }
      if (state.saveButton) {
        state.saveButton.disabled = pending === 0 || state.saving;
        state.saveButton.textContent = state.saving
          ? "保存中…"
          : pending > 1
            ? "保存全部（" + pending + "）"
            : "保存";
      }
      if (state.resetButton) state.resetButton.style.display = pending ? "" : "none";
    }

    function rowNode(peer) {
      const node = el("li", "dshPeersRow");
      node.setAttribute("data-online", peer.online ? "true" : "false");
      node.setAttribute("data-dirty", "false");

      const dot = el("span", "dshPeersDot");
      dot.setAttribute("data-off", peer.online ? "false" : "true");
      dot.setAttribute("aria-hidden", "true");

      const main = el("div", "dshPeersRowMain");
      const top = el("div", "dshPeersRowTop");
      top.appendChild(dot);
      const name = el("span", "dshPeersRowName", labelOf(peer));
      name.title = labelOf(peer);
      top.appendChild(name);
      // 三种来源在行上就要能分辨：可拨（无徽章，绿点）/ 已连接 / 仅连入（拨不过去）。
      if (!peer.dialable) {
        const badge = el("span", "dshPeersBadge", "仅连入");
        badge.title = "它连过本机，但没开「允许控制本机」，peer_delegate 拨不过去";
        top.appendChild(badge);
      } else if (peer.connected) {
        const badge = el("span", "dshPeersBadge", "已连接");
        badge.title = "这台设备此刻正连着本机";
        top.appendChild(badge);
      }
      main.appendChild(top);

      const metaParts = [peer.platform || "?", shortId(peer.workspaceId) || "无工作区", shortId(peer.hostId)];
      if (!peer.dialable) metaParts.push("不能派活");
      else if (!peer.online) metaParts.push("离线");
      else metaParts.push("可派活");
      main.appendChild(el("div", "dshPeersRowMeta", metaParts.join(" · ")));

      const input = document.createElement("input");
      input.className = "dshPeersInput";
      input.value = peer.alias || "";
      input.maxLength = 24;
      input.placeholder = "起个名字";
      input.setAttribute("aria-label", "设备别名：" + labelOf(peer));
      input.addEventListener("input", updateDirty);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void saveAll();
        }
      });

      node.appendChild(main);
      node.appendChild(input);
      return { node, input, peer };
    }

    function selfRowNode() {
      const self = state.self;
      const node = el("li", "dshPeersRow");
      node.setAttribute("data-online", "true");
      node.setAttribute("data-dirty", "false");
      node.setAttribute("data-self", "true");

      const dot = el("span", "dshPeersDot");
      dot.setAttribute("data-off", "false");
      dot.setAttribute("aria-hidden", "true");

      const main = el("div", "dshPeersRowMain");
      const top = el("div", "dshPeersRowTop");
      top.appendChild(dot);
      const name = el("span", "dshPeersRowName", self.name || "本机");
      name.title = self.name || "本机";
      top.appendChild(name);
      top.appendChild(el("span", "dshPeersBadge", "本机"));
      main.appendChild(top);

      const metaParts = ["这台设备", self.platform || "?", self.deviceId ? shortId(self.deviceId) : "未登录"];
      if (self.pending) metaParts.push("重启后生效");
      main.appendChild(el("div", "dshPeersRowMeta", metaParts.join(" · ")));

      const input = document.createElement("input");
      input.className = "dshPeersInput";
      input.value = selfNameOf(self);
      input.maxLength = 24;
      input.placeholder = "给这台电脑起个名字";
      input.setAttribute("aria-label", "本机名称");
      input.addEventListener("input", updateDirty);
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          void saveAll();
        }
      });

      node.appendChild(main);
      node.appendChild(input);
      state.selfInput = input;
      return node;
    }

    function paint() {
      if (!section) return;
      section.textContent = "";
      state.rows = [];
      state.selfInput = null;
      state.status = null;
      state.saveButton = null;
      state.resetButton = null;

      const head = el("div", "dshPeersPanelHead");
      const title = el("div", "dshPeersPanelTitle");
      title.appendChild(el("strong", null, "设备名称"));
      state.status = el("span", "dshPeersPanelStatus");
      title.appendChild(state.status);
      head.appendChild(title);
      const refresh = el("button", "dshPeersRefresh", state.loading ? "…" : "⟳");
      refresh.type = "button";
      refresh.title = "刷新";
      refresh.disabled = state.loading;
      refresh.addEventListener("click", () => void load());
      head.appendChild(refresh);
      section.appendChild(head);

      section.appendChild(el("p", "dshPeersHint", "派活时用这里的名字指代设备；可以一次改多台，再点保存。本机名改完要重启 DSH 才生效。"));


      if (state.loading && state.peers.length === 0 && !state.self) {
        section.appendChild(el("p", "dshPeersEmpty", "正在读取设备…"));
      } else if (state.peers.length === 0 && !state.self) {
        section.appendChild(el("p", "dshPeersEmpty", "还没有其他设备。在另一台设备上用同一账号登录 ds-harness-remote，并把它设为 Host。"));
      } else {
        const list = el("ul", "dshPeersList");
        if (state.self) list.appendChild(selfRowNode());
        for (const peer of state.peers) {
          const row = rowNode(peer);
          state.rows.push(row);
          list.appendChild(row.node);
        }
        section.appendChild(list);

        const footer = el("div", "dshPeersPanelFooter");
        const actions = el("span", "dshPeersFooterActions");
        state.resetButton = el("button", "dshPeersLinkButton", "还原");
        state.resetButton.type = "button";
        state.resetButton.addEventListener("click", () => {
          for (const row of state.rows) row.input.value = row.peer.alias || "";
          if (state.selfInput) state.selfInput.value = selfNameOf(state.self);
          state.note = null;
          state.error = null;
          updateDirty();
        });
        state.saveButton = el("button", "dshPeersSave", "保存");
        state.saveButton.type = "button";
        state.saveButton.disabled = true;
        state.saveButton.addEventListener("click", () => void saveAll());
        actions.appendChild(state.resetButton);
        actions.appendChild(state.saveButton);
        footer.appendChild(actions);
        section.appendChild(footer);
      }

      if (state.error) section.appendChild(el("p", "dshPeersError", state.error));
      if (state.note) section.appendChild(el("p", "dshPeersNote dshPeersOk", state.note));
      updateDirty();
    }

    function buildSection() {
      const root = el("section", "dshPeersPanel");
      root.setAttribute(SECTION_ATTR, "");
      root.setAttribute("aria-label", "设备名称");
      return root;
    }

    /* ---------- mounting into the remote workspace dialog ---------- */

    function sweep() {
      if (typeof document === "undefined") return;
      const page = document.querySelector(PAGE_SELECTOR);
      if (!page) {
        section = null;
        return;
      }
      // Remote 的弹窗是 .dshRemotePage > .dshRemotePageBody（padding 24 / gap 24），
      // 内容必须挂进 Body，挂在 Page 上会掉到弹窗外面。
      const host = page.querySelector(BODY_SELECTOR) || page;
      const stale = page.querySelector("[" + SECTION_ATTR + "]");
      if (stale && stale.parentNode !== host) stale.parentNode.removeChild(stale);
      const existing = host.querySelector("[" + SECTION_ATTR + "]");
      if (existing) {
        section = existing;
      } else if (!section || !section.isConnected || section.parentNode !== host) {
        section = buildSection();
        paint();
        void load();
      }
      const footer = host.querySelector(FOOTER_SELECTOR);
      if (footer && footer.parentNode === host) {
        if (footer.previousSibling !== section) host.insertBefore(section, footer);
      } else if (section.parentNode !== host || host.lastElementChild !== section) {
        host.appendChild(section);
      }
    }

    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sweep();
      });
    }

    function apply() {
      if (typeof document === "undefined" || !document.body) return;
      installStyle();
      sweep();
      const observer = new MutationObserver(schedule);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    exports.apply = apply;
    exports.inject = [];
    return module.exports;
  },
});