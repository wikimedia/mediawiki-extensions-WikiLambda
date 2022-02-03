'use strict';
const assert = require( 'assert' ),
	CreateZObjectPage = require( '../pageobjects/CreateZObject.page' ),
	EvaluateFunctionCall = require( '../pageobjects/EvaluateFunctionCall.page' );
describe( 'CreateZObject', function () {
	it( 'page should exist on installation', function () {
		CreateZObjectPage.open();
		assert.equal( CreateZObjectPage.title.getText(), 'Define function' );
	} );
} );
describe( 'EvaluateFunctionCall', function () {
	it( 'page should exist on installation', function () {
		EvaluateFunctionCall.open();
		assert.equal( EvaluateFunctionCall.title.getText(), 'Evaluate a function call' );
	} );
} );
