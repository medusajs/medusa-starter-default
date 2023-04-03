import { MigrationInterface, QueryRunner } from "typeorm"

export class MyMigration1617703530229 implements MigrationInterface {
  name = "myMigration1617703530229"

  public async up(queryRunner: QueryRunner): Promise<void> {
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
