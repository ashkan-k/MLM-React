import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { gwNewKey, useProductOriented } from '../lib/productMode'
import { useApp } from '../contexts/AppContext'
import { useAuth } from '../stores/auth'
import { JalaliDatePicker } from './JalaliDatePicker'
import { SearchSelect } from './SearchSelect'
import { FieldLabel } from './ui'

type Docs = {
  national_id_front?: File | null
  national_id_back?: File | null
  selfie?: File | null
  gazette?: File | null
  official_letter?: File | null
  company_statute?: File | null
}

type VipOption = { id: number; title: string }
type VipEnum = { value: string; label: string }

const emptyForm = {
  ownership: 'solo',
  name: '',
  shared_link_id: '',
  representative_user_id: '',
  person_type: 'real',
  first_name: '',
  last_name: '',
  first_name_en: '',
  last_name_en: '',
  mobile: '',
  email: '',
  national_id: '',
  father_name: '',
  father_name_en: '',
  birth_date: '',
  birth_certificate_no: '',
  gender: '0',
  postal_code: '',
  state_id: '',
  city_id: '',
  province: '',
  city: '',
  address: '',
  address_title: 'محل کسب',
  phone: '',
  sheba: '',
  backup_sheba: '',
  shop_name: '',
  shop_name_en: '',
  category_id: '',
  website: '',
  callback_url: '',
  server_ip: '',
  tax: '',
  company_name: '',
  company_name_en: '',
  registration_no: '',
  register_date: '',
  economic_code: '',
  legal_national_id: '',
}

function FileField({
  label,
  file,
  onChange,
  required,
}: {
  label: string
  file?: File | null
  onChange: (file: File | null) => void
  required?: boolean
}) {
  const [preview, setPreview] = useState<string | null>(null)
  const image = file ? file.type.startsWith('image/') : false

  useEffect(() => {
    if (!file || !image) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file, image])

  return (
    <div className="field">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input className="input" type="file" accept="image/*,.pdf" required={required && !file} onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
      {file && (
        <div className="flex items-center gap-3 mt-1">
          {preview ? (
            <img src={preview} alt="" className="w-20 h-20 object-cover rounded-lg border border-surface-200 dark:border-surface-600" />
          ) : (
            <div className="w-20 h-20 rounded-lg border border-surface-200 dark:border-surface-600 flex items-center justify-center text-[11px] text-surface-400">PDF</div>
          )}
          <div className="min-w-0 text-xs text-surface-500">
            <div className="truncate font-medium text-surface-700 dark:text-surface-200">{file.name}</div>
            <button type="button" className="text-red-500 mt-1" onClick={() => onChange(null)}>حذف فایل</button>
          </div>
        </div>
      )}
    </div>
  )
}

const FIELD_LABELS: Record<string, string> = {
  name: 'نام درگاه',
  'customer.name': 'نام متقاضی',
  'customer.mobile': 'موبایل',
  'customer.national_id': 'کد ملی',
  'customer.sheba': 'شبا',
  'customer.email': 'ایمیل',
  'customer.province': 'استان',
  'customer.city': 'شهر',
  'customer.address': 'نشانی',
  'customer.postal_code': 'کد پستی',
  'customer.phone': 'تلفن ثابت',
  'customer.shop_name': 'نام فروشگاه',
  'customer.shop_category': 'صنف / دسته',
  'customer.company_name': 'نام شرکت',
  'customer.registration_no': 'شماره ثبت',
  'customer.economic_code': 'شناسه اقتصادی',
  'customer.legal_national_id': 'شناسه ملی شرکت',
  'documents.national_id_front': 'تصویر روی کارت ملی',
  'documents.national_id_back': 'تصویر پشت کارت ملی',
  'documents.birth_certificate': 'تصویر شناسنامه',
  'documents.selfie': 'سلفی احراز هویت',
  'documents.gazette': 'روزنامه رسمی',
  'documents.license': 'مجوز / پروانه کسب',
  shared_link_id: 'لینک اشتراکی',
  representative_user_id: 'نماینده',
}

const FA_TO_EN: Record<string, string> = {
  ا: 'a', آ: 'a', ب: 'b', پ: 'p', ت: 't', ث: 's', ج: 'j', چ: 'ch', ح: 'h', خ: 'kh', د: 'd', ذ: 'z',
  ر: 'r', ز: 'z', ژ: 'zh', س: 's', ش: 'sh', ص: 's', ض: 'z', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f',
  ق: 'gh', ک: 'k', ك: 'k', گ: 'g', ل: 'l', م: 'm', ن: 'n', و: 'v', ه: 'h', ی: 'y', ي: 'y', ئ: 'y',
}

function toLatin(value: string): string {
  let out = ''
  for (const char of value.normalize('NFKC')) {
    if (FA_TO_EN[char]) out += FA_TO_EN[char]
    else if (/[A-Za-z0-9]/.test(char)) out += char
    else if (char === ' ' || char === '-') out += char
    else if (/[۰-۹]/.test(char)) out += String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char))
  }
  out = out.replace(/\s+/g, ' ').trim()
  if (!out) return ''
  return out.replace(/(^|\s)([a-z])/g, (_, space: string, letter: string) => space + letter.toUpperCase())
}

const EN_FROM_FA = {
  first_name_en: 'first_name',
  last_name_en: 'last_name',
  father_name_en: 'father_name',
  shop_name_en: 'shop_name',
  company_name_en: 'company_name',
} as const

function landlinePhone(value: string): string | null {
  const raw = value.replace(/\s/g, '')
  if (/^0\d{2}-\d{8}$/.test(raw)) return raw
  const digits = raw.replace(/\D/g, '')
  if (/^0\d{10}$/.test(digits)) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return null
}

function normalizeSheba(value: string): string {
  return value.replace(/[\s\-]/g, '').toUpperCase()
}

function isValidSheba(value: string): boolean {
  return /^(IR)?[0-9]{24}$/i.test(normalizeSheba(value))
}

function apiFieldErrors(error: unknown): Record<string, string> {
  const ax = error as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } }
  if (ax.response?.status !== 422 || !ax.response.data?.errors) return {}
  const out: Record<string, string> = {}
  Object.entries(ax.response.data.errors).forEach(([key, messages]) => {
    const msg = messages.find(Boolean)
    if (msg) out[key] = String(msg)
  })
  return out
}

function apiErrorMessage(error: unknown): string {
  const ax = error as {
    code?: string
    message?: string
    response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } }
  }
  if (!ax.response) {
    if (ax.code === 'ERR_NETWORK' || ax.message?.toLowerCase().includes('network')) {
      return 'اتصال به سرور برقرار نشد. اینترنت یا سرویس API را بررسی کنید.'
    }
    return 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.'
  }
  const status = ax.response.status ?? 0
  const data = ax.response.data
  if (status === 422 && data?.errors) {
    const lines = Object.entries(data.errors).flatMap(([key, messages]) => {
      const label = FIELD_LABELS[key] ?? key.replace(/^customer\./, '').replace(/^documents\./, '')
      return messages.filter(Boolean).map((msg) => `${label}: ${msg}`)
    })
    if (lines.length) return lines.slice(0, 5).join('\n')
  }
  if (status === 403) return data?.message || 'دسترسی مجاز نیست. نقش نماینده را فعال کنید یا عضو لینک اشتراکی باشید.'
  if (status === 401) return 'نشست شما منقضی شده؛ دوباره وارد شوید.'
  if (status >= 500) return 'خطای داخلی سرور رخ داد. لطفاً کمی بعد دوباره تلاش کنید.'
  if (data?.message && !/exception|stack|sqlstate|vendor\\/i.test(data.message)) {
    return data.message
  }
  return 'ثبت درگاه ناموفق بود. فیلدهای الزامی را بررسی کنید.'
}

export function GatewayCreateForm({ onDone, initialSharedToken }: { onDone: () => void; initialSharedToken?: string }) {
  const { t } = useApp()
  const productOriented = useProductOriented()
  const qc = useQueryClient()
  const me = useAuth((s) => s.user)
  const gatewayShareEnabled = me?.features?.shared_links?.gateway_sale_enabled !== false
  const { data: links } = useQuery({ queryKey: ['links'], queryFn: async () => (await api.get('/shared-links')).data })
  const { data: reps } = useQuery({ queryKey: ['reps'], queryFn: async () => (await api.get('/representatives')).data })
  const { data: vipRef, isError: vipRefError } = useQuery({
    queryKey: ['vip-ref'],
    queryFn: async () => (await api.get('/finopal-vip/reference')).data as {
      states: VipOption[]
      categories: VipOption[]
      enums: { gender?: VipEnum[]; entityType?: VipEnum[] }
    },
  })
  const [form, setForm] = useState(emptyForm)
  const [docs, setDocs] = useState<Docs>({})
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const enLocked = useRef<Partial<Record<keyof typeof EN_FROM_FA, boolean>>>({})
  const isLegal = form.person_type === 'legal'
  const set = (key: keyof typeof emptyForm, value: string, extra?: Partial<typeof emptyForm>) => {
    setForm((prev) => ({ ...prev, [key]: value, ...extra }))
    setFieldErrors((prev) => {
      const next = { ...prev }
      const map: Partial<Record<keyof typeof emptyForm, string>> = {
        name: 'name',
        first_name: 'customer.first_name',
        last_name: 'customer.last_name',
        first_name_en: 'customer.first_name_en',
        last_name_en: 'customer.last_name_en',
        mobile: 'customer.mobile',
        national_id: 'customer.national_id',
        sheba: 'customer.sheba',
        backup_sheba: 'customer.backup_sheba',
        email: 'customer.email',
        province: 'customer.province',
        city: 'customer.city',
        address: 'customer.address',
        postal_code: 'customer.postal_code',
        shop_name: 'customer.shop_name',
        shop_name_en: 'customer.shop_name_en',
        website: 'customer.website',
        callback_url: 'customer.callback_url',
        server_ip: 'customer.server_ip',
        tax: 'customer.tax',
        category_id: 'customer.category_id',
        company_name: 'customer.company_name',
        registration_no: 'customer.registration_no',
        economic_code: 'customer.economic_code',
        legal_national_id: 'customer.legal_national_id',
        shared_link_id: 'shared_link_id',
      }
      const errKey = map[key]
      if (errKey) delete next[errKey]
      return next
    })
  }

  const setFa = (fa: keyof typeof emptyForm, en: keyof typeof EN_FROM_FA, value: string) => {
    set(fa, value, enLocked.current[en] ? undefined : { [en]: toLatin(value) })
  }

  const setEn = (en: keyof typeof EN_FROM_FA, value: string) => {
    if (!value.trim()) {
      enLocked.current[en] = false
      set(en, toLatin(form[EN_FROM_FA[en]]))
      return
    }
    enLocked.current[en] = true
    set(en, value)
  }

  const err = (key: string) => fieldErrors[key]
  const fieldClass = (key: string) => `input${err(key) ? ' border-red-500 focus:border-red-500' : ''}`
  const ErrText = ({ k }: { k: string }) => (err(k) ? <span className="text-xs text-red-600 mt-1">{err(k)}</span> : null)

  useEffect(() => {
    if (!initialSharedToken || !links || !gatewayShareEnabled) return
    const link = (links as Array<{ id: number; token: string; type?: string; status: string }>).find(
      (l) => l.token === initialSharedToken && l.type === 'gateway_sale' && l.status === 'active',
    )
    if (link) {
      setForm((prev) => ({ ...prev, ownership: 'shared', shared_link_id: String(link.id) }))
    }
  }, [initialSharedToken, links, gatewayShareEnabled])

  const states: VipOption[] = vipRef?.states ?? []
  const categories: VipOption[] = vipRef?.categories ?? []
  const genderOptions: VipEnum[] = vipRef?.enums?.gender?.length ? vipRef.enums.gender : [
    { value: '0', label: 'مرد' },
    { value: '1', label: 'زن' },
  ]
  const entityOptions: VipEnum[] = vipRef?.enums?.entityType?.length ? vipRef.enums.entityType : [
    { value: 'real', label: 'حقیقی' },
    { value: 'legal', label: 'حقوقی' },
  ]
  const { data: cityRows } = useQuery({
    queryKey: ['vip-cities', form.state_id],
    enabled: Boolean(form.state_id),
    queryFn: async () => (await api.get('/finopal-vip/cities', { params: { state_id: form.state_id } })).data as VipOption[],
  })
  const cities: VipOption[] = cityRows ?? []

  const inquirePostal = async () => {
    if (!/^\d{10}$/.test(form.postal_code)) {
      toast.error('کد پستی باید دقیقاً ۱۰ رقم باشد.')
      return
    }
    setBusy(true)
    try {
      const { data } = await api.post('/finopal-vip/postal-inquiry', { postal_code: form.postal_code })
      setForm((prev) => ({
        ...prev,
        province: data.province ?? '',
        city: data.city ?? '',
        address: data.address ?? '',
        state_id: data.state_id ? String(data.state_id) : prev.state_id,
        city_id: data.city_id ? String(data.city_id) : '',
      }))
      toast.success(data.state_id && data.city_id ? 'آدرس از روی کد پستی پر شد.' : 'نشانی پر شد. استان یا شهر را در فهرست انتخاب کنید.')
    } catch (error) {
      toast.error(apiErrorMessage(error) || 'استعلام کد پستی انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  const validateClient = (): string | null => {
    if (!form.name.trim()) return 'نام درگاه الزامی است.'
    if (form.ownership === 'shared' && !form.shared_link_id) return 'لینک اشتراکی فعال را انتخاب کنید.'
    if (!form.first_name.trim() || !form.last_name.trim()) return 'نام و نام خانوادگی الزامی است.'
    if (!/^[A-Za-z][A-Za-z -]{1,40}$/.test(form.first_name_en) || !/^[A-Za-z][A-Za-z -]{1,40}$/.test(form.last_name_en)) return 'نام انگلیسی فقط با حروف لاتین.'
    if (!/^\d{10}$/.test(form.national_id)) return 'کد ملی باید ۱۰ رقم باشد.'
    if (!/^09\d{9}$/.test(form.mobile)) return 'موبایل باید با ۰۹ شروع شود و ۱۱ رقم باشد.'
    if (!form.email.trim()) return 'ایمیل فروشگاه الزامی است.'
    if (!form.father_name.trim() || !/^[A-Za-z][A-Za-z -]{1,40}$/.test(form.father_name_en)) return 'نام پدر فارسی و انگلیسی الزامی است.'
    if (!form.birth_date) return 'تاریخ تولد شمسی الزامی است.'
    if (!/^\d{10}$/.test(form.postal_code)) return 'کد پستی باید ۱۰ رقم باشد.'
    if (!landlinePhone(form.phone)) return 'تلفن ثابت باید مانند 021-12345678 باشد.'
    if (!form.state_id || !form.city_id || form.address.trim().length < 5) return 'استان، شهر و نشانی را وارد کنید.'
    if (!form.shop_name.trim() || !/^[A-Za-z0-9][A-Za-z0-9 -]{1,60}$/.test(form.shop_name_en)) return 'نام فارسی و انگلیسی فروشگاه الزامی است.'
    if (!form.category_id) return 'دسته‌بندی درگاه را از فهرست فینوپال انتخاب کنید.'
    if (!/^https?:\/\//i.test(form.website) || !/^https?:\/\//i.test(form.callback_url)) return 'دامنه و آدرس بازگشت باید با http یا https شروع شوند.'
    if (!form.server_ip.trim()) return 'IP سرور الزامی است.'
    if (!/^\d{10,14}$/.test(form.tax)) return 'کد مالیاتی باید ۱۰ تا ۱۴ رقم باشد.'
    if (!isValidSheba(form.sheba) || !isValidSheba(form.backup_sheba)) return 'هر دو شبا باید ۲۴ رقم باشند.'
    if (normalizeSheba(form.sheba) === normalizeSheba(form.backup_sheba)) return 'شبا پشتیبان باید با شبا اصلی فرق داشته باشد.'
    const tooBig = Object.values(docs).find((file) => file && file.size > 2 * 1024 * 1024)
    if (tooBig) return 'هر مدرک حداکثر ۲ مگابایت و از نوع jpg، png یا pdf است.'
    if (!docs.national_id_front || !docs.national_id_back || !docs.selfie) return 'روی کارت ملی، پشت کارت ملی و سلفی الزامی است.'
    if (isLegal) {
      if (!form.company_name.trim() || !form.company_name_en.trim()) return 'نام فارسی و انگلیسی شرکت الزامی است.'
      if (!/^\d{11}$/.test(form.legal_national_id)) return 'شناسه ملی شرکت باید ۱۱ رقم باشد.'
      if (!form.registration_no.trim() || !form.register_date || !form.economic_code.trim()) return 'شماره ثبت، تاریخ ثبت و شناسه اقتصادی الزامی است.'
      if (!docs.gazette || !docs.official_letter || !docs.company_statute) return 'معرفی‌نامه، اساسنامه و روزنامه رسمی الزامی است.'
    }
    return null
  }

  const submit = async () => {
    setFieldErrors({})
    const clientError = validateClient()
    if (clientError) {
      if (clientError.includes('شبا')) setFieldErrors({ 'customer.sheba': clientError })
      toast.error(clientError)
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('external_id', `GW-${Date.now()}`)
      fd.append('name', form.name)
      fd.append('source', 'finopal')
      fd.append('ownership_type', form.ownership)
      if (form.ownership === 'shared' && form.shared_link_id) fd.append('shared_link_id', form.shared_link_id)
      else {
        // Non-superusers always register under their own account.
        const ownerId = me?.is_superuser
          ? (form.representative_user_id || String(me?.id ?? ''))
          : String(me?.id ?? '')
        fd.append('representative_user_id', ownerId)
      }
      const customer: Record<string, string> = {
        person_type: form.person_type,
        first_name: form.first_name,
        last_name: form.last_name,
        first_name_en: form.first_name_en,
        last_name_en: form.last_name_en,
        mobile: form.mobile,
        national_id: form.national_id,
        sheba: normalizeSheba(form.sheba),
        backup_sheba: normalizeSheba(form.backup_sheba),
        email: form.email,
        father_name: form.father_name,
        father_name_en: form.father_name_en,
        birth_date: form.birth_date,
        birth_certificate_no: form.birth_certificate_no,
        gender: form.gender,
        province: form.province,
        city: form.city,
        state_id: form.state_id,
        city_id: form.city_id,
        address: form.address,
        address_title: form.address_title,
        phone: landlinePhone(form.phone) ?? '',
        postal_code: form.postal_code,
        bank_code: normalizeSheba(form.sheba).slice(4, 7),
        shop_name: form.shop_name,
        shop_name_en: form.shop_name_en,
        shop_category: categories.find((c) => String(c.id) === form.category_id)?.title ?? '',
        category_id: form.category_id,
        website: form.website,
        callback_url: form.callback_url,
        server_ip: form.server_ip,
        tax: form.tax,
        company_name: form.company_name,
        company_name_en: form.company_name_en,
        registration_no: form.registration_no,
        register_date: form.register_date,
        economic_code: form.economic_code,
        legal_national_id: form.legal_national_id,
      }
      Object.entries(customer).forEach(([key, value]) => {
        if (value) fd.append(`customer[${key}]`, value)
      })
      Object.entries(docs).forEach(([key, file]) => {
        if (file) fd.append(`documents[${key}]`, file)
      })
      await api.post('/gateway-sales', fd)
      toast.success(t('gwRegistered'))
      qc.invalidateQueries({ queryKey: ['sales'] })
      onDone()
    } catch (error) {
      const fields = apiFieldErrors(error)
      setFieldErrors(fields)
      toast.error(apiErrorMessage(error), { duration: 12000 })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="grid gap-5" data-testid="gateway-form" onSubmit={async (e) => { e.preventDefault(); await submit() }}>
      <section className="grid md:grid-cols-2 gap-3">
        <label className="field">نوع مالکیت درگاه
          <select
            className="input"
            value={form.ownership}
            onChange={(e) => {
              const next = e.target.value
              if (next === 'shared' && !gatewayShareEnabled) return
              set('ownership', next)
              if (next !== 'shared') set('shared_link_id', '')
            }}
          >
            <option value="solo">انفرادی</option>
            {gatewayShareEnabled && <option value="shared">اشتراکی</option>}
            <option value="referral">با معرف</option>
          </select>
        </label>
        <label className="field"><FieldLabel required>نام درگاه / کسب‌وکار</FieldLabel>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </label>
        {form.ownership === 'shared' && gatewayShareEnabled ? (
          <label className="field"><FieldLabel required>لینک اشتراکی فعال</FieldLabel>
            <SearchSelect
              testId="gateway-shared-link"
              value={form.shared_link_id}
              onChange={(v) => set('shared_link_id', v)}
              placeholder="انتخاب کنید"
              required
              options={(links ?? []).filter((l: { status: string; type?: string }) => l.status === 'active' && l.type === 'gateway_sale').map((l: { id: number; token: string }) => ({ value: l.id, label: l.token }))}
            />
          </label>
        ) : me?.is_superuser ? (
          <label className="field">نماینده مالک
            <SearchSelect
              testId="gateway-owner"
              value={form.representative_user_id}
              onChange={(v) => set('representative_user_id', v)}
              placeholder="خودم / پیش‌فرض"
              options={(reps ?? []).map((r: { id: number; name: string; mobile?: string }) => ({ value: r.id, label: `${r.name}${r.mobile ? ` · ${r.mobile}` : ''}` }))}
            />
          </label>
        ) : null}
      </section>

      {vipRefError && <p className="text-sm text-red-600">فهرست استان و دسته‌بندی فینوپال بارگذاری نشد. اتصال VIP را بررسی کنید.</p>}

      <section className="grid gap-3">
        <div className="font-bold text-surface-800 dark:text-surface-100">هویت متقاضی</div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="field">نوع شخص
            <select className="input" value={form.person_type} onChange={(e) => set('person_type', e.target.value)}>
              {entityOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="field">جنسیت
            <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              {genderOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="field"><FieldLabel required>نام</FieldLabel>
            <input className="input" value={form.first_name} onChange={(e) => setFa('first_name', 'first_name_en', e.target.value)} required />
          </label>
          <label className="field"><FieldLabel required>نام خانوادگی</FieldLabel>
            <input className="input" value={form.last_name} onChange={(e) => setFa('last_name', 'last_name_en', e.target.value)} required />
          </label>
          <label className="field"><FieldLabel required>نام انگلیسی</FieldLabel>
            <input className="input" dir="ltr" value={form.first_name_en} onChange={(e) => setEn('first_name_en', e.target.value)} required />
          </label>
          <label className="field"><FieldLabel required>نام خانوادگی انگلیسی</FieldLabel>
            <input className="input" dir="ltr" value={form.last_name_en} onChange={(e) => setEn('last_name_en', e.target.value)} required />
          </label>
          <label className="field"><FieldLabel required>کد ملی</FieldLabel>
            <input className={fieldClass('customer.national_id')} inputMode="numeric" maxLength={10} value={form.national_id} onChange={(e) => set('national_id', e.target.value.replace(/\D/g, '').slice(0, 10))} required />
            <ErrText k="customer.national_id" />
          </label>
          <label className="field"><FieldLabel required>موبایل</FieldLabel>
            <input className={fieldClass('customer.mobile')} inputMode="numeric" maxLength={11} value={form.mobile} onChange={(e) => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 11))} required />
            <ErrText k="customer.mobile" />
          </label>
          <label className="field"><FieldLabel required>ایمیل فروشگاه</FieldLabel>
            <input className={fieldClass('customer.email')} type="email" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            <ErrText k="customer.email" />
          </label>
          <label className="field"><FieldLabel required>نام پدر</FieldLabel>
            <input className="input" value={form.father_name} onChange={(e) => setFa('father_name', 'father_name_en', e.target.value)} required />
          </label>
          <label className="field"><FieldLabel required>نام پدر انگلیسی</FieldLabel>
            <input className="input" dir="ltr" value={form.father_name_en} onChange={(e) => setEn('father_name_en', e.target.value)} required />
          </label>
          <label className="field"><FieldLabel required>تاریخ تولد</FieldLabel>
            <JalaliDatePicker value={form.birth_date} onChange={(v) => set('birth_date', v)} placeholder="تاریخ شمسی" fromYear={1300} toYear={1410} />
          </label>
          <label className="field">شماره شناسنامه
            <input className="input" value={form.birth_certificate_no} onChange={(e) => set('birth_certificate_no', e.target.value)} />
          </label>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 font-bold text-surface-800 dark:text-surface-100">آدرس</div>
        <label className="field"><FieldLabel required>کد پستی</FieldLabel>
          <div className="flex gap-2">
            <input className={fieldClass('customer.postal_code')} inputMode="numeric" maxLength={10} value={form.postal_code} onChange={(e) => set('postal_code', e.target.value.replace(/\D/g, '').slice(0, 10))} required />
            <button type="button" className="btn btn-ghost shrink-0" disabled={busy} onClick={() => void inquirePostal()}>استعلام</button>
          </div>
          <ErrText k="customer.postal_code" />
        </label>
        <label className="field">عنوان آدرس
          <input className="input" value={form.address_title} onChange={(e) => set('address_title', e.target.value)} />
        </label>
        <label className="field"><FieldLabel required>استان</FieldLabel>
          <SearchSelect
            value={form.state_id}
            required
            placeholder={states.length ? 'انتخاب استان' : 'در حال دریافت...'}
            options={states.map((s) => ({ value: s.id, label: s.title }))}
            onChange={(id) => {
              const title = states.find((s) => String(s.id) === id)?.title ?? ''
              setForm((prev) => ({ ...prev, state_id: id, province: title, city_id: '', city: '' }))
            }}
          />
        </label>
        <label className="field"><FieldLabel required>شهر</FieldLabel>
          <SearchSelect
            value={form.city_id}
            disabled={!form.state_id}
            required
            placeholder={form.state_id ? 'انتخاب شهر' : 'اول استان'}
            options={cities.map((c) => ({ value: c.id, label: c.title }))}
            onChange={(id) => {
              const title = cities.find((c) => String(c.id) === id)?.title ?? ''
              setForm((prev) => ({ ...prev, city_id: id, city: title }))
            }}
          />
        </label>
        <label className="field md:col-span-2"><FieldLabel required>نشانی</FieldLabel>
          <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} required />
        </label>
        <label className="field"><FieldLabel required>تلفن ثابت</FieldLabel>
          <input className={fieldClass('customer.phone')} dir="ltr" inputMode="numeric" maxLength={12} value={form.phone} onChange={(e) => set('phone', e.target.value)} onBlur={() => { const next = landlinePhone(form.phone); if (next) set('phone', next) }} placeholder="021-12345678" required />
          <ErrText k="customer.phone" />
        </label>
      </section>

      {isLegal && (
        <section className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2 font-bold text-surface-800 dark:text-surface-100">شرکت و صاحبان امضا</div>
          <label className="field"><FieldLabel required>نام شرکت</FieldLabel><input className="input" value={form.company_name} onChange={(e) => setFa('company_name', 'company_name_en', e.target.value)} required /></label>
          <label className="field"><FieldLabel required>نام انگلیسی شرکت</FieldLabel><input className="input" dir="ltr" value={form.company_name_en} onChange={(e) => setEn('company_name_en', e.target.value)} required /></label>
          <label className="field"><FieldLabel required>شناسه ملی شرکت</FieldLabel><input className="input" inputMode="numeric" maxLength={11} value={form.legal_national_id} onChange={(e) => set('legal_national_id', e.target.value.replace(/\D/g, '').slice(0, 11))} required /></label>
          <label className="field"><FieldLabel required>شماره ثبت</FieldLabel><input className="input" value={form.registration_no} onChange={(e) => set('registration_no', e.target.value)} required /></label>
          <label className="field"><FieldLabel required>تاریخ ثبت</FieldLabel><JalaliDatePicker value={form.register_date} onChange={(v) => set('register_date', v)} placeholder="تاریخ شمسی" fromYear={1300} toYear={1410} /></label>
          <label className="field"><FieldLabel required>شناسه اقتصادی</FieldLabel><input className="input" value={form.economic_code} onChange={(e) => set('economic_code', e.target.value)} required /></label>
          <p className="md:col-span-2 text-xs text-surface-500">متقاضی همین فرم به‌عنوان صاحب امضا ارسال می‌شود. کد ملی او باید در فهرست رسمی شرکت باشد.</p>
        </section>
      )}

      <section className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 font-bold text-surface-800 dark:text-surface-100">فروشگاه / درگاه</div>
        <label className="field"><FieldLabel required>نام فروشگاه</FieldLabel><input className="input" value={form.shop_name} onChange={(e) => setFa('shop_name', 'shop_name_en', e.target.value)} required /></label>
        <label className="field"><FieldLabel required>نام انگلیسی فروشگاه</FieldLabel><input className="input" dir="ltr" value={form.shop_name_en} onChange={(e) => setEn('shop_name_en', e.target.value)} required /></label>
        <label className="field"><FieldLabel required>دسته‌بندی درگاه</FieldLabel>
          <SearchSelect
            value={form.category_id}
            required
            placeholder={categories.length ? 'انتخاب دسته' : 'در حال دریافت...'}
            options={categories.map((c) => ({ value: c.id, label: c.title }))}
            onChange={(id) => set('category_id', id)}
          />
        </label>
        <label className="field"><FieldLabel required>کد مالیاتی</FieldLabel><input className="input" inputMode="numeric" maxLength={14} value={form.tax} onChange={(e) => set('tax', e.target.value.replace(/\D/g, '').slice(0, 14))} required /></label>
        <label className="field"><FieldLabel required>دامنه</FieldLabel><input className="input" dir="ltr" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://shop.example.com" required /></label>
        <label className="field"><FieldLabel required>آدرس بازگشت</FieldLabel><input className="input" dir="ltr" value={form.callback_url} onChange={(e) => set('callback_url', e.target.value)} placeholder="https://shop.example.com/callback" required /></label>
        <label className="field"><FieldLabel required>ایمیل وب‌سرویس</FieldLabel><input className="input" dir="ltr" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required /></label>
        <label className="field"><FieldLabel required>IP سرور</FieldLabel><input className="input" dir="ltr" value={form.server_ip} onChange={(e) => set('server_ip', e.target.value)} placeholder="1.2.3.4" required /></label>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 font-bold text-surface-800 dark:text-surface-100">شبا</div>
        <label className="field"><FieldLabel required>شبا اصلی</FieldLabel><input className={fieldClass('customer.sheba')} dir="ltr" value={form.sheba} onChange={(e) => set('sheba', e.target.value)} placeholder="IR و ۲۴ رقم" required /><ErrText k="customer.sheba" /></label>
        <label className="field"><FieldLabel required>شبا پشتیبان</FieldLabel><input className={fieldClass('customer.backup_sheba')} dir="ltr" value={form.backup_sheba} onChange={(e) => set('backup_sheba', e.target.value)} placeholder="متفاوت از شبا اصلی" required /><ErrText k="customer.backup_sheba" /></label>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 font-bold text-surface-800 dark:text-surface-100">مدارک</div>
        <p className="md:col-span-2 text-xs text-surface-500">jpg، png یا pdf و حداکثر ۲ مگابایت. بدون روی کارت، پشت کارت و سلفی، فینوپال ثبت را رد می‌کند.</p>
        <FileField required label="روی کارت ملی" file={docs.national_id_front} onChange={(file) => setDocs((d) => ({ ...d, national_id_front: file }))} />
        <FileField required label="پشت کارت ملی" file={docs.national_id_back} onChange={(file) => setDocs((d) => ({ ...d, national_id_back: file }))} />
        <FileField required label="سلفی احراز هویت" file={docs.selfie} onChange={(file) => setDocs((d) => ({ ...d, selfie: file }))} />
        {isLegal && (
          <>
            <FileField required label="معرفی‌نامه رسمی" file={docs.official_letter} onChange={(file) => setDocs((d) => ({ ...d, official_letter: file }))} />
            <FileField required label="اساسنامه شرکت" file={docs.company_statute} onChange={(file) => setDocs((d) => ({ ...d, company_statute: file }))} />
            <FileField required label="روزنامه رسمی" file={docs.gazette} onChange={(file) => setDocs((d) => ({ ...d, gazette: file }))} />
          </>
        )}
      </section>

      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'در حال ثبت...' : t(gwNewKey(productOriented))}
      </button>
    </form>
  )
}
