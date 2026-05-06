import { blink } from '@/blink/client'
import { format } from 'date-fns'
import { inventoryService } from './inventory-service'

const db = blink.db as any

// ─── Types ────────────────────────────────────────────────────────────────────
export type SaleCategory = 'food_beverage' | 'room_service' | 'minibar' | 'other'
export type PaymentMethod = 'cash' | 'mobile_money' | 'card'

export interface StandaloneSale {
  id: string
  description: string
  category: SaleCategory
  quantity: number
  unitPrice: number
  amount: number
  notes: string
  staffId: string
  staffName: string
  saleDate: string      // YYYY-MM-DD
  paymentMethod: PaymentMethod
  itemId?: string       // Link to inventory item
  createdAt: string
}

export interface CreateSaleData {
  description: string
  category: SaleCategory
  quantity: number
  unitPrice: number
  notes?: string
  staffId: string
  staffName: string
  saleDate?: string
  paymentMethod: PaymentMethod
  itemId?: string
}

export const SALE_CATEGORIES: Record<SaleCategory, string> = {
  food_beverage: 'Food & Beverage',
  room_service: 'Room Service',
  minibar: 'Minibar',
  other: 'Other',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  card: 'Card',
}

// ─── Service ──────────────────────────────────────────────────────────────────
class StandaloneSalesService {
  async addSale(data: CreateSaleData): Promise<StandaloneSale> {
    const amount = data.quantity * data.unitPrice
    const sale = await db.standaloneSales.create({
      description: data.description,
      category: data.category,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      amount,
      notes: data.notes || '',
      staffId: data.staffId,
      staffName: data.staffName,
      saleDate: data.saleDate || format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: data.paymentMethod,
      itemId: data.itemId || null,
      createdAt: new Date().toISOString(),
    })

    // If linked to an inventory item, adjust stock
    if (data.itemId) {
      try {
        await inventoryService.adjustStock(
          data.itemId,
          -data.quantity,
          'sale',
          data.staffId,
          data.staffName,
          `Sale: ${data.description}`
        )
      } catch (err: any) {
        console.error('[StandaloneSalesService] Failed to adjust stock:', err)
        // We don't throw here to avoid failing the sale if stock adjustment fails
        // but the item might have already been checked in the UI
      }
    }

    return sale
  }

  async getSalesForStaff(
    staffId: string,
    weekStart: string,
    weekEnd: string
  ): Promise<StandaloneSale[]> {
    const all: StandaloneSale[] = await db.standaloneSales.list({
      where: { staffId },
      orderBy: { createdAt: 'desc' },
      limit: 500,
    })
    return all.filter((s) => s.saleDate >= weekStart && s.saleDate <= weekEnd)
  }

  async getAllSalesForWeek(weekStart: string, weekEnd: string): Promise<StandaloneSale[]> {
    const all: StandaloneSale[] = await db.standaloneSales.list({
      orderBy: { createdAt: 'desc' },
      limit: 1000,
    })
    return all.filter((s) => s.saleDate >= weekStart && s.saleDate <= weekEnd)
  }

  async getAllSales(): Promise<StandaloneSale[]> {
    return db.standaloneSales.list({
      orderBy: { createdAt: 'desc' },
      limit: 2000,
    })
  }

  async deleteSale(id: string): Promise<void> {
    await db.standaloneSales.delete(id)
  }
}

export const standaloneSalesService = new StandaloneSalesService()
