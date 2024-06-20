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
			getUserLangZid: createGetterMock( 'Z1003' ),
			getFallbackLanguageZids: createGetterMock( [ 'Z1003', 'Z1002' ] ),
			getLabelData: createLabelDataMock( {
				Z1002: 'English',
				Z1003: 'Spanish'
			} ),
			getLanguageIsoCodeOfZLang: () => ( zid ) => zid === 'Z1003' ? 'es' : 'en',
			getRowByKeyPath: createGettersWithFunctionsMock(),
			getZMonolingualTextValue: createGettersWithFunctionsMock(),
			getZPersistentName: createGettersWithFunctionsMock(),
			getZReferenceTerminalValue: createGettersWithFunctionsMock()
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

		const value = 'Name in main language';

		// Set the main language name to be defined:
		getters.getZPersistentName = createGettersWithFunctionsMock( { id: 1 } );
		// Set language getters
		getters.getRowByKeyPath = () => ( path, rowId ) => rowId === 1 ? { id: 2 } : undefined;
		getters.getZReferenceTerminalValue = () => ( rowId ) => rowId === 2 ? 'Z1003' : undefined;
		// Set text getter
		getters.getZMonolingualTextValue = () => ( rowId ) => rowId === 1 ? value : undefined;
		global.store.hotUpdate( { getters } );

		await wrapper.vm.updatePageTitle();

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: value, hasChip: false, chip: 'es', chipName: 'Spanish' } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( value );
		expect( $langChip.text ).toHaveBeenCalledWith( 'es' );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--bcp47-code-hidden', true );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--title-untitled', false );
	} );

	it( 'updates page title when fallback language has a new name and current name is not set', async () => {
		const { $pageTitle, $langChip } = createJQueryPageTitleMocks();

		const fallbackValue = 'New name in fallback language';

		// Set the fallback language to be defined, and the main language to be undefined:
		getters.getZPersistentName = () => ( langZid ) => langZid === 'Z1002' ? { id: 11 } : undefined;
		// Set language getters
		getters.getRowByKeyPath = () => ( path, rowId ) => rowId === 11 ? { id: 22 } : undefined;
		getters.getZReferenceTerminalValue = () => ( rowId ) => rowId === 22 ? 'Z1002' : undefined;
		// Set text getter
		getters.getZMonolingualTextValue = () => ( rowId ) => rowId === 11 ? fallbackValue : undefined;
		global.store.hotUpdate( { getters } );

		await wrapper.vm.updatePageTitle();

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: fallbackValue, hasChip: true, chip: 'en', chipName: 'English' } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( fallbackValue );
		expect( $langChip.text ).toHaveBeenCalledWith( 'en' );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--bcp47-code-hidden', false );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--title-untitled', false );
	} );

	it( 'updates page title to undefined when name is removed and there is no fallback', async () => {
		const { $pageTitle, $langChip } = createJQueryPageTitleMocks();

		// Set all names to be undefined:
		getters.getZPersistentName = createGettersWithFunctionsMock( undefined );
		global.store.hotUpdate( { getters } );

		await wrapper.vm.updatePageTitle();

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( wrapper.vm.pageTitleObject ).toEqual( { title: null, hasChip: false, chip: null, chipName: null } );
		expect( $pageTitle.text ).toHaveBeenCalledWith( 'Untitled' );
		expect( $langChip.text ).toHaveBeenCalledWith( null );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--bcp47-code-hidden', true );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header--title-untitled', true );
	} );
} );
