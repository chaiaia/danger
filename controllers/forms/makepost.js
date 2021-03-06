'use strict';

const makePost = require(__dirname+'/../../models/forms/makepost.js')
	, deleteTempFiles = require(__dirname+'/../../helpers/files/deletetempfiles.js')
	, dynamicResponse = require(__dirname+'/../../helpers/dynamic.js')
	, { globalLimits } = require(__dirname+'/../../configs/main.js')
	, { Files } = require(__dirname+'/../../db/');

module.exports = async (req, res, next) => {

	const errors = [];

	// even if force file and message are off, the post must contain one of either.
	if ((!req.body.message || req.body.message.length === 0) && res.locals.numFiles === 0) {
		errors.push('Posts must include a message or file');
	}
	if (res.locals.numFiles > res.locals.board.settings.maxFiles) {
		errors.push(`Too many files. Max files per post ${res.locals.board.settings.maxFiles < globalLimits.postFiles.max ? 'on this board ' : ''}is ${res.locals.board.settings.maxFiles}`);
	}
	// check file, subject and message enforcement according to board settings
	if (!req.body.subject || req.body.subject.length === 0) {
		if (!req.body.thread && res.locals.board.settings.forceThreadSubject) {
			errors.push('Threads must include a subject');
		} //no option to force op subject, seems useless
	}
	if (globalLimits.postFiles.max !== 0 && res.locals.board.settings.maxFiles !== 0 && res.locals.numFiles === 0) {
		if (!req.body.thread && res.locals.board.settings.forceThreadFile) {
			errors.push('Threads must include a file');
		} else if (res.locals.board.settings.forceReplyFile) {
			errors.push('Posts must include a file');
		}
	}
	if (!req.body.message || req.body.message.length === 0) {
		if (!req.body.thread && res.locals.board.settings.forceThreadMessage) {
			errors.push('Threads must include a message');
		} else if (res.locals.board.settings.forceReplyMessage) {
			errors.push('Posts must include a message');
		}
	}
	if (req.body.message) {
		if (req.body.message.length > globalLimits.messageLength.max) {
			errors.push(`Message must be ${globalLimits.messageLength.max} characters or less`);
		} else if (!req.body.thread && req.body.message.length < res.locals.board.settings.minThreadMessageLength) {
			errors.push(`Thread messages must be at least ${res.locals.board.settings.minMessageLength} characters long`);
		} else if (req.body.thread && req.body.message.length < res.locals.board.settings.minReplyMessageLength) {
			errors.push(`Reply messages must be at least ${res.locals.board.settings.minMessageLength} characters long`);
		}
	}

	// subject, email, name, password limited length
	if (req.body.name && req.body.name.length > 50) {
		errors.push('Name must be 50 characters or less');
	}
	if (req.body.subject && req.body.subject.length > 50) {
		errors.push('Subject must be 50 characters or less');
	}
	if (req.body.email && req.body.email.length > 50) {
		errors.push('Email must be 50 characters or less');
	}
	if (req.body.password && req.body.password.length > 50) {
		errors.push('Password must be 50 characters or less');
	}

	if (errors.length > 0) {
		await deleteTempFiles(req).catch(e => console.error);
		return dynamicResponse(req, res, 400, 'message', {
			'title': 'Bad request',
			'errors': errors,
			'redirect': `/${req.params.board}${req.body.thread ? '/thread/' + req.body.thread + '.html' : ''}`
		});
	}

	try {
		await makePost(req, res, next);
	} catch (err) {
		await deleteTempFiles(req).catch(e => console.error);
		if (res.locals.numFiles > 0) {
			await Files.decrement(req.files.file.filter(x => x.inced === true && x.filename != null).map(x => x.filename)).catch(e => console.error);
		}
		return next(err);
	}

}
