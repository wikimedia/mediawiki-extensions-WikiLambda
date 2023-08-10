/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	ZObjectToString = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZObjectToString.vue' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'ZObjectToString', () => {
	var getters;
	beforeEach( () => {
		getters = {
			getUserLangCode: createGetterMock( 'en' ),
			getLabel: createGettersWithFunctionsMock( '' ),
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
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-text]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' ).exists() ).toBe( false );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = shallowMount( ZObjectToString );
				const stringElement = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-text]' );
				expect( stringElement.text() ).toBe( 'the final stringdown' );
			} );
		} );

		describe( 'for a terminal reference', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z9' );
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z42' );
				getters.getLabel = createGettersWithFunctionsMock( 'False' );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to referred zobject', () => {
				const wrapper = shallowMount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' );
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
				getters.getLabel = createGettersWithFunctionsMock( 'And' );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = shallowMount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z10001' );
				expect( referenceLink.text() ).toBe( 'And' );
			} );
		} );

		describe( 'for a function call with arguments', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = () => ( id ) => {
					return ( id === 0 ) ? 'Z7' : 'Z6';
				};
				getters.getLabel = createGettersWithFunctionsMock( 'And' );
				getters.getZStringTerminalValue = () => ( id ) => {
					return ( id === 1 ) ? 'first arg' : 'second arg';
				};
				getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( 'Z10001' );
				getters.getZFunctionCallArguments = createGettersWithFunctionsMock( [
					{ id: 1, key: 'Z10001K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z10001K2', parent: 0, value: Constants.ROW_VALUE_OBJECT }
				] );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.findAll( 'div[role=ext-wikilambda-zobject-to-string-text]' ) ).toHaveLength( 2 );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = shallowMount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z10001' );
				expect( referenceLink.text() ).toBe( 'And' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.text() ).toBe( 'And  ( first arg, second arg)' );
			} );

			it( 'renders each argument with another ZObjectToString component', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.findAllComponents( ZObjectToString ) ).toHaveLength( 2 );
			} );
		} );

		describe( 'for an argument reference', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z6' );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z18K1' );
				getters.getZStringTerminalValue = createGettersWithFunctionsMock( 'Z999K1' );
				getters.getLabel = createGettersWithFunctionsMock( 'argument label' );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-text]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' ).exists() ).toBe( false );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = shallowMount( ZObjectToString );
				const stringElement = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-text]' );
				expect( stringElement.text() ).toBe( 'argument label' );
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
				getters.getLabel = () => ( zid ) => {
					const labels = { Z11: 'Monolingual text', Z1002: 'English' };
					return labels[ zid ];
				};
				getters.getZStringTerminalValue = createGettersWithFunctionsMock( 'string value' );
				getters.getChildrenByParentRowId = createGettersWithFunctionsMock( [
					{ id: 1, key: 'Z11K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z11K2', parent: 0, value: Constants.ROW_VALUE_OBJECT }
				] );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.findAll( 'div[role=ext-wikilambda-zobject-to-string-link]' ) ).toHaveLength( 2 );
				expect( wrapper.findAll( 'div[role=ext-wikilambda-zobject-to-string-text]' ) ).toHaveLength( 1 );
			} );

			it( 'renders the link to type', () => {
				const wrapper = shallowMount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z11' );
				expect( referenceLink.text() ).toBe( 'Monolingual text' );
			} );

			it( 'renders the link to referenced argument', () => {
				const wrapper = shallowMount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' );
				const argWrapper = linkWrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' );
				const referenceLink = argWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( '/view/en/Z1002' );
				expect( referenceLink.text() ).toBe( 'English' );
			} );

			it( 'renders comma separated arguments', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.text() ).toBe( 'Monolingual text  ( English, string value)' );
			} );

			it( 'renders each argument with another ZObjectToString component', () => {
				const wrapper = shallowMount( ZObjectToString );
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
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-text]' ).exists() ).toBe( false );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' ).exists() ).toBe( true );
			} );

			it( 'renders the string terminal value', () => {
				const wrapper = shallowMount( ZObjectToString );
				const stringElement = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' );
				expect( stringElement.text() ).toBe( 'Enter String' );
			} );

			it( 'triggers an expand event when clicking the link', () => {
				const wrapper = shallowMount( ZObjectToString );
				const link = wrapper.find( '.ext-wikilambda-zobject-to-string-blank' );
				link.trigger( 'click' );
				waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );

		describe( 'for a terminal empty reference language', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z9' );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z11K1' );
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z60' );
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );
				getters.getLabel = createGettersWithFunctionsMock( 'Language' );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to referred zobject', () => {
				const wrapper = shallowMount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				// TODO: Consider testing that the label is 'Select Language'?
				expect( referenceLink.text() ).toEqual( 'Select $1' );
			} );

			it( 'triggers an expand event when clicking the link', () => {
				const wrapper = shallowMount( ZObjectToString );
				const link = wrapper.find( '.ext-wikilambda-zobject-to-string-blank' );
				link.trigger( 'click' );
				waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );

		describe( 'for a function call with an empty function', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z7' );
				getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( undefined );
				getters.getZFunctionCallArguments = createGettersWithFunctionsMock( [] );
				getters.getLabel = createGettersWithFunctionsMock( 'Function' );
				global.store.hotUpdate( { getters: getters } );
			} );

			it( 'renders without errors', () => {
				const wrapper = shallowMount( ZObjectToString );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' ).exists() ).toBe( true );
				expect( wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-text]' ).exists() ).toBe( false );
			} );

			it( 'renders the link to called function', () => {
				const wrapper = shallowMount( ZObjectToString );
				const linkWrapper = wrapper.find( 'div[role=ext-wikilambda-zobject-to-string-link]' );
				const referenceLink = linkWrapper.get( 'a' );
				expect( referenceLink.attributes().href ).toBe( undefined );
				// TODO: Consider testing that the label is 'Select Function'?
				expect( referenceLink.text() ).toEqual( 'Select $1' );
			} );

			it( 'triggers an expand event when clicking the link', () => {
				const wrapper = shallowMount( ZObjectToString );
				const link = wrapper.find( '.ext-wikilambda-zobject-to-string-blank' );
				link.trigger( 'click' );
				waitFor( () => expect( wrapper.emitted( 'expand' ) ).toBeTruthy() );
			} );
		} );
	} );
} );
