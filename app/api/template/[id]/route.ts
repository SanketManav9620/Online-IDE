import { readTemplateStructureFromJson, saveTemplateStructureToJson } from "@/features/playground/libs/path-to-json";
import { db } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import path from "path";
import fs from "fs/promises";
import { NextRequest } from "next/server";

// Helper function to ensure valid JSON
function validateJsonStructure(data: unknown): boolean {
  try {
    JSON.parse(JSON.stringify(data)); // Ensures it's serializable
    return true;
  } catch (error) {
    console.error("Invalid JSON structure:", error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const param = await params;
  const id = param?.id;

  if (!id || id === "undefined") {
    return Response.json({ error: "Missing or invalid playground ID" }, { status: 400 });
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
    const relativeTemplatePath = templatePaths[templateKey];
    const inputPath = path.join(process.cwd(), relativeTemplatePath);
    const outputDir = path.join(process.cwd(), "output");
    const outputFile = path.join(outputDir, `${templateKey}.json`);

    await fs.mkdir(outputDir, { recursive: true });

    // Save and read the template structure
    await saveTemplateStructureToJson(inputPath, outputFile);
    const result = await readTemplateStructureFromJson(outputFile);

    // Validate the JSON structure before returning
    if (!validateJsonStructure(result.items)) {
      return Response.json({ error: "Invalid JSON structure" }, { status: 500 });
    }

    try {
      await fs.unlink(outputFile);
    } catch {
      // Ignore cleanup error
    }

    return Response.json({ success: true, templateJson: result }, { status: 200 });
  } catch (error) {
    console.error("Error generating template JSON:", error);
    return Response.json({ error: "Failed to generate template" }, { status: 500 });
  }
}


