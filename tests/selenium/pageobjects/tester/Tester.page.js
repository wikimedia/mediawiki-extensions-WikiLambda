/**
 * @file contains the locators and actions specific to the Tester Page.
 * The page contains the following sections
 * [1] About - Display the label, description of the test
 * [2] Function Explorer - Display the details about the function to which test belongs
 * [3] Content Block - It is further divided into
 * [a] Call - Makes the Function call
 * [b] Result Validation - Validates the output of the Call
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const ElementActions = require( '../../utils/ElementActions' );
const AboutBlock = require( '../../componentobjects/AboutBlock' );
const { Element: WebdriverIOElementType } = require( 'webdriverio' );
const ContentBlock = require( '../../componentobjects/ContentBlock' );

class Tester extends Page {
	get testerTitleSelector() { return $( 'span.ext-wikilambda-viewpage-header-title--function-name' ); }
	get testerZIdSelector() { return $( 'span.ext-wikilambda-viewpage-header-zid' ); }
	get contentBlock() { return ContentBlock.contentBlock; }
	get callFunctionBlock() { return this.contentBlock.$( '//div[@role="ext-wikilambda-tester-call"]' ); }
	get validationBlock() { return this.contentBlock.$( '//div[@role="ext-wikilambda-tester-validation"]' ); }
	get editSourceLink() { return $( '//a[contains(@title, "Edit this page")]' ); }

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
	 * Click on the edit source link
	 *
	 * @async
	 * @return {void}
	 */
	async clickOnEditSourceLink() {
		await ElementActions.doClick( this.editSourceLink );
	}

	// #endregion

	// #region About Block

	/**
	 * Get the tester label
	 *
	 * @async
	 * @return {string}
	 */
	async getTesterLabel() {
		const text = await AboutBlock.getAboutBlockLabel();
		return text;
	}

	/**
	 * Get the tester description
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
		await ContentBlock.toggleSection( 'call', this.callFunctionBlock );
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
	getCallFunctionConditionParameter( condition ) {
		return this.getCallFunctionBlockSection( 'condition' ).$( `a=${condition}` );
	}

	/**
	 * Get the call function then parameter
	 *
	 * @param {string} thenInput
	 * @return {WebdriverIOElementType}
	 */
	getCallFunctionThenParameter( thenInput ) {
		return this.getCallFunctionBlockSection( 'then' ).$( `p=${thenInput}` );
	}

	/**
	 * Get the call function else parameter
	 *
	 * @param {string} elseInput
	 * @return {WebdriverIOElementType}
	 */
	getCallFunctionElseParameter( elseInput ) {
		return this.getCallFunctionBlockSection( 'else' ).$( `p=${elseInput}` );
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
		await ContentBlock.toggleSection( 'result validation', this.validationBlock );
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
	getValidationParameter( secondStringTrue ) {
		return this.getValidationBlockSection( 'second string' ).$( `p=${secondStringTrue}` );
	}

	/**
	 * Get the validation block function
	 *
	 * @param {string} ZObjectLabel
	 * @return {WebdriverIOElementType}
	 */
	getValidationBlockFunction( ZObjectLabel ) {
		return this.getValidationBlockSection( 'function' ).$( `a=${ZObjectLabel}` );
	}

	// #endregion
}

module.exports = new Tester();
