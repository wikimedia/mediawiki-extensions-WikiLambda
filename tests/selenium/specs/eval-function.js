'use strict';
const ListZObjectsByType = require( '../pageobjects/ListZObjectsByType.page' ),
	FunctionPage = require( '../pageobjects/Function.page' );

describe( 'function evaluation', function () {
	it( 'evaluate a function', async function () {
		await ListZObjectsByType.open();
		const ListFunctions = await ListZObjectsByType.openFunctionsList();
		await ListFunctions.openFunction( 'echo' );

		await FunctionPage.callFunctionWithString( 'foobar' );
		await expect( await FunctionPage.responseEnvelopZObject ).toHaveText( 'foobar', { message: 'The response should be "foobar"' } );
	} );
} );
