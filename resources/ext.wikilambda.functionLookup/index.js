/**
 * WikiLambda function lookup: the form controls this module offers CommunityConfiguration.
 *
 * CommunityConfiguration reads the CommunityConfiguration/Controls attribute of extension.json,
 * loads the module named there, and takes the component out of these exports by name.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const FunctionLookupControl = require( './FunctionLookupControl.vue' );

module.exports = exports = {
	FunctionLookupControl
};
