/*!
 * WikiLambda unit test suite for the Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'Pinia store (index.js)', () => {
	beforeEach( () => {
		setActivePinia( createPinia() );
	} );

	it( 'should export a function', () => {
		const store = useMainStore();
		expect( store ).toBeDefined();
	} );
} );
