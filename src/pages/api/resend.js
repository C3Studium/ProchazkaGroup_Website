// This is the API route for sending emails using Resend with React Email templates
import { Resend } from 'resend';

// Import email templates
import { benefitAdminEmail as BenefitAdminEmail, subject as benefitAdminSubject } from '../../modules/resend/emails/benefit-admin.jsx';
import { benefitUserEmail as BenefitUserEmail, subject as benefitUserSubject } from '../../modules/resend/emails/benefit-user.jsx';
import { kontaktAdminEmail as KontaktAdminEmail, subject as kontaktAdminSubject } from '../../modules/resend/emails/kontakt-admin.jsx';
import { kontaktUserEmail as KontaktUserEmail, subject as kontaktUserSubject } from '../../modules/resend/emails/kontakt-user.jsx';
import { newsletterAdminEmail as NewsletterAdminEmail, subject as newsletterAdminSubject } from '../../modules/resend/emails/newsletter-admin.jsx';
import { newsletterUserEmail as NewsletterUserEmail, subject as newsletterUserSubject } from '../../modules/resend/emails/newsletter-user.jsx';
import { recenzeAdminEmail as RecenzeAdminEmail, subject as recenzeAdminSubject } from '../../modules/resend/emails/recenze-admin.jsx';
import { recenzeUserEmail as RecenzeUserEmail, subject as recenzeUserSubject } from '../../modules/resend/emails/recenze-user.jsx';
import { zajemAdminEmail as ZajemAdminEmail, subject as zajemAdminSubject } from '../../modules/resend/emails/zajem-admin.jsx';
import { zajemUserEmail as ZajemUserEmail, subject as zajemUserSubject } from '../../modules/resend/emails/zajem-user.jsx';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email template mapping
const emailTemplates = {
  'benefit-admin': { component: BenefitAdminEmail, subject: benefitAdminSubject },
  'benefit-user': { component: BenefitUserEmail, subject: benefitUserSubject },
  'kontakt-admin': { component: KontaktAdminEmail, subject: kontaktAdminSubject },
  'kontakt-user': { component: KontaktUserEmail, subject: kontaktUserSubject },
  'newsletter-admin': { component: NewsletterAdminEmail, subject: newsletterAdminSubject },
  'newsletter-user': { component: NewsletterUserEmail, subject: newsletterUserSubject },
  'recenze-admin': { component: RecenzeAdminEmail, subject: recenzeAdminSubject },
  'recenze-user': { component: RecenzeUserEmail, subject: recenzeUserSubject },
  'zajem-admin': { component: ZajemAdminEmail, subject: zajemAdminSubject },
  'zajem-user': { component: ZajemUserEmail, subject: zajemUserSubject },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { template, to, data = {} } = req.body;

    if (!template || !to) {
      return res.status(400).json({ error: 'Missing required fields: template, to' });
    }

    const emailConfig = emailTemplates[template];
    if (!emailConfig) {
      return res.status(400).json({ error: `Unknown template: ${template}` });
    }

    const { component: EmailComponent, subject: subjectFunction } = emailConfig;

    // Generate the email React element
    const emailElement = EmailComponent(data);

    // Generate the subject
    const subject = subjectFunction(data);

    // Send the email using React component directly
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'cetrum.servers@gmail.com',
      to: to, // Use the 'to' parameter from the request
      subject,
      react: emailElement,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    res.status(200).json({
      success: true,
      data: emailData,
      subject,
      template
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}