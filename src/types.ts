import {BaseEntity} from "./BaseEntity";

export interface IEntityColumnMeta {
    cast?: boolean;
    parseDate?: boolean;
}

export interface IEntityMeta {
    namespace: string;
    connection: string;
}

// entity
export type ISaveOptions = {
    expire?: number | Date;
};
export type IValues<T> = { [P in Exclude<keyof T, keyof BaseEntity>]: T[P] };
export interface IScanStream {
    on(type: "data", callback: (ids: string[]) => void): void;
    on(type: "end", callback: () => void): void;
}
