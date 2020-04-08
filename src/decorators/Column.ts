import "reflect-metadata";
import {DecoratorError} from "../errors/DecoratorError";
import {tsRedisEntity} from "../tsRedisEntity";
import {IEntityColumnMeta} from "../types";

export function Column(entityColumn: IEntityColumnMeta = {}) {
    return (target: object, column: string) => {
        const propertyType = Reflect.getMetadata("design:type", target, column);

        if (column === "id" && propertyType !== String) {
            throw new DecoratorError(`(${(target as any).name}) id must be in the type of string. e.g.: public id: string = "";`);
        }

        // everything ok , add the column
        tsRedisEntity.addColumn(target.constructor, column, entityColumn);
    };
}
