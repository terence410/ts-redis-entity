import { assert, expect } from "chai";
import {config} from "dotenv";
config();
import "mocha";
import {BaseEntity} from "../src/BaseEntity";
import {Column} from "../src/decorators/Column";
import {Entity} from "../src/decorators/Entity";
import {normalizeValue, parseNormalizedValue} from "../src/parser";
import {tsRedisEntity} from "../src/tsRedisEntity";
import {timeout} from "../src/utils";

const namespace = "Testing";
@Entity({namespace, connection: "default"})
class TestingEntity extends BaseEntity {
    @Column()
    public id: string = "";

    @Column()
    public value: string = "";

    @Column()
    public number?: number = 0;

    @Column()
    public date?: Date = new Date();

    @Column({parseDate: true})
    public object?: any = {};

    @Column()
    public array?: any[] = [];

    @Column()
    public boolean?: boolean = false;

    @Column()
    public nullableString: string | null = null;
}

async function assertThrowError(callback: () => any, matcher: RegExp) {
    let noError = false;
    try {
        await callback();
        noError = true;
    } catch (err) {
        if (!matcher.test(err.message)) {
            throw new Error(`"${err.message}" does not match with "${matcher.source}"`);
        }
    }

    if (noError) {
        throw new Error("No Error found");
    }
}

async function checkPromiseSuccess(promiseCallback: Promise<any>) {
    try {
        await promiseCallback;
        return true;
    } catch (err) {
        // console.log(`errorCode: ${err.errorCode}, ${err.message}`);
    }
}

before(async () => {
    await tsRedisEntity.addConnection("default", {});
});

describe("general", () => {
    it("basic operation", async () => {
        const id = "basic";
        const values = {id, value: "testing"};
        const entity1 = new TestingEntity();
        entity1.id = id;
        entity1.value = "testing";

        // validate
        assert.equal(entity1.getNamespace(), namespace);

        // make sure we delete it first
        await entity1.forceDelete();
        await entity1.create();
        await assertThrowError(() => entity1.create(), /entity already exist/);

        const entity2 = TestingEntity.new(values);
        await assertThrowError(() => entity2.create(), /entity already exist/);

        const foundEntity = await TestingEntity.find(id);
        assert.isDefined(foundEntity);
    });

    it("check all values", async () => {
        const id = "checkValues";
        const entity = TestingEntity.new({id});
        await entity.forceDelete();

        entity.value = "testing";
        entity.number = 1;
        entity.boolean = true;
        entity.date = new Date();
        entity.array = [1, 2, 3];
        entity.object = {a: {b: {c: 1}}};
        entity.nullableString = null;
        await entity.create();

        const foundEntity = await TestingEntity.find(id);
        assert.deepEqual(entity.getValues(), foundEntity!.getValues());
    });

    it("check special values", async () => {
        const id = "specialValues";
        const entity = TestingEntity.new({id});
        await entity.forceDelete();

        entity.value = "";
        entity.number = Number.NaN;
        entity.boolean = undefined;
        entity.date = new Date("invalid");
        entity.array = undefined;
        entity.object = {a: {b: {c: null, d: new Date()}}};
        entity.nullableString = null;
        await entity.create();

        const foundEntity = await TestingEntity.find(id);
        assert.deepEqual(entity.getValues(), foundEntity!.getValues());
    });

    it("check expire", async () => {
        const id = "expire";
        const entity = TestingEntity.new({id});
        // make sure we can create
        await entity.forceDelete();
        await entity.create({expire: 1});

        // entity still exist
        const foundEntity1 = await TestingEntity.find(id);
        assert.isDefined(foundEntity1);

        // get expire value
        const expire1 = await foundEntity1!.getExpire();
        assert.isAtLeast(expire1, 0);

        // wait for it to expire
        await timeout((expire1 + 1) * 1000);

        // validate the values
        const foundEntity2 = await TestingEntity.find(id);
        assert.isUndefined(foundEntity2);

        const expire2 = await foundEntity1!.getExpire();
        assert.equal(expire2, -2);
    });

    it("findAllIds", async () => {
        const total = 10;
        const ids = Array(total).fill(0).map(((x, i) => `findAllIds-${i}`));
        const entities = ids.map(x => TestingEntity.new({id: x, value: x}));

        // make sure they are all deleted
        const promises1 = entities.map(x => x.forceDelete());
        await Promise.all(promises1);

        const promises2 = entities.map(x => x.create());
        const results = await Promise.all(promises2);

        const allIds = await TestingEntity.findAllIds("findAllIds-");
        assert.deepEqual(allIds.sort(), ids.sort());
    });

    it("scanAllIds", async () => {
        const total = 10;
        const ids = Array(total).fill(0).map(((x, i) => `scanAllIds-${i}`));
        const entities = ids.map(x => TestingEntity.new({id: x, value: x}));

        // make sure they are all deleted
        const promises1 = entities.map(x => x.forceDelete());
        await Promise.all(promises1);

        const promises2 = entities.map(x => x.create());
        const results = await Promise.all(promises2);

        let allIds: string[] = [];
        await new Promise(resolve => {
            const stream = TestingEntity.scanAllIds("scanAllIds-");
            stream.on("data", (newIds) => {
                allIds = [...allIds, ...newIds];
            });
            stream.on("end", resolve);
        });
        assert.deepEqual(allIds.sort(), ids.sort());
    });

    it("error", async () => {
        await assertThrowError(() => new TestingEntity().create(), /id is empty/);

        await assertThrowError(() => TestingEntity.new({id: 1 as any}).create(), /id is not in the type of string/);

        await assertThrowError(() => TestingEntity.new({id: "a:b"}).create(), /id must not contains ":"/);

        await assertThrowError(() => TestingEntity.new({id: "notexist"}).update(), /entity not exist/);

        await assertThrowError(() => TestingEntity.new({id: "notexist"}).delete(), /entity not exist/);

        const notExistEntity = await TestingEntity.find("not exist");
        assert.isUndefined(notExistEntity);
    });

    it("multiple operations", async () => {
        const id = "multiple";
        const total = 10;
        const entities = Array(10).fill(0).map(x => TestingEntity.new({id}));

        // make sure they are all deleted
        const promises = entities.map(x => x.forceDelete());
        await Promise.all(promises);

        // create
        const promises1 = entities.map(x =>  checkPromiseSuccess(x.create()));
        const results1 = await Promise.all(promises1);
        assert.equal(results1.filter(x => x).length, 1);

        // update (all success)
        const promises2 = entities.map(x =>  checkPromiseSuccess(x.update()));
        const results2 = await Promise.all(promises2);
        assert.equal(results2.filter(x => x).length, 10);

        // delete
        const promises3 = entities.map(x =>  checkPromiseSuccess(x.delete()));
        const results3 = await Promise.all(promises3);
        assert.equal(results3.filter(x => x).length, 1);
    });

    it("multiple operations for if", async () => {
        const id = "multipleIf";
        const total = 10;
        const condition = Math.floor(Math.random() * total);
        const entity = TestingEntity.new({id, number: condition});

        // make sure it's deleted
        await entity.forceDelete();

        // create
        await entity.create();

        const promises = Array(10).fill(0).map(x => TestingEntity.find(id));
        const entities = await Promise.all(promises) as TestingEntity[];
        assert.equal(entities.length, total);

        // updateIf
        const promises2 = entities.map((x, i) =>  {
            return checkPromiseSuccess(x.updateIf({number: i}));
        });
        const results2 = await Promise.all(promises2);
        assert.equal(results2.filter(x => x).length, 1);

        // deleteIf
        const promises3 = entities.map((x, i) =>  {
            return checkPromiseSuccess(x.deleteIf({number: i}));
        });
        const results3 = await Promise.all(promises3);
        assert.equal(results3.filter(x => x).length, 1);
    });
});

describe("parser", () => {
    it("normal values", async () => {
        const values: any[] = [
            // string
            "", "-a", "|~!@#$%^&*()_+[]",

            // numbers
            1, 0, -1, 0.3333333333333333, Number.MAX_VALUE, Number.NaN, Number.NEGATIVE_INFINITY,

            // boolean
            true, false,

            // undefined
            undefined,

            // object
            {a: 1}, {a: {b: {c: 1}}}, {},

            // null (this is object)
            null,
        ];

        for (const value of values) {
            const normalizedVaue = normalizeValue(value);
            const originalValue = parseNormalizedValue(normalizedVaue);
            assert.deepEqual(value, originalValue);
        }
    });

    it("special values", async () => {
        const values: any[] = [
            Symbol("testing"),
            () => 0,
            BaseEntity,
        ];

        for (const value of values) {
            const normalizedVaue = normalizeValue(value);
            const originalValue = parseNormalizedValue(normalizedVaue);
            assert.deepEqual(originalValue, undefined);
        }
    });

    it("parse date in object", async () => {
        const value = {a: {b: {c: new Date()}}};
        const normalizedValue = normalizeValue(value);
        const originalValue = parseNormalizedValue(normalizedValue, {parseDate: true});
        assert.deepEqual(value, originalValue);

        const invalidValue = parseNormalizedValue(normalizedValue, {parseDate: false});
        assert.equal(value.a.b.c.toISOString(), invalidValue.a.b.c);
    });

    it("test", async () => {
        const value = false;
        const normalizedValue = normalizeValue(value);
        const originalValue = parseNormalizedValue(normalizedValue);
        assert.deepEqual(value, originalValue);
    });
});
