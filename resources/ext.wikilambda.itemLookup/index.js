/**
 * WikiLambda item lookup: the form controls this module offers CommunityConfiguration.
 *
 * Separate from ext.wikilambda.functionLookup on purpose. ResourceLoader gives each Codex module
 * its own copy of every Codex component it names, so one module holding both controls would send
 * the components of both to every form that uses either.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const OptedInArticlesControl = require( './OptedInArticlesControl.vue' );

module.exports = exports = {
	OptedInArticlesControl
};
