#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1bb093bdfd22f2e19c0ecbd03eba45c7b001c9edf5504340748569aafe66eada/contract';
import startContract from '../../snapshots/1bb093bdfd22f2e19c0ecbd03eba45c7b001c9edf5504340748569aafe66eada/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/cb1c3ff4cfc0424d38fefcb2055c6d303391be4931664f6eaf96c780e5dfffc2/contract';
import endContract from '../../snapshots/cb1c3ff4cfc0424d38fefcb2055c6d303391be4931664f6eaf96c780e5dfffc2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'expense',
        columns: [
          col('amount', 'float8', { notNull: true, codecRef: { codecId: 'pg/float8@1' } }),
          col('category', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('date', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('propertyId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'expense',
        index: 'expense_propertyId_idx_4bcae41c',
        columns: ['propertyId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'expense',
        foreignKey: {
          name: 'expense_propertyId_fkey',
          columns: ['propertyId'],
          references: { schema: 'public', table: 'property', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
