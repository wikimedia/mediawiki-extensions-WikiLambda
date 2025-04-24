/*!
 * WikiLambda unit test suite wikidataMock helper.

 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/**
 * Capitalizes the first letter of a string.
 *
 * @param {string} str - The string to capitalize.
 * @return {string} - The capitalized string.
 */
const capitalize = ( str ) => str.charAt( 0 ).toUpperCase() + str.slice( 1 );

/**
 * Generates a fake Wikidata entity title and metadata.
 *
 * @param {Object} payload
 * @param {string} payload.id
 * @param {string} payload.type
 * @param {string} payload.label
 * @param {string} payload.description
 * @param {string} payload.language
 *
 * @return {Object} - The generated Wikidata entity object.
 */
function createWikidataEntitySearchItem( { id, type, label, description, language } ) {
	const entityType = capitalize( type );
	return {
		id,
		title: `${ entityType }:${ id }`,
		pageid: undefined,
		concepturi: `http://www.wikidata.org/entity/${ id }`,
		repository: 'wikidata',
		url: `//www.wikidata.org/wiki/${ entityType }:${ id }`,
		display: {
			label: { value: label, language },
			description: { value: description, language }
		},
		label,
		description,
		match: {
			type: 'label',
			language,
			text: label
		}
	};
}

/**
 * Generates a fake single entity response.
 *
 * @param {Object} payload
 * @param {string} payload.id
 * @param {string} payload.type
 * @param {string} payload.label
 *
 * @return {Object} - The generated Wikidata entity object.
 */
function createWikidataEntitySingleItem( { id, type, label } ) {
	const entityType = capitalize( type );

	const baseEntity = {
		pageid: undefined,
		ns: 0,
		title: `${ entityType }:${ id }`,
		lastrevid: 0,
		modified: undefined,
		type,
		id
	};

	if ( type === 'lexeme' ) {
		return {
			[ id ]: {
				...baseEntity,
				lemmas: {
					en: { language: 'en', value: label }
				},
				lexicalCategory: 'Q00000',
				language: 'Q0000'
			}
		};
	}

	if ( type === 'item' ) {
		return {
			[ id ]: {
				...baseEntity,
				title: id,
				labels: {
					en: { language: 'en', value: label }
				},
				descriptions: {
					en: { language: 'en', value: 'mocked item description' }
				}
			}
		};
	}

	if ( type === 'property' ) {
		return {
			[ id ]: {
				...baseEntity,
				labels: {
					en: { language: 'en', value: label }
				},
				descriptions: {
					en: { language: 'en', value: 'mocked property description' }
				},
				datatype: 'monolingualtext'
			}
		};
	}

	return {};
}

/**
 * Dynamically generates mock search results based on the query.
 *
 * @param {Object} payload - The payload object.
 * @param {string} payload.type - The type of entity to search for.
 * @param {string} payload.query - The search query string.
 * @param {string} payload.language - The language code.
 *
 * @return {Object[]} - Array of generated mock search result objects.
 */
function generateMockSearchResults( { type, query, language } ) {
	const prefixMap = { lexeme: 'L', item: 'Q', property: 'P' };
	const prefix = prefixMap[ type ] || 'Q';

	// Deterministic IDs for test assertions
	const ids = [
		prefix + '111111',
		prefix + '222222',
		prefix + '333333'
	];

	const results = ids.map( ( id, i ) => {
		const label = `${ query } ${ i + 1 }`;
		return createWikidataEntitySearchItem( {
			id,
			type,
			label,
			description: `Mock description for ${ label }`,
			language
		} );
	} );
	return results;
}

/**
 * Main mock fetch function.
 *
 * @param {string} url - The URL to fetch.
 *
 * @return {Promise} - A promise that resolves to the mock response.
 */
const wikidataMock = ( url ) => {
	const urlObj = new URL( url );
	const params = Object.fromEntries( urlObj.searchParams.entries() );

	const { ids, search, type, language = 'en', action } = params;

	if ( action === 'wbgetentities' ) {
		const typeMap = { L: 'lexeme', Q: 'item', P: 'property' };
		const inferredType = typeMap[ ids.charAt( 0 ) ] || 'item';
		return Promise.resolve( {
			json: () => Promise.resolve( {
				entities: createWikidataEntitySingleItem( {
					id: ids,
					type: inferredType,
					label: `Mock label for ${ ids }`
				} ),
				success: 1
			} )
		} );
	}

	if ( action === 'wbsearchentities' ) {
		const results = generateMockSearchResults( { type, query: search, language } );
		return Promise.resolve( {
			json: () => Promise.resolve( {
				searchinfo: { search },
				search: results,
				'search-continue': 10,
				success: 1
			} )
		} );
	}

	return Promise.resolve( {
		json: () => Promise.resolve( {} )
	} );
};

module.exports = wikidataMock;
