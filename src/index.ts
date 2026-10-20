/**
 * dsh-session-archive-panel —— host 端（极简）。
 *
 * 这个插件的主体全部在浏览器端（lib/client.js）：设置页新增「归档会话」，
 * 直接调用 DSH 已有的 workspaces.archiveSession / unarchiveSession。
 * host 端只需要存在一个可加载的模块，不做任何事。
 */
export const name = 'dsh-session-archive-panel'

export function apply(): void {
  // 无 host 侧逻辑：归档/恢复都走 DSH 自带的 workspace 服务。
}
