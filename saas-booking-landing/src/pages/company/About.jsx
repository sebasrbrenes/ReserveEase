import { CONTACT_EMAIL } from '../../config';
import { LegalPage, List, Section } from '../../components/common/LegalPage';
import { useLanguage } from '../../i18n/LanguageContext';

const mail = <a href={`mailto:${CONTACT_EMAIL}`} className="hd-link">{CONTACT_EMAIL}</a>;

// In the visitor's language.
const AboutEs = () => (
  <LegalPage title="Quiénes somos">
    <Section title="El proyecto">
      <p>
        ReserveEase es un proyecto independiente: una agenda en línea pensada para barberías, salones y
        profesionales que trabajan con cita. Nació de una idea sencilla: que el negocio deje de contestar
        mensajes para acomodar horarios y que sus clientes reserven solos, sin choques de horario.
      </p>
    </Section>

    <Section title="Cómo trabajamos">
      <List>
        <li><strong className="text-marker">Simple:</strong> lo justo para recibir reservas y administrar la agenda, sin pasos de más.</li>
        <li><strong className="text-marker">Honesto:</strong> en esta web no hay cifras ni testimonios inventados.</li>
        <li><strong className="text-marker">Cuidadoso con los datos:</strong> guardamos solo lo necesario para la cita.</li>
      </List>
    </Section>

    <Section title="Hablemos">
      <p>
        Estamos en acceso anticipado y cada comentario nos ayuda. Escríbenos a{' '}{mail}.
      </p>
    </Section>
  </LegalPage>
);

const AboutEn = () => (
  <LegalPage title="About us" lang="en">
    <Section title="The project">
      <p>
        ReserveEase is an independent project: an online calendar built for barbershops, salons and
        professionals who work by appointment. It started from a simple idea: the business stops answering
        messages to juggle times, and its clients book on their own, with no double bookings.
      </p>
    </Section>

    <Section title="How we work">
      <List>
        <li><strong className="text-marker">Simple:</strong> just what you need to take bookings and run your calendar, no extra steps.</li>
        <li><strong className="text-marker">Honest:</strong> there are no made-up numbers or testimonials on this site.</li>
        <li><strong className="text-marker">Careful with data:</strong> we keep only what the appointment needs.</li>
      </List>
    </Section>

    <Section title="Let's talk">
      <p>
        We are in early access and every comment helps. Write to us at{' '}{mail}.
      </p>
    </Section>
  </LegalPage>
);

const About = () => {
  const { language } = useLanguage();
  return language === 'en' ? <AboutEn /> : <AboutEs />;
};

export default About;
