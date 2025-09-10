import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  width?: number
  height?: number
  showText?: boolean
}

export function Logo({ className, width = 60, height = 60, showText = true }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        <Image
          src="/agriscan-logo.png"
          alt="AgriScan Logo"
          width={width}
          height={height}
          className="rounded-lg shadow-lg object-cover"
          priority
        />
      </div>
      {showText && (
        <h1 className="text-2xl font-bold text-foreground drop-shadow-sm">
          AgriScan
        </h1>
      )}
    </div>
  )
}
