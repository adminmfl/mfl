"use client";

import * as React from "react";
import { Crown, Info, Users, MessageCircle, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCaptainGuidelines } from "@/lib/services/bonding-automations";

interface CaptainGuidelinesDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function CaptainGuidelinesDialog({
    trigger,
    open,
    onOpenChange,
}: CaptainGuidelinesDialogProps) {
    const guidelines = getCaptainGuidelines();

    const defaultTrigger = (
        <Button variant="outline" size="sm" className="gap-2">
            <Crown className="size-4 text-amber-500" />
            Captain Guidelines
            <Info className="size-3 text-muted-foreground" />
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Crown className="size-5 text-amber-500" />
                        Captain Guidelines - Week 1 Focus
                    </DialogTitle>
                    <DialogDescription>
                        Essential leadership tips for building team spirit and engagement
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* Team Bonding Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Users className="size-5 text-blue-500" />
                                <h3 className="font-semibold text-base">Team Bonding (Days 1-3)</h3>
                                <Badge variant="secondary" className="text-xs">Priority</Badge>
                            </div>
                            <div className="pl-7 space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Welcome each new member personally</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Share your fitness goals and encourage others to do the same</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Create a positive, supportive team culture</span>
                                </div>
                            </div>
                        </div>

                        {/* Organization Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="size-5 text-green-500" />
                                <h3 className="font-semibold text-base">Organization (Days 4-7)</h3>
                            </div>
                            <div className="pl-7 space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Help teammates understand league rules and scoring</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Validate workout submissions promptly</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Encourage consistent participation</span>
                                </div>
                            </div>
                        </div>

                        {/* Communication Section */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <MessageCircle className="size-5 text-purple-500" />
                                <h3 className="font-semibold text-base">Communication Tips</h3>
                            </div>
                            <div className="pl-7 space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Check in with quiet team members</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Celebrate small wins and progress</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <CheckCircle className="size-4 text-green-500 mt-0.5 shrink-0" />
                                    <span>Address any concerns quickly and positively</span>
                                </div>
                            </div>
                        </div>

                        {/* Leadership Impact */}
                        <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-start gap-3">
                                <Crown className="size-5 text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-sm text-amber-900 dark:text-amber-100">
                                        Your Leadership Impact
                                    </p>
                                    <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                                        Your leadership sets the tone for the entire team's experience! A positive,
                                        engaged captain creates a motivated team that supports each other throughout
                                        the league.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-base">Quick Actions You Can Take Now</h3>
                            <div className="grid grid-cols-1 gap-2 text-sm">
                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                    <MessageCircle className="size-4 text-blue-500" />
                                    <span>Send a welcome message to your team chat</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                    <Users className="size-4 text-green-500" />
                                    <span>Ask each member to share their fitness goals</span>
                                </div>
                                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                                    <CheckCircle className="size-4 text-purple-500" />
                                    <span>Review league rules and scoring system</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

export default CaptainGuidelinesDialog;