/*!
 * WikiLambda unit test suite mock Api helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
class ApiMock {
	constructor( request, response, matcher ) {
		this.request = request;
		this.response = response;
		this.matcher = matcher;
	}
}

module.exports = ApiMock;
