/**
 * Tester page object for the WikiLambda browser test suite
 *
 * Contains the locators and actions specific to the Tester Page.
 *
 * The page contains the following sections
 * [1] About - Display the label, description of the test
 * [2] Function Explorer - Display the details about the function to which test belongs
 * [3] Content Block - It is further divided into
 * [a] Call - Makes the Function call
 * [b] Result Validation - Validates the output of the Call
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const ElementActions = require( '../../utils/ElementActions' );
const AboutBlock = require( '../../componentobjects/AboutBlock' );
const { Element: WebdriverIOElementType } = require( 'webdriverio' );
const ContentBlock = require( '../../componentobjects/ContentBlock' );

class Tester extends Page {
	get testerTitleSelector() {
		return $( 'span.ext-wikilambda-viewpage-header__title' );
	}

	get testerZIdSelector() {
		return $( 'span.ext-wikilambda-viewpage-header__zid' );
	}

	get contentBlock() {
		return ContentBlock.contentBlock;
	}

	get callFunctionBlock() {
		return this.contentBlock.$( '[data-testid="tester-call"]' );
	}

	get validationBlock() {
		return this.contentBlock.$( '[data-testid="tester-validation"]' );
	}

	get editSourceLink() {
		return $( '//nav[@aria-label="Views"]//a[contains(@title, "Edit")]/span[contains(text(),"Edit")]' );
	}

	// #region Header

	/**
	 * Get the title of the tester page
	 *
	 * @async
	 * @return {string}
	 */
	async getTesterTitle() {
		const text = await ElementActions.getText( this.testerTitleSelector );
		return text;
	}

	/**
	 * Get the ZId of the tester page
	 *
	 * @async
	 * @return {string}
	 */
	async getTesterZId() {
		const text = await ElementActions.getText( this.testerZIdSelector );
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
		const ZId = await this.getTesterZId();
		return super.openTitle( ZId, { action: 'edit' } );
	}

	// #endregion

	// #region About Block

	/**
	 * Get the tester description visible in the About widget.
	 *
	 * NOTE: this assumes that there will only be one language accordion
	 * loaded into the About widget, and it will be open.
	 * This will happen automatically when navigating to a read page
	 * of an object that has available labels in the user language,
	 * which is the case for the cases described in these tess.
	 *
	 * @async
	 * @return {string}
	 */
	async getTesterDescription() {
		const text = await AboutBlock.getAboutBlockDescription();
		return text;
	}

	// #endregion

	// #region Call Function Block

	/**
	 * Toggle Call Function Block
	 *
	 * @async
	 * @return {void}
	 */
	async toggleCallFunctionBlock() {
		await ContentBlock.toggleSectionOnlyChild( this.callFunctionBlock );
	}

	/**
	 * Get the section of the call function block depending on the label
	 *
	 * @param {string} label - label for the section
	 * @return {Promise<WebdriverIOElementType>}
	 */
	getCallFunctionBlockSection( label ) {
		return ContentBlock.getSectionOfContentBlock( label, this.callFunctionBlock );
	}

	/**
	 * Get the call function condition parameter
	 *
	 * @param {string} condition
	 * @return {WebdriverIOElementType}
	 */
	async getCallFunctionConditionParameter( condition ) {
		const conditionParameterBlock = await this.getCallFunctionBlockSection( 'condition' );
		return await conditionParameterBlock.$( `a=${ condition }` );
	}

	/**
	 * Get the call function then parameter
	 *
	 * @param {string} thenInput
	 * @return {WebdriverIOElementType}
	 */
	async getCallFunctionThenParameter( thenInput ) {
		const thenParameterBlock = await this.getCallFunctionBlockSection( 'then' );
		return await thenParameterBlock.$( `[data-testid="view-only-string"]*=${ thenInput }` );
	}

	/**
	 * Get the call function else parameter
	 *
	 * @param {string} elseInput
	 * @return {WebdriverIOElementType}
	 */
	async getCallFunctionElseParameter( elseInput ) {
		const elseParameterBlock = await this.getCallFunctionBlockSection( 'else' );
		return await elseParameterBlock.$( `[data-testid="view-only-string"]*=${ elseInput }` );
	}

	// #endregion

	// #region Validation block

	/**
	 * Toggle validation block
	 *
	 * @async
	 * @return {void}
	 */
	async toggleValidationBlock() {
		await ContentBlock.toggleSectionOnlyChild( this.validationBlock );
	}

	/**
	 * Get the section of the validation block depending on the label
	 *
	 * @param {string} label - label for the section
	 * @return {Promise<WebdriverIOElementType>}
	 */
	getValidationBlockSection( label ) {
		return ContentBlock.getSectionOfContentBlock( label, this.validationBlock );
	}

	/**
	 * Get the validation block second string parameter
	 *
	 * @param {string} secondStringTrue
	 * @return {WebdriverIOElementType}
	 */
	async getValidationParameter( secondStringTrue ) {
		const validationParameterBlock = await this.getValidationBlockSection( 'second string' );
		return await validationParameterBlock.$( `[data-testid="view-only-string"]*=${ secondStringTrue }` );
	}

	/**
	 * Get the validation block function
	 *
	 * @param {string} ZObjectLabel
	 * @return {WebdriverIOElementType}
	 */
	async getValidationBlockFunction( ZObjectLabel ) {
		const validationBlockFunction = await this.getValidationBlockSection( 'function' );
		return await validationBlockFunction.$( `[data-testid="edit-link"]=${ ZObjectLabel }` );
	}

	// #endregion
}

module.exports = new Tester();
