/*
 Copyright (C) 2019 3NSoft Inc.
 */

import { RequestHandler, Request, Response, NextFunction } from "express";
import { HookCfg } from "./confs";
import { spawn, SpawnOptions, ChildProcess } from "child_process";
import { copy } from "../lib-common/json-utils";
import { stringToNumOfBytes } from "../lib-server/conf-util";

export function procRunner(
	scriptsRoot: string, cfg: NonNullable<HookCfg['run']>,
	defaultBatchBuffer: number|string, defaultTimeout: number
): RequestHandler {

	const batchMode = !!cfg.batchMode;

	const command = cfg.command;

	const staticArgs = (cfg.staticArgs ? argsFrom(cfg.staticArgs) : []);

	const commonSpawnOpts = spawnOptsFrom(cfg, scriptsRoot);

	const procTimeout = Math.round(
		(cfg.timeout ? cfg.timeout : defaultTimeout)*1000);
	
	const batchBufferLimit = stringToNumOfBytes(
		cfg.batchMaxSize ? cfg.batchMaxSize : defaultBatchBuffer);

	const bodyIsWithArgs = !cfg.bodyStdin;

	return async function (req: Request, rep: Response, next: NextFunction) {

		const args = (bodyIsWithArgs ?
			staticArgs.concat(argsFrom(req.body)) : staticArgs);

		const opts = copy(commonSpawnOpts);
		addEnvFromParams(opts, req.query);

		const proc = spawn(command, args, opts);

		if (!bodyIsWithArgs) {
			req.pipe(proc.stdin, { end: true });
		}

		const { onProcData, doOnExit } = (batchMode ?
			bufferProcDataAndSendAll(batchBufferLimit, rep, next) :
			streamProcData(rep, next));

		const { onProcExit } = setupProcCompletion(proc, procTimeout, doOnExit);
	
		proc.stdout.on('data', onProcData);
		proc.stderr.on('data', onProcData);
	
		proc.on('close', onProcExit);
		proc.on('exit', onProcExit);
	
		proc.on('error', next);

	};
}

type HandleProcData = (chunk: string|Buffer) => void;
type HandleProcExit = (code: number) => void;

function setupProcCompletion(
	proc: ChildProcess, procTimeout: number, doOnExit: HandleProcExit
): { onProcExit: HandleProcExit } {

	let procRunning = true;

	const tOut = setTimeout(() => {
		if (!procRunning) { return; }
		proc.kill('TERM');
	}, procTimeout);
	tOut.unref();

	const onProcExit = (code: number) => {
		if (!procRunning) { return; }
		procRunning = false;
		clearTimeout(tOut);
		doOnExit(code);
	};

	return { onProcExit };
}

function bufferProcDataAndSendAll(
	maxBuffer: number, rep: Response, next: NextFunction
): { onProcData: HandleProcData; doOnExit: HandleProcExit } {

	let buffer: (string|Buffer)[] = [];
	let bufLen = 0;
	let canBuffer = true;

	const onProcData: HandleProcData = chunk => {
		if (!canBuffer) { return; }
		if ((bufLen + chunk.length) <= maxBuffer) {
			buffer.push(chunk);
			bufLen += chunk.length;
		} else {
			canBuffer = false;
			buffer.push(`

Error: standard out buffer overflowed.
Either increase webhook buffer limit, or use streaming mode.
`);
		}
	};

	const sendBufferAndComplete = () => {
		const chunk = buffer.shift();
		if (!chunk) {
			rep.end();
			return next();
		}
		rep.write(chunk, err => {
			if (err) {
				buffer = [];
			}
			sendBufferAndComplete();
		});
	};

	const doOnExit: HandleProcExit = code => {
		canBuffer = false;
		if (rep.finished) { return; }
		rep.status((code === 0) ? 200 : 555);
		buffer.push(completionMsg(code));
		sendBufferAndComplete();
	};

	return { onProcData, doOnExit };
}

function streamProcData(
	rep: Response, next: NextFunction
): { onProcData: HandleProcData; doOnExit: HandleProcExit } {

	let firstChunkSent = false;

	const stopSendingIfErr = (err: any) => {
		if (!err || rep.finished) { return; }
		rep.end();
		next();
	};

	const sendChunk: HandleProcData = chunk => {
		if (rep.finished) { return; }
		if (!firstChunkSent) {
			firstChunkSent = true;
			rep.status(200);
			rep.write(`
Webhook starts execution in a streaming mode

`, stopSendingIfErr);
		}
		rep.write(chunk, stopSendingIfErr);
	};

	const doOnExit: HandleProcExit = code => {
		if (rep.finished) { return; }

		if (!firstChunkSent) {
			rep.status((code === 0) ? 200 : 555).send(completionMsg(code));
			firstChunkSent = true;
		} else {
			rep.write(completionMsg(code));
			rep.end();
		}

		next();
	};

	return { onProcData: sendChunk, doOnExit };
}

function completionMsg(code: number): string {
	return `
Webhook completed with return code ${code}
`;
}

function argsFrom(str: any): string[] {
	const args: string[] = [];
	if (typeof str === 'string') {
		str.split(' ').filter(str => (str.length > 0))
		.map(str => str.split('\n').filter(str => (str.length > 0)))
		.filter(chunks => (chunks.length > 0))
		.forEach(chunks => args.push(...chunks));
	}
	return args;
}

function spawnOptsFrom(
	cfg: NonNullable<HookCfg['run']>, scriptsRoot: string
): SpawnOptions {
	const opts: SpawnOptions = {};
	opts.cwd = (cfg.cwd ? cfg.cwd : scriptsRoot);
	if (cfg.shell) {
		opts.shell = cfg.shell;
	}
	if (cfg.env && (Object.keys(cfg.env).length > 0)) {
		opts.env = {};
		Object.entries(cfg.env).forEach(([k, v]) => {
			opts.env![k] = v;
		});
	}
	if (cfg.uid) {
		opts.uid = cfg.uid;
	}
	if (cfg.gid) {
		opts.gid = cfg.gid;
	}
	return opts;
}

function addEnvFromParams(opts: SpawnOptions, qParams: object): void {
	if (Object.keys(qParams).length > 0) {
		if (!opts.env) {
			opts.env = {};
		}
		Object.entries(qParams)
		.filter(([k, v]) => (typeof v === 'string'))
		.forEach(([k, v]) => {
			opts.env![k] = v;
		});
	}
}


Object.freeze(exports);