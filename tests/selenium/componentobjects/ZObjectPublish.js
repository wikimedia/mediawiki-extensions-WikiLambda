/*!
 * ZObjectPublish Component Object for WikiLambda browser test suite
 *
 * Contains the ZObject Publish component related locators and actions.
 *
 * ZObjectPublish is a general component which publishes the ZObject.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';
const ElementActions = require( '../utils/ElementActions' );

class ZObjectPublish {
	get publishBlock() {
		return $( 'div.ext-wikilambda-publish-widget' );
	}

	get publishButton() {
		return this.publishBlock.$( 'button=Publish' );
	}

	get publishDialogBlock() {
		return $( '//*[@role="dialog" and @aria-modal="true"]' );
	}

	get confirmPublishButton() {
		return this.publishDialogBlock.$( 'button=Publish' );
	}

	/**
	 * Publish the ZObject
	 *
	 * @async
	 * @return {void}
	 */
	async publish() {
		const pubButton = await $( 'button=Publish' );
		await ElementActions.doClick( await pubButton );
		const confirmDialog = await this.publishDialogBlock;
		const confirmPubButton = await confirmDialog.$( 'button=Publish' );
		await ElementActions.doClick( await confirmPubButton );
	}
}

module.exports = new ZObjectPublish();
