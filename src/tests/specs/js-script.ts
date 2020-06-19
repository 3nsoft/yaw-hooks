/*
 Copyright (C) 2019 3NSoft Inc.
 */

import { beforeAllAsync, afterAllAsync } from "../libs-for-tests/async-jasmine";
import { startServer, StopServer } from "../libs-for-tests/start-server";
import { execSync } from "child_process";

describe(`Webhook server`, () => {

	let stopServer: StopServer;

	beforeAllAsync(async () => {
		stopServer = await startServer();
	});

	afterAllAsync(async () => {
		await stopServer();
	});

	it(`runs hook with POST-ed binary input`, () => {
		const data = "some totally random data"
		const out = execSync(
			`curl --cacert tests/tls/cert.pem --silent --header "X-Access-Token: 3IIIdbzA9B_k2h6b0cbjKYdkJifb8x_H3E6VQdWs-A8=" -X POST --header "Content-Type: application/octet-stream" --data "${data}" https://localhost:8080/echo`,
			{ timeout: 3000, encoding: 'utf8' });
		expect(out.indexOf(data)).toBeGreaterThanOrEqual(0);
	});

});
