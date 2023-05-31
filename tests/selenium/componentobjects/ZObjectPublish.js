/**
 * @file contains the ZObject Publish component related locators and actions.
 * ZObjectPublish is a general component which publish the ZObject.
 */

'use strict';
const ElementActions = require( '../utils/ElementActions' );

class ZObjectPublish {
	get publishBlock() { return $( 'span.ext-wikilambda-publish-widget' ); }
	get publishButton() { return this.publishBlock.$( 'button=Publish' ); }
	get publishDialogBlock() { return this.publishBlock.$( 'div.ext-wikilambda-publishdialog' ); }
	get confirmPublishButton() { return this.publishDialogBlock.$( 'button=Publish' ); }

	/**
	 * Publish the ZObject
	 *
	 * @async
	 * @return {void}
	 */
	async publish() {
		await ElementActions.doClick( this.publishButton );
		await ElementActions.doClick( this.confirmPublishButton );
	}
}

module.exports = new ZObjectPublish();
