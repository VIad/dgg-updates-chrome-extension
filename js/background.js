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

let fetchStatus = async (isInitial) => {
  return chrome.storage.local.get(['notificationOption', 'lastUpdated'])
    .then(async storage => {
      if (shouldUpdate(storage['lastUpdated'], isInitial)) {
        await fetch('https://www.youtube.com/@destiny')
          .then(r => r.text())
          .then(result => {
            currentStatus.live = result.includes("hqdefault_live.jpg")
            if (currentStatus.live) {
              determineStreamTitle(result)
            }
            checkStatusChanged(storage ? (storage['notificationOption'] || 'all') : 'all')
            applyIcon()
            cachedStatus.setTo(currentStatus)
            updateStorage()
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
    })

}

let shouldUpdate = (lastUpdated, isInitial) => {
  const now = new Date().getTime()
  return (now - lastUpdated >= 44000) || !lastUpdated || isInitial
}

let shouldRestart = (lastUpdated) => {
  return new Date().getTime() - lastUpdated > 60000 * 5 // 5 minutes since last update
}

let shouldRebootAlarm = (lastUpdated) => {
  if (!lastUpdated) {
    return false
  }
  return new Date().getTime() - lastUpdated > 60000 * 30 // once every 30 minutes 
}

let checkStatusChanged = (notificationOption) => {
  if (currentStatus.live !== cachedStatus.live) {
    if (notificationOption !== 'none') {
      const message = 'DESTINY IS NOW ' + (currentStatus.live ? 'LIVE' : 'OFFLINE')
      notifyUser(message, currentStatus.live ? currentStatus.streamTitle : '')
    }
  }

  if (currentStatus.streamTitle !== cachedStatus.streamTitle && cachedStatus.live && currentStatus.streamTitle != '') {
    if (notificationOption === 'all') {
      notifyUser('NOW STREAMING', currentStatus.streamTitle)
    }
  }
}

let notifyUser = (title, str) => {
  chrome.notifications.create(randomId(3), {
    type: 'basic',
    iconUrl: '../images/dgg_icon.png',
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
      { color: '#00FF00' },
      () => { },
    );
  } else {
    chrome.action.setBadgeText({ text: "​" }, () => { })
    chrome.action.setBadgeBackgroundColor(
      { color: '#F00' },
      () => { },
    );
  }
}

let updateStorage = () => {
  let lastUpdated = new Date().getTime()
  chrome.storage.local.set({ currentStatus, cachedStatus, lastUpdated }, () => { })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message === "dgg-status-notify") {
    sendResponse('') // Don't care, this is just to trigger local storage fetch of title and status for popup
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

  applyIcon()

  await fetchStatus(true)

  const alarmDetails = { delayInMinutes: 0.1, periodInMinutes: 0.75 }

  chrome.alarms.create("dgg-status-update-alarm", alarmDetails);
  chrome.alarms.onAlarm.addListener(alarmListener)
  chrome.storage.local.set({ lastAlarmUpdate: new Date().getTime() })
}

let alarmListener = async (alarm) => {
  if (alarm.name === "dgg-status-update-alarm") {
    await fetchStatus(false)
  }
}

chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: "https://destiny.gg/bigscreen" })
})

chrome.runtime.onStartup.addListener(() => {
  setup()
})

chrome.runtime.onInstalled.addListener((details) => {
  setup()
})

chrome.management.onEnabled.addListener(() => {
  setup()
});

chrome.tabs.onActivated.addListener(async info => {

  chrome.storage.local.get(['lastUpdated', 'lastAlarmUpdate'])
    .then(result => {
      if (shouldRestart(result['lastUpdated'])) {
        chrome.runtime.reload()
      }
      if (shouldRebootAlarm(result['lastAlarmUpdate'])) {
        chrome.alarms.clearAll().then(() => {
          const alarmDetails = { delayInMinutes: 0.1, periodInMinutes: 0.75 }

          chrome.alarms.create("dgg-status-update-alarm", alarmDetails);
          chrome.alarms.onAlarm.addListener(alarmListener)
          chrome.storage.local.set({ lastAlarmUpdate: new Date().getTime() }, () => { })
        })
      }
    })

})


/*
 * Keep V3 extension persistent
 * Hack borrowed from here: https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
 * 
 * Other part in popup.js
 */
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

