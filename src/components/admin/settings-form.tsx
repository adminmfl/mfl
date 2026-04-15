"use client";

import * as React from "react";
import { Save, RotateCcw } from "lucide-react";
import { toast } from '@/lib/toast';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// Types
// ============================================================================

interface PlatformSettings {
  platformName: string;
  enableUserRegistration: boolean;
  maintenanceMode: boolean;
  maxTeamsPerLeague: number;
  maxMembersPerTeam: number;
  sendWelcomeEmails: boolean;
  sendWeeklyDigest: boolean;
  requireEmailVerification: boolean;
  allowSocialLogin: boolean;
}

// ============================================================================
// Default Settings
// ============================================================================

const defaultSettings: PlatformSettings = {
  platformName: "My Fitness League",
  enableUserRegistration: true,
  maintenanceMode: false,
  maxTeamsPerLeague: 20,
  maxMembersPerTeam: 15,
  sendWelcomeEmails: true,
  sendWeeklyDigest: true,
  requireEmailVerification: true,
  allowSocialLogin: true,
};

// ============================================================================
// SettingsForm Component
// ============================================================================

export function SettingsForm() {
  const [settings, setSettings] = React.useState<PlatformSettings>(defaultSettings);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Settings saved successfully");
    setSaving(false);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    toast.info("Settings reset to defaults");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-muted-foreground">Configure platform-wide settings and preferences</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 size-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 size-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Basic platform configuration options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="platformName">Platform Name</Label>
            <Input
              id="platformName"
              value={settings.platformName}
              onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
              placeholder="My Fitness League"
            />
            <p className="text-sm text-muted-foreground">
              The name displayed across the platform
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>User Registration</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to register on the platform
              </p>
            </div>
            <Switch
              checked={settings.enableUserRegistration}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enableUserRegistration: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* League Settings */}
      <Card>
        <CardHeader>
          <CardTitle>League Settings</CardTitle>
          <CardDescription>Configure league-related limits and options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxTeams">Max Teams per League</Label>
              <Input
                id="maxTeams"
                type="number"
                value={settings.maxTeamsPerLeague}
                onChange={(e) =>
                  setSettings({ ...settings, maxTeamsPerLeague: Number(e.target.value) })
                }
                min={1}
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of teams allowed in a league
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxMembers">Max Members per Team</Label>
              <Input
                id="maxMembers"
                type="number"
                value={settings.maxMembersPerTeam}
                onChange={(e) =>
                  setSettings({ ...settings, maxMembersPerTeam: Number(e.target.value) })
                }
                min={1}
              />
              <p className="text-sm text-muted-foreground">
                Maximum number of members allowed per team
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsForm;
