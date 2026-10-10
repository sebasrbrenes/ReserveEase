import { FiCheck } from 'react-icons/fi';
import { Star } from './Doodles';
import { APP_URL } from '../config';

const INCLUDED = [
  'Your own booking page',
  'Unlimited appointments',
  'Staff, services and opening hours',
  'Dashboard with your week',
  'Works on phone and computer',
];

const Pricing = () => (
  <section id="pricing" className="scroll-mt-20 border-y-2 border-ink bg-white">
    <div className="max-w-6xl mx-auto px-4 py-16 md:py-20 grid gap-10 md:grid-cols-2 items-center">
      <div>
        <h2 className="hd-title text-5xl md:text-6xl mb-4">Free during early access</h2>
        <p className="text-ink-soft text-lg">
          ReserveEase is still being finished. While that happens it costs nothing, and you don’t need a card.
          Before any paid plan starts, you will be told the price and can decide whether to stay.
        </p>
      </div>

      <div className="relative hd-card p-6 md:p-8 bg-paper">
        <Star className="absolute -top-5 -right-5 w-10 h-10 text-sun" />
        <p className="font-hand text-3xl font-bold mb-1">Early access</p>
        <p className="text-5xl font-extrabold mb-6">$0</p>
        <ul className="space-y-2 mb-8">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <FiCheck aria-hidden="true" className="mt-1 text-leaf shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <a href={`${APP_URL}/signup`} className="hd-btn w-full text-lg">Create your booking page</a>
      </div>
    </div>
  </section>
);

export default Pricing;
