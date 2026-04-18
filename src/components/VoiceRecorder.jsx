import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Check, X } from 'lucide-react';
import { PALETTE } from '@/lib/constants';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function VoiceRecorder({ show, note, color, onSave, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | recording | preview
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(note?.audio_data || null);
  const [bars, setBars] = useState(Array(24).fill(4));

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const pal = PALETTE.find(p => p.bg === color) || PALETTE[8];

  useEffect(() => {
    if (show && note?.audio_data) {
      setAudioUrl(note.audio_data);
      setPhase('preview');
    } else if (show) {
      setPhase('idle');
      setAudioUrl(null);
      setElapsed(0);
    }
  }, [show]);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      /* Visualiser */
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      analyserRef.current = analyser;

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

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = await blobToBase64(blob);
        setAudioUrl(url);
        setPhase('preview');
      };

      recorder.start(100);
      setPhase('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch {
      alert("Microphone inaccessible. Vérifie les permissions.");
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
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center"
          style={{ background: pal.bg }}
        >
          <p className="font-bold text-base mb-4" style={{ color: pal.fg, fontFamily: '"Cherry Bomb One", cursive' }}>
            {phase === 'recording' ? 'Enregistrement…' : phase === 'preview' ? 'Écouter' : 'Note vocale'}
          </p>

          {/* Waveform visualizer */}
          <div className="flex items-center justify-center gap-0.5 h-12 mb-4">
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
          <p className="text-2xl font-bold mb-6" style={{ color: pal.fg, fontFamily: 'Quicksand, sans-serif' }}>
            {fmt(elapsed)}
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={onClose} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.12)' }}>
              <X size={18} style={{ color: pal.fg }} />
            </button>

            {phase === 'idle' && (
              <button onClick={startRecording} className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg" style={{ background: pal.fg }}>
                <Mic size={24} style={{ color: pal.bg }} />
              </button>
            )}
            {phase === 'recording' && (
              <motion.button
                onClick={stopRecording}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                style={{ background: '#dc2626' }}
              >
                <Square size={22} fill="white" style={{ color: 'white' }} />
              </motion.button>
            )}
            {phase === 'preview' && (
              <button onClick={togglePlay} className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg" style={{ background: pal.fg }}>
                {playing
                  ? <Pause size={22} style={{ color: pal.bg }} />
                  : <Play size={22} fill={pal.bg} style={{ color: pal.bg }} />
                }
              </button>
            )}

            {phase === 'preview' && audioUrl && (
              <button onClick={() => { onSave(audioUrl); onClose(); }} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.12)' }}>
                <Check size={18} style={{ color: pal.fg }} />
              </button>
            )}
          </div>

          {phase === 'preview' && (
            <button
              onClick={() => { setPhase('idle'); setAudioUrl(null); setElapsed(0); }}
              className="mt-4 text-xs font-semibold"
              style={{ color: `${pal.fg}80`, fontFamily: 'Quicksand, sans-serif' }}
            >
              Ré-enregistrer
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
