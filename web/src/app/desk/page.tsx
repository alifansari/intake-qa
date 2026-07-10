import { redirect } from "next/navigation";

// Bare /desk → the home screen. One address to remember.
export default function DeskIndex() {
  redirect("/desk/queue");
}
