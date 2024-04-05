/*!
 * WikiLambda browser test suite of basic tests
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const LoginPage = require( 'wdio-mediawiki/LoginPage' ),
	CreateObjectPage = require( '../pageobjects/special/CreateObject.page.js' ),
	RunFunction = require( '../pageobjects/special/RunFunction.page.js' ),
	ListObjectsByType = require( '../pageobjects/special/ListObjectsByType.page.js' ),
	i18n = require( '../utils/i18n.js' )();

describe( 'Installation checks', function () {

	describe( 'CreateObject', function () {
		it( 'page should exist on installation but deny to logged-out user', async function () {
			await CreateObjectPage.open();
			await expect( await CreateObjectPage.title ).toHaveText( 'Permission error' );
		} );
		it( 'page should exist on installation and work when logged in', async function () {
			await LoginPage.loginAdmin();
			await expect( browser ).toHaveUrlContaining( 'Main_Page',
				{ message: 'Login failed' } );

			await CreateObjectPage.open();
			await expect( await CreateObjectPage.title ).toHaveText( i18n[ 'wikilambda-special-createobject' ] );
		} );
	} );
	describe( 'RunFunction', function () {
		it( 'page should exist on installation', async function () {
			await RunFunction.open();
			await expect( await RunFunction.title ).toHaveText( i18n[ 'wikilambda-special-runfunction' ] );
		} );
	} );
	describe( 'ListObjectsByType', function () {
		it( 'page should exist on installation', async function () {
			await ListObjectsByType.open();
			await expect( await ListObjectsByType.title ).toHaveText( i18n[ 'wikilambda-special-objectsbytype' ] );
		} );
	} );
} );
