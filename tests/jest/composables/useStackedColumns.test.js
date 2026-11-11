/*!
 * WikiLambda unit test suite for the useStackedColumns composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const useStackedColumns = require( '../../../resources/ext.wikilambda.app/composables/useStackedColumns.js' );

describe( 'useStackedColumns', () => {
	const originalWidth = window.innerWidth;

	afterEach( () => {
		window.innerWidth = originalWidth;
	} );

	it( 'stacks the columns below desktop width', () => {
		window.innerWidth = Constants.BREAKPOINTS.DESKTOP - 1;
		const [ result ] = loadComposable( () => useStackedColumns() );

		expect( result.isStacked.value ).toBe( true );
	} );

	it( 'does not stack the columns at desktop width', () => {
		window.innerWidth = Constants.BREAKPOINTS.DESKTOP;
		const [ result ] = loadComposable( () => useStackedColumns() );

		expect( result.isStacked.value ).toBe( false );
	} );

	it( 'does not stack the columns at wide desktop width', () => {
		window.innerWidth = Constants.BREAKPOINTS.DESKTOP_WIDE;
		const [ result ] = loadComposable( () => useStackedColumns() );

		expect( result.isStacked.value ).toBe( false );
	} );

	it( 'stacks the columns when the window gets narrower', () => {
		window.innerWidth = Constants.BREAKPOINTS.DESKTOP;
		const [ result ] = loadComposable( () => useStackedColumns() );

		window.innerWidth = Constants.BREAKPOINTS.TABLET;
		window.dispatchEvent( new Event( 'resize' ) );

		expect( result.isStacked.value ).toBe( true );
	} );
} );
