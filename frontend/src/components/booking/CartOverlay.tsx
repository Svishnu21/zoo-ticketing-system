import { Minus, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

export type CartOverlayItem = {
  id: string
  label: string
  quantity: number
  price: number
  canIncrement?: boolean
  onIncrement: () => void
  onDecrement: () => void
}

interface CartOverlayProps {
  isOpen: boolean
  onClose: () => void
  totalItems: number
  items: CartOverlayItem[]
  totalAmount: number
  formattedTotal: string
  onCheckout: () => void
  onClearRequest: () => void
}

export function CartOverlay({
  isOpen,
  onClose,
  totalItems,
  items,
  totalAmount,
  formattedTotal,
  onCheckout,
  onClearRequest,
}: CartOverlayProps) {
  if (!isOpen) {
    return null
  }

  const visibleItems = items.filter((item) => item.quantity > 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-[620px] overflow-hidden rounded-3xl bg-white shadow-2xl transition-transform duration-300 ease-out"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-4 bg-[#E8F5E9] px-6 py-5 text-forest-green">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-forest-green/70">
              {visibleItems.length > 0 ? 'Review your selections' : 'Cart is empty'}
            </p>
            <h2 className="text-2xl font-bold">{`Your Cart (${totalItems})`}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onClearRequest}
              className="text-sm font-semibold text-forest-green underline-offset-4 transition hover:text-forest-green/70 hover:underline disabled:text-forest-green/40 disabled:hover:no-underline"
              disabled={visibleItems.length === 0}
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-forest-green/20 bg-white text-forest-green transition hover:bg-forest-green hover:text-white"
              aria-label="Close cart overlay"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="max-h-[360px] overflow-y-auto px-6 py-6">
          {visibleItems.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center rounded-3xl bg-[#F4FBF6] text-center text-forest-green/70">
              <p className="text-lg font-semibold">No tickets added yet.</p>
              <p className="mt-2 text-sm">Add tickets to see them here and continue to checkout.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleItems.map((item) => {
                const lineTotal = item.price * item.quantity
                const displayLabel = item.id === 'zoo_child' ? 'Child (5 to 12 years)' : item.label
                return (
                  <article
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border border-forest-green/15 bg-white px-5 py-4 text-forest-green shadow-sm"
                  >
                    <div>
                      <h3 className="text-base font-semibold">{displayLabel}</h3>
                      <p className="text-sm text-forest-green/70">₹ {item.price.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} each</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 rounded-2xl border border-forest-green/25 bg-forest-green/10 px-3 py-2">
                        <button
                          type="button"
                          onClick={item.onDecrement}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-green/20 bg-white text-forest-green transition hover:bg-forest-green hover:text-white"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={18} aria-hidden="true" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={item.onIncrement}
                          className={cn(
                            'flex h-9 w-9 items-center justify-center rounded-full border border-forest-green/20 bg-white text-forest-green transition hover:bg-forest-green hover:text-white',
                            item.canIncrement === false && 'cursor-not-allowed opacity-50 hover:bg-white hover:text-forest-green',
                          )}
                          aria-label="Increase quantity"
                          disabled={item.canIncrement === false}
                        >
                          <Plus size={18} aria-hidden="true" />
                        </button>
                      </div>
                      <p className="w-20 text-right text-base font-semibold">₹ {lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <p className="rounded-2xl bg-[#FFEAEA] px-4 py-3 text-center text-sm font-semibold text-[#C62828]">
            Cancellation/Refund is not available.
          </p>
        </div>

        <footer className="flex flex-col gap-4 bg-forest-green px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">Grand Total</p>
            <p className="text-3xl font-bold">₹ {formattedTotal}</p>
          </div>
          <Button
            variant="sunshine"
            size="lg"
            className="w-full text-[#1F1F1F] sm:w-auto"
            onClick={onCheckout}
            disabled={visibleItems.length === 0 || totalAmount <= 0}
          >
            Checkout
          </Button>
        </footer>
      </div>
    </div>
  )
}
