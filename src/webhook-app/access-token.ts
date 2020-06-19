/*
 Copyright (C) 2019 3NSoft Inc.
 */

import { randomBytes, createHash } from "crypto";
import { RequestHandler, Request, Response, NextFunction } from "express";
import { makeErr } from "../lib-server/middleware/error-handler";

export interface TokenCfg {
	type: 'sha256';
	value: string;
}

const TOKEN_BYTES_PRE_B64_LEN = 32;

export function generateToken(
	type: TokenCfg['type']
): { tokenCfg: TokenCfg; secret: string; } {
	const bytes = randomBytes(TOKEN_BYTES_PRE_B64_LEN);
	const secret = packBytesIntoUrlSafeBase64(bytes);
	const tokenCfg: TokenCfg = {
		type: 'sha256',
		value: packBytesIntoUrlSafeBase64(hashSecret(secret, type))
	};
	return { secret, tokenCfg };
}

function hashSecret(secret: string, type: TokenCfg['type']): Buffer {
	const secretBytes = openBytesFromUrlSafeBase64(secret);
	const hasher = createHash(type);
	hasher.update(secretBytes);
	return hasher.digest();
}

function compareBytes(bytes: Buffer, expected: Buffer): boolean {
	try {
		if (bytes.length !== expected.length) { return false; }
		let differentbits = 0;
		for (let i=0; i<bytes.length; i+=1) {
			differentbits |= bytes[i] ^ expected[i];
		}
		return (differentbits === 0);
	} catch (err) {
		return false;
	}
}

function packBytesIntoUrlSafeBase64(bytes: Buffer): string {
	const b64Str = bytes.toString('base64');
	return b64Str.replace(/\+/g, '-').replace(/\//g, '_');
}

function openBytesFromUrlSafeBase64(urlSafeB64: string): Buffer {
	const b64 = urlSafeB64.replace(/-/g, '+').replace(/_/g, '/');
	return Buffer.from(b64, 'base64');
}

function hashBytesFromCfg(token: TokenCfg): Buffer {
	if (token.type.toLowerCase() === 'sha256') {
		return openBytesFromUrlSafeBase64(token.value);
	} else {
		throw new Error(`Token hash type ${token.type} is not supported`);
	}
}

export function checkToken(token: TokenCfg): void {
	if (token.type.toLowerCase() !== 'sha256') {
		throw new Error(`Unknown type in token configuration ${JSON.stringify(token)}`);
	}
	if ((typeof token.value !== 'string')
	|| (token.value.length === 0)
	|| (token.value !== packBytesIntoUrlSafeBase64(openBytesFromUrlSafeBase64(token.value)))) {
		throw new Error(`Invalid token value field in token configuration ${JSON.stringify(token)}`);
	}
}

export function accessVerifier(
	header: string, token: TokenCfg
): RequestHandler {

	const expectedHash = hashBytesFromCfg(token);
	const hType = token.type;

	return function (req: Request, rep: Response, next: NextFunction) {

		const secret = req.header(header);
		if (!secret || (typeof secret !== 'string')) {
			return next(makeErr(403, 'Invalid credentials'));
		}

		let h: Buffer;
		try {
			h = hashSecret(secret, hType);
		} catch (err) {
			return next(makeErr(403, 'Invalid credentials'));
		}

		const isOK = compareBytes(h, expectedHash);

		if (isOK) {
			next();
		} else {
			next(makeErr(403, 'Invalid credentials\n'));
		}
	};
}


Object.freeze(exports);