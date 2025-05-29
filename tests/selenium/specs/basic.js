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

describe( 'Installation checks', () => {
	before( async () => {
		await browser.deleteAllCookies();
	} );

	describe( 'CreateObject', () => {
		it( 'page should exist on installation but deny to logged-out user', async () => {
			await CreateObjectPage.open();
			await expect( await CreateObjectPage.title ).toHaveText( 'Permission error' );
		} );
		it( 'page should exist on installation and work when logged in', async () => {
			await LoginPage.loginAdmin();
			const currentUrl = await browser.getUrl();
			if ( !currentUrl.includes( 'Main_Page' ) ) {
				throw new Error( 'Login failed' );
			}

			await CreateObjectPage.open();
			await expect( await CreateObjectPage.title ).toHaveText( i18n[ 'wikilambda-special-createobject' ] );
		} );
	} );
	describe( 'RunFunction', () => {
		it( 'page should exist on installation', async () => {
			await RunFunction.open();
			await expect( await RunFunction.title ).toHaveText( i18n[ 'wikilambda-special-runfunction' ] );
		} );
	} );
	describe( 'ListObjectsByType', () => {
		it( 'page should exist on installation', async () => {
			await ListObjectsByType.open();
			await expect( await ListObjectsByType.title ).toHaveText( i18n[ 'wikilambda-special-objectsbytype' ] );
		} );
	} );
} );
