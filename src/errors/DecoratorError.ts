export class DecoratorError extends Error {
    constructor(public message: string) {
        super(message);
        Object.setPrototypeOf(this, DecoratorError.prototype);
    }
}
