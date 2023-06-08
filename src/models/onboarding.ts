import { BaseEntity } from "@medusajs/medusa";
import { Column, Entity } from "typeorm";

@Entity()
export class OnboardingState extends BaseEntity {
  @Column()
  current_step: string;

  @Column()
  is_complete: boolean;

  @Column()
  product_id: string;
}
