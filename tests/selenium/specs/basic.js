'use strict';
const CreateZObjectPage = require( '../pageobjects/CreateZObject.page' ),
	EvaluateFunctionCall = require( '../pageobjects/EvaluateFunctionCall.page' ),
	ListZObjectsByType = require( '../pageobjects/ListZObjectsByType.page' );
describe( 'CreateZObject', function () {
	it( 'page should exist on installation', async function () {
		await CreateZObjectPage.open();
		await expect( await CreateZObjectPage.title ).toHaveText( 'Create a new ZObject' );
	} );
} );
describe( 'EvaluateFunctionCall', function () {
	it( 'page should exist on installation', async function () {
		await EvaluateFunctionCall.open();
		await expect( await EvaluateFunctionCall.title ).toHaveText( 'Evaluate a function call' );
	} );
} );
describe( 'ListZObjectsByType', function () {
	it( 'page should exist on installation', async function () {
		await ListZObjectsByType.open();
		await expect( await ListZObjectsByType.title ).toHaveText( 'List all ZObjects of a given type' );
	} );
} );
