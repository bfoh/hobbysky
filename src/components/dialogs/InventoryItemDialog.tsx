import { useState, useEffect } from 'react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { inventoryService, type InventoryItem } from '@/services/inventory-service'
import { SALE_CATEGORIES } from '@/services/standalone-sales-service'

interface InventoryItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: InventoryItem | null
  onSuccess?: () => void
}

const EMPTY_FORM = {
  name: '',
  category: 'food_beverage',
  unitPrice: '',
  costPrice: '',
  stockQuantity: '0',
  minThreshold: '5',
}

export function InventoryItemDialog({ open, onOpenChange, item, onSuccess }: InventoryItemDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice.toString(),
        costPrice: item.costPrice.toString(),
        stockQuantity: item.stockQuantity.toString(),
        minThreshold: item.minThreshold.toString(),
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [item, open])

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.unitPrice || parseFloat(form.unitPrice) < 0) { toast.error('Valid unit price is required'); return }

    setSaving(true)
    try {
      const data = {
        name: form.name.trim(),
        category: form.category,
        unitPrice: parseFloat(form.unitPrice),
        costPrice: parseFloat(form.costPrice) || 0,
        stockQuantity: parseInt(form.stockQuantity) || 0,
        minThreshold: parseInt(form.minThreshold) || 5,
        isActive: true,
      }

      if (item) {
        await inventoryService.updateItem(item.id, data)
        toast.success('Item updated successfully')
      } else {
        await inventoryService.createItem(data)
        toast.success('Item created successfully')
      }
      
      onOpenChange(false)
      onSuccess?.()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save item')
      console.error('[InventoryItemDialog]', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="item-name">Item Name <span className="text-destructive">*</span></Label>
            <Input
              id="item-name"
              placeholder="e.g. Coca Cola 330ml"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm(f => ({ ...f, category: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SALE_CATEGORIES).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unit-price">Selling Price (GH₵) <span className="text-destructive">*</span></Label>
              <Input
                id="unit-price"
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setForm(f => ({ ...f, unitPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost-price">Cost Price (GH₵)</Label>
              <Input
                id="cost-price"
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm(f => ({ ...f, costPrice: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="stock-qty">Initial Stock</Label>
              <Input
                id="stock-qty"
                type="number"
                min="0"
                step="1"
                disabled={!!item}
                value={form.stockQuantity}
                onChange={(e) => setForm(f => ({ ...f, stockQuantity: e.target.value }))}
              />
              {item && <p className="text-[10px] text-muted-foreground mt-1">Use "Restock" to change stock for existing items.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="threshold">Low Stock Alert at</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                step="1"
                value={form.minThreshold}
                onChange={(e) => setForm(f => ({ ...f, minThreshold: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {item ? 'Save Changes' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
