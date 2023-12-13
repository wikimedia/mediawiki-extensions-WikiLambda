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
const assert = require( 'assert' ),
	ListObjectsByType = require( '../pageobjects/special/ListObjectsByType.page.js' ),
	FunctionForm = require( '../pageobjects/function/FunctionForm.page' ),
	FunctionPage = require( '../pageobjects/function/Function.page' ),
	util = require( 'wdio-mediawiki/Util' ),
	LoginPage = require( 'wdio-mediawiki/LoginPage' );

describe( 'Function', function () {

	describe( 'Function viewer (CUJ1)', function () {
		it( 'should allow to evaluate a function', async function () {
			await LoginPage.loginAdmin();
			await ListObjectsByType.open();
			const ListFunctions = await ListObjectsByType.openFunctionsList();
			await ListFunctions.openFunction( 'echo' );

			await FunctionPage.callFunctionWithString( 'foobar' );
			await expect( await FunctionPage.getEvaluateFunctionResultSelector( 'foobar' ) )
				.toBeExisting( { message: 'The response "foobar" is not displayed' } );
		} );
	} );

	describe( 'Function editor (CUJ2)', function () {
		let functionTitle;
		let alias;
		const ALIASES = {
			get ENGLISH() {
				return alias + '-English';
			},
			get FRENCH() {
				return alias + '-French';
			},
			get GERMAN() {
				return alias + '-German';
			}
		};
		const ARGUMENT_LABELS = {
			ENGLISH: [ 'first argument', 'second argument' ],
			FRENCH: [ 'premier argument', 'second argument' ],
			GERMAN: [ 'erstes Argument', 'zweites Argument' ]
		};
		const INPUT_TYPES = [ 'String', 'Boolean' ];
		const OUTPUT_TYPE = 'String';
		before( function () {
			functionTitle = 'zzz-FunctionCreationTest-' + Date.now();
			alias = util.getTestString( 'alias-' );
		} );

		it( 'should create a function', async function () {
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
				language: 'German',
				name: functionTitle + '-German',
				alias: ALIASES.GERMAN,
				inputs: ARGUMENT_LABELS.GERMAN
			} );
			await FunctionForm.publishFunction();
		} );

		it( 'should display the function name', async function () {
			assert.strictEqual( await FunctionPage.functionTitle.getText(), functionTitle );
		} );

		it( 'should display an empty description field', async function () {
			await expect( await FunctionPage.getFunctionDescription() ).toBe( 'No description provided.' );
		} );

		it( 'should display the function aliases', async function () {
			const aliases = await FunctionPage.getFunctionAliases();
			await expect( await aliases[ 0 ] ).toBe( ALIASES.ENGLISH );
		} );

		it( 'should display the input labels and types', async function () {
			const inputs = await FunctionPage.getFunctionInputs();
			for ( const index in inputs ) {
				const expectedLabel = ARGUMENT_LABELS.ENGLISH[ index ];
				const expectedType = INPUT_TYPES[ index ];
				await expect( await inputs[ index ] ).toBe( `${ expectedLabel }:\n${ expectedType }` );
			}
		} );

		it( 'should display the input labels and types 2', async function () {
			const inputs = await FunctionPage.getFunctionInputBlocks();
			for ( let index = 0; index++; index < inputs.length ) {
				const expectedLabel = ARGUMENT_LABELS.ENGLISH[ index ];
				const expectedType = INPUT_TYPES[ index ];
				await expect( await FunctionPage.getFunctionInputLabel( inputs[ index ] ) ).toBe( `${ expectedLabel }:` );
				await expect( await FunctionPage.getFunctionInputType( inputs[ index ] ) ).toBe( expectedType );
			}
		} );

		it( 'should display the output type', async function () {
			const outputType = await FunctionPage.getFunctionOutputType();
			await expect( outputType ).toBe( OUTPUT_TYPE );
		} );
	} );
} );
