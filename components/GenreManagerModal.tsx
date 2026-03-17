"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { GENRES_PER_BOOKSHELF } from "@/features/library/constants";
import type { Genre } from "@/features/library/useGenres";

type GenreRowProps = {
  genre: Genre;
  bookshelfLabel: string;
  slotIndex: number;
  isEditing: boolean;
  isDeleting: boolean;
  isSubmitting: boolean;
  editingName: string;
  onEditNameChange: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
};

function GenreRow({
  genre,
  bookshelfLabel,
  slotIndex,
  isEditing,
  isDeleting,
  isSubmitting,
  editingName,
  onEditNameChange,
  onEdit,
  onSave,
  onCancel,
      onDelete,
}: GenreRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: genre.id, disabled: isEditing || isSubmitting });

  return (
    <div
      ref={setNodeRef}
      className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/30 p-3"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
        zIndex: isDragging ? 1 : 0,
      }}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Reorder ${genre.name}`}
        className="cursor-grab rounded p-1 text-neutral-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      {isEditing ? (
        <input
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
          value={editingName}
          onChange={(event) => onEditNameChange(event.target.value)}
        />
      ) : (
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-100">{genre.name}</p>
          <p className="text-xs text-neutral-500">
            Slot {slotIndex} on {bookshelfLabel}
          </p>
        </div>
      )}

      {isEditing ? (
        <>
          <button
            type="button"
            onClick={onSave}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-600 px-3 py-1.5 text-sm hover:border-neutral-400 disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-400"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-lg border border-red-800/60 bg-red-950/30 px-3 py-1.5 text-sm text-red-200 hover:border-red-600 disabled:opacity-60"
          >
            {isDeleting ? "Removing..." : "Delete"}
          </button>
        </>
      )}
    </div>
  );
}

function GenreOverlayRow({ genre }: { genre: Genre | null }) {
  if (!genre) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900/95 p-3 shadow-2xl">
      <div className="rounded p-1 text-neutral-400">⋮⋮</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-neutral-100">{genre.name}</p>
      </div>
    </div>
  );
}

export function GenreManagerModal({
  open,
  onClose,
  anchorRef,
  genres,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLButtonElement | null>;
  genres: Genre[];
  onAdd: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (genre: Genre) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
}) {
  const [newGenreName, setNewGenreName] = useState("");
  const [editingGenreId, setEditingGenreId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingGenreId, setDeletingGenreId] = useState<string | null>(null);
  const [orderedGenres, setOrderedGenres] = useState<Genre[]>(genres);
  const [activeGenreId, setActiveGenreId] = useState<string | null>(null);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const [error, setError] = useState("");

  const addInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [anchorStyle, setAnchorStyle] = useState({ top: 68, left: 0, width: 348 });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    if (isPersistingOrder) return;
    setOrderedGenres(genres);
  }, [genres, isPersistingOrder]);

  useEffect(() => {
    if (open) {
      setNewGenreName("");
      setEditingGenreId(null);
      setEditingName("");
      setDeletingGenreId(null);
      setActiveGenreId(null);
      setError("");
      setTimeout(() => addInputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const targetNode = event.target as Node;
      if (panelRef.current?.contains(targetNode) || anchorRef.current?.contains(targetNode)) {
        return;
      }
      onClose();
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [anchorRef, onClose, open]);

  useEffect(() => {
    if (!open) return;

    function syncAnchorPosition() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = 348;
      const viewportPadding = 16;
      const unclampedLeft = rect.right - panelWidth;
      const maxLeft = window.innerWidth - panelWidth - viewportPadding;

      setAnchorStyle({
        top: rect.bottom + 12,
        left: Math.max(viewportPadding, Math.min(unclampedLeft, maxLeft)),
        width: panelWidth,
      });
    }

    syncAnchorPosition();
    window.addEventListener("resize", syncAnchorPosition);
    window.addEventListener("scroll", syncAnchorPosition, true);

    return () => {
      window.removeEventListener("resize", syncAnchorPosition);
      window.removeEventListener("scroll", syncAnchorPosition, true);
    };
  }, [anchorRef, open]);

  const pointerLeft = useMemo(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return 32;

    const center = rect.left + rect.width / 2;
    return Math.max(24, Math.min(center - anchorStyle.left - 8, anchorStyle.width - 40));
  }, [anchorRef, anchorStyle.left, anchorStyle.width]);

  const activeGenre = useMemo(
    () => orderedGenres.find((genre) => genre.id === activeGenreId) ?? null,
    [activeGenreId, orderedGenres]
  );

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!newGenreName.trim()) {
      setError("Please enter a genre name.");
      return;
    }

    setSubmitting(true);
    try {
      await onAdd(newGenreName);
      setNewGenreName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add genre.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveEdit(genreId: string) {
    setError("");
    if (!editingName.trim()) {
      setError("Please enter a genre name.");
      return;
    }

    setSubmitting(true);
    try {
      await onUpdate(genreId, editingName);
      setEditingGenreId(null);
      setEditingName("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update genre.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(genre: Genre) {
    const shouldDelete = window.confirm(
      `Delete "${genre.name}"? Books in this genre will be moved to "Unsorted".`
    );
    if (!shouldDelete) return;

    setError("");
    setDeletingGenreId(genre.id);
    try {
      await onDelete(genre);
      if (editingGenreId === genre.id) {
        setEditingGenreId(null);
        setEditingName("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete genre.");
    } finally {
      setDeletingGenreId(null);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveGenreId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveGenreId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = orderedGenres.findIndex((genre) => genre.id === active.id);
    const newIndex = orderedGenres.findIndex((genre) => genre.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const nextOrder = arrayMove(orderedGenres, oldIndex, newIndex);
    setOrderedGenres(nextOrder);
    setError("");
    setIsPersistingOrder(true);

    try {
      await onReorder(nextOrder.map((genre) => genre.id));
    } catch (err: unknown) {
      setOrderedGenres(genres);
      setError(err instanceof Error ? err.message : "Failed to reorder genres.");
    } finally {
      setIsPersistingOrder(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={panelRef}
          className="fixed z-[260]"
          style={{
            top: anchorStyle.top,
            left: anchorStyle.left,
            width: anchorStyle.width,
          }}
          initial={{ opacity: 0, y: -10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/96 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Manage genres</h2>
                <p className="mt-1 text-xs text-neutral-400">
                  Drag the handle to reorder genres across bookshelves.
                </p>
              </div>
            </div>

            <form onSubmit={handleAdd} className="mt-4 flex gap-2">
              <input
                ref={addInputRef}
                className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950/40 px-3 py-2 outline-none focus:border-neutral-400"
                placeholder="Add a genre"
                value={newGenreName}
                onChange={(event) => setNewGenreName(event.target.value)}
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-60"
              >
                {submitting ? "Adding..." : "Add"}
              </button>
            </form>

            <div className="mt-4 max-h-[360px] overflow-y-auto pr-1">
              {orderedGenres.length === 0 ? (
                <p className="rounded-lg border border-neutral-800 bg-neutral-950/30 p-3 text-sm text-neutral-400">
                  No genres yet. Add your first one above.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={(event) => {
                    void handleDragEnd(event);
                  }}
                >
                  <SortableContext
                    items={orderedGenres.map((genre) => genre.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-4">
                      {Array.from(
                        { length: Math.ceil(orderedGenres.length / GENRES_PER_BOOKSHELF) },
                        (_, groupIndex) => {
                          const start = groupIndex * GENRES_PER_BOOKSHELF;
                          const shelfGenres = orderedGenres.slice(
                            start,
                            start + GENRES_PER_BOOKSHELF
                          );
                          const bookshelfLabel = `Bookshelf ${groupIndex + 1}`;

                          return (
                            <section
                              key={bookshelfLabel}
                              className="rounded-xl border border-neutral-800 bg-neutral-950/20 p-3"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                                  {bookshelfLabel}
                                </h3>
                                <span className="text-[11px] text-neutral-500">
                                  {shelfGenres.length} genre{shelfGenres.length === 1 ? "" : "s"}
                                </span>
                              </div>

                              <div className="space-y-1">
                                {shelfGenres.map((genre, itemIndex) => (
                                  <GenreRow
                                    key={genre.id}
                                    genre={genre}
                                    bookshelfLabel={bookshelfLabel}
                                    slotIndex={itemIndex + 1}
                                    isEditing={editingGenreId === genre.id}
                                    isDeleting={deletingGenreId === genre.id}
                                    isSubmitting={submitting}
                                    editingName={editingName}
                                    onEditNameChange={setEditingName}
                                    onEdit={() => {
                                      setEditingGenreId(genre.id);
                                      setEditingName(genre.name);
                                      setError("");
                                    }}
                                    onSave={() => {
                                      void handleSaveEdit(genre.id);
                                    }}
                                    onCancel={() => {
                                      setEditingGenreId(null);
                                      setEditingName("");
                                    }}
                                    onDelete={() => {
                                      void handleDelete(genre);
                                    }}
                                  />
                                ))}
                              </div>
                            </section>
                          );
                        }
                      )}
                    </div>
                  </SortableContext>

                  <DragOverlay dropAnimation={null}>
                    <GenreOverlayRow genre={activeGenre} />
                  </DragOverlay>
                </DndContext>
              )}
            </div>

            {error && (
              <p className="mt-4 rounded-lg border border-red-800/60 bg-red-950/30 p-3 text-sm text-red-200">
                {error}
              </p>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
