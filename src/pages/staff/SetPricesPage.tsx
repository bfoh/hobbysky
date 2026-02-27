import { useEffect, useMemo, useState } from 'react'
import { blink } from '@/blink/client'
import type { RoomType } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrencySync, getCurrencySymbol } from '@/lib/utils'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/use-currency'
import { RefreshCw, Plus, Trash2 } from '@/components/icons'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'

export function SetPricesPage() {
  const db = (blink.db as any)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [edited, setEdited] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { currency } = useCurrency()

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newRoomType, setNewRoomType] = useState({ name: '', capacity: 2, basePrice: 100 })

  // Default room types to seed if none exist
  const defaultRoomTypes = [
    { name: 'Standard Room', capacity: 2, basePrice: 100 },
    { name: 'Executive Suite', capacity: 2, basePrice: 250 },
    { name: 'Deluxe Room', capacity: 2, basePrice: 150 },
    { name: 'Family Room', capacity: 4, basePrice: 200 },
    { name: 'Presidential Suite', capacity: 5, basePrice: 500 }
  ]

  const loadRoomTypes = async () => {
    setLoading(true)
    try {
      const types = await db.roomTypes.list({ orderBy: { column: 'createdAt', ascending: true } })
      setRoomTypes(types || [])
    } catch (err) {
      console.error('Failed to load room types', err)
      toast.error('Failed to load room types')
      setRoomTypes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRoomTypes()
  }, [])

  const seedDefaultTypes = async () => {
    setSaving(true)
    try {
      toast.info('Creating room types...')

      let existingTypes: RoomType[] = []
      try {
        existingTypes = await db.roomTypes.list() || []
      } catch (listErr) {
        console.warn('⚠️ [SetPrices] Could not list existing room types:', listErr)
      }

      const existingNames = new Set(existingTypes.map((t: RoomType) => t.name?.toLowerCase()))

      let created = 0
      let errors: string[] = []

      for (const type of defaultRoomTypes) {
        const existingType = existingTypes.find((t: RoomType) => t.name?.toLowerCase() === type.name.toLowerCase())

        if (!existingType) {
          try {
            await db.roomTypes.create({
              id: crypto.randomUUID(),
              name: type.name,
              capacity: type.capacity,
              basePrice: type.basePrice,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            })
            created++
          } catch (createErr: any) {
            errors.push(`${type.name}: ${createErr?.message || 'Unknown error'}`)
          }
        } else if (!existingType.capacity) {
          try {
            await db.roomTypes.update(existingType.id, { capacity: type.capacity })
            created++
          } catch (updateErr: any) {
            errors.push(`${type.name}: ${updateErr?.message || 'Unknown error'}`)
          }
        }
      }

      if (created > 0) {
        toast.success(`Created ${created} room types`)
      } else if (errors.length > 0) {
        toast.error(`Failed to create room types: ${errors[0]}`)
      } else {
        toast.info('All room types already exist')
      }

      await loadRoomTypes()
    } catch (error: any) {
      toast.error(`Failed to create room types: ${error?.message || 'Check console for details'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomType.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)
    try {
      const typeToCreate = {
        id: crypto.randomUUID(),
        name: newRoomType.name.trim(),
        capacity: Number(newRoomType.capacity) || 2,
        basePrice: Number(newRoomType.basePrice) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await db.roomTypes.create(typeToCreate)
      setRoomTypes(prev => [...prev, typeToCreate as unknown as RoomType])
      setAddDialogOpen(false)
      setNewRoomType({ name: '', capacity: 2, basePrice: 100 })
      toast.success('Room type added')
    } catch (err) {
      console.error('Add failed', err)
      toast.error('Failed to add room type')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setSaving(true)
    try {
      // Check if any properties are using this room type
      const propertiesUsingType = await blink.db.properties.list({ where: { propertyTypeId: deleteId } })
      if (propertiesUsingType && propertiesUsingType.length > 0) {
        toast.error(`Cannot delete this room type. It is currently assigned to ${propertiesUsingType.length} room(s).`)
        setDeleteId(null)
        setSaving(false)
        return
      }

      await db.roomTypes.delete(deleteId)
      setRoomTypes(prev => prev.filter(rt => rt.id !== deleteId))
      toast.success('Room type deleted')
    } catch (err) {
      console.error('Delete failed', err)
      toast.error('Failed to delete room type')
    } finally {
      setDeleteId(null)
      setSaving(false)
    }
  }

  const dirtyCount = useMemo(() => Object.keys(edited).length, [edited])

  const handleChange = (id: string, value: string) => {
    setEdited((prev) => ({ ...prev, [id]: value }))
  }

  const syncPriceToRooms = async (roomTypeId: string, newPrice: number) => {
    try {
      const rooms = await db.rooms.list({ where: { roomTypeId } })
      for (const room of rooms) {
        await db.rooms.update(room.id, { price: newPrice })
      }
      const properties = await blink.db.properties.list({ where: { propertyTypeId: roomTypeId } })
      for (const prop of properties) {
        await blink.db.properties.update(prop.id, { basePrice: newPrice })
      }
    } catch (err) {
      console.warn('Failed to sync price to rooms:', err)
    }
  }

  const saveOne = async (id: string) => {
    const newValue = Number(edited[id])
    if (!isFinite(newValue) || newValue <= 0) {
      toast.error('Enter a valid price')
      return
    }
    setSaving(true)
    try {
      await db.roomTypes.update(id, {
        basePrice: newValue,
        updatedAt: new Date().toISOString()
      })
      await syncPriceToRooms(id, newValue)
      setRoomTypes((prev) => prev.map((rt) => (rt.id === id ? { ...rt, basePrice: newValue } as RoomType : rt)))
      setEdited((prev) => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
      toast.success('Price updated globally')
    } catch (err) {
      toast.error('Failed to update price')
    } finally {
      setSaving(false)
    }
  }

  const saveAll = async () => {
    if (dirtyCount === 0) return
    setSaving(true)
    try {
      for (const [id, val] of Object.entries(edited)) {
        const price = Number(val)
        if (isFinite(price) && price > 0) {
          await db.roomTypes.update(id, {
            basePrice: price,
            updatedAt: new Date().toISOString()
          })
          await syncPriceToRooms(id, price)
        }
      }
      setRoomTypes((prev) => prev.map((rt) => (edited[rt.id] ? { ...rt, basePrice: Number(edited[rt.id]) } : rt)))
      setEdited({})
      toast.success('All prices updated globally')
    } catch (err) {
      toast.error('Failed to save all changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading room types...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Room Types & Prices</h2>
          <p className="text-sm text-muted-foreground">Manage your room types and base prices. These appear on the public Rooms page.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadRoomTypes} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={saveAll} disabled={saving || dirtyCount === 0}>
            {saving ? 'Saving…' : dirtyCount > 0 ? `Save all (${dirtyCount})` : 'Save all prices'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Room types</CardTitle>
            <CardDescription>Add, delete, or edit the base price per night</CardDescription>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Room Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Room Type</DialogTitle>
                <DialogDescription>Create a new category for your properties.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRoomType} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Type Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Ocean View Suite"
                    value={newRoomType.name}
                    onChange={(e) => setNewRoomType({ ...newRoomType, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Base Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      min="1"
                      value={newRoomType.capacity}
                      onChange={(e) => setNewRoomType({ ...newRoomType, capacity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basePrice">Base Price ({getCurrencySymbol(currency)})</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newRoomType.basePrice}
                      onChange={(e) => setNewRoomType({ ...newRoomType, basePrice: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Room Type'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {roomTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No room types found in the database.</p>
              <Button onClick={seedDefaultTypes} disabled={saving} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                {saving ? 'Creating...' : 'Create Default Room Types'}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Current price</TableHead>
                  <TableHead>New price</TableHead>
                  <TableHead className="w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomTypes.map((rt) => (
                  <TableRow key={rt.id}>
                    <TableCell className="font-medium">{rt.name}</TableCell>
                    <TableCell>{rt.capacity || '-'}</TableCell>
                    <TableCell>{formatCurrencySync(rt.basePrice, currency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{getCurrencySymbol(currency)}</span>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="decimal"
                          className="w-32"
                          value={edited[rt.id] ?? String(rt.basePrice ?? '')}
                          onChange={(e) => handleChange(rt.id, e.target.value)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => saveOne(rt.id)} disabled={saving}>
                          Save
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(rt.id)} disabled={saving} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the room type.
              Note: You cannot delete a room type if it is currently assigned to a room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? 'Deleting...' : 'Delete Room Type'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default SetPricesPage


