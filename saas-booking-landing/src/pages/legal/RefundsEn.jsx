import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../../config';
import { LegalPage, List, Section } from '../../components/common/LegalPage';

// English translation of Refunds.jsx. Same version: change both when the policy changes in substance.
const RefundsEn = () => (
  <LegalPage
    title="Refund policy"
    updated="November 2, 2026"
    lang="en"
    other={{ to: '/refunds', lang: 'es', label: 'Leer en español' }}
  >
    <Section title="1. 14 days to change your mind">
      <p>
        If ReserveEase is not right for you, you can ask for a full refund of any payment within 14 days of the
        charge, including renewals. No questions asked: you do not need to give a reason.
      </p>
    </Section>

    <Section title="2. How to ask for it">
      <List>
        <li>
          Write to us at <a href={`mailto:${CONTACT_EMAIL}`} className="hd-link">{CONTACT_EMAIL}</a> from the
          email of your account, or
        </li>
        <li>
          contact Paddle, our payment provider, at{' '}
          <a href="https://paddle.net" className="hd-link" target="_blank" rel="noreferrer">paddle.net</a> with
          the order number on your receipt.
        </li>
      </List>
      <p>
        The refund is made by Paddle.com, our Merchant of Record, to the same card or payment method. It usually
        shows up within 5 to 10 business days, depending on your bank.
      </p>
    </Section>

    <Section title="3. After 14 days">
      <p>
        Payments older than 14 days are not refunded, but you can cancel at any time from your account settings so
        you are not charged again. You keep access until the end of the month you already paid for.
      </p>
    </Section>

    <Section title="4. Other cases">
      <List>
        <li>If we charged you by mistake or twice, we refund it whenever you tell us.</li>
        <li>If we close an account for breaking the <Link to="/terms/en" className="hd-link">terms of use</Link>, we do not refund the month in progress.</li>
        <li>If we stop offering ReserveEase, we refund the unused part of the month in progress.</li>
      </List>
    </Section>
  </LegalPage>
);

export default RefundsEn;
