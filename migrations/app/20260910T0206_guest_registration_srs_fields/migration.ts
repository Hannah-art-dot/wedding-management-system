#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/57ff5ac5b449091e6063e18b046f7eb5740a88592ab044a246e986cb54e2ebe2/contract';
import startContract from '../../snapshots/57ff5ac5b449091e6063e18b046f7eb5740a88592ab044a246e986cb54e2ebe2/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7af09fe1767b89ce55dce93017a693f90fb79e137dcda78e5b69fae2139a9d81/contract';
import endContract from '../../snapshots/7af09fe1767b89ce55dce93017a693f90fb79e137dcda78e5b69fae2139a9d81/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'ticket',
        constraint: 'ticket_status_check_e32863d7',
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('numberAttending', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'spouse',
        column: col('ticketStatus', 'text', {
          notNull: true,
          default: lit('NOT_ISSUED'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'spouse',
        constraint: 'spouse_ticketStatus_check_9dfe8b79',
        expression:
          "\"ticketStatus\" IN ('NOT_ISSUED', 'ISSUED', 'UNUSED', 'PARTIAL', 'USED', 'LOST', 'CANCELLED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'ticket',
        constraint: 'ticket_status_check_56bbfcab',
        expression:
          "\"status\" IN ('NOT_ISSUED', 'ISSUED', 'UNUSED', 'PARTIAL', 'USED', 'LOST', 'CANCELLED')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
