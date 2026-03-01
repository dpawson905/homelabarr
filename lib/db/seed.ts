import { eq, count } from "drizzle-orm";
import { db } from "@/lib/db/index";
import { boards, settings } from "@/lib/db/schema";

function seed(): void {
  console.log("Seeding database...");

  const [{ count: boardCount }] = db.select({ count: count() }).from(boards).all();

  if (boardCount > 0) {
    console.log(`Skipping seed: ${boardCount} board(s) already exist.`);
    console.log("Seed complete.");
    return;
  }

  const [defaultBoard] = db
    .insert(boards)
    .values({ name: "Default Board", position: 0 })
    .returning()
    .all();

  console.log(`Created default board: ${defaultBoard.id}`);

  const existingSetting = db
    .select()
    .from(settings)
    .where(eq(settings.key, "defaultBoardId"))
    .get();

  if (!existingSetting) {
    db.insert(settings)
      .values({ key: "defaultBoardId", value: defaultBoard.id })
      .run();

    console.log(`Set defaultBoardId setting to: ${defaultBoard.id}`);
  }

  console.log("Seed complete.");
}

seed();
