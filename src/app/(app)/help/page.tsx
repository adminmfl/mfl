'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  HelpCircle,
  Mail,
  MessageSquare,
  Phone,
  Search,
  ChevronRight,
  Zap,
  Target,
  Users,
  Trophy,
  Clock,
  AlertCircle,
  CheckCircle2,
  FileText,
  ArrowRight,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getPublicTourApi } from '@/components/onboarding/guided-tour';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      // Simulate sending - in production, connect to your backend
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success('Message sent! We will get back to you soon.');
      setContactEmail('');
      setContactMessage('');
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const faqs = [
    {
      category: 'Getting Started',
      items: [
        {
          question: 'How do I join a league?',
          answer: 'You can join a league by using an invitation code from a league host. Go to your dashboard and select "Join a League", then enter the code. You can also search for public leagues in the explore section.',
        },
        {
          question: 'What is a challenge and how do I participate?',
          answer: 'Challenges are fitness activities or goals set by league hosts. Once a challenge is active, you can submit proof of completion (like a photo or screenshot) to earn points. The more challenges you complete, the higher your score on the leaderboard.',
        },
        {
          question: 'What are activities in the context of this app?',
          answer: 'Activities are fitness-related actions that count towards challenges. Each league has a list of allowed activities (like running, cycling, weight training, etc.). Only activities on the allowed list will be counted towards your challenge submissions.',
        },
      ],
    },
    {
      category: 'Challenges & Submissions',
      items: [
        {
          question: 'How do I submit proof for a challenge?',
          answer: 'Go to the Challenges section, find the active challenge you want to complete, and click "Submit Proof". Upload an image or screenshot as evidence of completion. Your submission will be reviewed by the league host or moderator.',
        },
        {
          question: 'What happens after I submit proof?',
          answer: 'Your submission will be in "Pending" status while waiting for review. The league host will either approve it (and award points), reject it, or request changes. You can resubmit within 24 hours if your submission is rejected.',
        },
        {
          question: 'Can I resubmit a rejected challenge?',
          answer: 'Yes, if your submission is rejected, you have a 24-hour window to resubmit new proof. This reupload window closes at 11:59 PM local time on the next day.',
        },
        {
          question: 'What types of files can I upload as proof?',
          answer: 'You can upload JPG, PNG, GIF, or WebP image files. Maximum file size is 10MB. Make sure the image clearly shows evidence of completing the challenge activity.',
        },
      ],
    },
    {
      category: 'Teams & Leaderboards',
      items: [
        {
          question: 'How do teams work?',
          answer: 'Teams are groups of members within a league. Team challenges require submissions from team members, and points are distributed among the team. You can only be part of one team per league.',
        },
        {
          question: 'What is the leaderboard?',
          answer: 'The leaderboard ranks all participants in a league based on their earned points. Your position updates in real-time as challenges are completed and reviewed. You can view your ranking and compare progress with other members.',
        },
        {
          question: 'How are points calculated in team challenges?',
          answer: 'In team challenges, the total points are divided among team members. The distribution is calculated fairly based on team size. Hosts can set per-member caps to ensure balanced rewards across teams of different sizes.',
        },
      ],
    },
    {
      category: 'League Management (for Hosts)',
      items: [
        {
          question: 'How do I create a challenge?',
          answer: 'As a league host, go to the Challenges section and click "Create Custom Challenge". Set the name, description, type (individual/team/sub-team), and total points. You can upload rules documents (PDF, DOC, DOCX) for detailed guidelines.',
        },
        {
          question: 'What are sub-teams?',
          answer: 'Sub-teams are smaller groups within a team. They allow you to organize members into divisions or groups for targeted challenges. You can create sub-teams before activating a sub-team type challenge.',
        },
        {
          question: 'How do I review and approve submissions?',
          answer: 'After submissions close, open the Review section for that challenge. You can view each submission, award points, reject it, or request changes. Approved submissions contribute to the leaderboard standings.',
        },
        {
          question: 'Can I update challenge scores after publishing?',
          answer: 'Yes. Hosts and governors can edit challenge scores at any time. Publishing scores does not lock them, so you can make adjustments whenever needed.',
        },
        {
          question: 'Can I edit league rules after creation?',
          answer: 'Yes, you can edit the league rules and upload or replace rule documents anytime. Go to the Rules section and click "Edit Rules" to update the summary or document.',
        },
      ],
    },
    {
      category: 'Account & Profile',
      items: [
        {
          question: 'How do I update my profile information?',
          answer: 'Go to your Profile section from the navigation menu. You can update your username, email, timezone, and other personal details. Your changes take effect immediately.',
        },
        {
          question: 'How do I change my password?',
          answer: 'In your Profile settings, look for the "Change Password" option. Enter your current password and your new password twice to confirm. For security, we require strong passwords.',
        },
        {
          question: 'What is timezone and why is it important?',
          answer: 'Your timezone determines how daily challenges and reupload windows are calculated. For example, reupload windows close at 11:59 PM your local time. You can set and update your timezone in Profile settings.',
        },
        {
          question: 'How do I manage my payment methods?',
          answer: 'Go to the Payments section to view and manage your payment methods. You can add new payment methods for league fees or challenge activation costs.',
        },
      ],
    },
    {
      category: 'Troubleshooting',
      items: [
        {
          question: 'I cannot see a challenge I joined. What should I do?',
          answer: 'Make sure the challenge is in "Active" status. Drafts and scheduled challenges are not visible to participants. Refresh the page or clear your browser cache and try again.',
        },
        {
          question: 'My submission shows "Pending" for a long time. Is this normal?',
          answer: "Yes, submissions stay pending until the league host or moderator reviews them. The review timeframe depends on the host's schedule. You can contact the host for an update if needed.",
        },
        {
          question: 'I got an error while uploading my proof. How do I fix it?',
          answer: 'Check that your file is in an accepted format (JPG, PNG, GIF, WebP) and is smaller than 10MB. If the error persists, try a different browser or clear your browser cache.',
        },
        {
          question: 'Why is my leaderboard ranking different from what I expected?',
          answer: 'Your ranking depends on approved challenge submissions only. Pending or rejected submissions do not count. Make sure all your submissions are approved and try refreshing the leaderboard.',
        },
        {
          question: 'I cannot log in to my account. What should I do?',
          answer: 'First, verify you are using the correct email and password. If you forgot your password, use the "Forgot Password" link on the login page. If you still cannot access your account, contact our support team.',
        },
      ],
    },
  ];

  const filteredFaqs = faqs
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <HelpCircle className="size-6 text-primary" />
            Help & Support
          </h1>
          <p className="text-muted-foreground">
            Find answers to common questions and get support
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 lg:px-6">
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="px-4 lg:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          <div
            className="h-20 rounded-lg border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 hover:bg-muted/50"
            onClick={() => document.getElementById('faq-getting-started')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="size-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Zap className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium group-hover:text-primary transition-colors line-clamp-2">Getting Started</p>
            </div>
          </div>

          <div
            className="h-20 rounded-lg border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 hover:bg-muted/50"
            onClick={() => document.getElementById('faq-challenges-submissions')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="size-8 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Target className="size-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium group-hover:text-primary transition-colors line-clamp-2">Challenges</p>
            </div>
          </div>

          <div
            className="h-20 rounded-lg border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 hover:bg-muted/50"
            onClick={() => document.getElementById('faq-teams-leaderboards')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="size-8 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Users className="size-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium group-hover:text-primary transition-colors line-clamp-2">Teams</p>
            </div>
          </div>

          <div
            className="h-20 rounded-lg border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 hover:bg-muted/50"
            onClick={() => document.getElementById('faq-league-management-for-hosts')?.scrollIntoView({ behavior: 'smooth' })}
          >
            <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium group-hover:text-primary transition-colors line-clamp-2">For Hosts</p>
            </div>
          </div>

          <div
            className="h-20 rounded-lg border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 hover:bg-muted/50"
            onClick={() => getPublicTourApi().open()}
          >
            <div className="size-8 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Zap className="size-4 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium group-hover:text-primary transition-colors line-clamp-2">Getting Started</p>
            </div>
          </div>

          <Link href="/help/host-support" className="block">
            <div className="h-20 rounded-lg border border-primary/10 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center justify-center gap-2 p-3 hover:bg-muted/50">
              <div className="size-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Crown className="size-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium group-hover:text-primary transition-colors line-clamp-2">Host Support</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* FAQs */}
      <div className="px-4 lg:px-6">
        <div className="max-w-4xl mx-auto">
          {searchQuery && filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  We couldn't find any articles matching "{searchQuery}". Try different keywords or contact our support team.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredFaqs.map((category) => {
                // Create slug for section ID
                const sectionId = 'faq-' + category.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                return (
                  <div key={category.category} id={sectionId} className="space-y-3 scroll-mt-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2 px-2">
                      <div className="size-1 rounded-full bg-primary" />
                      {category.category}
                    </h2>
                    <Card>
                      <CardContent className="p-0 space-y-0">
                        {category.items.map((item, index) => (
                          <Collapsible key={index} className="border-b last:border-b-0">
                            <CollapsibleTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors flex w-full items-start gap-3 text-left">
                              <CheckCircle2 className="size-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="font-medium text-sm">{item.question}</span>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="px-6 py-4 text-muted-foreground border-t bg-muted/30">
                              {item.answer}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contact Support Section */}
      <div className="px-4 lg:px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5" />
                Still need help?
              </CardTitle>
              <CardDescription>
                Contact our support team and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Methods */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <Mail className="size-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">MFL Support</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <a
                        href="mailto:mflsupport@mpowero.com"
                        className="text-primary hover:underline"
                      >
                        mflsupport@mpowero.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="size-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">MFL Management</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <a
                        href="mailto:mflmanagement@mpowero.com"
                        className="text-primary hover:underline"
                      >
                        mflmanagement@mpowero.com
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="size-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">MFL Billing</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <a
                        href="mailto:mflbilling@mpowero.com"
                        className="text-primary hover:underline"
                      >
                        mflbilling@mpowero.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
