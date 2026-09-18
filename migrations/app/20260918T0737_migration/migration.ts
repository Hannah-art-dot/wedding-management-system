#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/b4fbe6137542589e89e3e3ad7d08a3791cc4ee6c278894128e299c04671d9ddf/contract';
import startContract from '../../snapshots/b4fbe6137542589e89e3e3ad7d08a3791cc4ee6c278894128e299c04671d9ddf/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c43cfd2cc51700c3550a79567e290043d83cadb19253dbe6359993c58d675c9d/contract';
import endContract from '../../snapshots/c43cfd2cc51700c3550a79567e290043d83cadb19253dbe6359993c58d675c9d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'importBatch',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fileName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rowCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('familyStatus', 'text', {
          default: lit('Individual'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('importBatchId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_importBatchId_idx_172660b3',
        columns: ['importBatchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'importBatch',
        index: 'importBatch_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'guest',
        foreignKey: {
          name: 'guest_importBatchId_fkey',
          columns: ['importBatchId'],
          references: { schema: 'public', table: 'importBatch', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
