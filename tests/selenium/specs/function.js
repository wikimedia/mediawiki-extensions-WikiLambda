/*
 * WikiLambda browser test suite for functions
 *
 * @file contains the tests for the following
 * Evaluate a Function
 * @see https://phabricator.wikimedia.org/T318922
 * Create a Function definition
 * @see https://phabricator.wikimedia.org/T318930
 * Edit the Function definition
 * @see https://phabricator.wikimedia.org/T318933
 *
 * Test go through the following steps
 * [1] Evaluate a Function
 * [a] Open the Function page
 * [b] Call the Function
 *
 * [2] Create a Function definition
 * [a] Login and Navigate to the Function Form page
 * [b] Fill the entries
 * [c] Publish the Function and assert that entries are displayed as expected
 *
 * [3] Edit the Function definition
 * [a] Open the Function Form
 * [b] Edit the entries
 * [c] Publish the Function and assert that entries are displayed as expected
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const ListObjectsByType = require( '../pageobjects/special/ListObjectsByType.page.js' ),
	FunctionForm = require( '../pageobjects/function/FunctionForm.page' ),
	FunctionPage = require( '../pageobjects/function/Function.page' ),
	util = require( 'wdio-mediawiki/Util' ),
	LoginPage = require( 'wdio-mediawiki/LoginPage' );

describe( 'Function', () => {

	before( async () => {
		await browser.deleteAllCookies();
		await LoginPage.loginAdmin();
	} );

	describe( 'Function viewer (CUJ1)', () => {
		it( 'should allow to evaluate a function', async () => {
			await ListObjectsByType.open();
			const ListFunctions = await ListObjectsByType.openFunctionsList();
			await ListFunctions.openFunction( 'echo' );

			await FunctionPage.callFunctionWithString( 'foobar' );
			await expect( await FunctionPage.getEvaluateFunctionResultSelector( 'foobar' ) )
				.toBeExisting( { message: 'The response "foobar" is not displayed' } );
		} );
	} );

	describe( 'Function editor (CUJ2)', () => {
		let functionTitle;
		let alias;
		const ALIASES = {
			get ENGLISH() {
				return alias + '-English';
			},
			get FRENCH() {
				return alias + '-French';
			},
			get SPANISH() {
				return alias + '-Spanish';
			}
		};
		const ARGUMENT_LABELS = {
			ENGLISH: [ 'first argument', 'second argument' ],
			FRENCH: [ 'premier argument', 'second argument' ],
			SPANISH: [ 'primer argumento', 'segundo argumento' ]
		};
		const INPUT_TYPES = [ 'String', 'Boolean' ];
		const OUTPUT_TYPE = 'String';
		before( async () => {
			// create a new function
			functionTitle = 'zzz-FunctionCreationTest-' + Date.now();
			alias = util.getTestString( 'alias-' );
			await FunctionForm.open();
			await FunctionForm.fillFirstLanguageContainer( {
				language: 'English',
				name: functionTitle,
				alias: ALIASES.ENGLISH,
				inputs: [
					{ type: INPUT_TYPES[ 0 ], label: ARGUMENT_LABELS.ENGLISH[ 0 ] },
					{ type: INPUT_TYPES[ 1 ], label: ARGUMENT_LABELS.ENGLISH[ 1 ] }
				],
				outputType: OUTPUT_TYPE
			} );
			await FunctionForm.addLanguageContainer( {
				language: 'French',
				name: functionTitle + '-French',
				alias: ALIASES.FRENCH,
				inputs: ARGUMENT_LABELS.FRENCH
			} );
			await FunctionForm.addLanguageContainer( {
				language: 'Spanish',
				name: functionTitle + '-Spanish',
				alias: ALIASES.SPANISH,
				inputs: ARGUMENT_LABELS.SPANISH
			} );
			await FunctionForm.publishFunction();
		} );

		it( 'should create a new function and display the function name', async () => {
			await expect( await FunctionPage.functionTitle.getText() ).toBe( functionTitle );
		} );

		it( 'should create a new function and display function aliases', async () => {
			const aliases = await FunctionPage.getFunctionAliases();
			expect( await aliases[ 0 ] ).toBe( ALIASES.ENGLISH );
		} );

		it( 'should create a new function and display function input labels and types', async () => {
			const inputs = await FunctionPage.getFunctionInputBlocks();
			await inputs.map( async ( _, index ) => {
				const expectedLabel = ARGUMENT_LABELS.ENGLISH[ index ];
				const expectedType = INPUT_TYPES[ index ];

				expect( await FunctionPage.getFunctionInputLabel( inputs[ index ] ) ).toBe( `${ expectedLabel }:` );
				expect( await FunctionPage.getFunctionInputType( inputs[ index ] ) ).toBe( expectedType );
			} );
		} );

		it( 'should create a new function and display function output type', async () => {
			const outputType = await FunctionPage.getFunctionOutputType();
			expect( outputType ).toBe( OUTPUT_TYPE );
		} );
	} );
} );
