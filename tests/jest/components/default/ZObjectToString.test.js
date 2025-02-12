/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { mount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock;
const createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock;
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZObjectToString = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZObjectToString.vue' );

describe( 'ZObjectToString', () => {
	let store;
	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getLabelData = createLabelDataMock( {
			Z42: 'False',
			Z60: 'Language',
			Z7K1: 'function',
			Z11: 'Monolingual text',
			Z1002: 'English',
			Z10001: 'And',
			Z999K1: 'argument label'
		} );
		store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );
		store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z6' );
		store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z6K1' );
		store.getZStringTerminalValue = createGettersWithFunctionsMock( 'the final stringdown' );
		store.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z6' );
		store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10001' );
		store.getZFunctionCallArguments = createGettersWithFunctionsMock( [] );
		store.getChildrenByParentRowId = createGettersWithFunctionsMock( [] );
	} );

	describe( 'in view and edit mode', () => {

		describe( 'for a terminal string', () => {
			beforeEach( () => {
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z6' );
				store.getZStringTerminalValue = createGettersWithFunctionsMock( 'the final stringdown' );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( false );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = mount( ZObjectToString );
				const stringElement = wrapper.find( 'div[data-testid=object-to-string-text]' );
				expect( stringElement.text() ).toBe( '"the final stringdown"' );
			} );
		} );

		describe( 'for a terminal reference', () => {
			beforeEach( () => {
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z9' );
				store.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z42' );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to referred zobject', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z42' );
				expect( referenceLink.text() ).toBe( 'False' );
			} );
		} );

		describe( 'for a function call with zero arguments', () => {
			beforeEach( () => {
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z7' );
				store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10001' );
				store.getZFunctionCallArguments = createGettersWithFunctionsMock( [] );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z10001' );
				expect( referenceLink.text() ).toBe( 'And' );
			} );
		} );

		describe( 'for a function call with arguments', () => {
			beforeEach( () => {
				store.getZObjectTypeByRowId = jest.fn( ( id ) => ( id === 0 ) ? 'Z7' : 'Z6' );
				store.getZStringTerminalValue = jest.fn( ( id ) => ( id === 1 ) ? 'first arg' : 'second arg' );
				store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10001' );
				store.getZFunctionCallArguments = createGettersWithFunctionsMock( [
					{ id: 1, key: 'Z10001K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z10001K2', parent: 0, value: Constants.ROW_VALUE_OBJECT }
				] );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.findAll( 'div[data-testid=object-to-string-text]' ) ).toHaveLength( 2 );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z10001' );
				expect( referenceLink.text() ).toBe( 'And' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = mount( ZObjectToString );

				const childElements = wrapper
					.findAll( '.ext-wikilambda-app-object-to-string' );
				const dividerElements = wrapper
					.findAll( '.ext-wikilambda-app-object-to-string__divider' );

				expect( childElements[ 1 ].text() ).toBe( 'And' );
				expect( dividerElements[ 0 ].text() ).toBe( '(' );
				expect( childElements[ 2 ].text() ).toBe( '"first arg"' );
				expect( dividerElements[ 1 ].text() ).toBe( ',' );
				expect( childElements[ 3 ].text() ).toBe( '"second arg"' );
				expect( dividerElements[ 2 ].text() ).toBe( ')' );
			} );

			it( 'renders each argument with another ZObjectToString component', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.findAllComponents( ZObjectToString ) ).toHaveLength( 2 );
			} );
		} );

		describe( 'for an argument reference', () => {
			beforeEach( () => {
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z6' );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z18K1' );
				store.getZStringTerminalValue = createGettersWithFunctionsMock( 'Z999K1' );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( false );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = mount( ZObjectToString );
				const stringElement = wrapper.find( 'div[data-testid=object-to-string-text]' );
				expect( stringElement.text() ).toBe( '"argument label"' );
			} );
		} );

		describe( 'for any other type', () => {
			beforeEach( () => {
				store.getZObjectTypeByRowId = jest.fn( ( rowId ) => {
					const types = [ 'Z11', 'Z9', 'Z6' ];
					return types[ rowId ];
				} );
				store.getZReferenceTerminalValue = jest.fn( ( rowId ) => {
					const refs = [ 'Z11', 'Z1002' ];
					return refs[ rowId ];
				} );
				store.getZStringTerminalValue = createGettersWithFunctionsMock( 'string value' );
				store.getChildrenByParentRowId = createGettersWithFunctionsMock( [
					{ id: 1, key: 'Z11K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z11K2', parent: 0, value: Constants.ROW_VALUE_OBJECT }
				] );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.findAll( 'div[data-testid=object-to-string-link]' ) ).toHaveLength( 2 );
				expect( wrapper.findAll( 'div[data-testid=object-to-string-text]' ) ).toHaveLength( 1 );
			} );

			it( 'renders the link to type', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z11' );
				expect( referenceLink.text() ).toBe( 'Monolingual text' );
			} );

			it( 'renders the link to referenced argument', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const argWrapper = linkWrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = argWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z1002' );
				expect( referenceLink.text() ).toBe( 'English' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = mount( ZObjectToString );

				const childElements = wrapper
					.findAll( '.ext-wikilambda-app-object-to-string' );
				const dividerElements = wrapper
					.findAll( '.ext-wikilambda-app-object-to-string__divider' );

				expect( childElements[ 1 ].text() ).toBe( 'Monolingual text' );
				expect( dividerElements[ 0 ].text() ).toBe( '(' );
				expect( childElements[ 2 ].text() ).toBe( 'English' );
				expect( dividerElements[ 1 ].text() ).toBe( ',' );
				expect( childElements[ 4 ].text() ).toBe( '"string value"' );
				expect( dividerElements[ 2 ].text() ).toBe( ')' );
			} );

			it( 'renders each argument with another ZObjectToString component', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.findAllComponents( ZObjectToString ) ).toHaveLength( 2 );
			} );
		} );
	} );

	describe( 'with empty values', () => {

		describe( 'for a terminal blank string', () => {
			beforeEach( () => {
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z6' );
				store.getZStringTerminalValue = createGettersWithFunctionsMock( undefined );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = mount( ZObjectToString );
				const stringElement = wrapper.find( 'div[data-testid=object-to-string-link]' );
				expect( stringElement.text() ).toBe( 'Enter String' );
			} );

			it( 'triggers an expand event when clicking the link', async () => {
				const wrapper = mount( ZObjectToString );
				const link = wrapper.find( '.ext-wikilambda-app-object-to-string__blank' );
				link.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );

		describe( 'for a terminal empty reference language', () => {
			beforeEach( () => {
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z9' );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z11K1' );
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z60' );
				store.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to referred zobject', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				// TODO: Consider testing that the label is 'Select Language'?
				expect( referenceLink.text() ).toEqual( 'Select $1' );
			} );

			it( 'triggers an expand event when clicking the link', async () => {
				const wrapper = mount( ZObjectToString );
				const link = wrapper.find( '.ext-wikilambda-app-object-to-string__blank' );
				link.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );

		describe( 'for a function call with an empty function', () => {
			beforeEach( () => {
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z7' );
				store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( undefined );
				store.getZFunctionCallArguments = createGettersWithFunctionsMock( [] );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=object-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=object-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=object-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				// TODO: Consider testing that the label is 'Select Function'?
				expect( referenceLink.text() ).toEqual( 'Select $1' );
			} );

			it( 'triggers an expand event when clicking the link', async () => {
				const wrapper = mount( ZObjectToString );
				const link = wrapper.find( '.ext-wikilambda-app-object-to-string__blank' );
				link.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );
	} );
} );
