"""Turns a recording made by record.mjs into the landing's demo video, its sound and its poster.

Usage: python3 demo-video/build.py [OUT_DIR] [DEST_DIR]
Needs ffmpeg (with libx264) and numpy.
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'demo-video/out')
DEST = Path(sys.argv[2] if len(sys.argv) > 2 else 'saas-booking-landing/public/demo')
RATE = 48000
SIZE = '1280:720'

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
    sound = SOUNDS[e['type']]()
    k = int(RATE * e['t'])
    track[k:k + len(sound)] += sound[: len(track) - k]
track = np.clip(track[: int(RATE * duration)], -1, 1)
with wave.open(str(OUT / 'sound.wav'), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(RATE)
    w.writeframes((track * 32767).astype('<i2').tobytes())

DEST.mkdir(parents=True, exist_ok=True)
fade = f"fade=t=in:st=0:d=0.4:color=0xFBF7EF,fade=t=out:st={duration - 0.5:.2f}:d=0.5:color=0xFBF7EF"
subprocess.run([
    'ffmpeg', '-y', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', str(OUT / 'frames.txt'),
    '-i', str(OUT / 'sound.wav'),
    '-vf', f'fps=30,scale={SIZE}:flags=lanczos,{fade},format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-tune', 'stillimage',
    '-c:a', 'aac', '-b:a', '64k',
    '-movflags', '+faststart', '-t', f'{duration:.2f}',
    str(DEST / 'reserveease-demo.mp4'),
], check=True)

# Poster: the confirmation page, a second after the booking goes through.
success = next(e['t'] for e in events if e['type'] == 'success')
subprocess.run([
    'ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{success + 2.4:.2f}', '-i', str(DEST / 'reserveease-demo.mp4'),
    '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', str(DEST / 'reserveease-demo-poster.webp'),
], check=True)

# Where each of the five steps starts, for the chapter list next to the player
# (CHAPTERS in saas-booking-landing/src/components/notebook/Demo.jsx).
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
