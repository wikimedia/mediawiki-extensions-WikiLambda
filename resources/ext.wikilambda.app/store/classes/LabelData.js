/*!
 * WikiLambda LabelData class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { isValidZidFormat } = require( '../../utils/typeUtils.js' );

/**
 * LabelData class contains the information of a localized label.
 * This is the type of object that's saved in the global store and
 * is returned by the getter getLabelData to those components that
 * need not only the string label of a key, but also the language
 * of the available label.
 *
 * @class
 * @property {string} zid ID of a ZPersistentObject, ZKey or ZArgumentDeclaration
 * @property {string} label
 * @property {string} lang ZID of the ZNaturalLanguage object that identifies the
 *     language the label is in
 * @property {string} langCode language code corresponding to the lang ZID
 * @property {string} langDir language directionality corresponding to the language
 */
class LabelData {
	constructor( zid, label, lang, langCode = null ) {
		this.zid = zid;
		this.label = label;
		this.lang = lang;

		// Set language code and directionality
		if ( langCode ) {
			this.setLangCode( langCode );
		}
	}

	/**
	 * Sets the language code and finds its directionality using ULS jquery library
	 *
	 * @param {string} langCode
	 */
	setLangCode( langCode ) {
		this.langCode = langCode;
		this.langDir = ( langCode && $.uls ) ? $.uls.data.getDir( langCode ) : '';
	}

	/**
	 * Returns whether the zid has no label (zid and label are equal)
	 *
	 * @return {boolean}
	 */
	get isUntitled() {
		return this.zid === this.label;
	}

	/**
	 * Returns the label only if it's set. Else, returns the default string
	 * for untitled objects
	 *
	 * @return {string}
	 */
	get labelOrUntitled() {
		return this.isUntitled ?
			this.untitledString :
			this.label;
	}

	/**
	 * Returns 'untitled' for Zids, or 'unlabelled' for others
	 *
	 * @return {string}
	 */
	get untitledString() {
		return isValidZidFormat( this.zid ) ?
			mw.message( 'wikilambda-editor-default-name' ).text() :
			mw.message( 'wikilambda-about-widget-unlabelled-input' ).text();
	}

	/**
	 * Build a LabelData object from a non localized string.
	 *
	 * @param {string} text
	 * @param {string|undefined} langZid
	 * @param {string|undefined} langCode
	 * @return {LabelData}
	 */
	static fromString( text, langZid = null, langCode = null ) {
		return new LabelData( null, text, langZid, langCode );
	}
}

module.exports = exports = LabelData;
