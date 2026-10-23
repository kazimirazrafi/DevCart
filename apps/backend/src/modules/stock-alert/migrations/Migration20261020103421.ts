import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261020103421 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "stock_alert" drop constraint if exists "stock_alert_inventory_item_id_location_id_unique";`);
    this.addSql(`create table if not exists "stock_alert" ("id" text not null, "inventory_item_id" text not null, "location_id" text not null, "quantity" integer not null, "alerted_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_alert_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_alert_deleted_at" ON "stock_alert" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_alert_inventory_item_id_location_id_unique" ON "stock_alert" ("inventory_item_id", "location_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_alert" cascade;`);
  }

}
