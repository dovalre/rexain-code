import { NextResponse } from "next/server";
import { getSession } from '@/lib/db/queries';
import { getUserGitHubToken } from "@/lib/github/token";
import { fetchGitHubOrgs } from "@/lib/github/users";

export async function GET() {
  const session = await getSession();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "GitHub not connected" },
      { status: 401 },
    );
  }

  const token = await getUserGitHubToken(session.user.id);

  if (!token) {
    return NextResponse.json(
      { error: "GitHub not connected" },
      { status: 401 },
    );
  }

  try {
    const orgs = await fetchGitHubOrgs(token);

    if (!orgs) {
      return NextResponse.json(
        { error: "Failed to fetch organizations" },
        { status: 500 },
      );
    }

    return NextResponse.json(orgs);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 },
    );
  }
}