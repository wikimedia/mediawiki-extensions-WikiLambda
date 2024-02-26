/*!
 * WikiLambda unit test suite for the FunctionViewerDetails component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	{ waitFor } = require( '@testing-library/vue' ),
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	FunctionViewerDetails = require( '../../../../../resources/ext.wikilambda.edit/components/function/viewer/FunctionViewerDetails.vue' );

const mockData = {
	Z111: {
		label: 'Z111 name'
	},
	Z222: {
		label: 'Z222 name'
	},
	Z333: {
		label: 'Z333 name',
		type: 'Z14K2'
	},
	Z444: {
		label: 'Z444 name',
		type: 'Z14K3',
		language: 'javascript'
	},
	Z555: {
		label: 'Z555 name',
		type: 'Z14K3',
		language: 'Z600'
	},
	Z600: {
		label: 'JavaScript',
		type: 'Z61'
	}
};

describe( 'FunctionViewerDetails', () => {
	let getters,
		actions,
		actionsThrowError;

	beforeEach( () => {
		actionsThrowError = false;

		const createAction = function () {
			return jest.fn( () => {
				return {
					then: function ( fn ) {
						if ( actionsThrowError ) {
							throw Object.assign( new Error(), { error: { message: 'error!' } } );
						}
						return fn();
					}
				};
			} );
		};
		const allTests = [ 'Z111', 'Z222' ];
		const allImplementations = [ 'Z333', 'Z444', 'Z555' ];
		actions = {
			connectImplementations: createAction(),
			connectTests: createAction(),
			disconnectImplementations: createAction(),
			disconnectTests: createAction(),
			getTestResults: jest.fn(),
			fetchZids: jest.fn(),
			fetchImplementations: jest.fn( () => {
				return { then: ( fn ) => fn( allImplementations ) };
			} ),
			fetchTests: jest.fn( () => {
				return { then: ( fn ) => fn( allTests ) };
			} )
		};
		getters = {
			getConnectedTests: createGettersWithFunctionsMock( [ 'Z222' ] ),
			getConnectedImplementations: createGettersWithFunctionsMock( [ 'Z444' ] ),
			getUserLangCode: createGetterMock( 'Z1002' ),
			getCurrentZObjectId: createGetterMock( 'Z666' ),
			getLanguageOfImplementation: () => ( zid ) => {
				const data = mockData[ zid ];
				return data ? data.language : undefined;
			},
			getTypeOfImplementation: () => ( zid ) => {
				const data = mockData[ zid ];
				return data ? data.type : undefined;
			},
			getLabel: () => ( zid ) => {
				const data = mockData[ zid ];
				return data ? data.label : zid;
			}
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionViewerDetails );
		expect( wrapper.find( '.ext-wikilambda-function-details' ).exists() ).toBe( true );
	} );

	it( 'loads child components', () => {
		const wrapper = shallowMount( FunctionViewerDetails );
		expect( wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } ) ).toHaveLength( 2 );
	} );

	it( 'passes implementations to table correctly', async () => {
		const wrapper = shallowMount( FunctionViewerDetails );
		await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

		const implTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ];
		const implTableItems = implTable.props( 'body' );

		expect( implTableItems ).toHaveLength( 3 );
		expect( implTableItems[ 0 ].checkbox.props.modelValue ).toBe( false );
		expect( implTableItems[ 0 ].language.title ).toEqual( 'Composition' );
		expect( implTableItems[ 0 ].name.title ).toEqual( 'Z333 name' );
		expect( implTableItems[ 0 ].state.title ).toEqual( 'Disconnected' );
		expect( implTableItems[ 1 ].checkbox.props.modelValue ).toBe( false );
		expect( implTableItems[ 1 ].language.title ).toEqual( 'javascript' );
		expect( implTableItems[ 1 ].name.title ).toEqual( 'Z444 name' );
		expect( implTableItems[ 1 ].state.title ).toEqual( 'Connected' );
		expect( implTableItems[ 2 ].checkbox.props.modelValue ).toBe( false );
		expect( implTableItems[ 2 ].language.title ).toEqual( 'JavaScript' );
		expect( implTableItems[ 2 ].name.title ).toEqual( 'Z555 name' );
		expect( implTableItems[ 2 ].state.title ).toEqual( 'Disconnected' );
	} );

	it( 'passes testers to table correctly', async () => {
		const wrapper = shallowMount( FunctionViewerDetails );
		await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

		const testTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ];
		const testTableItems = testTable.props( 'body' );

		expect( testTableItems ).toHaveLength( 2 );
		expect( testTableItems[ 0 ].checkbox.props.modelValue ).toBe( false );
		expect( testTableItems[ 0 ].name.title ).toEqual( 'Z111 name' );
		expect( testTableItems[ 0 ].state.title ).toEqual( 'Disconnected' );
		expect( testTableItems[ 1 ].checkbox.props.modelValue ).toBe( false );
		expect( testTableItems[ 1 ].name.title ).toEqual( 'Z222 name' );
		expect( testTableItems[ 1 ].state.title ).toEqual( 'Connected' );
	} );

	describe( 'implementations without labels display the ZID', () => {
		beforeEach( () => {
			getters.getLabel = () => ( zid ) => {
				const labels = { Z333: 'Z333 name' };
				return labels[ zid ] ? labels[ zid ] : zid;
			};
			global.store.hotUpdate( {
				getters: getters
			} );
		} );

		it( 'in the implementations table', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

			const implTableItems = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ].props( 'body' );

			expect( implTableItems[ 0 ].name.title ).toEqual( 'Z333 name' );
			expect( implTableItems[ 1 ].name.title ).toEqual( 'Z444' );
		} );

		it( 'in the tests table header', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTableHeaderItems = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ].props( 'header' );

			expect( testTableHeaderItems.Z333.title ).toEqual( 'Z333 name' );
			expect( testTableHeaderItems.Z444.title ).toEqual( 'Z444' );
		} );
	} );

	describe( 'tests without labels display the ZID', () => {
		beforeEach( () => {
			getters.getLabel = () => ( zid ) => {
				const labels = { Z222: 'Z222 name' };
				return labels[ zid ] ? labels[ zid ] : zid;
			};
			global.store.hotUpdate( {
				getters: getters
			} );
		} );

		it( 'in the tests table rows', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTableItems = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ].props( 'body' );

			expect( testTableItems[ 0 ].name.title ).toEqual( 'Z111' );
			expect( testTableItems[ 1 ].name.title ).toEqual( 'Z222 name' );
		} );
	} );

	describe( 'implementations select-all checkbox', () => {
		it( 'is unchecked when not all checkboxes below are checked', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

			const implTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ];
			implTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			await waitFor( () => expect( implTable.props( 'header' ).checkbox.props.modelValue ).toBe( false ) );
		} );

		it( 'is checked when all checkboxes below are checked', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

			const implTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ];
			implTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			implTable.props( 'body' )[ 1 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			implTable.props( 'body' )[ 2 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			await waitFor( () => expect( implTable.props( 'header' ).checkbox.props.modelValue ).toBe( true ) );
		} );

		it( 'checks all below checkboxes when checked', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

			const implTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ];
			implTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			await waitFor( () => {
				expect( implTable.props( 'body' )[ 0 ].checkbox.props.modelValue ).toBe( true );
				expect( implTable.props( 'body' )[ 1 ].checkbox.props.modelValue ).toBe( true );
			} );
		} );

		it( 'unchecks all below checkboxes when unchecked', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

			const implTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ];
			implTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			implTable.props( 'body' )[ 1 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			implTable.props( 'body' )[ 2 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			await waitFor( () => expect( implTable.props( 'header' ).checkbox.props.modelValue ).toBe( true ) );

			implTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( false );

			await waitFor( () => {
				expect( implTable.props( 'body' )[ 0 ].checkbox.props.modelValue ).toBe( false );
				expect( implTable.props( 'body' )[ 1 ].checkbox.props.modelValue ).toBe( false );
				expect( implTable.props( 'body' )[ 2 ].checkbox.props.modelValue ).toBe( false );
			} );
		} );
	} );

	describe( 'tests select-all checkbox', () => {
		it( 'is unchecked when not all checkboxes below are checked', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ];
			testTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			await waitFor( () => expect( testTable.props( 'header' ).checkbox.props.modelValue ).toBe( false ) );
		} );

		it( 'is checked when all checkboxes below are checked', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ];
			testTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			testTable.props( 'body' )[ 1 ].checkbox.props[ 'onUpdate:modelValue' ]( true );

			await waitFor( () => expect( testTable.props( 'header' ).checkbox.props.modelValue ).toBe( true ) );
		} );

		it( 'checks all below checkboxes when checked', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ];
			testTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			await waitFor( () => {
				expect( testTable.props( 'body' )[ 0 ].checkbox.props.modelValue ).toBe( true );
				expect( testTable.props( 'body' )[ 1 ].checkbox.props.modelValue ).toBe( true );
			} );
		} );

		it( 'unchecks all below checkboxes when unchecked', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ];
			testTable.props( 'body' )[ 0 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			testTable.props( 'body' )[ 1 ].checkbox.props[ 'onUpdate:modelValue' ]( true );
			await waitFor( () => expect( testTable.props( 'header' ).checkbox.props.modelValue ).toBe( true ) );

			testTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( false );

			await waitFor( () => {
				expect( testTable.props( 'body' )[ 0 ].checkbox.props.modelValue ).toBe( false );
				expect( testTable.props( 'body' )[ 1 ].checkbox.props.modelValue ).toBe( false );
			} );
		} );
	} );

	describe( 'connect & disconnect buttons', () => {
		it( 'connect checked implementation, without error toast', async () => {
			const wrapper = shallowMount( FunctionViewerDetails, { props: { rowId: 123 } } );
			await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

			const implTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ];
			implTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			implTable.vm.$emit( 'connect' );

			await waitFor( () => {
				expect( actions.connectImplementations ).toHaveBeenCalledWith( expect.anything(), {
					rowId: 123,
					zids: [ 'Z333', 'Z555' ]
				} );
				expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( false );
			} );
		} );

		it( 'disconnect checked implementation, without error toast', async () => {
			const wrapper = shallowMount( FunctionViewerDetails, { props: { rowId: 123 } } );
			await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

			const implTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ];
			implTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			implTable.vm.$emit( 'disconnect' );

			await waitFor( () => {
				expect( actions.disconnectImplementations ).toHaveBeenCalledWith( expect.anything(), {
					rowId: 123,
					zids: [ 'Z444' ]
				} );
				expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( false );
			} );
		} );

		it( 'connect checked tester, without error toast', async () => {
			const wrapper = shallowMount( FunctionViewerDetails, { props: { rowId: 123 } } );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ];
			testTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			testTable.vm.$emit( 'connect' );

			await waitFor( () => {
				expect( actions.connectTests ).toHaveBeenCalledWith( expect.anything(), {
					rowId: 123,
					zids: [ 'Z111' ]
				} );
				expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( false );
			} );
		} );

		it( 'disconnect checked tester, without error toast', async () => {
			const wrapper = shallowMount( FunctionViewerDetails, { props: { rowId: 123 } } );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ];
			testTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			testTable.vm.$emit( 'disconnect' );

			await waitFor( () => {
				expect( actions.disconnectTests ).toHaveBeenCalledWith( expect.anything(), {
					rowId: 123,
					zids: [ 'Z222' ]
				} );
				expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( false );
			} );
		} );

		it( 'show error toast when an operation fails', async () => {
			const wrapper = shallowMount( FunctionViewerDetails, { props: { rowId: 123 } } );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ];
			testTable.props( 'header' ).checkbox.props[ 'onUpdate:modelValue' ]( true );

			// Force mock API to return error
			actionsThrowError = true;
			testTable.vm.$emit( 'disconnect' );

			await waitFor( () => {
				expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
				expect( wrapper.findComponent( { name: 'cdx-message' } ).props( 'type' ) ).toEqual( 'error' );
			} );
		} );
	} );
} );
