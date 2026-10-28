import { useRef, useState } from 'react';
import { FiMaximize, FiPause, FiPlay, FiVolume2, FiVolumeX } from 'react-icons/fi';
import Scene from './Scene';
import Highlight from './Highlight';

// The product demo: a real recording of the app against demo data, made with
// demo-video/ (record.mjs, then build.py). To replace it, drop the new files in
// public/demo/ and paste the chapter times build.py prints into CHAPTERS.
const VIDEO = {
  src: '/demo/reserveease-demo.mp4',
  poster: '/demo/reserveease-demo-poster.webp',
  width: 1280,
  height: 720,
};

// Every visible text of the scene, in one place for translation.
const COPY = {
  note: 'sin maqueta, sin trucos',
  title: ['Míralo funcionar,', 'de verdad.'],
  intro:
    'Cuarenta segundos grabados en ReserveEase: el barbero arma su agenda, una clienta reserva desde su enlace y la cita aparece sola en el calendario.',
  label: 'Video de ReserveEase funcionando',
  play: 'Reproducir el video',
  pause: 'Pausar el video',
  soundOn: 'Activar el sonido',
  soundOff: 'Silenciar',
  fullscreen: 'Ver en pantalla completa',
  chaptersLabel: 'Pasos del video',
  goTo: 'Ir a',
  unavailable: 'El video no está disponible en este momento.',
};

// [start in seconds, step]. The times come from build.py's output.
const CHAPTERS = [
  [0, 'El barbero abre los domingos y agrega un servicio'],
  [17.3, 'Su clienta abre el enlace de reservas'],
  [19.0, 'Elige servicio, barbero, día y hora'],
  [32.6, 'La cita queda confirmada'],
  [35.8, 'Y aparece sola en la agenda del barbero'],
];

const controlButton =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-white text-ink transition-colors hover:bg-sun-light';
const controlShape = { borderRadius: '10px 4px 9px 5px / 5px 9px 4px 10px' };

const Demo = () => {
  const video = useRef(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  const current = CHAPTERS.reduce((at, [start], i) => (time >= start ? i : at), 0);

  // preload="none": nothing but the poster is downloaded until the first play.
  const play = () => {
    setStarted(true);
    video.current.play().catch(() => setPlaying(false));
  };
  const toggle = () => (video.current.paused ? play() : video.current.pause());
  const toggleSound = () => {
    video.current.muted = !video.current.muted;
    setMuted(video.current.muted);
  };
  // iPhone Safari only lets the video itself go full screen.
  const fullscreen = () => {
    const v = video.current;
    if (v.requestFullscreen) v.requestFullscreen().catch(() => {});
    else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    if (v.paused) play();
  };
  const seek = (start) => {
    video.current.currentTime = start;
    setTime(start);
    if (video.current.paused) play();
  };

  return (
    <Scene id="la-demo" time="16:00" labelledBy="demo-title">
      <p className="font-hand text-2xl text-marker">{COPY.note}</p>
      <h2 id="demo-title" className="nb-display mt-2 max-w-4xl text-5xl font-semibold sm:text-6xl md:text-7xl">
        {COPY.title[0]} <em className="font-medium"><Highlight>{COPY.title[1]}</Highlight></em>
      </h2>
      <p className="mt-6 max-w-2xl text-lg text-ink-soft">{COPY.intro}</p>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-12">
        <figure className="nb-sheet overflow-hidden p-2 sm:p-3">
          <div className="relative overflow-hidden border-2 border-ink bg-paper" style={{ borderRadius: '4px 10px 5px 9px / 9px 5px 10px 4px' }}>
            <video
              ref={video}
              src={VIDEO.src}
              poster={VIDEO.poster}
              width={VIDEO.width}
              height={VIDEO.height}
              preload="none"
              playsInline
              muted={muted}
              aria-label={COPY.label}
              className="block aspect-video h-auto w-full cursor-pointer"
              onClick={toggle}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onError={() => setFailed(true)}
            />

            {!started && !failed && (
              <button
                type="button"
                onClick={play}
                aria-label={COPY.play}
                className="group absolute inset-0 flex items-center justify-center bg-ink/5 transition-colors hover:bg-transparent"
              >
                <span
                  className="flex h-20 w-20 items-center justify-center border-2 border-ink bg-sun text-ink transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 sm:h-24 sm:w-24"
                  style={{ borderRadius: '50% 46% 52% 48% / 48% 52% 46% 50%', boxShadow: '4px 4px 0 #1F2328' }}
                >
                  <FiPlay aria-hidden="true" className="ml-1 h-9 w-9 fill-current sm:h-10 sm:w-10" />
                </span>
              </button>
            )}

            {failed && (
              <p role="status" className="absolute inset-x-4 bottom-4 bg-white/90 px-4 py-3 text-center text-sm font-semibold text-ink">
                {COPY.unavailable}
              </p>
            )}
          </div>

          <figcaption className="flex items-center gap-3 px-1 pb-1 pt-3">
            <button type="button" onClick={toggle} aria-label={playing ? COPY.pause : COPY.play} className={controlButton} style={controlShape} disabled={failed}>
              {playing ? <FiPause aria-hidden="true" /> : <FiPlay aria-hidden="true" />}
            </button>
            <button type="button" onClick={toggleSound} aria-label={muted ? COPY.soundOn : COPY.soundOff} aria-pressed={!muted} className={controlButton} style={controlShape} disabled={failed}>
              {muted ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}
            </button>
            {/* Progress drawn as a pencil line; the steps beside the video are the way to jump around. */}
            <div aria-hidden="true" className="relative h-2 flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper-deep">
              <div className="absolute inset-y-0 left-0 bg-marker" style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
            </div>
            <button type="button" onClick={fullscreen} aria-label={COPY.fullscreen} className={controlButton} style={controlShape} disabled={failed}>
              <FiMaximize aria-hidden="true" />
            </button>
          </figcaption>
        </figure>

        <ol aria-label={COPY.chaptersLabel} className="space-y-1">
          {CHAPTERS.map(([start, step], i) => {
            const active = started && i === current;
            return (
              <li key={start}>
                <button
                  type="button"
                  onClick={() => seek(start)}
                  aria-label={`${COPY.goTo}: ${step}`}
                  aria-current={active ? 'step' : undefined}
                  disabled={failed}
                  className={`flex w-full items-baseline gap-4 border-2 px-3 py-2.5 text-left transition-colors ${
                    active ? 'border-ink bg-sun-light' : 'border-transparent hover:border-ink/30'
                  }`}
                  style={controlShape}
                >
                  <span className={`font-hand text-3xl leading-none ${active ? 'text-coral' : 'text-ink-soft'}`}>{i + 1}</span>
                  <span className={`text-lg ${active ? 'font-bold text-ink' : 'text-ink-soft'}`}>{step}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </Scene>
  );
};

export default Demo;
