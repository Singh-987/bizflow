#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1bb093bdfd22f2e19c0ecbd03eba45c7b001c9edf5504340748569aafe66eada/contract';
import endContract from '../../snapshots/1bb093bdfd22f2e19c0ecbd03eba45c7b001c9edf5504340748569aafe66eada/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ea884d58632441c31c472c435437f38055bef0b29a0b576fe688a0222902e6ec/contract';
import startContract from '../../snapshots/ea884d58632441c31c472c435437f38055bef0b29a0b576fe688a0222902e6ec/contract.json' with { type: 'json' };
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
      this.createTable({
        schema: 'public',
        table: 'payment',
        columns: [
          col('amount', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('leaseId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('method', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('month', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('paidOn', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
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
      this.createIndex({
        schema: 'public',
        table: 'payment',
        index: 'payment_leaseId_idx_f789d0e1',
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
      this.addForeignKey({
        schema: 'public',
        table: 'payment',
        foreignKey: {
          name: 'payment_leaseId_fkey',
          columns: ['leaseId'],
          references: { schema: 'public', table: 'lease', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
