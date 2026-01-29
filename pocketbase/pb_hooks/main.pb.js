/// <reference path="../pb_data/types.d.ts" />

/**
 * PocketBase Hook: SPA Routing
 * 
 * Este hook garante que todas as rotas do SPA (Single Page Application)
 * sejam redirecionadas para o index.html correto, permitindo que o
 * Vue Router gerencie as rotas do lado do cliente.
 */

routerAdd("GET", "/*", (c) => {
  const path = c.request().url.path

  // Servir a API do PocketBase normalmente
  if (path.startsWith("/api/") || path.startsWith("/_/")) {
    return c.next()
  }

  // Servir arquivos estáticos (JS, CSS, imagens, etc.)
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/)) {
    return c.next()
  }

  // Para rotas do web app (/app/*), servir o index.html do app
  if (path.startsWith("/app/") || path === "/app") {
    return c.redirect(302, "/app/index.html")
  }

  // Para todas as outras rotas, servir o index.html da landing page
  return c.next()
}, $apis.requireGuestOnly())
