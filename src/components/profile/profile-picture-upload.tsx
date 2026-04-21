"use client";

import * as React from "react";
import { Upload, X, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ProfilePicture } from "@/components/ui/profile-picture";
import { validateProfilePictureFile } from "@/lib/services/profile-pictures";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ProfilePictureUploadProps {
    /** Current user's username */
    username: string;
    /** Current profile picture URL */
    currentProfilePictureUrl?: string | null;
    /** League ID for league-specific uploads (optional) */
    leagueId?: string;
    /** Upload type label for UI */
    uploadType?: "standard" | "league";
    /** Whether user can remove current picture */
    canRemove?: boolean;
    /** Callback when upload completes successfully */
    onUploadSuccess?: (url: string) => void;
    /** Callback when picture is removed */
    onRemoveSuccess?: () => void;
    /** Additional CSS classes */
    className?: string;
}

// ============================================================================
// ProfilePictureUpload Component
// ============================================================================

export function ProfilePictureUpload({
    username,
    currentProfilePictureUrl,
    leagueId,
    uploadType = "standard",
    canRemove = true,
    onUploadSuccess,
    onRemoveSuccess,
    className,
}: ProfilePictureUploadProps) {
    const [isUploading, setIsUploading] = React.useState(false);
    const [isRemoving, setIsRemoving] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file
        const validation = validateProfilePictureFile(file);
        if (!validation.valid) {
            toast.error(validation.error || 'Invalid file');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            if (leagueId) {
                formData.append('leagueId', leagueId);
            }

            const response = await fetch('/api/upload/profile-picture', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            toast.success(
                uploadType === 'league'
                    ? 'League profile picture updated successfully'
                    : 'Profile picture updated successfully'
            );

            onUploadSuccess?.(result.data.url);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to upload picture');
        } finally {
            setIsUploading(false);
            // Clear the input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = async () => {
        if (!leagueId || uploadType !== 'league') {
            toast.error('Can only remove league-specific pictures');
            return;
        }

        setIsRemoving(true);

        try {
            const response = await fetch(`/api/leagues/${leagueId}/profile-picture`, {
                method: 'DELETE',
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to remove picture');
            }

            toast.success('League profile picture removed');
            onRemoveSuccess?.();
        } catch (error) {
            console.error('Remove error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to remove picture');
        } finally {
            setIsRemoving(false);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Current Picture Display */}
            <div className="flex items-center gap-4">
                <ProfilePicture
                    username={username}
                    profilePictureUrl={currentProfilePictureUrl}
                    size={80}
                />
                <div className="flex-1">
                    <Label className="text-sm font-medium">
                        {uploadType === 'league' ? 'League Profile Picture' : 'Profile Picture'}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                        {uploadType === 'league'
                            ? 'This picture will only show in this league'
                            : 'This picture will show across all your leagues'
                        }
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={triggerFileSelect}
                    disabled={isUploading || isRemoving}
                    className="flex-1"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            {currentProfilePictureUrl ? (
                                <Camera className="mr-2 size-4" />
                            ) : (
                                <Upload className="mr-2 size-4" />
                            )}
                            {currentProfilePictureUrl ? 'Change Picture' : 'Upload Picture'}
                        </>
                    )}
                </Button>

                {canRemove && currentProfilePictureUrl && uploadType === 'league' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemove}
                        disabled={isUploading || isRemoving}
                    >
                        {isRemoving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <X className="size-4" />
                        )}
                    </Button>
                )}
            </div>

            {/* File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Upload Guidelines */}
            <div className="text-xs text-muted-foreground space-y-1">
                <p>• Supported formats: JPG, PNG</p>
                <p>• Maximum file size: 5MB</p>
                <p>• Images will be automatically cropped to circle</p>
            </div>
        </div>
    );
}

export default ProfilePictureUpload;