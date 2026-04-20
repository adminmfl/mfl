'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FileText,
  Download,
  AlertCircle,
  Activity,
  ArrowRight,
  Crown,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Types
// ============================================================================

interface RulesData {
  rules_summary: string | null;
  rules_doc_url: string | null;
  file_type: 'pdf' | 'doc' | 'docx' | 'document' | 'unknown';
}

// ============================================================================
// Document Viewer Component
// ============================================================================

function DocumentViewer({ url, fileType }: { url: string; fileType: string }) {
  const [loadError, setLoadError] = useState(false);

  if (fileType === 'pdf' && !loadError) {
    return (
      <div
        className="w-full rounded-lg border bg-muted"
        style={{ height: '80vh', minHeight: '500px' }}
      >
        <object
          data={`${url}#toolbar=1`}
          type="application/pdf"
          className="w-full h-full"
          style={{ minHeight: '100%' }}
        >
          {/* Fallback for browsers that don't support object tag for PDFs */}
          <iframe
            src={`${url}#toolbar=1`}
            className="w-full h-full border-0"
            title="League Rules PDF"
            style={{ minHeight: '100%' }}
            onError={() => setLoadError(true)}
          />
        </object>
      </div>
    );
  }

  // For Word documents or PDF load failure, show download prompt
  return (
    <Card className="w-full">
      <CardContent className="py-12 text-center">
        <FileText className="size-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">
          {fileType === 'pdf' ? 'Unable to display PDF' : `${fileType.toUpperCase()} Document`}
        </h3>
        <p className="text-muted-foreground mb-4">
          {fileType === 'pdf'
            ? 'Your browser cannot display this PDF. Please download to view.'
            : 'Word documents cannot be previewed in browser. Please download to view.'}
        </p>
        <Button asChild>
          <a href={url} download target="_blank" rel="noopener noreferrer">
            <Download className="size-4 mr-2" />
            Download Document
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Rules Page
// ============================================================================

export default function RulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesData, setRulesData] = useState<RulesData | null>(null);
  const [hostName, setHostName] = useState<string | null>(null);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/leagues/${id}/rules`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to load rules');
      }

      setRulesData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  // Fetch host name
  useEffect(() => {
    async function fetchHostName() {
      try {
        const res = await fetch(`/api/leagues/${id}`);
        const json = await res.json();
        if (res.ok && json?.success && json.data?.creator_name) {
          setHostName(json.data.creator_name);
        }
      } catch (err) {
        console.error('Error fetching host name:', err);
      }
    }
    fetchHostName();
  }, [id]);

  useEffect(() => {
    fetchRules();
  }, [id]);

  if (loading) {
    return <RulesPageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="size-10 text-destructive mx-auto" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Unable to load rules</h2>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" onClick={fetchRules}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const hasRules = rulesData?.rules_summary || rulesData?.rules_doc_url;

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FileText className="size-6 text-primary" />
              League Rules
            </h1>
            <p className="text-muted-foreground">
              Official rules and guidelines for this league
            </p>
            {hostName && (
              <Badge className="mt-3 text-white border-0 px-3 py-1.5 shadow-sm">
                <Crown className="size-3.5 mr-1.5" />
                League is hosted by {hostName}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/leagues/${id}/mfl-rules`}>
                <Info className="size-4 mr-2" />
                MFL Rules
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6">
        {!hasRules ? (
          <Card className="max-w-lg mx-auto">
            <CardContent className="py-8 text-center">
              <FileText className="size-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-base font-semibold mb-1.5">No Rules Set</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The league host has not added any rules yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Rules Summary */}
            {rulesData?.rules_summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {rulesData.rules_summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* View Allowed Activities Link */}
            <Link href={`/leagues/${id}/activities`}>
              <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer group">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0">
                    <Activity className="size-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">View Allowed Activities</h3>
                    <p className="text-xs text-muted-foreground">See which activities count</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
                </CardContent>
              </Card>
            </Link>

            {/* Document Viewer */}
            {rulesData?.rules_doc_url && (
              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Rules Document</h2>
                  <Button variant="outline" size="sm" asChild className="px-4">
                    <a
                      href={rulesData.rules_doc_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="size-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
                <DocumentViewer
                  url={rulesData.rules_doc_url}
                  fileType={rulesData.file_type}
                />
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
// ============================================================================
// Skeleton Component
// ============================================================================

function RulesPageSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-8 w-48" />
            </div>
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-6 w-56 rounded-full" />
          </div>
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="px-4 lg:px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="size-4" />
            </div>
          </Card>

          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-28" />
            </div>
            <Skeleton className="w-full rounded-lg border h-[500px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
