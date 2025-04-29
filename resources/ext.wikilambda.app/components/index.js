/*!
 * WikiLambda Vue components export package
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const App = require( './App.vue' );
const ExpandableDescription = require( './visualeditor/ExpandableDescription.vue' );
const FunctionCallSetup = require( './visualeditor/FunctionCallSetup.vue' );
const FunctionInputEnum = require( './visualeditor/FunctionInputEnum.vue' );
const FunctionInputField = require( './visualeditor/FunctionInputField.vue' );
const FunctionInputParser = require( './visualeditor/FunctionInputParser.vue' );
const FunctionInputPreview = require( './visualeditor/FunctionInputPreview.vue' );
const FunctionInputSetup = require( './visualeditor/FunctionInputSetup.vue' );
const FunctionInputString = require( './visualeditor/FunctionInputString.vue' );
const FunctionSelect = require( './visualeditor/FunctionSelect.vue' );
const FunctionSelectItem = require( './visualeditor/FunctionSelectItem.vue' );

// Export all components that we want to make visible
// from other modules (e.g. function selection and
// function call setup components for Visual Editor)
module.exports = {
	App,
	ExpandableDescription,
	FunctionCallSetup,
	FunctionInputEnum,
	FunctionInputField,
	FunctionInputParser,
	FunctionInputPreview,
	FunctionInputSetup,
	FunctionInputString,
	FunctionSelect,
	FunctionSelectItem
};
