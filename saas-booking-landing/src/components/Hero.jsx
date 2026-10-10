import { Arrow, Star, Underline } from './Doodles';
import { APP_URL } from '../config';
import bookingMobile from '../assets/images/booking-mobile.webp';

const Hero = () => (
  <section className="relative overflow-hidden">
    <div className="max-w-6xl mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24 grid gap-12 md:grid-cols-[1.15fr_0.85fr] items-center">
      <div>
        <p className="font-hand text-2xl text-marker mb-2">for barbershops, salons and anyone who works by appointment</p>
        <h1 className="hd-title text-6xl sm:text-7xl md:text-8xl">
          Your appointment book,{' '}
          <span className="relative inline-block">
            without the paper.
            <Underline className="absolute -bottom-2 left-0 w-full h-5 text-sun" />
          </span>
        </h1>
        <p className="mt-8 text-lg md:text-xl text-ink-soft max-w-xl">
          Share one link. Your clients see the times that are really free and book in a minute, and
          you see every appointment in your calendar. Two people never get the same slot.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <a href={`${APP_URL}/signup`} className="hd-btn text-lg px-7 py-3">Create your booking page</a>
          <a href="#how-it-works" className="hd-link">See how it works</a>
        </div>
        <p className="mt-4 hd-help">Free during early access. No card needed.</p>
      </div>

      <div className="relative mx-auto w-64 sm:w-72">
        <div className="hd-card overflow-hidden p-2 md:rotate-2">
          <img
            src={bookingMobile}
            alt="The ReserveEase booking page on a phone: pick a service, a staff member, a date and a free time."
            width="420"
            height="860"
            className="w-full h-auto rounded-lg border border-ink/10"
          />
        </div>
        <div className="hidden md:flex absolute -left-44 top-24 items-start gap-1 text-marker">
          <span className="font-hand text-2xl leading-tight w-28 text-right">what your clients see</span>
          <Arrow className="w-16 h-8 mt-4" />
        </div>
        <Star className="absolute -top-5 -right-4 w-9 h-9 text-sun" />
      </div>
    </div>
  </section>
);

export default Hero;
