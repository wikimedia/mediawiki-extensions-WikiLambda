/* eslint-disable camelcase */
/*!
 * WikiLambda unit test suite for the ZObjectSelector component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
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
					done: function ( fn ) {
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
		// eslint-disable-next-line no-undef
		global.mw.Api = function mockedApi() {
			this.get = mockedGet;
		};

		wrapper = mount( ZObjectSelector, {
			store: store,
			localVue: localVue
		} );

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
					action: 'query',
					list: 'wikilambdasearch_labels',
					wikilambdasearch_search: 'test',
					wikilambdasearch_type: '',
					wikilambdasearch_language: 'en'
				} );
			} );
	} );

	it( 'searches only ZType based on input and props', function () {
		var wrapper,
			// eslint-disable-next-line no-unused-vars
			mockedGet = jest.fn( function ( payload ) {
				return {
					done: function ( fn ) {
						return fn( {
							batchcomplete: ''
						} );
					}
				};
			} );
		// eslint-disable-next-line no-undef
		global.mw.Api = function mockedApi() {
			this.get = mockedGet;
		};

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
					action: 'query',
					list: 'wikilambdasearch_labels',
					wikilambdasearch_search: 'test',
					wikilambdasearch_type: 'Z4',
					wikilambdasearch_language: 'en'
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
