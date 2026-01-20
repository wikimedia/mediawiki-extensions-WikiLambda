/*!
 * WikiLambda browser test suite of basic tests
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import LoginPage from 'wdio-mediawiki/LoginPage.js';
import CreateObjectPage from '../pageobjects/special/CreateObject.page.js';
import RunFunction from '../pageobjects/special/RunFunction.page.js';
import ListObjectsByType from '../pageobjects/special/ListObjectsByType.page.js';
import i18n from '../utils/i18n.js';

describe( 'Installation checks', () => {
	before( async () => {
		await browser.deleteAllCookies();
	} );

	describe( 'CreateObject', () => {
		it( 'page should exist on installation but deny to logged-out user', async () => {
			await CreateObjectPage.open();
			await expect( await CreateObjectPage.title ).toHaveText( 'Login required' );
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
