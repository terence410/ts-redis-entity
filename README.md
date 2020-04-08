# ts-redis-entity

[![NPM version][npm-image]][npm-url]
[![Test][github-action-image]][github-action-url]
[![Test coverage][codecov-image]][codecov-url]
[![David deps][david-image]][david-url]

[npm-image]: https://img.shields.io/npm/v/ts-redis-entity.svg
[npm-url]: https://npmjs.org/package/ts-redis-entity
[github-action-image]: https://github.com/terence410/ts-redis-entity/workflows/Testing/badge.svg
[github-action-url]: https://github.com/terence410/ts-redis-entity/actions
[codecov-image]: https://img.shields.io/codecov/c/github/terence410/ts-redis-entity.svg?style=flat-square
[codecov-url]: https://codecov.io/gh/terence410/ts-redis-entity
[david-image]: https://img.shields.io/david/terence410/ts-redis-entity.svg?style=flat-square
[david-url]: https://david-dm.org/terence410/ts-redis-entity

A package that helps you to save a simple entity structure to redis. With various features like expire, update with conditions.

The entity structure is saved using [hmset](https://redis.io/commands/hmset).

# Quick Start

```typescript
import {BaseEntity, Column, Entity, tsRedisEntity} from "ts-redis-entity";

@Entity({namespace: "QuickStart", connection: "default"})
class QuickStart extends BaseEntity {
    @Column()
    public id: string = "";

    @Column()
    public number: number = 10;
}

async function quickStartExamples() {
    await tsRedisEntity.addConnection("default", { port: 6380, host: "127.0.0.1" });
    const entity = QuickStart.new({id: "1", number: 10});
    await entity.create({expire: 60}); // expire in 60 seconds
    const foundEntity = await QuickStart.find("1");
    if (foundEntity) {
        const getValues = foundEntity.getValues();
        foundEntity.setValues({number: 20});
        await foundEntity.update({expire: new Date(new Date().getTime() + 60 * 1000)});
    }
}

```

# More Examples

```typescript

import {BaseEntity, Column, Entity, errorCodes, OperationError, tsRedisEntity} from "ts-redis-entity";

@Entity({namespace: "TestingEntity", connection: "default"})
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

async function saveIfExamples() {
    const entity = await TestingEntity.new({id: "prefix", number: 10}).create();
    const foundEntity = await TestingEntity.find("prefix");
    
    entity.number = 11;
    await entity.update();
    
    if (foundEntity) {
        try {
            foundEntity.number = 12;
            await foundEntity.updateIf({number: 11});
        } catch (err) {
            if (err instanceof OperationError) {
                console.assert(err.errorCode === errorCodes.conditionNotMatch);
            }
        }
    }
}

async function finaAllExamples() {
    const entity1 = await TestingEntity.new({id: "prefix1"}).create();
    const entity2 = await TestingEntity.new({id: "prefix2"}).create();
    const keys = await TestingEntity.findAllIds("prefix");
    // keys = ["prefix1", "prefix2"]
    
    const stream = TestingEntity.scanAllIds("prefix1");
    stream.on("data", ids => console.log(ids));
    stream.on("end", () => console.log("end"));
}

```
