/*
 Copyright (C) 2019 3NSoft Inc.
 */

import { spawn } from "child_process";
import { sleep } from "./processes";

export type StopServer = () => Promise<number>;

export async function startServer(): Promise<StopServer> {
	const proc = spawn('node', [ 'build/run.js', 'tests/test-conf.yml' ], {
		stdio: 'inherit'
	});

	let returnCode: number|undefined = undefined;

	const exit = new Promise<number>(resolve => {
		proc.on('exit', code => {
			returnCode = code!;
			resolve(returnCode);
		});
	});

	await sleep(500);

	if (returnCode !== undefined) {
		throw new Error(`Server failed with return code ${returnCode}`);
	}

	return () => {
		proc.kill('SIGTERM');
		return exit;
	};
}


Object.freeze(exports);