import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Check, X, AlertTriangle } from 'lucide-react';
import { PALETTE } from '@/lib/constants';

const MAX_DURATION_S = 300;   // 5 minutes
const MAX_BASE64_MB  = 10;    // 10 MB max for stored audio

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function VoiceRecorder({ show, note, color, onSave, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | recording | converting | preview
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(note?.audio_data || null);
  const [bars, setBars] = useState(Array(24).fill(4));
  const [error, setError] = useState(null);

  const recorderRef   = useRef(null);
  const chunksRef     = useRef([]);
  const timerRef      = useRef(null);
  const audioRef      = useRef(null);
  const analyserRef   = useRef(null);
  const srcRef        = useRef(null);   // Web Audio MediaStreamSourceNode
  const animFrameRef  = useRef(null);
  const audioCtxRef   = useRef(null);
  const streamRef     = useRef(null);   // keeps track of the mic stream for cleanup
  const modalRef      = useRef(null);
  const prevFocusRef  = useRef(null);

  const pal = PALETTE.find(p => p.bg === color) || PALETTE[8];

  useEffect(() => {
    if (show && note?.audio_data) {
      setAudioUrl(note.audio_data);
      setPhase('preview');
    } else if (show) {
      setPhase('idle');
      setAudioUrl(null);
      setElapsed(0);
      setError(null);
    }
  }, [show, note?.audio_data]);

  /* Focus trap + focus restoration */
  useEffect(() => {
    if (show) {
      prevFocusRef.current = document.activeElement;
      setTimeout(() => modalRef.current?.focus(), 50);
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus?.();
      prevFocusRef.current = null;
    }
  }, [show]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      audioRef.current?.pause();
      /* Stop any active recording so the mic indicator turns off immediately */
      if (recorderRef.current?.state !== 'inactive') {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      try { analyserRef.current?.disconnect(); } catch { /* already closed */ }
      analyserRef.current = null;
      try { srcRef.current?.disconnect(); } catch { /* already closed */ }
      srcRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    /* Release any stream left open from a previous aborted recording before
       acquiring a new one — prevents a dangling mic indicator on the OS. */
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    let stream;
    try {
      /* getUserMedia can hang indefinitely on Android if the user ignores the
         permission prompt. Race it against a 12-second timeout so the modal
         never stays stuck — the timeout rejects with a custom name we detect.
         timeoutId is cleared immediately after the race so the timer never
         fires as a dangling side-effect when getUserMedia wins. */
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const err = new Error('Timeout');
          err.name = 'TimeoutError';
          reject(err);
        }, 12_000);
      });
      try {
        stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({ audio: true }),
          timeoutPromise,
        ]);
      } finally {
        clearTimeout(timeoutId);
      }
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      /* Visualiser — gracefully skipped if AudioContext is unavailable (sandboxed contexts) */
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        analyserRef.current = analyser;
        srcRef.current = src;

        const drawBars = () => {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const newBars = Array.from({ length: 24 }, (_, i) => {
            const v = data[Math.floor(i * data.length / 24)] || 0;
            return Math.max(4, Math.floor(v / 8));
          });
          setBars(newBars);
          animFrameRef.current = requestAnimationFrame(drawBars);
        };
        drawBars();
      } catch {
        /* AudioContext unavailable — recording still works, bars stay flat */
      }

      let accumulatedBytes = 0;
      recorder.ondataavailable = e => {
        if (e.data.size <= 0) return;
        accumulatedBytes += e.data.size;
        /* base64 inflates by ~4/3 — stop early if raw bytes already exceed the limit */
        if (accumulatedBytes > MAX_BASE64_MB * 1_048_576 * 0.75) {
          clearInterval(timerRef.current);
          recorderRef.current?.stop();
        } else {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        /* Disconnect graph nodes before closing context — disconnecting after
           close() throws InvalidStateError on some browsers. */
        try { analyserRef.current?.disconnect(); } catch { /* already closed */ }
        analyserRef.current = null;
        try { srcRef.current?.disconnect(); } catch { /* already closed */ }
        srcRef.current = null;
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
        /* Show converting indicator while FileReader encodes the blob */
        setPhase('converting');
        setBars(Array(24).fill(4));
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = []; /* free binary chunks — base64 URL is the durable copy */
        const url = await blobToBase64(blob);
        /* Size guard: base64 is ~4/3 of binary size */
        const sizeMB = url.length * 0.75 / 1_048_576;
        if (sizeMB > MAX_BASE64_MB) {
          setError(`Enregistrement trop volumineux (${sizeMB.toFixed(1)} Mo). Maximum : ${MAX_BASE64_MB} Mo.`);
          setPhase('idle');
          return;
        }
        setAudioUrl(url);
        setPhase('preview');
      };

      recorder.start(100);
      setPhase('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= MAX_DURATION_S) {
            /* Auto-stop at limit */
            clearInterval(timerRef.current);
            recorderRef.current?.stop();
          }
          return e + 1;
        });
      }, 1000);
    } catch (err) {
      /* If the stream was acquired before the failure, stop its tracks immediately
         so the OS mic indicator disappears — the next startRecording call also
         does this, but we want the mic off right now, not on the next attempt. */
      stream?.getTracks().forEach(t => t.stop());
      if (streamRef.current === stream) streamRef.current = null;
      if (err?.name === 'TimeoutError') {
        setError("Délai dépassé — accepte l'accès au microphone dans la popup du navigateur et réessaie.");
      } else if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError("Permission micro refusée. Appuie sur l'icône 🔒 dans la barre d'adresse → Autorisations → Microphone → Autoriser, puis recharge la page.");
      } else if (err?.name === 'NotFoundError') {
        setError("Aucun microphone détecté. Branche un micro ou vérifie que ton appareil en possède un.");
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setError("Le micro est utilisé par une autre application. Ferme-la et réessaie.");
      } else if (err?.name === 'OverconstrainedError') {
        setError("Paramètres audio non supportés par cet appareil.");
      } else if (err?.name === 'AbortError') {
        setError("Accès au micro interrompu. Réessaie.");
      } else {
        setError(`Microphone inaccessible${err?.name ? ` (${err.name})` : ''}. Ferme les autres apps et réessaie.`);
      }
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    recorderRef.current?.stop();
  };

  const togglePlay = () => {
    if (!audioUrl) return;
    if (!audioRef.current) audioRef.current = new Audio(audioUrl);
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
      audioRef.current.onended = () => setPlaying(false);
    }
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const trapFocus = (e) => {
    if (e.key !== 'Tab') return;
    const focusable = modalRef.current?.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-6"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Enregistrement vocal"
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          onClick={e => e.stopPropagation()}
          onKeyDown={trapFocus}
          className="w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center outline-none"
          style={{ background: pal.bg }}
        >
          <p className="font-bold text-base mb-4" style={{ color: pal.fg, fontFamily: '"Cherry Bomb One", cursive' }}>
            {phase === 'recording'  ? 'Enregistrement…' :
             phase === 'converting' ? 'Traitement…' :
             phase === 'preview'    ? 'Écouter' : 'Note vocale'}
          </p>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 mb-4 rounded-2xl px-3 py-2 text-left" style={{ background: 'rgba(0,0,0,0.15)' }}>
              <AlertTriangle size={14} style={{ color: pal.fg, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <p className="text-xs font-semibold leading-snug" style={{ color: pal.fg, fontFamily: 'Quicksand, sans-serif' }}>{error}</p>
            </div>
          )}

          {/* Waveform visualizer */}
          <div className="flex items-center justify-center gap-0.5 h-12 mb-4" aria-hidden="true">
            {bars.map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: phase === 'recording' ? h : 4 }}
                transition={{ duration: 0.08 }}
                className="w-1.5 rounded-full"
                style={{ background: `${pal.fg}90`, minHeight: 4 }}
              />
            ))}
          </div>

          {/* Timer */}
          <p
            className="text-2xl font-bold mb-6"
            style={{ color: pal.fg, fontFamily: 'Quicksand, sans-serif' }}
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Durée : ${fmt(elapsed)}`}
          >
            {fmt(elapsed)}
            {phase === 'recording' && (
              <span className="text-xs ml-2 opacity-60" style={{ fontFamily: 'Quicksand, sans-serif' }}>
                / {fmt(MAX_DURATION_S)}
              </span>
            )}
          </p>

          {/* Converting spinner */}
          {phase === 'converting' && (
            <div className="flex flex-col items-center gap-2 mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 rounded-full border-4"
                style={{ borderColor: `${pal.fg}30`, borderTopColor: pal.fg }}
              />
              <p className="text-xs font-semibold" style={{ color: pal.fg, fontFamily: 'Quicksand, sans-serif', opacity: 0.7 }}>
                Préparation de l'audio…
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onClose}
              disabled={phase === 'converting'}
              aria-label="Fermer l'enregistreur"
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.12)', opacity: phase === 'converting' ? 0.4 : 1 }}
            >
              <X size={18} style={{ color: pal.fg }} />
            </button>

            {phase === 'idle' && (
              <button
                onClick={startRecording}
                aria-label="Démarrer l'enregistrement"
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: pal.fg }}
              >
                <Mic size={24} style={{ color: pal.bg }} />
              </button>
            )}
            {phase === 'recording' && (
              <motion.button
                onClick={stopRecording}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                aria-label="Arrêter l'enregistrement"
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: '#dc2626' }}
              >
                <Square size={22} fill="white" style={{ color: 'white' }} />
              </motion.button>
            )}
            {phase === 'preview' && (
              <button
                onClick={togglePlay}
                aria-label={playing ? 'Mettre en pause' : 'Écouter l\'enregistrement'}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: pal.fg }}
              >
                {playing
                  ? <Pause size={22} style={{ color: pal.bg }} />
                  : <Play size={22} fill={pal.bg} style={{ color: pal.bg }} />
                }
              </button>
            )}

            {phase === 'preview' && audioUrl && (
              <button
                onClick={() => { onSave(audioUrl); onClose(); }}
                aria-label="Sauvegarder l'enregistrement"
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,0,0,0.12)' }}
              >
                <Check size={18} style={{ color: pal.fg }} />
              </button>
            )}
          </div>

          {phase === 'preview' && (
            <button
              onClick={() => {
              /* Pause any current playback before resetting */
              if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
              setPlaying(false);
              setPhase('idle'); setAudioUrl(null); setElapsed(0); setError(null);
            }}
              className="mt-4 px-5 py-2 rounded-2xl text-xs font-bold transition-all hover:opacity-80 active:scale-95"
              style={{
                color: pal.bg,
                background: `${pal.fg}25`,
                fontFamily: 'Quicksand, sans-serif',
              }}
            >
              🔄 Ré-enregistrer
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
