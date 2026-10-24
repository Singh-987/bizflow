#!/usr/bin/env -S node

import type { Contract as Start } from '../../snapshots/d379086805bfddbe48f6e9df7391c573c0285a379acc71bd9a36211f5a87cd56/contract';
import startContract from '../../snapshots/d379086805bfddbe48f6e9df7391c573c0285a379acc71bd9a36211f5a87cd56/contract.json' with { type: 'json' };

import type { Contract as End } from '../../snapshots/ea884d58632441c31c472c435437f38055bef0b29a0b576fe688a0222902e6ec/contract';
import endContract from '../../snapshots/ea884d58632441c31c472c435437f38055bef0b29a0b576fe688a0222902e6ec/contract.json' with { type: 'json' };

import { Migration, MigrationCLI, col, placeholder } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tenant',
        column: col('userId', 'text', {
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),

      this.dataTransform(endContract, 'backfill-tenant-userId', {
        check: () => placeholder('backfill-tenant-userId:check'),
        run: () => placeholder('backfill-tenant-userId:run'),
      }),

      this.setNotNull({
        schema: 'public',
        table: 'tenant',
        column: 'userId',
      }),

      this.createIndex({
        schema: 'public',
        table: 'tenant',
        index: 'tenant_userId_idx_a489d58a',
        columns: ['userId'],
      }),

      this.addForeignKey({
        schema: 'public',
        table: 'tenant',
        foreignKey: {
          name: 'tenant_userId_fkey',
          columns: ['userId'],
          references: {
            schema: 'public',
            table: 'user',
            columns: ['id'],
          },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);