/*!
 * WikiLambda unit test suite for the function-definition-name component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	FunctionMetadataDialog = require( '../../../../resources/ext.wikilambda.edit/components/widgets/FunctionMetadataDialog.vue' ),
	metadataJson = {
		Z1K1: {
			Z1K1: 'Z7',
			Z7K1: 'Z883',
			Z883K1: 'Z6',
			Z883K2: 'Z1'
		},
		K1: [
			{
				Z1K1: 'Z7',
				Z7K1: 'Z882',
				Z882K1: 'Z6',
				Z882K2: 'Z1'
			},
			{
				Z1K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z882',
					Z882K1: 'Z6',
					Z882K2: 'Z1'
				},
				K1: 'key1',
				K2: 'value1'
			},
			{
				Z1K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z882',
					Z882K1: 'Z6',
					Z882K2: 'Z1'
				},
				K1: 'key2',
				K2: 'value2'
			},
			{
				Z1K1: {
					Z1K1: 'Z7',
					Z7K1: 'Z882',
					Z882K1: 'Z6',
					Z882K2: 'Z1'
				},
				K1: 'key3',
				K2: 'value3'
			}
		]
	};

describe( 'FunctionMetadataDialog', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			getLabel: createGettersWithFunctionsMock()
		};
		actions = {
			fetchZKeys: jest.fn()
		};
		mw.internalWikiUrlencode = jest.fn( ( url ) => url );
		global.store.hotUpdate( { getters: getters, actions: actions } );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionMetadataDialog, {
			props: { open: true, metadata: metadataJson },
			global: { stubs: { CdxDialog: false } }
		} );

		expect( wrapper.find( '.ext-wikilambda-metadata-dialog' ).exists() ).toBe( true );
	} );

	it( 'renders metadata text', () => {
		const wrapper = shallowMount( FunctionMetadataDialog, {
			props: { open: true, metadata: metadataJson },
			global: { stubs: { CdxDialog: false } }
		} );

		const body = wrapper.find( '.ext-wikilambda-metadata-dialog-body' );
		expect( body.exists() ).toBe( true );

		const values = body.findAll( 'li' );
		expect( values.length ).toBe( 4 );
		expect( values[ 1 ].text() ).toBe( 'key1: value1' );
		expect( values[ 2 ].text() ).toBe( 'key2: value2' );
		expect( values[ 3 ].text() ).toBe( 'key3: value3' );
	} );

	it( 'renders implementation label', () => {
		const wrapper = shallowMount( FunctionMetadataDialog, {
			props: {
				open: true,
				metadata: metadataJson,
				implementationLabel: 'this implementation'
			},
			global: { stubs: { CdxDialog: false } }
		} );

		const body = wrapper.find( '.ext-wikilambda-metadata-dialog-body' );

		expect( body.find( '.ext-wikilambda-metadata-dialog-body-implementation' ).exists() ).toBe( true );
		expect( body.find( '.ext-wikilambda-metadata-dialog-body-implementation' ).text() ).toBe( 'this implementation' );
	} );

	it( 'renders tester label', () => {
		const wrapper = shallowMount( FunctionMetadataDialog, {
			props: {
				open: true,
				metadata: metadataJson,
				testerLabel: 'this tester'
			},
			global: { stubs: { CdxDialog: false } }
		} );

		const body = wrapper.find( '.ext-wikilambda-metadata-dialog-body' );

		expect( body.find( '.ext-wikilambda-metadata-dialog-body-tester' ).exists() ).toBe( true );
		expect( body.find( '.ext-wikilambda-metadata-dialog-body-tester' ).text() ).toBe( 'this tester' );
	} );
} );
