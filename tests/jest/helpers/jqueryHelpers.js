/*!
 * WikiLambda unit test suite jQuery helpers
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

function createJQueryPageTitleMocks() {
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

module.exports = {
	createJQueryPageTitleMocks
};
