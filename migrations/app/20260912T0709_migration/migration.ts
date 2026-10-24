#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/82f582e48f17f69c93676481d0dcf319de8711a31a7040cb77794bfef9daad97/contract';
import endContract from '../../snapshots/82f582e48f17f69c93676481d0dcf319de8711a31a7040cb77794bfef9daad97/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ea884d58632441c31c472c435437f38055bef0b29a0b576fe688a0222902e6ec/contract';
import startContract from '../../snapshots/ea884d58632441c31c472c435437f38055bef0b29a0b576fe688a0222902e6ec/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
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
      this.createIndex({
        schema: 'public',
        table: 'payment',
        index: 'payment_leaseId_idx_f789d0e1',
        columns: ['leaseId'],
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
