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
import { KeyValue, EntityEvents, EntityConfig } from "../../lib/types";
import { UncreatableEntity, CreatableEntity, server } from "./common";

jest.setTimeout(10000);

describe("Entity", () => {
    beforeEach(() => {
        server.start();
    });

    afterEach(() => {
        server.stop();
    });

    it("Denies creation", (done) => {
        const entity = new UncreatableEntity({server});

        setImmediate(() => expect(entity.exists).toBe(false));

        done();
    });

    it("Allows creation", (done) => {
        const entity = new CreatableEntity({server});

        setImmediate(() => expect(entity.exists).toBe(true));

        done();
    });

    it("Emits create event", (done) => {
        const entity = new CreatableEntity({server});

        entity.on("create", ({ entity }) => {
            (entity as CreatableEntity).hasBeenCreated = true;
        });

        expect(entity.hasBeenCreated).toBe(false);

        setImmediate(() => expect(entity.hasBeenCreated).toBe(true));

        done();
    });

    it("Emits delete event", (done) => {
        const entity = new CreatableEntity({server});

        expect(entity.hasBeenDeleted).toBe(false);

        entity.delete();

        expect(entity.hasBeenDeleted).toBe(true);

        done();
    });

    it("Emits tick event", (done) => {
        server.on("start", () => {
            const entity = new CreatableEntity({server});
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
