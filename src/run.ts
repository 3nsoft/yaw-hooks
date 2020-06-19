/*
 Copyright (C) 2019 3NSoft Inc.
 */

import { readConfFile } from "./webhook-app/confs";
import { makeWebhooksApp } from "./webhook-app/webhooks-app";
import { createServer, Server } from "https";
import { readFileSync } from "fs";

const { confPath, isTest } = (() => {
	const isTest = (process.argv[2] === '-t');
	const confPath = process.argv[isTest ? 3 : 2];
	if (!confPath) {
		throw new Error(`Missing configuration file path argument`);
	}
	return { confPath, isTest };
})();

function makeServer(confPath: string): { server: Server, start: () => {}; } {
	const appConf = readConfFile(confPath);
	const app = makeWebhooksApp(appConf);
	const tlsOpts = {
		key: readFileSync(appConf.tls.key),
		cert: readFileSync(appConf.tls.cert)
	};
	const server = createServer(tlsOpts, app);
	const start = () => server.listen(appConf.port, appConf.address);
	return { server, start };
}

let { start, server } = makeServer(confPath);

if (isTest) {
	process.exit(0);
} else {
	start();
}

process.on('SIGTERM', () => {
	server.close(() => process.exit(0));
});

process.on('SIGHUP', () => {
	try {
		const { start, server: newServer} = makeServer(confPath);
		server.close(err => {
			if (err) {
				console.error(err);
				process.exit(1);
			} else {
				server = newServer;
				start();
			}
		});
	} catch (err) {
		console.error(err);
	}
});

console.log(`Webhooks service started with process id is ${process.pid}`);