import {dateParser} from "./utils";

export function normalizeValue(value: any): string {
    const type = typeof value;

    if (value instanceof Date) {
        return `d|${value.getTime()}`;
    }

    switch (type) {
        case "object":
            return `o|${JSON.stringify(value)}`;

        case "boolean":
            return `b|${value.toString()}`;

        case "number":
            return `n|${value}`;

        case "string":
            return `s|${value}`;

        case "bigint":
            return `i|${value}`;

        case "undefined":
        default:
            return `u|`;
    }
}

export function parseNormalizedValue(value: string, options: {parseDate?: boolean} = {}): any {
    const type = value.slice(0, 2);
    const normalizedValue = value.slice(2);

    switch (type) {
        case "d|":
            return new Date(Number(normalizedValue));

        case "o|":
            try {
                return JSON.parse(normalizedValue, options.parseDate ? dateParser : undefined);
            } catch (e) {
                return undefined;
            }

        case "b|":
            return normalizedValue === "true";

        case "n|":
            return Number(normalizedValue);

        case "s|":
            return normalizedValue;

        case "i|":
            return BigInt(normalizedValue);

        case "u|":
        default:
            return undefined;
    }


}
