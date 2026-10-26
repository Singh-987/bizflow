#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/c81e0171449e04871b1a0452187e3f8ceba9378f45472dcd681279526c5d69a4/contract';
import startContract from '../../snapshots/c81e0171449e04871b1a0452187e3f8ceba9378f45472dcd681279526c5d69a4/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d977684d9f920daf372655c585cc28911f5f2eaa2c183fc49be5a3f93207c4da/contract';
import endContract from '../../snapshots/d977684d9f920daf372655c585cc28911f5f2eaa2c183fc49be5a3f93207c4da/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'property',
        column: col('isArchived', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
