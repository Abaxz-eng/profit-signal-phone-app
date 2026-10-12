const $ = (selector) => document.querySelector(selector);
const isPagesPreview = location.hostname.endsWith("github.io");

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function formatTime(seconds) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(new Date(seconds * 1000));
}

function renderSignals(signals) {
  const list = $("#signal-list");
  if (!signals.length) {
    list.innerHTML = '<p class="empty">No 5/5 signals received yet.</p>';
    return;
  }
  list.innerHTML = signals.map((signal) => {
    const result = signal.result || {};
    const action = signal.action.toLowerCase();
    return `<article class="signal-item">
      <span class="action ${action}">${signal.action}</span>
      <span>XAUUSD · H1<small>SL ${result.stop ?? "—"} · TP ${result.target ?? "—"}</small></span>
      <time>${formatTime(signal.received_at)}</time>
    </article>`;
  }).join("");

  const latest = signals[0];
  const latestResult = latest.result || {};
  $("#latest-action").textContent = `${latest.action} 5/5`;
  $("#latest-time").textContent = `Closed signal · ${formatTime(latest.received_at)}`;
  $("#latest-stop").textContent = latestResult.stop ?? "—";
  $("#latest-target").textContent = latestResult.target ?? "—";
  $("#latest-levels").hidden = false;
  $(".signal-band").className = `signal-band ${latest.action.toLowerCase()}`;
}

async function refresh() {
  if (isPagesPreview) {
    $("#connection").textContent = "Preview";
    $("#connection").className = "status online";
    $("#notification-help").textContent = "Interface preview. Live alerts connect after the secure API is published.";
    $("#enable-notifications").textContent = "Preview";
    $("#subscriber-count").textContent = "0";
    renderSignals([]);
    return;
  }
  try {
    const response = await fetch("/api/status", {cache: "no-store"});
    const data = await response.json();
    $("#connection").textContent = "Online";
    $("#connection").className = "status online";
    $("#mode").textContent = data.trading_enabled ? "Demo auto" : "Dry run";
    $("#subscriber-count").textContent = data.subscribers;
    renderSignals(data.signals);
  } catch {
    $("#connection").textContent = "Offline";
    $("#connection").className = "status";
  }
}

async function enableNotifications() {
  const status = $("#notification-status");
  const button = $("#enable-notifications");
  const setupCode = $("#setup-code").value.trim();
  if (isPagesPreview) {
    status.textContent = "This is the safe GitHub preview. Live notifications use the private API address.";
    return;
  }
  if (!/^\d{6}$/.test(setupCode)) {
    status.textContent = "Enter the six-digit setup code shown on the computer.";
    return;
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    status.textContent = "Push notifications are not supported in this browser. Install the app first on iPhone.";
    return;
  }
  button.disabled = true;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission was not granted.");
    const registration = await navigator.serviceWorker.ready;
    const keyResponse = await fetch("/api/push/key");
    const {public_key: publicKey} = await keyResponse.json();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({setup_code: setupCode, subscription}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not enable notifications.");
    status.textContent = "Notifications enabled on this phone.";
    await refresh();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js");
$("#enable-notifications").addEventListener("click", enableNotifications);
$("#refresh").addEventListener("click", refresh);
refresh();
setInterval(refresh, 60000);
