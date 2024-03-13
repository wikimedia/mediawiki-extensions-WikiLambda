/*!
 * WikiLambda unit test suite for the ZObjectSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZObjectSelector = require( '../../../../resources/ext.wikilambda.edit/components/base/ZObjectSelector.vue' );

describe( 'ZObjectSelector', () => {
	const lookupMock = jest.fn( () => [] );
	let state,
		getters,
		actions;

	beforeEach( () => {
		state = {
			objects: {},
			labels: {},
			errors: {}
		};
		getters = {
			getErrors: createGettersWithFunctionsMock( [] ),
			getLabel: () => ( zid ) => {
				const labels = {
					Z6: 'String',
					Z4: 'Type',
					Z40: 'Boolean',
					Z60: 'Natural language',
					Z1001: 'Arabic',
					Z1002: 'English',
					Z1003: 'Spanish',
					Z1004: 'French',
					Z1005: 'Russian',
					Z1006: 'Chinese'
				};
				return zid in labels ? labels[ zid ] : zid;
			}
		};
		actions = {
			fetchZids: jest.fn(),
			lookupZObject: lookupMock
		};
		global.store.hotUpdate( {
			state: state,
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = mount( ZObjectSelector );
		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'on lookup, sends the the selector type in the payload', async () => {
		const wrapper = mount( ZObjectSelector, {
			props: {
				type: Constants.Z_TYPE
			}
		} );

		const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
		lookup.vm.$emit( 'input', 'Stri' );

		await waitFor( () => expect( lookupMock ).toHaveBeenLastCalledWith(
			expect.anything(),
			{
				input: 'Stri',
				returnType: '',
				type: Constants.Z_TYPE,
				strictType: false
			}
		) );
	} );

	it( 'on initialization, sets suggested objects', async () => {
		const wrapper = mount( ZObjectSelector, {
			props: {
				type: Constants.Z_TYPE
			}
		} );

		const commonTypes = [ {
			label: 'Suggested types',
			value: 'suggestion',
			disabled: true
		}, {
			value: 'Z6',
			label: 'String',
			description: 'Type',
			class: 'ext-wikilambda-select-zobject-suggestion'
		}, {
			value: 'Z40',
			label: 'Boolean',
			description: 'Type',
			class: 'ext-wikilambda-select-zobject-suggestion'
		} ];
		const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );

		await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 3 ) );
		expect( lookup.props( 'menuItems' ) ).toEqual( commonTypes );
	} );

	it( 'on type change, sets suggested objects', async () => {
		const wrapper = mount( ZObjectSelector );

		wrapper.setProps( { type: Constants.Z_NATURAL_LANGUAGE } );
		await wrapper.vm.$nextTick();

		const commonLangs = [ {
			label: 'Suggested languages',
			value: 'suggestion',
			disabled: true
		}, {
			value: 'Z1001',
			label: 'Arabic',
			description: 'Natural language',
			class: 'ext-wikilambda-select-zobject-suggestion'
		}, {
			value: 'Z1002',
			label: 'English',
			description: 'Natural language',
			class: 'ext-wikilambda-select-zobject-suggestion'
		}, {
			value: 'Z1003',
			label: 'Spanish',
			description: 'Natural language',
			class: 'ext-wikilambda-select-zobject-suggestion'
		}, {
			value: 'Z1004',
			label: 'French',
			description: 'Natural language',
			class: 'ext-wikilambda-select-zobject-suggestion'
		}, {
			value: 'Z1005',
			label: 'Russian',
			description: 'Natural language',
			class: 'ext-wikilambda-select-zobject-suggestion'
		}, {
			value: 'Z1006',
			label: 'Chinese',
			description: 'Natural language',
			class: 'ext-wikilambda-select-zobject-suggestion'
		} ];
		const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );

		await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 7 ) );
		expect( lookup.props( 'menuItems' ) ).toEqual( commonLangs );
	} );
} );
