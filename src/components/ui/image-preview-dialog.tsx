import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface ImagePreviewDialogProps {
  src: string
  alt: string
  title: string
  description?: string
  className?: string
  children?: ReactNode
}

export function ImagePreviewDialog({
  src,
  alt,
  title,
  description,
  className,
  children,
}: ImagePreviewDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn('block overflow-hidden text-left transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2', className)}
          aria-label={`Ver ${title}`}
        >
          {children ?? <img src={src} alt={alt} className="h-full w-full object-cover" />}
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,920px)] bg-white p-3 sm:p-4">
        <DialogHeader className="mb-3 pr-10">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex max-h-[calc(100vh-9rem)] items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          <img src={src} alt={alt} className="max-h-[calc(100vh-9rem)] w-auto max-w-full object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
