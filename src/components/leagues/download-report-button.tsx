'use client';

/**
 * Download League Report & Certificate Buttons
 * 
 * Two button components for downloading:
 * 1. League Summary Report PDF
 * 2. Certificate of Completion PDF
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { IconDownload, IconLoader2, IconCertificate, IconFileDescription } from '@tabler/icons-react';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// ============================================================================
// Download Helper
// ============================================================================

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
// Types
// ============================================================================

interface DownloadButtonBaseProps {
    leagueId: string;
    userId: string;
    leagueStatus: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg';
    className?: string;
}

// ============================================================================
// Download Report Button
// ============================================================================

export function DownloadReportButton({
    leagueId,
    userId,
    leagueStatus,
    variant = 'outline',
    size = 'default',
    className,
}: DownloadButtonBaseProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await fetch(`/api/leagues/${leagueId}/report?type=report`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate report');
            }

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'League_Report.pdf';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) {
                    filename = match[1];
                }
            }

            const blob = await response.blob();
            downloadBlob(blob, filename);
            toast.success('Report downloaded!');
        } catch (error) {
            console.error('Error downloading report:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to download report');
        } finally {
            setIsLoading(false);
        }
    }, [leagueId]);

    const isCompleted = leagueStatus === 'completed' || leagueStatus === 'ended';

    if (!isCompleted) {
        return null;
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleDownload}
            disabled={isLoading}
            className={className}
        >
            {isLoading ? (
                <>
                    <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <IconFileDescription className="h-4 w-4 mr-2" />
                    My League Record
                </>
            )}
        </Button>
    );
}

// ============================================================================
// Download Certificate Button
// ============================================================================

export function DownloadCertificateButton({
    leagueId,
    userId,
    leagueStatus,
    variant = 'outline',
    size = 'default',
    className,
}: DownloadButtonBaseProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = useCallback(async () => {
        setIsLoading(true);

        try {
            const response = await fetch(`/api/leagues/${leagueId}/report?type=certificate`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate certificate');
            }

            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'Certificate.pdf';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) {
                    filename = match[1];
                }
            }

            const blob = await response.blob();
            downloadBlob(blob, filename);
            toast.success('Certificate downloaded!');
        } catch (error) {
            console.error('Error downloading certificate:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to download certificate');
        } finally {
            setIsLoading(false);
        }
    }, [leagueId]);

    const isCompleted = leagueStatus === 'completed' || leagueStatus === 'ended';

    if (!isCompleted) {
        return null;
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleDownload}
            disabled={isLoading}
            className={cn(
                'bg-primary text-primary-foreground hover:bg-primary/90 border-primary',
                className
            )}
        >
            {isLoading ? (
                <>
                    <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <IconCertificate className="h-4 w-4 mr-2" />
                    Certificate
                </>
            )}
        </Button>
    );
}

// ============================================================================
// Default Export (for backward compatibility)
// ============================================================================

export default DownloadReportButton;
