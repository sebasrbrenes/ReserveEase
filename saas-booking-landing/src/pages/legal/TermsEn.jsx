import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../../config';
import { LegalPage, List, Section } from '../../components/common/LegalPage';

// English translation of Terms.jsx. Same version: change both when the text changes in substance.
const TermsEn = () => (
  <LegalPage
    title="Terms of use"
    updated="October 28, 2026"
    lang="en"
    other={{ to: '/terms', lang: 'es', label: 'Leer en español' }}
  >
    <Section title="1. What ReserveEase is">
      <p>
        ReserveEase is an online calendar: a business sets up its services, its staff and its hours, and its
        clients book from a public link. By creating an account or booking an appointment you accept these terms
        and the <Link to="/privacy-policy/en" className="hd-link">privacy notice</Link>.
      </p>
    </Section>

    <Section title="2. Price and subscription">
      <p>
        ReserveEase has a single plan at $15 USD per month. You subscribe from your account settings and the
        payment is handled by Paddle.com, our online reseller and Merchant of Record, which processes the payment
        and issues the invoice; by paying you also accept its buyer terms. The subscription renews every month
        until you cancel it. If you cancel, you keep access until the end of the period you already paid for.
        We never charge you unless you expressly subscribe.
      </p>
      <p>
        The service may change or have errors or interruptions. We keep improving it, but we
        do not guarantee that it is available at all times.
      </p>
    </Section>

    <Section title="3. Business accounts">
      <List>
        <li>You must be of legal age and authorized to register the business.</li>
        <li>The business information (services, prices, hours) must be true; it is what your clients see.</li>
        <li>Keep your password safe. You are responsible for what is done with your account and must tell us if you think someone else got in.</li>
        <li>You can close your account at any time by writing to us.</li>
      </List>
    </Section>

    <Section title="4. Your clients' data">
      <p>
        The data of the people who book with you belongs to you and to them. Use it only to handle their
        appointments and as the data protection law that applies to you requires, and respond to their requests to
        access, correct or delete it (we can help). We process it on your behalf, as the privacy notice explains.
      </p>
    </Section>

    <Section title="5. If you book an appointment">
      <p>
        The appointment is an agreement between you and the business. The business sets its prices, its
        cancellation policies and how it provides the service; ReserveEase only records the booking and sends the
        notices.
      </p>
    </Section>

    <Section title="6. Uses that are not allowed">
      <List>
        <li>Using the service for anything illegal, to send unwanted email or to impersonate another business or person.</li>
        <li>Creating fake or automated bookings.</li>
        <li>Trying to access other businesses&apos; data, get around the limits of the service or interfere with how it works.</li>
      </List>
      <p>We may suspend an account that breaks these rules, letting the business know when possible.</p>
    </Section>

    <Section title="7. Liability">
      <p>
        We provide the service as it is. To the extent the law allows, ReserveEase is not liable for indirect
        losses, such as lost earnings from an appointment that was not recorded or a notice that did not arrive.
        We recommend checking your calendar on the dashboard and not relying only on emails.
      </p>
    </Section>

    <Section title="8. Changes and contact">
      <p>
        If we change these terms in an important way, we will tell businesses before the change takes effect. For
        any question, write to us at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="hd-link">{CONTACT_EMAIL}</a>.
      </p>
    </Section>
  </LegalPage>
);

export default TermsEn;
