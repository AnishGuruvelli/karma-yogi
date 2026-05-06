import { useState } from "react";
import { useStore } from "@/lib/store";
import { MOOD_EMOJIS } from "@/lib/types";
import { Plus, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getSafeSubjectIcon } from "@/lib/subject-icon";
import { toast } from "sonner";

export default function DataPage() {
  const { subjects, sessions, getSubject, addSubject, updateSubjectColor, deleteSubject, deleteSession } = useStore();
  const [addOpen, setAddOpen] = useState(false);
  const [colorPickerSubjectId, setColorPickerSubjectId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("cyan");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    type: "subject" | "session";
    id: string;
    title: string;
    description: string;
  } | null>(null);

  const colorMap: Record<string, string> = {
    green: "#4ade80",
    cyan: "#22d3ee",
    orange: "#fb923c",
    pink: "#f472b6",
    purple: "#a78bfa",
  };

  const formatDuration = (m: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const mins = Math.round(m % 60);
      return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
    }
    return `${Math.round(m)}m`;
  };

  const handleAddSubject = async () => {
    const normalizedName = newName.trim().toUpperCase();
    if (!normalizedName) return;
    const alreadyExists = subjects.some((s) => s.name.trim().toUpperCase() === normalizedName);
    if (alreadyExists) {
      toast.error("Subject already exists.");
      return;
    }
    const created = await addSubject(normalizedName, newColor);
    if (!created) {
      toast.error("Unable to create subject. Please try again.");
      return;
    }
    toast.success("Subject created.");
    setNewName("");
    setAddOpen(false);
  };

  const requestDeleteSubject = (id: string, name: string) => {
    setPendingDelete({
      type: "subject",
      id,
      title: `Delete subject "${name}"?`,
      description: "This will also delete all sessions under this subject. This action cannot be undone.",
    });
    setDeleteDialogOpen(true);
  };

  const requestDeleteSession = (id: string, topic: string) => {
    setPendingDelete({
      type: "session",
      id,
      title: "Delete this session?",
      description: `Session topic: "${topic || "General study"}". This action cannot be undone.`,
    });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === "subject") {
      deleteSubject(pendingDelete.id);
    } else {
      deleteSession(pendingDelete.id);
    }
    setDeleteDialogOpen(false);
    setPendingDelete(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="mb-8 font-display text-4xl font-semibold tracking-tight text-foreground">Library</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">📚 Subjects</h2>
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
              {subjects.length}
            </span>
          </div>
          <div className="glass-card rounded-2xl sm:max-h-[70vh] sm:overflow-hidden sm:overflow-y-auto">
            {subjects.map((sub) => {
              const sessionCount = sessions.filter((s) => s.subjectId === sub.id).length;
              const totalMins = sessions.filter((s) => s.subjectId === sub.id).reduce((sum, s) => sum + s.duration, 0);
              return (
                <div
                  key={sub.id}
                  className="flex flex-wrap items-center gap-3 border-b border-border/50 px-4 py-3.5 transition-colors last:border-0 hover:bg-muted/30 sm:flex-nowrap"
                >
                  <Popover
                    open={colorPickerSubjectId === sub.id}
                    onOpenChange={(open) => {
                      if (open) {
                        setNewColor(sub.color);
                        setColorPickerSubjectId(sub.id);
                        return;
                      }
                      setColorPickerSubjectId(null);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform hover:scale-105"
                        style={{ backgroundColor: colorMap[sub.color] + "1A" }}
                        title="Change subject color"
                      >
                        <span className="text-base">{getSafeSubjectIcon(sub.icon, sub.name.charAt(0) || "📘")}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[80] w-auto rounded-xl border-border bg-card/95 p-1.5 shadow-lg" align="start" side="bottom" sideOffset={8}>
                      <div className="flex gap-1.5">
                        {Object.entries(colorMap).map(([key, val]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={async () => {
                              setNewColor(key);
                              const ok = await updateSubjectColor(sub.id, key);
                              if (ok) setColorPickerSubjectId(null);
                            }}
                            aria-pressed={(colorPickerSubjectId === sub.id ? newColor : sub.color) === key}
                            className={`h-9 w-9 rounded-full transition-all ${
                              (colorPickerSubjectId === sub.id ? newColor : sub.color) === key
                                ? "scale-105 border-2 border-background ring-2 ring-primary ring-offset-1 ring-offset-card"
                                : "border border-transparent hover:scale-105"
                            }`}
                            style={{ backgroundColor: val }}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div className="flex-1">
                    <div className="font-semibold text-foreground">{sub.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {sessionCount} sessions · {formatDuration(totalMins)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestDeleteSubject(sub.id, sub.name);
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex w-full items-center gap-2 px-4 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
            >
              <Plus className="h-4 w-4" /> Add Subject
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">⏱ Sessions</h2>
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
              {sessions.length}
            </span>
          </div>
          <div className="glass-card rounded-2xl sm:max-h-[70vh] sm:overflow-hidden sm:overflow-y-auto">
            {sessions.map((session) => {
              const subject = getSubject(session.subjectId);
              return (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3 transition-colors last:border-0 hover:bg-muted/30 sm:flex-nowrap sm:gap-3"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: (colorMap[subject?.color || "cyan"]) + "1A" }}
                  >
                    <span className="text-sm">{getSafeSubjectIcon(subject?.icon, subject?.name.charAt(0) || "?")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{subject?.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{session.topic}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-neon-green">{formatDuration(session.duration)}</div>
                    <div className="text-xs text-muted-foreground">
                      {session.date} · {MOOD_EMOJIS[session.moodRating]}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestDeleteSession(session.id, session.topic)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {addOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
          onClick={() => setAddOpen(false)}
        >
          <div className="glass-modal max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl p-5 sm:rounded-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Add Subject</h2>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Subject name"
                className="input-field w-full rounded-xl p-3 text-foreground placeholder:text-muted-foreground/60"
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Color</label>
                <div className="flex gap-3">
                  {Object.entries(colorMap).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setNewColor(key);
                      }}
                      onClick={() => setNewColor(key)}
                      aria-pressed={newColor === key}
                      className={`h-9 w-9 rounded-full transition-all ${newColor === key ? "scale-110 border-2 border-primary/60 ring-2 ring-primary ring-offset-2 ring-offset-card" : "border border-transparent hover:scale-105"}`}
                      style={{
                        backgroundColor: val,
                        boxShadow: newColor === key ? "var(--shadow-md)" : "var(--shadow-sm)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddSubject}
                className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:opacity-90"
                style={{ boxShadow: "var(--shadow-md)" }}
              >
                Add Subject
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.title || "Confirm delete"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.description || "Are you sure you want to delete this item?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
