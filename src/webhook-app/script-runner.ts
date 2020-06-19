/*
 Copyright (C) 2019 3NSoft Inc.
 */

import { RequestHandler, Request, Response } from "express";
import { join, isAbsolute, relative } from "path";
import { HookCfg } from "./confs";
import { NextFunction } from "express-serve-static-core";

type WebHookFn =
	(req: Request, rep: Response, staticArgs?: object) => Promise<void>;

export function scriptRunner(
	scriptsRoot: string, cfg: NonNullable<HookCfg['script']>
): RequestHandler {

	const modulePath = relative(__dirname,
		isAbsolute(cfg.file) ? cfg.file : join(scriptsRoot, cfg.file));
	delete require.cache[require.resolve(modulePath)];
	const script = require(modulePath);

	const hook: WebHookFn = script[cfg.func];
	if (typeof hook !== 'function') {
		throw new Error(`Script ${cfg.file} doesn't export function ${cfg.func}`);
	}

	const staticArgs = cfg.staticArgs;

	return async function (req: Request, rep: Response, next: NextFunction) {
		try {
			await hook(req, rep, staticArgs);
			next();
		} catch (err) {
			next(err);
		}
	}
}


Object.freeze(exports);