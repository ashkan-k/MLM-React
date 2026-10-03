import { useAuth } from '../stores/auth'

/** Feature flag from backend FINOPAL_PRODUCT_ORIENTED */
export function useProductOriented() {
  return useAuth((s) => s.user?.features?.product_oriented === true)
}

export function productNavKey(oriented: boolean) {
  return oriented ? 'navProducts' : 'navGateways'
}

export function salesTitleKey(oriented: boolean) {
  return oriented ? 'salesTitle' : 'gwTitle'
}

export function salesSubKey(oriented: boolean) {
  return oriented ? 'gwSubProduct' : 'gwSub'
}

export function commissionsSubKey(oriented: boolean) {
  return oriented ? 'commSubProduct' : 'commSub'
}

export function saleColKey(oriented: boolean) {
  return oriented ? 'saleTitleCol' : 'gateway'
}

export function myProfitKey(oriented: boolean) {
  return oriented ? 'mySaleProfit' : 'gwMyProfit'
}
