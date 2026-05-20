import { NextResponse } from "next/server";
import { getUpcomingEvents } from "@/lib/events";

export async function GET() {
  try {
    const upcomingEvents = await getUpcomingEvents();
    return NextResponse.json(upcomingEvents, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
