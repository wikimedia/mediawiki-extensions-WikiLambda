/*!
 * WikiLambda unit test suite for the AbstractPreview component.
 *
 * @copyright 2020–
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const AbstractPreview = require( '../../../../resources/ext.wikilambda.app/components/abstract/AbstractPreview.vue' );

const ledeQid = 'Q8776414';
const biblioQid = 'Q1631107';

const benjaminType = { Z1K1: 'Z9', Z9K1: 'Z89' };
const fragmentCall = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
	Z7K1: { Z1K1: 'Z9', Z9K1: 'Z444' }
};

const sections = [ {
	index: 0,
	qid: ledeQid,
	isLede: true,
	labelData: { label: 'Lead paragraph' },
	fragments: [ benjaminType, fragmentCall, fragmentCall ],
	fragmentsPath: `abstractwiki.sections.${ ledeQid }.fragments`
}, {
	index: 1,
	qid: biblioQid,
	isLede: false,
	labelData: { label: 'Bibliography' },
	fragments: [ benjaminType, fragmentCall ],
	fragmentsPath: `abstractwiki.sections.${ biblioQid }.fragments`
} ];

describe( 'AbstractPreview', () => {
	let store;

	function renderPreview() {
		return shallowMount( AbstractPreview, {
			global: {
				stubs: {
					'wl-widget-base': false,
					'wl-abstract-preview-fragment': true
				}
			}
		} );
	}

	beforeEach( () => {
		store = useMainStore();

		store.getAbstractContentSections = sections;
		store.getAbstractWikiId = 'Q42';
		store.getUserLangZid = 'Z1002';
		store.getLabelData = jest.fn().mockReturnValue( { label: 'English' } );
		store.getItemLabelData = jest.fn().mockImplementation( ( id ) => ( id === 'Q42' ) ? { label: 'Douglas Adams' } : undefined );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderPreview();

		expect( wrapper.find( '.ext-wikilambda-app-abstract-preview' ).exists() ).toBe( true );
	} );

	it( 'renders preview header with language label', () => {
		const wrapper = renderPreview();

		expect( wrapper.text() ).toContain( 'Auto-article preview in English' );
	} );

	it( 'renders abstract title', () => {
		const wrapper = renderPreview();

		const title = wrapper.find( 'h1' );
		expect( title.exists() ).toBe( true );
		expect( title.text() ).toBe( 'Douglas Adams' );
	} );

	it( 'renders one preview section per section in store', () => {
		const wrapper = renderPreview();

		const sectionElements = wrapper.findAll( '.ext-wikilambda-app-abstract-preview__section' );

		expect( sectionElements.length ).toBe( 2 );
	} );

	it( 'renders section headings only for non-lede sections', () => {
		const wrapper = renderPreview();

		const headings = wrapper.findAll( 'h2' );

		expect( headings.length ).toBe( 1 );
		expect( headings[ 0 ].text() ).toBe( 'Bibliography' );
	} );

	it( 'renders preview fragments excluding the benjamin type item', () => {
		const wrapper = renderPreview();

		const fragments = wrapper.findAllComponents( { name: 'wl-abstract-preview-fragment' } );

		expect( fragments.length ).toBe( 3 );
	} );

	it( 'passes correct props to preview fragments', () => {
		const wrapper = renderPreview();

		const fragments = wrapper.findAllComponents( { name: 'wl-abstract-preview-fragment' } );

		// Two fragments for first section
		expect( fragments[ 0 ].props( 'keyPath' ) ).toBe( `abstractwiki.sections.${ ledeQid }.fragments.1` );
		expect( fragments[ 1 ].props( 'keyPath' ) ).toBe( `abstractwiki.sections.${ ledeQid }.fragments.2` );
		// One fragment for second section
		expect( fragments[ 2 ].props( 'keyPath' ) ).toBe( `abstractwiki.sections.${ biblioQid }.fragments.1` );
	} );
} );
