import { CONTACT_EMAIL } from '../../config';
import { LegalPage, List, Section } from '../../components/common/LegalPage';

// Keep in step with PRIVACY_NOTICE_VERSION in saas-booking-app (PublicBookingForm.jsx):
// change both when this text changes in substance.
const PrivacyPolicy = () => (
  <LegalPage title="Aviso de privacidad" updated="28 de octubre de 2026 (versión 2026-10)">
    <Section title="En pocas palabras">
      <p>
        ReserveEase es una agenda en línea para negocios que trabajan con citas. Guardamos solo lo necesario
        para que un negocio reciba y administre sus reservas, y para avisarle a su cliente de la cita. No
        vendemos datos, no mostramos publicidad y no usamos herramientas de seguimiento ni analítica.
      </p>
    </Section>

    <Section title="Quién decide sobre tus datos">
      <p>
        Si reservaste una cita, el responsable de tus datos es el negocio con el que reservaste: él decide qué
        hacer con su agenda y con sus clientes. ReserveEase guarda y procesa esos datos por cuenta del negocio
        y solo para darle el servicio.
      </p>
      <p>
        Si tienes una cuenta de negocio, ReserveEase es responsable de los datos de tu cuenta.
      </p>
    </Section>

    <Section title="Qué datos guardamos">
      <p><strong>De quien reserva una cita:</strong></p>
      <List>
        <li>Nombre, correo electrónico y, si lo escribes, teléfono.</li>
        <li>La cita: servicio, profesional, fecha, hora, estado y las notas que escribas.</li>
        <li>La versión de este aviso que se mostraba al reservar.</li>
      </List>
      <p><strong>De los negocios:</strong></p>
      <List>
        <li>Nombre y correo de la cuenta. La contraseña la gestiona Firebase Authentication de Google; nosotros no la vemos.</li>
        <li>Datos del negocio: nombre, servicios, precios, personal, horarios y preferencias.</li>
        <li>Los comentarios que nos envíes desde el panel.</li>
      </List>
      <p>
        Los servidores que usamos registran datos técnicos como la dirección IP y la hora de cada petición, para
        seguridad y para limitar abusos.
      </p>
    </Section>

    <Section title="Para qué los usamos">
      <List>
        <li>Crear, cambiar y cancelar la cita, y mostrarla en la agenda del negocio.</li>
        <li>Enviar al cliente el correo de confirmación, el recordatorio 24 horas antes y los avisos de cambio o cancelación. El negocio puede apagar estos correos.</li>
        <li>Dar acceso al panel solo a las cuentas del negocio y proteger el servicio.</li>
        <li>Responder a los comentarios y solicitudes que nos envíes.</li>
      </List>
      <p>Hoy no enviamos SMS ni correos promocionales.</p>
    </Section>

    <Section title="Con quién se comparten">
      <p>
        Solo con el negocio de la cita y con los proveedores que hacen funcionar el servicio, que procesan los
        datos por nuestra cuenta:
      </p>
      <List>
        <li>Google Firebase: cuentas y base de datos.</li>
        <li>Render: el servidor que crea las reservas y envía los avisos.</li>
        <li>Vercel: aloja las páginas web.</li>
        <li>Twilio SendGrid: envía los correos.</li>
      </List>
      <p>
        Estos proveedores pueden guardar los datos fuera de tu país. Solo entregaríamos datos a una autoridad
        cuando la ley nos obligue.
      </p>
    </Section>

    <Section title="Cuánto tiempo los guardamos">
      <p>
        Las citas se guardan mientras el negocio tenga su cuenta, para que pueda consultar su historial. Si el
        negocio cierra su cuenta, borramos sus datos y los de sus citas en un plazo de 30 días, salvo lo que la
        ley nos obligue a conservar.
      </p>
    </Section>

    <Section title="Tus derechos">
      <p>
        Puedes pedir ver, corregir o borrar tus datos, u oponerte a que los usemos. Si reservaste una cita,
        lo más rápido es pedírselo al negocio; también puedes escribirnos y se lo haremos llegar. Si tienes una
        cuenta de negocio, escríbenos desde el correo de la cuenta. Respondemos en un plazo máximo de 10 días
        hábiles.
      </p>
    </Section>

    <Section title="Cómo los protegemos">
      <p>
        Toda la comunicación va cifrada (HTTPS). Las reservas solo se crean y cambian a través de nuestro
        servidor, y cada negocio solo puede ver sus propias citas. Ningún sistema es infalible: si ocurre un
        incidente que afecte tus datos, te avisaremos.
      </p>
    </Section>

    <Section title="Almacenamiento en el navegador">
      <p>
        La app guarda en tu navegador la sesión de la cuenta de negocio para que no tengas que entrar cada vez.
        La página de reservas y esta web no usan cookies de publicidad ni de analítica.
      </p>
    </Section>

    <Section title="Cambios y contacto">
      <p>
        Si cambiamos este aviso de forma importante, cambiaremos la fecha y la versión de arriba y lo avisaremos
        a los negocios. Para cualquier consulta, escríbenos a{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="hd-link">{CONTACT_EMAIL}</a>.
      </p>
    </Section>
  </LegalPage>
);

export default PrivacyPolicy;
