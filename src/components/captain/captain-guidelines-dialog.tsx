"use client";

import * as React from "react";
import Link from "next/link";
import { Crown, Info, Users, MessageCircle, CheckCircle, Calendar, Target, Sparkles, ArrowRight, Clock, Star } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCaptainGuidelines } from "@/lib/services/bonding-automations";

interface CaptainGuidelinesDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    leagueId?: string;
}

export function CaptainGuidelinesDialog({
    trigger,
    open,
    onOpenChange,
    leagueId,
}: CaptainGuidelinesDialogProps) {
    const guidelines = getCaptainGuidelines();
    const [completedTasks, setCompletedTasks] = React.useState<Set<string>>(new Set());

    const toggleTask = (taskId: string) => {
        const newCompleted = new Set(completedTasks);
        if (newCompleted.has(taskId)) {
            newCompleted.delete(taskId);
        } else {
            newCompleted.add(taskId);
        }
        setCompletedTasks(newCompleted);
    };

    const totalTasks = 9; // Total number of actionable tasks
    const completedCount = completedTasks.size;
    const progressPercentage = (completedCount / totalTasks) * 100;

    const defaultTrigger = (
        <Button variant="outline" size="sm" className="gap-2 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:border-green-200 transition-all duration-200 group">
            <Crown className="size-4 text-green-500 group-hover:text-green-600 transition-colors" />
            Captain Guidelines
            <div className="flex items-center">
                <Sparkles className="size-3 text-green-400 group-hover:text-green-500 transition-colors animate-pulse" />
            </div>
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] p-0 overflow-hidden rounded-xl">
                {/* Header with gradient background */}
                <div className="bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 p-6 text-white rounded-t-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-bold">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Crown className="size-6" />
                            </div>
                            Captain Guidelines - Week 1 Focus
                        </DialogTitle>
                        <DialogDescription className="text-green-50 mt-2">
                            Your roadmap to building an amazing team experience
                        </DialogDescription>
                    </DialogHeader>

                    {/* Progress tracker */}
                    <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">Your Progress</span>
                            <span className="text-sm text-white">{completedCount}/{totalTasks} tasks</span>
                        </div>
                        <Progress value={progressPercentage} className="h-2 bg-white/20 [&>div]:bg-white" />
                        {completedCount === totalTasks && (
                            <div className="flex items-center gap-2 mt-2 text-sm">
                                <Star className="size-4 text-yellow-300" />
                                <span className="text-yellow-100">Outstanding leadership! 🎉</span>
                            </div>
                        )}
                    </div>
                </div>

                <ScrollArea className="max-h-[60vh] p-6">
                    <div className="space-y-6">
                        {/* Team Bonding Section */}
                        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-3 text-lg">
                                    <div className="p-2 bg-blue-500 text-white rounded-lg">
                                        <Users className="size-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            Team Bonding
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                                                Days 1-3 • Priority
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground font-normal mt-1">
                                            <Clock className="size-3" />
                                            Focus on connection and welcome
                                        </div>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    { id: 'welcome', text: 'Welcome each new member personally', icon: '👋' },
                                    { id: 'goals', text: 'Share your fitness goals and encourage others to do the same', icon: '🎯' },
                                    { id: 'culture', text: 'Create a positive, supportive team culture', icon: '💪' }
                                ].map((task) => (
                                    <div
                                        key={task.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/60 ${completedTasks.has(task.id) ? 'bg-green-50 border border-green-200' : 'bg-white/40'
                                            }`}
                                        onClick={() => toggleTask(task.id)}
                                    >
                                        <div className="text-lg">{task.icon}</div>
                                        <div className="flex-1">
                                            <span className={`text-sm ${completedTasks.has(task.id) ? 'line-through text-green-700' : ''}`}>
                                                {task.text}
                                            </span>
                                        </div>
                                        <CheckCircle
                                            className={`size-5 transition-colors ${completedTasks.has(task.id) ? 'text-green-500' : 'text-gray-300'
                                                }`}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Organization Section */}
                        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-3 text-lg">
                                    <div className="p-2 bg-green-500 text-white rounded-lg">
                                        <Target className="size-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            Organization
                                            <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                                Days 4-7
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground font-normal mt-1">
                                            <Calendar className="size-3" />
                                            Structure and systems
                                        </div>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    { id: 'rules', text: 'Help teammates understand league rules and scoring', icon: '📋' },
                                    { id: 'validate', text: 'Validate workout submissions promptly', icon: '✅' },
                                    { id: 'participate', text: 'Encourage consistent participation', icon: '🔥' }
                                ].map((task) => (
                                    <div
                                        key={task.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/60 ${completedTasks.has(task.id) ? 'bg-green-50 border border-green-200' : 'bg-white/40'
                                            }`}
                                        onClick={() => toggleTask(task.id)}
                                    >
                                        <div className="text-lg">{task.icon}</div>
                                        <div className="flex-1">
                                            <span className={`text-sm ${completedTasks.has(task.id) ? 'line-through text-green-700' : ''}`}>
                                                {task.text}
                                            </span>
                                        </div>
                                        <CheckCircle
                                            className={`size-5 transition-colors ${completedTasks.has(task.id) ? 'text-green-500' : 'text-gray-300'
                                                }`}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Communication Section */}
                        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-3 text-lg">
                                    <div className="p-2 bg-purple-500 text-white rounded-lg">
                                        <MessageCircle className="size-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            Communication Tips
                                            <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-xs">
                                                Ongoing
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground font-normal mt-1">
                                            <MessageCircle className="size-3" />
                                            Keep the team connected
                                        </div>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    { id: 'checkin', text: 'Check in with quiet team members', icon: '🤝' },
                                    { id: 'celebrate', text: 'Celebrate small wins and progress', icon: '🎉' },
                                    { id: 'address', text: 'Address any concerns quickly and positively', icon: '💬' }
                                ].map((task) => (
                                    <div
                                        key={task.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-white/60 ${completedTasks.has(task.id) ? 'bg-green-50 border border-green-200' : 'bg-white/40'
                                            }`}
                                        onClick={() => toggleTask(task.id)}
                                    >
                                        <div className="text-lg">{task.icon}</div>
                                        <div className="flex-1">
                                            <span className={`text-sm ${completedTasks.has(task.id) ? 'line-through text-green-700' : ''}`}>
                                                {task.text}
                                            </span>
                                        </div>
                                        <CheckCircle
                                            className={`size-5 transition-colors ${completedTasks.has(task.id) ? 'text-green-500' : 'text-gray-300'
                                                }`}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Leadership Impact */}
                        <Card className="border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-lg">
                                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg">
                                        <Crown className="size-5" />
                                    </div>
                                    Your Leadership Impact
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-green-800 leading-relaxed">
                                    Your leadership sets the tone for the entire team's experience! A positive, engaged captain
                                    creates a motivated team that supports each other throughout the league.
                                    <span className="font-semibold"> You're the spark that ignites team spirit! ✨</span>
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

export default CaptainGuidelinesDialog;