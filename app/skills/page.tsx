"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import "@superdoc-dev/react/style.css";
import {
  FileText,
  Sparkles,
  User,
  Briefcase,
  BookOpen,
  Phone,
  Tag,
  Plus,
  X,
  ChevronRight,
} from "lucide-react";
import { generateSkillDocx, type SkillDocData } from "@/lib/generate-skill-docx";
import { cn } from "@/lib/utils";

// SuperDoc must be loaded client-only (no SSR)
const SuperDocEditor = dynamic(
  () => import("@superdoc-dev/react").then((m) => m.SuperDocEditor),
  { ssr: false, loading: () => <EditorPlaceholder /> }
);

// ── Placeholder while editor loads ────────────────────────────
function EditorPlaceholder() {
  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-50 rounded-2xl border border-zinc-200 min-h-[500px]">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <div className="h-10 w-10 rounded-full border-4 border-violet-300 border-t-violet-600 animate-spin" />
        <p className="text-sm">Loading editor…</p>
      </div>
    </div>
  );
}

// ── Small field wrapper ────────────────────────────────────────
function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5 text-violet-500" />
        {label}
      </label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all";

// ── Main page ──────────────────────────────────────────────────
export default function SkillsPage() {
  const [form, setForm] = useState<SkillDocData>({
    name: "",
    role: "",
    summary: "",
    skills: [""],
    experience: "",
    education: "",
    contact: "",
  });

  const [docFile, setDocFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof SkillDocData, val: string | string[]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const addSkill = () => set("skills", [...form.skills, ""]);
  const removeSkill = (i: number) =>
    set("skills", form.skills.filter((_, idx) => idx !== i));
  const updateSkill = (i: number, val: string) => {
    const updated = [...form.skills];
    updated[i] = val;
    set("skills", updated);
  };

  const handleGenerate = useCallback(async () => {
    if (!form.name.trim() || !form.role.trim()) {
      setError("Name and Role are required.");
      return;
    }
    setError("");
    setGenerating(true);
    setDocFile(null);
    try {
      const file = await generateSkillDocx({
        ...form,
        skills: form.skills.filter(Boolean),
      });
      setDocFile(file);
    } catch (e: any) {
      setError(e?.message || "Failed to generate document.");
    } finally {
      setGenerating(false);
    }
  }, [form]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f7f9]">
      {/* ── Left panel: form ── */}
      <aside className="w-[340px] shrink-0 flex flex-col border-r border-zinc-200 bg-white overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-5 border-b border-zinc-100">
          <div className="flex items-center gap-2 mb-0.5">
            <FileText className="h-5 w-5 text-violet-600" />
            <h1 className="text-base font-bold text-zinc-900">Skills Document</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Fill in the details below and generate an editable Word document.
          </p>
        </div>

        {/* Form body */}
        <form
          className="flex-1 flex flex-col gap-5 px-5 py-5"
          onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}
        >
          <Field label="Full Name" icon={User}>
            <input
              className={INPUT}
              placeholder="e.g. Ajit Kumar Pandit"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>

          <Field label="Role / Designation" icon={Briefcase}>
            <input
              className={INPUT}
              placeholder="e.g. Senior Advocate, High Court"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
            />
          </Field>

          <Field label="Contact" icon={Phone}>
            <input
              className={INPUT}
              placeholder="email · phone · city"
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </Field>

          <Field label="Professional Summary" icon={Sparkles}>
            <textarea
              className={cn(INPUT, "resize-none h-24")}
              placeholder="A brief professional overview…"
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
            />
          </Field>

          {/* Skills list */}
          <Field label="Core Skills" icon={Tag}>
            <div className="flex flex-col gap-1.5">
              {form.skills.map((skill, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    className={cn(INPUT, "flex-1")}
                    placeholder={`Skill ${i + 1}`}
                    value={skill}
                    onChange={(e) => updateSkill(i, e.target.value)}
                  />
                  {form.skills.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSkill(i)}
                      className="rounded-lg p-2 hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSkill}
                className="flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium mt-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add skill
              </button>
            </div>
          </Field>

          <Field label="Experience" icon={Briefcase}>
            <textarea
              className={cn(INPUT, "resize-none h-28")}
              placeholder={"2020–Present: Senior Advocate, Delhi HC\nDrafted 200+ petitions…"}
              value={form.experience}
              onChange={(e) => set("experience", e.target.value)}
            />
          </Field>

          <Field label="Education" icon={BookOpen}>
            <textarea
              className={cn(INPUT, "resize-none h-20")}
              placeholder={"LLB, Delhi University, 2018\nBA (Hons) Political Science, 2015"}
              value={form.education}
              onChange={(e) => set("education", e.target.value)}
            />
          </Field>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={generating}
            className={cn(
              "mt-auto flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all",
              generating
                ? "bg-violet-400 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-700 active:bg-violet-800 shadow-sm"
            )}
          >
            {generating ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Document
                <ChevronRight className="h-4 w-4 opacity-60" />
              </>
            )}
          </button>
        </form>
      </aside>

      {/* ── Right panel: editor ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 bg-white flex items-center gap-3 shrink-0">
          <FileText className="h-4 w-4 text-violet-500" />
          <h2 className="text-sm font-semibold text-zinc-700">
            {docFile ? "skill-document.docx — Edit below" : "Document Preview"}
          </h2>
          {docFile && (
            <a
              href={URL.createObjectURL(docFile)}
              download="skill-document.docx"
              className="ml-auto text-xs text-violet-600 hover:text-violet-700 font-medium border border-violet-200 rounded-lg px-3 py-1 hover:bg-violet-50 transition-colors"
            >
              ⬇ Download .docx
            </a>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {!docFile ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
              <FileText className="h-16 w-16 text-zinc-200" />
              <p className="text-sm font-medium">
                Fill in the form and click <span className="text-violet-600 font-semibold">Generate Document</span>
              </p>
              <p className="text-xs">Your Word document will appear here, ready to edit.</p>
            </div>
          ) : (
            <div className="h-full rounded-2xl overflow-hidden border border-zinc-200 bg-white shadow-sm">
              <SuperDocEditor
                document={docFile}
                documentMode="editing"
                role="editor"
                user={{ name: "User", email: "user@advoai.in" }}
                onReady={() => console.log("SuperDoc editor ready")}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
