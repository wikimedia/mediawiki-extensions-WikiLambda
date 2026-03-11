/*!
 * WikiLambda unit test suite for the useDarkMode composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const useDarkMode = require( '../../../resources/ext.wikilambda.app/composables/useDarkMode.js' );

describe( 'useDarkMode', () => {
	let classListAddSpy, classListRemoveSpy, classListContainsSpy;
	let originalClassList;
	let matchMediaMock;

	beforeEach( () => {
		originalClassList = document.documentElement.classList;
		classListContainsSpy = jest.spyOn( originalClassList, 'contains' );
		classListAddSpy = jest.spyOn( originalClassList, 'add' );
		classListRemoveSpy = jest.spyOn( originalClassList, 'remove' );

		matchMediaMock = jest.fn( () => ( {
			matches: false,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn()
		} ) );
		Object.defineProperty( window, 'matchMedia', {
			value: matchMediaMock,
			writable: true
		} );
	} );

	afterEach( () => {
		classListContainsSpy.mockRestore();
		classListAddSpy.mockRestore();
		classListRemoveSpy.mockRestore();
	} );

	it( 'returns isDarkMode ref', () => {
		classListContainsSpy.mockReturnValue( false );

		const [ result ] = loadComposable( () => useDarkMode() );

		expect( result ).toHaveProperty( 'isDarkMode' );
		expect( result.isDarkMode ).toBeDefined();
		expect( typeof result.isDarkMode.value ).toBe( 'boolean' );
	} );

	it( 'returns false when no dark mode classes present', () => {
		classListContainsSpy.mockReturnValue( false );

		const [ result ] = loadComposable( () => useDarkMode() );

		expect( result.isDarkMode.value ).toBe( false );
	} );

	it( 'returns true when skin-theme-clientpref-night is present', () => {
		classListContainsSpy.mockImplementation( ( cls ) => cls === 'skin-theme-clientpref-night' );

		const [ result ] = loadComposable( () => useDarkMode() );

		expect( result.isDarkMode.value ).toBe( true );
	} );

	it( 'returns true when skin-theme-clientpref-os and prefers-color-scheme dark', () => {
		classListContainsSpy.mockImplementation( ( cls ) => cls === 'skin-theme-clientpref-os' );
		matchMediaMock.mockReturnValue( {
			matches: true,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn()
		} );

		const [ result ] = loadComposable( () => useDarkMode() );

		expect( result.isDarkMode.value ).toBe( true );
	} );

	it( 'returns false when skin-theme-clientpref-os but prefers-color-scheme light', () => {
		classListContainsSpy.mockImplementation( ( cls ) => cls === 'skin-theme-clientpref-os' );
		matchMediaMock.mockReturnValue( {
			matches: false,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn()
		} );

		const [ result ] = loadComposable( () => useDarkMode() );

		expect( result.isDarkMode.value ).toBe( false );
	} );

	it( 'sets up MutationObserver on mount', () => {
		const observeSpy = jest.spyOn( global.MutationObserver.prototype, 'observe' );
		classListContainsSpy.mockReturnValue( false );

		loadComposable( () => useDarkMode() );

		expect( observeSpy ).toHaveBeenCalledWith( document.documentElement, {
			attributes: true,
			attributeFilter: [ 'class' ]
		} );
		observeSpy.mockRestore();
	} );

	it( 'sets up matchMedia listener when matchMedia is available', () => {
		const mediaQuery = {
			matches: false,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn()
		};
		matchMediaMock.mockReturnValue( mediaQuery );
		classListContainsSpy.mockReturnValue( false );

		loadComposable( () => useDarkMode() );

		expect( matchMediaMock ).toHaveBeenCalledWith( '(prefers-color-scheme: dark)' );
		expect( mediaQuery.addEventListener ).toHaveBeenCalledWith( 'change', expect.any( Function ) );
	} );

	it( 'cleans up MutationObserver and matchMedia on unmount', () => {
		const disconnectSpy = jest.spyOn( global.MutationObserver.prototype, 'disconnect' );
		const mediaQuery = {
			matches: false,
			addEventListener: jest.fn(),
			removeEventListener: jest.fn()
		};
		matchMediaMock.mockReturnValue( mediaQuery );
		classListContainsSpy.mockReturnValue( false );

		const [ , wrapper ] = loadComposable( () => useDarkMode() );
		wrapper.unmount();

		expect( disconnectSpy ).toHaveBeenCalled();
		expect( mediaQuery.removeEventListener ).toHaveBeenCalledWith( 'change', expect.any( Function ) );
		disconnectSpy.mockRestore();
	} );
} );
