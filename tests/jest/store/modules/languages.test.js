/*!
 * WikiLambda unit test suite for the Languages Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const languagesModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/languages.js' );

describe( 'Languages Vuex module', () => {
	describe( 'Getters', () => {
		it( 'should return the user language code as defined in wgWikiLambda config variables', () => {
			expect( languagesModule.getters.getUserLangCode() ).toBe( 'en' );
		} );

		it( 'should return the user language zid as defined in wgWikiLambda config variables', () => {
			expect( languagesModule.getters.getUserLangZid() ).toBe( 'Z1002' );
		} );

		it( 'should return the first requested user language code from the fallback chain', () => {
			mw.language.getFallbackLanguageChain = () => [ 'qqx', 'en' ];
			expect( languagesModule.getters.getUserRequestedLang() ).toBe( 'qqx' );

			mw.language.getFallbackLanguageChain = () => [ 'en' ];
			expect( languagesModule.getters.getUserRequestedLang() ).toBe( 'en' );
		} );
	} );
} );
