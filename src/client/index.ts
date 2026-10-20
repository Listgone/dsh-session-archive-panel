/**
 * dsh-session-archive-panel —— client 端。
 *
 * 做两件事：
 *  1) 设置页（settings.section）新增「归档会话」：列出所有工作区的已归档会话，
 *     可恢复（unarchive）或打开确认删除（DSH 没有删会话的 API，只能提示）。
 *  2) 工作区侧栏默认不显示已归档会话：把 viewStore 的 archivedFilter 钉在 "default"。
 *
 * 依赖的 DSH 服务（均为内置）：
 *  - ctx.workspaces  : archiveSession / unarchiveSession
 *  - ctx.sessions    : 会话列表快照（标题、更新时间）
 *  - ctx.slots       : settings.section 注册
 *  - ctx.locale      : 中英文
 */
import type { SlotsService } from '@deepseek-ai/dsh-client-ui-slots'

type AnyCtx = {
  slots: SlotsService
  locale: any
  workspaces: any
  sessions: any
  effect: (fn: () => any, label?: string) => void
  logger?: any
}

export const inject = ['slots', 'locale', 'workspaces', 'sessions']

const NS = 'dsh-session-archive-panel'

const zh = {
  title: '归档会话',
  desc: '已归档的会话不会出现在工作区的会话列表里。在这里可以恢复它们，或查看详情。',
  empty: '还没有归档会话。',
  workspace: '工作区',
  ungrouped: '未归属工作区',
  updated: '更新时间',
  restore: '恢复',
  restoring: '恢复中…',
  restored: '已恢复',
  open: '打开',
  count: '共 {n} 个已归档会话',
  restoreAll: '全部恢复',
  hint: '提示：删除会话需要在会话详情里操作；DSH 目前没有“彻底删除”归档会话的接口。',
}

const en = {
  title: 'Archived sessions',
  desc: 'Archived sessions are hidden from the workspace session list. Restore them here.',
  empty: 'No archived sessions.',
  workspace: 'Workspace',
  ungrouped: 'Ungrouped',
  updated: 'Updated',
  restore: 'Restore',
  restoring: 'Restoring…',
  restored: 'Restored',
  open: 'Open',
  count: '{n} archived session(s)',
  restoreAll: 'Restore all',
  hint: 'Note: permanently deleting a session is done from the session itself; DSH has no API to purge archived sessions.',
}

function fmtTime(ts: number | undefined): string {
  if (!ts || !Number.isFinite(ts)) return ''
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/**
 * 由 host 侧快照推导出「已归档会话 + 它属于哪个工作区」。
 * workspaces 的 baseline 里有 items(含 sessionIds) 与 archivedSessionIds。
 */
function deriveArchived(workspaces: any, sessions: any) {
  const snap = workspaces?.list?.getSnapshot?.() ?? workspaces?.baseline?.() ?? {}
  const items: any[] = snap.items ?? []
  const archivedIds: string[] = (snap.archivedSessionIds ?? []).map(String)

  const byId: Record<string, any> = sessions?.list?.getSnapshot?.()?.byId ?? {}
  const owner: Record<string, { title: string; id: string }> = {}
  for (const ws of items) {
    const ids: string[] = String(ws.sessionIds ?? '').split(/\s+/).filter(Boolean)
    for (const sid of ids) owner[sid] = { title: ws.title || ws.path || '未命名', id: String(ws.workspaceId ?? ws.id ?? '') }
  }

  const rows = archivedIds.map((sid) => {
    const s = byId[sid] ?? {}
    return {
      id: sid,
      title: s.title || s.summary || '(无标题)',
      updated: Number(s.updatedAt ?? s.archivedAt ?? 0),
      workspace: owner[sid]?.title ?? '',
      cwd: s.cwd ?? '',
    }
  })
  rows.sort((a, b) => (b.updated || 0) - (a.updated || 0))
  return rows
}

function sectionComponent(ctx: AnyCtx, t: (k: string, p?: any) => string) {
  return function ArchiveSection() {
    // 用纯 DOM + 定时刷新，避免依赖 React hooks 的具体版本
    const root = document.createElement('div')
    root.style.cssText = 'padding:4px 2px;display:flex;flex-direction:column;gap:10px'

    const head = document.createElement('div')
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px'
    const cnt = document.createElement('div')
    cnt.style.cssText = 'font-size:12px;opacity:.65'
    const btnAll = document.createElement('button')
    btnAll.textContent = t('restoreAll')
    btnAll.style.cssText = 'font-size:12px;padding:4px 10px;border-radius:6px;cursor:pointer;' +
      'background:rgba(255,255,255,.06);color:inherit;border:1px solid rgba(255,255,255,.16)'
    head.append(cnt, btnAll)

    const desc = document.createElement('div')
    desc.textContent = t('desc')
    desc.style.cssText = 'font-size:12px;line-height:1.7;opacity:.62'

    const list = document.createElement('div')
    list.style.cssText = 'display:flex;flex-direction:column;gap:6px'

    const hint = document.createElement('div')
    hint.textContent = t('hint')
    hint.style.cssText = 'font-size:11px;line-height:1.7;opacity:.45;margin-top:4px'

    root.append(desc, head, list, hint)

    let busy = false

    const render = () => {
      const rows = deriveArchived(ctx.workspaces, ctx.sessions)
      cnt.textContent = t('count', { n: rows.length })
      btnAll.style.display = rows.length > 1 ? '' : 'none'
      list.textContent = ''
      if (rows.length === 0) {
        const e = document.createElement('div')
        e.textContent = t('empty')
        e.style.cssText = 'font-size:12px;opacity:.4;padding:14px 0'
        list.append(e)
        return
      }
      for (const r of rows) {
        const row = document.createElement('div')
        row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:8px;' +
          'background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)'

        const info = document.createElement('div')
        info.style.cssText = 'flex:1;min-width:0'
        const name = document.createElement('div')
        name.textContent = r.title
        name.style.cssText = 'font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'
        const meta = document.createElement('div')
        meta.textContent = [r.workspace ? t('workspace') + '：' + r.workspace : t('ungrouped'),
                            r.updated ? t('updated') + ' ' + fmtTime(r.updated) : ''].filter(Boolean).join('  ·  ')
        meta.style.cssText = 'font-size:11px;opacity:.45;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'
        info.append(name, meta)

        const b = document.createElement('button')
        b.textContent = t('restore')
        b.style.cssText = 'flex:0 0 auto;font-size:12px;padding:4px 12px;border-radius:6px;cursor:pointer;' +
          'background:rgba(90,180,255,.14);color:inherit;border:1px solid rgba(90,180,255,.35)'
        b.onclick = async () => {
          if (busy) return
          busy = true
          b.textContent = t('restoring')
          b.disabled = true
          try {
            await ctx.workspaces.unarchiveSession(r.id)
            b.textContent = t('restored')
            setTimeout(render, 500)
          } catch (e) {
            b.textContent = t('restore')
            b.disabled = false
            ctx.logger?.warn?.('[' + NS + '] unarchive failed', e)
          } finally {
            busy = false
          }
        }
        row.append(info, b)
        list.append(row)
      }
    }

    btnAll.onclick = async () => {
      if (busy) return
      busy = true
      const rows = deriveArchived(ctx.workspaces, ctx.sessions)
      for (const r of rows) {
        try { await ctx.workspaces.unarchiveSession(r.id) } catch {}
      }
      busy = false
      render()
    }

    render()
    const timer = setInterval(render, 2500)
    // 组件卸载时清掉定时器
    ;(root as any).__cleanup = () => clearInterval(timer)
    return root
  }
}

/**
 * 把侧栏的 archivedFilter 钉在 "default"（隐藏已归档）。
 *
 * DSH 的 viewStore 是持久化的（localStorage: dsh.workspace.view.v5），
 * 一旦用户点过「全部对话（显示已归档）」，之后每次打开都会显示归档项。
 * 这里在插件启动时把它纠正回 default。
 */
function pinArchivedFilterHidden(ctx: AnyCtx): void {
  try {
    const raw = localStorage.getItem('dsh.workspace.view.v5')
    if (!raw) return
    const obj = JSON.parse(raw)
    const state = obj?.state ?? obj?.value ?? obj
    if (!state || typeof state !== 'object') return
    if (state.archivedFilter && state.archivedFilter !== 'default') {
      state.archivedFilter = 'default'
      const next = obj?.state ? { ...obj, state } : state
      localStorage.setItem('dsh.workspace.view.v5', JSON.stringify(next))
      ctx.logger?.info?.('[' + NS + '] archivedFilter reset to "default"')
    }
  } catch (e) {
    ctx.logger?.warn?.('[' + NS + '] reset archivedFilter failed', e)
  }
}

export function apply(ctx: AnyCtx): void {
  const t = (k: string, p?: any) => {
    const dict: any = ctx.locale?.current?.() === 'en' ? en : zh
    let s = dict[k] ?? zh[k as keyof typeof zh] ?? k
    if (p) for (const key of Object.keys(p)) s = s.replace('{' + key + '}', String(p[key]))
    return s
  }

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), NS + ': dicts')

  // 1) 设置页
  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'session-archive',
    order: 45,
    label: () => t('title'),
    locale: NS,
  }, sectionComponent(ctx, t))), NS + ': settings page')

  // 2) 侧栏隐藏已归档
  ctx.effect(() => {
    pinArchivedFilterHidden(ctx)
  }, NS + ': hide archived in sidebar')
}
