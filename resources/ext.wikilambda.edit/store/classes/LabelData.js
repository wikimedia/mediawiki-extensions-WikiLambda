/*!
 * WikiLambda LabelData class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

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
 */
class LabelData {
	constructor( zid, label, lang ) {
		this.zid = zid;
		this.label = label;
		this.lang = lang;
	}
}

module.exports = exports = LabelData;
