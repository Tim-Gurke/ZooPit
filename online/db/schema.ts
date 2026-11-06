import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
export const players = sqliteTable("zoo_players", {
  id: text("id").primaryKey(), name: text("name").notNull(),
  created: integer("created").notNull(),
});
export const contests = sqliteTable("zoo_contests", {
  code: text("code").primaryKey(), host: text("host").notNull(),
  count: integer("count").notNull(), created: integer("created").notNull(),
  puzzles: text("puzzles").notNull().default("[]"),
});
export const entries = sqliteTable("zoo_entries", {
  code: text("code").notNull(), player: text("player").notNull(),
  next: integer("next").notNull().default(0), points: integer("points").notNull().default(0),
  seconds: integer("seconds").notNull().default(0),
}, t => [primaryKey({columns:[t.code,t.player]})]);
export const rounds = sqliteTable("zoo_rounds", {
  code: text("code").notNull(), player: text("player").notNull(),
  index: integer("idx").notNull(), started: integer("started").notNull(),
  nonce: text("nonce").notNull(), bank: integer("bank").notNull(),
  finished: integer("finished"), points: integer("points"), seconds: integer("seconds"),
  errors: integer("errors"), hints: integer("hints"),
}, t => [primaryKey({columns:[t.code,t.player,t.index]})]);
export const rateLimits = sqliteTable("zoo_limits", {
  key: text("key").primaryKey(), count: integer("count").notNull(), expires: integer("expires").notNull(),
});
