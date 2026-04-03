'use client';

/**
 * Dynamic Report Dialog
 *
 * Allows users to generate progress reports for ongoing leagues.
 * Supports: Till-Date, Last Week, or Custom Date Range.
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { IconFileAnalytics, IconLoader2, IconDownload } from '@tabler/icons-react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface DynamicReportDialogProps {
    leagueId: string;
    leagueStartDate: string; // YYYY-MM-DD
    leagueEndDate: string;   // YYYY-MM-DD
    trigger?: React.ReactNode;
}

type ReportType = 'tillDate' | 'lastWeek' | 'custom';

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateYMD(date: Date): string {
    return date.toISOString().split('T')[0];
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================================
// Component
// ============================================================================

export function DynamicReportDialog({
    leagueId,
    leagueStartDate,
    leagueEndDate,
    trigger,
}: DynamicReportDialogProps) {
    const [open, setOpen] = useState(false);
    const [reportType, setReportType] = useState<ReportType>('tillDate');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const today = formatDateYMD(new Date());

    // Calculate date ranges based on report type
    const dateRange = useMemo(() => {
        if (reportType === 'tillDate') {
            return { startDate: leagueStartDate, endDate: today };
        } else if (reportType === 'lastWeek') {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const start = formatDateYMD(sevenDaysAgo);
            // Ensure start is not before league start
            return {
                startDate: start < leagueStartDate ? leagueStartDate : start,
                endDate: today,
            };
        } else {
            return { startDate: customStartDate, endDate: customEndDate };
        }
    }, [reportType, leagueStartDate, today, customStartDate, customEndDate]);

    // Validation
    const isValid = useMemo(() => {
        if (reportType === 'custom') {
            if (!customStartDate || !customEndDate) return false;
            if (customStartDate > customEndDate) return false;
            if (customStartDate < leagueStartDate) return false;
            // Allow end date up to today (even if league hasn't ended)
            if (customEndDate > today) return false;
        }
        return true;
    }, [reportType, customStartDate, customEndDate, leagueStartDate, today]);

    const handleGenerate = async () => {
        if (!isValid) {
            toast.error('Invalid date range');
            return;
        }

        setIsLoading(true);

        try {
            const url = `/api/leagues/${leagueId}/report?type=report&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
            const response = await fetch(url);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate report');
            }

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'Progress_Report.pdf';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) {
                    filename = match[1];
                }
            }

            const blob = await response.blob();
            downloadBlob(blob, filename);
            toast.success('Report downloaded!');
            setOpen(false);
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to generate report');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button variant="outline" size="sm">
                        <IconFileAnalytics className="h-4 w-4 mr-2" />
                        My League Record
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Generate My League Record</DialogTitle>
                    <DialogDescription>
                        Choose a date range for your performance report.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <RadioGroup
                        value={reportType}
                        onValueChange={(v) => setReportType(v as ReportType)}
                        className="space-y-3"
                    >
                        <div className="flex items-center space-x-3">
                            <RadioGroupItem value="tillDate" id="tillDate" />
                            <Label htmlFor="tillDate" className="cursor-pointer">
                                <span className="font-medium">Till Date</span>
                                <span className="text-muted-foreground text-sm ml-2">
                                    ({leagueStartDate} to {today})
                                </span>
                            </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                            <RadioGroupItem value="lastWeek" id="lastWeek" />
                            <Label htmlFor="lastWeek" className="cursor-pointer">
                                <span className="font-medium">Last 7 Days</span>
                            </Label>
                        </div>
                        <div className="flex items-center space-x-3">
                            <RadioGroupItem value="custom" id="custom" />
                            <Label htmlFor="custom" className="cursor-pointer">
                                <span className="font-medium">Custom Range</span>
                            </Label>
                        </div>
                    </RadioGroup>

                    {reportType === 'custom' && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input
                                    id="startDate"
                                    type="date"
                                    min={leagueStartDate}
                                    max={today}
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input
                                    id="endDate"
                                    type="date"
                                    min={customStartDate || leagueStartDate}
                                    max={today}
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading || !isValid}
                    >
                        {isLoading ? (
                            <>
                                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <IconDownload className="h-4 w-4 mr-2" />
                                Download Report
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default DynamicReportDialog;
