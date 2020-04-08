# ts-redis-entity

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
    public value: string = "";
}

async function quickStartExamples() {
    await tsRedisEntity.addConnection("default", { port: 6380, host: "127.0.0.1" });
    const entity = QuickStart.new({id: "1", number: 10});
    await entity.create();
    const foundEntity = await QuickStart.find("1");
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
