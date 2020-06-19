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

	it(`runs hook with GET`, () => {
		const out = execSync(
			`curl --cacert tests/tls/cert.pem --silent --header "X-Access-Token: Zr2-h_d6CpJcJF0Yh0aZvHFExcpagOngv1o1PFWUGTc=" https://localhost:8080/list`,
			{ timeout: 3000, encoding: 'utf8' });
		expect(out.indexOf('0')).toBeGreaterThanOrEqual(0);
	});

	it(`runs hook with POST-ed text input`, () => {
		const out = execSync(
			`curl --cacert tests/tls/cert.pem --silent --header "X-Access-Token: blsjHWbZbWKnnd5dfwweNgZR52k1g1v72OAyAcqe-WY=" -X POST --header "Content-Type: text/plain" --data "${__dirname}" https://localhost:8080/list-that`,
			{ timeout: 3000, encoding: 'utf8' });
		expect(out.indexOf('.js')).toBeGreaterThanOrEqual(0);
	});

	it(`runs hook with GET`, () => {
		const out = execSync(
			`curl --cacert tests/tls/cert.pem --silent --header "X-Access-Token: KoGbPlV4PYKfAUa-qzHX2h98S3GvGybm-WmPzZBGyrA=" https://localhost:8080/test-shell?dynVar=123456`,
			{ timeout: 3000, encoding: 'utf8' });
		expect(out.indexOf('String in static environment variable')).toBeGreaterThanOrEqual(0);
		expect(out.indexOf('123456')).toBeGreaterThanOrEqual(0);
	});

	it(`runs hook with POST-ed binary input`, () => {
		const data = "some totally random data 1234567"
		const out = execSync(
			`curl --cacert tests/tls/cert.pem --silent --header "X-Access-Token: xgbGrORwbC68AzVeqIC5gQRZyHm2q0BWeNh2Nz40fFI=" -X POST --data "${data}" https://localhost:8080/echo2`,
			{ timeout: 3000, encoding: 'utf8' });
			expect(out.indexOf(data)).toBeGreaterThanOrEqual(0);
	});

});
