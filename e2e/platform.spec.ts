import { expect, test, type Page } from '@playwright/test'

async function login(page: Page, mobile: string) {
  await page.goto('/login')
  await page.getByTestId('login-mobile').fill(mobile)
  await page.getByTestId('login-password').fill('Password123!')
  await page.getByTestId('login-submit').click()
  await expect(page).not.toHaveURL(/\/login$/)
}

test.describe('سازمان فروش فاینوپال', () => {
  test('داشبورد نماینده، پورسانت فارسی و گزارش تجمیعی', async ({ page }) => {
    await login(page, '09125555555')
    await expect(page).toHaveURL(/dashboard\/representative/)
    await expect(page.getByTestId('wallet-balance')).toBeVisible()
    await page.getByRole('link', { name: 'پورسانت', exact: true }).click()
    await expect(page.getByTestId('commission-table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'مبلغ پورسانت' })).toBeVisible()
    await page.getByRole('link', { name: 'گزارش تجمیعی', exact: true }).click()
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
    await login(page, '09127777777')
    await page.getByRole('link', { name: 'پورسانت', exact: true }).click()
    await expect(page.getByTestId('commission-table')).toContainText('7.500')
  })

  test('درخت سازمان و آموزش با سطح پویا', async ({ page }) => {
    await login(page, '09123333333')
    await page.getByRole('link', { name: 'سازمان و تیم', exact: true }).click()
    await expect(page.getByTestId('org-tree')).toBeVisible()
    await page.getByRole('link', { name: 'آموزش', exact: true }).click()
    await expect(page.getByTestId('training-list')).toContainText('آموزش سازمان فروش')
    await expect(page.getByTestId('training-list')).toContainText('آشنایی با محصول')
  })

  test('ثبت برداشت و نمایش وضعیت فارسی با مقدار خام برای سیستم', async ({ page }) => {
    await login(page, '09125555555')
    await page.getByRole('link', { name: 'برداشت', exact: true }).click()
    await page.getByTestId('withdraw-open').click()
    await expect(page.getByTestId('withdraw-submit')).toBeEnabled()
    await page.getByTestId('withdraw-amount').fill('500')
    await page.getByTestId('withdraw-submit').click()
    await expect(page.getByText('در انتظار مدیر ارشد').first()).toBeVisible()
    await expect(page.getByTestId('withdraw-status').first()).toHaveText('senior_manager_pending')
  })

  test('چت فقط مخاطب درختی را نشان می‌دهد', async ({ page }) => {
    await login(page, '09125555555')
    await page.locator('.nav-link', { hasText: 'گفتگو' }).click()
    await expect(page.getByText('مخاطبان مجاز')).toBeVisible()
    await expect(page.getByText('شاخه جدا')).toHaveCount(0)
  })

  test('پنل سوپریوزر: آمار فارسی، دسترسی‌ها و درصد از پاداش', async ({ page }) => {
    await login(page, '09120000000')
    await expect(page).toHaveURL(/superuser/)
    await expect(page.getByTestId('admin-stats')).toBeVisible()
    await expect(page.getByText('کاربران فعال')).toBeVisible()
    await page.getByRole('link', { name: 'قواعد پورسانت' }).click()
    await expect(page.getByTestId('commission-rules')).toContainText('نماینده')
    await expect(page.getByText('درصد از پاداش').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'ذخیره' }).first()).toBeVisible()
    await page.getByRole('link', { name: 'دسترسی‌ها' }).click()
    await expect(page.getByText('تعیین دسترسی نقش‌ها')).toBeVisible()
    await expect(page.getByTestId('permissions-admin')).toBeVisible()
    await expect(page.getByTestId('perm-senior_manager.withdrawal.approve')).toContainText('تایید برداشت')
  })

  test('مدیر ارشد معیار ارتقاء و کد معرف را می‌بیند', async ({ page }) => {
    await login(page, '09121111111')
    await page.getByRole('link', { name: 'ارتقاء', exact: true }).click()
    await expect(page.getByTestId('promotion-criteria')).toBeVisible()
    await expect(page.getByTestId('promotion-criteria')).toContainText('امتیاز')
    await page.getByRole('link', { name: 'معرف و لینک اشتراکی', exact: true }).click()
    await expect(page.getByTestId('referral-code')).toBeVisible()
  })

  test('سوپریوزر می‌تواند دوره با چند سطح بسازد', async ({ page }) => {
    await login(page, '09120000000')
    await page.getByRole('link', { name: 'دوره‌ها', exact: true }).click()
    await page.getByRole('button', { name: 'دوره جدید' }).click()
    await expect(page.getByText('نمره قبولی (از ۱۰۰)')).toBeVisible()
    const title = `دوره تست پلی‌رایت ${Date.now()}`
    await page.getByLabel('عنوان دوره').fill(title)
    await page.getByRole('button', { name: 'ثبت دوره' }).click()
    await expect(page.getByText(title)).toBeVisible()
  })

  test('گزارشات سوپریوزر نمودار و زیرمجموعه دارد', async ({ page }) => {
    await login(page, '09120000000')
    await page.getByRole('link', { name: 'گزارشات', exact: true }).click()
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
    await page.getByRole('link', { name: 'کاربران' }).click()
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
    await page.getByRole('link', { name: 'دسترسی‌ها' }).click()
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
    await page.getByRole('link', { name: 'تنظیمات' }).click()
    await expect(page.getByTestId('setting-qualification_thresholds')).toBeVisible()
    await expect(page.getByText('حداقل امتیاز نماینده')).toBeVisible()
    await expect(page.locator('textarea.font-mono')).toHaveCount(0)
    await page.getByRole('button', { name: 'ذخیره' }).first().click()
    await expect(page.getByText('تنظیمات ذخیره شد')).toBeVisible()
    await page.getByRole('link', { name: 'رویدادها' }).click()
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
