/*!
 * WikiLambda browser test suite for "Connect implementation and test to the function"
 *
 * @see https://phabricator.wikimedia.org/T318936
 *
 * Test go through the following steps
 * Admin User
 *
 * [1] Connect implementation
 * [a] Login and Navigate to the Details View of the Function Page
 * [b] Disconnect the Connected implementation
 * [c] Connect the Disconnected implementation
 *
 * [2] Connect test
 * [a] Login and Navigate to the Details View of the Function Page
 * [b] Disconnect the Connected test case
 * [c] Connect the Disconnected test case
 *
 * Normal User
 * [1] Create a new Account and login
 *
 * [2] Connect implementation
 * [a] Navigate to the Details View of the Function Page
 * [b] Try to either Connect or Disconnect the implementation
 *
 * [3] Connect test
 * [a] Navigate to the Details View of the Function Page
 * [b] Try to either Connect or Disconnect the test case
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const LoginPage = require( 'wdio-mediawiki/LoginPage' );
const FunctionPage = require( '../pageobjects/function/Function.page' );
const CreateAccountPage = require( 'wdio-mediawiki/CreateAccountPage' );

describe( 'Connect implementation and test to the function (CUJ 6)', () => {

	describe( 'Admin user', () => {

		describe( 'Connect implementation', () => {

			/**
			 * Details about the function to which implementation is being connected
			 */
			const functionDetails = {
				ZObjectLabel: 'If',
				ZId: 'Z802',
				implementation: {
					rowIndex: 0
				}
			};

			it( 'should show the implementations table in the function page', async () => {
				await LoginPage.loginAdmin();
				/**
				 * If login is successful then browser is redirected from "Special:UserLogin"
				 * to URL containing "Main_Page"
				 */
				await expect( browser ).toHaveUrlContaining( 'Main_Page', { message: 'Login failed' } );

				await FunctionPage.open( functionDetails.ZId );
				await expect( await FunctionPage.functionTitle ).toHaveText( functionDetails.ZObjectLabel );

				/**
				 * Confirm that the implementations table is displayed
				 */
				await expect( await FunctionPage.implementationsTable ).toBeDisplayed( {
					message: 'Implementations table is not displayed' } );
			} );

			/**
			 * Work around so tests do not interfere in case of failure
			 */
			it( 'should approve all the implementations', async () => {
				await FunctionPage.checkAllImplementations();
				const button = await FunctionPage.approveImplementationButton;
				const isEnabled = await button.isEnabled();
				if ( isEnabled ) {
					// If any implementations are disconnected, connect all of them.
					// They will be unchecked after disconnecting.
					await FunctionPage.approveImplementation();
				} else {
					// If all implementations are connected, uncheck.
					await FunctionPage.checkAllImplementations();
				}
			} );

			it( 'should disconnect the connected implementation', async () => {
				/**
				 * "Connect" and "Disconnect" button should not be displayed as nothing is selected
				 */
				await expect( await FunctionPage.approveImplementationButton ).not.toBeDisplayed( { message: 'Connect button should not be displayed' } );
				await expect( await FunctionPage.deactivateImplementationButton ).not.toBeDisplayed( { message: 'Disconnect button should not be displayed' } );

				/**
				 * Initial state of the implementation should be connected
				 */
				const tableRowState = await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex );
				await expect( tableRowState ).toBe( 'Connected', { message: 'State is expected to be Connected' } );

				/**
				 * Check implementation row
				 */
				await FunctionPage.checkImplementationsTableRow( functionDetails.implementation.rowIndex );

				/**
				 * Make sure that the connect button is disabled and the disconnect button is enabled
				 */
				await expect( await FunctionPage.approveImplementationButton ).toBeDisabled( { message: 'Connect button is expected to be disabled but it is enabled' } );
				await expect( await FunctionPage.deactivateImplementationButton ).toBeEnabled( { message: 'Disconnect button is expected to be enabled but it is disabled' } );

				/**
				 * Disconnect checked implementation
				 */
				await FunctionPage.deactivateImplementation();
				await expect( await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex ) ).toBe( 'Disconnected', { message: 'State is expected to be Disconnected' } );
			} );

			it( 'should connect the disconnected implementation', async () => {
				/**
				 * "Connect" and "Disconnect" button should not be displayed as nothing is selected
				 */
				await expect( await FunctionPage.approveImplementationButton ).not.toBeDisplayed( { message: 'Connect button should not be displayed' } );
				await expect( await FunctionPage.deactivateImplementationButton ).not.toBeDisplayed( { message: 'Disconnect button should not be displayed' } );

				/**
				 * Initial state of the implementation should be disconnected
				 */
				const tableRowState = await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex );
				await expect( tableRowState ).toBe( 'Disconnected', { message: 'State is expected to be Disconnected' } );

				/**
				 * Check implementation row
				 */
				await FunctionPage.checkImplementationsTableRow( functionDetails.implementation.rowIndex );

				/**
				 * Make sure that the connect button is enabled and the disconnect button is disabled
				 */
				await expect( await FunctionPage.approveImplementationButton ).toBeEnabled( { message: 'Connect button is expected to be enabled but it is disabled' } );
				await expect( await FunctionPage.deactivateImplementationButton ).toBeDisabled( { message: 'Disconnect button is expected to be disabled but it is enabled' } );

				/**
				 * Connect checked implementation
				 */
				await FunctionPage.approveImplementation();
				await expect( await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex ) ).toBe( 'Connected', { message: 'State is expected to be Connected' } );
			} );

		} );

		describe( 'Connect test', () => {

			/**
			 * Details about the function to which test is being connected
			 */
			const functionDetails = {
				ZObjectLabel: 'If',
				ZId: 'Z802',
				testCase: {
					rowIndex: 0
				}
			};

			it( 'should show the tests table in the function page', async () => {
				await FunctionPage.open( functionDetails.ZId );
				await expect( await FunctionPage.functionTitle ).toHaveText( functionDetails.ZObjectLabel );

				/**
				 * Confirm that the test cases table is displayed
				 */
				await expect( await FunctionPage.testCasesTable ).toBeDisplayed( {
					message: 'Tests table is not displayed' } );
			} );

			/**
			 * Work around so tests do not interfere in case of failure
			 */
			it( 'should approve all the test cases', async () => {
				await FunctionPage.checkAllTestCases();
				const button = await FunctionPage.approveTestCaseButton;
				const isEnabled = await button.isEnabled();
				if ( isEnabled ) {
					// If any tests are disconnected, connect all of them.
					// They will be unchecked after disconnecting.
					await FunctionPage.approveTestCase();
				} else {
					// If all tests are connected, uncheck.
					await FunctionPage.checkAllTestCases();
				}
			} );

			it( 'should disconnect the connected test', async () => {
				/**
				 * "Connect" and "Disconnect" button should not be displayed as nothing is selected
				 */
				await expect( await FunctionPage.approveTestCaseButton ).not.toBeDisplayed( { message: 'Connect button should not be displayed' } );
				await expect( await FunctionPage.deactivateTestCaseButton ).not.toBeDisplayed( { message: 'Disconnect button should not be displayed' } );

				/**
				 * Initial state of the implementation should be connected
				 */
				const tableRowState = await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex );
				await expect( tableRowState ).toBe( 'Connected', { message: 'State is expected to be Connected' } );

				/**
				 * Check test row
				 */
				await FunctionPage.checkTestCasesTableRow( functionDetails.testCase.rowIndex );

				/**
				 * Make sure that the connect button is disabled and the disconnect button is enabled
				 */
				await expect( await FunctionPage.approveTestCaseButton ).toBeDisabled( { message: 'Connect button is expected to be disabled but it is enabled' } );
				await expect( await FunctionPage.deactivateTestCaseButton ).toBeEnabled( { message: 'Disconnect button is expected to be enabled but it is disabled' } );

				/**
				 * Disconnect checked test
				 */
				await FunctionPage.deactivateTestCase();
				await expect( await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex ) ).toBe( 'Disconnected', { message: 'State is expected to be Disconnected' } );
			} );

			it( 'should connect the disconnected test', async () => {
				/**
				 * "Connect" and "Disconnect" button should not be displayed as nothing is selected
				 */
				await expect( await FunctionPage.approveTestCaseButton ).not.toBeDisplayed( { message: 'Connect button should not be displayed' } );
				await expect( await FunctionPage.deactivateTestCaseButton ).not.toBeDisplayed( { message: 'Disconnect button should not be displayed' } );

				/**
				 * Initial state of the implementation should be disconnected
				 */
				const tableRowState = await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex );
				await expect( tableRowState ).toBe( 'Disconnected', { message: 'State is expected to be Disconnected' } );

				/**
				 * Check test row
				 */
				await FunctionPage.checkTestCasesTableRow( functionDetails.testCase.rowIndex );

				/**
				 * Make sure that the connect button is enabled and the disconnect button is disabled
				 */
				await expect( await FunctionPage.approveTestCaseButton ).toBeEnabled( { message: 'Connect button is expected to be enabled but it is disabled' } );
				await expect( await FunctionPage.deactivateTestCaseButton ).toBeDisabled( { message: 'Disconnect button is expected to be disabled but it is enabled' } );

				/**
				 * Connect checked test
				 */
				await FunctionPage.approveTestCase();
				await expect( await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex ) ).toBe( 'Connected', { message: 'State is expected to be Connected' } );
			} );
		} );
	} );

	// TODO: Fix net_ERR Aborted
	describe.skip( 'Normal User', () => {

		/**
		 * Details about the new account
		 */
		const accountDetail = {};

		before( () => {
			const randomString = Date.now();
			accountDetail.username = `Username-${ randomString }`;
			accountDetail.password = `password-${ randomString }`;
		} );

		/**
		 * New user will have lesser permissions
		 */
		it( 'should create a new account', async () => {
			await CreateAccountPage.createAccount( accountDetail.username, accountDetail.password );

			await LoginPage.login( accountDetail.username, accountDetail.password );
			/**
			 * If login is successful then browser is redirected from "Special:UserLogin"
			 * to URL containing "Main_Page"
			 */
			await expect( browser ).toHaveUrlContaining( 'Main_Page',
				{ message: 'Login failed' } );
		} );

		describe( 'Connect implementation', () => {

			/**
			 * Details about the function to which implementation is being connected
			 */
			const functionDetails = {
				ZObjectLabel: 'If',
				ZId: 'Z802',
				implementation: {
					rowIndex: 0
				}
			};

			it( 'should show the implementations table in the function page', async () => {
				await FunctionPage.open( functionDetails.ZId );
				await expect( await FunctionPage.functionTitle ).toHaveText( functionDetails.ZObjectLabel );

				/**
				 * Confirm that the implementations table is displayed
				 */
				await expect( await FunctionPage.implementationsTable ).toBeDisplayed( {
					message: 'Implementations table is not displayed' } );
			} );

			it( 'should not be able to either connect or disconnect the implementation', async () => {
				/**
				 * "Connect" and "Disconnect" button should be disabled as nothing is selected
				 */
				await expect( await FunctionPage.approveImplementationButton ).toBeDisabled( { message: 'Connect button is expected to be disabled but it is enabled' } );
				await expect( await FunctionPage.deactivateImplementationButton ).toBeDisabled( { message: 'Disconnect button is expected to be disabled but it is enabled' } );

				/**
				 * Initial state of the implementation
				 */
				const implementationState = await FunctionPage.getImplementationsTableRowState(
					functionDetails.implementation.rowIndex );

				await FunctionPage.checkImplementationsTableRow(
					functionDetails.implementation.rowIndex );
				if ( implementationState === 'Connected' ) {
					await FunctionPage.deactivateImplementation();
				} else {
					await FunctionPage.approveImplementation();
				}

				await expect( await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex ) ).toBe( implementationState, { message: `State is expected to remain ${ implementationState }` } );
			} );

		} );

		describe( 'Connect test', () => {

			/**
			 * Details about the function to which test is being connected
			 */
			const functionDetails = {
				ZObjectLabel: 'If',
				ZId: 'Z802',
				testCase: {
					rowIndex: 0
				}
			};

			it( 'should show the tests table in the function page', async () => {
				await FunctionPage.open( functionDetails.ZId );
				await expect( await FunctionPage.functionTitle ).toHaveText( functionDetails.ZObjectLabel );

				/**
				 * Confirm that the test cases table is displayed
				 */
				await expect( await FunctionPage.testCasesTable ).toBeDisplayed( {
					message: 'Tests table is not displayed' } );
			} );

			it( 'should not be able to connect or disconnect the test case', async () => {
				/**
				 * "Connect" and "Disconnect" button should be disabled as nothing is selected
				 */
				await expect( await FunctionPage.approveTestCaseButton ).toBeDisabled( { message: 'Connect button is expected to be disabled but it is enabled' } );
				await expect( await FunctionPage.deactivateTestCaseButton ).toBeDisabled( { message: 'Disconnect button is expected to be disabled but it is enabled' } );

				const testCaseState = await FunctionPage.getTestCasesTableRowState(
					functionDetails.testCase.rowIndex );
				await FunctionPage.checkTestCasesTableRow( functionDetails.testCase.rowIndex );
				if ( testCaseState === 'Connected' ) {
					await FunctionPage.deactivateTestCase();
				} else {
					await FunctionPage.approveTestCase();
				}

				await expect( await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex ) ).toBe( testCaseState, { message: `State is expected to remain ${ testCaseState }` } );
			} );

		} );

	} );

} );
