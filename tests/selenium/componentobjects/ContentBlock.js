/**
 * @file contains the Content block related locators and actions.
 * ContentBlock is a general component which
 * [1] Takes input about the definition/implementation related details of the ZObject
 * [2] Display the definition/implementation related details of the ZObject
 */

'use strict';
const { Element: WebdriverIOElementType } = require( 'webdriverio' );
const ElementActions = require( '../utils/ElementActions' );

class ContentBlock {
	get contentBlock() { return $( 'div.ext-wikilambda-content' ); }

	/**
	 * Get the section of the content block
	 *
	 * @param {string} label - label for the section
	 * @param {Promise<WebdriverIOElementType>} [parentSection] - Section of
	 * the content block which is parent for other section of the content block - Optional param
	 * @return {Promise<WebdriverIOElementType>}
	 */
	getSectionOfContentBlock( label, parentSection ) {
		if ( !parentSection ) {
			return this.contentBlock.$( `.//label[text()=" ${label}"]/parent::div/parent::div` );
		}
		return parentSection.$( `.//label[text()=" ${label}"]/parent::div/parent::div` );
	}

	/**
	 * Get the toggle button for the section of the content block
	 *
	 * @param {string} label - label for the section
	 * @param {Promise<WebdriverIOElementType>} [parentSection] - Section of
	 * the content block which is parent for other section of the content block - Optional param
	 * @return {Promise<WebdriverIOElementType>}
	 */
	getSectionToggleButton( label, parentSection ) {
		if ( !parentSection ) {
			return this.contentBlock.$( `.//label[text()=" ${label}"]/preceding-sibling::span` );
		}
		return parentSection.$( `.//label[text()=" ${label}"]/preceding-sibling::span` );
	}

	/**
	 * Toggle the section of the content block
	 *
	 * @async
	 * @param {string} label - label for the section
	 * @param {Promise<WebdriverIOElementType>} [parentSection] - Section of
	 * the content block which is parent for other section of the content block - Optional param
	 * @return {void}
	 */
	async toggleSection( label, parentSection ) {
		const toggleButton = this.getSectionToggleButton( label, parentSection );
		await ElementActions.doClick( toggleButton );
	}
}

module.exports = new ContentBlock();
