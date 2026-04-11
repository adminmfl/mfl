'use client';

import React, { use, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRole } from '@/contexts/role-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Download,
  Upload,
  Loader2,
  Edit3,
  Trash2,
  FileIcon,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';
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
// Rules Editor Dialog Component
// ============================================================================

function RulesEditorDialog({
  leagueId,
  currentData,
  open,
  onOpenChange,
  onSaved,
}: {
  leagueId: string;
  currentData: RulesData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [summary, setSummary] = useState(currentData?.rules_summary || '');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSummary(currentData?.rules_summary || '');
      setFile(null);
    }
  }, [open, currentData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Please upload a PDF, DOC, or DOCX file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('rules_summary', summary);
      if (file) {
        formData.append('file', file);
      }

      const res = await fetch(`/api/leagues/${leagueId}/rules`, {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save rules');
      }

      toast.success('League rules saved successfully');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!currentData?.rules_doc_url) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/rules`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete document');
      }

      toast.success('Rules document deleted');
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="size-5" />
            Edit League Rules
          </DialogTitle>
          <DialogDescription>
            Add a brief summary and upload a rules document (PDF, DOC, DOCX).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rules_summary">Rules Summary</Label>
              <span className="text-xs text-muted-foreground">
                {summary.length}/200
              </span>
            </div>
            <Textarea
              id="rules_summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 200))}
              placeholder="Brief overview of league rules..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Rules Document</Label>

            {currentData?.rules_doc_url && !file && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2">
                  <FileIcon className="size-5 text-primary" />
                  <span className="text-sm">
                    Current: {currentData.file_type.toUpperCase()} document
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteDocument}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4 text-destructive" />
                  )}
                </Button>
              </div>
            )}

            {file && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-2">
                  <FileIcon className="size-5 text-green-600" />
                  <span className="text-sm truncate max-w-[280px]">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4 mr-2" />
              {file ? 'Change File' : currentData?.rules_doc_url ? 'Replace Document' : 'Upload Document'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, DOC, DOCX. Max size: 10MB
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Rules'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
// Manage Rules Page (Host/Governor)
// ============================================================================

export default function ManageRulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isHost, isGovernor } = useRole();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rulesData, setRulesData] = useState<RulesData | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const canManageRules = isHost || isGovernor;

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

  useEffect(() => {
    fetchRules();
  }, [id]);

  if (!canManageRules) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="size-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground mb-4">
                Only hosts and governors can manage league rules.
              </p>
              <Button variant="outline" asChild>
                <Link href={`/leagues/${id}/rules`}>
                  <ArrowLeft className="size-4 mr-2" />
                  Back to Rules
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return <ManageRulesSkeleton />;
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
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FileText className="size-6 text-primary" />
              Manage League Rules
            </h1>
            <p className="text-muted-foreground">
              Add or update the rules summary and document for participants
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setEditorOpen(true)}>
              <Edit3 className="size-4 mr-2" />
              {hasRules ? 'Edit Rules' : 'Add Rules'}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        {!hasRules ? (
          <Card className="max-w-lg mx-auto">
            <CardContent className="py-8 text-center">
              <FileText className="size-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-base font-semibold mb-1.5">No Rules Set</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add league rules and guidelines for your participants.
              </p>
              <Button onClick={() => setEditorOpen(true)} size="sm">
                <Edit3 className="size-3.5 mr-2" />
                Add Rules
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
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

      <RulesEditorDialog
        leagueId={id}
        currentData={rulesData}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSaved={fetchRules}
      />
    </div>
  );
}
// ============================================================================
// Skeleton Component
// ============================================================================

function ManageRulesSkeleton() {
  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-4 w-80" />
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
