"use client";

import * as React from "react";
import {
  Copy,
  Check,
  Share2,
  QrCode,
  Link as LinkIcon,
  Users,
  Mail,
  MessageCircle,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============================================================================
// Types
// ============================================================================

interface InviteDialogProps {
  leagueId: string;
  leagueName: string;
  inviteCode: string | null;
  memberCount?: number;
  maxCapacity?: number;
  trigger?: React.ReactNode;
  buttonLabel?: string;
}

// ============================================================================
// Invite Dialog Component
// ============================================================================

export function InviteDialog({
  leagueId,
  leagueName,
  inviteCode,
  memberCount = 0,
  maxCapacity = 20,
  trigger,
  buttonLabel,
}: InviteDialogProps) {
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const qrRef = React.useRef<HTMLDivElement>(null);

  const inviteLink = inviteCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inviteCode}`
    : "";

  // Convert QR SVG to PNG and download
  const downloadQR = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = "#ffffff";
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, 300, 300);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${leagueName.replace(/\s+/g, "-")}-invite-qr.png`;
      downloadLink.click();
    };
    img.src = url;
  };

  // Share QR code as image
  const shareQR = async () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !navigator.share) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = async () => {
      canvas.width = 300;
      canvas.height = 300;
      ctx!.fillStyle = "#ffffff";
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, 300, 300);
      URL.revokeObjectURL(url);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `${leagueName}-invite.png`, {
          type: "image/png",
        });
        try {
          await navigator.share({
            title: `Join ${leagueName}`,
            text: `Scan this QR code to join my fitness league!`,
            files: [file],
          });
        } catch (err) {
          // User cancelled or share failed
        }
      }, "image/png");
    };
    img.src = url;
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const text = `Join my fitness league "${leagueName}" on MyFitnessLeague! 💪\n\nUse code: ${inviteCode}\nOr join directly: ${inviteLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${leagueName}`,
          text: `Join my fitness league on MyFitnessLeague! Use code: ${inviteCode}`,
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  if (!inviteCode) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ||
          (buttonLabel ? (
            <Button variant="outline" size="sm" className="text-xs px-2 h-8">
              <Share2 className="mr-1 size-3" />
              {buttonLabel}
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Invite members">
              <Share2 className="size-4" aria-hidden="true" />
            </Button>
          ))}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Invite Members
          </DialogTitle>
          <DialogDescription>
            Share the invite code or link to add members to {leagueName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Capacity indicator */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">
              Current members
            </span>
            <Badge variant="outline">
              {memberCount} / {maxCapacity}
            </Badge>
          </div>

          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">
                <LinkIcon className="mr-2 size-4" />
                Link
              </TabsTrigger>
              <TabsTrigger value="qr">
                <QrCode className="mr-2 size-4" />
                QR Code
              </TabsTrigger>
            </TabsList>

            {/* Link Tab */}
            <TabsContent value="link" className="space-y-4 mt-4">
              {/* Invite Code */}
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invite Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-code"
                    value={inviteCode}
                    readOnly
                    className="font-mono text-lg tracking-widest text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyCode}
                    className="shrink-0"
                  >
                    {copiedCode ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Invite Link */}
              <div className="space-y-2">
                <Label htmlFor="invite-link">Invite Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-link"
                    value={inviteLink}
                    readOnly
                    className="text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyLink}
                    className="shrink-0"
                  >
                    {copiedLink ? (
                      <Check className="size-4 text-green-600" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Share options */}
              <div className="space-y-2">
                <Label>Share via</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={shareViaWhatsApp}
                  >
                    <MessageCircle className="mr-2 size-4 text-green-600" />
                    WhatsApp
                  </Button>
                  {typeof navigator !== "undefined" && navigator.share && (
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={shareViaNative}
                    >
                      <Share2 className="mr-2 size-4" />
                      More Options
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* QR Code Tab */}
            <TabsContent value="qr" className="space-y-4 mt-4">
              <div className="flex flex-col items-center">
                {/* QR Code Display */}
                <div
                  ref={qrRef}
                  className="p-4 bg-white rounded-lg border shadow-sm"
                  role="img"
                  aria-label={`Invite QR Code for ${leagueName}`}
                >
                  <QRCodeSVG
                    value={inviteLink}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-3 text-center">
                  Scan to join <span className="font-medium">{leagueName}</span>
                </p>
              </div>

              {/* QR Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={downloadQR}>
                  <Download className="mr-2 size-4" />
                  Download
                </Button>
                {typeof navigator !== "undefined" &&
                  navigator.share &&
                  navigator.canShare?.({ files: [new File([], "")] }) && (
                    <Button variant="outline" onClick={shareQR}>
                      <Share2 className="mr-2 size-4" />
                      Share
                    </Button>
                  )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-xs text-muted-foreground">
          Anyone with the code or link can request to join this league.
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InviteDialog;
