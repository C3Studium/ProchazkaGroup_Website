import { Resend } from 'resend';
import { render } from '@react-email/render';
import { createClient } from '@supabase/supabase-js';

// Import email templates
import BenefitAdminEmail, { subject as benefitAdminSubject } from '../../modules/resend/emails/benefit-admin.jsx';
import BenefitUserEmail, { subject as benefitUserSubject } from '../../modules/resend/emails/benefit-user.jsx';
import KontaktAdminEmail, { subject as kontaktAdminSubject } from '../../modules/resend/emails/kontakt-admin.jsx';
import KontaktUserEmail, { subject as kontaktUserSubject } from '../../modules/resend/emails/kontakt-user.jsx';
import NewsletterAdminEmail, { subject as newsletterAdminSubject } from '../../modules/resend/emails/newsletter-admin.jsx';
import NewsletterUserEmail, { subject as newsletterUserSubject } from '../../modules/resend/emails/newsletter-user.jsx';
import RecenzeAdminEmail, { subject as recenzeAdminSubject } from '../../modules/resend/emails/recenze-admin.jsx';
import RecenzeUserEmail, { subject as recenzeUserSubject } from '../../modules/resend/emails/recenze-user.jsx';
import ZajemAdminEmail, { subject as zajemAdminSubject } from '../../modules/resend/emails/zajem-admin.jsx';
import ZajemUserEmail, { subject as zajemUserSubject } from '../../modules/resend/emails/zajem-user.jsx';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// Customer segmentation based on interaction history
async function getCustomerSegment(email) {
  try {
    const { data: interactions } = await supabase
      .from('email_interactions')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!interactions || interactions.length === 0) {
      return 'new';
    }

    const hasOpened = interactions.some(i => i.opened_at);
    const hasClicked = interactions.some(i => i.clicked_at);
    const totalEmails = interactions.length;
    const recentActivity = interactions.filter(i =>
      new Date(i.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    if (hasClicked && recentActivity >= 3) return 'highly_engaged';
    if (hasOpened && recentActivity >= 2) return 'engaged';
    if (hasOpened) return 'occasional';
    return 'inactive';
  } catch (error) {
    console.error('Error getting customer segment:', error);
    return 'unknown';
  }
}

// Personalized greeting based on customer data
function getPersonalizedGreeting(name, segment, timeOfDay) {
  const greetings = {
    new: {
      morning: `Dobré ráno ${name}!`,
      afternoon: `Dobré odpoledne ${name}!`,
      evening: `Dobrý večer ${name}!`
    },
    engaged: {
      morning: `Dobré ráno ${name}, vítá vás zpět!`,
      afternoon: `Dobré odpoledne ${name}, vítá vás zpět!`,
      evening: `Dobrý večer ${name}, vítá vás zpět!`
    },
    highly_engaged: {
      morning: `Dobré ráno ${name}, našemu nejaktivnějšímu klientovi!`,
      afternoon: `Dobré odpoledne ${name}, našemu nejaktivnějšímu klientovi!`,
      evening: `Dobrý večer ${name}, našemu nejaktivnějšímu klientovi!`
    }
  };

  const segmentGreetings = greetings[segment] || greetings.new;
  return segmentGreetings[timeOfDay] || `Dobrý den ${name}!`;
}

// Get current time context
function getTimeContext() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { template, to, data = {}, customerEmail } = req.body;

    if (!template || !to) {
      return res.status(400).json({ error: 'Missing required fields: template, to' });
    }

    const emailConfig = emailTemplates[template];
    if (!emailConfig) {
      return res.status(400).json({ error: `Unknown template: ${template}` });
    }

    const { component: EmailComponent, subject: subjectFunction } = emailConfig;

    // Get customer segment and personalization data
    const segment = await getCustomerSegment(customerEmail || to);
    const timeContext = getTimeContext();
    const personalizedGreeting = getPersonalizedGreeting(
      data.name || 'kliente',
      segment,
      timeContext
    );

    // Enhance email data with personalization
    const enhancedData = {
      ...data,
      personalizedGreeting,
      segment,
      timeContext,
      customerEmail: customerEmail || to
    };

    // Generate the email HTML
    const html = render(EmailComponent(enhancedData));

    // Generate personalized subject
    const subject = subjectFunction(enhancedData);

    // Send the email with enhanced tracking
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@prochazka.group',
      to,
      subject,
      html,
      // Add tracking and categorization
      tags: [
        { name: 'template', value: template },
        { name: 'segment', value: segment },
        { name: 'time_context', value: timeContext }
      ]
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    // Store email interaction data
    try {
      await supabase
        .from('email_interactions')
        .insert({
          email: to,
          template,
          segment,
          subject,
          sent_at: new Date().toISOString(),
          message_id: emailData?.id
        });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request if DB insert fails
    }

    res.status(200).json({
      success: true,
      data: emailData,
      subject,
      template,
      segment,
      personalizedGreeting
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
