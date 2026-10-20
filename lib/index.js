/**
 * dsh-session-archive-panel — host half.
 *
 * 只做一件界面做不到的事：把「彻底删除」变成真的删掉磁盘上的会话文件。
 * 一个接口给「设置 → 归档会话」页：
 *   POST /dsh-session-archive-panel/api/delete  { id } → 删除 sessions/<工作区>/<会话 id>/ 整个目录
 *
 * 安全边界：只允许删 sessions/ 下面、目录名正好等于会话 id 的那一个目录；
 * id 先做字符白名单校验，拼出来的路径再校验一次必须落在 sessions/ 里面。
 */
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import { readdir, rm, stat } from "node:fs/promises";

export const name = "dsh-session-archive-panel";

/** 需要 Web 服务来挂路由。 */
export const inject = ["webServer"];

const API_PREFIX = "/dsh-session-archive-panel/api";
/** 会话 id 只允许这些字符，避免任何路径穿越。归档列表里的 id 形如 `session-<uuid>`。 */
const ID_RE = /^(?:session-)?[0-9A-Za-z-]{8,80}$/;

function homeRoot() {
	const env = process.env.DSH_HOME;
	return env !== undefined && env.length > 0 ? env : join(homedir(), ".dsh");
}

function sessionsRoot() {
	return join(homeRoot(), "sessions");
}

/** Loopback + 同源校验，和 DSH 自带 /api 的信任策略一致。 */
function isTrustedRequest(req) {
	const host = typeof req.headers?.host === "string" ? req.headers.host : "";
	const hostname = host.split(":")[0].toLowerCase();
	const loopback = hostname === "localhost" || hostname === "[::1]" || /^127\./.test(hostname);
	if (!loopback) return false;
	const origin = req.headers?.origin;
	if (origin === void 0 || origin === "null") return true;
	try {
		return new URL(origin).host === host;
	} catch {
		return false;
	}
}

function readBody(req) {
	return new Promise((resolveBody, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > 256 * 1024) {
				reject(new Error("body too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
		req.on("error", reject);
	});
}

function sendJson(res, code, payload) {
	try {
		res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
		res.end(JSON.stringify(payload));
	} catch {
		/* client gone */
	}
}

/**
 * 在 sessions/<工作区目录>/<会话 id>/ 里找这条会话。
 * DSH 的会话 id 本身就带 `session-` 前缀，目录名等于 id；万一以后变成裸 uuid，
 * 这里也补一次前缀再找。
 */
async function findSessionDir(id) {
	const root = resolve(sessionsRoot());
	let entries;
	try {
		entries = await readdir(root, { withFileTypes: true });
	} catch {
		return null;
	}
	const leaves = id.startsWith("session-") ? [id] : [`session-${id}`, id];
	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		for (const leaf of leaves) {
			const candidate = resolve(root, entry.name, leaf);
			// 防御：只接受 sessions/ 下面的目录
			if (!candidate.startsWith(root + sep)) continue;
			try {
				const info = await stat(candidate);
				if (info.isDirectory()) return candidate;
			} catch {
				/* 不在这个工作区下，继续 */
			}
		}
	}
	return null;
}

/** 递归统计目录大小（最多遍历 5000 个条目，够用且不会卡死）。 */
async function dirSize(dir) {
	let total = 0;
	let seen = 0;
	const stack = [dir];
	while (stack.length > 0 && seen < 5000) {
		const current = stack.pop();
		let entries;
		try {
			entries = await readdir(current, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			seen += 1;
			const path = join(current, entry.name);
			if (entry.isDirectory()) {
				stack.push(path);
			} else {
				try {
					const info = await stat(path);
					total += info.size;
				} catch {
					/* 读不到就算 0 */
				}
			}
		}
	}
	return total;
}

export function apply(ctx) {
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: API_PREFIX,
		handler: async (req, res) => {
			if (!isTrustedRequest(req)) {
				sendJson(res, 403, { ok: false, error: "forbidden" });
				return;
			}
			const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
			const path = pathname.replace(/^\/dsh-session-archive-panel\/api/, "") || "/";

			if (req.method === "POST" && path === "/delete") {
				let id;
				try {
					const body = JSON.parse(await readBody(req));
					id = body.id;
				} catch {
					sendJson(res, 200, { ok: false, error: "bad body" });
					return;
				}
				if (typeof id !== "string" || !ID_RE.test(id)) {
					sendJson(res, 200, { ok: false, error: "invalid session id" });
					return;
				}
				const target = await findSessionDir(id);
				if (target === null) {
					sendJson(res, 200, { ok: false, error: "session file not found" });
					return;
				}
				const bytes = await dirSize(target);
				try {
					await rm(target, { recursive: true, force: true });
				} catch (error) {
					sendJson(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) });
					return;
				}
				sendJson(res, 200, { ok: true, bytes, path: target });
				return;
			}

			sendJson(res, 404, { ok: false, error: "not found" });
		}
	}), "dsh-session-archive-panel: delete route");
}
