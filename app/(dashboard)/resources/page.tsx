"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BookOpen,
  FileSignature,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Link2,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/components/lib/supabase";
import { usePlan } from "@/components/plans/PlanProvider";
import { STARTER_KIT } from "@/components/resources/starter-kit";
import ProposalsWorkspace from "@/components/proposals/ProposalsWorkspace";
import EmptyState from "@/components/ui/EmptyState";

type Kind = "document" | "video" | "image" | "link" | "text";

type Folder = {
  id: string;
  company_id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  emoji: string | null;
  is_course: boolean;
  position: number;
};

type Resource = {
  id: string;
  company_id: string;
  folder_id: string | null;
  title: string;
  description: string | null;
  kind: Kind;
  url: string | null;
  storage_path: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  body: string | null;
  tags: string[];
  pinned: boolean;
  position: number;
  created_at: string;
};

const BUCKET = "sales-resources";
const MAX_BYTES = 50 * 1024 * 1024;
const EMOJIS = ["📁", "🎤", "🛡️", "🎓", "🏆", "💰", "✉️", "📊", "🎯", "🧠", "📞", "🤝", "📈", "🎬"];

const KINDS: { id: Kind | "all"; label: string; icon: typeof FileText; color: string }[] = [
  { id: "all", label: "All", icon: BookOpen, color: "#3B82F6" },
  { id: "document", label: "Documents", icon: FileText, color: "#F5C518" },
  { id: "video", label: "Videos", icon: PlayCircle, color: "#F22F46" },
  { id: "image", label: "Images", icon: ImageIcon, color: "#A78BFA" },
  { id: "link", label: "Links", icon: Link2, color: "#2DD4BF" },
  { id: "text", label: "Scripts", icon: Sparkles, color: "#F472B6" },
];

const kindMeta = (kind: Kind) => KINDS.find((item) => item.id === kind) ?? KINDS[1];

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** YouTube / Vimeo / Loom / Google Drive links → embeddable player URL. */
function embedUrl(url: string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("youtube.com") && u.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${u.pathname.split("/")[2]}`;
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean).pop()}`;
    if (u.hostname.includes("loom.com")) return `https://www.loom.com/embed/${u.pathname.split("/").filter(Boolean).pop()}`;
    if (u.hostname.includes("drive.google.com") && u.pathname.includes("/file/d/")) return url.replace(/\/view.*$/, "/preview");
  } catch {}
  return null;
}

function kindFromFile(file: File): Kind {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("image/")) return "image";
  return "document";
}

const input =
  "h-11 w-full rounded-xl border border-[#202020] bg-[#101010] px-3 text-sm text-white outline-none transition focus:border-[#3B82F6]/50";

export default function ResourcesPage() {
  const { companyId } = usePlan();
  const [userId, setUserId] = useState<string | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [section, setSection] = useState<"resources" | "proposals">("resources");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (new URLSearchParams(window.location.search).get("tab") === "proposals") setSection("proposals");
  }, []);

  function changeSection(next: "resources" | "proposals") {
    setSection(next);
    const url = new URL(window.location.href);
    if (next === "proposals") url.searchParams.set("tab", "proposals");
    else url.searchParams.delete("tab");
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  const [folders, setFolders] = useState<Folder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind | "all">("all");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [viewing, setViewing] = useState<Resource | null>(null);
  const [editingFolder, setEditingFolder] = useState<Partial<Folder> | null>(null);
  const [editingResource, setEditingResource] = useState<Partial<Resource> | null>(null);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const [{ data: company }, { data: member }, folderResult, resourceResult, progressResult] = await Promise.all([
      supabase.from("company_profiles").select("user_id").eq("id", companyId).maybeSingle(),
      supabase.from("team_members").select("role").eq("company_id", companyId).eq("user_id", user?.id ?? "").maybeSingle(),
      supabase.from("resource_folders").select("*").eq("company_id", companyId).order("position").order("created_at"),
      supabase.from("resources").select("*").eq("company_id", companyId).order("pinned", { ascending: false }).order("position").order("created_at"),
      supabase.from("resource_progress").select("resource_id").eq("user_id", user?.id ?? ""),
    ]);

    setIsManager(company?.user_id === user?.id || ["Admin", "Manager"].includes(member?.role ?? ""));

    if (folderResult.error || resourceResult.error) {
      setSetupError((folderResult.error || resourceResult.error)?.message ?? "");
    } else {
      setSetupError("");
      setFolders((folderResult.data ?? []) as Folder[]);
      setResources((resourceResult.data ?? []) as Resource[]);
      setDone(new Set((progressResult.data ?? []).map((row) => row.resource_id as string)));
    }

    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const currentFolder = folders.find((folder) => folder.id === folderId) ?? null;

  const breadcrumb = useMemo(() => {
    const path: Folder[] = [];
    let cursor = currentFolder;
    while (cursor) {
      path.unshift(cursor);
      cursor = folders.find((folder) => folder.id === cursor?.parent_id) ?? null;
    }
    return path;
  }, [currentFolder, folders]);

  const subfolders = folders.filter((folder) => folder.parent_id === folderId);
  const searching = query.trim().length > 0 || kind !== "all";

  const visible = resources.filter((resource) => {
    if (!searching && resource.folder_id !== folderId) return false;
    if (kind !== "all" && resource.kind !== kind) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [resource.title, resource.description, resource.body, ...(resource.tags ?? [])]
      .filter(Boolean)
      .some((text) => String(text).toLowerCase().includes(q));
  });

  const pinned = !searching && folderId === null ? resources.filter((resource) => resource.pinned) : [];

  function folderStats(id: string) {
    const ids = new Set<string>([id]);
    let added = true;
    while (added) {
      added = false;
      for (const folder of folders) {
        if (folder.parent_id && ids.has(folder.parent_id) && !ids.has(folder.id)) {
          ids.add(folder.id);
          added = true;
        }
      }
    }
    const items = resources.filter((resource) => resource.folder_id && ids.has(resource.folder_id));
    return { total: items.length, completed: items.filter((resource) => done.has(resource.id)).length };
  }

  /* ---------------- actions ---------------- */

  async function saveFolder() {
    if (!companyId || !editingFolder?.name?.trim()) return;
    const payload = {
      name: editingFolder.name.trim(),
      description: editingFolder.description?.trim() || null,
      emoji: editingFolder.emoji || "📁",
      is_course: Boolean(editingFolder.is_course),
    };
    const { error } = editingFolder.id
      ? await supabase.from("resource_folders").update(payload).eq("id", editingFolder.id)
      : await supabase.from("resource_folders").insert({ ...payload, company_id: companyId, parent_id: folderId, position: subfolders.length });
    if (error) return flash(error.message);
    setEditingFolder(null);
    flash("Folder saved.");
    void load();
  }

  async function deleteFolder(folder: Folder) {
    if (!window.confirm(`Delete "${folder.name}" and everything inside it?`)) return;
    const paths = resources.filter((resource) => resource.folder_id === folder.id && resource.storage_path).map((resource) => resource.storage_path as string);
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    const { error } = await supabase.from("resource_folders").delete().eq("id", folder.id);
    if (error) return flash(error.message);
    if (folderId === folder.id) setFolderId(folder.parent_id);
    void load();
  }

  async function deleteResource(resource: Resource) {
    if (!window.confirm(`Delete "${resource.title}"?`)) return;
    if (resource.storage_path) await supabase.storage.from(BUCKET).remove([resource.storage_path]);
    const { error } = await supabase.from("resources").delete().eq("id", resource.id);
    if (error) return flash(error.message);
    setViewing(null);
    void load();
  }

  async function togglePin(resource: Resource) {
    await supabase.from("resources").update({ pinned: !resource.pinned }).eq("id", resource.id);
    void load();
  }

  async function toggleDone(resource: Resource) {
    if (!userId || !companyId) return;
    if (done.has(resource.id)) {
      await supabase.from("resource_progress").delete().eq("resource_id", resource.id).eq("user_id", userId);
    } else {
      await supabase.from("resource_progress").insert({ resource_id: resource.id, user_id: userId, company_id: companyId });
    }
    void load();
  }

  async function addStarterKit() {
    if (!companyId) return;
    for (const [index, folder] of STARTER_KIT.entries()) {
      const { data, error } = await supabase
        .from("resource_folders")
        .insert({ company_id: companyId, name: folder.name, emoji: folder.emoji, description: folder.description, is_course: Boolean(folder.is_course), position: index })
        .select("id")
        .single();
      if (error) return flash(error.message);
      if (folder.items.length) {
        await supabase.from("resources").insert(
          folder.items.map((item, position) => ({
            company_id: companyId,
            folder_id: data.id,
            kind: "text",
            title: item.title,
            description: item.description,
            body: item.body,
            tags: item.tags,
            position,
          }))
        );
      }
    }
    flash("Starter kit added. Edit the templates with your own pitch.");
    void load();
  }

  /* ---------------- render ---------------- */

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Toolkit</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pitches, scripts, training, documents and proposals: everything your team needs to sell and close.
          </p>
        </div>

        {section === "resources" && isManager && !setupError && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditingFolder({ emoji: "📁" })}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#202020] bg-[#0D0D0D] px-4 text-sm text-gray-200 transition hover:border-[#3B82F6]/40 hover:text-white"
            >
              <FolderPlus size={15} /> New folder
            </button>
            <button
              type="button"
              onClick={() => setEditingResource({ kind: "document", folder_id: folderId, tags: [] })}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3B82F6] px-4 text-sm font-semibold text-white transition hover:bg-[#2F74E8]"
            >
              <Plus size={15} /> Add resource
            </button>
          </div>
        )}
      </header>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-[#202020] bg-[#0D0D0D] p-1 sm:w-fit">
        {([
          { id: "resources", label: "Resources", icon: BookOpen, color: "#3B82F6" },
          { id: "proposals", label: "Proposals", icon: FileSignature, color: "#84CC16" },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeSection(item.id)}
            data-active={section === item.id}
            style={{ "--tab": item.color } as CSSProperties}
            className="bl-tab flex flex-1 items-center justify-center gap-2 rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-gray-500 sm:flex-none"
          >
            <item.icon size={15} strokeWidth={2.2} className="bl-tab-emoji" style={{ color: item.color }} aria-hidden />
            {item.label}
          </button>
        ))}
      </div>

      {section === "proposals" ? (
        <div className="mt-6">
          <ProposalsWorkspace embedded />
        </div>
      ) : (
      <>

      {setupError && (
        <div className="mt-6 rounded-2xl border border-[#F5C518]/30 bg-[#F5C518]/[0.06] p-4 text-sm text-[#F5C518]">
          Run <code>supabase/UPDATE_4_RUN_THIS.sql</code> in Supabase → SQL Editor to turn on the Sales Toolkit.
          <span className="mt-1 block text-xs text-[#F5C518]/60">Supabase says: {setupError}</span>
        </div>
      )}

      {/* Search + type filters */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pitches, videos, documents…"
            className={`${input} pl-9`}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {KINDS.map((item) => {
            const active = kind === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setKind(item.id)}
                data-active={active}
                className="bl-tab inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[#202020] px-3 text-xs font-semibold text-[#9a9a9a]"
                style={{ "--tab": item.color } as CSSProperties}
              >
                <Icon size={14} strokeWidth={2.2} className="bl-tab-emoji" style={{ color: item.color }} aria-hidden /> {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Breadcrumb */}
      {!searching && (
        <nav className="mt-5 flex flex-wrap items-center gap-1 text-sm">
          <button type="button" onClick={() => setFolderId(null)} className={folderId ? "text-gray-500 hover:text-white" : "font-semibold text-white"}>
            All folders
          </button>
          {breadcrumb.map((folder) => (
            <span key={folder.id} className="flex items-center gap-1">
              <ChevronRight size={14} className="text-gray-600" />
              <button type="button" onClick={() => setFolderId(folder.id)} className={folder.id === folderId ? "font-semibold text-white" : "text-gray-500 hover:text-white"}>
                {folder.emoji} {folder.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      {/* Current folder header (course progress) */}
      {currentFolder && !searching && (
        <div className="mt-4 rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl">{currentFolder.emoji}</p>
              <h2 className="mt-1 text-lg font-semibold">{currentFolder.name}</h2>
              {currentFolder.description && <p className="mt-1 text-sm text-gray-500">{currentFolder.description}</p>}
            </div>
            {isManager && (
              <div className="flex gap-1">
                <button type="button" onClick={() => setEditingFolder(currentFolder)} className="rounded-lg p-2 text-gray-500 hover:bg-white/5 hover:text-white" aria-label="Edit folder"><Pencil size={15} /></button>
                <button type="button" onClick={() => void deleteFolder(currentFolder)} className="rounded-lg p-2 text-gray-500 hover:bg-[#F22F46]/10 hover:text-[#F22F46]" aria-label="Delete folder"><Trash2 size={15} /></button>
              </div>
            )}
          </div>
          {currentFolder.is_course && (() => {
            const stats = folderStats(currentFolder.id);
            const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
            return (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>🎓 Your progress</span>
                  <span>{stats.completed}/{stats.total} lessons · {pct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#84CC16] transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {loading && !setupError && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/[0.03]" />)}
        </div>
      )}

      {!loading && !setupError && (
        <>
          {/* Empty state */}
          {folders.length === 0 && resources.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-white/10 p-10 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#3B82F6]/25 bg-[#10243A] text-[#3B82F6] shadow-[0_0_24px_rgba(59,130,246,0.12)]">
                <BookOpen size={24} strokeWidth={2} />
              </span>
              <h2 className="mt-3 text-lg font-semibold">Build your team&apos;s sales toolkit</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                {isManager
                  ? "Add your pitch, objection answers, training videos, case studies and price lists — everything a salesperson needs in one place."
                  : "Your manager hasn't added resources yet. Pitches, training and documents will appear here."}
              </p>
              {isManager && (
                <button type="button" onClick={() => void addStarterKit()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2F74E8]">
                  <Sparkles size={15} /> Add starter kit (folders + templates)
                </button>
              )}
            </div>
          )}

          {/* Pinned */}
          {pinned.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#3B82F6]"><Star size={14} fill="#F5C518" /> Pinned</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinned.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} done={done.has(resource.id)} onOpen={() => setViewing(resource)} />
                ))}
              </div>
            </section>
          )}

          {/* Folders */}
          {!searching && subfolders.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-gray-300">Folders</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subfolders.map((folder) => {
                  const stats = folderStats(folder.id);
                  const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setFolderId(folder.id)}
                      className="group rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#3B82F6]/35"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-3xl">{folder.emoji || "📁"}</span>
                        {folder.is_course && <span className="rounded-full bg-[#84CC16]/15 px-2 py-0.5 text-[11px] font-semibold text-[#84CC16]">Course</span>}
                      </div>
                      <p className="mt-3 text-[15px] font-semibold text-white">{folder.name}</p>
                      {folder.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{folder.description}</p>}
                      <p className="mt-3 text-xs text-gray-500">
                        {stats.total} {stats.total === 1 ? "item" : "items"}
                        {folder.is_course && stats.total > 0 && ` · ${pct}% completed`}
                      </p>
                      {folder.is_course && stats.total > 0 && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-[#84CC16]" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Resources */}
          {(visible.length > 0 || folderId || searching) && (
            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-gray-300">
                {searching ? `${visible.length} results` : currentFolder?.is_course ? "Lessons" : "Resources"}
              </h2>
              {visible.length === 0 ? (
                <div className="rounded-2xl border border-[#202020] bg-[#0D0D0D]">
                  {searching ? (
                    <EmptyState icon={Search} color="#A78BFA" title="Nothing matches your search" text="Try another word, or look in a different folder." compact />
                  ) : (
                    <EmptyState
                      icon={BookOpen}
                      color="#F5C518"
                      accents={["#3B82F6", "#F472B6"]}
                      title={isManager ? "Give your team what they need to sell" : "Nothing here yet"}
                      text={isManager ? "Upload pitch decks, scripts, training videos and price sheets so every rep sells the same way." : "Your manager hasn't added resources to this folder yet."}
                      action={isManager ? { label: "Add resource", onClick: () => setEditingResource({ kind: "document", folder_id: folderId, tags: [] }) } : undefined}
                      compact
                    />
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((resource, index) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      done={done.has(resource.id)}
                      lesson={currentFolder?.is_course && !searching ? index + 1 : undefined}
                      onOpen={() => setViewing(resource)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {viewing && (
        <Viewer
          resource={viewing}
          done={done.has(viewing.id)}
          isManager={isManager}
          onClose={() => setViewing(null)}
          onToggleDone={() => void toggleDone(viewing)}
          onPin={() => void togglePin(viewing).then(() => setViewing({ ...viewing, pinned: !viewing.pinned }))}
          onEdit={() => {
            setEditingResource(viewing);
            setViewing(null);
          }}
          onDelete={() => void deleteResource(viewing)}
          flash={flash}
        />
      )}

      {editingFolder && (
        <Modal title={editingFolder.id ? "Edit folder" : "New folder"} onClose={() => setEditingFolder(null)}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setEditingFolder({ ...editingFolder, emoji })}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition ${editingFolder.emoji === emoji ? "border-[#3B82F6] bg-[#3B82F6]/10" : "border-[#202020] hover:border-white/20"}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input className={input} placeholder="Folder name (e.g. Sales Pitch)" value={editingFolder.name ?? ""} onChange={(event) => setEditingFolder({ ...editingFolder, name: event.target.value })} />
            <input className={input} placeholder="Short description (optional)" value={editingFolder.description ?? ""} onChange={(event) => setEditingFolder({ ...editingFolder, description: event.target.value })} />
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#202020] p-3 text-sm text-gray-300">
              <input type="checkbox" checked={Boolean(editingFolder.is_course)} onChange={(event) => setEditingFolder({ ...editingFolder, is_course: event.target.checked })} className="h-4 w-4 accent-[#84CC16]" />
              <span>🎓 Training course <span className="block text-xs text-gray-500">Items become numbered lessons and each person&apos;s progress is tracked.</span></span>
            </label>
            <button type="button" onClick={() => void saveFolder()} disabled={!editingFolder.name?.trim()} className="h-11 w-full rounded-xl bg-[#3B82F6] text-sm font-semibold text-white hover:bg-[#2F74E8] disabled:opacity-40">
              Save folder
            </button>
          </div>
        </Modal>
      )}

      {editingResource && companyId && (
        <ResourceEditor
          value={editingResource}
          folders={folders}
          companyId={companyId}
          onClose={() => setEditingResource(null)}
          onSaved={() => {
            setEditingResource(null);
            flash("Resource saved.");
            void load();
          }}
          flash={flash}
        />
      )}

      </>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[400] -translate-x-1/2 rounded-xl border border-[#202020] bg-[#111] px-4 py-2.5 text-sm text-white shadow-2xl lg:bottom-8">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ================= components ================= */

function ResourceCard({ resource, done, lesson, onOpen }: { resource: Resource; done: boolean; lesson?: number; onOpen: () => void }) {
  const meta = kindMeta(resource.kind);
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col rounded-2xl border border-[#202020] bg-[#0D0D0D] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#3B82F6]/35"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${meta.color}1a`, color: meta.color }}>
          {lesson ? <span className="text-sm font-bold">{lesson}</span> : <Icon size={20} />}
        </span>
        <div className="flex items-center gap-1.5">
          {resource.pinned && <Star size={14} className="text-[#3B82F6]" fill="#F5C518" />}
          {done && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#84CC16] text-black"><Check size={13} strokeWidth={3} /></span>}
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-[15px] font-semibold text-white">{resource.title}</p>
      {resource.description && <p className="mt-1 line-clamp-2 text-xs text-gray-500">{resource.description}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${meta.color}14`, color: meta.color }}>{meta.label.replace(/s$/, "")}</span>
        {resource.size_bytes ? <span className="text-[11px] text-gray-600">{formatSize(resource.size_bytes)}</span> : null}
        {(resource.tags ?? []).slice(0, 3).map((tag) => (
          <span key={tag} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-gray-500">#{tag}</span>
        ))}
      </div>
    </button>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-[#202020] bg-[#0D0D0D] shadow-2xl ${wide ? "max-w-4xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between gap-3 border-b border-[#202020] px-5 py-4">
          <h2 className="truncate text-[15px] font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-white/5 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Viewer({
  resource,
  done,
  isManager,
  onClose,
  onToggleDone,
  onPin,
  onEdit,
  onDelete,
  flash,
}: {
  resource: Resource;
  done: boolean;
  isManager: boolean;
  onClose: () => void;
  onToggleDone: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  flash: (message: string) => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!resource.storage_path) return;
    void supabase.storage
      .from(BUCKET)
      .createSignedUrl(resource.storage_path, 3600)
      .then(({ data }) => setFileUrl(data?.signedUrl ?? null));
  }, [resource.storage_path]);

  const src = fileUrl || resource.url || "";
  const embed = resource.url ? embedUrl(resource.url) : null;
  const isPdf = (resource.mime_type || resource.file_name || resource.url || "").toLowerCase().includes("pdf");

  return (
    <Modal title={resource.title} onClose={onClose} wide>
      {resource.description && <p className="mb-4 text-sm text-gray-400">{resource.description}</p>}

      <div className="overflow-hidden rounded-xl border border-[#202020] bg-black/40">
        {resource.kind === "text" && (
          <pre className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap p-5 font-sans text-sm leading-6 text-gray-200">{resource.body}</pre>
        )}
        {resource.kind === "video" && (embed ? (
          <iframe src={embed} className="aspect-video w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={resource.title} />
        ) : src ? (
          <video src={src} controls className="aspect-video w-full bg-black" />
        ) : null)}
        {resource.kind === "image" && src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={resource.title} className="max-h-[60vh] w-full object-contain" />
        )}
        {resource.kind === "document" && src && (isPdf ? (
          <iframe src={src} className="h-[60vh] w-full bg-white" title={resource.title} />
        ) : embed ? (
          <iframe src={embed} className="h-[60vh] w-full bg-white" title={resource.title} />
        ) : (
          <div className="p-8 text-center text-sm text-gray-400">
            <FileText size={32} className="mx-auto mb-3 text-[#3B82F6]" />
            {resource.file_name || "Document"} {resource.size_bytes ? `· ${formatSize(resource.size_bytes)}` : ""}
            <p className="mt-1 text-xs text-gray-600">Preview isn&apos;t available for this file type — open or download it below.</p>
          </div>
        ))}
        {resource.kind === "link" && (
          <div className="p-8 text-center">
            <Link2 size={30} className="mx-auto mb-3 text-[#2DD4BF]" />
            <p className="break-all text-sm text-gray-300">{resource.url}</p>
          </div>
        )}
        {!src && resource.kind !== "text" && resource.kind !== "link" && (
          <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleDone}
          className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${done ? "bg-[#84CC16] text-black" : "border border-[#202020] text-gray-200 hover:border-[#84CC16]/50"}`}
        >
          <Check size={15} /> {done ? "Completed" : "Mark as completed"}
        </button>

        {resource.kind === "text" && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(resource.body || "");
              flash("Copied to clipboard.");
            }}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#202020] px-4 text-sm text-gray-200 hover:border-white/20"
          >
            <Copy size={15} /> Copy
          </button>
        )}

        {src && resource.kind !== "text" && (
          <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#202020] px-4 text-sm text-gray-200 hover:border-white/20">
            {resource.storage_path ? <Download size={15} /> : <ExternalLink size={15} />} {resource.storage_path ? "Open / download" : "Open link"}
          </a>
        )}

        {isManager && (
          <div className="ml-auto flex gap-1">
            <button type="button" onClick={onPin} className="rounded-lg p-2.5 text-gray-400 hover:bg-white/5 hover:text-[#3B82F6]" aria-label="Pin" title={resource.pinned ? "Unpin" : "Pin to top"}>
              <Star size={16} fill={resource.pinned ? "#F5C518" : "none"} className={resource.pinned ? "text-[#3B82F6]" : ""} />
            </button>
            <button type="button" onClick={onEdit} className="rounded-lg p-2.5 text-gray-400 hover:bg-white/5 hover:text-white" aria-label="Edit"><Pencil size={16} /></button>
            <button type="button" onClick={onDelete} className="rounded-lg p-2.5 text-gray-400 hover:bg-[#F22F46]/10 hover:text-[#F22F46]" aria-label="Delete"><Trash2 size={16} /></button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ResourceEditor({
  value,
  folders,
  companyId,
  onClose,
  onSaved,
  flash,
}: {
  value: Partial<Resource>;
  folders: Folder[];
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
  flash: (message: string) => void;
}) {
  const [draft, setDraft] = useState<Partial<Resource>>(value);
  const [mode, setMode] = useState<"upload" | "link" | "text">(value.kind === "text" ? "text" : value.url && !value.storage_path ? "link" : "upload");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [tagText, setTagText] = useState((value.tags ?? []).join(", "));
  const fileInput = useRef<HTMLInputElement>(null);

  function pickFile(next: File | null) {
    if (!next) return;
    if (next.size > MAX_BYTES) {
      flash("Files up to 50 MB. For longer videos, upload them to YouTube (unlisted), Loom or Vimeo and add the link.");
      return;
    }
    setFile(next);
    setDraft((current) => ({ ...current, title: current.title || next.name.replace(/\.[^.]+$/, ""), kind: kindFromFile(next) }));
  }

  async function save() {
    if (!draft.title?.trim()) return flash("Add a title.");
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        title: draft.title.trim(),
        description: draft.description?.trim() || null,
        folder_id: draft.folder_id || null,
        tags: tagText.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean).slice(0, 8),
        updated_at: new Date().toISOString(),
      };

      if (mode === "text") {
        if (!draft.body?.trim()) throw new Error("Write the script or text.");
        Object.assign(payload, { kind: "text", body: draft.body, url: null });
      } else if (mode === "link") {
        if (!draft.url?.trim()) throw new Error("Paste a link.");
        let url = draft.url.trim();
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        const kind: Kind = embedUrl(url) && /youtu|vimeo|loom/.test(url) ? "video" : (draft.kind === "document" && /drive\.google|docs\.google/.test(url)) ? "document" : "link";
        Object.assign(payload, { kind, url, body: null });
      } else if (file) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
        const path = `${companyId}/${crypto.randomUUID()}-${safe}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined });
        if (error) throw new Error(error.message);
        if (draft.storage_path) await supabase.storage.from(BUCKET).remove([draft.storage_path]);
        Object.assign(payload, {
          kind: kindFromFile(file),
          storage_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
          url: null,
          body: null,
        });
      } else if (!draft.id) {
        throw new Error("Choose a file to upload.");
      }

      const { error } = draft.id
        ? await supabase.from("resources").update(payload).eq("id", draft.id)
        : await supabase.from("resources").insert({ ...payload, company_id: companyId });
      if (error) throw new Error(error.message);

      onSaved();
    } catch (error) {
      flash(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: typeof mode; label: string; icon: typeof Upload }[] = [
    { id: "upload", label: "Upload file", icon: Upload },
    { id: "link", label: "Video / link", icon: Link2 },
    { id: "text", label: "Write script", icon: Sparkles },
  ];

  return (
    <Modal title={draft.id ? "Edit resource" : "Add resource"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${mode === tab.id ? "border-[#3B82F6] bg-[#3B82F6]/10 text-[#3B82F6]" : "border-[#202020] text-gray-400 hover:border-white/20"}`}
              >
                <Icon size={17} /> {tab.label}
              </button>
            );
          })}
        </div>

        {mode === "upload" && (
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              pickFile(event.dataTransfer.files?.[0] ?? null);
            }}
            onClick={() => fileInput.current?.click()}
            className="cursor-pointer rounded-xl border border-dashed border-white/15 p-6 text-center transition hover:border-[#3B82F6]/40"
          >
            <Upload size={22} className="mx-auto text-gray-500" />
            <p className="mt-2 text-sm text-gray-300">{file ? file.name : draft.file_name ? `Current: ${draft.file_name}` : "Drop a file or click to choose"}</p>
            <p className="mt-1 text-xs text-gray-600">PDF, Word, PowerPoint, Excel, images or videos · up to 50 MB</p>
            <input ref={fileInput} type="file" className="hidden" onChange={(event) => pickFile(event.target.files?.[0] ?? null)} />
          </div>
        )}

        {mode === "link" && (
          <div>
            <input className={input} placeholder="YouTube, Loom, Vimeo, Google Drive or any link" value={draft.url ?? ""} onChange={(event) => setDraft({ ...draft, url: event.target.value })} />
            <p className="mt-1.5 text-xs text-gray-600">Videos from YouTube, Loom and Vimeo play right inside BaseLead.</p>
          </div>
        )}

        {mode === "text" && (
          <textarea
            className="min-h-[200px] w-full rounded-xl border border-[#202020] bg-[#101010] p-3 text-sm leading-6 text-white outline-none focus:border-[#3B82F6]/50"
            placeholder="Write a sales pitch, call script, objection answers, email template…"
            value={draft.body ?? ""}
            onChange={(event) => setDraft({ ...draft, body: event.target.value })}
          />
        )}

        <input className={input} placeholder="Title" value={draft.title ?? ""} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        <input className={input} placeholder="Short description (optional)" value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />

        <div className="grid gap-3 sm:grid-cols-2">
          <select className={input} value={draft.folder_id ?? ""} onChange={(event) => setDraft({ ...draft, folder_id: event.target.value || null })}>
            <option value="">No folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.emoji} {folder.name}</option>
            ))}
          </select>
          <input className={input} placeholder="Tags: pitch, onboarding" value={tagText} onChange={(event) => setTagText(event.target.value)} />
        </div>

        <button type="button" onClick={() => void save()} disabled={saving} className="h-11 w-full rounded-xl bg-[#3B82F6] text-sm font-semibold text-white hover:bg-[#2F74E8] disabled:opacity-40">
          {saving ? "Saving…" : "Save resource"}
        </button>
      </div>
    </Modal>
  );
}
