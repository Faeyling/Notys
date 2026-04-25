import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Star, Search, HardDrive, Plus, SlidersHorizontal, Palette, Save } from 'lucide-react';

const SECTIONS = [
  {
    icon: Home, color: '#FFC7EE', fg: '#831843',
    title: 'Accueil',
    desc: 'Notes et dossiers en grille colorée. Appuie sur une carte pour l\'ouvrir. Glisse une note sur un dossier pour la déplacer dedans. Glisse entre les cartes pour les réordonner.',
  },
  {
    icon: Palette, color: '#dcc6f1', fg: '#3b0764',
    title: 'Actions sur les cartes',
    desc: 'Chaque carte affiche deux icônes : 🎨 pour changer la couleur, 🗑 pour supprimer (une confirmation est demandée). Dans une note ouverte, tu as aussi ⭐ pour les favoris, ✏️ pour éditer et ➡️ pour déplacer.',
  },
  {
    icon: Star, color: '#FFE0A0', fg: '#713f12',
    title: 'Favoris',
    desc: 'Retrouve ici toutes les notes marquées d\'une ⭐. Ouvre une note et appuie sur l\'étoile pour l\'ajouter ou la retirer des favoris.',
  },
  {
    icon: Search, color: '#b4daf3', fg: '#1e3a5f',
    title: 'Recherche',
    desc: 'Cherche en temps réel dans les titres et contenus des notes, ainsi que dans les noms des dossiers.',
  },
  {
    icon: SlidersHorizontal, color: '#c8e7e1', fg: '#134e4a',
    title: 'Tri & ordre',
    desc: 'Le bouton ⊟ dans l\'en-tête ouvre les options de tri : date, nom, couleur, ouverture récente… Après un glisser-déposer, l\'ordre "Manuel" s\'active automatiquement et est mémorisé.',
  },
  {
    icon: Plus, color: '#c9e7c3', fg: '#166534',
    title: 'Créer',
    desc: 'Le bouton + propose trois options : Note texte, Dossier et Note vocale. Si tu es dans un dossier, la création s\'y fait directement et la couleur du dossier est héritée.',
  },
  {
    icon: HardDrive, color: '#ffadad', fg: '#7f1d1d',
    title: 'Sauvegarde',
    desc: 'Exporte toutes tes notes et dossiers en fichier JSON. Importe-le sur un autre appareil pour tout retrouver à l\'identique. Pense à exporter régulièrement !',
  },
  {
    icon: Save, color: '#ffe0a0', fg: '#713f12',
    title: 'Sauvegarde automatique',
    desc: 'Chaque modification est enregistrée automatiquement dans le stockage local de l\'appareil (IndexedDB). Tes données ne quittent jamais ton téléphone.',
  },
];

export default function HelpModal({ show, onClose, dark = false }) {
  const modalRef     = useRef(null);
  const closeRef     = useRef(null);
  const prevFocusRef = useRef(null);

  useEffect(() => {
    if (show) {
      prevFocusRef.current = document.activeElement;
      setTimeout(() => closeRef.current?.focus(), 50);
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus?.();
      prevFocusRef.current = null;
    }
  }, [show]);

  const trapFocus = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const focusable = Array.from(
      modalRef.current?.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])') || []
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

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
          role="dialog"
          aria-modal="true"
          aria-label="Aide de Noty's"
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
            onKeyDown={trapFocus}
            className="w-full max-w-lg rounded-t-3xl shadow-2xl overflow-hidden outline-none"
            style={{ background: dark ? '#2d2d4a' : 'white', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="flex items-center justify-between p-6 pb-4 shrink-0">
              <div>
                <h2 className="font-bold text-lg" style={{ fontFamily: '"Cherry Bomb One", cursive', color: dark ? '#f0f0f0' : '#111827' }}>
                  Noty's — Aide
                </h2>
                <p className="text-xs" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>
                  Tout ce que tu dois savoir 🐾
                </p>
              </div>
              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
                style={{ background: dark ? '#374151' : '#F5F5F5' }}
              >
                <X size={17} style={{ color: dark ? '#9CA3AF' : '#6B7280' }} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 pb-10 flex flex-col gap-4">
              {SECTIONS.map(({ icon: Icon, color, fg, title, desc }) => (
                <div key={title} role="region" aria-label={title} className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: dark ? `${color}22` : `${color}33` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: dark ? `${color}55` : color }}>
                    <Icon size={17} style={{ color: dark ? color : fg }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-bold text-sm mb-0.5" style={{ fontFamily: 'Quicksand, sans-serif', color: dark ? color : fg }}>{title}</p>
                    <p className="text-xs leading-relaxed" style={{ fontFamily: 'Quicksand, sans-serif', color: dark ? '#d1d5db' : '#4B5563' }}>{desc}</p>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl p-4 text-center" style={{ background: dark ? 'rgba(255,243,162,0.12)' : '#FFF3A2', border: '1.5px dashed #713f12' }}>
                <p className="text-xs font-semibold" style={{ color: dark ? '#ffe0a0' : '#713f12', fontFamily: 'Quicksand, sans-serif' }}>
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
