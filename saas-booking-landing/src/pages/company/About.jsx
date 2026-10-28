import { CONTACT_EMAIL } from '../../config';
import { LegalPage, List, Section } from '../../components/common/LegalPage';

const About = () => (
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
        Estamos en acceso anticipado y cada comentario nos ayuda. Escríbenos a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="hd-link">{CONTACT_EMAIL}</a>.
      </p>
    </Section>
  </LegalPage>
);

export default About;
