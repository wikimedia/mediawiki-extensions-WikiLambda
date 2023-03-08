/*!
 * WikiLambda unit test suite for the Languages Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var languagesModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/languages.js' );

describe( 'Languages Vuex module', function () {
	describe( 'Getters', function () {
		it( 'should return the user language ZID when defined', function () {
			mw.language.getFallbackLanguageChain = jest.fn( function () {
				return [ 'de', 'en' ];
			} );
			expect( languagesModule.getters.getZLang() ).toBe( 'de' );
		} );

		it( 'should return the ZID 1002 (english) when not defined in state', function () {
			mw.language.getFallbackLanguageChain = jest.fn( function () {
				return [];
			} );
			expect( languagesModule.getters.getZLang() ).toBe( 'en' );
		} );

		it( 'should return the MW-defined user language ZID', function () {
			expect( languagesModule.getters.getUserZlangZID() ).toBe( 'Z1002' );
		} );
	} );
} );
