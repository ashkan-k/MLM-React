import { expect, test } from '@playwright/test'
import { calculateCommission, chainBaseTotal, mapApiRoles } from '../src/landing/commissionCalc'

const MOCK_RATES = {
  points_per_gateway: 100,
  roles: [
    { slug: 'representative', label: 'نماینده', base_percent: 15, qualified_percent: 20, bonus_delta_percent: 5, points_threshold: 1000, points_per_gateway: 100 },
    { slug: 'representative_referrer', label: 'نماینده معرف', base_percent: 2, qualified_percent: 2, bonus_delta_percent: 0, points_threshold: null, points_per_gateway: 100 },
    { slug: 'sales_manager', label: 'مدیر فروش', base_percent: 6, qualified_percent: 8, bonus_delta_percent: 2, points_threshold: 5000, points_per_gateway: 100 },
    { slug: 'development_manager', label: 'مدیر توسعه', base_percent: 4.5, qualified_percent: 6, bonus_delta_percent: 1.5, points_threshold: 20000, points_per_gateway: 100 },
    { slug: 'senior_manager', label: 'مدیر ارشد', base_percent: 4, qualified_percent: 4, bonus_delta_percent: 0, points_threshold: null, points_per_gateway: 100 },
  ],
}

async function mockLandingApis(page: import('@playwright/test').Page, rates = MOCK_RATES) {
  await page.route('**/api/public/commission-rates', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rates) })
  })
}

test.describe('لندینگ سازمان فروش فینونت', () => {
  test('همهٔ سکشن‌های اصلی و محتوای مرتبط', async ({ page }) => {
    await mockLandingApis(page)
    await page.route('**/api/public/catalog/products', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            type: 'gateway_profit',
            label: 'فینوپال',
            description:
              'ارائه‌دهنده خدمات درگاه پرداخت اینترنتی به کسب‌وکارها و فروشگاه‌های آنلاین، با امکان مدیریت و پردازش هوشمند تراکنش‌ها.\nمدل درآمدزایی نماینده: دریافت سهم درآمد از تراکنش‌های درگاه‌های پرداخت ثبت‌شده و فعال‌شده توسط مشتریان معرفی‌شده؛ ایجاد درآمد مستمر با ادامه فعالیت پذیرندگان.',
            default_code: 'GATEWAY',
            signup_url: 'https://finopal.ir/',
            requires_merchant: true,
            sale_points: 0,
          },
          {
            type: 'subscription',
            label: 'فاپ',
            description:
              'مجموعه‌ای یکپارچه از خدمات پرداخت، استعلام و سرویس‌های کاربردی روزمره در قالب یک اپلیکیشن برای کاربران حقیقی و کسب‌وکارها.\nمدل درآمدزایی نماینده: دریافت سهم درآمد از تراکنش‌های پرداختی و خدمات استعلامی کاربران معرفی‌شده به فاپ.',
            default_code: 'FAP',
            signup_url: 'https://finopal.ir/',
            requires_merchant: false,
            sale_points: 5,
          },
          {
            type: 'finopol',
            label: 'فینوپُل',
            description:
              'ارائه مجموعه‌ای از APIها و وب‌سرویس‌های مالی، هویتی و اطلاعاتی برای کسب‌وکارها، سامانه‌ها و توسعه‌دهندگان نرم‌افزار.\nمدل درآمدزایی نماینده: دریافت سهم درآمد از مصرف سرویس‌ها و تراکنش‌های کسب‌وکارهای معرفی‌شده؛ با ظرفیت ایجاد درآمد مستمر از مشتریان سازمانی.',
            default_code: 'FINOPOL',
            signup_url: 'https://finopol.ir/',
            requires_merchant: false,
            sale_points: 0,
          },
          {
            type: 'finoticket',
            label: 'فینوتیکت',
            description:
              'راهکاری حرفه‌ای برای مدیریت تیکت‌ها، ارتباط با مشتریان، پیگیری درخواست‌ها و سازمان‌دهی فرآیندهای پشتیبانی کسب‌وکارها.\nمدل درآمدزایی نماینده: دریافت پورسانت از فروش و تمدید اشتراک کسب‌وکارهای معرفی‌شده.',
            default_code: 'FINOTICKET',
            signup_url: 'https://finoticket.ir/login',
            requires_merchant: false,
            sale_points: 0,
          },
          {
            type: 'ghalebazar',
            label: 'قالب‌بازار',
            description:
              'مجموعه‌ای گسترده با بیش از ۶ هزار قالب و طرح مدرن وب‌سایت، مبتنی بر فناوری SPA، برای راه‌اندازی سریع و حرفه‌ای کسب‌وکارهای آنلاین.\nمدل درآمدزایی نماینده: دریافت پورسانت از فروش قالب‌های آماده و محصولات دیجیتال به مشتریان معرفی‌شده.',
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

    // هدر / برند — بدون badge سازمان فروش
    await expect(page.getByRole('banner').getByRole('link', { name: 'فینونت', exact: true })).toBeVisible()
    await expect(page.getByTestId('nav-register')).toBeVisible()
    await expect(page.getByRole('banner').locator('span.f-mono', { hasText: 'سازمان فروش' })).toHaveCount(0)
    await expect(page.getByRole('banner')).not.toContainText('رشدلَب')
    await expect(page.getByRole('banner')).not.toContainText('تعرفه')

    // هیرو / شعار
    await expect(page.locator('#top')).toContainText('فینونت؛ بستری برای درآمدی ماندگار')
    await expect(page.locator('#top')).toContainText('فروش پلکانی')
    await expect(page.locator('#top')).not.toContainText('با نرخ رسمی سازمان تصمیم بگیر')
    await expect(page.locator('#top')).not.toContainText('چندسطحی')
    await expect(page.getByTestId('hero-activate')).toBeVisible()
    await expect(page.getByTestId('hero-calc')).toBeVisible()
    await expect(page.locator('#top')).not.toContainText('آزمایشگاه بازاریابی')
    await expect(page.locator('#top')).not.toContainText('پروندهٔ شماره')

    // اسلایدرهای حرکتی حذف شده‌اند
    await expect(page.locator('.anim-marquee, .anim-marquee-fast')).toHaveCount(0)

    // محصولات — عنوان و توضیح از کاتالوگ عمومی (پنل سوپریوزر)
    const tool = page.locator('#tool')
    await expect(tool.getByRole('heading', { name: 'سبد محصولات و خدمات فینو' })).toBeVisible()
    await expect(tool).toContainText('با معرفی محصولات فینو، یک جریان درآمدی مستمر')
    await expect(tool).not.toContainText('محصولات سبد فروش فینونت')
    await expect(tool).not.toContainText('از کاتالوگ رسمی سازمان فروش')
    await expect(tool).not.toContainText('محصول فعال در کاتالوگ سازمان فروش فینونت؛ منبع سهم نمایندگان و مدیران شبکه')
    const products = page.getByTestId('landing-products')
    await expect(products).toBeVisible()
    await expect(products).toContainText('فینوپال')
    await expect(products).toContainText('فاپ')
    await expect(products).toContainText('فینوپُل')
    await expect(products).toContainText('فینوتیکت')
    await expect(products).toContainText('قالب‌بازار')
    await expect(products).toContainText('مدل درآمدزایی نماینده')
    await expect(products).toContainText('درگاه پرداخت اینترنتی')
    const titles = products.locator('h3')
    await expect(titles.nth(0)).toHaveText('فینوپال')
    await expect(titles.nth(1)).toHaveText('فاپ')
    await expect(titles.nth(2)).toHaveText('فینوپُل')
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
    await mockLandingApis(page)
    await page.goto('/')
    await page.getByTestId('hero-activate').click()
    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByTestId('register-ref-gate')).toBeVisible()
  })

  test('ماشین‌حساب سود و CTA', async ({ page }) => {
    await mockLandingApis(page)
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

  test('ماشین‌حساب برای همه نقش‌ها و تغییر مبلغ/درگاه', async ({ page }) => {
    await mockLandingApis(page)
    await page.goto('/')
    const calc = page.getByTestId('landing-calculator')
    await expect(calc).toBeVisible()

    // نماینده: ۱۰۰م سود، ۱۰ درگاه → پایه ۱۵م + پاداش ۵م
    await page.getByTestId('calc-role').selectOption('representative')
    await page.getByTestId('calc-profit').fill('100000000')
    await page.getByTestId('calc-gateways').fill('10')
    await expect(page.getByTestId('calc-base')).toContainText(/۱۵.?۰۰۰.?۰۰۰/)
    await expect(page.getByTestId('calc-bonus')).toContainText(/۵.?۰۰۰.?۰۰۰/)
    await expect(page.getByTestId('calc-total')).toContainText(/۲۰.?۰۰۰.?۰۰۰/)

    // بدون حد نصاب: ۰ درگاه → فقط پایه
    await page.getByTestId('calc-gateways').fill('0')
    await expect(page.getByTestId('calc-bonus')).toContainText(/۰|0/)
    await expect(page.getByTestId('calc-total')).toContainText(/۱۵.?۰۰۰.?۰۰۰/)

    // مدیر فروش: پایه ۶٪، با واجد شرایطی دستی +۲٪
    await page.getByTestId('calc-role').selectOption('sales_manager')
    await page.getByTestId('calc-profit').fill('100000000')
    await page.getByTestId('calc-qualified').check()
    await expect(page.getByTestId('calc-base')).toContainText(/۶.?۰۰۰.?۰۰۰/)
    await expect(page.getByTestId('calc-bonus')).toContainText(/۲.?۰۰۰.?۰۰۰/)
    await expect(page.getByTestId('calc-total')).toContainText(/۸.?۰۰۰.?۰۰۰/)

    // مدیر ارشد: فقط ۴٪ بدون پاداش
    await page.getByTestId('calc-role').selectOption('senior_manager')
    await expect(page.getByTestId('calc-base')).toContainText(/۴.?۰۰۰.?۰۰۰/)
    await expect(page.getByTestId('calc-total')).toContainText(/۴.?۰۰۰.?۰۰۰/)
    await expect(page.getByTestId('calc-qualified')).toHaveCount(0)

    // اسلایدر: رنگ پرشدگی با افزایش مقدار زیاد می‌شود (نه برعکس)
    const slider = page.getByTestId('calc-profit')
    await slider.fill('10000000')
    const lowPct = await slider.evaluate((el) => getComputedStyle(el).getPropertyValue('--pct').trim())
    await slider.fill('500000000')
    const highPct = await slider.evaluate((el) => getComputedStyle(el).getPropertyValue('--pct').trim())
    expect(parseFloat(lowPct)).toBeLessThan(parseFloat(highPct))
    const fillDir = await slider.evaluate((el) => getComputedStyle(el).backgroundImage)
    expect(fillDir).toMatch(/to right|to right/i)
  })

  test('ماشین‌حساب از نرخ API پنل سوپریوزر تبعیت می‌کند', async ({ page }) => {
    await mockLandingApis(page, {
      points_per_gateway: 100,
      roles: [
        { slug: 'representative', label: 'نماینده', base_percent: 11, qualified_percent: 16, bonus_delta_percent: 5, points_threshold: 1000, points_per_gateway: 100 },
        { slug: 'senior_manager', label: 'مدیر ارشد', base_percent: 3, qualified_percent: 3, bonus_delta_percent: 0, points_threshold: null, points_per_gateway: 100 },
      ],
    })
    await page.goto('/')
    await page.getByTestId('calc-role').selectOption('representative')
    await page.getByTestId('calc-profit').fill('100000000')
    await page.getByTestId('calc-gateways').fill('10')
    await expect(page.getByTestId('calc-base')).toContainText(/۱۱.?۰۰۰.?۰۰۰/)
    await expect(page.getByTestId('calc-total')).toContainText(/۱۶.?۰۰۰.?۰۰۰/)
    await page.getByTestId('calc-role').selectOption('senior_manager')
    await expect(page.getByTestId('calc-base')).toContainText(/۳.?۰۰۰.?۰۰۰/)
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

    const custom = mapApiRoles({
      roles: [
        { slug: 'representative', label: 'نماینده', base_percent: 12, qualified_percent: 17, bonus_delta_percent: 5, points_threshold: 1000, points_per_gateway: 100 },
      ],
    })
    const fromPanel = calculateCommission({
      role: 'representative',
      monthlyProfit: 200_000,
      gatewaysThisMonth: 10,
      assumeQualified: false,
      roles: custom,
    })
    expect(fromPanel.baseAmount).toBe(24_000)
    expect(fromPanel.bonusAmount).toBe(10_000)
    expect(fromPanel.totalAmount).toBe(34_000)
  })
})
