"use client";

import * as React from "react";
import { Save, RotateCcw, Info } from "lucide-react";
import { toast } from '@/lib/toast';
import { useSession } from "next-auth/react";

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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ============================================================================
// Types
// ============================================================================

interface PricingData {
  id: string;
  base_price: number;
  platform_fee: number;
  gst_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PricingFormData {
  base_price: number;
  platform_fee: number;
  gst_percentage: number;
}

// ============================================================================
// PricingForm Component
// ============================================================================

export function PricingForm() {
  const { data: session } = useSession();
  const [pricing, setPricing] = React.useState<PricingData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [formData, setFormData] = React.useState<PricingFormData>({
    base_price: 0,
    platform_fee: 0,
    gst_percentage: 18,
  });

  // ============================================================================
  // Fetch Pricing Data
  // ============================================================================

  React.useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch("/api/leagues/pricing");
        if (!res.ok) throw new Error("Failed to fetch pricing");
        const { pricing: data } = await res.json();
        setPricing(data);
        setFormData({
          base_price: data.base_price,
          platform_fee: data.platform_fee,
          gst_percentage: data.gst_percentage,
        });
      } catch (err) {
        toast.error("Failed to load pricing data");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) fetchPricing();
  }, [session?.user?.id]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/leagues/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update pricing");
      }

      const { pricing: updated } = await res.json();
      setPricing(updated);
      toast.success("Pricing updated successfully");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update pricing";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (pricing) {
      setFormData({
        base_price: pricing.base_price,
        platform_fee: pricing.platform_fee,
        gst_percentage: pricing.gst_percentage,
      });
      toast.info("Form reset to saved values");
    }
  };

  // ============================================================================
  // Calculations
  // ============================================================================

  const subtotal = formData.base_price + formData.platform_fee;
  const gstAmount = subtotal * (formData.gst_percentage / 100);
  const total = subtotal + gstAmount;

  // ============================================================================
  // Loading State
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading pricing data...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing Management</h1>
          <p className="text-muted-foreground">Manage league creation pricing and fees</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-2 size-4" />
            Reset
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Save className="mr-2 size-4" />
            {saving ? "Saving..." : "Save Pricing"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pricing Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Configuration</CardTitle>
            <CardDescription>Set the fees for league creation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="base_price">League Creation Fee (₹)</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.base_price}
                onChange={(e) =>
                  setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-sm text-muted-foreground">Base fee for creating a league</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="platform_fee">Platform Fee (₹)</Label>
              <Input
                id="platform_fee"
                type="number"
                step="0.01"
                min="0"
                value={formData.platform_fee}
                onChange={(e) =>
                  setFormData({ ...formData, platform_fee: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-sm text-muted-foreground">Platform processing fee</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="gst_percentage">GST Percentage (%)</Label>
              <Input
                id="gst_percentage"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.gst_percentage}
                onChange={(e) =>
                  setFormData({ ...formData, gst_percentage: parseFloat(e.target.value) || 0 })
                }
              />
              <p className="text-sm text-muted-foreground">GST tax percentage applied</p>
            </div>
          </CardContent>
        </Card>

        {/* Price Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Price Summary</CardTitle>
            <CardDescription>Preview of the total cost for users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">League Fee</span>
                <span className="font-medium">₹{formData.base_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="font-medium">₹{formData.platform_fee.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST ({formData.gst_percentage}%)</span>
                <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Changes to pricing will apply to all new league creations. Existing payments are
                not affected.
              </AlertDescription>
            </Alert>

            {pricing && (
              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(pricing.updated_at).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PricingForm;
