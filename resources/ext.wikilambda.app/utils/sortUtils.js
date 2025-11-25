/*!
 * WikiLambda Vue editor: Sorting utility functions
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const sortUtils = {
	/**
	 * Locale-aware label sort comparator.
	 * Sorts labels using a language code with base sensitivity and numeric sorting.
	 * (case-insensitive, accent-insensitive, numeric sorting).
	 *
	 * Handles numeric sorting correctly for Z{number}K{number} (e.g., Z23723K1, Z23723K2, ..., Z23723K9, Z23723K10).
	 *
	 * @param {string} langCode - Language code (e.g., 'en', 'es')
	 * @param {string} a - First label to compare
	 * @param {string} b - Second label to compare
	 * @return {number} Negative if a < b, positive if a > b, 0 if equal
	 */
	sortLabelByLocale: function ( langCode, a, b ) {
		return a.localeCompare( b, langCode, { sensitivity: 'base', numeric: true } );
	},

	/**
	 * Creates a sort comparator function for objects with a specific property.
	 * Useful for sorting arrays of objects by a property value.
	 *
	 * @param {Function} comparator - Base comparator function (e.g., sortLabelByLocale)
	 * @param {string|Function} property - Property name or function to extract value from object
	 * @return {Function} Comparator function for objects
	 */
	createPropertyComparator: function ( comparator, property ) {
		return ( a, b ) => {
			const aValue = typeof property === 'function' ? property( a ) : a[ property ];
			const bValue = typeof property === 'function' ? property( b ) : b[ property ];
			return comparator( aValue, bValue );
		};
	},

	/**
	 * Creates a locale-aware label sort comparator for objects.
	 *
	 * @param {string} langCode - Language code
	 * @param {string|Function} property - Property name or function to extract label from object
	 * @return {Function} Comparator function for objects with labels
	 */
	createLabelComparator: function ( langCode, property = 'label' ) {
		return sortUtils.createPropertyComparator(
			( a, b ) => sortUtils.sortLabelByLocale( langCode, a, b ),
			property
		);
	}
};

module.exports = sortUtils;
