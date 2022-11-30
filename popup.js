
let docId = (id) => document.getElementById(id)

; (function connect() {
    chrome.runtime.connect({ name: 'keepAlive' })
        .onDisconnect.addListener(connect);
})();

chrome.runtime.sendMessage("statusNotify", (response) => {
    
    chrome.storage.sync.get(['currentStatus'], (result) => {
        if (result.currentStatus.live) {
            docId("status").innerHTML = "[Live] 🔴"
            docId("join").style.visibility = "visible"
            docId("streamTitle").innerHTML = result.currentStatus.streamTitle
            docId("streamTitle").style.visibility = "visible"
            docId("image").src = "images/dggl_smol.png"
        } else {
            docId("status").innerHTML = "[Offline]"
            docId("image").src = "images/dggl_smol_sleeping.png"
        }
    });

})

docId("yt").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://youtube.com/@destiny" })
})

docId("dgg").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://destiny.gg" })
})

docId("reddit").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://reddit.com/r/Destiny" })
})

docId("join").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://www.destiny.gg/bigscreen" })
})

docId("settings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage(() => {})
})
