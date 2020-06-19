/*
 Copyright (C) 2019 3NSoft Inc.
 */

import * as express from 'express';
import { scriptRunner } from './script-runner';
import { json as parseJson, emptyBody, textPlain, binary } from '../lib-server/middleware/body-parsers';
import { makeErrHandler } from '../lib-server/middleware/error-handler';
import { accessVerifier } from './access-token';
import { stringsInspector } from './strings-inspector';
import { AppConf, checkHookCfg } from './confs';
import { procRunner } from './proc-runner';
import { join } from 'path';
import { resolve } from 'url';
import { readdirSync } from 'fs';

const ACCESS_TOKEN_HEADER = "X-Access-Token";

const PROC_TIMEOUT_SECS = 10*60;

const SHELL_SCRIPTS = join(__dirname, '../../../webhooks-shell');

const JS_SCRIPTS = join(__dirname, '../../../webhooks-js');

export function makeWebhooksApp(cfg: AppConf): express.Express {

	const { runRoot, scriptsRoot } = hooksFolder(cfg);

	const app = express();
	app.disable('etag');

	for (const hook of cfg.hooks) {
		checkHookCfg(hook);

		const handlers: express.RequestHandler[] = [
			accessVerifier(ACCESS_TOKEN_HEADER, hook.request.accessToken)
		];

		const reqType = hook.request.type.toUpperCase() as typeof hook.request.type;

		if (reqType === 'POST') {
			if (!hook.request.body) {
				handlers.push(emptyBody(false));
			} else {
				const reqBody = hook.request.body.toLowerCase() as typeof hook.request.body;
				const maxLen = hook.request.bodyMaxSize ?
					hook.request.bodyMaxSize : '4kb'
				if (reqBody === 'json') {
					handlers.push(parseJson(maxLen, false));
				} else if (reqBody === 'text') {
					handlers.push(textPlain(maxLen, false));
				} else if (reqBody === 'binary') {
					handlers.push(binary(maxLen, false));
				} else if (reqBody === 'stream') {
					// explicitly no parser/byte-collector
				} else {
					throw new Error(`Unsupported request body type ${reqBody}`);
				}
			}
		}

		if (hook.script) {
			handlers.push(scriptRunner(scriptsRoot, hook.script));
		} else if (hook.run) {
			if (hook.run.shell) {
				handlers.push(stringsInspector());
			}
			handlers.push(procRunner(runRoot, hook.run, '16kb', PROC_TIMEOUT_SECS));
		} else {
			throw new Error(`There is neither script, nor run section present in hook ${JSON.stringify(hook)}`);
		}

		const route = app.route(resolve('/', hook.request.url));

		if (reqType === 'GET') {
			route.get(...handlers);
		} else if (reqType === 'POST') {
			route.post(...handlers);
		} else {
			throw new Error(`Unknown request type in hook ${JSON.stringify(hook)}`);
		}
	}

	app.use(makeErrHandler((err, req): void => {
		if (typeof err.status !== 'number') {
			console.error(`\n --- Error occured in webhook shell command runner app, when handling ${req.method} request to ${req.originalUrl}`);
			console.error(err);
		}
	}));

	return app;
}

function hooksFolder(
	cfg: AppConf
): { scriptsRoot: string; runRoot: string; } {
	const scriptsRoot = ((typeof cfg.scriptsRoot === 'string') ?
		cfg.scriptsRoot : JS_SCRIPTS);
	readdirSync(scriptsRoot);
	const runRoot = ((typeof cfg.runRoot === 'string') ?
		cfg.runRoot : SHELL_SCRIPTS);
	readdirSync(runRoot);
	return { runRoot, scriptsRoot };
}


Object.freeze(exports);