const status = document.querySelector("#offline-status"),
  install = document.querySelector("#install-app"),
  update = document.querySelector("#update-app");
let installPrompt, registration;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  install.hidden = false;
});
install.onclick = async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  install.hidden = true;
};
window.addEventListener("appinstalled", () => {
  install.hidden = true;
});
update.onclick = () => {
  if (registration?.waiting) {
    const apply = () => location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", apply, {
      once: true,
    });
    registration.waiting.postMessage({ type: "APPLY_UPDATE" });
  }
};
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      registration = await navigator.serviceWorker.register("./sw.js", {
        scope: "./",
        updateViaCache: "none",
      });
      const check = () => {
        update.hidden = !registration.waiting;
        if (registration.waiting) status.textContent = "Update available";
        else if (registration.active)
          status.textContent = "Ready for offline use";
      };
      check();
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", check);
      });
      await navigator.serviceWorker.ready;
      check();
    } catch {
      status.textContent = "Offline setup unavailable";
    }
  });
} else status.textContent = "Online browser mode";
