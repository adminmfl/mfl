'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/lib/toast';

const ACTIVITY_SYMBOLS = ['Duration', 'Distance', 'Steps', 'Holes'];
const ACTIVITY_UNITS = {
  Duration: 'minutes',
  Distance: 'km',
  Steps: 'steps',
  Holes: 'holes',
};

interface AgeOverride {
  id: string;
  ageMin: number;
  ageMax: number;
  minValue: number;
  maxValue: number;
}

interface ActivityMinimumConfig {
  symbol: string;
  baseMinValue: number | null;
  baseMaxValue: number | null;
  ageOverrides: AgeOverride[];
}

interface ActivityMinimumProps {
  leagueId: string;
  symbol: string;
  initialConfig?: {
    min_value: number | null;
    max_value: number | null;
    age_group_overrides: Record<string, any>;
  };
  onSave?: (config: ActivityMinimumConfig) => void;
  onCancel?: () => void;
}

export function ActivityMinimumConfig({
  leagueId,
  symbol,
  initialConfig,
  onSave,
  onCancel,
}: ActivityMinimumProps) {
  const [config, setConfig] = useState<ActivityMinimumConfig>({
    symbol,
    baseMinValue: initialConfig?.min_value || null,
    baseMaxValue: initialConfig?.max_value || null,
    ageOverrides: parseAgeOverrides(initialConfig?.age_group_overrides || {}),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setConfig((prev) => ({ ...prev, symbol }));
  }, [symbol]);

  function parseAgeOverrides(
    overrides: Record<string, any>
  ): AgeOverride[] {
    const result: AgeOverride[] = [];
    let id = 0;

    Object.entries(overrides).forEach(([key, value]) => {
      if (value.ageRange && value.minValue !== undefined && value.maxValue !== undefined) {
        result.push({
          id: `override-${id++}`,
          ageMin: value.ageRange.min,
          ageMax: value.ageRange.max,
          minValue: value.minValue,
          maxValue: value.maxValue,
        });
      }
    });

    return result;
  }

  function validateConfig(): boolean {
    const newErrors: string[] = [];

    // Check base values
    if (config.baseMinValue !== null && config.baseMinValue <= 0) {
      newErrors.push('Base minimum value must be greater than 0');
    }

    if (
      config.baseMinValue !== null &&
      config.baseMaxValue !== null &&
      config.baseMaxValue <= config.baseMinValue
    ) {
      newErrors.push('Base maximum value must be greater than minimum value');
    }

    // Check age overrides
    config.ageOverrides.forEach((override, idx) => {
      if (override.ageMin < 0 || override.ageMax < 0) {
        newErrors.push(`Override ${idx + 1}: Ages cannot be negative`);
      }
      if (override.ageMin >= override.ageMax) {
        newErrors.push(`Override ${idx + 1}: Max age must be greater than min age`);
      }
      if (override.minValue <= 0) {
        newErrors.push(`Override ${idx + 1}: Minimum value must be greater than 0`);
      }
      if (override.maxValue <= override.minValue) {
        newErrors.push(`Override ${idx + 1}: Maximum value must be greater than minimum value`);
      }
    });

    // Check for overlapping age ranges
    for (let i = 0; i < config.ageOverrides.length; i++) {
      for (let j = i + 1; j < config.ageOverrides.length; j++) {
        const o1 = config.ageOverrides[i];
        const o2 = config.ageOverrides[j];

        if (!(o1.ageMax <= o2.ageMin || o2.ageMax <= o1.ageMin)) {
          newErrors.push(`Overlapping age ranges: Override ${i + 1} and ${j + 1}`);
        }
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  }

  function buildAgeGroupOverrides(): Record<string, any> {
    const overrides: Record<string, any> = {};

    config.ageOverrides.forEach((override, idx) => {
      const key = `tier${idx}`;
      overrides[key] = {
        ageRange: {
          min: override.ageMin,
          max: override.ageMax,
        },
        minValue: override.minValue,
        maxValue: override.maxValue,
      };
    });

    return overrides;
  }

  async function handleSave() {
    if (!validateConfig()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        league_id: leagueId,
        symbol,
        min_value: config.baseMinValue,
        max_value: config.baseMaxValue,
        age_group_overrides: buildAgeGroupOverrides(),
      };

      const response = await fetch('/api/leagues/activity-minimums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save activity minimums');
      }

      toast.success(`${symbol} minimums saved successfully`);
      
      if (onSave) {
        onSave(config);
      }
    } catch (error) {
      console.error('Error saving activity minimums:', error);
      toast.error('Failed to save activity minimums');
    } finally {
      setIsSaving(false);
    }
  }

  function addAgeOverride() {
    const newOverride: AgeOverride = {
      id: `override-${Date.now()}`,
      ageMin: 0,
      ageMax: 18,
      minValue: config.baseMinValue || 50,
      maxValue: config.baseMaxValue || 100,
    };

    setConfig((prev) => ({
      ...prev,
      ageOverrides: [...prev.ageOverrides, newOverride],
    }));
  }

  function updateOverride(id: string, updates: Partial<AgeOverride>) {
    setConfig((prev) => ({
      ...prev,
      ageOverrides: prev.ageOverrides.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    }));
  }

  function removeOverride(id: string) {
    setConfig((prev) => ({
      ...prev,
      ageOverrides: prev.ageOverrides.filter((o) => o.id !== id),
    }));
  }

  const unit = ACTIVITY_UNITS[symbol as keyof typeof ACTIVITY_UNITS] || '';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{symbol} Minimums</CardTitle>
        <CardDescription>
          Configure base and age-specific minimum requirements
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Base Tier Section */}
        <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
          <h3 className="font-semibold text-sm">Base Tier (All Ages)</h3>
          <p className="text-xs text-slate-600">
            Applied to all ages unless overridden. Leave empty for system defaults.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base-min" className="text-sm">
                Minimum ({unit})
              </Label>
              <Input
                id="base-min"
                type="number"
                min="0"
                step="0.1"
                value={config.baseMinValue ?? ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    baseMinValue: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
                placeholder="Leave empty for default"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-max" className="text-sm">
                Maximum ({unit})
              </Label>
              <Input
                id="base-max"
                type="number"
                min="0"
                step="0.1"
                value={config.baseMaxValue ?? ''}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    baseMaxValue: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
                placeholder="Leave empty for default"
              />
            </div>
          </div>

          <p className="text-xs text-slate-600 font-mono">
            RR Range: 1.0 - 2.0 (Fixed)
          </p>
        </div>

        {/* Age Overrides Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Age-Specific Overrides</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={addAgeOverride}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Age Range
            </Button>
          </div>

          <p className="text-xs text-slate-600">
            Everything between overrides uses base tier. E.g., if you set overrides for
            ages 0-20 and 60+, ages 20-60 will use base tier.
          </p>

          {config.ageOverrides.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm border border-dashed rounded">
              No age-specific overrides. Base tier applies to all ages.
            </div>
          ) : (
            <div className="space-y-3">
              {config.ageOverrides.map((override, idx) => (
                <div
                  key={override.id}
                  className="p-3 border rounded-lg space-y-3 bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Age Range {idx + 1}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOverride(override.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Age Min</Label>
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        value={override.ageMin}
                        onChange={(e) =>
                          updateOverride(override.id, {
                            ageMin: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Age Max</Label>
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        value={override.ageMax}
                        onChange={(e) =>
                          updateOverride(override.id, {
                            ageMax: parseInt(e.target.value) || 18,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Min ({unit})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={override.minValue}
                        onChange={(e) =>
                          updateOverride(override.id, {
                            minValue: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Max ({unit})</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={override.maxValue}
                        onChange={(e) =>
                          updateOverride(override.id, {
                            maxValue: parseFloat(e.target.value) || 100,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Configuration
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
