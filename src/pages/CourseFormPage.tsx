import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { RichTextEditor } from '../components/RichTextEditor'
import { FieldHint, PageHeader } from '../components/ui'
import { useApp } from '../contexts/AppContext'
import { api } from '../lib/api'

type CourseChapter = {
  id?: number
  client_key: string
  title: string
  sort_order: number
  content_type?: string
  content_body?: string
  content_url?: string
  attachment_name?: string
  attachment_url?: string
  pending_file_name?: string | null
}

type CourseLevel = {
  id?: number
  title: string
  sort_order: number
  passing_score: number
  chapters?: CourseChapter[]
}

type CourseRow = {
  id: number
  title: string
  description?: string
  is_required_for_promotion: boolean
  levels?: Array<CourseLevel & { chapters?: Array<Omit<CourseChapter, 'client_key'> & { id?: number }> }>
  roles?: Array<{ id: number; name: string }>
}

const CONTENT_TYPES = [
  { value: 'html', label: 'متن غنی' },
  { value: 'text', label: 'متن ساده' },
  { value: 'video', label: 'ویدیو' },
  { value: 'pdf', label: 'PDF' },
  { value: 'file', label: 'فایل' },
]

const MAX_CHAPTER_FILE_MB = 100
const newClientKey = () => `ch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const emptyChapter = (n = 1): CourseChapter => ({
  client_key: newClientKey(),
  title: `فصل ${n}`,
  sort_order: n,
  content_type: 'html',
  content_body: '',
  content_url: '',
  pending_file_name: null,
})
const emptyLevel = (): CourseLevel => ({ title: 'سطح ۱', sort_order: 1, passing_score: 70, chapters: [emptyChapter(1)] })
const emptyForm = () => ({
  title: '',
  description: '',
  is_required_for_promotion: true,
  role_ids: [] as number[],
  levels: [emptyLevel()],
})

export function CourseFormPage() {
  const { t } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const { courseId } = useParams()
  const editingId = courseId ? Number(courseId) : null
  // Strip /new or /:id/edit so we always land on the courses list (same role prefix).
  const listPath = location.pathname.replace(/\/new\/?$/, '').replace(/\/[^/]+\/edit\/?$/, '') || '..'

  const { data: roles } = useQuery({ queryKey: ['manage-roles'], queryFn: async () => (await api.get('/manage/roles')).data })
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['admin-course', editingId],
    enabled: Boolean(editingId),
    queryFn: async () => {
      const list = (await api.get('/manage/courses')).data as CourseRow[]
      const row = list.find((c) => c.id === editingId)
      if (!row) throw new Error('not found')
      return row
    },
  })

  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(!editingId)
  const chapterFilesRef = useRef<Record<string, File>>({})

  useEffect(() => {
    if (!editingId) {
      setForm(emptyForm())
      chapterFilesRef.current = {}
      setReady(true)
      return
    }
    if (!course) return
    chapterFilesRef.current = {}
    setForm({
      title: course.title,
      description: course.description ?? '',
      is_required_for_promotion: course.is_required_for_promotion,
      role_ids: course.roles?.map((r) => r.id) ?? [],
      levels: (course.levels ?? []).map((l, i) => {
        const chapters = (l.chapters ?? []).length
          ? (l.chapters ?? []).map((ch, ci) => ({
            id: ch.id,
            client_key: newClientKey(),
            title: ch.title,
            sort_order: ch.sort_order ?? ci + 1,
            content_type: ch.content_type ?? 'html',
            content_body: ch.content_body ?? '',
            content_url: ch.content_url ?? '',
            attachment_name: ch.attachment_name,
            attachment_url: ch.attachment_url,
            pending_file_name: null,
          }))
          : [emptyChapter(1)]
        return {
          id: l.id,
          title: l.title,
          sort_order: l.sort_order ?? i + 1,
          passing_score: Number(l.passing_score),
          chapters,
        }
      }),
    })
    setReady(true)
  }, [course, editingId])

  const setLevel = (index: number, patch: Partial<CourseLevel>) => {
    setForm((prev) => ({ ...prev, levels: prev.levels.map((level, i) => (i === index ? { ...level, ...patch } : level)) }))
  }

  const setChapter = (levelIndex: number, chapterIndex: number, patch: Partial<CourseChapter>) => {
    setForm((prev) => ({
      ...prev,
      levels: prev.levels.map((level, i) => {
        if (i !== levelIndex) return level
        const chapters = (level.chapters ?? []).map((ch, j) => (j === chapterIndex ? { ...ch, ...patch } : ch))
        return { ...level, chapters }
      }),
    }))
  }

  const save = async () => {
    if (saving) return
    if (!form.title.trim()) {
      toast.error('عنوان دوره الزامی است.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description,
        is_required_for_promotion: form.is_required_for_promotion,
        role_ids: form.role_ids,
        levels: form.levels.map((l, i) => ({
          id: l.id,
          title: l.title,
          sort_order: i + 1,
          passing_score: l.passing_score,
          chapters: (l.chapters ?? []).map((ch, ci) => ({
            id: ch.id,
            title: ch.title || `فصل ${ci + 1}`,
            sort_order: ci + 1,
            content_type: ch.content_type === 'text' ? 'html' : (ch.content_type ?? 'html'),
            content_body: ch.content_body ?? '',
            content_url: ch.content_url ?? '',
          })),
        })),
      }
      const saved = editingId
        ? (await api.put(`/manage/courses/${editingId}`, payload, { timeout: 120000 })).data
        : (await api.post('/manage/courses', payload, { timeout: 120000 })).data

      const uploads: Promise<unknown>[] = []
      for (const [levelIndex, level] of form.levels.entries()) {
        const savedLevel = saved?.levels?.[levelIndex]
          ?? saved?.levels?.find((sl: { id?: number }) => sl.id && level.id && sl.id === level.id)
        if (!savedLevel) continue
        for (const [chapterIndex, chapter] of (level.chapters ?? []).entries()) {
          const file = chapterFilesRef.current[chapter.client_key]
          if (!file) continue
          const savedChapter = (chapter.id
            ? savedLevel.chapters?.find((c: { id?: number }) => c.id === chapter.id)
            : null) ?? savedLevel.chapters?.[chapterIndex]
          const chapterId = savedChapter?.id
          if (!chapterId) {
            toast.error(`فصل «${chapter.title}» ذخیره شد ولی شناسه فایل پیدا نشد.`)
            continue
          }
          const fd = new FormData()
          fd.append('file', file, file.name || 'upload.bin')
          uploads.push(api.post(`/manage/course-chapters/${chapterId}/file`, fd, {
            timeout: 300000,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          }))
        }
      }
      if (uploads.length) {
        toast.message(`در حال آپلود ${uploads.length.toLocaleString('fa-IR')} فایل…`)
        await Promise.all(uploads)
      }

      chapterFilesRef.current = {}
      toast.success(editingId ? 'دوره ویرایش شد' : 'دوره ساخته شد')
      qc.invalidateQueries({ queryKey: ['admin-courses'] })
      navigate(listPath)
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.code === 'ERR_CANCELED' || err.message === 'Request aborted') {
          toast.error('درخواست قطع شد. فایل را دوباره انتخاب کنید و ذخیره را بزنید.')
        } else {
          const msg = (err.response?.data as { message?: string; errors?: Record<string, string[]> })?.message
            ?? Object.values((err.response?.data as { errors?: Record<string, string[]> })?.errors ?? {}).flat()[0]
            ?? err.message
          toast.error(msg || 'ذخیره دوره ناموفق بود')
        }
      } else {
        toast.error('ذخیره دوره ناموفق بود')
      }
    } finally {
      setSaving(false)
    }
  }

  if (editingId && (courseLoading || !ready)) {
    return <div className="card p-8 text-center text-surface-500">در حال بارگذاری دوره…</div>
  }

  return (
    <div className="space-y-4" data-testid="course-form-page">
      <PageHeader
        title={editingId ? 'ویرایش دوره' : 'ایجاد دوره'}
        subtitle="دوره → سطح → فصل. شرح دوره و متن آموزشی با ویرایشگر پیشرفته قابل ویرایش‌اند."
        action={(
          <Link to={listPath} className="btn btn-ghost inline-flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            بازگشت به فهرست
          </Link>
        )}
      />

      <form
        className="grid gap-5"
        data-testid="course-form"
        onSubmit={async (e) => { e.preventDefault(); await save() }}
      >
        <section className="card p-5 grid gap-4">
          <div className="font-bold text-lg">اطلاعات دوره</div>
          <label className="field">عنوان دوره
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </label>
          <div className="field">
            <span className="mb-1.5 block">شرح دوره</span>
            <RichTextEditor
              value={form.description}
              onChange={(html) => setForm({ ...form, description: html })}
              placeholder="توضیح دوره برای اعضا…"
              minHeight={160}
              disabled={saving}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_required_for_promotion} onChange={(e) => setForm({ ...form, is_required_for_promotion: e.target.checked })} />
            برای ارتقاء الزامی باشد
          </label>
          <div className="field">نقش‌های هدف
            <FieldHint>دوره فقط برای نقش‌های انتخاب‌شده در پنل آموزش دیده می‌شود.</FieldHint>
            <div className="flex flex-wrap gap-3 mt-2">
              {(roles ?? []).map((r: { id: number; name: string }) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.role_ids.includes(r.id)}
                    onChange={(e) => setForm({
                      ...form,
                      role_ids: e.target.checked ? [...form.role_ids, r.id] : form.role_ids.filter((id) => id !== r.id),
                    })}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-lg">سطح‌ها و فصل‌ها</div>
              <FieldHint>کاربر تا تکمیل هر سطح/فصل نمی‌تواند به مورد بعدی برود.</FieldHint>
            </div>
            <button
              type="button"
              className="btn btn-ghost inline-flex items-center gap-2"
              onClick={() => setForm({
                ...form,
                levels: [...form.levels, { ...emptyLevel(), title: `سطح ${form.levels.length + 1}`, sort_order: form.levels.length + 1 }],
              })}
            >
              <Plus className="w-4 h-4" /> افزودن سطح
            </button>
          </div>

          {form.levels.map((level, i) => (
            <div key={level.id ?? `level-${i}`} className="card p-5 grid gap-4" data-testid={`course-level-${i}`}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-surface-200 dark:border-surface-700 pb-3">
                <div className="font-extrabold text-base">سطح {i + 1}</div>
                <button
                  type="button"
                  className="btn btn-ghost text-red-600 inline-flex items-center gap-1"
                  disabled={form.levels.length <= 1}
                  onClick={() => setForm({ ...form, levels: form.levels.filter((_, idx) => idx !== i) })}
                >
                  <Trash2 className="w-4 h-4" /> حذف سطح
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="field">عنوان سطح
                  <input className="input" value={level.title} onChange={(e) => setLevel(i, { title: e.target.value })} />
                </label>
                <label className="field">نمره قبولی (از ۱۰۰)
                  <input className="input" type="number" min={0} max={100} value={level.passing_score} onChange={(e) => setLevel(i, { passing_score: Number(e.target.value) })} />
                </label>
              </div>

              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">فصل‌های این سطح</div>
                  <button
                    type="button"
                    className="btn btn-ghost text-sm inline-flex items-center gap-1"
                    data-testid={`add-chapter-${i}`}
                    onClick={() => {
                      const n = (level.chapters ?? []).length + 1
                      setLevel(i, { chapters: [...(level.chapters ?? []), emptyChapter(n)] })
                    }}
                  >
                    <Plus className="w-4 h-4" /> افزودن فصل
                  </button>
                </div>

                {(level.chapters ?? []).map((chapter, ci) => (
                  <div
                    key={chapter.client_key}
                    className="rounded-2xl border border-surface-200 dark:border-surface-700 p-4 grid gap-3 bg-surface-50/70 dark:bg-surface-800/40"
                    data-testid={`course-chapter-${i}-${ci}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-semibold text-sm">فصل {ci + 1}</div>
                      <button
                        type="button"
                        className="btn btn-ghost text-sm text-red-600"
                        disabled={(level.chapters ?? []).length <= 1}
                        onClick={() => {
                          delete chapterFilesRef.current[chapter.client_key]
                          setLevel(i, { chapters: (level.chapters ?? []).filter((_, idx) => idx !== ci) })
                        }}
                      >
                        حذف فصل
                      </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <label className="field">عنوان فصل
                        <input className="input" value={chapter.title} onChange={(e) => setChapter(i, ci, { title: e.target.value })} />
                      </label>
                      <label className="field">نوع محتوا
                        <select className="input" value={chapter.content_type ?? 'html'} onChange={(e) => setChapter(i, ci, { content_type: e.target.value })}>
                          {CONTENT_TYPES.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="field">
                      <span className="mb-1.5 block">متن آموزشی</span>
                      <RichTextEditor
                        value={chapter.content_body ?? ''}
                        onChange={(html) => setChapter(i, ci, { content_body: html, content_type: 'html' })}
                        placeholder="متن، تصویر و لینک آموزشی…"
                        minHeight={220}
                        disabled={saving}
                      />
                    </div>
                    <label className="field">لینک ویدیو یا فایل آنلاین
                      <input className="input" dir="ltr" placeholder="https://..." value={chapter.content_url ?? ''} onChange={(e) => setChapter(i, ci, { content_url: e.target.value })} />
                    </label>
                    <div className="grid gap-2">
                      <label className="field">آپلود فایل ضمیمه فصل (PDF، ویدیو، تصویر، … — حداکثر {MAX_CHAPTER_FILE_MB} مگابایت)
                        <input
                          className="input"
                          type="file"
                          accept="video/*,audio/*,image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.mp4,.webm,.mp3"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            if (file && file.size > MAX_CHAPTER_FILE_MB * 1024 * 1024) {
                              toast.error(`حجم فایل باید حداکثر ${MAX_CHAPTER_FILE_MB} مگابایت باشد.`)
                              e.target.value = ''
                              delete chapterFilesRef.current[chapter.client_key]
                              setChapter(i, ci, { pending_file_name: null })
                              return
                            }
                            if (file) chapterFilesRef.current[chapter.client_key] = file
                            else delete chapterFilesRef.current[chapter.client_key]
                            setChapter(i, ci, {
                              pending_file_name: file?.name ?? null,
                              content_type: file?.type?.startsWith('video/') ? 'video' : (chapter.content_type ?? 'html'),
                            })
                          }}
                        />
                      </label>
                      {chapter.pending_file_name ? (
                        <div className="text-sm text-emerald-700 dark:text-emerald-400">
                          فایل انتخاب‌شده: <span className="font-semibold">{chapter.pending_file_name}</span>
                        </div>
                      ) : chapter.attachment_url ? (
                        <a className="text-sm text-primary-600 font-semibold w-fit" href={chapter.attachment_url} target="_blank" rel="noreferrer">
                          فایل فعلی: {chapter.attachment_name || 'دانلود / باز کردن'}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="sticky bottom-3 z-10 flex flex-wrap gap-2 justify-end card p-3 shadow-lg">
          <Link to={listPath} className="btn btn-ghost" onClick={(e) => { if (saving) e.preventDefault() }}>انصراف</Link>
          <button className="btn btn-primary min-w-36" type="submit" disabled={saving}>
            {saving ? 'در حال ذخیره…' : (editingId ? 'ذخیره تغییرات' : 'ثبت دوره')}
          </button>
        </div>
      </form>
      <span className="sr-only">{t('adminCoursesTitle')}</span>
    </div>
  )
}
