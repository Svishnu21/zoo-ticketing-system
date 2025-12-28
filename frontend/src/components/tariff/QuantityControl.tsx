import { Minus, Plus } from 'lucide-react'
import { MAX_QTY_PER_ITEM } from '@/constants/limits'

import type { LocalizedText } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'
import { cn } from '@/utils/cn'

interface QuantityControlProps {
  label: LocalizedText
  price: number
  value: number
  onChange: (value: number) => void
}

export function QuantityControl({ label, price, value, onChange }: QuantityControlProps) {
  const { language } = useLanguage()

  const handleDecrease = () => {
    onChange(Math.max(0, value - 1))
  }

  const handleIncrease = () => {
    if (value >= MAX_QTY_PER_ITEM) return
    onChange(Math.min(MAX_QTY_PER_ITEM, value + 1))
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-lg transition-shadow duration-300 ease-smooth hover:shadow-xl">
      <div>
        <p className="text-sm font-semibold text-forest-green">{label[language]}</p>
        <p className="text-xs text-muted-foreground">₹ {price}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrease}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full bg-soft-bg text-forest-green transition-colors duration-300 ease-smooth',
            'hover:bg-vibrant-green hover:text-white',
            value === 0 && 'opacity-50 hover:bg-soft-bg hover:text-forest-green',
          )}
          aria-label="Decrease quantity"
        >
          <Minus size={18} />
        </button>
        <span className="w-6 text-center text-base font-semibold">{value}</span>
        <button
          type="button"
          onClick={handleIncrease}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-soft-bg text-forest-green transition-colors duration-300 ease-smooth hover:bg-vibrant-green hover:text-white"
          aria-label="Increase quantity"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  )
}
