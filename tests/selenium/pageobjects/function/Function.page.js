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
const AboutBlock = require( '../../componentobjects/AboutBlock' );
const InputDropdown = require( '../../componentobjects/InputDropdown' );
const { Element: WebdriverIOElementType } = require( 'webdriverio' );
const i18n = require( '../../utils/i18n.js' )();

class FunctionPage extends Page {

	/**
	 * Open the Function page
	 *
	 * @async
	 * @param {string} ZId - ZObject of type Z4
	 */
	async open( ZId ) {
		await super.openTitle( ZId );
	}

	// #region Header Section

	get functionTitle() {
		return $( '.ext-wikilambda-viewpage-header__title' );
	}

	get functionZIdSelector() {
		return $( 'span.ext-wikilambda-viewpage-header__zid' );
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
		return super.openTitle( ZId, { action: 'edit' } );
	}

	// #endregion Header Section

	// #region About Widget

	get aboutBlock() {
		return AboutBlock.aboutBlock;
	}

	async getFunctionAliases() {
		const aliases = await AboutBlock.getAboutBlockAliases();
		return aliases;
	}

	async getFunctionInputBlocks() {
		const inputs = await this.aboutBlock.$$( '.ext-wikilambda-app-about-language-block__input' );
		return inputs;
	}

	async getFunctionInputLabel( inputSelector ) {
		const inputLabel = await inputSelector.$( '.ext-wikilambda-app-about-language-block__input-label' );
		const text = ElementActions.getText( inputLabel );
		return text;
	}

	async getFunctionInputType( inputSelector ) {
		const inputType = await inputSelector.$( '.ext-wikilambda-app-object-to-string' );
		const text = ElementActions.getText( inputType );
		return text;
	}

	async getFunctionOutputType() {
		const outputBlock = await this.aboutBlock.$( '.ext-wikilambda-app-about-language-block__output' );
		const outputType = await outputBlock.$( '.ext-wikilambda-app-object-to-string' );
		const text = ElementActions.getText( outputType );
		return text;
	}

	// #endregion About Widget

	// #region Evaluate Function Block

	get functionCallBlock() {
		return EvaluateFunctionBlock.functionCallBlock;
	}

	get functionResultBlock() {
		return EvaluateFunctionBlock.orchestrationResultBlock;
	}

	async getValueBlock() {
		const typeLabel = await $( ".//label[text()='type']" ).parentElement();
		const valueBlock = await typeLabel.nextElement();
		return valueBlock;
	}

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
		const functionCallBlock = await this.functionCallBlock;
		const typeBlock = await functionCallBlock.$( './/label[span/text()="type"]/parent::div/following-sibling::div' );

		const typeInput = await typeBlock.$( 'input' );
		await InputDropdown.setLookupOption( typeBlock, typeInput, 'String' );
		/**
		 * Input the param
		 */
		const valueBlock = await functionCallBlock.$( './/label[span/text()="input"]/parent::div/following-sibling::div' );
		const valueInput = await valueBlock.$( './/input' );
		await ElementActions.setInput( valueInput, param );
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
		return EvaluateFunctionBlock.orchestrationResultBlock.$( `//*[@data-testid="view-only-string" and contains(text(), "${ result }")]` );
	}

	// #endregion Evaluate Function Block

	// #endregion About Section

	// #region Details Section

	// #region Details Sidebar

	/**
	 * Click on the "Add test" link
	 *
	 * @async
	 * @return {void}
	 */
	async goToCreateNewTestLink() {
		await this.testCasesTableBlock.waitForExist();
		await this.addTestButton.waitForClickable();
		await ElementActions.doClick( this.addTestButton );
		await this.aboutBlock.waitForExist();
	}

	/**
	 * Click on the "Add implementation" link
	 *
	 * @async
	 * @return {void}
	 */
	async goToCreateImplementationLink() {
		await this.implementationsTableBlock.waitForExist();
		await ElementActions.doClick( this.addImplementationButton );
	}

	// #endregion Details Sidebar

	// #region Implementations Table

	get implementationsTableBlock() {
		return $( '[data-testid="function-implementations-table"]' );
	}

	get addImplementationButton() {
		return this.implementationsTableBlock.$( 'a[data-testid="add-link"]' );
	}

	get implementationProgressBar() {
		return this.implementationsTableBlock.$( './div[@role="progressbar"]' );
	}

	get implementationsTable() {
		return this.implementationsTableBlock.$( 'table' );
	}

	get approveImplementationButton() {
		return this.implementationsTableBlock.$( 'button[data-testid="connect"]' );
	}

	get deactivateImplementationButton() {
		return this.implementationsTableBlock.$( 'button[data-testid="disconnect"]' );
	}

	/**
	 * Click on the "Connect" button in the implementations table
	 *
	 * @async
	 * @return {void}
	 */
	async approveImplementation() {
		await this.approveImplementationButton.waitForDisplayed();
		await ElementActions.doEnabledClick( this.approveImplementationButton );
		await browser.waitUntil( async () => {
			const progressBar = await this.implementationProgressBar;
			return ( await progressBar.isExisting() ) === false;
		}, { timeoutMsg: 'Approving the implementation taking too long' } );
	}

	/**
	 * Click on the "Disconnect" button in the implementations table
	 *
	 * @async
	 * @return {void}
	 */
	async deactivateImplementation() {
		await this.deactivateImplementationButton.waitForDisplayed();
		await ElementActions.doEnabledClick( this.deactivateImplementationButton );
		await browser.waitUntil( async () => {
			const progressBar = await this.implementationProgressBar;
			return ( await progressBar.isExisting() ) === false;
		}, { timeoutMsg: 'Deactivating the implementation taking too long' } );
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
	 * @return {string} - "Connected" or "Disconnected"
	 */
	async getImplementationsTableRowState( index ) {
		const stateColumn = await this.getImplementationsTableRow( index ).$$( './td' )[ 2 ];
		await stateColumn.waitForDisplayed();
		const stateSelector = stateColumn.$( `.//span[text()="${ i18n[ 'wikilambda-function-implementation-state-approved' ] }" or text()="${ i18n[ 'wikilambda-function-implementation-state-deactivated' ] }"]` );
		await stateSelector.waitForDisplayed();
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
		const tableRow = this.getImplementationsTableRow( index );
		const checkBox = await tableRow.$( './td[1]//input' );
		await this.approveImplementationButton.waitForExist( { timeout: 10000, reverse: true } );
		await checkBox.click();
	}

	// #endregion Implementations Table

	// #region Tests Table

	get testCasesTableBlock() {
		return $( '[data-testid="function-testers-table"]' );
	}

	get addTestButton() {
		return this.testCasesTableBlock.$( 'a[data-testid="add-link"]' );
	}

	get testCasesTableBlockHeader() {
		return this.testCasesTableBlock.$( './/div[contains(@class,"ext-wikilambda-app-table__title")]' );
	}

	get testCaseProgressBar() {
		return this.testCasesTableBlock.$( './div[@role="progressbar"]' );
	}

	get testCasesTable() {
		return this.testCasesTableBlock.$( "[data-testid='function-testers-table'] table" );
	}

	get approveTestCaseButton() {
		return this.testCasesTableBlock.$( 'button[data-testid="connect"]' );
	}

	get deactivateTestCaseButton() {
		return this.testCasesTableBlock.$( 'button[data-testid="disconnect"]' );
	}

	/**
	 * Click on the "Connect" button in the test cases table
	 *
	 * @async
	 * @return {void}
	 */
	async approveTestCase() {
		await ElementActions.doEnabledClick( this.approveTestCaseButton );
		await browser.waitUntil( async () => {
			const progressBar = await this.testCaseProgressBar;
			return ( await progressBar.isExisting() ) === false;
		}, { timeoutMsg: 'Approving the test case taking too long' } );
	}

	/**
	 * Click on the "Disconnect" button in the test cases table
	 *
	 * @async
	 * @return {void}
	 */
	async deactivateTestCase() {
		await ElementActions.doEnabledClick( this.deactivateTestCaseButton );
		await browser.waitUntil( async () => {
			const progressBar = await this.testCaseProgressBar;
			return ( await progressBar.isExisting() ) === false;
		}, { timeoutMsg: 'Deactivating the test case taking too long' } );
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
	 * @return {string} - "Connected" or "Disconnected"
	 */
	async getTestCasesTableRowState( index ) {
		const stateColumn = this.getTestCasesTableRow( index ).$$( 'td' )[ 2 ];
		const stateSelector = stateColumn.$( `.//span[text()="${ i18n[ 'wikilambda-function-implementation-state-approved' ] }" or text()="${ i18n[ 'wikilambda-function-implementation-state-deactivated' ] }"]` );
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
		const tableRow = this.getTestCasesTableRow( index );
		const checkBox = await tableRow.$( './td[1]//input' );
		await this.approveTestCaseButton.waitForExist( { timeout: 10000, reverse: true } );
		await checkBox.click();
	}

	// #endregion Tests Table

	// #endregion Details Section
}

module.exports = new FunctionPage();
