var createGettersWithFunctionsMock = function ( returnVal ) {
	return jest.fn().mockImplementation( function () {
		return jest.fn().mockReturnValue( returnVal );
	} );
};

module.exports = { createGettersWithFunctionsMock };
