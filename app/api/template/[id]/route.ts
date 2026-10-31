import { db } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import templatesData from "@/lib/templates-data.json";
import { scanTemplateDirectory } from "@/features/playground/libs/path-to-json";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const param = await params;
  const id = param?.id;

  if (!id || id === "undefined") {
    return NextResponse.json({ error: "Missing or invalid playground ID" }, { status: 400 });
  }

  let templateKey: keyof typeof templatePaths | undefined;

  // 1. Check if ID itself is a template key (e.g. REACT, react, NEXTJS, VUE, etc.)
  const upperId = id.toUpperCase() as keyof typeof templatePaths;
  if (templatePaths[upperId]) {
    templateKey = upperId;
  } else {
    // 2. Otherwise try querying DB for playground template
    try {
      const playground = await db.playground.findUnique({
        where: { id },
      });

      if (playground && playground.template) {
        templateKey = playground.template as keyof typeof templatePaths;
      }
    } catch (error) {
      console.warn("Database lookup skipped or failed in template API:", error);
    }
  }

  // Fallback to REACT if templateKey not resolved
  if (!templateKey || !templatePaths[templateKey]) {
    templateKey = "REACT";
  }

  try {
    // 1. Instant check: bundled pre-generated template data (zero disk I/O, serverless-safe)
    const bundledTemplate = (templatesData as Record<string, unknown>)[templateKey];
    if (bundledTemplate) {
      return NextResponse.json({ success: true, templateJson: bundledTemplate }, { status: 200 });
    }

    // 2. Fallback: in-memory directory scan without writing to read-only disk
    const relativeTemplatePath = templatePaths[templateKey];
    const inputPath = path.join(process.cwd(), relativeTemplatePath);
    const result = await scanTemplateDirectory(inputPath);

    return NextResponse.json({ success: true, templateJson: result }, { status: 200 });
  } catch (error) {
    console.error("Error retrieving template JSON:", error);
    return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
  }
}
