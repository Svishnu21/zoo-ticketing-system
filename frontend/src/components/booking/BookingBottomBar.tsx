import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/Button'

interface Props {
  totalAmount: number
  formattedTotal: string
  onCheckout: () => void
  disabled?: boolean
  checkoutLabel?: string
}

export function BookingBottomBar({ totalAmount, formattedTotal, onCheckout, disabled, checkoutLabel }: Props) {
  if (totalAmount <= 0) return null

  const content = (
    <div className="fixed bottom-0 left-0 z-[100] w-full border-t border-gray-300 bg-white p-4 shadow-2xl">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-forest-green">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-forest-green/70">Current total</p>
          <p className="text-3xl font-bold">₹ {formattedTotal}</p>
        </div>
        <Button variant="hero" size="lg" className="w-full sm:w-auto" onClick={onCheckout} disabled={disabled}>
          {checkoutLabel ?? 'Proceed to Payment'}
        </Button>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null

  return createPortal(content, document.body)
}

export default BookingBottomBar
