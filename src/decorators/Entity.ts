import {DecoratorError} from "../errors/DecoratorError";
import {tsRedisEntity} from "../tsRedisEntity";
import {IEntityMeta} from "../types";

export function Entity(entityMeta: Partial<IEntityMeta>) {
    return (target: object) => {
        const newEntityMeta: IEntityMeta = Object.assign({namespace: (target as any).name, connection: "default"}, entityMeta);
        if (/:/.test(newEntityMeta.namespace)) {
            throw new DecoratorError(`(${(target as any).name}) namespace must not be empty or contains ":".`);
        }

        // make sure we have id
        if (!tsRedisEntity.hasId(target)) {
            throw new DecoratorError(`(${(target as any).name}) No id exist for this entity.`);
        }

        tsRedisEntity.addHashEntity(target, newEntityMeta);
    };
}
