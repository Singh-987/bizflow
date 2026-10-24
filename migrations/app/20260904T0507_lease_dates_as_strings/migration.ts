#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1db3bf9013a24b45dd24cfac501cf236ff7f137939423309caf40797233384f1/contract';
import startContract from '../../snapshots/1db3bf9013a24b45dd24cfac501cf236ff7f137939423309caf40797233384f1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8cb980c19f5afd9d758cd43caeb7ca503304628dc2ac2e58b24466770fc495da/contract';
import endContract from '../../snapshots/8cb980c19f5afd9d758cd43caeb7ca503304628dc2ac2e58b24466770fc495da/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'property',
        column: col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'lease', column: 'agreementEndsOn' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
