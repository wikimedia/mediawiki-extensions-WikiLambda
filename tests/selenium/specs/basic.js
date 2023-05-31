/*!
 * WikiLambda browser test suite of basic tests
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const CreateZObjectPage = require( '../pageobjects/special/CreateZObject.page' ),
	EvaluateFunctionCall = require( '../pageobjects/special/EvaluateFunctionCall.page' ),
	ListZObjectsByType = require( '../pageobjects/special/ListZObjectsByType.page' );
describe( 'Installation checks', function () {

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
} );
