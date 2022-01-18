/* eslint-disable camelcase */
/*!
 * WikiLambda unit test suite for the ZObjectSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var mount = require( '@vue/test-utils' ).mount,
	createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' ),
	ZObjectSelector = require( '../../../resources/ext.wikilambda.edit/components/ZObjectSelector.vue' ),
	WmbiAutocompleteSearchInput = require( '../../../resources/ext.wikilambda.edit/components/base/AutocompleteSearchInput.vue' ),
	localVue;

localVue = createLocalVue();
localVue.use( Vuex );

describe( 'ZObjectSelector', function () {
	var state,
		getters,
		actions,
		mutations,
		store;

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
			fetchZKeys: jest.fn( function ( context, payload ) {
				return true;
			} )
		};
		mutations = {
			addZKeyLabel: jest.fn( function ( s, payload ) {
				s.zKeyLabels[ payload.key ] = payload.label;
			} )
		};
		store = new Vuex.Store( {
			state: state,
			getters: getters,
			actions: actions,
			mutations: mutations
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = mount( ZObjectSelector, {
			store: store,
			localVue: localVue
		} );

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

		wrapper = mount( ZObjectSelector, {
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: jest.fn()
			}
		} );

		wrapper.vm.lookupZObject = mockedGet;

		return wrapper.find( 'input' ).setValue( 'test' )
			.then( function () {
				// eslint-disable-next-line compat/compat
				return new Promise( function ( resolve ) {
					setTimeout( function () {
						resolve();
					}, 1000 );
				} );
			} )
			.then( function () {
				expect( mockedGet ).toHaveBeenCalledTimes( 1 );
				expect( mockedGet ).toHaveBeenCalledWith( {
					input: 'test',
					type: '',
					returnType: ''
				} );
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
			propsData: {
				type: 'Z4'
			},
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: jest.fn()
			}
		} );

		wrapper.vm.lookupZObject = mockedGet;

		return wrapper.find( 'input' ).setValue( 'test' )
			.then( function () {
				// eslint-disable-next-line compat/compat
				return new Promise( function ( resolve ) {
					setTimeout( function () {
						resolve();
					}, 1000 );
				} );
			} )
			.then( function () {
				expect( mockedGet ).toHaveBeenCalledTimes( 1 );
				expect( mockedGet ).toHaveBeenCalledWith( {
					input: 'test',
					type: 'Z4',
					returnType: ''
				} );
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
			propsData: {
				returnType: 'Z4'
			},
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: jest.fn()
			}
		} );

		wrapper.vm.lookupZObject = mockedGet;

		return wrapper.find( 'input' ).setValue( 'test' )
			.then( function () {
				// eslint-disable-next-line compat/compat
				return new Promise( function ( resolve ) {
					setTimeout( function () {
						resolve();
					}, 1000 );
				} );
			} )
			.then( function () {
				expect( mockedGet ).toHaveBeenCalledTimes( 1 );
				expect( mockedGet ).toHaveBeenCalledWith( {
					input: 'test',
					type: '',
					returnType: 'Z4'
				} );
			} );
	} );

	it( 'searches by ZID instead of label', function () {
		var wrapper;

		// eslint-disable-next-line no-unused-vars
		actions.fetchZKeys = jest.fn( function ( context, payload ) {
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

		store = new Vuex.Store( {
			state: state,
			getters: getters,
			actions: actions,
			mutations: mutations
		} );

		wrapper = mount( ZObjectSelector, {
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: jest.fn()
			}
		} );

		return wrapper.find( 'input' ).setValue( 'Z4' )
			.then( function () {
				// eslint-disable-next-line compat/compat
				return new Promise( function ( resolve ) {
					setTimeout( function () {
						resolve();
					}, 1000 );
				} );
			} )
			.then( function () {
				expect( actions.fetchZKeys ).toHaveBeenCalled();
				expect( actions.fetchZKeys ).toHaveBeenCalledWith(
					expect.anything(), [ 'Z4' ]
				);
			} );
	} );

	it( 'emits the selected ZID', function () {
		var wrapper;

		// eslint-disable-next-line no-unused-vars
		actions.fetchZKeys = jest.fn( function ( context, payload ) {
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

		store = new Vuex.Store( {
			state: state,
			getters: getters,
			actions: actions,
			mutations: mutations
		} );

		wrapper = mount( ZObjectSelector, {
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: jest.fn()
			}
		} );

		return wrapper.find( 'input' ).setValue( 'Z4' )
			.then( function () {
				// eslint-disable-next-line compat/compat
				return new Promise( function ( resolve ) {
					setTimeout( function () {
						resolve();
					}, 1000 );
				} );
			} )
			.then( function () {
				return wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.$emit( 'submit', {} );
			} )
			.then( function () {
				expect( wrapper.emitted().input ).toBeTruthy();
				expect( wrapper.emitted().input ).toEqual( [ [ 'Z4' ] ] );
			} );
	} );

	it( 'emits an empty string when cleared', function () {
		var wrapper;

		// eslint-disable-next-line no-unused-vars
		actions.fetchZKeys = jest.fn( function ( context, payload ) {
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

		store = new Vuex.Store( {
			state: state,
			getters: getters,
			actions: actions,
			mutations: mutations
		} );

		wrapper = mount( ZObjectSelector, {
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: jest.fn()
			}
		} );

		return wrapper.find( 'input' ).setValue( 'Z4' )
			.then( function () {
				// eslint-disable-next-line compat/compat
				return new Promise( function ( resolve ) {
					setTimeout( function () {
						resolve();
					}, 1000 );
				} );
			} )
			.then( function () {
				return wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.$emit( 'submit', {} );
			} )
			.then( function () {
				return wrapper.findComponent( WmbiAutocompleteSearchInput ).vm.$emit( 'clear' );
			} )
			.then( function () {
				expect( wrapper.emitted().input ).toBeTruthy();
				expect( wrapper.emitted().input ).toEqual( [ [ 'Z4' ], [ '' ] ] );
			} );
	} );
} );
