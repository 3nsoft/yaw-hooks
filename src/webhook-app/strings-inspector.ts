/*
 Copyright (C) 2019 3NSoft Inc.
 */

import { RequestHandler, Request, Response, NextFunction } from "express";
import { makeErr } from "../lib-server/middleware/error-handler";


export function stringsInspector(): RequestHandler {
	return function (req: Request, rep: Response, next: NextFunction) {

		for (const p of Object.keys(req.params)) {
			if (hasBadChars(p)
			|| hasBadChars(req.params[p])) {
				return next(makeErr(400, `String(s) have special char(s)`));
			}
		}

		if (hasBadChars(req.body)) {
			return next(makeErr(400, `String(s) have special char(s)`));
		}

		next();
	};
}

const badChars = '$%&;#<|>\`\'\"';

function hasBadChars(x: any): boolean {
	if (typeof x === 'string') {
		for (let i=0; i<badChars.length; i+=1) {
			if (x.indexOf(badChars.charAt(i)) >= 0) { return true; }
		}
	} else if (x && (typeof x === 'object')) {
		if (Array.isArray(x)) {
			for (const v of x) {
				if (hasBadChars(v)) { return true; }
			}
		} else {
			for (let k of Object.keys(x)) {
				if (hasBadChars(x[k])) { return true; }
			}
		}
	}
	return false;
}


Object.freeze(exports);