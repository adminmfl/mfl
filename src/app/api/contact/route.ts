import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, company, phone, message, planInterest } = body;

        // Validate required fields
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Name, email, and message are required' },
                { status: 400 }
            );
        }

        // Here you would typically:
        // 1. Send email using a service like SendGrid, Resend, or Nodemailer
        // 2. Save to database
        // 3. Send to CRM system

        // For now, we'll log the contact form submission
        console.log('Contact form submission:', {
            name,
            email,
            company,
            phone,
            message,
            planInterest,
            timestamp: new Date().toISOString()
        });

        // Simulate email sending
        const emailContent = `
New Contact Form Submission - MyFitnessLeague

Name: ${name}
Email: ${email}
Company/Community: ${company || 'Not provided'}
Phone: ${phone || 'Not provided'}
Plan Interest: ${planInterest}

Message:
${message}

Submitted at: ${new Date().toLocaleString()}
    `;

        // TODO: Replace with actual email sending logic
        // Example with Resend:
        // await resend.emails.send({
        //   from: 'noreply@myfitnessleague.com',
        //   to: 'mflsupport@mpowero.com',
        //   subject: `New Contact Form - ${planInterest} Inquiry`,
        //   text: emailContent,
        // });

        return NextResponse.json(
            { message: 'Contact form submitted successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { error: 'Failed to submit contact form' },
            { status: 500 }
        );
    }
}