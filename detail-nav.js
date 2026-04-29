(() => {
  if (window.__eminusDetailBackInjected) return;
  window.__eminusDetailBackInjected = true;

  if (!location.pathname.startsWith("/aplicativoEminus/actividad-detalle")) {
    return;
  }

  const btn = document.createElement("button");
  btn.id = "ep-back-home-btn";
  btn.type = "button";
  btn.textContent = "Volver a Eminus";
  btn.addEventListener("click", () => {
    window.location.assign(`${location.origin}/eminus4/page/course/list`);
  });

  document.body.appendChild(btn);
})();
