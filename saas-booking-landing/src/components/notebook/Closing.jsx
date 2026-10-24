import Scene from './Scene';
import { LogoMark } from '../Doodles';
import { APP_URL } from '../../config';

const Closing = () => (
  <Scene id="empieza" time="8:00" labelledBy="closing-title">
    <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="font-hand text-2xl text-marker">un día nuevo</p>
        <h2 id="closing-title" className="nb-display mt-2 text-5xl font-semibold sm:text-6xl md:text-7xl">
          ¿Abrimos <em className="font-medium">tu</em> agenda?
        </h2>
        <p className="mt-5 max-w-xl text-lg text-ink-soft">
          Agrega tus servicios, tu equipo y tu horario. En unos minutos tienes tu enlace listo para Instagram,
          WhatsApp o Google.
        </p>
        <a href={`${APP_URL}/signup`} className="hd-btn mt-8 px-7 py-3 text-lg">Crear mi agenda gratis</a>
      </div>
      <LogoMark className="h-40 w-40 md:h-56 md:w-56 -rotate-6" />
    </div>
  </Scene>
);

export default Closing;
