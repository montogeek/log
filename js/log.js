/**
 * Log
 * A log and time-tracking system
 *
 * @author Josh Avanier
 * @version 1.0.2
 * @license MIT
 */

'use strict';

var Log = {

  path: '',

  log: [],
  config: {},
  palette: {},
  projectPalette: {},
  clock: {},

  cache: {
    sortEntries: [],
    sectors: [],
    sectorCount: 0,
    sectorFocus: [],
    projects: [],
    projectCount: 0,
    projectFocus: [],
    peakHours: [],
    peakDays: [],
    durations: []
  },

  /**
   * Get log status; true means a session is in progress
   * @returns {boolean} Log status
   */
  status() {
    if (isEmpty(Log.log)) return
    return Log.log.slice(-1)[0].e === 'undefined' ? true : false
  },

  /**
   * Display a session timer
   * @param {boolean} status - Log status
   */
  timer(status) {
    if (status) {
      const l = Log.time.convert(
          Log.time.parse(Log.log.slice(-1)[0].s)
        ).getTime()

      Log.clock = setInterval(() => {
        let s = Math.floor((new Date().getTime() - l) / 1E3)
        let m = Math.floor(s / 60)
        let h = Math.floor(m / 60)

        h %= 24
        m %= 60
        s %= 60

        write('timer', `${`0${h}`.substr(-2)}:${`0${m}`.substr(-2)}:${`0${s}`.substr(-2)}`)
      }, 1E3)
    } else return
  },

  /**
    * Play a sound effect
    * @param {string} sound - name of the sound file in /media
    */
  playSoundEffect(sound) {
    const audio = new Audio(`${__dirname}/media/${sound}.mp3`)
    audio.play()
  },

  /**
   * Display a log table
   * @param {Object[]=} ent - Entries
   * @param {number=} num - Number of entries to show
   * @param {string=} con - Container
   */
  display(ent = user.log, num = 50, con = 'logbook') {
    if (!isValidArray(ent) || isEmpty(ent) || !isNumber(num) || !isString(con) || !exists(con)) return

    const entries = Log.utils.takeRight(ent, num).reverse()

    entries.map((e, i) => {
      const rw = document.getElementById(con).insertRow(i)
      const date = Log.time.convert(Log.time.parse(e.s))

      rw.insertCell(0).innerHTML = user.log.length - i
      rw.insertCell(1).innerHTML = Log.time.displayDate(date)
      rw.insertCell(2).innerHTML = Log.time.stamp(date)

      e.e === 'undefined' ?
      (rw.insertCell(3).innerHTML = '-', rw.insertCell(4).innerHTML = '-') :
      (rw.insertCell(3).innerHTML = Log.time.stamp(Log.time.convert(Log.time.parse(e.e))), rw.insertCell(4).innerHTML = `${Log.time.duration(e.s, e.e).toFixed(2)} h`)

      rw.insertCell(5).innerHTML = e.c
      rw.insertCell(6).innerHTML = e.t
      rw.insertCell(7).innerHTML = e.d
    })
  },

  detail: {

    /**
     * View sector details
     * @param {string} sec - Sector
     */
    sec(sec = Log.cache.sectors.sort()[0]) {
      Log.detail.clear.sector()

      if (isUndefined(sec) || isEmpty(sec)) return

      const ent = Log.data.getEntriesBySector(sec, Log.data.getRecentEntries(Log.config.ui.view - 1))
      const his = Log.data.getEntriesBySector(sec)

      write('sectorTitle', sec)

      const timeago = isEmpty(ent) ? `No activity in the past ${Log.config.ui.view} days` : `Updated ${Log.time.timeago(Log.time.parse(ent.slice(-1)[0].e) * 1E3)}`

      write('sectorLastUpdate', timeago)

      const durations = Log.data.listDurations(his)

      write('sEnt', his.length)
      write('sLHH', Log.data.total(durations).toFixed(2))
      write('sLSNH', Log.data.min(durations).toFixed(2))
      write('sLSXH', Log.data.max(durations).toFixed(2))
      write('sASD', Log.data.avg(durations).toFixed(2))
      write('sPHH', Log.data.peakHour(Log.data.peakHours(his)))
      write('sPDH', Log.data.peakDay(Log.data.peakDays(his)))
      write('sStreak', Log.data.streak(Log.data.sortEntries(his)))

      Log.vis.peakChart('hours', Log.data.peakHours(his), 'sPeakTimes')
      Log.vis.peakChart('days', Log.data.peakDays(his), 'sPeakDays')

      if (!isEmpty(ent)) {
        const mode = Log.config.ui.colourMode === 'none' ? 'none' : 'project'
        const focus = Log.data.listFocus('project', Log.data.sortEntries(ent))
        const data = Log.data.bar(ent)

        Log.vis.bar(data, 'sectorChart')
        Log.vis.focusChart('project', ent, 'sFocusChart')

        write('sFavg', Log.data.avg(focus).toFixed(2))
        write('sFmin', Log.data.min(focus).toFixed(2))
        write('sFmax', Log.data.max(focus).toFixed(2))

        Log.vis.focusBar('pro', ent, 'projectDetailFocus')
        Log.vis.legend('pro', ent, 'projectLegend')
      }
    },

    /**
     * View project details
     * @param {string} pro - Project
     */
    pro(pro = Log.cache.projects.sort()[0]) {
      Log.detail.clear.project()

      if (isUndefined(pro) || isEmpty(pro)) return

      const ent = Log.data.getEntriesByProject(pro, Log.data.getRecentEntries(Log.config.ui.view - 1))
      const his = Log.data.getEntriesByProject(pro)
      const durations = Log.data.listDurations(his)

      write('projectTitle', pro)

      const timeago = isEmpty(ent) ? `No activity in the past ${Log.config.ui.view} days` : `Updated ${Log.time.timeago(Log.time.parse(ent.slice(-1)[0].e) * 1E3)}`

      write('projectLastUpdate', timeago)

      write('pEnt', his.length)
      write('pLHH', `${Log.data.total(durations).toFixed(2)} h`)
      write('pLSNH', `${Log.data.min(durations).toFixed(2)} h`)
      write('pLSXH', `${Log.data.max(durations).toFixed(2)} h`)
      write('pASD', `${Log.data.avg(durations).toFixed(2)} h`)
      write('pPHH', Log.data.peakHour(Log.data.peakHours(his)))
      write('pPDH', Log.data.peakDay(Log.data.peakDays(his)))
      write('pStreak', Log.data.streak(Log.data.sortEntries(his)))

      Log.vis.peakChart('hours', Log.data.peakHours(his), 'pPeakTimes')
      Log.vis.peakChart('days', Log.data.peakDays(his), 'pPeakDays')

      if (!isEmpty(ent)) {
        const mode = Log.config.ui.colourMode === 'none' ? 'none' : 'sector'
        const focus = Log.data.listFocus('sector', Log.data.sortEntries(ent))
        const data = Log.data.bar(ent)

        Log.vis.bar(data, 'projectChart')
        Log.vis.focusChart('sector', ent, 'pFocusChart')

        write('pFavg', Log.data.avg(focus).toFixed(2))
        write('pFmin', Log.data.min(focus).toFixed(2))
        write('pFmax', Log.data.max(focus).toFixed(2))

        Log.vis.focusBar('sec', ent, 'sectorDetailFocus')
        Log.vis.legend('sec', ent, 'sectorLegend')
      }
    },

    clear: {

      /**
       * Clear sector details
       */
      sector() {
        const el = 'sectorTitle sectorChart sPeakTimes sPeakDays projectDetailFocus projectLegend sFocusChart'.split(' ')
        el.map(e => clear(e))
      },

      /**
       * Clear project details
       */
      project() {
        const el = 'projectTitle projectLastUpdate projectChart sectorDetailFocus sectorLegend pPeakTimes pPeakDays pFocusChart'.split(' ')
        el.map(e => clear(e))
      }
    }
  },

  journal: {

    /**
     * Display entries from a date
     * @param {Object=} hex - Hex code
     */
    display(date = new Date()) {
      if (!isObject(date)) return

      Log.journal.clear()

      const entries = Log.data.getEntriesByDate(date)

      if (isEmpty(entries)) return

      document.getElementById('journalDate').innerHTML = Log.time.displayDate(date)

      Log.vis.day(date, 'journalDay')

      const durations = Log.data.listDurations(entries)

      write('jLHT', Log.data.total(durations).toFixed(2))
      write('jLSN', Log.data.min(durations).toFixed(2))
      write('jLSX', Log.data.max(durations).toFixed(2))
      write('jASDT', Log.data.avg(durations).toFixed(2))
      write('jLPT', Log.data.lp(entries).toFixed(2))
      write('jfocusToday', Log.data.projectFocus(Log.data.listProjects(entries)).toFixed(2))

      const l = entries.length

      entries.map((e, i) => {
        const li = create('li')
        const tim = create('span')
        const sec = create('span')
        const pro = create('span')
        const dur = create('span')
        const ent = create('p')

        li.className = i !== l - 1 ? 'f6 lhc mb4' : 'f6 lhc'
        tim.className = 'mr3 o7'
        sec.className = 'mr3 o7'
        pro.className = 'o7'
        dur.className = 'rf o7'
        ent.className = 'f4 lhc'

        tim.innerHTML = `${Log.time.stamp(Log.time.convert(Log.time.parse(e.s)))} &ndash; ${Log.time.stamp(Log.time.convert(Log.time.parse(e.e)))}`
        sec.innerHTML = e.c
        pro.innerHTML = e.t
        dur.innerHTML = `${e.dur.toFixed(2)} h`
        ent.innerHTML = e.d

        li.appendChild(tim)
        li.appendChild(sec)
        li.appendChild(pro)
        li.appendChild(dur)
        li.appendChild(ent)

        document.getElementById('journalEntries').appendChild(li)
      })
    },

    /**
     * Clear journal
     */
    clear() {
      clear('journalDay')
      clear('journalEntries')
    },

    /**
     * Journal navigation
     */
    nav() {
      const entries = Log.cache.sortEntries.reverse()

      if (isEmpty(entries)) return

      entries.map((e, i) => {
        if (!isEmpty(entries[i])) {
          let li = create('li')
          let s = entries[i][0].s

          li.className = 'lhd c-pt'
          li.innerHTML = Log.time.displayDate(Log.time.convert(Log.time.parse(s)))

          li.setAttribute('onclick', `Log.journal.translate('${s}')`)
          document.getElementById('journalNav').appendChild(li)
        }
      })
    },

    translate(hex) {
      Log.journal.display(Log.time.convert(Log.time.parse(hex)))
    }
  },

  utils: {

    /**
     * Take the last n items of an array (from lodash)
     * @param {Object[]} a - Array
     * @param {number=} n - Number of items
     * @returns {Object[]} An array with the last n items
     */
    takeRight(a, n = 1) {
      const l = a == null ? 0 : a.length
      let slice = (a, s, e) => {
        let l = a == null ? 0 : a.length
        if (!l) return []
        s = s == null ? 0 : s
        e = e === undefined ? l : e
        if (s < 0) s = -s > l ? 0 : (l + s)
        e = e > l ? l : e
        if (e < 0) e += l
        l = s > e ? 0 : ((e - s) >>> 0)
        s >>>= 0
        let i = -1
        const r = new Array(l)
        while (++i < l) r[i] = a[i + s]
        return r
      }
      if (!l) return []
      n = l - n
      return slice(a, n < 0 ? 0 : n, l)
    },

    /**
     * Calculate width
     */
    calcWidth(a, b) {
      return (a - b) / 86400 * 100
    },

    /**
     * Calculate DP
     */
    calcDP(a) {
      const s = Log.time.convert(a)
      const y = s.getFullYear()
      const m = s.getMonth()
      const d = s.getDate()

      return (new Date(y, m, d, s.getHours(), s.getMinutes(), s.getSeconds()).getTime() / 1E3 - (new Date(y, m, d).getTime() / 1E3)) / 86400 * 100
    },

    /**
     * Calculate margin
     */
    calcMargin(a, lw, lp) {
      return a - (lw + lp)
    }
  },

  /**
   * Open a tab
   */
  tab(s, g, t, v = false) {
    const x = document.getElementsByClassName(g)
    const b = document.getElementsByClassName(t)

    Log.nav.index = Log.nav.menu.indexOf(s)

    for (let i = 0, l = x.length; i < l; i++) {
      x[i].style.display = 'none'
    }

    for (let i = 0, l = b.length; i < l; i++) {
      b[i].className = v ? `db mb3 ${t} on bg-cl o5 mr3` : `pv1 ${t} on bg-cl o5 mr3`
    }

    document.getElementById(s).style.display = 'block'
    document.getElementById(`b-${s}`).className = v ? `db mb3 ${t} on bg-cl of mr3` : `pv1 ${t} on bg-cl of mr3`
  },

  /**
   * Refresh
   */
  refresh() {
    Log.reset()
    Log.init()
  },

  reset() {
    clearInterval(Log.clock)
    write('timer', '00:00:00')

    write('fsf', '&mdash;')
    write('fpf', '&mdash;')
    write('fsd', '0.00 h')

    const el = 'phc pdc dayChart weekChart peakTimesHistory sectorBars projectBars sectorsList projectsList visual logbook focusChart sectorFocusBar sectorLegendSummary journalNav journalDay journalEntries'.split(' ')

    el.map(e => clear(e))
  },

  nav: {
    menu: 'ovw lis vis tab jou gui'.split(' '),
    index: 0,

    horizontal() {
      Log.nav.index = Log.nav.index === 5 ? 0 : Log.nav.index + 1
      Log.tab(Log.nav.menu[Log.nav.index], 'sect', 'tab')
    }
  },

  init() {
    if (localStorage.hasOwnProperty('logHistory')) {
      Log.console.history = JSON.parse(localStorage.getItem('logHistory'))
    } else {
      Log.console.history = []
      localStorage.setItem('logHistory', JSON.stringify(Log.console.history))
    }

    const cmd = document.getElementById('cmd')
    const con = document.getElementById('console')
    let cmdIndex = 1

    cmd.addEventListener('submit', function() {
      if (con.value !== '') {
        Log.console.history.push(con.value)

        if (Log.console.history.length >= 100) Log.console.history.shift()

        localStorage.setItem('logHistory', JSON.stringify(Log.console.history))

        Log.console.parse(con.value)
      }

      con.value = ''
      cmd.style.display = 'none'
      cmdIndex = 1
    })

    document.addEventListener('keydown', function(e) {
      if (e.which >= 65 && e.which <= 90) {
        cmd.style.display = 'block'
        con.focus()
      } else if (e.key === 'Escape') {
        con.value = ''
        cmd.style.display = 'none'
        cmdIndex = 1
      } else if (e.which === 38) {
        cmd.style.display = 'block'
        con.focus()
        cmdIndex++

        if (cmdIndex > Log.console.history.length) {
          cmdIndex = Log.console.history.length
        }

        con.value = Log.console.history[Log.console.history.length - cmdIndex]
      } else if (e.which === 40) {
        cmd.style.display = 'block'
        con.focus()
        cmdIndex--

        if (cmdIndex < 1) cmdIndex = 1
        con.value = Log.console.history[Log.console.history.length - cmdIndex]
      } else if (e.key === 'Tab') {
        e.preventDefault()
        Log.nav.horizontal()
      }

      if (e.key === 'o' && (e.ctrlKey || e.metaKey)) {
      	e.preventDefault()
      	Log.console.importUser()
      	return
      }

      if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
      	e.preventDefault()
      	Log.console.exportUser()
      	return
      }
    })

    var user = {
      config: dataStore.get('config') || {},
      palette: dataStore.get('palette') || {},
      projectPalette: dataStore.get('projectPalette') || {},
      log: dataStore.get('log') || []
    }

    Log.config = user.config
    Log.palette = user.palette
    Log.projectPalette = user.projectPalette
    Log.log = Log.data.parse(user.log)

    document.getElementById('app').style.backgroundColor = Log.config.ui.bg
    document.getElementById('app').style.color = Log.config.ui.colour

    if (isEmpty(user.log)) {
      Log.nav.index = 5
      Log.tab('gui', 'sect', 'tab')
      return
    }

    Log.cache.sortEntries = Log.data.sortEntries()
    Log.cache.sectors = Log.data.listSectors()
    Log.cache.sectorCount = Log.cache.sectors.length
    Log.cache.sectorFocus = Log.data.listFocus('sector')
    Log.cache.projects = Log.data.listProjects()
    Log.cache.projectCount = Log.cache.projects.length
    Log.cache.projectFocus = Log.data.listFocus('project')
    Log.cache.peakHours = Log.data.peakHours()
    Log.cache.peakDays = Log.data.peakDays()
    Log.cache.durations = Log.data.listDurations()

    Log.timer(Log.status())

    const en = Log.data.getEntriesByDate()
    const mn = Log.data.getRecentEntries(Log.config.ui.view - 1)
    const dur = Log.data.listDurations(en)
    const hLh = Log.data.total(Log.cache.durations)

    Log.vis.peakChart('hours', Log.data.peakHours(Log.data.sortEntriesByDay()[new Date().getDay()]), 'phc')
    Log.vis.peakChart('days', Log.cache.peakDays, 'pdc')

    write('fsf', Log.data.forecast.sf())
    write('fpf', Log.data.forecast.pf())
    write('flh', `${Log.data.forecast.lh().toFixed(2)} h`)
    write('fsd', `${Log.data.forecast.sd().toFixed(2)} h`)

    Log.vis.day()
    Log.vis.bar(Log.data.bar(mn), 'weekChart')

    Log.vis.list('sec', 'hours', 'sectorBars', en)
    Log.vis.list('pro', 'hours', 'projectBars', en)

    write('LHT', `${Log.data.lh(en).toFixed(2)} h`)
    write('LSN', `${Log.data.min(dur).toFixed(2)} h`)
    write('LSX', `${Log.data.max(dur).toFixed(2)} h`)
    write('ASDT', `${Log.data.avg(dur).toFixed(2)} h`)
    write('LPT', `${Log.data.lp(en).toFixed(2)}%`)
    write('FOC', Log.data.projectFocus(Log.data.listProjects(en)))
    write('ENC', en.length)
    write('STK', Log.data.streak())

    write('LHH', hLh)
    write('LSNH', Log.data.min(Log.cache.durations))
    write('LSXH', Log.data.max(Log.cache.durations))
    write('ASD', Log.data.avg(Log.cache.durations))
    write('ALHH', Log.data.avgLh())
    write('LPH', Log.data.lp())
    write('entCount', user.log.length)
    write('secCount', Log.cache.sectorCount)
    write('proCount', Log.cache.projectCount)
    write('PHH', Log.data.peakHour())
    write('PDH', Log.data.peakDay())

    Log.vis.peakChart('hours', Log.cache.peakHours, 'peakTimesHistory')
    Log.vis.peakChart('days', Log.cache.peakDays, 'peakDaysHistory')

    Log.vis.focusChart('pro', mn)

    write('Favg', Log.data.avg(Log.cache.projectFocus))
    write('Fmin', Log.data.min(Log.cache.projectFocus))
    write('Fmax', Log.data.max(Log.cache.projectFocus))

    Log.vis.focusBar('sec', Log.log, 'sectorFocusBar')
    Log.vis.legend('sec', Log.log, 'sectorLegendSummary')

    Log.detail.sec()
    Log.vis.list('sec', 'hours', 'sectorsList')

    Log.detail.pro()
    Log.vis.list('pro', 'hours', 'projectsList')

    Log.vis.line(Log.data.line(mn), 'visual')

    Log.display(Log.log, 100)

    Log.journal.display()
    Log.journal.nav()
  }
}
