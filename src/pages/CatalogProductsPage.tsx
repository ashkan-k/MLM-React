import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Badge, FieldHint, Modal, PageHeader } from '../components/ui'
import { confirmAction } from '../lib/confirm'
import { api } from '../lib/api'

type Product = {
  id: number
  type: string
  label: string
  requires_merchant: boolean
  sale_points: number
  default_code?: string | null
  signup_url?: string | null
  aliases?: string | null
  is_system: boolean
  is_active: boolean
}

type Form = {
  type: string
  label: string
  requires_merchant: boolean
  sale_points: string
  default_code: string
  signup_url: string
  aliases: string
  is_active: boolean
}

const emptyForm = (): Form => ({
  type: '',
  label: '',
  requires_merchant: false,
  sale_points: '0',
  default_code: '',
  signup_url: '',
  aliases: '',
  is_active: true,
})

function fromProduct(product: Product): Form {
  return {
    type: product.type,
    label: product.label,
    requires_merchant: product.requires_merchant,
    sale_points: String(product.sale_points ?? 0),
    default_code: product.default_code ?? '',
    signup_url: product.signup_url ?? '',
    aliases: product.aliases ?? '',
    is_active: product.is_active,
  }
}

export function CatalogProductsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Form>(emptyForm())
  const { data, isLoading } = useQuery({
    queryKey: ['catalog-products-admin'],
    queryFn: async () => (await api.get('/superuser/products')).data as Product[],
  })

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['catalog-products-admin'] })
    qc.invalidateQueries({ queryKey: ['catalog-products'] })
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        sale_points: Number(form.sale_points || 0),
        signup_url: form.signup_url.trim() || null,
        default_code: form.default_code.trim() || null,
        aliases: form.aliases.trim() || null,
      }
      if (editing) return api.put(`/superuser/products/${editing.id}`, payload)
      return api.post('/superuser/products', payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'محصول به‌روز شد' : 'محصول ثبت شد')
      setOpen(false)
      refresh()
    },
    onError: (error: { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }) => {
      const errors = error.response?.data?.errors
      toast.error(errors?.type?.[0] ?? errors?.label?.[0] ?? errors?.signup_url?.[0] ?? errors?.aliases?.[0] ?? error.response?.data?.message ?? 'ثبت محصول انجام نشد')
    },
  })

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/superuser/products/${id}`),
    onSuccess: () => {
      toast.success('محصول حذف شد')
      refresh()
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message ?? 'حذف محصول انجام نشد')
    },
  })

  const openForm = (product?: Product) => {
    setEditing(product ?? null)
    setForm(product ? fromProduct(product) : emptyForm())
    setOpen(true)
  }

  const askRemove = async (product: Product) => {
    if (!await confirmAction({ title: 'حذف محصول', text: `«${product.label}» حذف شود؟`, confirmText: 'حذف شود' })) return
    remove.mutate(product.id)
  }

  const rows = data ?? []

  return (
    <div className="space-y-4" data-testid="catalog-products-page">
      <PageHeader
        title="محصولات"
        subtitle="هر محصولی که اینجا فعال باشد در وب‌هوک، فیلتر تراکنش‌ها و لینک ثبت فروش استفاده می‌شود."
        action={<button type="button" className="btn btn-primary" data-testid="catalog-product-open" onClick={() => openForm()}><Plus className="w-4 h-4" /> محصول جدید</button>}
      />
      {isLoading && <div className="text-sm text-surface-500">در حال بارگذاری...</div>}
      <div className="grid gap-3">
        {rows.map((product) => (
          <article key={product.id} data-testid="catalog-product-row" className="card p-4 flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <div className="font-semibold text-surface-800 dark:text-surface-100 wrap-anywhere">{product.label}</div>
              <div className="text-xs text-surface-500 mt-1 wrap-anywhere" dir="ltr">{product.type}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge tone={product.is_active ? 'ok' : 'muted'}>{product.is_active ? 'فعال' : 'غیرفعال'}</Badge>
                <Badge tone="info">{product.requires_merchant ? 'با مرچنت' : 'با مالک'}</Badge>
                {product.is_system && <Badge tone="muted">سیستمی</Badge>}
              </div>
              {product.signup_url && <div className="text-xs text-primary-700 dark:text-primary-300 mt-2 wrap-anywhere" dir="ltr">{product.signup_url}</div>}
            </div>
            <div className="flex items-center shrink-0">
              <button type="button" className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-surface-400 hover:text-primary-600" aria-label="ویرایش محصول" onClick={() => openForm(product)}><Pencil className="w-4 h-4" /></button>
              {!product.is_system && (
                <button type="button" className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-surface-400 hover:text-rose-600" aria-label="حذف محصول" onClick={() => askRemove(product)}><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          </article>
        ))}
      </div>

      <Modal open={open} title={editing ? 'ویرایش محصول' : 'محصول جدید'} subtitle="این مشخصات در وب‌هوک، فیلتر تراکنش و لینک ثبت فروش استفاده می‌شود." onClose={() => setOpen(false)}>
        <div className="grid gap-3">
          <label className="field">نام نمایشی
            <input className="input" data-testid="catalog-product-label" placeholder="قالب بازار" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <FieldHint>در فهرست محصولات، فیلتر تراکنش‌ها و انتخاب لینک ثبت فروش دیده می‌شود.</FieldHint>
          </label>
          <label className="field">شناسه وب‌هوک
            <input className="input" data-testid="catalog-product-type" dir="ltr" placeholder="ghalebazar" value={form.type} disabled={Boolean(editing?.is_system)} onChange={(e) => setForm({ ...form, type: e.target.value.trim().toLowerCase() })} />
            <FieldHint>همان product_type است. فقط حرف کوچک انگلیسی، عدد و _. برای محصول سیستمی قابل تغییر نیست.</FieldHint>
          </label>
          <div className="grid gap-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" data-testid="catalog-product-merchant" checked={form.requires_merchant} onChange={(e) => setForm({ ...form, requires_merchant: e.target.checked })} />
              فروش با کد مرچنت شناخته می‌شود
            </label>
            <FieldHint>روشن باشد: وب‌هوک باید merchant_id بفرستد، مثل درگاه. خاموش باشد: کد ملی مالک لازم است.</FieldHint>
          </div>
          <label className="field">لینک ثبت‌نام
            <input className="input" data-testid="catalog-product-signup" dir="ltr" placeholder="https://ghalebazar.ir/account/profile" value={form.signup_url} onChange={(e) => setForm({ ...form, signup_url: e.target.value })} />
            <FieldHint>اگر پر شود، در «لینک ثبت فروش» همین آدرس به‌همراه کد معرف نشان داده می‌شود.</FieldHint>
          </label>
          <label className="field">کد محصول پیش‌فرض
            <input className="input" dir="ltr" placeholder="GHALEBAZAR" value={form.default_code} onChange={(e) => setForm({ ...form, default_code: e.target.value })} />
            <FieldHint>اگر وب‌هوک product_code نفرستد، همین مقدار روی تراکنش ذخیره می‌شود.</FieldHint>
          </label>
          <label className="field">شناسه‌های دیگر
            <input className="input" dir="ltr" placeholder="ticket,tickets" value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} />
            <FieldHint>اگر طرف مقابل نام دیگری بفرستد، با ویرگول جدا کنید تا همان محصول شناخته شود.</FieldHint>
          </label>
          <label className="field">امتیاز هر فروش
            <input className="input" inputMode="numeric" value={form.sale_points} onChange={(e) => setForm({ ...form, sale_points: e.target.value.replace(/[^\d]/g, '') })} />
            <FieldHint>با هر فروش موفق برای نمایندگان ثبت می‌شود. صفر یعنی این محصول امتیاز ندارد.</FieldHint>
          </label>
          <div className="grid gap-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" data-testid="catalog-product-active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              محصول فعال است
            </label>
            <FieldHint>فقط محصول فعال در وب‌هوک پذیرفته می‌شود و لینک ثبت‌نامش نمایش داده می‌شود.</FieldHint>
          </div>
          <button type="button" className="btn btn-primary" data-testid="catalog-product-save" disabled={save.isPending} onClick={() => save.mutate()}>ذخیره</button>
        </div>
      </Modal>
    </div>
  )
}
