#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7af09fe1767b89ce55dce93017a693f90fb79e137dcda78e5b69fae2139a9d81/contract';
import startContract from '../../snapshots/7af09fe1767b89ce55dce93017a693f90fb79e137dcda78e5b69fae2139a9d81/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/b4fbe6137542589e89e3e3ad7d08a3791cc4ee6c278894128e299c04671d9ddf/contract';
import endContract from '../../snapshots/b4fbe6137542589e89e3e3ad7d08a3791cc4ee6c278894128e299c04671d9ddf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('cardStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'guest',
        constraint: 'guest_cardStatus_check_d583545f',
        expression: "\"cardStatus\" IN ('With Card', 'Without Card')",
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_cardStatus_idx_265e0b62',
        columns: ['cardStatus'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
