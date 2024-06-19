/*!
 * Implementation page object for the WikiLambda browser test suite
 *
 * Contains the locators and actions specific to the Implementation Page.
 *
 * The page contains the following sections
 * [1] About - Display the label, description of the implementation
 * [2] Function Explorer - Display the details about the function to which implementation belongs
 * [3] Content Block contains the following section
 * [a] Implementation section display the mode of implementation
 * [b] If "Code" - Display the programming language and Code Editor display the code
 * [c] If "Composition" - Display the details about the Function call
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const { Element: WebdriverIOElementType } = require( 'webdriverio' );
const Page = require( 'wdio-mediawiki/Page' );
const ElementActions = require( '../../utils/ElementActions' );
const AboutBlock = require( '../../componentobjects/AboutBlock' );
const ContentBlock = require( '../../componentobjects/ContentBlock' );

class Implementation extends Page {
	get implementationTitleSelector() {
		return $( 'span.ext-wikilambda-viewpage-header-title--function-name' );
	}

	get editSourceLink() {
		return $( '//a[contains(@title, "Edit")]/span[contains(text(),"Edit")]' );
	}

	get contentBlock() {
		return ContentBlock.contentBlock;
	}

	// #region Header

	/**
	 * Get the title of the implementation page
	 *
	 * @async
	 * @return {string}
	 */
	async getImplementationTitle() {
		const text = await ElementActions.getText( this.implementationTitleSelector );
		return text;
	}

	// #endregion

	// #region About Block

	/**
	 * Get the implementation description
	 *
	 * @async
	 * @return {string}
	 */
	async getImplementationDescription() {
		const text = await AboutBlock.getAboutBlockDescription();
		return text;
	}

	// #endregion

	// #region Content Block

	/**
	 * Get the Content Block Function Link selector
	 *
	 * @param {string} ZObjectLabel - ZObject of type Z8
	 * @return {Promise<WebdriverIOElementType>}
	 */
	getContentBlockFunctionLinkSelector( ZObjectLabel ) {
		return this.contentBlock.$( `.//a[text()="${ ZObjectLabel }"]` );
	}

	/**
	 * Get the implementation type selector
	 *
	 * @param {string} implementationType - "code" or "composition"
	 * @return {Promise<WebdriverIOElementType>}
	 */
	getImplementationTypeSelector( implementationType ) {
		return this.contentBlock.$( '[data-testid="implementation-type"]' )
			.$( `.//span[text()="${ implementationType }"]` );
	}

	// #region Code block

	/**
	 * Get the programming language selector
	 *
	 * @param {string} language - "python" or "javascript"
	 * @return {void}
	 */
	getProgrammingLanguageSelector( language ) {
		return this.contentBlock.$( `.//span[text()="${ language }"]` );
	}

	/**
	 * Get the lines of code from the Code Editor.
	 * Each element in array represent a line of code in code editor.
	 *
	 * @async
	 * @return {Array<string>}
	 */
	async getCodeEditorLines() {
		const codeBlock = this.contentBlock.$( '[data-testid="ace-code-editor"]' );
		const code = await codeBlock.$$( './/div[contains(@class,"ace_line") and @role="option"]' );
		const lineOfCodeArray = [];
		code.forEach( async ( line ) => {
			const spans = await line.$$( 'span' );
			let lineOfCode = '';
			spans.forEach( async ( span ) => {
				const text = await ElementActions.getText( span );
				lineOfCode += text;
			} );
			lineOfCodeArray.push( lineOfCode );
		} );
		return lineOfCodeArray;
	}

	// #endregion

	// #endregion
}

module.exports = new Implementation();
