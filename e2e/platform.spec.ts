import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, mobile: string, role?: string) {
  await page.goto('/login')
  await page.getByTestId('login-mobile').fill(mobile)
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login$/)
  if (role) {
    const token = await page.evaluate(() => localStorage.getItem('finopal.token'))
    if (token) {
      const switched = await page.request.post('http://127.0.0.1:8000/api/auth/switch-role', {
        headers: { Authorization: `Bearer ${token}` },
        data: { role_slug: role },
      })
      expect(switched.ok()).toBeTruthy()
    }
    const path = `/dashboard/${role.replaceAll('_', '-')}`
    await page.goto(path)
    await expect(page).toHaveURL(new RegExp(path.replaceAll('/', '\\/')))
  }
}

async function openGroup(page: Page, group: string) {
  const button = page.getByRole('button', { name: group, exact: true })
  if (await button.count()) await button.click()
}

async function navLink(page: Page, group: string, name: string, exact = true) {
  const link = page.locator('aside').getByRole('link', { name, exact })
  if (!await link.isVisible()) await openGroup(page, group)
  await link.click()
}

test.describe('سازمان فروش فاینوپال', () => {
  test('داشبورد نماینده، پورسانت فارسی و گزارش تجمیعی', async ({ page }) => {
    await login(page, '09125555555', 'representative')
    await expect(page).toHaveURL(/dashboard\/representative/)
    await expect(page.getByTestId('wallet-balance')).toBeVisible()
    await navLink(page, 'فروش و پورسانت', 'پورسانت')
    await expect(page.getByTestId('commission-table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /مبلغ پورسانت/ })).toBeVisible()
    await navLink(page, 'مالی', 'گزارش تجمیعی')
    await expect(page.getByTestId('aggregate-finance')).toContainText('ادغام')
  })

  test('سوییچ نقش بدون خروج از حساب', async ({ page }) => {
    await login(page, '09126666666')
    await page.getByTestId('role-switcher').selectOption('sales_manager')
    await expect(page).toHaveURL(/dashboard\/sales-manager/)
    await expect(page.getByText('داشبورد مدیر فروش')).toBeVisible()
    await page.getByTestId('role-switcher').selectOption('representative')
    await expect(page).toHaveURL(/dashboard\/representative/)
  })

  test('پورسانت فروش اشتراکی برای نماینده همکار', async ({ page }) => {
    await login(page, '09127777777', 'representative')
    await page.goto('/dashboard/representative/commissions')
    await expect(page.locator('main')).toBeVisible()
    await expect(page.getByTestId('commission-table')).toContainText(/۱۵۰|150|7\.500|۷/)
  })

  test('درخت سازمان و آموزش با سطح پویا', async ({ page }) => {
    await login(page, '09123333333')
    await navLink(page, 'سازمان چندسطحی', 'سازمان و تیم')
    await expect(page.getByTestId('org-tree')).toBeVisible()
    await navLink(page, 'رشد شبکه', 'آموزش')
    await expect(page.getByTestId('training-list')).toContainText('آموزش سازمان فروش')
    await expect(page.getByTestId('training-list')).toContainText('آشنایی با محصول')
  })

  test('ثبت برداشت و نمایش وضعیت فارسی با مقدار خام برای سیستم', async ({ page }) => {
    await login(page, '09125555555', 'representative')
    await page.goto('/dashboard/representative/withdrawals')
    await expect(page.locator('main')).toBeVisible()
    await page.getByTestId('withdraw-open').click()
    await page.getByTestId('withdraw-amount').fill('500')
    await expect(page.getByTestId('withdraw-submit')).toBeEnabled()
    await page.getByTestId('withdraw-submit').click()
    await expect(page.getByText('در انتظار مدیر ارشد').first()).toBeVisible()
    await expect(page.getByTestId('withdraw-status').filter({ hasText: 'senior_manager_pending' }).first()).toBeVisible()
  })

  test('چت فقط مخاطب درختی را نشان می‌دهد', async ({ page }) => {
    await login(page, '09125555555')
    await openGroup(page, 'ارتباط')
    await page.locator('.nav-link', { hasText: 'گفتگو' }).click()
    await expect(page.getByText('مخاطبان مجاز')).toBeVisible()
    await expect(page.getByText('شاخه جدا')).toHaveCount(0)
  })

  test('پنل مدیر سامانه: آمار فارسی، دسترسی‌ها و درصد پاداش ماهانه', async ({ page }) => {
    await login(page, '09120000000')
    await expect(page).toHaveURL(/superuser/)
    await expect(page.getByTestId('admin-stats')).toBeVisible()
    await expect(page.getByText('کاربران فعال')).toBeVisible()
    await navLink(page, 'فروش چندسطحی', 'قواعد پورسانت', false)
    await expect(page.getByTestId('commission-rules')).toContainText('نماینده')
    await expect(page.getByText('درصد پاداش ماهانه').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'ذخیره' }).first()).toBeVisible()
    await navLink(page, 'کاربران و دسترسی', 'دسترسی‌ها', false)
    await expect(page.getByText('تعیین دسترسی نقش‌ها')).toBeVisible()
    await expect(page.getByTestId('permissions-admin')).toBeVisible()
    await expect(page.getByTestId('perm-senior_manager.withdrawal.approve')).toContainText('تایید برداشت')
  })

  test('مدیر ارشد معیار ارتقاء و کد معرف را می‌بیند', async ({ page }) => {
    await login(page, '09121111111')
    await navLink(page, 'رشد شبکه', 'ارتقاء')
    await expect(page.getByTestId('promotion-criteria')).toBeVisible()
    await expect(page.getByTestId('promotion-criteria')).toContainText('امتیاز')
    await navLink(page, 'رشد شبکه', 'معرف و لینک اشتراکی')
    await expect(page.getByTestId('referral-code')).toBeVisible()
  })

  test('مدیر سامانه می‌تواند دوره با چند سطح بسازد', async ({ page }) => {
    await login(page, '09120000000')
    await navLink(page, 'فروش چندسطحی', 'دوره‌ها')
    await page.getByRole('button', { name: 'دوره جدید' }).click()
    await expect(page.getByText('نمره قبولی (از ۱۰۰)')).toBeVisible()
    const title = `دوره تست پلی‌رایت ${Date.now()}`
    await page.getByLabel('عنوان دوره').fill(title)
    await page.getByRole('button', { name: 'ثبت دوره' }).click()
    await expect(page.getByText(title)).toBeVisible()
  })

  test('گزارشات مدیر سامانه نمودار و زیرمجموعه دارد', async ({ page }) => {
    await login(page, '09120000000')
    await navLink(page, 'اصلی', 'گزارشات')
    await expect(page.getByTestId('admin-reports')).toBeVisible()
    await expect(page.getByTestId('sales-line-chart')).toBeVisible()
    await expect(page.getByTestId('role-bar-chart')).toBeVisible()
    await expect(page.getByTestId('org-report')).toBeVisible()
    await expect(page.getByRole('button', { name: 'خروجی Excel' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'خروجی JSON' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'خروجی PDF' }).first()).toBeVisible()
    await expect(page.getByTestId('jalali-datepicker').first()).toBeVisible()
  })

  test('کاربر از مودال ساخته و ویرایش می‌شود', async ({ page }) => {
    await login(page, '09120000000')
    await navLink(page, 'کاربران و دسترسی', 'کاربران', false)
    await page.getByRole('button', { name: 'کاربر جدید' }).click()
    await expect(page.getByTestId('user-form')).toBeVisible()
    const stamp = Date.now()
    const mobile = `0912${stamp.toString().slice(-7)}`
    const created = `کاربر تست ${stamp}`
    const edited = `کاربر ویرایش ${stamp}`
    await page.getByLabel('نام').fill(created)
    await page.getByLabel('موبایل').fill(mobile)
    await page.getByLabel('ایمیل').fill(`pw-${stamp}@finopal.test`)
    await page.getByRole('button', { name: 'ایجاد کاربر' }).click()
    await expect(page.getByRole('cell', { name: created })).toBeVisible()
    await page.getByRole('row', { name: new RegExp(created) }).getByRole('button', { name: 'ویرایش' }).click()
    await page.getByLabel('نام').fill(edited)
    await page.getByRole('button', { name: 'ذخیره تغییرات' }).click()
    await expect(page.getByRole('cell', { name: edited })).toBeVisible()
  })

  test('سلب و اعطای دسترسی نقش پایدار می‌ماند', async ({ page }) => {
    await login(page, '09120000000')
    await navLink(page, 'کاربران و دسترسی', 'دسترسی‌ها', false)
    const box = page.getByTestId('perm-toggle-senior_manager-senior_manager.withdrawal.approve')
    if (!await box.isChecked()) {
      await box.click()
      await expect(page.getByText('دسترسی اعطا شد')).toBeVisible()
    }
    await expect(box).toBeChecked()
    await box.click()
    await expect(page.getByText('دسترسی سلب شد')).toBeVisible()
    await expect(box).not.toBeChecked()
    await page.reload()
    await expect(page.getByTestId('perm-toggle-senior_manager-senior_manager.withdrawal.approve')).not.toBeChecked()
    await page.getByTestId('perm-toggle-senior_manager-senior_manager.withdrawal.approve').click()
    await expect(page.getByText('دسترسی اعطا شد')).toBeVisible()
    await expect(page.getByTestId('perm-toggle-senior_manager-senior_manager.withdrawal.approve')).toBeChecked()
  })

  test('تنظیمات بدون JSON و رویدادها با جزئیات شمسی هستند', async ({ page }) => {
    await login(page, '09120000000')
    await navLink(page, 'سیستم', 'تنظیمات')
    await expect(page.getByTestId('setting-qualification_thresholds')).toBeVisible()
    await expect(page.getByText('حداقل امتیاز نماینده')).toBeVisible()
    await expect(page.locator('textarea.font-mono')).toHaveCount(0)
    await page.getByRole('button', { name: 'ذخیره' }).first().click()
    await expect(page.getByText('تنظیمات ذخیره شد')).toBeVisible()
    await navLink(page, 'سیستم', 'رویدادها')
    await expect(page.getByText('گزارش رویدادها')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'آی‌پی' })).toBeVisible()
    await expect(page.locator('.datetime-ltr').first()).toHaveAttribute('dir', 'ltr')
    await expect(page.getByTestId('audit-export')).toBeVisible()
    await expect(page.getByTestId('audit-export-all')).toHaveCount(0)
    await page.getByRole('link', { name: 'جزئیات' }).first().click()
    await expect(page.getByTestId('audit-detail')).toBeVisible()
    await expect(page.getByText('مقایسه تغییرات')).toBeVisible()
    await expect(page.getByText('عامل و زمان')).toBeVisible()
    await expect(page.getByTestId('audit-detail').locator('.datetime-ltr').first()).toHaveAttribute('dir', 'ltr')
    await expect(page.getByTestId('audit-detail-export')).toBeVisible()
  })
})
