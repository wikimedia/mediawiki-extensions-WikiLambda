/**
 * @file contains the tests for "Create a new implementation".
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
 */

'use strict';
const LoginPage = require( 'wdio-mediawiki/LoginPage' );
const FunctionPage = require( '../pageobjects/function/Function.page' );
const ImplementationForm = require( '../pageobjects/implementation/ImplementationForm.page' );
const ImplementationPage = require( '../pageobjects/implementation/Implementation.page' );

describe( 'Implementation (CUJ 5)', () => {

	describe( 'Implementation via code', () => {

		/**
		 * Details about the function for which a new implementation is being created
		 */
		const functionDetails = {
			ZObjectLabel: 'Boolean equality',
			ZId: 'Z844'
		};

		describe( 'Create a new implementation', () => {

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

			/**
			 * About block entries in different languages
			 */
			let aboutBlockEntriesEnglish, aboutBlockEntriesFrench,
				aboutBlockEntriesHindi;

			/**
			 * Initialize the entries of the About block before the test
			 */
			before( () => {
				/**
				 * Date.now() is being used so that label will be unique and
				 * not collide in case of retries.
				 */
				const time = Date.now();
				aboutBlockEntriesEnglish = {
					language: 'English',
					label: `e2e-implementation-code-${time}-English`,
					description: 'This is the description for the implementation via code',
					alias: 'alias-English'
				};
				aboutBlockEntriesFrench = {
					language: 'French',
					label: `e2e-implementation-code-${time}-French`,
					description: 'This is the description for the implementation via code',
					alias: 'alias-French'
				};
				aboutBlockEntriesHindi = {
					language: 'Hindi',
					label: `e2e-implementation-code-${time}-Hindi`,
					description: 'This is the description for the implementation via code',
					alias: 'alias-Hindi'
				};
			} );

			it( 'should navigate to the implementation form', async () => {
				await LoginPage.loginAdmin();
				/**
				 * If login is successful then browser is redirected from "Special:UserLogin"
				 * to URL containing "Main_Page"
				 */
				await expect( browser ).toHaveUrlContaining( 'Main_Page',
					{ message: 'Login failed' } );

				await FunctionPage.open( functionDetails.ZId );
				await expect( await FunctionPage.functionTitle )
					.toHaveText( functionDetails.ZObjectLabel, { message: 'Function Page is not open' } );
				await FunctionPage.switchToDetailsTab();
				await expect( await FunctionPage.detailsTab ).toHaveAttribute( 'aria-selected', 'true',
					{ message: 'Not able to switch to details view' } );
				await FunctionPage.goToCreateImplementationLink();

				/**
				 * Confirm that the implementation form is open
				 */
				await expect( await ImplementationForm.getFunctionExplorerName() )
					.toBe( functionDetails.ZObjectLabel, { message: 'Implementation form is not open' } );
			} );

			it( 'should fill the entries in the about section', async () => {
				/**
				 * Add and Submit About block entries in English
				 */
				await ImplementationForm.openAboutBlockDialogBox();
				await expect( await ImplementationForm.aboutBlockDialogBox ).toBeDisplayed();
				await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesEnglish );
				await ImplementationForm.submitAboutBlockEntries();
				await expect( await ImplementationForm.aboutBlockDialogBox ).not.toBeDisplayed();

				/**
				 * Add and Submit About block entries in French
				 */
				await ImplementationForm.openAboutBlockDialogBox();
				await expect( await ImplementationForm.aboutBlockDialogBox ).toBeDisplayed();
				await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesFrench );
				await ImplementationForm.submitAboutBlockEntries();
				await expect( await ImplementationForm.aboutBlockDialogBox ).not.toBeDisplayed();

				/**
				 * Add and Submit About block entries in Hindi
				 */
				await ImplementationForm.openAboutBlockDialogBox();
				await expect( await ImplementationForm.aboutBlockDialogBox ).toBeDisplayed();
				await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesHindi );
				await ImplementationForm.submitAboutBlockEntries();
				await expect( await ImplementationForm.aboutBlockDialogBox ).not.toBeDisplayed();
			} );

			it( 'should fill the entries in the code block', async () => {
				await ImplementationForm.setFunctionExplorerName( functionDetails.ZObjectLabel );
				await ImplementationForm.selectImplementationType( 'code' );
				await ImplementationForm.selectProgrammingLanguage( codeBlockEntries.language );
				await ImplementationForm.setCodeEditor( codeBlockEntries.codeInstructions );
			} );

			it( 'should publish the new implementation', async () => {
				await ImplementationForm.publishImplementation();
				/**
				 * When implementation is published successfully, the browser is redirected to URL
				 * containing param "success=true"
				 */
				await expect( browser ).toHaveUrlContaining( 'success=true',
					{ message: 'Unable to publish the implementation' } );

				/**
				 * Confirm that the Implementation Page is open
				 */
				await expect( await ImplementationPage.getImplementationTitle() )
					.toBe( aboutBlockEntriesEnglish.label );
			} );

			describe( 'Show details of new implementation created', () => {

				it( 'should display the entries in the about section', async () => {
					await expect( await ImplementationPage.getImplementationLabel() ).toBe(
						aboutBlockEntriesEnglish.label,
						{ message: `Implementation page is not displaying the implementation label as expected to be ${aboutBlockEntriesEnglish.label}` } );
					await expect( await ImplementationPage.getImplementationDescription() ).toBe(
						aboutBlockEntriesEnglish.description,
						{ message: `Implementation page is not displaying the implementation description as expected to be ${aboutBlockEntriesEnglish.description}` } );
				} );

				it( 'should display the entries in the code block', async () => {
					await expect( await ImplementationPage.getContentBlockFunctionLinkSelector(
						functionDetails.ZObjectLabel ) ).toBeExisting();

					await expect(
						await ImplementationPage.getImplementationTypeSelector( 'code' ) ).toBeExisting();

					await expect( await ImplementationPage.getProgrammingLanguageSelector(
						codeBlockEntries.language ) ).toBeExisting();
					/**
					 * Code in line wise manner
					 */
					const code = await ImplementationPage.getCodeEditorLines();
					for ( const line in code ) {
						expect( code[ line ] ).toBe( codeBlockEntries.code[ line ],
							{ message: `Code editor line number ${line + 1} is expected to be 
							${codeBlockEntries.code[ line ]} but received as ${code[ line ]}` } );
					}
				} );

			} );

		} );
	} );

	describe( 'Implementation via composition', () => {

		/**
		 * Details about the function for which a new implementation is being created
		 */
		const functionDetails = {
			ZObjectLabel: 'Boolean equality',
			ZId: 'Z844'
		};

		describe( 'Create a new implementation', () => {

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
					conditionType: 'Z18',
					conditionValue: 'Z844K1',
					thenType: 'Argument reference',
					thenValue: 'Z844K2',
					elseType: 'Function call',
					elseValue: 'If'
				},
				secondFunctionCallEntries: {
					functionCallLabel: 'If',
					conditionType: 'Argument reference',
					conditionValue: 'Z844K2',
					thenType: 'Boolean',
					thenValue: 'false',
					elseType: 'Boolean',
					elseValue: 'true'
				}
			};

			/**
			 * About block entries in different languages
			 */
			let aboutBlockEntriesEnglish, aboutBlockEntriesFrench,
				aboutBlockEntriesHindi;

			/**
			 * Initialize the entries of the About block before the test
			 */
			before( () => {
				/**
				 * Date.now() is being used so that label will be unique and
				 * not collide in case of retries.
				 */
				const time = Date.now();
				aboutBlockEntriesEnglish = {
					language: 'English',
					label: `e2e-implementation-composition-${time}-English`,
					description: 'This is the description for the implementation via composition',
					alias: 'alias-English'
				};
				aboutBlockEntriesFrench = {
					language: 'French',
					label: `e2e-implementation-composition-${time}-French`,
					description: 'This is the description for the implementation via composition',
					alias: 'alias-French'
				};
				aboutBlockEntriesHindi = {
					language: 'Hindi',
					label: `e2e-implementation-composition-${time}-Hindi`,
					description: 'This is the description for the implementation via composition',
					alias: 'alias-Hindi'
				};
			} );

			it( 'should navigate to the implementation form', async () => {
				await FunctionPage.open( functionDetails.ZId );
				await expect( await FunctionPage.functionTitle )
					.toHaveText( functionDetails.ZObjectLabel, { message: 'Function Page is not open' } );
				await FunctionPage.switchToDetailsTab();
				await expect( await FunctionPage.detailsTab ).toHaveAttribute( 'aria-selected', 'true',
					{ message: 'Not able to switch to details view' } );
				await FunctionPage.goToCreateImplementationLink();

				/**
				 * Confirm that the implementation form is open
				 */
				await expect( await ImplementationForm.getFunctionExplorerName() )
					.toBe( functionDetails.ZId, { message: 'Implementation form is not open' } );
			} );

			it( 'should fill the entries in the about section', async () => {
				/**
				 * Add and Submit About block entries in English
				 */
				await ImplementationForm.openAboutBlockDialogBox();
				await expect( await ImplementationForm.aboutBlockDialogBox ).toBeDisplayed();
				await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesEnglish );
				await ImplementationForm.submitAboutBlockEntries();
				await expect( await ImplementationForm.aboutBlockDialogBox ).not.toBeDisplayed();

				/**
				 * Add and Submit About block entries in French
				 */
				await ImplementationForm.openAboutBlockDialogBox();
				await expect( await ImplementationForm.aboutBlockDialogBox ).toBeDisplayed();
				await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesFrench );
				await ImplementationForm.submitAboutBlockEntries();
				await expect( await ImplementationForm.aboutBlockDialogBox ).not.toBeDisplayed();

				/**
				 * Add and Submit About block entries in Hindi
				 */
				await ImplementationForm.openAboutBlockDialogBox();
				await expect( await ImplementationForm.aboutBlockDialogBox ).toBeDisplayed();
				await ImplementationForm.addAboutBlockEntries( aboutBlockEntriesHindi );
				await ImplementationForm.submitAboutBlockEntries();
				await expect( await ImplementationForm.aboutBlockDialogBox ).not.toBeDisplayed();
			} );

			it( 'should fill the entries in the composition block', async () => {
				await ImplementationForm.selectImplementationType( 'composition' );
				await expect( await ImplementationForm.compositionBlock ).toBeDisplayed(
					{ message: 'implementation type composition is not selected' } );
				await ImplementationForm.toggleCompositionBlock();
				await ImplementationForm.setCompositionBlock( compositionBlockEntries );
			} );

			it( 'should publish the new implementation', async () => {
				await ImplementationForm.publishImplementation();
				/**
				 * When implementation is published successfully, the browser is redirected to URL
				 * containing param "success=true"
				 */
				await expect( browser ).toHaveUrlContaining( 'success=true',
					{ message: 'Unable to publish the implementation' } );

				/**
				 * Confirm that the Implementation Page is open
				 */
				await expect( await ImplementationPage.getImplementationTitle() )
					.toBe( aboutBlockEntriesEnglish.label );
			} );

			describe( 'Show details of new implementation created', () => {

				it( 'should display the entries in the about section', async () => {
					await expect( await ImplementationPage.getImplementationLabel() ).toBe(
						aboutBlockEntriesEnglish.label,
						{ message: `Implementation page is not displaying the implementation label as expected to be ${aboutBlockEntriesEnglish.label}` } );
					await expect( await ImplementationPage.getImplementationDescription() ).toBe(
						aboutBlockEntriesEnglish.description,
						{ message: `Implementation page is not displaying the implementation description as expected to be ${aboutBlockEntriesEnglish.description}` } );
				} );

			} );
		} );
	} );

} );
