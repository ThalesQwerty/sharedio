import { Server, Entity } from "../../lib";
class Player extends Entity {
    name = "Thales";
    power = 9001;
}

const server = new Server({
    port: 8080,
}).start();

server.createEntity(Player);

console.log(server.entities);
