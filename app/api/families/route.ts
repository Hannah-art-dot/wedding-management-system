import { NextRequest, NextResponse } from "next/server";
import { familyCreateSchema } from "@/lib/guest-schemas";
import { createFamily, listFamilies } from "@/services/guest-registration";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const families = await listFamilies();
    return NextResponse.json({ success: true, families });
  } catch (err) {
    console.error("List families failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not load families." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = familyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Validation failed.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const family = await createFamily(parsed.data);
    return NextResponse.json({
      success: true,
      message: "Family created.",
      familyId: family.id,
      family,
    });
  } catch (err) {
    console.error("Create family failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not create family." },
      { status: 500 },
    );
  }
}
