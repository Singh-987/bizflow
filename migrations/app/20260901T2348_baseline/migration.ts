#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1db3bf9013a24b45dd24cfac501cf236ff7f137939423309caf40797233384f1/contract';
import endContract from '../../snapshots/1db3bf9013a24b45dd24cfac501cf236ff7f137939423309caf40797233384f1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'lease',
        columns: [
          col('agreementEndsOn', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('agreementStartsOn', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rent', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('securityDeposit', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tenantId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('unitId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'property',
        columns: [
          col('address', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'tenant',
        columns: [
          col('alternatePhone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('govtId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('govtIdFile', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'unit',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('number', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('propertyId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rent', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_email_key',
        columns: ['email'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'lease',
        index: 'lease_tenantId_idx_c93ed4f1',
        columns: ['tenantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'lease',
        index: 'lease_unitId_idx_be785412',
        columns: ['unitId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'property',
        index: 'property_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'unit',
        index: 'unit_propertyId_idx_4bcae41c',
        columns: ['propertyId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'lease',
        foreignKey: {
          name: 'lease_tenantId_fkey',
          columns: ['tenantId'],
          references: { schema: 'public', table: 'tenant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'lease',
        foreignKey: {
          name: 'lease_unitId_fkey',
          columns: ['unitId'],
          references: { schema: 'public', table: 'unit', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'property',
        foreignKey: {
          name: 'property_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'unit',
        foreignKey: {
          name: 'unit_propertyId_fkey',
          columns: ['propertyId'],
          references: { schema: 'public', table: 'property', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
