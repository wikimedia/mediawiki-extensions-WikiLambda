/**
 * Type page object for the WikiLambda browser test suite
 *
 * Contains the locators and actions specific to the Type Page.
 *
 * The page contains the following sections
 * [1] About - Display the label, description of the type
 * [2] Content Block - It is further divided into
 * [a] Keys Block - Display the Type definition
 * [b] Validator Block - Display the validator of the type
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const Page = require( 'wdio-mediawiki/Page' );
const ElementActions = require( '../../utils/ElementActions' );
const AboutBlock = require( '../../componentobjects/AboutBlock' );
const ContentBlock = require( '../../componentobjects/ContentBlock' );
const { Element: WebdriverIOElementType } = require( 'webdriverio' );

class Type extends Page {
	get typeTitleSelector() { return $( 'span.ext-wikilambda-viewpage-header-title--function-name' ); }
	get typeZIdSelector() { return $( 'span.ext-wikilambda-viewpage-header-zid' ); }

	// #region Header

	/**
	 * Get the title of the type page
	 *
	 * @async
	 * @return {string}
	 */
	async getTypeTitle() {
		return await ElementActions.getText( this.typeTitleSelector );
	}

	/**
	 * Get the ZId of the type page
	 *
	 * @async
	 * @return {string}
	 */
	async getTypeZId() {
		return await ElementActions.getText( this.typeZIdSelector );
	}

	/**
	 * Open the "Edit" source
	 *
	 * @async
	 * @return {void}
	 */
	async openEditSource() {
		/**
		 * Temporary workaround to open the edit form.
		 * Clicking on "edit" link sometimes do not open the edit form.
		 */
		const ZId = await this.getTypeZId();
		super.openTitle( ZId, { action: 'edit' } );
	}

	// #endregion

	// #region About Block

	/**
	 * Get the type label
	 *
	 * @async
	 * @return {string}
	 */
	async getTypeLabel() {
		return await AboutBlock.getAboutBlockLabel();
	}

	/**
	 * Get the type description
	 *
	 * @async
	 * @return {string}
	 */
	async getTypeDescription() {
		return await AboutBlock.getAboutBlockDescription();
	}

	// #endregion

	// #region Keys Block

	get keysBlock() {
		return ContentBlock.getSectionOfContentBlock( 'keys' );
	}

	/**
	 * Declare the object type: KeysBlockEntry
	 *
	 * @typedef {Object} Text
	 * @property {string} language
	 * @property {string} languageShortName
	 * @property {string} text
	 *
	 * @typedef {Object} KeysBlockEntry
	 * @property {number} index
	 * @property {string} valueType
	 * @property {string} keyId
	 * @property {Array<Text>} textArray
	 */

	/**
	 * Get the value type selector, key id selector and array of
	 * text's item selectors
	 *
	 * @async
	 * @param {KeysBlockEntry} expectedKeysBlockEntry
	 * @return {Array<WebdriverIOElementType>}
	 */
	async getKeysBlockItemSelectors( expectedKeysBlockEntry ) {
		const { index, valueType, keyId, textArray } = expectedKeysBlockEntry;
		const keysBlockItem = await this.keysBlock.$$( './/label[contains(text(),"Item")]/parent::div/parent::div' )[ index ];

		const valueTypeBlock = ContentBlock.getSectionOfContentBlock( 'value type', keysBlockItem );
		const valueTypeSelector = await valueTypeBlock.$( `.//a[text()="${valueType}"]` );

		const keyIdBlock = ContentBlock.getSectionOfContentBlock( 'key id', keysBlockItem );
		const keyIdSelector = await keyIdBlock.$( `.//p[text()="${keyId}"]` );

		const labelBlock = ContentBlock.getSectionOfContentBlock( 'label', keysBlockItem );
		const textsBlock = ContentBlock.getSectionOfContentBlock( 'texts', labelBlock );
		const textItemArray = [];
		for ( const i in textArray ) {
			const item = await textsBlock.$$( './/div[@data-testid="z-object-key-value"]' )[ i ];
			const languageSelector = await item.$( `.//span[text()="${textArray[ i ].languageShortName}"]` );
			const textSelector = await item.$( `.//p[contains(text(),"${textArray[ i ].text}")]` );

			textItemArray.push(
				{
					languageSelector, textSelector
				}
			);
		}
		return [ valueTypeSelector, keyIdSelector, textItemArray ];
	}

	// #endregion

	// #region Validator Block

	get validatorBlock() {
		return ContentBlock.getSectionOfContentBlock( 'validator' );
	}

	/**
	 * Get the validator of the type
	 *
	 * @async
	 * @param {string} validator
	 * @return {WebdriverIOElementType}
	 */
	getValidatorSelector( validator ) {
		return this.validatorBlock.$( `.//a[text()="${validator}"]` );
	}

	// #endregion
}

module.exports = new Type();
