/* eslint-disable camelcase */
/*!
 * WikiLambda unit test suite for the ZObjectSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var mount = require( '@vue/test-utils' ).mount,
	ZObjectSelector = require( '../../../resources/ext.wikilambda.edit/components/ZObjectSelector.vue' ),
	WmbiAutocompleteSearchInput = require( '../../../resources/ext.wikilambda.edit/components/base/AutocompleteSearchInput.vue' );
describe( 'ZObjectSelector', function () {
	var state,
		getters,
		actions,
		mutations;
	beforeEach( function () {
		state = {
			zKeys: {},
			zKeyLabels: {},
			fetchingZKeys: []
		};
		getters = {
			getZkeyLabels: jest.fn( function ( s ) {
				return s.zKeyLabels;
			} ),
			getZkeys: jest.fn( function ( s ) {
				return s.zKeys;
			} ),
			getZLang: jest.fn( function () {
				return 'en';
			} ),
			getViewMode: jest.fn( function () {
				return false;
			} )
		};
		actions = {
			// eslint-disable-next-line no-unused-vars
			fetchZKeyWithDebounce: jest.fn( function ( context, payload ) {
				return true;
			} )
		};
		mutations = {
			addZKeyLabel: jest.fn( function ( s, payload ) {
				s.zKeyLabels[ payload.key ] = payload.label;
			} )
		};

		global.store.hotUpdate( {
			state: state,
			getters: getters,
			actions: actions,
			mutations: mutations
		} );
	} );
	it( 'renders without errors', function () {
		var wrapper = mount( ZObjectSelector );
		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );
	it( 'searches all ZObjects based on input', function () {
		var wrapper,
			// eslint-disable-next-line no-unused-vars
			mockedGet = jest.fn( function ( payload ) {
				return {
					then: function ( fn ) {
						return fn( {
							batchcomplete: '',
							query: {
								wikilambdasearch_labels: [
									{
										page_namespace: 0,
										page_title: 'Z20',
										page_type: 'Z4',
										label: 'Tester',
										page_id: 0,
										page_content_model: 'zobject',
										page_lang: 'Z1002'
									}
								]
							}
						} );
					}
				};
			} );
		wrapper = mount( ZObjectSelector );
		wrapper.vm.lookupZObject = mockedGet;
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.searchValue = 'test';
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.onInput();
		expect( mockedGet ).toHaveBeenCalledTimes( 1 );
		expect( mockedGet ).toHaveBeenCalledWith( {
			input: 'test',
			type: '',
			returnType: ''
		} );
	} );
	it( 'searches only ZType based on input and props', function () {
		var wrapper,
			// eslint-disable-next-line no-unused-vars
			mockedGet = jest.fn( function ( payload ) {
				return {
					then: function ( fn ) {
						return fn( {
							batchcomplete: ''
						} );
					}
				};
			} );
		wrapper = mount( ZObjectSelector, {
			props: {
				type: 'Z4'
			}
		} );
		wrapper.vm.showLookupResults = true;
		wrapper.vm.lookupZObject = mockedGet;
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.searchValue = 'test';
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.onInput();
		expect( mockedGet ).toHaveBeenCalledTimes( 1 );
		expect( mockedGet ).toHaveBeenCalledWith( {
			input: 'test',
			type: 'Z4',
			returnType: ''
		} );
	} );
	it( 'searches only return ZType based on input and props', function () {
		var wrapper,
			// eslint-disable-next-line no-unused-vars
			mockedGet = jest.fn( function ( payload ) {
				return {
					then: function ( fn ) {
						return fn( {
							batchcomplete: ''
						} );
					}
				};
			} );
		wrapper = mount( ZObjectSelector, {
			props: {
				returnType: 'Z4'
			}
		} );
		wrapper.vm.showLookupResults = true;
		wrapper.vm.lookupZObject = mockedGet;
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.searchValue = 'test';
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.onInput();
		expect( mockedGet ).toHaveBeenCalledTimes( 1 );
		expect( mockedGet ).toHaveBeenCalledWith( {
			input: 'test',
			type: '',
			returnType: 'Z4'
		} );
	} );
	it( 'searches by ZID instead of label', function () {
		var wrapper;
		// eslint-disable-next-line no-unused-vars
		var fetchZKeyWithDebounce = jest.fn( function ( context, payload ) {
			context.state.zKeys = {
				Z4: {
					Z1K1: 'Z2',
					Z2K1: 'Z4',
					Z2K2: {
						Z1K1: 'Z4',
						Z4K1: 'Z4'
					}
				}
			};
			context.state.zKeyLabels = {
				Z4: 'Type'
			};
			return true;
		} );

		global.store.hotUpdate( {
			actions: {
				fetchZKeyWithDebounce: fetchZKeyWithDebounce
			}
		} );
		jest.useFakeTimers();
		wrapper = mount( ZObjectSelector );
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.searchValue = 'Z4';
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.onInput();
		jest.runAllTimers();

		expect( fetchZKeyWithDebounce ).toHaveBeenCalled();
		expect( fetchZKeyWithDebounce ).toHaveBeenCalledWith(
			expect.anything(), [ 'Z4' ]
		);
	} );
	it( 'emits the selected ZID', function () {
		var wrapper;
		wrapper = mount( ZObjectSelector );
		global.store.state.zKeyLabels = {
			Z4: 'String'
		};
		wrapper.vm.lookupResults = {
			Z4: 'String'
		};
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.searchValue = 'Z4';
		wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.$emit( 'submit', 'String' );
		expect( wrapper.emitted().input ).toBeTruthy();
		expect( wrapper.emitted().input ).toEqual( [ [ 'Z4' ] ] );
	} );
} );
