/*
 * Admin HTML patches. Medusa hardcodes `/app` to `navigate("/orders")` and has
 * no widget slot on the product create page, so the only seam left is the HTML
 * the dashboard bundles boot from. Delete these together with the plugin entry
 * in medusa-config.ts if Medusa makes either configurable.
 */

/* Vite's plugin shape, spelled out: the admin config is CommonJS and cannot
 * import a type from the ESM-only package. */
type AdminHtmlScript = {
  tag: "script"
  injectTo: "head-prepend"
  children: string
}

type AdminHtmlPlugin = {
  name: string
  transformIndexHtml: {
    order: "pre"
    handler: () => AdminHtmlScript[]
  }
}

export const adminLandingPlugin = (
  base: string | undefined = "/app"
): AdminHtmlPlugin => ({
  name: "dtc-admin-landing",
  transformIndexHtml: {
    order: "pre",
    handler: () => [
      {
        tag: "script",
        injectTo: "head-prepend",
        children: landingScript(base),
      },
      {
        tag: "script",
        injectTo: "head-prepend",
        children: adminShimsScript(base),
      },
    ],
  },
})

const basePath = (base: string | undefined) => {
  const root = (base ?? "/app").replace(/\/+$/, "")

  return root || "/"
}

const landingScript = (base: string) => {
  const root = basePath(base)
  const dashboard = `${root}/dashboard`
  const orders = `${root}/orders`
  const login = `${root}/login`

  return `
(function () {
  var ROOT = ${JSON.stringify(root)}
  var DASHBOARD = ${JSON.stringify(dashboard)}
  var ORDERS = ${JSON.stringify(orders)}
  var LOGIN = ${JSON.stringify(login)}
  var isRoot = function (path) {
    return path === ROOT || path === ROOT + "/"
  }
  var isLogin = function (path) {
    return path === LOGIN || path === LOGIN + "/"
  }

  if (isRoot(window.location.pathname)) {
    window.location.replace(DASHBOARD)
    return
  }

  var wrap = function (name) {
    var original = window.history[name]
    window.history[name] = function (state, title, url) {
      if (url != null) {
        var next = new URL(String(url), window.location.href)
        var leavingLogin = isLogin(window.location.pathname)

        if (isRoot(next.pathname) || (leavingLogin && next.pathname === ORDERS)) {
          window.location.replace(DASHBOARD)
          return
        }
      }
      return original.apply(this, arguments)
    }
  }

  wrap("pushState")
  wrap("replaceState")
})()
`.trim()
}

/*
 * Product create page: Medusa 2.21 has no widget zone there, so a markdown
 * textarea is appended to the Details step and its text rides along in the
 * create request as metadata.details.
 * Inventory list: the deprecated table replaces the search input on every
 * refetch, which drops the caret; focus is restored after the swap.
 * Import drawer: "Download sample file" points at the dashboard's own CSV, so
 * that anchor is retargeted to /static/product-import-template.csv.
 */
const adminShimsScript = (base: string) => {
  const root = basePath(base)
  const create = `${root}/products/create`
  const inventory = `${root}/inventory`

  return `
(function () {
  var CREATE = ${JSON.stringify(create)}
  var INVENTORY = ${JSON.stringify(inventory)}
  var TEMPLATE = "/static/product-import-template.csv"
  var DRAFT_KEY = "dtc:product-details-draft"
  var AT_CREATE = /\\/admin\\/products\\/?$/

  var isAt = function (path, target) {
    return path === target || path === target + "/"
  }

  /* The Details step, found by the tab's aria-controls value rather than its
   * label. The modal is mounted twice, so the panel is hit-tested. */
  var detailsColumn = function () {
    var tabs = document.querySelectorAll('[role="tab"][aria-selected="true"]')
    var columns = []

    var reachable = function (panel) {
      var rect = panel.getBoundingClientRect()

      if (!rect.width || !rect.height) {
        return false
      }

      var hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      )

      return !!hit && panel.contains(hit)
    }

    for (var i = 0; i < tabs.length; i++) {
      var controls = tabs[i].getAttribute("aria-controls") || ""

      if (!/-content-details$/.test(controls)) {
        continue
      }

      var panel = document.getElementById(controls)

      /* A panel the wizard keeps mounted but closed has no box. */
      if (!panel || !panel.getBoundingClientRect().width) {
        continue
      }

      var heading = panel.querySelector("h1, h2")
      var section = heading && heading.parentElement
      var column = section && section.parentElement

      if (!column) {
        continue
      }

      if (reachable(panel)) {
        return column
      }

      columns.push(column)
    }

    return columns.length ? columns[columns.length - 1] : null
  }

  var card = null
  var field = null

  var readDraft = function () {
    try {
      return window.sessionStorage.getItem(DRAFT_KEY) || ""
    } catch (error) {
      return ""
    }
  }

  var writeDraft = function (value) {
    try {
      if (value) {
        window.sessionStorage.setItem(DRAFT_KEY, value)
      } else {
        window.sessionStorage.removeItem(DRAFT_KEY)
      }
    } catch (error) {
      /* Storage can be blocked; the editor still works. */
    }
  }

  var mountCard = function () {
    if (!isAt(window.location.pathname, CREATE)) {
      return
    }

    var column = detailsColumn()

    if (!column) {
      return
    }

    /* React may rebuild the form, so re-attach instead of rebuilding. */
    if (card) {
      if (!column.contains(card)) {
        column.appendChild(card)
      }
      return
    }

    card = document.createElement("div")
    card.setAttribute("data-testid", "product-details-card")
    card.className = "flex flex-col gap-y-2"

    var title = document.createElement("h2")
    title.className = "font-sans font-medium h2-core"
    title.textContent = "Details"
    card.appendChild(title)

    var description = document.createElement("p")
    description.className = "font-sans txt-compact-small text-ui-fg-subtle"
    description.innerHTML =
      "Shown under the product photos on the storefront. " +
      "<strong>Markdown only</strong> — <code>## heading</code>, " +
      "<code>**bold**</code>, <code>- bullet</code>, " +
      "<code>[text](url)</code>."
    card.appendChild(description)

    var example = document.createElement("pre")
    example.className =
      "bg-ui-bg-subtle border-ui-border-base txt-compact-small text-ui-fg-subtle overflow-x-auto rounded-md border p-2"
    example.style.margin = "0"
    example.textContent = [
      "## What it is",
      "",
      "A short paragraph about the product, then a list:",
      "",
      "- first point",
      "- second point",
    ].join(String.fromCharCode(10))
    card.appendChild(example)

    field = document.createElement("textarea")
    field.setAttribute("data-testid", "product-details-draft")
    field.className =
      "caret-ui-fg-base bg-ui-bg-field hover:bg-ui-bg-field-hover " +
      "shadow-borders-base placeholder-ui-fg-muted text-ui-fg-base " +
      "transition-fg relative w-full appearance-none rounded-md outline-none " +
      "focus-visible:shadow-borders-interactive-with-active txt-small px-2 py-1.5"
    field.rows = 10
    field.style.minHeight = "200px"
    field.style.resize = "vertical"
    field.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, monospace"
    field.placeholder = "Write the details in Markdown — the example above is the shape."
    field.value = readDraft()
    field.addEventListener("input", function (event) {
      writeDraft(event.target.value)
    })
    card.appendChild(field)

    var footer = document.createElement("div")
    footer.className = "flex items-center justify-between gap-x-4"

    var hint = document.createElement("p")
    hint.className = "font-sans txt-compact-small text-ui-fg-subtle"
    hint.textContent =
      "New to Markdown? Write the text in any online Markdown editor " +
      "(Dillinger, StackEdit), copy the result and paste it here. " +
      "Saved onto the product as soon as you create it; hidden while empty."
    footer.appendChild(hint)

    var clear = document.createElement("button")
    clear.type = "button"
    clear.setAttribute("data-testid", "product-details-clear")
    clear.className =
      "font-sans txt-compact-small text-ui-fg-subtle hover:text-ui-fg-base " +
      "shrink-0 underline"
    clear.textContent = "Clear"
    clear.addEventListener("click", function () {
      writeDraft("")
      if (field) {
        field.value = ""
        field.focus()
      }
    })
    footer.appendChild(clear)

    card.appendChild(footer)
    column.appendChild(card)
  }

  var unmountCard = function () {
    if (!card) {
      return
    }

    /* Leaving the page keeps the draft; the product is not created yet. */
    if (field) {
      writeDraft(field.value)
    }

    card.remove()
    card = null
    field = null
  }

  /* Details go into the create request body itself, so no second call has to
   * win a race against the navigation that follows creation. */
  var patchCreate = function () {
    var original = window.fetch

    if (typeof original !== "function") {
      return
    }

    window.fetch = function (input, init) {
      var added = false

      try {
        /* fetch can receive a string, a URL (href) or a Request (url). */
        var url =
          typeof input === "string"
            ? input
            : input && typeof input.href === "string"
              ? input.href
              : (input && input.url) || ""
        var method = String(
          (init && init.method) || (input && input.method) || "GET"
        ).toUpperCase()
        var target = new URL(url, window.location.href)
        var draft = readDraft().trim()

        if (
          draft &&
          method === "POST" &&
          AT_CREATE.test(target.pathname) &&
          init &&
          typeof init.body === "string"
        ) {
          var payload = JSON.parse(init.body)

          if (payload && typeof payload === "object") {
            var metadata =
              payload.metadata && typeof payload.metadata === "object"
                ? payload.metadata
                : {}

            metadata.details = draft
            payload.metadata = metadata
            added = true
            init = Object.assign({}, init, {
              body: JSON.stringify(payload),
            })
          }
        }
      } catch (error) {
        console.warn("[dtc] product details were not added to the create request", error)
      }

      var response = original.call(this, input, init)

      /* The draft is only dropped once the store has the product. */
      if (added && response && typeof response.then === "function") {
        response
          .then(function (result) {
            if (result && result.ok) {
              writeDraft("")
              if (field) {
                field.value = ""
              }
            }
          })
          .catch(function () {})
      }

      return response
    }
  }

  var typing = false
  var pending = 0
  var typingUntil = 0

  var isSearch = function (node) {
    return (
      !!node &&
      node.tagName === "INPUT" &&
      node.getAttribute("name") === "q" &&
      node.type === "search"
    )
  }

  /* The new input arrives after the query returns, so retry across frames;
   * the deadline stops it chasing an input the user has left. */
  var restoreFocus = function () {
    if (!typing) {
      return
    }

    if (Date.now() > typingUntil) {
      typing = false
      return
    }

    var next = document.querySelector('input[name="q"][type="search"]')

    if (isSearch(document.activeElement)) {
      typing = false
      return
    }

    if (!next) {
      if (!pending) {
        pending = window.requestAnimationFrame(function () {
          pending = 0
          restoreFocus()
        })
      }
      return
    }

    next.focus()
    var end = next.value.length
    try {
      next.setSelectionRange(end, end)
    } catch (error) {
      /* Some inputs refuse a range; focus alone is enough. */
    }
    typing = false
  }

  var rememberTyping = function (event) {
    if (isAt(window.location.pathname, INVENTORY) && isSearch(event.target)) {
      typing = true
      typingUntil = Date.now() + 3000
    }
  }

  var watchInventory = function () {
    if (!isAt(window.location.pathname, INVENTORY)) {
      typing = false
      return
    }

    if (isSearch(document.activeElement)) {
      typing = true
      typingUntil = Date.now() + 3000
      return
    }

    if (typing) {
      restoreFocus()
    }
  }

  /* Match by download name so the uploaded file's own preview is left alone. */
  var retargetTemplate = function () {
    var links = document.querySelectorAll(
      'a[download="product-import-template.csv"]'
    )

    for (var i = 0; i < links.length; i++) {
      if (links[i].getAttribute("href") !== TEMPLATE) {
        links[i].setAttribute("href", TEMPLATE)
      }
    }
  }

  var boot = function () {
    try {
      if (isAt(window.location.pathname, CREATE)) {
        mountCard()
      } else {
        unmountCard()
      }
    } catch (error) {
      console.warn("[dtc] product details section could not be mounted", error)
    }

    try {
      watchInventory()
    } catch (error) {
      console.warn("[dtc] inventory search focus is unpatched", error)
    }

    try {
      retargetTemplate()
    } catch (error) {
      console.warn("[dtc] import template link is unpatched", error)
    }
  }

  try {
    patchCreate()
  } catch (error) {
    console.warn("[dtc] product details could not be saved on create", error)
  }

  try {
    var observer = new MutationObserver(boot)
    observer.observe(document.documentElement, { childList: true, subtree: true })
    window.addEventListener("popstate", boot)
    document.addEventListener("input", rememberTyping, true)
    document.addEventListener("keydown", rememberTyping, true)
  } catch (error) {
    console.warn("[dtc] admin shims are not watching the page", error)
  }

  /*
   * The dashboard navigates with its router rather than page loads, so a cheap
   * interval is what notices that the create page or the inventory list came
   * into view.
   */
  window.setInterval(boot, 500)
})()
`.trim()
}
