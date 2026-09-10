#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/57ff5ac5b449091e6063e18b046f7eb5740a88592ab044a246e986cb54e2ebe2/contract';
import endContract from '../../snapshots/57ff5ac5b449091e6063e18b046f7eb5740a88592ab044a246e986cb54e2ebe2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e55239412ed96f9bbf66a9a7090e4895791a92380d5b053c35c9d1446cd179a2/contract';
import startContract from '../../snapshots/e55239412ed96f9bbf66a9a7090e4895791a92380d5b053c35c9d1446cd179a2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, rawSql } from '@prisma/orm-postgres/migration';

const columnExistsSql = (column: string) =>
  `SELECT EXISTS (
     SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'user'
       AND column_name = '${column}'
   ) AS result`;

const columnAbsentSql = (column: string) =>
  `SELECT NOT EXISTS (
     SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'user'
       AND column_name = '${column}'
   ) AS result`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    // Planner emits drop+add for renames; replace with a data-preserving RENAME COLUMN.
    return [
      rawSql({
        id: 'renameColumn.user.passwordHash.password',
        label: 'Rename column "passwordHash" to "password" on "user"',
        operationClass: 'widening',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'column',
            name: 'password',
            table: 'user',
          },
        },
        precheck: [
          {
            description: 'ensure column "passwordHash" exists',
            sql: columnExistsSql('passwordHash'),
          },
          {
            description: 'ensure column "password" does not exist',
            sql: columnAbsentSql('password'),
          },
        ],
        execute: [
          {
            description: 'rename column "passwordHash" to "password"',
            sql: 'ALTER TABLE "public"."user" RENAME COLUMN "passwordHash" TO "password"',
          },
        ],
        postcheck: [
          {
            description: 'verify column "password" exists',
            sql: columnExistsSql('password'),
          },
          {
            description: 'verify column "passwordHash" does not exist',
            sql: columnAbsentSql('passwordHash'),
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
