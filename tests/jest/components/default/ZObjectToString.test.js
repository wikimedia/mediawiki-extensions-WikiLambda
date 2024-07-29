/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	ZObjectToString = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZObjectToString.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

describe( 'ZObjectToString', () => {
	let getters;
	beforeEach( () => {
		getters = {
			getUserLangCode: createGetterMock( 'en' ),
			getLabelData: createLabelDataMock( {
				Z42: 'False',
				Z60: 'Language',
				Z7K1: 'function',
				Z11: 'Monolingual text',
				Z1002: 'English',
				Z10001: 'And',
				Z999K1: 'argument label'
			} ),
			getExpectedTypeOfKey: createGettersWithFunctionsMock( 'Z1' ),
			getZObjectTypeByRowId: createGettersWithFunctionsMock( 'Z6' ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( 'Z6K1' ),
			getZStringTerminalValue: createGettersWithFunctionsMock( 'the final stringdown' ),
			getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z6' ),
			getZFunctionCallFunctionId: createGettersWithFunctionsMock( 'Z10001' ),
			getZFunctionCallArguments: createGettersWithFunctionsMock( [] ),
			getChildrenByParentRowId: createGettersWithFunctionsMock( [] )
		};
		global.store.hotUpdate( { getters: getters } );
	} );

	describe( 'in view and edit mode', () => {

		describe( 'for a terminal string', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z6' );
				getters.getZStringTerminalValue = createGettersWithFunctionsMock( 'the final stringdown' );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' ).exists() ).toBe( false );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = mount( ZObjectToString );
				const stringElement = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' );
				expect( stringElement.text() ).toBe( '"the final stringdown"' );
			} );
		} );

		describe( 'for a terminal reference', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z9' );
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z42' );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to referred zobject', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z42' );
				expect( referenceLink.text() ).toBe( 'False' );
			} );
		} );

		describe( 'for a function call with zero arguments', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z7' );
				getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10001' );
				getters.getZFunctionCallArguments = createGettersWithFunctionsMock( [] );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z10001' );
				expect( referenceLink.text() ).toBe( 'And' );
			} );
		} );

		describe( 'for a function call with arguments', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = () => ( id ) => ( id === 0 ) ? 'Z7' : 'Z6';
				getters.getZStringTerminalValue = () => ( id ) => ( id === 1 ) ? 'first arg' : 'second arg';
				getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10001' );
				getters.getZFunctionCallArguments = createGettersWithFunctionsMock( [
					{ id: 1, key: 'Z10001K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z10001K2', parent: 0, value: Constants.ROW_VALUE_OBJECT }
				] );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.findAll( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' ) ).toHaveLength( 2 );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z10001' );
				expect( referenceLink.text() ).toBe( 'And' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = mount( ZObjectToString );

				const childElements = wrapper
					.find( '.ext-wikilambda-app-zobject-to-string' )
					.findAll( '.ext-wikilambda-app-zobject-to-string' );
				const dividerElements = childElements[ 1 ]
					.findAll( '.ext-wikilambda-app-zobject-to-string__divider' );

				expect( childElements[ 0 ].text() ).toBe( 'And' );
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
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z6' );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z18K1' );
				getters.getZStringTerminalValue = createGettersWithFunctionsMock( 'Z999K1' );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' ).exists() ).toBe( false );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = mount( ZObjectToString );
				const stringElement = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' );
				expect( stringElement.text() ).toBe( '"argument label"' );
			} );
		} );

		describe( 'for any other type', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = () => ( rowId ) => {
					const types = [ 'Z11', 'Z9', 'Z6' ];
					return types[ rowId ];
				};
				getters.getZReferenceTerminalValue = () => ( rowId ) => {
					const refs = [ 'Z11', 'Z1002' ];
					return refs[ rowId ];
				};
				getters.getZStringTerminalValue = createGettersWithFunctionsMock( 'string value' );
				getters.getChildrenByParentRowId = createGettersWithFunctionsMock( [
					{ id: 1, key: 'Z11K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z11K2', parent: 0, value: Constants.ROW_VALUE_OBJECT }
				] );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.findAll( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' ) ).toHaveLength( 2 );
				expect( wrapper.findAll( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' ) ).toHaveLength( 1 );
			} );

			it( 'renders the link to type', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z11' );
				expect( referenceLink.text() ).toBe( 'Monolingual text' );
			} );

			it( 'renders the link to referenced argument', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' );
				const argWrapper = linkWrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' );
				const referenceLink = argWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z1002' );
				expect( referenceLink.text() ).toBe( 'English' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = mount( ZObjectToString );

				const childElements = wrapper
					.find( '.ext-wikilambda-app-zobject-to-string' )
					.findAll( '.ext-wikilambda-app-zobject-to-string' );
				const dividerElements = childElements[ 1 ]
					.findAll( '.ext-wikilambda-app-zobject-to-string__divider' );

				expect( childElements[ 0 ].text() ).toBe( 'Monolingual text' );
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
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z6' );
				getters.getZStringTerminalValue = createGettersWithFunctionsMock( undefined );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' ).exists() ).toBe( false );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' ).exists() ).toBe( true );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = mount( ZObjectToString );
				const stringElement = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' );
				expect( stringElement.text() ).toBe( 'Enter String' );
			} );

			it( 'triggers an expand event when clicking the link', async () => {
				const wrapper = mount( ZObjectToString );
				const link = wrapper.find( '.ext-wikilambda-app-zobject-to-string__blank' );
				link.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );

		describe( 'for a terminal empty reference language', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z9' );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z11K1' );
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z60' );
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to referred zobject', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				// TODO: Consider testing that the label is 'Select Language'?
				expect( referenceLink.text() ).toEqual( 'Select $1' );
			} );

			it( 'triggers an expand event when clicking the link', async () => {
				const wrapper = mount( ZObjectToString );
				const link = wrapper.find( '.ext-wikilambda-app-zobject-to-string__blank' );
				link.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );

		describe( 'for a function call with an empty function', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z7' );
				getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( undefined );
				getters.getZFunctionCallArguments = createGettersWithFunctionsMock( [] );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = mount( ZObjectToString );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = mount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[data-testid=ext-wikilambda-app-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				// TODO: Consider testing that the label is 'Select Function'?
				expect( referenceLink.text() ).toEqual( 'Select $1' );
			} );

			it( 'triggers an expand event when clicking the link', async () => {
				const wrapper = mount( ZObjectToString );
				const link = wrapper.find( '.ext-wikilambda-app-zobject-to-string__blank' );
				link.trigger( 'click' );
				await waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );
	} );
} );
