/*!
 * WikiLambda unit test suite for the usePageTitle composable.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const loadComposable = require( '../helpers/loadComposable.js' );
const createGettersWithFunctionsMock = require( '../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const { createJQueryZObjectPageTitleMocks, createJQueryAbstractCreateTitleMocks } = require( '../helpers/jqueryHelpers.js' );
const createLabelDataMock = require( '../helpers/getterHelpers.js' ).createLabelDataMock;
const usePageTitle = require( '../../../resources/ext.wikilambda.app/composables/usePageTitle.js' );
const { canonicalToHybrid } = require( '../../../resources/ext.wikilambda.app/utils/schemata.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'usePageTitle', () => {
	let pageTitle, store;

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangZid = 'Z1003';
		store.getFallbackLanguageZids = [ 'Z1003', 'Z1002' ];
		store.getLanguageIsoCodeOfZLang = ( zid ) => zid === 'Z1003' ? 'es' : 'en';
		store.getLabelData = createLabelDataMock( {
			Z1002: 'English',
			Z1003: 'Spanish'
		} );

		const [ result ] = loadComposable( () => usePageTitle() );
		pageTitle = result;

		jest.useFakeTimers();
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'updates page title when name is provided', async () => {
		const { $pageTitle, $langChip } = createJQueryZObjectPageTitleMocks();

		const value = 'Name in main language';

		// Set the main language name to be defined:
		store.getZPersistentName = jest.fn().mockReturnValue( { keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value } );
		store.getZObjectByKeyPath = jest.fn().mockImplementation( ( keyPath ) => Number( keyPath[ keyPath.length - 1 ] ) ?
			canonicalToHybrid( { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: value } ) : undefined );

		await pageTitle.updateZObjectPageTitle();

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( $pageTitle.text ).toHaveBeenCalledWith( value );
		expect( $langChip.text ).toHaveBeenCalledWith( 'es' );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', true );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', false );
	} );

	it( 'updates page title when fallback language has a new name and current name is not set', async () => {
		const { $pageTitle, $langChip } = createJQueryZObjectPageTitleMocks();

		const value = 'New name in fallback language';

		store.getZPersistentName = jest.fn().mockImplementation( ( lang ) => ( lang === 'Z1002' ) ?
			{ keyPath: 'main.Z2K3.Z12K1.1.Z11K2.Z6K1', value } : undefined );
		store.getZObjectByKeyPath = jest.fn().mockImplementation( ( keyPath ) => Number( keyPath[ keyPath.length - 1 ] ) ?
			canonicalToHybrid( { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: value } ) : undefined );

		await pageTitle.updateZObjectPageTitle();

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( $pageTitle.text ).toHaveBeenCalledWith( value );
		expect( $langChip.text ).toHaveBeenCalledWith( 'en' );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', false );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', false );
	} );

	it( 'updates page title to undefined when name is removed and there is no fallback', async () => {
		const { $pageTitle, $langChip } = createJQueryZObjectPageTitleMocks();

		// Set all names to be undefined:
		store.getZPersistentName = createGettersWithFunctionsMock( undefined );

		await pageTitle.updateZObjectPageTitle();

		// ASSERT: Check if DOM manipulations were called with the correct arguments
		expect( $pageTitle.text ).toHaveBeenCalledWith( 'Untitled' );
		expect( $langChip.text ).toHaveBeenCalledWith( null );
		expect( $langChip.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__bcp47-code--hidden', true );
		expect( $pageTitle.toggleClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__title--untitled', true );
	} );

	describe( 'updateAbstractPageTitle', () => {
		it( 'updates title span and creates QID chip span when none exists', () => {
			const { $titleSpan, $wrapper, $newSpan } = createJQueryAbstractCreateTitleMocks( false );

			pageTitle.updateAbstractPageTitle( 'Q42', 'Douglas Adams' );

			expect( $titleSpan.text ).toHaveBeenCalledWith( 'Create a New Abstract Article for $1' );
			expect( $newSpan.addClass ).toHaveBeenCalledWith( 'ext-wikilambda-editpage-header__qid' );
			expect( $newSpan.attr ).toHaveBeenCalledWith( { role: 'button', tabindex: '0', 'aria-live': 'polite' } );
			expect( $wrapper.append ).toHaveBeenCalled();
			expect( $newSpan.text ).toHaveBeenCalledWith( 'Q42' );
		} );

		it( 'reuses existing QID chip span when already present', () => {
			const { $titleSpan, $qidSpan, $wrapper } = createJQueryAbstractCreateTitleMocks( true );

			pageTitle.updateAbstractPageTitle( 'Q42', 'Douglas Adams' );

			expect( $titleSpan.text ).toHaveBeenCalledWith( 'Create a New Abstract Article for $1' );
			expect( $wrapper.append ).not.toHaveBeenCalled();
			expect( $qidSpan.text ).toHaveBeenCalledWith( 'Q42' );
		} );

		it( 'uses qid as title parameter when no label is provided', () => {
			const { $titleSpan } = createJQueryAbstractCreateTitleMocks( false );

			pageTitle.updateAbstractPageTitle( 'Q42' );

			expect( $titleSpan.text ).toHaveBeenCalledWith( 'Create a New Abstract Article for $1' );
		} );
	} );
} );
