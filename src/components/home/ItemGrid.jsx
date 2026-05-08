import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GridCard from '@/components/GridCard';

export default function ItemGrid({
  items, folders,
  onOpenNote, onOpenFolder,
  onToggleStar, onDelete, onColorChange, onRename, onDragEnd,
  dark,
}) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="main-grid" direction="vertical">
        {(prov) => (
          <div
            ref={prov.innerRef}
            {...prov.droppableProps}
            className="grid gap-3"
            style={{ gridTemplateColumns: '1fr' }}
          >
            {items.map((item, idx) => {
              const isFolder = item._type === 'folder';
              const dId = `${isFolder ? 'f' : 'n'}-${item.id}`;
              return (
                <Draggable key={dId} draggableId={dId} index={idx}>
                  {(p, s) => (
                    <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}>
                      {isFolder ? (
                        <Droppable droppableId={`folder-drop-${item.id}`}>
                          {(fp, fs) => (
                            <div
                              ref={fp.innerRef}
                              {...fp.droppableProps}
                              aria-label={`Dossier ${item.name} — déposer ici pour déplacer`}
                              style={{
                                borderRadius: 16,
                                outline: fs.isDraggingOver ? `2.5px dashed ${item.color}` : '2.5px dashed transparent',
                                transition: 'outline 0.15s',
                              }}
                            >
                              <GridCard
                                item={{ ...item, _noteCount: folders?.find(f => f.id === item.id)?._noteCount ?? 0 }}
                                type="folder"
                                onOpen={() => onOpenFolder(item)}
                                onToggleStar={() => {}}
                                onDelete={onDelete}
                                onColorChange={onColorChange}
                                onRename={onRename}
                                isDragging={s.isDragging}
                                dark={dark}
                              />
                              {fp.placeholder}
                            </div>
                          )}
                        </Droppable>
                      ) : (
                        <GridCard
                          item={item}
                          type="note"
                          onOpen={onOpenNote}
                          onToggleStar={onToggleStar}
                          onDelete={onDelete}
                          onColorChange={onColorChange}
                          isDragging={s.isDragging}
                          dark={dark}
                        />
                      )}
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
  );
}
