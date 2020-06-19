/*
 Copyright (C) 2019 3NSoft Inc.
 */

import { checkToken, TokenCfg } from "./access-token";
import { stringToNumOfBytes } from "../lib-server/conf-util";
import { parse as parseYaml } from 'yaml';
import { readFileSync, readdirSync } from "fs";

export interface HookCfg {
	request: {
		type: 'GET' | 'POST';
		url: string;
		body?: 'json' | 'text' | 'binary' | 'stream';
		bodyMaxSize?: string|number;
		accessToken: TokenCfg;
	};
	script?: {
		file: string;
		func: string;
		staticArgs?: any;
	};
	run?: {
		command: string;
		staticArgs?: any;
		bodyStdin?: true;
		shell?: boolean|string;
		cwd?: string;
		env?: object;
		batchMode?: true;
		batchMaxSize?: string|number;
		uid?: number;
		gid?: number;
		timeout?: number;
	};
}

export function checkHookCfg(cfg: HookCfg): void {

	if ((typeof cfg.request !== 'object') || !cfg.request) {
		throwFieldErr('request', cfg);
	}
	if ((typeof cfg.request.url !== 'string')) {
		throwFieldErr('request.url', cfg);
	}
	if ((cfg.request.type.toUpperCase() !== 'GET')
	&& (cfg.request.type.toUpperCase() !== 'POST')) {
		throwErr(`Only GET and POST request types are allowed.`, cfg);
	}
	if (cfg.request.body) {
		if (cfg.request.type.toUpperCase() === 'GET') {
			throwErr(`GET request can't have a body`, cfg);
		}
		if ((cfg.request.body.toLowerCase() !== 'json')
		&& (cfg.request.body.toLowerCase() !== 'text')
		&& (cfg.request.body.toLowerCase() !== 'binary')
		&& (cfg.request.body.toLowerCase() !== 'stream')) {
			throwErr(`Unknown body type.`, cfg);
		}
		if (cfg.request.bodyMaxSize) {
			stringToNumOfBytes(cfg.request.bodyMaxSize);
		}
	}
	checkToken(cfg.request.accessToken);

	if ((!cfg.script && !cfg.run) || (cfg.script && cfg.run)) {
		throwErr(`Either script or run parameter should be present.`, cfg);
	}

	if (cfg.script) {
		if (!cfg.script.file || (typeof cfg.script.file !== 'string')) {
			throwFieldErr('script.file', cfg);
		}
		if (!cfg.script.func || (typeof cfg.script.func !== 'string')) {
			throwFieldErr('script.func', cfg);
		}
	} else if (cfg.run) {
		if (!cfg.run.command || (typeof cfg.run.command !== 'string')) {
			throwFieldErr('run.command', cfg);
		}
		if (cfg.run.bodyStdin) {
			if (!cfg.request.body
			|| (cfg.request.body.toLowerCase() !== 'stream')) {
				throwErr(`Body as standard input flag requires body to be a stream.`, cfg);
			}
		}
		if (cfg.run.shell) {
			if ((typeof cfg.run.shell !== 'boolean')
			&& (typeof cfg.run.shell !== 'string')) {
				throwFieldErr('run.shell', cfg);
			}
		}
		if (cfg.run.cwd) {
			if (typeof cfg.run.cwd !== 'string') {
				throwFieldErr('run.cwd', cfg);
			}
			readdirSync(cfg.run.cwd);
		}
		if (cfg.run.env) {
			if ((typeof cfg.run.env !== 'object')
			|| Array.isArray(cfg.run.env)
			|| Object.values(cfg.run.env).find(v => !isStringOrNum(v))) {
				throwFieldErr('run.env', cfg);
			}
		}
		if (cfg.run.batchMaxSize) {
			stringToNumOfBytes(cfg.run.batchMaxSize);
		}
		if (cfg.run.uid && (typeof cfg.run.uid !== 'number')) {
			throwFieldErr('run.uid', cfg);
		}
		if (cfg.run.gid && (typeof cfg.run.gid !== 'number')) {
			throwFieldErr('run.gid', cfg);
		}
		if (cfg.run.timeout) {
			if ((typeof cfg.run.timeout !== 'number')
			|| (cfg.run.timeout < 1)) {
				throwFieldErr('run.gid', cfg);
			}
		}
	}

}

function throwFieldErr(field: string, cfg: object): never {
	throw new Error(`Missing or invalid ${field} field in hook ${JSON.stringify(cfg)}`);
}

function throwErr(reason: string, cfg: object): never {
	throw new Error(`${reason} Invalid hook ${JSON.stringify(cfg)}`);
}

function isStringOrNum(x: any): boolean {
	if (typeof x === 'number') { return true; }
	if ((typeof x === 'string') && (x.length > 0)) { return true; }
	return false;
}

export interface AppConf {
	hooks: HookCfg[];
	scriptsRoot?: string;
	runRoot?: string;
	port: number;
	address?: string;
	tls: {
		key: string;
		cert: string;
	};
}

export function readConfFile(path: string): AppConf {
	const str = readFileSync(path, { encoding: 'utf8' });
	const appConf = parseYaml(str) as AppConf;
	if (!Number.isInteger(appConf.port) || (appConf.port < 1)) {
		throw new Error(`Missing or invalid port value in confiration file ${path}`);
	}
	return appConf;
}


Object.freeze(exports);