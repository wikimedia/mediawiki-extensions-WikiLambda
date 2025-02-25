/*!
 * WikiLambda unit test suite for the wikidataMixin mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const wikidataMixin = require( '../../../resources/ext.wikilambda.app/mixins/wikidataMixin.js' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );

describe( 'wikidataMixin', () => {
	let wrapper, store;

	beforeEach( () => {
		store = useMainStore();

		// Mocking a Vue component to test the mixin
		const TestComponent = {
			template: '<div></div>',
			mixins: [ wikidataMixin ]
		};
		wrapper = shallowMount( TestComponent, {
			global: {
				provide: {
					store
				}
			}
		} );

		// Mock store methods
		store.getItemId = jest.fn().mockReturnValue( 'Q123' );
		store.getItemLabelData = jest.fn().mockReturnValue( { label: 'Item Label' } );
		store.getItemUrl = jest.fn().mockReturnValue( 'https://www.wikidata.org/wiki/Q123' );
		store.getLexemeId = jest.fn().mockReturnValue( 'L123' );
		store.getLexemeLabelData = jest.fn().mockReturnValue( { label: 'Lexeme Label' } );
		store.getLexemeUrl = jest.fn().mockReturnValue( 'https://www.wikidata.org/wiki/Lexeme:L123' );
		store.getLexemeFormId = jest.fn().mockReturnValue( 'L123-F1' );
		store.getLexemeFormLabelData = jest.fn().mockReturnValue( { label: 'Lexeme Form Label' } );
		store.getLexemeFormUrl = jest.fn().mockReturnValue( 'https://www.wikidata.org/wiki/Lexeme:L123-F1' );
		store.getPropertyId = jest.fn().mockReturnValue( 'P123' );
		store.getPropertyLabelData = jest.fn().mockReturnValue( { label: 'Property Label' } );
		store.getPropertyUrl = jest.fn().mockReturnValue( 'https://www.wikidata.org/wiki/Property:P123' );
		store.fetchItems = jest.fn();
		store.fetchLexemes = jest.fn();
		store.fetchProperties = jest.fn();
	} );

	it( 'returns item object with correct data', () => {
		const itemObject = wrapper.vm.getItemObject( 'rowId' );
		expect( itemObject.labelData ).toEqual( { label: 'Item Label' } );
		expect( itemObject.url ).toBe( 'https://www.wikidata.org/wiki/Q123' );
		itemObject.fetch();
		expect( store.fetchItems ).toHaveBeenCalledWith( { ids: [ 'Q123' ] } );
	} );

	it( 'returns lexeme object with correct data', () => {
		const lexemeObject = wrapper.vm.getLexemeObject( 'rowId' );
		expect( lexemeObject.labelData ).toEqual( { label: 'Lexeme Label' } );
		expect( lexemeObject.url ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L123' );
		lexemeObject.fetch();
		expect( store.fetchLexemes ).toHaveBeenCalledWith( { ids: [ 'L123' ] } );
	} );

	it( 'returns lexeme form object with correct data', () => {
		const lexemeFormObject = wrapper.vm.getLexemeFormObject( 'rowId' );
		expect( lexemeFormObject.labelData ).toEqual( { label: 'Lexeme Form Label' } );
		expect( lexemeFormObject.url ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L123-F1' );
		lexemeFormObject.fetch();
		expect( store.fetchLexemes ).toHaveBeenCalledWith( { ids: [ 'L123' ] } );
	} );

	it( 'returns property object with correct data', () => {
		const propertyObject = wrapper.vm.getPropertyObject( 'rowId' );
		expect( propertyObject.labelData ).toEqual( { label: 'Property Label' } );
		expect( propertyObject.url ).toBe( 'https://www.wikidata.org/wiki/Property:P123' );
		propertyObject.fetch();
		expect( store.fetchProperties ).toHaveBeenCalledWith( { ids: [ 'P123' ] } );
	} );

	it( 'returns correct mapping for item', () => {
		const mapping = wrapper.vm.getWikidataMapping( Constants.Z_WIKIDATA_ITEM, 'rowId' );
		expect( mapping.labelData ).toEqual( { label: 'Item Label' } );
	} );

	it( 'returns correct mapping for lexeme', () => {
		const mapping = wrapper.vm.getWikidataMapping( Constants.Z_WIKIDATA_LEXEME, 'rowId' );
		expect( mapping.labelData ).toEqual( { label: 'Lexeme Label' } );
	} );

	it( 'returns correct mapping for lexeme form', () => {
		const mapping = wrapper.vm.getWikidataMapping( Constants.Z_WIKIDATA_LEXEME_FORM, 'rowId' );
		expect( mapping.labelData ).toEqual( { label: 'Lexeme Form Label' } );
	} );

	it( 'returns correct mapping for property', () => {
		const mapping = wrapper.vm.getWikidataMapping( Constants.Z_WIKIDATA_PROPERTY, 'rowId' );
		expect( mapping.labelData ).toEqual( { label: 'Property Label' } );
	} );

	it( 'returns undefined for unknown value', () => {
		const mapping = wrapper.vm.getWikidataMapping( 'unknown', 'rowId' );
		expect( mapping ).toBeUndefined();
	} );
} );
