export class SharedIOError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = "SharedIOError";
    }
}