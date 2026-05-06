import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { inventoryService, type InventoryItem } from '@/services/inventory-service'

interface RestockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
  staffId: string
  staffName: string
  onSuccess?: () => void
}

export function RestockDialog({ open, onOpenChange, item, staffId, staffName, onSuccess }: RestockDialogProps) {
  const [amount, setAmount] = useState('0')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!item) return
    const val = parseInt(amount)
    if (isNaN(val) || val === 0) { toast.error('Enter a valid amount'); return }

    setSaving(true)
    try {
      await inventoryService.adjustStock(
        item.id,
        val,
        val > 0 ? 'restock' : 'adjustment',
        staffId,
        staffName,
        notes.trim() || (val > 0 ? 'Manual restock' : 'Manual adjustment')
      )
      toast.success('Stock adjusted successfully')
      setAmount('0')
      setNotes('')
      onOpenChange(false)
      onSuccess?.()
    } catch (e: any) {
      toast.error(e.message || 'Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  if (!item) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock: {item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-muted/50 rounded-lg p-3 text-sm flex justify-between">
            <span className="text-muted-foreground">Current Stock:</span>
            <span className="font-bold">{item.stockQuantity} units</span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-amount">Adjustment Amount (can be negative)</Label>
            <Input
              id="adjust-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 10 for restock, -2 for damage"
            />
            <p className="text-[10px] text-muted-foreground">New stock will be: <span className="font-medium text-foreground">{item.stockQuantity + (parseInt(amount) || 0)}</span></p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-notes">Notes</Label>
            <Textarea
              id="adjust-notes"
              placeholder="Reason for adjustment (e.g. Weekly restock, Damage during transport)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
