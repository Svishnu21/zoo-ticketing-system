import { Megaphone } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface ClosedDateModalProps {
  isOpen: boolean
  onClose: () => void
  closedDay?: string
}

export function ClosedDateModal({ isOpen, onClose, closedDay = 'Tuesdays' }: ClosedDateModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <Megaphone size={28} aria-hidden="true" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-red-600">Closed on {closedDay}</h2>
        <p className="mb-8 text-sm leading-relaxed text-forest-green">
          The zoo is closed on the selected date. Please choose another date to proceed with booking.
        </p>
        <Button
          variant="sunshine"
          size="lg"
          className={cn('w-full justify-center rounded-2xl font-semibold text-[#1F5135] shadow-lg')}
          onClick={onClose}
        >
          Choose Another Date
        </Button>
      </div>
    </div>
  )
}
