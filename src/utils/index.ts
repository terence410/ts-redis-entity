export function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const isoRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
export function dateParser(key: string, value: any): any {
    if (typeof value === "string") {
        if (isoRegex.test(value)) {
            return new Date(value);
        }
    }

    return value;
}
