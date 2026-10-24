#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1bb093bdfd22f2e19c0ecbd03eba45c7b001c9edf5504340748569aafe66eada/contract';
import endContract from '../../snapshots/1bb093bdfd22f2e19c0ecbd03eba45c7b001c9edf5504340748569aafe66eada/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/82f582e48f17f69c93676481d0dcf319de8711a31a7040cb77794bfef9daad97/contract';
import startContract from '../../snapshots/82f582e48f17f69c93676481d0dcf319de8711a31a7040cb77794bfef9daad97/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'electricityReading',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('currentReading', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('electricityBill', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('leaseId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('meterChanged', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('month', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('perUnitCharge', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('previousReading', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('unitsUsed', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'electricityReading',
        constraint: 'electricityReading_leaseId_month_key',
        columns: ['leaseId', 'month'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'electricityReading',
        index: 'electricityReading_leaseId_idx_f789d0e1',
        columns: ['leaseId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'electricityReading',
        foreignKey: {
          name: 'electricityReading_leaseId_fkey',
          columns: ['leaseId'],
          references: { schema: 'public', table: 'lease', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
