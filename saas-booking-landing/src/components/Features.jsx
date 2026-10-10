import { FiCalendar, FiClock, FiGlobe, FiLock, FiMail, FiRepeat, FiSmartphone, FiUsers } from 'react-icons/fi';
import { Sparkle, Underline } from './Doodles';
import dashboardDesktop from '../assets/images/dashboard-desktop.webp';

// Only what the product does today. "soon" marks work in progress.
const FEATURES = [
  { icon: FiClock, title: 'Only real free times', text: 'Clients see times that fit the service, your opening hours and the appointments you already have.' },
  { icon: FiLock, title: 'No double bookings', text: 'If two people try to take the same time at once, only one gets it. The other is asked to pick another time.' },
  { icon: FiRepeat, title: 'Move or cancel in one step', text: 'Change the time or the staff member from your dashboard. A cancelled time is free to book again.' },
  { icon: FiUsers, title: 'Your team and services', text: 'Each person offers the services they do. Clients choose who attends them.' },
  { icon: FiGlobe, title: 'Your time zone and currency', text: 'Times and prices show the way your business works, wherever your clients are.' },
  { icon: FiSmartphone, title: 'Made for phones', text: 'Most clients book from their phone, so the booking page is built and tested for small screens first.' },
  { icon: FiCalendar, title: 'Your week at a glance', text: 'See today’s appointments, the week ahead and what each day is worth.' },
  { icon: FiMail, title: 'Email confirmations and reminders', text: 'A confirmation when they book, a notice if anything changes and a reminder the day before.', soon: true },
];

const Features = () => (
  <section id="features" className="scroll-mt-20">
    <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
      <h2 className="hd-title text-5xl md:text-6xl mb-4 text-center">
        <span className="relative inline-block">
          What you get
          <Underline className="absolute -bottom-2 left-0 w-full h-4 text-sun" />
        </span>
      </h2>
      <p className="text-center text-ink-soft max-w-2xl mx-auto mb-12">
        No artificial intelligence and no made-up numbers. Just the booking tools a small business needs, working well.
      </p>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text, soon }) => (
          <li key={title} className="hd-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="w-11 h-11 flex items-center justify-center border-2 border-ink rounded-xl bg-marker-light text-marker">
                <Icon aria-hidden="true" size={20} />
              </span>
              {soon && <span className="hd-badge text-ink bg-sun-light">Coming soon</span>}
            </div>
            <h3 className="text-lg font-extrabold mb-1">{title}</h3>
            <p className="text-sm text-ink-soft">{text}</p>
          </li>
        ))}
      </ul>

      <figure className="relative mt-16 max-w-4xl mx-auto">
        <div className="hd-card p-2 md:-rotate-1">
          <img
            src={dashboardDesktop}
            alt="The ReserveEase dashboard: today's appointments, active staff, booked value, upcoming appointments and the week calendar."
            width="960"
            height="330"
            loading="lazy"
            className="w-full h-auto rounded-lg border border-ink/10"
          />
        </div>
        <figcaption className="mt-4 text-center font-hand text-2xl text-marker">
          your dashboard, with the demo business
        </figcaption>
        <Sparkle className="absolute -top-6 -left-4 w-10 h-10 text-marker" />
      </figure>
    </div>
  </section>
);

export default Features;
