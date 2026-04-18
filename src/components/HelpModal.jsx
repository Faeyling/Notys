import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Star, Search, HardDrive, Plus, Folder, FileText, Mic, Save } from 'lucide-react';

const SECTIONS = [
  {
    icon: Home, color: '#FFC7EE', fg: '#831843',
    title: 'Accueil',
    desc: 'Toutes tes notes et dossiers s\'affichent ici en grille colorée. Appuie longuement sur une carte pour accéder rapidement aux options.',
  },
  {
    icon: Star, color: '#FFE0A0', fg: '#713f12',
    title: 'Favoris',
    desc: 'Retrouve ici toutes les notes marquées d\'une ⭐. Appuie sur l\'étoile d\'une note pour l\'ajouter ou la retirer.',
  },
  {
    icon: Search, color: '#b4daf3', fg: '#1e3a5f',
    title: 'Recherche',
    desc: 'Cherche dans tous les titres et contenus de tes notes en temps réel.',
  },
  {
    icon: HardDrive, color: '#ffadad', fg: '#7f1d1d',
    title: 'Sauvegarde',
    desc: 'Exporte toutes tes données en JSON et importe-les sur un autre appareil. Pense à sauvegarder régulièrement !',
  },
  {
    icon: Plus, color: '#c9e7c3', fg: '#166534',
    title: 'Le bouton +',
    desc: 'Crée une note, un dossier ou une note vocale. Les notes héritent automatiquement de la couleur du dossier parent.',
  },
  {
    icon: Save, color: '#dcc6f1', fg: '#3b0764',
    title: 'Sauvegarde automatique',
    desc: 'Toutes tes modifications sont sauvegardées automatiquement en temps réel dans le stockage local de ton appareil. Tes données ne quittent jamais ton téléphone.',
  },
];

export default function HelpModal({ show, onClose }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ background: 'white', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <div>
                <h2 className="font-bold text-lg" style={{ fontFamily: '"Cherry Bomb One", cursive', color: '#111827' }}>
                  Noty's — Aide
                </h2>
                <p className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>
                  Tout ce que tu dois savoir 🐾
                </p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#F5F5F5' }}>
                <X size={17} style={{ color: '#6B7280' }} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-10 flex flex-col gap-4">
              {SECTIONS.map(({ icon: Icon, color, fg, title, desc }) => (
                <div key={title} className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: `${color}33` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color }}>
                    <Icon size={17} style={{ color: fg }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-0.5" style={{ fontFamily: 'Quicksand, sans-serif', color: fg }}>{title}</p>
                    <p className="text-xs leading-relaxed" style={{ fontFamily: 'Quicksand, sans-serif', color: '#4B5563' }}>{desc}</p>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl p-4 text-center" style={{ background: '#FFF3A2', border: '1.5px dashed #713f12' }}>
                <p className="text-xs font-semibold" style={{ color: '#713f12', fontFamily: 'Quicksand, sans-serif' }}>
                  ⚠️ Tes notes sont stockées <strong>uniquement sur cet appareil</strong>.<br/>
                  Pense à exporter régulièrement !
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
