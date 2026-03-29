import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  DollarSign, TrendingUp, BookOpen, RefreshCw, CreditCard,
  Loader2, CheckCircle2, User, Plus, Trash2, Send,
} from '@/components/icons'
import { useStaffRole } from '@/hooks/use-staff-role'
import { format, parseISO } from 'date-fns'
import {
  getWeekBounds, getPastWeeksBounds, fetchBookingsForStaffWeek,
  getOrCreateWeekReport, submitWeekReport, reviewWeekReport,
  type WeekBounds, type WeeklyRevenueReport, type StaffWeekResult,
} from '@/services/revenue-service'
import {
  standaloneSalesService, SALE_CATEGORIES, PAYMENT_METHOD_LABELS,
  type StandaloneSale, type SaleCategory, type PaymentMethod,
} from '@/services/standalone-sales-service'
import { toast } from 'sonner'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtGHS(n: number) {
  return `GH₵${n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const METHOD_COLORS: Record<string, string> = {
  cash: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10',
  Cash: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10',
  mobile_money: 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10',
  'Mobile Money': 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10',
  card: 'border-blue-500/30 text-blue-600 bg-blue-500/10',
  Card: 'border-blue-500/30 text-blue-600 bg-blue-500/10',
  not_paid: 'border-rose-500/30 text-rose-600 bg-rose-500/10',
}

const STATUS_COLORS: Record<string, string> = {
  'checked-out': 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10',
  'checked-in': 'border-blue-500/30 text-blue-600 bg-blue-500/10',
  confirmed: 'border-primary/30 text-primary bg-primary/10',
  reserved: 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10',
  cancelled: 'border-rose-500/30 text-rose-600 bg-rose-500/10',
}

const REPORT_STATUS_COLORS: Record<string, string> = {
  draft: 'border-muted-foreground/30 text-muted-foreground bg-muted/40',
  submitted: 'border-yellow-500/30 text-yellow-600 bg-yellow-500/10',
  reviewed: 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10',
}

// ─── Component ────────────────────────────────────────────────────────────────
export function MyRevenuePage() {
  const { userId, staffRecord, role } = useStaffRole()
  const isAdmin = role === 'admin' || role === 'owner'

  // Week selection
  const weekOptions = getPastWeeksBounds(8)
  const [selectedWeek, setSelectedWeek] = useState<WeekBounds>(getWeekBounds())

  // Data
  const [weekResult, setWeekResult] = useState<StaffWeekResult | null>(null)
  const [weekReport, setWeekReport] = useState<WeeklyRevenueReport | null>(null)
  const [loading, setLoading] = useState(false)

  // Log Sale dialog
  const [showLogSale, setShowLogSale] = useState(false)
  const [saleDesc, setSaleDesc] = useState('')
  const [saleCategory, setSaleCategory] = useState<SaleCategory>('food_beverage')
  const [saleQty, setSaleQty] = useState(1)
  const [salePrice, setSalePrice] = useState(0)
  const [saleMethod, setSaleMethod] = useState<PaymentMethod>('cash')
  const [saleNotes, setSaleNotes] = useState('')
  const [saleSubmitting, setSaleSubmitting] = useState(false)

  // Submit report dialog
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [submitNotes, setSubmitNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Admin review dialog
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [reviewing, setReviewing] = useState(false)

  const loadData = useCallback(async () => {
    if (!userId || !staffRecord) return
    setLoading(true)
    try {
      const [result, report] = await Promise.all([
        fetchBookingsForStaffWeek(userId, selectedWeek.weekStart, selectedWeek.weekEnd),
        getOrCreateWeekReport(userId, staffRecord.name, selectedWeek),
      ])
      setWeekResult(result)
      setWeekReport(report)
    } catch (err) {
      console.error('[MyRevenuePage] load error:', err)
      toast.error('Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }, [userId, staffRecord, selectedWeek])

  useEffect(() => { loadData() }, [loadData])

  // ─── Log Sale ────────────────────────────────────────────────────────────
  const resetSaleForm = () => {
    setSaleDesc(''); setSaleCategory('food_beverage'); setSaleQty(1)
    setSalePrice(0); setSaleMethod('cash'); setSaleNotes('')
  }

  const handleLogSale = async () => {
    if (!saleDesc.trim()) { toast.error('Description is required'); return }
    if (salePrice <= 0) { toast.error('Enter a valid price'); return }
    if (!userId || !staffRecord) return
    setSaleSubmitting(true)
    try {
      await standaloneSalesService.addSale({
        description: saleDesc.trim(),
        category: saleCategory,
        quantity: saleQty,
        unitPrice: salePrice,
        notes: saleNotes.trim(),
        staffId: userId,
        staffName: staffRecord.name,
        paymentMethod: saleMethod,
        saleDate: format(new Date(), 'yyyy-MM-dd'),
      })
      toast.success('Sale logged')
      resetSaleForm()
      setShowLogSale(false)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to log sale')
    } finally {
      setSaleSubmitting(false)
    }
  }

  const handleDeleteSale = async (id: string) => {
    if (!confirm('Delete this sale?')) return
    await standaloneSalesService.deleteSale(id)
    toast.success('Sale removed')
    loadData()
  }

  // ─── Submit report ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!weekReport) return
    setSubmitting(true)
    try {
      await submitWeekReport(weekReport.id, submitNotes)
      toast.success('Report submitted for review')
      setShowSubmitDialog(false)
      setSubmitNotes('')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Admin review ────────────────────────────────────────────────────────
  const handleReview = async () => {
    if (!weekReport || !staffRecord) return
    setReviewing(true)
    try {
      await reviewWeekReport(weekReport.id, adminNotes, staffRecord.name)
      toast.success('Report marked as reviewed')
      setShowReviewDialog(false)
      setAdminNotes('')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to review report')
    } finally {
      setReviewing(false)
    }
  }

  const isLocked = weekReport?.status === 'submitted' || weekReport?.status === 'reviewed'

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Revenue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {staffRecord?.name ? `Revenue generated by ${staffRecord.name}` : 'Your personal revenue summary'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={`${selectedWeek.weekStart}|${selectedWeek.weekEnd}`}
            onValueChange={(v) => {
              const [ws, we] = v.split('|')
              const opt = weekOptions.find(w => w.weekStart === ws && w.weekEnd === we)
              if (opt) setSelectedWeek(opt)
            }}
          >
            <SelectTrigger className="w-52 h-9">
              <SelectValue placeholder="Select week" />
            </SelectTrigger>
            <SelectContent>
              {weekOptions.map(w => (
                <SelectItem key={w.weekStart} value={`${w.weekStart}|${w.weekEnd}`}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!isLocked && (
            <Button variant="outline" size="sm" onClick={() => setShowLogSale(true)} className="h-9 gap-1.5">
              <Plus className="w-4 h-4" />Log Sale
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-9 gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Report status banner */}
      {weekReport && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
          weekReport.status === 'reviewed' ? 'bg-emerald-500/10 border-emerald-500/20' :
          weekReport.status === 'submitted' ? 'bg-yellow-500/10 border-yellow-500/20' :
          'bg-muted/30 border-border'
        }`}>
          <div className="flex items-center gap-2">
            {weekReport.status === 'reviewed' && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
            <span className="font-medium capitalize">{weekReport.status}</span>
            {weekReport.status === 'draft' && <span className="text-muted-foreground">— auto-updating until submitted</span>}
            {weekReport.status === 'submitted' && <span className="text-muted-foreground">— awaiting manager review</span>}
            {weekReport.status === 'reviewed' && weekReport.adminNotes && (
              <span className="text-emerald-700">"{weekReport.adminNotes}"</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={REPORT_STATUS_COLORS[weekReport.status]}>
              {weekReport.status}
            </Badge>
            {weekReport.status === 'draft' && (
              <Button size="sm" onClick={() => setShowSubmitDialog(true)} className="h-7 gap-1.5 text-xs">
                <Send className="w-3 h-3" />Submit
              </Button>
            )}
            {weekReport.status === 'submitted' && isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setShowReviewDialog(true)} className="h-7 gap-1.5 text-xs">
                <CheckCircle2 className="w-3 h-3" />Mark Reviewed
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Room Revenue</p>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{fmtGHS(weekResult?.totalRevenue || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Add. Charges</p>
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{fmtGHS(weekResult?.additionalRevenue || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Standalone Sales</p>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">{fmtGHS(weekResult?.standaloneSalesRevenue || 0)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-primary/70 uppercase tracking-wide">Grand Total</p>
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">{fmtGHS(weekResult?.grandRevenue || 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">{weekResult?.bookingCount || 0} booking{weekResult?.bookingCount !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      </div>

      {/* Standalone Sales Table */}
      {(weekResult?.standaloneSales?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Standalone Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date</TableHead>
                  {!isLocked && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekResult!.standaloneSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{SALE_CATEGORIES[sale.category]}</TableCell>
                    <TableCell className="text-right text-sm">{sale.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">{fmtGHS(sale.unitPrice)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtGHS(sale.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${METHOD_COLORS[sale.paymentMethod] || ''}`}>
                        {PAYMENT_METHOD_LABELS[sale.paymentMethod]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sale.saleDate}</TableCell>
                    {!isLocked && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSale(sale.id)} className="text-destructive hover:text-destructive h-7 w-7">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Bookings Breakdown Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            Booking Breakdown
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!loading && (weekResult?.bookings?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No bookings found for this week</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead className="text-right">Room Rate</TableHead>
                    <TableHead className="text-right">Charges</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(weekResult?.bookings || []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">#{row.id.slice(0, 8).toUpperCase()}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{row.guestName}</TableCell>
                      <TableCell>{row.roomNumber}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(parseISO(row.checkIn), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(parseISO(row.checkOut), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtGHS(row.roomRate)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.additionalCharges > 0 ? fmtGHS(row.additionalCharges) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{fmtGHS(row.grandTotal)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs whitespace-nowrap ${METHOD_COLORS[row.paymentMethod] || ''}`}>
                          {row.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize whitespace-nowrap ${STATUS_COLORS[row.status] || 'border-border'}`}>
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Log Sale Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showLogSale} onOpenChange={(o) => { setShowLogSale(o); if (!o) resetSaleForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Standalone Sale</DialogTitle>
            <DialogDescription>Record a cash/non-booking sale (bar, food, services)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Input value={saleDesc} onChange={e => setSaleDesc(e.target.value)} placeholder="e.g. Bar — Soft Drinks" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={saleCategory} onValueChange={v => setSaleCategory(v as SaleCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SALE_CATEGORIES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select value={saleMethod} onValueChange={v => setSaleMethod(v as PaymentMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min={1} value={saleQty} onChange={e => setSaleQty(parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <Label>Unit Price (GH₵)</Label>
                <Input type="number" min={0} step={0.01} value={salePrice} onChange={e => setSalePrice(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            {saleQty > 0 && salePrice > 0 && (
              <p className="text-sm font-semibold">Total: {fmtGHS(saleQty * salePrice)}</p>
            )}
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea value={saleNotes} onChange={e => setSaleNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogSale(false)}>Cancel</Button>
            <Button onClick={handleLogSale} disabled={saleSubmitting}>
              {saleSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Log Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit Report Dialog ─────────────────────────────────────────── */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Weekly Report</DialogTitle>
            <DialogDescription>
              Once submitted, the report is locked and sent for manager review. Total: {fmtGHS(weekResult?.grandRevenue || 0)}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Notes for manager (optional)</Label>
            <Textarea value={submitNotes} onChange={e => setSubmitNotes(e.target.value)} rows={3} placeholder="Any context or comments..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Admin Review Dialog ──────────────────────────────────────────── */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Reviewed</DialogTitle>
            <DialogDescription>Confirm you have reviewed this weekly report.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Feedback for staff (optional)</Label>
            <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} placeholder="Well done, or any comments..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>Cancel</Button>
            <Button onClick={handleReview} disabled={reviewing}>
              {reviewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Mark Reviewed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
