import { Server, Entity } from "../../lib";
import * as _ from "lodash";
class Player extends Entity {
    name = "Thales";
    power = 9001;

    shoot() {
        // pew
    }

    init() {
        setInterval(() => {
            this.power = Math.floor(Math.random() * 10000);
        }, 1000);

        setTimeout(() => {
            this.server.deleteEntity(this);
        }, 15000);
    }
}

const server = new Server({
    port: 8080,
}).start();

server.createEntity(Player);