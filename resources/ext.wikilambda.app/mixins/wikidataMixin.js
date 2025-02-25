/**
 * WikiLambda Vue editor: Wikidata mixin
 * Mixin with functions to handle wikidata entities
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mapState, mapActions } = require( 'pinia' );
const useMainStore = require( '../store/index.js' );
const Constants = require( '../Constants.js' );

module.exports = exports = {
	computed: Object.assign(
		mapState( useMainStore, [
			'getItemId',
			'getItemLabelData',
			'getItemUrl',
			'getLexemeId',
			'getLexemeLabelData',
			'getLexemeUrl',
			'getLexemeFormId',
			'getLexemeFormLabelData',
			'getLexemeFormUrl',
			'getPropertyId',
			'getPropertyLabelData',
			'getPropertyUrl'
		] ),
		{
			getItemObject: function () {
				return ( rowId ) => {
					const itemId = this.getItemId( rowId );
					return {
						labelData: this.getItemLabelData( itemId ),
						url: this.getItemUrl( itemId ),
						fetch: () => this.fetchItems( { ids: [ itemId ] } )
					};
				};
			},

			getLexemeObject: function () {
				return ( rowId ) => {
					const lexemeId = this.getLexemeId( rowId );
					return {
						labelData: this.getLexemeLabelData( lexemeId ),
						url: this.getLexemeUrl( lexemeId ),
						fetch: () => this.fetchLexemes( { ids: [ lexemeId ] } )
					};
				};
			},

			getLexemeFormObject: function () {
				return ( rowId ) => {
					const lexemeFormId = this.getLexemeFormId( rowId );
					return {
						labelData: this.getLexemeFormLabelData( lexemeFormId ),
						url: this.getLexemeFormUrl( lexemeFormId ),
						fetch: () => this.fetchLexemes( { ids: [ lexemeFormId.split( '-' )[ 0 ] ] } )
					};
				};
			},

			getPropertyObject: function () {
				return ( rowId ) => {
					const propertyId = this.getPropertyId( rowId );
					return {
						labelData: this.getPropertyLabelData( propertyId ),
						url: this.getPropertyUrl( propertyId ),
						fetch: () => this.fetchProperties( { ids: [ propertyId ] } )
					};
				};
			},

			getWikidataMapping: function () {
				return ( value, rowId ) => {
					switch ( value ) {
						case Constants.Z_WIKIDATA_ITEM:
						case Constants.Z_WIKIDATA_REFERENCE_ITEM:
						case Constants.Z_WIKIDATA_FETCH_ITEM:
							return this.getItemObject( rowId );
						case Constants.Z_WIKIDATA_LEXEME:
						case Constants.Z_WIKIDATA_FETCH_LEXEME:
						case Constants.Z_WIKIDATA_REFERENCE_LEXEME:
							return this.getLexemeObject( rowId );
						case Constants.Z_WIKIDATA_LEXEME_FORM:
						case Constants.Z_WIKIDATA_FETCH_LEXEME_FORM:
						case Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM:
							return this.getLexemeFormObject( rowId );
						case Constants.Z_WIKIDATA_PROPERTY:
						case Constants.Z_WIKIDATA_FETCH_PROPERTY:
						case Constants.Z_WIKIDATA_REFERENCE_PROPERTY:
							return this.getPropertyObject( rowId );
						default:
							return undefined;
					}
				};
			}
		}
	),
	methods: Object.assign( {}, mapActions( useMainStore, [
		'fetchItems',
		'fetchLexemes',
		'fetchProperties'
	] ) )
};
