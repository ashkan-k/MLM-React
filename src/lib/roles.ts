export const roleMeta: Record<string, { title: string; path: string; color: string }> = {
  representative: { title: 'نماینده', path: '/dashboard/representative', color: '#0f6b57' },
  representative_referrer: { title: 'نماینده معرف', path: '/dashboard/representative-referrer', color: '#875200' },
  sales_manager: { title: 'مدیر فروش', path: '/dashboard/sales-manager', color: '#185fa5' },
  development_manager: { title: 'مدیر توسعه', path: '/dashboard/development-manager', color: '#5b3cc4' },
  senior_manager: { title: 'مدیر ارشد', path: '/dashboard/senior-manager', color: '#8a2948' },
  superuser: { title: 'سوپریوزر', path: '/superuser', color: '#1f2a24' },
}

export function dashboardPath(slug?: string | null) {
  return slug ? roleMeta[slug]?.path ?? '/dashboard/representative' : '/login'
}
