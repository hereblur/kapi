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
    },
    useNullAsDefault: true,
  },
  production: {
    client: "mysql",
    connection: {
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: "./src/migrations",
      tableName: "knex_migrations"
    },
    seeds: {
      
    }
  }
 
};

export default config;
