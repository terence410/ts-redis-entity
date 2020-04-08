import {errorCodes} from "./errorCodes";

export class OperationError extends Error {
    constructor(public errorCode: errorCodes, public message: string) {
        super(message);
        Object.setPrototypeOf(this, OperationError.prototype);
    }
}
