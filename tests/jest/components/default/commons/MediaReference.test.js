/*!
 * WikiLambda unit test suite for the Commons Media Reference component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const MediaReference = require( '../../../../../resources/ext.wikilambda.app/components/types/commons/MediaReference.vue' );

const MID = 'M68960758';
const TITLE = 'File:Cat.jpg';
const DESC_URL = 'https://commons.wikimedia.org/wiki/File:Cat.jpg';

// Z310 object with M-ID set
const objectValueWithId = {
	Z1K1: 'Z310',
	[ Constants.Z_COMMONS_MEDIA_REFERENCE_ID ]: MID
};

// Z310 object with no M-ID
const objectValueEmpty = {
	Z1K1: 'Z310',
	[ Constants.Z_COMMONS_MEDIA_REFERENCE_ID ]: ''
};

describe( 'CommonsMediaReference', () => {
	let store;

	function renderMediaReference( props = {} ) {
		const defaultProps = {
			objectValue: objectValueEmpty,
			edit: false
		};
		return shallowMount( MediaReference, { props: { ...defaultProps, ...props } } );
	}

	beforeEach( () => {
		store = useMainStore();
		store.fetchCommonsMedia.mockResolvedValue();
		store.getCommonsMediaTitle = createGettersWithFunctionsMock( undefined );
		store.getCommonsMediaDescriptionUrl = createGettersWithFunctionsMock( undefined );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderMediaReference();
		expect( wrapper.find( '.ext-wikilambda-app-commons-media-reference' ).exists() ).toBe( true );
	} );

	describe( 'in view mode', () => {
		it( 'shows a link when title and description URL are available', async () => {
			store.getCommonsMediaTitle = createGettersWithFunctionsMock( TITLE );
			store.getCommonsMediaDescriptionUrl = createGettersWithFunctionsMock( DESC_URL );

			const wrapper = renderMediaReference( { objectValue: objectValueWithId } );

			await waitFor( () => {
				const link = wrapper.find( '.ext-wikilambda-app-commons-media-reference__link' );
				expect( link.exists() ).toBe( true );
				expect( link.text() ).toBe( TITLE );
				expect( link.attributes( 'href' ) ).toBe( DESC_URL );
			} );
		} );

		it( 'shows the M-ID when mediaId is set but title is not yet fetched', async () => {
			store.getCommonsMediaTitle = createGettersWithFunctionsMock( undefined );

			const wrapper = renderMediaReference( { objectValue: objectValueWithId } );

			await waitFor( () => {
				expect( wrapper.find( '.ext-wikilambda-app-commons-media-reference__unknown' ).exists() ).toBe( true );
				expect( wrapper.find( '.ext-wikilambda-app-commons-media-reference__unknown' ).text() ).toBe( MID );
			} );
		} );

		it( 'shows the empty placeholder when no M-ID is set', () => {
			const wrapper = renderMediaReference();
			expect( wrapper.find( '.ext-wikilambda-app-commons-media-reference__empty' ).exists() ).toBe( true );
		} );

		it( 'does not show MediaSelector in view mode', () => {
			const wrapper = renderMediaReference();
			expect( wrapper.findComponent( { name: 'wl-commons-media-selector' } ).exists() ).toBe( false );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders the MediaSelector component', () => {
			const wrapper = renderMediaReference( { edit: true } );
			expect( wrapper.findComponent( { name: 'wl-commons-media-selector' } ).exists() ).toBe( true );
		} );

		it( 'passes mediaId and mediaTitle to MediaSelector', async () => {
			store.getCommonsMediaTitle = createGettersWithFunctionsMock( TITLE );

			const wrapper = renderMediaReference( {
				objectValue: objectValueWithId,
				edit: true
			} );

			await waitFor( () => {
				const selector = wrapper.findComponent( { name: 'wl-commons-media-selector' } );
				expect( selector.props( 'mediaId' ) ).toBe( MID );
				expect( selector.props( 'mediaTitle' ) ).toBe( TITLE );
			} );
		} );

		it( 'emits set-value with the new M-ID when a media file is selected', async () => {
			const wrapper = renderMediaReference( { edit: true } );
			const selector = wrapper.findComponent( { name: 'wl-commons-media-selector' } );

			selector.vm.$emit( 'select-commons-media', MID );

			await waitFor( () => {
				expect( wrapper.emitted( 'set-value' ) ).toBeTruthy();
				expect( wrapper.emitted( 'set-value' )[ 0 ] ).toEqual( [ {
					value: MID,
					keyPath: [ Constants.Z_COMMONS_MEDIA_REFERENCE_ID ]
				} ] );
			} );
		} );
	} );

	describe( 'store fetch', () => {
		it( 'calls fetchCommonsMedia immediately when mediaId is set', () => {
			renderMediaReference( { objectValue: objectValueWithId } );
			expect( store.fetchCommonsMedia ).toHaveBeenCalledWith( { ids: [ MID ] } );
		} );

		it( 'does not call fetchCommonsMedia when mediaId is empty', () => {
			renderMediaReference();
			expect( store.fetchCommonsMedia ).not.toHaveBeenCalled();
		} );

		it( 'calls fetchCommonsMedia again when objectValue changes to a new mediaId', async () => {
			const wrapper = renderMediaReference();
			expect( store.fetchCommonsMedia ).not.toHaveBeenCalled();

			await wrapper.setProps( { objectValue: objectValueWithId } );
			expect( store.fetchCommonsMedia ).toHaveBeenCalledWith( { ids: [ MID ] } );
		} );
	} );
} );
