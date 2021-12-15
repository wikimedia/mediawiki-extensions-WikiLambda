/*!
 * WikiLambda unit test suite for the ZTesterImplResult component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' ),
	ZFunctionTesterReport = require( '../../../../resources/ext.wikilambda.edit/components/function/ZFunctionTesterReport.vue' ),
	localVue;

localVue = createLocalVue();
localVue.use( Vuex );

describe( 'ZFunctionTesterReport', function () {
	var getters,
		actions,
		store,
		i18n = jest.fn( function ( str ) {
			return str;
		} );

	beforeEach( function () {
		getters = {
			getZObjectChildrenById: jest.fn(),
			getZkeyLabels: jest.fn( function () {
				return {
					Z10000: 'FN',
					Z10001: 'IMPL',
					Z10002: 'TESTER'
				};
			} ),
			getZkeys: jest.fn( function () {
				return {
					Z10000: 'Z10000',
					Z10001: 'Z10001',
					Z10002: 'Z10002'
				};
			} ),
			getViewMode: jest.fn( function () {
				return false;
			} ),
			getNestedZObjectById: jest.fn(),
			getZObjectAsJsonById: jest.fn(),
			getZTesterPercentage: jest.fn( function () {
				return function () {
					return {
						passing: 1,
						total: 1,
						percentage: 100
					};
				};
			} ),
			getCurrentZObjectId: jest.fn(),
			getZTesterResults: jest.fn( function () {
				return jest.fn();
			} )
		};
		actions = {
			fetchZKeys: jest.fn(),
			getTestResults: jest.fn()
		};

		store = new Vuex.Store( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZFunctionTesterReport, {
			store: store,
			localVue: localVue,
			propsData: {
				zFunctionId: ''
			},
			mocks: {
				$i18n: jest.fn()
			}
		} );
		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );

	it( 'triggers the tests on load', function () {
		shallowMount( ZFunctionTesterReport, {
			store: store,
			localVue: localVue,
			propsData: {
				zFunctionId: ''
			},
			mocks: {
				$i18n: i18n
			}
		} );

		// eslint-disable-next-line compat/compat
		return new Promise( function ( resolve ) {
			setTimeout( function () {
				expect( actions.getTestResults ).toHaveBeenCalled();
				expect( actions.getTestResults ).toHaveBeenCalledWith( expect.anything(), {
					zFunctionId: '',
					zImplementations: [],
					zTesters: [],
					clearPreviousResults: true
				} );

				resolve();
			}, 1500 );
		} );
	} );

	it( 'displays no results when no implementations or testers found', function () {
		var wrapper = shallowMount( ZFunctionTesterReport, {
			store: store,
			localVue: localVue,
			propsData: {
				zFunctionId: ''
			},
			mocks: {
				$i18n: i18n
			}
		} );
		expect( wrapper.find( 'p' ).text() ).toBe( 'wikilambda-tester-no-results' );
	} );

	it( 'triggers the tests on button click', function () {
		var expectedImplementationId = 'Z10001',
			expectedTesterId = 'Z10002',
			wrapper = shallowMount( ZFunctionTesterReport, {
				store: store,
				localVue: localVue,
				propsData: {
					zFunctionId: 'Z10000',
					zImplementationId: expectedImplementationId,
					zTesterId: expectedTesterId
				},
				mocks: {
					$i18n: i18n
				},
				computed: {
					implementations: jest.fn().mockReturnValue( [ expectedImplementationId ] ),
					testers: jest.fn().mockReturnValue( [ expectedTesterId ] )
				}
			} );

		return wrapper.find( 'button' ).trigger( 'click' ).then( function () {
			expect( actions.getTestResults ).toHaveBeenCalledWith( expect.anything(), {
				zFunctionId: 'Z10000',
				zImplementations: [ 'Z10001' ],
				zTesters: [ 'Z10002' ],
				clearPreviousResults: true
			} );
		} );
	} );
} );
