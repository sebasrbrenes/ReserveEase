import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../../config';
import { LegalPage, List, Section } from '../../components/common/LegalPage';

const Terms = () => (
  <LegalPage title="Términos de uso" updated="28 de octubre de 2026">
    <Section title="1. Qué es ReserveEase">
      <p>
        ReserveEase es una agenda en línea: el negocio configura sus servicios, su personal y sus horarios, y sus
        clientes reservan desde un enlace público. Al crear una cuenta o reservar una cita aceptas estos términos
        y el <Link to="/privacy-policy" className="hd-link">aviso de privacidad</Link>.
      </p>
    </Section>

    <Section title="2. Acceso anticipado y precio">
      <p>
        ReserveEase está en acceso anticipado y hoy es gratis. No pedimos datos de pago. Si en el futuro hay un
        plan de pago, lo avisaremos a los negocios con al menos 30 días de anticipación y nunca cobraremos sin
        que lo acepten de forma expresa.
      </p>
      <p>
        Durante el acceso anticipado el servicio puede cambiar, tener errores o interrupciones. Lo mejoramos
        continuamente, pero no garantizamos que esté disponible en todo momento.
      </p>
    </Section>

    <Section title="3. Cuentas de negocio">
      <List>
        <li>Debes ser mayor de edad y tener autorización para registrar el negocio.</li>
        <li>La información del negocio (servicios, precios, horarios) debe ser verdadera; es la que ven tus clientes.</li>
        <li>Cuida tu contraseña. Eres responsable de lo que se haga con tu cuenta y debes avisarnos si crees que alguien más entró.</li>
        <li>Puedes cerrar tu cuenta cuando quieras escribiéndonos.</li>
      </List>
    </Section>

    <Section title="4. Datos de tus clientes">
      <p>
        Los datos de quienes reservan contigo son tuyos y de ellos. Úsalos solo para atender sus citas y según la
        ley de protección de datos que te aplique, y atiende sus solicitudes de acceso, corrección o borrado
        (podemos ayudarte). Nosotros los tratamos por tu cuenta, como explica el aviso de privacidad.
      </p>
    </Section>

    <Section title="5. Quien reserva una cita">
      <p>
        La cita es un acuerdo entre tú y el negocio. El negocio decide sus precios, sus políticas de cancelación
        y cómo presta el servicio; ReserveEase solo registra la reserva y envía los avisos.
      </p>
    </Section>

    <Section title="6. Uso no permitido">
      <List>
        <li>Usar el servicio para algo ilegal, para enviar correo no deseado o para suplantar a otro negocio o persona.</li>
        <li>Crear reservas falsas o de forma automatizada.</li>
        <li>Intentar entrar a datos de otros negocios, saltarse los límites del servicio o interferir con su funcionamiento.</li>
      </List>
      <p>Podemos suspender una cuenta que incumpla estas reglas, avisando al negocio cuando sea posible.</p>
    </Section>

    <Section title="7. Responsabilidad">
      <p>
        Ofrecemos el servicio tal como está. En la medida que permita la ley, ReserveEase no responde por
        pérdidas indirectas, como ganancias perdidas por una cita que no se registró o un aviso que no llegó.
        Recomendamos revisar la agenda en el panel y no depender solo de los correos.
      </p>
    </Section>

    <Section title="8. Cambios y contacto">
      <p>
        Si cambiamos estos términos de forma importante, lo avisaremos a los negocios antes de que entren en
        vigor. Para cualquier consulta, escríbenos a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="hd-link">{CONTACT_EMAIL}</a>.
      </p>
    </Section>
  </LegalPage>
);

export default Terms;
