"""Turns a recording made by record.mjs into the landing's demo video, its sound and its poster.

Usage: python3 demo-video/build.py LANG [DEST_DIR]   (LANG: en or es, the take record.mjs made)
Needs ffmpeg (with libx264), numpy and Pillow.

The camera (eased zooms and pans toward where the clicks happen) is rendered by
screenstudio-alt's render.py, vendored in vendor/screenstudio-alt (MIT), over the
full-resolution frames.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent / 'vendor' / 'screenstudio-alt'))
import render as camera  # noqa: E402

LANG = sys.argv[1] if len(sys.argv) > 1 else 'en'
OUT = Path('demo-video/out') / LANG
DEST = Path(sys.argv[2] if len(sys.argv) > 2 else 'saas-booking-landing/public/demo')
RATE = 48000
FPS = 60
# Camera: how far it zooms on a group of clicks, and when a group ends.
ZOOM, MIN_ZOOM, GAP, LEAD, TAIL = 1.7, 1.35, 2.2, 0.9, 0.7
MARGIN_X, MARGIN_Y = 260, 320  # source pixels kept around a group
W, H = 1920, 1080  # source frame size (record.mjs draws a 1280x720 page at 1.5x)

timeline = json.loads((OUT / 'timeline.json').read_text())
frames, segments, events = timeline['frames'], timeline['segments'], timeline['events']
duration = timeline['duration']


def segment_of(t):
    for i, s in enumerate(segments):
        if s['start'] <= t < s['start'] + s['duration'] + 1e-6:
            return i
    return len(segments) - 1


# Each frame lasts until the next one, or until its segment ends. The first
# frame of a segment starts with it, so cuts never show a stale page.
listing = []
for i, f in enumerate(frames):
    seg = segment_of(f['t'])
    start = segments[seg]['start'] if i == 0 or segment_of(frames[i - 1]['t']) != seg else f['t']
    end = segments[seg]['start'] + segments[seg]['duration']
    if i + 1 < len(frames) and segment_of(frames[i + 1]['t']) == seg:
        end = frames[i + 1]['t']
    if end - start > 0.001:
        listing.append((f['file'], end - start))
with open(OUT / 'frames.txt', 'w') as fh:
    for file, d in listing:
        fh.write(f"file 'frames/{file}'\nduration {d:.4f}\n")
    fh.write(f"file 'frames/{listing[-1][0]}'\n")


# Sound: soft UI clicks and keystrokes where they happened, and a chime when
# the booking is confirmed and when it reaches the barber's calendar.
def envelope(n, decay):
    return np.exp(-np.arange(n) / (RATE * decay))


def click(rng):
    n = int(RATE * 0.05)
    noise = rng.standard_normal(n) * envelope(n, 0.004)
    thump = np.sin(2 * np.pi * 180 * np.arange(n) / RATE) * envelope(n, 0.012)
    return 0.22 * np.convolve(noise, np.ones(6) / 6, 'same') + 0.35 * thump


def key(rng):
    n = int(RATE * 0.03)
    noise = rng.standard_normal(n) * envelope(n, 0.0025)
    return 0.12 * np.convolve(noise, np.ones(4) / 4, 'same')


def bell(freqs, gap=0.11, decay=0.5, gain=0.22):
    n = int(RATE * (gap * len(freqs) + decay * 3))
    out = np.zeros(n)
    t = np.arange(n) / RATE
    for i, f in enumerate(freqs):
        k = int(RATE * gap * i)
        tt = t[: n - k]
        tone = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt)
        out[k:] += tone * np.exp(-tt / decay) * np.minimum(1, tt / 0.004)
    return gain * out / len(freqs) ** 0.5


rng = np.random.default_rng(7)
SOUNDS = {
    'click': lambda: click(rng),
    'key': lambda: key(rng),
    'success': lambda: bell([659.25, 987.77, 1318.5]),
    'pop': lambda: bell([783.99, 1174.66], gap=0.09, decay=0.35, gain=0.18),
}
track = np.zeros(int(RATE * (duration + 2)))
for e in events:
    if e['type'] not in SOUNDS:
        continue
    sound = SOUNDS[e['type']]()
    k = int(RATE * e['t'])
    track[k:k + len(sound)] += sound[: len(track) - k]
track = np.clip(track[: int(RATE * duration)], -1, 1)
with wave.open(str(OUT / 'sound.wav'), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(RATE)
    w.writeframes((track * 32767).astype('<i2').tobytes())


# Camera regions, in source pixels and seconds. Clicks on the same screen (a
# scroll or a pause ends it) are split into shots: a shot takes the next element
# while the camera can still frame all of its elements at MIN_ZOOM or closer.
# Then the confirmation card and the new appointment on the dashboard.
scale = timeline['scale']
seg_end = lambda t: segments[segment_of(t)]['start'] + segments[segment_of(t)]['duration']
groups, current = [], []
for e in events:
    if e['type'] == 'scroll' or (current and (e['t'] - current[-1]['t'] > GAP or segment_of(e['t']) != segment_of(current[-1]['t']))):
        if current:
            groups.append(current)
        current = []
    if e['type'] in ('click', 'key'):
        if e['type'] == 'key' and current:
            e = {**e, 'x': current[-1]['x'], 'y': current[-1]['y'], 'box': current[-1].get('box')}
        if e.get('box'):
            current.append(e)
if current:
    groups.append(current)


def framing(shot):
    """Zoom and center that show every element of the shot with room around them."""
    x0 = min(e['box']['x'] for e in shot) * scale
    x1 = max(e['box']['x'] + e['box']['width'] for e in shot) * scale
    y0 = min(e['box']['y'] for e in shot) * scale
    y1 = max(e['box']['y'] + e['box']['height'] for e in shot) * scale
    z = min(ZOOM, W / (x1 - x0 + MARGIN_X), H / (y1 - y0 + MARGIN_Y))
    return z, (x0 + x1) / 2, (y0 + y1) / 2


scroll_times = [e['t'] for e in events if e['type'] == 'scroll']
regions = []
for g in groups:
    shots = [[g[0]]]
    for e in g[1:]:
        if framing(shots[-1] + [e])[0] >= MIN_ZOOM:
            shots[-1].append(e)
        else:
            shots.append([e])
    limit = min(seg_end(g[0]['t']), *[t for t in scroll_times if t > g[-1]['t']] or [duration])
    for i, shot in enumerate(shots):
        z, cx, cy = framing(shot)
        # Shots of one group follow each other: the camera glides between them.
        t0 = regions[-1]['t1'] if i else max(segments[segment_of(shot[0]['t'])]['start'], shot[0]['t'] - LEAD)
        t1 = shots[i + 1][0]['t'] - LEAD / 2 if i + 1 < len(shots) else min(limit, shot[-1]['t'] + TAIL)
        regions.append({'t0': t0, 't1': max(t1, t0 + 0.3), 'z': z, 'cx': cx, 'cy': cy})
for kind, z, start, length in (('success', 1.35, 0.3, 2.2), ('pop', 1.6, 0.25, 9)):
    e = next(e for e in events if e['type'] == kind)
    regions.append({'t0': e['t'] + start, 't1': min(seg_end(e['t']) - 0.05, e['t'] + start + length),
                    'z': z, 'cx': e['x'] * scale, 'cy': e['y'] * scale})
regions.sort(key=lambda r: r['t0'])
for r, nxt in zip(regions, regions[1:]):
    r['t1'] = min(r['t1'], nxt['t0'])


# render.py eases every region in from the wide shot and back out; shots that
# follow each other (no gap) instead glide straight from one to the next.
def follow_traj(R, key, rest, fps, dur, ramp=0.5, curve='smooth'):
    R = sorted(R, key=lambda r: r['o0'])
    keys = [(0.0, rest)]
    for i, r in enumerate(R):
        v, rmp = r[key], min(ramp, (r['o1'] - r['o0']) / 2)
        chained_in = i > 0 and r['o0'] - R[i - 1]['o1'] < 0.05
        chained_out = i + 1 < len(R) and R[i + 1]['o0'] - r['o1'] < 0.05
        if not chained_in:
            keys.append((r['o0'], rest))
        keys.append((r['o0'] + rmp, v))
        keys.append((r['o1'] - (0 if chained_out else rmp), v))
        if not chained_out:
            keys.append((r['o1'], rest))
    keys.append((dur + 1, rest))
    out, k = [], 0
    for i in range(int(round(dur * fps)) + 1):
        t = i / fps
        while k + 1 < len(keys) and keys[k + 1][0] <= t:
            k += 1
        (ta, va), (tb, vb) = keys[k], keys[min(k + 1, len(keys) - 1)]
        a = (t - ta) / (tb - ta) if tb > ta else 1.0
        out.append(va + (vb - va) * camera.ease_curve(a, curve))
    return out


camera.ease_traj = follow_traj
(OUT / 'regions.json').write_text(json.dumps(regions, indent=1))

# Full-resolution master at a constant frame rate, then the camera pass over it.
subprocess.run([
    'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(OUT / 'frames.txt'),
    '-vf', f'fps={FPS},format=yuv420p', '-c:v', 'libx264', '-preset', 'fast', '-crf', '12',
    '-t', f'{duration:.2f}', str(OUT / 'master.mp4'),
], check=True)
camera.render(str(OUT / 'master.mp4'), regions, str(OUT / 'camera.mp4'), fps=FPS, ramp=0.6, metadata=False)

DEST.mkdir(parents=True, exist_ok=True)
fade = f"fade=t=in:st=0:d=0.4:color=0xFBF7EF,fade=t=out:st={duration - 0.5:.2f}:d=0.5:color=0xFBF7EF"
subprocess.run([
    'ffmpeg', '-y', '-loglevel', 'error',
    '-i', str(OUT / 'camera.mp4'), '-i', str(OUT / 'sound.wav'),
    '-vf', f'{fade},format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '25',
    '-c:a', 'aac', '-b:a', '64k',
    '-movflags', '+faststart', '-t', f'{duration:.2f}',
    str(DEST / f'reserveease-demo-{LANG}.mp4'),
], check=True)

# Poster: the confirmation page, a second after the booking goes through.
success = next(e['t'] for e in events if e['type'] == 'success')
subprocess.run([
    'ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{success + 2.4:.2f}', '-i', str(DEST / f'reserveease-demo-{LANG}.mp4'),
    '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', str(DEST / f'reserveease-demo-{LANG}-poster.webp'),
], check=True)

# Where each of the five steps starts, for the chapter list next to the player
# (demo.steps in saas-booking-landing/src/i18n/en.js and es.js).
clicks = [e['t'] for e in events if e['type'] == 'click']
client_start = segments[1]['start']
chapters = [
    0,
    client_start,
    next(t for t in clicks if t > client_start) - 0.3,
    max(t for t in clicks if t < success) - 0.3,
    segments[2]['start'],
]
print(json.dumps({'duration': round(duration, 1), 'chapters': [round(c, 1) for c in chapters]}))
for f in sorted(DEST.iterdir()):
    print(f.name, f.stat().st_size // 1024, 'KB')
