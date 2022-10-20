'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	ZArgumentReference = require( '../../../resources/ext.wikilambda.edit/components/types/ZArgumentReference.vue' );
const Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

const zobjectId = 0;

describe( 'ZArgumentReference', () => {
	beforeEach( () => {
		global.store.hotUpdate( {
			getters: {
				getZarguments: function () {
					return { Z12345K1: { labels: [ { key: 'word: ', label: 'word', lang: 'Z10002' } ], zid: 'Z12345K1', type: 'String' },
						Z12345K2: { labels: [ ], zid: 'Z12345K2', type: 'String' },
						Z12345K3: { labels: [ { key: 'woord: ', label: 'woord', lang: 'Z1532' } ], zid: 'Z12345K3', type: 'String' } };
				},
				getZObjectChildrenById: () => () => {
					return [
						{ id: 100, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_ARGUMENT_REFERENCE },
						{ id: 101, key: Constants.Z_ARGUMENT_REFERENCE_KEY }
					];
				},
				getCurrentZLanguage: jest.fn().mockReturnValue( 'Z10002' )

			},
			actions: {
				setZObjectValue: jest.fn()
			}
		} );

	} );
	it( 'renders successfully', () => {
		var wrapper = VueTestUtils.shallowMount( ZArgumentReference, { props: { zobjectId: zobjectId } } );

		expect( wrapper.find( '.ext-wikilambda-zargument-reference' ).exists() ).toBe( true );
	} );

	it( 'displays arguments when they have a label in the user lang, a label in a fallback lang, or no label', () => {
		var wrapper = VueTestUtils.shallowMount( ZArgumentReference, { props: { zobjectId: zobjectId } } ),
			select,
			options;

		select = wrapper.find( 'select' );
		options = select.findAll( 'option' );

		expect( options.length ).toEqual( 4 );

		expect( options[ 1 ].element.innerHTML ).toEqual( 'word' );
		expect( options[ 2 ].element.innerHTML ).toEqual( 'wikilambda-function-viewer-details-input-number' );
		expect( options[ 3 ].element.innerHTML ).toEqual( 'woord' );
	} );
} );
