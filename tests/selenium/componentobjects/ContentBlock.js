/*!
 * ContentBlock Component Object for WikiLambda browser test suite
 *
 * Contains the Content block related locators and actions.
 *
 * ContentBlock is a general component which
 * [1] Takes input about the definition/implementation related details of the ZObject
 * [2] Display the definition/implementation related details of the ZObject
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const { Element: WebdriverIOElementType } = require( 'webdriverio' );
const ElementActions = require( '../utils/ElementActions' );

class ContentBlock {
	get contentBlock() { return $( 'div.ext-wikilambda-content' ); }

	// #region

	/**
	 * Here, the section strictly refers to that section of the content block which has
	 * the label as " label" i.e. space before the label text
	 */

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
			return this.contentBlock.$( `.//label[text()="${label}"]/parent::div/parent::div` );
		}
		return parentSection.$( `.//label[text()="${label}"]/parent::div/parent::div` );
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
			return this.getSectionOfContentBlock( label ).$( './preceding-sibling::div[contains(@class,"ext-wikilambda-key-value-pre")]' );
		}
		return this.getSectionOfContentBlock( label, parentSection ).$( './preceding-sibling::div[contains(@class,"ext-wikilambda-key-value-pre")]' );
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

	/**
	 * Toggle the only child of the section of the content block
	 *
	 * @async
	 * @param {Promise<WebdriverIOElementType>} section - Section of
	 * the content block
	 * @return {void}
	 */
	async toggleSectionOnlyChild( section ) {
		await ElementActions.doClick( section.$( './/button[@aria-label="Toggle"]' ) );
	}

	// #endregion
}

module.exports = new ContentBlock();
