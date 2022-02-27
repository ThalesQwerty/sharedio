import {
    Server,
    Entity,
    Rules,
    Public,
    Private,
    Internal,
    Readonly,
} from "../..";
import WebSocket from "ws";
import { KeyValue, EntityEvents } from "../../lib/types";

jest.setTimeout(10000);

const server = new Server({
    port: 8080,
    debug: false,
});

const SERVER_URL = `ws://localhost:${server.config.port}`;

class UncreatableEntity extends Entity {
    protected _Constructor(): boolean {
        return false;
    }
}

class CreatableEntity extends Entity {
    hasBeenDeleted: boolean = false;
    hasBeenCreated: boolean = false;
    tickCounter: number = 0;

    protected _Constructor(): boolean {
        this.on("delete", () => {
            this.hasBeenDeleted = true;
        });
        this.on("tick", () => {
            this.tickCounter++;
        });
        return true;
    }
}

describe("Entity", () => {
    beforeEach(() => {
        server.start();
    });

    afterEach(() => {
        server.stop();
    });

    it("Denies creation by returning false on constructor", (done) => {
        const entity = new UncreatableEntity(server);

        expect(entity.exists).toBe(false);

        done();
    });

    it("Allows creation by returning true on constructor", (done) => {
        const entity = new CreatableEntity(server);

        expect(entity.exists).toBe(true);

        done();
    });

    it("Emits create event", (done) => {
        const entity = new CreatableEntity(server);

        entity.on("create", ({ entity }) => {
            (entity as CreatableEntity).hasBeenCreated = true;
        });

        expect(entity.hasBeenCreated).toBe(false);

        setTimeout(() => {
            expect(entity.hasBeenCreated).toBe(true);
        });

        done();
    });

    it("Emits delete event", (done) => {
        const entity = new CreatableEntity(server);

        expect(entity.hasBeenDeleted).toBe(false);

        entity.delete();

        expect(entity.hasBeenDeleted).toBe(true);

        done();
    });

    it("Emits tick event", (done) => {
        server.on("start", () => {
            const entity = new CreatableEntity(server);
            let lastTickCounter = entity.tickCounter;

            server.on("tick", () => {
                expect(entity.tickCounter).toBe(lastTickCounter + 1);
                lastTickCounter = entity.tickCounter;
                if (entity.tickCounter >= 1) {
                    entity.delete();
                    done();
                }
            });
        });
    });
});
