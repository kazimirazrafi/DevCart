import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import Link from "@tiptap/extension-link"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { marked } from "marked"
import { useState } from "react"
import TurndownService from "turndown"

import { sdk } from "../lib/sdk"

/*
 * The product's long-form details, stored as markdown in
 * product.metadata.details. The editor and the markdown tab are two views of
 * one value; turndown and marked convert between them.
 */
const EMPTY_DOCUMENT = ""

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
})

/** The stored field as a string, whatever the metadata holds. */
const storedDetails = (metadata: AdminProduct["metadata"]): string => {
  const value = metadata?.details

  return typeof value === "string" ? value.trim() : EMPTY_DOCUMENT
}

/** Editor HTML to stored markdown. */
const toMarkdown = (html: string): string =>
  turndown
    .turndown(html)
    // Turndown pads list markers and adds blank lines between items.
    .replace(/^(\s*)([-*+]|\d+\.) {2,}/gm, "$1$2 ")
    .replace(/\n[ \t]+\n(?=[ \t]*([-*+]|\d+\.) )/g, "\n")
    // An empty document serialises as a stray newline.
    .replace(/\n{3,}/g, "\n\n")
    .trim()

/** Stored markdown to editor HTML. */
const toHtml = (markdown: string): string =>
  markdown ? (marked.parse(markdown) as string) : ""

const ProductDetailsEditorWidget = ({
  data: product,
}: DetailWidgetProps<AdminProduct>) => {
  const queryClient = useQueryClient()
  const initial = storedDetails(product.metadata)

  const [mode, setMode] = useState<"write" | "markdown">("write")
  const [markdown, setMarkdown] = useState(initial)
  /* The editor does not re-render on update, so bump a counter to do it. */
  const [revision, setRevision] = useState(0)

  const editor = useEditor({
    /* The widget module is also evaluated during the build; without this the
     * editor hydrates with a mismatched document. */
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: toHtml(initial),
    onUpdate: () => setRevision((current) => current + 1),
    editorProps: {
      attributes: {
        class: [
          "min-h-[220px] px-4 py-3 outline-none",
          "text-ui-fg-base text-sm leading-6",
          "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-medium",
          "[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-medium",
          "[&_p]:my-2",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-6",
          "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-6",
          "[&_li]:my-1",
          "[&_blockquote]:my-3 [&_blockquote]:border-s-2 [&_blockquote]:border-ui-border-base [&_blockquote]:ps-3 [&_blockquote]:text-ui-fg-subtle",
          "[&_code]:rounded [&_code]:bg-ui-bg-subtle [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
          "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-ui-bg-subtle [&_pre]:p-3",
          "[&_a]:text-ui-fg-interactive [&_a]:underline",
          "[&_hr]:my-4 [&_hr]:border-ui-border-base",
          "[&_strong]:font-medium",
        ].join(" "),
      },
    },
  })

  /* Reading revision is what re-runs this after an editor update. */
  void revision

  const currentMarkdown =
    mode === "markdown" || !editor
      ? markdown.trim()
      : toMarkdown(editor.getHTML())

  const showMarkdown = () => {
    if (!editor || mode === "markdown") {
      return
    }

    setMarkdown(toMarkdown(editor.getHTML()))
    setMode("markdown")
  }

  const showEditor = () => {
    if (mode === "write") {
      return
    }

    editor?.commands.setContent(toHtml(markdown))
    setMode("write")
  }

  const save = useMutation({
    mutationFn: () =>
      sdk.admin.product.update(product.id, {
        // The rest of the product's metadata has to travel with the write:
        // `update` replaces the object rather than merging into it.
        metadata: { ...product.metadata, details: currentMarkdown },
      }),
    onSuccess: () => {
      toast.success("Product details saved")
      queryClient.invalidateQueries({ queryKey: ["product", product.id] })
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not save the details")
    },
  })

  const dirty = currentMarkdown !== initial

  const setLink = () => {
    if (!editor) {
      return
    }

    const previous = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link address", previous ?? "")

    if (url === null) {
      return
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  const actions: {
    label: string
    isActive?: boolean
    can: boolean
    run: () => void
  }[] = editor
    ? [
        {
          label: "Bold",
          isActive: editor.isActive("bold"),
          can: editor.can().chain().focus().toggleBold().run(),
          run: () => editor.chain().focus().toggleBold().run(),
        },
        {
          label: "Italic",
          isActive: editor.isActive("italic"),
          can: editor.can().chain().focus().toggleItalic().run(),
          run: () => editor.chain().focus().toggleItalic().run(),
        },
        {
          label: "Strike",
          isActive: editor.isActive("strike"),
          can: editor.can().chain().focus().toggleStrike().run(),
          run: () => editor.chain().focus().toggleStrike().run(),
        },
        {
          label: "H2",
          isActive: editor.isActive("heading", { level: 2 }),
          can: editor.can().chain().focus().toggleHeading({ level: 2 }).run(),
          run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          label: "H3",
          isActive: editor.isActive("heading", { level: 3 }),
          can: editor.can().chain().focus().toggleHeading({ level: 3 }).run(),
          run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        {
          label: "Bullets",
          isActive: editor.isActive("bulletList"),
          can: editor.can().chain().focus().toggleBulletList().run(),
          run: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          label: "Numbers",
          isActive: editor.isActive("orderedList"),
          can: editor.can().chain().focus().toggleOrderedList().run(),
          run: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          label: "Quote",
          isActive: editor.isActive("blockquote"),
          can: editor.can().chain().focus().toggleBlockquote().run(),
          run: () => editor.chain().focus().toggleBlockquote().run(),
        },
        {
          label: "Code",
          isActive: editor.isActive("codeBlock"),
          can: editor.can().chain().focus().toggleCodeBlock().run(),
          run: () => editor.chain().focus().toggleCodeBlock().run(),
        },
        {
          label: "Link",
          isActive: editor.isActive("link"),
          // Always available: the address is asked for when the button is
          // pressed, so there is no state in which setting a link is invalid.
          can: true,
          run: setLink,
        },
        {
          label: "Undo",
          can: editor.can().chain().focus().undo().run(),
          run: () => editor.chain().focus().undo().run(),
        },
        {
          label: "Redo",
          can: editor.can().chain().focus().redo().run(),
          run: () => editor.chain().focus().redo().run(),
        },
      ]
    : []

  const error = save.error instanceof Error ? save.error.message : null

  return (
    <Container className="divide-y p-0" data-testid="product-details-editor">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2">Product details</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            The long-form section shown below the photos on the storefront.
            Format with the toolbar; no markdown knowledge needed.
          </Text>
        </div>

        <div className="flex gap-2">
          <Button
            size="small"
            variant={mode === "write" ? "primary" : "secondary"}
            onClick={showEditor}
            data-testid="details-mode-write"
          >
            Write
          </Button>
          <Button
            size="small"
            variant={mode === "markdown" ? "primary" : "secondary"}
            onClick={showMarkdown}
            data-testid="details-mode-markdown"
          >
            Markdown
          </Button>
        </div>
      </div>

      {mode === "write" ? (
        <div className="flex flex-col">
          <div
            className="flex flex-wrap items-center gap-1 border-b border-ui-border-base bg-ui-bg-subtle px-3 py-2"
            role="toolbar"
            aria-label="Formatting"
          >
            {actions.map((action) => (
              <Button
                key={action.label}
                type="button"
                size="small"
                variant={action.isActive ? "secondary" : "transparent"}
                disabled={!action.can}
                onClick={action.run}
                title={action.label}
                aria-pressed={action.isActive}
              >
                {action.label}
              </Button>
            ))}
          </div>

          <div className="m-6 rounded-md border border-ui-border-base bg-ui-bg-base">
            <EditorContent editor={editor} />
          </div>

          {!editor && (
            <div className="px-6 pb-4">
              <Text size="small" className="text-ui-fg-subtle">
                Loading the editor…
              </Text>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-6 py-4">
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            Markdown, saved exactly as typed. Switch back to Write to see it
            formatted.
          </Text>
          <textarea
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck
            rows={14}
            className="w-full rounded-md border border-ui-border-base bg-ui-bg-base p-3 font-mono text-xs leading-5 outline-none focus:border-ui-border-interactive"
            placeholder={"## Materials\n\n- 100% organic cotton"}
            data-testid="details-markdown-input"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Text size="small" leading="compact" className="text-ui-fg-subtle">
          {error
            ? error
            : dirty
              ? "Unsaved changes."
              : "Saved. This section is hidden on the storefront while it is empty."}
        </Text>

        <Button
          size="small"
          variant="primary"
          isLoading={save.isPending}
          disabled={save.isPending || !dirty}
          onClick={() => save.mutate()}
          data-testid="details-save"
        >
          Save details
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details",
})

export default ProductDetailsEditorWidget
