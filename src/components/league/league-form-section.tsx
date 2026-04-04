'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar, Users, AlertCircle, Info, HelpCircle, FileText, Clock, UserPlus, UsersRound, Bed, Trophy, Gauge } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LeagueFormData {
  league_name: string;
  description: string;
  num_teams: string;
  max_participants: string;
  rest_days: string;
  rr_formula: 'standard' | 'simple' | 'points_only';
}

interface LeagueFormSectionProps {
  formData: LeagueFormData;
  startDate: Date | undefined;
  endDate: Date | undefined;
  duration: number;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onStartDateChange: (date: Date | undefined) => void;
  onDurationChange: (duration: number) => void;
  maxDuration?: number;
  minDate?: Date;
  onRRFormulaChange?: (value: 'standard' | 'simple' | 'points_only') => void;
  error?: string | null;
}

export function LeagueFormSection({
  formData,
  startDate,
  endDate,
  duration,
  onFormChange,
  onStartDateChange,
  onDurationChange,
  maxDuration = 365,
  minDate = new Date(),
  onRRFormulaChange,
  error,
}: LeagueFormSectionProps) {
  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto md:mx-0">
      {/* League Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>📋 League Details</CardTitle>
          <CardDescription>
            Tell us about your fitness league
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* League Name */}
          <div className="space-y-2">
            <Label htmlFor="league_name" className="font-semibold flex items-center gap-2">
              <Trophy className="size-4 text-primary" />
              League Name *
            </Label>
            <Input
              id="league_name"
              name="league_name"
              placeholder="e.g., Summer Fitness Challenge 2025"
              value={formData.league_name}
              onChange={onFormChange}
              required
              className="h-10"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="size-3" />
              Must be unique - this name will be shown to participants
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="font-semibold flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your league goals, rules, and what participants can expect..."
              value={formData.description}
              onChange={onFormChange}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="size-3" />
              Optional - helps participants understand your league
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Card */}
      <Card>
        <CardHeader>
          <CardTitle>📅 Schedule</CardTitle>
          <CardDescription>
            Set when your league runs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label className="font-semibold flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Start Date *
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal h-10',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <Calendar className="mr-2 size-4 flex-shrink-0" />
                  {startDate ? format(startDate, 'EEE, MMM d, yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={onStartDateChange}
                  disabled={(date) => date < minDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              League starts at midnight on this date
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="duration" className="font-semibold flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                Duration *
              </Label>
              {maxDuration && (
                <span className="text-xs font-normal text-muted-foreground">
                  Max: {maxDuration} days
                </span>
              )}
            </div>
            <Input
              id="duration"
              type="number"
              min="1"
              max={maxDuration}
              value={duration || ''}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                onDurationChange(val);
              }}
              placeholder="e.g., 30"
              required
              className="h-10"
            />
            {duration > maxDuration && (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                <span>Duration cannot exceed {maxDuration} days</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="size-3" />
              End date calculated automatically
            </p>
          </div>

          {/* End Date Display */}
          {endDate && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  End Date
                </span>
                <span className="font-semibold">{format(endDate, 'EEE, MMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  Total Duration
                </span>
                <span className="font-semibold">{duration} days</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* League Size Card */}
      <Card>
        <CardHeader>
          <CardTitle>👥 League Size</CardTitle>
          <CardDescription>
            Configure teams and participants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Max Participants - First since it affects tier recommendations */}
          <div className="space-y-2">
            <Label htmlFor="max_participants" className="font-semibold flex items-center gap-2">
              <UserPlus className="size-4 text-primary" />
              Total Participants (Max) *
            </Label>
            <Input
              id="max_participants"
              type="number"
              name="max_participants"
              min="1"
              value={formData.max_participants}
              onChange={onFormChange}
              placeholder="e.g., 20"
              required
              className="h-10"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="size-3" />
              Maximum number of people who can join (divided evenly across teams)
            </p>
          </div>

          {/* Number of Teams */}
          <div className="space-y-2">
            <Label htmlFor="num_teams" className="font-semibold flex items-center gap-2">
              <UsersRound className="size-4 text-primary" />
              Number of Teams *
            </Label>
            <Input
              id="num_teams"
              type="number"
              name="num_teams"
              min="2"
              value={formData.num_teams}
              onChange={onFormChange}
              placeholder="e.g., 4"
              required
              className="h-10"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="size-3" />
              Minimum 2 teams required
            </p>
          </div>

          {/* Rest Days */}
          <div className="space-y-2">
            <Label htmlFor="rest_days" className="font-semibold flex items-center gap-2">
              <Bed className="size-4 text-primary" />
              Rest Days *
            </Label>
            <Input
              id="rest_days"
              type="number"
              name="rest_days"
              min="0"
              value={formData.rest_days}
              onChange={onFormChange}
              placeholder="e.g., 6"
              required
              className="h-10"
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              Number of days participants can skip workout submissions during the league. (auto-calculated as 20% of duration, can be adjusted)
            </p>
          </div>

          {/* Scoring Formula */}
          <div className="space-y-2">
            <Label htmlFor="rr_formula" className="font-semibold flex items-center gap-2">
              <Gauge className="size-4 text-primary" />
              Scoring Formula
            </Label>
            <Select
              value={formData.rr_formula || 'standard'}
              onValueChange={(v) => onRRFormulaChange?.(v as 'standard' | 'simple' | 'points_only')}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Select scoring formula" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (Run Rate)</SelectItem>
                <SelectItem value="simple">Simple (1 point per activity)</SelectItem>
                <SelectItem value="points_only">Points Only (no Run Rate)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="size-3" />
              Standard calculates Run Rate based on workout metrics. Simple and Points Only award flat points per activity.
            </p>
          </div>

        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="size-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
