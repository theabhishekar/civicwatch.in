'use server';

import { sendEmail } from '@/lib/mail';

export async function sendCertificateEmailAction(
    certificateDataUrl: string,
    issueType: string,
    capturedAt: string,
    locationText?: string
) {
    try {
        const base64Data = certificateDataUrl.replace(/^data:image\/png;base64,/, '');
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
                    filename: `certificate-${issueType.toLowerCase().replace(/\s+/g, '-')}.png`,
                    content: buffer,
                },
            ],
        });

        return result;
    } catch (error) {
        console.error('Error in sendCertificateEmailAction:', error);
        return { success: false, error };
    }
}
