"use client";

import { useState } from "react";
import {
  Dumbbell,
  Trophy,
  TrendingUp,
  Target,
  Activity,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useAdminTourSteps,
  type TourStep,
  type TourStepInput,
} from "@/hooks/admin/use-admin-tour-steps";

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, LucideIcon> = {
  Dumbbell,
  Trophy,
  TrendingUp,
  Target,
  Activity,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const COLOR_OPTIONS = [
  { value: "text-green-500", label: "Green" },
  { value: "text-amber-500", label: "Amber" },
  { value: "text-blue-500", label: "Blue" },
  { value: "text-purple-500", label: "Purple" },
  { value: "text-red-500", label: "Red" },
  { value: "text-pink-500", label: "Pink" },
  { value: "text-cyan-500", label: "Cyan" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TourStepsTable() {
  const { steps, isLoading, error, createStep, updateStep, deleteStep } =
    useAdminTourSteps();
  const [editingStep, setEditingStep] = useState<TourStep | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TourStep | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIconName, setFormIconName] = useState("Activity");
  const [formIconColor, setFormIconColor] = useState("text-blue-500");

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormIconName("Activity");
    setFormIconColor("text-blue-500");
  };

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEdit = (step: TourStep) => {
    setFormTitle(step.title);
    setFormDescription(step.description);
    setFormIconName(step.icon_name);
    setFormIconColor(step.icon_color);
    setEditingStep(step);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formDescription.trim()) {
      toast.error("Title and description are required");
      return;
    }

    setSaving(true);
    try {
      if (editingStep) {
        const result = await updateStep(editingStep.step_id, {
          title: formTitle.trim(),
          description: formDescription.trim(),
          icon_name: formIconName,
          icon_color: formIconColor,
        });
        if (result) {
          toast.success("Tour step updated");
          setEditingStep(null);
        }
      } else {
        const result = await createStep({
          title: formTitle.trim(),
          description: formDescription.trim(),
          icon_name: formIconName,
          icon_color: formIconColor,
          sort_order: steps.length,
        });
        if (result) {
          toast.success("Tour step created");
          setIsCreateOpen(false);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await deleteStep(deleteTarget.step_id);
    if (result) {
      toast.success("Tour step deleted");
    }
    setDeleteTarget(null);
  };

  const handleToggleActive = async (step: TourStep) => {
    await updateStep(step.step_id, { is_active: !step.is_active });
  };

  const handleMoveUp = async (step: TourStep, index: number) => {
    if (index === 0) return;
    const prev = steps[index - 1];
    await Promise.all([
      updateStep(step.step_id, { sort_order: prev.sort_order }),
      updateStep(prev.step_id, { sort_order: step.sort_order }),
    ]);
  };

  const handleMoveDown = async (step: TourStep, index: number) => {
    if (index === steps.length - 1) return;
    const next = steps[index + 1];
    await Promise.all([
      updateStep(step.step_id, { sort_order: next.sort_order }),
      updateStep(next.step_id, { sort_order: step.sort_order }),
    ]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{error}</p>
      </div>
    );
  }

  const isFormOpen = isCreateOpen || !!editingStep;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Onboarding Tour Steps</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the getting started tour shown to new users
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          Add Step
        </Button>
      </div>

      {/* Steps list */}
      <div className="space-y-3">
        {steps.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border rounded-lg">
            <p>No tour steps configured. Click "Add Step" to create one.</p>
          </div>
        )}

        {steps.map((step, index) => {
          const Icon = ICON_MAP[step.icon_name] || Activity;
          return (
            <div
              key={step.step_id}
              className="flex items-start gap-3 border rounded-lg p-4 bg-card"
            >
              {/* Reorder controls */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(step, index)}
                  disabled={index === 0}
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <GripVertical className="size-3.5 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => handleMoveDown(step, index)}
                  disabled={index === steps.length - 1}
                  className="p-0.5 rounded hover:bg-accent disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>

              {/* Icon */}
              <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className={`size-5 ${step.icon_color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  {!step.is_active && (
                    <Badge variant="secondary" className="text-[10px]">
                      Inactive
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    #{step.sort_order + 1}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {step.description}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={step.is_active}
                  onCheckedChange={() => handleToggleActive(step)}
                  className="scale-75"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => openEdit(step)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(step)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(v) => {
          if (!v) {
            setIsCreateOpen(false);
            setEditingStep(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? "Edit Tour Step" : "Add Tour Step"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="step-title">Title</Label>
              <Input
                id="step-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Submit Your Activity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="step-desc">Description</Label>
              <Textarea
                id="step-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Explain this step to new users..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={formIconName} onValueChange={setFormIconName}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((name) => {
                      const I = ICON_MAP[name];
                      return (
                        <SelectItem key={name} value={name}>
                          <span className="flex items-center gap-2">
                            <I className="size-4" />
                            {name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={formIconColor} onValueChange={setFormIconColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <span className={`size-3 rounded-full ${c.value.replace('text-', 'bg-')}`} />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingStep(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingStep ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tour Step</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
