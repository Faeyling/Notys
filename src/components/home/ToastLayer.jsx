import { motion, AnimatePresence } from 'framer-motion';

const toastBase = {
  className: 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl shadow-lg pointer-events-none',
  style: {
    backdropFilter: 'blur(8px)',
    color: 'white',
    fontFamily: 'Quicksand, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    maxWidth: 'calc(100vw - 32px)',
    textAlign: 'center',
  },
};

const anim = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 } };

export default function ToastLayer({
  dragError, renameError, deleteToast, quotaError,
  dragStatus, tab, notes, folders, loading,
  dark,
}) {
  return (
    <>
      {/* Screen-reader announcement when the active tab changes */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {tab === 'home' ? 'Accueil' : tab === 'fav' ? 'Favoris' : tab === 'search' ? 'Recherche' : 'Sauvegarde'}
      </span>

      {/* Screen-reader announcement when initial data finishes loading */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {!loading && notes.length > 0
          ? `${notes.length} note${notes.length > 1 ? 's' : ''} et ${folders.length} dossier${folders.length > 1 ? 's' : ''} chargés`
          : ''}
      </span>

      {/* Screen-reader announcement for drag-drop results */}
      <span className="sr-only" aria-live="assertive" aria-atomic="true">{dragStatus}</span>

      <AnimatePresence>
        {dragError && (
          <motion.div {...anim} {...toastBase} style={{ ...toastBase.style, background: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.7)' }} role="alert">
            ↩️ Ordre non sauvegardé — réessaie
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renameError && (
          <motion.div {...anim} {...toastBase} style={{ ...toastBase.style, background: 'rgba(220,38,38,0.85)' }} role="alert">
            ✏️ Renommage échoué — réessaie
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteToast && (
          <motion.div {...anim} {...toastBase} style={{ ...toastBase.style, background: 'rgba(34,197,94,0.9)' }} role="status">
            🗑️ Supprimé
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quotaError && (
          <motion.div {...anim} {...toastBase} style={{ ...toastBase.style, background: 'rgba(220,38,38,0.85)' }} role="alert">
            💾 Stockage plein — libère de l'espace et réessaie
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
