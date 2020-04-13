import * as fs from "fs";
import IORedis from "ioredis";
import * as path from "path";
import {DecoratorError} from "./errors/DecoratorError";
import {errorCodes} from "./errors/errorCodes";
import {OperationError} from "./errors/OperationError";
import {IEntityColumnMeta, IEntityMeta} from "./types";

class TsRedisEntity {
    private _classToEntityMetaMap = new Map<object, IEntityMeta>();
    private _classToEntityColumnMetasMap = new Map<object, {[key: string]: IEntityColumnMeta}>();
    private _redisList = new Map<string, IORedis.Redis>();

    // region decorators

    public addColumn(classType: object, column: string, meta: IEntityColumnMeta) {
        let columns = this._classToEntityColumnMetasMap.get(classType);
        if (!columns) {
            columns = {};
            this._classToEntityColumnMetasMap.set(classType, columns);
        }
        columns[column] = meta;
    }

    public addHashEntity(classType: object, meta: IEntityMeta) {
        if (!this._classToEntityMetaMap.has(classType)) {
            this._classToEntityMetaMap.set(classType, meta);
        }
    }

    public getEntityColumnMetas(classType: object): {[key: string]: IEntityColumnMeta} {
        return this._classToEntityColumnMetasMap.get(classType) || {};
    }

    public hasId(classType: object): boolean {
        const entityColumns = this.getEntityColumnMetas(classType);
        return Object.keys(entityColumns).some(x => x === "id");
    }

    public getColumns(target: object): string[] {
        const entityColumns = this._classToEntityColumnMetasMap.get(target) || {};
        return Object.keys(entityColumns);
    }

    // endregion

    // region operations

    public getRedis(classType: object): IORedis.Redis {
        const entityMeta = this._classToEntityMetaMap.get(classType) as IEntityMeta;
        const redis = this._redisList.get(entityMeta.connection);
        if (!redis) {
            throw new OperationError(errorCodes.noConnection,
                `(${(classType as any).name}) redis with connection name: "${entityMeta.connection}" doesn't exist. Please add a new connection by tsRedisEntity.addConnection("${entityMeta.connection}");`);
        }

        return redis;
    }

    public async addConnection(name: string, options: IORedis.RedisOptions) {
        if (this._redisList.has(name)) {
            throw new Error(`A redis with the name: "${name}" already exist.`);
        }

        const redis = new IORedis(options);
        await this._registerLua(redis);
        await redis.info(); // this make sure the redis can be connected via add connection
        this._redisList.set(name, redis);
    }

    public getStorageKey(classType: object, id: string) {
        return `${this.getNamespace(classType)}:${id}`;
    }

    public getNamespace(classType: object): string {
        const entityMeta = this._classToEntityMetaMap.get(classType) as IEntityMeta;
        return entityMeta.namespace;
    }

    // endregion

    // region private methods

    private async _registerLua(redis: IORedis.Redis | IORedis.Cluster) {
        const luaShared = fs.readFileSync(path.join(__dirname, "../lua/shared.lua"), {encoding: "utf8"});

        const lua1 = fs.readFileSync(path.join(__dirname, "../lua/atomicCreate.lua"), {encoding: "utf8"});
        await redis.defineCommand("commandAtomicCreate", {numberOfKeys: 0, lua: luaShared + lua1});

        const lua2 = fs.readFileSync(path.join(__dirname, "../lua/atomicUpdate.lua"), {encoding: "utf8"});
        await redis.defineCommand("commandAtomicUpdate", {numberOfKeys: 0, lua: luaShared + lua2});

        const lua3 = fs.readFileSync(path.join(__dirname, "../lua/atomicDelete.lua"), {encoding: "utf8"});
        await redis.defineCommand("commandAtomicDelete", {numberOfKeys: 0, lua: luaShared + lua3});
    }

    // endregion
}

export const tsRedisEntity = new TsRedisEntity();
