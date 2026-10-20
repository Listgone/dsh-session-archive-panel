window.__ModuleLoader__.load({
	id: "dsh-session-archive-panel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const h = React.createElement;

		const NS = "dsh-session-archive-panel";
		/** 主机端接口前缀（lib/index.js 里注册）。 */
		const API = "/dsh-session-archive-panel/api";
		/** sessionStorage：自动刷新只做一次，避免反复刷新。 */
		const RELOAD_FLAG = "dsh.sessionArchivePanel.applied.v1";
		/** localStorage：本机已彻底删掉的会话 id。它们仍挂在归档标记上（DSH 内存里还有旧索引），
		 *  这里记住并从列表里滤掉；等重启后索引刷新、会话真的不存在了，再把归档标记清掉。 */
		const PURGED_KEY = "dsh.sessionArchivePanel.purged.v1";
		/** 侧栏视图状态的持久化 key（ui-workspace 的 defineStore persist）。 */
		const VIEW_KEY = "dsh.workspace.view.v5";
		/** 每次「加载更多」追加的条数；列表默认只展开这么多。 */
		const PAGE_SIZE = 5;

		const zh = {
			title: "归档会话",
			nav: "归档会话",
			desc: "已归档的会话不会出现在工作区的会话列表里。可以在下面恢复，也可以彻底删除。",
			empty: "还没有归档会话。",
			noMatch: "没有匹配的归档会话。",
			workspace: "工作区",
			ungrouped: "未归属工作区",
			updated: "更新于",
			restore: "恢复",
			restoring: "恢复中…",
			remove: "彻底删除",
			confirm: "再点一次确认删除",
			removing: "删除中…",
			count: "共 {n} 个已归档会话",
			countMatch: "匹配 {n} 个（共 {total} 个）",
			restoreAll: "全部恢复",
			removeAll: "全部删除",
			confirmAll: "再点一次确认全部删除（{n} 条）",
			deletingAll: "删除中 {done}/{total}…",
			deletedAll: "已删除 {n} 条（{size}），文件已从磁盘移除。",
			deletedAllPartial: "已删除 {n} 条（{size}），{failed} 条失败。",
			searchPlaceholder: "搜索标题、工作区…",
			collapse: "收起",
			expand: "展开",
			loadMore: "加载更多（还有 {n} 条）",
			hint: "「彻底删除」会直接删掉这段对话存在磁盘上的会话文件，删了不能恢复；只点一次不会删，要点两下。删完本页立刻看不到它；DSH 内存里还留着它的旧索引，重启后彻底清空，期间它也不会出现在侧栏。",
			errPrefix: "删除失败：",
			deleted: "已删除（{size}），文件已从磁盘移除。",
			sidebarOn: "工作区侧栏已隐藏全部已归档会话。",
			sidebarOff: "工作区侧栏当前显示着已归档会话，点右侧按钮修复。",
			fixSidebar: "修复并刷新"
		};

		const en = {
			title: "Archived sessions",
			nav: "Archived sessions",
			desc: "Archived sessions are hidden from the workspace session list. Restore them below, or delete them for good.",
			empty: "No archived sessions.",
			noMatch: "No archived session matches your search.",
			workspace: "Workspace",
			ungrouped: "Ungrouped",
			updated: "updated",
			restore: "Restore",
			restoring: "Restoring…",
			remove: "Delete",
			confirm: "Click again to delete",
			removing: "Deleting…",
			count: "{n} archived session(s)",
			countMatch: "{n} matching (of {total})",
			restoreAll: "Restore all",
			removeAll: "Delete all",
			confirmAll: "Click again to delete all ({n})",
			deletingAll: "Deleting {done}/{total}…",
			deletedAll: "Deleted {n} item(s) ({size}); the files are gone from disk.",
			deletedAllPartial: "Deleted {n} item(s) ({size}); {failed} failed.",
			searchPlaceholder: "Search title or workspace…",
			collapse: "Collapse",
			expand: "Expand",
			loadMore: "Load more ({n} left)",
			hint: "“Delete” removes this conversation's session file from disk. That cannot be undone; the first click only asks for confirmation. The row disappears here at once, and DSH's in-memory index is cleared on the next restart (it never shows up in the sidebar in the meantime).",
			errPrefix: "Delete failed: ",
			deleted: "Deleted ({size}); the file is gone from disk.",
			sidebarOn: "All archived sessions are hidden from the workspace sidebar.",
			sidebarOff: "The workspace sidebar is currently showing archived sessions.",
			fixSidebar: "Fix and reload"
		};

		const css = [
			".dsa_section{width:100%;max-width:680px;display:flex;flex-direction:column;gap:10px;color:var(--dsw-alias-label-primary)}",
			".dsa_desc{font-size:12px;line-height:1.7;color:var(--dsw-alias-label-tertiary)}",
			".dsa_head{display:flex;align-items:center;justify-content:space-between;gap:10px}",
			".dsa_count{font-size:12px;color:var(--dsw-alias-label-secondary);flex:1;min-width:0}",
			".dsa_actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}",
			".dsa_search{width:100%;box-sizing:border-box;font:inherit;font-size:13px;line-height:20px;padding:6px 10px;border-radius:8px;color:var(--dsw-alias-label-primary);background-color:var(--dsw-alias-bg-layer-3);background-image:linear-gradient(var(--dsw-alias-bg-layer-3),var(--dsw-alias-bg-layer-3)),linear-gradient(var(--dsw-alias-bg-layer-3),var(--dsw-alias-bg-layer-3));border:1px solid var(--dsw-alias-border-l2);outline:none}",
			".dsa_search:focus{border-color:var(--dsw-alias-state-business-primary)}",
			".dsa_search::placeholder{color:var(--dsw-alias-label-tertiary)}",
			".dsa_list{display:flex;flex-direction:column;gap:6px}",
			".dsa_row{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;background-color:var(--dsw-alias-bg-layer-3);background-image:linear-gradient(var(--dsw-alias-bg-layer-3),var(--dsw-alias-bg-layer-3)),linear-gradient(var(--dsw-alias-bg-layer-3),var(--dsw-alias-bg-layer-3));border:1px solid var(--dsw-alias-border-l2)}",
			".dsa_info{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}",
			".dsa_name{font-size:13px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".dsa_meta{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
			".dsa_btn{flex:0 0 auto;font:inherit;font-size:12px;line-height:18px;padding:4px 12px;border-radius:7px;cursor:pointer;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l1)}",
			".dsa_btn:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}",
			".dsa_btn:disabled{opacity:.5;cursor:default}",
			".dsa_btnDanger:hover:not(:disabled){border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}",
			".dsa_btnConfirm{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}",
			".dsa_more{width:100%;font:inherit;font-size:12px;line-height:18px;padding:7px 0;border-radius:8px;cursor:pointer;color:var(--dsw-alias-label-secondary);background-color:var(--dsw-alias-bg-layer-3);background-image:linear-gradient(var(--dsw-alias-bg-layer-3),var(--dsw-alias-bg-layer-3)),linear-gradient(var(--dsw-alias-bg-layer-3),var(--dsw-alias-bg-layer-3));border:1px dashed var(--dsw-alias-border-l1)}",
			".dsa_more:hover{color:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary)}",
			".dsa_empty{font-size:12px;padding:18px 0;color:var(--dsw-alias-label-tertiary)}",
			".dsa_hint{font-size:11px;line-height:18px;color:var(--dsw-alias-label-tertiary)}",
			".dsa_err{font-size:11px;line-height:18px;color:var(--dsw-alias-state-error-primary)}",
			".dsa_banner{display:flex;align-items:center;gap:10px;font-size:12px;line-height:18px;padding:8px 12px;border-radius:8px;color:var(--dsw-alias-state-warning-primary);background-color:var(--dsw-alias-bg-layer-2);background-image:linear-gradient(color-mix(in srgb,var(--dsw-alias-state-warning-primary) 12%,transparent),color-mix(in srgb,var(--dsw-alias-state-warning-primary) 12%,transparent)),linear-gradient(var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2)),linear-gradient(var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2))}",
			".dsa_bannerOk{color:var(--dsw-alias-state-success-primary);background-image:linear-gradient(color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent),color-mix(in srgb,var(--dsw-alias-state-success-primary) 10%,transparent)),linear-gradient(var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2)),linear-gradient(var(--dsw-alias-bg-layer-2),var(--dsw-alias-bg-layer-2))}"
		].join("");

		const cssTagId = "dsh-session-archive-panel/panel.css?v=6";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(cssTagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-session-archive-panel";
			tag.dataset.pluginCss = cssTagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		/** 客户端根 context，apply 时写入（组件闭包里用）。 */
		var CTX = null;

		function readPurged() {
			try {
				var raw = localStorage.getItem(PURGED_KEY);
				var list = raw ? JSON.parse(raw) : [];
				return Array.isArray(list) ? list.map(String) : [];
			} catch (e) {
				return [];
			}
		}

		function writePurged(ids) {
			try {
				localStorage.setItem(PURGED_KEY, JSON.stringify(Array.from(new Set(ids.map(String)))));
			} catch (e) {
				/* ignore */
			}
		}

		function addPurged(id) {
			var list = readPurged();
			if (list.indexOf(id) < 0) list.push(id);
			writePurged(list);
		}

		/** 会话列表快照的 byId（标题、时间都从这里取）。 */
		function sessionIndex() {
			try {
				var ss = CTX && CTX.get("sessions");
				var sl = ss && ss.list;
				var snap = (sl && sl.getSnapshot && sl.getSnapshot()) || {};
				return snap.byId || {};
			} catch (e) {
				return {};
			}
		}

		function fmtTime(ts) {
			if (!ts || !isFinite(ts)) return "";
			var d = new Date(ts);
			var p = function (n) { return String(n).padStart(2, "0"); };
			return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
				" " + p(d.getHours()) + ":" + p(d.getMinutes());
		}

		function fmtSize(bytes) {
			var n = Number(bytes) || 0;
			if (n < 1024) return n + " B";
			if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
			if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + " MB";
			return (n / 1024 / 1024 / 1024).toFixed(2) + " GB";
		}

		/** 读 workspaces / sessions 两个客户端服务的快照，拼出归档行（剔掉本机已彻底删除的）。 */
		function deriveRows() {
			var snap = {};
			try {
				var ws = CTX && CTX.get("workspaces");
				var wl = ws && ws.list;
				snap = (wl && wl.getSnapshot && wl.getSnapshot()) || {};
			} catch (e) { snap = {}; }

			var byId = sessionIndex();
			var purged = new Set(readPurged());

			var items = snap.items || [];
			var archived = (snap.archivedSessionIds || []).map(String);

			var owner = {};
			for (var i = 0; i < items.length; i++) {
				var w = items[i];
				var ids = (w && w.sessionIds) || [];
				for (var k = 0; k < ids.length; k++) owner[String(ids[k])] = w.title || w.path || "";
			}

			var rows = [];
			for (var j = 0; j < archived.length; j++) {
				var sid = archived[j];
				if (purged.has(sid)) continue;
				var s = byId[sid] || {};
				rows.push({
					id: sid,
					title: s.displayTitle || s.title || s.summary || ("会话 " + sid.slice(0, 8)),
					workspace: owner[sid] || s.workspaceTitle || "",
					updated: Number(s.updatedAt || s.createdAt || 0)
				});
			}
			rows.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
			return rows;
		}

		/** 搜索：标题、工作区、会话 id 任一命中即算匹配（忽略大小写）。 */
		function matchRow(row, query) {
			if (!query) return true;
			var q = query.toLowerCase();
			if (row.title && row.title.toLowerCase().indexOf(q) >= 0) return true;
			if (row.workspace && row.workspace.toLowerCase().indexOf(q) >= 0) return true;
			return row.id.toLowerCase().indexOf(q) >= 0;
		}

		/**
		 * 把侧栏视图状态里的 archivedFilter 钉回 "default"（= 隐藏已归档，全局生效）。
		 * @returns 是否真的改了（改了就说明当前页面读到的还是旧的，需要刷新一次）。
		 */
		function pinArchivedFilter() {
			try {
				var raw = localStorage.getItem(VIEW_KEY);
				if (!raw) return false;
				var obj = JSON.parse(raw);
				if (!obj || typeof obj !== "object") return false;
				var state = obj.state && typeof obj.state === "object" ? obj.state : obj;
				if (state.archivedFilter === "default") return false;
				state.archivedFilter = "default";
				localStorage.setItem(VIEW_KEY, JSON.stringify(obj));
				return true;
			} catch (e) {
				return false;
			}
		}

		/** 侧栏当前是否已经隐藏归档（能读到持久化值就以它为准）。 */
		function sidebarHidden() {
			try {
				var raw = localStorage.getItem(VIEW_KEY);
				if (!raw) return true;
				var obj = JSON.parse(raw);
				var state = obj && obj.state && typeof obj.state === "object" ? obj.state : obj;
				return !state || (state.archivedFilter || "default") === "default";
			} catch (e) {
				return true;
			}
		}

		function ArchiveSection(props) {
			var t = props.t || function (k) { return zh[k] || k; };
			var tick = React.useState(0);
			var setTick = tick[1];
			var queryState = React.useState("");
			var query = queryState[0];
			var setQuery = queryState[1];
			var limitState = React.useState(PAGE_SIZE);
			var limit = limitState[0];
			var setLimit = limitState[1];
			var collapsedState = React.useState(false);
			var collapsed = collapsedState[0];
			var setCollapsed = collapsedState[1];
			var busyState = React.useState(null);
			var busy = busyState[0];
			var setBusy = busyState[1];
			var confirmState = React.useState(null);
			var confirmId = confirmState[0];
			var setConfirmId = confirmState[1];
			var errState = React.useState("");
			var err = errState[0];
			var setErr = errState[1];
			var doneState = React.useState("");
			var done = doneState[0];
			var setDone = doneState[1];
			var confirmAllState = React.useState(false);
			var confirmAll = confirmAllState[0];
			var setConfirmAll = confirmAllState[1];

			React.useEffect(function () {
				var ws = CTX && CTX.get("workspaces");
				var off = ws && ws.list && ws.list.subscribe ? ws.list.subscribe(function () { setTick(function (x) { return x + 1; }); }) : null;
				if (typeof off !== "function") off = null;
				return function () { if (off) off(); };
			}, []);

			// 收尾：本机记着「已彻底删除」的会话，等重启后会话索引刷新、它确实不在列表里了，
			// 就把残留的归档标记清掉（此时它不在会话列表里，清标记不会让它出现在侧栏）。
			React.useEffect(function () {
				var purged = readPurged();
				if (purged.length === 0) return;
				var byId = sessionIndex();
				if (Object.keys(byId).length === 0) return;
				var gone = purged.filter(function (id) { return byId[id] === undefined; });
				if (gone.length === 0) return;
				var ws = CTX && CTX.get("workspaces");
				if (!ws) return;
				gone.forEach(function (id) {
					Promise.resolve(ws.unarchiveSession(id)).catch(function () { /* 清理失败下次再来 */ });
				});
				writePurged(purged.filter(function (id) { return gone.indexOf(id) < 0; }));
				setTick(function (x) { return x + 1; });
			}, [tick[0]]);

			var rows = React.useMemo(function () { return deriveRows(); }, [tick[0]]);
			var filtered = React.useMemo(function () {
				return query ? rows.filter(function (r) { return matchRow(r, query); }) : rows;
			}, [rows, query]);
			var visible = filtered.slice(0, limit);
			var remaining = filtered.length - visible.length;
			var hidden = sidebarHidden();

			var restore = function (id) {
				setBusy(id + ":r");
				Promise.resolve().then(function () {
					return CTX.get("workspaces").unarchiveSession(id);
				}).then(function () {
					setBusy(null);
					setTick(function (x) { return x + 1; });
				}, function (reason) {
					console.warn("[" + NS + "] unarchive failed", reason);
					setBusy(null);
				});
			};

			/** 真删除：主机端直接删掉磁盘上的会话目录，再由归档接口清掉归档标记。 */
			var doDelete = function (id) {
				setBusy(id + ":d");
				setErr("");
				setDone("");
				setConfirmId(null);
				var removed = 0;
				fetch(API + "/delete", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ id: id })
				}).then(function (r) { return r.json(); }).then(function (res) {
					if (res && res.ok) {
						removed = Number(res.bytes) || 0;
						return null;
					}
					// 文件早就不在了：当成删除成功处理，免得这条永远卡在列表里。
					if (res && typeof res.error === "string" && res.error.indexOf("not found") >= 0) return null;
					throw new Error((res && res.error) || "host refused");
				}).then(function () {
					// 关键：这里**不能**调取消归档。会话文件删了，但 DSH 内存里还留着它的
					// 索引条目；一旦取消归档，那条旧记录会立刻出现在侧栏「未分组」里。
					// 正确做法是让它保持归档（侧栏看不见），只在本机记住「已删除」把它从本页滤掉；
					// 重启后索引刷新、会话真的不存在了，再由下面的清理逻辑把归档标记收掉。
					addPurged(id);
					setBusy(null);
					setDone(t("deleted", { size: fmtSize(removed) }));
					setTick(function (x) { return x + 1; });
				}).catch(function (reason) {
					setBusy(null);
					setErr((reason && reason.message) || String(reason));
					console.warn("[" + NS + "] delete failed", reason);
				});
			};

			var restoreAll = function () {
				setBusy("*");
				var chain = Promise.resolve();
				var ws = CTX.get("workspaces");
				filtered.forEach(function (r) {
					chain = chain.then(function () { return Promise.resolve(ws.unarchiveSession(r.id)).catch(function () {}); });
				});
				chain.then(function () {
					setBusy(null);
					setTick(function (x) { return x + 1; });
				});
			};

			/** 全部删除：对当前列表（搜索状态下就是筛出来的那些）逐条真删，边删边更新进度。 */
			var deleteAll = function () {
				var targets = filtered.map(function (r) { return r.id; });
				if (targets.length === 0) return;
				setBusy("all");
				setErr("");
				setDone("");
				setConfirmAll(false);
				var chain = Promise.resolve();
				var deleted = 0;
				var bytes = 0;
				var failed = 0;
				targets.forEach(function (id, index) {
					chain = chain.then(function () {
						return fetch(API + "/delete", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ id: id })
						}).then(function (r) { return r.json(); }).then(function (res) {
							if (res && res.ok) {
								deleted += 1;
								bytes += Number(res.bytes) || 0;
								return;
							}
							if (res && typeof res.error === "string" && res.error.indexOf("not found") >= 0) {
								deleted += 1;
								return;
							}
							failed += 1;
						}, function () { failed += 1; });
					}).then(function () {
						// 同单条删除：只在本机登记「已删除」，不取消归档（否则会冒到侧栏「未分组」）。
						addPurged(id);
					}).then(function () {
						setBusy("all:" + (index + 1) + "/" + targets.length);
						setTick(function (x) { return x + 1; });
					});
				});
				chain.then(function () {
					setBusy(null);
					setTick(function (x) { return x + 1; });
					setDone(failed > 0
						? t("deletedAllPartial", { n: deleted, size: fmtSize(bytes), failed: failed })
						: t("deletedAll", { n: deleted, size: fmtSize(bytes) }));
				});
			};

			var fixSidebar = function () {
				pinArchivedFilter();
				try { location.reload(); } catch (e) { /* ignore */ }
			};

			var onQuery = function (e) {
				setQuery(e.target.value);
				setLimit(PAGE_SIZE);
			};

			var onDeleteClick = function (id) {
				if (confirmId !== id) {
					setConfirmId(id);
					setTimeout(function () {
						setConfirmId(function (current) { return current === id ? null : current; });
					}, 4000);
					return;
				}
				doDelete(id);
			};

			var onDeleteAllClick = function () {
				if (busy !== null) return;
				if (!confirmAll) {
					setConfirmAll(true);
					setTimeout(function () { setConfirmAll(false); }, 5000);
					return;
				}
				deleteAll();
			};

			var children = [];

			children.push(h("div", { key: "desc", className: "dsa_desc" }, t("desc")));

			children.push(h("div", { key: "banner", className: "dsa_banner" + (hidden ? " dsa_bannerOk" : "") }, [
				h("span", { key: "txt", style: { flex: 1 } }, hidden ? t("sidebarOn") : t("sidebarOff")),
				hidden ? null : h("button", { key: "fix", type: "button", className: "dsa_btn", onClick: fixSidebar }, t("fixSidebar"))
			]));

			children.push(h("div", { key: "head", className: "dsa_head" }, [
				h("span", { key: "cnt", className: "dsa_count" },
					query ? t("countMatch", { n: filtered.length, total: rows.length }) : t("count", { n: rows.length })),
				h("div", { key: "acts", className: "dsa_actions" }, [
					!collapsed && rows.length > 1 ? h("button", {
						key: "all", type: "button", className: "dsa_btn", disabled: busy !== null, onClick: restoreAll
					}, t("restoreAll")) : null,
					!collapsed && filtered.length > 0 ? h("button", {
						key: "delAll", type: "button",
						className: "dsa_btn dsa_btnDanger" + (confirmAll ? " dsa_btnConfirm" : ""),
						disabled: busy !== null,
						onClick: onDeleteAllClick
					}, busy === "all" ? t("removing")
						: (typeof busy === "string" && busy.indexOf("all:") === 0 ? t("deletingAll", {
							done: Number(busy.split(":")[1].split("/")[0]),
							total: Number(busy.split(":")[1].split("/")[1])
						}) : (confirmAll ? t("confirmAll", { n: filtered.length }) : t("removeAll")))) : null,
					h("button", {
						key: "fold", type: "button", className: "dsa_btn",
						onClick: function () { setCollapsed(!collapsed); }
					}, collapsed ? t("expand") : t("collapse"))
				])
			]));

			if (!collapsed) {
				children.push(h("input", {
					key: "search",
					className: "dsa_search",
					type: "text",
					value: query,
					placeholder: t("searchPlaceholder"),
					onChange: onQuery
				}));

				if (err) {
					children.push(h("div", { key: "err", className: "dsa_err" }, t("errPrefix") + err));
				}
				if (done) {
					children.push(h("div", { key: "done", className: "dsa_hint" }, done));
				}

				if (filtered.length === 0) {
					children.push(h("div", { key: "empty", className: "dsa_empty" }, query ? t("noMatch") : t("empty")));
				} else {
					children.push(h("div", { key: "list", className: "dsa_list" }, visible.map(function (r) {
						var meta = [];
						meta.push(r.workspace ? t("workspace") + "：" + r.workspace : t("ungrouped"));
						if (r.updated) meta.push(t("updated") + " " + fmtTime(r.updated));
						var rowBusy = busy === r.id + ":r" || busy === r.id + ":d" || busy === "*";
						var confirming = confirmId === r.id;
						return h("div", { key: r.id, className: "dsa_row" }, [
							h("div", { key: "info", className: "dsa_info" }, [
								h("div", { key: "name", className: "dsa_name", title: r.title }, r.title),
								h("div", { key: "meta", className: "dsa_meta" }, meta.join("  ·  "))
							]),
							h("button", {
								key: "restore", type: "button", className: "dsa_btn", disabled: rowBusy,
								onClick: function () { restore(r.id); }
							}, busy === r.id + ":r" ? t("restoring") : t("restore")),
							h("button", {
								key: "remove", type: "button",
								className: "dsa_btn dsa_btnDanger" + (confirming ? " dsa_btnConfirm" : ""),
								disabled: rowBusy,
								onClick: function () { onDeleteClick(r.id); }
							}, busy === r.id + ":d" ? t("removing") : (confirming ? t("confirm") : t("remove")))
						]);
					})));

					if (remaining > 0) {
						children.push(h("button", {
							key: "more", type: "button", className: "dsa_more",
							onClick: function () { setLimit(limit + PAGE_SIZE); }
						}, t("loadMore", { n: remaining })));
					}
				}

				children.push(h("div", { key: "hint", className: "dsa_hint" }, t("hint")));
			}

			return h("div", { className: "dsa_section" }, children);
		}

		const inject = ["slots", "locale", "workspaces", "sessions"];

		function apply(ctx) {
			CTX = ctx;

			const t = ctx.locale.bind(NS);
			ctx.effect(function () {
				return ctx.locale.register(NS, { zh: zh, en: en });
			}, "dsh-session-archive-panel: dictionaries");

			ctx.slots.inject("settings.section", function () {
				return ctx.slots.register({
					name: "settings.section",
					id: "session-archive",
					order: 45,
					label: function () { return t("nav"); },
					locale: NS
				}, ArchiveSection);
			});

			// 需求 4：所有工作区的会话区都不显示已归档项。原生默认就是隐藏，
			// 只要把持久化视图状态钉回 "default" 即可；本次页面已经按旧值渲染时
			// 自动刷新一次（sessionStorage 打标，最多一次，不会循环）。
			const changed = pinArchivedFilter();
			if (changed) {
				let done = false;
				try { done = sessionStorage.getItem(RELOAD_FLAG) === "1"; } catch (e) { done = false; }
				if (!done) {
					try { sessionStorage.setItem(RELOAD_FLAG, "1"); } catch (e) { /* ignore */ }
					setTimeout(function () {
						try { location.reload(); } catch (e) { /* ignore */ }
					}, 1500);
				}
			}
		}

		exports.name = "dsh-session-archive-panel";
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
