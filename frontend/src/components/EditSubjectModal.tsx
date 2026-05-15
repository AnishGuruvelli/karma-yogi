import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useStore } from "@/lib/store";
import { getSafeSubjectIcon } from "@/lib/subject-icon";
import { toast } from "sonner";
import type { Subject } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";

const COLOR_OPTIONS: { key: string; hex: string }[] = [
  { key: "cyan",   hex: "#22d3ee" },
  { key: "orange", hex: "#fb923c" },
  { key: "green",  hex: "#4ade80" },
  { key: "purple", hex: "#a78bfa" },
  { key: "pink",   hex: "#f472b6" },
];

const ICON_OPTIONS = [
  "📘", "📗", "📙", "📚", "📖",
  "📝", "✏️", "🖊️", "🎓", "🧠",
  "🧪", "⚗️", "🔬", "🔭", "💡",
  "💻", "🖥️", "🎨", "🎵", "🌍",
  "🌐", "🏛️", "📊", "📈", "🧮",
  "📐", "🎯", "⚡", "🧬", "🌱",
];

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: "easeIn" } },
};
const panelVariants = {
  hidden: { y: 72, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 420, damping: 36, mass: 0.8 } },
  exit: { y: 56, opacity: 0, transition: { duration: 0.16, ease: "easeIn" } },
};

interface Props {
  open: boolean;
  subject: Subject | null;
  onClose: () => void;
}

export function EditSubjectModal({ open, subject, onClose }: Props) {
  useBodyScrollLock(open);
  const { updateSubject } = useStore();

  const [name, setName] = useState("");
  const [color, setColor] = useState("cyan");
  const [icon, setIcon] = useState("📘");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && subject) {
      setName(subject.name);
      setColor(subject.color || "cyan");
      setIcon(getSafeSubjectIcon(subject.icon, "📘"));
    }
  }, [open, subject]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Subject name is required");
      return;
    }
    setIsSaving(true);
    try {
      const ok = await updateSubject(subject!.id, trimmed, color, icon);
      if (ok) {
        toast.success("Subject updated");
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const colorHex = COLOR_OPTIONS.find((c) => c.key === color)?.hex ?? "#22d3ee";

  return (
    <AnimatePresence>
      {open && subject && (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className="glass-modal w-full max-w-md rounded-t-2xl p-5 sm:rounded-2xl sm:p-6"
        style={{ boxShadow: "var(--shadow-xl)" }}
        onClick={(e) => e.stopPropagation()}
        variants={panelVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Edit Subject</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="mb-5 flex flex-col items-center gap-2">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
            style={{ backgroundColor: colorHex + "26" }}
          >
            {icon}
          </div>
          <p className="text-sm font-semibold text-foreground">{name || subject.name}</p>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.toUpperCase())}
            maxLength={30}
            className="input-field w-full rounded-xl p-3 text-base font-medium text-foreground"
            placeholder="e.g. MATHS"
            disabled={isSaving}
          />
        </div>

        {/* Color */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Color</label>
          <div className="flex gap-3">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setColor(c.key)}
                disabled={isSaving}
                aria-pressed={color === c.key}
                className={`h-10 w-10 rounded-full transition-all ${
                  color === c.key
                    ? "scale-110 ring-2 ring-offset-2 ring-offset-card"
                    : "hover:scale-105"
                }`}
                style={{
                  backgroundColor: c.hex,
                  boxShadow: color === c.key ? `0 0 0 2px var(--color-card), 0 0 0 4px ${c.hex}` : undefined,
                }}
              />
            ))}
          </div>
        </div>

        {/* Icon */}
        <div className="mb-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Icon</label>
          <div className="grid grid-cols-10 gap-1.5">
            {ICON_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIcon(emoji)}
                disabled={isSaving}
                aria-pressed={icon === emoji}
                className={`flex h-9 w-full items-center justify-center rounded-lg text-xl transition-all ${
                  icon === emoji
                    ? "ring-2"
                    : "bg-muted/50 hover:bg-muted"
                }`}
                style={
                  icon === emoji
                    ? { backgroundColor: colorHex + "26", boxShadow: `0 0 0 2px ${colorHex}` }
                    : undefined
                }
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={isSaving || !name.trim()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ boxShadow: "var(--shadow-md)" }}
          >
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save"}
          </button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
