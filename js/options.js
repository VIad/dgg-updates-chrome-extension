document.getElementById('save').addEventListener('click', () => {
    const notifications = document.getElementById("notifications").value

    var status = document.getElementById('status');
    status.textContent = 'Saved preference: '+notifications;
    setTimeout(() => {
      status.textContent = '';
    }, 750);

    chrome.storage.local.set({
         notificationOption: notifications
    }, () => {});
});