import { Slot } from '@radix-ui/react-slot'
import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type ButtonVariant = 'default' | 'hero' | 'sunshine' | 'outline'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-vibrant-green text-white hover:bg-forest-green shadow-lg hover:shadow-xl transition-transform duration-300 ease-smooth hover:-translate-y-0.5',
  hero:
    'bg-gradient-to-r from-forest-green via-vibrant-green to-forest-green text-white shadow-lg hover:shadow-xl hover:scale-105 border-2 border-white/20 transition-transform duration-300 ease-smooth',
  sunshine:
    'bg-accent-yellow text-forest-green shadow-lg hover:shadow-xl hover:scale-105 transition-transform duration-300 ease-smooth',
  outline:
    'border-2 border-forest-green bg-transparent text-forest-green shadow-lg hover:bg-forest-green hover:text-white transition-colors duration-300 ease-smooth',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-11 px-6 py-2 rounded-2xl text-sm font-semibold',
  sm: 'h-9 px-4 py-1.5 rounded-xl text-sm font-medium',
  lg: 'h-14 px-10 text-base rounded-3xl font-semibold',
  icon: 'h-10 w-10 rounded-full flex items-center justify-center',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'default', size = 'default', type = 'button', asChild = false, ...props },
    ref,
  ) => {
    const mergedClassName = cn(
      'inline-flex items-center justify-center gap-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-transform duration-300 ease-smooth active:translate-y-0.5',
      variantClasses[variant],
      sizeClasses[size],
      className,
    )

    if (asChild) {
      return <Slot className={mergedClassName} {...props} />
    }

    return (
      <button ref={ref} type={type} className={mergedClassName} {...props} />
    )
  },
)

Button.displayName = 'Button'
