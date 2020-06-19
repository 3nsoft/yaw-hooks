/*
 Copyright (C) 2016, 2019 3NSoft Inc.
 
 This program is free software: you can redistribute it and/or modify it under
 the terms of the GNU General Public License as published by the Free Software
 Foundation, either version 3 of the License, or (at your option) any later
 version.
 
 This program is distributed in the hope that it will be useful, but
 WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 See the GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License along with
 this program. If not, see <http://www.gnu.org/licenses/>. */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import * as http from 'http';

export interface HttpError extends Error {
	status: number;
}

export function makeErr(code: number, msg: string): HttpError{
	const err = <HttpError> new Error(msg);
	err.status = code;
	return err;
 }

export type ErrLogger = (err: any, req: Request) => void;

export function makeErrHandler(log?: ErrLogger): ErrorRequestHandler {
	return async function (
		err: HttpError, req: Request, res: Response, next: NextFunction
	) {
		if (!res.finished) {
			let resStatus: number;
			let resBody: string;
			if (err && (typeof err.status === 'number')) {
				resStatus = err.status;
				if (resStatus === 500) {
					resBody = http.STATUS_CODES[500]!;
				} else if (err.message) {
					resBody = err.message;
				} else {
					resBody = http.STATUS_CODES[err.status]!;
				}
			} else {
				resStatus = 500;
				resBody = http.STATUS_CODES[500]!;
			}
			res.status(resStatus).send(resBody);
		}
		if (log) {
			log(err, req);
		}
	};
}

Object.freeze(exports);