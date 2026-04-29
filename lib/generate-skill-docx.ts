/**
 * Generates a .docx Blob from structured skill document data.
 * Uses the `docx` npm package (browser-compatible via Packer.toBlob).
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from "docx";

export interface SkillDocData {
  name: string;
  role: string;
  summary: string;
  skills: string[];         // e.g. ["Contract Drafting", "IPC Analysis"]
  experience: string;       // free text
  education: string;        // free text
  contact: string;
}

/** Returns a File object (named file.docx) ready for SuperDoc */
export async function generateSkillDocx(data: SkillDocData): Promise<File> {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
      },
    },
    sections: [
      {
        children: [
          // ── Title
          new Paragraph({
            text: data.name || "Professional Profile",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),

          // ── Role
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: data.role,
                color: "7C3AED",
                bold: true,
                size: 26,
              }),
            ],
          }),

          // ── Contact
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [new TextRun({ text: data.contact, color: "6B7280", size: 18 })],
          }),

          // ── Section: Summary
          sectionHeading("Professional Summary"),
          new Paragraph({
            text: data.summary,
            spacing: { after: 300 },
          }),

          // ── Section: Skills (table 2 cols)
          sectionHeading("Core Skills"),
          buildSkillsTable(data.skills),

          // ── Section: Experience
          sectionHeading("Experience"),
          ...data.experience.split("\n").map(
            (line) =>
              new Paragraph({
                text: line,
                bullet: line.trim().startsWith("-")
                  ? undefined
                  : undefined,
                spacing: { after: 80 },
              })
          ),

          // ── Section: Education
          sectionHeading("Education"),
          ...data.education.split("\n").map(
            (line) =>
              new Paragraph({ text: line, spacing: { after: 80 } })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  return new File([blob], "skill-document.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

// ── Helpers ─────────────────────────────────────────────────────

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "A855F7" },
    },
  });
}

function buildSkillsTable(skills: string[]): Table {
  const mid = Math.ceil(skills.length / 2);
  const left = skills.slice(0, mid);
  const right = skills.slice(mid);
  const rowCount = mid;

  const rows = Array.from({ length: rowCount }, (_, i) =>
    new TableRow({
      children: [
        skillCell(left[i] || ""),
        skillCell(right[i] || ""),
      ],
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    margins: { top: 80, bottom: 200 },
  });
}

function skillCell(text: string): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, color: "F5F3FF" },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: text ? `✦ ${text}` : "", size: 20 }),
        ],
        spacing: { before: 60, after: 60 },
      }),
    ],
  });
}
