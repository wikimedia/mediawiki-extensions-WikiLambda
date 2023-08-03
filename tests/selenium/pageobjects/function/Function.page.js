/*!
 * Function page object for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const ElementActions = require( '../../utils/ElementActions' );
const EvaluateFunctionBlock = require( '../../componentobjects/EvaluateFunctionBlock' );
const InputDropdown = require( '../../componentobjects/InputDropdown' );
const { Element: WebdriverIOElementType } = require( 'webdriverio' );

class FunctionPage extends Page {
	get functionTitle() { return $( '.ext-wikilambda-viewpage-header-title--function-name' ); }
	get functionZIdSelector() { return $( 'span.ext-wikilambda-viewpage-header-zid' ); }
	get detailsTab() { return $( '//button[@role="tab" and span/text()="Details"]' ); }
	get showMoreLanguageButton() { return $( 'button=Show more languages' ); }
	get hideListButton() { return $( 'button=Hide list' ); }
	get editSourceLink() { return $( '//nav[@aria-label="Views"]//a[contains(@title, "Edit")]/span[contains(text(),"Edit")]' ); }
	get showNameInOtherLanguages() { return $( 'button*=Show name in other languages' ); }
	get showMoreAliases() { return $( 'button*=Show more languages' ); }
	get sidebarTable() { return $( '.ext-wikilambda-function-viewer-details-sidebar' ); }
	get createANewTestLink() { return $( 'a=Create a new test' ); }
	get createAImplementation() { return $( 'a=Create a new implementation' ); }
	get functionCallBlock() { return EvaluateFunctionBlock.functionCallBlock; }

	/**
	 * Call the function with only one parameter which is of type string.
	 *
	 * @async
	 * @param {string} param - parameters to call the function with
	 * @return {void}
	 */
	async callFunctionWithString( param ) {
		/**
		 * Input the type "String"
		 */
		const typeBlock = this.functionCallBlock.$( './/label[text()="type"]/parent::div/following-sibling::div' );
		await InputDropdown.setInputDropdown( typeBlock, typeBlock.$( './/input[@placeholder="Select a Type"]' ), 'String' );

		/**
		 * Input the param
		 */
		const valueBlock = this.functionCallBlock.$( './/label[text()="value"]/parent::div/following-sibling::div' );
		await ElementActions.setInput( valueBlock.$( './/input' ), param );

		/**
		 * call function
		 */
		await EvaluateFunctionBlock.callFunction();
	}

	/**
	 * Wait for the result of the function call
	 *
	 * @async
	 * @return {void}
	 */
	async waitForResult() {
		await EvaluateFunctionBlock.waitForResult();
	}

	/**
	 * Get the result selector of the Evaluate Function Block
	 *
	 * @async
	 * @param {string} result - expected result
	 * @return {WebdriverIOElementType}
	 */
	async getEvaluateFunctionResultSelector( result ) {
		return EvaluateFunctionBlock.orchestrationResultBlock.$( `.//p[text()="${result}"]` );
	}

	getArgumentLabel( label ) {
		return $( `td=${label}` );
	}

	async getInputType( inputTypeLabel, inputType ) {
		const row = await this.sidebarTable.$( `td=${inputTypeLabel}` ).parentElement();
		const type = await row.$( `a=${inputType}` );
		return type;
	}

	async getOutputType( outputTypeLabel, outputType ) {
		const row = await this.sidebarTable.$( `td=${outputTypeLabel}` ).parentElement();
		const type = await row.$( `a=${outputType}` );
		return type;
	}

	getNameInOtherLanguage( name ) {
		return $( '.ext-wikilambda-function-viewer-names' ).$( `div*=${name}` );
	}

	getAliasLabel( label ) {
		return $( '.ext-wikilambda-function-about__aliases' ).$( `div*=${label}` );
	}

	/**
	 * Get the ZId of the function page
	 *
	 * @async
	 * @return {string}
	 */
	async getFunctionZId() {
		const text = await ElementActions.getText( this.functionZIdSelector );
		return text;
	}

	/**
	 * Click on the "edit" link
	 *
	 * @async
	 * @return {void}
	 */
	async clickOnEditSourceLink() {
		/**
		 * Temporary workaround to open the edit form.
		 * Clicking on "edit" link sometimes do not open the edit form.
		 */
		const ZId = await this.getFunctionZId();
		super.openTitle( ZId, { action: 'edit' } );
	}

	/**
	 * Open the Function page
	 *
	 * @async
	 * @param {string} ZId - ZObject of type Z4
	 */
	async open( ZId ) {
		await super.openTitle( ZId );
	}

	/**
	 * Click on the detials tab
	 *
	 * @async
	 * @return {void}
	 */
	async switchToDetailsTab() {
		await ElementActions.doClick( this.detailsTab );
	}

	/**
	 * Click on the "Create a new test" link
	 *
	 * @async
	 * @return {void}
	 */
	async goToCreateNewTestLink() {
		await ElementActions.doClick( this.createANewTestLink );
	}

	/**
	 * Click on the "Create a new implementation" link
	 *
	 * @async
	 * @return {void}
	 */
	async goToCreateImplementationLink() {
		await ElementActions.doClick( this.createAImplementation );
	}

	// #region Implementations Table

	get implementationsTableBlock() { return $( '//div[@aria-labelledby="ext-wikilambda-function-details-table__title__text-implementations"]' ); }
	get implementationsTableBlockHeader() { return this.implementationsTableBlock.$( './/div[contains(@class,"ext-wikilambda-table__title")]' ); }
	get implementationProgressBar() { return this.implementationsTableBlock.$( './div[@role="progressbar"]' ); }
	get implementationsTable() { return this.implementationsTableBlock.$( './/div[contains(@class,"ext-wikilambda-table__body")]//table' ); }
	get approveImplementationButton() { return this.implementationsTableBlockHeader.$( './/label[text()="Approve"]/parent::button' ); }
	get deactivateImplementationButton() { return this.implementationsTableBlockHeader.$( './/label[text()="Deactivate"]/parent::button' ); }

	/**
	 * Click on the "Approve" button in the implementations table
	 *
	 * @async
	 * @return {void}
	 */
	async approveImplementation() {
		await ElementActions.doEnabledClick( this.approveImplementationButton );
		await browser.waitUntil( async () => {
			const progressBar = await this.implementationProgressBar;
			return ( await progressBar.isExisting() ) === false;
		}, { timeoutMssg: 'Approving the implementation taking too long' } );
	}

	/**
	 * Click on the "Deactivate" button in the implementations table
	 *
	 * @async
	 * @return {void}
	 */
	async deactivateImplementation() {
		await ElementActions.doEnabledClick( this.deactivateImplementationButton );
		await browser.waitUntil( async () => {
			const progressBar = await this.implementationProgressBar;
			return ( await progressBar.isExisting() ) === false;
		}, { timeoutMssg: 'Deactivating the implementation taking too long' } );
	}

	/**
	 * Get the row of the implementations table
	 *
	 * @param {number} index - index of the row in the table body
	 * @return {WebdriverIOElementType}
	 */
	getImplementationsTableRow( index ) {
		const tbody = this.implementationsTable.$( './tbody' );
		return tbody.$$( './tr' )[ index ];
	}

	/**
	 * Get the state of the Implementation
	 *
	 * @async
	 * @param {number} index - index of the row in the table body
	 * @return {string} - "Approved" or "Deactivated"
	 */
	async getImplementationsTableRowState( index ) {
		const stateColumn = this.getImplementationsTableRow( index ).$$( './td' )[ 3 ];
		const stateSelector = stateColumn.$( './/span[text()="Approved" or text()="Deactivated"]' );
		const state = await ElementActions.getText( stateSelector );
		return state;
	}

	/**
	 * Click on the check box of the row of the implementations table
	 *
	 * @async
	 * @param {number} index - index of the row in the table body
	 * @return {void}
	 */
	async checkImplementationsTableRow( index ) {
		const checkBox = this.getImplementationsTableRow( index ).$$( './td' )[ 0 ].$( './/input/following-sibling::span' );
		await ElementActions.doClick( checkBox );
	}

	/**
	 * Check all the row of implementations table by clicking
	 * on the checkbox in the table head
	 *
	 * @async
	 * @return {void}
	 */
	async checkAllImplementations() {
		const thead = this.implementationsTable.$$( './thead/tr' )[ 0 ];
		const checkBox = thead.$$( './th' )[ 0 ].$( './/input/following-sibling::span' );
		await ElementActions.doClick( checkBox );
	}

	// #endregion

	// #region Test cases Table

	get testCasesTableBlock() { return $( '//div[@aria-labelledby="ext-wikilambda-function-details-table__title__text-testers"]' ); }
	get testCasesTableBlockHeader() { return this.testCasesTableBlock.$( './/div[contains(@class,"ext-wikilambda-table__title")]' ); }
	get testCaseProgressBar() { return this.testCasesTableBlock.$( './div[@role="progressbar"]' ); }
	get testCasesTable() { return this.testCasesTableBlock.$( './/div[contains(@class,"ext-wikilambda-table__body")]//table' ); }
	get approveTestCaseButton() { return this.testCasesTableBlockHeader.$( './/label[text()="Approve"]/parent::button' ); }
	get deactivateTestCaseButton() { return this.testCasesTableBlockHeader.$( './/label[text()="Deactivate"]/parent::button' ); }

	/**
	 * Click on the "Approve" button in the test cases table
	 *
	 * @async
	 * @return {void}
	 */
	async approveTestCase() {
		await ElementActions.doEnabledClick( this.approveTestCaseButton );
		await browser.waitUntil( async () => {
			const progressBar = await this.testCaseProgressBar;
			return ( await progressBar.isExisting() ) === false;
		}, { timeoutMssg: 'Approving the test case taking too long' } );
	}

	/**
	 * Click on the "Deactivate" button in the test cases table
	 *
	 * @async
	 * @return {void}
	 */
	async deactivateTestCase() {
		await ElementActions.doEnabledClick( this.deactivateTestCaseButton );
		await browser.waitUntil( async () => {
			const progressBar = await this.testCaseProgressBar;
			return ( await progressBar.isExisting() ) === false;
		}, { timeoutMssg: 'Deactivating the test case taking too long' } );
	}

	/**
	 * Get the row of the test cases table
	 *
	 * @param {number} index - index of the row in the table body
	 * @return {WebdriverIOElementType}
	 */
	getTestCasesTableRow( index ) {
		const tbody = this.testCasesTable.$( './tbody' );
		return tbody.$$( './tr' )[ index ];
	}

	/**
	 * Get the state of the test case
	 *
	 * @async
	 * @param {number} index - index of the row in the table body
	 * @return {string} - "Approved" or "Deactivated"
	 */
	async getTestCasesTableRowState( index ) {
		const stateColumn = this.getTestCasesTableRow( index ).$( 'td:last-child' );
		const stateSelector = stateColumn.$( './/span[text()="Approved" or text()="Deactivated"]' );
		const state = await ElementActions.getText( stateSelector );
		return state;
	}

	/**
	 * Click on the check box of the row of the test cases table
	 *
	 * @async
	 * @param {number} index - index of the row in the table body
	 * @return {void}
	 */
	async checkTestCasesTableRow( index ) {
		const checkBox = this.getTestCasesTableRow( index ).$$( './td' )[ 0 ].$( './/input/following-sibling::span' );
		await ElementActions.doClick( checkBox );
	}

	/**
	 * Check all the row of test cases table by clicking
	 * on the checkbox in the table head
	 *
	 * @async
	 * @return {void}
	 */
	async checkAllTestCases() {
		const thead = this.testCasesTable.$$( './thead/tr' )[ 0 ];
		const checkBox = thead.$$( './th' )[ 0 ].$( './/input/following-sibling::span' );
		await ElementActions.doClick( checkBox );
	}

	// #endregion
}

module.exports = new FunctionPage();
