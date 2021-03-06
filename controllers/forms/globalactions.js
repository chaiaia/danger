'use strict';

const { Posts } = require(__dirname+'/../../db/')
	, actionHandler = require(__dirname+'/../../models/forms/actionhandler.js')
	, actionChecker = require(__dirname+'/../../helpers/checks/actionchecker.js');

module.exports = async (req, res, next) => {

	const errors = [];

	//make sure they checked 1-10 posts
	if (!req.body.globalcheckedposts || req.body.globalcheckedposts.length === 0 || req.body.globalcheckedposts.length > 10) {
		errors.push('Must select 1-10 posts')
	}

	//checked reports
	if (req.body.checkedreports) {
		if (!req.body.global_report_ban) {
			errors.push('Must select a report action if checked reports');
		}
		if (req.body.checkedreports.length > 50) {
			//50 because checked posts is max 10 and 5 reports max per post
			errors.push('Cannot check more than 50 reports');
		}
	}

	res.locals.actions = actionChecker(req);

	//make sure they have any global actions, and that they only selected global actions
	if (res.locals.actions.numGlobal === 0 || res.locals.actions.validActions.length > res.locals.actions.numGlobal) {
		errors.push('Invalid actions selected');
	}

	//check that actions are valid
	if (req.body.password && req.body.password.length > 50) {
		errors.push('Password must be 50 characters or less');
	}
	if (req.body.ban_reason && req.body.ban_reason.length > 50) {
		errors.push('Ban reason must be 50 characters or less');
	}
	if (req.body.log_message && req.body.log_message.length > 50) {
		errors.push('Modlog must be 50 characters or less');
	}

	//return the errors
	if (errors.length > 0) {
		return res.status(400).render('message', {
			'title': 'Bad request',
			'errors': errors,
			'redirect': '/globalmanage/reports.html'
		})
	}

	//get posts with global ids only
	try {
		res.locals.posts = await Posts.globalGetPosts(req.body.globalcheckedposts, true);
	} catch (err) {
		return next(err);
	}
	if (!res.locals.posts || res.locals.posts.length === 0) {
		return res.status(404).render('message', {
			'title': 'Not found',
			'errors': 'Selected posts not found',
			'redirect': '/globalmanage/reports.html'
		})
	}

	try {
		await actionHandler(req, res, next);
	} catch (err) {
		console.error(err);
		return next(err);
	}

}

