import {sqliteTable,text,uniqueIndex} from "drizzle-orm/sqlite-core";
export const books=sqliteTable("books",{id:text("id").primaryKey(),owner:text("owner").notNull(),registration:text("registration").notNull(),data:text("data").notNull()},t=>[uniqueIndex("books_owner_registration").on(t.owner,t.registration)]);
export const loans=sqliteTable("loans",{id:text("id").primaryKey(),owner:text("owner").notNull(),data:text("data").notNull()});
export const users=sqliteTable('users',{id:text('id').primaryKey(),username:text('username').notNull().unique(),owner:text('owner').notNull(),salt:text('salt').notNull(),hash:text('hash').notNull(),role:text('role').notNull().default('bibliotecario')});
export const sessions=sqliteTable('sessions',{token_hash:text('token_hash').primaryKey(),user_id:text('user_id').notNull(),expires:text('expires').notNull()});
export const attempts=sqliteTable('attempts',{key:text('key').primaryKey(),count:text('count').notNull(),until:text('until').notNull()});
