/*!
 * WikiLambda unit test suite for the metadataUtils utility.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const metadataUtils = require( '../../../resources/ext.wikilambda.app/utils/metadataUtils.js' );

describe( 'metadataUtils', () => {
	it( 'exports metadataKeys configuration', () => {
		expect( metadataUtils.metadataKeys ).toBeDefined();
		expect( typeof metadataUtils.metadataKeys ).toBe( 'object' );
	} );

	it( 'contains errors configuration', () => {
		const errorsConfig = metadataUtils.metadataKeys.errors;
		expect( errorsConfig ).toBeDefined();
		expect( errorsConfig.title ).toBe( 'wikilambda-functioncall-metadata-errors' );
		expect( errorsConfig.description ).toBe( 'getErrorSummary' );
		expect( errorsConfig.open ).toBe( true );
		expect( Array.isArray( errorsConfig.keys ) ).toBe( true );
		expect( errorsConfig.keys.length ).toBeGreaterThan( 0 );
		// Error message goes after the error type
		expect( errorsConfig.keys[ 1 ] ).toEqual( {
			key: 'errors',
			title: 'wikilambda-functioncall-metadata-errors-message',
			transform: 'getErrorMessage'
		} );
	} );

	it( 'contains implementation configuration', () => {
		const implConfig = metadataUtils.metadataKeys.implementation;
		expect( implConfig ).toBeDefined();
		expect( implConfig.title ).toBe( 'wikilambda-functioncall-metadata-implementation' );
		expect( implConfig.description ).toBe( 'getImplementationSummary' );
		expect( Array.isArray( implConfig.keys ) ).toBe( true );
		expect( implConfig.keys.length ).toBe( 3 );
	} );

	it( 'contains function calls configuration', () => {
		const functionCallsConfig = metadataUtils.metadataKeys.functionCalls;
		expect( functionCallsConfig ).toBeDefined();
		expect( functionCallsConfig.title ).toBe( 'wikilambda-functioncall-metadata-function-calls' );
		expect( functionCallsConfig.description ).toBe( 'getFunctionCallsSummary' );
		expect( functionCallsConfig.keys.map( ( item ) => item.key ) ).toEqual( [
			'functionCallCounts',
			'functionCallPairCounts',
			'functionCallTotal',
			'functionCallDistinctFunctions'
		] );
	} );

	it( 'contains duration configuration with sections', () => {
		const durationConfig = metadataUtils.metadataKeys.duration;
		expect( durationConfig ).toBeDefined();
		expect( durationConfig.title ).toBe( 'wikilambda-functioncall-metadata-duration' );
		expect( durationConfig.description ).toBe( 'getDurationSummary' );
		expect( Array.isArray( durationConfig.sections ) ).toBe( true );
		expect( durationConfig.sections.length ).toBe( 2 );
		expect( durationConfig.sections[ 0 ].title ).toBe( 'wikilambda-functioncall-metadata-orchestration' );
		expect( durationConfig.sections[ 1 ].title ).toBe( 'wikilambda-functioncall-metadata-evaluation' );
	} );

	it( 'contains CPU usage configuration', () => {
		const cpuConfig = metadataUtils.metadataKeys.cpu;
		expect( cpuConfig ).toBeDefined();
		expect( cpuConfig.title ).toBe( 'wikilambda-functioncall-metadata-cpu-usage' );
		expect( cpuConfig.description ).toBe( 'getCpuUsageSummary' );
		expect( Array.isArray( cpuConfig.keys ) ).toBe( true );
		expect( cpuConfig.keys.length ).toBe( 3 );
	} );

	it( 'contains memory usage configuration', () => {
		const memoryConfig = metadataUtils.metadataKeys.memory;
		expect( memoryConfig ).toBeDefined();
		expect( memoryConfig.title ).toBe( 'wikilambda-functioncall-metadata-memory-usage' );
		expect( memoryConfig.description ).toBe( 'getMemoryUsageSummary' );
		expect( Array.isArray( memoryConfig.keys ) ).toBe( true );
	} );

	it( 'contains server configuration', () => {
		const serverConfig = metadataUtils.metadataKeys.server;
		expect( serverConfig ).toBeDefined();
		expect( serverConfig.title ).toBe( 'wikilambda-functioncall-metadata-hostname' );
		expect( Array.isArray( serverConfig.keys ) ).toBe( true );
	} );

	it( 'contains programming language configuration', () => {
		const langConfig = metadataUtils.metadataKeys.programmingLanguage;
		expect( langConfig ).toBeDefined();
		expect( langConfig.title ).toBe( 'wikilambda-functioncall-metadata-programming-language' );
		expect( Array.isArray( langConfig.keys ) ).toBe( true );
	} );

	it( 'has all expected top-level keys', () => {
		const keys = Object.keys( metadataUtils.metadataKeys );
		expect( keys ).toContain( 'errors' );
		expect( keys ).toContain( 'implementation' );
		expect( keys ).toContain( 'duration' );
		expect( keys ).toContain( 'cpu' );
		expect( keys ).toContain( 'memory' );
		expect( keys ).toContain( 'server' );
		expect( keys ).toContain( 'programmingLanguage' );
	} );

	it( 'errors configuration has correct transform methods', () => {
		const errorsKeys = metadataUtils.metadataKeys.errors.keys;
		const transforms = errorsKeys.map( ( key ) => key.transform ).filter( Boolean );
		expect( transforms ).toContain( 'getErrorType' );
		expect( transforms ).toContain( 'getErrorStringArgs' );
		expect( transforms ).toContain( 'getErrorChildren' );
		expect( transforms ).toContain( 'getTestResultValue' );
	} );

	describe( 'getStringValue', () => {
		it( 'returns a string as it is', () => {
			expect( metadataUtils.getStringValue( 'some value' ) ).toBe( 'some value' );
		} );

		it( 'returns the value of a Z6 object', () => {
			expect( metadataUtils.getStringValue( { Z1K1: 'Z6', Z6K1: 'some value' } ) ).toBe( 'some value' );
		} );

		it( 'stringifies any other value', () => {
			expect( metadataUtils.getStringValue( [ 'Z6', 'a' ] ) ).toBe( '["Z6","a"]' );
		} );
	} );

	describe( 'toRelativeTime', () => {
		it( 'formats a valid ISO 8601 timestamp as relative time text', () => {
			expect( metadataUtils.toRelativeTime( '2026-10-24T00:47:20Z' ) ).toEqual( {
				type: Constants.METADATA_CONTENT_TYPE.TEXT,
				value: '4 minutes ago'
			} );
		} );

		it( 'returns an invalid timestamp unchanged', () => {
			expect( metadataUtils.toRelativeTime( 'not a date' ) ).toEqual( {
				type: Constants.METADATA_CONTENT_TYPE.TEXT,
				value: 'not a date'
			} );
		} );
	} );

	describe( 'getListOfIds', () => {
		const urlGetters = {
			Q: ( id ) => `https://www.wikidata.org/wiki/${ id }`,
			L: ( id ) => `https://www.wikidata.org/wiki/Lexeme:${ id }`
		};

		it( 'links the Wikidata IDs of a typed list, skipping its benjamin item', () => {
			expect( metadataUtils.getListOfIds( [ 'Z6', 'Q42', 'L1' ], urlGetters ) ).toEqual( {
				type: Constants.METADATA_CONTENT_TYPE.HTML,
				value: '<span><a href="https://www.wikidata.org/wiki/Q42" target="_blank">Q42</a>, ' +
					'<a href="https://www.wikidata.org/wiki/Lexeme:L1" target="_blank">L1</a></span>'
			} );
		} );

		it( 'shows an ID without a URL builder as plain text', () => {
			expect( metadataUtils.getListOfIds( [ 'Z6', 'P31' ], urlGetters ) ).toEqual( {
				type: Constants.METADATA_CONTENT_TYPE.HTML,
				value: '<span><span>P31</span></span>'
			} );
		} );

		it( 'leaves out items that are not Wikidata entity IDs', () => {
			expect( metadataUtils.getListOfIds( [ 'Z6', 'Q42', '<b>x</b>' ], urlGetters ) ).toEqual( {
				type: Constants.METADATA_CONTENT_TYPE.HTML,
				value: '<span><a href="https://www.wikidata.org/wiki/Q42" target="_blank">Q42</a></span>'
			} );
		} );

		it( 'returns a value that is not a list as a string', () => {
			expect( metadataUtils.getListOfIds( 'Q42', urlGetters ) ).toBe( 'Q42' );
		} );
	} );
} );
