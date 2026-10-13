// Service worker de RHA: recibe las notificaciones y abre la app al tocarlas.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let datos = { titulo: "RHA", cuerpo: "", url: "/" };
  try {
    datos = { ...datos, ...evento.data.json() };
  } catch {
    if (evento.data) datos.cuerpo = evento.data.text();
  }
  evento.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: "/iconos/rha-192.png",
      badge: "/iconos/rha-192.png",
      tag: datos.etiqueta,
      data: { url: datos.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL(evento.notification.data?.url || "/", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ("focus" in v) {
          v.navigate(url);
          return v.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
