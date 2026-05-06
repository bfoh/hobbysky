import { blink } from '@/blink/client'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'

const db = blink.db as any

export type InventoryLogType = 'sale' | 'restock' | 'adjustment' | 'damage'

export interface InventoryItem {
  id: string
  name: string
  category: string
  unitPrice: number
  costPrice: number
  stockQuantity: number
  minThreshold: number
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InventoryLog {
  id: string
  itemId: string
  staffId: string
  staffName: string
  type: InventoryLogType
  quantityChange: number
  previousQuantity: number
  newQuantity: number
  notes?: string
  createdAt: string
}

class InventoryService {
  async getItems(): Promise<InventoryItem[]> {
    return db.inventoryItems.list({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      limit: 500,
    })
  }

  async getAllItems(): Promise<InventoryItem[]> {
    return db.inventoryItems.list({
      orderBy: { name: 'asc' },
      limit: 500,
    })
  }

  async getItem(id: string): Promise<InventoryItem | null> {
    return db.inventoryItems.get(id)
  }

  async createItem(data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
    const id = uuidv4()
    const now = new Date().toISOString()
    const item = await db.inventoryItems.create({
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    })
    return item
  }

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    const item = await db.inventoryItems.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    return item
  }

  async adjustStock(
    itemId: string,
    change: number,
    type: InventoryLogType,
    staffId: string,
    staffName: string,
    notes: string = ''
  ): Promise<void> {
    const item = await this.getItem(itemId)
    if (!item) throw new Error('Item not found')

    const previousQuantity = item.stockQuantity
    const newQuantity = previousQuantity + change

    if (newQuantity < 0 && type === 'sale') {
      throw new Error(`Insufficient stock for ${item.name}`)
    }

    // Update item stock
    await this.updateItem(itemId, { stockQuantity: newQuantity })

    // Create log entry
    await db.inventoryLogs.create({
      id: uuidv4(),
      itemId,
      staffId,
      staffName,
      type,
      quantityChange: change,
      previousQuantity,
      newQuantity,
      notes,
      createdAt: new Date().toISOString(),
    })

    // Check threshold for notifications
    if (newQuantity <= item.minThreshold) {
      toast.warning(`Low Stock Alert: ${item.name} has only ${newQuantity} left!`, {
        duration: 5000,
      })
    }
  }

  async getLogs(itemId?: string): Promise<InventoryLog[]> {
    const options: any = {
      orderBy: { createdAt: 'desc' },
      limit: 1000,
    }
    if (itemId) {
      options.where = { itemId }
    }
    return db.inventoryLogs.list(options)
  }

  async deleteItem(id: string): Promise<void> {
    // We prefer soft delete (isActive = false) for referential integrity
    await this.updateItem(id, { isActive: false })
  }
}

export const inventoryService = new InventoryService()
