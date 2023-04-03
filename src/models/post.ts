import { BaseEntity, generateEntityId } from "@medusajs/utils"
import {
    BeforeInsert, Column,
    Entity,
    PrimaryColumn,
} from "typeorm"

@Entity()
export class Post extends BaseEntity {
  @Column({type: 'varchar'})
  title: string | null;

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "post")
  }
}
