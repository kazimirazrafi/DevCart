/*
 * The dashboard hardcodes its name in the title, the sign-in heading and an
 * inline logo, with no branding setting, so the boot HTML rewrites them. Only
 * text nodes are touched, and never inside fields or editors.
 */
type AdminHtmlPlugin = {
  name: string
  transformIndexHtml: {
    order: "pre"
    handler: () => {
      tag: "script"
      injectTo: "head-prepend"
      children: string
    }[]
  }
}

export const adminBrandingPlugin = (
  storeName = "DevCart"
): AdminHtmlPlugin => ({
  name: "dtc-admin-branding",
  transformIndexHtml: {
    order: "pre",
    handler: () => [
      {
        tag: "script",
        injectTo: "head-prepend",
        children: brandingScript(storeName),
      },
    ],
  },
})

const brandingScript = (storeName: string) => {
  return `
(function () {
  var NAME = ${JSON.stringify(storeName)}
  var VENDOR = "Medusa"

  /* The shop's monogram, matching the sidebar avatar. */
  var mark = [
    '<rect width="400" height="400" fill="#18181B"></rect>',
    '<text x="200" y="272" text-anchor="middle" font-family="Georgia, serif"',
    ' font-size="210" font-weight="600" fill="#FAFAF9">D</text>',
  ].join("")

  var favicon =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect width="64" height="64" fill="#18181B"></rect>' +
        '<text x="32" y="45" text-anchor="middle" font-family="Georgia, serif"' +
        ' font-size="38" font-weight="600" fill="#FAFAF9">D</text>' +
        "</svg>"
    )

  var replaceVendor = function (text) {
    return text.indexOf(VENDOR) === -1 ? text : text.split(VENDOR).join(NAME)
  }

  var skip = function (node) {
    for (var el = node.parentElement; el; el = el.parentElement) {
      var tag = el.tagName

      if (
        tag === "SCRIPT" ||
        tag === "STYLE" ||
        tag === "TEXTAREA" ||
        tag === "INPUT" ||
        tag === "OPTION" ||
        el.isContentEditable
      ) {
        return true
      }
    }

    return false
  }

  var rewrite = function (root) {
    if (!root || root.nodeType !== 1) {
      return
    }

    var logo = root.querySelector
      ? root.querySelector('svg[viewBox="0 0 400 400"]')
      : null

    if (logo && !logo.dataset.dtcMark) {
      logo.dataset.dtcMark = "1"
      logo.innerHTML = mark
    }

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    var nodes = []

    while (walker.nextNode()) {
      var node = walker.currentNode

      if (node.nodeValue && node.nodeValue.indexOf(VENDOR) !== -1 && !skip(node)) {
        nodes.push(node)
      }
    }

    for (var i = 0; i < nodes.length; i += 1) {
      nodes[i].nodeValue = replaceVendor(nodes[i].nodeValue)
    }
  }

  var rewriteTitle = function () {
    if (document.title.indexOf(VENDOR) !== -1) {
      document.title = replaceVendor(document.title)
    }
  }

  var icon = document.createElement("link")
  icon.rel = "icon"
  icon.href = favicon
  document.head.appendChild(icon)

  var observer = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i += 1) {
      var record = records[i]

      if (record.type === "characterData") {
        var target = record.target

        if (
          target.nodeValue &&
          target.nodeValue.indexOf(VENDOR) !== -1 &&
          !skip(target)
        ) {
          target.nodeValue = replaceVendor(target.nodeValue)
        }
      } else if (record.type === "childList") {
        for (var j = 0; j < record.addedNodes.length; j += 1) {
          rewrite(record.addedNodes[j])
        }
      }
    }
  })

  var start = function () {
    rewriteTitle()
    rewrite(document.body)

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    })

    var title = document.querySelector("title")

    if (title) {
      new MutationObserver(rewriteTitle).observe(title, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start)
  } else {
    start()
  }
})()
`.trim()
}
