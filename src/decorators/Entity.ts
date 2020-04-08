import {DecoratorError} from "../errors/DecoratorError";
import {tsRedisEntity} from "../tsRedisEntity";
import {IEntityMeta} from "../types";

export function Entity(entityMeta: IEntityMeta) {
    return (target: object) => {
        if (!entityMeta.namespace || /:/.test(entityMeta.namespace)) {
            throw new DecoratorError(`(${(target as any).name}) namespace must not be empty or contains ":".`);
        }

        // make sure we have id
        if (!tsRedisEntity.hasId(target)) {
            throw new DecoratorError(`(${(target as any).name}) No id exist for this entity.`);
        }

        tsRedisEntity.addHashEntity(target, entityMeta);
    };
}
