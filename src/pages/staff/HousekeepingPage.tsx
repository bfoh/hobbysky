import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, CheckCircle2, Clock, Search, User, AlertCircle, Trash2 } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { blink } from '@/blink/client'
import { toast } from 'sonner'
import { activityLogService } from '@/services/activity-log-service'
import { format } from 'date-fns'
import { sendTaskAssignmentEmail } from '@/services/task-notification-service'

import { housekeepingService } from '@/services/housekeeping-service'
import type { HousekeepingTask, Staff, Room } from '@/types'

// Removed local HousekeepingTask interface in favor of shared type


// Local interfaces removed in favor of shared types

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedTask, setSelectedTask] = useState<HousekeepingTask | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [completionNotes, setCompletionNotes] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load staff and rooms first (these should always exist)
      const [staffData, roomsData] = await Promise.all([
        blink.db.staff.list().catch((e) => {
          console.warn('Failed to load staff:', e)
          return []
        }),
        blink.db.rooms.list().catch((e) => {
          console.warn('Failed to load rooms:', e)
          return []
        })
      ])

      setStaff(staffData as unknown as Staff[])
      setRooms(roomsData as unknown as Room[])

      // Try to load housekeeping tasks (table may not exist)
      try {
        console.log('🧹 [HousekeepingPage] Loading housekeeping tasks...')
        const tasksData = await blink.db.housekeepingTasks.list({ orderBy: { createdAt: 'desc' } })
        console.log('✅ [HousekeepingPage] Loaded tasks:', tasksData.length)
        setTasks(tasksData as unknown as HousekeepingTask[])
      } catch (taskError) {
        console.error('❌ [HousekeepingPage] Failed to load housekeeping tasks:', taskError)
        console.error('ℹ️ [HousekeepingPage] The housekeeping_tasks table may not exist in Supabase. Please create it.')
        setTasks([])

        // Show a helpful message to the user
        toast.error('Housekeeping tasks table not found. Please create it in Supabase.', {
          duration: 10000,
          description: 'See console for SQL instructions.'
        })
      }
    } catch (error) {
      console.error('Failed to load housekeeping data:', error)
      toast.error('Failed to load housekeeping data')
    } finally {
      setLoading(false)
    }
  }

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return 'Unassigned'
    const staffMember = staff.find(s => s.id === staffId)
    return staffMember?.name || 'Unknown'
  }

  const handleCompleteTask = async () => {
    if (!selectedTask) return

    try {
      setIsCompleting(true)

      console.log(`[HousekeepingPage] Completing task ${selectedTask.id} for room ${selectedTask.roomNumber}`)

      const result = await housekeepingService.completeTask(
        selectedTask.id,
        selectedTask.roomNumber,
        completionNotes || selectedTask.notes || ''
      )

      if (result.success) {
        // Log the task completion
        await activityLogService.logTaskCompleted(selectedTask.id, {
          title: `Room ${selectedTask.roomNumber} Cleaning`,
          roomNumber: selectedTask.roomNumber,
          completedBy: getStaffName(selectedTask.assignedTo),
          completedAt: new Date().toISOString(),
          notes: completionNotes
        }).catch(err => console.error('Failed to log task completion:', err))

        toast.success(`Task completed! Room ${selectedTask.roomNumber} is likely available now.`)

        // Refresh data
        await loadData()
        setSelectedTask(null)
        setCompletionNotes('')
      } else {
        console.error('Failed to complete task via service:', result.error)
        toast.error('Failed to complete task: ' + result.error)
      }
    } catch (error: any) {
      console.error('Failed to complete task:', error)
      toast.error('Failed to complete task')
    } finally {
      setIsCompleting(false)
    }
  }

  const handleAssignTask = async (taskId: string, staffId: string) => {
    try {
      // Update task assignment
      await blink.db.housekeepingTasks.update(taskId, {
        assignedTo: staffId,
        status: 'in_progress'
      })

      // Get task and staff details for email
      const task = tasks.find(t => t.id === taskId)
      const assignedStaff = staff.find(s => s.id === staffId)

      if (task && assignedStaff) {
        // Generate completion URL
        const completionUrl = `${window.location.origin}/task-complete/${taskId}`

        // Send email notification
        console.log('📧 [HousekeepingPage] Sending task assignment email...', {
          taskId,
          roomNumber: task.roomNumber,
          staffEmail: assignedStaff.email
        })

        const emailResult = await sendTaskAssignmentEmail({
          employeeName: assignedStaff.name,
          employeeEmail: assignedStaff.email,
          employeePhone: assignedStaff.phone,
          roomNumber: task.roomNumber,
          taskNotes: task.notes || '',
          taskId: task.id,
          completionUrl: completionUrl
        })

        if (emailResult.success) {
          toast.success(`Task assigned to ${assignedStaff.name}. Email notification sent!`)
        } else {
          toast.success(`Task assigned to ${assignedStaff.name}. Email notification failed.`)
          console.warn('Email notification failed:', emailResult.error)
        }
      } else {
        toast.success('Task assigned successfully')
      }

      // Log the task assignment
      await activityLogService.log({
        action: 'assigned',
        entityType: 'task',
        entityId: taskId,
        details: {
          title: `Room ${task.roomNumber} Cleaning`,
          roomNumber: task.roomNumber,
          assignedTo: assignedStaff.name,
          assignedToEmail: assignedStaff.email
        }
      }).catch(err => console.error('Failed to log task assignment:', err))

      await loadData()
    } catch (error) {
      console.error('Failed to assign task:', error)
      toast.error('Failed to assign task')
    }
  }

  const handleDeleteClick = (taskId: string) => {
    setDeleteId(taskId)
  }

  const confirmDelete = async () => {
    if (!deleteId) return

    // Get task details before deletion for logging
    const task = tasks.find(t => t.id === deleteId)

    try {
      await blink.db.housekeepingTasks.delete(deleteId)

      // Log the task deletion
      if (task) {
        await activityLogService.log({
          action: 'deleted',
          entityType: 'task',
          entityId: deleteId,
          details: {
            title: `Room ${task.roomNumber} Cleaning`,
            roomNumber: task.roomNumber,
            status: task.status,
            deletedAt: new Date().toISOString()
          }
        }).catch(err => console.error('Failed to log task deletion:', err))
      }

      toast.success('Task deleted successfully')
      await loadData()
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.error('Failed to delete task')
    } finally {
      setDeleteId(null)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getStaffName(task.assignedTo).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'in_progress': return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />
      case 'in_progress': return <Clock className="w-4 h-4" />
      case 'pending': return <AlertCircle className="w-4 h-4" />
      default: return null
    }
  }

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length
  const completedTodayCount = tasks.filter(t =>
    t.status === 'completed' &&
    t.completedAt &&
    new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gradient-to-r from-card/80 to-transparent p-6 rounded-2xl border border-white/5 shadow-xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight">
            Housekeeping <span className="text-primary font-sans text-xl ml-2 tracking-normal opacity-80">Overview</span>
          </h1>
          <p className="text-muted-foreground mt-2 md:text-lg">
            Manage cleaning tasks and room maintenance efficiently.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3 bg-background/60 px-5 py-2.5 rounded-xl border border-white/10 backdrop-blur-md shadow-sm">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium whitespace-nowrap">
            {format(new Date(), 'EEEE, MMMM d')}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-white/5 bg-card/40 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
            <div className="p-2.5 bg-yellow-500/10 rounded-xl group-hover:bg-yellow-500/20 transition-colors">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-sans font-bold tracking-tight text-foreground">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-white/5 bg-card/40 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <div className="p-2.5 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-sans font-bold tracking-tight text-foreground">{inProgressCount}</div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border-emerald-500/20 bg-emerald-950/20 backdrop-blur-xl">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl flex items-center justify-center fade-in" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-emerald-100/70">Completed Today</CardTitle>
            <div className="p-2.5 bg-emerald-500/20 rounded-xl group-hover:bg-emerald-500/30 transition-colors">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-sans font-bold tracking-tight text-emerald-400">{completedTodayCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-white/5 bg-card/40 backdrop-blur-md shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="p-4 relative z-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
                <Input
                  placeholder="Search by room number or staff name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-background/50 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl"
                />
              </div>
            </div>
            <div className="w-full md:w-[220px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-background/50 border-white/10 focus:border-primary/50 rounded-xl">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Task Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="grid grid-cols-1 gap-4 mt-2">
        {filteredTasks.length === 0 ? (
          <Card className="border-white/5 bg-card/30 backdrop-blur-sm border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="p-4 bg-background/50 rounded-full mb-4">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-foreground">No housekeeping tasks found</p>
              <p className="text-sm mt-1">Adjust your filters or take a break.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 border-white/5 backdrop-blur-md ${task.status === 'completed' ? 'bg-card/20' : 'bg-card/40 hover:bg-card/60'}`}>
                {task.status === 'pending' && <div className="absolute left-0 inset-y-0 w-1 bg-yellow-500 shadow-[0_0_10px_#eab308]" />}
                {task.status === 'in_progress' && <div className="absolute left-0 inset-y-0 w-1 bg-blue-500 shadow-[0_0_10px_#3b82f6]" />}
                {task.status === 'completed' && <div className="absolute left-0 inset-y-0 w-1 bg-emerald-500 shadow-[0_0_10px_#10b981]" />}

                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    {/* Left Column: Details */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 shadow-inner">
                          <span className="font-serif font-bold text-lg text-primary">{task.roomNumber}</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold tracking-tight">Room {task.roomNumber}</h3>
                          <Badge variant="outline" className={`mt-1.5 px-2.5 py-0.5 uppercase tracking-widest text-[10px] font-bold ${getStatusColor(task.status)} border-opacity-50`}>
                            {getStatusIcon(task.status)}
                            <span className="ml-1.5">{task.status.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground bg-background/30 p-4 rounded-xl border border-white/5 shadow-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary/70" />
                          <span className="font-medium text-foreground/80">{getStaffName(task.assignedTo)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary/70" />
                          <span>Created {format(new Date(task.createdAt), 'MMM dd, HH:mm')}</span>
                        </div>
                        {task.completedAt && (
                          <div className="flex items-center gap-2 sm:col-span-2 mt-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-emerald-400 font-medium">Completed at {format(new Date(task.completedAt), 'MMM dd, HH:mm')}</span>
                          </div>
                        )}
                      </div>

                      {task.notes && (
                        <div className="text-sm text-muted-foreground bg-primary/5 p-4 rounded-xl border border-primary/10 leading-relaxed relative mt-2 shadow-inner">
                          <span className="absolute -top-2.5 left-4 bg-background px-2 text-[10px] uppercase tracking-widest text-primary font-bold rounded shrink-0 border border-primary/10 shadow-sm">Notes</span>
                          {task.notes}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex flex-col gap-3 md:w-56 shrink-0 border-t border-white/5 pt-5 md:border-t-0 md:pt-0 h-full justify-between">
                      {task.status === 'pending' && (
                        <div className="space-y-1.5 bg-background/30 p-3 rounded-xl border border-white/5 shadow-sm">
                          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1 font-bold">Assign Task</Label>
                          <Select
                            onValueChange={(staffId) => handleAssignTask(task.id, staffId)}
                            value={task.assignedTo || undefined}
                          >
                            <SelectTrigger className="bg-background/80 border-white/10 rounded-lg hover:border-primary/50 transition-colors shadow-sm h-9 text-sm">
                              <SelectValue placeholder="Select staff..." />
                            </SelectTrigger>
                            <SelectContent>
                              {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mt-auto">
                        {(task.status === 'in_progress' || task.status === 'pending') && (
                          <Button
                            onClick={() => {
                              setSelectedTask(task)
                              setCompletionNotes(task.notes || '')
                            }}
                            className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 rounded-xl shadow-sm transition-all"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Complete Task
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          onClick={() => handleDeleteClick(task.id)}
                          className="w-full text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Task
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Complete Task Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="border-white/10 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Complete Housekeeping Task</DialogTitle>
            <DialogDescription>
              Mark the cleaning task for Room {selectedTask?.roomNumber} as completed.
              {rooms.find(r => r.roomNumber === selectedTask?.roomNumber)?.status === 'cleaning' && (
                <span className="block mt-2 text-emerald-400 font-medium">
                  ✓ Room will automatically be marked as available
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="uppercase text-[10px] tracking-widest text-muted-foreground font-bold">Completion Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about the completed task..."
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={4}
                className="resize-none bg-background/50 border-white/10 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedTask(null)}
              disabled={isCompleting}
              className="rounded-xl border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompleteTask}
              disabled={isCompleting}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isCompleting ? 'Completing...' : 'Complete Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="border-white/10 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-rose-400">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the housekeeping task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-rose-500 text-white hover:bg-rose-600">
              Delete Task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
