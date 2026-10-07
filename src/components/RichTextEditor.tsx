import { CKEditor } from '@ckeditor/ckeditor5-react'
import {
  Alignment,
  BlockQuote,
  Bold,
  ButtonView,
  ClassicEditor,
  Essentials,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  ListProperties,
  MediaEmbed,
  Paragraph,
  PasteFromOffice,
  Plugin,
  SimpleUploadAdapter,
  SourceEditing,
  Strikethrough,
  Table,
  TableCaption,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  Underline,
  type EditorConfig,
} from 'ckeditor5'
import { useMemo } from 'react'
import 'ckeditor5/ckeditor5.css'
import { api } from '../lib/api'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  disabled?: boolean
}

/** Toolbar button: upload any file → image block or download link. */
class UploadFilePlugin extends Plugin {
  public static get pluginName() {
    return 'UploadFilePlugin' as const
  }

  public init() {
    const editor = this.editor
    editor.ui.componentFactory.add('uploadFile', (locale) => {
      const view = new ButtonView(locale)
      view.set({
        label: 'آپلود فایل',
        tooltip: true,
        withText: true,
      })
      view.on('execute', () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.mp4,.webm,.mp3'
        input.onchange = async () => {
          const file = input.files?.[0]
          if (!file) return
          try {
            const fd = new FormData()
            fd.append('upload', file, file.name)
            const { data } = await api.post<{ url: string }>('/manage/course-editor/upload', fd, {
              timeout: 300000,
              maxBodyLength: Infinity,
              maxContentLength: Infinity,
            })
            const url = data.url
            const isImage = /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name) || file.type.startsWith('image/')
            editor.model.change((writer) => {
              const pos = editor.model.document.selection.getFirstPosition()
              if (!pos) return
              if (isImage) {
                const imageElement = writer.createElement('imageBlock', { src: url })
                editor.model.insertContent(imageElement, pos)
              } else {
                writer.insertText(file.name, { linkHref: url }, pos)
              }
            })
          } catch (e) {
            console.error(e)
            window.alert('آپلود فایل ناموفق بود.')
          }
        }
        input.click()
      })
      return view
    })
  }
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 180, disabled }: Props) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('finopal.token') : null

  const config = useMemo((): EditorConfig => ({
    licenseKey: 'GPL',
    plugins: [
      Essentials,
      Paragraph,
      Bold,
      Italic,
      Underline,
      Strikethrough,
      Link,
      List,
      ListProperties,
      Heading,
      BlockQuote,
      Alignment,
      Indent,
      IndentBlock,
      FontSize,
      FontFamily,
      FontColor,
      FontBackgroundColor,
      HorizontalLine,
      Table,
      TableToolbar,
      TableProperties,
      TableCellProperties,
      TableColumnResize,
      TableCaption,
      Image,
      ImageToolbar,
      ImageCaption,
      ImageStyle,
      ImageResize,
      ImageUpload,
      SimpleUploadAdapter,
      MediaEmbed,
      PasteFromOffice,
      GeneralHtmlSupport,
      SourceEditing,
      UploadFilePlugin,
    ],
    toolbar: {
      items: [
        'heading', '|',
        'bold', 'italic', 'underline', 'strikethrough', '|',
        'fontFamily', 'fontSize', 'fontColor', 'fontBackgroundColor', '|',
        'alignment', '|',
        'bulletedList', 'numberedList', 'outdent', 'indent', '|',
        'link', 'uploadImage', 'uploadFile', 'mediaEmbed', 'insertTable', 'blockQuote', 'horizontalLine', '|',
        'sourceEditing', '|',
        'undo', 'redo',
      ],
      shouldNotGroupWhenFull: true,
    },
    language: 'fa',
    placeholder: placeholder || 'متن را وارد کنید…',
    simpleUpload: {
      uploadUrl: '/api/manage/course-editor/upload',
      withCredentials: false,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    image: {
      toolbar: [
        'imageTextAlternative',
        'toggleImageCaption',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side',
        'resizeImage',
      ],
    },
    table: {
      contentToolbar: [
        'tableColumn', 'tableRow', 'mergeTableCells', '|',
        'tableProperties', 'tableCellProperties',
      ],
    },
    htmlSupport: {
      // Keep Word-pasted styles/classes/tables so layout does not collapse.
      allow: [
        { name: /.*/, attributes: true, classes: true, styles: true },
      ],
    },
    fontFamily: {
      supportAllValues: true,
    },
    fontSize: {
      options: [10, 12, 14, 'default', 18, 20, 24, 28, 32],
      supportAllValues: true,
    },
    list: {
      properties: {
        styles: true,
        startIndex: true,
        reversed: true,
      },
    },
    link: {
      addTargetToExternalLinks: true,
      defaultProtocol: 'https://',
    },
    mediaEmbed: {
      previewsInData: true,
    },
  }), [placeholder, token])

  return (
    <div
      className={`rich-text-editor rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden bg-white dark:bg-surface-900 ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
      style={{ ['--rte-min-height' as string]: `${minHeight}px` }}
      data-testid="rich-text-editor"
    >
      <CKEditor
        editor={ClassicEditor}
        data={value || ''}
        config={config}
        disabled={disabled}
        onChange={(_evt, editor) => {
          onChange(editor.getData())
        }}
      />
      <style>{`
        .rich-text-editor .ck-editor__editable {
          min-height: var(--rte-min-height, 180px);
          direction: rtl;
          text-align: right;
          font-family: Vazirmatn, Tahoma, sans-serif;
        }
        .rich-text-editor .ck.ck-toolbar {
          direction: rtl;
          flex-wrap: wrap;
        }
        .rich-text-editor .ck-content img {
          max-width: 100%;
          height: auto;
        }
        .rich-text-editor .ck-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .rich-html img { max-width: 100%; height: auto; border-radius: 0.75rem; }
        .rich-html a { color: #2563eb; text-decoration: underline; }
        .rich-html p { margin: 0 0 0.75rem; }
        .rich-html ul, .rich-html ol { padding-inline-start: 1.25rem; margin: 0 0 0.75rem; }
        .rich-html table { width: 100%; border-collapse: collapse; margin-bottom: 0.75rem; }
        .rich-html td, .rich-html th { border: 1px solid #e2e8f0; padding: 0.4rem 0.6rem; vertical-align: top; }
        .rich-html figure.table { margin: 0 0 1rem; overflow-x: auto; }
        .rich-text-editor .ck-content table { width: 100%; }
      `}</style>
    </div>
  )
}

/** Render trusted admin HTML from CKEditor in member views. */
export function RichHtml({ html, className = '' }: { html?: string | null; className?: string }) {
  if (!html?.trim()) return null
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(html)
  if (!looksHtml) {
    return <p className={`text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap m-0 leading-7 ${className}`}>{html}</p>
  }
  return (
    <div
      className={`rich-html text-sm text-surface-700 dark:text-surface-200 leading-7 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function stripHtml(html?: string | null) {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}
