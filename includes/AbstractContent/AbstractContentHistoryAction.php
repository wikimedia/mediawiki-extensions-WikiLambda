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
	 * for the entity if available. Falls back to the Abstract Article history title format
	 * ("Revision history of QID") if the page doesn't exist, the label can't be fetched,
	 * or anything goes wrong.
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
			// (T426833) When no Wikibase label is available, still render the Abstract Article
			// history title format ("Revision history of QID"), so that /wiki/, edit, history and
			// Special:ViewAbstract stay consistent.
			return $this->msg( 'wikilambda-abstract-content-history-title-no-label' )
				->params( $entityId );
		}

		return $this->msg( 'wikilambda-abstract-content-history-title' )
		->rawParams( htmlspecialchars( $label ), $entityId );
	}
}
