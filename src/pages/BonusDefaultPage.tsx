import { BonusDefaultFinder } from '../components/BonusDefaultPanel'
import { PageHeader } from '../components/ui'

export function BonusDefaultPage() {
  return (
    <div className="space-y-4" data-testid="bonus-default-page">
      <PageHeader
        title="پاداش پیش‌فرض"
        subtitle="برای هر کاربر و نقش، درصد پاداش ماهانه را بدون حد نصاب امتیاز روشن یا لغو کنید. پورسانت پایه جدا می‌ماند."
      />
      <BonusDefaultFinder />
    </div>
  )
}
