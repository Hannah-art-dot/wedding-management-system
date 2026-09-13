import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { familyMemberInputSchema } from "@/lib/guest-schemas";
import { addFamilyMembers, getFamilyDetail } from "@/services/guest-registration";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const detail = await getFamilyDetail(id);
    if (!detail) {
      return NextResponse.json({ success: false, error: "Family not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...detail });
  } catch (err) {
    console.error("Family detail failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not load family." },
      { status: 500 },
    );
  }
}

const addMembersSchema = z.object({
  members: z.array(familyMemberInputSchema).min(1),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = addMembersSchema.safeParse(body);
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
    const detail = await getFamilyDetail(id);
    if (!detail) {
      return NextResponse.json({ success: false, error: "Family not found." }, { status: 404 });
    }
    const created = await addFamilyMembers(id, parsed.data.members);
    return NextResponse.json({
      success: true,
      message: `Added ${created.length} family member(s).`,
      members: created,
    });
  } catch (err) {
    console.error("Add family members failed:", err);
    return NextResponse.json(
      { success: false, error: "Could not add family members." },
      { status: 500 },
    );
  }
}
