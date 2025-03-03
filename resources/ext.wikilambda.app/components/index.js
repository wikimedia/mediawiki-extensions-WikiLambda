/*!
 * WikiLambda Vue components export package
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const App = require( './App.vue' );
const FunctionSelect = require( './visualeditor/FunctionSelect.vue' );
const FunctionCallSetup = require( './visualeditor/FunctionCallSetup.vue' );
const FunctionInputSetup = require( './visualeditor/FunctionInputSetup.vue' );

// Export all components that we want to make visible
// from other modules (e.g. function selection and
// function call setup components for Visual Editor)
module.exports = {
	App,
	FunctionCallSetup,
	FunctionInputSetup,
	FunctionSelect
};
