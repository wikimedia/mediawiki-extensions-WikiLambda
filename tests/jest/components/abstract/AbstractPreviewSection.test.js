/*!
 * WikiLambda unit test suite for the AbstractPreviewSection component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractPreviewSection = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractPreviewSection.vue' );

const mockQid = 'Q42';
const ledeQid = 'Q8776414';
const mockLang = 'Z1002';

const mockLedeSection = {
	qid: ledeQid,
	isLede: true,
	labelData: { label: 'Lede section' },
	fragmentsPath: `abstractwiki.sections.${ ledeQid }.fragments`,
	index: 0,
	fragments: [
		'Z89',
		{ Z1K1: 'Z7', Z7K1: 'Z401' },
		{ Z1K1: 'Z7', Z7K1: 'Z402' }
	]
};

const mockNonLedeSection = {
	qid: 'Q101',
	isLede: false,
	labelData: { label: 'Some other section' },
	fragmentsPath: 'abstractwiki.sections.Q101.fragments',
	index: 1,
	fragments: [
		'Z89',
		{ Z1K1: 'Z7', Z7K1: 'Z401' }
	]
};

describe( 'AbstractPreviewSection', () => {
	let store;
	let wrapper;

	function renderSection( props = {} ) {
		return shallowMount( AbstractPreviewSection, {
			props: {
				section: mockLedeSection,
				language: mockLang,
				...props
			},
			global: {
				stubs: {
				}
			}
		} );
	}

	beforeEach( () => {
		store = useMainStore();

		store.getAbstractWikiId = 'Q42';
		store.getUserLangZid = 'Z1002';
		store.getPreviewLanguageZid = 'Z1002';

		store.getAbstractSectionHashes = jest.fn().mockReturnValue( [ 'hash1', 'hash2' ] );
		store.getItemLabelData = jest.fn().mockImplementation(
			( id ) => ( id === 'Q42' ? { label: 'Douglas Adams' } : undefined ) );
		store.getPendingCount = jest.fn().mockReturnValue( 0 );

		// Actions
		store.fetchSectionPreview = jest.fn();
		store.renderFragmentPreview = jest.fn();
		store.clearErrors = jest.fn();

		// Use fake timer so that date is predictable
		jest.useFakeTimers().setSystemTime( new Date( '2023-07-26T00:00:00Z' ) );
	} );

	afterEach( () => {
		// Unmount component after running each test, so that there
		// are no dangling unresolved promises that affect next test!
		wrapper.unmount();
		// Reset to real timer
		jest.useRealTimers();
	} );

	it( 'renders without errors', () => {
		wrapper = renderSection();
		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-section' ).exists() ).toBe( true );
	} );

	it( 'renders h1 with page title for lede section', () => {
		wrapper = renderSection();

		expect( wrapper.find( 'h1' ).exists() ).toBe( true );
		expect( wrapper.find( 'h1' ).text() ).toBe( 'Douglas Adams' );

		expect( wrapper.find( 'h2' ).exists() ).toBe( false );
	} );

	it( 'renders h2 with section title for-lede section', () => {
		wrapper = renderSection( { section: mockNonLedeSection } );

		expect( wrapper.find( 'h1' ).exists() ).toBe( false );

		expect( wrapper.find( 'h2' ).exists() ).toBe( true );
		expect( wrapper.find( 'h2' ).text() ).toBe( 'Some other section' );
	} );

	it( 'renders all fragment preview child components correctly', () => {
		wrapper = renderSection();
		const fragments = wrapper.findAllComponents( { name: 'wl-abstract-preview-fragment' } );
		expect( fragments ).toHaveLength( 2 );

		expect( fragments[ 0 ].props( 'keyPath' ) ).toBe( `${ mockLedeSection.fragmentsPath }.1` );
		expect( fragments[ 0 ].props( 'fragmentHash' ) ).toBe( 'hash1' );

		expect( fragments[ 1 ].props( 'keyPath' ) ).toBe( `${ mockLedeSection.fragmentsPath }.2` );
		expect( fragments[ 1 ].props( 'fragmentHash' ) ).toBe( 'hash2' );
	} );

	// Retry button
	// ============

	it( 'does not show retry button when pending count is 0', () => {
		wrapper = renderSection();
		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-section__button' ).exists() ).toBe( false );
	} );

	it( 'does not show retry button when pending count is 1 (can refresh only fragment)', () => {
		store.getPendingCount = jest.fn().mockReturnValue( 1 );
		wrapper = renderSection();
		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-section__button' ).exists() ).toBe( false );
	} );

	it( 'shows retry button when pending count is greater than 1', () => {
		store.getPendingCount = jest.fn().mockReturnValue( 2 );
		wrapper = renderSection();
		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-section__button' ).exists() ).toBe( true );
	} );

	it( 'calls renderSectionPreview when retry button is clicked', async () => {
		store.getPendingCount = jest.fn().mockReturnValue( 2 );
		wrapper = renderSection();
		await wrapper.find( '.ext-wikilambda-app-abstract-preview-section__button' ).trigger( 'click' );
		expect( store.fetchSectionPreview ).toHaveBeenCalled();
	} );

	// Errors
	// ======

	it( 'does not render section error message when there are no errors', () => {
		wrapper = renderSection();
		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-section-errors' ).exists() ).toBe( false );
	} );

	it( 'renders section error messages when there are errors indexed by section path', () => {
		const sectionPath = `abstractwiki.sections.${ ledeQid }`;
		store.errors = { [ sectionPath ]: [ { type: 'error', text: 'Something went wrong' } ] };

		wrapper = renderSection();
		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview-section-errors' ).exists() ).toBe( true );
		expect( wrapper.findAllComponents( { name: 'cdx-message' } ) ).toHaveLength( 1 );
	} );

	// Lifecycle
	// =========

	it( 'calls fetchSectionPreview on mount', () => {
		renderSection();
		expect( store.fetchSectionPreview ).toHaveBeenCalledWith( {
			topic: mockQid,
			section: mockLedeSection.qid,
			sectionPath: `abstractwiki.sections.${ ledeQid }`,
			fragments: mockLedeSection.fragments.slice( 1 ),
			fragmentHashes: [ 'hash1', 'hash2' ],
			language: mockLang,
			date: '2023-07-26'
		} );
	} );

	it( 'calls fetchSectionPreview when language changes', async () => {
		wrapper = renderSection();
		store.fetchSectionPreview.mockClear();

		await wrapper.setProps( { language: 'Z1003' } );

		expect( store.fetchSectionPreview ).toHaveBeenCalledTimes( 1 );
	} );

	// Fragment events
	// ===============

	it( 'calls renderFragmentPreview when fragment emits retry', async () => {
		wrapper = renderSection();
		const fragments = wrapper.findAllComponents( { name: 'wl-abstract-preview-fragment' } );

		await fragments[ 0 ].trigger( 'retry' );

		expect( store.renderFragmentPreview ).toHaveBeenCalledWith( {
			qid: mockQid,
			fragment: mockLedeSection.fragments[ 1 ],
			fragmentHash: 'hash1',
			date: '2023-07-26',
			language: mockLang
		} );
	} );
} );
