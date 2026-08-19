"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Layers } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { humanizeSectionName, persistSectionOrder } from "@/lib/section-reorder";

function SortableRow({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg border border-ink/10 px-2.5 py-2 text-sm ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${humanizeSectionName(id)}`}
        className="focus-ring cursor-grab touch-none rounded p-1 text-ink/35 hover:text-ink active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      <span className="truncate">{humanizeSectionName(id)}</span>
    </li>
  );
}

/** Drag-to-reorder panel for the sections on the active page. Section order is the
 * single source of truth for render order (see buildPreviewHtml in src/lib/preview.ts),
 * so reordering here is a real structural edit, not a cosmetic one — it's persisted
 * via /api/projects/reorder-sections and reflected immediately in the live preview. */
export function SectionReorder({
  projectId,
  slug,
  sections,
  onReorder,
}: {
  projectId: string | null;
  slug: string;
  sections: string[];
  onReorder: (next: string[]) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sections.indexOf(String(active.id));
    const newIndex = sections.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = sections;
    const next = arrayMove(sections, oldIndex, newIndex);

    await persistSectionOrder({
      projectId,
      slug,
      next,
      previous,
      onReorder,
      onSaving: setSaving,
      onError: (message) => toast.show("error", message),
    });
  }

  if (sections.length === 0) {
    return <p className="px-1 py-2 text-xs text-ink/40">No sections on this page yet.</p>;
  }

  return (
    <div className="glass-panel rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <Layers size={13} className="text-signal2" />
        <p className="font-mono text-xs text-ink/40">Layout order</p>
        {saving && <span className="ml-auto text-[10px] text-ink/35">Saving…</span>}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-1.5">
            {sections.map((s) => (
              <SortableRow key={s} id={s} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
