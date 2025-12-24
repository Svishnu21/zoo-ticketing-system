import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/Button'

interface CheckoutConfirmationModalProps {
  isOpen: boolean
  selectedDateLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function CheckoutConfirmationModal({
  isOpen,
  selectedDateLabel,
  onConfirm,
  onCancel,
}: CheckoutConfirmationModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md space-y-5 rounded-3xl border border-forest-green/20 bg-white p-6 text-center shadow-2xl">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-forest-green/20 bg-forest-green/10 text-forest-green">
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-forest-green">Confirmation</h3>
          <p className="text-sm text-muted-foreground">
            Your visit is scheduled for this date: <span className="font-semibold text-forest-green">{selectedDateLabel}</span>.
            Kindly confirm to proceed.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600 sm:min-w-[120px]"
            onClick={onCancel}
          >
            No
          </Button>
          <Button
            type="button"
            variant="hero"
            size="sm"
            className="sm:min-w-[120px]"
            onClick={onConfirm}
          >
            Yes
          </Button>
        </div>
      </div>
    </div>
  )
}
