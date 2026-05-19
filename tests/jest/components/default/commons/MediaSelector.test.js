/*!
 * WikiLambda unit test suite for the Commons Media Selector component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const MediaSelector = require( '../../../../../resources/ext.wikilambda.app/components/types/commons/MediaSelector.vue' );

const MID = 'M68960758';
const TITLE = 'File:Cat.jpg';
const THUMB_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/Cat.jpg/250px-Cat.jpg';
const DESC_URL = 'https://commons.wikimedia.org/wiki/File:Cat.jpg';

const mockPages = [
	{ pageid: 68960758, title: TITLE, index: 1, thumbnail: { source: THUMB_URL }, imageinfo: [ { mime: 'image/jpeg', descriptionurl: DESC_URL } ] },
	{ pageid: 99999999, title: 'File:Dog.jpg', index: 2, thumbnail: { source: 'https://example.com/dog.jpg' }, imageinfo: [ { mime: 'image/jpeg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Dog.jpg' } ] }
];

describe( 'CommonsMediaSelector', () => {
	let store;

	function renderMediaSelector( props = {} ) {
		const defaultProps = {
			mediaId: null,
			mediaTitle: '',
			placeholder: 'Search Commons…',
			mimeTypes: []
		};
		return shallowMount( MediaSelector, { props: { ...defaultProps, ...props } } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.lookupCommonsMedia.mockResolvedValue( { pages: [], searchContinue: null } );
		store.fetchCommonsMedia.mockResolvedValue();
		store.getCommonsMediaThumb = createGettersWithFunctionsMock( undefined );
		store.getCommonsMediaTitle = createGettersWithFunctionsMock( undefined );
		store.getCommonsMediaDescriptionUrl = createGettersWithFunctionsMock( undefined );
		store.getCommonsMediaThumbSize = createGettersWithFunctionsMock( undefined );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderMediaSelector();
		expect( wrapper.find( '.ext-wikilambda-app-commons-media-selector' ).exists() ).toBe( true );
	} );

	it( 'initializes inputValue from mediaTitle prop', async () => {
		const wrapper = renderMediaSelector( { mediaTitle: TITLE } );
		const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );
		await waitFor( () => {
			expect( lookup.props( 'inputValue' ) ).toBe( TITLE );
		} );
	} );

	it( 'calls fetchCommonsMedia immediately when mediaId is set', () => {
		renderMediaSelector( { mediaId: MID, mediaTitle: TITLE } );
		expect( store.fetchCommonsMedia ).toHaveBeenCalledWith( { ids: [ MID ] } );
	} );

	it( 'does not call fetchCommonsMedia when mediaId is null', () => {
		renderMediaSelector();
		expect( store.fetchCommonsMedia ).not.toHaveBeenCalled();
	} );

	it( 'calls fetchCommonsMedia again when mediaId prop changes', async () => {
		const wrapper = renderMediaSelector();
		expect( store.fetchCommonsMedia ).not.toHaveBeenCalled();
		await wrapper.setProps( { mediaId: MID } );
		expect( store.fetchCommonsMedia ).toHaveBeenCalledWith( { ids: [ MID ] } );
	} );

	describe( 'on update inputValue', () => {
		it( 'clears results when input is cleared', async () => {
			store.lookupCommonsMedia.mockResolvedValue( { pages: mockPages, searchContinue: null } );
			const wrapper = renderMediaSelector();
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			lookup.vm.$emit( 'update:inputValue', 'cat' );
			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 2 ) );

			lookup.vm.$emit( 'update:inputValue', '' );
			await waitFor( () => {
				expect( lookup.props( 'inputValue' ) ).toBe( '' );
				expect( lookup.props( 'menuItems' ).length ).toBe( 0 );
			} );
		} );

		it( 'triggers a debounced lookup and populates menu items', async () => {
			store.lookupCommonsMedia.mockResolvedValue( { pages: mockPages, searchContinue: null } );
			const wrapper = renderMediaSelector();
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			lookup.vm.$emit( 'update:inputValue', 'cat' );

			await waitFor( () => {
				expect( store.lookupCommonsMedia ).toHaveBeenCalledWith(
					expect.objectContaining( { search: 'cat' } )
				);
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
				expect( lookup.props( 'menuItems' )[ 0 ] ).toMatchObject( {
					value: MID,
					label: TITLE
				} );
			} );
		} );

		it( 'filters results by mimeTypes when specified', async () => {
			const mixedPages = [
				...mockPages,
				{ pageid: 11111, title: 'File:Video.ogv', index: 3, imageinfo: [ { mime: 'video/ogg', descriptionurl: '' } ] }
			];
			store.lookupCommonsMedia.mockResolvedValue( { pages: mixedPages, searchContinue: null } );

			const wrapper = renderMediaSelector( { mimeTypes: [ 'image/' ] } );
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			lookup.vm.$emit( 'update:inputValue', 'cat' );

			await waitFor( () => {
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
				expect( lookup.props( 'menuItems' ).every(
					( item ) => item.label !== 'File:Video.ogv'
				) ).toBe( true );
			} );
		} );

		it( 'appends results when loading more', async () => {
			// First batch must fill visibleItemLimit (5) to prevent auto-fetch
			const firstBatchPages = Array.from( { length: 5 }, ( _, i ) => ( {
				pageid: 1000 + i, title: `File:Cat${ i }.jpg`, index: i + 1,
				imageinfo: [ { mime: 'image/jpeg', descriptionurl: '' } ]
			} ) );
			store.lookupCommonsMedia
				.mockResolvedValueOnce( { pages: firstBatchPages, searchContinue: 10 } )
				.mockResolvedValueOnce( { pages: [ mockPages[ 1 ] ], searchContinue: null } );

			const wrapper = renderMediaSelector();
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			lookup.vm.$emit( 'update:inputValue', 'cat' );
			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 5 ) );

			lookup.vm.$emit( 'load-more' );
			await waitFor( () => {
				expect( store.lookupCommonsMedia ).toHaveBeenCalledTimes( 2 );
				expect( lookup.props( 'menuItems' ).length ).toBe( 6 );
			} );
		} );
	} );

	describe( 'on select', () => {
		it( 'emits select-commons-media with the chosen M-ID', async () => {
			store.lookupCommonsMedia.mockResolvedValue( { pages: mockPages, searchContinue: null } );
			const wrapper = renderMediaSelector();
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			lookup.vm.$emit( 'update:inputValue', 'cat' );
			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 2 ) );

			lookup.vm.$emit( 'update:selected', MID );
			await waitFor( () => {
				expect( wrapper.emitted( 'select-commons-media' ) ).toBeTruthy();
				expect( wrapper.emitted( 'select-commons-media' )[ 0 ] ).toEqual( [ MID ] );
			} );
		} );

		it( 'optimistically sets inputValue to the selected label', async () => {
			store.lookupCommonsMedia.mockResolvedValue( { pages: mockPages, searchContinue: null } );
			const wrapper = renderMediaSelector();
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			lookup.vm.$emit( 'update:inputValue', 'cat' );
			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 2 ) );

			lookup.vm.$emit( 'update:selected', MID );
			await waitFor( () => expect( lookup.props( 'inputValue' ) ).toBe( TITLE ) );
		} );
	} );

	describe( 'on blur', () => {
		it( 'restores mediaTitle when no match found in results', async () => {
			store.lookupCommonsMedia.mockResolvedValue( { pages: mockPages, searchContinue: null } );
			const wrapper = renderMediaSelector( { mediaTitle: TITLE } );
			const lookup = wrapper.findComponent( { name: 'cdx-lookup' } );

			lookup.vm.$emit( 'update:inputValue', 'zzz not a real file' );
			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 2 ) );

			lookup.vm.$emit( 'blur' );
			await waitFor( () => expect( lookup.props( 'inputValue' ) ).toBe( TITLE ) );
		} );
	} );

	describe( 'selected preview', () => {
		it( 'shows preview when store has thumbnail data for the mediaId', async () => {
			store.getCommonsMediaThumb = createGettersWithFunctionsMock( THUMB_URL );
			store.getCommonsMediaTitle = createGettersWithFunctionsMock( TITLE );
			store.getCommonsMediaDescriptionUrl = createGettersWithFunctionsMock( DESC_URL );
			store.getCommonsMediaThumbSize = createGettersWithFunctionsMock( { width: 250, height: 188 } );

			const wrapper = renderMediaSelector( { mediaId: MID, mediaTitle: TITLE } );

			await waitFor( () => {
				const preview = wrapper.findComponent( { name: 'wl-commons-media-preview' } );
				expect( preview.exists() ).toBe( true );
				expect( preview.props( 'url' ) ).toBe( THUMB_URL );
				expect( preview.props( 'descriptionUrl' ) ).toBe( DESC_URL );
				expect( preview.props( 'thumbWidth' ) ).toBe( 250 );
				expect( preview.props( 'thumbHeight' ) ).toBe( 188 );
			} );
		} );

		it( 'hides preview when no mediaId is set', () => {
			const wrapper = renderMediaSelector();
			expect( wrapper.find( '.ext-wikilambda-app-commons-media-selector__selected-preview' ).exists() ).toBe( false );
		} );

		it( 'hides preview when store has no thumbnail for the mediaId', () => {
			store.getCommonsMediaThumb = createGettersWithFunctionsMock( undefined );
			const wrapper = renderMediaSelector( { mediaId: MID, mediaTitle: TITLE } );
			expect( wrapper.find( '.ext-wikilambda-app-commons-media-selector__selected-preview' ).exists() ).toBe( false );
		} );
	} );
} );
