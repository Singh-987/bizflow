#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/875497b2718d9ee103d8612215f3569631af18bd3becc3aeba95831d2d790f59/contract';
import endContract from '../../snapshots/875497b2718d9ee103d8612215f3569631af18bd3becc3aeba95831d2d790f59/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/cb1c3ff4cfc0424d38fefcb2055c6d303391be4931664f6eaf96c780e5dfffc2/contract';
import startContract from '../../snapshots/cb1c3ff4cfc0424d38fefcb2055c6d303391be4931664f6eaf96c780e5dfffc2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'payment',
        column: col('type', 'text', {
          notNull: true,
          default: lit('RENT'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
