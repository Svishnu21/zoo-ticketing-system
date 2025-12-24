import { Button } from '@/components/ui/Button'

interface ClearCartDialogProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ClearCartDialog({ isOpen, onCancel, onConfirm }: ClearCartDialogProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-3xl border border-forest-green/15 bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-forest-green">Clear Cart</h3>
        <p className="mt-3 text-sm text-muted-foreground">Are you sure you want to clear your cart?</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="sm:min-w-[120px]"
            onClick={onCancel}
          >
            Keep
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
            onClick={onConfirm}
          >
            Clear
          </Button>
        </div>
      </div>
    </div>
  )
}
