/*!
 * WikiLambda unit test suite for the default Wikidata Statement component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const WikidataStatement = require( '../../../../../resources/ext.wikilambda.app/components/types/wikidata/Statement.vue' );

// General configuration: wikidata statement
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: Constants.Z_WIKIDATA_STATEMENT,
	[ Constants.Z_WIKIDATA_STATEMENT_SUBJECT ]: {
		Z1K1: Constants.Z_WIKIDATA_REFERENCE_ITEM,
		Z6091K1: { Z1K1: 'Z6', Z6K1: 'Q55' }
	},
	[ Constants.Z_WIKIDATA_STATEMENT_PREDICATE ]: {
		Z1K1: Constants.Z_WIKIDATA_REFERENCE_PROPERTY,
		Z6092K1: { Z1K1: 'Z6', Z6K1: 'P3068' }
	},
	[ Constants.Z_WIKIDATA_STATEMENT_VALUE ]: 'NL'
};

describe( 'WikidataStatement', () => {
	/**
	 * Helper function to render WikidataStatement component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderWikidataStatement( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false,
			type: Constants.Z_WIKIDATA_STATEMENT,
			expanded: false
		};
		return shallowMount( WikidataStatement, { props: { ...defaultProps, ...props }, ...options } );
	}

	describe( 'in view mode', () => {
		it( 'renders wikidata statement without errors', () => {
			const wrapper = renderWikidataStatement();

			expect( wrapper.find( '.ext-wikilambda-app-wikidata-statement' ).exists() ).toBe( true );
		} );

		it( 'renders subject, predicate, and value components with separators when all are present', () => {
			const wrapper = renderWikidataStatement();

			const zObjectToStringComponents = wrapper.findAllComponents( { name: 'wl-z-object-to-string' } );
			const separators = wrapper.findAll( '.ext-wikilambda-app-wikidata-statement__separator' );
			expect( zObjectToStringComponents.length ).toBe( 3 );
			expect( separators.length ).toBe( 2 );
		} );

		it( 'renders only present fields when some are missing', () => {
			const wrapper = renderWikidataStatement( {
				objectValue: {
					Z1K1: Constants.Z_WIKIDATA_STATEMENT,
					[ Constants.Z_WIKIDATA_STATEMENT_SUBJECT ]: objectValue[ Constants.Z_WIKIDATA_STATEMENT_SUBJECT ]
				}
			} );

			const zObjectToStringComponents = wrapper.findAllComponents( { name: 'wl-z-object-to-string' } );
			expect( zObjectToStringComponents.length ).toBe( 1 );
		} );
	} );
} );
