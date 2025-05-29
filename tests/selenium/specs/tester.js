/*!
 * WikiLambda browser test suite for "Create a new test"
 *
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
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const LoginPage = require( 'wdio-mediawiki/LoginPage' );
const FunctionPage = require( '../pageobjects/function/Function.page' );
const TesterForm = require( '../pageobjects/tester/TesterForm.page' );
const TesterPage = require( '../pageobjects/tester/Tester.page' );
const AboutBlock = require( '../componentobjects/AboutBlock' );

describe( 'Tester', () => {

	describe( 'Create a new test (CUJ 4)', () => {

		// Details about the function for which a new test is being created
		const functionDetails = {
			ZObjectLabel: 'If',
			ZId: 'Z802'
		};

		// Details about the entries in Call block
		const callBlockEntries = {
			condition: 'true',
			thenBlockInputType: 'String',
			thenBlockInput: 'Hello',
			elseBlockInputType: 'String',
			elseBlockInput: 'Bye'
		};

		// Details about the entries in validation block
		const validationBlockEntries = {
			ZObjectLabel: 'String equality',
			secondString: {
				true: 'Hello',
				false: 'Bye'
			}
		};

		// About block entries in different languages
		let aboutBlockEntriesEnglish, aboutBlockEntriesArabic;

		// Initialize the entries of the About block before the test
		before( async () => {
			await browser.deleteAllCookies();
			await LoginPage.loginAdmin();
			/**
			 * Date.now() is being used so that label will be unique and
			 * not collide in case of retries.
			 */
			const time = Date.now();
			aboutBlockEntriesEnglish = {
				language: 'English',
				label: `e2e-Create-A-New-Test-${ time }-English`,
				description: 'This is the description for the new test in English',
				alias: 'alias in English'
			};
			aboutBlockEntriesArabic = {
				language: 'Arabic',
				label: `e2e-Create-A-New-Test-${ time }-عربي`,
				description: 'هذا الوصف ل الاختبار الجديد باللغة العربية',
				alias: 'الاسم المستعار باللغة العربية'
			};
		} );

		it( 'should fill and submit the tester form', async () => {

			/**
			 * If login is successful then browser is redirected from "Special:UserLogin"
			 * to URL containing "Main_Page"
			 */
			const currentUrl = await browser.getUrl();
			if ( !currentUrl.includes( 'Main_Page' ) ) {
				throw new Error( 'Login failed' );
			}
			await FunctionPage.open( functionDetails.ZId );
			await FunctionPage.goToCreateNewTestLink();

			// Add and submit About block entries in English
			await TesterForm.addAboutBlockEntries( aboutBlockEntriesEnglish );

			// Add and Submit About block entries in Arabic
			await TesterForm.addAboutBlockLanguage( aboutBlockEntriesArabic.language );
			await TesterForm.addAboutBlockEntries( aboutBlockEntriesArabic );

			// fill the entries in the call block
			await TesterForm.expandCallFunctionBlock();
			await TesterForm.setCallFunctionBlock( functionDetails.ZObjectLabel );
			await TesterForm.setCallFunctionParameters( callBlockEntries );

			// fill validation block
			await TesterForm.expandValidationBlock();
			await TesterForm.setValidationBlock( validationBlockEntries.ZObjectLabel );
			await TesterForm.setValidationBlockParameters(
				validationBlockEntries.secondString.true );

			// publish the test
			await TesterForm.publishTest();

			// wait for success redirect and confirm test is successfully published
			await browser.waitUntil(
				async () => ( await browser.getUrl() ).includes( 'success=true' ),
				{ timeout: 10000, timeoutMsg: 'Unable to publish the test, success URL not found' }
			);

			// Confirm that the tester Page is open
			await expect( await TesterPage.getTesterTitle() )
				.toBe( aboutBlockEntriesEnglish.label );

			// display the tester description in the about section
			await expect( await TesterPage.getTesterDescription() ).toBe(
				aboutBlockEntriesEnglish.description,
				{ message: `Tester page is not displaying the tester description as expected to be ${ aboutBlockEntriesEnglish.description }` } );

			// display the call function block parameters
			await TesterForm.expandCallFunctionBlock();
			await expect( await
			TesterPage.getCallFunctionConditionParameter(
				callBlockEntries.condition ) ).toBeExisting(
				{ message: `Condition parameter are not displayed as expected to be ${ callBlockEntries.condition }` } );

			await expect( await
			TesterPage.getCallFunctionThenParameter( callBlockEntries.thenBlockInput ) ).toBeExisting(
				{ message: `Then parameter are not displayed as expected to be ${ callBlockEntries.thenBlockInput }` } );
			await expect( await
			TesterPage.getCallFunctionElseParameter(
				callBlockEntries.elseBlockInput ) ).toBeExisting(
				{ message: `Else parameter are not displayed as expected to be ${ callBlockEntries.elseBlockInput }` } );

			// display the validation block parameters
			await TesterForm.expandValidationBlock();
			await expect( await
			TesterPage.getValidationBlockFunction(
				validationBlockEntries.ZObjectLabel ) ).toBeExisting();
			await expect( await
			TesterPage.getValidationParameter(
				validationBlockEntries.secondString.true ) ).toBeExisting(
				{ message: `Validation parameter are not displayed as expected to be ${ validationBlockEntries.secondString.true }` } );
		} );
	} );
} );

describe( 'Edit the test', () => {

	let aboutBlockEditEnglishEntries;

	before( () => {
		const time = Date.now();
		aboutBlockEditEnglishEntries = {
			language: 'English',
			label: `e2e-edit-test-${ time }-English`,
			description: 'This is edited description for the test in English',
			alias: 'edited alias in English'
		};
	} );

	it( 'should edit the about block test', async () => {
		await TesterPage.clickOnEditSourceLink();
		await TesterForm.addAboutBlockEntries( aboutBlockEditEnglishEntries );
		await TesterForm.publishTest();
		await AboutBlock.aboutBlock.waitForExist();
		await AboutBlock.aboutDescription.waitForExist();
		await AboutBlock.aboutDescription.waitForDisplayed();
		await expect( await TesterPage.getTesterDescription() ).toBe(
			aboutBlockEditEnglishEntries.description,
			{ message: `Tester page is not displaying the tester description as expected to be ${ aboutBlockEditEnglishEntries.description }` } );
	} );
} );
