class ApiMock {
	constructor( request, response, matcher ) {
		this.request = request;
		this.response = response;
		this.matcher = matcher;
	}
}

module.exports = ApiMock;
