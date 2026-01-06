<?php
/**
 * WikiLambda history action for Abstract Wiki content, just to set a nicer title
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use MediaWiki\Actions\HistoryAction;

class AbstractContentHistoryAction extends HistoryAction {
	/**
	 * @inheritDoc
	 */
	protected function getPageTitle() {
		// FIXME: Always fallback to parent for now.
		return parent::getPageTitle();
	}

}
