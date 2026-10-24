#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2594d2bf56d5fe92a63f182e3ecf1bbe1f6f3ad6f587d4cad84bc21e8b2de50f/contract';
import endContract from '../../snapshots/2594d2bf56d5fe92a63f182e3ecf1bbe1f6f3ad6f587d4cad84bc21e8b2de50f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/875497b2718d9ee103d8612215f3569631af18bd3becc3aeba95831d2d790f59/contract';
import startContract from '../../snapshots/875497b2718d9ee103d8612215f3569631af18bd3becc3aeba95831d2d790f59/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'notificationRead',
        columns: [
          col('activityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('readAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notificationRead',
        constraint: 'notificationRead_userId_activityId_key',
        columns: ['userId', 'activityId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notificationRead',
        index: 'notificationRead_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notificationRead',
        foreignKey: {
          name: 'notificationRead_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
