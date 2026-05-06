import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Loader2, 
  Plus, 
  Package, 
  History, 
  AlertTriangle, 
  RefreshCw, 
  Edit2, 
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useStaffRole } from '@/hooks/use-staff-role'
import { inventoryService, type InventoryItem, type InventoryLog } from '@/services/inventory-service'
import { SALE_CATEGORIES } from '@/services/standalone-sales-service'
import { InventoryItemDialog } from '@/components/dialogs/InventoryItemDialog'
import { RestockDialog } from '@/components/dialogs/RestockDialog'
import { format } from 'date-fns'

export function InventoryPage() {
  const { userId, staffRecord, loading: roleLoading } = useStaffRole()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Dialog states
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [restockDialogOpen, setRestockDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [itemsData, logsData] = await Promise.all([
        inventoryService.getAllItems(),
        inventoryService.getLogs()
      ])
      setItems(itemsData)
      setLogs(logsData)
    } catch (err) {
      console.error('[InventoryPage] Load failed:', err)
      toast.error('Failed to load inventory data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  )

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor stock levels, manage products, and track accountability in real-time.
          </p>
        </div>
        <Button className="gap-2" onClick={() => { setSelectedItem(null); setItemDialogOpen(true); }}>
          <Plus className="w-4 h-4" /> Add New Item
        </Button>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock" className="gap-2">
            <Package className="w-4 h-4" /> Stock Levels
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="w-4 h-4" /> Audit Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base font-medium">Product Inventory</CardTitle>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Current Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          No items found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="secondary" className="capitalize">
                              {SALE_CATEGORIES[item.category as keyof typeof SALE_CATEGORIES] || item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            GH₵ {item.unitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-lg font-bold ${item.stockQuantity <= item.minThreshold ? 'text-destructive' : 'text-foreground'}`}>
                                {item.stockQuantity}
                              </span>
                              {item.stockQuantity <= item.minThreshold && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 uppercase animate-pulse">
                                  Low Stock
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.isActive ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => { setSelectedItem(item); setRestockDialogOpen(true); }}>
                                <RefreshCw className="w-3.5 h-3.5" /> Restock
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedItem(item); setItemDialogOpen(true); }}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Audit Trail (Traceability)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">Final Stock</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          No activity logs yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => {
                        const item = items.find(i => i.id === log.itemId)
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                            </TableCell>
                            <TableCell className="text-xs font-medium">{log.staffName}</TableCell>
                            <TableCell className="text-sm">{item?.name || 'Deleted Item'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`capitalize text-[10px] ${
                                log.type === 'sale' ? 'bg-orange-50 text-orange-700' :
                                log.type === 'restock' ? 'bg-emerald-50 text-emerald-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {log.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`flex items-center justify-end gap-1 font-mono text-sm ${log.quantityChange > 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                {log.quantityChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(log.quantityChange)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm">
                              {log.newQuantity}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={log.notes}>
                              {log.notes || '—'}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InventoryItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={selectedItem}
        onSuccess={load}
      />
      
      {userId && staffRecord && (
        <RestockDialog
          open={restockDialogOpen}
          onOpenChange={setRestockDialogOpen}
          item={selectedItem}
          staffId={userId}
          staffName={staffRecord.name}
          onSuccess={load}
        />
      )}
    </div>
  )
}
