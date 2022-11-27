// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
let restorePreference = () => {
    // Use default value color = 'red' and likesColor = true.
    chrome.storage.sync.get(['notificationOption'], (result) => {

    })
}
document.addEventListener('DOMContentLoaded', restorePreference);
document.getElementById('save').addEventListener('click', () => {
    const notifications = document.getElementById("notifications").value
    console.log(notifications)
    chrome.storage.sync.set({
         notificationOption: notifications
    }, () => {});
});