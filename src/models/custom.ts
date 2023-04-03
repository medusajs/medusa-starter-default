import { generateEntityId } from "@medusajs/utils"
import {
    BeforeInsert,
    Entity,
    PrimaryColumn,
} from "typeorm"

@Entity()
export class MyModel {
    @PrimaryColumn()
    id: string

    @BeforeInsert()
    beforeInsert() {
        this.id = generateEntityId(this.id, "mm_")
    }
}
