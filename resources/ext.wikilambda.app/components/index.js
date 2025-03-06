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
const FunctionInputField = require( './visualeditor/FunctionInputField.vue' );
const FunctionInputSetup = require( './visualeditor/FunctionInputSetup.vue' );
const FunctionInputEnum = require( './visualeditor/FunctionInputEnum.vue' );
const FunctionInputString = require( './visualeditor/FunctionInputString.vue' );

// Export all components that we want to make visible
// from other modules (e.g. function selection and
// function call setup components for Visual Editor)
module.exports = {
	App,
	FunctionCallSetup,
	FunctionInputField,
	FunctionInputEnum,
	FunctionInputString,
	FunctionInputSetup,
	FunctionSelect
};
