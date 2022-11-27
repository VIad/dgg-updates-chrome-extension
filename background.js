let Status = class {
  constructor(live, streamTitle) {
    this.live = live
    this.streamTitle = streamTitle
  }
  setTo = (other) => {
    this.live = other.live
    this.streamTitle = other.streamTitle
  }
  equals = (other) => {
    return this.live === other.live &&
      this.streamTitle === other.streamTitle
  }
}

const currentStatus = new Status(false, '')
const cachedStatus = new Status(false, '')

let fetchStatus = async () => {
  cachedStatus.setTo(currentStatus)
  return fetch('https://www.youtube.com/@destiny')
    .then(r => r.text())
    .then(result => {
      currentStatus.live = result.includes("hqdefault_live.jpg")
      if (currentStatus.live)
        determineStreamTitle(result)
      checkStatusChanged()
      applyIcon()
      cachedStatus.setTo(currentStatus)
      updateStorage()
    })
}

let checkStatusChanged = () => {
  if (currentStatus.live !== cachedStatus.live) {
    let message = 'Destiny is now ' + (currentStatus.live ? 'live' : 'offline')
    message += currentStatus.live ? ', title: ' + currentStatus.streamTitle : ''
    chrome.notifications.create(randomId(3), {
      type: 'basic',
      iconUrl: 'images/dgg_icon_128.png',
      title: 'PEPE WINS',
      message: message,
      priority: 2
    })
  }

  if (currentStatus.streamTitle !== cachedStatus.streamTitle && cachedStatus.live) {
    chrome.notifications.create(randomId(3), {
      type: 'basic',
      iconUrl: 'images/dgg_icon_128.png',
      title: 'PEPE WINS',
      message: 'Now streaming: ' + (currentStatus.streamTitle),
      priority: 2
    })
  }
}

let determineStreamTitle = (pageHtml) => {
  const firstTitleOccurence = pageHtml.indexOf('"title":{"runs":[{"text":"') + 26 //offset the length of search string
  const firstOccurence = pageHtml.substring(firstTitleOccurence)
  const title = unicodeToChar(
    firstOccurence.substring(0, firstOccurence.indexOf('"}],'))
  )
  currentStatus.streamTitle = title
}

let applyIcon = () => {
  if (currentStatus.live)
    chrome.action.setIcon({ path: { 128: 'images/dgg_icon_live_128.png' } })
  else
    chrome.action.setIcon({ path: { 128: 'images/dgg_icon_offline_128.png' } })
}

let updateStorage = () => {
  chrome.storage.sync.set({ currentStatus: currentStatus }, () => { })
  chrome.storage.sync.set({ cachedStatus: cachedStatus }, () => { })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "statusNotify") {
    sendResponse('')
  }
  return true
})

let unicodeToChar = (text) => {
  return text.replace(/\\u[\dA-F]{4}/gi,
    function (match) {
      return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
    });
}

let randomId = (length) => {
  let id = []
  for (let i = 0; i < length; i++) {
    id.push(Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1))
  }
  return id.join("-")
}

let setup = async () => {
  await fetchStatus()

  const alarmDetails = { delayInMinutes: 0.2, periodInMinutes: 0.5 }

  if (currentStatus.live) {
    alarmDetails.periodInMinutes = 1 // Performance, trigger check only once every 2 minutes
  }

  chrome.alarms.create("updateAlarm", alarmDetails);
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "updateAlarm") {
      await fetchStatus()
    }
  })
}

chrome.runtime.onStartup.addListener(() => {
  setup()
})

chrome.runtime.onInstalled.addListener((details) => {
  setup()
})
