CREATE TABLE `zoo_contests` (
	`code` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`count` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zoo_entries` (
	`code` text NOT NULL,
	`player` text NOT NULL,
	`next` integer DEFAULT 0 NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`seconds` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`code`, `player`)
);
--> statement-breakpoint
CREATE TABLE `zoo_players` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zoo_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `zoo_rounds` (
	`code` text NOT NULL,
	`player` text NOT NULL,
	`idx` integer NOT NULL,
	`started` integer NOT NULL,
	`nonce` text NOT NULL,
	`bank` integer NOT NULL,
	`finished` integer,
	`points` integer,
	`seconds` integer,
	`errors` integer,
	`hints` integer,
	PRIMARY KEY(`code`, `player`, `idx`)
);
