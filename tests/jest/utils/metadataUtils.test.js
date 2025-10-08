/*!
 * WikiLambda unit test suite for the metadataUtils utility.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

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
	} );

	it( 'contains implementation configuration', () => {
		const implConfig = metadataUtils.metadataKeys.implementation;
		expect( implConfig ).toBeDefined();
		expect( implConfig.title ).toBe( 'wikilambda-functioncall-metadata-implementation' );
		expect( implConfig.description ).toBe( 'getImplementationSummary' );
		expect( Array.isArray( implConfig.keys ) ).toBe( true );
		expect( implConfig.keys.length ).toBe( 3 );
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
		expect( transforms ).toContain( 'getStringValue' );
	} );
} );
