import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

function now(): string {
  return new Date().toISOString();
}

// ─── Boards ──────────────────────────────────────────────────────────────────

export const boards = sqliteTable("boards", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  icon: text("icon"),
  position: integer("position").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

// ─── Widgets ─────────────────────────────────────────────────────────────────

export const widgets = sqliteTable("widgets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  x: integer("x").notNull().default(0),
  y: integer("y").notNull().default(0),
  w: integer("w").notNull().default(1),
  h: integer("h").notNull().default(1),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

// ─── Widget Configs ──────────────────────────────────────────────────────────

export const widgetConfigs = sqliteTable("widget_configs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  widgetId: text("widget_id")
    .notNull()
    .unique()
    .references(() => widgets.id, { onDelete: "cascade" }),
  config: text("config").notNull().default("{}"),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

// ─── Apps ────────────────────────────────────────────────────────────────────

export const apps = sqliteTable("apps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  url: text("url").notNull(),
  icon: text("icon"),
  description: text("description"),
  statusCheckEnabled: integer("status_check_enabled").notNull().default(0),
  statusCheckInterval: integer("status_check_interval").notNull().default(300),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

// ─── Settings ────────────────────────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

// ─── Sessions ───────────────────────────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(now),
});

// ─── Secrets ────────────────────────────────────────────────────────────────

export const secrets = sqliteTable("secrets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  encryptedValue: text("encrypted_value").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull().$defaultFn(now),
  updatedAt: text("updated_at").notNull().$defaultFn(now),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const boardsRelations = relations(boards, ({ many }) => ({
  widgets: many(widgets),
}));

export const widgetsRelations = relations(widgets, ({ one }) => ({
  board: one(boards, {
    fields: [widgets.boardId],
    references: [boards.id],
  }),
  config: one(widgetConfigs, {
    fields: [widgets.id],
    references: [widgetConfigs.widgetId],
  }),
}));

export const widgetConfigsRelations = relations(widgetConfigs, ({ one }) => ({
  widget: one(widgets, {
    fields: [widgetConfigs.widgetId],
    references: [widgets.id],
  }),
}));

// ─── Types ───────────────────────────────────────────────────────────────────

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;

export type Widget = typeof widgets.$inferSelect;
export type NewWidget = typeof widgets.$inferInsert;

export type WidgetConfig = typeof widgetConfigs.$inferSelect;
export type NewWidgetConfig = typeof widgetConfigs.$inferInsert;

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Secret = typeof secrets.$inferSelect;
export type NewSecret = typeof secrets.$inferInsert;
