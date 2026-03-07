import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Clock, CheckCircle2, AlertCircle, XCircle, MoreHorizontal } from '@/components/icons';
import { format } from "date-fns";

export type RequestStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface ServiceRequest {
    id: string;
    type: string;
    status: RequestStatus;
    details: string;
    created_at: string;
}

interface RequestHistoryProps {
    requests: ServiceRequest[];
    loading?: boolean;
}

export function RequestHistory({ requests, loading }: RequestHistoryProps) {
    if (loading) {
        return <div className="text-center py-6 text-muted-foreground animate-pulse">Loading requests...</div>;
    }

    if (requests.length === 0) {
        return null; // Don't show anything if no history
    }

    return (
        <div className="space-y-3 animate-fade-in mt-8">
            <h3 className="font-semibold text-lg px-1">Your Requests</h3>
            <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3 pb-4">
                    {requests.map((req) => (
                        <Card key={req.id} className="overflow-hidden border-l-4 border-l-primary/50">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-medium capitalize flex items-center gap-2">
                                        {req.type.replace('_', ' ')}
                                    </div>
                                    <StatusBadge status={req.status} />
                                </div>
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                    {req.details || 'No details provided'}
                                </p>
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(req.created_at), "MMM d, h:mm a")}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}

function StatusBadge({ status }: { status: RequestStatus }) {
    switch (status) {
        case 'pending':
            return <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Received</Badge>;
        case 'in_progress':
            return <Badge variant="outline" className="bg-blue-500/15 text-blue-300 border-blue-500/30">In Progress</Badge>;
        case 'completed':
            return <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">Completed</Badge>;
        case 'cancelled':
            return <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/30">Cancelled</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
}
