import {EventEmitter} from "events";
import {errorCodes} from "./errors/errorCodes";
import {OperationError} from "./errors/OperationError";
import {normalizeValue, parseNormalizedValue} from "./parser";
import {tsRedisEntity} from "./tsRedisEntity";
import {ISaveOptions, IScanStream, IValues} from "./types";

export class BaseEntity {
    // region static methods
    
    public static scanAllIds<T extends typeof BaseEntity>(this: T, prefix: string): IScanStream {
        const count = 10;
        const namespace = tsRedisEntity.getNamespace(this);
        const match = prefix ? `${namespace}:${prefix}*` : `${namespace}*`;

        const redis = tsRedisEntity.getRedis(this);
        const stream = redis.scanStream({match, count});
        const eventEmitter = new EventEmitter();

        stream.on("data", (keys: string[]) => {
            eventEmitter.emit("data", keys.map(x => x.replace(`${namespace}:`, "")));
        });

        stream.on("end", () => {
            eventEmitter.emit("end");
        });

        stream.on("error", (err) => {
            eventEmitter.emit("error", err);
        });

        return eventEmitter;
    }

    public static async findAllIds<T extends typeof BaseEntity>(this: T, prefix: string = "") {
        const count = 10;
        const namespace = tsRedisEntity.getNamespace(this);
        const match = prefix ? `${namespace}:${prefix}*` : `${namespace}*`;

        const redis = tsRedisEntity.getRedis(this);
        const stream = redis.scanStream({match, count});

        let allKeys: string[] = [];
        stream.on("data", keys => {
            allKeys = [...allKeys, ...keys];
        });

        // we also capture error
        await new Promise((resolve, reject) => {
            stream.on("end", resolve);
            stream.on("error", reject);
        });
        return allKeys.map(x => x.replace(`${namespace}:`, ""));
    }

    public static async findAll<T extends typeof BaseEntity>(this: T, prefix: string = ""): Promise<Array<InstanceType<T>>> {
        const ids = await this.findAllIds(prefix);
        const promises = ids.map(id => this.find(id));
        const entities = await Promise.all(promises);
        return entities.filter(x => x) as Array<InstanceType<T>>;
    }

    public static async find<T extends typeof BaseEntity>(this: T, id: string): Promise<InstanceType<T> | undefined> {
        const redis = tsRedisEntity.getRedis(this);
        const storageKey = tsRedisEntity.getStorageKey(this, id);
        const normalizedValues = await redis.hgetall(storageKey);

        if ("id" in normalizedValues) {
            const columnMetas = tsRedisEntity.getEntityColumnMetas(this);
            
            const entity = new this() as InstanceType<T>;
            for (const [column, columnMeta] of Object.entries(columnMetas)) {
                if (column in normalizedValues) {
                    const normalizedValue = normalizedValues[column];
                    (entity as any)[column] = parseNormalizedValue(normalizedValue, {parseDate: columnMeta.parseDate});
                }
            }
            return entity;
        }
    }

    public static new<T extends typeof BaseEntity>(this: T, values: Partial<IValues<InstanceType<T>>>) {
        const entity = new this() as InstanceType<T>;
        entity.setValues(values);
        return entity;
    }
    
    // endregion

    // region private variables
    
    private _expireSeconds: number = 0;
    
    // endregion

    // region operations
    
    public getNamespace() {
        return tsRedisEntity.getNamespace(this.constructor);
    }

    public setValues<T extends BaseEntity>(this: T, values: Partial<IValues<T>>) {
        Object.assign(this, values);
        return this;
    }

    public getValues<T extends BaseEntity>(this: T) {
        const values: any = {};
        const columns = tsRedisEntity.getColumns(this.constructor);
        for (const column of columns) {
            values[column] = (this as any)[column];
        }

        return values as IValues<T>;
    }

    // >= 0: gonna expire
    // -2: not exist
    // -1: no expire
    public async getExpire() {
        const redis = tsRedisEntity.getRedis(this.constructor);
        const storageKey = this._getStorageKey();
        return await redis.ttl(storageKey);
    }

    public async create(options: ISaveOptions = {}) {
        const redis = tsRedisEntity.getRedis(this.constructor);
        const id = this._getId();
        const storageKey = this._getStorageKey();
        const normalizedValues = this._getNormalizedValues(this.getValues());
        const expireSeconds = this._getExpireSeconds(options.expire);

        // send to connection
        const params = [
            id,
            storageKey,
            JSON.stringify(normalizedValues),
            expireSeconds,
        ];
        const commandResult =  await (redis as any).commandAtomicCreate([], params);
        const result = JSON.parse(commandResult);

        // handle error
        if (result.errorCode) {
            throw new OperationError(result.errorCode, `(${(this.constructor as any).name}) ${result.message}`);
        }

        return this;
    }

    public async updateIf<T extends BaseEntity>(this: T, conditions: Partial<IValues<T>>, options: ISaveOptions = {}) {
        const redis = tsRedisEntity.getRedis(this.constructor);
        const id = this._getId();
        const storageKey = this._getStorageKey();
        const normalizedValues = this._getNormalizedValues(this.getValues());
        const conditionNormalizedValues = this._getNormalizedValues(conditions);
        const expireSeconds = this._getExpireSeconds(options.expire);

        // send to connection
        const params = [
            id,
            storageKey,
            JSON.stringify(normalizedValues),
            expireSeconds,
            JSON.stringify(conditionNormalizedValues),
        ];
        const commandResult =  await (redis as any).commandAtomicUpdate([], params);
        const result = JSON.parse(commandResult);

        // handle error
        if (result.errorCode) {
            throw new OperationError(result.errorCode, `(${(this.constructor as any).name}) ${result.message}`);
        }

        return this;
    }

    public async update(options: ISaveOptions = {}) {
        return this.updateIf({}, options);
    }

    // delete will always be able to execute
    public async deleteIf<T extends BaseEntity>(conditions: Partial<IValues<T>>) {
        const redis = tsRedisEntity.getRedis(this.constructor);
        const id = this._getId();
        const storageKey = this._getStorageKey();
        const conditionNormalizedValues = this._getNormalizedValues(conditions);

        // send to connection
        const params = [
            id,
            storageKey,
            JSON.stringify(conditionNormalizedValues),
        ];
        const commandResult =  await (redis as any).commandAtomicDelete([], params);
        const result = JSON.parse(commandResult);

        // handle error
        if (result.errorCode) {
            throw new OperationError(result.errorCode, `(${(this.constructor as any).name}) ${result.message}`);
        }

        return this;
    }

    public async delete() {
        return this.deleteIf({});
    }

    // doesn't care if entity exist or
    public async forceDelete() {
        const redis = tsRedisEntity.getRedis(this.constructor);
        const storageKey = this._getStorageKey();
        const result = await redis.del(storageKey);
        return result === 1;
    }
    
    // endregion

    // region private methods

    private _getId(): string {
        const id = (this as any).id;

        if (!id) {
            throw new OperationError(errorCodes.invalidId, `(${(this.constructor as any).name}) id is empty.`);
        }

        if (typeof id !== "string") {
            throw new OperationError(errorCodes.invalidId, `(${(this.constructor as any).name}) id is not in the type of string.`);
        }

        if (/:/.test(id)) {
            throw new OperationError(errorCodes.invalidId, `(${(this.constructor as any).name}) id must not contains ":".`);
        }

        return id;
    }

    private _getNormalizedValues(values: {[key: string]: any}): {[key: string]: string} {
        const normalizedValues: any = {};
        for (const [key, value] of Object.entries(values)) {
            normalizedValues[key] = normalizeValue(value);
        }
        return normalizedValues;
    }

    private _getStorageKey() {
        const id = this._getId();
        return tsRedisEntity.getStorageKey(this.constructor, id);
    }

    private _getExpireSeconds(value: number | Date | undefined) {
        if (value instanceof Date) {
            return Math.round((value.getTime() - new Date().getTime()) / 1000);

        } else if (typeof value === "number") {
            return value > 0 ? value : 0;
        }

        return 0;
    }

    // endregion
}
