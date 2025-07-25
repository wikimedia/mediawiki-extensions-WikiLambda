/*!
 * WikiLambda unit test suite for the pageTitleMixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createJQueryPageTitleMocks = require( '../helpers/jqueryHelpers.js' ).createJQueryPageTitleMocks;
const createLabelDataMock = require( '../helpers/getterHelpers.js' ).createLabelDataMock;
const pageTitleMixin = require( '../../../resources/ext.wikilambda.app/mixins/pageTitleMixin.js' );
const { canonicalToHybrid } = require( '../../../resources/ext.wikilambda.app/utils/schemata.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'pageTitleMixin', () => {
	let wrapper, store;

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangZid = 'Z1003';
		store.getFallbackLanguageZids = [ 'Z1003', 'Z1002' ];
		store.getLanguageIsoCodeOfZLang = ( zid ) => zid === 'Z1003' ? 'es' : 'en';
		store.getLabelData = createLabelDataMock( {
			Z1002: 'English',
			Z1003: 'Spanish'
		} );

		// Mocking a Vue component to test the mixin
		const TestComponent = {
			template: '<div></div>',
			mixins: [ pageTitleMixin ]
		};
		wrapper = shallowMount( TestComponent );

		navigator.clipboard = {
			writeText: jest.fn()
		};

		// Enable fake timers before each test
		jest.useFakeTimers();
	} );

	afterEach( () => {
		// Restore the original timers after each test
		jest.useRealTimers();
	} );

	it( 'updates page title when name is provided', async () => {
		const { $pageTitle, $langChip } = createJQueryPageTitleMocks();

		const value = 'Name in main language';

		// Set the main language name to be defined:
		store.getZPersistentName = jest.fn().mockReturnValue( { keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value } );
		store.getZObjectByKeyPath = jest.fn().mockImplementation( ( keyPath ) => Number( keyPath[ keyPath.length - 1 ] ) ?
			canonicalToHybrid( { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: value } ) : undefined );

		await wrapper.vm.updatePageTitle();

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: value, hasChip: false, chip: 'es', chipName: 'Spanish' } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( value );
		expect( $langChip.text ).toHaveBeenCalledWith( 'es' );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', true );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', false );
	} );

	it( 'updates page title when fallback language has a new name and current name is not set', async () => {
		const { $pageTitle, $langChip } = createJQueryPageTitleMocks();

		const value = 'New name in fallback language';

		store.getZPersistentName = jest.fn().mockImplementation( ( lang ) => ( lang === 'Z1002' ) ?
			{ keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value } : undefined );
		store.getZObjectByKeyPath = jest.fn().mockImplementation( ( keyPath ) => Number( keyPath[ keyPath.length - 1 ] ) ?
			canonicalToHybrid( { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: value } ) : undefined );

		await wrapper.vm.updatePageTitle();

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: value, hasChip: true, chip: 'en', chipName: 'English' } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( value );
		expect( $langChip.text ).toHaveBeenCalledWith( 'en' );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', false );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', false );
	} );

	it( 'updates page title to undefined when name is removed and there is no fallback', async () => {
		const { $pageTitle, $langChip } = createJQueryPageTitleMocks();

		// Set all names to be undefined:
		store.getZPersistentName = createGettersWithFunctionsMock( undefined );

		await wrapper.vm.updatePageTitle();

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: null, hasChip: false, chip: null, chipName: null } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( 'Untitled' );
		expect( $langChip.text ).toHaveBeenCalledWith( null );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', true );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', true );
	} );
} );
