/*!
 * WikiLambda unit test suite jQuery helpers
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

function createJQueryZObjectPageTitleMocks() {
	global.$ = jest.fn();

	const $pageTitle = {
		text: jest.fn().mockReturnThis(),
		toggleClass: jest.fn().mockReturnThis()
	};

	const $langChip = {
		text: jest.fn().mockReturnThis(),
		toggleClass: jest.fn().mockReturnThis(),
		attr: jest.fn().mockReturnThis()
	};

	const $firstHeading = {
		find: jest.fn().mockImplementation( ( selector ) => {
			if ( selector === '.ext-wikilambda-editpage-header__title--function-name' ) {
				return {
					first: jest.fn().mockReturnValue( $pageTitle )
				};
			} else if ( selector === '.ext-wikilambda-editpage-header__bcp47-code-name' ) {
				return $langChip;
			}
		} )
	};

	$.mockImplementation( ( selector ) => {
		if ( selector === '#firstHeading' ) {
			return $firstHeading;
		}
	} );

	return { $pageTitle, $langChip };
}

/**
 * Creates jQuery mocks for updateAbstractPageTitle tests.
 * The mock simulates the PHP-rendered editpage-header wrapper structure.
 *
 * @param {boolean} [hasQidSpan=false] Whether a pre-existing QID chip span is present
 * @return {Object} { $firstHeading, $titleSpan, $qidSpan, $wrapper, $newSpan }
 */
function createJQueryAbstractCreateTitleMocks( hasQidSpan = false ) {
	global.$ = jest.fn();

	const $titleSpan = {
		text: jest.fn().mockReturnThis()
	};

	const $qidSpan = {
		text: jest.fn().mockReturnThis(),
		length: hasQidSpan ? 1 : 0
	};

	const $wrapper = {
		append: jest.fn().mockReturnThis()
	};

	// Chainable mock for newly created <span> elements
	const $newSpan = {
		addClass: jest.fn().mockReturnThis(),
		attr: jest.fn().mockReturnThis(),
		text: jest.fn().mockReturnThis()
	};

	const $firstHeading = {
		find: jest.fn().mockImplementation( ( selector ) => {
			if ( selector === '.ext-wikilambda-editpage-header__title' ) {
				return $titleSpan;
			} else if ( selector === '.ext-wikilambda-editpage-header__qid' ) {
				return $qidSpan;
			} else if ( selector === '.ext-wikilambda-editpage-header' ) {
				return $wrapper;
			}
		} )
	};

	$.mockImplementation( ( selector ) => {
		if ( selector === '#firstHeading' ) {
			return $firstHeading;
		}
		// Any $('<span>') call returns the chainable new-span mock
		return $newSpan;
	} );

	return { $firstHeading, $titleSpan, $qidSpan, $wrapper, $newSpan };
}

module.exports = {
	createJQueryZObjectPageTitleMocks,
	createJQueryAbstractCreateTitleMocks
};
