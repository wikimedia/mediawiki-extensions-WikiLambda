/*!
 * WikiLambda unit test suite for the utilsMixins mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createJQueryPageTitleMocks = require( '../../../tests/jest/helpers/jqueryHelpers.js' ).createJQueryPageTitleMocks,
	createLabelDataMock = require( '../../../tests/jest/helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../../tests/jest/helpers/getterHelpers.js' ).createGetterMock,
	createGettersWithFunctionsMock = require( '../../../tests/jest/helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	pageTitleUtils = require( '../../../resources/ext.wikilambda.app/mixins/pageTitleUtils.js' );

describe( 'pageTitleUtils', () => {
	let wrapper, getters;

	beforeEach( () => {

		getters = {
			getUserLangZid: createGetterMock( 'Z1002' ),
			getLabelData: createLabelDataMock( {
				Z1002: 'English',
				Z1003: 'Spanish'
			} ),
			getFallbackLanguageZids: createGetterMock( [ 'Z1002', 'Z1003' ] )
		};
		global.store.hotUpdate( {
			getters: getters
		} );

		// Mocking a Vue component to test the mixin
		const TestComponent = {
			template: '<div></div>',
			mixins: [ pageTitleUtils ]
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

		const value = 'new name';

		// Set the main language name to be defined
		getters.getZPersistentName = createGettersWithFunctionsMock( { langZid: 'Z1002', langIsoCode: 'en', rowId: 1 } );
		// Update the store with the new name
		getters.getZMonolingualTextValue = createGettersWithFunctionsMock( value );
		global.store.hotUpdate( { getters } );

		await wrapper.vm.setPageTitle( value );

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: 'new name', hasChip: false, chip: 'en', chipName: 'English' } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( 'new name' );
		expect( $langChip.text ).toHaveBeenCalledWith( 'en' );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--bcp47-code-hidden', true );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--title-untitled', false );
	} );

	it( 'updates page title when fallback language has a new name and current name is not set', async () => {
		const { $pageTitle, $langChip } = createJQueryPageTitleMocks();

		const fallbackValue = 'new fallback name';

		// Set the fallback language to be defined, and the main language to be undefined
		getters.getZPersistentName = () => ( langZid ) => langZid === 'Z1003' ?
			{ langZid: 'Z1003', langIsoCode: 'es', rowId: 11 } :
			undefined;
		// Update the store with the new fallback name
		getters.getZMonolingualTextValue = createGettersWithFunctionsMock( fallbackValue );
		global.store.hotUpdate( { getters } );

		await wrapper.vm.setPageTitle( fallbackValue );

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: 'new fallback name', hasChip: true, chip: 'es', chipName: 'Spanish' } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( 'new fallback name' );
		expect( $langChip.text ).toHaveBeenCalledWith( 'es' );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--bcp47-code-hidden', false );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--title-untitled', false );
	} );

	it( 'updates page title when name is removed and there is a fallback', async () => {
		const { $pageTitle, $langChip } = createJQueryPageTitleMocks();

		const value = '';

		// Set the fallback language to be defined, and the main language to be undefined
		getters.getZPersistentName = () => ( langZid ) => langZid === 'Z1003' ?
			{ langZid: 'Z1003', langIsoCode: 'es', rowId: 11 } :
			undefined;
		// Update the store: Set the fallback language name to be defined, and the main language name to be an empty string
		getters.getZMonolingualTextValue = () => ( rowId ) => rowId === 11 ? 'Fallback Page Title in Spanish' : value;
		global.store.hotUpdate( { getters } );

		await wrapper.vm.setPageTitle( value );

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: 'Fallback Page Title in Spanish', hasChip: true, chip: 'es', chipName: 'Spanish' } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( 'Fallback Page Title in Spanish' );
		expect( $langChip.text ).toHaveBeenCalledWith( 'es' );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--bcp47-code-hidden', false );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--title-untitled', false );
	} );

	it( 'updates page title to undefined when name is removed and there is no fallback', async () => {
		const { $pageTitle, $langChip } = createJQueryPageTitleMocks();

		const value = '';

		// Set the fallback language to be undefined, and the main language to be undefined
		getters.getZPersistentName = createGettersWithFunctionsMock( undefined );
		// Update the store with the new empty name
		getters.getZMonolingualTextValue = createGettersWithFunctionsMock( value );
		global.store.hotUpdate( { getters } );

		await wrapper.vm.setPageTitle( value );

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: null, hasChip: false, chip: null, chipName: null } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( 'Untitled' );
		expect( $langChip.text ).toHaveBeenCalledWith( null );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--bcp47-code-hidden', true );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--title-untitled', true );
	} );
} );
