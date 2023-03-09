/*!
 * WikiLambda unit test suite createGettersWithFunctionsMock helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var createGettersWithFunctionsMock = function ( returnVal ) {
	return jest.fn().mockImplementation( function () {
		return jest.fn().mockReturnValue( returnVal );
	} );
};

module.exports = { createGettersWithFunctionsMock };
