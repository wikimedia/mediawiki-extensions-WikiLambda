/**
 * @file contains the tests for "create a new test".
 * @see https://phabricator.wikimedia.org/T318938.
 *
 * Test go through the following steps
 * [1] Create a new test
 * [a] Login and Navigate to the tester form page
 * [b] Fill the entries in the About and Content block
 * [c] Publish the test and assert that entries are displayed as expected
 *
 * [2] Edit the test
 * [a] Open the tester form
 * [b] Edit the details in the about block
 * [c] Publish the test and assert that entries are displayed as expected
 */

'use strict';
const LoginPage = require( 'wdio-mediawiki/LoginPage' );
const FunctionPage = require( '../pageobjects/function/Function.page' );
const TesterForm = require( '../pageobjects/tester/TesterForm.page' );
const TesterPage = require( '../pageobjects/tester/Tester.page' );

describe( 'Tester', () => {

	describe( 'Create a new test (CUJ 4)', () => {

		/**
		 * Details about the function for which a new test is being created
		 */
		const functionDetails = {
			ZObjectLabel: 'If',
			ZId: 'Z802'
		};

		/**
		 * Details about the entries in Call block
		 */
		const callBlockEntries = {
			condition: 'true',
			thenBlockInputType: 'String',
			thenBlockInput: 'Hello',
			elseBlockInputType: 'String',
			elseBlockInput: 'Bye'
		};

		/**
		 * Details about the entries in validation block
		 */
		const validationBlockEntries = {
			ZObjectLabel: 'String equality',
			secondString: {
				true: 'Hello',
				false: 'Bye'
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
				label: `e2e-Create-A-New-Test-${time}-English`,
				description: 'This is the description for the test',
				alias: 'alias-English'
			};
			aboutBlockEntriesFrench = {
				language: 'French',
				label: `e2e-Create-A-New-Test-${time}-French`,
				description: 'This is the description for the test',
				alias: 'alias-French'
			};
			aboutBlockEntriesHindi = {
				language: 'Hindi',
				label: `e2e-Create-A-New-Test-${time}-Hindi`,
				description: 'This is the description for the test',
				alias: 'alias-Hindi'
			};
		} );

		it( 'should navigate to the tester form', async () => {
			await LoginPage.loginAdmin();
			/**
			 * If login is successful then browser is redirected from "Special:UserLogin"
			 * to URL containing "Main_Page"
			 */
			await expect( browser ).toHaveUrlContaining( 'Main_Page',
				{ message: 'Login failed' } );

			await FunctionPage.open( functionDetails.ZId );
			await expect( await FunctionPage.functionTitle )
				.toHaveText( functionDetails.ZObjectLabel );
			await FunctionPage.switchToDetailsTab();
			await expect( await FunctionPage.detailsTab ).toHaveAttribute( 'aria-selected', 'true',
				{ message: 'Not able to switch to details view' } );
			await FunctionPage.goToCreateNewTestLink();

			/**
			 * Confirm that the test form is open
			 */
			await expect( await TesterForm.getFunctionExplorerName() )
				.toBe( functionDetails.ZId );
		} );

		it( 'should fill the entries in the about section', async () => {
			/**
			 * Add and Submit About block entries in English
			 */
			await TesterForm.openAboutBlockDialogBox();
			await expect( await TesterForm.aboutBlockDialogBox ).toBeDisplayed();
			await TesterForm.addAboutBlockEntries( aboutBlockEntriesEnglish );
			await TesterForm.submitAboutBlockEntries();
			await expect( await TesterForm.aboutBlockDialogBox ).not.toBeDisplayed();

			/**
			 * Add and Submit About block entries in French
			 */
			await TesterForm.openAboutBlockDialogBox();
			await expect( await TesterForm.aboutBlockDialogBox ).toBeDisplayed();
			await TesterForm.addAboutBlockEntries( aboutBlockEntriesFrench );
			await TesterForm.submitAboutBlockEntries();
			await expect( await TesterForm.aboutBlockDialogBox ).not.toBeDisplayed();

			/**
			 * Add and Submit About block entries in Hindi
			 */
			await TesterForm.openAboutBlockDialogBox();
			await expect( await TesterForm.aboutBlockDialogBox ).toBeDisplayed();
			await TesterForm.addAboutBlockEntries( aboutBlockEntriesHindi );
			await TesterForm.submitAboutBlockEntries();
			await expect( await TesterForm.aboutBlockDialogBox ).not.toBeDisplayed();
		} );

		it( 'should fill the entries in the call block', async () => {
			await TesterForm.expandCallFunctionBlock();
			await expect( await TesterForm.getCallFunctionBlockSection( 'function' ) ).toBeDisplayed();
			await TesterForm.setCallFunctionBlock( functionDetails.ZObjectLabel );
			await expect( await TesterForm.getCallFunctionBlockSection( 'condition' ) ).toBeDisplayed();
			await TesterForm.setCallFunctionParameters( callBlockEntries );
		} );

		it( 'should fill the entries in the validation block', async () => {
			await TesterForm.expandValidationBlock();
			await expect( await TesterForm.getValidationBlockSection( 'function' ) ).toBeDisplayed();
			await TesterForm.setValidationBlock( validationBlockEntries.ZObjectLabel );
			await expect( await TesterForm.getValidationBlockSection( 'second string' ) ).toBeDisplayed();
			await TesterForm.setValidationBlockParameters(
				validationBlockEntries.secondString.true );
		} );

		it( 'should publish the test', async () => {
			await TesterForm.publishTest();
			/**
			 * When test is published successfully, the browser is redirected to URL
			 * containing param "success=true"
			 */
			await expect( browser ).toHaveUrlContaining( 'success=true',
				{ message: 'Unable to publish the test' } );

			/**
			 * Confirm that the tester Page is open
			 */
			await expect( await TesterPage.getTesterTitle() )
				.toBe( aboutBlockEntriesEnglish.label );
		} );

		describe( 'Show details of new test created', () => {

			it( 'should display the information in the about section', async () => {
				await expect( await TesterPage.getTesterLabel() ).toBe(
					aboutBlockEntriesEnglish.label,
					{ message: `Tester page is not displaying the tester label as expected to be ${aboutBlockEntriesEnglish.label}` } );
				await expect( await TesterPage.getTesterDescription() ).toBe(
					aboutBlockEntriesEnglish.description,
					{ message: `Tester page is not displaying the tester description as expected to be ${aboutBlockEntriesEnglish.description}` } );
			} );

			it( 'should display the call function block parameters', async () => {
				await TesterPage.toggleCallFunctionBlock();
				await expect( await
				TesterPage.getCallFunctionConditionParameter(
					callBlockEntries.condition ) ).toBeExisting(
					{ message: `Condition parameter are not displayed as expected to be ${callBlockEntries.condition}` } );
				await expect( await
				TesterPage.getCallFunctionThenParameter(
					callBlockEntries.thenBlockInput ) ).toBeExisting(
					{ message: `Then parameter are not displayed as expected to be ${callBlockEntries.thenBlockInput}` } );
				await expect( await
				TesterPage.getCallFunctionElseParameter(
					callBlockEntries.elseBlockInput ) ).toBeExisting(
					{ message: `Else parameter are not displayed as expected to be ${callBlockEntries.elseBlockInput}` } );
			} );

			it( 'should display the validation block parameters', async () => {
				await TesterPage.toggleValidationBlock();
				await expect( await
				TesterPage.getValidationBlockFunction(
					validationBlockEntries.ZObjectLabel ) ).toBeExisting();
				await expect( await
				TesterPage.getValidationParameter(
					validationBlockEntries.secondString.true ) ).toBeExisting(
					{ message: `Validation parameter are not displayed as expected to be ${validationBlockEntries.secondString.true}` } );
			} );
		} );
	} );

	describe( 'Edit the test', () => {

		/**
		 * About block edit entries in English
		 */
		let aboutBlockEditEntries;

		before( () => {
			/**
			 * Date.now() is being used so that label will be unique and
			 * not collide in case of retries.
			 */
			const time = Date.now();
			aboutBlockEditEntries = {
				language: 'English',
				label: `e2e-edit-test-${time}-English`,
				description: 'This is edited description for the test',
				alias: 'alias-edit-English'
			};
		} );

		it( 'should open the tester form', async () => {
			await TesterPage.clickOnEditSourceLink();
			/**
			 * If the tester form is opened, then browser is redirected to URL
			 * containing the param "action=edit"
			 */
			await expect( browser ).toHaveUrlContaining( 'action=edit',
				{ message: 'testerform is not opened' } );
		} );

		it( 'should edit the english label information', async () => {
			/**
			 * Edit About information in English
			 */
			await TesterForm.openAboutBlockDialogBox();
			await expect( await TesterForm.aboutBlockDialogBox ).toBeDisplayed();
			await TesterForm.addAboutBlockEntries( aboutBlockEditEntries );
			await TesterForm.submitAboutBlockEntries();
			await expect( await TesterForm.aboutBlockDialogBox ).not.toBeDisplayed();
		} );

		it( 'should publish the edited test', async () => {
			await TesterForm.publishTest();
			/**
			 * When test is published successfully, the browser is redirected to url
			 * containing param "success=true"
			 */
			await expect( browser ).toHaveUrlContaining( 'success=true',
				{ message: 'Unable to publish edited tester' } );
			/**
			 * Confirm that the tester View Page is open
			 */
			await expect( await TesterPage.getTesterTitle() ).toBe(
				aboutBlockEditEntries.label,
				{ message: `Tester page is not displaying the tester title as expected to be ${aboutBlockEditEntries.label}` } );
		} );

		describe( 'Show details of edited test', () => {

			it( 'should display the information in the about section', async () => {
				await expect( await TesterPage.getTesterLabel() ).toBe(
					aboutBlockEditEntries.label,
					{ message: `Tester page is not displaying the tester label as expected to be ${aboutBlockEditEntries.label}` } );
				await expect( await TesterPage.getTesterDescription() ).toBe(
					aboutBlockEditEntries.description,
					{ message: `Tester page is not displaying the tester description as expected to be ${aboutBlockEditEntries.description}` } );
			} );

		} );
	} );
} );
