'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	ZResponseEnvelope = require( '../../../resources/ext.wikilambda.edit/components/main-types/ZResponseEnvelope.vue' ),
	ZObjectKey = require( '../../../resources/ext.wikilambda.edit/components/ZObjectKey.vue' );
const { CdxButton } = require( '@wikimedia/codex' );
const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

const zobjectId = 0;
const metadataId = 1;
const listOfPairsId = 2;
const pairId = 3;
const errorsId = 4;

describe( 'ZResponseEnvelope', () => {
	var containsError;
	beforeEach( () => {
		global.store.hotUpdate( {
			getters: {
				getNestedZObjectById: () => ( id, keys ) => {
					if ( id === metadataId ) {
						if ( keys.length === 2 &&
							keys[ 0 ] === Constants.Z_OBJECT_TYPE &&
							keys[ 1 ] === Constants.Z_REFERENCE_ID ) {
							return {};
						} else if ( keys.length === 1 && keys[ 0 ] === Constants.Z_TYPED_OBJECT_ELEMENT_1 ) {
							return { id: listOfPairsId };
						}
					} else if ( id === pairId ) {
						if ( keys.length === 2 &&
							keys[ 0 ] === Constants.Z_TYPED_OBJECT_ELEMENT_1 &&
							keys[ 1 ] === Constants.Z_STRING_VALUE ) {
							return { value: containsError ? 'errors' : '' };
						} else if ( keys.length === 1 &&
									keys[ 0 ] === Constants.Z_TYPED_OBJECT_ELEMENT_2 ) {
							return { id: errorsId };
						}
					}
				},
				getZObjectChildrenById: () => ( id ) => {
					if ( id === zobjectId ) {
						return [ { key: Constants.Z_RESPONSEENVELOPE_METADATA, id: metadataId } ];
					} else if ( id === listOfPairsId ) {
						return [ { id: pairId } ];
					}
				}
			}
		} );

	} );
	it( 'renders successfully', () => {
		var wrapper = VueTestUtils.shallowMount( ZResponseEnvelope, { props: { zobjectId: zobjectId } } );

		expect( wrapper.find( '.ext-wikilambda-zresponseenvelope' ).exists() ).toBe( true );
	} );
	describe( 'error section', () => {
		it( 'does not show error or "hide error"/"show error" button when there is no error', () => {
			containsError = false;
			var wrapper = VueTestUtils.shallowMount( ZResponseEnvelope, { props: { zobjectId: zobjectId } } );

			expect( wrapper.find( '.ext-wikilambda-zresponseenvelope__show-error' ).exists() ).toBe( false );
			expect( wrapper.find( '.ext-wikilambda-zresponseenvelope__error' ).exists() ).toBe( false );
		} );
		it( 'shows error and "hide error"/"show error" button when there is error', () => {
			containsError = true;
			var wrapper = VueTestUtils.shallowMount( ZResponseEnvelope, { props: { zobjectId: zobjectId } } );

			expect( wrapper.find( '.ext-wikilambda-zresponseenvelope__show-error' ).exists() ).toBe( true );
			expect( wrapper.find( '.ext-wikilambda-zresponseenvelope__error' ).exists() ).toBe( true );
			expect( wrapper.get( '.ext-wikilambda-zresponseenvelope__error' ).getComponent( ZObjectKey )
				.props( 'zobjectId' ) ).toEqual( errorsId );
		} );
		it( 'hides error when there is an error and user has clicked button', async () => {
			containsError = true;
			var wrapper = VueTestUtils.shallowMount( ZResponseEnvelope, { props: { zobjectId: zobjectId } } );

			wrapper.get( '.ext-wikilambda-zresponseenvelope__show-error' ).getComponent( CdxButton )
				.vm.$emit( 'click', { preventDefault: () => {} } );
			await wrapper.vm.$nextTick();

			expect( wrapper.find( '.ext-wikilambda-zresponseenvelope__error' ).exists() ).toBe( false );
		} );
	} );

} );
