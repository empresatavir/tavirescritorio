(() => {
  const token = decodeURIComponent(location.pathname.split("/").filter(Boolean).pop() || "");
  const button = document.querySelector("[data-confirm]");
  const show = (state) => {
    document.querySelectorAll("[data-state]").forEach((el) => { el.hidden = el.dataset.state !== state; });
    if (state !== "idle") button.hidden = true;
  };
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      const res = await fetch("/api/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      show(res.ok ? "ok" : "error");
    } catch {
      button.disabled = false;
    }
  });
})();
