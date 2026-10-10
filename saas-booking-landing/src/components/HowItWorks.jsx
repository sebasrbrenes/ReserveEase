import { Scribble } from './Doodles';

const STEPS = [
  { title: 'Set up your business', text: 'Add your services with their duration and price, the people who attend them and your opening hours.' },
  { title: 'Share your link', text: 'You get your own booking page. Put the link on Instagram, WhatsApp, Google or your website.' },
  { title: 'Clients book, you see it', text: 'Each booking lands in your dashboard. Move or cancel it there, and the time frees up again.' },
];

const HowItWorks = () => (
  <section id="how-it-works" className="scroll-mt-20 border-y-2 border-ink bg-white">
    <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
      <h2 className="hd-title text-5xl md:text-6xl mb-10 text-center">How it works</h2>
      <ol className="grid gap-8 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative">
            <span className="relative inline-flex items-center justify-center w-14 h-14 mb-3">
              <Scribble className="absolute inset-0 w-full h-full text-sun" />
              <span className="relative font-hand text-4xl font-bold">{i + 1}</span>
            </span>
            <h3 className="text-xl font-extrabold mb-2">{step.title}</h3>
            <p className="text-ink-soft">{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default HowItWorks;
