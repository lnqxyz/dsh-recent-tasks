/**
 * Builds a standalone page that loads client.js with fake shell services and
 * runs the layout / state checks in a browser.
 *
 *   node tools/build-harness.js            # writes 临时/harness.html and prints the path
 *   open 临时/harness.html                 # checks run on load; the result lands in <title>
 *   open "临时/harness.html?preview"        # static light preview, no checks
 *   open "临时/harness.html?preview&dark"   # static dark preview
 *
 * RT_CLIENT / RT_THEME / RT_OUT override the inputs and the output path.
 * The theme file is optional; without it the page renders with the fallback
 * palette below, which is enough to judge layout but not exact colours.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC = process.env.RT_CLIENT || path.join(ROOT, 'client.js')
const plugin = fs.readFileSync(SRC, 'utf8').replace(/<\/script/gi, '<\\/script')

// DSH ships its design tokens inside app.asar; extract them yourself if you want
// the real colours, otherwise the aliases below keep every surface readable.
const FALLBACK_TOKENS = `:root{
  --dsw-font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif;
  --dsw-alias-bg-base:#ffffff; --dsw-alias-label-primary:#16181d; --dsw-alias-label-secondary:#4a4f57;
  --dsw-alias-label-tertiary:#8b919b; --dsw-alias-border-l1:#e6e8ec; --dsw-alias-border-l2:#d3d6dc;
  --dsw-alias-interactive-bg-hover:#f2f3f5; --dsw-alias-state-success-primary:#1a9f5b;
  --dsw-alias-state-warn-primary:#c8860d; --dsw-alias-state-error-primary:#d33d3d;
  --dsw-alias-state-business-primary:#2b6cf0; --dsw-alias-label-primary-foreground:#ffffff;
  --dsw-alias-button-primary-fill:#2b6cf0; --dsw-alias-button-primary-hover:#1f5ad4;
}`
const themeFile = process.env.RT_THEME || '/private/tmp/dsh-theme.css'
const theme = fs.existsSync(themeFile) ? fs.readFileSync(themeFile, 'utf8') : FALLBACK_TOKENS

// The shell's own panel-row rules, copied from its stylesheet. The entry's
// counts are laid out in this row's flex line, so the fixtures have to carry
// the real geometry (32px row, 6px gaps, 38px kept for the unpin button) or a
// measurement here would describe a row that does not exist in the app.
const shellRow = `
.panelEntry{position:relative;display:flex;border-inline:3px solid transparent;border-radius:8px;background-clip:padding-box}
.panelEntryWide > *:first-child{flex:1;min-width:0}
.panelEntryWide .panelRow{width:100%;margin:0;border-inline:0;padding-right:38px;background:transparent}
.panelRow{display:flex;align-items:center;gap:6px;min-height:32px;margin:0;padding:5px 12px;border:0;background:none;color:inherit;font:inherit;font-size:13px;line-height:22px;text-align:left;cursor:pointer}
.panelGlyph{flex:none;display:inline-flex;align-items:center;justify-content:center}
.panelTitle{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.panelEntryOwn > .panelRow{padding-right:38px}
`

const seedMatch = /const OTHER_SPEAKER_IDS = new Set\('([^']+)'/.exec(plugin)
const otherId = seedMatch ? seedMatch[1].split(',')[0] : ''

const shim = String.raw`
(function () {
  window.__ModuleLoader__ = { load(def) { window.__DEF = def } }

  let current = null
  let hookIndex = 0
  let pendingEffects = []

  function normalizeChildren(children) {
    const out = []
    const push = value => {
      if (value === null || value === undefined || value === false || value === true) return
      if (Array.isArray(value)) { value.forEach(push); return }
      out.push(value)
    }
    children.forEach(push)
    return out
  }

  function createElement(type, props) {
    const children = Array.prototype.slice.call(arguments, 2)
    return { type, props: props || {}, children: normalizeChildren(children) }
  }

  function sameDeps(a, b) {
    if (!a || !b) return false
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) if (!Object.is(a[i], b[i])) return false
    return true
  }

  const React = {
    createElement,
    useState(initial) {
      const inst = current
      const index = hookIndex++
      if (!(index in inst.hooks)) inst.hooks[index] = { value: typeof initial === 'function' ? initial() : initial }
      const slot = inst.hooks[index]
      if (!slot.setter) {
        slot.setter = next => {
          const value = typeof next === 'function' ? next(slot.value) : next
          if (Object.is(value, slot.value)) return
          slot.value = value
          schedule(inst)
        }
      }
      return [slot.value, slot.setter]
    },
    useEffect(fn, deps) {
      const inst = current
      const index = hookIndex++
      const prev = inst.hooks[index]
      const pending = !prev || !sameDeps(prev.deps, deps)
      inst.hooks[index] = { deps, fn, cleanup: prev ? prev.cleanup : undefined }
      if (pending) pendingEffects.push(index)
    },
    useMemo(fn, deps) {
      const inst = current
      const index = hookIndex++
      const prev = inst.hooks[index]
      if (prev && sameDeps(prev.deps, deps)) return prev.value
      const value = fn()
      inst.hooks[index] = { deps, value }
      return value
    },
    useRef(initial) {
      const inst = current
      const index = hookIndex++
      const prev = inst.hooks[index]
      if (prev && 'current' in prev) return prev
      const ref = { current: initial }
      inst.hooks[index] = ref
      return ref
    },
  }

  function eventName(key) {
    return key.slice(2).toLowerCase()
  }

  function toDom(node) {
    if (node === null || node === undefined || node === false || node === true) return document.createComment('')
    if (typeof node === 'string' || typeof node === 'number') return document.createTextNode(String(node))
    if (Array.isArray(node)) {
      const fragment = document.createDocumentFragment()
      node.forEach(child => fragment.appendChild(toDom(child)))
      return fragment
    }
    if (typeof node.type === 'function') {
      return document.createComment('function component not supported in harness')
    }
    const SVG_NS = 'http://www.w3.org/2000/svg'
    const el = node.type === 'svg' || node.type === 'path' || node.type === 'circle'
      ? document.createElementNS(SVG_NS, node.type)
      : document.createElement(node.type)
    const props = node.props || {}
    for (const key of Object.keys(props)) {
      if (key === 'children' || key === 'key') continue
      const value = props[key]
      if (value === undefined || value === null || value === false) continue
      if (key === 'className') { el.className = String(value); continue }
      if (key === 'style' && typeof value === 'object') { Object.assign(el.style, value); continue }
      if (key.length > 2 && key.slice(0, 2) === 'on' && typeof value === 'function') {
        el.addEventListener(eventName(key), value)
        continue
      }
      el.setAttribute(key, value === true ? '' : String(value))
    }
    for (const child of node.children) el.appendChild(toDom(child))
    return el
  }

  function renderInstance(inst) {
    current = inst
    hookIndex = 0
    pendingEffects = []
    const tree = inst.component(inst.props)
    current = null
    inst.container.textContent = ''
    inst.container.appendChild(toDom(tree))
    for (const index of pendingEffects) {
      const slot = inst.hooks[index]
      if (!slot || typeof slot.fn !== 'function') continue
      if (typeof slot.cleanup === 'function') {
        try { slot.cleanup() } catch (error) { console.warn(error) }
      }
      slot.cleanup = slot.fn()
    }
  }

  function schedule(inst) {
    if (inst.scheduled) return
    inst.scheduled = true
    Promise.resolve().then(() => {
      inst.scheduled = false
      if (!inst.dead) renderInstance(inst)
    })
  }

  window.__miniReact = {
    React,
    mount(component, props, container) {
      const inst = { component, props, container, hooks: [], scheduled: false, dead: false }
      renderInstance(inst)
      return inst
    },
    unmount(inst) {
      inst.dead = true
      for (const slot of inst.hooks) {
        if (slot && typeof slot.cleanup === 'function') {
          try { slot.cleanup() } catch (error) { console.warn(error) }
        }
      }
      inst.container.textContent = ''
    },
  }
})()
`

const harness = String.raw`
(function () {
  const { React, mount, unmount } = window.__miniReact
  const dicts = { zh: {}, en: {} }
  let translations = dicts.zh
  let captured = null
  const results = []
  const runtimes = []

  function interp(template, params) {
    if (!params) return template
    return template.replace(/\{(\w+)\}/g, (all, key) => (key in params ? String(params[key]) : all))
  }

  function check(name, condition, extra) {
    results.push((condition ? 'PASS ' : 'FAIL ') + name + (extra ? ' → ' + extra : ''))
  }

  function tick(ms) {
    return new Promise(resolve => setTimeout(resolve, ms === undefined ? 0 : ms))
  }

  function makeRuntime(options) {
    const opts = options || {}
    const calls = []
    const now = Date.now()
    const sessionsById = {}
    const ids = []
    for (let index = 0; index < (opts.sessions === undefined ? 40 : opts.sessions); index += 1) {
      const id = 's' + String(index + 1).padStart(2, '0')
      ids.push(id)
      sessionsById[id] = {
        id,
        displayTitle: '对话 ' + (index + 1),
        updatedAt: now - 60 * 60 * 1000 * (1 + index),
        cwd: '/Users/lnq/工作/项目A',
        running: false,
      }
    }
    if (${JSON.stringify(otherId)} !== '') {
      const otherSessionId = ${JSON.stringify(otherId)}
      sessionsById[otherSessionId] = {
        id: otherSessionId,
        displayTitle: '机器人发起的会话',
        updatedAt: now - 30 * 60 * 1000,
        cwd: '/Users/lnq/工作/项目A',
        running: false,
      }
      ids.push(otherSessionId)
    }
    // Sessions older than the 7 days the sweep keeps. The first three are still
    // inside the 10-day listing window, the rest already fell out of it, and the
    // sweep has to reach both.
    if (opts.old === true) {
      const day = 24 * 60 * 60 * 1000
      const ages = [8, 9, 9.5, 11, 12, 13]
      for (let index = 0; index < ages.length; index += 1) {
        const id = 'o' + String(index + 1).padStart(2, '0')
        ids.push(id)
        sessionsById[id] = {
          id,
          displayTitle: '旧对话 ' + (index + 1),
          updatedAt: now - day * ages[index],
          cwd: '/Users/lnq/工作/项目A',
          running: false,
        }
      }
    }
    // Sessions between the sweep cutoff and the ten-day window: they are on the
    // page right now, and the sweep is the thing that removes them from it.
    for (let index = 0; index < (opts.pageOld === undefined ? 0 : opts.pageOld); index += 1) {
      const id = 'm' + String(index + 1).padStart(2, '0')
      ids.push(id)
      sessionsById[id] = {
        id,
        displayTitle: '临过期对话 ' + (index + 1),
        updatedAt: now - 24 * 60 * 60 * 1000 * (8 + index),
        cwd: '/Users/lnq/工作/项目A',
        running: false,
      }
    }
    // Sessions older than the ten-day listing window, so the sweep button has
    // something to archive. They never show up in the page's own rows.
    for (let index = 0; index < (opts.oldSessions === undefined ? 0 : opts.oldSessions); index += 1) {
      const id = 'o' + String(index + 1).padStart(2, '0')
      ids.push(id)
      sessionsById[id] = {
        id,
        displayTitle: '旧对话 ' + (index + 1),
        updatedAt: now - 24 * 60 * 60 * 1000 * (8 + index),
        cwd: '/Users/lnq/工作/项目A',
        running: false,
      }
    }
    const runningIds = opts.running === undefined ? ['s01', 's07'] : opts.running
    for (const id of runningIds) {
      if (sessionsById[id]) sessionsById[id].running = true
    }
    let sessionState = { ids, byId: sessionsById }
    const listeners = []
    const workspaceItems = opts.workspaces === undefined
      ? [
          { workspaceId: 'w1', path: '/Users/lnq/工作/项目A', title: '项目A', sessionIds: [] },
          { workspaceId: 'w2', path: '/Users/lnq/工作/项目B', title: '', sessionIds: [] },
        ]
      : opts.workspaces
    let workspaceState = { items: workspaceItems, archivedSessionIds: [] }
    const workspaceListeners = []

    // Official DSH shape: UiSession.sessionStatus → Map<id, {running, pendingInteraction, completionUnread}>.
    const statusById = new Map()
    for (const id of ids) {
      statusById.set(id, { running: sessionsById[id].running, pendingInteraction: undefined, completionUnread: false })
    }
    // opts.pending seeds blocked Sessions before the first render, which is how
    // a visit that lands on someone already waiting is staged.
    for (const id of Object.keys(opts.pending || {})) {
      const kind = opts.pending[id]
      statusById.set(id, {
        ...(statusById.get(id) || { running: false, completionUnread: false }),
        pendingInteraction: { key: 'k-' + kind, kind, sessionId: id },
      })
    }
    const statusListeners = []
    function publishStatus() {
      for (const listener of statusListeners.slice()) listener()
    }
    function setStatus(id, patch) {
      const previous = statusById.get(id) || { running: undefined, pendingInteraction: undefined, completionUnread: false }
      statusById.set(id, { ...previous, ...patch })
      publishStatus()
    }
    function publishWorkspace() {
      for (const listener of workspaceListeners.slice()) listener()
    }
    function installArchived(archivedIds) {
      workspaceState = { items: workspaceState.items, archivedSessionIds: archivedIds.slice() }
      publishWorkspace()
    }

    // Mirrors the framework's single pending navigation slot.
    let pendingNavigation = null
    // Which main page owns the seat: the bridge tells the row's two meanings apart.
    let activePanelId = opts.activePanelId === undefined ? 'recent-tasks' : opts.activePanelId
    // The page asks who covers the Conversation seat, and hears when that changes.
    const panelListeners = []
    function publishPanel() {
      for (const listener of panelListeners.slice()) listener()
    }
    const disposers = []
    // Registrations onto the plugin manager's per-row configuration seat.
    const configSeats = []
    // Registrations onto the sidebar's panel list: the seat that draws the entry.
    const panelSeats = []
    // Extra mounts made by the tests (row-config views), torn down with the page.
    const disposed = []
    // The sidebar entry, mounted on demand: the shell owns that row, not the page.
    let entryMount = null

    // Settings: a mirror of what namespaces exist, plus one controller per row.
    const keepDaysState = { days: opts.keepDays === undefined ? 7 : opts.keepDays, revision: 1 }
    const settingsListeners = []
    function publishSettings() {
      for (const listener of settingsListeners.slice()) listener()
    }
    function settingsNamespaces() {
      return opts.noSettings ? [] : ['include:@dsh-local/view-8c716ee6-17d5-46ae-b021-c82f36d0f6c1:recent-tasks']
    }
    function makeConfigForm(namespace) {
      return {
        getSnapshot: () => ({
          status: 'ready',
          value: { keepDays: keepDaysState.days },
          base: { keepDays: 7 },
          user: { keepDays: keepDaysState.days },
          revision: keepDaysState.revision,
          writable: opts.readOnlySettings !== true,
        }),
        subscribe: listener => {
          settingsListeners.push(listener)
          return () => {
            const at = settingsListeners.indexOf(listener)
            if (at >= 0) settingsListeners.splice(at, 1)
          }
        },
        set: async (field, value) => {
          calls.push(['configForms.set', namespace, field, value])
          if (opts.setFails) return false
          if (field === 'keepDays') keepDaysState.days = value
          keepDaysState.revision += 1
          publishSettings()
          return true
        },
        mutate: async (ops, revision) => {
          calls.push(['configForms.mutate', namespace, ops, revision])
          return true
        },
      }
    }

    // The real service hands back one stable mirror and one controller per
    // namespace; handing out fresh objects would re-subscribe on every render.
    const settingsMirror = {
      getSnapshot: () => ({ status: 'ready', view: { namespaces: settingsNamespaces() } }),
      subscribe: listener => {
        settingsListeners.push(listener)
        return () => {
          const at = settingsListeners.indexOf(listener)
          if (at >= 0) settingsListeners.splice(at, 1)
        }
      },
      ensure() {},
    }
    const formByNamespace = new Map()

    const services = {
      configForms: {
        describe: () => settingsMirror,
        get(namespace) {
          calls.push(['configForms.get', namespace])
          if (!formByNamespace.has(namespace)) formByNamespace.set(namespace, makeConfigForm(namespace))
          return formByNamespace.get(namespace)
        },
      },
      uiSession: {
        sessionStatus: {
          getSnapshot: () => new Map(statusById),
          subscribe: listener => {
            statusListeners.push(listener)
            return () => {
              const at = statusListeners.indexOf(listener)
              if (at >= 0) statusListeners.splice(at, 1)
            }
          },
        },
      },
      sessions: {
        list: {
          getSnapshot: () => sessionState,
          subscribe: listener => {
            listeners.push(listener)
            return () => {
              const at = listeners.indexOf(listener)
              if (at >= 0) listeners.splice(at, 1)
            }
          },
        },
        create: async input => {
          calls.push(['sessions.create', input])
          return 'created-session'
        },
      },
      workspaces: {
        list: {
          getSnapshot: () => workspaceState,
          subscribe: listener => {
            workspaceListeners.push(listener)
            return () => {
              const at = workspaceListeners.indexOf(listener)
              if (at >= 0) workspaceListeners.splice(at, 1)
            }
          },
        },
        create: async input => {
          calls.push(['workspaces.create', input])
          if (opts.createFails) throw new Error('文件夹不可用')
          return { workspace: { workspaceId: 'w-created', path: input.path }, created: true }
        },
        // Official contract: throws while the session still has work, and
        // installs the whole archive set on success. The real Host replaces that
        // set on every call, so a fresh snapshot object is installed each time —
        // an in-place mutation would never reach a subscriber.
        archiveSession: async (id, options) => {
          calls.push(['workspaces.archiveSession', id, options])
          if (opts.archiveDelay) await new Promise(resolve => setTimeout(resolve, opts.archiveDelay))
          if (opts.archiveFails && opts.archiveFails.indexOf(id) >= 0) {
            const error = new Error('这个会话还在运行')
            error.name = 'WorkspaceArchiveError'
            throw error
          }
          if (opts.archiveFailsAll) {
            const error = new Error('归档服务暂时不可用')
            error.name = 'WorkspaceArchiveError'
            throw error
          }
          const archived = workspaceState.archivedSessionIds.slice()
          if (archived.indexOf(id) === -1) archived.push(id)
          installArchived(archived)
          return { archivedSessionIds: archived }
        },
        // Official contract mirrors archiveSession: throws while the session is
        // still busy, and installs the whole remaining set on success.
        unarchiveSession: async (id, options) => {
          calls.push(['workspaces.unarchiveSession', id, options])
          if (opts.unarchiveFails && opts.unarchiveFails.indexOf(id) >= 0) {
            const error = new Error('这个会话还在运行')
            error.name = 'WorkspaceUnarchiveError'
            throw error
          }
          const archived = workspaceState.archivedSessionIds.filter(entry => entry !== id)
          installArchived(archived)
          return { archivedSessionIds: archived }
        },
      },
      layout: {
        selectPanel: id => {
          calls.push(['layout.selectPanel', id])
          activePanelId = id
          // Real LayoutController.selectPanel() aborts the pending navigation,
          // so a panel or Conversation switch cancels an in-flight open.
          if (pendingNavigation !== null) pendingNavigation.cancelled = true
          publishPanel()
        },
        panelInfo: {
          getSnapshot: () => ({ activePanelId }),
          subscribe: listener => {
            panelListeners.push(listener)
            return () => {
              const at = panelListeners.indexOf(listener)
              if (at >= 0) panelListeners.splice(at, 1)
            }
          },
        },
      },
      uiWorkspace: {
        // Fire-and-forget, like the real service: it creates, then reveals only
        // when no later navigation superseded the request.
        startSession: id => {
          calls.push(['uiWorkspace.startSession', id])
          const token = { cancelled: false }
          pendingNavigation = token
          setTimeout(() => {
            if (pendingNavigation === token) pendingNavigation = null
            if (token.cancelled) return
            services.uiWorkspace.openSession('started-' + id)
          }, 5)
        },
        connectWorkspace: async id => {
          calls.push(['uiWorkspace.connectWorkspace', id])
          await new Promise(resolve => setTimeout(resolve, 5))
          return 'blank-' + id
        },
        openSession: id => {
          calls.push(['uiWorkspace.openSession', id])
          if (pendingNavigation !== null) pendingNavigation.cancelled = true
          // The main view now retains the session, so the Host clears the flag.
          setStatus(id, { running: false, completionUnread: false })
          // replaceMain(..., 'reveal') closes this page by itself.
          services.layout.selectPanel(null)
        },
        archiveSession: async (id, options) => {
          calls.push(['uiWorkspace.archiveSession', id, options])
          await services.workspaces.archiveSession(id, options)
        },
        unarchiveSession: async (id, options) => {
          calls.push(['uiWorkspace.unarchiveSession', id, options])
          await services.workspaces.unarchiveSession(id, options)
        },
        pickDirectory: async () => '/Users/lnq/工作/新文件夹',
        listDirectory: async () => [],
      },
    }

    // A build whose services cannot archive anything: the page must degrade.
    if (opts.noArchive) {
      delete services.uiWorkspace.archiveSession
      delete services.workspaces.archiveSession
      delete services.uiWorkspace.unarchiveSession
      delete services.workspaces.unarchiveSession
    }

    // A build with archiving but no way back: the undo bar must not appear.
    if (opts.noUnarchive) {
      delete services.uiWorkspace.unarchiveSession
      delete services.workspaces.unarchiveSession
    }

    if (opts.remote) {
      services.remote = {
        session: {
          page: async request => {
            calls.push(['remote.session.page', request])
            const id = request.address && request.address.sessionId
            const spec = opts.remote[id]
            if (!spec) return { ok: false }
            return { ok: true, value: { records: spec } }
          },
        },
      }
    }

    const ctx = {
      get: name => services[name],
      effect(fn) {
        const dispose = fn()
        if (typeof dispose === 'function') disposers.push(dispose)
        return dispose
      },
      locale: {
        register(namespace, dictionaries) {
          dicts.zh = dictionaries.zh
          dicts.en = dictionaries.en
          translations = dictionaries.zh
          return () => {}
        },
        bind() {
          return (key, params) => interp(translations[key] !== undefined ? translations[key] : key, params)
        },
      },
      slots: {
        inject(seat, register) { register(); return () => {} },
        register(definition, component) {
          if (definition.name === 'main') captured = { definition, component }
          if (definition.name === 'plugins.row.config') {
            configSeats.push({ key: definition.key, definition, component })
          }
          if (definition.name === 'sidebar.panellist') {
            panelSeats.push({ key: definition.id, definition, component })
          }
          return () => {}
        },
      },
    }

    const api = window.__DEF.factory(name => (name === 'react' ? React : {}));
    api.apply(ctx)
    const host = captured.definition.inject()
    const container = document.createElement('div')
    document.getElementById('stage').appendChild(container)
    const inst = mount(captured.component, host, container)
    const runtime = {
      calls,
      container,
      inst,
      host,
      emit() { for (const listener of listeners.slice()) listener() },
      finishRun(id) {
        const session = sessionsById[id]
        if (!session) throw new Error('unknown session ' + id)
        const next = { ...session, running: false, updatedAt: Date.now() }
        sessionsById[id] = next
        sessionState = { ids, byId: { ...sessionsById } }
        for (const listener of listeners.slice()) listener()
        // The run stopped while the page was closed: the Host flags it unread.
        setStatus(id, { running: false, completionUnread: true })
      },
      startRun(id) {
        const session = sessionsById[id]
        if (!session) throw new Error('unknown session ' + id)
        sessionsById[id] = { ...session, running: true }
        sessionState = { ids, byId: { ...sessionsById } }
        for (const listener of listeners.slice()) listener()
        setStatus(id, { running: true, completionUnread: false })
      },
      /** The shell puts the Conversation on screen: it retains it and no panel covers it. */
      showConversation(id) {
        const session = sessionsById[id]
        if (!session) throw new Error('unknown session ' + id)
        sessionsById[id] = { ...session, retainedBy: { mainView: 1 } }
        sessionState = { ids, byId: { ...sessionsById } }
        for (const listener of listeners.slice()) listener()
        activePanelId = null
        publishPanel()
      },
      openElsewhere(id) {
        // Another surface showed the session: it is on screen, the Host clears the flag.
        this.showConversation(id)
        setStatus(id, { running: false, completionUnread: false })
      },
      /** Opening a running Session, then leaving it: still running, still retained. */
      showRunning(id) {
        this.showConversation(id)
      },
      /** A run stops while the shell counts the session as main: no completion flag. */
      finishRunHidden(id) {
        const session = sessionsById[id]
        if (!session) throw new Error('unknown session ' + id)
        sessionsById[id] = { ...session, running: false, updatedAt: Date.now() }
        sessionState = { ids, byId: { ...sessionsById } }
        for (const listener of listeners.slice()) listener()
        setStatus(id, { running: false, completionUnread: false })
      },
      /** The person answers in the Conversation itself; it is on screen when the run ends. */
      resolvePendingInView(id) {
        this.showConversation(id)
        setStatus(id, { running: false, pendingInteraction: undefined, completionUnread: false })
      },
      setPending(id, kind) {
        // Whatever the registered domains publish: a base shape with a kind.
        setStatus(id, { pendingInteraction: kind === undefined ? undefined : { key: 'k-' + kind, kind, sessionId: id } })
      },
      shellOpen(id) {
        // The shell shows the session in its main view, then clears the flag.
        this.showConversation(id)
        setStatus(id, { running: false, completionUnread: false })
      },
      remount() {
        unmount(inst)
        const next = mount(captured.component, host, container)
        return next
      },
      unmount() { unmount(inst) },
      rows() { return container.querySelectorAll('.drt-card.is-done').length },
      lives() { return container.querySelectorAll('.drt-card.is-running').length },
      unreads() { return container.querySelectorAll('.drt-card.is-unread').length },
      unreadTitles() { return Array.from(container.querySelectorAll('.drt-card.is-unread .drt-cardTitle')).map(el => el.textContent) },
      favorites() { return container.querySelectorAll('.drt-card.is-fav').length },
      favoriteTitles() { return Array.from(container.querySelectorAll('.drt-card.is-fav .drt-cardTitle')).map(el => el.textContent) },
      counts() { return Array.from(container.querySelectorAll('.drt-count')).map(el => el.textContent) },
      zoneCount(zone) {
        const el = container.querySelector('.drt-section' + (zone === '' ? 'Running' : zone) + ' .drt-count')
        return el ? el.textContent : ''
      },
      pendingCards() { return container.querySelectorAll('.drt-card.is-pending').length },
      pendingLabels() { return Array.from(container.querySelectorAll('.drt-card.is-pending .drt-pill')).map(el => el.textContent) },
      chipText() { const el = container.querySelector('.drt-chip'); return el ? el.textContent : '' },
      headDotClass() { const el = container.querySelector('.drt-sectionRunning .drt-headDot'); return el ? el.className : '' },
      zoneLabels() { return Array.from(container.querySelectorAll('.drt-zoneLabel')).map(el => el.textContent) },
      liveTitles() { return Array.from(container.querySelectorAll('.drt-card.is-running .drt-cardTitle')).map(el => el.textContent) },
      rowTitles() { return Array.from(container.querySelectorAll('.drt-cardGrid.is-done .drt-cardTitle')).map(el => el.textContent) },
      titleCount(title) {
        return Array.from(container.querySelectorAll('.drt-card .drt-cardTitle')).filter(el => el.textContent === title).length
      },
      footText() { const el = container.querySelector('.drt-more'); return el ? el.textContent : '' },
      cardBox() {
        const pick = selector => {
          const el = container.querySelector(selector)
          if (!el) return null
          const rect = el.getBoundingClientRect()
          return [Math.round(rect.width * 10) / 10, Math.round(rect.height * 10) / 10]
        }
        return { running: pick('.drt-card.is-running'), unread: pick('.drt-card.is-unread'), done: pick('.drt-card.is-done') }
      },
      text() { return container.textContent },
      /** The archive set the workspaces service reports. */
      archivedIds() { return workspaceState.archivedSessionIds.slice() },
      /** The undo bar under the header, or null when there is nothing to undo. */
      undoBar() { return container.querySelector('.drt-undo') },
      undoText() { const el = container.querySelector('.drt-undo'); return el ? el.textContent : '' },
      undoAction() { return container.querySelector('.drt-undo .drt-undoAction') },
      /** Every per-card 归档 mark on screen, in card order. */
      archiveMarks() { return Array.from(container.querySelectorAll('.drt-archive')) },
      /** The 归档 mark of the n-th 已完成 card, or null. */
      archiveMarkAt(index) {
        const cards = Array.from(container.querySelectorAll('.drt-card.is-done'))
        return cards[index] ? cards[index].querySelector('.drt-archive') : null
      },
      /** The header's sweep button, or null when the header lacks it. */
      sweepButton() { return container.querySelector('.drt-sweep') },
      sweepText() { const el = container.querySelector('.drt-sweep'); return el ? el.textContent : '' },
      noticeText() { const el = container.querySelector('.drt-notice'); return el ? el.textContent : '' },
      noticeClass() { const el = container.querySelector('.drt-notice'); return el ? el.className : '' },
      dialogText() {
        const dialogs = Array.from(container.querySelectorAll('.drt-dialog'))
        return dialogs.map(el => el.textContent).join(' | ')
      },
      dialogConfirm() {
        const dialogs = Array.from(container.querySelectorAll('.drt-dialog'))
        for (const dialog of dialogs) {
          const buttons = Array.from(dialog.querySelectorAll('.drt-primary'))
          if (buttons.length > 0) return buttons[buttons.length - 1]
        }
        return null
      },
      dialogCancel() {
        const dialogs = Array.from(container.querySelectorAll('.drt-dialog'))
        for (const dialog of dialogs) {
          const buttons = Array.from(dialog.querySelectorAll('.drt-ghost'))
          if (buttons.length > 0) return buttons[buttons.length - 1]
        }
        return null
      },
      /** Row-config seats this plugin registered, in registration order. */
      configKeys() { return configSeats.map(seat => seat.key) },
      /** Render the row-config seat in one view, mounted so hooks run. */
      renderConfig(view) {
        const seat = configSeats.length === 0 ? undefined : configSeats[0]
        if (!seat) return null
        const form = services.configForms.get(settingsNamespaces()[0])
        const node = document.createElement('div')
        const inst = mount(seat.component, { view, form }, node)
        disposed.push(inst)
        return node
      },
      /**
       * Mount the sidebar entry seat the way the shell does: one span inside a
       * button, then the row's own label beside it, so the glyph paints — and
       * the pills land — as they would in the panel row.
       */
      renderEntry(props) {
        const seat = panelSeats.length === 0 ? undefined : panelSeats[0]
        if (!seat) return null
        const node = document.createElement('div')
        const button = document.createElement('button')
        // The shell's row is a flex line of glyph span + label span; both are
        // rebuilt here so a check can measure where the pills actually land.
        // They carry the shell's classes rather than inline styles: the plugin
        // re-flows this row through display:contents, and an inline style on
        // the glyph would out-rank that rule and read as a broken layout.
        button.className = 'panelRow'
        const icon = document.createElement('span')
        icon.className = 'panelGlyph'
        button.appendChild(icon)
        const title = document.createElement('span')
        title.className = 'panelTitle'
        title.textContent = '最近任务'
        button.appendChild(title)
        node.appendChild(button)
        const mounted = mount(seat.component, Object.assign({ id: seat.key, size: 16, active: false }, props), icon)
        entryMount = { node, inst: mounted }
        disposed.push(mounted)
        document.getElementById('stage').appendChild(node)
        return node
      },
      /** Texts of the entry's pills, in draw order (pending, running, unread). */
      entryBadges() {
        if (!entryMount) return []
        return Array.from(entryMount.node.querySelectorAll('.drt-entryBadge')).map(el => el.textContent)
      },
      /** Classes of the entry's pills, so a check can tell which band each is. */
      entryBadgeClasses() {
        if (!entryMount) return []
        return Array.from(entryMount.node.querySelectorAll('.drt-entryBadge')).map(el => el.className)
      },
      /** The tooltip a pill carries, read the way a hover would show it. */
      entryBadgeTitles() {
        if (!entryMount) return []
        return Array.from(entryMount.node.querySelectorAll('.drt-entryBadge')).map(el => el.title)
      },
      /**
       * The row's geometry, read the way the eye sees it: where the label ends
       * and where the pills begin. The pills are ordered after the label, so
       * these two edges tell whether the counts really sit to its right.
       */
      entryBoxes() {
        if (!entryMount) return null
        const label = entryMount.node.querySelector('.panelTitle')
        const badges = entryMount.node.querySelector('.drt-entryBadges')
        const button = entryMount.node.querySelector('button')
        if (label === null || badges === null || button === null) return null
        const labelBox = label.getBoundingClientRect()
        const badgesBox = badges.getBoundingClientRect()
        const buttonBox = button.getBoundingClientRect()
        return {
          labelWidth: labelBox.width,
          labelRight: labelBox.right,
          badgesLeft: badgesBox.left,
          badgesRight: badgesBox.right,
          buttonRight: buttonBox.right,
        }
      },
      setActive(id) { activePanelId = id },
      dispose() {
        for (let index = disposed.length - 1; index >= 0; index -= 1) {
          try { unmount(disposed[index]) } catch (error) { console.warn(error) }
        }
        disposed.length = 0
        for (let index = disposers.length - 1; index >= 0; index -= 1) {
          try { disposers[index]() } catch (error) { console.warn(error) }
        }
        disposers.length = 0
      },
    }
    runtimes.push(runtime)
    return runtime
  }

  function click(el) {
    if (!el) throw new Error('missing element to click')
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  }

  /** @returns false when a handler cancelled the click. */
  function clickAndReport(el) {
    if (!el) throw new Error('missing element to click')
    return el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  }

  /*
   * The bands open folded, so a check that wants cards has to unfold the band
   * first. Band names match the section suffix: '' is 正在运行, then 'Fav',
   * 'Unread', 'Done'. 未读 has no heading button — it is never folded.
   */
  function bandHeadButton(rt, band) {
    const section = rt.container.querySelector('.drt-section' + (band === '' ? 'Running' : band))
    return section ? section.querySelector('.drt-sectionHeadButton') : null
  }

  function bandIsOpen(rt, band) {
    const button = bandHeadButton(rt, band)
    return !!button && button.getAttribute('aria-expanded') === 'true'
  }

  function openBand(rt, band) {
    const button = bandHeadButton(rt, band)
    if (button && button.getAttribute('aria-expanded') !== 'true') click(button)
    return !!button
  }

  function closedBandCount(rt) {
    return Array.from(rt.container.querySelectorAll('.drt-section')).filter(section => section.className.indexOf('is-folded') >= 0).length
  }

  /* 未读 never folds, so "everything is closed" means every band that has a
     heading button. The number of bands on screen varies with the data. */
  function allBandsClosed(rt) {
    const sections = Array.from(rt.container.querySelectorAll('.drt-section'))
    const foldable = sections.filter(section => section.querySelector('.drt-sectionHeadButton'))
    return foldable.length > 0 && foldable.every(section => section.className.indexOf('is-folded') >= 0)
  }

  /** A fake sidebar row of this plugin plus the app's refresh button. */
  function setupChrome(options) {
    const opts = options || {}
    const wrap = document.createElement('div')
    wrap.style.display = 'none'
    const row = document.createElement('button')
    row.type = 'button'
    row.setAttribute('aria-label', '最近任务')
    const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    glyph.setAttribute('data-dsh-panel-entry', 'recent-tasks')
    row.appendChild(glyph)
    wrap.appendChild(row)
    const chrome = { row, unlag: null, clicks: 0, remove() { wrap.remove() } }
    if (opts.noButton !== true) {
      const unlag = document.createElement('button')
      unlag.type = 'button'
      unlag.setAttribute('aria-label', '解除卡顿')
      unlag.style.opacity = '0.75'
      unlag.addEventListener('click', () => {
        chrome.clicks += 1
        if (opts.press === 'pending') unlag.style.opacity = '0.4'
      })
      chrome.unlag = unlag
      chrome.settle = () => { unlag.style.opacity = '0.75' }
      wrap.appendChild(unlag)
    }
    document.body.appendChild(wrap)
    return chrome
  }

  /** Pretend the app answers the live-revision question with \`fetchImpl\`. */
  function stubCode(fetchImpl) {
    const savedFetch = window.fetch
    window.fetch = fetchImpl
    return () => {
      if (savedFetch === undefined) delete window.fetch
      else window.fetch = savedFetch
    }
  }

  /** The live-answer stand-in: an ok response naming the served revision; a
      function is re-read on every call, so a test can move the served code on. */
  const serves = rev => async () => {
    const value = typeof rev === 'function' ? rev() : rev
    return { ok: true, json: async () => ({ graph: { rev: value } }) }
  }

  /** Tear every runtime down: effects and listeners from earlier tests outlive
      their page otherwise, and the bridge listens on the whole document. */
  function disposeAll() {
    for (const runtime of runtimes.splice(0)) {
      try { runtime.unmount() } catch (error) { console.warn(error) }
      try { runtime.dispose() } catch (error) { console.warn(error) }
    }
  }

  async function run() {
    if (location.search.indexOf('preview') >= 0) {
      localStorage.clear()
      if (location.search.indexOf('favstatus') >= 0) {
        // One favourite in each state, so the status chip can be eyeballed.
        localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['s01', 's02', 's03', 's05']))
      } else if (location.search.indexOf('favrun') >= 0) {
        localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['s01', 's07', 's02']))
      } else if (location.search.indexOf('fav') >= 0) {
        localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['s02', 's05', 's09']))
      }
      if (location.search.indexOf('dark') >= 0) document.body.setAttribute('data-ds-dark-theme', '')
      const many = location.search.indexOf('many') >= 0 ? ['s01','s02','s03','s04','s05','s06','s07','s08','s09','s10'] : undefined
      const old = location.search.indexOf('old') >= 0 ? { oldSessions: 5 } : {}
      // ?pending is seeded before the first render, not set afterwards: this
      // page decides its shape from the rows it arrives on, so a wait planted
      // after the mount would only write the red chip on a closed heading.
      const waiting = location.search.indexOf('pending') >= 0
        ? { s01: 'approval', s02: 'plan-review', s03: 'question' }
        : undefined
      const rt0 = makeRuntime(location.search.indexOf('none') >= 0
        ? { running: [], ...old, pending: waiting }
        : many ? { running: many, ...old, pending: waiting } : { ...old, pending: waiting })
      if (location.search.indexOf('unread') >= 0) {
        rt0.finishRun('s02')
        rt0.finishRun('s04')
        rt0.finishRun('s09')
      }
      if (location.search.indexOf('favstatus') >= 0) {
        // s01 stays running, s02 just finished (unread), s03 waits on the
        // person, s05 is the plain completed one.
        rt0.finishRun('s02')
        rt0.setPending('s03', 'approval')
      }
      if (location.search.indexOf('sweepdialog') >= 0) {
        // The confirm sheet is what a screenshot of this feature has to show.
        click(rt0.sweepButton())
      }
      // ?undo sweeps for real so the undo bar is on screen when the shot lands.
      if (location.search.indexOf('undo') >= 0) {
        const button = rt0.sweepButton()
        if (button) {
          click(button)
          setTimeout(() => {
            const confirm = rt0.dialogConfirm()
            if (confirm) click(confirm)
          }, 0)
        }
      }
      // ?foldall folds every band that arrived open, so a shot can still show
      // the all-headings shape now that 已完成 comes unfolded.
      if (location.search.indexOf('foldall') >= 0) {
        for (const band of ['', 'Fav', 'Done']) {
          const button = bandHeadButton(rt0, band)
          if (button && button.getAttribute('aria-expanded') === 'true') click(button)
        }
        await tick()
      }
      // ?archone archives the first 已完成 card, leaving the single-row undo bar
      // on screen — the shape a per-card 归档 leaves behind.
      if (location.search.indexOf('archone') >= 0) {
        const mark = rt0.archiveMarkAt(0)
        if (mark) click(mark)
        await tick(20)
      }
      // ?config shows the settings card the plugin manager mounts for this row.
      if (location.search.indexOf('config') >= 0) {
        // The card lives inside the plugin manager, so show it alone.
        const card = rt0.renderConfig('page')
        const stage = document.getElementById('stage')
        if (card) {
          if (stage) stage.style.display = 'none'
          card.style.padding = '22px'
          card.style.maxWidth = '460px'
          document.body.appendChild(card)
        }
      }
      // ?waitlater plants a wait after the page is already on screen: the
      // heading keeps its cards folded and only gains the red chip, which is
      // the other half of the arrival rule.
      if (location.search.indexOf('waitlater') >= 0) {
        await tick()
        rt0.setPending('s02', 'approval')
        await tick()
      }
      // ?expand unfolds the three bands that open folded, so a screenshot can
      // show the cards instead of the arrival state.
      if (location.search.indexOf('expand') >= 0) {
        for (const band of ['', 'Fav', 'Done']) {
          const button = bandHeadButton(rt0, band)
          if (button && button.getAttribute('aria-expanded') !== 'true') click(button)
        }
      }
      // ?entry draws the sidebar entry inside a stand-in panel list, copying the
      // framework's own row CSS so the pills can be judged in place (alignment
      // with neighbouring rows, distance to the label, room for the unpin button).
      // It goes last so any ?pending / ?unread above it is already in place.
      if (location.search.indexOf('entry') >= 0) {
        const node = rt0.renderEntry()
        const stage = document.getElementById('stage')
        if (node && stage) {
          stage.style.display = 'none'
          // The framework's own row geometry, so what is measured here is what
          // the sidebar measures: 32px rows, 12px inline padding, 38px kept at
          // the right for the unpin button, 6px between icon and name.
          const list = document.createElement('div')
          list.style.cssText = 'width:238px;margin:24px;padding:18px 10px 6px;box-sizing:border-box;border-radius:10px;background:var(--dsw-specific-sidebar-fill,#f9fafb);border:1px solid var(--dsw-alias-border-l1,#e5e7eb);color:var(--dsw-alias-label-primary,#111);font-family:var(--dsw-font-family,system-ui)'
          const ROWS = [['对话', '最近对话'], ['工作区', '工作区'], ['插件', '插件']]
          const makeRow = (labelText, glyph) => {
            const entry = document.createElement('div')
            entry.className = 'panelEntry'
            entry.style.cssText = 'position:relative;display:flex;border-radius:6px;background-clip:padding-box'
            const button = document.createElement('button')
            button.style.cssText = 'background:none;border:0;width:100%;min-height:32px;margin:0;padding:5px 38px 5px 12px;display:flex;align-items:center;gap:6px;color:inherit;font:inherit;font-size:13px;text-align:left;cursor:pointer'
            // The live glyph is already the shell's glyph span; wrapping it in a
            // second one would put an inline-flex box around the pills and pull
            // them back beside the icon.
            const alreadyGlyph = glyph && glyph.classList && glyph.classList.contains('panelGlyph')
            const glyphSpan = alreadyGlyph ? glyph : document.createElement('span')
            // The glyph and the name carry the shell's classes, not inline
            // styles: a plugin rule has to out-rank them exactly as it does in
            // the real row, and only an inline style would beat it here.
            glyphSpan.className = 'panelGlyph'
            if (glyph && !alreadyGlyph) glyphSpan.appendChild(glyph)
            else if (!glyph) {
              const square = document.createElement('span')
              square.style.cssText = 'width:16px;height:16px;border-radius:4px;border:1.3px solid currentColor;opacity:.55;display:inline-block'
              glyphSpan.appendChild(square)
            }
            const title = document.createElement('span')
            title.className = 'panelTitle'
            title.textContent = labelText
            button.appendChild(glyphSpan)
            button.appendChild(title)
            entry.appendChild(button)
            return entry
          }
          for (const row of ROWS) list.appendChild(makeRow(row[1]))
          // The glyph's own span is moved, not copied: it is the live mount
          // point, so the counts keep repainting inside the row. It keeps its
          // class rather than an inline style — the plugin re-flows this row
          // through display:contents, and an inline display would win.
          const live = node.querySelector('.panelGlyph') || node
          const own = makeRow('最近任务', live)
          own.className = 'panelEntry panelEntryOwn'
          list.appendChild(own)
          document.body.appendChild(list)
        }
      }
      document.title = 'preview'
      // ?freeze=1.2 pauses every animation 1.2s in, so screenshots can capture
      // a moving effect at a chosen point instead of whenever Chrome got there.
      const freeze = /[?&]freeze=([0-9.]+)/.exec(location.search)
      if (freeze) {
        const at = Number(freeze[1]) * 1000
        requestAnimationFrame(() => {
          for (const animation of document.getAnimations()) {
            animation.currentTime = at
            animation.pause()
          }
        })
      }
      return
    }
    // 1. the page opens with 已完成 unfolded and the rest folded
    localStorage.clear()
    let rt = makeRuntime()
    check('启动时运行区收起', !!bandHeadButton(rt, '') && !bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    check('启动时已完成区展开', !!bandHeadButton(rt, 'Done') && bandIsOpen(rt, 'Done'), String(bandIsOpen(rt, 'Done')))
    check('启动时运行区一张卡也不画', rt.lives() === 0, String(rt.lives()))
    check('启动时已完成区直接画出 15 条', rt.rows() === 15, '实际 ' + rt.rows())
    check('收起时仍然写着各区条数', rt.zoneCount('') === '2' && rt.zoneCount('Done') === '38', rt.counts().join('|'))
    check('两个可折叠区各带一个小三角', rt.container.querySelectorAll('.drt-chevron').length === 2,
      String(rt.container.querySelectorAll('.drt-chevron').length))
    check('启动时底部直接能展开其余', rt.footText() === '展开其余 23 个对话', rt.footText())
    check('启动时没有未读区',
      rt.unreads() === 0 && rt.zoneCount('Unread') === '' && !rt.container.querySelector('.drt-sectionUnread'),
      rt.counts().join('|'))

    openBand(rt, '')
    await tick()
    check('点开标题后运行区列出 2 个', rt.lives() === 2, '实际 ' + rt.lives())
    check('运行卡标题正确', rt.liveTitles().join('|') === '对话 1|对话 7', rt.liveTitles().join('|'))
    check('点开后三角转为朝下', bandHeadButton(rt, 'Done').className.indexOf('is-open') >= 0,
      bandHeadButton(rt, 'Done').className)
    check('已完成区点开后显示 15 条', rt.rows() === 15, '实际 ' + rt.rows())
    check('已完成区不含运行中的对话', rt.rowTitles().indexOf('对话 1') < 0 && rt.rowTitles().indexOf('对话 7') < 0, rt.rowTitles().join('|'))
    check('底部按钮写明剩余 23', rt.footText() === '展开其余 23 个对话', rt.footText())
    check('展开数不写本地存储', localStorage.getItem('dsh.recent-tasks.shown.v1') === null, String(localStorage.getItem('dsh.recent-tasks.shown.v1')))

    click(bandHeadButton(rt, 'Done'))
    await tick()
    check('再点一下同一区就收回', rt.rows() === 0 && rt.zoneCount('Done') === '38' && !bandIsOpen(rt, 'Done'),
      rt.rows() + ' / ' + rt.zoneCount('Done'))
    openBand(rt, 'Done')
    await tick()

    // 2. clicking a running card opens that session and leaves the page
    click(rt.container.querySelector('.drt-card.is-running'))
    await tick()
    check('点运行卡打开该会话', rt.calls.some(call => call[0] === 'uiWorkspace.openSession' && call[1] === 's01'), JSON.stringify(rt.calls))
    check('点运行卡后关掉本页', rt.calls.some(call => call[0] === 'layout.selectPanel' && call[1] === null), JSON.stringify(rt.calls))
    rt.unmount()

    // 3. a run finishing while the page is closed lands in 未读, not 已完成
    localStorage.clear()
    rt = makeRuntime()
    rt.finishRun('s01')
    await tick()
    openBand(rt, '')
    openBand(rt, 'Done')
    await tick()
    check('跑完后运行区剩 1 个', rt.lives() === 1, '实际 ' + rt.lives())
    check('跑完的对话进入未读区', rt.unreads() === 1 && rt.unreadTitles()[0] === '对话 1', rt.unreadTitles().join('|'))
    check('未读区计数 1', rt.zoneCount('Unread') === '1', rt.counts().join('|'))
    check('已完成区不再包含它', rt.rowTitles().indexOf('对话 1') < 0 && rt.zoneCount('Done') === '38', rt.counts().join('|'))
    check('没有收藏时三区顺序为 正在运行|未读|已完成', rt.zoneLabels().join('|') === '正在运行|未读|已完成', rt.zoneLabels().join('|'))
    check('未读已写入本地存储', (localStorage.getItem('dsh.recent-tasks.unread.v1') || '').indexOf('s01') >= 0,
      localStorage.getItem('dsh.recent-tasks.unread.v1'))

    // 3a2. all three bands draw the same card, at the same size
    const box = rt.cardBox()
    check('三区卡片同一套形状类',
      rt.container.querySelectorAll('.drt-card').length === rt.lives() + rt.unreads() + rt.rows(),
      String(rt.container.querySelectorAll('.drt-card').length))
    check('三区卡片同宽同高',
      !!box.running && !!box.unread && !!box.done &&
      box.running[0] === box.unread[0] && box.running[0] === box.done[0] &&
      box.running[1] === box.unread[1] && box.running[1] === box.done[1],
      JSON.stringify(box))
    check('三区卡片配色互不相同',
      ['running', 'unread', 'done'].map(tone => {
        const el = rt.container.querySelector('.drt-card.is-' + tone)
        if (!el) return ''
        const cs = getComputedStyle(el)
        return cs.backgroundColor + '|' + cs.borderColor + '|' + cs.boxShadow
      }).filter((value, index, all) => value === '' || all.indexOf(value) !== index).length === 0,
      ['running', 'unread', 'done'].map(tone => {
        const el = rt.container.querySelector('.drt-card.is-' + tone)
        return el ? getComputedStyle(el).backgroundColor : 'missing'
      }).join(' / '))

    // 3a2b. the tone swap: 正在运行 is the light blue that moves, 未读 the green
    // color-mix() serialises as color(srgb r g b) with 0–1 channels, so both
    // that and the plain rgb() form have to be readable here.
    const rgbOf = css => {
      const srgb = /color\(srgb ([^)]+)\)/.exec(css)
      const plain = srgb ? null : /rgba?\(([^)]+)\)/.exec(css)
      const raw = srgb ? srgb[1] : plain ? plain[1] : ''
      const parts = raw.split(/[\s,/]+/).filter(Boolean).map(Number).filter(value => !Number.isNaN(value))
      if (parts.length < 3) return null
      const scale = srgb ? 255 : 1
      return { r: parts[0] * scale, g: parts[1] * scale, b: parts[2] * scale }
    }
    const runDot = rt.container.querySelector('.drt-card.is-running .drt-cardDot')
    const unreadDot = rt.container.querySelector('.drt-card.is-unread .drt-cardDot')
    const runRgb = runDot ? rgbOf(getComputedStyle(runDot).backgroundColor) : null
    const unreadRgb = unreadDot ? rgbOf(getComputedStyle(unreadDot).backgroundColor) : null
    check('正在运行的点偏蓝', runRgb !== null && runRgb.b > runRgb.r + 60 && runRgb.b > runRgb.g + 40, JSON.stringify(runRgb))
    check('未读的点偏绿', unreadRgb !== null && unreadRgb.g > unreadRgb.r + 60 && unreadRgb.g > unreadRgb.b + 40, JSON.stringify(unreadRgb))
    const runCard = rt.container.querySelector('.drt-card.is-running')
    const unreadCard = rt.container.querySelector('.drt-card.is-unread')
    check('运行卡带浅蓝渐变底', /linear-gradient/.test(getComputedStyle(runCard).backgroundImage),
      getComputedStyle(runCard).backgroundImage.slice(0, 48))
    check('运行卡在流动', getComputedStyle(runCard).animationName.indexOf('drt-flow') >= 0, getComputedStyle(runCard).animationName)
    check('未读卡不流动', getComputedStyle(unreadCard).animationName === 'none', getComputedStyle(unreadCard).animationName)

    // 3a3. 收藏：a star adds the session to its band, a second click removes it
    check('收藏区一开始整块不占位', rt.favorites() === 0 && !rt.container.querySelector('.drt-sectionFav') && rt.zoneCount('Fav') === '',
      rt.zoneLabels().join('|'))
    check('每张卡都有星星', rt.container.querySelectorAll('.drt-card .drt-star').length === rt.container.querySelectorAll('.drt-card').length,
      String(rt.container.querySelectorAll('.drt-card .drt-star').length) + ' / ' + String(rt.container.querySelectorAll('.drt-card').length))
    const bigStar = rt.container.querySelector('.drt-card .drt-star')
    const bigStarSvg = bigStar.querySelector('svg')
    const bigStarBox = bigStar.getBoundingClientRect()
    const firstCard0 = bigStar.closest('.drt-card')
    const cardBox0 = firstCard0.getBoundingClientRect()
    const starIconBox = bigStarSvg.getBoundingClientRect()
    check('星星不再是一条竖栏', rt.container.querySelector('.drt-cardRail') === null)
    check('星星图标 30px', Math.round(starIconBox.width) === 30, getComputedStyle(bigStarSvg).width)
    check('星星点击区 56px 宽', Math.round(bigStarBox.width) === 56, getComputedStyle(bigStar).width)
    const starRestBg = getComputedStyle(bigStar).backgroundColor
    check('未收藏的星星没有常驻底色', starRestBg === 'rgba(0, 0, 0, 0)' || starRestBg === 'transparent', starRestBg)
    check('星星按钮高 56px', Math.round(bigStarBox.height) === 56, getComputedStyle(bigStar).height)
    check('星星竖向居中', Math.abs((bigStarBox.top + bigStarBox.height / 2) - (cardBox0.top + cardBox0.height / 2)) <= 2,
      Math.round(bigStarBox.top + bigStarBox.height / 2) + ' / ' + Math.round(cardBox0.top + cardBox0.height / 2))
    check('星星贴卡片右边 4px', Math.abs((cardBox0.right - bigStarBox.right) - 4) <= 1.5,
      Math.round(cardBox0.right - bigStarBox.right) + 'px')
    check('星星点击区至少 44x44', bigStarBox.width >= 44 && bigStarBox.height >= 44,
      Math.round(bigStarBox.width) + 'x' + Math.round(bigStarBox.height))
    const bigTitleBox = firstCard0.querySelector('.drt-cardTitle').getBoundingClientRect()
    const bigMetaBox = firstCard0.querySelector('.drt-cardMeta').getBoundingClientRect()
    check('说明文字不钻到星星底下', bigMetaBox.right <= bigStarBox.left,
      Math.round(bigMetaBox.right) + ' / ' + Math.round(bigStarBox.left))
    check('标题让开星星，不压到图标', bigTitleBox.right <= bigStarBox.left,
      Math.round(bigTitleBox.right) + ' / ' + Math.round(bigStarBox.left))
    const firstCard = bigStar.closest('.drt-card')
    check('卡片标题字号 16px', Math.round(parseFloat(getComputedStyle(firstCard.querySelector('.drt-cardTitle')).fontSize)) === 16,
      getComputedStyle(firstCard.querySelector('.drt-cardTitle')).fontSize)
    check('卡片说明字号 12.5px', Math.round(parseFloat(getComputedStyle(firstCard.querySelector('.drt-cardMeta')).fontSize) * 10) === 125,
      getComputedStyle(firstCard.querySelector('.drt-cardMeta')).fontSize)
    check('卡片最小高度 100px', Math.round(parseFloat(getComputedStyle(firstCard).minHeight)) === 100,
      getComputedStyle(firstCard).minHeight)
    // The width ladder: three columns at full width, two and one as the page narrows.
    const rightGrid = rt.container.querySelector('.drt-cardGrid')
    const rtPage = rt.container.querySelector('.drt-page')
    check('宽屏下卡片三列封顶', getComputedStyle(rightGrid).gridTemplateColumns.split(' ').length === 3,
      getComputedStyle(rightGrid).gridTemplateColumns)
    rtPage.style.width = '760px'
    check('中等宽度降到两列', getComputedStyle(rightGrid).gridTemplateColumns.split(' ').length === 2,
      getComputedStyle(rightGrid).gridTemplateColumns)
    rtPage.style.width = '560px'
    check('窄宽度降到一列', getComputedStyle(rightGrid).gridTemplateColumns.split(' ').length === 1,
      getComputedStyle(rightGrid).gridTemplateColumns)
    rtPage.style.width = ''
    getComputedStyle(rightGrid).gridTemplateColumns
    const beforeStars = rt.calls.filter(call => call[0] === 'uiWorkspace.openSession').length
    click(rt.container.querySelector('.drt-card.is-unread .drt-star'))
    await tick()
    check('点星星不打开会话', rt.calls.filter(call => call[0] === 'uiWorkspace.openSession').length === beforeStars, JSON.stringify(rt.calls))
    check('刚收藏的区还是收着', !bandIsOpen(rt, 'Fav') && rt.zoneCount('Fav') === '1',
      String(bandIsOpen(rt, 'Fav')) + ' / ' + rt.zoneCount('Fav'))
    openBand(rt, 'Fav')
    await tick()
    check('收藏区出现该会话', rt.favorites() === 1 && rt.favoriteTitles()[0] === '对话 1', rt.favoriteTitles().join('|'))
    const favUnreadChip = rt.container.querySelector('.drt-card.is-fav .drt-status')
    check('收藏里未读的卡片写明未读', !!favUnreadChip && favUnreadChip.textContent === '未读',
      favUnreadChip ? favUnreadChip.textContent : 'missing')
    const favUnreadChipRgb = favUnreadChip ? rgbOf(getComputedStyle(favUnreadChip).color) : null
    check('未读状态标的字偏绿', favUnreadChipRgb !== null && favUnreadChipRgb.g > favUnreadChipRgb.r + 40 && favUnreadChipRgb.g > favUnreadChipRgb.b + 15,
      JSON.stringify(favUnreadChipRgb))
    const favUnreadDot = rt.container.querySelector('.drt-card.is-fav .drt-cardDot')
    check('收藏里未读的卡片点变绿', !!favUnreadDot && favUnreadDot.className.indexOf('is-unread') >= 0,
      favUnreadDot ? favUnreadDot.className : 'missing')
    check('收藏区计数为 1', rt.zoneCount('Fav') === '1', rt.counts().join('|'))
    check('原区域不再保留该会话', rt.unreads() === 0 && rt.zoneCount('Unread') === '', '未读 ' + rt.unreads())
    check('同一会话四区只出现一次', rt.titleCount('对话 1') === 1, String(rt.titleCount('对话 1')))
    check('只有收藏里那颗星亮着', rt.container.querySelectorAll('.drt-card .drt-star.is-on').length === 1,
      String(rt.container.querySelectorAll('.drt-card .drt-star.is-on').length))
    check('收藏写入本地存储', (localStorage.getItem('dsh.recent-tasks.favorites.v1') || '').indexOf('s01') >= 0,
      localStorage.getItem('dsh.recent-tasks.favorites.v1'))
    rt.inst = rt.remount()
    check('重挂载后收藏区又收起来了', rt.favorites() === 0 && !bandIsOpen(rt, 'Fav')
      && bandIsOpen(rt, 'Done'), String(bandIsOpen(rt, 'Fav')) + ' / ' + String(bandIsOpen(rt, 'Done')))
    openBand(rt, 'Fav')
    await tick()
    check('重挂载后收藏仍在', rt.favorites() === 1 && rt.favoriteTitles()[0] === '对话 1', rt.favoriteTitles().join('|'))
    check('重挂载后原区域仍不重复', rt.unreads() === 0 && rt.titleCount('对话 1') === 1, rt.titleCount('对话 1') + ' / 未读 ' + rt.unreads())
    click(rt.container.querySelector('.drt-card.is-fav .drt-star'))
    await tick()
    check('再点星星取消收藏后整块消失', rt.favorites() === 0 && !rt.container.querySelector('.drt-sectionFav') && rt.zoneCount('Fav') === '', rt.zoneLabels().join('|'))
    check('取消后回到未读区', rt.unreads() === 1 && rt.unreadTitles()[0] === '对话 1', rt.unreadTitles().join('|'))
    check('取消后本地存储清掉', (localStorage.getItem('dsh.recent-tasks.favorites.v1') || '').indexOf('s01') < 0,
      localStorage.getItem('dsh.recent-tasks.favorites.v1'))

    // 3b. opening the unread row clears it and returns the session to 已完成
    click(rt.container.querySelector('.drt-card.is-unread'))
    await tick()
    check('点未读行打开该会话', rt.calls.some(call => call[0] === 'uiWorkspace.openSession' && call[1] === 's01'), JSON.stringify(rt.calls))
    check('点后未读区消失', rt.unreads() === 0 && rt.zoneCount('Unread') === '', rt.counts().join('|'))
    openBand(rt, 'Done')
    await tick()
    check('点后回到已完成区第一名', rt.rowTitles()[0] === '对话 1', rt.rowTitles().join('|'))
    check('点后本地存储清掉该会话', (localStorage.getItem('dsh.recent-tasks.unread.v1') || '').indexOf('s01') < 0,
      localStorage.getItem('dsh.recent-tasks.unread.v1'))
    rt.unmount()

    // 3b1. the 收藏 band takes room only while it holds a row
    localStorage.clear()
    rt = makeRuntime()
    rt.finishRun('s01')
    await tick()
    check('没有收藏时收藏区不占位', !rt.container.querySelector('.drt-sectionFav'), rt.zoneLabels().join('|'))
    openBand(rt, 'Done')
    await tick()
    click(rt.container.querySelector('.drt-card.is-done .drt-star'))
    await tick()
    check('收藏一条后回归四区顺序', rt.zoneLabels().join('|') === '正在运行|收藏|未读|已完成', rt.zoneLabels().join('|'))
    openBand(rt, 'Fav')
    await tick()
    click(rt.container.querySelector('.drt-card.is-fav .drt-star'))
    await tick()
    check('取消最后一条收藏后收藏区消失', !rt.container.querySelector('.drt-sectionFav') && rt.zoneLabels().join('|') === '正在运行|未读|已完成',
      rt.zoneLabels().join('|'))
    rt.unmount()

    // 3b2. a starred running session leaves 正在运行, and the band says where it went
    localStorage.clear()
    rt = makeRuntime()
    openBand(rt, '')
    await tick()
    check('收藏前运行区 2 个', rt.lives() === 2, String(rt.lives()))
    click(rt.container.querySelector('.drt-card.is-running .drt-star'))
    await tick()
    openBand(rt, 'Fav')
    await tick()
    check('收藏运行中的会话：运行区少一个', rt.lives() === 1 && rt.favorites() === 1 && rt.favoriteTitles()[0] === '对话 1',
      '运行 ' + rt.lives() + ' / 收藏 ' + rt.favoriteTitles().join('|'))
    check('运行中的会话四区只出现一次', rt.titleCount('对话 1') === 1, String(rt.titleCount('对话 1')))
    click(rt.container.querySelector('.drt-card.is-running .drt-star'))
    await tick()
    check('两个运行会话都收进收藏后运行区整块消失',
      rt.lives() === 0 && rt.favorites() === 2 && !rt.container.querySelector('.drt-sectionRunning'),
      '运行 ' + rt.lives() + ' / 收藏 ' + rt.favorites())
    check('运行区消失后收藏排在最上且不带分隔线',
      !!rt.container.querySelector('.drt-sectionFav')
        && getComputedStyle(rt.container.querySelector('.drt-sectionFav')).borderTopWidth === '0px'
        && getComputedStyle(rt.container.querySelector('.drt-sectionFav')).paddingTop === '0px',
      rt.zoneLabels().join('|'))
    click(rt.container.querySelector('.drt-card.is-fav .drt-star'))
    await tick()
    check('取消收藏后回到运行区', rt.lives() === 1 && rt.favorites() === 1 && rt.liveTitles()[0] === '对话 1',
      '运行 ' + rt.liveTitles().join('|') + ' / 收藏 ' + rt.favorites())
    rt.unmount()

    // 3b3. a starred completed session leaves 已完成; unstarring puts it back
    localStorage.clear()
    rt = makeRuntime()
    openBand(rt, 'Done')
    await tick()
    check('已完成区第一行是对话 2', rt.rowTitles()[0] === '对话 2', rt.rowTitles()[0])
    click(rt.container.querySelector('.drt-card.is-done .drt-star'))
    await tick()
    openBand(rt, 'Fav')
    await tick()
    check('收藏已完成的会话：已完成少一条', rt.zoneCount('Done') === '37' && rt.favorites() === 1 && rt.favoriteTitles()[0] === '对话 2',
      rt.counts().join('|') + ' / ' + rt.favoriteTitles().join('|'))
    const favDoneChip = rt.container.querySelector('.drt-card.is-fav .drt-status')
    check('收藏里已完成的卡片写明已完成', !!favDoneChip && favDoneChip.textContent === '已完成',
      favDoneChip ? favDoneChip.textContent : 'missing')
    const favDoneDot = rt.container.querySelector('.drt-card.is-fav .drt-cardDot')
    check('已完成状态的点不冒充运行中', !!favDoneDot && favDoneDot.className === 'drt-cardDot',
      favDoneDot ? favDoneDot.className : 'missing')
    check('已完成的会话四区只出现一次', rt.titleCount('对话 2') === 1, String(rt.titleCount('对话 2')))
    click(rt.container.querySelector('.drt-card.is-fav .drt-star'))
    await tick()
    check('取消收藏后回到已完成区', rt.zoneCount('Done') === '38' && rt.favorites() === 0,
      rt.counts().join('|') + ' / ' + rt.rowTitles().slice(0, 2).join('|'))
    openBand(rt, 'Done')
    await tick()
    check('取消收藏后已完成区第一行又是对话 2', rt.rowTitles()[0] === '对话 2', rt.rowTitles().slice(0, 2).join('|'))
    rt.unmount()

    // 3b4. a starred running Session still shows it is running
    localStorage.clear()
    rt = makeRuntime()
    openBand(rt, '')
    await tick()
    click(rt.container.querySelector('.drt-card.is-running .drt-star'))
    await tick()
    openBand(rt, 'Fav')
    await tick()
    const favDot = rt.container.querySelector('.drt-card.is-fav .drt-cardDot')
    check('收藏里运行中的卡片点仍是蓝的', !!favDot && favDot.className.indexOf('is-running') >= 0, favDot ? favDot.className : 'missing')
    check('收藏里运行中的卡片点不是待确认态', !!favDot && favDot.className.indexOf('is-pending') < 0, favDot ? favDot.className : 'missing')
    const favChip = rt.container.querySelector('.drt-card.is-fav .drt-status')
    check('收藏里运行中的卡片写明运行中', !!favChip && favChip.textContent === '运行中',
      favChip ? favChip.textContent : 'missing')
    const favChipRgb = favChip ? rgbOf(getComputedStyle(favChip).color) : null
    check('运行中状态标的字偏蓝', favChipRgb !== null && favChipRgb.b > favChipRgb.r + 60 && favChipRgb.b > favChipRgb.g + 30,
      JSON.stringify(favChipRgb))
    check('其它区卡片不带状态标', rt.container.querySelectorAll('.drt-card:not(.is-fav) .drt-status').length === 0,
      String(rt.container.querySelectorAll('.drt-card:not(.is-fav) .drt-status').length))
    rt.unmount()

    // 3b5. a starred Session waiting on the person keeps its amber dot and red pill
    localStorage.clear()
    rt = makeRuntime()
    rt.setPending('s05', 'approval')
    await tick()
    openBand(rt, '')
    await tick()
    click(rt.container.querySelector('.drt-card.is-running.is-pending .drt-star'))
    await tick()
    openBand(rt, 'Fav')
    await tick()
    const favWaitDot = rt.container.querySelector('.drt-card.is-fav .drt-cardDot')
    const favWaitPill = rt.container.querySelector('.drt-card.is-fav .drt-pill')
    check('收藏里待确认的卡片点变红', !!favWaitDot && favWaitDot.className.indexOf('is-pending') >= 0 && favWaitDot.className.indexOf('is-fav') < 0,
      favWaitDot ? favWaitDot.className : 'missing')
    check('收藏里待确认的卡片仍带红标', !!favWaitPill && favWaitPill.textContent === '等你确认',
      favWaitPill ? favWaitPill.textContent : 'missing')
    check('待确认的收藏卡不重复加状态标', !rt.container.querySelector('.drt-card.is-fav .drt-status'), 'unexpected chip')
    rt.unmount()

    // 3c. the remembered unread set survives a reload while it stays unopened
    localStorage.clear()
    rt = makeRuntime()
    rt.finishRun('s02')
    await tick()
    check('刷新前已记住 1 条未读', rt.unreads() === 1 && rt.unreadTitles()[0] === '对话 2', rt.unreadTitles().join('|'))
    rt.inst = rt.remount()
    check('重挂载后未读区仍在', rt.unreads() === 1 && rt.unreadTitles()[0] === '对话 2', rt.unreadTitles().join('|'))

    // 3d. opening it in another surface clears the remembered row
    rt.openElsewhere('s02')
    await tick()
    check('别处打开后未读区消失', rt.unreads() === 0, '实际 ' + rt.unreads())

    // 3e. a session that starts running again leaves the unread zone
    rt.finishRun('s03')
    await tick()
    check('再跑完一条进入未读', rt.unreads() === 1 && rt.unreadTitles()[0] === '对话 3', rt.unreadTitles().join('|'))
    rt.startRun('s03')
    await tick()
    openBand(rt, '')
    await tick()
    check('重新运行后离开未读区', rt.unreads() === 0 && rt.liveTitles().indexOf('对话 3') >= 0, rt.liveTitles().join('|'))
    rt.unmount()

    // 3f. opening it in the shell while this page was closed still counts
    localStorage.clear()
    rt = makeRuntime()
    rt.finishRun('s04')
    await tick(120)
    check('别处打开（页面已关）：跑完先进未读', rt.unreads() === 1, String(rt.unreads()))
    rt.unmount()
    rt.shellOpen('s04')
    await tick()
    rt.inst = rt.remount()
    check('别处打开（页面已关）：回来时不再显示未读', rt.unreads() === 0, String(rt.unreads()))
    rt.unmount()

    // 3g. a run that finishes while the page is closed still waits
    localStorage.clear()
    rt = makeRuntime()
    rt.unmount()
    rt.finishRun('s09')
    await tick(120)
    rt.inst = rt.remount()
    check('页面关着时跑完：下次进来仍是未读', rt.unreads() === 1 && rt.unreadTitles()[0] === '对话 9', rt.unreadTitles().join('|'))
    rt.unmount()

    // 3h. opening a running Session once does not make its finish count as read
    localStorage.clear()
    rt = makeRuntime({ running: ['s01'] })
    rt.showRunning('s01')
    await tick(120)
    rt.setActive('recent-tasks')
    await tick(120)
    rt.finishRunHidden('s01')
    await tick(120)
    check('运行中打开过、回到列表后跑完 → 进未读', rt.unreads() === 1 && rt.unreadTitles()[0] === '对话 1', rt.unreadTitles().join('|'))
    rt.unmount()

    // 3i. finishing while the Conversation is on screen is not unread
    localStorage.clear()
    rt = makeRuntime({ running: ['s01'] })
    rt.showRunning('s01')
    await tick(60)
    rt.finishRunHidden('s01')
    await tick(120)
    check('盯着对话跑完不算未读', rt.unreads() === 0, String(rt.unreads()))
    openBand(rt, 'Done')
    await tick()
    check('盯着跑完的会话落回已完成', rt.rowTitles()[0] === '对话 1', rt.rowTitles().join('|'))
    rt.unmount()

    // 4. an empty band is not drawn at all: no header, no hint, no gap
    localStorage.clear()
    rt = makeRuntime({ running: [] })
    check('没有运行中时运行区整块消失',
      rt.lives() === 0 && !rt.container.querySelector('.drt-sectionRunning'), rt.zoneLabels().join('|'))
    check('只剩已完成一个区', rt.zoneLabels().join('|') === '已完成', rt.zoneLabels().join('|'))
    check('已完成区顶上来时不带多余分隔线',
      getComputedStyle(rt.container.querySelector('.drt-sectionDone')).borderTopWidth === '0px'
        && getComputedStyle(rt.container.querySelector('.drt-sectionDone')).paddingTop === '0px',
      getComputedStyle(rt.container.querySelector('.drt-sectionDone')).borderTopWidth)
    check('没有运行中时已完成计数 40', rt.zoneCount('Done') === '40', rt.counts().join('|'))
    openBand(rt, 'Done')
    await tick()
    check('没有运行中时仍显示 15 条', rt.rows() === 15, '实际 ' + rt.rows())

    // 4a. no running, one unread: 未读 takes the top and drops its divider
    localStorage.clear()
    rt = makeRuntime({ running: [] })
    rt.finishRun('s02')
    await tick()
    check('没有运行中时未读区排在最上', rt.zoneLabels().join('|') === '未读|已完成', rt.zoneLabels().join('|'))
    check('未读区顶上来时不带多余分隔线',
      getComputedStyle(rt.container.querySelector('.drt-sectionUnread')).borderTopWidth === '0px'
        && getComputedStyle(rt.container.querySelector('.drt-sectionUnread')).paddingTop === '0px',
      getComputedStyle(rt.container.querySelector('.drt-sectionUnread')).borderTopWidth)
    rt.unmount()

    // 4b. every session running: 已完成 leaves no header and no footer
    localStorage.clear()
    const allRunningIds = []
    for (let index = 0; index < 40; index += 1) allRunningIds.push('s' + String(index + 1).padStart(2, '0'))
    if (${JSON.stringify(otherId)} !== '') allRunningIds.push(${JSON.stringify(otherId)})
    rt = makeRuntime({ running: allRunningIds })
    check('全部在运行时只剩运行区',
      rt.zoneLabels().join('|') === '正在运行' && !!bandHeadButton(rt, '') && !bandIsOpen(rt, ''),
      rt.zoneLabels().join('|'))
    check('没有已完成区时底部收起按钮也不占位',
      !rt.container.querySelector('.drt-sectionDone') && rt.container.querySelector('.drt-more') === null,
      rt.footText())
    rt.unmount()

    // 5. expand step by step over the completed list
    localStorage.clear()
    rt = makeRuntime()
    openBand(rt, 'Done')
    await tick()
    check('收起的区没有底部按钮，点开才有', !!rt.container.querySelector('.drt-more'), rt.footText())
    click(rt.container.querySelector('.drt-more'))
    await tick()
    check('点一次显示 25 条', rt.rows() === 25, '实际 ' + rt.rows())
    check('底部按钮写明剩余 13', rt.footText() === '展开其余 13 个对话', rt.footText())

    click(rt.container.querySelector('.drt-more'))
    await tick()
    check('点两次显示 35 条', rt.rows() === 35, '实际 ' + rt.rows())

    click(rt.container.querySelector('.drt-more'))
    await tick()
    check('点三次显示全部 38 条', rt.rows() === 38, '实际 ' + rt.rows())
    check('全部展开后按钮变为收起', rt.footText() === '收起', rt.footText())

    // 6. one visit, one shape: coming back starts the count over too, and the
    // folded bands are folded again — only 已完成 arrives open
    rt.inst = rt.remount()
    check('离开再回来回到 15 条', rt.rows() === 15, '实际 ' + rt.rows())
    check('离开再回来仍只有已完成区展开', bandIsOpen(rt, 'Done')
      && (!bandHeadButton(rt, '') || !bandIsOpen(rt, ''))
      && (!bandHeadButton(rt, 'Fav') || !bandIsOpen(rt, 'Fav')), String(bandIsOpen(rt, 'Done')))

    click(rt.container.querySelector('.drt-more'))
    await tick()
    check('再次展开到 25 条', rt.rows() === 25, '实际 ' + rt.rows())

    const entryChrome = setupChrome({ press: 'refuse' })
    click(entryChrome.row)
    await tick()
    check('点侧栏入口后回到 15 条', rt.rows() === 15, '实际 ' + rt.rows())
    check('点侧栏入口后仍是只有已完成区展开', bandIsOpen(rt, 'Done') && !bandIsOpen(rt, ''),
      String(bandIsOpen(rt, '')))
    check('入口重置后仍提示剩余 23', rt.footText().indexOf('23') >= 0, rt.footText())
    entryChrome.remove()
    check('展开数不写本地存储', localStorage.getItem('dsh.recent-tasks.shown.v1') === null, String(localStorage.getItem('dsh.recent-tasks.shown.v1')))
    check('折叠状态不写本地存储',
      Object.keys(localStorage).every(key => key.indexOf('dsh.recent-tasks.') !== 0 || key === 'dsh.recent-tasks.folder.v1' || key === 'dsh.recent-tasks.unread.v1' || key === 'dsh.recent-tasks.favorites.v1'),
      Object.keys(localStorage).join('|'))
    rt.unmount()
    rt.unmount()

    // 4. + reuses a remembered folder that is already a Workspace
    localStorage.clear()
    localStorage.setItem('dsh.recent-tasks.folder.v1', '/Users/lnq/工作/项目A')
    rt = makeRuntime()
    click(rt.container.querySelector('.drt-add'))
    await tick(20)
    check('已有工作区：直接在该工作区开会话',
      rt.calls.some(call => call[0] === 'uiWorkspace.connectWorkspace' && call[1] === 'w1'), JSON.stringify(rt.calls))
    check('已有工作区：新会话被真正打开',
      rt.calls.some(call => call[0] === 'uiWorkspace.openSession' && call[1] === 'blank-w1'), JSON.stringify(rt.calls))
    check('已有工作区：用完不成导航的 startSession',
      !rt.calls.some(call => call[0] === 'uiWorkspace.startSession'), JSON.stringify(rt.calls))
    check('打开会话之前不提前关页（提前关会打断跳转）',
      rt.calls.findIndex(call => call[0] === 'uiWorkspace.openSession') >= 0
        && rt.calls.findIndex(call => call[0] === 'layout.selectPanel') > rt.calls.findIndex(call => call[0] === 'uiWorkspace.openSession'),
      JSON.stringify(rt.calls))
    check('已有工作区：不重复创建工作区', !rt.calls.some(call => call[0] === 'workspaces.create'), JSON.stringify(rt.calls))
    rt.unmount()

    // 5. + on a remembered folder that is not a Workspace yet
    localStorage.clear()
    localStorage.setItem('dsh.recent-tasks.folder.v1', '/Users/lnq/工作/新文件夹')
    rt = makeRuntime()
    click(rt.container.querySelector('.drt-add'))
    await tick(30)
    check('新文件夹：先登记成工作区', rt.calls.some(call => call[0] === 'workspaces.create' && call[1].path === '/Users/lnq/工作/新文件夹'),
      JSON.stringify(rt.calls))
    check('新文件夹：再用新工作区开会话',
      rt.calls.some(call => call[0] === 'uiWorkspace.connectWorkspace' && call[1] === 'w-created'), JSON.stringify(rt.calls))
    check('新文件夹：新会话被真正打开',
      rt.calls.some(call => call[0] === 'uiWorkspace.openSession' && call[1] === 'blank-w-created'), JSON.stringify(rt.calls))
    check('新文件夹：不退化成未分组会话', !rt.calls.some(call => call[0] === 'sessions.create'), JSON.stringify(rt.calls))
    rt.unmount()

    // 6. first + shows the chooser, picking a workspace behaves like 4
    localStorage.clear()
    rt = makeRuntime()
    click(rt.container.querySelector('.drt-add'))
    await tick(20)
    const overlay = rt.container.querySelector('.drt-overlay')
    check('首次点+弹出选择框', overlay !== null)
    check('选择框列出已有工作区', rt.container.querySelectorAll('.drt-choice').length === 2,
      String(rt.container.querySelectorAll('.drt-choice').length))
    click(rt.container.querySelectorAll('.drt-choice')[0])
    await tick(30)
    check('选中工作区后开新会话',
      rt.calls.some(call => call[0] === 'uiWorkspace.connectWorkspace' && call[1] === 'w1'), JSON.stringify(rt.calls))
    check('选中后新会话被真正打开',
      rt.calls.some(call => call[0] === 'uiWorkspace.openSession' && call[1] === 'blank-w1'), JSON.stringify(rt.calls))
    check('选中后记住文件夹', localStorage.getItem('dsh.recent-tasks.folder.v1') === '/Users/lnq/工作/项目A',
      localStorage.getItem('dsh.recent-tasks.folder.v1'))
    rt.unmount()

    // 7. failure surfaces a notice
    localStorage.clear()
    localStorage.setItem('dsh.recent-tasks.folder.v1', '/Users/lnq/工作/坏文件夹')
    rt = makeRuntime({ createFails: true })
    click(rt.container.querySelector('.drt-add'))
    await tick(30)
    check('失败时给出提示', rt.text().indexOf('新建会话失败：文件夹不可用') >= 0, rt.text().slice(0, 120))
    check('失败时不乱跳转', !rt.calls.some(call => call[0] === 'uiWorkspace.openSession'), JSON.stringify(rt.calls))
    rt.unmount()

    // 8. empty state
    localStorage.clear()
    rt = makeRuntime({ sessions: 0 })
    check('空态显示一行提示', rt.text().indexOf('最近 10 天没有会话。') >= 0, rt.text())
    rt.unmount()

    // 9. 未读只看「跑完且没打开过」，不再区分会话由谁发起
    localStorage.clear()
    rt = makeRuntime()
    rt.finishRun('s05')
    rt.finishRun('s06')
    await tick(120)
    check('机器人与本人发起的会话跑完都进未读', rt.unreads() === 2 && rt.unreadTitles().join('|') === '对话 5|对话 6', rt.unreadTitles().join('|'))
    check('未读不再读会话日志判定发起人', rt.calls.filter(call => call[0] === 'remote.session.page').length === 0, String(rt.calls.length))
    check('两区之外只剩已完成 36 条', rt.zoneCount('Done') === '36', rt.counts().join('|'))
    rt.unmount()

    // 9b. a second round on the same session counts as unread again
    localStorage.clear()
    rt = makeRuntime()
    rt.finishRun('s05')
    await tick(120)
    check('per-round: first completion enters unread', rt.unreads() === 1 && rt.unreadTitles()[0] === '对话 5', rt.unreadTitles().join('|'))
    rt.openElsewhere('s05')
    await tick(120)
    check('per-round: opening it leaves unread', rt.unreads() === 0, String(rt.unreads()))
    rt.startRun('s05')
    await tick(120)
    check('per-round: a running session is not unread', rt.unreads() === 0, String(rt.unreads()))
    rt.finishRun('s05')
    await tick(120)
    check('per-round: the next completion enters unread again', rt.unreads() === 1 && rt.unreadTitles()[0] === '对话 5', rt.unreadTitles().join('|'))
    rt.unmount()

    // 10. sidebar entry: the click refreshes the running code first, then enters
    disposeAll()
    sessionStorage.clear()
    rt = makeRuntime({ activePanelId: 'conversation' })
    let chrome = setupChrome({ press: 'refuse' })
    let handled = clickAndReport(chrome.row)
    await tick(520)
    check('点侧栏入口先借刷新按钮', chrome.clicks === 1, String(chrome.clicks))
    check('按下被拒时点击由插件接手', handled === false)
    check('按下被拒后进入最近任务页',
      rt.calls.some(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks'), JSON.stringify(rt.calls))
    check('按下被拒后不留回跳意图', sessionStorage.getItem('dsh.recent-tasks.reopen.v1') === null,
      String(sessionStorage.getItem('dsh.recent-tasks.reopen.v1')))
    rt.unmount(); rt.dispose(); chrome.remove()

    // 11. a press that is still working holds the entry until it answers
    disposeAll()
    sessionStorage.clear()
    rt = makeRuntime({ activePanelId: 'conversation' })
    chrome = setupChrome({ press: 'pending' })
    click(chrome.row)
    await tick(140)
    check('按下待定时先留在原页',
      !rt.calls.some(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks'), JSON.stringify(rt.calls))
    const armed = sessionStorage.getItem('dsh.recent-tasks.reopen.v1')
    check('按下待定时先记下回跳意图', armed !== null, String(armed))
    check('回跳意图带时间戳', armed !== null && Number.isFinite(JSON.parse(armed).at), String(armed))
    await tick(600)
    check('超时之前不提前切页',
      !rt.calls.some(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks'), JSON.stringify(rt.calls))
    chrome.settle()
    await tick(300)
    check('按下结束后才进入最近任务页',
      rt.calls.some(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks'), JSON.stringify(rt.calls))
    check('进入后清掉回跳意图', sessionStorage.getItem('dsh.recent-tasks.reopen.v1') === null,
      String(sessionStorage.getItem('dsh.recent-tasks.reopen.v1')))
    rt.unmount(); rt.dispose(); chrome.remove()

    // 12. after the rebuild the page opens itself again
    disposeAll()
    sessionStorage.clear()
    sessionStorage.setItem('dsh.recent-tasks.reopen.v1', JSON.stringify({ at: Date.now() }))
    rt = makeRuntime({ activePanelId: null })
    await tick(750)
    check('重载后自动回到最近任务页',
      rt.calls.filter(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks').length === 1,
      JSON.stringify(rt.calls))
    check('回跳后清掉意图', sessionStorage.getItem('dsh.recent-tasks.reopen.v1') === null,
      String(sessionStorage.getItem('dsh.recent-tasks.reopen.v1')))
    rt.unmount(); rt.dispose()

    // 13. a stale intent does nothing, and a person who moved on is left alone
    disposeAll()
    sessionStorage.clear()
    sessionStorage.setItem('dsh.recent-tasks.reopen.v1', JSON.stringify({ at: Date.now() - 300000 }))
    rt = makeRuntime({ activePanelId: null })
    await tick(420)
    check('过期意图不抢页面',
      !rt.calls.some(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks'), JSON.stringify(rt.calls))
    rt.unmount(); rt.dispose()

    disposeAll()
    sessionStorage.clear()
    sessionStorage.setItem('dsh.recent-tasks.reopen.v1', JSON.stringify({ at: Date.now() }))
    rt = makeRuntime({ activePanelId: 'conversation' })
    await tick(520)
    check('重载后落在别的页也把本页拿回来',
      rt.calls.filter(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks').length >= 1, JSON.stringify(rt.calls))
    rt.unmount(); rt.dispose()

    // 14. the person's own input during the watch takes over
    disposeAll()
    sessionStorage.clear()
    sessionStorage.setItem('dsh.recent-tasks.reopen.v1', JSON.stringify({ at: Date.now() }))
    rt = makeRuntime({ activePanelId: null })
    await tick(220)
    const enteredBefore = rt.calls.filter(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks').length
    check('重载后先回到本页', enteredBefore === 1, String(enteredBefore))
    rt.setActive('conversation')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await tick(700)
    check('用户一动就不再抢页面',
      rt.calls.filter(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks').length === enteredBefore, JSON.stringify(rt.calls))
    rt.unmount(); rt.dispose()

    // 14. without the refresh button, or already here, the row keeps its old meaning
    disposeAll()
    sessionStorage.clear()
    rt = makeRuntime({ activePanelId: 'conversation' })
    chrome = setupChrome({ noButton: true })
    handled = clickAndReport(chrome.row)
    check('没有刷新按钮时点击保持原样', handled === true)
    check('没有刷新按钮时不自行跳页',
      !rt.calls.some(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks'), JSON.stringify(rt.calls))
    chrome.remove()
    rt.unmount(); rt.dispose()

    disposeAll()
    sessionStorage.clear()
    rt = makeRuntime()
    chrome = setupChrome({ press: 'refuse' })
    handled = clickAndReport(chrome.row)
    check('已在本页时点击不触发刷新', chrome.clicks === 0, String(chrome.clicks))
    check('已在本页时点击保持原样', handled === true)
    chrome.remove()
    rt.unmount(); rt.dispose()

    // 16. a document that started on the served code opens the page at once
    disposeAll()
    sessionStorage.clear()
    let served = 'rev-a'
    let restore = stubCode(serves(() => served))
    rt = makeRuntime({ activePanelId: 'conversation' })
    chrome = setupChrome({ press: 'refuse' })
    handled = clickAndReport(chrome.row)
    await tick(240)
    check('代码一致时不借刷新按钮', chrome.clicks === 0, String(chrome.clicks))
    check('代码一致时点击仍由插件接手', handled === false)
    check('代码一致时直接进入最近任务页',
      rt.calls.some(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks'), JSON.stringify(rt.calls))
    check('代码一致时不留回跳意图', sessionStorage.getItem('dsh.recent-tasks.reopen.v1') === null,
      String(sessionStorage.getItem('dsh.recent-tasks.reopen.v1')))
    restore(); chrome.remove(); rt.unmount(); rt.dispose()

    // 17. the served code moved on after this document started: borrow the press
    disposeAll()
    sessionStorage.clear()
    served = 'rev-a'
    restore = stubCode(serves(() => served))
    rt = makeRuntime({ activePanelId: 'conversation' })
    chrome = setupChrome({ press: 'refuse' })
    await tick(20)
    served = 'rev-b'
    click(chrome.row)
    await tick(520)
    check('代码变了才借刷新按钮', chrome.clicks === 1, String(chrome.clicks))
    check('代码变了仍进入最近任务页',
      rt.calls.some(call => call[0] === 'layout.selectPanel' && call[1] === 'recent-tasks'), JSON.stringify(rt.calls))
    restore(); chrome.remove(); rt.unmount(); rt.dispose()

    // 18. answers that cannot be read keep the old behaviour
    disposeAll()
    sessionStorage.clear()
    restore = stubCode(async () => { throw new Error('network down') })
    rt = makeRuntime({ activePanelId: 'conversation' })
    chrome = setupChrome({ press: 'refuse' })
    click(chrome.row)
    await tick(520)
    check('问不到服务端代码时仍借刷新按钮', chrome.clicks === 1, String(chrome.clicks))
    restore(); chrome.remove(); rt.unmount(); rt.dispose()

    disposeAll()
    sessionStorage.clear()
    let looks = 0
    restore = stubCode(async () => {
      looks += 1
      if (looks === 1) throw new Error('first look failed')
      return { ok: true, json: async () => ({ graph: { rev: 'rev-a' } }) }
    })
    rt = makeRuntime({ activePanelId: 'conversation' })
    chrome = setupChrome({ press: 'refuse' })
    click(chrome.row)
    await tick(520)
    check('启动时没问到代号时仍借刷新按钮', chrome.clicks === 1, String(chrome.clicks))
    restore(); chrome.remove(); rt.unmount(); rt.dispose()

    // 19. a wedged first answer is abandoned after the wait, never wired to the entry
    disposeAll()
    sessionStorage.clear()
    restore = stubCode((url, init) => new Promise((resolve, reject) => {
      const timerId = setTimeout(() => resolve({ ok: true, json: async () => ({ graph: { rev: 'rev-a' } }) }), 6000)
      if (init && init.signal) init.signal.addEventListener('abort', () => { clearTimeout(timerId); reject(new Error('aborted')) })
    }))
    rt = makeRuntime({ activePanelId: 'conversation' })
    chrome = setupChrome({ press: 'refuse' })
    click(chrome.row)
    await tick(300)
    check('等待答复期间先不借按钮', chrome.clicks === 0, String(chrome.clicks))
    await tick(1500)
    check('答复超时后按已变处理', chrome.clicks === 1, String(chrome.clicks))
    restore(); chrome.remove(); rt.unmount(); rt.dispose()

    // 20. a Session blocked on the user is not just another running row
    localStorage.clear()
    rt = makeRuntime({ running: ['s01'] })
    rt.setPending('s05', 'approval')
    await tick()
    openBand(rt, '')
    openBand(rt, 'Done')
    await tick()
    check('待确认的会话留在正在运行区', rt.lives() === 2 && rt.liveTitles().indexOf('对话 5') >= 0, rt.liveTitles().join('|'))
    check('待确认提示写明一个在等我', rt.chipText() === '待你处理 1', rt.chipText())
    check('待确认卡片带 is-pending 标记', rt.pendingCards() === 1, String(rt.pendingCards()))
    const pendingCard = rt.container.querySelector('.drt-card.is-pending')
    const pendingDot = rt.container.querySelector('.drt-card.is-pending .drt-cardDot')
    const pendingRgb = pendingDot ? rgbOf(getComputedStyle(pendingDot).backgroundColor) : null
    check('待确认的卡不跟着流动', getComputedStyle(pendingCard).animationName === 'none', getComputedStyle(pendingCard).animationName)
    check('待确认的点仍是红色', pendingRgb !== null && pendingRgb.r > pendingRgb.g + 80 && pendingRgb.r > pendingRgb.b + 80,
      JSON.stringify(pendingRgb))
    check('卡片标签说明要做什么', rt.pendingLabels().join('|') === '等你确认', rt.pendingLabels().join('|'))
    check('待确认会话排在正在跑的前面', rt.liveTitles()[0] === '对话 5', rt.liveTitles().join('|'))
    check('待确认不算未读', rt.unreads() === 0, String(rt.unreads()))
    check('待确认不进已完成', rt.rowTitles().indexOf('对话 5') < 0, rt.rowTitles().join('|'))
    rt.setPending('s05', 'plan-review')
    await tick()
    check('计划待确认有自己的说法', rt.pendingLabels().join('|') === '等你定方案', rt.pendingLabels().join('|'))
    rt.setPending('s05', 'question')
    await tick()
    check('等回答有自己的说法', rt.pendingLabels().join('|') === '等你回答', rt.pendingLabels().join('|'))
    rt.setPending('s05', 'something-new')
    await tick()
    check('没见过的类型也算待处理', rt.pendingLabels().join('|') === '等你处理', rt.pendingLabels().join('|'))
    rt.resolvePendingInView('s05')
    await tick()
    check('处理完回到已完成', rt.pendingCards() === 0 && rt.chipText() === '' && rt.rowTitles().indexOf('对话 5') >= 0,
      rt.rowTitles().slice(0, 4).join('|'))
    rt.unmount()

    // 20b. when every running row is blocked, the band dot turns amber
    localStorage.clear()
    rt = makeRuntime({ running: [] })
    rt.setPending('s02', 'approval')
    await tick()
    check('全在等我时区块点是琥珀态', rt.headDotClass().indexOf('is-pending') >= 0 && rt.headDotClass().indexOf('is-idle') < 0, rt.headDotClass())
    openBand(rt, '')
    await tick()
    check('全在等我时仍然只算一条在运行', rt.zoneCount('') === '1' && rt.lives() === 1, rt.counts().join('|'))
    rt.unmount()

    // 20c. a visit that lands on someone waiting opens that band by itself
    // A blocked Session is the one thing on this page that cannot go on without
    // the person, so the band it sits in must not greet them with a closed
    // heading. The shape is decided once per visit, off the rows of that visit.
    localStorage.clear()
    rt = makeRuntime({ pending: { s02: 'approval' } })
    await tick()
    check('有人等着的运行区到达即打开', bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    check('打开的区直接画出那张等着的卡', rt.pendingCards() === 1 && rt.liveTitles()[0] === '对话 2', rt.liveTitles().join('|'))
    check('打开的区里在跑的也一并画出', rt.lives() === 3, String(rt.lives()))
    check('自动打开的时刻已完成区照旧是展开的', bandIsOpen(rt, 'Done'), String(bandIsOpen(rt, 'Done')))
    check('自动打开的区标题仍写着待你处理', rt.chipText() === '待你处理 1', rt.chipText())
    rt.unmount()

    // 20d. two runs and nobody waiting: the page is still a column of closed
    // headings, because a run that is merely long is not a run that is stuck
    localStorage.clear()
    rt = makeRuntime()
    await tick()
    check('只是跑着、没人等着，运行区仍然收着', !bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    check('收着的运行区一张卡都不画', rt.lives() === 0 && rt.zoneCount('') === '2', rt.counts().join('|'))
    rt.unmount()

    // 20e. a blocked Session that is also starred lives in 收藏, and that is the
    // band that opens — one session is listed once, so one band answers for it
    localStorage.clear()
    localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['s02']))
    rt = makeRuntime({ pending: { s02: 'plan-review' } })
    await tick()
    check('收藏里有人等着，收藏区到达即打开', bandIsOpen(rt, 'Fav'), String(bandIsOpen(rt, 'Fav')))
    check('收藏区画出那张等着的卡', rt.favorites() === 1 && rt.favoriteTitles().join('|') === '对话 2', rt.favoriteTitles().join('|'))
    check('收藏里有人等着时运行区不受牵连', !bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    rt.unmount()

    // 20f. both bands can be answering at once — each judges its own rows
    localStorage.clear()
    localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['s03']))
    rt = makeRuntime({ pending: { s02: 'approval', s03: 'question' } })
    await tick()
    check('两个区各有人等着就各自打开', bandIsOpen(rt, '') && bandIsOpen(rt, 'Fav'),
      String(bandIsOpen(rt, '')) + ' / ' + String(bandIsOpen(rt, 'Fav')))
    rt.unmount()

    // 20g. the decision belongs to the arrival: a Session that starts waiting
    // while the page is already on screen marks its heading, it does not shove
    // the cards under the pointer aside
    localStorage.clear()
    rt = makeRuntime({})
    await tick()
    check('没人在等时到达是收着的', !bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    rt.setPending('s01', 'approval')
    await tick()
    check('页面开着时才开始等的，不自己弹开', !bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    check('但标题行立刻写出待你处理', rt.chipText() === '待你处理 1', rt.chipText())
    check('收着的标题行也写着区里有几条', rt.zoneCount('') === '2', rt.counts().join('|'))
    click(bandHeadButton(rt, ''))
    await tick()
    check('这时点开标题仍能看到那张卡', rt.pendingCards() === 1, String(rt.pendingCards()))
    rt.unmount()

    // 20h. coming back through the sidebar entry is a new arrival
    localStorage.clear()
    rt = makeRuntime({ activePanelId: 'other-panel' })
    await tick()
    check('页面开着时先按到达规则收着', !bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    rt.setPending('s02', 'approval')
    await tick()
    window.dispatchEvent(new Event('dsh.recent-tasks:entry'))
    rt.setActive('recent-tasks')
    await tick()
    check('点侧栏入口进来时有人等着就打开', bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    check('点侧栏入口进来直接看见那张卡', rt.pendingCards() === 1, String(rt.pendingCards()))
    rt.unmount()

    // 20i. a remount is a fresh visit too
    localStorage.clear()
    rt = makeRuntime({ pending: { s02: 'approval' } })
    await tick()
    click(bandHeadButton(rt, ''))
    await tick()
    check('先把自动打开的区收回去', !bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    rt.inst = rt.remount()
    await tick()
    check('重挂载后按到达规则重新打开', bandIsOpen(rt, ''), String(bandIsOpen(rt, '')))
    rt.unmount()

    // 20j. 已完成 opens from the table, not from the rows: a blocked Session
    // belongs to 正在运行 and never lands there, however it is spelled
    localStorage.clear()
    rt = makeRuntime({ running: [], pending: { s09: 'approval' } })
    await tick()
    check('等着的会话不在已完成里', rt.container.querySelector('.drt-sectionDone') !== null
      && rt.rowTitles().indexOf('对话 9') < 0, rt.rowTitles().join('|'))
    check('只有已完成区自己展开', bandIsOpen(rt, 'Done') && rt.rows() === 15, String(rt.rows()))
    rt.unmount()

    // 20k. the arrival shape is still not remembered
    localStorage.clear()
    rt = makeRuntime({ pending: { s02: 'approval' } })
    await tick()
    check('自动打开也不写本地存储', localStorage.getItem('dsh.recent-tasks.folder.v1') === null
      && localStorage.getItem('dsh.recent-tasks.shown.v1') === null,
      String(localStorage.getItem('dsh.recent-tasks.folder.v1')))
    rt.unmount()

    // 21. the sweep button: archive everything older than 7 days, keep the rest
    localStorage.clear()
    rt = makeRuntime({ oldSessions: 5 })
    await tick(5)
    check('页头有「只留 7 天」按钮', rt.sweepButton() !== null && rt.sweepText() === '只留 7 天', rt.sweepText())
    const sweepAt = Array.from(rt.container.querySelectorAll('.drt-actions > button')).map(el => el.className)
    check('按钮排在返回对话和加号之前',
      sweepAt.length === 3 && sweepAt[0].indexOf('drt-sweep') >= 0 && sweepAt[1].indexOf('drt-ghost') >= 0 && sweepAt[2].indexOf('drt-add') >= 0,
      sweepAt.join('|'))
    check('按钮带说明', (rt.sweepButton() || {}).title !== undefined && rt.sweepButton().title.indexOf('7 天') >= 0,
      rt.sweepButton() ? rt.sweepButton().title : '')
    click(rt.sweepButton())
    await tick(5)
    check('点按钮先弹确认框', rt.dialogText().indexOf('归档更早的会话') >= 0, rt.dialogText())
    check('确认框写清要归档几条', rt.dialogText().indexOf('5 个会话') >= 0, rt.dialogText())
    check('确认框说可以恢复', rt.dialogText().indexOf('恢复') >= 0, rt.dialogText())
    check('还没确认就一个字都没归档', rt.archivedIds().length === 0, rt.archivedIds().join('|'))
    click(rt.dialogCancel())
    await tick(5)
    check('取消后什么都不做', rt.archivedIds().length === 0 && rt.dialogText() === '', rt.archivedIds().join('|'))

    click(rt.sweepButton())
    await tick(5)
    click(rt.dialogConfirm())
    await tick(60)
    check('确认后 7 天以前的全归档了', rt.archivedIds().sort().join('|') === 'o01|o02|o03|o04|o05', rt.archivedIds().join('|'))
    check('归档后给出结果提示', rt.noticeText() === '已归档 5 个会话。', rt.noticeText())
    check('归档调用走的是界面归档接口',
      rt.calls.filter(call => call[0] === 'uiWorkspace.archiveSession').length === 5,
      String(rt.calls.filter(call => call[0] === 'uiWorkspace.archiveSession').length))
    check('归档后确认框已关掉', rt.dialogText() === '', rt.dialogText())
    click(rt.sweepButton())
    await tick(5)
    check('再点一次说已经没有更早的了', rt.noticeText() === '7 天以前的会话已经没有了。', rt.noticeText())
    check('没有可归档时不再弹确认框', rt.dialogText() === '', rt.dialogText())
    rt.unmount()

    // 21a. the row that is on the page right now and just past the cutoff
    localStorage.clear()
    rt = makeRuntime({ pageOld: 2 })
    await tick(5)
    // These two sit past the cutoff but inside the ten-day window, so the page
    // counts them today and must stop counting them once they are archived.
    const doneBefore = Number(rt.zoneCount('Done'))
    check('过期边缘的对话算在已完成里', doneBefore === 40, String(doneBefore))
    click(rt.sweepButton())
    await tick(5)
    check('确认框只点名这两条', rt.dialogText().indexOf('2 个会话') >= 0, rt.dialogText())
    click(rt.dialogConfirm())
    await tick(60)
    check('归档后已完成计数少了两条', Number(rt.zoneCount('Done')) === doneBefore - 2,
      doneBefore + ' → ' + rt.zoneCount('Done'))
    check('归档的正是这两条', rt.archivedIds().sort().join('|') === 'm01|m02', rt.archivedIds().join('|'))
    rt.unmount()

    // 21b. what the sweep leaves alone: starred rows and rows still running
    localStorage.clear()
    localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['o01']))
    rt = makeRuntime({ oldSessions: 5, running: ['o02'] })
    await tick(5)
    click(rt.sweepButton())
    await tick(5)
    check('确认框说明收藏的不会被归档', rt.dialogText().indexOf('收藏') >= 0, rt.dialogText())
    check('确认框说明还在运行的不动', rt.dialogText().indexOf('运行') >= 0, rt.dialogText())
    click(rt.dialogConfirm())
    await tick(60)
    check('收藏的和在运行的都没被归档',
      rt.archivedIds().sort().join('|') === 'o03|o04|o05', rt.archivedIds().join('|'))
    check('只归档剩下的三条', rt.noticeText() === '已归档 3 个会话。', rt.noticeText())
    rt.unmount()

    // 21c. failures are reported, not swallowed
    localStorage.clear()
    rt = makeRuntime({ oldSessions: 3, archiveFails: ['o02'] })
    await tick(5)
    click(rt.sweepButton())
    await tick(5)
    click(rt.dialogConfirm())
    await tick(60)
    check('部分没归档时说清几条', rt.noticeText() === '1 个没能归档：这个会话还在运行', rt.noticeText())
    check('能归档的照旧归档', rt.archivedIds().sort().join('|') === 'o01|o03', rt.archivedIds().join('|'))
    rt.unmount()

    // 21d. a build without an archive API says so instead of breaking
    localStorage.clear()
    rt = makeRuntime({ oldSessions: 2, noArchive: true })
    await tick(5)
    click(rt.sweepButton())
    await tick(5)
    check('归档接口缺失时直接说明', rt.noticeText() === '当前界面不支持归档会话。', rt.noticeText())
    check('归档接口缺失时不弹确认框', rt.dialogText() === '', rt.dialogText())
    rt.unmount()

    // 21e. the undo bar: archiving leaves a way back for thirty seconds
    localStorage.clear()
    rt = makeRuntime({ oldSessions: 5 })
    await tick(5)
    check('没有归档动作时不出撤销条', rt.undoBar() === null, rt.undoText())
    click(rt.sweepButton())
    await tick(5)
    click(rt.dialogConfirm())
    await tick(10)
    check('归档后出现撤销条', rt.undoBar() !== null, rt.undoText())
    check('撤销条说清刚归档几条', rt.undoText().indexOf('刚归档 5 个会话') >= 0, rt.undoText())
    check('撤销按钮带倒计时', (rt.undoAction() || {}).textContent.indexOf('撤销') >= 0
      && /\d+s/.test(rt.undoAction().textContent), rt.undoAction() ? rt.undoAction().textContent : '')
    const undoAt = Array.from(rt.container.querySelectorAll('.drt-page > *')).map(el => el.className)
    check('撤销条排在提示与列表之间',
      undoAt.indexOf('drt-notice is-success') >= 0
      && undoAt.indexOf('drt-undo') === undoAt.indexOf('drt-notice is-success') + 1
      && undoAt.indexOf('drt-body') === undoAt.indexOf('drt-undo') + 1,
      undoAt.join('|'))
    click(rt.undoAction())
    await tick(15)
    check('撤销把会话还回去了', rt.archivedIds().length === 0, rt.archivedIds().join('|'))
    check('撤销后说清恢复了几条', rt.noticeText() === '已恢复 5 个会话。', rt.noticeText())
    check('撤销后条子收起', rt.undoBar() === null, rt.undoText())
    check('撤销调用走的是界面恢复接口',
      rt.calls.filter(call => call[0] === 'uiWorkspace.unarchiveSession').length === 5,
      String(rt.calls.filter(call => call[0] === 'uiWorkspace.unarchiveSession').length))
    rt.unmount()

    // 21f. a build that can archive but not restore must not offer undo
    localStorage.clear()
    rt = makeRuntime({ oldSessions: 3, noUnarchive: true })
    await tick(5)
    click(rt.sweepButton())
    await tick(5)
    click(rt.dialogConfirm())
    await tick(10)
    check('不能恢复时不出撤销条', rt.undoBar() === null, rt.undoText())
    check('不能恢复时归档照常进行', rt.archivedIds().length === 3, rt.archivedIds().join('|'))
    rt.unmount()

    // 21g. partial failure still leaves undo for what did land
    localStorage.clear()
    rt = makeRuntime({ oldSessions: 3, archiveFails: ['o02'] })
    await tick(5)
    click(rt.sweepButton())
    await tick(5)
    click(rt.dialogConfirm())
    await tick(15)
    check('部分失败也给出撤销条', rt.undoBar() !== null, rt.undoText())
    check('撤销条只算真正归档的那几条', rt.undoText().indexOf('刚归档 2 个会话') >= 0, rt.undoText())
    rt.unmount()

    // 21h. the 归档 mark on a single 已完成 card: no dialog, one row gone,
    // the same thirty-second way back
    localStorage.clear()
    rt = makeRuntime({})
    await tick(5)
    check('已完成每张卡都带归档按钮', rt.archiveMarks().length === rt.rows() && rt.rows() > 0,
      String(rt.archiveMarks().length) + ' / ' + String(rt.rows()))
    check('其它区不带归档按钮', rt.lives() === 0
      && rt.container.querySelectorAll('.drt-card.is-running .drt-archive').length === 0
      && rt.container.querySelectorAll('.drt-card.is-unread .drt-archive').length === 0)
    const arcBtn = rt.archiveMarkAt(0)
    const arcBox = arcBtn.getBoundingClientRect()
    const arcCard = arcBtn.closest('.drt-card')
    const arcStar = arcCard.querySelector('.drt-star')
    const arcStarBox = arcStar.getBoundingClientRect()
    check('归档按钮点击区 44px', Math.round(arcBox.width) === 44 && Math.round(arcBox.height) === 44,
      Math.round(arcBox.width) + 'x' + Math.round(arcBox.height))
    check('归档按钮竖向居中',
      Math.abs((arcBox.top + arcBox.height / 2) - (arcStarBox.top + arcStarBox.height / 2)) <= 2,
      Math.round(arcBox.top + arcBox.height / 2) + ' / ' + Math.round(arcStarBox.top + arcStarBox.height / 2))
    check('归档按钮排在星星左边', arcBox.right <= arcStarBox.left,
      Math.round(arcBox.right) + ' / ' + Math.round(arcStarBox.left))
    check('归档按钮不压到标题与说明',
      arcCard.querySelector('.drt-cardTitle').getBoundingClientRect().right <= arcBox.left
      && arcCard.querySelector('.drt-cardMeta').getBoundingClientRect().right <= arcBox.left,
      Math.round(arcCard.querySelector('.drt-cardMeta').getBoundingClientRect().right) + ' / ' + Math.round(arcBox.left))
    check('归档按钮图标 20px', Math.round(arcBtn.querySelector('svg').getBoundingClientRect().width) === 20,
      getComputedStyle(arcBtn.querySelector('svg')).width)
    check('归档图标平时淡着', parseFloat(getComputedStyle(arcBtn).opacity) < 0.5, getComputedStyle(arcBtn).opacity)
    const firstDoneTitle = rt.rowTitles()[0]
    const opensBefore = rt.calls.filter(call => call[0] === 'uiWorkspace.openSession').length
    click(arcBtn)
    await tick(10)
    check('点归档不出确认框', rt.dialogText() === '', rt.dialogText())
    check('点归档不打开会话', rt.calls.filter(call => call[0] === 'uiWorkspace.openSession').length === opensBefore,
      JSON.stringify(rt.calls.slice(-3)))
    check('点归档只归档这一张', rt.archivedIds().length === 1, rt.archivedIds().join('|'))
    check('点归档走的是界面归档接口',
      rt.calls.filter(call => call[0] === 'uiWorkspace.archiveSession').length === 1,
      String(rt.calls.filter(call => call[0] === 'uiWorkspace.archiveSession').length))
    check('归档的那张从列表里消失', rt.titleCount(firstDoneTitle) === 0, firstDoneTitle)
    check('归档后给出结果提示', rt.noticeText() === '已归档 1 个会话。', rt.noticeText())
    check('归档后出现撤销条', rt.undoBar() !== null, rt.undoText())
    check('撤销条说清刚归档一条', rt.undoText().indexOf('刚归档 1 个会话') >= 0, rt.undoText())
    check('归档后其余已完成卡还在', rt.rows() === 15 && rt.zoneCount('Done') === '37',
      String(rt.rows()) + ' / ' + rt.zoneCount('Done'))
    click(rt.undoAction())
    await tick(15)
    check('单卡归档也能撤销回去', rt.archivedIds().length === 0, rt.archivedIds().join('|'))
    check('撤销后那张回到列表', rt.titleCount(firstDoneTitle) === 1, String(rt.titleCount(firstDoneTitle)))
    check('撤销后说清恢复了几条', rt.noticeText() === '已恢复 1 个会话。', rt.noticeText())
    rt.unmount()

    // 21i. a second click lands on the same undo slot rather than stacking a
    // second bar — the way back always points at the last thing archived
    localStorage.clear()
    rt = makeRuntime({})
    await tick(5)
    click(rt.archiveMarkAt(0))
    await tick(10)
    const afterOne = rt.rowTitles()[0]
    click(rt.archiveMarkAt(0))
    await tick(10)
    check('连续归档两张各走一次', rt.archivedIds().length === 2, rt.archivedIds().join('|'))
    check('撤销条只指最后一次', rt.undoText().indexOf('刚归档 1 个会话') >= 0, rt.undoText())
    click(rt.undoAction())
    await tick(15)
    check('撤销只恢复最后一张', rt.archivedIds().length === 1, rt.archivedIds().join('|'))
    check('撤销把最后那张放回原位', rt.titleCount(afterOne) === 1, String(rt.titleCount(afterOne)))
    rt.unmount()

    // 21j. a build without an archive API, and one whose archive refuses: the
    // card stays put and the reply is the same line the sweep button uses
    localStorage.clear()
    rt = makeRuntime({ noArchive: true })
    await tick(5)
    check('没有归档接口时按钮照画', rt.archiveMarks().length === rt.rows() && rt.rows() > 0,
      String(rt.archiveMarks().length))
    click(rt.archiveMarkAt(0))
    await tick(10)
    check('没有归档接口时点它直接说明', rt.noticeText() === '当前界面不支持归档会话。', rt.noticeText())
    check('没有归档接口时卡片不动', rt.rows() === 15, String(rt.rows()))
    rt.unmount()

    localStorage.clear()
    rt = makeRuntime({ archiveFailsAll: true })
    await tick(5)
    const keptTitle = rt.rowTitles()[0]
    click(rt.archiveMarkAt(0))
    await tick(10)
    check('归档失败时给出原因', rt.noticeText().indexOf('1 个没能归档：归档服务暂时不可用') >= 0, rt.noticeText())
    check('归档失败时卡片留在原地', rt.titleCount(keptTitle) === 1 && rt.rows() === 15, String(rt.rows()))
    check('归档失败时不出撤销条', rt.undoBar() === null, rt.undoText())
    check('归档失败后按钮可以再点', rt.archiveMarkAt(0).disabled === false,
      String(rt.archiveMarkAt(0).disabled))
    rt.unmount()

    // 21k. while one row is being archived every other mark waits, so a stray
    // second click cannot race the first
    localStorage.clear()
    rt = makeRuntime({ archiveDelay: 40 })
    await tick(5)
    click(rt.archiveMarkAt(0))
    await tick(10)
    check('归档进行中其它按钮先禁用', rt.archiveMarks().every(mark => mark.disabled === true),
      String(rt.archiveMarks().filter(mark => !mark.disabled).length))
    check('正在归档的那张自己也在禁用之列', rt.archiveMarks()[0].disabled === true,
      String(rt.archiveMarks()[0].disabled))
    await tick(80)
    check('归档结束后按钮恢复可用', rt.archiveMarks().every(mark => mark.disabled === false),
      String(rt.archiveMarks().filter(mark => mark.disabled).length))
    rt.unmount()

    // 22. the keep window is read from settings, not baked into the page
    localStorage.clear()
    rt = makeRuntime({ oldSessions: 6, keepDays: 30 })
    await tick(5)
    check('页头按钮跟着设置走', rt.sweepText() === '只留 30 天', rt.sweepText())
    click(rt.sweepButton())
    await tick(5)
    check('没有超出窗口的会话时不弹框', rt.dialogText() === '', rt.dialogText())
    check('并说清已经没有更早的', rt.noticeText() === '30 天以前的会话已经没有了。', rt.noticeText())
    rt.unmount()

    // 22a. a smaller window sweeps the ten-day rows the default window keeps
    localStorage.clear()
    rt = makeRuntime({ pageOld: 2, keepDays: 3 })
    await tick(5)
    check('窗口调小后页头跟着变', rt.sweepText() === '只留 3 天', rt.sweepText())
    click(rt.sweepButton())
    await tick(5)
    check('窗口调小后能清掉十天内的旧会话', rt.dialogText().indexOf('2 个会话') >= 0, rt.dialogText())
    click(rt.dialogConfirm())
    await tick(10)
    check('确实归档了那两条', rt.archivedIds().sort().join('|') === 'm01|m02', rt.archivedIds().join('|'))
    rt.unmount()

    // 22b. no settings surface at all: the page still works on the default
    localStorage.clear()
    rt = makeRuntime({ oldSessions: 3, noSettings: true })
    await tick(5)
    check('没有设置入口时按默认七天', rt.sweepText() === '只留 7 天', rt.sweepText())
    click(rt.sweepButton())
    await tick(5)
    check('没有设置入口也能正常归档', rt.dialogText().indexOf('3 个会话') >= 0, rt.dialogText())
    rt.unmount()

    // 23. the settings card the plugin manager mounts for this row
    localStorage.clear()
    rt = makeRuntime({})
    await tick(5)
    check('向插件管理器登记了配置位', rt.configKeys().length >= 1, rt.configKeys().join('|'))
    check('配置位按包名加行 id 取名',
      rt.configKeys().every(key => key.indexOf('@dsh-local/view-8c716ee6-17d5-46ae-b021-c82f36d0f6c1#') === 0),
      rt.configKeys().join('|'))
    const summary = rt.renderConfig('summary')
    check('描述位给出当前天数', summary !== null && summary.textContent === '只留最近 7 天',
      summary ? summary.textContent : 'null')
    const card = rt.renderConfig('page')
    check('设置卡有天数输入框', card !== null && card.querySelector('#drt-keep-days') !== null,
      card ? card.textContent : 'null')
    check('设置卡写明单位', card !== null && card.textContent.indexOf('天') >= 0, card ? card.textContent : 'null')
    const input = card ? card.querySelector('#drt-keep-days') : null
    if (input) {
      input.value = '21'
      // The harness shim maps onChange onto the DOM 'change' event; real React
      // listens for 'input'. Fire both so either binding sees the edit.
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
    await tick(5)
    const saveButton = card ? Array.from(card.querySelectorAll('button')).filter(el => el.textContent === '保存')[0] : null
    check('改过之后保存按钮可点', saveButton !== undefined && saveButton !== null && !saveButton.disabled,
      saveButton ? String(saveButton.disabled) : 'null')
    if (saveButton) click(saveButton)
    await tick(10)
    const wrote = rt.calls.filter(call => call[0] === 'configForms.set')
    check('保存写的是 keepDays 字段', wrote.length === 1 && wrote[0][2] === 'keepDays' && wrote[0][3] === 21,
      JSON.stringify(wrote))
    check('保存后提示已生效', card !== null && card.textContent.indexOf('已保存，页面按 21 天工作。') >= 0,
      card ? card.textContent : 'null')
    rt.unmount()

    // 24. the sidebar entry: three counts riding beside the glyph
    // The shell draws that row, so the harness mounts the registered glyph itself.
    localStorage.clear()
    disposeAll()
    rt = makeRuntime({})
    await tick(5)
    const entry = rt.renderEntry()
    await tick(5)
    check('侧栏入口挂得上', entry !== null && entry.querySelector('svg[data-dsh-panel-entry="recent-tasks"]') !== null,
      entry ? entry.textContent : 'null')
    check('默认只有运行中那枚', rt.entryBadges().join('|') === '2', rt.entryBadges().join('|'))
    check('运行中那枚是浅蓝的', rt.entryBadgeClasses().join('|') === 'drt-entryBadge is-running',
      rt.entryBadgeClasses().join('|'))
    check('鼠标停上去说清几个在跑', rt.entryBadgeTitles().join('|') === '2 个正在运行',
      rt.entryBadgeTitles().join('|'))

    // Where the counts sit: the row is glyph, label, counts — so the pills start
    // where the label ends, not beside the icon where they used to hang.
    const landed = rt.entryBoxes()
    check('药丸排在「最近任务」四个字后面',
      landed !== null && landed.labelWidth > 0 && landed.badgesLeft >= landed.labelRight,
      landed === null ? 'null' : landed.badgesLeft.toFixed(1) + ' vs ' + landed.labelRight.toFixed(1))
    check('药丸没被挤出行尾', landed !== null && landed.badgesRight <= landed.buttonRight,
      landed === null ? 'null' : landed.badgesRight.toFixed(1) + ' vs ' + landed.buttonRight.toFixed(1))

    // One session starts waiting on the person: a red pill joins, and the run
    // it belongs to still counts as running, so both numbers move.
    rt.setPending('s03', 'approval')
    await tick(200)
    check('有人等你处理时多一枚红的', rt.entryBadges().join('|') === '1|3', rt.entryBadges().join('|'))
    check('红的那枚排在前面', rt.entryBadgeClasses()[0] === 'drt-entryBadge is-pending',
      rt.entryBadgeClasses().join('|'))

    // A run that ended unopened is the news the page exists to deliver.
    rt.finishRun('s01')
    await tick(200)
    check('跑完没看的也有一枚', rt.entryBadges().join('|') === '1|2|1', rt.entryBadges().join('|'))
    check('没看的那枚是绿的', rt.entryBadgeClasses().join('|') === 'drt-entryBadge is-pending|drt-entryBadge is-running|drt-entryBadge is-unread',
      rt.entryBadgeClasses().join('|'))

    // The person answers: the red one goes away on its own, and s03 — answered
    // but never opened — slides over into the unread count beside s01.
    rt.setPending('s03', undefined)
    await tick(200)
    check('处理完红的那枚自己消失', rt.entryBadges().join('|') === '1|2', rt.entryBadges().join('|'))

    // Zero means no pill at all: an idle entry is the plain icon it used to be.
    disposeAll()
    localStorage.clear()
    rt = makeRuntime({ running: [] })
    await tick(5)
    rt.renderEntry()
    await tick(5)
    check('什么都没在发生时一枚都不挂', rt.entryBadges().length === 0, rt.entryBadges().join('|'))
    check('一枚都不挂时连药丸容器都不画',
      rt.entryBadges().length === 0 && document.querySelector('.drt-entryBadges') === null, '')

    // Starred sessions still count: the page moves them out of the running band,
    // the entry keeps counting them because a run is a run wherever it is listed.
    disposeAll()
    localStorage.clear()
    localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['s07']))
    rt = makeRuntime({})
    await tick(5)
    rt.renderEntry()
    await tick(200)
    check('收藏里的在跑也算进角标', rt.entryBadges().join('|') === '2', rt.entryBadges().join('|'))
    check('页面的运行区只算没收藏的', rt.zoneCount('') === '1', rt.zoneCount(''))

    // The same rule for a run that ended: starred and never opened, the page
    // files it under 收藏 and its 未读 band stays empty, but the entry still
    // owes a green pill — the run finished and nobody looked at it.
    rt.finishRun('s07')
    await tick(200)
    check('收藏里没看的也算进未读那枚', rt.entryBadges().join('|') === '1|1', rt.entryBadges().join('|'))
    // The page has no unread band at all here: the only finished-unopened run is
    // starred, and 收藏 owns it. The entry's green pill is the only place it shows.
    check('但页面的未读区不含收藏', rt.zoneCount('Unread') === '' && rt.unreads() === 0,
      rt.zoneCount('Unread') + '/' + rt.unreads())

    // A collapsed sidebar keeps the 36px glyph only; the pills would not fit.
    document.body.setAttribute('data-sidebar-collapsed', '')
    const badgesBox = document.querySelector('.drt-entryBadges')
    check('侧栏收起时不画角标', badgesBox !== null && getComputedStyle(badgesBox).display === 'none',
      badgesBox ? getComputedStyle(badgesBox).display : 'null')
    document.body.removeAttribute('data-sidebar-collapsed')
    // Away from the page, a star is the only way a session older than the
    // ten-day window becomes visible at all — and a run is a run, so the entry
    // has to hear about the star itself.
    disposeAll()
    localStorage.clear()
    rt = makeRuntime({ oldSessions: 5, running: ['o04'] })
    await tick(5)
    rt.renderEntry()
    await tick(200)
    check('十天以外在跑的，没收藏就不数', rt.entryBadges().length === 0, rt.entryBadges().join('|'))
    localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['o04']))
    window.dispatchEvent(new Event('dsh.recent-tasks:favorites'))
    await tick(200)
    check('收藏一变，角标当场重算', rt.entryBadges().join('|') === '1', rt.entryBadges().join('|'))
    localStorage.removeItem('dsh.recent-tasks.favorites.v1')
    window.dispatchEvent(new Event('dsh.recent-tasks:favorites'))
    await tick(200)
    check('取消收藏后那枚又下去', rt.entryBadges().length === 0, rt.entryBadges().join('|'))

    rt.unmount()
    rt.dispose()
    disposeAll()
    localStorage.clear()

    const failed = results.filter(line => line.indexOf('FAIL') === 0).length
    document.title = failed === 0 ? 'ALL PASS (' + results.length + ')' : 'FAILED ' + failed + '/' + results.length
    const log = document.getElementById('log')
    log.textContent = results.join('\n')
    localStorage.clear()
  }

  run().catch(error => {
    document.title = 'ERROR'
    document.getElementById('log').textContent = 'ERROR ' + (error && error.stack ? error.stack : error)
  })
})()
`

const html = `<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>harness</title>
<style>${theme}${shellRow}
html,body,#stage{height:100%}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif}
#stage>div{height:100%}
</style>
</head>
<body>
<div id="stage"></div>
<pre id="log" style="white-space:pre-wrap;font-size:13px"></pre>
<script>${shim}</script>
<script>${plugin}</script>
<script>${harness}</script>
</body>
</html>`

const out = process.env.RT_OUT || path.join(ROOT, '临时', 'harness.html')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, html)
console.log('harness written:', out, `(${html.length} bytes)`)
