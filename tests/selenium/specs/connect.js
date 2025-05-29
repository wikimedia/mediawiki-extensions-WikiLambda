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

describe( 'Dynamic Test for Implementation and Test Case Connection', () => {

	describe( 'Admin user', () => {

		const functionDetails = {
			ZObjectLabel: 'If',
			ZId: 'Z802',
			implementation: {
				rowIndex: 0
			},
			testCase: {
				rowIndex: 0
			}
		};

		it( 'should dynamically connect or disconnect the implementation based on its initial state', async () => {
			await browser.deleteAllCookies();
			await LoginPage.loginAdmin();
			const currentUrl = await browser.getUrl();
			if ( !currentUrl.includes( 'Main_Page' ) ) {
				throw new Error( 'Login failed' );
			}

			await FunctionPage.open( functionDetails.ZId );
			await expect( await FunctionPage.functionTitle ).toHaveText( functionDetails.ZObjectLabel );

			await expect( await FunctionPage.implementationsTable ).toBeDisplayed( {
				message: 'Implementations table is not displayed'
			} );

			const initialImplementationState = await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex );

			if ( initialImplementationState === 'Connected' ) {
				await FunctionPage.checkImplementationsTableRow( functionDetails.implementation.rowIndex );
				await FunctionPage.deactivateImplementation();
				await FunctionPage.checkImplementationsTableRow( functionDetails.implementation.rowIndex );
				await FunctionPage.approveImplementation();
				await expect( await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex ) ).toBe( 'Connected', { message: 'State is expected to be Connected' } );
			} else {
				await FunctionPage.checkImplementationsTableRow( functionDetails.implementation.rowIndex );
				await FunctionPage.approveImplementation();
				await FunctionPage.checkImplementationsTableRow( functionDetails.implementation.rowIndex );
				await FunctionPage.deactivateImplementation();
				await expect( await FunctionPage.getImplementationsTableRowState( functionDetails.implementation.rowIndex ) ).toBe( 'Disconnected', { message: 'State is expected to be Disconnected' } );
			}
		} );

		it( 'should dynamically connect or disconnect the test case based on its initial state', async () => {
			await LoginPage.loginAdmin();
			const currentUrl = await browser.getUrl();
			if ( !currentUrl.includes( 'Main_Page' ) ) {
				throw new Error( 'Login failed' );
			}

			await FunctionPage.open( functionDetails.ZId );
			await expect( await FunctionPage.functionTitle ).toHaveText( functionDetails.ZObjectLabel );

			await expect( await FunctionPage.testCasesTable ).toBeDisplayed( {
				message: 'Tests table is not displayed'
			} );

			const initialTestCaseState = await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex );

			if ( initialTestCaseState === 'Connected' ) {
				await FunctionPage.checkTestCasesTableRow( functionDetails.testCase.rowIndex );
				await FunctionPage.deactivateTestCase();
				await FunctionPage.checkTestCasesTableRow( functionDetails.testCase.rowIndex );
				await FunctionPage.approveTestCase();
				await expect( await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex ) ).toBe( 'Connected', { message: 'State is expected to be Connected' } );
			} else {
				await FunctionPage.checkTestCasesTableRow( functionDetails.testCase.rowIndex );
				await FunctionPage.approveTestCase();
				await FunctionPage.checkTestCasesTableRow( functionDetails.testCase.rowIndex );
				await FunctionPage.deactivateTestCase();
				await expect( await FunctionPage.getTestCasesTableRowState( functionDetails.testCase.rowIndex ) ).toBe( 'Disconnected', { message: 'State is expected to be Disconnected' } );
			}
		} );
	} );
} );
