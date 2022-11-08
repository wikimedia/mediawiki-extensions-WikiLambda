'use strict';
const assert = require( 'assert' ),
	ListZObjectsByType = require( '../pageobjects/ListZObjectsByType.page' ),
	FunctionPage = require( '../pageobjects/Function.page' );

describe( 'function evaluation', function () {
	it( 'evaluate a function', async function () {
		await ListZObjectsByType.open();
		const ListFunctions = await ListZObjectsByType.openFunctionsList();
		await ListFunctions.openFunction( 'echo' );

		FunctionPage.callFunctionWithString( 'foobar' );
		assert.equal( await FunctionPage.responseEnvelopZObject.getText(), 'foobar', 'The response should be "foobar"' );
	} );
} );
