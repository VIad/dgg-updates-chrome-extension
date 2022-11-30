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

      chrome.storage.sync.get(['notificationOption'], (notificationOption) => {
        checkStatusChanged(notificationOption)
        applyIcon()
        cachedStatus.setTo(currentStatus)
        updateStorage()
      })
    })
    .catch((error) => {
      currentStatus.live = false
      currentStatus.streamTitle = ''
      checkStatusChanged()
      applyIcon()
      cachedStatus.setTo(currentStatus)
      updateStorage()
    })
}

let checkStatusChanged = (notificationOption) => {
    const notificationLevel = notificationOption['notificationOption'] || 'all'
    if (currentStatus.live !== cachedStatus.live) {
      if (notificationLevel !== 'none') {
        const message = 'DESTINY IS NOW ' + (currentStatus.live ? 'LIVE' : 'OFFLINE')
        notifyUser(message, currentStatus.live ? currentStatus.streamTitle : '')
      }
    }

    if (currentStatus.streamTitle !== cachedStatus.streamTitle && cachedStatus.live && currentStatus.streamTitle != '') {
      if (notificationLevel === 'all') {
        notifyUser('NOW STREAMING', currentStatus.streamTitle)
      }
    }
}

let notifyUser = (title, str) => {
  chrome.notifications.create(randomId(3), {
    type: 'basic',
    iconUrl: 'images/dgg_icon.png',
    title: title,
    message: str,
    priority: 2
  })
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
  if (currentStatus.live) {
    chrome.action.setBadgeText({ text: "​" }, () => { })
    chrome.action.setBadgeBackgroundColor(
      { color: '#00FF00' },  // Green
      () => { },
    );
  } else {
    chrome.action.setBadgeText({ text: "​" }, () => { })
    chrome.action.setBadgeBackgroundColor(
      { color: '#F00' },  // Red
      () => { },
    );
  }
}

let updateStorage = () => {
  chrome.storage.sync.set({ currentStatus: currentStatus }, () => { })
  chrome.storage.sync.set({ cachedStatus: cachedStatus }, () => { })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "statusNotify") {
    sendResponse('') // Don't care, this is just to trigger sync storage fetch of title and status for popup
  }
  return true
})

let unicodeToChar = (text) => {
  return text.replace(/\\u[\dA-F]{4}/gi,
    (match) => {
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
    alarmDetails.periodInMinutes = 1 // Performance, trigger check only once every 1 minute
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

chrome.action.onClicked.addListener((tab) => {
  setup()
});


const onUpdate = (tabId, info, tab) => /^https?:/.test(info.url) && findTab([tab]);
findTab();
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'keepAlive') {
    setTimeout(() => port.disconnect(), 250e3);
    port.onDisconnect.addListener(() => findTab());
  }
});
async function findTab(tabs) {
  if (chrome.runtime.lastError) { /* tab was closed before setTimeout ran */ }
  for (const { id: tabId } of tabs || await chrome.tabs.query({ url: '*://*/*' })) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, func: connect });
      chrome.tabs.onUpdated.removeListener(onUpdate);
      return;
    } catch (e) { }
  }
  chrome.tabs.onUpdated.addListener(onUpdate);
}
function connect() {
  chrome.runtime.connect({ name: 'keepAlive' })
    .onDisconnect.addListener(connect);
}

