"use client";

import * as React from "react";
import { toast } from '@/lib/toast';

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// ============================================================================
// Types
// ============================================================================

export interface Submission {
  id: number;
  userId: number;
  userName: string;
  leagueId: number;
  leagueName: string;
  activityType: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected";
  points: number;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

interface SubmissionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: Submission | null;
  onSubmit: (data: Partial<Submission>) => void;
}

// ============================================================================
// SubmissionFormDialog Component
// ============================================================================

export function SubmissionFormDialog({
  open,
  onOpenChange,
  submission,
  onSubmit,
}: SubmissionFormDialogProps) {
  const isEditing = !!submission;

  const [formData, setFormData] = React.useState({
    userName: "",
    leagueName: "",
    activityType: "workout",
    title: "",
    description: "",
    status: "pending" as const,
    points: 0,
  });

  React.useEffect(() => {
    if (submission) {
      setFormData({
        userName: submission.userName,
        leagueName: submission.leagueName,
        activityType: submission.activityType,
        title: submission.title,
        description: submission.description,
        status: submission.status,
        points: submission.points,
      });
    } else {
      setFormData({
        userName: "",
        leagueName: "",
        activityType: "workout",
        title: "",
        description: "",
        status: "pending",
        points: 0,
      });
    }
  }, [submission, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userName || !formData.title) {
      toast.error("Please fill in all required fields");
      return;
    }

    onSubmit({
      ...(submission && { id: submission.id }),
      ...formData,
      submittedAt: submission?.submittedAt || new Date().toISOString(),
      reviewedAt: formData.status !== "pending" ? new Date().toISOString() : null,
      reviewedBy: formData.status !== "pending" ? "Admin" : null,
    });

    toast.success(
      isEditing ? "Submission updated successfully" : "Submission created successfully"
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Submission" : "Create Submission"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the submission details below."
              : "Fill in the details to create a new submission."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userName">User Name *</Label>
                <Input
                  id="userName"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leagueName">League Name</Label>
                <Input
                  id="leagueName"
                  value={formData.leagueName}
                  onChange={(e) => setFormData({ ...formData, leagueName: e.target.value })}
                  placeholder="Summer Fitness Challenge"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="activityType">Activity Type</Label>
                <Select
                  value={formData.activityType}
                  onValueChange={(value) => setFormData({ ...formData, activityType: value })}
                >
                  <SelectTrigger id="activityType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workout">Workout</SelectItem>
                    <SelectItem value="weigh_in">Weigh In</SelectItem>
                    <SelectItem value="meal">Meal</SelectItem>
                    <SelectItem value="steps">Steps</SelectItem>
                    <SelectItem value="meditation">Meditation</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="challenge">Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "pending" | "approved" | "rejected") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Morning Cardio Session"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="45 minutes on the treadmill"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
