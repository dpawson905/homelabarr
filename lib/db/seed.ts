import { eq, count } from "drizzle-orm";
import { db } from "./index";
import { boards, settings } from "./schema";

function seed() {
  console.log("Seeding database...");

  // Check if any boards exist
  const boardRows = db.select({ count: count() }).from(boards).all();
  const boardCount = boardRows[0].count;

  if (boardCount === 0) {
    // Insert the default board
    const inserted = db
      .insert(boards)
      .values({ name: "Default Board", position: 0 })
      .returning()
      .all();
    const defaultBoard = inserted[0];

    console.log(`Created default board: ${defaultBoard.id}`);

    // Insert the defaultBoardId setting if it doesn't exist
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
  } else {
    console.log(
      `Skipping seed: ${boardCount} board(s) already exist.`
    );
  }

  console.log("Seed complete.");
}

seed();
