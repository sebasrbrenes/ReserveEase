const FAQS = [
  {
    question: 'What is ReserveEase?',
    answer: 'A booking page for your clients and a dashboard for you. You set your services, team and hours; clients pick a free time from your link; you see and manage every appointment.',
  },
  {
    question: 'How much does it cost?',
    answer: 'Nothing during early access, and no card is needed. If a paid plan starts later, you will know the price before it applies to you.',
  },
  {
    question: 'Do my clients need an account?',
    answer: 'No. They choose a service, a person, a day and a time, and leave their name and email.',
  },
  {
    question: 'Can I put it on my website or Instagram?',
    answer: 'Yes. You get a link to your own booking page that you can share anywhere: your website, Instagram, WhatsApp or Google.',
  },
  {
    question: 'Does it send emails or text messages?',
    answer: 'Email confirmations, change notices and reminders the day before are built and are being connected to the email service. Text messages are not available yet.',
  },
  {
    question: 'Who can see my appointments?',
    answer: 'Only you, after signing in with a verified email. Each business sees only its own appointments, and your clients only see free times, never other people’s bookings.',
  },
];

const FAQ = () => (
  <section id="faq" className="scroll-mt-20">
    <div className="max-w-3xl mx-auto px-4 py-16 md:py-24">
      <h2 className="hd-title text-5xl md:text-6xl mb-10 text-center">Questions</h2>
      <div className="space-y-4">
        {FAQS.map((faq) => (
          <details key={faq.question} className="hd-card p-5 group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-extrabold text-lg">
              {faq.question}
              <span aria-hidden="true" className="font-hand text-3xl leading-none transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
            </summary>
            <p className="mt-3 text-ink-soft">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

export default FAQ;
