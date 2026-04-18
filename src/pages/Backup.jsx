import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Download, Upload, AlertTriangle, CheckCircle, Trash2, Shield } from 'lucide-react';
import { NoteDB, FolderDB, db } from '@/lib/db';
import TripleWave from '@/components/TripleWave';
import Mascot from '@/components/Mascot';
import DotGrid from '@/components/DotGrid';

const WAVE = '#ffadad';
const FG   = '#7f1d1d';

export default function Backup({ onBack, dark }) {
  const [status, setStatus]               = useState(null);
  const [message, setMessage]             = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  /* ── Dark-mode-aware colour helpers ── */
  const pageBg   = dark ? '#1a1a2e' : '#FFFBFE';
  const textBase = dark ? '#f0f0f0' : '#111827';

  const handleExport = async () => {
    setStatus('loading');
    const [notes, folders] = await Promise.all([NoteDB.list(), FolderDB.list()]);
    const data = { version: 2, app: "Noty's", exported_at: new Date().toISOString(), notes, folders };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `notys-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus('success');
    setMessage(`Noty a bien enregistré ton export ! (${notes.length} notes, ${folders.length} dossiers)`);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('loading');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.notes) throw new Error('Format invalide');
      await db.notes.clear();
      await db.folders.clear();
      for (const f of (data.folders || [])) { const { id, ...rest } = f; await db.folders.add(rest); }
      for (const n of (data.notes   || [])) { const { id, ...rest } = n; await db.notes.add(rest);   }
      setStatus('success');
      setMessage(`${data.notes.length} notes et ${data.folders?.length ?? 0} dossiers importés avec succès !`);
    } catch {
      setStatus('error');
      setMessage('Fichier invalide ou corrompu.');
    }
    e.target.value = '';
  };

  const handleClear = async () => {
    await db.notes.clear();
    await db.folders.clear();
    setShowClearConfirm(false);
    setStatus('success');
    setMessage('Toutes les données ont été effacées.');
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: pageBg, fontFamily: 'Quicksand, sans-serif', maxWidth: 480, margin: '0 auto' }}
    >
      <DotGrid dark={dark} />

      {/* Wave header */}
      <div className="relative shrink-0 z-10" style={{ background: WAVE, minHeight: 110 }}>
        <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-8 relative z-10">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-90 shrink-0"
            style={{ background: 'rgba(0,0,0,0.12)' }}
          >
            <ChevronLeft size={18} style={{ color: FG }} />
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: '"Cherry Bomb One", cursive', color: FG }}>
            Sauvegarde
          </h1>
        </div>
        <TripleWave color={dark ? '#1a1a2e' : '#FFFBFE'} />
      </div>

      <div className="relative z-10 flex-1 px-4 py-5 flex flex-col gap-4" style={{ paddingBottom: 40 }}>

        {/* Mascot */}
        <div className="flex justify-center mb-2">
          <Mascot variant="backpack" size={100} />
        </div>

        {/* Export */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-3xl p-5 shadow-md"
          style={{ background: '#b4daf3' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(30,58,95,0.12)' }}>
              <Download size={18} style={{ color: '#1e3a5f' }} />
            </div>
            <div>
              <p className="font-bold text-sm"   style={{ color: '#1e3a5f' }}>Exporter mes données</p>
              <p className="text-xs opacity-70"  style={{ color: '#1e3a5f' }}>Fichier JSON à conserver en lieu sûr</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleExport}
            disabled={status === 'loading'}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: '#1e3a5f', color: 'white' }}
          >
            <span style={{ fontSize: 18 }}>💾</span> Exporter
          </motion.button>
        </motion.div>

        {/* Import — text colours adjusted for dark mode */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-3xl p-5 shadow-md"
          style={{ background: '#c9e7c3' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(22,101,52,0.12)' }}>
              <Upload size={18} style={{ color: '#166534' }} />
            </div>
            <div>
              {/* Always dark green — card has its own green bg so contrast is fine */}
              <p className="font-bold text-sm" style={{ color: '#166534' }}>Importer des données</p>
              <p className="text-xs opacity-80" style={{ color: '#166534' }}>Depuis un fichier exporté précédemment</p>
            </div>
          </div>
          <label className="block w-full cursor-pointer">
            <motion.span
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="block w-full py-3 rounded-2xl font-bold text-sm text-center"
              style={{ background: '#166534', color: 'white' }}
            >
              ⬆️ Importer un fichier
            </motion.span>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
        </motion.div>

        {/* Warning — fully readable in both light and dark */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-3xl p-4 flex gap-3"
          style={{
            background: dark ? 'rgba(255,224,160,0.12)' : 'rgba(255,243,162,0.35)',
            border: `1.5px solid ${dark ? '#ffe0a0' : '#c97b1a'}`,
          }}
        >
          <AlertTriangle size={16} style={{ color: dark ? '#ffe0a0' : '#713f12', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs leading-relaxed" style={{ color: dark ? '#ffe0a0' : '#713f12' }}>
            L'import <strong>remplace intégralement</strong> tes données existantes.
            Pense à exporter d'abord si tu veux conserver tes notes actuelles.
          </p>
        </motion.div>

        {/* RGPD — fully readable in both light and dark */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-3xl p-4 flex gap-3"
          style={{
            border: dark ? '1.5px dashed #ffadad' : '1.5px dashed #f0baaf',
            background: dark ? 'rgba(255,173,173,0.10)' : 'rgba(240,186,175,0.18)',
          }}
        >
          <Shield size={16} style={{ color: dark ? '#ffadad' : FG, flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: dark ? '#ffadad' : FG }}>
              Confidentialité &amp; données
            </p>
            <p className="text-xs leading-relaxed" style={{ color: dark ? '#ffadad' : FG, opacity: 0.9 }}>
              Tes notes sont stockées <strong>uniquement sur cet appareil</strong>, de manière locale et
              sécurisée. Aucune donnée n'est envoyée vers un serveur. Code en accès libre.{' '}
              <span style={{ opacity: 0.65 }}>— Fäeyling</span>
            </p>
          </div>
        </motion.div>

        {/* Danger zone */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-3xl p-5"
          style={{
            background: dark ? 'rgba(255,173,173,0.08)' : 'rgba(255,173,173,0.20)',
            border: '2px solid #ffadad',
            backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(255,173,173,0.10) 8px, rgba(255,173,173,0.10) 16px)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} style={{ color: dark ? '#ffadad' : FG }} />
            <p className="font-bold text-sm" style={{ color: dark ? '#ffadad' : FG }}>Zone danger</p>
          </div>
          <p className="text-xs leading-relaxed mb-4" style={{ color: dark ? '#ffadad' : FG, opacity: 0.9 }}>
            Je garde tes notes précieusement, mais si tu supprimes l'app sans export, elles s'envoleront
            pour toujours. Sois prudent ! 🐾
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowClearConfirm(true)}
            className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
            style={{ background: '#7f1d1d', color: 'white' }}
          >
            <Trash2 size={15} /> Effacer toutes les données
          </motion.button>
        </motion.div>

        {/* Status feedback */}
        <AnimatePresence>
          {status && status !== 'loading' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: status === 'success' ? (dark ? 'rgba(201,231,195,0.15)' : '#c9e7c333') : (dark ? 'rgba(255,173,173,0.15)' : '#ffadad33'),
                border: `1.5px solid ${status === 'success' ? '#c9e7c3' : '#ffadad'}`,
              }}
            >
              {status === 'success'
                ? <CheckCircle size={16} style={{ color: dark ? '#c9e7c3' : '#166534', flexShrink: 0 }} />
                : <AlertTriangle size={16} style={{ color: dark ? '#ffadad' : FG, flexShrink: 0 }} />}
              <p className="text-xs font-semibold" style={{ color: status === 'success' ? (dark ? '#c9e7c3' : '#166534') : (dark ? '#ffadad' : FG) }}>
                {message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clear confirmation — dark-mode aware */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ scale: 0.88 }} animate={{ scale: 1 }}
              className="rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center"
              style={{ background: dark ? '#2d2d4a' : 'white' }}
            >
              <p className="font-bold text-base mb-1" style={{ fontFamily: 'Quicksand, sans-serif', color: textBase }}>
                Tout effacer ?
              </p>
              <p className="text-sm mb-5" style={{ color: dark ? '#9CA3AF' : '#6B7280' }}>
                Cette action est irréversible. Toutes tes notes et dossiers seront supprimés.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 rounded-2xl font-semibold text-sm"
                  style={{ background: dark ? '#374151' : '#F3F4F6', color: textBase }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleClear}
                  className="flex-1 py-2.5 rounded-2xl font-bold text-sm"
                  style={{ background: '#7f1d1d', color: 'white' }}
                >
                  Effacer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
