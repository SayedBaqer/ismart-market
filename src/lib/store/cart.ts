import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  name: string
  sku: string
  price: number       // BHD
  imageUrl: string | null
  qty: number
  selected: boolean   // whether this item is included when confirming the order
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  addItem: (item: Omit<CartItem, 'qty' | 'selected'>, qty?: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  toggleSelected: (productId: string) => void
  setAllSelected: (selected: boolean) => void
  clearCart: () => void
  openCart: () => void
  closeCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item, qty = 1) => {
        const existing = get().items.find((i) => i.productId === item.productId)
        if (existing) {
          set((s) => ({
            items: s.items.map((i) =>
              i.productId === item.productId ? { ...i, qty: i.qty + qty } : i,
            ),
            isOpen: true,
          }))
        } else {
          set((s) => ({ items: [...s.items, { ...item, qty, selected: true }], isOpen: true }))
        }
      },

      removeItem: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId)
          return
        }
        set((s) => ({
          items: s.items.map((i) => (i.productId === productId ? { ...i, qty } : i)),
        }))
      },

      toggleSelected: (productId) =>
        set((s) => ({
          items: s.items.map((i) => (i.productId === productId ? { ...i, selected: !i.selected } : i)),
        })),

      setAllSelected: (selected) =>
        set((s) => ({ items: s.items.map((i) => ({ ...i, selected })) })),

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
    }),
    {
      name: 'ismart-cart',
      version: 1,
      // Older persisted carts predate the `selected` field — default them to selected
      // so items don't silently drop out of checkout after this update.
      migrate: (persisted) => {
        const state = persisted as { items?: Array<Record<string, unknown>> }
        if (state?.items) {
          state.items = state.items.map((i) => ({ selected: true, ...i }))
        }
        return state as unknown as CartState
      },
    },
  ),
)

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0)
}

export function cartItemCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.qty, 0)
}

/** Subtotal of only the items currently selected for order confirmation. */
export function selectedSubtotal(items: CartItem[]) {
  return items.filter((i) => i.selected).reduce((sum, i) => sum + i.price * i.qty, 0)
}
