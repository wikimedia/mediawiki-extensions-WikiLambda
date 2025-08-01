/*!
 * WikiLambda unit test suite for the ZObjectSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { mount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const { mockEnumValues, mockLookupValues } = require( '../../fixtures/mocks.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZObjectSelector = require( '../../../../resources/ext.wikilambda.app/components/base/ZObjectSelector.vue' );

describe( 'ZObjectSelector', () => {
	let store;

	describe( 'Lookup', () => {
		beforeEach( () => {
			// Update the Pinia store with the getters and actions
			store = useMainStore();
			store.isEnumType = createGettersWithFunctionsMock( false );
			store.getErrors = createGettersWithFunctionsMock( [] );
			store.getUserRequestedLang = 'en';
			store.getLabelData = createLabelDataMock( {
				Z6: 'String',
				Z4: 'Type',
				Z40: 'Boolean',
				Z60: 'Natural language',
				Z1001: 'Arabic',
				Z1002: 'English',
				Z1003: 'Spanish',
				Z1004: 'French',
				Z1005: 'Russian',
				Z1672: 'Chinese (traditional)',
				Z1645: 'Chinese (simplified)'
			} );
			store.fetchZids.mockResolvedValue();
		} );

		it( 'renders without errors', () => {
			const wrapper = mount( ZObjectSelector );
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'on lookup, sends the the type in the payload', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = mount( ZObjectSelector, {
				props: {
					type: Constants.Z_STRING
				}
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Stri' );

			await waitFor( () => expect( store.lookupZObjectLabels ).toHaveBeenLastCalledWith( {
				input: 'Stri',
				types: [ Constants.Z_STRING ],
				returnTypes: undefined,
				searchContinue: null,
				signal: expect.any( Object )
			} ) );
		} );

		it( 'on lookup for types, sends type and return type in the payload', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = mount( ZObjectSelector, {
				props: {
					type: Constants.Z_TYPE
				}
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Stri' );

			await waitFor( () => expect( store.lookupZObjectLabels ).toHaveBeenLastCalledWith( {
				input: 'Stri',
				types: [ Constants.Z_TYPE, Constants.Z_FUNCTION_CALL ],
				returnTypes: [ Constants.Z_TYPE, Constants.Z_OBJECT ],
				searchContinue: null,
				signal: expect.any( Object )
			} ) );
		} );

		it( 'on lookup for strict types, sends type and return type in the payload', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = mount( ZObjectSelector, {
				props: {
					type: Constants.Z_TYPE,
					strictReturnType: true
				}
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Stri' );

			await waitFor( () => expect( store.lookupZObjectLabels ).toHaveBeenLastCalledWith( {
				input: 'Stri',
				types: [ Constants.Z_TYPE, Constants.Z_FUNCTION_CALL ],
				returnTypes: [ Constants.Z_TYPE ],
				searchContinue: null,
				signal: expect.any( Object )
			} ) );
		} );

		it( 'on input change, shows lookup results', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = mount( ZObjectSelector, {
				props: {
					type: Constants.Z_TYPE,
					strictReturnType: true
				}
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'text' );

			const lookupPayload = {
				input: 'text',
				types: [ Constants.Z_TYPE, Constants.Z_FUNCTION_CALL ],
				returnTypes: [ Constants.Z_TYPE ],
				searchContinue: null,
				signal: expect.any( Object )
			};
			const lookupItems = [ {
				description: 'Type',
				icon: undefined,
				label: 'Monolingual text',
				supportingText: '',
				value: 'Z11'
			}, {
				description: 'Type',
				icon: undefined,
				label: 'Multilingual text',
				supportingText: '',
				value: 'Z12'
			} ];

			await waitFor( () => {
				expect( store.lookupZObjectLabels ).toHaveBeenLastCalledWith( lookupPayload );
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
				expect( lookup.props( 'menuItems' ) ).toEqual( lookupItems );
			} );
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
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z40',
				label: 'Boolean',
				description: 'Type',
				class: 'ext-wikilambda-app-object-selector__suggestion'
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
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1002',
				label: 'English',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1003',
				label: 'Spanish',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1004',
				label: 'French',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1005',
				label: 'Russian',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1672',
				label: 'Chinese (traditional)',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			}, {
				value: 'Z1645',
				label: 'Chinese (simplified)',
				description: 'Natural language',
				class: 'ext-wikilambda-app-object-selector__suggestion'
			} ];
			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );

			await waitFor( () => expect( lookup.props( 'menuItems' ).length ).toBe( 8 ) );
			expect( lookup.props( 'menuItems' ) ).toEqual( commonLangs );
		} );

		it( 'on blur, try to match and ignore if no matching value', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = mount( ZObjectSelector, {
				props: {
					type: Constants.Z_TYPE,
					selectedZid: Constants.Z_STRING
				}
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'text' );

			await waitFor( () => {
				expect( wrapper.vm.inputValue ).toBe( 'text' );
				expect( store.lookupZObjectLabels ).toHaveBeenCalled();
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
				expect( lookup.props( 'menuItems' )[ 0 ].label ).toEqual( 'Monolingual text' );
			} );

			lookup.vm.$emit( 'blur' );
			await wrapper.vm.$nextTick();
			// No exact match for "text", ignore input and keep selected value as Z6/String
			expect( wrapper.vm.inputValue ).toBe( 'String' );
		} );

		it( 'on blur, try to match and select the matching value', async () => {
			store.lookupZObjectLabels.mockResolvedValue( mockLookupValues );

			const wrapper = mount( ZObjectSelector, {
				props: {
					type: Constants.Z_TYPE,
					selectedZid: Constants.Z_STRING
				}
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			lookup.vm.$emit( 'update:input-value', 'Monolingual text' );

			await waitFor( () => {
				expect( wrapper.vm.inputValue ).toBe( 'Monolingual text' );
				expect( store.lookupZObjectLabels ).toHaveBeenCalled();
				expect( lookup.props( 'menuItems' ).length ).toBe( 2 );
				expect( lookup.props( 'menuItems' )[ 0 ].label ).toEqual( 'Monolingual text' );
			} );

			lookup.vm.$emit( 'blur' );
			await wrapper.vm.$nextTick();
			// Found exact match for "Monolingual text", set as selected
			expect( wrapper.vm.inputValue ).toBe( 'Monolingual text' );
		} );

		it( 'on initialization, show selected option in the lookup menu items', async () => {
			const wrapper = mount( ZObjectSelector, {
				props: {
					type: Constants.Z_TYPE,
					selectedZid: Constants.Z_STRING
				}
			} );

			const lookup = wrapper.getComponent( { name: 'cdx-lookup' } );
			const selectedItem = [ {
				label: 'String',
				value: 'Z6',
				description: 'Type'
			} ];

			await waitFor( () => {
				expect( lookup.props( 'menuItems' ).length ).toBe( 1 );
				expect( lookup.props( 'menuItems' ) ).toEqual( selectedItem );
			} );
		} );
	} );

	describe( 'Select', () => {
		const mockEnumZid = 'Z30000';

		beforeEach( () => {
			store = useMainStore();
			store.isEnumType = createGettersWithFunctionsMock( true );
			store.getEnumValues = createGettersWithFunctionsMock( mockEnumValues );
			store.getErrors = createGettersWithFunctionsMock( [] );
			store.getUserRequestedLang = 'en';
			store.getLabelData = createLabelDataMock( {
				Z6: 'String',
				Z4: 'Type',
				Z40: 'Boolean',
				Z60: 'Natural language',
				Z1001: 'Arabic',
				Z1002: 'English',
				Z1003: 'Spanish',
				Z1004: 'French',
				Z1005: 'Russian',
				Z1006: 'Chinese',
				Z30004: 'April'
			} );
			store.fetchZids.mockResolvedValue();
		} );

		it( 'renders without errors', () => {
			const wrapper = mount( ZObjectSelector );
			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'renders a selector instead of lookup component', () => {
			const wrapper = mount( ZObjectSelector, {
				props: {
					type: mockEnumZid
				}
			} );

			expect( wrapper.findComponent( { name: 'cdx-select' } ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-lookup' } ).exists() ).toBe( false );
		} );

		it( 'fetches enum values on initialization', async () => {
			const wrapper = mount( ZObjectSelector, {
				props: {
					type: mockEnumZid
				}
			} );

			const enumMenuItems = [ {
				value: 'Z30001',
				label: 'January'
			}, {
				value: 'Z30002',
				label: 'February'
			}, {
				value: 'Z30003',
				label: 'March'
			} ];

			const select = wrapper.getComponent( { name: 'cdx-select' } );
			await waitFor( () => expect( select.props( 'menuItems' ).length ).toBe( 3 ) );
			expect( store.getEnumValues ).toHaveBeenCalledWith( mockEnumZid, '' );
			expect( select.props( 'menuItems' ) ).toEqual( enumMenuItems );
		} );

		it( 'sets new value on selector update', async () => {
			const wrapper = mount( ZObjectSelector, {
				props: {
					type: mockEnumZid
				}
			} );

			const select = wrapper.getComponent( { name: 'cdx-select' } );
			select.vm.$emit( 'update:selected', 'Z30003' );

			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'select-item', [ [ 'Z30003' ] ] );
		} );

		it( 'prepends the selected value if not present in the batch', async () => {
			store.getEnumValues = jest.fn().mockImplementation( ( zid, selected ) => {
				const selectedValue = { page_title: 'Z30004', label: 'April' };
				return ( selected === 'Z30004' ) ? [ selectedValue, ...mockEnumValues ] : mockEnumValues;
			} );

			const wrapper = mount( ZObjectSelector, {
				props: {
					type: mockEnumZid,
					selectedZid: 'Z30004'
				}
			} );

			const select = wrapper.getComponent( { name: 'cdx-select' } );
			await waitFor( () => expect( select.props( 'menuItems' ).length ).toBe( 4 ) );
			expect( store.getEnumValues ).toHaveBeenCalledWith( mockEnumZid, 'Z30004' );
			expect( select.props( 'menuItems' ) ).toEqual( [
				{ value: 'Z30004', label: 'April' },
				{ value: 'Z30001', label: 'January' },
				{ value: 'Z30002', label: 'February' },
				{ value: 'Z30003', label: 'March' }
			] );
		} );
	} );
} );
