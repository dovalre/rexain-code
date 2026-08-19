import { NextResponse } from "next/server";
import { getSession } from '@/lib/db/queries';
import { getUserGitHubToken } from "@/lib/github/token";
import { fetchGitHubUser } from "@/lib/github/users";

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
    const user = await fetchGitHubUser(token);

    if (!user) {
      return NextResponse.json(
        { error: "Failed to fetch user" },
        { status: 500 },
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching GitHub user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 },
    );
  }
}