'use strict';
const Page = require( 'wdio-mediawiki/Page' );
class CreateZObjectPage extends Page {
	get title() { return $( '#firstHeading' ); }
	open() {
		return super.openTitle( 'Special:CreateZObject' );
	}
}
module.exports = new CreateZObjectPage();
