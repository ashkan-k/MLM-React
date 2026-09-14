import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import { moneyHeader } from '../lib/format'
import { useAuth } from '../stores/auth'
import { JalaliDatePicker } from './JalaliDatePicker'
import { MoneyInput } from './MoneyInput'
import { SearchSelect } from './SearchSelect'
import { FieldLabel } from './ui'

type Docs = {
  national_id_front?: File | null
  national_id_back?: File | null
  birth_certificate?: File | null
  selfie?: File | null
  gazette?: File | null
  license?: File | null
}

type GeoState = { id: number; title: string; slug?: string }
type GeoCity = { id: number; state_id: number; title: string; sub_title?: string | null }

const emptyForm = {
  ownership: 'solo',
  name: '',
  amount: '',
  shared_link_id: '',
  representative_user_id: '',
  person_type: 'individual',
  customer_name: '',
  mobile: '',
  email: '',
  national_id: '',
  father_name: '',
  birth_date: '',
  birth_certificate_no: '',
  birth_place: '',
  gender: '',
  province: '',
  city: '',
  address: '',
  postal_code: '',
  sheba: '',
  bank_name: '',
  account_number: '',
  account_holder: '',
  shop_name: '',
  shop_category: '',
  website: '',
  company_name: '',
  registration_no: '',
  economic_code: '',
  legal_national_id: '',
}

function FileField({ label, file, onChange }: { label: string; file?: File | null; onChange: (file: File | null) => void }) {
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
      <span>{label}</span>
      <input className="input" type="file" accept="image/*,.pdf" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
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

export function GatewayCreateForm({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient()
  const me = useAuth((s) => s.user)
  const { data: links } = useQuery({ queryKey: ['links'], queryFn: async () => (await api.get('/shared-links')).data })
  const { data: reps } = useQuery({ queryKey: ['reps'], queryFn: async () => (await api.get('/representatives')).data })
  const { data: geo } = useQuery({ queryKey: ['geo-locations'], queryFn: async () => (await api.get('/geo/locations')).data })
  const [form, setForm] = useState(emptyForm)
  const [docs, setDocs] = useState<Docs>({})
  const [busy, setBusy] = useState(false)
  const set = (key: keyof typeof emptyForm, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const states: GeoState[] = geo?.states ?? []
  const cities: GeoCity[] = geo?.cities ?? []
  const selectedState = states.find((s) => s.title === form.province)
  const cityOptions = useMemo(
    () => cities.filter((c) => !selectedState || c.state_id === selectedState.id).map((c) => ({ value: c.title, label: c.sub_title && c.sub_title !== c.title ? `${c.title} (${c.sub_title})` : c.title })),
    [cities, selectedState],
  )
  const birthPlaceOptions = useMemo(
    () => Array.from(new Map(cities.map((c) => [c.title, { value: c.title, label: c.title }])).values()),
    [cities],
  )

  const submit = async () => {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('external_id', `GW-${Date.now()}`)
      fd.append('name', form.name)
      fd.append('amount', form.amount)
      fd.append('source', 'finopal')
      fd.append('ownership_type', form.ownership)
      if (form.ownership === 'shared' && form.shared_link_id) fd.append('shared_link_id', form.shared_link_id)
      else fd.append('representative_user_id', form.representative_user_id || String(me?.id ?? ''))
      const customer: Record<string, string> = {
        name: form.customer_name,
        mobile: form.mobile,
        person_type: form.person_type,
        national_id: form.national_id,
        sheba: form.sheba,
        email: form.email,
        father_name: form.father_name,
        birth_date: form.birth_date,
        birth_certificate_no: form.birth_certificate_no,
        birth_place: form.birth_place,
        gender: form.gender,
        province: form.province,
        city: form.city,
        address: form.address,
        postal_code: form.postal_code,
        bank_name: form.bank_name,
        account_number: form.account_number,
        account_holder: form.account_holder,
        shop_name: form.shop_name,
        shop_category: form.shop_category,
        website: form.website,
        company_name: form.company_name,
        registration_no: form.registration_no,
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
      toast.success('درگاه با مدارک هویتی ثبت شد')
      qc.invalidateQueries({ queryKey: ['sales'] })
      onDone()
    } catch {
      toast.error('ثبت درگاه ناموفق بود. فیلدهای هویتی و مدارک را بررسی کنید.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="grid gap-5" data-testid="gateway-form" onSubmit={async (e) => { e.preventDefault(); await submit() }}>
      <section className="grid md:grid-cols-2 gap-3">
        <label className="field">نوع مالکیت درگاه
          <select className="input" value={form.ownership} onChange={(e) => set('ownership', e.target.value)}>
            <option value="solo">انفرادی</option>
            <option value="shared">اشتراکی</option>
            <option value="referral">با معرف</option>
          </select>
        </label>
        <label className="field"><FieldLabel required>نام درگاه / کسب‌وکار</FieldLabel>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </label>
        <label className="field"><FieldLabel required>{moneyHeader()}</FieldLabel>
          <MoneyInput value={form.amount} onChange={(v) => set('amount', v)} required />
        </label>
        {form.ownership === 'shared' ? (
          <label className="field"><FieldLabel required>لینک اشتراکی فعال</FieldLabel>
            <SearchSelect
              testId="gateway-shared-link"
              value={form.shared_link_id}
              onChange={(v) => set('shared_link_id', v)}
              placeholder="انتخاب کنید"
              required
              options={(links ?? []).filter((l: { status: string }) => l.status === 'active').map((l: { id: number; token: string }) => ({ value: l.id, label: l.token }))}
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

      <section className="grid gap-3">
        <div className="font-bold text-surface-800 dark:text-surface-100">هویت متقاضی</div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="field">نوع شخص
            <select className="input" value={form.person_type} onChange={(e) => set('person_type', e.target.value)}>
              <option value="individual">حقیقی</option>
              <option value="legal">حقوقی</option>
            </select>
          </label>
          <label className="field"><FieldLabel required>نام و نام خانوادگی / نماینده شرکت</FieldLabel>
            <input className="input" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} required />
          </label>
          <label className="field"><FieldLabel required>کد ملی</FieldLabel>
            <input className="input" value={form.national_id} onChange={(e) => set('national_id', e.target.value)} required maxLength={10} />
          </label>
          <label className="field"><FieldLabel required>موبایل</FieldLabel>
            <input className="input" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} required />
          </label>
          <label className="field">ایمیل
            <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </label>
          <label className="field">نام پدر
            <input className="input" value={form.father_name} onChange={(e) => set('father_name', e.target.value)} />
          </label>
          <label className="field">تاریخ تولد
            <JalaliDatePicker value={form.birth_date} onChange={(v) => set('birth_date', v)} placeholder="انتخاب تاریخ شمسی" fromYear={1300} toYear={1410} />
          </label>
          <label className="field">شماره شناسنامه
            <input className="input" value={form.birth_certificate_no} onChange={(e) => set('birth_certificate_no', e.target.value)} />
          </label>
          <label className="field">محل تولد
            <SearchSelect value={form.birth_place} onChange={(v) => set('birth_place', v)} placeholder="انتخاب شهر" options={birthPlaceOptions} />
          </label>
          <label className="field">جنسیت
            <select className="input" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">انتخاب کنید</option>
              <option value="male">مرد</option>
              <option value="female">زن</option>
            </select>
          </label>
        </div>
      </section>

      {form.person_type === 'legal' && (
        <section className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2 font-bold text-surface-800 dark:text-surface-100">مشخصات حقوقی</div>
          <label className="field">نام شرکت<input className="input" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} /></label>
          <label className="field">شناسه ملی شرکت<input className="input" value={form.legal_national_id} onChange={(e) => set('legal_national_id', e.target.value)} /></label>
          <label className="field">شماره ثبت<input className="input" value={form.registration_no} onChange={(e) => set('registration_no', e.target.value)} /></label>
          <label className="field">شناسه اقتصادی<input className="input" value={form.economic_code} onChange={(e) => set('economic_code', e.target.value)} /></label>
        </section>
      )}

      <section className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 font-bold text-surface-800 dark:text-surface-100">آدرس و کسب‌وکار</div>
        <label className="field">استان
          <SearchSelect
            testId="gateway-province"
            value={form.province}
            onChange={(v) => setForm((prev) => ({ ...prev, province: v, city: '' }))}
            placeholder="انتخاب استان"
            options={states.map((s) => ({ value: s.title, label: s.title }))}
          />
        </label>
        <label className="field">شهر
          <SearchSelect
            testId="gateway-city"
            value={form.city}
            onChange={(v) => set('city', v)}
            placeholder={form.province ? 'انتخاب شهر' : 'اول استان را انتخاب کنید'}
            options={cityOptions}
          />
        </label>
        <label className="field md:col-span-2">نشانی کامل<input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} /></label>
        <label className="field">کد پستی<input className="input" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} /></label>
        <label className="field">نام فروشگاه<input className="input" value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} /></label>
        <label className="field">صنف / دسته<input className="input" value={form.shop_category} onChange={(e) => set('shop_category', e.target.value)} /></label>
        <label className="field">وب‌سایت<input className="input" value={form.website} onChange={(e) => set('website', e.target.value)} /></label>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 font-bold text-surface-800 dark:text-surface-100">حساب بانکی تسویه</div>
        <label className="field"><FieldLabel required>شبا</FieldLabel><input className="input" value={form.sheba} onChange={(e) => set('sheba', e.target.value)} required /></label>
        <label className="field">نام بانک<input className="input" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} /></label>
        <label className="field">شماره حساب<input className="input" value={form.account_number} onChange={(e) => set('account_number', e.target.value)} /></label>
        <label className="field">صاحب حساب<input className="input" value={form.account_holder} onChange={(e) => set('account_holder', e.target.value)} /></label>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="md:col-span-2 font-bold text-surface-800 dark:text-surface-100">مدارک هویتی</div>
        <FileField label="تصویر روی کارت ملی" file={docs.national_id_front} onChange={(file) => setDocs((d) => ({ ...d, national_id_front: file }))} />
        <FileField label="تصویر پشت کارت ملی" file={docs.national_id_back} onChange={(file) => setDocs((d) => ({ ...d, national_id_back: file }))} />
        <FileField label="تصویر شناسنامه" file={docs.birth_certificate} onChange={(file) => setDocs((d) => ({ ...d, birth_certificate: file }))} />
        <FileField label="سلفی احراز هویت با کارت ملی" file={docs.selfie} onChange={(file) => setDocs((d) => ({ ...d, selfie: file }))} />
        {form.person_type === 'legal' && (
          <>
            <FileField label="روزنامه رسمی / آگهی تأسیس" file={docs.gazette} onChange={(file) => setDocs((d) => ({ ...d, gazette: file }))} />
            <FileField label="مجوز یا پروانه کسب" file={docs.license} onChange={(file) => setDocs((d) => ({ ...d, license: file }))} />
          </>
        )}
      </section>

      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'در حال ثبت...' : 'ثبت درگاه'}</button>
    </form>
  )
}
