#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/da34d70bb5a0db7a7b160d7a75db8e7997473c38493c72facacca6698ed3a010/contract';
import startContract from '../../snapshots/da34d70bb5a0db7a7b160d7a75db8e7997473c38493c72facacca6698ed3a010/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e55239412ed96f9bbf66a9a7090e4895791a92380d5b053c35c9d1446cd179a2/contract';
import endContractJson from '../../snapshots/e55239412ed96f9bbf66a9a7090e4895791a92380d5b053c35c9d1446cd179a2/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import postgresStatic from '@prisma/orm-postgres/static';

// postgresStatic wires SqlOptions correctly (context + rawCodecInferer).
const { sql: sqlDb, contract: endContract } = postgresStatic<End>({
  contractJson: endContractJson,
});

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContractJson;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'guest', column: 'ticketNumber' }),
      // Keep legacy "password" until passwordHash is backfilled (see below).
      this.createTable({
        schema: 'public',
        table: 'auditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('metadata', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('recordId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('recordType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('timestamp', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'family',
        columns: [
          col('contactPerson', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deletedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('familyName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('side', 'text', {
            notNull: true,
            default: lit('NEUTRAL'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'family_side_check_625a2b64',
            "\"side\" IN ('BRIDE', 'GROOM', 'NEUTRAL')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'familyMember',
        columns: [
          col('age', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('attendanceStatus', 'text', {
            notNull: true,
            default: lit('NOT_ARRIVED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('checkedInAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('checkedInByUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deletedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('familyId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('relationship', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rsvpReceivedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('rsvpStatus', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'familyMember_attendanceStatus_check_bb131219',
            "\"attendanceStatus\" IN ('NOT_ARRIVED', 'ARRIVED', 'NO_SHOW')",
          ),
          checkExpression(
            'familyMember_rsvpStatus_check_b3adaca7',
            "\"rsvpStatus\" IN ('PENDING', 'CONFIRMED', 'DECLINED', 'MAYBE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'spouse',
        columns: [
          col('attendanceStatus', 'text', {
            notNull: true,
            default: lit('NOT_ARRIVED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('checkedInAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('checkedInByUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deletedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('gender', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('guestId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('rsvpReceivedAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('rsvpStatus', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'spouse_attendanceStatus_check_bb131219',
            "\"attendanceStatus\" IN ('NOT_ARRIVED', 'ARRIVED', 'NO_SHOW')",
          ),
          checkExpression(
            'spouse_gender_check_35ac3b49',
            "\"gender\" IN ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED')",
          ),
          checkExpression(
            'spouse_rsvpStatus_check_b3adaca7',
            "\"rsvpStatus\" IN ('PENDING', 'CONFIRMED', 'DECLINED', 'MAYBE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'ticket',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deletedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('familyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('guestId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('issueDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('numberAllowed', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('numberUsed', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('NOT_ISSUED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ticketNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('usedDate', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('ticket_number_allowed_positive_20b020ee', '"numberAllowed" >= 1'),
          checkExpression(
            'ticket_number_used_range_904fe635',
            '"numberUsed" >= 0 AND "numberUsed" <= "numberAllowed"',
          ),
          checkExpression(
            'ticket_owner_xor_480c5419',
            '("familyId" IS NOT NULL AND "guestId" IS NULL) OR ("familyId" IS NULL AND "guestId" IS NOT NULL)',
          ),
          checkExpression(
            'ticket_status_check_e32863d7',
            "\"status\" IN ('NOT_ISSUED', 'ISSUED', 'PARTIAL', 'USED', 'LOST', 'CANCELLED')",
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('attendanceStatus', 'text', {
          notNull: true,
          default: lit('NOT_ARRIVED'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('category', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('checkedInAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('checkedInByUserId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('familyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('gender', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('rsvpReceivedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('specialNotes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'guest',
        column: col('updatedAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('status', 'text', {
          notNull: true,
          default: lit('ACTIVE'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('updatedAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-user-name', {
        check: () =>
          sqlDb.public.user.select('id').where((f, fns) => fns.eq(f.name, null)).limit(1),
        // Prefer username when present; fall back to empty for any null names.
        run: () =>
          sqlDb.public.user.update({ name: '' }).where((f, fns) => fns.eq(f.name, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'name' }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-user-passwordHash', {
        check: () =>
          sqlDb.public.user
            .select('id')
            .where((f, fns) => fns.eq(f.passwordHash, null))
            .limit(1),
        // Legacy plaintext password column is dropped next; new installs start empty.
        // Auth seeding must write bcrypt/argon hashes into passwordHash.
        run: () =>
          sqlDb.public.user
            .update({ passwordHash: '' })
            .where((f, fns) => fns.eq(f.passwordHash, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'passwordHash' }),
      this.dropColumn({ schema: 'public', table: 'user', column: 'password' }),
      this.setDefault({
        schema: 'public',
        table: 'guest',
        column: 'rsvpStatus',
        defaultSql: "DEFAULT 'PENDING'",
      }),
      this.setDefault({
        schema: 'public',
        table: 'guest',
        column: 'side',
        defaultSql: "DEFAULT 'NEUTRAL'",
      }),
      this.setDefault({
        schema: 'public',
        table: 'user',
        column: 'role',
        defaultSql: "DEFAULT 'VIEWER'",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'guest',
        constraint: 'guest_attendanceStatus_check_bb131219',
        expression: "\"attendanceStatus\" IN ('NOT_ARRIVED', 'ARRIVED', 'NO_SHOW')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'guest',
        constraint: 'guest_gender_check_35ac3b49',
        expression: "\"gender\" IN ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'guest',
        constraint: 'guest_rsvpStatus_check_b3adaca7',
        expression: "\"rsvpStatus\" IN ('PENDING', 'CONFIRMED', 'DECLINED', 'MAYBE')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'guest',
        constraint: 'guest_side_check_625a2b64',
        expression: "\"side\" IN ('BRIDE', 'GROOM', 'NEUTRAL')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'spouse',
        constraint: 'spouse_guestId_key',
        columns: ['guestId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ticket',
        constraint: 'ticket_ticketNumber_key',
        columns: ['ticketNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'ticket',
        constraint: 'ticket_guestId_key',
        columns: ['guestId'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_role_check_67a4ae3c',
        expression: "\"role\" IN ('ADMIN', 'MANAGER', 'CHECKIN_STAFF', 'VIEWER')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_status_check_cfb53726',
        expression: "\"status\" IN ('ACTIVE', 'DISABLED', 'DELETED')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_username_key',
        columns: ['username'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_recordType_recordId_idx_f92c2ef6',
        columns: ['recordType', 'recordId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_timestamp_idx_a2429bb8',
        columns: ['timestamp'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'auditLog',
        index: 'auditLog_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'family',
        index: 'family_deletedAt_idx_a39f721c',
        columns: ['deletedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'family',
        index: 'family_familyName_idx_196eb0ff',
        columns: ['familyName'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'family',
        index: 'family_side_idx_973cebef',
        columns: ['side'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'familyMember',
        index: 'familyMember_deletedAt_idx_a39f721c',
        columns: ['deletedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'familyMember',
        index: 'familyMember_familyId_idx_3d03045e',
        columns: ['familyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'familyMember',
        index: 'familyMember_rsvpStatus_idx_a66dcefc',
        columns: ['rsvpStatus'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_attendanceStatus_idx_72d5f1d4',
        columns: ['attendanceStatus'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_category_idx_f2600f8e',
        columns: ['category'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_deletedAt_idx_a39f721c',
        columns: ['deletedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_familyId_idx_3d03045e',
        columns: ['familyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_fullName_idx_08c13ff8',
        columns: ['fullName'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_phone_idx_8db23f45',
        columns: ['phone'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_rsvpStatus_idx_a66dcefc',
        columns: ['rsvpStatus'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'guest',
        index: 'guest_side_idx_973cebef',
        columns: ['side'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'spouse',
        index: 'spouse_deletedAt_idx_a39f721c',
        columns: ['deletedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ticket',
        index: 'ticket_deletedAt_idx_a39f721c',
        columns: ['deletedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ticket',
        index: 'ticket_familyId_idx_3d03045e',
        columns: ['familyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ticket',
        index: 'ticket_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'ticket',
        index: 'ticket_ticketNumber_idx_934212c9',
        columns: ['ticketNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'user',
        index: 'user_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'auditLog',
        foreignKey: {
          name: 'auditLog_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'familyMember',
        foreignKey: {
          name: 'familyMember_familyId_fkey',
          columns: ['familyId'],
          references: { schema: 'public', table: 'family', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'guest',
        foreignKey: {
          name: 'guest_familyId_fkey',
          columns: ['familyId'],
          references: { schema: 'public', table: 'family', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'spouse',
        foreignKey: {
          name: 'spouse_guestId_fkey',
          columns: ['guestId'],
          references: { schema: 'public', table: 'guest', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ticket',
        foreignKey: {
          name: 'ticket_familyId_fkey',
          columns: ['familyId'],
          references: { schema: 'public', table: 'family', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'ticket',
        foreignKey: {
          name: 'ticket_guestId_fkey',
          columns: ['guestId'],
          references: { schema: 'public', table: 'guest', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
