import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@/components/icons'
import { cn } from '@/lib/utils'

interface MobileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  /** Stick to bottom on mobile, center on md+. Default true. */
  responsive?: boolean
  className?: string
}

/**
 * MobileSheet — bottom-sheet on mobile, centered modal on md+.
 * Wraps Radix Dialog. Use anywhere a Dialog/Modal is needed
 * for an admin form on small screens.
 */
export function MobileSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  responsive = true,
  className,
}: MobileSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bg-background shadow-xl outline-none focus:outline-none',
            responsive
              ? 'left-0 right-0 bottom-0 rounded-t-2xl max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom md:left-1/2 md:right-auto md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg md:max-w-lg md:w-full md:max-h-[85vh] md:data-[state=open]:slide-in-from-top-1/2'
              : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto',
            className,
          )}
          style={{ paddingBottom: 'var(--safe-area-bottom)' }}
        >
          <div className="flex items-start justify-between p-4 md:p-6 border-b border-border sticky top-0 bg-background z-10">
            <div>
              {title && <DialogPrimitive.Title className="text-lg font-semibold text-foreground">{title}</DialogPrimitive.Title>}
              {description && <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">{description}</DialogPrimitive.Description>}
            </div>
            <DialogPrimitive.Close className="rounded-md p-2 -mr-2 -mt-2 hover:bg-muted min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div className="p-4 md:p-6">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
