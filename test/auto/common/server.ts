import { Server } from "../../../lib";

const server = new Server({
    port: 8080,
    debug: false,
});

const SERVER_URL = `ws://localhost:${server.config.port}`;

export {server, SERVER_URL};