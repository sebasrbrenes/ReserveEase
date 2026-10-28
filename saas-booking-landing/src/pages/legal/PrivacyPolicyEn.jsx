import { CONTACT_EMAIL } from '../../config';
import { LegalPage, List, Section } from '../../components/common/LegalPage';

// English translation of PrivacyPolicy.jsx, linked from booking pages a business shows in
// English. Same version: change both when the text changes in substance.
const PrivacyPolicyEn = () => (
  <LegalPage
    title="Privacy notice"
    updated="October 28, 2026 (version 2026-10)"
    lang="en"
    other={{ to: '/privacy-policy', lang: 'es', label: 'Leer en español' }}
  >
    <Section title="In short">
      <p>
        ReserveEase is an online calendar for businesses that work by appointment. We keep only what a
        business needs to receive and manage its bookings, and to let its client know about the appointment.
        We do not sell data, show ads or use tracking or analytics tools.
      </p>
    </Section>

    <Section title="Who decides about your data">
      <p>
        If you booked an appointment, the business you booked with is responsible for your data: it decides
        what to do with its calendar and its clients. ReserveEase stores and processes that data on the
        business&apos;s behalf, only to provide the service.
      </p>
      <p>
        If you have a business account, ReserveEase is responsible for your account data.
      </p>
    </Section>

    <Section title="What data we keep">
      <p><strong>From people who book an appointment:</strong></p>
      <List>
        <li>Name, email and, if you write it, phone number.</li>
        <li>The appointment: service, staff member, date, time, status and any notes you write.</li>
        <li>The version of this notice shown when you booked.</li>
      </List>
      <p><strong>From businesses:</strong></p>
      <List>
        <li>Account name and email. Your password is handled by Google&apos;s Firebase Authentication; we never see it.</li>
        <li>Business details: name, services, prices, staff, hours and preferences.</li>
        <li>The feedback you send us from the dashboard.</li>
      </List>
      <p>
        The servers we use log technical data such as the IP address and time of each request, for security
        and to limit abuse.
      </p>
    </Section>

    <Section title="What we use it for">
      <List>
        <li>Creating, changing and cancelling the appointment, and showing it in the business&apos;s calendar.</li>
        <li>Sending the client the confirmation email, the reminder 24 hours before and notices of changes or cancellation. The business can turn these emails off.</li>
        <li>Giving dashboard access only to the business&apos;s accounts and protecting the service.</li>
        <li>Answering the feedback and requests you send us.</li>
      </List>
      <p>We do not send SMS or promotional emails today.</p>
    </Section>

    <Section title="Who it is shared with">
      <p>
        Only with the business of the appointment and with the providers that run the service, which process
        the data on our behalf:
      </p>
      <List>
        <li>Google Firebase: accounts and database.</li>
        <li>Render: the server that creates bookings and sends notices.</li>
        <li>Vercel: hosts the web pages.</li>
        <li>Twilio SendGrid: sends the emails.</li>
      </List>
      <p>
        These providers may store data outside your country. We would only hand data to an authority when the
        law requires it.
      </p>
    </Section>

    <Section title="How long we keep it">
      <p>
        Appointments are kept while the business has its account, so it can look up its history. If the
        business closes its account, we delete its data and its appointments within 30 days, except what the
        law requires us to keep.
      </p>
    </Section>

    <Section title="Your rights">
      <p>
        You can ask to see, correct or delete your data, or object to how we use it. If you booked an
        appointment, the fastest way is to ask the business; you can also write to us and we will pass it on.
        If you have a business account, write to us from the account&apos;s email. We answer within 10
        business days at most.
      </p>
    </Section>

    <Section title="How we protect it">
      <p>
        All communication is encrypted (HTTPS). Bookings are only created and changed through our server, and
        each business can only see its own appointments. No system is perfect: if an incident affects your
        data, we will let you know.
      </p>
    </Section>

    <Section title="Browser storage">
      <p>
        The app keeps the business account&apos;s session in your browser so you do not have to sign in every
        time. The booking page and this website use no advertising or analytics cookies.
      </p>
    </Section>

    <Section title="Changes and contact">
      <p>
        If we change this notice in a meaningful way, we will update the date and version above and let
        businesses know. For any question, write to us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="hd-link">{CONTACT_EMAIL}</a>.
      </p>
    </Section>
  </LegalPage>
);

export default PrivacyPolicyEn;
