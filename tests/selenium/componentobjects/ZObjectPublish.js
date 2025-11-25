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

import ElementActions from '../utils/ElementActions.js';
import i18n from '../utils/i18n.js';

class ZObjectPublish {
	get publishBlock() {
		return $( '[data-testid="publish-widget"]' );
	}

	get publishButton() {
		return this.publishBlock.$( '[data-testid="publish-button"]' );
	}

	get publishDialogBlock() {
		return $( '[data-testid="publish-dialog"]' );
	}

	get confirmPublishButton() {
		return this.publishDialogBlock.$( `button=${ i18n[ 'wikilambda-publishnew' ] }` );
	}

	/**
	 * Publish the ZObject
	 *
	 * @async
	 * @return {void}
	 */
	async publish() {
		await ElementActions.doClick( await this.publishButton );
		await ElementActions.doClick( await this.confirmPublishButton );
	}
}

export default new ZObjectPublish();
