import { useRef, useState } from 'react';
import { FiMaximize, FiPause, FiPlay, FiVolume2, FiVolumeX } from 'react-icons/fi';
import Scene from './Scene';
import Highlight from './Highlight';
import { useLanguage } from '../../i18n/LanguageContext';

// The product demo: a real recording of the app against demo data, one per
// language, made with demo-video/ (record.mjs, then build.py). Its files, texts
// and chapter times live in the landing's copy (i18n/en.js and es.js, `demo`).
const SIZE = { width: 1280, height: 720 };

const controlButton =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-white text-ink transition-colors hover:bg-sun-light';
const controlShape = { borderRadius: '10px 4px 9px 5px / 5px 9px 4px 10px' };

// Keyed by language, so switching language starts over with the other take.
const Player = ({ copy }) => {
  const video = useRef(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [failed, setFailed] = useState(false);

  const current = copy.steps.reduce((at, [start], i) => (time >= start ? i : at), 0);

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
    <div className="mt-12 grid grid-cols-[minmax(0,1fr)] items-start gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-12">
      <figure className="nb-sheet overflow-hidden p-2 sm:p-3">
        <div className="relative overflow-hidden border-2 border-ink bg-paper" style={{ borderRadius: '4px 10px 5px 9px / 9px 5px 10px 4px' }}>
          <video
            ref={video}
            src={copy.video}
            poster={copy.poster}
            width={SIZE.width}
            height={SIZE.height}
            preload="none"
            playsInline
            muted={muted}
            aria-label={copy.label}
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
              aria-label={copy.play}
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
              {copy.unavailable}
            </p>
          )}
        </div>

        <figcaption className="flex items-center gap-3 px-1 pb-1 pt-3">
          <button type="button" onClick={toggle} aria-label={playing ? copy.pause : copy.play} className={controlButton} style={controlShape} disabled={failed}>
            {playing ? <FiPause aria-hidden="true" /> : <FiPlay aria-hidden="true" />}
          </button>
          <button type="button" onClick={toggleSound} aria-label={muted ? copy.soundOn : copy.soundOff} aria-pressed={!muted} className={controlButton} style={controlShape} disabled={failed}>
            {muted ? <FiVolumeX aria-hidden="true" /> : <FiVolume2 aria-hidden="true" />}
          </button>
          {/* Progress drawn as a pencil line; the steps beside the video are the way to jump around. */}
          <div aria-hidden="true" className="relative h-2 flex-1 overflow-hidden rounded-full border-2 border-ink bg-paper-deep">
            <div className="absolute inset-y-0 left-0 bg-marker" style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} />
          </div>
          <button type="button" onClick={fullscreen} aria-label={copy.fullscreen} className={controlButton} style={controlShape} disabled={failed}>
            <FiMaximize aria-hidden="true" />
          </button>
        </figcaption>
      </figure>

      <ol aria-label={copy.chapters} className="space-y-1">
        {copy.steps.map(([start, step], i) => {
          const active = started && i === current;
          return (
            <li key={start}>
              <button
                type="button"
                onClick={() => seek(start)}
                aria-label={`${copy.goTo}: ${step}`}
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
  );
};

const Demo = () => {
  const { language, t } = useLanguage();
  const copy = t.demo;
  return (
    <Scene id="la-demo" time={t.times.demo} labelledBy="demo-title">
      <p className="font-hand text-2xl text-marker">{copy.kicker}</p>
      <h2 id="demo-title" className="nb-display mt-2 max-w-4xl text-5xl font-semibold sm:text-6xl md:text-7xl">
        {copy.title[0]}<em className="font-medium"><Highlight>{copy.title[1]}</Highlight></em>{copy.title[2]}
      </h2>
      <p className="mt-6 max-w-2xl text-lg text-ink-soft">{copy.lead}</p>
      <Player key={language} copy={copy} />
    </Scene>
  );
};

export default Demo;
