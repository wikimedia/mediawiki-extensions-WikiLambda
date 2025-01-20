/*!
 * WikiLambda unit test suite createGettersWithFunctionsMock helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const LabelData = require( '../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );

const createGettersWithFunctionsMock = function ( returnVal ) {
	return jest.fn().mockReturnValue( returnVal );
};

const createLabelDataMock = function ( labels = {} ) {
	return jest.fn().mockImplementation( ( zid ) => {
		const defaultLangZid = 'Z1002';
		const defaultLangCode = 'en';
		return new LabelData( zid, ( labels[ zid ] || zid ), defaultLangZid, defaultLangCode );
	} );
};

module.exports = {
	createGettersWithFunctionsMock,
	createLabelDataMock
};
