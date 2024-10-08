import dedent from "dedent";
import { type Client } from "pg";
import { DatabaseClient } from "#core/databaseClient.js";
import { type Adapter } from "../types.js";

export class SeedPg extends DatabaseClient<Client> {
  async execute(query: string): Promise<void> {
    await this.client.query(query);
  }

  async query<K = object>(query: string): Promise<Array<K>> {
    const { rows } = await this.client.query(query);
    return rows as Array<K>;
  }
}

export const pgAdapter = {
  getDialect: () => "postgres",
  id: "pg" as const,
  name: "node-postgres",
  packageName: "pg",
  typesPackageName: "@types/pg",
  template: (parameters = `/* connection parameters */`) => dedent`
    import { SeedPg } from "@snaplet/seed/adapter-pg";
    import { defineConfig } from "@snaplet/seed/config";
    import { Client } from "pg";

    export default defineConfig({
      adapter: async () => {
        const client = new Client(${parameters});
        await client.connect();
        return new SeedPg(client);
      },
    });
  `,
} satisfies Adapter;
