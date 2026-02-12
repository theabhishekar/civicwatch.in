
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';

export const maxDuration = 60; // Allow 60 seconds max
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { certificateDataUrl, issueType, capturedAt, locationText } = body;

        if (!certificateDataUrl) {
            return NextResponse.json({ error: 'Missing certificate data' }, { status: 400 });
        }

        // Handle both png and jpeg data URLs
        const base64Data = certificateDataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const loc = locationText || '[Location]';
        const date = new Date(capturedAt).toLocaleDateString('en-IN');

        const emailBody = `To,
The Public Information Officer
[Authority Name]
[Address]

Subject: RTI Application regarding unrepaired ${issueType} at ${loc}

Dear Sir/Madam,

Under the Right to Information Act 2005, I request the following information:

1. Number of complaints received regarding ${issueType} at ${loc} in the past 6 months
2. Budget allocated and utilized for road repairs in this area
3. Timeline and action plan for repairing the reported ${issueType}
4. Name and designation of officials responsible for maintenance in this area
5. Copy of any contracts/work orders issued for repairs in this area
6. Standard operating procedure for addressing ${issueType} complaints
7. Details of any quality checks performed after repairs

Payment of RTI fee of Rs. 10/- is enclosed herewith.

Yours faithfully,

(Context: Generated via CivicWatch on ${date})`;

        const result = await sendEmail({
            to: 'arjun8billu@gmail.com',
            subject: `RTI Application regarding ${issueType} at ${loc}`,
            text: emailBody,
            attachments: [
                {
                    filename: `certificate-${(issueType || 'issue').toLowerCase().replace(/\s+/g, '-')}.jpg`,
                    content: buffer,
                },
            ],
        });

        if (result.success) {
            return NextResponse.json({ success: true, messageId: result.messageId });
        } else {
            console.error('Email send failed:', result.error);
            return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error in email API route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
