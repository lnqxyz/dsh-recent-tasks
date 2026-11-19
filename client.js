window.__ModuleLoader__.load({
  id: '@dsh-local/view-8c716ee6-17d5-46ae-b021-c82f36d0f6c1',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Package identity, used for the style tag and data attributes. */
    const PKG = '@dsh-local/view-8c716ee6-17d5-46ae-b021-c82f36d0f6c1'
    /** Locale namespace owned by this plugin. */
    const NS = 'recent-tasks'
    /** Sidebar entry id and, because both seats address each other by it, the main page key. */
    const PANEL_ID = 'recent-tasks'
    /** Browser-local setting: the folder 【+】 reuses. */
    const FOLDER_KEY = 'dsh.recent-tasks.folder.v1'
    /** Window event: the entry was clicked, so a mounted list folds back to its first rows. */
    const ROWS_RESET_EVENT = 'dsh.recent-tasks:entry'
    /** Browser-local setting: finished sessions the user has not looked at yet. */
    const UNREAD_KEY = 'dsh.recent-tasks.unread.v1'
    /** Window event: the remembered unread set changed outside the mounted page. */
    const UNREAD_EVENT = 'dsh.recent-tasks:unread'
    /** Browser-local setting: sessions the person starred, drawn as their own band. */
    const FAV_KEY = 'dsh.recent-tasks.favorites.v1'
    /** Activity window required by the entry: sessions touched within this span. */
    const ACTIVITY_WINDOW_MS = 10 * 24 * 60 * 60 * 1000
    /** The sweep button keeps this much history on screen and archives what is older. */
    const SWEEP_KEEP_DAYS = 7
    /** Rows shown on arrival; a full page leaves room for more than the short sidebar list. */
    const COLLAPSED_ROWS = 15
    /** Extra rows revealed by one 【展开其余】, so a long history stays scannable. */
    const STEP_ROWS = 10
    /** How often the relative timestamps are recomputed. */
    const CLOCK_TICK_MS = 60 * 1000
    const MINUTE_MS = 60 * 1000
    const HOUR_MS = 60 * MINUTE_MS
    const DAY_MS = 24 * HOUR_MS
    /** What the sweep button leaves alone: anything touched inside this span. */
    const SWEEP_KEEP_MS = SWEEP_KEEP_DAYS * DAY_MS
    /** Per-tab intent: after a refresh rebuilds the page, open this panel again. */
    const REOPEN_KEY = 'dsh.recent-tasks.reopen.v1'
    /** A rebuild takes seconds; an older intent describes a click the person has left behind. */
    const REOPEN_TTL_MS = 120 * 1000
    /** How long the entry waits for the borrowed refresh press before showing the page anyway. */
    const PRESS_WAIT_MS = 8000
    /** How often that wait looks at the borrowed button. */
    const PRESS_POLL_MS = 100
    /** The first frames of a press are still spent dimming its button; refusals answer after that. */
    const PRESS_ARM_MS = 180
    /** Where the app answers which plugin code it serves right now. */
    const GRAPH_PATH = '/dsh-unlag/graph'
    /** Asking takes milliseconds even when slow; a wedged answer must not hold the entry. */
    const GRAPH_WAIT_MS = 1500
    /** How long the rebuilt page re-asserts the seat the click asked for. */
    const REOPEN_WATCH_MS = 8000
    /** First look after boot; the seats exist a few frames after apply. */
    const REOPEN_START_MS = 120
    /** Wait while the main seat is not registered yet. */
    const REOPEN_RETRY_MS = 150
    /** How often the watch looks at the main seat. */
    const REOPEN_POLL_MS = 350
    /** The boot restore can run again on later loads; take the seat back this often at most. */
    const REOPEN_MAX_OPENS = 4

    const ZH = {
      'entry.label': '最近任务',
      'page.title': '最近任务',
      'page.back': '返回对话',
      'page.add': '新建会话',
      'page.empty': '最近 10 天没有会话。',
      'page.loading': '正在读取会话…',
      'page.more': '展开其余 {n} 个对话',
      'page.less': '收起',
      'page.sweep': '只留 7 天',
      'page.sweepHint': '把 7 天以前的会话归档，页面上只留下最近 7 天的',
      'page.sweeping': '整理中…',
      'sweep.title': '归档更早的会话',
      'sweep.hint': '这会把 7 天以前的 {n} 个会话移进归档，页面上只留下最近 7 天的。归档可以恢复，不会删除任何内容。',
      'sweep.favNote': '另外 {n} 个更早的收藏会留在收藏区，不会被归档。',
      'sweep.liveNote': '其中 {n} 个还在运行的先不动，等它们跑完下次再清。',
      'sweep.confirm': '归档 {n} 个',
      'sweep.cancel': '取消',
      'sweep.none': '7 天以前的会话已经没有了。',
      'sweep.noneFav': '7 天以前的会话都在收藏里，这里没有可归档的。',
      'sweep.noneLive': '7 天以前的会话都还在运行，等它们跑完再清。',
      'sweep.done': '已归档 {n} 个会话。',
      'sweep.failed': '{n} 个没能归档：{message}',
      'sweep.unavailable': '当前界面不支持归档会话。',
      'section.running': '正在运行',
      'section.fav': '收藏',
      'section.unread': '未读',
      'section.done': '已完成',
      'status.running': '运行中',
      'status.unread': '未读',
      'status.done': '已完成',
      'section.pendingChip': '待你处理 {n}',
      'pending.approval': '等你确认',
      'pending.planReview': '等你定方案',
      'pending.question': '等你回答',
      'pending.other': '等你处理',
      'star.add': '收藏这个对话',
      'star.remove': '取消收藏',
      'row.unknownWorkspace': '未记录工作区',
      'chooser.title': '选择文件夹',
      'chooser.hint': '新建的会话会使用这个文件夹，之后点【+】会直接用它。',
      'chooser.existing': '已有工作区',
      'chooser.noWorkspaces': '还没有工作区，请选择其他文件夹。',
      'chooser.other': '选择其他文件夹…',
      'chooser.picking': '正在等待选择…',
      'chooser.cancel': '取消',
      'chooser.unavailable': '当前界面无法打开文件夹选择器。',
      'chooser.pickFailed': '无法打开文件夹选择器：{message}',
      'error.create': '新建会话失败：{message}',
      'error.open': '打开会话失败：{message}',
      'error.noSessions': '会话服务不可用。',
      'time.now': '刚刚',
      'time.minute': '{n} 分钟前',
      'time.hour': '{n} 小时前',
      'time.yesterday': '昨天',
      'time.day': '{n} 天前',
    }

    const EN = {
      'entry.label': 'Recent tasks',
      'page.title': 'Recent tasks',
      'page.back': 'Back to chat',
      'page.add': 'New session',
      'page.empty': 'No sessions in the last 10 days.',
      'page.loading': 'Loading sessions…',
      'page.more': 'Show the remaining {n}',
      'page.less': 'Show less',
      'page.sweep': 'Keep 7 days',
      'page.sweepHint': 'Archive everything older than 7 days, keeping only the last week on this page',
      'page.sweeping': 'Tidying…',
      'sweep.title': 'Archive older sessions',
      'sweep.hint': 'This moves the {n} sessions older than 7 days into the archive and leaves only the last week here. Archiving is reversible and deletes nothing.',
      'sweep.favNote': '{n} older starred sessions stay in Favorites and are not archived.',
      'sweep.liveNote': '{n} of them are still running and stay put until they finish.',
      'sweep.confirm': 'Archive {n}',
      'sweep.cancel': 'Cancel',
      'sweep.none': 'Nothing older than 7 days is left.',
      'sweep.noneFav': 'Every session older than 7 days is starred, so there is nothing to archive.',
      'sweep.noneLive': 'Every session older than 7 days is still running; clear them once they finish.',
      'sweep.done': 'Archived {n} sessions.',
      'sweep.failed': '{n} could not be archived: {message}',
      'sweep.unavailable': 'This interface cannot archive sessions.',
      'section.running': 'Running now',
      'section.fav': 'Favorites',
      'section.unread': 'Unread',
      'section.done': 'Completed',
      'status.running': 'Running',
      'status.unread': 'Unread',
      'status.done': 'Completed',
      'section.pendingChip': '{n} waiting on you',
      'pending.approval': 'Needs approval',
      'pending.planReview': 'Review the plan',
      'pending.question': 'Answer needed',
      'pending.other': 'Needs you',
      'star.add': 'Star this session',
      'star.remove': 'Remove from favorites',
      'row.unknownWorkspace': 'Workspace not recorded',
      'chooser.title': 'Choose a folder',
      'chooser.hint': 'New sessions start in this folder, and 【+】 reuses it next time.',
      'chooser.existing': 'Existing workspaces',
      'chooser.noWorkspaces': 'No workspaces yet — choose another folder.',
      'chooser.other': 'Choose another folder…',
      'chooser.picking': 'Waiting for the picker…',
      'chooser.cancel': 'Cancel',
      'chooser.unavailable': 'This interface cannot open the folder picker.',
      'chooser.pickFailed': 'Could not open the folder picker: {message}',
      'error.create': 'Could not create the session: {message}',
      'error.open': 'Could not open the session: {message}',
      'error.noSessions': 'The session service is unavailable.',
      'time.now': 'just now',
      'time.minute': '{n} min ago',
      'time.hour': '{n} h ago',
      'time.yesterday': 'yesterday',
      'time.day': '{n} d ago',
    }

    const CSS = [
      // Tone palette: 正在运行 is the light blue that keeps moving, 未读 the green
      // that waits for you. Both are pulled from the static ramp so the plugin
      // never fights the theme's own state colours.
      '.drt-root{height:100%;min-height:0;overflow:hidden;--drt-run:var(--dsw-static-blue-300);--drt-run-dot:var(--dsw-static-blue-400);--drt-run-a:8%;--drt-run-b:16%;--drt-unread:var(--dsw-static-green-500);--drt-unread-dot:var(--dsw-static-green-500);--drt-unread-a:6%;--drt-unread-b:11%;--drt-sheen-lo:30%;--drt-sheen-hi:.30;--drt-sheen-tail:14%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}',
      // A tint that reads on a dark page needs more of the colour, not less.
      'body[data-ds-dark-theme] .drt-root{--drt-run-dot:var(--dsw-static-blue-300);--drt-run-a:13%;--drt-run-b:23%;--drt-unread-dot:var(--dsw-static-green-400);--drt-unread-a:9%;--drt-unread-b:15%;--drt-sheen-lo:26%;--drt-sheen-hi:.10;--drt-sheen-tail:10%}',
      '.drt-page{height:100%;min-height:0;box-sizing:border-box;display:flex;flex-direction:column;gap:14px;padding:20px 22px 16px;container-type:inline-size}',
      '.drt-header{flex:none;display:flex;align-items:center;gap:10px}',
      '.drt-title{margin:0;flex:1;min-width:0;font-size:18px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.drt-actions{flex:none;display:flex;align-items:center;gap:8px}',
      '.drt-ghost{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);padding:6px 13px;font-family:inherit;font-size:13px;line-height:1.4;cursor:pointer}',
      '.drt-ghost:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      // The sweep action is quiet by design: it changes a lot of rows at once, so
      // it must not look like the primary 【+】 next to it.
      '.drt-sweep{flex:none;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);padding:6px 11px;font-family:inherit;font-size:13px;line-height:1.4;cursor:pointer;transition:background .12s ease,color .12s ease,border-color .12s ease}',
      '.drt-sweep:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}',
      '.drt-sweep:disabled{opacity:.55;cursor:default}',
      '.drt-sweep svg{flex:none;display:block}',
      '.drt-add{flex:none;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border:none;border-radius:9px;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-family:inherit;font-size:18px;font-weight:600;line-height:1;cursor:pointer}',
      '.drt-add:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}',
      '.drt-add:disabled{opacity:.55;cursor:default}',
      '.drt-notice{margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-state-error-primary)}',
      '.drt-notice.is-info{color:var(--dsw-alias-label-secondary)}',
      '.drt-notice.is-success{color:var(--dsw-alias-state-success-primary)}',
      '.drt-foot{flex:none;display:flex;justify-content:center}',
      '.drt-more{border:none;border-radius:8px;background:transparent;color:var(--dsw-alias-state-business-primary);padding:7px 14px;font-family:inherit;font-size:13.5px;cursor:pointer}',
      '.drt-more:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.drt-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:18px}',
      '.drt-section{display:flex;flex-direction:column;gap:9px;min-height:0}',
      '.drt-sectionUnread{flex:none;min-height:0;border-top:1px solid var(--dsw-alias-border-l1);padding-top:16px}',
      '.drt-sectionDone{flex:1;min-height:0;border-top:1px solid var(--dsw-alias-border-l1);padding-top:16px}',
      '.drt-sectionFav{flex:none;min-height:0;border-top:1px solid var(--dsw-alias-border-l1);padding-top:16px}',
      // Bands close up when one is missing: whatever ends up on top must not
      // start with a divider drawn for a neighbour that is no longer there.
      '.drt-body > .drt-section:first-child{border-top:0;padding-top:0}',
      '.drt-headDot.is-unread{background:var(--drt-unread-dot);opacity:1;animation:none}',
      '.drt-headDot.is-fav{background:var(--dsw-alias-state-warn-primary);opacity:1;animation:none}',
      '.drt-sectionHead{flex:none;display:flex;align-items:center;gap:7px;min-width:0}',
      '.drt-headDot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--drt-run);animation:drt-breathe 1.8s ease-in-out infinite}',
      '.drt-headDot.is-idle{background:var(--dsw-alias-label-tertiary);opacity:.45;animation:none}',
      '.drt-headDot.is-pending{background:var(--dsw-alias-state-error-primary);opacity:1;animation:drt-pause 2.6s ease-in-out infinite}',
      '.drt-chip{flex:none;display:inline-flex;align-items:center;height:19px;padding:0 8px;border-radius:10px;background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent);color:var(--dsw-alias-state-error-primary);font-size:11.5px;font-weight:600;line-height:1;white-space:nowrap}',
      '.drt-zoneLabel{font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--dsw-alias-label-secondary)}',
      '.drt-count{flex:none;min-width:19px;height:19px;box-sizing:border-box;padding:0 6px;border-radius:10px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-tertiary);font-size:11.5px;line-height:19px;text-align:center;font-variant-numeric:tabular-nums}',
      '.drt-cardGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));align-content:start;gap:12px;min-width:0;padding:4px 3px 6px;scrollbar-gutter:stable}',
      // Three columns is the ceiling: on a wide window the cards should keep
      // their new size instead of multiplying back into thin strips.
      '@container (min-width:1000px){.drt-cardGrid{grid-template-columns:repeat(3,minmax(0,1fr))}}',
      '@container (min-width:660px) and (max-width:999.98px){.drt-cardGrid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@container (max-width:659.98px){.drt-cardGrid{grid-template-columns:minmax(0,1fr)}}',
      '.drt-cardGrid.is-running{max-height:min(40vh,360px);overflow-y:auto;overscroll-behavior:contain}',
      '.drt-cardGrid.is-unread{max-height:min(30vh,260px);overflow-y:auto;overscroll-behavior:contain}',
      '.drt-cardGrid.is-fav{max-height:min(28vh,240px);overflow-y:auto;overscroll-behavior:contain}',
      '.drt-cardGrid.is-done{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain}',
      '.drt-card{position:relative;display:flex;flex-direction:column;gap:6px;height:100%;min-height:100px;box-sizing:border-box;padding:14px 64px 13px 16px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-base);color:inherit;font-family:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease,transform .16s ease}',
      '.drt-card:hover{transform:translateY(-1px)}',
      '.drt-card:active{transform:translateY(0)}',
      '.drt-card:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}',
      '.drt-card.is-running{overflow:hidden;border-color:color-mix(in srgb, var(--drt-run) 36%, var(--dsw-alias-border-l1));background:linear-gradient(112deg,color-mix(in srgb, var(--drt-run) var(--drt-run-a), var(--dsw-alias-bg-base)) 0%,color-mix(in srgb, var(--drt-run) var(--drt-run-b), var(--dsw-alias-bg-base)) 25%,color-mix(in srgb, var(--drt-run) var(--drt-run-a), var(--dsw-alias-bg-base)) 50%,color-mix(in srgb, var(--drt-run) var(--drt-run-b), var(--dsw-alias-bg-base)) 75%,color-mix(in srgb, var(--drt-run) var(--drt-run-a), var(--dsw-alias-bg-base)) 100%);background-size:200% 100%;animation:drt-flow 9s linear infinite;box-shadow:0 12px 26px -14px color-mix(in srgb, var(--drt-run) 72%, transparent),inset 0 1px 0 color-mix(in srgb, var(--drt-run) 18%, transparent)}',
      '.drt-card.is-running:hover{box-shadow:0 16px 32px -14px color-mix(in srgb, var(--drt-run) 88%, transparent),inset 0 1px 0 color-mix(in srgb, var(--drt-run) 26%, transparent)}',
      // Two moving lights on a running card, both below the words: a band
      // crossing the fill, and a spark running along the rim.
      '.drt-card.is-running::before{content:"";position:absolute;top:0;bottom:0;left:0;width:46%;z-index:0;pointer-events:none;background:linear-gradient(100deg,transparent 0%,color-mix(in srgb, var(--drt-run) var(--drt-sheen-lo), transparent) 40%,rgb(255 255 255 / var(--drt-sheen-hi)) 54%,color-mix(in srgb, var(--drt-run) var(--drt-sheen-tail), transparent) 70%,transparent 100%);transform:translateX(-110%);animation:drt-sheen 5.6s cubic-bezier(.4,.05,.5,.95) infinite}',
      '.drt-card.is-running::after{content:"";position:absolute;inset:0;z-index:0;border-radius:11px;padding:1px;pointer-events:none;background:conic-gradient(from var(--drt-angle),transparent 0turn,transparent .64turn,color-mix(in srgb, var(--drt-run) 60%, transparent) .74turn,rgba(255,255,255,.72) .79turn,color-mix(in srgb, var(--drt-run) 45%, transparent) .84turn,transparent .93turn,transparent 1turn);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;animation:drt-spin 5.5s linear infinite}',
      '.drt-card.is-unread{border-color:color-mix(in srgb, var(--drt-unread) 30%, var(--dsw-alias-border-l1));background:color-mix(in srgb, var(--drt-unread) var(--drt-unread-a), var(--dsw-alias-bg-base))}',
      '.drt-card.is-unread:hover{background:color-mix(in srgb, var(--drt-unread) var(--drt-unread-b), var(--dsw-alias-bg-base))}',
      '.drt-card.is-done:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}',
      '.drt-card.is-fav{border-color:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 30%, var(--dsw-alias-border-l1));background:linear-gradient(180deg,color-mix(in srgb, var(--dsw-alias-state-warn-primary) 9%, var(--dsw-alias-bg-base)),color-mix(in srgb, var(--dsw-alias-state-warn-primary) 4%, var(--dsw-alias-bg-base)))}',
      '.drt-card.is-fav:hover{background:color-mix(in srgb, var(--dsw-alias-state-warn-primary) 13%, var(--dsw-alias-bg-base))}',
      '.drt-card.is-pending{border-color:color-mix(in srgb, var(--dsw-alias-state-error-primary) 32%, var(--dsw-alias-border-l1));background:linear-gradient(180deg,color-mix(in srgb, var(--dsw-alias-state-error-primary) 11%, var(--dsw-alias-bg-base)),color-mix(in srgb, var(--dsw-alias-state-error-primary) 5%, var(--dsw-alias-bg-base)));box-shadow:inset 3px 0 0 color-mix(in srgb, var(--dsw-alias-state-error-primary) 70%, transparent),0 10px 22px -14px color-mix(in srgb, var(--dsw-alias-state-error-primary) 65%, transparent);animation:none}',
      '.drt-card.is-pending::after{content:none}',
      '.drt-card.is-pending::before{content:none}',
      '.drt-card.is-pending:hover{background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, var(--dsw-alias-bg-base));box-shadow:inset 3px 0 0 color-mix(in srgb, var(--dsw-alias-state-error-primary) 88%, transparent),0 14px 26px -14px color-mix(in srgb, var(--dsw-alias-state-error-primary) 80%, transparent)}',
      // 收藏's dot now follows the session's state (blue/green/red/grey) instead
      // of staying amber: the amber card and the lit star already say "starred".
      // The star is a bare 30px mark on the right edge, vertically centred, with
      // a 56px invisible hit area around it. No plate while it rests: a plate on
      // every row turned the list into a column of buttons. The mark itself
      // carries the state — faint outline when not starred, solid amber with a
      // soft bloom when it is.
      '.drt-star{position:absolute;top:50%;right:4px;transform:translateY(-50%);z-index:2;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;padding:0;border:none;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:.34;transition:opacity .16s ease,color .16s ease,background-color .16s ease}',
      // A soft amber bloom behind a starred mark, so it reads solid, not stuck on.
      '.drt-star::before{content:"";position:absolute;width:56px;height:56px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent) 0%,color-mix(in srgb,var(--dsw-alias-state-warn-primary) 6%,transparent) 52%,transparent 74%);opacity:0;transform:scale(.8);transition:opacity .2s ease,transform .2s ease}',
      '.drt-star svg{position:relative;z-index:1;width:30px;height:30px;transition:transform .18s cubic-bezier(.34,1.56,.64,1),filter .18s ease}',
      '.drt-star:hover{opacity:1;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}',
      '.drt-star:hover svg{transform:scale(1.06)}',
      '.drt-star:focus-visible{opacity:1;outline:2px solid var(--dsw-alias-state-warn-primary);outline-offset:-4px}',
      '.drt-star.is-on,.drt-star.is-on:hover{color:var(--dsw-alias-state-warn-primary);opacity:1;background:transparent}',
      '.drt-star.is-on::before{opacity:1;transform:scale(1)}',
      '.drt-star.is-on svg{filter:drop-shadow(0 2px 5px color-mix(in srgb, var(--dsw-alias-state-warn-primary) 46%, transparent))}',
      '.drt-card:hover .drt-star{opacity:.6}',
      '.drt-card:hover .drt-star.is-on{opacity:1}',
      '.drt-star.is-on svg{animation:drt-star-pop .3s cubic-bezier(.34,1.56,.64,1)}',
      '.drt-card.is-fav{animation:drt-fav-in .22s cubic-bezier(.22,1,.36,1)}',
      '@keyframes drt-star-pop{0%{transform:scale(.7)}60%{transform:scale(1.16)}100%{transform:scale(1)}}',
      '@keyframes drt-fav-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}',
      '.drt-cardHead{position:relative;z-index:1;display:flex;align-items:flex-start;gap:8px;min-width:0}',
      '.drt-cardDot{flex:none;width:8px;height:8px;margin-top:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary);opacity:.45}',
      '.drt-cardDot.is-running{background:var(--drt-run-dot);opacity:1;box-shadow:0 0 0 3px color-mix(in srgb, var(--drt-run-dot) 16%, transparent);animation:drt-breathe 1.8s ease-in-out infinite}',
      '.drt-cardDot.is-unread{background:var(--drt-unread-dot);opacity:1;animation:none}',
      '.drt-cardDot.is-pending{background:var(--dsw-alias-state-error-primary);opacity:1;animation:drt-pause 2.6s ease-in-out infinite}',
      '.drt-pill{flex:none;display:inline-flex;align-items:center;padding:2px 7px;border-radius:6px;background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 15%, transparent);color:var(--dsw-alias-state-error-primary);font-size:11px;font-weight:600;line-height:1.5;white-space:nowrap}',
      // 收藏 mixes four states in one band, so each card spells its state out.
      // The text colour is mixed toward label-primary, which is light on the
      // dark theme and dark on the light one, so a single rule serves both.
      '.drt-status{flex:none;display:inline-flex;align-items:center;height:19px;padding:0 8px;border-radius:999px;font-size:11px;font-weight:600;line-height:1;letter-spacing:.01em;white-space:nowrap;background:color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);color:var(--dsw-alias-label-secondary)}',
      '.drt-status.is-running{background:color-mix(in srgb, var(--drt-run) 14%, transparent);color:color-mix(in srgb, var(--drt-run) 68%, var(--dsw-alias-label-primary))}',
      '.drt-status.is-unread{background:color-mix(in srgb, var(--drt-unread) 14%, transparent);color:color-mix(in srgb, var(--drt-unread) 68%, var(--dsw-alias-label-primary))}',
      '.drt-cardTitle{flex:1;min-width:0;font-size:16px;font-weight:600;line-height:1.35;color:var(--dsw-alias-label-primary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}',
      '.drt-cardMeta{position:relative;z-index:1;display:flex;align-items:center;gap:7px;min-width:0;margin-top:auto;font-size:12.5px;line-height:1.4;color:var(--dsw-alias-label-tertiary)}',
      '.drt-cardWorkspace{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.drt-cardSep{flex:none;opacity:.6}',
      '.drt-cardTime{flex:none;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '@keyframes drt-breathe{0%,100%{opacity:1}50%{opacity:.45}}',
      '@keyframes drt-pause{0%,100%{opacity:1}50%{opacity:.32}}',
      // 200% wide, two identical periods: running 0→100% loops without a seam.
      '@keyframes drt-flow{from{background-position:0% 50%}to{background-position:100% 50%}}',
      '@property --drt-angle{syntax:"<angle>";inherits:false;initial-value:0deg}',
      '@keyframes drt-spin{to{--drt-angle:1turn}}',
      '@keyframes drt-sheen{0%{transform:translateX(-110%)}55%,100%{transform:translateX(230%)}}',
      '@media (prefers-reduced-motion:reduce){.drt-card.is-running,.drt-card.is-running::before,.drt-card.is-running::after{animation:none}.drt-headDot,.drt-cardDot,.drt-star.is-on svg,.drt-card.is-fav{animation:none}.drt-card,.drt-star,.drt-star svg{transition:none}.drt-card:hover,.drt-card:active,.drt-star:hover,.drt-star:hover svg{transform:none}}',
      '.drt-empty{margin:0;padding:8px 2px;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-tertiary)}',
      '.drt-overlay{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.36)}',
      '.drt-dialog{display:flex;flex-direction:column;width:min(460px,100%);max-height:min(560px,78vh);overflow:hidden;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 18px 48px rgba(0,0,0,.3)}',
      '.drt-dialogHead{flex:none;padding:16px 18px 0}',
      '.drt-dialogTitle{margin:0;font-size:15.5px;font-weight:700}',
      '.drt-dialogHint{margin:7px 18px 0;font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-secondary)}',
      '.drt-dialogSection{flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:4px;padding:14px 18px 4px}',
      '.drt-sectionLabel{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-tertiary)}',
      '.drt-choiceList{display:flex;flex-direction:column;gap:2px;margin:2px 0 0;padding:0;list-style:none}',
      '.drt-choice{width:100%;min-width:0;display:flex;flex-direction:column;gap:2px;padding:8px 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:inherit;font-family:inherit;text-align:left;cursor:pointer}',
      '.drt-choice:hover{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l1)}',
      '.drt-choiceTitle{font-size:13.5px;color:var(--dsw-alias-label-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.drt-choicePath{font-size:12px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.drt-error{margin:0 18px;font-size:12px;line-height:1.6;color:var(--dsw-alias-state-error-primary)}',
      '.drt-dialogFoot{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:14px 18px 16px}',
      '.drt-primary{border:none;border-radius:8px;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);padding:7px 14px;font-family:inherit;font-size:13px;line-height:1.4;cursor:pointer}',
      '.drt-primary:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}',
      '.drt-primary:disabled{opacity:.55;cursor:default}',
    ].join('\n')

    /** @returns {string} the message of an unknown thrown value. */
    function messageOf(error) {
      if (error instanceof Error && error.message) return error.message
      return String(error)
    }

    /** @returns {string} the last path segment, accepting both separators. */
    function basename(path) {
      if (typeof path !== 'string' || path.length === 0) return ''
      const trimmed = path.replace(/[\\/]+$/, '')
      const at = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
      return at === -1 ? trimmed : trimmed.slice(at + 1)
    }

    /** @returns {Set<string>} the archive set in whichever shape the snapshot carries. */
    function toIdSet(value) {
      if (!value) return new Set()
      if (Array.isArray(value)) return new Set(value)
      if (typeof value.forEach === 'function' && typeof value.has === 'function') return value
      if (typeof value[Symbol.iterator] === 'function') return new Set(value)
      return new Set()
    }

    /**
     * Render one epoch-ms instant as a coarse relative age.
     * @param at - instant in epoch ms.
     * @param now - current instant in epoch ms.
     * @param t - bound translate function.
     * @returns the relative label.
     */
    function formatRelative(at, now, t) {
      const elapsed = Math.max(0, now - at)
      if (elapsed < MINUTE_MS) return t('time.now')
      const minutes = Math.floor(elapsed / MINUTE_MS)
      if (minutes < 60) return t('time.minute', { n: minutes })
      const hours = Math.floor(elapsed / HOUR_MS)
      if (hours < 24) return t('time.hour', { n: hours })
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      const dayStart = new Date(at)
      dayStart.setHours(0, 0, 0, 0)
      const days = Math.max(1, Math.round((todayStart.getTime() - dayStart.getTime()) / DAY_MS))
      if (days <= 1) return t('time.yesterday')
      return t('time.day', { n: days })
    }

    /** @returns {string} the remembered folder, or '' when none is stored. */
    function readFolder() {
      try {
        const stored = window.localStorage.getItem(FOLDER_KEY)
        return typeof stored === 'string' ? stored : ''
      } catch {
        return ''
      }
    }

    /** Remember the folder 【+】 should reuse; storage failures are not fatal. */
    function writeFolder(path) {
      try {
        window.localStorage.setItem(FOLDER_KEY, path)
      } catch {
        /* private mode or a disabled store — the chooser simply reappears next time */
      }
    }

    /** Forget the remembered folder. */
    function clearFolder() {
      try {
        window.localStorage.removeItem(FOLDER_KEY)
      } catch {
        /* nothing to clear */
      }
    }

    /**
     * Ask a mounted page to fold its list back to the first rows. The count is
     * not remembered: the list belongs to one visit, and a page that is mounted
     * while hidden (another panel on screen) hears this as the entry is clicked.
     */
    function requestRowReset() {
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new Event(ROWS_RESET_EVENT))
        }
      } catch {
        /* an environment without events simply keeps the list as it was */
      }
    }

    /** @returns {string[]} the sessions remembered as finished but not yet opened. */
    function readUnread() {
      try {
        const raw = window.localStorage.getItem(UNREAD_KEY)
        if (typeof raw !== 'string' || raw === '') return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        return parsed.filter(id => typeof id === 'string' && id !== '')
      } catch {
        return []
      }
    }

    /** Remember which finished sessions still wait to be opened. */
    function writeUnread(ids) {
      try {
        window.localStorage.setItem(UNREAD_KEY, JSON.stringify(ids))
      } catch {
        /* nothing to persist */
      }
    }

    /** Session id -> the instant the person last opened it, for this page load. */
    const readAt = new Map()

    /** Tell a mounted page that the remembered unread set changed. */
    function notifyUnread() {
      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new Event(UNREAD_EVENT))
        }
      } catch {
        /* an environment without events keeps the last render */
      }
    }

    /**
     * Opening a Session settles its finished run: the row leaves 未读 and stays
     * out until a newer run finishes.
     * @param id - session the person just opened.
     */
    function markUnreadRead(id) {
      if (typeof id !== 'string' || id === '') return
      readAt.set(id, Date.now())
      const remembered = readUnread()
      const kept = remembered.filter(value => value !== id)
      if (kept.length !== remembered.length) writeUnread(kept)
      notifyUnread()
    }

    /** @returns {string[]} the sessions the person starred, newest first. */
    function readFavorites() {
      try {
        const raw = window.localStorage.getItem(FAV_KEY)
        if (typeof raw !== 'string' || raw === '') return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        const seen = new Set()
        const ids = []
        for (const id of parsed) {
          if (typeof id !== 'string' || id === '' || seen.has(id)) continue
          seen.add(id)
          ids.push(id)
        }
        return ids
      } catch {
        return []
      }
    }

    /** Remember the starred sessions; storage failures are not fatal. */
    function writeFavorites(ids) {
      try {
        window.localStorage.setItem(FAV_KEY, JSON.stringify(ids))
      } catch {
        /* nothing to persist */
      }
    }


    /**
     * Keep the remembered "finished but not yet opened" set from activation on.
     *
     * Being retained is not being looked at: the shell keeps the last opened
     * Conversation retained even while another panel covers it, and counts that
     * session as read when its run stops. Here a run that stops while its
     * Conversation is not on screen is unread — including the case that started
     * this: open a running Session once, leave it, and let it finish while the
     * list is on screen.
     *
     * @param ctx - client root context.
     * @returns disposer that stops the watch.
     */
    function watchUnread(ctx) {
      let disposed = false
      let timer = null
      const stops = []
      /** session id -> was the run on its way at the previous look. */
      const active = new Map()

      /** @returns {boolean} whether a panel covers the Conversation right now. */
      const panelCovered = () => {
        try {
          const layout = ctx.get('layout')
          const info = layout && layout.panelInfo && typeof layout.panelInfo.getSnapshot === 'function'
            ? layout.panelInfo.getSnapshot()
            : undefined
          const activeId = info ? info.activePanelId : null
          return typeof activeId === 'string' && activeId !== ''
        } catch {
          return false
        }
      }

      const reconcile = () => {
        if (disposed) return
        const sessions = ctx.get('sessions')
        const snapshot = sessions && sessions.list && typeof sessions.list.getSnapshot === 'function'
          ? sessions.list.getSnapshot()
          : undefined
        if (!snapshot || !snapshot.byId) return
        let statuses
        try {
          const uiSession = ctx.get('uiSession')
          statuses = uiSession && uiSession.sessionStatus && typeof uiSession.sessionStatus.getSnapshot === 'function'
            ? uiSession.sessionStatus.getSnapshot()
            : undefined
        } catch {
          statuses = undefined
        }
        const covered = panelCovered()
        const isVisible = id => {
          if (covered) return false
          const session = snapshot.byId[id]
          const retained = session && session.retainedBy ? session.retainedBy.mainView : 0
          return typeof retained === 'number' && retained > 0
        }
        const next = new Set(readUnread())
        let changed = false
        if (statuses && typeof statuses.forEach === 'function') {
          statuses.forEach((status, id) => {
            if (!status) return
            const busy = status.running === true || status.pendingInteraction !== undefined
            const wasBusy = active.get(id) === true
            active.set(id, busy)
            if (busy) {
              // A new run starts the question over.
              if (next.delete(id)) changed = true
              return
            }
            if (isVisible(id)) {
              if (next.delete(id)) changed = true
              return
            }
            if (wasBusy) {
              if (!next.has(id)) {
                next.add(id)
                changed = true
              }
              return
            }
            // A flag the shell set while this watch was not looking.
            if (status.completionUnread === true) {
              const session = snapshot.byId[id]
              const at = session && typeof session.updatedAt === 'number' ? session.updatedAt : 0
              const opened = readAt.has(id) ? readAt.get(id) : 0
              if (at > opened && !next.has(id)) {
                next.add(id)
                changed = true
              }
            }
          })
        }
        // Drop rows that no longer exist, and rows the person has opened from
        // another route while no panel covered the Conversation.
        for (const id of Array.from(next)) {
          if (!snapshot.byId[id]) {
            next.delete(id)
            changed = true
            continue
          }
          if (isVisible(id)) {
            next.delete(id)
            changed = true
          }
        }
        for (const id of Array.from(active.keys())) {
          if (!snapshot.byId[id]) active.delete(id)
        }
        if (!changed) return
        writeUnread(Array.from(next))
        notifyUnread()
      }

      const bind = source => {
        if (!source || typeof source.subscribe !== 'function') return
        const stop = source.subscribe(reconcile)
        if (typeof stop === 'function') stops.push(stop)
      }

      const attach = () => {
        if (disposed) return
        const sessions = ctx.get('sessions')
        const layout = ctx.get('layout')
        bind(sessions ? sessions.list : undefined)
        bind(layout ? layout.panelInfo : undefined)
        reconcile()
      }

      // The status service can arrive after activation; bind it when it does
      // and keep the list and panel watches running meanwhile.
      let tries = 0
      const attachStatus = () => {
        if (disposed) return
        let status
        try {
          const uiSession = ctx.get('uiSession')
          status = uiSession ? uiSession.sessionStatus : undefined
        } catch {
          status = undefined
        }
        if (status && typeof status.subscribe === 'function') {
          bind(status)
          reconcile()
          return
        }
        tries += 1
        if (tries < 240) timer = setTimeout(attachStatus, 500)
      }

      attach()
      attachStatus()
      return () => {
        disposed = true
        if (timer !== null) clearTimeout(timer)
        for (const stop of stops) {
          try {
            stop()
          } catch {
            /* the watch is going away anyway */
          }
        }
      }
    }

    /** Inject this plugin's stylesheet once, returning a disposer that removes it. */
    function injectStyle() {
      if (typeof document === 'undefined' || !document.head) return () => {}
      const selector = 'style[data-plugin-css="' + PKG + '"]'
      if (document.querySelector(selector) !== null) return () => {}
      const tag = document.createElement('style')
      tag.dataset.plugin = PKG
      tag.dataset.pluginCss = PKG
      tag.textContent = CSS
      document.head.appendChild(tag)
      return () => {
        if (tag.parentNode) tag.parentNode.removeChild(tag)
      }
    }

    /**
     * Subscribe to a Host/Catalog observable snapshot.
     * @param source - `{ getSnapshot, subscribe }`, or undefined when the service is absent.
     * @returns the current snapshot, re-rendering on change.
     */
    function useObservable(source) {
      const [value, setValue] = React.useState(() => {
        try {
          return source && typeof source.getSnapshot === 'function' ? source.getSnapshot() : undefined
        } catch {
          return undefined
        }
      })
      React.useEffect(() => {
        if (!source || typeof source.getSnapshot !== 'function' || typeof source.subscribe !== 'function') {
          return undefined
        }
        let live = true
        const read = () => {
          if (!live) return
          try {
            setValue(source.getSnapshot())
          } catch {
            /* a disposed source simply stops publishing */
          }
        }
        read()
        const dispose = source.subscribe(read)
        return () => {
          live = false
          if (typeof dispose === 'function') dispose()
        }
      }, [source])
      return value
    }

    /** @returns {number} the current wall clock, refreshed on a coarse interval. */
    function useNow(intervalMs) {
      const [now, setNow] = React.useState(() => Date.now())
      React.useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs)
        return () => clearInterval(timer)
      }, [intervalMs])
      return now
    }

    /** @returns {Array} the Host-authoritative Workspace rows, or [] while unknown. */
    function workspaceRows(host) {
      try {
        const snapshot = host.workspaces && host.workspaces.list && host.workspaces.list.getSnapshot
          ? host.workspaces.list.getSnapshot()
          : undefined
        return snapshot && Array.isArray(snapshot.items) ? snapshot.items : []
      } catch {
        return []
      }
    }

    /** @returns {string} the Workspace name a Session belongs to, falling back to its folder. */
    function workspaceLabelOf(rows, session, t) {
      const owner = rows.find(row => Array.isArray(row.sessionIds) && row.sessionIds.includes(session.id))
      if (owner) return owner.title || basename(owner.path) || t('row.unknownWorkspace')
      const byPath = session.cwd ? rows.find(row => row.path === session.cwd) : undefined
      if (byPath) return byPath.title || basename(byPath.path) || t('row.unknownWorkspace')
      return basename(session.cwd) || t('row.unknownWorkspace')
    }

    /** The three pending kinds DSH draws in its own sidebar, and their labels. */
    const PENDING_LABELS = {
      approval: 'pending.approval',
      'plan-review': 'pending.planReview',
      question: 'pending.question',
    }

    /**
     * The interaction a Session is blocked on, reduced to its kind.
     * The union is open, so an unknown kind still counts as pending: a new
     * domain must not silently drop the row's badge and its place up top.
     * @param status - one SessionStatus snapshot entry, or undefined.
     * @returns the kind string, or undefined when nothing waits on the user.
     */
    function pendingKindOf(status) {
      if (status === undefined || status === null) return undefined
      const pending = status.pendingInteraction
      if (pending === undefined || pending === null || typeof pending !== 'object') return undefined
      return typeof pending.kind === 'string' && pending.kind !== '' ? pending.kind : 'other'
    }

    /** @returns {string} the short action label for a pending kind. */
    function pendingLabel(kind, t) {
      const key = PENDING_LABELS[kind]
      return t(key === undefined ? 'pending.other' : key)
    }

    /**
     * Project the live Session list into the rows this page shows: sessions with
     * activity inside the 10-day window, newest first, subagent and archived
     * sessions left out because they are not user-facing rows elsewhere either.
     * @param listState - sessions service list snapshot.
     * @param workspaceState - workspaces service list snapshot.
     * @param statusState - uiSession status snapshot, or undefined while absent.
     * @param unreadIds - sessions remembered as finished but not yet opened.
     * @param favoriteIds - sessions the person starred; a star keeps its row
     *   listed after the activity window, because 收藏 outlives the window.
     * @param now - current instant in epoch ms.
     * @param t - bound translate function.
     * @returns the ordered rows, each tagged running, pending, unread, recent or starred.
     */
    function projectRows(listState, workspaceState, statusState, unreadIds, favoriteIds, now, t) {
      if (!listState || !listState.byId || !Array.isArray(listState.ids)) return []
      const rows = workspaceState && Array.isArray(workspaceState.items) ? workspaceState.items : []
      const archived = toIdSet(workspaceState ? workspaceState.archivedSessionIds : undefined)
      const statuses = statusState && typeof statusState.get === 'function' ? statusState : null
      const remembered = unreadIds instanceof Set ? unreadIds : new Set(unreadIds || [])
      const starred = favoriteIds instanceof Set ? favoriteIds : new Set(favoriteIds || [])
      const result = []
      for (const id of listState.ids) {
        const session = listState.byId[id]
        if (!session || session.origin === 'subagent') continue
        if (archived.has(id)) continue
        const at = typeof session.updatedAt === 'number' ? session.updatedAt : 0
        if (at <= 0) continue
        const favorite = starred.has(id)
        // The ten-day window defines 已完成 and 未读; a starred session stays in
        // 收藏 after it, so the bands never disagree about a star.
        const recent = now - at <= ACTIVITY_WINDOW_MS
        if (!recent && !favorite) continue
        const status = statuses === null ? undefined : statuses.get(id)
        const pending = pendingKindOf(status)
        // A Session blocked on the user is still on its way: it belongs to the
        // running band and must never read as 未读, even when the Host has
        // already cleared running while it waits.
        const running = pending !== undefined || session.running === true || (status !== undefined && status.running === true)
        const unread = !running && (remembered.has(id) || (status !== undefined && status.completionUnread === true))
        result.push({
          id,
          title: (session.displayTitle || session.title || id),
          workspace: workspaceLabelOf(rows, session, t),
          at,
          running,
          pending,
          unread,
          recent,
          favorite,
        })
      }
      result.sort((left, right) => right.at - left.at)
      return result
    }

    /** Sidebar glyph; the shell owns the button, so this only paints the icon. */
    function PanelGlyph(props) {
      const size = typeof props.size === 'number' ? props.size : 16
      return h('svg', {
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        'data-dsh-panel-entry': PANEL_ID,
      },
        h('circle', { cx: 8, cy: 8, r: 5.4 }),
        h('path', { d: 'M8 5.1v3.2l2.2 1.35' }),
      )
    }

    /**
     * The page mounted in the `main` seat under this plugin's key.
     * @param props - the injected face: `{ host }` plus the framework's share.
     * @returns the recent-tasks page.
     */
    function RecentTasksPage(props) {
      const host = props.host
      const t = host.t
      const sessions = host.sessions
      const listState = useObservable(sessions ? sessions.list : undefined)
      const workspaceState = useObservable(host.workspaces ? host.workspaces.list : undefined)
      const uiSession = host.uiSession
      const statusState = useObservable(uiSession ? uiSession.sessionStatus : undefined)
      const now = useNow(CLOCK_TICK_MS)
      const [shown, setShown] = React.useState(COLLAPSED_ROWS)
      const [unreadIds, setUnreadIds] = React.useState(readUnread)
      const [favoriteIds, setFavoriteIds] = React.useState(readFavorites)
      const [busy, setBusy] = React.useState(false)
      const [chooser, setChooser] = React.useState(null)
      const [notice, setNotice] = React.useState(null)
      const [sweeper, setSweeper] = React.useState(null)
      const [sweeping, setSweeping] = React.useState(false)

      const favoriteSet = React.useMemo(() => new Set(favoriteIds), [favoriteIds])
      const rows = React.useMemo(
        () => projectRows(listState, workspaceState, statusState, unreadIds, favoriteSet, now, t),
        [listState, workspaceState, statusState, unreadIds, favoriteSet, now],
      )
      // 收藏 is a view over the same rows, not a second list: the star and the
      // band both read one set, so they can never drift apart. A starred row
      // belongs to 收藏 alone — the other three bands read only the unstarred
      // rest, so one session can never be listed twice. Unstar it and it drops
      // back into whichever band its state names.
      const favoriteRows = rows.filter(row => row.favorite === true)
      const restRows = rows.filter(row => row.favorite !== true)
      const runningRows = restRows.filter(row => row.running)
      // A blocked Session keeps its place in this band but leads it and is
      // painted differently: among these rows it is the only one that needs
      // the person to do something before it can go on.
      const pendingRows = runningRows.filter(row => row.pending !== undefined)
      const liveRows = runningRows.filter(row => row.pending === undefined)
      // A finished run the user has not opened waits in 未读; every other
      // finished session is 已完成. Who started the conversation no longer
      // matters, and no journal is read to find out.
      const unreadRows = restRows.filter(row => !row.running && row.unread === true && row.recent !== false)
      const doneRows = restRows.filter(row => !row.running && row.unread !== true && row.recent !== false)
      const visible = doneRows.slice(0, shown)
      const remaining = doneRows.length - shown

      // The remembered unread set is owned by the activation-level watch, which
      // also sees runs finishing while this page is closed. The page renders it
      // and re-reads it whenever that watch changes it.
      React.useEffect(() => {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined
        const refresh = () => setUnreadIds(readUnread())
        window.addEventListener(UNREAD_EVENT, refresh)
        refresh()
        return () => window.removeEventListener(UNREAD_EVENT, refresh)
      }, [])

      /** Reading a row here counts as opening it, wherever the click landed. */
      const clearUnread = id => markUnreadRead(id)

      /** Star or unstar one session; every band reads the same set, so all stay in step. */
      const toggleFavorite = id => {
        setFavoriteIds(previous => {
          const next = previous.indexOf(id) === -1
            ? [id].concat(previous)
            : previous.filter(value => value !== id)
          writeFavorites(next)
          return next
        })
      }

      // The list belongs to one visit: every arrival starts from the first rows.
      // A page still mounted while another panel is on screen hears the entry's
      // click, so leaving by another row and coming back also starts over.
      React.useEffect(() => {
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
          return undefined
        }
        const reset = () => setShown(COLLAPSED_ROWS)
        window.addEventListener(ROWS_RESET_EVENT, reset)
        return () => window.removeEventListener(ROWS_RESET_EVENT, reset)
      }, [])

      const leave = () => {
        try {
          const layout = host.layout
          if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(null)
        } catch (error) {
          console.warn('[recent-tasks] returning to the conversation failed:', error)
        }
      }

      const openRow = row => {
        if (row && row.unread === true) clearUnread(row.id)
        const uiWorkspace = host.uiWorkspace
        if (!uiWorkspace || typeof uiWorkspace.openSession !== 'function') {
          setNotice({ tone: 'error', text: t('error.open', { message: t('error.noSessions') }) })
          return
        }
        try {
          // `openSession` shows the Conversation and returns this page to it in
          // the same framework step, so it must be the last navigation here.
          uiWorkspace.openSession(row.id)
        } catch (error) {
          setNotice({ tone: 'error', text: t('error.open', { message: messageOf(error) }) })
        }
      }

      const folderUsable = async path => {
        if (workspaceRows(host).some(row => row.path === path)) return true
        const uiWorkspace = host.uiWorkspace
        if (!uiWorkspace || typeof uiWorkspace.listDirectory !== 'function') return false
        try {
          await uiWorkspace.listDirectory(path)
          return true
        } catch {
          return false
        }
      }

      /**
       * Resolve the Workspace that owns `path`, registering the folder as a
       * Workspace when it is not one yet. New Sessions are then created inside
       * that group instead of falling into Ungrouped.
       * @param path - absolute folder the user chose or that was remembered.
       * @returns the Workspace id, or undefined when the client cannot register one.
       */
      const ensureWorkspace = async path => {
        const known = workspaceRows(host).find(row => row.path === path)
        if (known && typeof known.workspaceId === 'string' && known.workspaceId !== '') return known.workspaceId
        const workspaces = host.workspaces
        if (!workspaces || typeof workspaces.create !== 'function') return undefined
        const result = await workspaces.create({ path })
        const workspace = result && result.workspace ? result.workspace : result
        const workspaceId = workspace && workspace.workspaceId
        return typeof workspaceId === 'string' && workspaceId !== '' ? workspaceId : undefined
      }

      const createIn = async path => {
        setBusy(true)
        setNotice(null)
        try {
          const workspaceId = await ensureWorkspace(path)
          const uiWorkspace = host.uiWorkspace
          if (workspaceId !== undefined && uiWorkspace && typeof uiWorkspace.connectWorkspace === 'function') {
            // `startSession` is fire-and-forget and any later panel or layout
            // navigation cancels the open it had pending, which left the old
            // Conversation on screen. Connect first, then reveal in one
            // synchronous step; `openSession` closes this page by itself.
            const sessionId = await uiWorkspace.connectWorkspace(workspaceId)
            if (typeof uiWorkspace.openSession === 'function') {
              uiWorkspace.openSession(sessionId)
              return
            }
          }
          if (!sessions || typeof sessions.create !== 'function') throw new Error(t('error.noSessions'))
          const sessionId = await sessions.create({ cwd: path })
          if (uiWorkspace && typeof uiWorkspace.openSession === 'function') {
            uiWorkspace.openSession(sessionId)
            return
          }
          leave()
        } catch (error) {
          setNotice({ tone: 'error', text: t('error.create', { message: messageOf(error) }) })
        } finally {
          setBusy(false)
        }
      }

      const choosePath = path => {
        writeFolder(path)
        setChooser(null)
        void createIn(path)
      }

      const pickOther = async () => {
        const uiWorkspace = host.uiWorkspace
        if (!uiWorkspace || typeof uiWorkspace.pickDirectory !== 'function') {
          setChooser(current => (current === null ? current : { ...current, error: t('chooser.unavailable') }))
          return
        }
        setChooser(current => (current === null ? current : { ...current, picking: true, error: null }))
        let picked = ''
        try {
          picked = (await uiWorkspace.pickDirectory()) || ''
        } catch (error) {
          setChooser(current => (current === null
            ? current
            : { ...current, picking: false, error: t('chooser.pickFailed', { message: messageOf(error) }) }))
          return
        }
        if (!picked) {
          setChooser(current => (current === null ? current : { ...current, picking: false }))
          return
        }
        choosePath(picked)
      }

      const onAdd = async () => {
        if (busy) return
        const remembered = readFolder()
        if (remembered !== '') {
          if (await folderUsable(remembered)) {
            void createIn(remembered)
            return
          }
          clearFolder()
        }
        setNotice(null)
        setChooser({ workspaces: workspaceRows(host), picking: false, error: null })
      }

      /**
       * Archives one Session through whichever service the build exposes. The
       * page never stops a run to force this through: a Session still working is
       * left for a later sweep instead.
       * @param id - the Session to archive.
       */
      const archiveOne = async id => {
        const uiWorkspace = host.uiWorkspace
        if (uiWorkspace && typeof uiWorkspace.archiveSession === 'function') {
          await uiWorkspace.archiveSession(id)
          return
        }
        const workspaces = host.workspaces
        if (workspaces && typeof workspaces.archiveSession === 'function') {
          await workspaces.archiveSession(id)
          return
        }
        throw new Error(t('sweep.unavailable'))
      }

      const canArchive = () => {
        const uiWorkspace = host.uiWorkspace
        if (uiWorkspace && typeof uiWorkspace.archiveSession === 'function') return true
        const workspaces = host.workspaces
        return Boolean(workspaces && typeof workspaces.archiveSession === 'function')
      }

      /**
       * What the sweep would archive, read straight from the Session list rather
       * than from `rows`: rows stop at the ten-day window, and an old session
       * must still be swept even though this page never lists it.
       * Starred and running sessions are counted aside and left in place.
       */
      const sweepPlan = React.useMemo(() => {
        const plan = { targets: [], kept: 0, live: 0 }
        if (!listState || !listState.byId || !Array.isArray(listState.ids)) return plan
        const archived = toIdSet(workspaceState ? workspaceState.archivedSessionIds : undefined)
        const statuses = statusState && typeof statusState.get === 'function' ? statusState : null
        for (const id of listState.ids) {
          const session = listState.byId[id]
          if (!session || session.origin === 'subagent') continue
          if (archived.has(id)) continue
          const at = typeof session.updatedAt === 'number' ? session.updatedAt : 0
          if (at <= 0 || now - at <= SWEEP_KEEP_MS) continue
          if (favoriteSet.has(id)) {
            plan.kept += 1
            continue
          }
          const status = statuses === null ? undefined : statuses.get(id)
          const pending = pendingKindOf(status)
          const running = pending !== undefined || session.running === true || (status !== undefined && status.running === true)
          if (running) {
            plan.live += 1
            continue
          }
          plan.targets.push(id)
        }
        return plan
      }, [listState, workspaceState, statusState, favoriteSet, now])

      const onSweep = () => {
        if (busy || sweeping) return
        if (!canArchive()) {
          setNotice({ tone: 'error', text: t('sweep.unavailable') })
          return
        }
        setNotice(null)
        if (sweepPlan.targets.length === 0) {
          const key = sweepPlan.kept > 0
            ? 'sweep.noneFav'
            : sweepPlan.live > 0 ? 'sweep.noneLive' : 'sweep.none'
          setNotice({ tone: 'info', text: t(key) })
          return
        }
        setSweeper({
          ids: sweepPlan.targets.slice(),
          kept: sweepPlan.kept,
          live: sweepPlan.live,
        })
      }

      const runSweep = async () => {
        if (sweeper === null || sweeping) return
        const ids = sweeper.ids
        setSweeping(true)
        setSweeper(null)
        let done = 0
        let message = ''
        for (const id of ids) {
          try {
            await archiveOne(id)
            done += 1
          } catch (error) {
            if (message === '') message = messageOf(error)
          }
        }
        setSweeping(false)
        const failed = ids.length - done
        if (done > 0) {
          setNotice({
            tone: failed === 0 ? 'success' : 'error',
            text: failed === 0
              ? t('sweep.done', { n: done })
              : t('sweep.failed', { n: failed, message }),
          })
          return
        }
        setNotice({ tone: 'error', text: t('sweep.failed', { n: failed, message }) })
      }

      const foot = doneRows.length > COLLAPSED_ROWS
        ? h('div', { className: 'drt-foot' },
          remaining > 0
            ? h('button', {
              type: 'button',
              className: 'drt-more',
              onClick: () => setShown(count => count + STEP_ROWS),
            }, t('page.more', { n: remaining }))
            : h('button', {
              type: 'button',
              className: 'drt-more',
              onClick: () => setShown(COLLAPSED_ROWS),
            }, t('page.less')),
        )
        : null

      const cardMeta = (row, tone) => h('span', { className: 'drt-cardMeta' },
        // 收藏 is the only band holding several states at once; elsewhere the
        // band header already names the state. A waiting session keeps its red
        // pill instead, so it is not labelled twice.
        tone === 'fav' && row.pending === undefined
          ? h('span', {
            className: 'drt-status is-' + (row.running === true ? 'running' : row.unread === true ? 'unread' : 'done'),
          }, t(row.running === true ? 'status.running' : row.unread === true ? 'status.unread' : 'status.done'))
          : null,
        row.pending === undefined ? null : h('span', { className: 'drt-pill' }, pendingLabel(row.pending, t)),
        h('span', { className: 'drt-cardWorkspace' }, row.workspace),
        h('span', { className: 'drt-cardSep', 'aria-hidden': 'true' }, '\u00b7'),
        h('span', { className: 'drt-cardTime' }, formatRelative(row.at, now, t)),
      )

      // One card shape for every band; only the tone changes. A div rather than
      // a button because the star lives inside it and buttons must not nest.
      const card = (row, tone) => {
        const favorite = row.favorite === true
        const starLabel = favorite ? t('star.remove') : t('star.add')
        const blocked = row.pending !== undefined && tone === 'running'
        return h('div', {
          key: row.id,
          role: 'button',
          tabIndex: 0,
          className: 'drt-card is-' + tone + (blocked ? ' is-pending' : ''),
          onClick: () => openRow(row),
          onKeyDown: event => {
            if (event.target !== event.currentTarget) return
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            openRow(row)
          },
        },
          h('span', { className: 'drt-cardHead' },
            h('span', {
              // The dot speaks status in every band, 收藏 included: on an amber
              // card an amber dot only repeated "favorite" and said nothing
              // about running or unread.
              className: 'drt-cardDot'
                + (row.pending !== undefined
                  ? ' is-pending'
                  : row.running === true
                    ? ' is-running'
                    : row.unread === true ? ' is-unread' : ''),
              'aria-hidden': 'true',
            }),
            h('span', { className: 'drt-cardTitle' }, row.title),
          ),
          cardMeta(row, tone),
          h('button', {
            type: 'button',
            className: 'drt-star' + (favorite ? ' is-on' : ''),
            'aria-pressed': favorite ? 'true' : 'false',
            'aria-label': starLabel,
            title: starLabel,
            onClick: event => {
              event.stopPropagation()
              toggleFavorite(row.id)
            },
          },
            h('svg', {
              viewBox: '0 0 20 20',
              'aria-hidden': 'true',
              focusable: 'false',
            },
              h('path', {
                d: 'M10 2.7l2.25 4.56 5.03.73-3.64 3.55.86 5.01L10 14.17l-4.5 2.38.86-5.01L2.72 7.99l5.03-.73z',
                fill: favorite ? 'currentColor' : 'none',
                stroke: 'currentColor',
                strokeWidth: 1.4,
                strokeLinejoin: 'round',
              }),
            ),
          ),
        )
      }

      // Every band is drawn only while it holds a card: an empty band keeps a
      // header and a "nothing here" line on screen, which reads as if its
      // sessions had gone missing. A band that is not drawn leaves no gap.
      const runningSection = runningRows.length === 0
        ? null
        : h('section', { className: 'drt-section drt-sectionRunning' },
          h('div', { className: 'drt-sectionHead' },
            h('span', {
              className: 'drt-headDot' + (liveRows.length === 0 ? ' is-pending' : ''),
              'aria-hidden': 'true',
            }),
            h('span', { className: 'drt-zoneLabel' }, t('section.running')),
            h('span', { className: 'drt-count' }, runningRows.length),
            pendingRows.length === 0
              ? null
              : h('span', { className: 'drt-chip' }, t('section.pendingChip', { n: pendingRows.length })),
          ),
          h('div', { className: 'drt-cardGrid is-running' }, pendingRows.concat(liveRows).map(row => card(row, 'running'))),
        )

      // 收藏 sits directly under the running band: a star lands there first.
      // It only takes room while it holds something — an empty band wedged
      // between two live bands reads as if a session went missing.
      const favoriteSection = favoriteRows.length === 0
        ? null
        : h('section', { className: 'drt-section drt-sectionFav' },
          h('div', { className: 'drt-sectionHead' },
            h('span', { className: 'drt-headDot is-fav', 'aria-hidden': 'true' }),
            h('span', { className: 'drt-zoneLabel' }, t('section.fav')),
            h('span', { className: 'drt-count' }, favoriteRows.length),
          ),
          h('div', { className: 'drt-cardGrid is-fav' }, favoriteRows.map(row => card(row, 'fav'))),
        )

      const unreadSection = unreadRows.length === 0
        ? null
        : h('section', { className: 'drt-section drt-sectionUnread' },
          h('div', { className: 'drt-sectionHead' },
            h('span', { className: 'drt-headDot is-unread', 'aria-hidden': 'true' }),
            h('span', { className: 'drt-zoneLabel' }, t('section.unread')),
            h('span', { className: 'drt-count' }, unreadRows.length),
          ),
          h('div', { className: 'drt-cardGrid is-unread' }, unreadRows.map(row => card(row, 'unread'))),
        )

      const doneSection = doneRows.length === 0
        ? null
        : h('section', { className: 'drt-section drt-sectionDone' },
          h('div', { className: 'drt-sectionHead' },
            h('span', { className: 'drt-headDot is-idle', 'aria-hidden': 'true' }),
            h('span', { className: 'drt-zoneLabel' }, t('section.done')),
            h('span', { className: 'drt-count' }, doneRows.length),
          ),
          h('div', { className: 'drt-cardGrid is-done' }, visible.map(row => card(row, 'done'))),
          foot,
        )

      let body = null
      if (listState === undefined || (listState && listState.phase === 'pending' && rows.length === 0)) {
        body = h('p', { className: 'drt-empty' }, t('page.loading'))
      } else if (rows.length === 0) {
        body = h('p', { className: 'drt-empty' }, t('page.empty'))
      } else {
        body = h('div', { className: 'drt-body' }, runningSection, favoriteSection, unreadSection, doneSection)
      }

      const dialog = chooser === null ? null : h('div', {
        className: 'drt-overlay',
        onMouseDown: event => {
          if (event.target === event.currentTarget && chooser.picking !== true) setChooser(null)
        },
      },
        h('div', {
          className: 'drt-dialog',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': t('chooser.title'),
        },
          h('div', { className: 'drt-dialogHead' },
            h('h3', { className: 'drt-dialogTitle' }, t('chooser.title')),
          ),
          h('p', { className: 'drt-dialogHint' }, t('chooser.hint')),
          h('div', { className: 'drt-dialogSection' },
            h('span', { className: 'drt-sectionLabel' }, t('chooser.existing')),
            chooser.workspaces.length === 0
              ? h('p', { className: 'drt-empty' }, t('chooser.noWorkspaces'))
              : h('ul', { className: 'drt-choiceList' },
                chooser.workspaces.map(row => h('li', { key: row.workspaceId || row.path },
                  h('button', {
                    type: 'button',
                    className: 'drt-choice',
                    onClick: () => choosePath(row.path),
                  },
                    h('span', { className: 'drt-choiceTitle' }, row.title || basename(row.path)),
                    h('span', { className: 'drt-choicePath' }, row.path),
                  ),
                )),
              ),
          ),
          chooser.error ? h('p', { className: 'drt-error' }, chooser.error) : null,
          h('div', { className: 'drt-dialogFoot' },
            h('button', {
              type: 'button',
              className: 'drt-ghost',
              onClick: () => setChooser(null),
            }, t('chooser.cancel')),
            h('button', {
              type: 'button',
              className: 'drt-primary',
              disabled: chooser.picking === true,
              onClick: () => { void pickOther() },
            }, chooser.picking === true ? t('chooser.picking') : t('chooser.other')),
          ),
        ),
      )

      const sweepDialog = sweeper === null ? null : h('div', {
        className: 'drt-overlay',
        onMouseDown: event => {
          if (event.target === event.currentTarget) setSweeper(null)
        },
      },
        h('div', {
          className: 'drt-dialog',
          role: 'dialog',
          'aria-modal': 'true',
          'aria-label': t('sweep.title'),
        },
          h('div', { className: 'drt-dialogHead' },
            h('h3', { className: 'drt-dialogTitle' }, t('sweep.title')),
          ),
          h('p', { className: 'drt-dialogHint' }, t('sweep.hint', { n: sweeper.ids.length })),
          sweeper.kept > 0 ? h('p', { className: 'drt-dialogHint' }, t('sweep.favNote', { n: sweeper.kept })) : null,
          sweeper.live > 0 ? h('p', { className: 'drt-dialogHint' }, t('sweep.liveNote', { n: sweeper.live })) : null,
          h('div', { className: 'drt-dialogFoot' },
            h('button', {
              type: 'button',
              className: 'drt-ghost',
              onClick: () => setSweeper(null),
            }, t('sweep.cancel')),
            h('button', {
              type: 'button',
              className: 'drt-primary',
              onClick: () => { void runSweep() },
            }, t('sweep.confirm', { n: sweeper.ids.length })),
          ),
        ),
      )

      return h('div', { className: 'drt-root', 'data-dsh-plugin': 'recent-tasks' },
        h('div', { className: 'drt-page' },
          h('header', { className: 'drt-header' },
            h('h2', { className: 'drt-title' }, t('page.title')),
            h('div', { className: 'drt-actions' },
              h('button', {
                type: 'button',
                className: 'drt-sweep',
                disabled: busy || sweeping,
                title: t('page.sweepHint'),
                'aria-label': t('page.sweepHint'),
                onClick: onSweep,
              }, SweepGlyph(), t(sweeping ? 'page.sweeping' : 'page.sweep')),
              h('button', {
                type: 'button',
                className: 'drt-ghost',
                onClick: leave,
              }, t('page.back')),
              h('button', {
                type: 'button',
                className: 'drt-add',
                disabled: busy,
                title: t('page.add'),
                'aria-label': t('page.add'),
                onClick: () => { void onAdd() },
              }, '+'),
            ),
          ),
          notice ? h('p', { className: 'drt-notice' + (notice.tone === 'info' ? ' is-info' : notice.tone === 'success' ? ' is-success' : '') }, notice.text) : null,
          body,
        ),
        dialog,
        sweepDialog,
      )
    }

    /** Glyph on the sweep button: a broom-ish archive arrow into a box. */
    function SweepGlyph() {
      return h('svg', {
        viewBox: '0 0 16 16',
        width: 13,
        height: 13,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      },
        h('path', { d: 'M2 12.4h12' }),
        h('path', { d: 'M4.2 9.4h7.6l-.9 3H5.1z' }),
        h('path', { d: 'M8 2.4v4.2' }),
        h('path', { d: 'M6.3 5.2 8 6.9l1.7-1.7' }),
      )
    }

    /**
     * The one button that swaps the shipped plugin code and rebuilds the
     * interface. It belongs to the app's own refresh plugin, which labels it in
     * the interface language; the sidebar row of this plugin never carries that
     * label, so the two cannot be confused.
     * @returns the button, or null while it is not on screen.
     */
    function refreshButton() {
      const labels = ['解除卡顿', 'Unlag']
      const buttons = document.querySelectorAll('button[aria-label]')
      for (let index = 0; index < buttons.length; index += 1) {
        const button = buttons[index]
        if (labels.indexOf(button.getAttribute('aria-label')) === -1) continue
        if (button.closest('[data-dsh-panel-entry]') !== null) continue
        return button
      }
      return null
    }

    /**
     * The revision the app serves for its composed plugin set right now, or ''
     * when the answer cannot be read.
     *
     * The app publishes the live revision between the refresh button's own
     * plugin seams; a document compares it against the revision it saw when it
     * started, and the two differ exactly when that document runs stale code.
     * @returns the served revision, or '' when unknown.
     */
    async function servedRev() {
      const controller = typeof AbortController === 'function' ? new AbortController() : null
      const timer = controller === null ? null : setTimeout(() => controller.abort(), GRAPH_WAIT_MS)
      try {
        const response = await fetch(GRAPH_PATH, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller === null ? undefined : controller.signal,
        })
        if (!response.ok) return ''
        const body = await response.json()
        const graph = body === null || typeof body !== 'object' ? null : body.graph
        const rev = graph === null || typeof graph !== 'object' ? null : graph.rev
        return typeof rev === 'string' ? rev : ''
      } catch {
        return ''
      } finally {
        if (timer !== null) clearTimeout(timer)
      }
    }

    function pressWaiting(button) {
      return button.isConnected && button.style.opacity === '0.4'
    }

    /**
     * Read the intent a rebuild leaves for the next document. A stale one is
     * ignored: it would describe a click the person has long left behind.
     * @returns the intent, or null when there is none worth acting on.
     */
    function reopenIntent() {
      try {
        const raw = window.sessionStorage.getItem(REOPEN_KEY)
        if (raw === null) return null
        const value = JSON.parse(raw)
        const at = value === null || typeof value !== 'object' ? 0 : Number(value.at)
        if (!Number.isFinite(at)) return null
        if (Date.now() - at < 0 || Date.now() - at > REOPEN_TTL_MS) return null
        return { at }
      } catch {
        return null
      }
    }

    /** Leave the intent for the document the press is about to rebuild. */
    function writeReopenIntent() {
      try {
        window.sessionStorage.setItem(REOPEN_KEY, JSON.stringify({ at: Date.now() }))
      } catch {
        // A tab that refuses storage simply enters the page by the old route.
      }
    }

    /** Drop the intent: either the page is opening now, or the person moved on. */
    function clearReopenIntent() {
      try {
        window.sessionStorage.removeItem(REOPEN_KEY)
      } catch {
        // Nothing to clear.
      }
    }

    /**
     * Make a click on the sidebar entry refresh the running code before the
     * pages switch.
     *
     * The refresh button lives in the Conversation header, so it only exists
     * while the Conversation is on screen: the click is held here, the button is
     * pressed for its own decision path — switches, address check, every refusal
     * reason — and this page opens once that press answers. A press that goes
     * through rebuilds the document; the intent left in the tab brings this page
     * back after the rebuild. A press that refuses changed nothing, so the page
     * opens right away, exactly as before.
     *
     * The press is only borrowed while the document runs older plugin code than the
     * app serves now — the revision it saw as it started against the live one. A
     * document that started on the current code opens the page at once, since
     * the rebuild would install the same files.
     * @param ctx - Client root context.
     * @returns disposer removing the listener.
     */
    function installRefreshBridge(ctx) {
      if (typeof document === 'undefined' || typeof window === 'undefined') return () => {}
      let busy = false
      /** Where the current click is in its life; a superseded click stops caring. */
      let generation = 0

      /** The revision served when this document started; '' until the first answer. */
      let baseline = ''
      let baselineKnown = false
      /**
       * The first look at the served revision, taken as this document starts:
       * from here on, any newer revision means the document runs stale code.
       */
      const baselineLook = (async () => {
        const rev = await servedRev()
        if (rev === '') return
        baseline = rev
        baselineKnown = true
      })()
      /**
       * Whether the plugin code served now is newer than the code this document
       * started with. A missing answer counts as "changed": the refresh is what
       * the entry promises, and a check that cannot run must not quietly drop it.
       * @returns whether borrowing the refresh button would install anything.
       */
      const codeChanged = async () => {
        await baselineLook
        if (!baselineKnown) return true
        const rev = await servedRev()
        if (rev === '') return true
        return rev !== baseline
      }

      let timer = null
      const interrupters = []
      /** Whether a node sits inside this plugin's own sidebar row. */
      const isEntry = node => {
        if (node === null || node === undefined || typeof node.closest !== 'function') return false
        const button = node.closest('button')
        return button !== null && button.querySelector('svg[data-dsh-panel-entry="' + PANEL_ID + '"]') !== null
      }
      const release = () => {
        generation += 1
        busy = false
        if (timer !== null) {
          clearInterval(timer)
          timer = null
        }
        for (const listener of interrupters.splice(0)) document.removeEventListener(listener[0], listener[1], true)
      }
      /**
       * Starting something else while the press runs keeps that instead: the
       * intent is dropped so a late rebuild cannot pull the person back here.
       */
      const interrupt = event => {
        if (!busy || isEntry(event.target)) return
        clearReopenIntent()
        release()
      }
      /** Show this page once the press has answered. */
      const enter = () => {
        try {
          const layout = ctx.get('layout')
          if (layout && typeof layout.selectPanel === 'function') layout.selectPanel(PANEL_ID)
          else return false
          return true
        } catch (error) {
          console.warn('[recent-tasks] opening the page after a refresh failed:', error)
          return false
        }
      }
      const onClick = event => {
        if (busy || event.defaultPrevented || event.button !== 0) return
        if (!isEntry(event.target)) return
        // The row was chosen, so the page is entered afresh: its list starts at
        // the arrival count whether the click is held for a refresh or not.
        requestRowReset()
        const layout = ctx.get('layout')
        const info = layout && layout.panelInfo && typeof layout.panelInfo.getSnapshot === 'function'
          ? layout.panelInfo.getSnapshot()
          : null
        const active = info === null || info === undefined ? null : info.activePanelId
        // Clicking the row of the page already on screen keeps its old meaning.
        if (active === PANEL_ID) return
        const button = refreshButton()
        // Without the app's refresh button the entry keeps its plain meaning.
        if (button === null) return
        // The press judges the document the person is looking at, so the switch
        // waits for it: a page read after the Conversation is gone is no check.
        event.preventDefault()
        event.stopPropagation()
        busy = true
        for (const type of ['pointerdown', 'keydown']) {
          document.addEventListener(type, interrupt, true)
          interrupters.push([type, interrupt])
        }
        const mine = generation
        let entered = false
        const settle = () => {
          if (entered) return
          entered = true
          enter()
        }
        /** Borrow the app's press; its own switches and checks decide the rest. */
        const press = () => {
          const startedAt = Date.now()
          writeReopenIntent()
          try {
            button.click()
          } catch (error) {
            console.warn('[recent-tasks] borrowing the refresh button failed:', error)
            clearReopenIntent()
            release()
            settle()
            return
          }
          timer = setInterval(() => {
            const elapsed = Date.now() - startedAt
            if (elapsed < PRESS_ARM_MS) return
            if (!pressWaiting(button)) {
              // The press answered where it stood: nothing will reload, so the
              // intent is spent and the entry does what it always did.
              clearReopenIntent()
              release()
              settle()
              return
            }
            // A press that reloads never reaches this code again; one that is just
            // slow is not allowed to hold the entry forever.
            if (!entered && elapsed >= PRESS_WAIT_MS) settle()
          }, PRESS_POLL_MS)
        }
        // A rebuild that installs nothing costs the person seconds: the entry asks
        // which code is served first, and opens the page at once when nothing moved.
        void codeChanged().then(changed => {
          if (mine !== generation) return
          if (changed) {
            press()
            return
          }
          release()
          settle()
        })
      }
      document.addEventListener('click', onClick, true)
      return () => {
        document.removeEventListener('click', onClick, true)
        release()
      }
    }

    /**
     * Bring this page back after the refresh the sidebar entry started.
     *
     * The press rebuilds the document, so the click's own navigation is gone
     * before the new document boots; the intent left in the tab names the page
     * to open. The main seat is registered asynchronously and the app settles
     * its own navigation during boot, so the open is retried for a moment and
     * re-asserted once while the seat it opened is still empty.
     * @param ctx - Client root context.
     * @returns disposer stopping the retries.
     */
    function restorePageAfterRefresh(ctx) {
      if (reopenIntent() === null) return () => {}
      clearReopenIntent()
      const deadline = Date.now() + REOPEN_WATCH_MS
      let timer = null
      let opens = 0
      let stopped = false
      /**
       * The watch ends on its own deadline, or the moment the person touches
       * anything: from then on their navigation is the one to keep.
       */
      const stop = () => {
        stopped = true
        if (timer !== null) clearTimeout(timer)
        timer = null
        document.removeEventListener('pointerdown', stop, true)
        document.removeEventListener('keydown', stop, true)
      }
      const schedule = ms => {
        if (stopped || timer !== null) return
        timer = setTimeout(attempt, ms)
      }
      const attempt = () => {
        timer = null
        if (stopped) return
        if (Date.now() >= deadline) {
          stop()
          return
        }
        const layout = ctx.get('layout')
        if (layout === undefined || layout === null || typeof layout.selectPanel !== 'function') {
          schedule(REOPEN_RETRY_MS)
          return
        }
        let active = null
        try {
          const info = layout.panelInfo && typeof layout.panelInfo.getSnapshot === 'function'
            ? layout.panelInfo.getSnapshot()
            : null
          active = info === null || info === undefined ? null : info.activePanelId
        } catch {
          active = null
        }
        // Boot may run its own restore after this plugin applies (it puts the
        // last Conversation back), so the seat is looked at for a while and
        // taken back while the person has not chosen anything themselves.
        if (active !== PANEL_ID) {
          if (opens >= REOPEN_MAX_OPENS) {
            stop()
            return
          }
          try {
            layout.selectPanel(PANEL_ID)
            opens += 1
          } catch {
            schedule(REOPEN_RETRY_MS)
            return
          }
        }
        schedule(REOPEN_POLL_MS)
      }
      document.addEventListener('pointerdown', stop, true)
      document.addEventListener('keydown', stop, true)
      schedule(REOPEN_START_MS)
      return stop
    }

    /**
     * Build the face the page receives: live service handles read lazily, so a
     * service that arrives later (or never) degrades instead of failing boot.
     * @param ctx - Client root context.
     * @returns the injected host face.
     */
    function createHost(ctx) {
      return {
        get sessions() { return ctx.get('sessions') },
        get workspaces() { return ctx.get('workspaces') },
        get layout() { return ctx.get('layout') },
        get uiWorkspace() { return ctx.get('uiWorkspace') },
        get uiSession() { return ctx.get('uiSession') },
        get remote() { return ctx.get('remote') },
        t: (key, params) => ctx.locale.bind(NS)(key, params),
      }
    }

    return {
      // `sessions`/`workspaces` are the two Client services the page reads;
      // `layout` navigates. `uiWorkspace` is read lazily and stays optional.
      inject: ['slots', 'locale', 'layout', 'sessions', 'workspaces'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'recent-tasks: dictionaries')
        ctx.effect(() => injectStyle(), 'recent-tasks: styles')
        const host = createHost(ctx)
        ctx.effect(() => {
          const slots = ctx.slots
          const disposers = []
          // The seats are declared by the shell packages; `slots.inject` defers
          // each registration until its seat exists and drops it on unload.
          disposers.push(slots.inject('sidebar.panellist', () => slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 100,
            label: () => ctx.locale.bind(NS)('entry.label'),
            locale: NS,
          }, PanelGlyph)))
          disposers.push(slots.inject('main', () => slots.register({
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({ host }),
          }, RecentTasksPage)))
          return () => {
            // Hand the main region back to the Conversation before the page key
            // disappears, and only when this plugin actually owns it.
            try {
              const layout = ctx.get('layout')
              const info = layout && layout.panelInfo && typeof layout.panelInfo.getSnapshot === 'function'
                ? layout.panelInfo.getSnapshot()
                : undefined
              if (info && info.activePanelId === PANEL_ID && typeof layout.selectPanel === 'function') {
                layout.selectPanel(null)
              }
            } catch (error) {
              console.warn('[recent-tasks] leaving the page on unload failed:', error)
            }
            for (let index = disposers.length - 1; index >= 0; index -= 1) {
              try {
                disposers[index]()
              } catch (error) {
                console.warn('[recent-tasks] releasing a registration failed:', error)
              }
            }
          }
        }, 'recent-tasks: surfaces')
        // The entry refreshes the running code before it opens the page, and the
        // page comes back by itself after the rebuild that press started.
        ctx.effect(() => watchUnread(ctx), 'recent-tasks: unread watch')
        ctx.effect(() => installRefreshBridge(ctx), 'recent-tasks: entry refresh')
        ctx.effect(() => restorePageAfterRefresh(ctx), 'recent-tasks: reopen after refresh')
      },
    }
  },
})
