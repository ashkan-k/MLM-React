import { expect, test } from '@playwright/test'
import { calculateCommission, chainBaseTotal } from '../src/landing/commissionCalc'

test.describe('لندینگ سازمان فروش فینونت', () => {
  test('همهٔ سکشن‌های اصلی و محتوای مرتبط', async ({ page }) => {
    await page.route('**/api/public/catalog/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            type: 'gateway_profit',
            label: 'فینوپال',
            default_code: 'GATEWAY',
            signup_url: 'https://finopal.ir/',
            requires_merchant: true,
            sale_points: 0,
          },
          {
            type: 'ticketing',
            label: 'فینوتیکت',
            default_code: 'TICKETING',
            signup_url: 'https://finopal.ir/panel/tickets',
            requires_merchant: false,
            sale_points: 10,
          },
          {
            type: 'subscription',
            label: 'اپلیکیشن فاپ',
            description: 'اپلیکیشن جامع خدمات استعلام و پرداخت فاپ',
            default_code: 'FAP',
            signup_url: 'https://finopal.ir/',
            requires_merchant: false,
            sale_points: 5,
          },
          {
            type: 'ghalebazar',
            label: 'قالب‌بازار',
            default_code: 'GHALEBAZAR',
            signup_url: 'https://ghalebazar.ir/',
            requires_merchant: false,
            sale_points: 5,
          },
        ]),
      })
    })

    await page.goto('/')
    await expect(page.getByTestId('lab-landing')).toBeVisible()

    // هدر / برند
    await expect(page.getByRole('banner').getByRole('link', { name: /فینونت سازمان فروش/ })).toBeVisible()
    await expect(page.getByTestId('nav-register')).toBeVisible()
    await expect(page.getByRole('banner')).not.toContainText('رشدلَب')
    await expect(page.getByRole('banner')).not.toContainText('تعرفه')

    // هیرو / شعار
    await expect(page.locator('#top')).toContainText('فینونت در شبکه همکاری و فروش فینو')
    await expect(page.locator('#top')).toContainText('فروش پلکانی')
    await expect(page.locator('#top')).not.toContainText('چندسطحی')
    await expect(page.locator('#top')).not.toContainText('شبکه‌ای')
    await expect(page.getByTestId('hero-activate')).toBeVisible()
    await expect(page.getByTestId('hero-calc')).toBeVisible()
    await expect(page.locator('#top')).not.toContainText('آزمایشگاه بازاریابی')
    await expect(page.locator('#top')).not.toContainText('پروندهٔ شماره')

    // اسلایدرهای حرکتی حذف شده‌اند
    await expect(page.locator('.anim-marquee, .anim-marquee-fast')).toHaveCount(0)

    // محصولات — عنوان و توضیح از کاتالوگ عمومی (پنل سوپریوزر)
    const tool = page.locator('#tool')
    await expect(tool.getByRole('heading', { name: 'محصولات سبد فروش فینونت' })).toBeVisible()
    await expect(tool).not.toContainText('داخل جعبه‌ابزار چه خبر است؟')
    await expect(tool).not.toContainText('همان محصولات فعال کاتالوگ سازمان فروش')
    const products = page.getByTestId('landing-products')
    await expect(products).toBeVisible()
    await expect(products).toContainText('فینوپال')
    await expect(products).toContainText('فینوتیکت')
    await expect(products).toContainText('قالب‌بازار')
    await expect(products).toContainText('اپلیکیشن فاپ')
    await expect(products).toContainText('اپلیکیشن جامع خدمات استعلام و پرداخت فاپ')
    await expect(page.getByTestId('product-link-GATEWAY')).toHaveAttribute('href', /finopal\.ir/)
    await expect(page.getByTestId('product-link-FAP')).toHaveAttribute('href', /finopal\.ir/)
    await expect(page.getByTestId('product-link-GHALEBAZAR')).toHaveAttribute('href', /ghalebazar\.ir/)

    // چرا فینونت
    await expect(page.locator('#why')).toContainText('چرا فینونت')
    await expect(page.locator('#why')).toContainText('عضویت رایگان')

    // ماشین‌حساب
    await expect(page.getByTestId('landing-calculator')).toBeVisible()
    await expect(page.locator('#calc')).toContainText('ماشین‌حساب سود')

    // مسیر — تایم‌لاین عمودی
    const path = page.locator('#path')
    await expect(path.getByRole('heading', { name: 'مسیر عضویت، قدم‌به‌قدم' })).toBeVisible()
    await expect(path.locator('.absolute.right-\\[27px\\]')).toHaveCount(1)
    await expect(path.getByText('گام ۱', { exact: true })).toBeVisible()
    await expect(path.getByText('گام ۴', { exact: true })).toBeVisible()
    await expect(path).not.toContainText('روز ۱')

    // FAQ عمومی
    const faq = page.getByTestId('landing-faq')
    await expect(faq).toBeVisible()
    await expect(faq).toContainText('عضویت رایگان است؟')
    await expect(faq).toContainText('پورسانت چطور محاسبه می‌شود؟')
    await expect(faq).not.toContainText('فینوتیکت')
    await expect(faq).not.toContainText('قالب‌بازار')

    // فوتر
    const footer = page.getByTestId('landing-footer')
    await expect(footer).toContainText('سازمان فروش پلکانی')
    await expect(footer).not.toContainText('چندسطحی')
    await expect(footer).not.toContainText('شبکه‌ای')
    await expect(footer).toContainText('finonet.ir')
    await expect(footer).not.toContainText('فهرست آزمایشگاه')
    await expect(footer).not.toContainText('کانسپت ۰۱')
    await expect(footer).not.toContainText('رشدلَب')
    await expect(footer).not.toContainText('ولی‌عصر')

    // بخش‌های حذف‌شدهٔ قالب خام
    await expect(page.getByText('اگر خوشت آمد، این‌ها منتظرند')).toHaveCount(0)
    await expect(page.getByText('آن‌ها هم اول آزمایش کردند')).toHaveCount(0)
    await expect(page.getByText(/فرم شمارهٔ ۰۰۱/)).toHaveCount(0)
  })

  test('دکمه‌های عضویت به ثبت‌نام می‌روند', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('hero-activate').click()
    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByTestId('register-ref-gate')).toBeVisible()
  })

  test('ماشین‌حساب سود و CTA', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('hero-calc').click()
    await expect(page.getByTestId('landing-calculator')).toBeVisible()

    await page.getByTestId('calc-role').selectOption('representative')
    await expect(page.getByTestId('calc-base')).toContainText(/۱۵|15/)
    await expect(page.getByTestId('calc-total')).toBeVisible()
    await expect(page.getByTestId('calc-bonus')).toContainText(/۵|5|۰|0/)

    await page.getByTestId('calc-cta').click()
    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByTestId('register-ref-gate')).toBeVisible()
  })

  test('منطق ماشین‌حساب با نرخ‌های سازمان', () => {
    const alone = calculateCommission({
      role: 'representative',
      monthlyProfit: 100_000,
      gatewaysThisMonth: 0,
      assumeQualified: false,
    })
    expect(alone.baseAmount).toBe(15_000)
    expect(alone.bonusAmount).toBe(0)

    const qualified = calculateCommission({
      role: 'representative',
      monthlyProfit: 100_000,
      gatewaysThisMonth: 10,
      assumeQualified: false,
    })
    expect(qualified.qualified).toBe(true)
    expect(qualified.totalAmount).toBe(20_000)
    expect(chainBaseTotal(100_000)).toBe(31_500)
  })
})
