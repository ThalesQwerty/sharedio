import { Server, Entity } from "../../lib";
import * as _ from "lodash";
class Player extends Entity {
    name = "Thales";
    power = 9001;

    // Only the owner can see this
    _secret = "Shh...";

    // No one can see this
    __internalState = 0;

    // This is readonly
    IMMUTABLE = "Hello World!";

    // This is readonly and only the owner can see this
    _IMMUTABLE_SECRET = "Hello Person!";

    shoot() {
        // pew
    }

    init() {
        // setInterval(() => {
        //     this.power = Math.floor(Math.random() * 10000);
        // }, 1000);
        // setTimeout(() => {
        //     this.server.deleteEntity(this);
        // }, 30000);
    }
}

const server = new Server({
    port: 8080,
    on: {
        connection(user) {
            const owned = server.createEntity(Player, {name: "You", power: 0}, user);
            const notOwned = server.createEntity(Player, {name: "They", power: 0});
        }
    }
}).start();

