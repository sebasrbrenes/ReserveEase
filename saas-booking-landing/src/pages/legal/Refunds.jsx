import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../../config';
import { LegalPage, List, Section } from '../../components/common/LegalPage';

const Refunds = () => (
  <LegalPage
    title="Política de reembolsos"
    updated="2 de noviembre de 2026"
    other={{ to: '/refunds/en', lang: 'en', label: 'Read in English' }}
  >
    <Section title="1. 14 días para arrepentirte">
      <p>
        Si ReserveEase no te sirve, puedes pedir el reembolso completo de cualquier pago dentro de los 14 días
        siguientes al cobro, incluidas las renovaciones. Sin preguntas: no tienes que darnos un motivo.
      </p>
    </Section>

    <Section title="2. Cómo pedirlo">
      <List>
        <li>
          Escríbenos a <a href={`mailto:${CONTACT_EMAIL}`} className="hd-link">{CONTACT_EMAIL}</a> desde el
          correo de tu cuenta, o
        </li>
        <li>
          contacta a Paddle, nuestro proveedor de pagos, en{' '}
          <a href="https://paddle.net" className="hd-link" target="_blank" rel="noreferrer">paddle.net</a> con
          el número de pedido de tu recibo.
        </li>
      </List>
      <p>
        El reembolso lo hace Paddle.com, nuestro comerciante registrado (Merchant of Record), a la misma tarjeta o
        medio de pago. Suele verse en 5 a 10 días hábiles, según tu banco.
      </p>
    </Section>

    <Section title="3. Después de 14 días">
      <p>
        Los pagos con más de 14 días no se reembolsan, pero puedes cancelar cuando quieras desde la configuración de
        tu cuenta para que no se te cobre de nuevo. Sigues teniendo acceso hasta el final del mes ya pagado.
      </p>
    </Section>

    <Section title="4. Otros casos">
      <List>
        <li>Si te cobramos por error o dos veces, te lo devolvemos en cuanto nos avises.</li>
        <li>Si cerramos una cuenta por incumplir los <Link to="/terms" className="hd-link">términos de uso</Link>, no reembolsamos el mes en curso.</li>
        <li>Si dejamos de ofrecer ReserveEase, reembolsamos la parte no usada del mes en curso.</li>
      </List>
    </Section>
  </LegalPage>
);

export default Refunds;
