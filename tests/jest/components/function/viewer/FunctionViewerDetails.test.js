/*!
 * WikiLambda unit test suite for the FunctionViewerDetails component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../../helpers/getterHelpers.js' ).createLabelDataMock;
const ApiError = require( '../../../../../resources/ext.wikilambda.app/store/classes/ApiError.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionViewerDetails = require( '../../../../../resources/ext.wikilambda.app/components/function/viewer/FunctionViewerDetails.vue' );

const mockLanguages = {
	Z444: 'javascript',
	Z555: 'Z600'
};

const mockTypes = {
	Z333: 'Z14K2',
	Z444: 'Z14K3',
	Z555: 'Z14K3',
	Z600: 'Z61'
};

const mockLabels = {
	Z111: 'Z111 name',
	Z222: 'Z222 name',
	Z333: 'Z333 name',
	Z444: 'Z444 name',
	Z555: 'Z555 name',
	Z600: 'JavaScript'
};

describe( 'FunctionViewerDetails', () => {
	let store, actionsThrowError;

	beforeEach( () => {
		actionsThrowError = false;

		const createMockAction = () => jest.fn( () => actionsThrowError ?
			Promise.reject( new ApiError( 'code', { error: { message: 'error!' } } ) ) :
			Promise.resolve()
		);

		const allTests = [ 'Z111', 'Z222' ];
		const allImplementations = [ 'Z333', 'Z444', 'Z555' ];

		store = useMainStore();
		store.getConnectedTests = createGettersWithFunctionsMock( [ 'Z222' ] );
		store.getConnectedImplementations = createGettersWithFunctionsMock( [ 'Z444' ] );
		store.getUserLangCode = 'Z1002';
		store.getCurrentZObjectId = 'Z666';
		store.getLanguageOfImplementation = jest.fn( ( zid ) => mockLanguages[ zid ] );
		store.getTypeOfImplementation = jest.fn( ( zid ) => mockTypes[ zid ] );
		store.getLabelData = createLabelDataMock( mockLabels );
		store.getZTesterPercentage = createGettersWithFunctionsMock( {
			passing: 1,
			total: 1,
			percentage: 100
		} );
		store.connectImplementations.mockImplementation( createMockAction() );
		store.connectTests.mockImplementation( createMockAction() );
		store.disconnectImplementations.mockImplementation( createMockAction() );
		store.disconnectTests.mockImplementation( createMockAction() );
		store.fetchImplementations.mockResolvedValue( allImplementations );
		store.fetchTests.mockResolvedValue( allTests );

	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionViewerDetails );
		expect( wrapper.find( '.ext-wikilambda-app-function-viewer-details' ).exists() ).toBe( true );
	} );

	it( 'loads child components', () => {
		const wrapper = shallowMount( FunctionViewerDetails );
		expect( wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } ) ).toHaveLength( 2 );
	} );

	it( 'passes implementations to table correctly', async () => {
		const wrapper = shallowMount( FunctionViewerDetails );
		await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

		const implTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ];
		const implTableItems = implTable.props( 'data' );

		expect( implTableItems ).toHaveLength( 3 );
		expect( implTableItems[ 0 ].checkbox.props.modelValue ).toBe( false );
		expect( implTableItems[ 0 ].language.title ).toEqual( 'Composition' );
		expect( implTableItems[ 0 ].name.title ).toEqual( 'Z333 name' );
		expect( implTableItems[ 0 ].status.title ).toEqual( 'Disconnected' );
		expect( implTableItems[ 1 ].checkbox.props.modelValue ).toBe( false );
		expect( implTableItems[ 1 ].language.title ).toEqual( 'javascript' );
		expect( implTableItems[ 1 ].name.title ).toEqual( 'Z444 name' );
		expect( implTableItems[ 1 ].status.title ).toEqual( 'Connected' );
		expect( implTableItems[ 2 ].checkbox.props.modelValue ).toBe( false );
		expect( implTableItems[ 2 ].language.title ).toEqual( 'JavaScript' );
		expect( implTableItems[ 2 ].name.title ).toEqual( 'Z555 name' );
		expect( implTableItems[ 2 ].status.title ).toEqual( 'Disconnected' );
	} );

	it( 'passes testers to table correctly', async () => {
		const wrapper = shallowMount( FunctionViewerDetails );
		await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

		const testTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ];
		const testTableItems = testTable.props( 'data' );

		expect( testTableItems ).toHaveLength( 2 );
		expect( testTableItems[ 0 ].checkbox.props.modelValue ).toBe( false );
		expect( testTableItems[ 0 ].name.title ).toEqual( 'Z111 name' );
		expect( testTableItems[ 0 ].status.title ).toEqual( 'Disconnected' );
		expect( testTableItems[ 1 ].checkbox.props.modelValue ).toBe( false );
		expect( testTableItems[ 1 ].name.title ).toEqual( 'Z222 name' );
		expect( testTableItems[ 1 ].status.title ).toEqual( 'Connected' );
	} );

	describe( 'implementations without labels display the ZID', () => {
		beforeEach( () => {
			store.getLabelData = createLabelDataMock( { Z333: 'Z333 name' } );
		} );

		it( 'in the implementations table', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

			const implTableItems = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ].props( 'data' );

			expect( implTableItems[ 0 ].name.title ).toEqual( 'Z333 name' );
			expect( implTableItems[ 1 ].name.title ).toEqual( 'Z444' );
		} );

		it( 'in the tests table header', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTableHeaderItems = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ].props( 'columns' );

			expect( testTableHeaderItems.find( ( item ) => item.id === 'Z333' ).title ).toEqual( 'Z333 name' );
			expect( testTableHeaderItems.find( ( item ) => item.id === 'Z444' ).title ).toEqual( 'Z444' );
		} );
	} );

	describe( 'tests without labels display the ZID', () => {
		beforeEach( () => {
			store.getLabelData = createLabelDataMock( { Z222: 'Z222 name' } );
		} );

		it( 'in the tests table rows', async () => {
			const wrapper = shallowMount( FunctionViewerDetails );
			await waitFor( () => expect( wrapper.vm.testsFetched ).toBeTruthy() );

			const testTableItems = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 1 ].props( 'data' );

			expect( testTableItems[ 0 ].name.title ).toEqual( 'Z111' );
			expect( testTableItems[ 1 ].name.title ).toEqual( 'Z222 name' );
		} );
	} );

	describe( 'connect & disconnect buttons', () => {
		it( 'connect checked implementation, without error toast', async () => {
			const wrapper = shallowMount( FunctionViewerDetails, { props: { rowId: 123 } } );
			await waitFor( () => expect( wrapper.vm.implementationsFetched ).toBeTruthy() );

			const implTable = wrapper.findAllComponents( { name: 'wl-function-viewer-details-table' } )[ 0 ];
			implTable.props( 'columns' ).find( ( item ) => item.id === 'checkbox' ).props[ 'onUpdate:modelValue' ]( true );

			implTable.vm.$emit( 'connect' );

			await waitFor( () => {
				expect( store.connectImplementations ).toHaveBeenCalledWith( {
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
			implTable.props( 'columns' ).find( ( item ) => item.id === 'checkbox' ).props[ 'onUpdate:modelValue' ]( true );

			implTable.vm.$emit( 'disconnect' );

			await waitFor( () => {
				expect( store.disconnectImplementations ).toHaveBeenCalledWith( {
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
			testTable.props( 'columns' ).find( ( item ) => item.id === 'checkbox' ).props[ 'onUpdate:modelValue' ]( true );

			testTable.vm.$emit( 'connect' );

			await waitFor( () => {
				expect( store.connectTests ).toHaveBeenCalledWith( {
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
			testTable.props( 'columns' ).find( ( item ) => item.id === 'checkbox' ).props[ 'onUpdate:modelValue' ]( true );

			testTable.vm.$emit( 'disconnect' );

			await waitFor( () => {
				expect( store.disconnectTests ).toHaveBeenCalledWith( {
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
			testTable.props( 'columns' ).find( ( item ) => item.id === 'checkbox' ).props[ 'onUpdate:modelValue' ]( true );

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
