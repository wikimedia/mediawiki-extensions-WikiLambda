'use strict';
const assert = require( 'assert' ),
	CreateZObjectPage = require( '../pageobjects/CreateZObject.page' ),
	EvaluateFunctionCall = require( '../pageobjects/EvaluateFunctionCall.page' );
describe( 'CreateZObject', function () {
	it( 'page should exist on installation', async function () {
		await CreateZObjectPage.open();
		assert.equal( await CreateZObjectPage.title.getText(), 'Create a new ZObject' );
	} );
} );
describe( 'EvaluateFunctionCall', function () {
	it( 'page should exist on installation', async function () {
		await EvaluateFunctionCall.open();
		assert.equal( await EvaluateFunctionCall.title.getText(), 'Evaluate a function call' );
	} );
} );
