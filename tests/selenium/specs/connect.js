/**
 * @file contains the tests for "Connect implementation and test to the function".
 * @see https://phabricator.wikimedia.org/T318936
 *
 * Test go through the following steps
 * [1] Connect implementation
 * [a] Login and Navigate to the Details View of the Function Page
 * [b] Deactivate the Approved implementation
 * [c] Approve the Deactivated implementation
 *
 * [2] Connect test
 * [a] Login and Navigate to the Details View of the Function Page
 * [b] Deactivate the Approved test case
 * [c] Approve the Deactivated test case
 */

'use strict';
const LoginPage = require( 'wdio-mediawiki/LoginPage' );
const FunctionPage = require( '../pageobjects/function/Function.page' );

describe( 'Connect implementation and test to the function (CUJ 6)', () => {

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

		it( 'should open the "Detail" view of the function page', async () => {
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

			/**
			 * Confirm that the implementations table is displayed
			 */
			await expect( await FunctionPage.implementationsTable ).toBeDisplayed( {
				message: 'Implementations table is not displayed' } );
		} );

		/**
		 * Work around so tests do not interfere in case of failure
		 */
		it( 'should approve all the implementation', async () => {
			await FunctionPage.checkAllImplementations();
			const button = await FunctionPage.approveImplementationButton;
			const isEnabled = await button.isEnabled();
			if ( isEnabled ) {
				await FunctionPage.approveImplementation();
			} else {
				await FunctionPage.checkAllImplementations();
			}
		} );

		it( 'should deactivate the approved implementation', async () => {
			/**
			 * "Approve" and "Deactivate" button should be disabled as nothing is selected
			 */
			await expect( await FunctionPage.approveImplementationButton ).toBeDisabled( { message: 'Approve button is expected to be disabled but it is enabled' } );
			await expect( await FunctionPage.deactivateImplementationButton ).toBeDisabled( { message: 'Deactivate button is expected to be disabled but it is enabled' } );

			/**
			 * Initial state of the implementation should be approved
			 */
			await expect( await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex ) ).toBe( 'Approved', { message: 'State is expected to be Approved' } );
			await FunctionPage.checkImplementationsTableRow(
				functionDetails.implementation.rowIndex );
			await expect( await FunctionPage.approveImplementationButton ).toBeDisabled( { message: 'Approve button is expected to be disabled but it is enabled' } );
			await expect( await FunctionPage.deactivateImplementationButton ).toBeEnabled( { message: 'Deactivate button is expected to be enabled but it is disabled' } );

			await FunctionPage.deactivateImplementation();
			await expect( await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex ) ).toBe( 'Deactivated', { message: 'State is expected to be Deactivated' } );
		} );

		it( 'should approve the deactivated implementation', async () => {
			/**
			 * "Approve" and "Deactivate" button should be disabled as nothing is selected
			 */
			await expect( await FunctionPage.approveImplementationButton ).toBeDisabled( { message: 'Approve button is expected to be disabled but it is enabled' } );
			await expect( await FunctionPage.deactivateImplementationButton ).toBeDisabled( { message: 'Deactivate button is expected to be disabled but it is enabled' } );

			await expect( await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex ) ).toBe( 'Deactivated', { message: 'State is expected to be Deactivated' } );
			await FunctionPage.checkImplementationsTableRow(
				functionDetails.implementation.rowIndex );
			await expect( await FunctionPage.approveImplementationButton ).toBeEnabled( { message: 'Approve button is expected to be enabled but it is disabled' } );
			await expect( await FunctionPage.deactivateImplementationButton ).toBeDisabled( { message: 'Deactivate button is expected to be disabled but it is enabled' } );

			await FunctionPage.approveImplementation();
			await expect( await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex ) ).toBe( 'Approved', { message: 'State is expected to be Approved' } );
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

		it( 'should open the "Detail" view of the function page', async () => {
			await FunctionPage.open( functionDetails.ZId );
			await expect( await FunctionPage.functionTitle )
				.toHaveText( functionDetails.ZObjectLabel );
			await FunctionPage.switchToDetailsTab();
			await expect( await FunctionPage.detailsTab ).toHaveAttribute( 'aria-selected', 'true',
				{ message: 'Not able to switch to details view' } );

			/**
			 * Confirm that the test cases table is displayed
			 */
			await expect( await FunctionPage.testCasesTable ).toBeDisplayed( {
				message: 'Test cases table is not displayed' } );
		} );

		/**
		 * Work around so tests do not interfere in case of failure
		 */
		it( 'should approve all the test cases', async () => {
			await FunctionPage.checkAllTestCases();
			const button = await FunctionPage.approveTestCaseButton;
			const isEnabled = await button.isEnabled();
			if ( isEnabled ) {
				await FunctionPage.approveTestCase();
			} else {
				await FunctionPage.checkAllTestCases();
			}
		} );

		it( 'should deactivate the approved test case', async () => {
			/**
			 * "Approve" and "Deactivate" button should be disabled as nothing is selected
			 */
			await expect( await FunctionPage.approveTestCaseButton ).toBeDisabled( { message: 'Approve button is expected to be disabled but it is enabled' } );
			await expect( await FunctionPage.deactivateTestCaseButton ).toBeDisabled( { message: 'Deactivate button is expected to be disabled but it is enabled' } );

			await expect( await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex ) ).toBe( 'Approved', { message: 'State is expected to be Approved' } );
			await FunctionPage.checkTestCasesTableRow( functionDetails.testCase.rowIndex );
			await expect( await FunctionPage.approveTestCaseButton ).toBeDisabled( { message: 'Approve button is expected to be disabled but it is enabled' } );
			await expect( await FunctionPage.deactivateTestCaseButton ).toBeEnabled( { message: 'Deactivate button is expected to be enabled but it is disabled' } );

			await FunctionPage.deactivateTestCase();
			await expect( await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex ) ).toBe( 'Deactivated', { message: 'State is expected to be Deactivated' } );
		} );

		it( 'should approve the deactivated test case', async () => {
			/**
			 * "Approve" and "Deactivate" button should be disabled as nothing is selected
			 */
			await expect( await FunctionPage.approveTestCaseButton ).toBeDisabled( { message: 'Approve button is expected to be disabled but it is enabled' } );
			await expect( await FunctionPage.deactivateTestCaseButton ).toBeDisabled( { message: 'Deactivate button is expected to be disabled but it is enabled' } );

			await expect( await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex ) ).toBe( 'Deactivated', { message: 'State is expected to be Deactivated' } );
			await FunctionPage.checkTestCasesTableRow(
				functionDetails.testCase.rowIndex );
			await expect( await FunctionPage.approveTestCaseButton ).toBeEnabled( { message: 'Approve button is expected to be enabled but it is disabled' } );
			await expect( await FunctionPage.deactivateTestCaseButton ).toBeDisabled( { message: 'Deactivate button is expected to be disabled but it is enabled' } );

			await FunctionPage.approveTestCase();
			await expect( await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex ) ).toBe( 'Approved', { message: 'State is expected to be Approved' } );
			await expect( await FunctionPage.approveTestCaseButton ).toBeDisabled( { message: 'Approve button is expected to be disabled but it is enabled' } );
			await expect( await FunctionPage.deactivateTestCaseButton ).toBeDisabled( { message: 'Deactivate button is expected to be disabled but it is enabled' } );
		} );

	} );

} );
