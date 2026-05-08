import { motion } from 'framer-motion';
import Mascot from '@/components/Mascot';

export default function EmptyState({ tab, hasQuery, animated, dark }) {
  const states = {
    home:   { variant: 'spa',     title: 'Le carnet est tout propre !',    sub: 'Noty attend ta première idée pour la colorier.' },
    fav:    { variant: 'float',   title: 'Rien à l\'horizon.',             sub: 'Mets une ⭐ sur tes notes les plus importantes pour les voir flotter ici.' },
    search: { variant: 'snorkel', title: hasQuery ? 'Je cherche encore…' : 'Explore tes notes !', sub: hasQuery ? 'Noty ne trouve rien. Vérifie l\'orthographe !' : 'Tape pour chercher parmi toutes tes notes.' },
  };
  const s = states[tab] || states.home;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-14 gap-4"
    >
      <Mascot variant={s.variant} size={110} animate={animated} />
      <p className="font-bold text-base text-center" style={{ fontFamily: 'Quicksand, sans-serif', color: dark ? '#f0f0f0' : '#111827' }}>{s.title}</p>
      <p className="text-sm text-center max-w-xs" style={{ fontFamily: 'Quicksand, sans-serif', color: '#9CA3AF' }}>{s.sub}</p>
    </motion.div>
  );
}
