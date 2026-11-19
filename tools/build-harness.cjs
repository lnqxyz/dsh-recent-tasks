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
    const workspaceState = { items: workspaceItems, archivedSessionIds: [] }

    // Official DSH shape: UiSession.sessionStatus → Map<id, {running, pendingInteraction, completionUnread}>.
    const statusById = new Map()
    for (const id of ids) {
      statusById.set(id, { running: sessionsById[id].running, pendingInteraction: undefined, completionUnread: false })
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

    const services = {
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
        list: { getSnapshot: () => workspaceState, subscribe: () => () => {} },
        create: async input => {
          calls.push(['workspaces.create', input])
          if (opts.createFails) throw new Error('文件夹不可用')
          return { workspace: { workspaceId: 'w-created', path: input.path }, created: true }
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
        pickDirectory: async () => '/Users/lnq/工作/新文件夹',
        listDirectory: async () => [],
      },
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
      setActive(id) { activePanelId = id },
      dispose() {
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
      if (location.search.indexOf('favrun') >= 0) {
        localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['s01', 's07', 's02']))
      } else if (location.search.indexOf('fav') >= 0) {
        localStorage.setItem('dsh.recent-tasks.favorites.v1', JSON.stringify(['s02', 's05', 's09']))
      }
      if (location.search.indexOf('dark') >= 0) document.body.setAttribute('data-ds-dark-theme', '')
      const many = location.search.indexOf('many') >= 0 ? ['s01','s02','s03','s04','s05','s06','s07','s08','s09','s10'] : undefined
      const rt0 = makeRuntime(location.search.indexOf('none') >= 0 ? { running: [] } : many ? { running: many } : undefined)
      if (location.search.indexOf('pending') >= 0) {
        rt0.setPending('s01', 'approval')
        rt0.setPending('s02', 'plan-review')
        rt0.setPending('s03', 'question')
      }
      if (location.search.indexOf('unread') >= 0) {
        rt0.finishRun('s02')
        rt0.finishRun('s04')
        rt0.finishRun('s09')
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
    // 1. two zones: 2 running cards + 15 completed rows
    localStorage.clear()
    let rt = makeRuntime()
    check('启动时运行区列出 2 个', rt.lives() === 2, '实际 ' + rt.lives())
    check('运行卡标题正确', rt.liveTitles().join('|') === '对话 1|对话 7', rt.liveTitles().join('|'))
    check('运行区计数为 2', rt.zoneCount('') === '2', rt.counts().join('|'))
    check('已完成区计数为 38', rt.zoneCount('Done') === '38', rt.counts().join('|'))
    check('启动时没有未读区',
      rt.unreads() === 0 && rt.zoneCount('Unread') === '' && !rt.container.querySelector('.drt-sectionUnread'),
      rt.counts().join('|'))
    check('已完成区启动显示 15 条', rt.rows() === 15, '实际 ' + rt.rows())
    check('已完成区不含运行中的对话', rt.rowTitles().indexOf('对话 1') < 0 && rt.rowTitles().indexOf('对话 7') < 0, rt.rowTitles().join('|'))
    check('底部按钮写明剩余 23', rt.footText() === '展开其余 23 个对话', rt.footText())
    check('展开数不写本地存储', localStorage.getItem('dsh.recent-tasks.shown.v1') === null, String(localStorage.getItem('dsh.recent-tasks.shown.v1')))

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
    const rgbOf = css => {
      const match = /rgba?\(([^)]+)\)/.exec(css)
      if (!match) return null
      const parts = match[1].split(',').map(value => Number(value.trim()))
      return { r: parts[0], g: parts[1], b: parts[2] }
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
    const bigTitleBox = bigStar.closest('.drt-card').querySelector('.drt-cardTitle').getBoundingClientRect()
    check('星星图标放大到 30px', Math.round(parseFloat(getComputedStyle(bigStarSvg).width)) === 30,
      getComputedStyle(bigStarSvg).width)
    const starRail = bigStar.closest('.drt-cardRail')
    const cardBox0 = bigStar.closest('.drt-card').getBoundingClientRect()
    const railBox = starRail ? starRail.getBoundingClientRect() : { width: 0, right: 0 }
    check('星星改成右侧竖条', starRail !== null && Math.round(railBox.width) === 48 && Math.abs(railBox.right - cardBox0.right) <= 2,
      Math.round(railBox.width) + ' 宽 / 右差 ' + Math.round(Math.abs(railBox.right - cardBox0.right)))
    check('竖条和内容之间有分隔线', starRail !== null && parseFloat(getComputedStyle(starRail).borderLeftWidth) === 1,
      starRail === null ? 'no rail' : getComputedStyle(starRail).borderLeftWidth)
    check('星星点击区撑满竖条', Math.abs(bigStarBox.width - railBox.width) <= 1 && bigStarBox.height >= cardBox0.height - 4,
      Math.round(bigStarBox.width) + 'x' + Math.round(bigStarBox.height) + ' / 卡高 ' + Math.round(cardBox0.height))
    check('星星竖向居中', Math.abs((bigStarBox.top + bigStarBox.height / 2) - (cardBox0.top + cardBox0.height / 2)) <= 2,
      Math.round(bigStarBox.top + bigStarBox.height / 2) + ' / ' + Math.round(cardBox0.top + cardBox0.height / 2))
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
    check('收藏区出现该会话', rt.favorites() === 1 && rt.favoriteTitles()[0] === '对话 1', rt.favoriteTitles().join('|'))
    check('收藏区计数为 1', rt.zoneCount('Fav') === '1', rt.counts().join('|'))
    check('原区域不再保留该会话', rt.unreads() === 0 && rt.zoneCount('Unread') === '', '未读 ' + rt.unreads())
    check('同一会话四区只出现一次', rt.titleCount('对话 1') === 1, String(rt.titleCount('对话 1')))
    check('只有收藏里那颗星亮着', rt.container.querySelectorAll('.drt-card .drt-star.is-on').length === 1,
      String(rt.container.querySelectorAll('.drt-card .drt-star.is-on').length))
    check('收藏写入本地存储', (localStorage.getItem('dsh.recent-tasks.favorites.v1') || '').indexOf('s01') >= 0,
      localStorage.getItem('dsh.recent-tasks.favorites.v1'))
    rt.inst = rt.remount()
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
    click(rt.container.querySelector('.drt-card.is-done .drt-star'))
    await tick()
    check('收藏一条后回归四区顺序', rt.zoneLabels().join('|') === '正在运行|收藏|未读|已完成', rt.zoneLabels().join('|'))
    click(rt.container.querySelector('.drt-card.is-fav .drt-star'))
    await tick()
    check('取消最后一条收藏后收藏区消失', !rt.container.querySelector('.drt-sectionFav') && rt.zoneLabels().join('|') === '正在运行|未读|已完成',
      rt.zoneLabels().join('|'))
    rt.unmount()

    // 3b2. a starred running session leaves 正在运行, and the band says where it went
    localStorage.clear()
    rt = makeRuntime()
    check('收藏前运行区 2 个', rt.lives() === 2, String(rt.lives()))
    click(rt.container.querySelector('.drt-card.is-running .drt-star'))
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
    check('已完成区第一行是对话 2', rt.rowTitles()[0] === '对话 2', rt.rowTitles()[0])
    click(rt.container.querySelector('.drt-card.is-done .drt-star'))
    await tick()
    check('收藏已完成的会话：已完成少一条', rt.zoneCount('Done') === '37' && rt.favorites() === 1 && rt.favoriteTitles()[0] === '对话 2',
      rt.counts().join('|') + ' / ' + rt.favoriteTitles().join('|'))
    check('已完成的会话四区只出现一次', rt.titleCount('对话 2') === 1, String(rt.titleCount('对话 2')))
    click(rt.container.querySelector('.drt-card.is-fav .drt-star'))
    await tick()
    check('取消收藏后回到已完成区', rt.zoneCount('Done') === '38' && rt.rowTitles()[0] === '对话 2' && rt.favorites() === 0,
      rt.counts().join('|') + ' / ' + rt.rowTitles().slice(0, 2).join('|'))
    rt.unmount()

    // 3b4. a starred running Session still shows it is running
    localStorage.clear()
    rt = makeRuntime()
    click(rt.container.querySelector('.drt-card.is-running .drt-star'))
    await tick()
    const favDot = rt.container.querySelector('.drt-card.is-fav .drt-cardDot')
    check('收藏里运行中的卡片点仍是蓝的', !!favDot && favDot.className.indexOf('is-running') >= 0, favDot ? favDot.className : 'missing')
    check('收藏里运行中的卡片点不是待确认态', !!favDot && favDot.className.indexOf('is-pending') < 0, favDot ? favDot.className : 'missing')
    rt.unmount()

    // 3b5. a starred Session waiting on the person keeps its amber dot and red pill
    localStorage.clear()
    rt = makeRuntime()
    rt.setPending('s05', 'approval')
    await tick()
    click(rt.container.querySelector('.drt-card.is-running.is-pending .drt-star'))
    await tick()
    const favWaitDot = rt.container.querySelector('.drt-card.is-fav .drt-cardDot')
    const favWaitPill = rt.container.querySelector('.drt-card.is-fav .drt-pill')
    check('收藏里待确认的卡片点保持琥珀', !!favWaitDot && favWaitDot.className.indexOf('is-fav') >= 0 && favWaitDot.className.indexOf('is-running') < 0,
      favWaitDot ? favWaitDot.className : 'missing')
    check('收藏里待确认的卡片仍带红标', !!favWaitPill && favWaitPill.textContent === '等你确认',
      favWaitPill ? favWaitPill.textContent : 'missing')
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
      rt.zoneLabels().join('|') === '正在运行' && rt.lives() > 0, rt.zoneLabels().join('|'))
    check('没有已完成区时底部收起按钮也不占位',
      !rt.container.querySelector('.drt-sectionDone') && rt.container.querySelector('.drt-more') === null,
      rt.footText())
    rt.unmount()

    // 5. expand step by step over the completed list
    localStorage.clear()
    rt = makeRuntime()
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

    // 6. the count belongs to one visit: coming back starts at the arrival count
    rt.inst = rt.remount()
    check('离开再回来回到 15 条', rt.rows() === 15, '实际 ' + rt.rows())

    click(rt.container.querySelector('.drt-more'))
    await tick()
    check('再次展开到 25 条', rt.rows() === 25, '实际 ' + rt.rows())

    const entryChrome = setupChrome({ press: 'refuse' })
    click(entryChrome.row)
    await tick()
    check('点侧栏入口后回到 15 条', rt.rows() === 15, '实际 ' + rt.rows())
    check('入口重置后仍提示剩余 23', rt.footText().indexOf('23') >= 0, rt.footText())
    entryChrome.remove()
    check('展开数不写本地存储', localStorage.getItem('dsh.recent-tasks.shown.v1') === null, String(localStorage.getItem('dsh.recent-tasks.shown.v1')))
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
    check('全在等我时仍然只算一条在运行', rt.zoneCount('') === '1' && rt.lives() === 1, rt.counts().join('|'))
    rt.unmount()

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
<style>${theme}
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
