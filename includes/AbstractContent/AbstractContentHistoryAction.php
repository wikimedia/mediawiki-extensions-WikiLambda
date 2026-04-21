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
	 * Returns a formatted page title for the history view, using the Wikibase label
	 * for the entity if available. Falls back to the default MediaWiki history title
	 * if the page doesn't exist, the label can't be fetched, or anything goes wrong.
	 *
	 * @inheritDoc
	 */
	protected function getPageTitle() {
		if ( !$this->getTitle()->exists() ) {
			return parent::getPageTitle();
		}

		$entityId = $this->getTitle()->getText();
		$languageCode = $this->getLanguage()->getCode();
		$label = AbstractContentUtils::resolveAbstractLabel( $entityId, $languageCode );

		if ( $label === null ) {
			return parent::getPageTitle();
		}

		return $this->msg( 'wikilambda-abstract-content-history-title' )
		->rawParams( htmlspecialchars( $label ), $entityId );
	}
}
