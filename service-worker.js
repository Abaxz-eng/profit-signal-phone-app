self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Profit Signal", {
    body: data.body || "A new closed-candle signal is ready.",
    icon: "./icon.svg",
    badge: "./icon.svg",
    tag: data.tag || "profit-signal",
    data: {url: data.url || "./"},
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || "./"));
});
