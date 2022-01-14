import { Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class MyModel {
    @PrimaryColumn()
    @PrimaryGeneratedColumn()
    id: number;
}