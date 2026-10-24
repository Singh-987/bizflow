#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1db3bf9013a24b45dd24cfac501cf236ff7f137939423309caf40797233384f1/contract';
import startContract from '../../snapshots/1db3bf9013a24b45dd24cfac501cf236ff7f137939423309caf40797233384f1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f1bbdcd72575169b7df8a696c3ca56273277786af59bfe72b6edea02a7019544/contract';
import endContract from '../../snapshots/f1bbdcd72575169b7df8a696c3ca56273277786af59bfe72b6edea02a7019544/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropNotNull({ schema: 'public', table: 'lease', column: 'agreementEndsOn' })];
  }
}

MigrationCLI.run(import.meta.url, M);
