import type { Knex } from "knex";

// Update with your config settings.

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "sqlite3",
    connection: {
      filename: "./dev.sqlite3"
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/migrations/',
      tableName: '__migrations__'
    },
    seeds: {
      directory: './src/migrations/seeds/development'
    }
  },
 
};

export default config;
