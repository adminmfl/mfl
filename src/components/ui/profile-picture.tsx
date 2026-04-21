"use client";

import * as React from "react";
import { Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateInitials, generateGradientColors } from "@/lib/services/profile-pictures";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ProfilePictureProps {
    /** User's username for initials fallback */
    username: string;
    /** Profile picture URL (league-specific takes precedence over standard) */
    profilePictureUrl?: string | null;
    /** Display size in pixels */
    size?: 32 | 64 | 80 | 200;
    /** Whether to show captain crown badge */
    isCaptain?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Alt text for accessibility */
    alt?: string;
}

// ============================================================================
// Size Configurations
// ============================================================================

const sizeConfig = {
    32: {
        container: "size-8",
        avatar: "size-8",
        crown: "size-2",
        crownContainer: "size-3",
        fontSize: "text-[10px]",
        crownPosition: "-bottom-0.5 -right-0.5",
    },
    64: {
        container: "size-16",
        avatar: "size-16",
        crown: "size-3",
        crownContainer: "size-4",
        fontSize: "text-sm",
        crownPosition: "-bottom-1 -right-1",
    },
    80: {
        container: "size-20",
        avatar: "size-20",
        crown: "size-3.5",
        crownContainer: "size-5",
        fontSize: "text-base",
        crownPosition: "-bottom-1 -right-1",
    },
    200: {
        container: "size-50",
        avatar: "size-50",
        crown: "size-6",
        crownContainer: "size-8",
        fontSize: "text-2xl",
        crownPosition: "-bottom-2 -right-2",
    },
} as const;

// ============================================================================
// ProfilePicture Component
// ============================================================================

export function ProfilePicture({
    username,
    profilePictureUrl,
    size = 32,
    isCaptain = false,
    className,
    alt,
}: ProfilePictureProps) {
    const config = sizeConfig[size];
    const initials = generateInitials(username);
    const gradientColors = generateGradientColors(username);

    return (
        <div className={cn("relative flex-shrink-0", config.container, className)}>
            <Avatar className={config.avatar}>
                {profilePictureUrl ? (
                    <AvatarImage
                        src={profilePictureUrl}
                        alt={alt || `${username}'s profile picture`}
                        className="object-cover"
                    />
                ) : null}
                <AvatarFallback
                    className={cn(
                        "font-semibold text-white border-0",
                        config.fontSize
                    )}
                    style={{
                        background: `linear-gradient(135deg, ${gradientColors.from} 0%, ${gradientColors.to} 100%)`,
                    }}
                >
                    {initials}
                </AvatarFallback>
            </Avatar>

            {isCaptain && (
                <div
                    className={cn(
                        "absolute rounded-full bg-amber-500 flex items-center justify-center ring-2 ring-background",
                        config.crownContainer,
                        config.crownPosition
                    )}
                >
                    <Crown className={cn("text-white", config.crown)} />
                </div>
            )}
        </div>
    );
}

export default ProfilePicture;