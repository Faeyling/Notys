import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import Mascot from '@/components/Mascot';
import GridCard from '@/components/GridCard';
import EmptyState from './EmptyState';
import ItemGrid from './ItemGrid';

const MAX_SEARCH_RESULTS = 120;

export function HomeTabView({ homeItems, foldersWithCount, onOpenNote, onOpenFolder, onToggleStar, onDelete, onColorChange, onRename, onDragEnd, dark, animated }) {
  return (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Mascot variant="spa" size={50} animate={animated} aria-hidden="true" />
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>Notes &amp; Dossiers</h2>
      </div>
      {homeItems.length === 0
        ? <EmptyState tab="home" animated={animated} dark={dark} />
        : <ItemGrid
            items={homeItems}
            folders={foldersWithCount}
            onOpenNote={onOpenNote}
            onOpenFolder={onOpenFolder}
            onToggleStar={onToggleStar}
            onDelete={onDelete}
            onColorChange={onColorChange}
            onRename={onRename}
            onDragEnd={onDragEnd}
            dark={dark}
          />
      }
    </motion.div>
  );
}

export function FavTabView({ favNotes, onOpenNote, onToggleStar, onDelete, onColorChange, dark, animated }) {
  return (
    <motion.div key="fav" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Mascot variant={favNotes.length > 0 ? 'stars' : 'float'} size={50} animate={animated} aria-hidden="true" />
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>Favoris</h2>
      </div>
      {favNotes.length === 0
        ? <EmptyState tab="fav" animated={animated} dark={dark} />
        : <div className="grid gap-3" style={{ gridTemplateColumns: '1fr' }}>
            {favNotes.map(n => (
              <GridCard
                key={n.id} item={n} type="note"
                onOpen={onOpenNote}
                onToggleStar={onToggleStar}
                onDelete={onDelete}
                onColorChange={onColorChange}
                dark={dark}
              />
            ))}
          </div>
      }
    </motion.div>
  );
}

export function SearchTabView({ searchQ, setSearchQ, searchResults, searchTotal, onOpenNote, onOpenFolder, onToggleStar, onDelete, onColorChange, onRename, dark, animated }) {
  return (
    <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Mascot variant="snorkel" size={42} animate={animated} aria-hidden="true" />
        <div className="relative flex-1">
          <label htmlFor="home-search-input" className="sr-only">Rechercher tes notes</label>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9CA3AF' }} />
          <input
            id="home-search-input"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Rechercher..."
            autoFocus
            className="w-full pl-9 py-2.5 rounded-2xl text-sm outline-none border-2"
            style={{
              paddingRight: searchQ ? '2.25rem' : '1rem',
              borderColor: '#b4daf3',
              background: '#b4daf322',
              color: dark ? '#f0f0f0' : '#111827',
              fontFamily: 'Quicksand, sans-serif',
            }}
          />
          {searchQ && (
            <button
              onClick={() => setSearchQ('')}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-all hover:scale-110 active:scale-90"
            >
              <X size={14} style={{ color: '#9CA3AF' }} />
            </button>
          )}
        </div>
      </div>
      {searchQ && searchResults.length === 0
        ? <EmptyState tab="search" hasQuery animated={animated} dark={dark} />
        : !searchQ
          ? <EmptyState tab="search" animated={animated} dark={dark} />
          : <>
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr' }}>
                {searchResults.map(item => (
                  <GridCard
                    key={`${item._type}-${item.id}`}
                    item={item}
                    type={item._type}
                    onOpen={item._type === 'folder' ? onOpenFolder : onOpenNote}
                    onToggleStar={item._type === 'note' ? onToggleStar : () => {}}
                    onDelete={onDelete}
                    onColorChange={onColorChange}
                    onRename={onRename}
                    dark={dark}
                  />
                ))}
              </div>
              {searchResults.length >= MAX_SEARCH_RESULTS && (
                <p
                  className="text-xs text-center pt-2"
                  style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}
                >
                  {searchTotal > MAX_SEARCH_RESULTS
                    ? `${searchTotal - MAX_SEARCH_RESULTS} autre${searchTotal - MAX_SEARCH_RESULTS > 1 ? 's' : ''} résultat${searchTotal - MAX_SEARCH_RESULTS > 1 ? 's' : ''} — affine ta recherche pour les voir`
                    : `Affichage limité à ${MAX_SEARCH_RESULTS} résultats — affine ta recherche pour plus de précision`}
                </p>
              )}
            </>
      }
    </motion.div>
  );
}

export function BackupTabView({ onGoBackup, dark, animated }) {
  return (
    <motion.div key="backup-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Mascot variant="backpack" size={110} animate={animated} />
      <p className="font-bold text-base" style={{ fontFamily: 'Quicksand, sans-serif', color: dark ? '#f0f0f0' : '#111827' }}>
        Sauvegarde
      </p>
      <button
        onClick={onGoBackup}
        className="px-6 py-3 rounded-2xl font-bold text-sm"
        style={{ background: '#ffadad', color: '#7f1d1d', fontFamily: 'Quicksand, sans-serif' }}
      >
        Ouvrir la sauvegarde →
      </button>
    </motion.div>
  );
}
