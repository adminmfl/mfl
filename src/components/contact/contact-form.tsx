'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Mail, Building, User, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface ContactFormProps {
    isOpen: boolean;
    onClose: () => void;
    planType?: 'Enterprise' | 'General';
    pageType?: 'Corporate' | 'Communities';
}

export function ContactForm({ isOpen, onClose, planType = 'General', pageType = 'Corporate' }: ContactFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        phone: '',
        message: '',
        planInterest: planType
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Simulate form submission - replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Track analytics event
            if (typeof gtag !== 'undefined') {
                gtag('event', 'form_submit', {
                    'event_category': 'Contact',
                    'event_label': `${planType}_${pageType}`,
                    'value': 1
                });
            }

            toast.success('Message sent successfully! We\'ll get back to you within 24 hours.');

            // Reset form
            setFormData({
                name: '',
                email: '',
                company: '',
                phone: '',
                message: '',
                planInterest: planType
            });

            onClose();
        } catch (error) {
            toast.error('Failed to send message. Please try again or email us directly at mflsupport@mpowero.com');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                <CardHeader className="relative">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <CardTitle className="flex items-center gap-2 text-[#1A2B4A]">
                        <Mail className="h-5 w-5 text-[#F26522]" />
                        Contact MFL Support
                    </CardTitle>
                    <CardDescription>
                        {planType === 'Enterprise'
                            ? `Interested in our Enterprise plan for ${pageType.toLowerCase()}? Let's discuss your needs.`
                            : 'Get in touch with our team. We\'ll respond within 24 hours.'
                        }
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                                <User className="h-4 w-4 text-[#F26522]" />
                                Full Name *
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Your full name"
                                required
                                className="border-gray-200 focus:border-[#F26522] focus:ring-[#F26522]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@company.com"
                                required
                                className="border-gray-200 focus:border-[#F26522] focus:ring-[#F26522]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company" className="flex items-center gap-2">
                                <Building className="h-4 w-4 text-[#F26522]" />
                                {pageType === 'Corporate' ? 'Company Name' : 'Community/Society Name'}
                            </Label>
                            <Input
                                id="company"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                placeholder={pageType === 'Corporate' ? 'Your company name' : 'Your community/society name'}
                                className="border-gray-200 focus:border-[#F26522] focus:ring-[#F26522]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="+91 98765 43210"
                                className="border-gray-200 focus:border-[#F26522] focus:ring-[#F26522]"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="planInterest">Plan Interest</Label>
                            <select
                                id="planInterest"
                                name="planInterest"
                                value={formData.planInterest}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-200 rounded-md focus:border-[#F26522] focus:ring-[#F26522] focus:ring-1"
                            >
                                <option value="General">General Inquiry</option>
                                <option value="Starter">Starter Plan (Up to 40 people)</option>
                                <option value="Growth">Growth Plan (40-150 people)</option>
                                <option value="Enterprise">Enterprise Plan (150+ people)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message" className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-[#F26522]" />
                                Message *
                            </Label>
                            <Textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                placeholder={planType === 'Enterprise'
                                    ? 'Tell us about your organization size, goals, and any specific requirements...'
                                    : 'How can we help you with MyFitnessLeague?'
                                }
                                rows={4}
                                required
                                className="border-gray-200 focus:border-[#F26522] focus:ring-[#F26522] resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="flex-1"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-[#F26522] hover:bg-[#C94E0E] text-white"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-600">
                            Or email us directly at{' '}
                            <a
                                href="mailto:mflsupport@mpowero.com"
                                className="text-[#F26522] hover:underline font-medium"
                            >
                                mflsupport@mpowero.com
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}