/*
 Copyright (C) 2015 - 2016, 2019 3NSoft Inc.
 
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

import { Request, RequestHandler, Response, NextFunction } from 'express';
import { stringToNumOfBytes } from '../conf-util';
import { makeErr } from './error-handler';
import { defer, BytesFIFOBuffer } from '../../lib-common/utils';

const HTTP_HEADER = {
	contentType: 'Content-Type',
	contentLength: 'Content-Length'
}

const TYPES = {
	plain: 'text/plain',
	json: 'application/json',
	bin: 'application/octet-stream'
}

const EMPTY_BUFFER = Buffer.alloc(0);

const noop = {
	onData: (chunk: Buffer) => {},
	onEnd: () => {}
};

export function attachByteDrainToRequest(req: Request): void {
	req.on('data', noop.onData);
	req.on('end', noop.onEnd);
}

/**
 * Use this for empty-body POST and PUT routes, as it does sanitization, and
 * prevents hanging requests, because nothing drains data.
 * @param requireContentLen is an optional flag that regulates check of
 * Contents-Length header. Default value is true, forcing the check.
 * @return a middleware function that ensures empty body in requests.
 */
export function emptyBody(requireContentLen = true): RequestHandler {
	return (req: Request, res: Response, next: NextFunction) => {
		attachByteDrainToRequest(req);

		if (requireContentLen) {
			// get and check Content-Length
			const contentLen = parseInt(req.get(HTTP_HEADER.contentLength)!, 10);
			if (isNaN(contentLen)) {
				return next(makeErr(411,
					"Content-Length header is required with proper number.\n"));
			}
			if (contentLen !== 0) {
				return next(makeErr(413, "Request body is too long.\n"));
			}
		}
		
		next();
	}	
}

function byteCollector(
	maxSize: string|number, contentType: string, requireContentLen: boolean,
	parser?: RequestHandler
): RequestHandler {
	const maxSizeNum = stringToNumOfBytes(maxSize);
	if ('string' !== typeof contentType) { throw new Error(
			"Given 'contentType' argument must be a string.\n"); }
	return (req: Request, res: Response, next: NextFunction) => {
		// check Content-Type
		if (!req.is(contentType)) {
			attachByteDrainToRequest(req);
			return next(makeErr(415, `Content-Type must be ${contentType} for this call.\n`));
		}

		// get and check Content-Length
		let isLenExact = true;
		let contentLength = parseInt(req.get(HTTP_HEADER.contentLength)!, 10);
		if (isNaN(contentLength)) {
			if (requireContentLen) {
				attachByteDrainToRequest(req);
				return next(makeErr(411,
					"Content-Length header is required with proper number.\n"));
			}
			contentLength = maxSizeNum;
			isLenExact = false;
		} else {
			// enforce agreed limit on request size
			if (contentLength > maxSizeNum) {
				attachByteDrainToRequest(req);
				return next(makeErr(413, "Request body is too long.\n"));
			}
		}


		// XXX we may use fifo here, postponing byte copying till moment, when
		//		everything is downloaded
		const chunks = new BytesFIFOBuffer(true);

		// set body to be buffer for all expected incoming bytes
		req.body = (contentLength > 0) ?
			Buffer.alloc(contentLength) : EMPTY_BUFFER;

		// collect incoming bytes into body array
		let erred = false;
		req.on('data', (chunk: Buffer) => {
			if (erred) { return; }
			if ((chunks.length + chunk.length) <= contentLength) {
				chunks.push(chunk);
			} else {
				erred = true;
				chunks.clear();
				next(makeErr(413, "Request body is too long.\n"));
			}
		});
		req.on('end', () => {
			if (erred) { return; }
			if (!isLenExact || (chunks.length === contentLength)) {
				const allBytes = chunks.getBytes(undefined);
				req.body = (allBytes ? allBytes : EMPTY_BUFFER);
			} else {
				erred = true;
				chunks.clear();
				return next(makeErr(413, "Request body is shorter than expected.\n"));
			}
			if (parser) {
				parser(req, res, next);
			} else {
				next();
			}
		});
	};
}

/**
 * @param maxSize is a maximum allowed body length, given as number of bytes,
 * or string parameter for kb/mb's.
 * @param requireContentLen is an optional flag that regulates check of
 * Contents-Length header. Default value is true, forcing the check.
 * @return middleware function, that places all request bytes into Buffer,
 * placed into usual body field of request object. 
 */
export function binary(
	maxSize: string|number, requireContentLen = true
): RequestHandler {
	return byteCollector(maxSize, TYPES.bin, requireContentLen);
}

/**
 * @param maxSize is a maximum allowed body length, given as number of bytes,
 * or string parameter for kb/mb's.
 * @param allowNonObject is a boolean flag, which, when true, turns of a check
 * that forces body to be an object.
 * @param requireContentLen is an optional flag that regulates check of
 * Contents-Length header. Default value is true, forcing the check.
 * @return middleware function, that parses all request bytes as JSON, placing
 * result into usual body field of request object.
 */
export function json(
	maxSize: string|number, allowNonObject?: boolean, requireContentLen = true
): RequestHandler {
	return byteCollector(maxSize, TYPES.json, requireContentLen,
		(req: Request, res: Response, next: NextFunction) => {
			try {
				const bodyAsStr = req.body.toString('utf8');
				req.body = JSON.parse(bodyAsStr);
			} catch (err) {
				return next(makeErr(400,
					"Request body cannot be interpreted as JSON.\n"));
			}
			if (!allowNonObject &&
					(!req.body || (typeof req.body !== 'object'))) {
				return next(makeErr(400, "Request body is not a JSON object.\n"));
			}
			next();
		});
}

/**
 * @param maxSize is a maximum allowed body length, given as number of bytes, or
 * string parameter for kb/mb's.
 * @param requireContentLen is an optional flag that regulates check of
 * Contents-Length header. Default value is true, forcing the check.
 * @return middleware function, that parses all request bytes as utf8 text,
 * placing result into usual body field of request object.
 */
export function textPlain(
	maxSize: string|number, requireContentLen = true
): RequestHandler {
	return byteCollector(maxSize, TYPES.plain, requireContentLen,
		(req: Request, res: Response, next: NextFunction) => {
			try {
				req.body = req.body.toString('utf8');
			} catch (err) {
				return next(makeErr(400,
					"Request body cannot be interpreted as plain utf8 text.\n"));
			}
			next();
		});
}

Object.freeze(exports);