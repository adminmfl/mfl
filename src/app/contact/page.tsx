'use client';

import { useState } from 'react';
import { ContactForm } from '@/components/contact/contact-form';

export default function ContactPage() {
    const [isFormOpen, setIsFormOpen] = useState(true);

    return (
        <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-4">
            <ContactForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    // Redirect back to home after closing
                    window.history.back();
                }}
                planType="General"
                pageType="Corporate"
            />
        </div>
    );
}