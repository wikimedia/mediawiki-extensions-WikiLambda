/*!
 * WikiLambda browser test suite for "Create a new implementation"
 *
 * @see https://phabricator.wikimedia.org/T318939.
 *
 * Test go through the following steps
 * [1] Create Implementation via code
 * [a] Login and Navigate to the implementation form page
 * [b] Fill the entries in the About and Content block
 * [c] Publish the implementation and assert that entries are displayed as expected
 *
 * [2] Create Implementation via composition
 * [a] Login and Navigate to the implementation form page
 * [b] Fill the entries in the About and Content block
 * [c] Publish the implementation and assert that entries are displayed as expected
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const LoginPage = require( 'wdio-mediawiki/LoginPage' );
const FunctionPage = require( '../pageobjects/function/Function.page' );
const ImplementationForm = require( '../pageobjects/implementation/ImplementationForm.page' );
const ImplementationPage = require( '../pageobjects/implementation/Implementation.page' );

describe( 'Implementation (CUJ 5)', () => {

	/**
	 * Details about the function for which a new implementation is being created
	 */
	const functionDetails = {
		ZObjectLabel: 'Boolean equality',
		ZId: 'Z844'
	};

	describe( 'Implementation via code', () => {

		/**
		 * Details about the entries in Code Block
		 */
		const codeBlockEntries = {
			language: 'javascript',
			/**
			 * Code to be written in Code editor in line wise manner
			 */
			code: [
				'function Z844( Z844K1, Z844K2 ) {', // Line 1
				'if(Z844K1) { if(Z844K2) return true; return false; }', // Line 2
				'if(Z844K2) return false;', // Line 3
				'return true;', // Line 4
				'}' // Line 5
			],
			/**
			 * Instructions to write the code in Code Editor
			 * "Enter", "Backspace", "ArrowUp" are commands to click on the respective
			 * buttons on the keyboard.
			 *
			 * @see https://w3c.github.io/webdriver/#keyboard-actions - for Keyboard codes
			 */
			codeInstructions: [
				'ArrowUp',
				'if(Z844K1) { if(Z844K2) return true; return false; }', // Line 1
				'Enter',
				'if(Z844K2) return false;', // Line 2
				'Enter',
				'return true;' // Line 3
			]
		};

		let aboutBlockEntriesEnglish,
			aboutBlockEntriesHindi;

		before( async () => {
			await browser.deleteAllCookies();
			await LoginPage.loginAdmin();
			const time = Date.now();
			aboutBlockEntriesEnglish = {
				language: 'English',
				label: `e2e-implementation-code-${ time }-English`,
				description: 'This is the description for the new implementation via code in English',
				alias: 'alias in English'
			};
			aboutBlockEntriesHindi = {
				language: 'Hindi',
				label: `e2e-implementation-code-${ time }-हिंदी`,
				description: 'यह हिंदी में कोड के माध्यम से नए कार्यान्वयन का विवरण है',
				alias: 'उपनाम हिंदी में'
			};
		} );

		it( 'should create and publish a new implementation', async () => {
			// Wait for login redirect to complete
			await browser.waitUntil(
				async () => ( await browser.getUrl() ).includes( 'Main_Page' ),
				{ timeout: 10000, timeoutMsg: 'Login failed - page did not redirect to Main_Page' }
			);

			await FunctionPage.open( functionDetails.ZId );
			await expect( await FunctionPage.functionTitle )
				.toHaveText( functionDetails.ZObjectLabel, { message: 'Function Page is not open' } );
			await FunctionPage.goToCreateImplementationLink();

			// Add About block entries in English
			await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesEnglish );

			// Add Hindi language block and
			// Add About block entries in Hindi
			await ImplementationForm.addAboutBlockLanguage( aboutBlockEntriesHindi.language );
			await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesHindi );

			// Fill the entries in the code block
			await ImplementationForm.selectImplementationType( 'code' );
			await ImplementationForm.selectProgrammingLanguage( codeBlockEntries.language );
			await ImplementationForm.setCodeEditor( codeBlockEntries.codeInstructions );

			// Publish the new implementation
			await ImplementationForm.publishImplementation();
			const successUrl = await browser.getUrl();
			if ( !successUrl.includes( 'success=true' ) ) {
				throw new Error( 'Unable to publish the implementation' );
			}

			// Data checks
			await expect( await ImplementationPage.getImplementationDescription() ).toBe(
				aboutBlockEntriesEnglish.description,
				{ message: `Implementation page is not displaying the implementation description as expected to be ${ aboutBlockEntriesEnglish.description }` } );

			await expect( await ImplementationPage.getContentBlockFunctionLinkSelector(
				functionDetails.ZObjectLabel ) ).toBeExisting();

			await expect(
				await ImplementationPage.getImplementationTypeSelector( 'code' ) ).toBeExisting();

			await expect( await ImplementationPage.getProgrammingLanguageSelector(
				codeBlockEntries.language ) ).toBeExisting();

			const code = await ImplementationPage.getCodeEditorLines();
			for ( const line in code ) {
				expect( code[ line ] ).toBe( codeBlockEntries.code[ line ],
					{ message: `Code editor line number ${ line + 1 } is expected to be
							${ codeBlockEntries.code[ line ] } but received as ${ code[ line ] }` } );
			}

		} );

	} );

	describe( 'Implementation via composition', () => {

		/**
		 * Details about the entries in Composition Block.
		 *
		 * [Function call] [If] - First Function Call
		 * [a] condition [Argument reference] [Z844K1]
		 * [b] then [Argument reference] [Z844K2]
		 * [c] else [Function call] [If] - Second Function Call
		 * [c1] condition [Argument reference] [Z844K2]
		 * [c2] then [Boolean] [false]
		 * [c3] else [Boolean] [true]
		 */
		const compositionBlockEntries = {
			firstFunctionCallEntries: {
				functionCallLabel: 'If',
				conditionType: 'Argument reference',
				conditionValue: 'first Boolean',
				thenType: 'Argument reference',
				thenValue: 'second Boolean',
				elseType: 'Function call',
				elseValue: 'If'
			},
			secondFunctionCallEntries: {
				functionCallLabel: 'If',
				conditionType: 'Argument reference',
				conditionValue: 'second Boolean',
				thenType: 'Boolean',
				thenValue: 'false',
				elseType: 'Boolean',
				elseValue: 'true'
			}
		};

		let aboutBlockEntriesEnglish,
			aboutBlockEntriesHindi;

		before( async () => {
			await LoginPage.loginAdmin();
			const time = Date.now();
			aboutBlockEntriesEnglish = {
				language: 'English',
				label: `e2e-implementation-comp-${ time }-English`,
				description: 'This is the description for the new implementation via composition in English',
				alias: 'alias in English'
			};
			aboutBlockEntriesHindi = {
				language: 'Hindi',
				label: `e2e-implementation-comp-${ time }-हिंदी`,
				description: 'यह हिंदी में रचना के माध्यम से नए कार्यान्वयन का विवरण है',
				alias: 'उपनाम हिंदी में'
			};
		} );

		it( 'should create and publish a new implementation', async () => {
			// Wait for login redirect to complete
			await browser.waitUntil(
				async () => ( await browser.getUrl() ).includes( 'Main_Page' ),
				{ timeout: 10000, timeoutMsg: 'Login failed - page did not redirect to Main_Page' }
			);
			await FunctionPage.open( functionDetails.ZId );
			await FunctionPage.goToCreateImplementationLink();

			// Add About block entries in English
			await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesEnglish );

			// Add Hindi language block and
			// Add About block entries in Hindi
			await ImplementationForm.addAboutBlockLanguage( aboutBlockEntriesHindi.language );
			await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesHindi );

			// Fill the entries in the composition block
			await ImplementationForm.selectImplementationType( 'composition' );
			await ImplementationForm.toggleCompositionBlock();
			await ImplementationForm.setCompositionBlock( compositionBlockEntries );

			// Publish the new implementation
			await ImplementationForm.publishImplementation();
			const successUrl = await browser.getUrl();
			if ( !successUrl.includes( 'success=true' ) ) {
				throw new Error( 'Unable to publish the implementation' );
			}

			// Confirm that the Implementation Page is open
			await expect( await ImplementationPage.getImplementationTitle() )
				.toBe( aboutBlockEntriesEnglish.label );

			// Display the description in the about section'
			await expect( await ImplementationPage.getImplementationDescription() ).toBe(
				aboutBlockEntriesEnglish.description,
				{ message: `Implementation page is not displaying the implementation description as expected to be ${ aboutBlockEntriesEnglish.description }` } );

		} );
	} );

} );
