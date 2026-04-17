"use client";

import * as React from "react";
import { Crown, Info } from "lucide-react";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { CaptainGuidelinesDialog } from "./captain-guidelines-dialog";

interface CaptainGuidelinesTooltipProps {
    children?: React.ReactNode;
}

export function CaptainGuidelinesTooltip({ children }: CaptainGuidelinesTooltipProps) {
    const [dialogOpen, setDialogOpen] = React.useState(false);

    const trigger = children || (
        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-amber-600">
            <Crown className="size-3" />
            <Info className="size-3" />
        </Button>
    );

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div onClick={() => setDialogOpen(true)} className="cursor-pointer">
                        {trigger}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                        <p className="font-medium text-xs">Captain Guidelines</p>
                        <p className="text-xs text-muted-foreground">
                            Week 1 focus: Team bonding, organization, and communication tips
                        </p>
                        <p className="text-xs text-amber-600">Click to view full guidelines</p>
                    </div>
                </TooltipContent>
            </Tooltip>

            <CaptainGuidelinesDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            />
        </TooltipProvider>
    );
}

export default CaptainGuidelinesTooltip;