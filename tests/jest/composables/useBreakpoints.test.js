/*!
 * WikiLambda unit test suite for the useBreakpoints composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const useBreakpoints = require( '../../../resources/ext.wikilambda.app/composables/useBreakpoints.js' );

const mockBreakpoints = {
	small: 100,
	medium: 500,
	large: 1000
};

const mockBreakpointsType = {
	small: 'small',
	medium: 'medium',
	large: 'large'
};

describe( 'useBreakpoints', () => {
	let addEventListenerSpy, removeEventListenerSpy;

	beforeEach( () => {
		addEventListenerSpy = jest.spyOn( window, 'addEventListener' );
		removeEventListenerSpy = jest.spyOn( window, 'removeEventListener' );
	} );

	afterEach( () => {
		addEventListenerSpy.mockRestore();
		removeEventListenerSpy.mockRestore();
	} );

	describe( 'when called with emtpy values', () => {
		it( 'return a null value as the current breakpoint', () => {
			const result = loadComposable( () => useBreakpoints() )[ 0 ];
			expect( result.current.value ).toBe( null );
		} );
		it( 'return a null when resize event is triggered', () => {
			const result = loadComposable( () => useBreakpoints() )[ 0 ];

			global.innerWidth = 500;
			global.dispatchEvent( new Event( 'resize' ) );

			expect( result.current.value ).toBe( null );
		} );
	} );
	describe( 'when called with an object of breakpoints', () => {
		it( 'return a value as the current breakpoint', () => {
			const result = loadComposable( () => useBreakpoints( mockBreakpoints ) )[ 0 ];
			expect( result.current.value ).not.toBe( null );
		} );

		it( 'return a value for each breakpoint', () => {
			const result = loadComposable( () => useBreakpoints( mockBreakpoints ) )[ 0 ];
			expect( mockBreakpointsType.small in result ).toBe( true );
			expect( mockBreakpointsType.medium in result ).toBe( true );
			expect( mockBreakpointsType.large in result ).toBe( true );
		} );
	} );
	describe( 'when innerWidth is 700 pixel', () => {
		beforeEach( () => {
			global.innerWidth = 700;
		} );

		it( 'return current value as medium', () => {
			const result = loadComposable( () => useBreakpoints( mockBreakpoints ) )[ 0 ];
			expect( result.current.value ).toBe( mockBreakpointsType.medium );
		} );
		it( 'return small breakpoint as false', () => {
			const result = loadComposable( () => useBreakpoints( mockBreakpoints ) )[ 0 ];
			expect( result.small.value ).toBeFalsy();
		} );
		it( 'return medium breakpoint as true', () => {
			const result = loadComposable( () => useBreakpoints( mockBreakpoints ) )[ 0 ];
			expect( result.medium.value ).toBeTruthy();
		} );
		it( 'return large breakpoint as false', () => {
			const result = loadComposable( () => useBreakpoints( mockBreakpoints ) )[ 0 ];
			expect( result.large.value ).toBeFalsy();
		} );
	} );
	describe( 'when resize event is triggered', () => {
		beforeEach( () => {
			global.innerWidth = 700;
		} );

		it( 'updates the current value', () => {

			const result = loadComposable( () => useBreakpoints( mockBreakpoints ) )[ 0 ];

			global.innerWidth = 2000;
			global.dispatchEvent( new Event( 'resize' ) );

			expect( result.current.value ).toBe( mockBreakpointsType.large );
		} );
		it( 'updates the individual breakpoint value', () => {
			const result = loadComposable( () => useBreakpoints( mockBreakpoints ) )[ 0 ];

			global.innerWidth = 2000;
			global.dispatchEvent( new Event( 'resize' ) );

			expect( result.small.value ).toBeFalsy();
			expect( result.medium.value ).toBeFalsy();
			expect( result.large.value ).toBeTruthy();
		} );
		it( 'removes the resize event listener when the component is unmounted', () => {
			const app = loadComposable( () => useBreakpoints( mockBreakpoints ) )[ 1 ];
			expect( addEventListenerSpy ).toHaveBeenCalledWith( 'resize', expect.any( Function ) );

			app.unmount();
			expect( removeEventListenerSpy ).toHaveBeenCalledWith( 'resize', expect.any( Function ) );
		} );
	} );
} );
