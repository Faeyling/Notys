import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { ChevronLeft, Folder } from 'lucide-react';
import { PALETTE } from '@/lib/constants';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GridCard from './GridCard';
import Mascot from './Mascot';
import DotGrid from './DotGrid';
import TripleWave from './TripleWave';

function EmptyFolder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Mascot variant="spa" size={90} />
      <p className="font-bold text-base" style={{ fontFamily: 'Quicksand, sans-serif', color: '#111827' }}>
        Dossier vide
      </p>
      <p className="text-sm text-center max-w-xs" style={{ color: '#9CA3AF', fontFamily: 'Quicksand, sans-serif' }}>
        Appuie sur + pour ajouter une note dans ce dossier
      </p>
    </div>
  );
}

export default function FolderLayer({
  folder, items, onClose,
  onOpenNote, onOpenFolder,
  onToggleStar, onDelete, onColorChange, onRename, onDragEnd,
  dark,
}) {
  if (!folder) return null;

  const dragControls = useDragControls();
  const pal    = PALETTE.find(p => p.bg === folder.color) || PALETTE[8];
  const pageBg = dark ? '#1a1a2e' : '#FAFAFA';

  return (
    <AnimatePresence>
      <motion.div
        key={`folder-${folder.id}`}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0, bottom: 0.3 }}
        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
        className="fixed inset-0 z-30 flex flex-col"
        style={{ background: pageBg }}
      >
        <DotGrid dark={dark} />

        {/* Coloured header — drag-to-close starts here only */}
        <div
          className="relative shrink-0"
          style={{ background: folder.color, minHeight: 100, touchAction: 'none' }}
          onPointerDown={e => dragControls.start(e)}
        >
          <div className="flex items-center gap-3 px-4 pb-8 relative z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-90"
              style={{ background: 'rgba(0,0,0,0.12)' }}
            >
              <ChevronLeft size={18} style={{ color: pal.fg }} />
            </button>
            <Folder size={18} style={{ color: pal.fg, opacity: 0.8 }} />
            <h2
              className="font-bold text-lg truncate"
              style={{ color: pal.fg, fontFamily: 'Quicksand, sans-serif', fontWeight: 700 }}
            >
              {folder.name}
            </h2>
          </div>
          {/* Wave transitions to the page background colour */}
          <TripleWave color={pageBg} />
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto relative z-10 px-4 py-4"
          style={{ touchAction: 'auto', paddingBottom: 80 }}
          onPointerDown={e => e.stopPropagation()}
        >
          {items.length === 0 ? (
            <EmptyFolder />
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId={`folder-content-${folder.id}`} direction="horizontal">
                {(prov) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.droppableProps}
                    className="grid gap-3"
                    style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}
                  >
                    {items.map((item, idx) => {
                      const isFolder = item._type === 'folder';
                      const dId = `${isFolder ? 'f' : 'n'}-${item.id}`;
                      return (
                        <Draggable key={dId} draggableId={dId} index={idx}>
                          {(p, s) => (
                            <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                              <GridCard
                                item={item}
                                type={isFolder ? 'folder' : 'note'}
                                onOpen={isFolder ? onOpenFolder : onOpenNote}
                                onToggleStar={onToggleStar}
                                onDelete={onDelete}
                                onColorChange={onColorChange}
                                onRename={onRename}
                                isDragging={s.isDragging}
                                dark={dark}
                              />
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {prov.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
